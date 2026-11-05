"""BizLens Transformation Service: Deterministic DuckDB cleaning and versioning over Parquet datasets.

RULES.md Mandate:
"Analytics calculates. GenAI explains. Gemini is not the calculator."
All transformations are deterministic DuckDB SQL operations. Every Apply creates an immutable Parquet version.
"""

import hashlib
import json
import uuid
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import duckdb
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import BizLensError, NotFoundError, ValidationError
from app.core.logging import logger
from app.db.models import Dataset, DatasetVersion, ColumnMapping, QualityReport, Transformation, AuditLog
from app.schemas.dataset import TransformationStats, TransformationPreviewResponse, TransformationApplyResponse
from app.services.profiler import data_profiler


class TransformationService:
    def _fetch_records(self, con: duckdb.DuckDBPyConnection, query: str) -> List[Dict[str, Any]]:
        cursor = con.execute(query)
        cols = [desc[0] for desc in cursor.description]
        rows = cursor.fetchall()
        records = []
        for r in rows:
            record = {}
            for col, val in zip(cols, r):
                if val is None:
                    record[col] = ""
                elif isinstance(val, (int, float, str, bool)):
                    record[col] = val
                else:
                    record[col] = str(val)
            records.append(record)
        return records

    def _get_base_stats(self, con: duckdb.DuckDBPyConnection) -> TransformationStats:
        """Helper to compute row, column, null, and duplicate counts."""
        row_res = con.execute("SELECT COUNT(*) FROM dataset").fetchone()
        row_count = row_res[0] if row_res else 0

        describe_res = con.execute("DESCRIBE dataset").fetchall()
        col_count = len(describe_res)

        total_cells = row_count * col_count if row_count > 0 else 1
        null_res = con.execute(
            f"SELECT {' + '.join([f'COUNT(*) - COUNT(\"{col[0]}\")' for col in describe_res])} FROM dataset"
            if describe_res else "SELECT 0"
        ).fetchone()
        null_count = null_res[0] if null_res and null_res[0] is not None else 0

        dup_count = 0
        if row_count > 1 and col_count > 0:
            distinct_res = con.execute("SELECT COUNT(*) FROM (SELECT DISTINCT * FROM dataset)").fetchone()
            distinct_count = distinct_res[0] if distinct_res else row_count
            dup_count = max(0, row_count - distinct_count)

        return TransformationStats(
            row_count=row_count,
            col_count=col_count,
            null_count=null_count,
            duplicate_count=dup_count,
        )

    def _get_transformed_stats(self, con: duckdb.DuckDBPyConnection) -> TransformationStats:
        """Helper to compute stats on the transformed temporary view/table."""
        row_res = con.execute("SELECT COUNT(*) FROM transformed").fetchone()
        row_count = row_res[0] if row_res else 0

        describe_res = con.execute("DESCRIBE transformed").fetchall()
        col_count = len(describe_res)

        null_res = con.execute(
            f"SELECT {' + '.join([f'COUNT(*) - COUNT(\"{col[0]}\")' for col in describe_res])} FROM transformed"
            if describe_res else "SELECT 0"
        ).fetchone()
        null_count = null_res[0] if null_res and null_res[0] is not None else 0

        dup_count = 0
        if row_count > 1 and col_count > 0:
            distinct_res = con.execute("SELECT COUNT(*) FROM (SELECT DISTINCT * FROM transformed)").fetchone()
            distinct_count = distinct_res[0] if distinct_res else row_count
            dup_count = max(0, row_count - distinct_count)

        return TransformationStats(
            row_count=row_count,
            col_count=col_count,
            null_count=null_count,
            duplicate_count=dup_count,
        )

    def _build_transformation_sql(
        self,
        con: duckdb.DuckDBPyConnection,
        trans_type: str,
        parameters: Dict[str, Any],
        describe_res: List[Tuple[str, str, str, str, str, str]],
    ) -> Tuple[str, str, Optional[str]]:
        """Constructs the deterministic DuckDB SQL for the specified transformation."""
        all_cols = [c[0] for c in describe_res]
        summary_msg = ""
        sample_diff_query: Optional[str] = None

        if trans_type == "deduplicate_rows":
            subset = parameters.get("subset")
            if subset and isinstance(subset, list) and len(subset) > 0:
                valid_subset = [c for c in subset if c in all_cols]
                if not valid_subset:
                    raise ValidationError(f"None of the subset columns {subset} exist in dataset.")
                partition_cols = ", ".join([f'"{c}"' for c in valid_subset])
                create_sql = f"""
                    CREATE TEMP TABLE transformed AS
                    SELECT * EXCLUDE (_bizlens_rn) FROM (
                        SELECT *, ROW_NUMBER() OVER (PARTITION BY {partition_cols} ORDER BY (SELECT NULL)) as _bizlens_rn
                        FROM dataset
                    ) WHERE _bizlens_rn = 1;
                """
                sample_diff_query = f"""
                    SELECT * FROM dataset
                    WHERE ({partition_cols}) IN (
                        SELECT {partition_cols} FROM dataset GROUP BY {partition_cols} HAVING COUNT(*) > 1
                    ) LIMIT 10
                """
                summary_msg = f"Deduplicated dataset based on key columns: {', '.join(valid_subset)}."
            else:
                create_sql = "CREATE TEMP TABLE transformed AS SELECT DISTINCT * FROM dataset;"
                sample_diff_query = "SELECT * FROM dataset GROUP BY ALL HAVING COUNT(*) > 1 LIMIT 10"
                summary_msg = "Removed all exact duplicate rows across all columns."

        elif trans_type == "drop_null_rows":
            cols = parameters.get("columns", [])
            how = parameters.get("how", "any").lower()
            target_cols = [c for c in cols if c in all_cols] if cols else all_cols
            if not target_cols:
                raise ValidationError("No valid columns specified for null dropping.")

            if how == "all":
                cond = "NOT (" + " AND ".join([f'"{c}" IS NULL' for c in target_cols]) + ")"
                drop_cond = " AND ".join([f'"{c}" IS NULL' for c in target_cols])
            else:
                cond = " AND ".join([f'"{c}" IS NOT NULL' for c in target_cols])
                drop_cond = " OR ".join([f'"{c}" IS NULL' for c in target_cols])

            create_sql = f"CREATE TEMP TABLE transformed AS SELECT * FROM dataset WHERE {cond};"
            sample_diff_query = f"SELECT * FROM dataset WHERE {drop_cond} LIMIT 10"
            summary_msg = f"Dropped rows with null values in {len(target_cols)} target column(s)."

        elif trans_type == "fill_null_values":
            cols = parameters.get("columns", [])
            strategy = parameters.get("strategy", "constant").lower()
            const_val = parameters.get("value")

            target_cols = [c for c in cols if c in all_cols] if cols else []
            if not target_cols:
                raise ValidationError("Must specify at least one existing column to fill nulls.")

            select_clauses = []
            for col in all_cols:
                if col in target_cols:
                    if strategy == "constant":
                        if const_val is None:
                            raise ValidationError("Constant strategy requires a non-null 'value'.")
                        # Format SQL literal
                        if isinstance(const_val, (int, float)):
                            fill_expr = f"{const_val}"
                        elif isinstance(const_val, bool):
                            fill_expr = f"{'TRUE' if const_val else 'FALSE'}"
                        else:
                            escaped = str(const_val).replace("'", "''")
                            fill_expr = f"'{escaped}'"
                    elif strategy == "median":
                        med_res = con.execute(
                            f'SELECT QUANTILE_CONT("{col}", 0.5)::DOUBLE FROM dataset WHERE "{col}" IS NOT NULL'
                        ).fetchone()
                        med_val = med_res[0] if med_res and med_res[0] is not None else 0.0
                        fill_expr = f"{med_val}"
                    elif strategy == "mean":
                        mean_res = con.execute(
                            f'SELECT AVG("{col}")::DOUBLE FROM dataset WHERE "{col}" IS NOT NULL'
                        ).fetchone()
                        mean_val = mean_res[0] if mean_res and mean_res[0] is not None else 0.0
                        fill_expr = f"{round(mean_val, 4)}"
                    elif strategy == "mode":
                        mode_res = con.execute(
                            f'SELECT "{col}" FROM dataset WHERE "{col}" IS NOT NULL GROUP BY "{col}" ORDER BY COUNT(*) DESC LIMIT 1'
                        ).fetchone()
                        if mode_res and mode_res[0] is not None:
                            mode_val = str(mode_res[0]).replace("'", "''")
                            fill_expr = f"'{mode_val}'"
                        else:
                            fill_expr = "''"
                    else:
                        raise ValidationError(f"Unknown fill strategy '{strategy}'. Use constant, median, mean, or mode.")

                    select_clauses.append(f'COALESCE("{col}", {fill_expr}) AS "{col}"')
                else:
                    select_clauses.append(f'"{col}"')

            create_sql = f"CREATE TEMP TABLE transformed AS SELECT {', '.join(select_clauses)} FROM dataset;"
            null_cond = " OR ".join([f'"{c}" IS NULL' for c in target_cols])
            sample_diff_query = f"SELECT * FROM dataset WHERE {null_cond} LIMIT 10"
            summary_msg = f"Imputed missing values for {len(target_cols)} column(s) using '{strategy}' strategy."

        elif trans_type == "trim_strings":
            cols = parameters.get("columns", [])
            string_types = ["VARCHAR", "TEXT", "STRING"]
            auto_cols = [c[0] for c in describe_res if any(t in c[1].upper() for t in string_types)]
            target_cols = [c for c in cols if c in all_cols] if cols else auto_cols

            if not target_cols:
                create_sql = "CREATE TEMP TABLE transformed AS SELECT * FROM dataset;"
                summary_msg = "No string columns found to trim."
            else:
                select_clauses = []
                for col in all_cols:
                    if col in target_cols:
                        select_clauses.append(f'TRIM("{col}") AS "{col}"')
                    else:
                        select_clauses.append(f'"{col}"')

                create_sql = f"CREATE TEMP TABLE transformed AS SELECT {', '.join(select_clauses)} FROM dataset;"
                untrim_cond = " OR ".join([f'("{c}" IS NOT NULL AND "{c}" != TRIM("{c}"))' for c in target_cols])
                sample_diff_query = f"SELECT * FROM dataset WHERE {untrim_cond} LIMIT 10"
                summary_msg = f"Trimmed leading and trailing whitespaces across {len(target_cols)} string column(s)."

        elif trans_type == "standardize_categories":
            col = parameters.get("column")
            if not col or col not in all_cols:
                raise ValidationError(f"Column '{col}' not found in dataset.")

            mapping = parameters.get("mapping", {})
            case_rule = parameters.get("case_rule", "").lower()

            if mapping and isinstance(mapping, dict):
                when_clauses = []
                for src_val, tgt_val in mapping.items():
                    src_escaped = str(src_val).replace("'", "''")
                    tgt_escaped = str(tgt_val).replace("'", "''")
                    when_clauses.append(f"WHEN \"{col}\" = '{src_escaped}' THEN '{tgt_escaped}'")
                transform_expr = f"CASE {' '.join(when_clauses)} ELSE \"{col}\" END"
                escaped_keys = [str(s).replace("'", "''") for s in mapping.keys()]
                src_list = ", ".join(f"'{k}'" for k in escaped_keys)
                sample_diff_query = f'SELECT * FROM dataset WHERE "{col}" IN ({src_list}) LIMIT 10'
                summary_msg = f"Standardized {len(mapping)} category aliases in '{col}'."
            elif case_rule == "title":
                transform_expr = f'INITCAP(TRIM("{col}"))'
                sample_diff_query = f'SELECT * FROM dataset WHERE "{col}" IS NOT NULL LIMIT 10'
                summary_msg = f"Converted categories in '{col}' to Title Case."
            elif case_rule == "upper":
                transform_expr = f'UPPER(TRIM("{col}"))'
                sample_diff_query = f'SELECT * FROM dataset WHERE "{col}" IS NOT NULL LIMIT 10'
                summary_msg = f"Converted categories in '{col}' to UPPER CASE."
            elif case_rule == "lower":
                transform_expr = f'LOWER(TRIM("{col}"))'
                sample_diff_query = f'SELECT * FROM dataset WHERE "{col}" IS NOT NULL LIMIT 10'
                summary_msg = f"Converted categories in '{col}' to lower case."
            else:
                raise ValidationError("Must provide a category mapping dictionary or a case_rule (title, upper, lower).")

            select_clauses = [f'{transform_expr} AS "{c}"' if c == col else f'"{c}"' for c in all_cols]
            create_sql = f"CREATE TEMP TABLE transformed AS SELECT {', '.join(select_clauses)} FROM dataset;"

        elif trans_type == "filter_outliers":
            col = parameters.get("column")
            if not col or col not in all_cols:
                raise ValidationError(f"Numeric column '{col}' required for outlier filtering.")

            threshold = float(parameters.get("threshold", 1.5))
            action = parameters.get("action", "drop").lower()

            # Calculate Q1, Q3, IQR
            q_res = con.execute(
                f'SELECT QUANTILE_CONT("{col}", 0.25)::DOUBLE, QUANTILE_CONT("{col}", 0.75)::DOUBLE FROM dataset WHERE "{col}" IS NOT NULL'
            ).fetchone()
            if not q_res or q_res[0] is None or q_res[1] is None:
                raise ValidationError(f"Could not compute quantiles on column '{col}'.")

            q1, q3 = q_res[0], q_res[1]
            iqr = q3 - q1
            lower_bound = q1 - (threshold * iqr)
            upper_bound = q3 + (threshold * iqr)

            sample_diff_query = f'SELECT * FROM dataset WHERE "{col}" < {lower_bound} OR "{col}" > {upper_bound} LIMIT 10'

            if action == "drop":
                create_sql = f"""
                    CREATE TEMP TABLE transformed AS 
                    SELECT * FROM dataset 
                    WHERE "{col}" IS NULL OR ("{col}" >= {lower_bound} AND "{col}" <= {upper_bound});
                """
                summary_msg = f"Dropped outliers outside [{lower_bound:.2f}, {upper_bound:.2f}] on column '{col}'."
            elif action == "cap":
                cap_expr = f"""
                    CASE 
                        WHEN "{col}" < {lower_bound} THEN {lower_bound}
                        WHEN "{col}" > {upper_bound} THEN {upper_bound}
                        ELSE "{col}"
                    END
                """
                select_clauses = [f'{cap_expr} AS "{c}"' if c == col else f'"{c}"' for c in all_cols]
                create_sql = f"CREATE TEMP TABLE transformed AS SELECT {', '.join(select_clauses)} FROM dataset;"
                summary_msg = f"Capped outliers to [{lower_bound:.2f}, {upper_bound:.2f}] on column '{col}'."
            else:
                raise ValidationError(f"Invalid outlier action '{action}'. Use 'drop' or 'cap'.")

        elif trans_type == "standardize_dates":
            col = parameters.get("column")
            if not col or col not in all_cols:
                raise ValidationError(f"Date column '{col}' required for date standardization.")

            select_clauses = [f'TRY_CAST("{c}" AS DATE) AS "{c}"' if c == col else f'"{c}"' for c in all_cols]
            create_sql = f"CREATE TEMP TABLE transformed AS SELECT {', '.join(select_clauses)} FROM dataset;"
            sample_diff_query = f'SELECT * FROM dataset WHERE "{col}" IS NOT NULL LIMIT 10'
            summary_msg = f"Parsed and standardized column '{col}' into ISO date format."

        else:
            raise ValidationError(
                f"Unsupported transformation type '{trans_type}'. Allowed types: "
                "deduplicate_rows, drop_null_rows, fill_null_values, trim_strings, standardize_categories, filter_outliers, standardize_dates."
            )

        return create_sql, summary_msg, sample_diff_query

    def preview_transformation(
        self,
        parquet_path: Path,
        trans_type: str,
        parameters: Dict[str, Any],
    ) -> TransformationPreviewResponse:
        """Simulates DuckDB transformation in-memory without modifying storage files."""
        if not parquet_path.exists():
            raise NotFoundError(f"Parquet file {parquet_path} does not exist.")

        con = duckdb.connect(":memory:")
        try:
            parquet_posix = parquet_path.as_posix()
            con.execute(f"CREATE VIEW dataset AS SELECT * FROM read_parquet('{parquet_posix}')")

            describe_res = con.execute("DESCRIBE dataset").fetchall()
            before_stats = self._get_base_stats(con)

            create_sql, summary_msg, sample_diff_query = self._build_transformation_sql(
                con=con,
                trans_type=trans_type,
                parameters=parameters,
                describe_res=describe_res,
            )
            con.execute(create_sql)

            after_stats = self._get_transformed_stats(con)
            rows_affected = abs(before_stats.row_count - after_stats.row_count)

            # For transformations that keep row count (fill_nulls, trim_strings, standardize_categories, cap outliers)
            if rows_affected == 0 and trans_type in ("fill_null_values", "trim_strings", "standardize_categories", "filter_outliers"):
                if trans_type == "fill_null_values":
                    rows_affected = abs(before_stats.null_count - after_stats.null_count)
                elif trans_type == "trim_strings" and sample_diff_query:
                    try:
                        cnt_res = con.execute(f"SELECT COUNT(*) FROM ({sample_diff_query.split('LIMIT')[0]})").fetchone()
                        rows_affected = cnt_res[0] if cnt_res else 0
                    except Exception:
                        rows_affected = 0

            # Get sample rows before and after
            sample_before: List[Dict[str, Any]] = []
            if sample_diff_query:
                try:
                    query_to_run = sample_diff_query if "LIMIT" in sample_diff_query else f"{sample_diff_query} LIMIT 5"
                    sample_before = self._fetch_records(con, query_to_run)
                except Exception as err:
                    logger.debug("Failed sample before query: %s", err)

            if not sample_before:
                sample_before = self._fetch_records(con, "SELECT * FROM dataset LIMIT 5")

            sample_after = self._fetch_records(con, "SELECT * FROM transformed LIMIT 5")

            return TransformationPreviewResponse(
                type=trans_type,
                parameters=parameters,
                rows_affected=rows_affected,
                before_stats=before_stats,
                after_stats=after_stats,
                sample_before=sample_before,
                sample_after=sample_after,
                summary_message=summary_msg,
            )
        finally:
            con.close()

    def apply_transformation(
        self,
        db: Session,
        dataset: Dataset,
        current_version: DatasetVersion,
        trans_type: str,
        parameters: Dict[str, Any],
        label: Optional[str],
        lock_version: int,
        user_id: str,
    ) -> TransformationApplyResponse:
        """Applies transformation, generates new immutable Parquet version, updates quality report, and logs audit."""
        # 1. Optimistic Locking Check
        if current_version.lock_version != lock_version:
            raise BizLensError(
                code="VERSION_CONFLICT",
                message=f"Optimistic lock conflict: version {current_version.version_number} has lock_version {current_version.lock_version}, provided {lock_version}. Please reload.",
                status_code=409,
            )

        parquet_path = Path(current_version.parquet_path)
        if not parquet_path.exists():
            raise NotFoundError(f"Parquet source file {parquet_path} does not exist.")

        con = duckdb.connect(":memory:")
        try:
            parquet_posix = parquet_path.as_posix()
            con.execute(f"CREATE VIEW dataset AS SELECT * FROM read_parquet('{parquet_posix}')")
            describe_res = con.execute("DESCRIBE dataset").fetchall()
            before_stats = self._get_base_stats(con)

            create_sql, summary_msg, _ = self._build_transformation_sql(
                con=con,
                trans_type=trans_type,
                parameters=parameters,
                describe_res=describe_res,
            )
            con.execute(create_sql)
            after_stats = self._get_transformed_stats(con)

            rows_affected = abs(before_stats.row_count - after_stats.row_count)
            if rows_affected == 0 and trans_type == "fill_null_values":
                rows_affected = abs(before_stats.null_count - after_stats.null_count)

            # 2. Write new immutable Parquet file atomically
            max_ver = db.query(func.max(DatasetVersion.version_number)).filter(DatasetVersion.dataset_id == dataset.id).scalar() or 0
            next_ver_num = max(current_version.version_number + 1, max_ver + 1)
            dataset_dir = Path(settings.STORAGE_ROOT) / dataset.id
            dataset_dir.mkdir(parents=True, exist_ok=True)

            temp_parquet = dataset_dir / f"temp_{uuid.uuid4().hex[:8]}.parquet"
            target_parquet = dataset_dir / f"v{next_ver_num}.parquet"

            con.execute(
                f"COPY transformed TO '{temp_parquet.as_posix()}' (FORMAT PARQUET, COMPRESSION SNAPPY)"
            )

            # Compute SHA-256 of new Parquet
            hasher = hashlib.sha256()
            with open(temp_parquet, "rb") as f:
                while chunk := f.read(65536):
                    hasher.update(chunk)
            content_hash = hasher.hexdigest()

            # Atomically replace/rename temp file to target
            temp_parquet.replace(target_parquet)

            # 3. Profile new version with DataProfiler
            profile_res = data_profiler.profile_parquet(
                parquet_path=target_parquet,
                dataset_id=dataset.id,
                version_number=next_ver_num,
            )

            # 4. DB Transaction: Version, Mapping, QualityReport, Transformation, Dataset update
            new_version_id = str(uuid.uuid4())
            trans_id = str(uuid.uuid4())
            action_label = label or f"{trans_type.replace('_', ' ').title()}"

            new_version = DatasetVersion(
                id=new_version_id,
                dataset_id=dataset.id,
                version_number=next_ver_num,
                parquet_path=str(target_parquet.resolve()),
                row_count=profile_res.row_count,
                col_count=profile_res.col_count,
                parent_version_id=current_version.id,
                created_by_transformation_id=trans_id,
                content_hash=content_hash,
                quality_score=profile_res.quality_score.score,
                lock_version=1,
                label=action_label,
            )
            db.add(new_version)

            # Carry forward column mapping
            existing_mapping = (
                db.query(ColumnMapping).filter(ColumnMapping.version_id == current_version.id).first()
            )
            new_mapping_dict = existing_mapping.mapping.copy() if existing_mapping and existing_mapping.mapping else {}
            new_mapping = ColumnMapping(
                id=str(uuid.uuid4()),
                version_id=new_version_id,
                mapping=new_mapping_dict,
            )
            db.add(new_mapping)

            # Create Quality Report for new version
            new_quality_report = QualityReport(
                id=str(uuid.uuid4()),
                version_id=new_version_id,
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
            db.add(new_quality_report)

            # Create Transformation audit record
            trans_record = Transformation(
                id=trans_id,
                dataset_id=dataset.id,
                from_version_id=current_version.id,
                to_version_id=new_version_id,
                type=trans_type,
                parameters=parameters,
                rows_affected=rows_affected,
                before_stats=before_stats.model_dump(),
                after_stats=after_stats.model_dump(),
                status="applied",
            )
            db.add(trans_record)

            # Update dataset active version
            dataset.active_version_id = new_version_id

            # Increment lock_version of old version to prevent concurrent modifications
            current_version.lock_version += 1

            # Log audit
            audit = AuditLog(
                user_id=user_id,
                action="transform_apply",
                resource_type="dataset",
                resource_id=dataset.id,
                metadata_={
                    "transformation_id": trans_id,
                    "type": trans_type,
                    "from_version": current_version.version_number,
                    "to_version": next_ver_num,
                    "rows_affected": rows_affected,
                },
            )
            db.add(audit)

            db.commit()
            db.refresh(new_version)

            logger.info(
                "Applied transformation %s on dataset %s: v%d -> v%d (rows: %d, score: %s%%)",
                trans_type,
                dataset.id,
                current_version.version_number,
                next_ver_num,
                profile_res.row_count,
                profile_res.quality_score.score,
            )

            return TransformationApplyResponse(
                transformation_id=trans_id,
                dataset_id=dataset.id,
                from_version_id=current_version.id,
                to_version_id=new_version_id,
                new_version_number=next_ver_num,
                rows_affected=rows_affected,
                new_row_count=profile_res.row_count,
                new_quality_score=profile_res.quality_score.score,
                label=action_label,
                status="applied",
                created_at=new_version.created_at.isoformat() if new_version.created_at else "",
            )
        finally:
            con.close()


transformation_service = TransformationService()
