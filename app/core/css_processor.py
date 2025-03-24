import logging
import os
import re
from typing import Dict, List, Set, Optional
import cssutils

from app.models.resource import Resource
from app.core.exceptions import NotFoundException, BadRequestException

logger = logging.getLogger(__name__)

class CssProcessor:
    """
    CSS file analyzer and processor for consolidation, optimization, and URL normalization.
    """
    
    def __init__(self, db_session):
        """Initialize the CSS processor with database session."""
        self.db_session = db_session
        # Suppress verbose cssutils parsing messages
        cssutils.log.setLevel(logging.CRITICAL)
        logger.info("CssProcessor initialized")
    
    async def consolidate_css(self, scan_uuid: str, output_path: str) -> str:
        """
        Consolidate multiple CSS files into a single file for easier editing.
        
        Args:
            scan_uuid: UUID of the scan
            output_path: Path to save the consolidated CSS file
            
        Returns:
            Path to the consolidated CSS file
        """
        logger.info(f"Consolidating CSS for scan {scan_uuid}")
        
        # Get all CSS resources for this scan
        css_resources = self.db_session.query(Resource).filter(
            Resource.uuid == scan_uuid,
            Resource.resource_type == "css"
        ).all()
        
        if not css_resources:
            logger.warning(f"No CSS resources found for scan {scan_uuid}")
            raise NotFoundException("No CSS resources found for consolidation")
        
        # Create the output directory if it doesn't exist
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Combine all CSS files with headers indicating the source
        combined_css = []
        for css in css_resources:
            if os.path.exists(css.local_path):
                try:
                    with open(css.local_path, 'r', encoding='utf-8') as f:
                        css_content = f.read()
                    
                    # Add a comment identifying the source
                    combined_css.append(f"\n/* Source: {css.original_url} */\n{css_content}")
                except Exception as e:
                    logger.error(f"Error reading CSS file {css.local_path}: {str(e)}")
        
        # Write the consolidated CSS to the output file
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write("/* Consolidated CSS - Website Checker */\n")
            f.write("/* This file combines all CSS resources from the scanned website */\n\n")
            f.write('\n'.join(combined_css))
        
        logger.info(f"CSS consolidated into {output_path} from {len(css_resources)} files")
        return output_path
    
    async def normalize_urls(self, css_content: str, base_url: str, resource_map: Dict[str, str]) -> str:
        """
        Normalize URLs in CSS content for offline viewing.
        
        Args:
            css_content: CSS content to process
            base_url: Base URL of the website
            resource_map: Mapping of online URLs to local paths
            
        Returns:
            CSS content with normalized URLs
        """
        logger.debug(f"Normalizing URLs in CSS with base URL: {base_url}")
        
        # Parse the CSS
        sheet = cssutils.parseString(css_content)
        
        # Process all URL references
        for rule in sheet:
            if rule.type == rule.STYLE_RULE:
                for prop in rule.style:
                    if 'url(' in prop.value:
                        prop.value = self._replace_urls(prop.value, base_url, resource_map)
            elif rule.type == rule.IMPORT_RULE:
                if rule.href:
                    new_href = self._replace_url(rule.href, base_url, resource_map)
                    rule.href = new_href
        
        # Return the modified CSS
        return sheet.cssText.decode('utf-8')
    
    def _replace_urls(self, value: str, base_url: str, resource_map: Dict[str, str]) -> str:
        """Replace URL references in CSS property values."""
        # Implementation to replace CSS URLs
        return value
        
