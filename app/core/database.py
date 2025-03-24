from sqlalchemy import create_engine, Column, Integer
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from contextlib import contextmanager
import logging
import os

from app.core.config import settings

logger = logging.getLogger(__name__)

# Ensure database directory exists
db_path = os.path.dirname(settings.DATABASE_URL.replace('sqlite:///', ''))
if db_path and not os.path.exists(db_path):
    os.makedirs(db_path, exist_ok=True)
    logger.info(f"Created database directory: {db_path}")

# Create engine
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {},
    echo=settings.DEBUG
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for database models
Base = declarative_base()

# Database dependency
def get_db():
    """
    Get a database session.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Context manager for database sessions
@contextmanager
def get_db_context():
    """
    Context manager for database sessions.
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception as e:
        db.rollback()
        logger.exception("Database session error: %s", str(e))
        raise
    finally:
        db.close()

# Initialize database tables
def init_db():
    """Initialize database tables if they don't exist"""
    try:
        # Import models here to prevent circular imports
        # Don't use wildcard imports inside functions
        from app.models.metadata import Metadata
        from app.models.resource import Resource
        from app.models.regex_filter import RegexFilter
        from app.models.external_link import ExternalLink
        from app.models.screenshot import Screenshot, ScreenshotIssueMapping
        from app.models.validation import Validation
        from app.models.sentiment import Sentiment
        from app.models.search_index import SearchIndex
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized")
    except Exception as e:
        logger.error(f"Failed to initialize database: {str(e)}")
