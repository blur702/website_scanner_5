import logging
from typing import List, Dict, Any, Optional
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

logger = logging.getLogger(__name__)

class DbBrowserService:
    """Service for browsing database tables and contents (read-only)"""
    
    def __init__(self, db: Session):
        self.db = db
        self.inspector = inspect(db.bind)
        logger.info("DbBrowserService initialized")
    
    async def list_tables(self) -> List[str]:
        """
        Get a list of all tables in the database.
        
        Returns:
            List of table names
        """
        tables = self.inspector.get_table_names()
        logger.info(f"Retrieved {len(tables)} tables from database")
        return tables
    
    async def get_table_schema(self, table_name: str) -> List[Dict[str, Any]]:
        """
        Get the schema information for a table.
        
        Args:
            table_name: Name of the table to examine
            
        Returns:
            List of column information dictionaries
            
        Raises:
            ValueError: If table doesn't exist
        """
        if table_name not in self.inspector.get_table_names():
            logger.warning(f"Attempted to get schema for non-existent table: {table_name}")
            raise ValueError(f"Table '{table_name}' does not exist")
        
        columns = self.inspector.get_columns(table_name)
        logger.info(f"Retrieved schema for table {table_name} with {len(columns)} columns")
        
        # Format column information
        result = []
        for col in columns:
            result.append({
                "name": col["name"],
                "type": str(col["type"]),
                "nullable": col.get("nullable", True),
                "default": str(col.get("default", "None")),
                "primary_key": col.get("primary_key", False)
            })
        
        return result
    
    async def get_table_data(self, table_name: str, page: int = 1, limit: int = 50,
                          sort_by: Optional[str] = None, sort_dir: str = "asc",
                          filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Get paginated data from a table with optional filtering and sorting.
        
        Args:
            table_name: Name of table to query
            page: Page number (1-indexed)
            limit: Maximum rows per page
            sort_by: Column to sort by
            sort_dir: Sort direction ("asc" or "desc")
            filters: Dictionary of {column_name: value} for filtering
            
        Returns:
            Dictionary with data, pagination info and column metadata
            
        Raises:
            ValueError: If table doesn't exist
            SQLAlchemyError: On database error
        """
        if table_name not in self.inspector.get_table_names():
            logger.warning(f"Attempted to query non-existent table: {table_name}")
            raise ValueError(f"Table '{table_name}' does not exist")
        
        try:
            # Base query
            query = f"SELECT * FROM {table_name}"
            count_query = f"SELECT COUNT(*) AS total FROM {table_name}"
            
            # Add filters
            params = {}
            if filters:
                filter_conditions = []
                for idx, (col, value) in enumerate(filters.items()):
                    param_name = f"param_{idx}"
                    filter_conditions.append(f"{col} = :{param_name}")
                    params[param_name] = value
                
                if filter_conditions:
                    where_clause = " WHERE " + " AND ".join(filter_conditions)
                    query += where_clause
                    count_query += where_clause
            
            # Add sorting
            if sort_by:
                direction = "DESC" if sort_dir.lower() == "desc" else "ASC"
                query += f" ORDER BY {sort_by} {direction}"
            
            # Add pagination
            offset = (page - 1) * limit
            query += f" LIMIT {limit} OFFSET {offset}"
            
            # Execute count query
            count_result = self.db.execute(text(count_query), params).scalar()
            total_rows = int(count_result) if count_result else 0
            
            # Execute data query
            result = self.db.execute(text(query), params)
            rows = [dict(row._mapping) for row in result]
            
            # Get column names and types
            columns = self.inspector.get_columns(table_name)
            column_info = [{
                "name": col["name"], 
                "type": str(col["type"])
            } for col in columns]
            
            logger.info(f"Retrieved {len(rows)} rows from {table_name} (page {page} of {(total_rows + limit - 1) // limit})")
            
            return {
                "table": table_name,
                "columns": column_info,
                "rows": rows,
                "total": total_rows,
                "page": page,
                "limit": limit,
                "pages": (total_rows + limit - 1) // limit
            }
            
        except SQLAlchemyError as e:
            logger.error(f"Database error querying table {table_name}: {str(e)}")
            raise
