from fastapi import APIRouter, Depends, Path, Query, HTTPException, status, Request
from typing import Optional
from datetime import datetime, date
import logging

from app.api.models.management import (
    ScansResponse, DeleteScanResponse, SettingsResponse,
    UpdateSettingRequest, TestConfig, TestConfigsResponse, TestConfigResponse
)
from app.services.management_service import ManagementService
from app.api.dependencies.services import get_management_service
from app.core.exceptions import (
    WebsiteCheckerException, NotFoundException, BadRequestException,
    UnprocessableEntityException, ConflictException
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Management Operations"])

# Error handler for custom exceptions
def handle_website_checker_exception(e: WebsiteCheckerException):
    """Convert WebsiteCheckerException to FastAPI HTTPException"""
    return HTTPException(
        status_code=e.status_code,
        detail={"message": e.message, "details": e.details}
    )

@router.get("/scans", response_model=ScansResponse)
async def list_scans(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=50, description="Items per page"),
    status: Optional[str] = None,
    domain: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    management_service: ManagementService = Depends(get_management_service)
):
    """
    List all scans from database.
    
    Supports filtering by status, domain, and date range.
    """
    try:
        client_ip = request.client.host if request.client else "unknown"
        logger.info(f"List scans request from {client_ip}")
        logger.debug(f"List scans parameters: page={page}, limit={limit}, status={status}, domain={domain}, " +
                    f"from_date={from_date}, to_date={to_date}")
        
        scans = await management_service.list_scans(page, limit, status, domain, from_date, to_date)
        
        logger.info(f"Returning {len(scans.items)} scans (page {page} of {(scans.total + limit - 1) // limit if scans.total > 0 else 1})")
        return scans
        
    except WebsiteCheckerException as e:
        logger.warning(f"Error listing scans: {e.message}")
        raise handle_website_checker_exception(e)
    except Exception as e:
        logger.error(f"Unexpected error listing scans: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.delete("/scan/{uuid}", response_model=DeleteScanResponse)
async def delete_scan(
    request: Request,
    uuid: str = Path(..., description="The UUID of the scan to delete"),
    remove_files: bool = Query(False, description="Whether to delete associated files"),
    management_service: ManagementService = Depends(get_management_service)
):
    """
    Cancel and remove a scan.
    
    Can optionally delete all associated files.
    """
    try:
        client_ip = request.client.host if request.client else "unknown"
        logger.info(f"Delete scan request from {client_ip}: scan={uuid}, remove_files={remove_files}")
        
        # Delete scan
        result = await management_service.delete_scan(uuid, remove_files)
        
        logger.info(f"Scan deleted: {uuid}, files_deleted={result.files_deleted}")
        return result
        
    except NotFoundException as e:
        logger.warning(f"Scan not found for deletion: {uuid}")
        raise handle_website_checker_exception(e)
    except WebsiteCheckerException as e:
        logger.warning(f"Error deleting scan: {e.message}")
        raise handle_website_checker_exception(e)
    except Exception as e:
        logger.error(f"Unexpected error deleting scan: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/settings", response_model=SettingsResponse)
async def get_settings(
    request: Request,
    management_service: ManagementService = Depends(get_management_service)
):
    """
    Get current default settings.
    
    Settings are organized by module.
    """
    try:
        client_ip = request.client.host if request.client else "unknown"
        logger.info(f"Get settings request from {client_ip}")
        
        settings = await management_service.get_settings()
        
        # Count settings
        setting_count = sum(len(module_settings) for module_settings in settings.settings.values())
        module_count = len(settings.settings)
        logger.info(f"Returning {setting_count} settings in {module_count} modules")
        
        return settings
        
    except WebsiteCheckerException as e:
        logger.warning(f"Error getting settings: {e.message}")
        raise handle_website_checker_exception(e)
    except Exception as e:
        logger.error(f"Unexpected error getting settings: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/settings", response_model=SettingsResponse)
async def update_settings(
    request: Request,
    settings_update: UpdateSettingRequest,
    management_service: ManagementService = Depends(get_management_service)
):
    """
    Update default settings.
    
    All values are validated before updating.
    """
    try:
        client_ip = request.client.host if request.client else "unknown"
        logger.info(f"Update settings request from {client_ip}")
        
        # Count settings being updated
        setting_count = sum(len(module_settings) for module_settings in settings_update.settings.values())
        module_count = len(settings_update.settings)
        logger.info(f"Updating {setting_count} settings in {module_count} modules")
        
        # Update settings
        updated_settings = await management_service.update_settings(settings_update.settings)
        
        logger.info(f"Settings updated successfully")
        return updated_settings
        
    except BadRequestException as e:
        logger.warning(f"Bad request updating settings: {e.message}")
        raise handle_website_checker_exception(e)
    except WebsiteCheckerException as e:
        logger.warning(f"Error updating settings: {e.message}")
        raise handle_website_checker_exception(e)
    except Exception as e:
        logger.error(f"Unexpected error updating settings: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/test-config", response_model=TestConfigsResponse)
async def list_test_configs(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=50, description="Items per page"),
    management_service: ManagementService = Depends(get_management_service)
):
    """
    Get available test configurations.
    
    Configurations are sorted by last used date.
    """
    try:
        client_ip = request.client.host if request.client else "unknown"
        logger.info(f"List test configurations request from {client_ip}")
        logger.debug(f"Test configs pagination: page={page}, limit={limit}")
        
        configs = await management_service.list_test_configs(page, limit)
        
        logger.info(f"Returning {len(configs.items)} test configurations (page {page} of {(configs.total + limit - 1) // limit if configs.total > 0 else 1})")
        return configs
        
    except WebsiteCheckerException as e:
        logger.warning(f"Error listing test configurations: {e.message}")
        raise handle_website_checker_exception(e)
    except Exception as e:
        logger.error(f"Unexpected error listing test configurations: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/test-config", response_model=TestConfigResponse)
async def create_update_config(
    request: Request,
    config: TestConfig,
    id: Optional[str] = Query(None, description="ID of existing config to update"),
    management_service: ManagementService = Depends(get_management_service)
):
    """
    Create or update test configuration.
    
    If ID is provided, updates existing configuration, otherwise creates a new one.
    """
    try:
        client_ip = request.client.host if request.client else "unknown"
        operation = "update" if id else "create"
        logger.info(f"{operation.capitalize()} test configuration request from {client_ip}: name={config.name}")
        
        if not config.name:
            logger.warning(f"Invalid test configuration: missing name")
            raise BadRequestException("Name is required for test configuration", {"field": "name"})
            
        if not config.test_settings:
            logger.warning(f"Invalid test configuration: missing test_settings")
            raise BadRequestException("Test settings are required", {"field": "test_settings"})
        
        # Create or update config
        if id:
            logger.info(f"Updating test configuration: {id}")
            result = await management_service.update_test_config(id, config)
            logger.info(f"Test configuration updated: {id}")
        else:
            logger.info(f"Creating new test configuration: {config.name}")
            result = await management_service.create_test_config(config)
            logger.info(f"Test configuration created with ID: {result.id}")
            
        return result
        
    except NotFoundException as e:
        logger.warning(f"Configuration not found for update: {id}")
        raise handle_website_checker_exception(e)
    except BadRequestException as e:
        logger.warning(f"Bad request for test configuration: {e.message}")
        raise handle_website_checker_exception(e)
    except WebsiteCheckerException as e:
        logger.warning(f"Error with test configuration: {e.message}")
        raise handle_website_checker_exception(e)
    except Exception as e:
        logger.error(f"Unexpected error with test configuration: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
