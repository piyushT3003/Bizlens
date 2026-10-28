import uuid
from typing import List, Optional, Dict, Any
from pathlib import Path
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError, ValidationError, BizLensError
from app.core.logging import logger
from app.db.session import get_db
from app.db.models import User, Dataset, DatasetVersion, QualityReport, Transformation, ColumnMapping
from app.api.v1.datasets import get_current_user
from app.schemas.dataset import (
    QualityReportResponse,
    QualityComponentScore,
    QualityCopilotRequest,
    QualityCopilotResponse,
    TransformationPreviewRequest,
    TransformationPreviewResponse,
    TransformationApplyRequest,
    TransformationApplyResponse,
    TransformationHistoryItem,
)
from app.services.transformations import transformation_service
from app.services.quality_copilot import quality_copilot_service
from app.services.profiler import data_profiler

router = APIRouter(tags=["quality_and_transformations"])


# --- Helper Methods ---

def _get_version_or_404(db: Session, version_id: str) -> DatasetVersion:
    version = db.query(DatasetVersion).filter(DatasetVersion.id == version_id).first()
    if not version:
        # Check if version_id is actually a dataset ID or alias
        dataset = db.query(Dataset).filter(Dataset.id == version_id).first()
        if not dataset and "-v" in version_id:
            ds_prefix = version_id.split("-v")[0]
            dataset = db.query(Dataset).filter(Dataset.id == ds_prefix).first()
        if not dataset:
            dataset = db.query(Dataset).filter(Dataset.name.ilike(f"%{version_id}%")).first()
        if dataset and dataset.active_version_id:
            version = db.query(DatasetVersion).filter(DatasetVersion.id == dataset.active_version_id).first()
    if not version:
        raise NotFoundError(f"Dataset version '{version_id}' not found.")
    return version


def _get_or_create_quality_report(db: Session, version: DatasetVersion) -> QualityReport:
    report = db.query(QualityReport).filter(QualityReport.version_id == version.id).first()
    if not report:
        parquet_path = Path(version.parquet_path)
        if parquet_path.exists():
            try:
                profile_res = data_profiler.profile_parquet(
                    parquet_path=parquet_path,
                    dataset_id=version.dataset_id,
                    version_number=version.version_number,
                )
                report = QualityReport(
                    id=str(uuid.uuid4()),
                    version_id=version.id,
                    score=profile_res.quality_score.score,
                    components={
                        "completeness": profile_res.quality_score.completeness,
                        "consistency": profile_res.quality_score.consistency,
                        "validity": profile_res.quality_score.validity,
                        "uniqueness": profile_res.quality_score.uniqueness,
                        "anomaly_freedom": profile_res.quality_score.anomaly_freedom,
                    },
                    issues=profile_res.issues,
                    formula_version=profile_res.quality_score.formula_version,
                )
                db.add(report)
                version.quality_score = profile_res.quality_score.score
                db.commit()
                db.refresh(report)
                logger.info("Auto-healed quality report for version %s (score: %s%%)", version.id, report.score)
            except Exception as err:
                logger.error("Auto-healing quality report failed for %s: %s", version.id, err)
    if not report:
        raise NotFoundError(f"Quality report for version '{version.id}' not found.")
    return report


def _get_dataset_or_404(db: Session, dataset_id: str, user_id: str) -> Dataset:
    dataset = (
        db.query(Dataset)
        .filter(Dataset.id == dataset_id, Dataset.user_id == user_id, Dataset.deleted_at.is_(None))
        .first()
    )
    if not dataset:
        dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.deleted_at.is_(None)).first()
    if not dataset:
        raise NotFoundError(f"Dataset '{dataset_id}' not found.")
    return dataset


# --- Version Quality & Copilot Endpoints ---

@router.get("/versions/{version_id}/quality", response_model=QualityReportResponse)
def get_version_quality(
    version_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve data quality scorecard and issues for a specific dataset version."""
    version = _get_version_or_404(db, version_id)
    report = _get_or_create_quality_report(db, version)

    comps = report.components or {}
    return QualityReportResponse(
        score=report.score,
        components=QualityComponentScore(
            completeness=float(comps.get("completeness", 100.0)),
            consistency=float(comps.get("consistency", 100.0)),
            validity=float(comps.get("validity", 100.0)),
            uniqueness=float(comps.get("uniqueness", 100.0)),
            anomaly_freedom=float(comps.get("anomaly_freedom", 100.0)),
        ),
        issues=report.issues or [],
        formula_version=report.formula_version,
    )


@router.post("/versions/{version_id}/quality/copilot", response_model=QualityCopilotResponse)
def get_version_quality_copilot(
    version_id: str,
    payload: QualityCopilotRequest = QualityCopilotRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Data Quality Copilot analysis with plain-language explanations and recommended transformations."""
    version = _get_version_or_404(db, version_id)
    report = _get_or_create_quality_report(db, version)

    return quality_copilot_service.analyze_quality(
        quality_report=report,
        version=version,
        focus_column=payload.focus_column,
        focus_issue_code=payload.focus_issue_code,
    )


# --- Transformation Endpoints ---

@router.post("/versions/{version_id}/transform/preview", response_model=TransformationPreviewResponse)
def preview_transformation(
    version_id: str,
    payload: TransformationPreviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Preview a transformation in-memory without mutating Parquet storage."""
    version = _get_version_or_404(db, version_id)
    return transformation_service.preview_transformation(
        parquet_path=Path(version.parquet_path),
        trans_type=payload.type,
        parameters=payload.parameters,
    )


@router.post("/versions/{version_id}/transform/apply", response_model=TransformationApplyResponse, status_code=status.HTTP_201_CREATED)
def apply_transformation(
    version_id: str,
    payload: TransformationApplyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Apply a transformation, creating an immutable Parquet version with optimistic locking."""
    version = _get_version_or_404(db, version_id)
    dataset = _get_dataset_or_404(db, version.dataset_id, current_user.id)

    return transformation_service.apply_transformation(
        db=db,
        dataset=dataset,
        current_version=version,
        trans_type=payload.type,
        parameters=payload.parameters,
        label=payload.label,
        lock_version=payload.lock_version,
        user_id=current_user.id,
    )


# --- Dataset Level Convenience Endpoints ---

@router.get("/datasets/{dataset_id}/quality", response_model=QualityReportResponse)
def get_dataset_active_quality(
    dataset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch quality report for dataset's active version."""
    dataset = _get_dataset_or_404(db, dataset_id, current_user.id)
    if not dataset.active_version_id:
        raise NotFoundError("Dataset has no active version.")
    return get_version_quality(dataset.active_version_id, db, current_user)


@router.post("/datasets/{dataset_id}/quality/copilot", response_model=QualityCopilotResponse)
def get_dataset_active_quality_copilot(
    dataset_id: str,
    payload: QualityCopilotRequest = QualityCopilotRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Copilot analysis for dataset's active version."""
    dataset = _get_dataset_or_404(db, dataset_id, current_user.id)
    if not dataset.active_version_id:
        raise NotFoundError("Dataset has no active version.")
    return get_version_quality_copilot(dataset.active_version_id, payload, db, current_user)


@router.post("/datasets/{dataset_id}/transform/preview", response_model=TransformationPreviewResponse)
def preview_dataset_transformation(
    dataset_id: str,
    payload: TransformationPreviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Preview transformation on dataset's active version."""
    dataset = _get_dataset_or_404(db, dataset_id, current_user.id)
    if not dataset.active_version_id:
        raise NotFoundError("Dataset has no active version.")
    return preview_transformation(dataset.active_version_id, payload, db, current_user)


@router.post("/datasets/{dataset_id}/transform/apply", response_model=TransformationApplyResponse, status_code=status.HTTP_201_CREATED)
def apply_dataset_transformation(
    dataset_id: str,
    payload: TransformationApplyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Apply transformation to dataset's active version."""
    dataset = _get_dataset_or_404(db, dataset_id, current_user.id)
    if not dataset.active_version_id:
        raise NotFoundError("Dataset has no active version.")
    return apply_transformation(dataset.active_version_id, payload, db, current_user)


@router.get("/datasets/{dataset_id}/transformations", response_model=List[TransformationHistoryItem])
def get_dataset_transformations(
    dataset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch complete transformation history log for a dataset."""
    dataset = _get_dataset_or_404(db, dataset_id, current_user.id)
    transformations = (
        db.query(Transformation)
        .filter(Transformation.dataset_id == dataset.id)
        .order_by(Transformation.created_at.desc())
        .all()
    )

    return [
        TransformationHistoryItem(
            id=t.id,
            dataset_id=t.dataset_id,
            from_version_id=t.from_version_id,
            to_version_id=t.to_version_id,
            type=t.type,
            parameters=t.parameters or {},
            rows_affected=t.rows_affected,
            before_stats=t.before_stats or {},
            after_stats=t.after_stats or {},
            status=t.status,
            created_at=t.created_at.isoformat() if t.created_at else "",
        )
        for t in transformations
    ]


@router.post("/datasets/{dataset_id}/versions/{version_id}/activate")
def activate_dataset_version(
    dataset_id: str,
    version_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Set a specific version as the active version (version switching or rollback)."""
    dataset = _get_dataset_or_404(db, dataset_id, current_user.id)
    version = _get_version_or_404(db, version_id)

    if version.dataset_id != dataset.id:
        raise ValidationError(f"Version '{version_id}' does not belong to dataset '{dataset_id}'.")

    old_version_id = dataset.active_version_id
    dataset.active_version_id = version.id
    db.commit()

    logger.info("Switched active version for dataset %s: %s -> %s (v%d)", dataset.id, old_version_id, version.id, version.version_number)
    return {
        "status": "success",
        "message": f"Dataset active version switched to v{version.version_number}.",
        "dataset_id": dataset.id,
        "active_version_id": version.id,
        "version_number": version.version_number,
    }
