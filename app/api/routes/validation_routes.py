from fastapi import APIRouter, Depends, HTTPException, Path, Query
from typing import List
import logging

from app.api.models.scan import ValidationIssue, SeverityLevel
from app.services.validation_service import ValidationService
from app.api.dependencies.services import get_validation_service
from app.core.exceptions import ValidationException

router = APIRouter(prefix="/validate", tags=["Validation"])
logger = logging.getLogger(__name__)

@router.post("/{scan_id}/resource/{resource_id}", response_model=List[ValidationIssue])
async def validate_resource(
    scan_id: str = Path(...),
    resource_id: str = Path(...),
    validation_service: ValidationService = Depends(get_validation_service)
):
    """Validate a specific resource"""
    try:
        return await validation_service.validate_resource(scan_id, resource_id)
    except ValidationException as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal validation error")
