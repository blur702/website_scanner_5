import logging
import os
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
import jinja2

from app.models.metadata import Metadata
from app.models.resource import Resource
from app.models.validation import Validation
from app.models.external_link import ExternalLink
from app.core.exceptions import NotFoundException, BadRequestException

logger = logging.getLogger(__name__)

class ReportGenerator:
    """
    Generates comprehensive reports in various formats (HTML, PDF, CSV, JSON).
    """
    
    def __init__(self, db_session):
        """Initialize the report generator with database session."""
        self.db_session = db_session
        
        # Set up Jinja2 template environment
        template_dir = os.path.join(os.path.dirname(__file__), '..', 'templates')
        self.template_env = jinja2.Environment(
            loader=jinja2.FileSystemLoader(template_dir),
            autoescape=jinja2.select_autoescape(['html', 'xml'])
        )
        
        logger.info("ReportGenerator initialized")
    
    async def generate_html_report(self, scan_uuid: str, sections: Optional[List[str]] = None) -> str:
        """
        Generate an HTML report for a scan.
        
        Args:
            scan_uuid: UUID of the scan
            sections: Optional list of sections to include
            
        Returns:
            HTML report content
        
        Raises:
            NotFoundException: If the scan doesn't exist
        """
        logger.info(f"Generating HTML report for scan {scan_uuid}")
        
        # Get scan metadata
        scan = self.db_session.query(Metadata).filter(Metadata.uuid == scan_uuid).first()
        if not scan:
            logger.warning(f"Scan not found: {scan_uuid}")
            raise NotFoundException("Scan", scan_uuid)
        
        # Collect data for the report
        report_data = await self._collect_report_data(scan, sections)
        
        # Render the HTML template
        template = self.template_env.get_template('report_html.jinja2')
        html_content = template.render(
            scan=scan,
            data=report_data,
            generated_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        )
        
        # Save the report to a file
        report_path = os.path.join(scan.cache_path, "reports", "report.html")
        os.makedirs(os.path.dirname(report_path), exist_ok=True)
        
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        logger.info(f"HTML report generated and saved to {report_path}")
        return html_content
    
    async def generate_json_report(self, scan_uuid: str, sections: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Generate a JSON report for a scan.
        
        Args:
            scan_uuid: UUID of the scan
            sections: Optional list of sections to include
            
        Returns:
            JSON report data
        
        Raises:
            NotFoundException: If the scan doesn't exist
        """
        logger.info(f"Generating JSON report for scan {scan_uuid}")
        
        # Get scan metadata
        scan = self.db_session.query(Metadata).filter(Metadata.uuid == scan_uuid).first()
        if not scan:
            logger.warning(f"Scan not found: {scan_uuid}")
            raise NotFoundException("Scan", scan_uuid)
        
        # Collect data for the report
        report_data = await self._collect_report_data(scan, sections)
        
        # Create the JSON structure
        json_report = {
            "scan_id": scan.uuid,
            "url": scan.original_url,
            "mode": scan.scan_mode,
            "start_time": scan.start_time.isoformat() if scan.start_time else None,
            "end_time": scan.end_time.isoformat() if scan.end_time else None,
            "status": scan.status,
            "data": report_data,
            "generated_at": datetime.now().isoformat()
        }
        
        # Save the report to a file
        report_path = os.path.join(scan.cache_path, "reports", "report.json")
        os.makedirs(os.path.dirname(report_path), exist_ok=True)
        
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(json_report, f, indent=2)
        
        logger.info(f"JSON report generated and saved to {report_path}")
        return json_report
    
    async def _collect_report_data(self, scan: Metadata, sections: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Collect data for the report based on selected sections.
        
        Args:
            scan: Scan metadata
            sections: Optional list of sections to include
            
        Returns:
            Dictionary with report data
        """
        # Define default sections to include
        all_sections = ["overview", "resources", "validation", "external_links", "screenshots", "performance"]
        
        # Filter sections if provided
        if sections:
            selected_sections = [s for s in sections if s in all_sections]
        else:
            selected_sections = all_sections
        
        report_data = {}
        
        # Overview section - always included
        report_data["overview"] = {
            "url": scan.original_url,
            "scan_mode": scan.scan_mode,
            "start_time": scan.start_time,
            "end_time": scan.end_time,
            "duration": (scan.end_time - scan.start_time).total_seconds() if scan.end_time else None,
            "resource_count": scan.resource_count,
            "page_count": scan.page_count,
            "total_download_size": scan.total_download_size,
            "external_link_count": scan.external_link_count,
            "external_link_errors": scan.external_link_errors
        }
        
        # Include other sections based on selection
        if "resources" in selected_sections:
            report_data["resources"] = await self._collect_resources_data(scan)
        
        if "validation" in selected_sections:
            report_data["validation"] = await self._collect_validation_data(scan)
        
        if "external_links" in selected_sections:
            report_data["external_links"] = await self._collect_external_links_data(scan)
