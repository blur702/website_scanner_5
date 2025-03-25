import os
import logging
import json
from typing import Dict, Any, Optional, List
from datetime import datetime
from jinja2 import Environment, FileSystemLoader
from sqlalchemy.orm import Session

from app.models.metadata import Metadata
from app.models.resource import Resource
from app.models.validation import Validation
from app.models.screenshot import Screenshot
from app.models.external_link import ExternalLink
from app.api.models.scan import ResourceType, SeverityLevel, ScanMode, ResourceStatus

logger = logging.getLogger(__name__)

class ReportGenerator:
    """Generate comprehensive scan reports in various formats."""

    def __init__(self, scan_uuid: str, db_session: Session, templates_dir: str = None):
        """Initialize report generator."""
        self.scan_uuid = scan_uuid
        self.db_session = db_session
        self.templates_dir = templates_dir or os.path.join(os.path.dirname(__file__), '../templates')
        self.jinja_env = Environment(
            loader=FileSystemLoader(self.templates_dir),
            autoescape=True
        )
        
    async def generate_report(self, format: str = 'html', sections: Optional[List[str]] = None) -> str:
        """Generate a report in the specified format."""
        scan_data = await self._collect_scan_data()
        
        if format == 'html':
            return await self._generate_html_report(scan_data, sections)
        elif format == 'json':
            return await self._generate_json_report(scan_data, sections)
        elif format == 'summary':
            return await self._generate_summary_report(scan_data)
        else:
            raise ValueError(f"Unsupported report format: {format}")
            
    async def _collect_scan_data(self) -> Dict[str, Any]:
        """Collect all relevant scan data."""
        # Get scan metadata
        scan = self.db_session.query(Metadata).filter(
            Metadata.uuid == self.scan_uuid
        ).first()
        
        if not scan:
            raise ValueError(f"Scan {self.scan_uuid} not found")
            
        # Get resources statistics
        resources = self.db_session.query(Resource).filter(
            Resource.uuid == self.scan_uuid
        ).all()
        
        resource_stats = {
            "total": len(resources),
            "by_type": self._count_by_field(resources, "resource_type"),
            "by_status": self._count_by_field(resources, "download_status"),
            "external": len([r for r in resources if r.is_external]),
            "internal": len([r for r in resources if not r.is_external])
        }
        
        # Get validation issues
        validation_issues = self.db_session.query(Validation).filter(
            Validation.uuid == self.scan_uuid
        ).all()
        
        validation_stats = {
            "total": len(validation_issues),
            "by_severity": self._count_by_field(validation_issues, "severity"),
            "by_group": self._count_by_field(validation_issues, "test_group")
        }
        
        # Get screenshots
        screenshots = self.db_session.query(Screenshot).filter(
            Screenshot.uuid == self.scan_uuid
        ).all()
        
        # Get external links
        external_links = self.db_session.query(ExternalLink).filter(
            ExternalLink.uuid == self.scan_uuid
        ).all()
        
        external_link_stats = {
            "total": len(external_links),
            "broken": len([l for l in external_links if l.status_code >= 400]),
            "by_status": self._count_by_field(external_links, "status_code")
        }
        
        return {
            "metadata": {
                "uuid": scan.uuid,
                "url": scan.original_url,
                "mode": scan.scan_mode,
                "start_time": scan.start_time,
                "end_time": scan.end_time,
                "duration": (scan.end_time - scan.start_time).total_seconds(),
                "status": scan.status,
                "config": scan.config
            },
            "resources": {
                "stats": resource_stats,
                "items": resources
            },
            "validation": {
                "stats": validation_stats,
                "items": validation_issues
            },
            "screenshots": {
                "total": len(screenshots),
                "items": screenshots
            },
            "external_links": {
                "stats": external_link_stats,
                "items": external_links
            }
        }
        
    def _count_by_field(self, items: list, field: str) -> Dict[str, int]:
        """Count items by a specified field."""
        counts = {}
        for item in items:
            value = getattr(item, field)
            counts[value] = counts.get(value, 0) + 1
        return counts
        
    async def _generate_html_report(self, data: Dict[str, Any], sections: Optional[List[str]] = None) -> str:
        """Generate HTML report."""
        # Load main template
        template = self.jinja_env.get_template('report_html.jinja2')
        
        # Prepare section data
        sections_data = {}
        
        if not sections or 'overview' in sections:
            overview_template = self.jinja_env.get_template('report_sections/overview.jinja2')
            sections_data['overview'] = overview_template.render(
                metadata=data['metadata'],
                resource_stats=data['resources']['stats'],
                validation_stats=data['validation']['stats']
            )
            
        if not sections or 'resources' in sections:
            resources_template = self.jinja_env.get_template('report_sections/resources.jinja2')
            sections_data['resources'] = resources_template.render(
                stats=data['resources']['stats'],
                resources=data['resources']['items']
            )
            
        if not sections or 'validation' in sections:
            validation_template = self.jinja_env.get_template('report_sections/validation.jinja2')
            sections_data['validation'] = validation_template.render(
                stats=data['validation']['stats'],
                issues=data['validation']['items']
            )
            
        if not sections or 'screenshots' in sections:
            screenshots_template = self.jinja_env.get_template('report_sections/screenshots.jinja2')
            sections_data['screenshots'] = screenshots_template.render(
                screenshots=data['screenshots']['items']
            )
            
        if not sections or 'external_links' in sections:
            links_template = self.jinja_env.get_template('report_sections/external_links.jinja2')
            sections_data['external_links'] = links_template.render(
                stats=data['external_links']['stats'],
                links=data['external_links']['items']
            )
            
        # Render full report
        return template.render(
            scan=data['metadata'],
            sections=sections_data
        )
        
    async def _generate_json_report(self, data: Dict[str, Any], sections: Optional[List[str]] = None) -> str:
        """Generate JSON report."""
        # Filter sections if specified
        if sections:
            filtered_data = {
                "metadata": data["metadata"]
            }
            for section in sections:
                if section in data:
                    filtered_data[section] = data[section]
            report_data = filtered_data
        else:
            report_data = data
            
        # Convert datetime objects to ISO format
        return json.dumps(report_data, default=str, indent=2)
        
    async def _generate_summary_report(self, data: Dict[str, Any]) -> str:
        """Generate a brief summary report."""
        summary = {
            "uuid": data["metadata"]["uuid"],
            "url": data["metadata"]["url"],
            "mode": data["metadata"]["mode"],
            "duration_seconds": data["metadata"]["duration"],
            "resources": {
                "total": data["resources"]["stats"]["total"],
                "html": data["resources"]["stats"]["by_type"].get(ResourceType.HTML.value, 0),
                "failed": data["resources"]["stats"]["by_status"].get(ResourceStatus.ERROR.value, 0)
            },
            "validation": {
                "total": data["validation"]["stats"]["total"],
                "critical": data["validation"]["stats"]["by_severity"].get(SeverityLevel.CRITICAL.value, 0),
                "high": data["validation"]["stats"]["by_severity"].get(SeverityLevel.HIGH.value, 0)
            },
            "external_links": {
                "total": data["external_links"]["stats"]["total"],
                "broken": data["external_links"]["stats"]["broken"]
            }
        }
        
        return json.dumps(summary, indent=2)
