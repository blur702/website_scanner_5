import logging
import os
import re
import asyncio
from typing import List, Dict, Set
from urllib.parse import urljoin
import cssmin

logger = logging.getLogger(__name__)

class CssProcessor:
    """Process and consolidate CSS files for design mode."""
    
    def __init__(self, cache_path: str):
        """Initialize CSS processor with cache path."""
        self.cache_path = cache_path
        self.css_dir = os.path.join(cache_path, "resources", "css")
        self.consolidated_path = os.path.join(self.css_dir, "consolidated.css")
        self.url_map = {}  # Maps original URLs to local paths
        self.processed_rules = set()  # Track processed rules to avoid duplicates
        
    async def consolidate_css_files(self) -> str:
        """
        Consolidate all downloaded CSS files into a single file.
        Handles:
        - Removing duplicates
        - Resolving imports
        - Fixing url() paths
        - Minification
        
        Returns:
            Path to consolidated CSS file
        """
        logger.info("Starting CSS consolidation")
        
        # Get all CSS files
        css_files = []
        for filename in os.listdir(self.css_dir):
            if filename.endswith('.css') and filename != 'consolidated.css':
                css_files.append(os.path.join(self.css_dir, filename))
        
        if not css_files:
            logger.warning("No CSS files found to consolidate")
            return self.consolidated_path
        
        # Process each file
        consolidated_css = []
        for css_file in css_files:
            css_content = await self._process_css_file(css_file)
            if css_content:
                consolidated_css.append(css_content)
        
        # Combine and minify
        final_css = '\n'.join(consolidated_css)
        minified_css = cssmin.cssmin(final_css)
        
        # Write consolidated file
        with open(self.consolidated_path, 'w', encoding='utf-8') as f:
            f.write(minified_css)
        
        logger.info(f"CSS consolidation complete: {self.consolidated_path}")
        return self.consolidated_path
    
    async def _process_css_file(self, file_path: str) -> str:
        """Process a single CSS file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Process imports first
            content = await self._process_imports(content, file_path)
            
            # Fix url() paths
            content = self._fix_urls(content, file_path)
            
            # Remove duplicate rules
            content = self._remove_duplicates(content)
            
            return content
            
        except Exception as e:
            logger.error(f"Error processing CSS file {file_path}: {str(e)}")
            return ""
    
    async def _process_imports(self, content: str, base_path: str) -> str:
        """Process @import rules recursively."""
        import_pattern = re.compile(r'@import\s+(?:url\([\'"]?([^\'"]+)[\'"]?\)|[\'"]([^\'"]+)[\'"])\s*;')
        
        processed_content = []
        last_pos = 0
        
        for match in import_pattern.finditer(content):
            # Add content before the @import
            processed_content.append(content[last_pos:match.start()])
            
            # Get the imported file path
            import_path = match.group(1) or match.group(2)
            resolved_path = self._resolve_import_path(import_path, base_path)
            
            if resolved_path and os.path.exists(resolved_path):
                # Process the imported file recursively
                with open(resolved_path, 'r', encoding='utf-8') as f:
                    imported_content = f.read()
                imported_content = await self._process_imports(imported_content, resolved_path)
                processed_content.append(imported_content)
            
            last_pos = match.end()
        
        # Add remaining content
        processed_content.append(content[last_pos:])
        
        return '\n'.join(processed_content)
    
    def _resolve_import_path(self, import_path: str, base_path: str) -> str:
        """Resolve the actual path for an @import rule."""
        if import_path.startswith('/'):
            # Absolute path within resources
            return os.path.join(self.css_dir, os.path.basename(import_path))
        else:
            # Relative to importing file
            return os.path.join(os.path.dirname(base_path), import_path)
    
    def _fix_urls(self, content: str, file_path: str) -> str:
        """Fix url() paths in CSS content."""
        url_pattern = re.compile(r'url\([\'"]?([^\'"]+)[\'"]?\)')
        base_dir = os.path.dirname(file_path)
        
        def fix_url(match):
            url = match.group(1)
            
            # Skip data URLs and absolute URLs
            if url.startswith(('data:', 'http://', 'https://', '#')):
                return f'url("{url}")'
            
            # Resolve relative to absolute path
            abs_path = os.path.normpath(os.path.join(base_dir, url))
            if os.path.exists(abs_path):
                # Use path relative to consolidated CSS
                rel_path = os.path.relpath(abs_path, self.css_dir)
                return f'url("../{rel_path}")'
            
            # Keep original if file doesn't exist
            return f'url("{url}")'
        
        return url_pattern.sub(fix_url, content)
    
    def _remove_duplicates(self, content: str) -> str:
        """Remove duplicate CSS rules."""
        # Simple rule extraction - could be improved with a proper CSS parser
        rule_pattern = re.compile(r'([^{}]+)\{([^{}]+)\}')
        
        processed_rules = []
        seen_rules = set()
        
        for match in rule_pattern.finditer(content):
            selector = match.group(1).strip()
            rules = match.group(2).strip()
            rule_hash = f"{selector}|{rules}"
            
            if rule_hash not in seen_rules:
                seen_rules.add(rule_hash)
                processed_rules.append(f"{selector} {{\n  {rules}\n}}")
        
        return '\n\n'.join(processed_rules)
