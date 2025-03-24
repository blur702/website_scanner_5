from typing import Any, Dict, Optional

class WebsiteCheckerException(Exception):
    """Base exception for Website Checker application."""
    status_code: int = 500
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)

class NotFoundException(WebsiteCheckerException):
    """Exception raised when a requested resource is not found."""
    status_code = 404
    
    def __init__(self, resource_type: str, resource_id: str, details: Optional[Dict[str, Any]] = None):
        message = f"{resource_type} with ID '{resource_id}' not found"
        super().__init__(message, details)

class BadRequestException(WebsiteCheckerException):
    """Exception raised when the request is malformed or invalid."""
    status_code = 400

class ConflictException(WebsiteCheckerException):
    """Exception raised when there's a conflict with the current state."""
    status_code = 409

class UnprocessableEntityException(WebsiteCheckerException):
    """Exception raised when the request is well-formed but cannot be processed."""
    status_code = 422

class RateLimitException(WebsiteCheckerException):
    """Exception raised when a rate limit is exceeded."""
    status_code = 429
    
    def __init__(self, limit: int, window: int, details: Optional[Dict[str, Any]] = None):
        message = f"Rate limit exceeded: {limit} requests per {window} seconds"
        details_with_limits = {"limit": limit, "window": window, **(details or {})}
        super().__init__(message, details_with_limits)
