from typing import Generator
from app.core.database import get_db
from app.services.scan_service import ScanService
from app.services.search_service import SearchService
from app.services.regex_service import RegexService
from app.services.management_service import ManagementService
from app.services.db_browser_service import DbBrowserService

def get_scan_service() -> Generator[ScanService, None, None]:
    """Get ScanService instance with managed DB session"""
    with get_db() as db:
        yield ScanService(db)

def get_search_service() -> Generator[SearchService, None, None]:
    """Get SearchService instance with managed DB session"""
    with get_db() as db:
        yield SearchService(db)

def get_regex_service() -> Generator[RegexService, None, None]:
    """Get RegexService instance with managed DB session"""
    with get_db() as db:
        yield RegexService(db)

def get_management_service() -> Generator[ManagementService, None, None]:
    """Get ManagementService instance with managed DB session"""
    with get_db() as db:
        yield ManagementService(db)

def get_db_browser_service() -> Generator[DbBrowserService, None, None]:
    """Get DbBrowserService instance with managed DB session"""
    with get_db() as db:
        yield DbBrowserService(db)
