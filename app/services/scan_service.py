import logging
import asyncio
import uuid as uuid_lib
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
import os
import json
import random

from app.api.models.scan import (
    ScanCreate, ScanResponse, ScanStatusResponse, ResourcesResponse,
    ValidationResponse, ResourceDetail, ValidationIssue, ScanStatus,
    ResourceType, ResourceStatus, SeverityLevel, ScreenshotType, ScanMode,
    ScreenshotsResponse, ScreenshotMetadata, ElementDetail,
    PackageOptions, PackageResponse
)
from app.core.exceptions import NotFoundException, BadRequestException
from app.models.metadata import Metadata
from app.models.resource import Resource
from app.models.validation import Validation
from app.models.screenshot import Screenshot
from app.models.external_link import ExternalLink
from app.core.config import settings

logger = logging.getLogger(__name__)

class ScanService:
    def __init__(self, db: Session):
        """Initialize the scan service with a database session."""
        self.db = db
        logger.info("ScanService initialized with database session")
    
    async def start_scan(self, scan_id: str, scan_data: ScanCreate):
        """Start a new website scan with the provided configuration."""
        logger.info(f"Starting scan with ID: {scan_id} and URL: {scan_data.url}")
        
        # Create cache directory for this scan
        cache_path = os.path.join(settings.STORAGE_DIR, scan_id)
        os.makedirs(cache_path, exist_ok=True)
        
        # Store scan info in database
        scan = Metadata(
            uuid=scan_id,
            original_url=str(scan_data.url),
            normalized_url=str(scan_data.url).lower(),
            scan_mode=scan_data.mode.value,
            status=ScanStatus.RUNNING.value,
            start_time=datetime.now(),
            progress=0.0,
            config=scan_data.dict(),
            cache_path=cache_path
        )
        self.db.add(scan)
        self.db.commit()
        
        # Simulate async scan process
        asyncio.create_task(self._process_scan(scan_id, scan_data))
        
        logger.info(f"Scan task created for scan ID: {scan_id}")

    async def _process_scan(self, scan_id: str, scan_data: ScanCreate):
        """Process a scan asynchronously based on selected mode."""
        try:
            logger.info(f"Processing scan {scan_id} with mode {scan_data.mode}")
            
            # Get the scan from database
            scan = self.db.query(Metadata).filter(Metadata.uuid == scan_id).first()
            if not scan:
                logger.error(f"Scan {scan_id} not found in database")
                return
            
            # Extract mode-specific configuration
            mode = scan_data.mode
            config = scan_data.config

            # Create cache directory structure
            resources_dir = os.path.join(scan.cache_path, "resources")
            html_dir = os.path.join(resources_dir, "html")
            css_dir = os.path.join(resources_dir, "css")
            js_dir = os.path.join(resources_dir, "js")
            images_dir = os.path.join(resources_dir, "images")
            
            os.makedirs(html_dir, exist_ok=True)
            os.makedirs(css_dir, exist_ok=True)
            os.makedirs(js_dir, exist_ok=True)
            os.makedirs(images_dir, exist_ok=True)
            
            # Create a URLs to process list - starting with the original URL
            urls_to_process = [scan.original_url]
            processed_urls = set()

            # Start simulated progress tracking
            total_steps = 10
            current_activity = "Initializing scan"
            scan.current_activity = current_activity
            self.db.commit()
            
            # Set up URLs queue based on mode
            if mode == ScanMode.FULL:
                # Process recursive crawling with depth limit
                current_activity = "Preparing full website crawl"
            elif mode == ScanMode.DESIGN:
                # Only process the main page and direct resources
                current_activity = "Preparing design mode"
                config.max_depth = 1  # Override depth to 1
                config.consolidate_css = True
            elif mode == ScanMode.SINGLE:
                # Process just the single page
                current_activity = "Preparing single page process"
                config.max_depth = 1  # Override depth to 1
            elif mode == ScanMode.PATH:
                # Process only URLs matching the path pattern
                if not config.path_restriction:
                    logger.warning(f"Path restriction mode selected but no path provided. Using default '/'")
                    config.path_restriction = "/"
                current_activity = f"Preparing path-restricted scan: {config.path_restriction}"
            elif mode == ScanMode.REGEX:
                # Process URLs based on regex pattern
                if not config.regex_pattern:
                    logger.warning(f"Regex mode selected but no pattern provided. Using default '.*'")
                    config.regex_pattern = ".*"
                current_activity = "Preparing regex-filtered scan"
            
            # Update scan with mode-specific settings
            scan.current_activity = current_activity
            scan.progress = 10
            self.db.commit()
            
            # Simulate processing steps for different modes
            for step in range(1, total_steps + 1):
                # Update progress 
                scan.progress = (step / total_steps) * 100
                
                # Mode-specific processing simulation
                if step == 1:
                    scan.current_activity = "Fetching main page"
                    await self._simulate_fetch_main_page(scan)
                elif step == 2:
                    scan.current_activity = "Parsing HTML"
                    await self._simulate_parse_html(scan)
                elif step == 3:
                    if mode in [ScanMode.FULL, ScanMode.PATH, ScanMode.REGEX]:
                        scan.current_activity = "Discovering links"
                    else:
                        scan.current_activity = "Discovering resources"
                    await self._simulate_discover_resources(scan, mode)
                elif step == 4:
                    scan.current_activity = "Downloading CSS files"
                    await self._simulate_download_assets(scan, "css", mode)
                elif step == 5:
                    scan.current_activity = "Downloading JavaScript files"
                    await self._simulate_download_assets(scan, "js", mode)
                elif step == 6:
                    scan.current_activity = "Downloading images"
                    await self._simulate_download_assets(scan, "images", mode)
                elif step == 7:
                    scan.current_activity = "Validating HTML"
                    await self._simulate_validate_html(scan, mode)
                elif step == 8:
                    if mode == ScanMode.DESIGN:
                        scan.current_activity = "Consolidating CSS"
                        await self._simulate_consolidate_css(scan)
                    else:
                        scan.current_activity = "Checking links"
                        await self._simulate_check_links(scan, mode)
                elif step == 9:
                    scan.current_activity = "Taking screenshots"
                    await self._simulate_take_screenshots(scan, mode)
                elif step == 10:
                    scan.current_activity = "Generating reports"
                    await self._simulate_generate_reports(scan, mode)
                
                # Create sample resources at each step
                self._create_sample_resources(scan_id, step, mode)
                
                # Update database
                self.db.commit()
                logger.debug(f"Scan {scan_id} progress: {scan.progress:.1f}%, activity: {scan.current_activity}")
                
                # Simulate processing time
                await asyncio.sleep(1)
                
            # Scan completed
            scan.status = ScanStatus.COMPLETED.value
            scan.progress = 100
            scan.end_time = datetime.now()
            self.db.commit()
            
            logger.info(f"Scan {scan_id} completed successfully (mode: {mode})")
            
        except Exception as e:
            # Rollback in case of error
            self.db.rollback()
            
            # Update scan status to failed
            try:
                scan = self.db.query(Metadata).filter(Metadata.uuid == scan_id).first()
                if scan:
                    scan.status = ScanStatus.FAILED.value
                    scan.error = str(e)
                    scan.end_time = datetime.now()
                    self.db.commit()
            except Exception as update_error:
                logger.error(f"Error updating scan status: {str(update_error)}")
                
            logger.error(f"Error processing scan {scan_id}: {str(e)}", exc_info=True)

    # Add helper methods for the scan simulation
    async def _simulate_fetch_main_page(self, scan):
        """Simulate fetching the main page."""
        await asyncio.sleep(0.5)
        scan.page_count += 1
        scan.resource_count += 1
        scan.downloaded_count += 1
        scan.total_download_size += 50 * 1024  # 50KB

    async def _simulate_parse_html(self, scan):
        """Simulate parsing HTML content."""
        await asyncio.sleep(0.3)

    async def _simulate_discover_resources(self, scan, mode):
        """Simulate discovering resources based on scan mode."""
        if mode == ScanMode.FULL:
            # Simulate finding many links in full mode
            scan.resource_count += 20
        elif mode == ScanMode.PATH:
            # Simulate finding path-specific links
            scan.resource_count += 10
        elif mode == ScanMode.REGEX:
            # Simulate finding regex-matched links
            scan.resource_count += 8
        else:
            # Design mode and Single mode - just a few direct resources
            scan.resource_count += 5

    async def _simulate_download_assets(self, scan, asset_type, mode):
        """Simulate downloading different asset types."""
        size_map = {
            "css": 15 * 1024,    # 15KB per CSS
            "js": 120 * 1024,    # 120KB per JS
            "images": 200 * 1024 # 200KB per image
        }
        
        count_map = {
            ScanMode.FULL: {"css": 5, "js": 8, "images": 12},
            ScanMode.DESIGN: {"css": 3, "js": 2, "images": 5},
            ScanMode.SINGLE: {"css": 2, "js": 1, "images": 4},
            ScanMode.PATH: {"css": 4, "js": 6, "images": 10},
            ScanMode.REGEX: {"css": 3, "js": 5, "images": 8}
        }
        
        asset_count = count_map[mode][asset_type]
        size_per_asset = size_map[asset_type]
        
        scan.resource_count += asset_count
        scan.downloaded_count += asset_count
        scan.total_download_size += asset_count * size_per_asset
        
        await asyncio.sleep(0.2)

    async def _simulate_validate_html(self, scan, mode):
        """Simulate HTML validation process."""
        await asyncio.sleep(0.5)

    async def _simulate_consolidate_css(self, scan):
        """Simulate CSS consolidation for design mode."""
        await asyncio.sleep(0.5)
        
        # Create a consolidated CSS file record in the database
        resource = Resource(
            uuid=scan.uuid,
            original_url=f"{scan.original_url}/consolidated.css",
            normalized_url=f"{scan.original_url.lower()}/consolidated.css",
            resource_type=ResourceType.CSS.value,
            mime_type="text/css",
            is_external=False,
            domain=scan.normalized_url.split("/")[2] if "//" in scan.normalized_url else "",
            path="/consolidated.css",
            depth=1,
            download_status=ResourceStatus.OK.value,
            status_code=200,
            download_time=datetime.now(),
            download_duration_ms=50,
            content_length=30 * 1024,  # 30KB consolidated CSS
            local_path=os.path.join(scan.cache_path, "resources", "css", "consolidated.css")
        )
        self.db.add(resource)

    async def _simulate_check_links(self, scan, mode):
        """Simulate checking links."""
        # Add external links based on mode
        external_count = {
            ScanMode.FULL: 15,
            ScanMode.DESIGN: 3,
            ScanMode.SINGLE: 5,
            ScanMode.PATH: 10,
            ScanMode.REGEX: 8
        }
        
        count = external_count[mode]
        scan.external_link_count += count
        scan.external_link_errors += count // 5  # 20% of links are broken
        
        await asyncio.sleep(0.5)

    async def _simulate_take_screenshots(self, scan, mode):
        """Simulate taking screenshots."""
        # Create screenshots for pages based on mode
        if mode == ScanMode.FULL:
            screenshot_count = min(8, scan.page_count)
        elif mode in [ScanMode.DESIGN, ScanMode.SINGLE]:
            screenshot_count = 1
        else:
            screenshot_count = min(5, scan.page_count)
        
        # Create screenshot records
        for i in range(screenshot_count):
            url = f"{scan.original_url}/page{i}.html" if i > 0 else scan.original_url
            
            # Find a resource for this URL if possible
            resource = self.db.query(Resource).filter(
                Resource.uuid == scan.uuid,
                Resource.original_url.like(f"%{url}%")
            ).first()
            
            resource_id = resource.id if resource else None
            
            screenshot = Screenshot(
                resource_id=resource_id,
                type="full_page",
                viewport_width=1920,
                viewport_height=1080,
                path=os.path.join(scan.cache_path, "screenshots", f"page{i}.png"),
                thumbnail_path=os.path.join(scan.cache_path, "screenshots", f"page{i}_thumb.png"),
                created_at=datetime.now(),
                filesize=500 * 1024,  # 500KB per screenshot
                capture_success=True
            )
            self.db.add(screenshot)
        
        await asyncio.sleep(0.7)

    async def _simulate_generate_reports(self, scan, mode):
        """Simulate generating reports."""
        # Create a stats summary based on mode
        scan.stats = {
            "pages": scan.page_count,
            "resources": {
                "total": scan.resource_count,
                "downloaded": scan.downloaded_count,
                "by_type": {
                    "html": scan.page_count,
                    "css": scan.resource_count // 5,
                    "js": scan.resource_count // 4,
                    "images": scan.resource_count // 3,
                    "other": scan.resource_count // 10
                }
            },
            "issues": {
                "total": scan.page_count * 3,
                "by_severity": {
                    "critical": scan.page_count // 5,
                    "high": scan.page_count // 3,
                    "medium": scan.page_count,
                    "low": scan.page_count // 2,
                    "info": scan.page_count * 2
                }
            },
            "external_links": {
                "total": scan.external_link_count,
                "broken": scan.external_link_errors
            },
            "mode": mode,
            "duration_seconds": (datetime.now() - scan.start_time).total_seconds()
        }
        
        await asyncio.sleep(0.5)

    def _create_sample_resources(self, scan_id: str, step: int, mode: ScanMode):
        """Create sample resources based on scan mode and step."""
        base_url = self.db.query(Metadata.original_url).filter(Metadata.uuid == scan_id).scalar()
        if not base_url:
            return
        
        # Create resource types based on step
        if step == 1:  # Main page
            self._create_resource(scan_id, ResourceType.HTML, "text/html", base_url, 0)
        elif step == 3:  # Links discovery - create sub-pages based on mode
            if mode == ScanMode.FULL:
                # Create multiple pages in full mode
                for i in range(1, 6):
                    self._create_resource(scan_id, ResourceType.HTML, "text/html", f"{base_url}/page{i}.html", 1)
            elif mode in [ScanMode.PATH, ScanMode.REGEX]:
                # Create fewer pages for path and regex modes
                for i in range(1, 4):
                    path = f"/blog/post{i}" if mode == ScanMode.PATH else f"/product{i}"
                    self._create_resource(scan_id, ResourceType.HTML, "text/html", f"{base_url}{path}.html", 1)
        elif step == 4:  # CSS files
            for i in range(1, 3 if mode in [ScanMode.DESIGN, ScanMode.SINGLE] else 5):
                self._create_resource(scan_id, ResourceType.CSS, "text/css", f"{base_url}/styles{i}.css", 1)
        elif step == 5:  # JavaScript files
            for i in range(1, 3 if mode in [ScanMode.DESIGN, ScanMode.SINGLE] else 4):
                self._create_resource(scan_id, ResourceType.JS, "application/javascript", f"{base_url}/script{i}.js", 1)
        elif step == 6:  # Images
            img_types = ["png", "jpg", "gif"]
            for i in range(1, 4 if mode in [ScanMode.DESIGN, ScanMode.SINGLE] else 7):
                img_type = img_types[i % len(img_types)]
                self._create_resource(scan_id, ResourceType.IMAGE, f"image/{img_type}", f"{base_url}/image{i}.{img_type}", 1)
        elif step == 7:  # Validation - create some issues
            # Add validation issues for existing HTML resources
            resources = self.db.query(Resource).filter(
                Resource.uuid == scan_id,
                Resource.resource_type == ResourceType.HTML.value
            ).all()
            
            for resource in resources:
                # Create a sample validation issue
                validation = Validation(
                    uuid=scan_id,
                    resource_id=resource.id,
                    test_group="HTML",
                    test_id="missing_alt" if random.random() < 0.5 else "invalid_attribute",
                    test_name="Missing Alt Text" if random.random() < 0.5 else "Invalid Attribute",
                    severity=random.choice([s.value for s in list(SeverityLevel)]),
                    description="Image is missing alt text" if random.random() < 0.5 else "Element has invalid attribute",
                    element_selector=f"img.logo" if random.random() < 0.5 else "div.container",
                    line_number=random.randint(10, 100),
                    column_number=random.randint(1, 80),
                    source_snippet=f'<img class="logo" src="logo.png">' if random.random() < 0.5 else '<div class="container" invalid="true">',
                    remediation="Add descriptive alt text to the image" if random.random() < 0.5 else "Remove invalid attribute"
                )
                self.db.add(validation)

    def _create_resource(self, scan_id: str, resource_type: ResourceType, mime_type: str, url: str, depth: int):
        """Helper to create a resource in the database with proper cache path."""
        # Extract domain and path
        domain = url.split("/")[2] if "//" in url else url.split("/")[0]
        path = "/" + "/".join(url.split("/")[3:]) if "//" in url else ""
        
        # Determine appropriate subdirectory
        if resource_type == ResourceType.HTML:
            subdir = "html"
        elif resource_type == ResourceType.CSS:
            subdir = "css"
        elif resource_type == ResourceType.JS:
            subdir = "js"
        elif resource_type == ResourceType.IMAGE:
            subdir = "images"
        else:
            subdir = "other"
        
        # Generate a filename from the URL
        filename = os.path.basename(url).replace("?", "_").replace("&", "_")
        if not filename:
            filename = "index.html" if resource_type == ResourceType.HTML else f"resource_{uuid_lib.uuid4().hex[:8]}"
        
        # Get scan metadata to access cache path
        scan = self.db.query(Metadata).filter(Metadata.uuid == scan_id).first()
        if not scan:
            return
        
        # Create local path
        local_path = os.path.join(scan.cache_path, "resources", subdir, filename)
        
        # Create resource
        resource = Resource(
            uuid=scan_id,
            original_url=url,
            normalized_url=url.lower(),
            resource_type=resource_type.value,
            mime_type=mime_type,
            is_external=False,
            domain=domain,
            path=path,
            depth=depth,
            download_status=ResourceStatus.OK.value,
            status_code=200,
            local_path=local_path,
            download_time=datetime.now(),
            download_duration_ms=random.randint(10, 500),
            content_length=random.randint(1024, 1024*1024)  # 1KB to 1MB
        )
        self.db.add(resource)
        
        # Create the directory structure
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        
        # Create an empty file to represent the resource
        with open(local_path, 'w') as f:
            f.write(f"Simulated content for {url}")
        
        return resource
                
    async def get_scan_status(self, uuid: str) -> ScanStatusResponse:
        """
        Get the current status and progress of a scan.
        
        Args:
            uuid: Unique identifier for the scan
            
        Returns:
            ScanStatusResponse object with status information
            
        Raises:
            NotFoundException: If the scan is not found
        """
        logger.info(f"Getting status for scan: {uuid}")
        
        scan = self.db.query(Metadata).filter(Metadata.uuid == uuid).first()
        if not scan:
            logger.warning(f"Scan not found: {uuid}")
            raise NotFoundException(f"Scan with ID {uuid} not found")
        
        # Calculate metrics
        urls_total = scan.config["config"]["max_urls"]
        current_page_size = 0
        average_page_size = 0
        
        if scan.page_count > 0:
            current_page_size = scan.total_download_size // scan.page_count
            average_page_size = scan.total_download_size / scan.page_count
        
        status_response = ScanStatusResponse(
            uuid=uuid,
            status=scan.status,
            progress=scan.progress,
            current_activity=scan.current_activity,
            total_download_size=scan.total_download_size,
            current_page_size=current_page_size,
            average_page_size=average_page_size,
            urls_crawled=scan.page_count,
            urls_total=urls_total,
            started_at=scan.start_time,
            updated_at=scan.end_time
        )
        
        logger.debug(f"Scan status for {uuid}: {status_response.dict()}")
        return status_response

    async def get_scan_resources(self, uuid: str, page: int, limit: int, 
                              type: Optional[ResourceType] = None, 
                              status: Optional[ResourceStatus] = None,
                              min_size: Optional[int] = None, 
                              max_size: Optional[int] = None,
                              sort_by_size: bool = False) -> ResourcesResponse:
        """
        Get a paginated list of resources from a scan.
        
        Args:
            uuid: Unique identifier for the scan
            page: Page number (1-based)
            limit: Items per page
            type: Filter by resource type
            status: Filter by resource status
            min_size: Minimum resource size in bytes
            max_size: Maximum resource size in bytes
            sort_by_size: Sort resources by size
            
        Returns:
            ResourcesResponse object with paginated resources
            
        Raises:
            NotFoundException: If the scan is not found
        """
        logger.info(f"Getting resources for scan: {uuid}, page: {page}, limit: {limit}")
        
        scan = self.db.query(Metadata).filter(Metadata.uuid == uuid).first()
        if not scan:
            logger.warning(f"Scan results not found: {uuid}")
            raise NotFoundException(f"Scan with ID {uuid} not found or not completed")
        
        # Get resources from database
        query = self.db.query(Resource).filter(Resource.uuid == uuid)
        
        # Apply filters
        if type:
            logger.debug(f"Filtering resources by type: {type}")
            query = query.filter(Resource.resource_type == type.value)
            
        if status:
            logger.debug(f"Filtering resources by status: {status}")
            query = query.filter(Resource.download_status == status.value)
            
        if min_size is not None:
            logger.debug(f"Filtering resources by min_size: {min_size}")
            query = query.filter(Resource.content_length >= min_size)
            
        if max_size is not None:
            logger.debug(f"Filtering resources by max_size: {max_size}")
            query = query.filter(Resource.content_length <= max_size)
            
        # Sort if requested
        if sort_by_size:
            logger.debug("Sorting resources by size")
            query = query.order_by(Resource.content_length.desc())
        
        # Paginate
        total = query.count()
        resources = query.offset((page - 1) * limit).limit(limit).all()
        
        logger.debug(f"Returning {len(resources)} resources of {total} total")
        return ResourcesResponse(
            items=resources,
            total=total,
            page=page,
            limit=limit
        )

    async def get_validation_results(self, uuid: str, severity: Optional[SeverityLevel] = None, 
                                  group: Optional[str] = None, page: int = 1, 
                                  limit: int = 50) -> ValidationResponse:
        """
        Get validation issues found during the scan.
        
        Args:
            uuid: Unique identifier for the scan
            severity: Filter by severity level
            group: Filter by validation group
            page: Page number (1-based)
            limit: Items per page
            
        Returns:
            ValidationResponse object with paginated validation issues
            
        Raises:
            NotFoundException: If the scan is not found
        """
        logger.info(f"Getting validation results for scan: {uuid}, page: {page}, limit: {limit}")
        
        scan = self.db.query(Metadata).filter(Metadata.uuid == uuid).first()
        if not scan:
            logger.warning(f"Scan results not found: {uuid}")
            raise NotFoundException(f"Scan with ID {uuid} not found or not completed")
        
        # Get validation issues from database
        query = self.db.query(Validation).filter(Validation.uuid == uuid)
        
        # Apply filters
        if severity:
            logger.debug(f"Filtering issues by severity: {severity}")
            query = query.filter(Validation.severity == severity.value)
            
        if group:
            logger.debug(f"Filtering issues by group: {group}")
            query = query.filter(Validation.test_group == group)
            
        # Sort by severity
        severity_order = {
            SeverityLevel.CRITICAL: 0,
            SeverityLevel.HIGH: 1,
            SeverityLevel.MEDIUM: 2,
            SeverityLevel.LOW: 3,
            SeverityLevel.INFO: 4
        }
        query = query.order_by(Validation.severity)
        
        # Count issues by severity
        issues_by_severity = {}
        for level in SeverityLevel:
            count = query.filter(Validation.severity == level.value).count()
            issues_by_severity[level] = count
        
        # Paginate
        total = query.count()
        issues = query.offset((page - 1) * limit).limit(limit).all()
        
        logger.debug(f"Returning {len(issues)} validation issues of {total} total")
        return ValidationResponse(
            items=issues,
            total=total,
            page=page,
            limit=limit,
            issues_by_severity=issues_by_severity
        )

    async def generate_report(self, uuid: str, format: str, sections: Optional[List[str]] = None):
        """
        Generate and retrieve a report from the scan.
        
        Args:
            uuid: Unique identifier for the scan
            format: Report format (json, html, summary)
            sections: Sections to include in the report
            
        Returns:
            Report data in the requested format
            
        Raises:
            NotFoundException: If the scan is not found
        """
        logger.info(f"Generating report for scan: {uuid}, format: {format}")
        
        scan = self.db.query(Metadata).filter(Metadata.uuid == uuid).first()
        if not scan:
            logger.warning(f"Scan not found: {uuid}")
            raise NotFoundException(f"Scan with ID {uuid} not found")
        
        # Return HTML report for html format
        if format == "html":
            logger.debug(f"Generating HTML report for scan: {uuid}")
            # Simple HTML report template
            html_report = f"""
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Scan Report: {uuid}</title>
                    <style>
                        body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; }}
                        h1 {{ color: #333; }}
                        .section {{ margin-bottom: 20px; }}
                        .section-title {{ color: #0066cc; }}
                        table {{ border-collapse: collapse; width: 100%; }}
                        th, td {{ border: 1px solid #ddd; padding: 8px; }}
                        th {{ background-color: #f2f2f2; text-align: left; }}
                        tr:nth-child(even) {{ background-color: #f9f9f9; }}
                    </style>
                </head>
                <body>
                    <h1>Scan Report: {uuid}</h1>
                    <div class="section">
                        <h2 class="section-title">Overview</h2>
                        <p>URL: {scan.original_url}</p>
                        <p>Status: {scan.status}</p>
                        <p>Started: {scan.start_time}</p>
                        <p>Completed: {scan.end_time}</p>
                    </div>
                </body>
            </html>
            """
            return html_report
        
        # Return JSON report for json format
        report_data = {
            "uuid": uuid,
            "url": scan.original_url,
            "status": scan.status,
            "started_at": scan.start_time.isoformat(),
            "completed_at": scan.end_time.isoformat()
        }
        
        # Add sections if scan is completed
        if scan.status == ScanStatus.COMPLETED.value:
            if not sections or "resources" in sections:
                resources = self.db.query(Resource).filter(Resource.uuid == uuid).all()
                report_data["resources"] = {
                    "total": len(resources),
                    "by_type": {},
                    "by_status": {}
                }
                # Count by type and status
                for r in resources:
                    if r.resource_type not in report_data["resources"]["by_type"]:
                        report_data["resources"]["by_type"][r.resource_type] = 0
                    report_data["resources"]["by_type"][r.resource_type] += 1
                    
                    if r.download_status not in report_data["resources"]["by_status"]:
                        report_data["resources"]["by_status"][r.download_status] = 0
                    report_data["resources"]["by_status"][r.download_status] += 1
            
            if not sections or "validation" in sections:
                issues = self.db.query(Validation).filter(Validation.uuid == uuid).all()
                report_data["validation"] = {
                    "total": len(issues),
                    "by_severity": {},
                    "by_type": {}
                }
                # Count by severity and type
                for i in issues:
                    if i.severity not in report_data["validation"]["by_severity"]:
                        report_data["validation"]["by_severity"][i.severity] = 0
                    report_data["validation"]["by_severity"][i.severity] += 1
                    
                    if i.test_id not in report_data["validation"]["by_type"]:
                        report_data["validation"]["by_type"][i.test_id] = 0
                    report_data["validation"]["by_type"][i.test_id] += 1
        
        logger.debug(f"Report generated for scan: {uuid}, format: {format}")
        # Return the appropriate format
        if format == "summary":
            # Just return a summary of the JSON data
            return {
                "uuid": report_data["uuid"],
                "url": report_data["url"],
                "status": report_data["status"],
                "resources_count": report_data.get("resources", {}).get("total", 0),
                "issues_count": report_data.get("validation", {}).get("total", 0)
            }
        
        # Default to JSON
        return report_data

    async def get_screenshots(self, uuid: str, page: int, limit: int, 
                           type: Optional[ScreenshotType] = None) -> ScreenshotsResponse:
        """
        Get a paginated list of screenshots taken during the scan.
        
        Args:
            uuid: Unique identifier for the scan
            page: Page number (1-based)
            limit: Items per page
            type: Filter by screenshot type
            
        Returns:
            ScreenshotsResponse object with paginated screenshots
            
        Raises:
            NotFoundException: If the scan is not found
        """
        logger.info(f"Getting screenshots for scan: {uuid}, page: {page}, limit: {limit}")
        
        scan = self.db.query(Metadata).filter(Metadata.uuid == uuid).first()
        if not scan:
            logger.warning(f"Scan results not found: {uuid}")
            raise NotFoundException(f"Scan with ID {uuid} not found or not completed")
        
        # Get screenshots from database
        query = self.db.query(Screenshot).filter(Screenshot.uuid == uuid)
        
        # Apply filters
        if type:
            logger.debug(f"Filtering screenshots by type: {type}")
            query = query.filter(Screenshot.screenshot_type == type.value)
        
        # Paginate
        total = query.count()
        screenshots = query.offset((page - 1) * limit).limit(limit).all()
        
        logger.debug(f"Returning {len(screenshots)} screenshots of {total} total")
        return ScreenshotsResponse(
            items=screenshots,
            total=total,
            page=page,
            limit=limit
        )

    async def get_screenshot_path(self, uuid: str, resource_id: str, size: str) -> str:
        """
        Get the file path to a specific screenshot.
        
        Args:
            uuid: Unique identifier for the scan
            resource_id: The ID of the screenshot
            size: Size of the screenshot (full or thumbnail)
            
        Returns:
            Path to the screenshot file
            
        Raises:
            NotFoundException: If the scan or screenshot is not found
        """
        logger.info(f"Getting screenshot path for scan: {uuid}, resource_id: {resource_id}, size: {size}")
        
        scan = self.db.query(Metadata).filter(Metadata.uuid == uuid).first()
        if not scan:
            logger.warning(f"Scan results not found: {uuid}")
            raise NotFoundException(f"Scan with ID {uuid} not found or not completed")
        
        # Find the screenshot
        screenshot = self.db.query(Screenshot).filter(Screenshot.uuid == uuid, Screenshot.id == resource_id).first()
        
        if not screenshot:
            logger.warning(f"Screenshot not found: {resource_id}")
            raise NotFoundException(f"Screenshot with ID {resource_id} not found")
        
        # In a real implementation, we would return the actual file path
        # For now, return a placeholder
        placeholder_path = f"/tmp/screenshots/{uuid}_{resource_id}_{size}.png"
        logger.debug(f"Returning screenshot path: {placeholder_path}")
        
        return placeholder_path

    async def get_element_detail(self, uuid: str, validation_id: str) -> ElementDetail:
        """
        Get HTML snippet of a problematic element with context.
        
        Args:
            uuid: Unique identifier for the scan
            validation_id: The ID of the validation issue
            
        Returns:
            ElementDetail object with HTML snippet and context
            
        Raises:
            NotFoundException: If the scan or validation issue is not found
        """
        logger.info(f"Getting element detail for scan: {uuid}, validation_id: {validation_id}")
        
        scan = self.db.query(Metadata).filter(Metadata.uuid == uuid).first()
        if not scan:
            logger.warning(f"Scan results not found: {uuid}")
            raise NotFoundException(f"Scan with ID {uuid} not found or not completed")
        
        # Find the validation issue
        issue = self.db.query(Validation).filter(Validation.uuid == uuid, Validation.id == validation_id).first()
        
        if not issue:
            logger.warning(f"Validation issue not found: {validation_id}")
            raise NotFoundException(f"Validation issue with ID {validation_id} not found")
        
        # In a real implementation, we would extract the HTML snippet from the page
        # For now, use the context field of the issue
        element_detail = ElementDetail(
            html=issue.source_snippet,
            line_start=issue.line_number or 1,
            line_end=issue.line_number or 1,
            context_before="<!-- Line before -->",
            context_after="<!-- Line after -->",
            url=issue.url,
            selector=issue.element_selector
        )
        
        logger.debug(f"Returning element detail for validation issue: {validation_id}")
        return element_detail

    async def create_package(self, uuid: str, options: PackageOptions) -> Dict[str, Any]:
        """
        Create a downloadable package with scan results.
        
        Args:
            uuid: Unique identifier for the scan
            options: Packaging options
            
        Returns:
            Dictionary with package details and download URL
            
        Raises:
            NotFoundException: If the scan is not found
        """
        logger.info(f"Creating package for scan: {uuid} with options: {options}")
        
        scan = self.db.query(Metadata).filter(Metadata.uuid == uuid).first()
        if not scan:
            logger.warning(f"Scan not found: {uuid}")
            raise NotFoundException(f"Scan with ID {uuid} not found")
        
        # Create a package job
        package_id = str(uuid_lib.uuid4())
        package_job = {
            "id": package_id,
            "status": "pending",
            "created_at": datetime.now(),
            "estimated_size": 5 * 1024 * 1024,  # 5MB placeholder
            "options": options.dict()
        }
        
        logger.debug(f"Created package job: {package_id} for scan: {uuid}")
        return package_job

    async def process_package(self, uuid: str, package_id: str):
        """
        Process the package creation asynchronously.
        
        Args:
            uuid: Unique identifier for the scan
            package_id: Unique identifier for the package job
        """
        logger.info(f"Processing package: {package_id} for scan: {uuid}")
        
        try:
            # Simulate processing time
            await asyncio.sleep(5)
            
            # Update package status
            # In a real implementation, this would create the package file
            
            logger.info(f"Package {package_id} for scan {uuid} processed successfully")
            
        except Exception as e:
            logger.error(f"Error processing package {package_id} for scan {uuid}: {str(e)}", exc_info=True)

    async def get_package_path(self, uuid: str, format: str) -> str:
        """
        Get the file path to the final package.
        
        Args:
            uuid: Unique identifier for the scan
            format: Package format (zip or tar.gz)
            
        Returns:
            Path to the package file
            
        Raises:
            NotFoundException: If the scan is not found
            Exception: If the package is not ready
        """
        logger.info(f"Getting package path for scan: {uuid}, format: {format}")
        
        scan = self.db.query(Metadata).filter(Metadata.uuid == uuid).first()
        if not scan:
            logger.warning(f"Scan not found: {uuid}")
            raise NotFoundException(f"Scan with ID {uuid} not found")
        
        # In a real implementation, we would check if the package exists
        # For now, return a placeholder path
        # Simulate package not ready sometimes
        import random
        if random.random() < 0.3:
            logger.warning(f"Package for scan {uuid} is not ready")
            raise Exception("Package is not ready yet")
        
        placeholder_path = f"/tmp/packages/scan_{uuid}.{format}"
        logger.debug(f"Returning package path: {placeholder_path}")
        return placeholder_path