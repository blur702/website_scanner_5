from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON
from datetime import datetime

from app.core.database import Base

class RegexFilter(Base):
    __tablename__ = "regex_filter"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    pattern = Column(String, nullable=False)
    description = Column(String)
    is_inclusive = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used = Column(DateTime)
    usage_count = Column(Integer, default=0)
    example_matches = Column(JSON)  # Stored as JSON array
    
    def __repr__(self):
        return f"<RegexFilter {self.id}: {self.name}>"
