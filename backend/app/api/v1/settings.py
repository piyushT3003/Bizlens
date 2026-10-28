"""BizLens Settings API: User preferences, Appearance, Locale, AI Key Vault, and Audit Logging."""

from typing import List, Optional
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import User
from app.api.v1.datasets import get_current_user
from app.schemas.settings import (
    SettingsResponse,
    SettingsUpdatePayload,
    APIKeyUpdateRequest,
    APIKeyStatusResponse,
    APIKeyTestResponse,
    SessionItem,
    AuditLogItem,
)
from app.services.settings_service import settings_service

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=SettingsResponse)
def get_user_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve current user profile, preferences, API key status, and crystal completion."""
    return settings_service.get_full_settings(db, current_user)


@router.put("", response_model=SettingsResponse)
def update_user_settings(
    payload: SettingsUpdatePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update profile attributes and application preferences."""
    return settings_service.update_settings(db, current_user, payload)


@router.get("/api-key/status", response_model=APIKeyStatusResponse)
def get_api_key_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check AI key configuration status without leaking plain credentials."""
    return settings_service.get_key_status(db, current_user)


@router.post("/api-key", response_model=APIKeyStatusResponse)
def update_api_key(
    payload: APIKeyUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Safely store encrypted custom API key in vault or clear it."""
    return settings_service.save_api_key(db, current_user, payload.api_key)


@router.post("/api-key/test", response_model=APIKeyTestResponse)
def test_api_key(
    payload: APIKeyUpdateRequest,
):
    """Validate structure and syntax of a Gemini API key."""
    return settings_service.test_key_validity(payload.api_key)


@router.get("/sessions", response_model=List[SessionItem])
def get_user_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List active user authentication sessions."""
    return settings_service.get_active_sessions(db, current_user)


@router.post("/sessions/{session_id}/revoke")
def revoke_user_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Revoke an active user session."""
    success = settings_service.revoke_session(db, current_user, session_id)
    return {"revoked": success, "session_id": session_id}


@router.get("/audit-logs", response_model=List[AuditLogItem])
def get_user_audit_logs(
    limit: int = 15,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve security and settings change audit history."""
    return settings_service.get_audit_logs(db, current_user, limit=limit)
