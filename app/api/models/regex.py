from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from datetime import datetime
from enum import Enum
import re

class RegexPattern(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    pattern: str = Field(..., min_length=1)
    description: Optional[str] = None
    is_inclusive: bool = True
    
    @field_validator('pattern')
    def validate_regex(cls, v):
        try:
            re.compile(v)
        except re.error as e:
            raise ValueError(f"Invalid regex pattern: {str(e)}")
        return v

class RegexPatternResponse(RegexPattern):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_used: Optional[datetime] = None
    is_system: bool = False

class RegexPatternsResponse(BaseModel):
    items: List[RegexPatternResponse]
    total: int
    page: int
    limit: int

class RegexTestRequest(BaseModel):
    pattern: str
    test_urls: List[str] = Field(..., min_items=1, max_items=100)

class RegexTestMatch(BaseModel):
    url: str
    matches: bool
    groups: Optional[List[str]] = None

class RegexTestResponse(BaseModel):
    pattern: str
    is_valid: bool
    error_message: Optional[str] = None
    matches: List[RegexTestMatch]
    performance_warning: Optional[str] = None

class RegexCategory(str, Enum):
    FILE_EXTENSIONS = "file_extensions"
    ADMIN_PATHS = "admin_paths"
    QUERY_PARAMS = "query_params"
    TRACKING_PARAMS = "tracking_params"
    NUMERIC_IDS = "numeric_ids"
    DATES = "dates"
    EMAILS = "emails"
    CUSTOM = "custom"

class RegexExample(BaseModel):
    name: str
    pattern: str
    description: str
    category: RegexCategory
    examples: List[str]
