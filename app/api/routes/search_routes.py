from fastapi import APIRouter, Depends, Path, Query, HTTPException, status, BackgroundTasks, Request
from typing import Optional
import logging

from app.api.models.search import (
    SearchRequest, SearchResponse, ElementsResponse, PatternResponse,
    ElementType, PatternType
)
from app.services.search_service import SearchService
from app.api.dependencies.services import get_search_service
from app.core.exceptions import (
    WebsiteCheckerException, NotFoundException, ConflictException, BadRequestException, UnprocessableEntityException
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Search Operations"])

# Error handler for custom exceptions
def handle_website_checker_exception(e: WebsiteCheckerException):
    """Convert WebsiteCheckerException to FastAPI HTTPException"""
    return HTTPException(
        status_code=e.status_code,
        detail={"message": e.message, "details": e.details}
    )

@router.post("/scan/{uuid}/search", response_model=SearchResponse)
async def search_content(
    request: Request,
    uuid: str = Path(..., description="The UUID of the scan"),
    search_request: SearchRequest = None,
    background_tasks: BackgroundTasks = None,
    search_service: SearchService = Depends(get_search_service)
):
    """
    Search content within a scan with specified criteria.
    
    For large searches, returns a search_id for async results.
    """
    try:
        # Validate required parameters
        if search_request is None:
            logger.warning(f"Missing search request for scan {uuid}")
            raise BadRequestException("Search request is required", {"field": "search_request"})
        
        if background_tasks is None:
            logger.warning(f"Missing background tasks for scan {uuid}")
            raise BadRequestException("Background tasks is required", {"field": "background_tasks"})
        
        client_ip = request.client.host if request.client else "unknown"
        logger.info(f"Search request from {client_ip} for scan {uuid}: '{search_request.query}'")
        logger.debug(f"Search parameters: case_sensitive={search_request.case_sensitive}, "
                    f"regex={search_request.regex}, content_types={search_request.content_types}, "
                    f"max_results={search_request.max_results}")
        
        # For complex searches, process asynchronously
        if search_request.regex or search_request.max_results > 100:
            logger.info(f"Creating async search job for complex query in scan {uuid}")
            search_job = await search_service.create_search_job(uuid, search_request)
            
            logger.debug(f"Adding search job {search_job['search_id']} to background tasks")
            background_tasks.add_task(search_service.process_search_job, uuid, search_job["search_id"])
            
            logger.info(f"Returning pending search job {search_job['search_id']} for scan {uuid}")
            return {
                "search_id": search_job["search_id"],
                "status": "pending",
                "total_matches": 0,
                "items": [],
                "page": 1,
                "limit": search_request.max_results,
                "query": search_request.query,
                "execution_time": 0
            }
        
        # For simple searches, process immediately
        logger.info(f"Processing immediate search for scan {uuid}")
        result = await search_service.search_content(uuid, search_request)
        logger.info(f"Search completed with {result.total_matches} matches in {result.execution_time:.2f}s")
        return result
        
    except NotFoundException as e:
        logger.warning(f"Scan not found for search: {uuid}")
        raise handle_website_checker_exception(e)
    except BadRequestException as e:
        logger.warning(f"Bad request for search: {e.message}")
        raise handle_website_checker_exception(e)
    except WebsiteCheckerException as e:
        logger.warning(f"Error during search: {e.message}")
        raise handle_website_checker_exception(e)
    except Exception as e:
        logger.error(f"Unexpected error during search: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/scan/{uuid}/search/{search_id}", response_model=SearchResponse)
async def get_search_results(
    request: Request,
    uuid: str = Path(..., description="The UUID of the scan"),
    search_id: str = Path(..., description="The search ID"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    search_service: SearchService = Depends(get_search_service)
):
    """
    Get search results for a previous query.
    
    Results are cached for 1 hour.
    """
    try:
        client_ip = request.client.host if request.client else "unknown"
        logger.info(f"Search results request from {client_ip} for scan {uuid}, search {search_id}")
        logger.debug(f"Search results pagination: page={page}, limit={limit}")
        
        # Get search results
        results = await search_service.get_search_results(uuid, search_id, page, limit)
        
        logger.info(f"Returning {len(results.items)} search results (page {page}) for search {search_id}")
        return results
        
    except NotFoundException as e:
        logger.warning(f"Search not found: scan {uuid}, search {search_id}")
        raise handle_website_checker_exception(e)
    except ConflictException as e:
        logger.warning(f"Search still in progress: {search_id}")
        raise handle_website_checker_exception(e)
    except WebsiteCheckerException as e:
        logger.warning(f"Error retrieving search results: {e.message}")
        raise handle_website_checker_exception(e)
    except Exception as e:
        logger.error(f"Unexpected error retrieving search results: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/scan/{uuid}/elements", response_model=ElementsResponse)
async def find_elements(
    request: Request,
    uuid: str = Path(..., description="The UUID of the scan"),
    type: ElementType = Query(..., description="Element type (class or ID)"),
    value: str = Query(..., description="Class name or ID value"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    search_service: SearchService = Depends(get_search_service)
):
    """
    Find elements by class or ID across the site.
    
    Returns matched elements with their HTML and context.
    """
    try:
        client_ip = request.client.host if request.client else "unknown"
        logger.info(f"Element search request from {client_ip} for scan {uuid}: {type}='{value}'")
        logger.debug(f"Element search pagination: page={page}, limit={limit}")
        
        elements = await search_service.find_elements(uuid, type, value, page, limit)
        
        logger.info(f"Found {elements.total} elements matching {type}='{value}' in scan {uuid}")
        logger.debug(f"Returning {len(elements.items)} elements (page {page})")
        return elements
        
    except NotFoundException as e:
        logger.warning(f"Scan not found for element search: {uuid}")
        raise handle_website_checker_exception(e)
    except WebsiteCheckerException as e:
        logger.warning(f"Error finding elements: {e.message}")
        raise handle_website_checker_exception(e)
    except Exception as e:
        logger.error(f"Unexpected error finding elements: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/scan/{uuid}/patterns", response_model=PatternResponse)
async def analyze_patterns(
    request: Request,
    uuid: str = Path(..., description="The UUID of the scan"),
    pattern_type: PatternType = Query(..., description="Type of pattern to analyze"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    search_service: SearchService = Depends(get_search_service)
):
    """
    Find usage patterns across the site (classes, tags, attributes).
    
    Analyzes pattern usage to help identify inconsistencies and opportunities for optimization.
    """
    try:
        client_ip = request.client.host if request.client else "unknown"
        logger.info(f"Pattern analysis request from {client_ip} for scan {uuid}: type={pattern_type}")
        logger.debug(f"Pattern analysis pagination: page={page}, limit={limit}")
        
        patterns = await search_service.analyze_patterns(uuid, pattern_type, page, limit)
        
        logger.info(f"Analyzed {patterns.total} {pattern_type} patterns in scan {uuid}")
        logger.debug(f"Returning {len(patterns.items)} patterns (page {page})")
        return patterns
        
    except NotFoundException as e:
        logger.warning(f"Scan not found for pattern analysis: {uuid}")
        raise handle_website_checker_exception(e)
    except WebsiteCheckerException as e:
        logger.warning(f"Error analyzing patterns: {e.message}")
        raise handle_website_checker_exception(e)
    except Exception as e:
        logger.error(f"Unexpected error analyzing patterns: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
import logging

from app.api.models.search import (
    SearchRequest, SearchResponse, ElementsResponse, PatternResponse,
    ElementType, PatternType
)
from app.services.search_service import SearchService
from app.api.dependencies.services import get_search_service
from app.core.exceptions import NotFoundException, ConflictException

router = APIRouter(prefix="/search", tags=["Search"])
logger = logging.getLogger(__name__)

@router.post("/{scan_id}", response_model=SearchResponse)
async def search_content(
    scan_id: str,
    search_request: SearchRequest,
    search_service: SearchService = Depends(get_search_service)
):
    """Search scan content with filters"""
    try:
        return await search_service.search_content(scan_id, search_request)
    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/elements/{scan_id}", response_model=ElementsResponse)
async def find_elements(
    scan_id: str,
    element_type: ElementType,
    value: str,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    search_service: SearchService = Depends(get_search_service)
):
    """Find elements by class or ID"""
    try:
        return await search_service.find_elements(
            scan_id, element_type, value, page, limit
        )
    except Exception as e:
        logger.error(f"Element search error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
