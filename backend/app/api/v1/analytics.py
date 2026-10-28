"""BizLens Analytics API: Query engine, metric catalog, breakdowns, and numerical guardrail verification."""

from typing import List, Optional, Dict, Any
from pathlib import Path
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError, ValidationError
from app.core.logging import logger
from app.db.session import get_db
from app.db.models import User, Dataset, DatasetVersion, ColumnMapping
from app.api.v1.datasets import get_current_user
from app.services.metric_registry import metric_registry
from app.services.analytics_engine import analytics_engine, format_metric_value
from app.services.guardrails import guardrail
from app.schemas.analytics import (
    MetricQueryRequest,
    BreakdownQueryRequest,
    AnalyticsQueryResponse,
    MetricResultSchema,
    BreakdownItemSchema,
    LineageRecordSchema,
    MetricCatalogItemResponse,
    GuardrailVerifyRequest,
    GuardrailVerifyResponse,
    GuardrailViolationItem,
    TrajectoryPointSchema,
    TrajectoryResponse,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _resolve_dataset_and_mapping(
    db: Session, user: User, dataset_id: Optional[str]
) -> tuple[Dataset, DatasetVersion, Dict[str, str]]:
    """Resolves target dataset, active version, and role-to-column mapping dictionary."""
    dataset_query = db.query(Dataset).filter(
        Dataset.user_id == user.id, Dataset.deleted_at.is_(None)
    )

    if dataset_id and dataset_id not in ("demo", "default"):
        dataset = dataset_query.filter(Dataset.id == dataset_id).first()
        if not dataset:
            if dataset_id in ("ds-saas-cloud", "saas-cloud"):
                dataset = dataset_query.filter(Dataset.name.ilike("%SaaS Enterprise%")).first() or dataset_query.filter(Dataset.id == "ds-saas-cloud").first()
            elif dataset_id in ("ds-tech-hardware", "tech-hardware"):
                dataset = dataset_query.filter(Dataset.name.ilike("%Tech Hardware%")).first() or dataset_query.filter(Dataset.id == "ds-tech-hardware").first()
            elif dataset_id in ("ds-retail-q3", "demo-retail"):
                dataset = dataset_query.filter(Dataset.name.ilike("%Sample Retail%")).first() or dataset_query.filter(Dataset.id == "ds-retail-q3").first()
            else:
                dataset = dataset_query.filter(Dataset.name.ilike(f"%{dataset_id}%")).first()

        if not dataset:
            raise NotFoundError(f"Dataset with ID '{dataset_id}' was not found.")
    else:
        # Default to active or most recent dataset only when no dataset_id was requested
        dataset = dataset_query.order_by(Dataset.updated_at.desc()).first()

    if not dataset or not dataset.active_version_id:
        raise NotFoundError("No active dataset found. Please upload or select a dataset first.")

    version = (
        db.query(DatasetVersion)
        .filter(DatasetVersion.id == dataset.active_version_id)
        .first()
    )
    if not version:
        raise NotFoundError("Dataset version record not found.")

    p = Path(version.parquet_path)
    if not p.is_absolute():
        p = Path("backend") / p if not Path(p).exists() and (Path("backend") / p).exists() else p
    if not p.exists():
        p = Path("backend") / version.parquet_path
    if not p.exists():
        raise NotFoundError(f"Dataset version Parquet file not found on disk at {version.parquet_path}.")
    version.parquet_path = str(p)

    mapping_record = (
        db.query(ColumnMapping)
        .filter(ColumnMapping.version_id == dataset.active_version_id)
        .first()
    )

    from app.services.role_resolver import resolve_role_to_col
    role_to_col: Dict[str, str] = resolve_role_to_col(mapping_record.mapping if mapping_record else None)

    return dataset, version, role_to_col


@router.get("/metrics", response_model=List[MetricCatalogItemResponse])
def get_metric_catalog(
    dataset_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve catalog of all built-in metrics with availability status for the target dataset."""
    role_to_col: Dict[str, str] = {}
    if dataset_id:
        try:
            _, _, role_to_col = _resolve_dataset_and_mapping(db, current_user, dataset_id)
        except NotFoundError:
            role_to_col = {}

    availability_map = metric_registry.check_availability(role_to_col)
    catalog: List[MetricCatalogItemResponse] = []

    for metric in metric_registry.list_all_metrics():
        avail = availability_map.get(metric.id)
        is_avail = avail.is_available if avail else False
        missing = avail.missing_roles if avail else metric.required_roles
        resolved = avail.resolved_columns if avail else {}
        reason = avail.reason if avail else "Dataset not selected"

        catalog.append(
            MetricCatalogItemResponse(
                id=metric.id,
                label=metric.label,
                description=metric.description,
                required_roles=metric.required_roles,
                unit=metric.unit,
                format_str=metric.format_str,
                direction=metric.direction,
                is_available=is_avail,
                missing_roles=missing,
                resolved_columns=resolved,
                reason=reason,
            )
        )

    return catalog


@router.post("/query", response_model=AnalyticsQueryResponse)
def execute_analytics_query(
    payload: MetricQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Execute high-speed deterministic calculation of metrics, period comparisons, and breakdowns."""
    dataset, version, role_to_col = _resolve_dataset_and_mapping(
        db, current_user, payload.dataset_id
    )

    query_res = analytics_engine.execute_query(
        parquet_path=Path(version.parquet_path),
        role_to_col=role_to_col,
        metric_ids=payload.metric_ids,
        filters=payload.filters,
        group_by_role=payload.group_by_role,
        compare_to_previous=payload.compare_to_previous,
        dataset_id=dataset.id,
        version_number=version.version_number,
        content_hash=version.content_hash,
    )

    metrics_dict: Dict[str, MetricResultSchema] = {}
    for m_id, item in query_res.metrics.items():
        metrics_dict[m_id] = MetricResultSchema(
            metric_id=item.metric_id,
            label=item.label,
            value=item.value,
            formatted_value=item.formatted_value,
            unit=item.unit,
            direction=item.direction,
            previous_value=item.previous_value,
            delta_abs=item.delta_abs,
            delta_pct=item.delta_pct,
            status=item.status,
            is_available=item.is_available,
            unavailable_reason=item.unavailable_reason,
            formula_sql=item.formula_sql,
            comparison_label=item.comparison_label,
        )

    breakdown_list: Optional[List[BreakdownItemSchema]] = None
    if query_res.breakdown:
        breakdown_list = [
            BreakdownItemSchema(
                dimension_value=b.dimension_value,
                metrics=b.metrics,
                share_pct=b.share_pct,
                rank=b.rank,
            )
            for b in query_res.breakdown
        ]

    lineage_record: Optional[LineageRecordSchema] = None
    if query_res.lineage:
        lineage_record = LineageRecordSchema(
            dataset_id=query_res.lineage.dataset_id,
            version_number=query_res.lineage.version_number,
            content_hash=query_res.lineage.content_hash,
            total_rows_scanned=query_res.lineage.total_rows_scanned,
            rows_after_filters=query_res.lineage.rows_after_filters,
            execution_time_ms=query_res.lineage.execution_time_ms,
            filters_applied=query_res.lineage.filters_applied,
            formula_registry_version=query_res.lineage.formula_registry_version,
        )

    return AnalyticsQueryResponse(
        metrics=metrics_dict,
        breakdown=breakdown_list,
        lineage=lineage_record,
    )


@router.post("/breakdown", response_model=List[BreakdownItemSchema])
def execute_breakdown_query(
    payload: BreakdownQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Execute dimension group-by breakdown (e.g. by category, region, city)."""
    dataset, version, role_to_col = _resolve_dataset_and_mapping(
        db, current_user, payload.dataset_id
    )

    target_dim = payload.dimension_column or payload.dimension_role or "category"

    query_res = analytics_engine.execute_query(
        parquet_path=Path(version.parquet_path),
        role_to_col=role_to_col,
        metric_ids=payload.metric_ids,
        filters=payload.filters,
        group_by_role=target_dim,
        compare_to_previous=False,
        dataset_id=dataset.id,
        version_number=version.version_number,
        content_hash=version.content_hash,
    )

    if not query_res.breakdown:
        return []

    return [
        BreakdownItemSchema(
            dimension_value=b.dimension_value,
            metrics=b.metrics,
            share_pct=b.share_pct,
            rank=b.rank,
        )
        for b in query_res.breakdown
    ]


@router.post("/guardrail/verify", response_model=GuardrailVerifyResponse)
def verify_guardrail(payload: GuardrailVerifyRequest):
    """Verify an AI-generated explanation against pre-calculated fact values."""
    res = guardrail.verify_response(
        text=payload.text,
        fact_values=payload.fact_values,
        allowed_ordinals=set(payload.allowed_ordinals) if payload.allowed_ordinals else None,
        context_years=set(payload.context_years) if payload.context_years else None,
        tolerance=payload.tolerance,
    )

    violations_list = [
        GuardrailViolationItem(
            raw_token=v.raw_token,
            normalized_value=v.normalized_value,
            reason=v.reason,
        )
        for v in res.violations
    ]

    tokens_list = [
        {
            "raw_token": t.raw_token,
            "canonical_value": t.canonical_value,
            "is_percentage": t.is_percentage,
            "is_structural": t.is_structural,
            "is_year": t.is_year,
        }
        for t in res.extracted_tokens
    ]

    return GuardrailVerifyResponse(
        passed=res.passed,
        total_extracted=res.total_extracted,
        extracted_tokens=tokens_list,
        violations=violations_list,
        allowed_facts=res.allowed_facts,
        tolerance_used=res.tolerance_used,
    )


@router.get("/guardrail/metrics")
def get_guardrail_metrics():
    """Returns numerical guardrail runtime telemetry."""
    return guardrail.metrics


@router.get("/trajectory", response_model=TrajectoryResponse)
def get_monthly_trajectory(
    dataset_id: str = Query(...),
    category: Optional[str] = Query(None),
    limit: Optional[int] = Query(12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve multi-month trajectory for the target dataset using DuckDB with dynamic period expansion."""
    import duckdb

    dataset, version, role_to_col = _resolve_dataset_and_mapping(
        db, current_user, dataset_id
    )

    parquet_file = Path(version.parquet_path)
    if not parquet_file.exists():
        parquet_file = Path(__file__).resolve().parents[3] / version.parquet_path

    con = duckdb.connect(":memory:")
    con.execute(f"CREATE VIEW dataset AS SELECT * FROM read_parquet('{parquet_file.as_posix()}')")

    # Discover date column
    date_col = role_to_col.get("date")
    all_cols = [c[0] for c in con.execute("DESCRIBE SELECT * FROM dataset").fetchall()]
    if not date_col:
        for c in all_cols:
            c_low = c.lower()
            if any(term in c_low for term in ["date", "time", "day", "timestamp", "period", "month", "year"]):
                date_col = c
                break

    # Discover revenue/value column
    rev_col = role_to_col.get("revenue") or role_to_col.get("profit")
    if not rev_col:
        rev_terms = [
            "sales", "revenue", "arr_amount", "amount", "total", "price",
            "turnover", "net_sales", "grand_total", "order_value", "total_amount",
            "value", "spent", "mrr", "gross_sales", "subtotal", "profit"
        ]
        for c in all_cols:
            c_low = c.lower()
            if c_low in rev_terms or any(term in c_low for term in ["sales", "revenue", "amount", "total_price"]):
                rev_col = c
                break



    # Category filter with type-safety
    where_clauses = []
    if category and isinstance(category, str) and category != "All Categories" and "category" in role_to_col:
        cat_col = role_to_col["category"]
        safe_cat = category.replace("'", "''")
        where_clauses.append(f'"{cat_col}" = \'{safe_cat}\'')

    where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

    points: List[TrajectoryPointSchema] = []

    if date_col:
        date_expr = (
            f'COALESCE('
            f'TRY_CAST("{date_col}" AS DATE), '
            f'TRY_CAST("{date_col}" AS TIMESTAMP)::DATE, '
            f'TRY_STRPTIME(CAST("{date_col}" AS VARCHAR), \'%Y-%m-%d\')::DATE, '
            f'TRY_STRPTIME(CAST("{date_col}" AS VARCHAR), \'%m/%d/%Y\')::DATE, '
            f'TRY_STRPTIME(CAST("{date_col}" AS VARCHAR), \'%d-%m-%Y\')::DATE, '
            f'TRY_STRPTIME(CAST("{date_col}" AS VARCHAR), \'%m-%d-%Y\')::DATE, '
            f'TRY_STRPTIME(CAST("{date_col}" AS VARCHAR), \'%d/%m/%Y\')::DATE, '
            f'TRY_STRPTIME(CAST("{date_col}" AS VARCHAR), \'%Y/%m/%d\')::DATE, '
            f'TRY_STRPTIME(CAST("{date_col}" AS VARCHAR) || \'-01-01\', \'%Y-%m-%d\')::DATE'
            f')'
        )
        date_where = f"{where_sql} {'AND' if where_sql else 'WHERE'} {date_expr} IS NOT NULL"
        is_currency_metric = rev_col is not None
        if rev_col:
            val_select = f'ROUND(SUM(TRY_CAST("{rev_col}" AS DOUBLE)), 2)'
        else:
            val_select = 'COUNT(*)::DOUBLE'

        try:
            query = f"""
                SELECT 
                    STRFTIME({date_expr}, '%Y-%m') as ym,
                    STRFTIME({date_expr}, '%b %Y') as m_label,
                    {val_select} as metric_val,
                    COUNT(*) as total_orders
                FROM dataset
                {date_where}
                GROUP BY ym, m_label
                ORDER BY ym ASC
            """
            rows = con.execute(query).fetchall()
            if rows:
                all_computed = []
                prev_val = None
                for ym, m_label, metric_val, orders in rows:
                    val_float = float(metric_val or 0)
                    delta_pct = None
                    if prev_val is not None and prev_val > 0:
                        delta_pct = round(((val_float - prev_val) / prev_val) * 100, 1)
                    prev_val = val_float

                    formatted_val = (
                        format_metric_value(val_float, "currency", "")
                        if is_currency_metric
                        else f"{int(orders):,} orders"
                    )

                    all_computed.append(
                        TrajectoryPointSchema(
                            month_key=ym,
                            label=m_label,
                            revenue=val_float,
                            formatted_revenue=formatted_val,
                            orders=int(orders),
                            delta_pct=delta_pct,
                            projected=False,
                            status="Verified (DuckDB)",
                        )
                    )
                points = all_computed[-limit:] if (limit and len(all_computed) > limit) else all_computed
        except Exception as e:
            logger.warning("Trajectory query failed: %s", e)

    max_val = max((p.revenue for p in points), default=1.0)
    min_val = min((p.revenue for p in points), default=0.0)

    metric_name = "Revenue" if rev_col else "Orders"
    unit_str = "currency" if rev_col else "orders"

    return TrajectoryResponse(
        dataset_id=dataset.id,
        dataset_name=dataset.name,
        total_months=len(points),
        points=points,
        max_value=max_val,
        min_value=min_val,
        metric_label=metric_name,
        unit=unit_str,
    )

