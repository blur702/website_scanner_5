from app.services.scan_service import ScanService
from app.services.search_service import SearchService
from app.services.regex_service import RegexService
from app.services.management_service import ManagementService
from app.services.db_browser_service import DbBrowserService
from app.core.database import get_db
from functools import lru_cache

@lru_cache()
def get_scan_service():
    """
    Get or create a ScanService instance.
    Uses LRU cache to maintain singleton pattern.
    """
    return ScanService(get_db())

@lru_cache()
def get_search_service():
    """
    Get or create a SearchService instance.
    Uses LRU cache to maintain singleton pattern.
    """
    return SearchService(get_db())

@lru_cache()
def get_regex_service():
    """
    Get or create a RegexService instance.
    Uses LRU cache to maintain singleton pattern.
    """
    return RegexService(get_db())

@lru_cache()
def get_management_service():
    """
    Get or create a ManagementService instance.
    Uses LRU cache to maintain singleton pattern.
    """
    return ManagementService(get_db())

@lru_cache()
def get_db_browser_service():
    """
    Get or create a DbBrowserService instance.
    Uses LRU cache to maintain singleton pattern.
    """
    return DbBrowserService(next(get_db()))
