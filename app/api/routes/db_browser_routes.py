from fastapi import APIRouter, Depends, Path, Query, HTTPException, status, Request
from typing import List, Optional, Dict, Any
import logging

from app.services.db_browser_service import DbBrowserService
from app.api.dependencies.services import get_db_browser_service
from app.core.exceptions import WebsiteCheckerException

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Database Browser"])

@router.get("/db/tables", response_model=List[str])
async def list_tables(
    request: Request,
    db_browser_service: DbBrowserService = Depends(get_db_browser_service)
):
    """
    List all database tables
    
    Returns a list of all table names in the database.
    """
    try:
        tables = await db_browser_service.list_tables()
        return tables
    except Exception as e:
        logger.error(f"Error listing tables: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error listing tables: {str(e)}"
        )

@router.get("/db/tables/{table_name}/schema")
async def get_table_schema(
    request: Request,
    table_name: str = Path(..., description="Table name"),
    db_browser_service: DbBrowserService = Depends(get_db_browser_service)
):
    """
    Get schema information for a table
    
    Returns column definitions and constraints for the specified table.
    """
    try:
        schema = await db_browser_service.get_table_schema(table_name)
        return schema
    except ValueError as e:
        logger.warning(f"Table not found: {table_name}")
        raise HTTPException(
            status_code=404,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error getting schema for table {table_name}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error getting schema: {str(e)}"
        )

@router.get("/db/tables/{table_name}/data")
async def get_table_data(
    request: Request,
    table_name: str = Path(..., description="Table name"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=200, description="Items per page"),
    sort_by: Optional[str] = Query(None, description="Column to sort by"),
    sort_dir: str = Query("asc", description="Sort direction (asc or desc)"),
    db_browser_service: DbBrowserService = Depends(get_db_browser_service)
):
    """
    Get data from a table with pagination and sorting
    
    Returns paginated rows from the specified table.
    """
    try:
        data = await db_browser_service.get_table_data(
            table_name, page, limit, sort_by, sort_dir
        )
        return data
    except ValueError as e:
        logger.warning(f"Table not found: {table_name}")
        raise HTTPException(
            status_code=404,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error getting data for table {table_name}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error getting data: {str(e)}"
        )
