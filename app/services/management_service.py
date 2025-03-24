import logging
import uuid
from datetime import datetime, date
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session

from app.api.models.management import (
    ScansResponse, ScanSummary, DeleteScanResponse, SettingsResponse,
    UpdateSettingRequest, TestConfig, TestConfigsResponse, TestConfigResponse,
    SettingValue, SettingCategory
)
from app.core.exceptions import NotFoundException, BadRequestException
from app.models.metadata import Metadata
from app.models.regex_filter import RegexFilter
from app.api.models.scan import ScanStatus  # Use the enum from API models instead
# If the module does not exist, create it or update the import path accordingly

logger = logging.getLogger(__name__)

class ManagementService:
    def __init__(self, db: Session):
        self.db = db
        # Initialize settings if they don't exist
        self._ensure_default_settings()
        logger.info("ManagementService initialized with database session")
    
    async def list_scans(
        self, 
        page: int, 
        limit: int, 
        status: Optional[str] = None,
        domain: Optional[str] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None
    ) -> ScansResponse:
        """List scans with optional filters."""
        logger.info(f"Listing scans: page={page}, limit={limit}, filters: status={status}, domain={domain}")
        
        # Query database for scans with filters
        query = self.db.query(Metadata)
        
        if status:
            query = query.filter(Metadata.status == status)
            logger.debug(f"Filtered by status: {status}")
        
        if domain:
            query = query.filter(Metadata.original_url.contains(domain))
            logger.debug(f"Filtered by domain: {domain}")
        
        if from_date:
            query = query.filter(Metadata.start_time >= from_date)
            logger.debug(f"Filtered by from_date: {from_date}")
        
        if to_date:
            query = query.filter(Metadata.start_time <= to_date)
            logger.debug(f"Filtered by to_date: {to_date}")
        
        # Count total for pagination info
        total = query.count()
        
        # Sort and paginate
        query = query.order_by(Metadata.start_time.desc())
        query = query.offset((page - 1) * limit).limit(limit)
        
        # Convert to response model
        items = []
        for scan in query.all():
            items.append(ScanSummary(
                uuid=scan.uuid,
                name=None,  # Add this field to the Metadata model if needed
                url=scan.original_url,
                status=scan.status,
                created_at=scan.start_time,
                updated_at=scan.start_time if not scan.end_time else scan.end_time,
                completed_at=scan.end_time,
                resource_count=scan.resource_count,
                total_size=scan.total_download_size,
                issue_count=0,  # Need to calculate from validations or store in Metadata
                pages_crawled=scan.page_count
            ))
        
        logger.info(f"Returning {len(items)} scans (page {page} of {(total + limit - 1) // limit if total > 0 else 1})")
        
        return ScansResponse(
            items=items,
            total=total,
            page=page,
            limit=limit
        )
    
    async def delete_scan(self, scan_id: str, remove_files: bool) -> DeleteScanResponse:
        """Delete a scan and optionally its associated files."""
        logger.info(f"Deleting scan: {scan_id}, remove_files={remove_files}")
        
        # Check if scan exists
        scan = self.db.query(Metadata).filter(Metadata.uuid == scan_id).first()
        if not scan:
            logger.warning(f"Scan not found for deletion: {scan_id}")
            raise NotFoundException("Scan", scan_id)
        
        # Delete associated files if requested
        files_deleted = 0
        if remove_files and scan.cache_path:
            import os
            import shutil
            
            # Delete the scan directory if it exists
            if os.path.exists(scan.cache_path):
                try:
                    # Count files before deleting
                    for root, dirs, files in os.walk(scan.cache_path):
                        files_deleted += len(files)
                    
                    # Delete the directory
                    shutil.rmtree(scan.cache_path)
                    logger.info(f"Deleted {files_deleted} files from {scan.cache_path}")
                except Exception as e:
                    logger.error(f"Error deleting files: {str(e)}")
        
        # Delete scan from database - cascading deletes will remove related resources, validations, etc.
        self.db.delete(scan)
        self.db.commit()
        
        logger.info(f"Scan deleted: {scan_id}")
        
        return DeleteScanResponse(
            uuid=scan_id,
            success=True,
            files_deleted=files_deleted,
            deleted_at=datetime.now(),
            message=f"Scan {scan_id} was successfully deleted along with {files_deleted} files."
        )
    
    async def get_settings(self) -> SettingsResponse:
        """
        Get current system settings.
        
        Returns:
            SettingsResponse with all settings
        """
        logger.info("Getting system settings")
        
        # Format settings by module
        settings_by_module = {}
        
        for setting_key, setting_value in self.settings.items():
            # Extract module name from key (format: module.setting)
            parts = setting_key.split('.', 1)
            if len(parts) != 2:
                # Skip invalid keys
                continue
                
            module_name, setting_name = parts
            
            # Ensure module exists in result
            if module_name not in settings_by_module:
                settings_by_module[module_name] = {}
            
            # Add setting to module
            settings_by_module[module_name][setting_name] = setting_value
        
        logger.debug(f"Returning settings for {len(settings_by_module)} modules")
        
        return SettingsResponse(
            settings=settings_by_module
        )
    
    async def update_settings(self, settings_update: Dict[str, Dict[str, Any]]) -> SettingsResponse:
        """
        Update system settings.
        
        Args:
            settings_update: Dictionary of settings to update, organized by module
            
        Returns:
            SettingsResponse with updated settings
            
        Raises:
            BadRequestException: If settings are invalid
        """
        logger.info(f"Updating settings for {len(settings_update)} modules")
        
        # Validate and update settings
        for module_name, module_settings in settings_update.items():
            logger.debug(f"Updating {len(module_settings)} settings for module: {module_name}")
            
            for setting_name, setting_value in module_settings.items():
                # Construct the full setting key
                setting_key = f"{module_name}.{setting_name}"
                
                # Check if setting exists
                if setting_key not in self.settings:
                    logger.warning(f"Unknown setting: {setting_key}")
                    raise BadRequestException(f"Unknown setting: {setting_key}")
                
                # Get current setting
                current_setting = self.settings[setting_key]
                
                # Validate setting type
                try:
                    # Convert value to expected type
                    if current_setting.type == "int":
                        validated_value = int(setting_value)
                    elif current_setting.type == "float":
                        validated_value = float(setting_value)
                    elif current_setting.type == "bool":
                        if isinstance(setting_value, str):
                            validated_value = setting_value.lower() in ("true", "1", "yes", "y")
                        else:
                            validated_value = bool(setting_value)
                    else:  # string or other types
                        validated_value = str(setting_value)
                    
                    # Check range if applicable
                    if current_setting.min_value is not None and validated_value < current_setting.min_value:
                        raise ValueError(f"Value must be at least {current_setting.min_value}")
                    
                    if current_setting.max_value is not None and validated_value > current_setting.max_value:
                        raise ValueError(f"Value must be at most {current_setting.max_value}")
                    
                    # Update setting value
                    current_setting.value = validated_value
                    logger.debug(f"Updated setting: {setting_key} = {validated_value}")
                    
                except (ValueError, TypeError) as e:
                    logger.warning(f"Invalid value for setting {setting_key}: {str(e)}")
                    raise BadRequestException(f"Invalid value for setting {setting_key}: {str(e)}")
        
        logger.info("Settings updated successfully")
        
        # Return updated settings
        return await self.get_settings()
    
    async def list_test_configs(self, page: int, limit: int) -> TestConfigsResponse:
        """
        List test configurations with pagination.
        
        Args:
            page: Page number
            limit: Items per page
            
        Returns:
            TestConfigsResponse with paginated configurations
        """
        logger.info(f"Listing test configurations: page={page}, limit={limit}")
        
        # Get configurations (would use DB query in real app)
        all_configs = list(self.test_configs.values())
        
        # Sort by last_used (most recently used first), then by name
        all_configs.sort(key=lambda c: (c.last_used if c.last_used else datetime.min, c.name), reverse=True)
        
        # Paginate
        total = len(all_configs)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_configs = all_configs[start_idx:end_idx]
        
        logger.info(f"Returning {len(paginated_configs)} test configurations (page {page} of {(total + limit - 1) // limit if total > 0 else 1})")
        
        return TestConfigsResponse(
            items=paginated_configs,
            total=total,
            page=page,
            limit=limit
        )
    
    async def create_test_config(self, config: TestConfig) -> TestConfigResponse:
        """
        Create a new test configuration.
        
        Args:
            config: TestConfig to create
            
        Returns:
            TestConfigResponse with created configuration
            
        Raises:
            BadRequestException: If configuration is invalid
        """
        logger.info(f"Creating test configuration: {config.name}")
        
        # Validate configuration
        if not config.name:
            logger.warning("Invalid test configuration: name is required")
            raise BadRequestException("Name is required")
        
        if not config.test_settings or not isinstance(config.test_settings, dict):
            logger.warning("Invalid test configuration: test_settings must be a non-empty dictionary")
            raise BadRequestException("test_settings must be a non-empty dictionary")
        
        # Create new configuration
        config_id = str(uuid.uuid4())
        now = datetime.now()
        
        config_response = TestConfigResponse(
            id=config_id,
            name=config.name,
            description=config.description,
            created_at=now,
            updated_at=now,
            last_used=None,
            test_settings=config.test_settings
        )
        
        # Save to storage (would save to DB in real app)
        self.test_configs[config_id] = config_response
        
        logger.info(f"Test configuration created with ID: {config_id}")
        
        return config_response
    
    async def update_test_config(self, config_id: str, config: TestConfig) -> TestConfigResponse:
        """
        Update an existing test configuration.
        
        Args:
            config_id: ID of configuration to update
            config: Updated TestConfig
            
        Returns:
            TestConfigResponse with updated configuration
            
        Raises:
            NotFoundException: If configuration doesn't exist
            BadRequestException: If configuration is invalid
        """
        logger.info(f"Updating test configuration: {config_id}")
        
        # Check if configuration exists
        if config_id not in self.test_configs:
            logger.warning(f"Test configuration not found: {config_id}")
            raise NotFoundException("Test configuration", config_id)
        
        # Validate configuration
        if not config.name:
            logger.warning("Invalid test configuration: name is required")
            raise BadRequestException("Name is required")
        
        if not config.test_settings or not isinstance(config.test_settings, dict):
            logger.warning("Invalid test configuration: test_settings must be a non-empty dictionary")
            raise BadRequestException("test_settings must be a non-empty dictionary")
        
        # Get existing configuration
        existing_config = self.test_configs[config_id]
        
        # Update configuration
        updated_config = TestConfigResponse(
            id=config_id,
            name=config.name,
            description=config.description,
            created_at=existing_config.created_at,
            updated_at=datetime.now(),
            last_used=existing_config.last_used,
            test_settings=config.test_settings
        )
        
        # Save to storage (would update in DB in real app)
        self.test_configs[config_id] = updated_config
        
        logger.info(f"Test configuration updated: {config_id}")
        
        return updated_config
    
    def _get_default_settings(self) -> Dict[str, SettingValue]:
        """
        Get default system settings.
        
        Returns:
            Dictionary of settings by key
        """
        return {
            "scanner.max_threads": SettingValue(
                name="max_threads",
                value=4,
                type="int",
                description="Maximum number of threads for scanning",
                min_value=1,
                max_value=16,
                category=SettingCategory.SCANNING
            ),
            "scanner.timeout": SettingValue(
                name="timeout",
                value=30,
                type="int",
                description="Request timeout in seconds",
                min_value=5,
                max_value=120,
                category=SettingCategory.SCANNING
            ),
            "scanner.max_depth": SettingValue(
                name="max_depth",
                value=5,
                type="int",
                description="Maximum crawl depth",
                min_value=1,
                max_value=10,
                category=SettingCategory.SCANNING
            ),
            "scanner.user_agent": SettingValue(
                name="user_agent",
                value="Mozilla/5.0 Website Checker",
                type="string",
                description="User agent string for requests",
                category=SettingCategory.SCANNING
            ),
            "storage.max_file_size": SettingValue(
                name="max_file_size",
                value=10,
                type="int",
                description="Maximum file size in MB to download",
                min_value=1,
                max_value=100,
                category=SettingCategory.SYSTEM
            ),
            "storage.retention_days": SettingValue(
                name="retention_days",
                value=30,
                type="int",
                description="Number of days to keep scan data",
                min_value=1,
                max_value=365,
                category=SettingCategory.SYSTEM
            ),
            "validation.html_strict": SettingValue(
                name="html_strict",
                value=False,
                type="bool",
                description="Enable strict HTML validation",
                category=SettingCategory.PERFORMANCE
            ),
            "validation.css_strict": SettingValue(
                name="css_strict",
                value=False,
                type="bool",
                description="Enable strict CSS validation",
                category=SettingCategory.PERFORMANCE
            ),
            "reporting.max_items_per_section": SettingValue(
                name="max_items_per_section",
                value=100,
                type="int",
                description="Maximum items to include in each report section",
                min_value=10,
                max_value=1000,
                category=SettingCategory.REPORTING
            ),
            "reporting.include_screenshots": SettingValue(
                name="include_screenshots",
                value=True,
                type="bool",
                description="Include screenshots in reports",
                category=SettingCategory.REPORTING
            )
        }

    def _initialize_demo_data(self):
        """
        Initialize demo data for testing.
        """
        # Add demo scans
        demo_scans = [
            ScanSummary(
                uuid="42cbd58f-9a8e-4f9a-b1bd-7252a7566572",
                url="https://example.com",
                created_at=datetime.now(),
                updated_at=datetime.now(),
                completed_at=datetime.now(),
                status=ScanStatus.COMPLETED,
                resource_count=150,
                issue_count=12,
                total_size=1024 * 1024 * 2.5,  # 2.5 MB
                pages_crawled=42
            ),
            ScanSummary(
                uuid="8b69d87a-437c-41f3-a9d1-b5c5a296b5c5",
                url="https://test-site.org",
                created_at=datetime.now(),
                updated_at=datetime.now(),
                completed_at=None,
                status=ScanStatus.RUNNING,
                resource_count=75,
                issue_count=5,
                total_size=1024 * 1024 * 1.2,  # 1.2 MB
                pages_crawled=20
            )
        ]
        
        for scan in demo_scans:
            self.scans[scan.uuid] = scan
        
        # Add demo test configurations
        demo_configs = [
            TestConfigResponse(
                id="c1b7e27f-89d4-4bc7-8da3-a25e63e9e65a",
                name="Quick Scan",
                description="Basic scan with minimal validation",
                created_at=datetime.now(),
                updated_at=datetime.now(),
                last_used=datetime.now(),
                test_settings={
                    "max_depth": 2,
                    "validate_html": True,
                    "validate_css": False,
                    "capture_screenshots": True,
                    "check_links": True
                }
            ),
            TestConfigResponse(
                id="86ab736a-7edc-4a23-8c65-340c1fe0cdf0",
                name="Full Accessibility Audit",
                description="Complete scan with WCAG validation",
                created_at=datetime.now(),
                updated_at=datetime.now(),
                last_used=None,
                test_settings={
                    "max_depth": 5,
                    "validate_html": True,
                    "validate_css": True,
                    "capture_screenshots": True,
                    "check_links": True,
                    "check_accessibility": True,
                    "accessibility_level": "AA"
                }
            )
        ]
        
        for config in demo_configs:
            self.test_configs[config.id] = config
        
        logger.info(f"Initialized demo data: {len(demo_scans)} scans, {len(demo_configs)} test configurations")
    
    def _ensure_default_settings(self):
        """Ensure default settings exist in the database."""
        # Create settings table if needed
        # For now, we'll continue to use the in-memory settings approach
        # In a real app, you would store settings in a proper settings table
        self.settings = self._get_default_settings()