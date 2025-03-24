from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime

class ContentType(str, Enum):
    ALL = "all"
    HTML = "html"
    CSS = "css"
    JS = "javascript"
    TEXT = "text"

class ElementType(str, Enum):
    CLASS = "class"
    ID = "id"

class PatternType(str, Enum):
    CLASS_USAGE = "class_usage"
    TAG_DISTRIBUTION = "tag_distribution"
    ATTRIBUTE_USAGE = "attribute_usage"

class SearchRequest(BaseModel):
    query: str
    case_sensitive: bool = False
    regex: bool = False
    content_types: List[ContentType] = [ContentType.ALL]
    max_results: int = Field(default=100, ge=1, le=1000)

class SearchMatch(BaseModel):
    url: str
    content_type: ContentType
    line_number: int
    column_number: int
    context: str
    match: str

class SearchResponse(BaseModel):
    search_id: str
    status: str
    total_matches: int
    items: List[SearchMatch]
    page: int
    limit: int
    query: str
    execution_time: float

class ElementMatch(BaseModel):
    url: str
    element_type: ElementType
    selector: str
    html: str
    line_number: int
    count_on_page: int

class ElementsResponse(BaseModel):
    items: List[ElementMatch]
    total: int
    page: int
    limit: int

class PatternUsage(BaseModel):
    name: str
    count: int
    urls: List[str]
    examples: List[str]

class PatternResponse(BaseModel):
    pattern_type: PatternType
    items: List[PatternUsage]
    total: int
    page: int
    limit: int
