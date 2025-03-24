from sqlalchemy import Column, String, Float, DateTime, Boolean, JSON, Integer, Integer
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base

class Metadata(Base):
    __tablename__ = "metadata"
    
    uuid = Column(String, primary_key=True, index=True)
    original_url = Column(String, nullable=False)
    normalized_url = Column(String, nullable=False)
    scan_mode = Column(String, nullable=False)
    url_regex_filter = Column(String)
    regex_is_inclusive = Column(Boolean, default=True)
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime)
    status = Column(String, nullable=False, default="queued")
    progress = Column(Float, default=0.0)
    config = Column(JSON)
    stats = Column(JSON)
    total_download_size = Column(Integer, default=0)
    resource_count = Column(Integer, default=0)
    downloaded_count = Column(Integer, default=0)
    page_count = Column(Integer, default=0)
    external_link_count = Column(Integer, default=0)
    external_link_errors = Column(Integer, default=0)
    cache_path = Column(String)
    package_path = Column(String)
    error = Column(String)
    
    # Relationships
    resources = relationship("Resource", back_populates="scan", cascade="all, delete-orphan")
    validations = relationship("Validation", back_populates="scan", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Scan {self.uuid}: {self.original_url} ({self.status})>"
