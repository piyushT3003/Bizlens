"""Pytest suite for Phase 12: Platform Settings, User Preferences, Key Vault & Configuration Crystal.

Tests:
1. Retrieval of default settings, user profile, key status, and crystal completion.
2. Updating user preferences (currency, number grouping, fiscal month, theme, density, motion).
3. Secret encryption, vault storage, and masking (zero plain-text key exposure).
4. API key validation endpoint.
5. Active sessions listing and revocation.
6. Security audit logs tracking settings mutations.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.models import User, UserSetting, AuditLog
from app.db.session import get_db
from app.services.settings_service import encrypt_secret, decrypt_secret, mask_secret, settings_service


def test_encryption_and_masking():
    """Verify AES/Fernet encryption produces cipher text and decrypts cleanly, with zero plain text."""
    plain = "AIzaSySecretTestKey123456789"
    cipher = encrypt_secret(plain)
    assert cipher != plain
    assert len(cipher) > len(plain)

    decrypted = decrypt_secret(cipher)
    assert decrypted == plain

    # Verify masking
    masked = mask_secret(plain)
    assert masked.startswith("AIzaSy")
    assert masked.endswith("6789")
    assert "****" in masked
    assert "SecretTestKey" not in masked


def test_get_settings(client: TestClient):
    """Verify GET /api/v1/settings returns full profile, preferences, and completion score."""
    res = client.get("/api/v1/settings")
    assert res.status_code == 200
    data = res.json()

    assert "profile" in data
    assert data["profile"]["email"] == "piyush@bizlens.ai"
    assert "preferences" in data
    assert data["preferences"]["currency"] in ["INR", "USD", "EUR"]
    assert "key_status" in data
    assert "completion_percentage" in data
    assert 50 <= data["completion_percentage"] <= 100
    assert "facets" in data
    assert data["facets"]["profile"] is True
    assert data["facets"]["appearance"] is True


def test_update_settings_preferences(client: TestClient):
    """Verify PUT /api/v1/settings persists user modifications and recalculates completion."""
    payload = {
        "display_name": "Piyush Toddale",
        "currency": "USD",
        "number_grouping": "international",
        "fiscal_year_start_month": 1,
        "theme": "hybrid",
        "motion_level": "reduced",
        "density": "compact",
        "ai_detail_level": "deep",
        "gemini_consent": True,
    }
    res = client.put("/api/v1/settings", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["profile"]["display_name"] == "Piyush Toddale"
    assert data["preferences"]["currency"] == "USD"
    assert data["preferences"]["number_grouping"] == "international"
    assert data["preferences"]["fiscal_year_start_month"] == 1
    assert data["preferences"]["theme"] == "hybrid"
    assert data["preferences"]["motion_level"] == "reduced"
    assert data["preferences"]["density"] == "compact"
    assert data["preferences"]["ai_detail_level"] == "deep"
    assert data["preferences"]["gemini_consent"] is True

    # Check persistence via GET
    get_res = client.get("/api/v1/settings")
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert get_data["preferences"]["currency"] == "USD"
    assert get_data["preferences"]["theme"] == "hybrid"


def test_api_key_vault_lifecycle(client: TestClient):
    """Verify custom Gemini API key encryption in vault, status masking, and clearing."""
    raw_key = "AIzaSyCustomVaultKey9876543210"

    # 1. Update API key
    res = client.post("/api/v1/settings/api-key", json={"api_key": raw_key, "provider": "google_gemini"})
    assert res.status_code == 200
    status_data = res.json()
    assert status_data["is_configured"] is True
    assert status_data["source"] == "custom_vault"
    assert status_data["masked_key"] is not None
    assert "VaultKey" not in status_data["masked_key"]
    assert status_data["masked_key"].startswith("AIzaSy")

    # 2. Status endpoint returns masked without exposing secret
    status_res = client.get("/api/v1/settings/api-key/status")
    assert status_res.status_code == 200
    stat = status_res.json()
    assert stat["source"] == "custom_vault"
    assert raw_key not in stat["masked_key"]

    # 3. Test key validation endpoint
    test_res = client.post("/api/v1/settings/api-key/test", json={"api_key": raw_key})
    assert test_res.status_code == 200
    test_data = test_res.json()
    assert test_data["is_valid"] is True

    # Invalid short key test
    short_res = client.post("/api/v1/settings/api-key/test", json={"api_key": "short"})
    assert short_res.status_code == 200
    assert short_res.json()["is_valid"] is False

    # 4. Clear key from vault
    clear_res = client.post("/api/v1/settings/api-key", json={"api_key": "", "provider": "google_gemini"})
    assert clear_res.status_code == 200
    cleared_stat = clear_res.json()
    assert cleared_stat["source"] in ["environment", "none"]


def test_sessions_and_audit_logs(client: TestClient):
    """Verify active sessions listing, session revocation, and security audit log tracking."""
    # Sessions
    sess_res = client.get("/api/v1/settings/sessions")
    assert sess_res.status_code == 200
    sessions = sess_res.json()
    assert len(sessions) >= 1
    assert any(s["is_current"] for s in sessions)

    # Revoke session
    revoke_res = client.post(f"/api/v1/settings/sessions/{sessions[0]['id']}/revoke")
    assert revoke_res.status_code == 200
    assert "revoked" in revoke_res.json()

    # Audit Logs
    audit_res = client.get("/api/v1/settings/audit-logs")
    assert audit_res.status_code == 200
    logs = audit_res.json()
    assert len(logs) >= 1
    actions = [l["action"] for l in logs]
    assert any(a in ["update_settings", "set_api_key", "clear_api_key", "session_authenticated"] for a in actions)
