from sqlalchemy import Column, Integer, String, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.core.database import Base

class SearchIndex(Base):
    __tablename__ = "search_index"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    resource_id = Column(Integer, ForeignKey("resource.id", ondelete="CASCADE"), nullable=False)
    element_type = Column(String, nullable=False)
    element_value = Column(String, nullable=False)
    context = Column(Text)
    location = Column(String)
    frequency = Column(Integer, default=1)
    
    # Relationships
    resource = relationship("Resource", back_populates="search_indices")
    
    def __repr__(self):
        return f"<SearchIndex {self.id}: {self.element_type}={self.element_value}>"
