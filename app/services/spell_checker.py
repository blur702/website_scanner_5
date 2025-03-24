import logging
import os
import re
from typing import List, Dict, Set, Optional, Tuple
from bs4 import BeautifulSoup
import html
import langdetect
from enchant import Dict as SpellDict, DictWithPWL
from enchant.checker import SpellChecker
import nltk
from nltk.tokenize import sent_tokenize, word_tokenize
from sqlalchemy.orm import Session

from app.models.resource import Resource
from app.models.validation import Validation
from app.core.exceptions import NotFoundException, BadRequestException

logger = logging.getLogger(__name__)

# Ensure nltk resources are downloaded
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

class SpellCheckerService:
    """Service for spell checking and grammar validation in multiple languages"""
    
    def __init__(self, db: Session):
        """Initialize the spell checker service with a database session."""
        self.db = db
        
        # Initialize language dictionaries
        self.dictionaries = {
            'en_US': SpellDict("en_US"),
            'en_GB': SpellDict("en_GB"),
            'es': SpellDict("es"),
            'fr': SpellDict("fr"),
            'de': SpellDict("de")
        }
        
        # Technical terms whitelist
        self.technical_terms = set([
            "javascript", "html", "css", "jquery", "nodejs", "mongodb",
            "api", "json", "ajax", "xpath", "regex", "cdn", "url", "ssl",
            "http", "https", "ftp", "sql", "nosql", "frontend", "backend"
        ])
        
        # Load custom dictionaries if they exist
        custom_dict_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'dictionaries')
        if os.path.exists(custom_dict_path):
            for lang_code in self.dictionaries.keys():
                custom_dict_file = os.path.join(custom_dict_path, f"custom_{lang_code}.txt")
                if os.path.exists(custom_dict_file):
                    self.dictionaries[lang_code] = DictWithPWL(lang_code, custom_dict_file)
        
        logger.info("SpellCheckerService initialized with dictionaries for languages: " + 
                   ", ".join(self.dictionaries.keys()))
    
    async def check_resource(self, resource_id: int, scan_uuid: str, sensitivity: str = "normal") -> List[Dict]:
        """
        Perform spell checking on a resource.
        
        Args:
            resource_id: ID of the resource to check
            scan_uuid: UUID of the scan
            sensitivity: Spell checking sensitivity (strict, normal, relaxed)
            
        Returns:
            List of spelling issues
        """
        logger.info(f"Performing spell check on resource {resource_id} with sensitivity: {sensitivity}")
        
        # Get the resource
        resource = self.db.query(Resource).filter(Resource.id == resource_id).first()
        if not resource:
            logger.warning(f"Resource {resource_id} not found")
            raise NotFoundException("Resource", str(resource_id))
        
        # Skip non-HTML resources
        if resource.resource_type != "html":
            logger.debug(f"Skipping spell check for non-HTML resource: {resource_id}")
            return []
        
        # Check if resource file exists
        if not os.path.exists(resource.local_path):
            logger.warning(f"Resource file not found: {resource.local_path}")
            return []
        
        # Read the HTML content
        with open(resource.local_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        # Extract visible text from HTML
        text_blocks = self._extract_text(html_content)
        
        # Detect language for each text block
        issues = []
        
        for block in text_blocks:
            if len(block['text'].strip()) < 5:  # Skip very short blocks
                continue
                
            # Detect language
            try:
                lang_code = langdetect.detect(block['text'])
                # Map to dictionary language codes
                if lang_code == 'en':
                    lang_code = 'en_US'  # Default to US English
            except:
                lang_code = 'en_US'  # Default language
            
            # Check if we have a dictionary for this language
            if lang_code not in self.dictionaries and lang_code.split('_')[0] in self.dictionaries:
                lang_code = lang_code.split('_')[0]
            
            if lang_code in self.dictionaries:
                # Perform spell checking
                spell_issues = self._check_spelling(block['text'], lang_code, sensitivity)
                
                for issue in spell_issues:
                    # Create validation entry
                    validation = Validation(
                        uuid=scan_uuid,
                        resource_id=resource_id,
                        test_group="Spelling",
                        test_id="spelling_error",
                        test_name="Spelling Error",
                        severity="info",
                        description=f"Spelling error: '{issue['word']}'. Suggestions: {', '.join(issue['suggestions'][:3])}",
                        element_selector=block['selector'],
                        source_snippet=block['snippet'],
                        remediation=f"Consider replacing with: {issue['suggestions'][0] if issue['suggestions'] else ''}"
                    )
                    
                    self.db.add(validation)
                    issues.append(issue)
        
        self.db.commit()
        logger.info(f"Spell check complete for resource {resource_id}: found {len(issues)} issues")
        return issues
    
    def _extract_text(self, html_content: str) -> List[Dict]:
        """Extract visible text from HTML content."""
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Remove script and style elements
        for element in soup(['script', 'style', 'head', 'title', 'meta', 'link']):
            element.extract()
        
        # Extract text from remaining elements
        text_blocks = []
        for element in soup.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'div', 'span', 'td', 'th', 'a']):
            if element.string and element.string.strip():
