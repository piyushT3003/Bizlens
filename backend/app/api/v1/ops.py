import os
from fastapi import APIRouter, Depends, status
from fastapi.responses import PlainTextResponse
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.config import settings

router = APIRouter(tags=["Operations"])


@router.get("/health", status_code=status.HTTP_200_OK)
def get_health() -> dict:
    """Liveness probe: verifies that the process is responsive."""
    return {"status": "ok", "app": settings.APP_NAME, "env": settings.APP_ENV}


@router.get("/ready", status_code=status.HTTP_200_OK)
def get_readiness(db: Session = Depends(get_db)) -> dict:
    """Readiness probe: verifies DB connectivity and storage root access."""
    # 1. Check database connectivity
    db_ok = False
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    # 2. Check storage accessibility
    storage_ok = os.path.exists(settings.STORAGE_ROOT) or True
    if not os.path.exists(settings.STORAGE_ROOT):
        try:
            os.makedirs(settings.STORAGE_ROOT, exist_ok=True)
            storage_ok = True
        except Exception:
            storage_ok = False

    all_ready = db_ok and storage_ok
    status_str = "ready" if all_ready else "not_ready"
    return {
        "status": status_str,
        "database": db_ok,
        "storage": storage_ok,
    }


@router.get("/metrics", response_class=PlainTextResponse)
def get_metrics() -> str:
    """Prometheus-compatible operational metrics endpoint."""
    return (
        "# HELP bizlens_up BizLens API process status\n"
        "# TYPE bizlens_up gauge\n"
        "bizlens_up 1\n"
        "# HELP bizlens_ai_guardrail_violations_total Total guardrail validation rejections\n"
        "# TYPE bizlens_ai_guardrail_violations_total counter\n"
        "bizlens_ai_guardrail_violations_total 0\n"
    )
