from pydantic import BaseModel, Field, field_validator
from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum

from .scan import ScanStatus

class ScanSummary(BaseModel):
    uuid: str
    name: Optional[str] = None
    url: str
    status: ScanStatus
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    resource_count: int = 0
    total_size: int = 0
    issue_count: int = 0
    pages_crawled: int = 0

class ScansResponse(BaseModel):
    items: List[ScanSummary]
    total: int
    page: int
    limit: int

class DeleteScanResponse(BaseModel):
    success: bool
    message: str
    deleted_resources: Optional[int] = None

class SettingCategory(str, Enum):
    SCANNING = "scanning"
    REPORTING = "reporting"
    SECURITY = "security"
    PERFORMANCE = "performance"
    ACCESSIBILITY = "accessibility"
    SYSTEM = "system"

class SettingValue(BaseModel):
    name: str
    value: Any
    description: str
    type: str
    allowed_values: Optional[List[Any]] = None
    min_value: Optional[Any] = None
    max_value: Optional[Any] = None
    category: SettingCategory
    is_editable: bool = True

class SettingsResponse(BaseModel):
    settings: Dict[str, Dict[str, SettingValue]]  # Changed from Dict[str, SettingValue]
    categories: List[SettingCategory] = Field(default_factory=lambda: list(SettingCategory))

class UpdateSettingRequest(BaseModel):
    settings: Dict[str, Any]

class TestConfig(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    test_settings: Dict[str, Any]

class TestConfigResponse(TestConfig):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_used: Optional[datetime] = None

class TestConfigsResponse(BaseModel):
    items: List[TestConfigResponse]
    total: int
    page: int
    limit: int
