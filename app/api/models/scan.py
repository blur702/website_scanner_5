from pydantic import BaseModel, HttpUrl, Field, field_validator
from typing import Dict, List, Optional, Any, Union
from enum import Enum
import uuid
from datetime import datetime

class ScanMode(str, Enum):
    FULL = "full"
    DESIGN = "design"
    SINGLE = "single"
    PATH = "path"
    REGEX = "regex"

class ScanStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class SeverityLevel(str, Enum):
    INFO = "info"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ResourceType(str, Enum):
    HTML = "html"
    CSS = "css"
    JS = "javascript"
    IMAGE = "image"
    FONT = "font"
    DOCUMENT = "document"
    OTHER = "other"

class ResourceStatus(str, Enum):
    OK = "ok"
    ERROR = "error"
    REDIRECTED = "redirected"
    NOT_FOUND = "not_found"
    TIMEOUT = "timeout"
    BLOCKED = "blocked"

class ScanConfig(BaseModel):
    max_urls: int = Field(default=100, ge=1, le=10000)
    max_depth: int = Field(default=3, ge=1, le=10)
    follow_external_links: bool = False
    user_agent: str = "WebsiteChecker/1.0"
    timeout: int = Field(default=30, ge=5, le=180)
    verify_ssl: bool = True
    follow_redirects: bool = True
    screenshot_enabled: bool = True
    crawl_ajax: bool = False
    respect_robots_txt: bool = True
    custom_headers: Optional[Dict[str, str]] = None
    exclude_patterns: Optional[List[str]] = None
    include_patterns: Optional[List[str]] = None
    
    # Mode-specific configuration
    path_restriction: Optional[str] = None
    regex_pattern: Optional[str] = None
    regex_is_inclusive: bool = True
    consolidate_css: bool = False

class ScanCreate(BaseModel):
    url: HttpUrl
    mode: ScanMode = ScanMode.FULL
    config: ScanConfig
    name: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None

    @field_validator('url')
    def validate_url(cls, v):
        return str(v)

class ScanResponse(BaseModel):
    """
    Response model for scan creation.
    
    Contains basic information about the created scan.
    """
    uuid: str
    created_at: datetime
    status: ScanStatus = ScanStatus.PENDING

class ScanStatusResponse(BaseModel):
    uuid: str
    status: ScanStatus
    progress: float = Field(ge=0, le=100)
    current_activity: str
    total_download_size: int = 0
    current_page_size: Optional[int] = None
    average_page_size: Optional[float] = None
    urls_crawled: int = 0
    urls_total: Optional[int] = None
    started_at: Optional[datetime] = None
    updated_at: datetime

class ResourceDetail(BaseModel):
    id: str
    url: str
    type: ResourceType
    status: ResourceStatus
    size: int
    content_type: str
    load_time: float
    page_url: str
    status_code: Optional[int] = None
    redirect_url: Optional[str] = None
    error_message: Optional[str] = None

class ResourcesResponse(BaseModel):
    items: List[ResourceDetail]
    total: int
    page: int
    limit: int

class ValidationIssue(BaseModel):
    id: str
    type: str
    severity: SeverityLevel
    message: str
    url: str
    element_id: Optional[str] = None
    element_selector: Optional[str] = None
    line_number: Optional[int] = None
    column_number: Optional[int] = None
    context: Optional[str] = None
    recommendation: Optional[str] = None

class ValidationResponse(BaseModel):
    items: List[ValidationIssue]
    total: int
    page: int
    limit: int
    issues_by_severity: Dict[SeverityLevel, int]

class ReportFormat(str, Enum):
    JSON = "json"
    HTML = "html"
    SUMMARY = "summary"

class ReportSection(str, Enum):
    OVERVIEW = "overview"
    RESOURCES = "resources"
    VALIDATION = "validation"
    PERFORMANCE = "performance"
    SECURITY = "security"
    ACCESSIBILITY = "accessibility"

class ReportRequest(BaseModel):
    format: ReportFormat = ReportFormat.JSON
    sections: Optional[List[ReportSection]] = None

class ScreenshotType(str, Enum):
    FULL_PAGE = "full_page"
    ELEMENT = "element"
    HIGHLIGHT = "highlight"

class ScreenshotMetadata(BaseModel):
    id: str
    url: str
    type: ScreenshotType
    width: int
    height: int
    created_at: datetime
    element_selector: Optional[str] = None
    related_issue_id: Optional[str] = None

class ScreenshotsResponse(BaseModel):
    items: List[ScreenshotMetadata]
    total: int
    page: int
    limit: int

class ElementDetail(BaseModel):
    html: str
    line_start: int
    line_end: int
    context_before: Optional[str] = None
    context_after: Optional[str] = None
    url: str
    selector: Optional[str] = None

class PackageFormat(str, Enum):
    ZIP = "zip"
    TAR_GZ = "tar.gz"

class PackageOptions(BaseModel):
    format: PackageFormat = PackageFormat.ZIP
    include_screenshots: bool = True
    include_reports: bool = True
    include_raw_data: bool = False
    compress_level: int = Field(default=6, ge=1, le=9)

class PackageResponse(BaseModel):
    id: str
    status: str
    created_at: datetime
    estimated_size: Optional[int] = None
    download_url: Optional[str] = None
    expires_at: Optional[datetime] = None
