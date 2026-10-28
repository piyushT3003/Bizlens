"""API endpoints for the Forecast Observatory workspace (Panel 3 of Master Design).

Provides endpoints for backtest metrics, held-out validation, root-cause contribution
decomposition, de-trended anomalies, and AI strategic explanation under RULES.md governance.
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.v1.datasets import get_current_user
from app.db.models import User
from app.services.forecasting_engine import forecasting_engine
from app.schemas.forecasting import (
    ForecastObservatoryResponse,
    ObservatoryExplainRequest,
)

router = APIRouter(prefix="/forecasting", tags=["Forecasting & Observatory"])


@router.get(
    "/observatory/{dataset_id}",
    response_model=ForecastObservatoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Fetch complete Forecast Observatory data",
)
def get_observatory_data(
    dataset_id: str,
    dimension: Optional[str] = Query("category", description="Dimension for contribution decomposition (category or region)"),
    currency: Optional[str] = Query(None, description="Active currency code (e.g. INR, USD, EUR)"),
    api_key: Optional[str] = Query(None, description="Optional Gemini API key override"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns deterministic backtest accuracy, held-out validation table, forecast projections,

    root-cause contribution decomposition, de-trended anomalies, and scenario flow graph.
    If the dataset has fewer than 12 temporal intervals, cleanly returns status='insufficient_history'.
    """
    return forecasting_engine.get_observatory_data(
        db=db,
        dataset_id=dataset_id,
        dimension=dimension or "category",
        currency=currency,
        current_user_id=current_user.id if current_user else None,
        api_key=api_key,
    )


@router.post(
    "/explain",
    status_code=status.HTTP_200_OK,
    summary="Explain Forecast Observatory findings via guardrailed AI",
)
def explain_observatory(
    request: ObservatoryExplainRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generates a guardrailed AI explanation of the forecast and contribution dynamics."""
    obs_data = forecasting_engine.get_observatory_data(
        db=db,
        dataset_id=request.dataset_id,
        current_user_id=current_user.id if current_user else None,
        api_key=request.api_key,
    )
    return {
        "dataset_id": request.dataset_id,
        "ai_insight": obs_data.ai_insight,
        "status": obs_data.status,
    }
