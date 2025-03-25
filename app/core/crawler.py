import logging
import asyncio
import re
import urllib.parse
from typing import List, Dict, Set, Optional, Any
from bs4 import BeautifulSoup
import aiohttp
import robots
import hashlib
import time

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
        self.session = None  # aiohttp session
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
        
        # Create aiohttp session
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30),
            headers={
                'User-Agent': settings.CRAWLER_USER_AGENT
            }
        )
        
        try:
            # Start workers based on config
            worker_count = min(self.config.get("max_threads", 4), 16)
            logger.info(f"Starting {worker_count} crawler workers")
            
            workers = [self.worker() for _ in range(worker_count)]
            await asyncio.gather(*workers)
            
            logger.info(f"Crawling completed. Visited {len(self.visited_urls)} URLs")
        finally:
            await self.session.close()
    
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
        if self.config.get("respect_robots_txt", True) and not await self.is_allowed_by_robots(url):
            logger.debug(f"URL {url} disallowed by robots.txt")
            return
        
        # Download the URL
        content, headers = await self.download_url(url)
        if not content:
            return
        
        # Create a resource record in the database
        resource = await self.create_resource_record(url, content, headers, depth)
        
        # Check if this is a duplicate page based on content fingerprint
        if self.is_duplicate_content(url, content):
            logger.debug(f"URL {url} is duplicate content")
            return
        
        # Extract and process links based on the crawl mode
        if self.should_extract_links(url, depth):
            new_urls = await self.extract_links(url, content)
            await self.queue_urls(new_urls, depth + 1)
    
    def normalize_url(self, url: str) -> str:
        """Normalize a URL according to the URL normalization process."""
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
        
        # Handle duplicate slashes
        normalized_path = '/'.join(resolved)
        while '//' in normalized_path:
            normalized_path = normalized_path.replace('//', '/')
        
        # Ensure leading slash
        if normalized_path and not normalized_path.startswith('/'):
            normalized_path = '/' + normalized_path
        
        return normalized_path

    def extract_domain(self, url: str) -> str:
        """Extract the domain from a URL."""
        parsed = urllib.parse.urlparse(url)
        return parsed.netloc.lower()

    async def download_url(self, url: str) -> tuple[Optional[str], dict]:
        """Download a URL and return its content and headers."""
        try:
            async with self.session.get(url) as response:
                if response.status == 200:
                    content = await response.text()
                    headers = dict(response.headers)
                    return content, headers
                else:
                    logger.warning(f"Failed to download {url}: HTTP {response.status}")
                    return None, {}
        except Exception as e:
            logger.error(f"Error downloading {url}: {str(e)}")
            return None, {}

    async def create_resource_record(self, url: str, content: str, headers: dict, depth: int) -> Resource:
        """Create a resource record in the database."""
        content_length = len(content.encode('utf-8'))
        mime_type = headers.get('Content-Type', 'text/html')
        
        resource = Resource(
            uuid=self.session_uuid,
            original_url=url,
            normalized_url=self.normalize_url(url),
            resource_type='html',  # Determine from mime_type
            mime_type=mime_type,
            is_external=self.extract_domain(url) != self.base_domain,
            domain=self.extract_domain(url),
            path=urllib.parse.urlparse(url).path,
            depth=depth,
            download_status='ok',
            status_code=200,
            content_length=content_length,
            download_time=time.time(),
            download_duration_ms=0  # Set actual duration
        )
        
        self.db_session.add(resource)
        self.db_session.commit()
        return resource

    def is_duplicate_content(self, url: str, content: str) -> bool:
        """Check if content is duplicate based on content fingerprint."""
        fingerprint = hashlib.md5(content.encode('utf-8')).hexdigest()
        
        if fingerprint in self.url_fingerprints:
            original_url = self.url_fingerprints[fingerprint]
            logger.debug(f"Duplicate content detected: {url} matches {original_url}")
            return True
        
        self.url_fingerprints[fingerprint] = url
        return False

    async def extract_links(self, base_url: str, html_content: str) -> List[str]:
        """Extract links from HTML content."""
        links = set()
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Extract links from various attributes
        link_elements = (
            ('a', 'href'),
            ('img', 'src'),
            ('script', 'src'),
            ('link', 'href'),
            ('iframe', 'src')
        )
        
        for tag, attr in link_elements:
            for element in soup.find_all(tag):
                url = element.get(attr)
                if url:
                    absolute_url = urllib.parse.urljoin(base_url, url)
                    if self.should_crawl_url(absolute_url):
                        links.add(absolute_url)
        
        return list(links)

    def should_crawl_url(self, url: str) -> bool:
        """Determine if a URL should be crawled based on configuration."""
        # Skip non-HTTP(S) URLs
        if not url.startswith(('http://', 'https://')):
            return False
            
        # Check domain restrictions
        domain = self.extract_domain(url)
        if not self.config.get("follow_external_links", False) and domain != self.base_domain:
            return False
            
        # Check file extensions
        if any(url.lower().endswith(ext) for ext in settings.SKIP_EXTENSIONS):
            return False
            
        # Apply path restrictions
        if self.config.get("path_restriction"):
            path = urllib.parse.urlparse(url).path
            if not path.startswith(self.config["path_restriction"]):
                return False
                
        # Apply regex filter
        if self.config.get("regex_pattern"):
            pattern = re.compile(self.config["regex_pattern"])
            matches = bool(pattern.search(url))
            is_inclusive = self.config.get("regex_is_inclusive", True)
            if matches != is_inclusive:
                return False
        
        return True

    def should_extract_links(self, url: str, depth: int) -> bool:
        """Determine if links should be extracted from this URL."""
        # Don't extract links at max depth
        if depth >= self.config.get("max_depth", 3):
            return False
            
        # Don't extract links from non-HTML content
        if not url.lower().endswith(settings.HTML_EXTENSIONS):
            return False
            
        # Check crawl mode restrictions
        mode = self.config.get("mode", "full")
        if mode == "single":
            return False
        elif mode == "design":
            return depth == 0  # Only extract from the first page
            
        return True

    async def queue_urls(self, urls: List[str], depth: int):
        """Queue URLs for processing."""
        max_urls = self.config.get("max_urls", 1000)
        
        for url in urls:
            # Skip if we've reached the URL limit
            if len(self.visited_urls) + len(self.queued_urls) >= max_urls:
                logger.info("Maximum URL limit reached")
                break
                
            # Skip already queued URLs
            normalized_url = self.normalize_url(url)
            if normalized_url not in self.queued_urls and normalized_url not in self.visited_urls:
                await self.url_queue.put((normalized_url, depth))
                self.queued_urls.add(normalized_url)

    async def is_allowed_by_robots(self, url: str) -> bool:
        """Check if URL is allowed by robots.txt."""
        domain = self.extract_domain(url)
        
        # Get or create robots.txt parser for this domain
        if domain not in self.robots_parsers:
            robots_url = f"https://{domain}/robots.txt"
            try:
                async with self.session.get(robots_url) as response:
                    if response.status == 200:
                        content = await response.text()
                        parser = robots.Parser.parse(content)
                        self.robots_parsers[domain] = parser
                    else:
                        # No robots.txt or error - allow all
                        return True
            except Exception as e:
                logger.error(f"Error fetching robots.txt for {domain}: {str(e)}")
                return True
        
        # Check if URL is allowed
        parser = self.robots_parsers.get(domain)
        if parser:
            path = urllib.parse.urlparse(url).path
            return parser.can_fetch(settings.CRAWLER_USER_AGENT, path)
            
        return True
