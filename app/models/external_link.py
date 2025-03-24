from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base

class ExternalLink(Base):
    __tablename__ = "external_link"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    resource_id = Column(Integer, ForeignKey("resource.id", ondelete="CASCADE"), nullable=False)
    uuid = Column(String, ForeignKey("metadata.uuid", ondelete="CASCADE"), nullable=False)
    url = Column(String, nullable=False)
    domain = Column(String)
    link_text = Column(String)
    context = Column(Text)
    status_code = Column(Integer)
    response_time_ms = Column(Integer)
    check_time = Column(DateTime)
    is_working = Column(Boolean)
    error_message = Column(Text)
    severity = Column(String)
    redirect_url = Column(String)
    content_type = Column(String)
    retry_count = Column(Integer, default=0)
    
    # Relationships
    resource = relationship("Resource", back_populates="external_links")
    
    def __repr__(self):
        return f"<ExternalLink {self.id}: {self.url} (status: {self.status_code})>"
