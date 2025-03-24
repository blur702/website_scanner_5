import logging
import os
import shutil
import zipfile
import tarfile
import json
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.metadata import Metadata
from app.models.resource import Resource
from app.core.exceptions import NotFoundException, BadRequestException

logger = logging.getLogger(__name__)

class PackagerService:
    """Service for creating downloadable packages of website content"""
    
    def __init__(self, db: Session):
        """Initialize the packager service with a database session."""
        self.db = db
        logger.info("PackagerService initialized with database session")
    
    async def create_package(self, scan_uuid: str, options: Dict[str, Any]) -> str:
        """
        Create a downloadable package for a scan.
        
        Args:
            scan_uuid: UUID of the scan
            options: Packaging options
            
        Returns:
            Path to the created package file
            
        Raises:
            NotFoundException: If the scan doesn't exist
        """
        logger.info(f"Creating package for scan {scan_uuid}")
        
        # Get scan metadata
        scan = self.db.query(Metadata).filter(Metadata.uuid == scan_uuid).first()
        if not scan:
            logger.warning(f"Scan not found: {scan_uuid}")
            raise NotFoundException("Scan", scan_uuid)
        
        # Create package directory
        package_dir = os.path.join(scan.cache_path, "package")
        os.makedirs(package_dir, exist_ok=True)
        
        # Copy resources to package directory with structure
        resources = self.db.query(Resource).filter(Resource.uuid == scan_uuid).all()
        
        # Count resources by type for logging
        resource_counts = {}
        for resource in resources:
            if resource.resource_type not in resource_counts:
                resource_counts[resource.resource_type] = 0
            resource_counts[resource.resource_type] += 1
            
            # Copy the resource file to the package
            if os.path.exists(resource.local_path):
                # Create subdirectory if it doesn't exist
                resource_package_path = os.path.join(package_dir, os.path.dirname(resource.local_path))
                os.makedirs(resource_package_path, exist_ok=True)
                
                # Copy the file
                dest_path = os.path.join(package_dir, resource.local_path)
                shutil.copy2(resource.local_path, dest_path)
        
        # Create package navigator HTML
        await self._create_navigator(scan, package_dir, resources)
        
        # Create metadata file
        await self._create_metadata_file(scan, package_dir)
        
        # Compress the package based on options
        package_format = options.get('format', 'zip')
        compression_level = options.get('compress_level', 6)
        
        package_filename = f"website_checker_{scan_uuid}"
        if package_format == 'zip':
            package_path = f"{package_filename}.zip"
            self._create_zip_archive(package_dir, package_path, compression_level)
        else:  # tar.gz
            package_path = f"{package_filename}.tar.gz"
            self._create_tar_archive(package_dir, package_path, compression_level)
        
        logger.info(f"Package created at {package_path} with {sum(resource_counts.values())} resources")
        for res_type, count in resource_counts.items():
            logger.debug(f"  - {res_type}: {count} resources")
        
        # Update scan metadata with package path
        scan.package_path = package_path
        self.db.commit()
        
        return package_path
    
    async def _create_navigator(self, scan: Metadata, package_dir: str, resources: list):
        """Create an HTML navigator for the packaged content."""
        logger.debug(f"Creating navigator for scan {scan.uuid}")
        
        # Simple navigator HTML template
        navigator_html = f"""
        <!DOCTYPE html>
        <html>
            <head>
                <title>Website Checker - {scan.original_url}</title>
                <style>
                    body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; }}
                    h1 {{ color: #333; }}
                    .resources {{ margin-top: 20px; }}
                    .resource-list {{ list-style-type: none; padding: 0; }}
                    .resource-item {{ margin-bottom: 5px; }}
                </style>
            </head>
            <body>
                <h1>Website Checker Report</h1>
                <p>URL: {scan.original_url}</p>
                <p>Scan Mode: {scan.scan_mode}</p>
                <p>Date: {scan.start_time.strftime('%Y-%m-%d %H:%M:%S')}</p>
                
