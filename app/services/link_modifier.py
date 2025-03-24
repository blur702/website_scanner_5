import logging
import os
import re
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from bs4 import BeautifulSoup
import cssutils

from app.models.resource import Resource
from app.core.exceptions import NotFoundException, BadRequestException

logger = logging.getLogger(__name__)

class LinkModifierService:
    """Service for modifying links in HTML, CSS, and JS files for offline browsing"""
    
    def __init__(self, db: Session):
        """Initialize the link modifier service with a database session."""
        self.db = db
        logger.info("LinkModifierService initialized with database session")
    
    async def rewrite_links(self, scan_uuid: str, package_path: str):
        """
        Rewrite all links in resources for offline browsing.
        
        Args:
            scan_uuid: UUID of the scan
            package_path: Path to the package directory
        """
        logger.info(f"Rewriting links for scan {scan_uuid} in package {package_path}")
        
        # Get all resources for this scan
        resources = self.db.query(Resource).filter(Resource.uuid == scan_uuid).all()
        
        # Process resources by type
        for resource in resources:
            try:
                if resource.resource_type == "html":
                    await self._rewrite_html_links(resource, resources, package_path)
                elif resource.resource_type == "css":
                    await self._rewrite_css_links(resource, resources, package_path)
                elif resource.resource_type == "js":
                    await self._rewrite_js_links(resource, resources, package_path)
            except Exception as e:
                logger.error(f"Error rewriting links in resource {resource.id}: {str(e)}", exc_info=True)
    
    async def _rewrite_html_links(self, resource: Resource, all_resources: List[Resource], package_path: str):
        """Rewrite links in HTML files."""
        logger.debug(f"Rewriting links in HTML resource {resource.id}")
        
        # Load the HTML file
        html_path = os.path.join(package_path, resource.local_path)
        if not os.path.exists(html_path):
            logger.warning(f"HTML file not found: {html_path}")
            return
        
        with open(html_path, 'r', encoding='utf-8') as f:
            soup = BeautifulSoup(f, 'html.parser')
        
        # Process all link elements
        for a_tag in soup.find_all('a', href=True):
            href = a_tag['href']
            new_href = self._get_rewritten_link(href, resource, all_resources, package_path)
            if new_href:
                a_tag['href'] = new_href
            elif not href.startswith(('http://', 'https://', 'mailto:', 'tel:')):
                # Add visual indicator for external links
                a_tag['data-external'] = 'true'
                a_tag['target'] = '_blank'
                a_tag['rel'] = 'noopener noreferrer'
        
        # Process all image sources
        for img_tag in soup.find_all('img', src=True):
            src = img_tag['src']
            new_src = self._get_rewritten_link(src, resource, all_resources, package_path)
            if new_src:
                img_tag['src'] = new_src
        
        # Process all script sources
        for script_tag in soup.find_all('script', src=True):
            src = script_tag['src']
            new_src = self._get_rewritten_link(src, resource, all_resources, package_path)
            if new_src:
                script_tag['src'] = new_src
        
        # Process all link elements
        for link_tag in soup.find_all('link', href=True):
            href = link_tag['href']
            new_href = self._get_rewritten_link(href, resource, all_resources, package_path)
            if new_href:
                link_tag['href'] = new_href
        
        # Save the modified HTML back to the file
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(str(soup))
    
    async def _rewrite_css_links(self, resource: Resource, all_resources: List[Resource], package_path: str):
        """Rewrite links in CSS files."""
        logger.debug(f"Rewriting links in CSS resource {resource.id}")
        
        # Load the CSS file
        css_path = os.path.join(package_path, resource.local_path)
        if not os.path.exists(css_path):
            logger.warning(f"CSS file not found: {css_path}")
            return
        
        with open(css_path, 'r', encoding='utf-8') as f:
            css_content = f.read()
        
        # Process url() references in CSS
        def replace_url(match):
            url = match.group(1).st
