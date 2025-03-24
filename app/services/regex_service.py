import logging
import re
import uuid
import time
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.api.models.regex import (
    RegexPattern, RegexPatternResponse, RegexPatternsResponse,
    RegexTestRequest, RegexTestResponse, RegexTestMatch,
    RegexCategory, RegexExample
)
from app.core.exceptions import NotFoundException, BadRequestException
from app.models.regex_filter import RegexFilter

logger = logging.getLogger(__name__)

class RegexService:
    def __init__(self, db: Session):
        """
        Initialize the regex service with a database session.
        
        Args:
            db: SQLAlchemy database session
        """
        self.db = db
        # Add system patterns if not present
        self._ensure_system_patterns()
        logger.info("RegexService initialized with database session")
    
    async def list_patterns(self, page: int, limit: int) -> RegexPatternsResponse:
        """
        List saved regex patterns with pagination.
        
        Args:
            page: Page number
            limit: Items per page
            
        Returns:
            RegexPatternsResponse with paginated patterns
        """
        logger.info(f"Listing regex patterns, page={page}, limit={limit}")
        
        # Query patterns from database with pagination
        query = self.db.query(RegexFilter)
        
        # Count total for pagination
        total = query.count()
        
        # Sort by last used
        query = query.order_by(RegexFilter.last_used.desc().nullslast())
        
        # Paginate
        patterns = query.offset((page - 1) * limit).limit(limit).all()
        
        # Convert to response model
        items = []
        for pattern in patterns:
            items.append(RegexPatternResponse(
                id=str(pattern.id),
                name=pattern.name,
                pattern=pattern.pattern,
                description=pattern.description,
                is_inclusive=pattern.is_inclusive,
                created_at=pattern.created_at,
                updated_at=pattern.created_at,  # Add updated_at to model if needed
                last_used=pattern.last_used,
                is_system=pattern.id < 100  # Assuming IDs < 100 are system patterns
            ))
        
        logger.debug(f"Returning {len(items)} patterns (page {page} of {(total + limit - 1) // limit if total > 0 else 1})")
        
        return RegexPatternsResponse(
            items=items,  # List of patterns
            total=total,  # Total count for pagination
            page=page,    # Current page
            limit=limit   # Items per page
        )
    
    async def save_pattern(self, pattern: RegexPattern, user_id: Optional[str] = None) -> RegexPatternResponse:
        """Added user_id parameter for future user-specific patterns"""
        """
        Save a new regex pattern.
        
        Args:
            pattern: RegexPattern to save
            
        Returns:
            Saved RegexPatternResponse
            
        Raises:
            BadRequestException: If pattern is invalid
        """
        logger.info(f"Saving new regex pattern: {pattern.name}")
        
        # Validate the pattern syntax
        try:
            re.compile(pattern.pattern)
        except re.error as e:
            logger.warning(f"Invalid regex pattern: {pattern.pattern}, error: {str(e)}")
            raise BadRequestException(f"Invalid regex pattern: {str(e)}")
        
        # Create a new pattern
        now = datetime.now()
        db_pattern = RegexFilter(
            name=pattern.name,
            pattern=pattern.pattern,
            description=pattern.description,
            is_inclusive=pattern.is_inclusive,
            created_at=now,
            last_used=None,
            usage_count=0
        )
        
        self.db.add(db_pattern)
        self.db.commit()
        self.db.refresh(db_pattern)
        
        logger.info(f"Regex pattern saved with ID: {db_pattern.id}")
        
        # Convert to response model
        return RegexPatternResponse(
            id=str(db_pattern.id),
            name=db_pattern.name,
            pattern=db_pattern.pattern,
            description=db_pattern.description,
            is_inclusive=db_pattern.is_inclusive,
            created_at=db_pattern.created_at,
            updated_at=db_pattern.created_at,
            last_used=db_pattern.last_used,
            is_system=False
        )
    
    async def update_pattern(self, pattern_id: str, pattern: RegexPattern) -> RegexPatternResponse:
        """
        Update an existing regex pattern.
        
        Args:
            pattern_id: ID of pattern to update
            pattern: Updated RegexPattern
            
        Returns:
            Updated RegexPatternResponse
            
        Raises:
            NotFoundException: If pattern doesn't exist
            BadRequestException: If pattern is invalid or is a system pattern
        """
        logger.info(f"Updating regex pattern: {pattern_id}")
        
        # Check if pattern exists
        if pattern_id not in self.patterns:
            logger.warning(f"Pattern not found: {pattern_id}")
            raise NotFoundException("Pattern", pattern_id)
        
        existing_pattern = self.patterns[pattern_id]
        
        # Check if it's a system pattern
        if existing_pattern.is_system:
            logger.warning(f"Cannot update system pattern: {pattern_id}")
            raise BadRequestException("Cannot update system patterns")
        
        # Validate the pattern syntax
        try:
            re.compile(pattern.pattern)
        except re.error as e:
            logger.warning(f"Invalid regex pattern: {pattern.pattern}, error: {str(e)}")
            raise BadRequestException(f"Invalid regex pattern: {str(e)}")
        
        # Update the pattern
        updated_pattern = RegexPatternResponse(
            id=pattern_id,
            name=pattern.name,
            pattern=pattern.pattern,
            description=pattern.description,
            is_inclusive=pattern.is_inclusive,
            created_at=existing_pattern.created_at,
            updated_at=datetime.now(),
            last_used=existing_pattern.last_used,
            is_system=existing_pattern.is_system
        )
        
        # Save to storage (would update in DB in real app)
        self.patterns[pattern_id] = updated_pattern
        
        logger.info(f"Regex pattern updated: {pattern_id}")
        
        return updated_pattern
    
    async def delete_pattern(self, pattern_id: str) -> None:
        """
        Delete a regex pattern.
        
        Args:
            pattern_id: ID of pattern to delete
            
        Raises:
            NotFoundException: If pattern doesn't exist
            BadRequestException: If pattern is a system pattern
        """
        logger.info(f"Deleting regex pattern: {pattern_id}")
        
        # Check if pattern exists
        if pattern_id not in self.patterns:
            logger.warning(f"Pattern not found: {pattern_id}")
            raise NotFoundException("Pattern", pattern_id)
        
        existing_pattern = self.patterns[pattern_id]
        
        # Check if it's a system pattern
        if existing_pattern.is_system:
            logger.warning(f"Cannot delete system pattern: {pattern_id}")
            raise BadRequestException("Cannot delete system patterns")
        
        # Delete from storage (would delete from DB in real app)
        del self.patterns[pattern_id]
        
        logger.info(f"Regex pattern deleted: {pattern_id}")
    
    async def test_pattern(self, pattern: str, test_urls: List[str]) -> RegexTestResponse:
        """
        Test a regex pattern against sample URLs.
        
        Args:
            pattern: Regex pattern to test
            test_urls: List of URLs to test against
            
        Returns:
            RegexTestResponse with test results
            
        Raises:
            BadRequestException: If pattern is invalid
        """
        logger.info(f"Testing regex pattern against {len(test_urls)} URLs")
        logger.debug(f"Pattern: {pattern}")
        
        # Validate the pattern syntax
        regex = None
        is_valid = True
        error_message = None
        
        try:
            start_time = time.time()
            regex = re.compile(pattern)
            compile_time = time.time() - start_time
        except re.error as e:
            logger.warning(f"Invalid regex pattern: {pattern}, error: {str(e)}")
            is_valid = False
            error_message = str(e)
            return RegexTestResponse(
                pattern=pattern,
                is_valid=is_valid,
                error_message=error_message,
                matches=[],
                performance_warning=None
            )
        
        # Check for potentially inefficient patterns
        performance_warning = None
        risky_patterns = [".*", "(.+)+", ".?.+"]
        for rp in risky_patterns:
            if rp in pattern:
                performance_warning = f"Pattern contains '{rp}' which may cause catastrophic backtracking on certain inputs"
                logger.warning(f"Performance warning for pattern: {pattern} - {performance_warning}")
                break
        
        # Test each URL
        matches = []
        for url in test_urls:
            match_result = None
            groups = None
            
            try:
                # Time the matching to detect potential performance issues
                start_time = time.time()
                match_result = regex.search(url)
                match_time = time.time() - start_time
                
                # Performance warning based on matching time
                if match_time > 0.1 and not performance_warning:
                    performance_warning = f"Pattern took {match_time:.2f}s to match against URL: {url[:50]}..."
                    logger.warning(f"Slow regex match: {pattern} against {url[:50]}... took {match_time:.2f}s")
                
                if match_result:
                    groups = match_result.groups() if match_result.groups() else None
            except Exception as e:
                logger.error(f"Error testing pattern against URL: {url}, error: {str(e)}")
                # Continue with other URLs
            
            test_match = RegexTestMatch(
                url=url,
                matches=bool(match_result),
                groups=[g for g in groups] if groups else None
            )
            matches.append(test_match)
        
        logger.info(f"Regex test completed. Pattern is valid: {is_valid}, matched {sum(1 for m in matches if m.matches)} URLs")
        
        return RegexTestResponse(
            pattern=pattern,
            is_valid=is_valid,
            error_message=error_message,
            matches=matches,
            performance_warning=performance_warning
        )
    
    async def get_examples(self, category: Optional[RegexCategory] = None) -> Dict[str, List[RegexExample]]:
        """
        Get example regex patterns, optionally filtered by category.
        
        Args:
            category: Optional category filter
            
        Returns:
            Dictionary of category to list of examples
        """
        logger.info(f"Getting regex examples, category={category}")
        
        # Define example patterns
        examples = {
            RegexCategory.FILE_EXTENSIONS: [
                RegexExample(
                    name="Image Files",
                    pattern=r".*\.(jpg|jpeg|png|gif|bmp|webp)$",
                    description="Match common image file extensions",
                    category=RegexCategory.FILE_EXTENSIONS,
                    examples=[
                        "image.jpg",
                        "photo.png",
                        "animation.gif"
                    ]
                ),
                RegexExample(
                    name="Document Files",
                    pattern=r".*\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$",
                    description="Match common document file extensions",
                    category=RegexCategory.FILE_EXTENSIONS,
                    examples=[
                        "report.pdf",
                        "presentation.pptx",
                        "spreadsheet.xlsx"
                    ]
                ),
            ],
            RegexCategory.ADMIN_PATHS: [
                RegexExample(
                    name="Admin Panels",
                    pattern=r"/(admin|administrator|wp-admin|cpanel|dashboard)(/.*)?$",
                    description="Match common administrative paths",
                    category=RegexCategory.ADMIN_PATHS,
                    examples=[
                        "/admin",
                        "/wp-admin/index.php",
                        "/dashboard/users"
                    ]
                ),
                RegexExample(
                    name="CMS Admin",
                    pattern=r"/(cms|joomla|drupal)/admin(/.*)?$",
                    description="Match common CMS admin paths",
                    category=RegexCategory.ADMIN_PATHS,
                    examples=[
                        "/cms/admin",
                        "/joomla/admin/users",
                        "/drupal/admin/config"
                    ]
                ),
            ],
            RegexCategory.QUERY_PARAMS: [
                RegexExample(
                    name="Filtering Parameters",
                    pattern=r"[?&](filter|sort|order|category|tag)=([^&]+)",
                    description="Match common filtering query parameters",
                    category=RegexCategory.QUERY_PARAMS,
                    examples=[
                        "?filter=active",
                        "?sort=date&order=desc",
                        "?category=news"
                    ]
                ),
                RegexExample(
                    name="Pagination Parameters",
                    pattern=r"[?&](page|limit|offset|size)=(\d+)",
                    description="Match pagination query parameters",
                    category=RegexCategory.QUERY_PARAMS,
                    examples=[
                        "?page=3",
                        "?limit=20&offset=40",
                        "?size=50"
                    ]
                ),
            ],
            RegexCategory.TRACKING_PARAMS: [
                RegexExample(
                    name="Analytics Parameters",
                    pattern=r"[?&](utm_source|utm_medium|utm_campaign|gclid|fbclid)=([^&]+)",
                    description="Match common tracking parameters",
                    category=RegexCategory.TRACKING_PARAMS,
                    examples=[
                        "?utm_source=google",
                        "?utm_campaign=summer&utm_medium=email",
                        "?gclid=abc123"
                    ]
                ),
            ],
            RegexCategory.NUMERIC_IDS: [
                RegexExample(
                    name="Product IDs",
                    pattern=r"/products?/(\d+)(/.*)?$",
                    description="Match product ID paths",
                    category=RegexCategory.NUMERIC_IDS,
                    examples=[
                        "/product/12345",
                        "/products/789/details",
                        "/products/42/reviews"
                    ]
                ),
                RegexExample(
                    name="User IDs",
                    pattern=r"/users?/(\d+)(/.*)?$",
                    description="Match user ID paths",
                    category=RegexCategory.NUMERIC_IDS,
                    examples=[
                        "/user/42",
                        "/users/789/profile",
                        "/users/123/settings"
                    ]
                ),
            ],
            RegexCategory.DATES: [
                RegexExample(
                    name="ISO Dates",
                    pattern=r"\d{4}-\d{2}-\d{2}",
                    description="Match ISO format dates (YYYY-MM-DD)",
                    category=RegexCategory.DATES,
                    examples=[
                        "2023-01-15",
                        "2022-12-31",
                        "2024-05-01"
                    ]
                ),
                RegexExample(
                    name="URL Date Paths",
                    pattern=r"/(\d{4})/(\d{2})/(\d{2})(/.*)?$",
                    description="Match blog-style date paths",
                    category=RegexCategory.DATES,
                    examples=[
                        "/2023/01/15",
                        "/2022/12/31/new-year",
                        "/2024/05/01/announcement"
                    ]
                ),
            ],
            RegexCategory.EMAILS: [
                RegexExample(
                    name="Email Addresses",
                    pattern=r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
                    description="Match email addresses",
                    category=RegexCategory.EMAILS,
                    examples=[
                        "user@example.com",
                        "john.doe@company.co.uk",
                        "support@website.io"
                    ]
                ),
            ],
            RegexCategory.CUSTOM: [
                RegexExample(
                    name="Password Validation",
                    pattern=r"^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$",
                    description="Validate password with requirements (8+ chars, letters, numbers, special char)",
                    category=RegexCategory.CUSTOM,
                    examples=[
                        "Password1!",
                        "Secure@123",
                        "Complex_P@ss99"
                    ]
                ),
                RegexExample(
                    name="Phone Numbers",
                    pattern=r"\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}",
                    description="Match common US phone number formats",
                    category=RegexCategory.CUSTOM,
                    examples=[
                        "(123) 456-7890",
                        "123-456-7890",
                        "1234567890"
                    ]
                ),
            ],
        }
        
        # Filter by category if provided
        if category:
            if category in examples:
                result = {category: examples[category]}
            else:
                result = {}
        else:
            result = examples
        
        # Count examples for logging
        example_count = sum(len(examples_list) for examples_list in result.values())
        logger.info(f"Returning {example_count} regex examples in {len(result)} categories")
        
        return result
    
    def _ensure_system_patterns(self):
        """Ensure system patterns exist in the database."""
        system_patterns = [
            {
                "name": "Image Files",
                "pattern": r".*\.(jpg|jpeg|png|gif|bmp|webp)$",
                "description": "Match common image file extensions",
                "is_inclusive": True
            },
            {
                "name": "Admin Paths",
                "pattern": r"/(admin|administrator|wp-admin|cpanel|dashboard)(/.*)?$",
                "description": "Match common administrative paths",
                "is_inclusive": True
            },
            {
                "name": "Tracking Parameters",
                "pattern": r"[?&](utm_source|utm_medium|utm_campaign|gclid|fbclid)=([^&]+)",
                "description": "Match common tracking parameters",
                "is_inclusive": False
            }
        ]
        
        # Check if system patterns already exist
        for i, pattern_data in enumerate(system_patterns):
            # Use ID 1, 2, 3 for system patterns
            pattern_id = i + 1
            
            existing = self.db.query(RegexFilter).filter(RegexFilter.id == pattern_id).first()
            if not existing:
                # Create the system pattern
                system_pattern = RegexFilter(
                    id=pattern_id,
                    name=pattern_data["name"],
                    pattern=pattern_data["pattern"],
                    description=pattern_data["description"],
                    is_inclusive=pattern_data["is_inclusive"],
                    created_at=datetime.now()
                )
                self.db.add(system_pattern)
        
        self.db.commit()
        logger.info("System regex patterns initialized")