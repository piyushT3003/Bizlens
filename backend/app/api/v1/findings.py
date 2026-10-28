"""BizLens Shared Findings & Business Insights API Router: Discovery, status transitions, evidence lineage, and AI strategic advisory."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError, ValidationError
from app.core.logging import logger
from app.db.session import get_db
from app.db.models import User, Dataset, DatasetVersion, Finding, UserSetting
from app.api.v1.datasets import get_current_user
from app.schemas.finding import (
    FindingResponse,
    FindingsSummaryResponse,
    FindingStatusUpdate,
    FindingExplainResponse,
)
from app.services.findings_engine import findings_engine, format_currency_val, _format_currency_inr

router = APIRouter(prefix="/findings", tags=["findings"])


def _map_finding_to_response(finding: Finding, dataset_id: str, dataset_name: str) -> FindingResponse:
    ev = finding.evidence or {}
    title = finding.evidence.get("title") or finding.title if hasattr(finding, "title") and finding.title else ""
    if not title:
        dim = ev.get("dimension") or "Metric"
        seg = ev.get("segment_value") or ev.get("metric") or "Dataset"
        title = f"{finding.kind.title()}: {seg} ({ev.get('impact_formatted', '')})"

    return FindingResponse(
        id=finding.id,
        version_id=finding.version_id,
        dataset_id=dataset_id,
        dataset_name=dataset_name,
        title=title,
        kind=finding.kind,
        priority=finding.priority,
        evidence=ev,
        interpretation=finding.interpretation,
        potential_action=finding.potential_action,
        status=finding.status,
        status_history=finding.status_history or [],
        created_at=finding.created_at.isoformat() if finding.created_at else "",
        updated_at=finding.updated_at.isoformat() if finding.updated_at else "",
    )


@router.get("/dataset/{dataset_id}", response_model=FindingsSummaryResponse)
def get_dataset_findings(
    dataset_id: str,
    version_id: Optional[str] = Query(None),
    force_refresh: bool = Query(False),
    currency: Optional[str] = Query(None),
    number_grouping: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieves all proactive findings for the dataset, auto-evaluating with DuckDB if not yet computed."""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset and dataset_id in ["ds-retail-q3", "f80dfee4-98fe-4fa0-82c2-32d0b2e8f2ac"]:
        alt_id = "f80dfee4-98fe-4fa0-82c2-32d0b2e8f2ac" if dataset_id == "ds-retail-q3" else "ds-retail-q3"
        dataset = db.query(Dataset).filter(Dataset.id == alt_id).first()
    if not dataset:
        dataset = db.query(Dataset).filter(Dataset.name == dataset_id).first()
    if not dataset:
        dataset = db.query(Dataset).filter(Dataset.name.ilike(dataset_id)).first()
    if not dataset:
        raise NotFoundError("Dataset", dataset_id)

    # Sanitize FastAPI Query defaults when invoked directly or in tests
    version_id = version_id if isinstance(version_id, str) and version_id else None
    currency = currency if isinstance(currency, str) and currency else None
    number_grouping = number_grouping if isinstance(number_grouping, str) and number_grouping else None
    force_refresh = force_refresh if isinstance(force_refresh, bool) else False

    # Resolve user preferences for currency and number grouping
    user_setting = (
        db.query(UserSetting).filter(UserSetting.user_id == current_user.id).first()
        if current_user
        else None
    )
    active_currency = currency or (user_setting.currency if user_setting and user_setting.currency else "INR")
    active_grouping = number_grouping or (user_setting.number_grouping if user_setting and user_setting.number_grouping else "lakh_crore")

    # Evaluate or retrieve cached findings
    findings = findings_engine.evaluate_findings(
        db=db,
        dataset_id=dataset.id,
        version_id=version_id,
        force_refresh=force_refresh,
        currency=active_currency,
        number_grouping=active_grouping,
    )

    # Compute summary aggregates
    total_findings = len(findings)
    opps = sum(1 for f in findings if f.kind == "opportunity")
    risks = sum(1 for f in findings if f.kind == "risk")
    effs = sum(1 for f in findings if f.kind == "efficiency")
    anoms = sum(1 for f in findings if f.kind == "anomaly")
    high_pri = sum(1 for f in findings if f.priority == "high")
    open_cnt = sum(1 for f in findings if f.status == "open")
    applied_cnt = sum(1 for f in findings if f.status == "applied")

    total_risk_amt = sum(
        f.evidence.get("impact_amount", 0.0)
        for f in findings
        if f.kind == "risk" and f.status != "dismissed"
    )
    total_upside_amt = sum(
        f.evidence.get("impact_amount", 0.0)
        for f in findings
        if f.kind == "opportunity" and f.status != "dismissed"
    )

    # Determine metric type across findings: if findings contain monetary values, keep currency formatting
    curr_symbols = ["₹", "$", "€", "£"]
    curr_findings = [
        f for f in findings
        if any(sym in (f.evidence.get("impact_formatted", "") or "") for sym in curr_symbols)
    ]
    if curr_findings:
        is_currency_metric = True
        active_unit_name = "Currency"
    else:
        is_currency_metric = False
        active_unit_name = "Units"
        non_curr_units = [
            "Customers", "Users", "Employees", "Patients", "Accounts",
            "Followers", "Impressions", "Clicks", "Likes", "Shares",
            "Orders", "Transactions", "Records", "Units"
        ]
        for f in findings:
            imp_str = f.evidence.get("impact_formatted", "") or ""
            for u in non_curr_units:
                if u in imp_str:
                    active_unit_name = u
                    break
            if active_unit_name != "Units":
                break

    total_risk_formatted = format_currency_val(
        total_risk_amt,
        currency=active_currency,
        grouping=active_grouping,
        is_currency=is_currency_metric,
        unit_name=active_unit_name,
    )
    total_upside_formatted = (
        ("+" if total_upside_amt > 0 else "")
        + format_currency_val(
            total_upside_amt,
            currency=active_currency,
            grouping=active_grouping,
            is_currency=is_currency_metric,
            unit_name=active_unit_name,
        )
    )

    ver = (
        db.query(DatasetVersion).filter(DatasetVersion.id == version_id).first()
        if version_id
        else db.query(DatasetVersion).filter(DatasetVersion.id == dataset.active_version_id).first()
    )
    v_id = ver.id if ver else ""
    v_num = ver.version_number if ver else 1

    mapped_findings = [_map_finding_to_response(f, dataset.id, dataset.name) for f in findings]

    return FindingsSummaryResponse(
        dataset_id=dataset.id,
        dataset_name=dataset.name,
        version_id=v_id,
        version_number=v_num,
        total_findings=total_findings,
        opportunities_count=opps,
        risks_count=risks,
        efficiencies_count=effs,
        anomalies_count=anoms,
        high_priority_count=high_pri,
        open_count=open_cnt,
        applied_count=applied_cnt,
        total_impact_at_risk=round(total_risk_amt, 2),
        total_impact_at_risk_formatted=total_risk_formatted,
        total_upside_potential=round(total_upside_amt, 2),
        total_upside_potential_formatted=total_upside_formatted,
        findings=mapped_findings,
    )


@router.post("/dataset/{dataset_id}/refresh", response_model=FindingsSummaryResponse)
def refresh_dataset_findings(
    dataset_id: str,
    version_id: Optional[str] = Query(None),
    currency: Optional[str] = Query(None),
    number_grouping: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Forces recalculation of findings across DuckDB detectors."""
    return get_dataset_findings(
        dataset_id=dataset_id,
        version_id=version_id,
        force_refresh=True,
        currency=currency,
        number_grouping=number_grouping,
        db=db,
        current_user=current_user,
    )


@router.get("/{finding_id}", response_model=FindingResponse)
def get_finding_detail(
    finding_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieves full detail and evidence lineage for a specific finding."""
    finding = db.query(Finding).filter(Finding.id == finding_id).first()
    if not finding:
        raise NotFoundError("Finding", finding_id)

    version = db.query(DatasetVersion).filter(DatasetVersion.id == finding.version_id).first()
    dataset = db.query(Dataset).filter(Dataset.id == version.dataset_id).first() if version else None

    ds_id = dataset.id if dataset else ""
    ds_name = dataset.name if dataset else "Unknown"

    return _map_finding_to_response(finding, ds_id, ds_name)


@router.patch("/{finding_id}/status", response_model=FindingResponse)
def update_finding_status_endpoint(
    finding_id: str,
    payload: FindingStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Transitions finding status ('open', 'applied', 'completed', 'dismissed') with an immutable audit log."""
    updated = findings_engine.update_finding_status(
        db=db,
        finding_id=finding_id,
        new_status=payload.status,
        note=payload.note,
        username=current_user.email.split("@")[0] if current_user.email else "User",
    )

    version = db.query(DatasetVersion).filter(DatasetVersion.id == updated.version_id).first()
    dataset = db.query(Dataset).filter(Dataset.id == version.dataset_id).first() if version else None

    ds_id = dataset.id if dataset else ""
    ds_name = dataset.name if dataset else "Unknown"

    return _map_finding_to_response(updated, ds_id, ds_name)


@router.post("/{finding_id}/explain", response_model=FindingExplainResponse)
def explain_finding_endpoint(
    finding_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generates an executive AI strategic deep dive for a finding with post-generation guardrail protection."""
    return findings_engine.explain_finding_with_ai(
        db=db,
        finding_id=finding_id,
    )


@router.post("/{finding_id}/pin-decision", response_model=FindingResponse)
def pin_finding_to_decision_support(
    finding_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Pins finding directly to Decision Support workspace (status: applied)."""
    return update_finding_status_endpoint(
        finding_id=finding_id,
        payload=FindingStatusUpdate(
            status="applied",
            note="Pinned to Decision Support workspace for strategic execution",
        ),
        db=db,
        current_user=current_user,
    )
