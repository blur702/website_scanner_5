import logging
import asyncio
import re
import urllib.parse
from typing import List, Dict, Set, Optional, Any
from bs4 import BeautifulSoup
import aiohttp
import robots

from app.core.config import settings
from app.models.resource import Resource
from app.models.metadata import Metadata

logger = logging.getLogger(__name__)

class Crawler:
    """
    URL discovery and crawling module based on selected operation mode.
    """
    
    def __init__(self, session_uuid: str, config: Dict[str, Any], db_session):
        """Initialize the crawler with scan configuration."""
        self.session_uuid = session_uuid
        self.config = config
        self.db_session = db_session
        self.visited_urls = set()
        self.queued_urls = set()
        self.robots_parsers = {}  # Cache for robots.txt parsers
        self.url_fingerprints = {}  # For duplicate content detection
        self.common_elements = {}  # For detecting common elements across pages
        logger.info(f"Crawler initialized for scan {session_uuid}")
    
    async def start(self, start_url: str):
        """Start the crawling process from the initial URL."""
        logger.info(f"Starting crawl from {start_url}")
        
        # Normalize the starting URL
        normalized_url = self.normalize_url(start_url)
        self.base_domain = self.extract_domain(normalized_url)
        
        # Initialize URL queue with starting URL
        self.url_queue = asyncio.Queue()
        await self.url_queue.put((normalized_url, 0))  # (url, depth)
        self.queued_urls.add(normalized_url)
        
        # Start workers based on config
        worker_count = min(self.config.get("max_threads", 4), 16)
        logger.info(f"Starting {worker_count} crawler workers")
        
        workers = [self.worker() for _ in range(worker_count)]
        await asyncio.gather(*workers)
        
        logger.info(f"Crawling completed. Visited {len(self.visited_urls)} URLs")
    
    async def worker(self):
        """Worker process that fetches URLs from the queue and processes them."""
        while True:
            try:
                url, depth = await self.url_queue.get()
                
                # Skip if we've already processed this URL
                if url in self.visited_urls:
                    self.url_queue.task_done()
                    continue
                
                # Check if we've reached the maximum depth
                max_depth = self.config.get("max_depth", 3)
                if depth > max_depth:
                    self.url_queue.task_done()
                    continue
                
                # Process the URL
                await self.process_url(url, depth)
                
                # Mark the task as done
                self.url_queue.task_done()
                
                # Check if we're done (queue empty and all workers idle)
                if self.url_queue.empty() and all(w.done() for w in asyncio.all_tasks() if w is not asyncio.current_task()):
                    break
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in crawler worker: {str(e)}", exc_info=True)
    
    async def process_url(self, url: str, depth: int):
        """Process a URL: download it, extract links, and queue new URLs."""
        logger.debug(f"Processing URL: {url} at depth {depth}")
        
        # Mark as visited to avoid duplicates
        self.visited_urls.add(url)
        
        # Check if we should respect robots.txt
        if self.config.get("respect_robots_txt", True) and not self.is_allowed_by_robots(url):
            logger.debug(f"URL {url} disallowed by robots.txt")
            return
        
        # Download the URL
        html_content = await self.download_url(url)
        if not html_content:
            return
        
        # Create a resource record in the database
        resource = self.create_resource_record(url, html_content, depth)
        
        # Check if this is a duplicate page based on content fingerprint
        if self.is_duplicate_content(url, html_content):
            logger.debug(f"URL {url} is duplicate content")
            return
        
        # Extract and process links based on the crawl mode
        if self.should_extract_links(url, depth):
            new_urls = self.extract_links(url, html_content)
            await self.queue_urls(new_urls, depth + 1)
    
    def normalize_url(self, url: str) -> str:
        """Normalize a URL according to the URL normalization process."""
        # Implement URL normalization according to the spec
        # 1. Input validation
        url = url.strip()
        
        # 2. Protocol handling
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        
        # 3. Domain normalization
        parsed_url = urllib.parse.urlparse(url)
        netloc = parsed_url.netloc.lower()
        
        # 4. Path normalization
        path = self._normalize_path(parsed_url.path)
        
        # 5. Reconstruct the URL
        normalized_url = urllib.parse.urlunparse((
            parsed_url.scheme,
            netloc,
            path,
            parsed_url.params,
            parsed_url.query,
            parsed_url.fragment
        ))
        
        return normalized_url
    
    def _normalize_path(self, path: str) -> str:
        """Normalize URL path component."""
        # Resolve relative paths
        segments = path.split('/')
        resolved = []
        
        for segment in segments:
            if segment == '.':
                continue
            elif segment == '..':
                if resolved:
                    resolved.pop()
            else:
                resolved.append(segment)

