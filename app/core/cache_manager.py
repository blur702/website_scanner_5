import logging
import os
import shutil
import time
from datetime import datetime, timedelta
import uuid
from typing import List, Dict, Any, Optional

from app.core.config import settings
from app.models.metadata import Metadata

logger = logging.getLogger(__name__)

class CacheManager:
    """
    Manages temporary file storage, caching, and disk space usage for resources.
    """
    
    def __init__(self, db_session):
        """Initialize the cache manager with database session."""
        self.db_session = db_session
        self.storage_root = settings.STORAGE_DIR
        
        # Create storage directory if it doesn't exist
        os.makedirs(self.storage_root, exist_ok=True)
        logger.info(f"CacheManager initialized with storage root: {self.storage_root}")
    
    def create_scan_directory(self, scan_uuid: str) -> str:
        """
        Create a directory structure for a new scan.
        
        Args:
            scan_uuid: UUID for the scan
            
        Returns:
            Path to the created directory
        """
        scan_dir = os.path.join(self.storage_root, scan_uuid)
        
        # Create main directory
        os.makedirs(scan_dir, exist_ok=True)
        
        # Create subdirectories for resources
        resources_dir = os.path.join(scan_dir, "resources")
        os.makedirs(resources_dir, exist_ok=True)
        
        # Create subdirectories for different resource types
        for resource_type in ["html", "css", "js", "images", "documents", "other"]:
            os.makedirs(os.path.join(resources_dir, resource_type), exist_ok=True)
        
        # Create screenshots directory
        os.makedirs(os.path.join(scan_dir, "screenshots"), exist_ok=True)
        
        # Create reports directory
        os.makedirs(os.path.join(scan_dir, "reports"), exist_ok=True)
        
        logger.info(f"Created scan directory structure at: {scan_dir}")
        return scan_dir
    
    def get_resource_path(self, scan_uuid: str, url: str, resource_type: str) -> str:
        """
        Generate a filesystem path for a resource based on its URL.
        
        Args:
            scan_uuid: UUID for the scan
            url: URL of the resource
            resource_type: Type of resource (html, css, js, etc.)
            
        Returns:
            Path where the resource should be stored
        """
        import hashlib
        import urllib.parse
        
        # Parse the URL to extract the path
        parsed_url = urllib.parse.urlparse(url)
        path = parsed_url.path.strip('/')
        
        # Handle empty path (domain root)
        if not path:
            path = "index.html" if resource_type == "html" else "resource"
        
        # Remove query parameters and fragments
        path = path.split('?')[0].split('#')[0]
        
        # Create a hash for long paths
        if len(path) > 100:
            path_hash = hashlib.md5(path.encode()).hexdigest()[:8]
            path = f"{path[:50]}_{path_hash}"
        
        # Ensure the path has the correct extension
        extension_map = {
            "html": ".html",
            "css": ".css",
            "js": ".js",
            "images": "",  # Keep original extension for images
            "documents": "",  # Keep original extension for documents
            "other": ""
        }
        
        if extension_map[resource_type] and not path.endswith(extension_map[resource_type]):
            path += extension_map[resource_type]
        
        # Return the full path
        return os.path.join(self.storage_root, scan_uuid, "resources", resource_type, path)
