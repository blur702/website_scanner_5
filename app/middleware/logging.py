from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import time
from app.core.logger import app_logger

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        try:
            response = await call_next(request)
            duration = time.time() - start_time
            response.headers['X-Response-Time'] = str(duration)
            
            # Log successful request
            app_logger.log_request(
                request=request,
                response=response
            )
            
            return response
            
        except Exception as e:
            duration = time.time() - start_time
            
            # Log failed request
            app_logger.log_request(
                request=request,
                error=e
            )
            
            raise
