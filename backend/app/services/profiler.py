"""BizLens Data Profiler: High-performance statistical profiling, anomaly detection, and data quality scoring over Parquet datasets using DuckDB."""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
from pathlib import Path
import duckdb
from app.core.logging import logger


@dataclass
class ColumnProfile:
    column_name: str
    original_name: str
    duckdb_type: str
    semantic_family: str  # numeric, temporal, categorical, boolean, unknown
    null_count: int
    null_percentage: float
    distinct_count: int
    cardinality_ratio: float
    is_unique: bool
    is_constant: bool
    numeric_stats: Optional[Dict[str, Any]] = None
    temporal_stats: Optional[Dict[str, Any]] = None
    categorical_stats: Optional[Dict[str, Any]] = None
    issues: Optional[List[Dict[str, Any]]] = None


@dataclass
class QualityScoreSummary:
    score: float
    completeness: float
    consistency: float
    validity: float
    uniqueness: float
    anomaly_freedom: float
    total_issues_count: int
    formula_version: str = "v1.2-audited"


@dataclass
class DatasetProfileResult:
    dataset_id: str
    version_number: int
    row_count: int
    col_count: int
    columns: Dict[str, ColumnProfile]
    quality_score: QualityScoreSummary
    issues: List[Dict[str, Any]]


class DataProfiler:
    def profile_parquet(
        self,
        parquet_path: Path,
        dataset_id: str,
        version_number: int,
        orig_column_names: Optional[Dict[str, str]] = None,
    ) -> DatasetProfileResult:
        """Runs fast in-engine analytical SQL over Parquet file to extract deep statistical metadata."""
        con = duckdb.connect(":memory:")
        orig_map = orig_column_names or {}

        try:
            view_sql = f"CREATE VIEW dataset AS SELECT * FROM read_parquet('{parquet_path.as_posix()}')"
            con.execute(view_sql)

            # 1. Total row and column count
            row_count_res = con.execute("SELECT COUNT(*) FROM dataset").fetchone()
            total_rows = row_count_res[0] if row_count_res else 0

            describe_res = con.execute("DESCRIBE dataset").fetchall()
            col_profiles: Dict[str, ColumnProfile] = {}
            all_issues: List[Dict[str, Any]] = []

            total_cells = total_rows * len(describe_res) if total_rows > 0 else 1
            total_null_cells = 0

            for col_info in describe_res:
                col_name = col_info[0]
                col_type = col_info[1].upper()
                orig_name = orig_map.get(col_name, col_name)

                # Determine semantic family
                if any(t in col_type for t in ["INT", "DOUBLE", "FLOAT", "DECIMAL", "HUGEINT", "TINYINT", "SMALLINT"]):
                    family = "numeric"
                elif any(t in col_type for t in ["DATE", "TIMESTAMP", "TIME"]):
                    family = "temporal"
                elif "BOOL" in col_type:
                    family = "boolean"
                else:
                    family = "categorical"

                # Base statistics: count, nulls, distincts
                stats_query = f"""
                    SELECT 
                        COUNT("{col_name}") AS non_null_count,
                        COUNT(DISTINCT "{col_name}") AS distinct_count
                    FROM dataset
                """
                base_stats = con.execute(stats_query).fetchone()
                non_null_count = base_stats[0] if base_stats else 0
                distinct_count = base_stats[1] if base_stats else 0

                null_count = total_rows - non_null_count
                total_null_cells += null_count
                null_pct = round((null_count / total_rows * 100), 2) if total_rows > 0 else 0.0
                card_ratio = round((distinct_count / total_rows), 4) if total_rows > 0 else 0.0
                is_unique = (distinct_count == total_rows) and (null_count == 0) and total_rows > 0
                is_constant = distinct_count <= 1

                col_issues: List[Dict[str, Any]] = []

                # Check for critical and standard null rates
                if null_pct > 50.0:
                    issue = {
                        "column": col_name,
                        "severity": "critical",
                        "code": "EXCESSIVE_NULLS",
                        "message": f"Column '{orig_name}' is {null_pct}% null ({null_count:,} missing rows).",
                    }
                    col_issues.append(issue)
                    all_issues.append(issue)
                elif null_pct > 15.0:
                    issue = {
                        "column": col_name,
                        "severity": "warning",
                        "code": "HIGH_NULLS",
                        "message": f"Column '{orig_name}' has {null_pct}% missing values ({null_count:,} rows).",
                    }
                    col_issues.append(issue)
                    all_issues.append(issue)
                elif null_count > 0:
                    issue = {
                        "column": col_name,
                        "severity": "warning",
                        "code": "MISSING_VALUES",
                        "message": f"Column '{orig_name}' has {null_count:,} missing values ({null_pct}%).",
                    }
                    col_issues.append(issue)
                    all_issues.append(issue)

                if is_constant and total_rows > 1:
                    issue = {
                        "column": col_name,
                        "severity": "warning",
                        "code": "CONSTANT_COLUMN",
                        "message": f"Column '{orig_name}' has only 1 distinct value across all rows.",
                    }
                    col_issues.append(issue)
                    all_issues.append(issue)

                numeric_stats = None
                temporal_stats = None
                categorical_stats = None

                # Numeric profiling
                if family == "numeric" and non_null_count > 0:
                    try:
                        num_query = f"""
                            SELECT 
                                MIN("{col_name}")::DOUBLE AS min_val,
                                MAX("{col_name}")::DOUBLE AS max_val,
                                AVG("{col_name}")::DOUBLE AS avg_val,
                                STDDEV("{col_name}")::DOUBLE AS stddev_val,
                                QUANTILE_CONT("{col_name}", 0.25)::DOUBLE AS q25,
                                QUANTILE_CONT("{col_name}", 0.50)::DOUBLE AS median,
                                QUANTILE_CONT("{col_name}", 0.75)::DOUBLE AS q75,
                                COUNT(*) FILTER (WHERE "{col_name}" = 0) AS zeros_count,
                                COUNT(*) FILTER (WHERE "{col_name}" < 0) AS negative_count
                            FROM dataset
                            WHERE "{col_name}" IS NOT NULL
                        """
                        num_res = con.execute(num_query).fetchone()
                        if num_res:
                            numeric_stats = {
                                "min": round(num_res[0], 4) if num_res[0] is not None else None,
                                "max": round(num_res[1], 4) if num_res[1] is not None else None,
                                "avg": round(num_res[2], 4) if num_res[2] is not None else None,
                                "stddev": round(num_res[3], 4) if num_res[3] is not None else None,
                                "q25": round(num_res[4], 4) if num_res[4] is not None else None,
                                "median": round(num_res[5], 4) if num_res[5] is not None else None,
                                "q75": round(num_res[6], 4) if num_res[6] is not None else None,
                                "zeros_count": num_res[7],
                                "negative_count": num_res[8],
                            }
                            # Negative value check for monetary or volume columns
                            if num_res[8] > 0 and any(
                                term in col_name.lower() for term in ["revenue", "sales", "qty", "quantity", "price", "unit_price", "cost", "unit_cost", "amount", "total"]
                            ):
                                issue = {
                                    "column": col_name,
                                    "severity": "warning",
                                    "code": "UNEXPECTED_NEGATIVE_VALUES",
                                    "message": f"Column '{orig_name}' has {num_res[8]:,} negative values in a likely non-negative field.",
                                }
                                col_issues.append(issue)
                                all_issues.append(issue)

                            # Statistical outlier detection using 1.5x IQR
                            q25 = num_res[4]
                            q75 = num_res[6]
                            if q25 is not None and q75 is not None:
                                iqr = q75 - q25
                                if iqr > 0:
                                    lower_bound = q25 - (1.5 * iqr)
                                    upper_bound = q75 + (1.5 * iqr)
                                    try:
                                        out_res = con.execute(
                                            f'SELECT COUNT(*) FROM dataset WHERE "{col_name}" < {lower_bound} OR "{col_name}" > {upper_bound}'
                                        ).fetchone()
                                        outlier_count = out_res[0] if out_res else 0
                                        if outlier_count > 0:
                                            outlier_pct = round(outlier_count / non_null_count * 100, 1)
                                            # Check if this exceeds anomaly significance threshold (5.0% or extreme 3.0x IQR)
                                            extreme_lower = q25 - (3.0 * iqr)
                                            extreme_upper = q75 + (3.0 * iqr)
                                            ext_res = con.execute(
                                                f'SELECT COUNT(*) FROM dataset WHERE "{col_name}" < {extreme_lower} OR "{col_name}" > {extreme_upper}'
                                            ).fetchone()
                                            extreme_count = ext_res[0] if ext_res else 0
                                            if outlier_pct > 5.0 or extreme_count > 0:
                                                issue = {
                                                    "column": col_name,
                                                    "severity": "warning",
                                                    "code": "OUTLIER_VALUES",
                                                    "message": f"Column '{orig_name}' has {outlier_count:,} statistical outlier(s) ({outlier_pct}%) outside IQR bounds [{lower_bound:.2f}, {upper_bound:.2f}].",
                                                }
                                                col_issues.append(issue)
                                                all_issues.append(issue)
                                    except Exception as out_err:
                                        logger.debug("Outlier detection skipped for %s: %s", col_name, out_err)
                    except Exception as err:
                        logger.warning("Numeric profiling failed for %s: %s", col_name, err)

                # Temporal profiling
                elif family == "temporal" and non_null_count > 0:
                    try:
                        temp_query = f"""
                            SELECT 
                                MIN("{col_name}")::VARCHAR AS min_date,
                                MAX("{col_name}")::VARCHAR AS max_date
                            FROM dataset
                            WHERE "{col_name}" IS NOT NULL
                        """
                        temp_res = con.execute(temp_query).fetchone()
                        if temp_res:
                            temporal_stats = {
                                "min_date": temp_res[0],
                                "max_date": temp_res[1],
                            }
                    except Exception as err:
                        logger.warning("Temporal profiling failed for %s: %s", col_name, err)

                # Categorical profiling & frequent values
                if family in ["categorical", "boolean"] and non_null_count > 0:
                    try:
                        top_vals_query = f"""
                            SELECT 
                                "{col_name}"::VARCHAR AS val, 
                                COUNT(*) AS cnt
                            FROM dataset
                            WHERE "{col_name}" IS NOT NULL
                            GROUP BY "{col_name}"
                            ORDER BY cnt DESC
                            LIMIT 5
                        """
                        top_res = con.execute(top_vals_query).fetchall()
                        top_values = [
                            {
                                "value": row[0] if row[0] is not None else "null",
                                "count": row[1],
                                "pct": round(row[1] / total_rows * 100, 2),
                            }
                            for row in top_res
                        ]
                        categorical_stats = {
                            "top_values": top_values,
                        }

                        # Casing variance check
                        if family == "categorical" and distinct_count > 1:
                            casing_res = con.execute(
                                f'SELECT COUNT(DISTINCT LOWER("{col_name}")) FROM dataset WHERE "{col_name}" IS NOT NULL'
                            ).fetchone()
                            if casing_res and casing_res[0] is not None and casing_res[0] < distinct_count:
                                casing_variants = distinct_count - casing_res[0]
                                issue = {
                                    "column": col_name,
                                    "severity": "warning",
                                    "code": "CASING_INCONSISTENCY",
                                    "message": f"Column '{orig_name}' contains {casing_variants} category casing variance(s) (e.g. mixed uppercase and lowercase values).",
                                }
                                col_issues.append(issue)
                                all_issues.append(issue)
                    except Exception as err:
                        logger.warning("Categorical profiling failed for %s: %s", col_name, err)

                col_profiles[col_name] = ColumnProfile(
                    column_name=col_name,
                    original_name=orig_name,
                    duckdb_type=col_type,
                    semantic_family=family,
                    null_count=null_count,
                    null_percentage=null_pct,
                    distinct_count=distinct_count,
                    cardinality_ratio=card_ratio,
                    is_unique=is_unique,
                    is_constant=is_constant,
                    numeric_stats=numeric_stats,
                    temporal_stats=temporal_stats,
                    categorical_stats=categorical_stats,
                    issues=col_issues if col_issues else None,
                )

            # 2. Compute Overall Data Quality Score
            # Component 1: Completeness (35% weight)
            completeness = max(0.0, 100.0 - (total_null_cells / total_cells * 100.0))

            # Component 2: Uniqueness (20% weight) - detect exact duplicate rows
            duplicate_count = 0
            if total_rows > 1:
                try:
                    distinct_res = con.execute("SELECT COUNT(*) FROM (SELECT DISTINCT * FROM dataset)").fetchone()
                    distinct_rows = distinct_res[0] if distinct_res else total_rows
                    duplicate_count = max(0, total_rows - distinct_rows)
                    if duplicate_count > 0:
                        dup_pct = round(duplicate_count / total_rows * 100, 1)
                        issue = {
                            "column": None,
                            "severity": "critical" if dup_pct > 10.0 else "warning",
                            "code": "DUPLICATE_ROWS",
                            "message": f"Dataset contains {duplicate_count:,} duplicate rows ({dup_pct}% of total rows).",
                        }
                        all_issues.append(issue)
                except Exception as err:
                    logger.warning("Duplicate row check failed: %s", err)

            uniqueness = max(0.0, 100.0 - (duplicate_count / total_rows * 100.0)) if total_rows > 0 else 100.0

            # Component 3: Consistency (15% weight) - check for untrimmed whitespace and constant columns
            untrimmed_total = 0
            for col_name, prof in col_profiles.items():
                if prof.semantic_family == "categorical":
                    try:
                        untrim_res = con.execute(
                            f'SELECT COUNT(*) FROM dataset WHERE "{col_name}" IS NOT NULL AND "{col_name}" != TRIM("{col_name}")'
                        ).fetchone()
                        cnt = untrim_res[0] if untrim_res else 0
                        if cnt > 0:
                            untrimmed_total += cnt
                            issue = {
                                "column": col_name,
                                "severity": "warning",
                                "code": "UNTRIMMED_WHITESPACE",
                                "message": f"Column '{prof.original_name}' has {cnt} values with leading or trailing whitespace.",
                            }
                            prof.issues = (prof.issues or []) + [issue]
                            all_issues.append(issue)
                    except Exception as err:
                        logger.warning("Untrimmed check failed for %s: %s", col_name, err)

            consistency_deductions = 0.0
            for col in col_profiles.values():
                if col.is_constant:
                    consistency_deductions += 5.0
                if col.null_percentage > 50.0:
                    consistency_deductions += 5.0
            if untrimmed_total > 0 and total_rows > 0:
                consistency_deductions += min(20.0, round(untrimmed_total / total_rows * 20.0, 1))
            casing_issues = [i for i in all_issues if i.get("code") == "CASING_INCONSISTENCY"]
            if casing_issues:
                consistency_deductions += min(15.0, len(casing_issues) * 3.0)
            consistency = max(0.0, 100.0 - consistency_deductions)

            # Component 4: Validity (30% weight) - deduct for unexpected negatives, unparseables, and statistical outliers
            validity_deductions = len([i for i in all_issues if i.get("code") in ("UNEXPECTED_NEGATIVE_VALUES", "INVALID_DATE")]) * 8.0
            outlier_issues = [i for i in all_issues if i.get("code") == "OUTLIER_VALUES"]
            if outlier_issues:
                validity_deductions += min(15.0, len(outlier_issues) * 2.5)
            validity = max(0.0, 100.0 - validity_deductions)

            critical_count = len([i for i in all_issues if i.get("severity") == "critical"])
            anomaly_freedom = max(0.0, 100.0 - (critical_count * 15.0))

            # METRICS.md: QualityScore = 0.35 * Completeness + 0.30 * Validity + 0.20 * Uniqueness + 0.15 * Consistency
            final_score = round(
                (0.35 * completeness)
                + (0.30 * validity)
                + (0.20 * uniqueness)
                + (0.15 * consistency),
                1,
            )

            quality_score = QualityScoreSummary(
                score=final_score,
                completeness=round(completeness, 1),
                consistency=round(consistency, 1),
                validity=round(validity, 1),
                uniqueness=round(uniqueness, 1),
                anomaly_freedom=round(anomaly_freedom, 1),
                total_issues_count=len(all_issues),
            )

            return DatasetProfileResult(
                dataset_id=dataset_id,
                version_number=version_number,
                row_count=total_rows,
                col_count=len(col_profiles),
                columns=col_profiles,
                quality_score=quality_score,
                issues=all_issues,
            )

        finally:
            con.close()


data_profiler = DataProfiler()
