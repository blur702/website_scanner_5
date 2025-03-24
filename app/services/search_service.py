import logging
import asyncio
import uuid
import re
import time
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.api.models.search import (
    SearchRequest, SearchResponse, SearchMatch, ContentType,
    ElementType, ElementMatch, ElementsResponse,
    PatternType, PatternUsage, PatternResponse
)
from app.core.exceptions import NotFoundException, ConflictException

logger = logging.getLogger(__name__)

class SearchService:
    def __init__(self, db: Session):
        """
        Initialize the search service with a database session.
        
        Args:
            db: SQLAlchemy database session
        """
        self.db = db
        self.search_jobs = {}  # In-memory storage for search jobs
        self.search_results = {}  # In-memory storage for search results
        self.search_result_cache = {}  # Cache for search results
        logger.info("SearchService initialized with database session")
    
    async def create_search_job(self, scan_id: str, search_request: SearchRequest) -> Dict[str, Any]:
        """
        Create a new search job for asynchronous processing.
        
        Args:
            scan_id: ID of the scan to search
            search_request: Search parameters
            
        Returns:
            Dictionary with search job details
        
        Raises:
            NotFoundException: If the scan doesn't exist
        """
        logger.info(f"Creating search job for scan {scan_id} with query: {search_request.query}")
        
        # Verify scan exists (would check database in real app)
        # if not self._scan_exists(scan_id):
        #     logger.warning(f"Scan not found: {scan_id}")
        #     raise NotFoundException("Scan", scan_id)
        
        # Create job ID
        search_id = str(uuid.uuid4())
        
        # Store job details
        self.search_jobs[search_id] = {
            "scan_id": scan_id,
            "search_id": search_id,
            "query": search_request.query,
            "case_sensitive": search_request.case_sensitive,
            "regex": search_request.regex,
            "content_types": [ct.value for ct in search_request.content_types],
            "max_results": search_request.max_results,
            "status": "pending",
            "created_at": datetime.now(),
            "completed_at": None,
            "total_matches": 0,
            "execution_time": 0
        }
        
        logger.info(f"Search job created with ID: {search_id}")
        
        return {
            "search_id": search_id, 
            "status": "pending"
        }
    
    async def process_search_job(self, scan_id: str, search_id: str):
        """
        Process a search job asynchronously.
        
        Args:
            scan_id: ID of the scan to search
            search_id: ID of the search job
        """
        if search_id not in self.search_jobs:
            logger.warning(f"Search job not found: {search_id}")
            return
        
        job = self.search_jobs[search_id]
        logger.info(f"Processing search job {search_id} for scan {scan_id}")
        
        try:
            # Mark as processing
            job["status"] = "processing"
            
            # Record start time for performance measurement
            start_time = time.time()
            
            # Simulate search processing time
            await asyncio.sleep(2)
            
            # Simulate search results (in a real app, would search actual content)
            matches = []
            
            # Generate some fake matches based on the query
            query = job["query"]
            is_regex = job["regex"]
            case_sensitive = job["case_sensitive"]
            
            # Sample URLs to simulate search across a site
            urls = [
                f"https://example.com/page{i}.html" for i in range(1, 6)
            ]
            
            content_samples = {
                ContentType.HTML: "<div class='container'>This is a sample HTML content with some text.</div>",
                ContentType.CSS: ".container { color: red; } /* CSS comment with some text */",
                ContentType.JS: "function test() { console.log('This is a sample JavaScript with some text'); }",
                ContentType.TEXT: "This is plain text content with some text."
            }
            
            # Create some simulated matches
            for i in range(min(10, job["max_results"])):
                content_type = list(content_samples.keys())[i % len(content_samples.keys())]
                content = content_samples[content_type]
                
                # Simple simulation of matching
                match_text = query if not is_regex else f"Match for regex: {query}"
                
                match = SearchMatch(
                    url=urls[i % len(urls)],
                    content_type=content_type,
                    line_number=i + 1,
                    column_number=10,
                    context=f"Context before {match_text} context after",
                    match=match_text
                )
                matches.append(match)
            
            # Calculate execution time
            execution_time = time.time() - start_time
            
            # Update job status
            job["status"] = "completed"
            job["completed_at"] = datetime.now()
            job["total_matches"] = len(matches)
            job["execution_time"] = execution_time
            
            # Store results
            self.search_results[search_id] = matches
            
            # Set cache expiration (1 hour)
            self.search_result_cache[search_id] = {
                "expires_at": datetime.now() + timedelta(hours=1)
            }
            
            logger.info(f"Search job {search_id} completed with {len(matches)} matches in {execution_time:.2f}s")
            
        except Exception as e:
            job["status"] = "failed"
            logger.error(f"Error processing search job {search_id}: {str(e)}", exc_info=True)
    
    async def search_content(self, scan_id: str, search_request: SearchRequest) -> SearchResponse:
        """
        Perform an immediate search on scan content.
        
        Args:
            scan_id: ID of the scan to search
            search_request: Search parameters
            
        Returns:
            SearchResponse with results
            
        Raises:
            NotFoundException: If the scan doesn't exist
        """
        logger.info(f"Performing immediate search for scan {scan_id} with query: {search_request.query}")
        
        # Verify scan exists (would check database in real app)
        # if not self._scan_exists(scan_id):
        #     logger.warning(f"Scan not found: {scan_id}")
        #     raise NotFoundException("Scan", scan_id)
        
        # Record start time for performance measurement
        start_time = time.time()
        
        # Generate search ID
        search_id = str(uuid.uuid4())
        
        # Simulate search results (in a real app, would search actual content)
        matches = []
        
        # Generate some fake matches based on the query
        query = search_request.query
        is_regex = search_request.regex
        case_sensitive = search_request.case_sensitive
        
        # Sample URLs to simulate search across a site
        urls = [
            f"https://example.com/page{i}.html" for i in range(1, 6)
        ]
        
        content_samples = {
            ContentType.HTML: "<div class='container'>This is a sample HTML content with some text.</div>",
            ContentType.CSS: ".container { color: red; } /* CSS comment with some text */",
            ContentType.JS: "function test() { console.log('This is a sample JavaScript with some text'); }",
            ContentType.TEXT: "This is plain text content with some text."
        }
        
        # Create some simulated matches based on requested content types
        for i in range(min(10, search_request.max_results)):
            # Select content type based on requested types
            if ContentType.ALL in search_request.content_types:
                content_type = list(content_samples.keys())[i % len(content_samples.keys())]
            else:
                # Filter to requested content types
                available_types = [ct for ct in search_request.content_types if ct != ContentType.ALL]
                if not available_types:  # Fallback if only ALL was specified
                    content_type = list(content_samples.keys())[i % len(content_samples.keys())]
                else:
                    content_type = available_types[i % len(available_types)]
            
            content = content_samples[content_type]
            
            # Simple simulation of matching
            match_text = query if not is_regex else f"Match for regex: {query}"
            
            match = SearchMatch(
                url=urls[i % len(urls)],
                content_type=content_type,
                line_number=i + 1,
                column_number=10,
                context=f"Context before {match_text} context after",
                match=match_text
            )
            matches.append(match)
        
        # Calculate execution time
        execution_time = time.time() - start_time
        
        # Store results for later retrieval
        self.search_results[search_id] = matches
        
        # Set cache expiration (1 hour)
        self.search_result_cache[search_id] = {
            "expires_at": datetime.now() + timedelta(hours=1)
        }
        
        logger.info(f"Immediate search completed with {len(matches)} matches in {execution_time:.2f}s")
        
        return SearchResponse(
            search_id=search_id,
            status="completed",
            total_matches=len(matches),
            items=matches,
            page=1,
            limit=search_request.max_results,
            query=query,
            execution_time=execution_time
        )
    
    async def get_search_results(self, scan_id: str, search_id: str, page: int, limit: int) -> SearchResponse:
        """
        Get results from a previous search.
        
        Args:
            scan_id: ID of the scan
            search_id: ID of the search job
            page: Page number for pagination
            limit: Number of results per page
            
        Returns:
            SearchResponse with results
            
        Raises:
            NotFoundException: If the scan or search job doesn't exist
            ConflictException: If the search is still in progress
        """
        logger.info(f"Getting search results for search {search_id}, scan {scan_id}, page {page}, limit {limit}")
        
        # Verify scan exists (would check database in real app)
        # if not self._scan_exists(scan_id):
        #     logger.warning(f"Scan not found: {scan_id}")
        #     raise NotFoundException("Scan", scan_id)
        
        # Verify search exists
        if search_id not in self.search_jobs:
            logger.warning(f"Search job not found: {search_id}")
            raise NotFoundException("Search", search_id)
        
        # Check search status
        job = self.search_jobs[search_id]
        if job["status"] == "pending" or job["status"] == "processing":
            logger.warning(f"Search job {search_id} is still in progress")
            raise ConflictException("Search in progress", {"search_id": search_id, "status": job["status"]})
        
        # Check if results exist
        if search_id not in self.search_results:
            logger.warning(f"Search results not found for: {search_id}")
            raise NotFoundException("Search results", search_id)
        
        # Check if cache has expired
        if search_id in self.search_result_cache:
            cache_info = self.search_result_cache[search_id]
            if cache_info["expires_at"] < datetime.now():
                logger.warning(f"Search results have expired for: {search_id}")
                # Clean up expired results
                del self.search_results[search_id]
                del self.search_result_cache[search_id]
                raise NotFoundException("Search results expired", search_id)
        
        # Get results
        all_matches = self.search_results[search_id]
        
        # Paginate
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_matches = all_matches[start_idx:end_idx]
        
        logger.info(f"Returning {len(paginated_matches)} search results (page {page} of {(len(all_matches) + limit - 1) // limit})")
        
        return SearchResponse(
            search_id=search_id,
            status=job["status"],
            total_matches=len(all_matches),
            items=paginated_matches,
            page=page,
            limit=limit,
            query=job["query"],
            execution_time=job["execution_time"]
        )
    
    async def find_elements(self, scan_id: str, element_type: ElementType, value: str, page: int, limit: int) -> ElementsResponse:
        """
        Find elements by class or ID.
        
        Args:
            scan_id: ID of the scan
            element_type: Type of element (class or ID)
            value: Class name or ID value
            page: Page number for pagination
            limit: Number of results per page
            
        Returns:
            ElementsResponse with matched elements
            
        Raises:
            NotFoundException: If the scan doesn't exist
        """
        logger.info(f"Finding elements for scan {scan_id}, type {element_type}, value {value}")
        
        # Verify scan exists (would check database in real app)
        # if not self._scan_exists(scan_id):
        #     logger.warning(f"Scan not found: {scan_id}")
        #     raise NotFoundException("Scan", scan_id)
        
        # Simulate finding elements (in a real app, would search through actual content)
        elements = []
        
        # Sample URLs to simulate search across a site
        urls = [
            f"https://example.com/page{i}.html" for i in range(1, 6)
        ]
        
        # Create sample elements based on type
        selector = f".{value}" if element_type == ElementType.CLASS else f"#{value}"
        
        # Generate sample element matches
        for i in range(10):
            url = urls[i % len(urls)]
            if element_type == ElementType.CLASS:
                html = f"<div class='{value}'>Element with class {value}</div>"
            else:
                html = f"<div id='{value}'>Element with ID {value}</div>"
            
            element = ElementMatch(
                url=url,
                element_type=element_type,
                selector=selector,
                html=html,
                line_number=i + 10,
                count_on_page=i % 3 + 1  # Some elements appear multiple times
            )
            elements.append(element)
        
        # Paginate
        total = len(elements)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_elements = elements[start_idx:end_idx]
        
        logger.info(f"Found {total} elements matching {element_type}='{value}', returning page {page} with {len(paginated_elements)} items")
        
        return ElementsResponse(
            items=paginated_elements,
            total=total,
            page=page,
            limit=limit
        )
    
    async def analyze_patterns(self, scan_id: str, pattern_type: PatternType, page: int, limit: int) -> PatternResponse:
        """
        Analyze usage patterns across the site.
        
        Args:
            scan_id: ID of the scan
            pattern_type: Type of pattern to analyze
            page: Page number for pagination
            limit: Number of results per page
            
        Returns:
            PatternResponse with pattern analysis
            
        Raises:
            NotFoundException: If the scan doesn't exist
        """
        logger.info(f"Analyzing patterns for scan {scan_id}, type {pattern_type}")
        
        # Verify scan exists (would check database in real app)
        # if not self._scan_exists(scan_id):
        #     logger.warning(f"Scan not found: {scan_id}")
        #     raise NotFoundException("Scan", scan_id)
        
        # Sample URLs to simulate search across a site
        urls = [
            f"https://example.com/page{i}.html" for i in range(1, 6)
        ]
        
        # Generate pattern data based on type
        patterns = []
        if pattern_type == PatternType.CLASS_USAGE:
            # Sample class usage patterns
            classes = ["container", "header", "footer", "sidebar", "nav", "btn", "card", "alert", "form-control", "row"]
            for cls in classes:
                # Some classes are used on multiple pages
                cls_urls = urls[:1 + (hash(cls) % len(urls))]
                count = len(cls_urls) * (1 + (hash(cls) % 5))
                
                examples = []
                if "container" in cls:
                    examples.append("<div class='container'>Content</div>")
                elif "btn" in cls:
                    examples.append(f"<button class='{cls}'>Click me</button>")
                else:
                    examples.append(f"<div class='{cls}'>Example</div>")
                
                pattern = PatternUsage(
                    name=cls,
                    count=count,
                    urls=cls_urls,
                    examples=examples
                )
                patterns.append(pattern)
                
        elif pattern_type == PatternType.TAG_DISTRIBUTION:
            # Sample tag distribution
            tags = ["div", "span", "p", "a", "img", "ul", "li", "h1", "h2", "form", "input", "button"]
            for tag in tags:
                # Some tags are more common than others
                tag_urls = urls
                count = 10 + (hash(tag) % 100)  # divs and spans are more common
                
                examples = [f"<{tag}>Example</{tag}>"]
                if tag == "img":
                    examples = ["<img src='example.jpg' alt='Example'>"]
                elif tag == "a":
                    examples = ["<a href='#'>Example link</a>"]
                
                pattern = PatternUsage(
                    name=tag,
                    count=count,
                    urls=tag_urls,
                    examples=examples
                )
                patterns.append(pattern)
                
        elif pattern_type == PatternType.ATTRIBUTE_USAGE:
            # Sample attribute usage
            attrs = ["class", "id", "href", "src", "alt", "style", "data-*", "aria-*", "title", "target"]
            for attr in attrs:
                # Some attributes are more common than others
                attr_urls = urls[:1 + (hash(attr) % len(urls))]
                count = len(attr_urls) * (1 + (hash(attr) % 10))
                
                examples = [f"<div {attr}='example'>Example</div>"]
                if attr == "href":
                    examples = ["<a href='https://example.com'>Link</a>"]
                elif attr == "src":
                    examples = ["<img src='image.jpg'>"]
                
                pattern = PatternUsage(
                    name=attr,
                    count=count,
                    urls=attr_urls,
                    examples=examples
                )
                patterns.append(pattern)
        
        # Sort by count (most common first)
        patterns.sort(key=lambda p: p.count, reverse=True)
        
        # Paginate
        total = len(patterns)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_patterns = patterns[start_idx:end_idx]
        
        logger.info(f"Found {total} {pattern_type} patterns, returning page {page} with {len(paginated_patterns)} items")
        
        return PatternResponse(
            pattern_type=pattern_type,
            items=paginated_patterns,
            total=total,
            page=page,
            limit=limit
        )