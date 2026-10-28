"""BizLens Analytics Engine: High-performance deterministic aggregation and multi-dimensional analysis over Parquet datasets using DuckDB."""

import time
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, asdict
from pathlib import Path
import duckdb

from app.core.logging import logger
from app.services.metric_registry import metric_registry, MetricDefinition, MetricAvailability


@dataclass
class MetricResult:
    metric_id: str
    label: str
    value: Optional[float]
    formatted_value: str
    unit: str
    direction: str
    previous_value: Optional[float] = None
    delta_abs: Optional[float] = None
    delta_pct: Optional[float] = None
    status: str = "neutral"  # positive, warning, critical, neutral
    is_available: bool = True
    unavailable_reason: Optional[str] = None
    formula_sql: str = ""
    comparison_label: Optional[str] = None


@dataclass
class BreakdownItem:
    dimension_value: str
    metrics: Dict[str, float]
    share_pct: float
    rank: int


@dataclass
class LineageRecord:
    dataset_id: str
    version_number: int
    content_hash: str
    total_rows_scanned: int
    rows_after_filters: int
    execution_time_ms: float
    filters_applied: Dict[str, Any]
    formula_registry_version: str = "v1.0"


@dataclass
class AnalyticsQueryResult:
    metrics: Dict[str, MetricResult]
    breakdown: Optional[List[BreakdownItem]] = None
    lineage: Optional[LineageRecord] = None


def format_metric_value(value: Optional[float], unit: str, format_str: str) -> str:
    """Format numeric values according to Indian business conventions (₹, Lakh/Crore) or standard formats."""
    if value is None:
        return "--"

    if unit == "percentage":
        return f"{value:+.1f}%" if value != 0 else "0.0%"

    if unit == "count":
        return f"{int(value):,}"

    if unit == "currency":
        abs_v = abs(value)
        sign = "-" if value < 0 else ""
        # Indian lakh/crore grouping
        if abs_v >= 10_000_000:
            return f"{sign}₹{abs_v / 10_000_000:.2f} Cr"
        elif abs_v >= 100_000:
            return f"{sign}₹{abs_v / 100_000:.2f} L"
        else:
            return f"{sign}₹{abs_v:,.2f}"

    return f"{value:,.2f}"


def calculate_status(delta_pct: Optional[float], direction: str) -> str:
    """Determine UI status color (positive, warning, critical, neutral) based on metric direction."""
    if delta_pct is None or delta_pct == 0:
        return "neutral"

    if direction == "higher_is_better":
        if delta_pct >= 5.0:
            return "positive"
        elif delta_pct <= -5.0:
            return "critical"
        else:
            return "warning"
    elif direction == "lower_is_better":
        if delta_pct <= -5.0:
            return "positive"
        elif delta_pct >= 5.0:
            return "critical"
        else:
            return "warning"
    return "neutral"


class AnalyticsEngine:
    def execute_query(
        self,
        parquet_path: Path,
        role_to_col: Dict[str, str],
        metric_ids: List[str],
        filters: Optional[Dict[str, Any]] = None,
        group_by_role: Optional[str] = None,
        compare_to_previous: bool = False,
        dataset_id: str = "",
        version_number: int = 1,
        content_hash: str = "",
        order_direction: str = "DESC",
        limit: Optional[int] = None,
    ) -> AnalyticsQueryResult:
        """Executes analytical queries directly against the Parquet file via DuckDB with complete lineage tracking."""
        start_time = time.perf_counter()
        con = duckdb.connect(":memory:")

        try:
            view_sql = f"CREATE VIEW dataset AS SELECT * FROM read_parquet('{parquet_path.as_posix()}')"
            con.execute(view_sql)

            # 1. Total rows
            total_rows_res = con.execute("SELECT COUNT(*) FROM dataset").fetchone()
            total_rows = total_rows_res[0] if total_rows_res else 0

            # 2. Check metric availability
            avail_map = metric_registry.check_availability(role_to_col)

            # 3. Build WHERE clauses
            where_clauses: List[str] = []
            applied_filters: Dict[str, Any] = {}

            if filters:
                # Date range filter
                if "date_range" in filters and "date" in role_to_col:
                    date_col = role_to_col["date"]
                    date_expr = f'COALESCE(TRY_CAST("{date_col}" AS DATE), TRY_CAST("{date_col}" AS TIMESTAMP)::DATE, TRY_STRPTIME(CAST("{date_col}" AS VARCHAR), \'%m/%d/%Y\')::DATE, TRY_STRPTIME(CAST("{date_col}" AS VARCHAR), \'%d-%m-%Y\')::DATE, TRY_STRPTIME(CAST("{date_col}" AS VARCHAR), \'%m-%d-%Y\')::DATE, TRY_STRPTIME(CAST("{date_col}" AS VARCHAR), \'%d/%m/%Y\')::DATE, TRY_STRPTIME(CAST("{date_col}" AS VARCHAR), \'%Y-%m-%d\')::DATE)'
                    start_d = filters["date_range"].get("start")
                    end_d = filters["date_range"].get("end")
                    if start_d:
                        where_clauses.append(f'({date_expr}) >= \'{start_d}\'')
                        applied_filters["date_start"] = start_d
                    if end_d:
                        where_clauses.append(f'({date_expr}) <= \'{end_d}\'')
                        applied_filters["date_end"] = end_d

                # Category filter
                if "categories" in filters and filters["categories"] and "category" in role_to_col:
                    cat_col = role_to_col["category"]
                    cats_str = ", ".join(f"'{c}'" for c in filters["categories"])
                    where_clauses.append(f'"{cat_col}" IN ({cats_str})')
                    applied_filters["categories"] = filters["categories"]

                # Region filter
                if "regions" in filters and filters["regions"] and "region" in role_to_col:
                    reg_col = role_to_col["region"]
                    regs_str = ", ".join(f"'{r}'" for r in filters["regions"])
                    where_clauses.append(f'"{reg_col}" IN ({regs_str})')
                    applied_filters["regions"] = filters["regions"]

            where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

            # Check rows after filter
            filtered_rows_res = con.execute(f"SELECT COUNT(*) FROM dataset {where_sql}").fetchone()
            filtered_rows = filtered_rows_res[0] if filtered_rows_res else 0

            # 4. Compute primary metrics
            metric_results: Dict[str, MetricResult] = {}
            valid_sql_selects: List[str] = []
            valid_metric_defs: List[MetricDefinition] = []

            for m_id in metric_ids:
                avail = avail_map.get(m_id)
                metric_def = metric_registry.get_metric(m_id)

                if not metric_def:
                    continue

                if not avail or not avail.is_available:
                    # Return structured unavailable result
                    metric_results[m_id] = MetricResult(
                        metric_id=m_id,
                        label=metric_def.label,
                        value=None,
                        formatted_value="--",
                        unit=metric_def.unit,
                        direction=metric_def.direction,
                        is_available=False,
                        unavailable_reason=avail.reason if avail else "Metric unavailable",
                        formula_sql=metric_def.formula_sql,
                    )
                    continue

                try:
                    sql_expr = metric_registry.resolve_sql_expression(m_id, role_to_col)
                    valid_sql_selects.append(f"{sql_expr} AS {m_id}")
                    valid_metric_defs.append(metric_def)
                except Exception as e:
                    logger.warning("Failed to resolve formula for %s: %s", m_id, e)
                    metric_results[m_id] = MetricResult(
                        metric_id=m_id,
                        label=metric_def.label,
                        value=None,
                        formatted_value="--",
                        unit=metric_def.unit,
                        direction=metric_def.direction,
                        is_available=False,
                        unavailable_reason=str(e),
                    )

            if valid_sql_selects and filtered_rows > 0:
                agg_query = f"SELECT {', '.join(valid_sql_selects)} FROM dataset {where_sql}"
                agg_res = con.execute(agg_query).fetchone()

                if agg_res:
                    for idx, m_def in enumerate(valid_metric_defs):
                        val = agg_res[idx]
                        num_val = float(val) if val is not None else None
                        fmt_val = format_metric_value(num_val, m_def.unit, m_def.format_str)

                        metric_results[m_def.id] = MetricResult(
                            metric_id=m_def.id,
                            label=m_def.label,
                            value=num_val,
                            formatted_value=fmt_val,
                            unit=m_def.unit,
                            direction=m_def.direction,
                            is_available=True,
                            formula_sql=m_def.formula_sql,
                        )

            # 5. Period-Over-Period Comparison (if requested and date column available)
            if compare_to_previous and "date" in role_to_col and filtered_rows > 0:
                try:
                    date_col = role_to_col["date"]
                    date_expr = f'COALESCE(TRY_CAST("{date_col}" AS DATE), TRY_CAST("{date_col}" AS TIMESTAMP)::DATE, TRY_STRPTIME(CAST("{date_col}" AS VARCHAR), \'%m/%d/%Y\')::DATE, TRY_STRPTIME(CAST("{date_col}" AS VARCHAR), \'%d-%m-%Y\')::DATE, TRY_STRPTIME(CAST("{date_col}" AS VARCHAR), \'%m-%d-%Y\')::DATE, TRY_STRPTIME(CAST("{date_col}" AS VARCHAR), \'%d/%m/%Y\')::DATE, TRY_STRPTIME(CAST("{date_col}" AS VARCHAR), \'%Y-%m-%d\')::DATE)'
                    has_explicit_date_filter = bool(
                        filters and "date_range" in filters and (
                            filters["date_range"].get("start") or filters["date_range"].get("end")
                        )
                    )

                    if has_explicit_date_filter:
                        # User specified an explicit date range; compare to equal-length prior window
                        min_max_dates = con.execute(
                            f'SELECT MIN({date_expr}), MAX({date_expr}) FROM dataset {where_sql}'
                        ).fetchone()

                        if min_max_dates and min_max_dates[0] and min_max_dates[1]:
                            min_d = min_max_dates[0]
                            max_d = min_max_dates[1]
                            period_days = (max_d - min_d).days + 1

                            prev_max_d = min_d
                            prev_min_d = min_d - (max_d - min_d)

                            # Preserve other non-date filters (categories, regions) in prior window query
                            non_date_clauses = [
                                c for c in where_clauses
                                if not (f"({date_expr}) >=" in c or f"({date_expr}) <=" in c)
                            ]
                            prev_clauses = non_date_clauses + [
                                f"({date_expr}) >= '{prev_min_d}'",
                                f"({date_expr}) < '{prev_max_d}'",
                            ]
                            prev_where = f"WHERE {' AND '.join(prev_clauses)}"
                            if valid_sql_selects:
                                prev_query = f"SELECT {', '.join(valid_sql_selects)} FROM dataset {prev_where}"
                                prev_res = con.execute(prev_query).fetchone()
                                if prev_res:
                                    for idx, m_def in enumerate(valid_metric_defs):
                                        prev_val = float(prev_res[idx]) if prev_res[idx] is not None else None
                                        cur_item = metric_results.get(m_def.id)
                                        if cur_item and cur_item.value is not None:
                                            cur_item.previous_value = prev_val
                                            cur_item.comparison_label = "vs. prior period (PoP)"
                                            if prev_val is not None and prev_val != 0:
                                                delta_abs = round(cur_item.value - prev_val, 2)
                                                delta_pct = round((cur_item.value - prev_val) / prev_val * 100, 2)
                                                cur_item.delta_abs = delta_abs
                                                cur_item.delta_pct = delta_pct
                                                cur_item.status = calculate_status(delta_pct, m_def.direction)
                                            else:
                                                cur_item.delta_abs = None
                                                cur_item.delta_pct = None
                                                cur_item.status = "neutral"
                    else:
                        # Full dataset scope: retrieve recent monthly milestones with span and volume telemetry
                        months_res = con.execute(
                            f"""
                            SELECT 
                                STRFTIME(DATE_TRUNC('month', {date_expr}), '%Y-%m') as ym,
                                COUNT(*) as row_count,
                                MIN({date_expr}) as min_d,
                                MAX({date_expr}) as max_d,
                                DATE_DIFF('day', MIN({date_expr}), MAX({date_expr})) + 1 as span_days
                            FROM dataset 
                            {where_sql} {'AND' if where_sql else 'WHERE'} {date_expr} IS NOT NULL 
                            GROUP BY 1 
                            ORDER BY 1 DESC 
                            LIMIT 4
                            """
                        ).fetchall()
                        if len(months_res) >= 2 and valid_sql_selects:
                            m0 = months_res[0]
                            m1 = months_res[1]
                            m2 = months_res[2] if len(months_res) > 2 else None

                            m0_span = m0[4] if len(m0) > 4 else 30
                            m0_max_day = m0[3].day if (len(m0) > 3 and hasattr(m0[3], "day")) else 30
                            # Detect incomplete / cutoff ending month (e.g. 1 to 14 days of data in the ending month)
                            is_partial = (
                                (m0_span < 15)
                                or (m0_max_day <= 15)
                                or (m0[1] < m1[1] * 0.35 and m0_span < 20)
                            )

                            if is_partial and m2:
                                # Compare the last two full, completed calendar months for authentic, unbiased MoM
                                cur_m = m1[0]
                                prev_m = m2[0]
                                comparison_label = f"{m1[0]} vs {m2[0]} (Completed MoM)"
                                use_daily_velocity = False
                            elif is_partial and not m2:
                                # Only 2 months exist and latest is partial: compare on daily velocity/run-rate
                                cur_m = m0[0]
                                prev_m = m1[0]
                                comparison_label = f"{m0[0]} vs {m1[0]} (Daily Velocity MoM)"
                                use_daily_velocity = True
                            else:
                                cur_m = m0[0]
                                prev_m = m1[0]
                                comparison_label = f"{m0[0]} vs {m1[0]} (MoM)"
                                use_daily_velocity = False

                            cur_m_where = f"{where_sql} {'AND' if where_sql else 'WHERE'} STRFTIME(DATE_TRUNC('month', {date_expr}), '%Y-%m') = '{cur_m}'"
                            prev_m_where = f"{where_sql} {'AND' if where_sql else 'WHERE'} STRFTIME(DATE_TRUNC('month', {date_expr}), '%Y-%m') = '{prev_m}'"
                            cur_m_res = con.execute(f"SELECT {', '.join(valid_sql_selects)} FROM dataset {cur_m_where}").fetchone()
                            prev_m_res = con.execute(f"SELECT {', '.join(valid_sql_selects)} FROM dataset {prev_m_where}").fetchone()

                            if cur_m_res and prev_m_res:
                                for idx, m_def in enumerate(valid_metric_defs):
                                    c_val = float(cur_m_res[idx]) if cur_m_res[idx] is not None else None
                                    p_val = float(prev_m_res[idx]) if prev_m_res[idx] is not None else None
                                    cur_item = metric_results.get(m_def.id)
                                    if cur_item and c_val is not None and p_val is not None:
                                        cur_item.comparison_label = comparison_label
                                        cur_item.previous_value = p_val
                                        cur_item.delta_abs = round(c_val - p_val, 2)
                                        if use_daily_velocity:
                                            daily_c = c_val / max(m0[4], 1)
                                            daily_p = p_val / max(m1[4], 1)
                                            if daily_p != 0:
                                                delta_pct = round((daily_c - daily_p) / daily_p * 100, 2)
                                            else:
                                                delta_pct = 0.0
                                        else:
                                            if p_val != 0:
                                                delta_pct = round((c_val - p_val) / p_val * 100, 2)
                                            else:
                                                delta_pct = 0.0
                                        cur_item.delta_pct = delta_pct
                                        cur_item.status = calculate_status(delta_pct, m_def.direction)
                except Exception as pop_err:
                    logger.warning("Period-over-period date resolution failed: %s", pop_err)

            # 6. Group-By Breakdown (if requested)
            breakdown_items: Optional[List[BreakdownItem]] = None
            if group_by_role and filtered_rows > 0:
                dim_col = None
                all_cols_desc = []
                try:
                    all_cols_desc = con.execute("DESCRIBE dataset").fetchall()
                except Exception:
                    pass
                all_cols = [c[0] for c in all_cols_desc]

                if group_by_role in role_to_col and role_to_col[group_by_role]:
                    dim_col = role_to_col[group_by_role]
                else:
                    for c in all_cols:
                        if c.lower() == group_by_role.lower():
                            dim_col = c
                            break

                # Intelligent fallback dimension discovery across standard categorical roles
                if not dim_col:
                    for fallback_role in ["category", "segment", "region", "channel", "product", "brand", "type"]:
                        if fallback_role in role_to_col and role_to_col[fallback_role]:
                            dim_col = role_to_col[fallback_role]
                            break

                # If still not found, search for any discrete string column in the dataset
                if not dim_col:
                    for col_meta in all_cols_desc:
                        c_name, c_type = col_meta[0], str(col_meta[1]).upper()
                        if "VARCHAR" in c_type or "TEXT" in c_type or "STRING" in c_type:
                            try:
                                dist_res = con.execute(f'SELECT COUNT(DISTINCT "{c_name}") FROM dataset WHERE "{c_name}" IS NOT NULL').fetchone()
                                if dist_res and 2 <= dist_res[0] <= 50:
                                    dim_col = c_name
                                    break
                            except Exception:
                                continue

                if dim_col:
                    # Select effective metrics and fallback to count if no metrics defined
                    effective_selects = list(valid_sql_selects)
                    effective_defs = list(valid_metric_defs)
                    if not effective_selects:
                        effective_selects.append("COUNT(*) AS total_orders")
                        effective_defs.append(metric_registry.get_metric("total_orders") or MetricDefinition(
                            id="total_orders", label="Total Transactions", description="Count of rows",
                            required_roles=[], unit="count", format_str="integer", direction="higher_is_better"
                        ))

                    valid_metric_ids = [m.id for m in effective_defs]
                    primary_metric = "total_revenue" if "total_revenue" in valid_metric_ids else (valid_metric_ids[0] if valid_metric_ids else "total_orders")

                    if primary_metric and effective_selects:
                        order_dir = "ASC" if str(order_direction).upper() == "ASC" else "DESC"
                        limit_clause = f"LIMIT {int(limit)}" if limit and limit > 0 else "LIMIT 20"
                        dim_query = f"""
                            SELECT 
                                "{dim_col}"::VARCHAR AS dim_val,
                                {', '.join(effective_selects)}
                            FROM dataset 
                            {where_sql}
                            GROUP BY "{dim_col}"
                            ORDER BY {primary_metric} {order_dir}
                            {limit_clause}
                        """
                        dim_rows = con.execute(dim_query).fetchall()

                        # Grand total for primary metric for share_pct
                        grand_total = (
                            metric_results[primary_metric].value
                            if (primary_metric in metric_results and metric_results[primary_metric].value)
                            else None
                        )
                        if grand_total is None or grand_total <= 0:
                            grand_total = sum(float(r[1]) for r in dim_rows if r[1] is not None) if dim_rows else 1.0

                        breakdown_items = []
                        for rank, row in enumerate(dim_rows, start=1):
                            dim_val = row[0] if row[0] is not None else "Unknown"
                            row_metrics: Dict[str, float] = {}
                            for idx, m_def in enumerate(effective_defs, start=1):
                                row_metrics[m_def.id] = round(float(row[idx]), 2) if row[idx] is not None else 0.0

                            prim_val = row_metrics.get(primary_metric, 0.0)
                            share_pct = round((prim_val / grand_total * 100), 2) if grand_total > 0 else 0.0

                            breakdown_items.append(
                                BreakdownItem(
                                    dimension_value=dim_val,
                                    metrics=row_metrics,
                                    share_pct=share_pct,
                                    rank=rank,
                                )
                            )

            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

            lineage = LineageRecord(
                dataset_id=dataset_id,
                version_number=version_number,
                content_hash=content_hash,
                total_rows_scanned=total_rows,
                rows_after_filters=filtered_rows,
                execution_time_ms=elapsed_ms,
                filters_applied=applied_filters,
                formula_registry_version="v1.0",
            )

            return AnalyticsQueryResult(
                metrics=metric_results,
                breakdown=breakdown_items,
                lineage=lineage,
            )

        finally:
            con.close()


analytics_engine = AnalyticsEngine()
