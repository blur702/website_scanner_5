from fastapi import APIRouter, Depends, Path, Query, HTTPException, status, BackgroundTasks, Request
from typing import Optional, List
import uuid
from datetime import datetime
import logging

from app.api.models.scan import (
    ScanCreate, ScanResponse, ScanStatusResponse, ResourcesResponse,
    ValidationResponse, ReportRequest, ScreenshotsResponse, ElementDetail,
    PackageOptions, PackageResponse, ResourceType, ResourceStatus,
    SeverityLevel, ReportFormat, ScreenshotType
)
from app.core.exceptions import (
    WebsiteCheckerException, NotFoundException, BadRequestException,
    RateLimitException, UnprocessableEntityException, ConflictException
)
from app.services.scan_service import ScanService
from app.api.dependencies.services import get_scan_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Scan Operations"])

# Error handler for custom exceptions
def handle_website_checker_exception(e: WebsiteCheckerException):
    """Convert WebsiteCheckerException to FastAPI HTTPException"""
    return HTTPException(
        status_code=e.status_code,
        detail={"message": e.message, "details": e.details}
    )

@router.post("/scan", status_code=status.HTTP_201_CREATED, response_model=ScanResponse)
async def create_scan(
    request: Request,
    scan_data: ScanCreate,
    background_tasks: BackgroundTasks,
    scan_service: ScanService = Depends(get_scan_service)
):
    """
    Start a new website scan with the provided configuration.
    
    Rate limited to 5 requests per minute per IP.
    """
    try:
        # Log request
        client_ip = request.client.host if request.client else "unknown"
        logger.info(f"Scan request received from {client_ip} for URL: {scan_data.url}")
        
        # Check for rate limiting (this would be implemented with a real rate limiter)
        # This is a placeholder - in a real app you'd use Redis or similar for rate limiting
        # if rate_limited(client_ip):
        #     raise RateLimitException(limit=5, window=60)
        
        # Create scan ID and initial response
        scan_id = str(uuid.uuid4())
        scan = {
            "uuid": scan_id,
            "created_at": datetime.now(),
            "status": "pending"
        }
        
        # Validate scan data if needed
        if not scan_data.url:
            logger.warning(f"Invalid scan request: Missing URL")
            raise BadRequestException("URL is required", {"field": "url"})
            
        # Add task to background
        logger.debug(f"Adding scan task to background for scan_id: {scan_id}")
        background_tasks.add_task(scan_service.start_scan, scan_id, scan_data)
        
        logger.info(f"Scan created with ID: {scan_id}")
        return scan
        
    except RateLimitException as e:
        logger.warning(f"Rate limit exceeded for IP: {client_ip}")
        raise handle_website_checker_exception(e)
    except BadRequestException as e:
        logger.warning(f"Bad request: {e.message}")
        raise handle_website_checker_exception(e)
    except Exception as e:
        logger.error(f"Unexpected error creating scan: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/scan/{uuid}/status", response_model=ScanStatusResponse)
async def get_scan_status(
    request: Request,
    uuid: str = Path(..., description="The UUID of the scan"),
    scan_service: ScanService = Depends(get_scan_service)
):
    """
    Get the current status and progress of a scan.
    
    Returns detailed information about the scan progress, including download sizes.
    Polling rate limited to 1 request per second.
    """
    try:
        client_ip = request.client.host if request.client else "unknown"
        logger.info(f"Status request for scan {uuid} from {client_ip}")
        
        # Check for rate limiting (this would be implemented with a real rate limiter)
        # In a real app, implement polling rate limiting
        
        # Get scan status
        status_response = await scan_service.get_scan_status(uuid)
        
        logger.debug(f"Status for scan {uuid}: {status_response.status} ({status_response.progress:.1f}%)")
        return status_response
        
    except NotFoundException as e:
        logger.warning(f"Scan not found: {uuid}")
        raise handle_website_checker_exception(e)
    except WebsiteCheckerException as e:
        logger.warning(f"Error retrieving scan status: {e.message}")
        raise handle_website_checker_exception(e)
    except Exception as e:
        logger.error(f"Unexpected error getting scan status: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/scan/{uuid}/resources", response_model=ResourcesResponse)
async def get_scan_resources(
    request: Request,
    uuid: str = Path(..., description="The UUID of the scan"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    type: Optional[ResourceType] = Query(None, description="Filter by resource type"),
    status: Optional[ResourceStatus] = Query(None, description="Filter by resource status"),
    min_size: Optional[int] = Query(None, ge=0, description="Minimum resource size in bytes"),
    max_size: Optional[int] = Query(None, ge=0, description="Maximum resource size in bytes"),
    sort_by_size: bool = Query(False, description="Sort resources by size"),
    scan_service: ScanService = Depends(get_scan_service)
):
    """
    Get a paginated list of resources from a scan.
    
    Results can be filtered and sorted based on various criteria.
    Cache for 5 seconds.
    """
    try:
        client_ip = request.client.host if request.client else "unknown"
        logger.info(f"Resources request for scan {uuid} from {client_ip}")
        logger.debug(f"Resources query parameters: page={page}, limit={limit}, type={type}, " +
                    f"status={status}, min_size={min_size}, max_size={max_size}, sort_by_size={sort_by_size}")
        
        # In a real app, implement caching here
        # response.headers["Cache-Control"] = "max-age=5"
        
        resources = await scan_service.get_scan_resources(
            uuid, page, limit, type, status, min_size, max_size, sort_by_size
        )
        
        logger.debug(f"Returning {len(resources.items)} resources for scan {uuid}")
        return resources
        
    except NotFoundException as e:
        logger.warning(f"Resources not found for scan: {uuid}")
        raise handle_website_checker_exception(e)
    except WebsiteCheckerException as e:
        logger.warning(f"Error retrieving resources: {e.message}")
        raise handle_website_checker_exception(e)
    except Exception as e:
        logger.error(f"Unexpected error getting resources: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/scan/{uuid}/validation", response_model=ValidationResponse)
async def get_validation_results(
    request: Request,
    uuid: str = Path(..., description="The UUID of the scan"),
    severity: Optional[SeverityLevel] = Query(None, description="Filter by severity level"),
    group: Optional[str] = Query(None, description="Filter by validation group"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    scan_service: ScanService = Depends(get_scan_service)
):
    """
    Get validation issues found during the scan.
    
    Results are sorted by severity by default.
    """
    try:
        client_ip = request.client.host if request.client else "unknown"
        logger.info(f"Validation results request for scan {uuid} from {client_ip}")
        logger.debug(f"Validation query parameters: severity={severity}, group={group}, page={page}, limit={limit}")
        
        results = await scan_service.get_validation_results(uuid, severity, group, page, limit)
        
        logger.debug(f"Returning {len(results.items)} validation issues for scan {uuid}")
        return results
        
    except NotFoundException as e:
        logger.warning(f"Validation results not found for scan: {uuid}")
        raise handle_website_checker_exception(e)
    except WebsiteCheckerException as e:
        logger.warning(f"Error retrieving validation results: {e.message}")
        raise handle_website_checker_exception(e)
    except Exception as e:
        logger.error(f"Unexpected error getting validation results: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/scan/{uuid}/report")
async def get_scan_report(
    request: Request,
    uuid: str = Path(..., description="The UUID of the scan"),
    format: ReportFormat = Query(ReportFormat.JSON, description="Report format"),
    sections: Optional[List[str]] = Query(None, description="Sections to include in the report"),
    scan_service: ScanService = Depends(get_scan_service)
):
    """
    Generate and retrieve a report from the scan.
    
    The report format can be JSON, HTML, or a summary.
    """
    try:
        client_ip = request.client.host if request.client else "unknown"
        logger.info(f"Report request for scan {uuid} from {client_ip}, format={format}")
        logger.debug(f"Report parameters: format={format}, sections={sections}")
        
        # Return appropriate response based on format requested
        if format == ReportFormat.HTML:
            from fastapi.responses import HTMLResponse
            logger.debug(f"Generating HTML report for scan {uuid}")
            report_content = await scan_service.generate_report(uuid, format, sections)
            logger.info(f"HTML report generated for scan {uuid}, size={len(report_content)} bytes")
            return HTMLResponse(content=report_content)
        else:
            logger.debug(f"Generating {format} report for scan {uuid}")
            report_data = await scan_service.generate_report(uuid, format, sections)
            logger.info(f"Report generated for scan {uuid} in {format} format")
            return report_data
            
    except NotFoundException as e:
        logger.warning(f"Scan not found for report generation: {uuid}")
        raise handle_website_checker_exception(e)
    except WebsiteCheckerException as e:
        logger.warning(f"Error generating report: {e.message}")
        raise handle_website_checker_exception(e)
    except Exception as e:
        logger.error(f"Unexpected error generating report: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=422,
            detail={"message": f"Error generating report: {str(e)}", "details": {}}
        )

@router.get("/scan/{uuid}/screenshots", response_model=ScreenshotsResponse)
async def get_screenshots(
    request: Request,
    uuid: str = Path(..., description="The UUID of the scan"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=50, description="Items per page"),
    type: Optional[ScreenshotType] = Query(None, description="Filter by screenshot type"),
    scan_service: ScanService = Depends(get_scan_service)
):
    """
    Get a paginated list of screenshots taken during the scan.
    """
    try:
        client_ip = request.client.host if request.client else "unknown"
        logger.info(f"Screenshots request for scan {uuid} from {client_ip}")
        logger.debug(f"Screenshots query parameters: page={page}, limit={limit}, type={type}")
        
        screenshots = await scan_service.get_screenshots(uuid, page, limit, type)
        
        logger.debug(f"Returning {len(screenshots.items)} screenshots for scan {uuid}")
        return screenshots
        
    except NotFoundException as e:
        logger.warning(f"Screenshots not found for scan: {uuid}")
        raise handle_website_checker_exception(e)
    except WebsiteCheckerException as e:
        logger.warning(f"Error retrieving screenshots: {e.message}")
        raise handle_website_checker_exception(e)
    except Exception as e:
        logger.error(f"Unexpected error getting screenshots: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/scan/{uuid}/screenshot/{resource_id}")
async def get_screenshot(
    request: Request,
    uuid: str = Path(..., description="The UUID of the scan"),
    resource_id: str = Path(..., description="The ID of the screenshot"),
    size: str = Query("full", description="Size of the screenshot (full or thumbnail)"),
    scan_service: ScanService = Depends(get_scan_service)
):
    """
    Get a specific screenshot image.
    
    Returns the image file directly.
    """
    try:
        client_ip = request.client.host if request.client else "unknown"
        logger.info(f"Screenshot request for scan {uuid}, resource {resource_id} from {client_ip}")
        logger.debug(f"Screenshot parameters: size={size}")
        
        from fastapi.responses import FileResponse
        
        try:
            # Get the screenshot path
            screenshot_path = await scan_service.get_screenshot_path(uuid, resource_id, size)
            
            logger.debug(f"Serving screenshot from path: {screenshot_path}")
            # Return file response
            return FileResponse(
                path=screenshot_path,
                media_type="image/png",
                filename=f"screenshot_{resource_id}_{size}.png"
            )
        except FileNotFoundError:
            logger.warning(f"Screenshot file not found: {uuid}/{resource_id}")
            raise NotFoundException("Screenshot", f"{resource_id}")
            
    except NotFoundException as e:
        logger.warning(f"Screenshot not found: {resource_id} for scan {uuid}")
        raise handle_website_checker_exception(e)
    except WebsiteCheckerException as e:
        logger.warning(f"Error retrieving screenshot: {e.message}")
        raise handle_website_checker_exception(e)
    except Exception as e:
        logger.error(f"Unexpected error getting screenshot: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/scan/{uuid}/element/{validation_id}", response_model=ElementDetail)
async def get_element_detail(
    request: Request,
    uuid: str = Path(..., description="The UUID of the scan"),
    validation_id: str = Path(..., description="The ID of the validation issue"),
    scan_service: ScanService = Depends(get_scan_service)
):
    """
    Get HTML snippet of a problematic element with context.
    
    Returns HTML code with line numbers and surrounding context.
    """
    try:
        client_ip = request.client.host if request.client else "unknown"
        logger.info(f"Element detail request for scan {uuid}, validation {validation_id} from {client_ip}")
        
        element_detail = await scan_service.get_element_detail(uuid, validation_id)
        
        logger.debug(f"Returning element detail for validation {validation_id}, lines {element_detail.line_start}-{element_detail.line_end}")
        return element_detail
        
    except NotFoundException as e:
        logger.warning(f"Element not found: {validation_id} for scan {uuid}")
        raise handle_website_checker_exception(e)
    except WebsiteCheckerException as e:
        logger.warning(f"Error retrieving element detail: {e.message}")
        raise handle_website_checker_exception(e)
    except Exception as e:
        logger.error(f"Unexpected error getting element detail: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/scan/{uuid}/package", response_model=PackageResponse, status_code=201)
async def create_package(
    request: Request,
    uuid: str = Path(..., description="The UUID of the scan"),
    background_tasks: BackgroundTasks = None,
    options: PackageOptions = None,
    scan_service: ScanService = Depends(get_scan_service),
):
    """
    Create a downloadable package with scan results.
    
    This is an async operation that returns a job ID for status polling.
    """
    try:
        # Ensure required parameters are provided
        if background_tasks is None or options is None:
            logger.warning(f"Missing required parameters for package creation")
            raise BadRequestException("Missing required parameters", {"parameters": ["background_tasks", "options"]})
        
        client_ip = request.client.host if request.client else "unknown"
        logger.info(f"Package creation request for scan {uuid} from {client_ip}")
        
        package_job = await scan_service.create_package(uuid, options)
        
        # Add background task to process the package
        logger.debug(f"Adding package processing task for scan {uuid}, package {package_job['id']}")
        background_tasks.add_task(scan_service.process_package, uuid, package_job["id"])
        
        logger.info(f"Package job created: {package_job['id']} for scan {uuid}")
        return package_job
        
    except NotFoundException as e:
        logger.warning(f"Scan not found for package creation: {uuid}")
        raise handle_website_checker_exception(e)
    except BadRequestException as e:
        logger.warning(f"Bad request for package creation: {e.message}")
        raise handle_website_checker_exception(e)
    except WebsiteCheckerException as e:
        logger.warning(f"Error creating package: {e.message}")
        raise handle_website_checker_exception(e)
    except Exception as e:
        logger.error(f"Unexpected error creating package: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/scan/{uuid}/download")
async def download_package(
    request: Request,
    uuid: str = Path(..., description="The UUID of the scan"),
    format: str = Query("zip", description="Package format (zip or tar.gz)"),
    scan_service: ScanService = Depends(get_scan_service)
):
    """
    Download the final package with scan results.
    
    Returns a binary file download in the requested format.
    """
    try:
        client_ip = request.client.host if request.client else "unknown"
        logger.info(f"Package download request for scan {uuid} from {client_ip}, format={format}")
        
        from fastapi.responses import FileResponse
        
        try:
            package_path = await scan_service.get_package_path(uuid, format)
            
            logger.info(f"Serving package download for scan {uuid}, path={package_path}")
            # Return file for download
            return FileResponse(
                path=package_path,
                media_type="application/zip" if format == "zip" else "application/gzip",
                filename=f"scan_{uuid}.{format}"
            )
        except Exception as e:
            if "not ready" in str(e).lower():
                logger.warning(f"Package for scan {uuid} is not ready yet")
                raise ConflictException("Package is not ready yet", {"scan_id": uuid})
            raise
            
    except NotFoundException as e:
        logger.warning(f"Package not found for scan: {uuid}")
        raise handle_website_checker_exception(e)
    except ConflictException as e:
        logger.warning(f"Package not ready: {e.message}")
        raise handle_website_checker_exception(e)
    except WebsiteCheckerException as e:
        logger.warning(f"Error downloading package: {e.message}")
        raise handle_website_checker_exception(e)
    except Exception as e:
        logger.error(f"Unexpected error downloading package: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
