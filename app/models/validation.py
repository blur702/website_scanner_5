from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base

class Validation(Base):
    __tablename__ = "validation"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    uuid = Column(String, ForeignKey("metadata.uuid", ondelete="CASCADE"), nullable=False)
    resource_id = Column(Integer, ForeignKey("resource.id", ondelete="CASCADE"), nullable=False)
    test_group = Column(String)
    test_id = Column(String)
    test_name = Column(String)
    severity = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    element_selector = Column(String)
    line_number = Column(Integer)
    column_number = Column(Integer)
    source_snippet = Column(Text)
    screenshot_id = Column(Integer, ForeignKey("screenshot.id", ondelete="SET NULL"))
    remediation = Column(Text)
    detected_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    scan = relationship("Metadata", back_populates="validations")
    resource = relationship("Resource", back_populates="validations")
    screenshot_mappings = relationship("ScreenshotIssueMapping", back_populates="validation", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Validation {self.id}: {self.test_id} ({self.severity})>"
