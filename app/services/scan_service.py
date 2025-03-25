import logging
import asyncio
import uuid as uuid_lib
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
import os
import json
import random
from playwright.async_api import async_playwright
import shutil

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
from app.core.crawler import Crawler
from app.core.css_processor import CssProcessor

logger = logging.getLogger(__name__)

class ScanService:
    def __init__(self, db: Session):
        """Initialize the scan service with a database session."""
        self.db = db
        self.active_scans = {}
        self._lock = asyncio.Lock()
        logger.info("ScanService initialized with database session")
    
    async def start_scan(self, scan_id: str, scan_data: ScanCreate):
        """Start a new website scan with the provided configuration."""
        async with self._lock:
            if scan_id in self.active_scans:
                raise BadRequestException(f"Scan {scan_id} is already running")
            
            self.active_scans[scan_id] = {
                "status": ScanStatus.RUNNING,
                "start_time": datetime.now()
            }
            
            try:
                logger.info(f"Starting scan with ID: {scan_id} and URL: {scan_data.url}")
                
                # Create cache directory for this scan
                cache_path = os.path.join(settings.STORAGE_DIR, scan_id)
                os.makedirs(cache_path, exist_ok=True)
                
                # Create resource subdirectories
                resources_dir = os.path.join(cache_path, "resources")
                for subdir in ["html", "css", "js", "images", "other"]:
                    os.makedirs(os.path.join(resources_dir, subdir), exist_ok=True)
                
                # Create screenshots directory
                screenshots_dir = os.path.join(cache_path, "screenshots")
                os.makedirs(screenshots_dir, exist_ok=True)
                
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
                    cache_path=cache_path,
                    page_count=0,
                    resource_count=0,
                    downloaded_count=0,
                    total_download_size=0,
                    external_link_count=0,
                    external_link_errors=0,
                    current_activity="Initializing scan"
                )
                self.db.add(scan)
                self.db.commit()
                
                # Start the scan process
                asyncio.create_task(self._process_scan(scan_id, scan_data))
                
                logger.info(f"Scan task created for scan ID: {scan_id}")
            except Exception as e:
                del self.active_scans[scan_id]
                raise

    async def _process_scan(self, scan_id: str, scan_data: ScanCreate):
        """Process a scan using the Crawler."""
        try:
            logger.info(f"Processing scan {scan_id} with mode {scan_data.mode}")
            
            # Get the scan from database
            scan = self.db.query(Metadata).filter(Metadata.uuid == scan_id).first()
            if not scan:
                logger.error(f"Scan {scan_id} not found in database")
                return
            
            # Initialize crawler
            crawler = Crawler(scan_id, scan_data.config.dict(), self.db)
            
            # Configure crawler based on scan mode
            await self._configure_crawler(crawler, scan_data.mode, scan_data.config)
            
            # Update scan status
            scan.current_activity = "Starting crawl"
            scan.progress = 5
            self.db.commit()
            
            # Start crawling
            await crawler.start(scan.original_url)
            
            # Process downloaded content based on mode
            await self._process_content(scan, scan_data.mode)
            
            # Take screenshots if enabled
            if scan_data.config.screenshot_enabled:
                await self._take_screenshots(scan)
            
            # Generate final reports
            await self._generate_reports(scan)
            
            # Update final status
            scan.status = ScanStatus.COMPLETED.value
            scan.progress = 100
            scan.end_time = datetime.now()
            self.db.commit()
            
            logger.info(f"Scan {scan_id} completed successfully")
            
        except Exception as e:
            logger.error(f"Error processing scan {scan_id}: {str(e)}", exc_info=True)
            await self._handle_scan_error(scan_id, str(e))

    async def _configure_crawler(self, crawler: Crawler, mode: ScanMode, config: Dict[str, Any]):
        """Configure crawler based on scan mode."""
        if mode == ScanMode.SINGLE:
            config.max_depth = 0
        elif mode == ScanMode.DESIGN:
            config.max_depth = 1
            config.consolidate_css = True
        elif mode == ScanMode.PATH:
            if not config.path_restriction:
                config.path_restriction = "/"
        elif mode == ScanMode.REGEX:
            if not config.regex_pattern:
                config.regex_pattern = ".*"

    async def _process_content(self, scan: Metadata, mode: ScanMode):
        """Process downloaded content based on scan mode."""
        if mode == ScanMode.DESIGN:
            # Consolidate CSS
            scan.current_activity = "Consolidating CSS"
            css_processor = CssProcessor(scan.cache_path)
            await css_processor.consolidate_css_files()
        
        # Update scan stats
        scan.current_activity = "Processing content"
        resources = self.db.query(Resource).filter(Resource.uuid == scan.uuid).all()
        scan.resource_count = len(resources)
        scan.downloaded_count = len([r for r in resources if r.download_status == ResourceStatus.OK.value])
        scan.total_download_size = sum(r.content_length or 0 for r in resources)
        scan.page_count = len([r for r in resources if r.resource_type == ResourceType.HTML.value])
        self.db.commit()

    async def _take_screenshots(self, scan: Metadata):
        """Take screenshots of discovered pages."""
        scan.current_activity = "Taking screenshots"
        
        try:
            # Get HTML resources
            html_resources = self.db.query(Resource).filter(
                Resource.uuid == scan.uuid,
                Resource.resource_type == ResourceType.HTML.value
            ).all()
            
            # Set up browser for screenshots (using playwright)
            async with async_playwright() as p:
                browser = await p.chromium.launch()
                
                for resource in html_resources:
                    try:
                        # Create screenshot directory if needed
                        screenshot_dir = os.path.join(scan.cache_path, "screenshots")
                        os.makedirs(screenshot_dir, exist_ok=True)
                        
                        # Take screenshot
                        page = await browser.new_page()
                        await page.goto(resource.original_url)
                        
                        # Full page screenshot
                        screenshot_path = os.path.join(screenshot_dir, f"{resource.id}_full.png")
                        await page.screenshot(
                            path=screenshot_path,
                            full_page=True
                        )
                        
                        # Create thumbnail
                        thumbnail_path = os.path.join(screenshot_dir, f"{resource.id}_thumb.png")
                        await page.screenshot(
                            path=thumbnail_path,
                            clip={'x': 0, 'y': 0, 'width': 800, 'height': 600}
                        )
                        
                        # Save screenshot record
                        screenshot = Screenshot(
                            resource_id=resource.id,
                            type=ScreenshotType.FULL_PAGE.value,
                            viewport_width=1920,
                            viewport_height=1080,
                            path=screenshot_path,
                            thumbnail_path=thumbnail_path,
                            created_at=datetime.now(),
                            filesize=os.path.getsize(screenshot_path),
                            capture_success=True
                        )
                        self.db.add(screenshot)
                        
                    except Exception as e:
                        logger.error(f"Error taking screenshot of {resource.original_url}: {str(e)}")
                        continue
                        
                    finally:
                        await page.close()
                
                await browser.close()
                
            self.db.commit()
            logger.info(f"Screenshots taken for scan {scan.uuid}")
            
        except Exception as e:
            logger.error(f"Error in screenshot process: {str(e)}")
            raise

    async def _generate_reports(self, scan: Metadata):
        """Generate final reports and statistics."""
        scan.current_activity = "Generating reports"
        # Calculate statistics
        resources = self.db.query(Resource).filter(Resource.uuid == scan.uuid).all()
        external_links = self.db.query(ExternalLink).filter(ExternalLink.uuid == scan.uuid).all()
        
        scan.stats = {
            "pages": scan.page_count,
            "resources": {
                "total": len(resources),
                "downloaded": scan.downloaded_count,
                "by_type": {
                    "html": len([r for r in resources if r.resource_type == ResourceType.HTML.value]),
                    "css": len([r for r in resources if r.resource_type == ResourceType.CSS.value]),
                    "js": len([r for r in resources if r.resource_type == ResourceType.JS.value]),
                    "images": len([r for r in resources if r.resource_type == ResourceType.IMAGE.value]),
                    "other": len([r for r in resources if r.resource_type == ResourceType.OTHER.value])
                }
            },
            "external_links": {
                "total": len(external_links),
                "broken": len([l for l in external_links if l.status_code >= 400])
            }
        }
        self.db.commit()

    async def cleanup_scan(self, scan_id: str):
        """Clean up resources after scan completion or failure"""
        try:
            if scan_id in self.active_scans:
                del self.active_scans[scan_id]
            
            # Clean up any temporary files
            scan = self.db.query(Metadata).filter(Metadata.uuid == scan_id).first()
            if scan and scan.cache_path:
                if os.path.exists(scan.cache_path):
                    shutil.rmtree(scan.cache_path)
                    logger.info(f"Cleaned up cache directory for scan {scan_id}")
        except Exception as e:
            logger.error(f"Error cleaning up scan {scan_id}: {str(e)}")

    async def _handle_scan_error(self, scan_id: str, error_message: str):
        """Handle scan errors with proper cleanup"""
        try:
            # Update scan status
            scan = self.db.query(Metadata).filter(Metadata.uuid == scan_id).first()
            if scan:
                scan.status = ScanStatus.FAILED.value
                scan.error = error_message
                scan.end_time = datetime.now()
                self.db.commit()
            
            # Clean up resources
            await self.cleanup_scan(scan_id)
        
        except Exception as e:
            logger.error(f"Error handling scan failure: {str(e)}")
            # Ensure active scan is removed even if update fails
            if scan_id in self.active_scans:
                del self.active_scans[scan_id]

    async def _validate_content(self, resource: Resource) -> List[ValidationIssue]:
        """Validate HTML/CSS content and identify issues"""
        validation_issues = []
        try:
            if resource.resource_type == ResourceType.HTML.value:
                validation_issues.extend(await self._validate_html(resource))
            elif resource.resource_type == ResourceType.CSS.value:
                validation_issues.extend(await self._validate_css(resource))
                
            return validation_issues
        except Exception as e:
            logger.error(f"Validation error for {resource.original_url}: {str(e)}")
            return []

    async def cancel_scan(self, scan_id: str) -> bool:
        """Cancel an active scan"""
        async with self._lock:
            if scan_id not in self.active_scans:
                return False
            
            try:
                # Update scan status
                scan = self.db.query(Metadata).filter(Metadata.uuid == scan_id).first()
                if scan:
                    scan.status = ScanStatus.CANCELLED.value
                    scan.end_time = datetime.now()
                    self.db.commit()
                
                # Clean up resources
                await self.cleanup_scan(scan_id)
                return True
                
            except Exception as e:
                logger.error(f"Error cancelling scan {scan_id}: {str(e)}")
                return False

    async def get_scan_status(self, scan_id: str) -> ScanStatusResponse:
        """Get current scan status"""
        scan = self.db.query(Metadata).filter(Metadata.uuid == scan_id).first()
        if not scan:
            raise NotFoundException(f"Scan {scan_id} not found")
        
        return ScanStatusResponse(
            uuid=scan.uuid,
            status=scan.status,
            progress=scan.progress,
            current_activity=scan.current_activity,
            error=scan.error,
            stats=scan.stats or {},
            start_time=scan.start_time,
            end_time=scan.end_time
        )

    # Rest of the service methods (get_scan_resources, etc.) remain unchanged