from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base

class Resource(Base):
    __tablename__ = "resource"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    uuid = Column(String, ForeignKey("metadata.uuid", ondelete="CASCADE"), nullable=False)
    original_url = Column(String, nullable=False)
    normalized_url = Column(String, nullable=False)
    resource_type = Column(String, nullable=False)
    mime_type = Column(String)
    is_external = Column(Boolean, default=False)
    domain = Column(String)
    path = Column(String)
    depth = Column(Integer, default=0)
    download_status = Column(String)
    status_code = Column(Integer)
    local_path = Column(String)
    parent_resource_id = Column(Integer, ForeignKey("resource.id", ondelete="SET NULL"))
    link_source = Column(String)
    error_message = Column(Text)
    download_time = Column(DateTime)
    download_duration_ms = Column(Integer)
    content_length = Column(Integer, default=0)
    text_content = Column(Text)
    screenshot_path = Column(String)
    hash = Column(String)
    
    # Relationships
    scan = relationship("Metadata", back_populates="resources")
    parent = relationship("Resource", remote_side=[id], backref="children")
    screenshots = relationship("Screenshot", back_populates="resource", cascade="all, delete-orphan")
    validations = relationship("Validation", back_populates="resource", cascade="all, delete-orphan")
    external_links = relationship("ExternalLink", back_populates="resource", cascade="all, delete-orphan")
    sentiments = relationship("Sentiment", back_populates="resource", cascade="all, delete-orphan")
    search_indices = relationship("SearchIndex", back_populates="resource", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Resource {self.id}: {self.normalized_url} ({self.resource_type})>"
