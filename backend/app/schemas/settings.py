"""BizLens Platform Settings & Key Vault Schemas."""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class ProfileSchema(BaseModel):
    display_name: str
    email: str
    role: str = "Lead Analytics Architect"
    status: str = "active"
    created_at: Optional[datetime] = None


class PreferencesSchema(BaseModel):
    currency: str = "INR"
    number_grouping: str = "lakh_crore"
    fiscal_year_start_month: int = 4
    date_format_default: str = "DD/MM/YYYY"
    timezone: str = "Asia/Kolkata"
    week_start: int = 1
    theme: str = "dark"
    accent_intensity: float = 1.0
    motion_level: str = "full"
    density: str = "comfortable"
    ai_detail_level: str = "balanced"
    gemini_consent: bool = True
    gemini_consent_at: Optional[datetime] = None
    anomaly_threshold_pct: float = 15.0
    email_digests: bool = True
    webhook_url: Optional[str] = None


class SettingsUpdatePayload(BaseModel):
    display_name: Optional[str] = None
    currency: Optional[str] = None
    number_grouping: Optional[str] = None
    fiscal_year_start_month: Optional[int] = None
    date_format_default: Optional[str] = None
    timezone: Optional[str] = None
    week_start: Optional[int] = None
    theme: Optional[str] = None
    accent_intensity: Optional[float] = None
    motion_level: Optional[str] = None
    density: Optional[str] = None
    ai_detail_level: Optional[str] = None
    gemini_consent: Optional[bool] = None
    anomaly_threshold_pct: Optional[float] = None
    email_digests: Optional[bool] = None
    webhook_url: Optional[str] = None


class APIKeyUpdateRequest(BaseModel):
    api_key: Optional[str] = Field(None, description="Gemini API Key or empty to clear custom key")
    provider: str = Field("google_gemini", description="AI Provider identifier")


class APIKeyStatusResponse(BaseModel):
    provider: str = "google_gemini"
    is_configured: bool
    source: str  # "custom_vault" | "environment" | "none"
    masked_key: Optional[str] = None
    is_valid: bool = True
    message: Optional[str] = None


class APIKeyTestResponse(BaseModel):
    is_valid: bool
    message: str
    model: Optional[str] = None


class SessionItem(BaseModel):
    id: str
    user_agent: Optional[str] = "Current Browser"
    ip: Optional[str] = "127.0.0.1"
    created_at: datetime
    is_current: bool = False


class AuditLogItem(BaseModel):
    id: str
    action: str
    resource_type: str
    ip: Optional[str] = "127.0.0.1"
    created_at: datetime
    metadata: Dict[str, Any] = Field(default_factory=dict)


class FacetCompletion(BaseModel):
    profile: bool = True
    appearance: bool = True
    data_locale: bool = True
    ai_vault: bool = True
    notifications: bool = True
    security: bool = True


class SettingsResponse(BaseModel):
    profile: ProfileSchema
    preferences: PreferencesSchema
    key_status: APIKeyStatusResponse
    completion_percentage: int
    facets: FacetCompletion
