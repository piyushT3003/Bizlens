"""BizLens Management Reports API Router: Generate, list, view, download, regenerate, and inspect executive reports."""

import os
import shutil
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError, ValidationError
from app.core.logging import logger
from app.db.session import get_db
from app.db.models import User, Dataset, Report
from app.api.v1.datasets import get_current_user
from app.schemas.report import (
    ReportGenerateRequest,
    ReportSummaryResponse,
    ReportDetailResponse,
    DatasetPeriodsResponse,
)
from app.services.report_generator import report_generator

router = APIRouter(prefix="/reports", tags=["reports"])


def _map_report_to_summary(report: Report, dataset_name: str) -> ReportSummaryResponse:
    snapshot = report.facts_snapshot or {}
    title = snapshot.get("title") or f"{report.type.replace('_', ' ').title()} Report"
    has_pdf = bool(report.pdf_path and os.path.exists(report.pdf_path))
    has_csv = bool(report.csv_path and os.path.exists(report.csv_path))

    p_type = snapshot.get("period_type") or "all"
    p_start = report.period_start.isoformat() if report.period_start else snapshot.get("period_start")
    p_end = report.period_end.isoformat() if report.period_end else snapshot.get("period_end")
    p_label = snapshot.get("period_label")

    return ReportSummaryResponse(
        id=report.id,
        dataset_id=report.dataset_id,
        dataset_name=dataset_name,
        version_id=report.version_id,
        type=report.type,
        period_type=p_type,
        period_start=p_start,
        period_end=p_end,
        period_label=p_label,
        title=title,
        registry_version=report.registry_version,
        status=report.status,
        has_pdf=has_pdf,
        has_csv=has_csv,
        created_at=report.created_at.isoformat() if report.created_at else "",
    )


def _map_report_to_detail(report: Report, dataset_name: str) -> ReportDetailResponse:
    summary = _map_report_to_summary(report, dataset_name)
    snapshot = report.facts_snapshot or {}
    sections = snapshot.get("sections") or [
        "executive_summary",
        "kpis",
        "charts",
        "insights",
        "recommendations",
        "risks",
        "trends",
        "supporting_analysis",
    ]

    return ReportDetailResponse(
        **summary.model_dump(),
        facts_snapshot=snapshot,
        filters=report.filters or {},
        sections=sections,
        pdf_download_url=f"/api/v1/reports/{report.id}/download/pdf",
        csv_download_url=f"/api/v1/reports/{report.id}/download/csv",
    )


@router.get("/dataset-periods/{dataset_id}", response_model=DatasetPeriodsResponse)
def get_dataset_periods(
    dataset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve date boundaries, calendar months, fiscal quarters, and capability flags for a dataset."""
    periods_data = report_generator.get_dataset_periods(
        db=db,
        dataset_id=dataset_id,
        user_id=current_user.id,
    )
    return DatasetPeriodsResponse(**periods_data)


@router.post("/generate", response_model=ReportDetailResponse, status_code=status.HTTP_201_CREATED)
def generate_report(
    payload: ReportGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate an immutable management report with ReportLab PDF and sanitized CSV."""
    # 1. Resolve Dataset
    dataset: Optional[Dataset] = None
    if payload.dataset_id and payload.dataset_id not in ("default", "demo"):
        dataset = (
            db.query(Dataset)
            .filter(
                Dataset.id == payload.dataset_id,
                Dataset.user_id == current_user.id,
                Dataset.deleted_at.is_(None),
            )
            .first()
        )
        if not dataset:
            dataset = (
                db.query(Dataset)
                .filter(
                    Dataset.name.ilike(f"%{payload.dataset_id}%"),
                    Dataset.user_id == current_user.id,
                    Dataset.deleted_at.is_(None),
                )
                .first()
            )
    
    if not dataset:
        dataset = (
            db.query(Dataset)
            .filter(
                Dataset.user_id == current_user.id,
                Dataset.deleted_at.is_(None),
            )
            .order_by(Dataset.updated_at.desc())
            .first()
        )

    if not dataset:
        raise NotFoundError("Dataset not found", {"dataset_id": payload.dataset_id or "default"})

    # 2. Run Report Generator Service
    report = report_generator.generate_report(
        db=db,
        user_id=current_user.id,
        dataset_id=dataset.id,
        version_id=dataset.active_version_id,
        report_type=payload.type,
        period_type=payload.period_type,
        period_start=payload.period_start,
        period_end=payload.period_end,
        period_label=payload.period_label,
        sections=payload.sections,
        title=payload.title,
        filters=payload.filters or {},
    )

    return _map_report_to_detail(report, dataset.name)


@router.get("", response_model=List[ReportSummaryResponse])
def list_reports(
    dataset_id: Optional[str] = Query(None, description="Optional filter by dataset ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all management reports for the authenticated user."""
    query = (
        db.query(Report)
        .filter(Report.user_id == current_user.id)
        .order_by(Report.created_at.desc())
    )

    if dataset_id:
        query = query.filter(Report.dataset_id == dataset_id)

    reports = query.all()

    # Cache dataset names for fast response mapping
    dataset_names: dict[str, str] = {}
    result: List[ReportSummaryResponse] = []
    for r in reports:
        if r.dataset_id not in dataset_names:
            ds = db.query(Dataset).filter(Dataset.id == r.dataset_id).first()
            dataset_names[r.dataset_id] = ds.name if ds else "Unknown Dataset"
        result.append(_map_report_to_summary(r, dataset_names[r.dataset_id]))

    return result


@router.get("/{report_id}", response_model=ReportDetailResponse)
def get_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve full details and verified facts snapshot for a specific report."""
    report = (
        db.query(Report)
        .filter(Report.id == report_id, Report.user_id == current_user.id)
        .first()
    )
    if not report:
        raise NotFoundError("Report not found", {"report_id": report_id})

    ds = db.query(Dataset).filter(Dataset.id == report.dataset_id).first()
    dataset_name = ds.name if ds else "Unknown Dataset"

    return _map_report_to_detail(report, dataset_name)


@router.post("/{report_id}/regenerate", response_model=ReportDetailResponse)
def regenerate_report_from_snapshot(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Regenerates the exact PDF and CSV from the immutable snapshot facts, guaranteeing 0 deviation."""
    report = report_generator.regenerate_from_snapshot(
        db=db,
        report_id=report_id,
        user_id=current_user.id,
    )
    ds = db.query(Dataset).filter(Dataset.id == report.dataset_id).first()
    dataset_name = ds.name if ds else "Unknown Dataset"
    return _map_report_to_detail(report, dataset_name)


@router.post("/{report_id}/refresh-latest", response_model=ReportDetailResponse, status_code=status.HTTP_201_CREATED)
def refresh_report_from_latest_data(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Re-runs the report specification against the latest active version of the dataset."""
    old_report = (
        db.query(Report)
        .filter(Report.id == report_id, Report.user_id == current_user.id)
        .first()
    )
    if not old_report:
        raise NotFoundError("Report not found", {"report_id": report_id})

    dataset = (
        db.query(Dataset)
        .filter(Dataset.id == old_report.dataset_id, Dataset.user_id == current_user.id)
        .first()
    )
    if not dataset or not dataset.active_version_id:
        raise NotFoundError("Active dataset not found for refresh", {"dataset_id": old_report.dataset_id})

    snapshot = old_report.facts_snapshot or {}
    new_report = report_generator.generate_report(
        db=db,
        user_id=current_user.id,
        dataset_id=dataset.id,
        version_id=dataset.active_version_id,
        report_type=old_report.type,
        period_type=snapshot.get("period_type", "all"),
        period_start=snapshot.get("period_start"),
        period_end=snapshot.get("period_end"),
        period_label=snapshot.get("period_label"),
        sections=snapshot.get("sections"),
        title=snapshot.get("title"),
        filters=old_report.filters or {},
    )

    return _map_report_to_detail(new_report, dataset.name)


@router.get("/{report_id}/download/pdf")
def download_report_pdf(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download executive management report as print-friendly PDF."""
    report = (
        db.query(Report)
        .filter(Report.id == report_id, Report.user_id == current_user.id)
        .first()
    )
    if not report:
        raise NotFoundError("Report not found", {"report_id": report_id})

    if not report.pdf_path or not os.path.exists(report.pdf_path):
        raise NotFoundError("PDF Document not found", {"report_id": report_id})

    filename = f"BizLens_{report.type}_{report_id[:8]}.pdf"
    return FileResponse(
        path=report.pdf_path,
        media_type="application/pdf",
        filename=filename,
    )


@router.get("/{report_id}/download/csv")
def download_report_csv(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download verified report data as sanitized CSV (with formula injection defense)."""
    report = (
        db.query(Report)
        .filter(Report.id == report_id, Report.user_id == current_user.id)
        .first()
    )
    if not report:
        raise NotFoundError("Report not found", {"report_id": report_id})

    if not report.csv_path or not os.path.exists(report.csv_path):
        raise NotFoundError("CSV Document not found", {"report_id": report_id})

    filename = f"BizLens_{report.type}_{report_id[:8]}.csv"
    return FileResponse(
        path=report.csv_path,
        media_type="text/csv",
        filename=filename,
    )


@router.delete("/{report_id}")
def delete_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a report record and clean up associated files."""
    report = (
        db.query(Report)
        .filter(Report.id == report_id, Report.user_id == current_user.id)
        .first()
    )
    if not report:
        raise NotFoundError("Report not found", {"report_id": report_id})

    # Delete directory if exists
    if report.pdf_path:
        report_dir = Path(report.pdf_path).parent
        if report_dir.exists() and report_dir.is_dir():
            try:
                shutil.rmtree(report_dir)
            except Exception as e:
                logger.warning("Failed to remove report directory", error=str(e))

    db.delete(report)
    db.commit()

    return {"status": "deleted", "id": report_id}
