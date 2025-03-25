import logging
import os
from datetime import datetime
from typing import Optional
from logging.handlers import RotatingFileHandler

class Logger:
    """Centralized logging configuration for the application"""
    
    def __init__(self, name: str, log_dir: Optional[str] = None):
        self.name = name
        self.log_dir = log_dir or os.path.join(os.path.dirname(__file__), '../../logs')
        self.logger = logging.getLogger(name)
        self.setup_logger()

    def setup_logger(self):
        """Configure logging with file and console handlers"""
        self.logger.setLevel(logging.DEBUG)

        # Create logs directory if it doesn't exist
        os.makedirs(self.log_dir, exist_ok=True)

        # File handler with rotation
        log_file = os.path.join(self.log_dir, f'{self.name}.log')
        file_handler = RotatingFileHandler(
            log_file,
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=5
        )
        file_handler.setLevel(logging.DEBUG)
        file_formatter = logging.Formatter(
            '%(asctime)s [%(levelname)s] %(name)s: %(message)s'
        )
        file_handler.setFormatter(file_formatter)
        self.logger.addHandler(file_handler)

        # Console handler for development
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        console_formatter = logging.Formatter(
            '%(levelname)s: %(message)s'
        )
        console_handler.setFormatter(console_formatter)
        self.logger.addHandler(console_handler)

    def log_request(self, request, response=None, error=None):
        """Log HTTP request details"""
        log_data = {
            'timestamp': datetime.now().isoformat(),
            'method': request.method,
            'url': str(request.url),
            'client_ip': request.client.host if request.client else 'unknown',
            'user_agent': request.headers.get('user-agent', 'unknown')
        }

        if response:
            log_data.update({
                'status_code': response.status_code,
                'response_time': getattr(response, 'response_time', None)
            })

        if error:
            log_data.update({
                'error': str(error),
                'error_type': error.__class__.__name__
            })

        self.logger.info(f"Request: {log_data}")

    def log_scan_event(self, scan_id: str, event: str, details: dict):
        """Log scan-related events"""
        log_data = {
            'scan_id': scan_id,
            'event': event,
            'timestamp': datetime.now().isoformat(),
            **details
        }
        self.logger.info(f"Scan Event: {log_data}")

    def log_performance(self, operation: str, duration: float, details: dict = None):
        """Log performance metrics"""
        log_data = {
            'operation': operation,
            'duration': duration,
            'timestamp': datetime.now().isoformat()
        }
        if details:
            log_data.update(details)
        self.logger.debug(f"Performance: {log_data}")

# Create global logger instance
app_logger = Logger('website_checker')
