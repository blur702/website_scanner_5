from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base

class Sentiment(Base):
    __tablename__ = "sentiment"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    resource_id = Column(Integer, ForeignKey("resource.id", ondelete="CASCADE"), nullable=False)
    sentiment_score = Column(Float)
    sentiment_label = Column(String)
    confidence = Column(Float)
    subjectivity = Column(Float)
    dominant_emotions = Column(JSON)  # JSON array of emotions
    keywords = Column(JSON)  # JSON array of keywords
    analyzed_text_length = Column(Integer)
    
    # Relationships
    resource = relationship("Resource", back_populates="sentiments")
    
    def __repr__(self):
        return f"<Sentiment {self.id}: {self.sentiment_label} ({self.sentiment_score})>"
