from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base

class Screenshot(Base):
    __tablename__ = "screenshot"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    resource_id = Column(Integer, ForeignKey("resource.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, nullable=False)
    viewport_width = Column(Integer)
    viewport_height = Column(Integer)
    path = Column(String, nullable=False)
    thumbnail_path = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    filesize = Column(Integer, default=0)
    capture_success = Column(Boolean, default=True)
    error_message = Column(Text)
    
    # Relationships
    resource = relationship("Resource", back_populates="screenshots")
    issue_mappings = relationship("ScreenshotIssueMapping", back_populates="screenshot", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Screenshot {self.id}: {self.type} for resource {self.resource_id}>"

class ScreenshotIssueMapping(Base):
    __tablename__ = "screenshot_issue_mapping"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    screenshot_id = Column(Integer, ForeignKey("screenshot.id", ondelete="CASCADE"), nullable=False)
    validation_id = Column(Integer, ForeignKey("validation.id", ondelete="CASCADE"), nullable=False)
    highlight_coordinates = Column(JSON)  # JSON with x, y, width, height
    highlight_color = Column(String)
    element_selector = Column(String)
    element_snippet = Column(Text)
    order_in_page = Column(Integer)
    
    # Relationships
    screenshot = relationship("Screenshot", back_populates="issue_mappings")
    validation = relationship("Validation", back_populates="screenshot_mappings")
    
    def __repr__(self):
        return f"<ScreenshotIssueMapping {self.id}: {self.screenshot_id} -> {self.validation_id}>"
