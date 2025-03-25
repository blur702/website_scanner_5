import logging
from typing import List, Dict, Any
from bs4 import BeautifulSoup
import cssutils
import html5lib
from app.api.models.scan import ValidationIssue, SeverityLevel
from app.core.exceptions import ValidationException

logger = logging.getLogger(__name__)

class ValidationService:
    def __init__(self, db):
        self.db = db
        self.html_parser = html5lib.HTMLParser(strict=True)
        cssutils.log.setLevel(logging.FATAL)  # Suppress cssutils warnings
        
    async def validate_content(self, content: str, content_type: str, url: str) -> List[ValidationIssue]:
        """Validate content based on its type"""
        try:
            if content_type == 'text/html':
                return await self.validate_html(content, url)
            elif content_type == 'text/css':
                return await self.validate_css(content, url)
            elif content_type == 'application/javascript':
                return await self.validate_javascript(content, url)
            else:
                return []
        except Exception as e:
            logger.error(f"Validation error for {url}: {str(e)}")
            raise ValidationException(str(e))

    async def validate_html(self, content: str, url: str) -> List[ValidationIssue]:
        """Validate HTML content"""
        issues = []
        try:
            soup = BeautifulSoup(content, 'html5lib')
            
            # Check document structure
            issues.extend(self._check_doctype(soup))
            issues.extend(self._check_meta_tags(soup))
            issues.extend(self._check_accessibility(soup))
            issues.extend(self._check_images(soup))
            issues.extend(self._check_links(soup))
            issues.extend(self._check_forms(soup))
            
        except Exception as e:
            logger.error(f"HTML validation error: {str(e)}")
            issues.append(ValidationIssue(
                type="parse_error",
                message=f"Failed to parse HTML: {str(e)}",
                severity=SeverityLevel.ERROR,
                line=0,
                column=0,
                context=None
            ))
            
        return issues

    async def validate_css(self, content: str, url: str) -> List[ValidationIssue]:
        """Validate CSS content"""
        issues = []
        try:
            parser = cssutils.CSSParser(raiseExceptions=True)
            stylesheet = parser.parseString(content)
            
            # Check CSS rules
            issues.extend(self._check_css_compatibility(stylesheet))
            issues.extend(self._check_css_best_practices(stylesheet))
            
        except Exception as e:
            logger.error(f"CSS validation error: {str(e)}")
            issues.append(ValidationIssue(
                type="parse_error",
                message=f"Failed to parse CSS: {str(e)}",
                severity=SeverityLevel.ERROR,
                line=0,
                column=0,
                context=None
            ))
            
        return issues

    def _check_doctype(self, soup: BeautifulSoup) -> List[ValidationIssue]:
        """Check HTML doctype declaration"""
        issues = []
        if not soup.doctype:
            issues.append(ValidationIssue(
                type="doctype_missing",
                message="Missing DOCTYPE declaration",
                severity=SeverityLevel.WARNING,
                line=1,
                column=1,
                context="Add <!DOCTYPE html> at the beginning of the document"
            ))
        return issues

    # Add more validation methods...
