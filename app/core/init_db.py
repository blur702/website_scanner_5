import logging
from sqlalchemy.exc import SQLAlchemyError
import os

from app.core.database import Base, engine
from app.models import *  # Import all models to ensure they're registered with Base

logger = logging.getLogger(__name__)

def init_database():
    """Initialize the database schema"""
    try:
        # Create all tables if they don't exist
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
        return True
    except SQLAlchemyError as e:
        logger.error(f"Error creating database tables: {str(e)}")
        return False

if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    
    # Create database directory if it doesn't exist
    db_path = os.path.dirname(engine.url.database)
    if db_path and not os.path.exists(db_path):
        os.makedirs(db_path)
        logger.info(f"Created database directory: {db_path}")
    
    # Initialize database
    if init_database():
        print("Database initialized successfully.")
    else:
        print("Failed to initialize database.")
