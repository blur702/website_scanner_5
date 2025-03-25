import os
import logging
import asyncio
from datetime import datetime
from typing import Optional, Dict, Any
from PIL import Image
from playwright.async_api import async_playwright, Page, Error

from app.models.screenshot import Screenshot
from app.models.resource import Resource
from app.core.exceptions import ScreenshotError

logger = logging.getLogger(__name__)

class ScreenshotManager:
    """Manage webpage screenshots using Playwright."""

    def __init__(self, scan_uuid: str, cache_path: str, db_session):
        """Initialize screenshot manager."""
        self.scan_uuid = scan_uuid
        self.screenshots_dir = os.path.join(cache_path, "screenshots")
        self.db_session = db_session
        self.browser = None
        self.context = None
        
        # Ensure screenshots directory exists
        os.makedirs(self.screenshots_dir, exist_ok=True)
        
    async def setup(self):
        """Initialize browser context."""
        try:
            playwright = await async_playwright().start()
            self.browser = await playwright.chromium.launch()
            self.context = await self.browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                device_scale_factor=1
            )
            logger.info("Browser context initialized")
        except Exception as e:
            logger.error(f"Failed to initialize browser: {str(e)}")
            raise ScreenshotError("Failed to initialize browser")

    async def cleanup(self):
        """Clean up browser resources."""
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
        logger.info("Browser resources cleaned up")

    async def capture_page_screenshots(self, resource: Resource) -> Optional[Screenshot]:
        """
        Capture screenshots of a webpage.
        
        Captures:
        - Full page screenshot
        - Viewport screenshot
        - Generates thumbnail
        """
        if not self.context:
            await self.setup()

        try:
            page = await self.context.new_page()
            await page.goto(resource.original_url, wait_until='networkidle')
            
            # Allow dynamic content to load
            await asyncio.sleep(2)
            
            # Generate filenames
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            base_name = f"{self.scan_uuid}_{resource.id}_{timestamp}"
            
            full_path = os.path.join(self.screenshots_dir, f"{base_name}_full.png")
            viewport_path = os.path.join(self.screenshots_dir, f"{base_name}_viewport.png")
            thumb_path = os.path.join(self.screenshots_dir, f"{base_name}_thumb.png")
            
            # Take screenshots
            await self._capture_full_page(page, full_path)
            await self._capture_viewport(page, viewport_path)
            
            # Generate thumbnail
            await self._generate_thumbnail(full_path, thumb_path)
            
            # Get page dimensions
            dimensions = await self._get_page_dimensions(page)
            
            # Create database record
            screenshot = Screenshot(
                uuid=self.scan_uuid,
                resource_id=resource.id,
                type="full_page",
                path=full_path,
                viewport_path=viewport_path,
                thumbnail_path=thumb_path,
                viewport_width=dimensions['viewport_width'],
                viewport_height=dimensions['viewport_height'],
                full_height=dimensions['full_height'],
                created_at=datetime.now(),
                filesize=os.path.getsize(full_path),
                capture_success=True
            )
            
            self.db_session.add(screenshot)
            self.db_session.commit()
            
            await page.close()
            return screenshot
            
        except Error as e:
            logger.error(f"Failed to capture screenshot for {resource.original_url}: {str(e)}")
            # Create failed screenshot record
            screenshot = Screenshot(
                uuid=self.scan_uuid,
                resource_id=resource.id,
                type="full_page",
                capture_success=False,
                error=str(e),
                created_at=datetime.now()
            )
            self.db_session.add(screenshot)
            self.db_session.commit()
            return screenshot

    async def _capture_full_page(self, page: Page, path: str):
        """Capture full page screenshot."""
        await page.screenshot(
            path=path,
            full_page=True,
            type='png'
        )

    async def _capture_viewport(self, page: Page, path: str):
        """Capture viewport screenshot."""
        await page.screenshot(
            path=path,
            full_page=False,
            type='png'
        )

    async def _generate_thumbnail(self, source_path: str, thumb_path: str, size=(200, 200)):
        """Generate thumbnail from full screenshot."""
        try:
            with Image.open(source_path) as img:
                # Convert to RGB if necessary
                if img.mode in ('RGBA', 'P'):
                    img = img.convert('RGB')
                
                # Calculate dimensions maintaining aspect ratio
                img.thumbnail(size, Image.Resampling.LANCZOS)
                img.save(thumb_path, 'PNG', optimize=True)
                
        except Exception as e:
            logger.error(f"Failed to generate thumbnail: {str(e)}")
            # Create empty thumbnail as fallback
            img = Image.new('RGB', size, '#FFFFFF')
            img.save(thumb_path, 'PNG')

    async def _get_page_dimensions(self, page: Page) -> Dict[str, int]:
        """Get page dimensions."""
        dimensions = await page.evaluate('''() => {
            return {
                viewport_width: window.innerWidth,
                viewport_height: window.innerHeight,
                full_height: document.documentElement.scrollHeight
            }
        }''')
        return dimensions

    async def batch_capture(self, resources: list[Resource], concurrent_limit: int = 3):
        """
        Capture screenshots for multiple resources concurrently.
        
        Args:
            resources: List of resources to screenshot
            concurrent_limit: Maximum number of concurrent captures
        """
        try:
            await self.setup()
            
            # Process in batches to limit concurrent browsers
            for i in range(0, len(resources), concurrent_limit):
                batch = resources[i:i + concurrent_limit]
                tasks = [self.capture_page_screenshots(resource) for resource in batch]
                await asyncio.gather(*tasks)
                
        finally:
            await self.cleanup()

    def get_screenshot_paths(self, resource_id: str) -> Dict[str, str]:
        """Get paths to all screenshots for a resource."""
        screenshot = self.db_session.query(Screenshot).filter(
            Screenshot.uuid == self.scan_uuid,
            Screenshot.resource_id == resource_id,
            Screenshot.capture_success == True
        ).first()
        
        if not screenshot:
            return {}
            
        return {
            'full': screenshot.path,
            'viewport': screenshot.viewport_path,
            'thumbnail': screenshot.thumbnail_path
        }