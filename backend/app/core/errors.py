from typing import Any, Dict, Optional
from fastapi import HTTPException, status
from pydantic import BaseModel


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None
    request_id: Optional[str] = None


class ErrorEnvelope(BaseModel):
    error: ErrorDetail


class BizLensError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Optional[Any] = None,
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        if isinstance(details, dict):
            self.details = details
        elif details is not None:
            self.details = {"detail": str(details)}
        else:
            self.details = {}
        super().__init__(message)


class ValidationError(BizLensError):
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__("VALIDATION_ERROR", message, status_code=status.HTTP_400_BAD_REQUEST, details=details)


class NotFoundError(BizLensError):
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__("NOT_FOUND", message, status_code=status.HTTP_404_NOT_FOUND, details=details)


class UploadError(BizLensError):
    def __init__(self, code: str, message: str, status_code: int = status.HTTP_400_BAD_REQUEST, details: Optional[Any] = None):
        super().__init__(code, message, status_code=status_code, details=details)


# Standard Error Catalog Codes (Part R4)
ERR_VALIDATION = "VALIDATION_ERROR"
ERR_AUTH_INVALID = "AUTH_INVALID_CREDENTIALS"
ERR_AUTH_LOCKED = "AUTH_LOCKED"
ERR_AUTH_EXPIRED = "AUTH_EXPIRED"
ERR_FORBIDDEN = "FORBIDDEN"
ERR_NOT_FOUND = "NOT_FOUND"
ERR_RATE_LIMITED = "RATE_LIMITED"
ERR_UPLOAD_TOO_LARGE = "UPLOAD_TOO_LARGE"
ERR_UPLOAD_TOO_MANY_ROWS = "UPLOAD_TOO_MANY_ROWS"
ERR_UPLOAD_BAD_TYPE = "UPLOAD_BAD_TYPE"
ERR_UPLOAD_BAD_SIGNATURE = "UPLOAD_BAD_SIGNATURE"
ERR_UPLOAD_MIME_MISMATCH = "UPLOAD_MIME_MISMATCH"
ERR_UPLOAD_MACRO_REJECTED = "UPLOAD_MACRO_REJECTED"
ERR_UPLOAD_ZIP_BOMB = "UPLOAD_ZIP_BOMB"
ERR_UPLOAD_PARSE_FAILED = "UPLOAD_PARSE_FAILED"
ERR_MAPPING_REQUIRED = "MAPPING_REQUIRED"
ERR_DATE_FORMAT_AMBIGUOUS = "DATE_FORMAT_AMBIGUOUS"
ERR_CURRENCY_MIXED = "CURRENCY_MIXED"
ERR_ANALYSIS_UNAVAILABLE = "ANALYSIS_UNAVAILABLE"
ERR_FILTER_INVALID = "FILTER_INVALID"
ERR_VERSION_CONFLICT = "VERSION_CONFLICT"
ERR_AI_CONSENT_REQUIRED = "AI_CONSENT_REQUIRED"
ERR_AI_UNAVAILABLE = "AI_UNAVAILABLE"
ERR_AI_BUDGET_EXCEEDED = "AI_BUDGET_EXCEEDED"
ERR_GUARDRAIL_FAILED = "GUARDRAIL_FAILED"
ERR_CONNECTOR_UNAVAILABLE = "CONNECTOR_UNAVAILABLE"
ERR_JOB_FAILED = "JOB_FAILED"
ERR_INTERNAL = "INTERNAL"
