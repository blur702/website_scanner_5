from fastapi import APIRouter, Depends, Path, Query, HTTPException, status, Request
from typing import Optional
import logging

from app.api.models.regex import (
    RegexPattern, RegexPatternResponse, RegexPatternsResponse,
    RegexTestRequest, RegexTestResponse, RegexCategory
)
from app.services.regex_service import RegexService
from app.api.dependencies.services import get_regex_service
from app.core.exceptions import (
    WebsiteCheckerException, NotFoundException, BadRequestException,
    UnprocessableEntityException
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Regex Operations"])

# Error handler for custom exceptions
def handle_website_checker_exception(e: WebsiteCheckerException):
    """Convert WebsiteCheckerException to FastAPI HTTPException"""
    return HTTPException(
        status_code=e.status_code,
        detail={"message": e.message, "details": e.details}
    )

@router.get("/regex/saved", response_model=RegexPatternsResponse)
async def list_saved_patterns(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=50, description="Items per page"),
    regex_service: RegexService = Depends(get_regex_service)
):
    """
    List all saved regex patterns.
    
    Results are sorted by last used date.
    """
    try:
        client_ip = request.client.host if request.client else "unknown"
        logger.info(f"List saved patterns request from {client_ip}")
        logger.debug(f"List patterns pagination: page={page}, limit={limit}")
        
        patterns = await regex_service.list_patterns(page, limit)
        
        logger.info(f"Returning {len(patterns.items)} patterns (page {page} of {(patterns.total + limit - 1) // limit})")
        return patterns
        
    except Exception as e:
        logger.error(f"Unexpected error listing patterns: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/regex/save", response_model=RegexPatternResponse, status_code=201)
async def save_pattern(
    request: Request,
    pattern: RegexPattern,
    regex_service: RegexService = Depends(get_regex_service)
):
    """
    Save a new regex pattern.
    
    Pattern syntax is validated before saving.
    """
    try:
        client_ip = request.client.host if request.client else "unknown"
        logger.info(f"Save pattern request from {client_ip}: {pattern.name}")
        logger.debug(f"Pattern details: pattern='{pattern.pattern}', is_inclusive={pattern.is_inclusive}")
        
        # Save pattern
        saved_pattern = await regex_service.save_pattern(pattern)
        
        logger.info(f"Pattern saved with ID: {saved_pattern.id}")
        return saved_pattern
        
    except BadRequestException as e:
        logger.warning(f"Bad request saving pattern: {e.message}")
        raise handle_website_checker_exception(e)
    except WebsiteCheckerException as e:
        logger.warning(f"Error saving pattern: {e.message}")
        raise handle_website_checker_exception(e)
    except Exception as e:
        logger.error(f"Unexpected error saving pattern: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.put("/regex/{id}", response_model=RegexPatternResponse)
async def update_pattern(
    request: Request,
    id: str = Path(..., description="ID of the pattern to update"),
    pattern: RegexPattern = None,
    regex_service: RegexService = Depends(get_regex_service)
):
    """
    Update an existing regex pattern.
    
    Cannot update system patterns.
    """
    try:
        # Validate required parameters
        if pattern is None:
            logger.warning(f"Missing pattern data for update: {id}")
            raise BadRequestException("Pattern data is required", {"field": "pattern"})
        
        client_ip = request.client.host if request.client else "unknown"
        logger.info(f"Update pattern request from {client_ip}: pattern ID={id}, name={pattern.name}")
        logger.debug(f"Pattern update details: pattern='{pattern.pattern}', is_inclusive={pattern.is_inclusive}")
        
        # Update pattern
        updated_pattern = await regex_service.update_pattern(id, pattern)
        
        logger.info(f"Pattern updated: {id}")
        return updated_pattern
        
    except NotFoundException as e:
        logger.warning(f"Pattern not found for update: {id}")
        raise handle_website_checker_exception(e)
    except BadRequestException as e:
        logger.warning(f"Bad request updating pattern: {e.message}")
        raise handle_website_checker_exception(e)
    except WebsiteCheckerException as e:
        logger.warning(f"Error updating pattern: {e.message}")
        raise handle_website_checker_exception(e)
    except Exception as e:
        logger.error(f"Unexpected error updating pattern: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.delete("/regex/{id}", status_code=204)
async def delete_pattern(
    request: Request,
    id: str = Path(..., description="ID of the pattern to delete"),
    regex_service: RegexService = Depends(get_regex_service)
):
    """
    Delete a saved regex pattern.
    
    System patterns cannot be deleted.
    """
    try:
        client_ip = request.client.host if request.client else "unknown"
        logger.info(f"Delete pattern request from {client_ip}: pattern ID={id}")
        
        # Delete pattern
        await regex_service.delete_pattern(id)
        
        logger.info(f"Pattern deleted: {id}")
        
    except NotFoundException as e:
        logger.warning(f"Pattern not found for deletion: {id}")
        raise handle_website_checker_exception(e)
    except BadRequestException as e:
        logger.warning(f"Bad request deleting pattern: {e.message}")
        raise handle_website_checker_exception(e)
    except WebsiteCheckerException as e:
        logger.warning(f"Error deleting pattern: {e.message}")
        raise handle_website_checker_exception(e)
    except Exception as e:
        logger.error(f"Unexpected error deleting pattern: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/regex/test", response_model=RegexTestResponse)
async def test_regex(
    request: Request,
    test_request: RegexTestRequest,
    regex_service: RegexService = Depends(get_regex_service)
):
    """
    Test a regex pattern against sample URLs.
    
    Returns match results and performance warnings.
    """
    try:
        client_ip = request.client.host if request.client else "unknown"
        logger.info(f"Test regex request from {client_ip}: pattern='{test_request.pattern}'")
        logger.debug(f"Testing against {len(test_request.test_urls)} URLs")
        
        # Test pattern
        test_results = await regex_service.test_pattern(test_request.pattern, test_request.test_urls)
        
        # Log results
        match_count = sum(1 for m in test_results.matches if m.matches)
        logger.info(f"Regex test completed: {match_count}/{len(test_results.matches)} matches, " +
                    f"valid={test_results.is_valid}, performance_warning={bool(test_results.performance_warning)}")
        
        return test_results
        
    except BadRequestException as e:
        logger.warning(f"Bad request testing regex: {e.message}")
        raise handle_website_checker_exception(e)
    except WebsiteCheckerException as e:
        logger.warning(f"Error testing regex: {e.message}")
        raise handle_website_checker_exception(e)
    except Exception as e:
        logger.error(f"Unexpected error testing regex: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/regex/examples", response_model=dict)
async def get_regex_examples(
    request: Request,
    category: Optional[RegexCategory] = Query(None, description="Filter examples by category"),
    regex_service: RegexService = Depends(get_regex_service)
):
    """
    Get example regex patterns for common use cases.
    
    Examples can be filtered by category.
    """
    try:
        client_ip = request.client.host if request.client else "unknown"
        logger.info(f"Get regex examples request from {client_ip}, category={category}")
        
        # Get examples
        examples = await regex_service.get_examples(category)
        
        # Count examples for logging
        example_count = sum(len(examples_list) for examples_list in examples.values())
        category_count = len(examples)
        logger.info(f"Returning {example_count} regex examples in {category_count} categories")
        
        return examples
        
    except WebsiteCheckerException as e:
        logger.warning(f"Error getting regex examples: {e.message}")
        raise handle_website_checker_exception(e)
    except Exception as e:
        logger.error(f"Unexpected error getting regex examples: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
