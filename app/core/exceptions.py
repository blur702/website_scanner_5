from typing import Optional, Dict, Any
from http import HTTPStatus

class WebsiteCheckerException(Exception):
    """Base exception class for Website Checker."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)

class NotFoundException(WebsiteCheckerException):
    """Raised when a requested resource is not found."""
    
    def __init__(self, resource_type: str, resource_id: str):
        super().__init__(
            message=f"{resource_type} with ID {resource_id} not found",
            details={
                "resource_type": resource_type,
                "resource_id": resource_id,
                "status_code": HTTPStatus.NOT_FOUND
            }
        )

class BadRequestException(WebsiteCheckerException):
    """Raised when the request is malformed or invalid."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            details={
                **(details or {}),
                "status_code": HTTPStatus.BAD_REQUEST
            }
        )

class ConflictException(WebsiteCheckerException):
    """Raised when there is a conflict with the current state."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            details={
                **(details or {}),
                "status_code": HTTPStatus.CONFLICT
            }
        )

class ValidationException(WebsiteCheckerException):
    """Raised when data validation fails."""
    
    def __init__(self, errors: Dict[str, str]):
        super().__init__(
            message="Validation error",
            details={
                "errors": errors,
                "status_code": HTTPStatus.UNPROCESSABLE_ENTITY
            }
        )

class CrawlerException(WebsiteCheckerException):
    """Raised when there is an error during crawling."""
    
    def __init__(self, url: str, error: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=f"Error crawling {url}: {error}",
            details={
                "url": url,
                "error": error,
                **(details or {}),
                "status_code": HTTPStatus.INTERNAL_SERVER_ERROR
            }
        )

class ScreenshotError(WebsiteCheckerException):
    """Raised when there is an error capturing screenshots."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            details={
                **(details or {}),
                "status_code": HTTPStatus.INTERNAL_SERVER_ERROR
            }
        )

class ConcurrencyError(WebsiteCheckerException):
    """Raised when there is a concurrency or locking issue."""
    
    def __init__(self, resource_type: str, resource_id: str):
        super().__init__(
            message=f"{resource_type} {resource_id} is locked or in use",
            details={
                "resource_type": resource_type,
                "resource_id": resource_id,
                "status_code": HTTPStatus.LOCKED
            }
        )

class StorageError(WebsiteCheckerException):
    """Raised when there is an error with file storage operations."""
    
    def __init__(self, operation: str, path: str, error: str):
        super().__init__(
            message=f"Storage error during {operation}: {error}",
            details={
                "operation": operation,
                "path": path,
                "error": error,
                "status_code": HTTPStatus.INTERNAL_SERVER_ERROR
            }
        )

class ConfigurationError(WebsiteCheckerException):
    """Raised when there is a configuration error."""
    
    def __init__(self, setting: str, error: str):
        super().__init__(
            message=f"Configuration error for {setting}: {error}",
            details={
                "setting": setting,
                "error": error,
                "status_code": HTTPStatus.INTERNAL_SERVER_ERROR
            }
        )

class RateLimitExceeded(WebsiteCheckerException):
    """Raised when rate limits are exceeded."""
    
    def __init__(self, resource: str, limit: int, reset_time: int):
        super().__init__(
            message=f"Rate limit exceeded for {resource}",
            details={
                "resource": resource,
                "limit": limit,
                "reset_time": reset_time,
                "status_code": HTTPStatus.TOO_MANY_REQUESTS
            }
        )

class DatabaseError(WebsiteCheckerException):
    """Raised when there is a database error."""
    
    def __init__(self, operation: str, error: str):
        super().__init__(
            message=f"Database error during {operation}: {error}",
            details={
                "operation": operation,
                "error": error,
                "status_code": HTTPStatus.INTERNAL_SERVER_ERROR
            }
        )

def handle_exception(exc: Exception) -> Dict[str, Any]:
    """Convert an exception to a standardized error response format."""
    if isinstance(exc, WebsiteCheckerException):
        return {
            "error": {
                "type": exc.__class__.__name__,
                "message": exc.message,
                "details": exc.details,
                "status_code": exc.details.get("status_code", HTTPStatus.INTERNAL_SERVER_ERROR)
            }
        }
    else:
        return {
            "error": {
                "type": "InternalServerError",
                "message": str(exc),
                "details": {},
                "status_code": HTTPStatus.INTERNAL_SERVER_ERROR
            }
        }
