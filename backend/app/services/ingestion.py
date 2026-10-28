"""BizLens Ingestion Engine: Validates, sanitizes, and ingests multi-format datasets into Snappy-compressed Parquet using DuckDB."""

import os
import re
import csv
import hashlib
import tempfile
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass
from pathlib import Path
import duckdb
import pandas as pd

from app.core.config import settings
from app.core.errors import BizLensError, ValidationError
from app.core.logging import logger

import zipfile

MAX_ROWS = 500_000
MAX_BYTES = settings.MAX_UPLOAD_MB * 1024 * 1024
MAX_DECOMPRESSED_BYTES = 200 * 1024 * 1024  # 200 MB
MAX_COMPRESSION_RATIO = 10.0


def validate_file_security(
    source_path: Path,
    max_decompressed_bytes: int = MAX_DECOMPRESSED_BYTES,
    max_compression_ratio: float = MAX_COMPRESSION_RATIO,
) -> None:
    """Strict security checks per SECURITY.md:
    1. Rejects executable and macro extensions (.xlsm, .xlsb, .xltm).
    2. Inspects OOXML (.xlsx) archives for vbaProject.bin, macros, and zip bombs.
    3. Verifies Parquet magic bytes ('PAR1').
    """
    ext = source_path.suffix.lower()
    if ext in [".xlsm", ".xlsb", ".xltm", ".exe", ".sh", ".py", ".bat", ".cmd", ".vbs"]:
        raise BizLensError(
            "MALICIOUS_FILE_TYPE",
            f"File format '{ext}' is prohibited due to embedded macro / execution risks.",
            status_code=400,
        )

    if ext == ".xlsx":
        if not zipfile.is_zipfile(source_path):
            raise BizLensError("INVALID_OOXML", "Corrupt or invalid Excel OOXML container.", status_code=400)

        with zipfile.ZipFile(source_path, "r") as zf:
            total_uncompressed = 0
            total_compressed = 0
            for info in zf.infolist():
                fn_lower = info.filename.lower()
                if "vbaproject.bin" in fn_lower or "vba" in fn_lower or fn_lower.endswith(".bin"):
                    raise BizLensError(
                        "MACRO_DETECTED",
                        "Embedded VBA macro or binary project detected. Macros are prohibited.",
                        status_code=400,
                    )
                total_uncompressed += info.file_size
                total_compressed += info.compress_size

            if total_uncompressed > max_decompressed_bytes:
                raise BizLensError(
                    "DECOMPRESSION_BOMB",
                    f"Decompressed file size ({total_uncompressed / (1024*1024):.1f}MB) exceeds limit.",
                    status_code=413,
                )
            if total_compressed > 0 and (total_uncompressed / total_compressed) > max_compression_ratio:
                if total_uncompressed > 50_000:
                    raise BizLensError(
                        "DECOMPRESSION_RATIO_EXCEEDED",
                        "Archive compression ratio exceeds safe budget.",
                        status_code=413,
                    )

    elif ext == ".parquet":
        if source_path.stat().st_size >= 4:
            with open(source_path, "rb") as f:
                header = f.read(4)
                if header != b"PAR1":
                    raise BizLensError("INVALID_PARQUET", "Invalid Parquet magic bytes.", status_code=400)


@dataclass
class ColumnMeta:
    original_name: str
    clean_name: str
    detected_type: str


@dataclass
class IngestionResult:
    dataset_id: str
    version_number: int
    parquet_path: str
    row_count: int
    col_count: int
    columns: List[ColumnMeta]
    content_hash: str
    file_size_bytes: int


def sanitize_column_name(name: str) -> str:
    """Sanitize a raw column name into a valid, safe SQL/Parquet identifier."""
    cleaned = name.strip()
    # Replace non-alphanumeric chars (except underscores) with underscores
    cleaned = re.sub(r"[^a-zA-Z0-9_]+", "_", cleaned)
    # Collapse multiple consecutive underscores
    cleaned = re.sub(r"_+", "_", cleaned)
    # Trim leading/trailing underscores
    cleaned = cleaned.strip("_")
    # If empty or begins with a digit, prefix with col_
    if not cleaned:
        cleaned = "col"
    elif cleaned[0].isdigit():
        cleaned = f"col_{cleaned}"
    return cleaned.lower()


def deduplicate_column_names(names: List[str]) -> Tuple[List[str], Dict[str, str]]:
    """Deduplicates cleaned column names and returns (clean_names, original_to_clean_map)."""
    seen: Dict[str, int] = {}
    clean_names: List[str] = []
    mapping: Dict[str, str] = {}

    for original in names:
        base = sanitize_column_name(original)
        if base in seen:
            seen[base] += 1
            unique_name = f"{base}_{seen[base]}"
        else:
            seen[base] = 0
            unique_name = base
        clean_names.append(unique_name)
        mapping[original] = unique_name

    return clean_names, mapping


class IngestionEngine:
    def __init__(self, storage_root: Optional[str] = None):
        self.storage_root = Path(storage_root or settings.STORAGE_ROOT) / "datasets"
        self.storage_root.mkdir(parents=True, exist_ok=True)

    def compute_stream_hash_and_save(
        self, stream, target_path: Path
    ) -> Tuple[str, int]:
        """Stream chunks from upload, calculate SHA-256, verify size, and write to disk."""
        hasher = hashlib.sha256()
        total_bytes = 0
        chunk_size = 64 * 1024  # 64KB

        with open(target_path, "wb") as dest:
            while True:
                chunk = stream.read(chunk_size)
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > MAX_BYTES:
                    raise BizLensError(
                        "FILE_TOO_LARGE",
                        f"File size exceeds limit of {settings.MAX_UPLOAD_MB}MB.",
                        status_code=413,
                    )
                hasher.update(chunk)
                dest.write(chunk)

        if total_bytes == 0:
            raise ValidationError("Uploaded file is empty.")

        return hasher.hexdigest(), total_bytes

    def ingest_file(
        self,
        source_path: Path,
        dataset_id: str,
        version_number: int = 1,
        content_hash: Optional[str] = None,
        file_size: Optional[int] = None,
    ) -> IngestionResult:
        """Main ingestion pipeline: converts source file to Snappy Parquet via DuckDB."""
        if not source_path.exists():
            raise BizLensError("FILE_NOT_FOUND", f"Source file {source_path} does not exist.")

        # Enforce strict security validations per SECURITY.md
        validate_file_security(source_path)

        if not content_hash or not file_size:
            hasher = hashlib.sha256()
            size = 0
            with open(source_path, "rb") as f:
                for chunk in iter(lambda: f.read(65536), b""):
                    hasher.update(chunk)
                    size += len(chunk)
            content_hash = hasher.hexdigest()
            file_size = size

        ext = source_path.suffix.lower()
        if ext not in [".csv", ".tsv", ".txt", ".xlsx", ".xls", ".parquet", ".json"]:
            raise BizLensError(
                "UNSUPPORTED_FORMAT",
                f"File format '{ext}' is not supported. Use CSV, Excel, Parquet, or JSON.",
                status_code=400,
            )

        # Target storage location: storage/datasets/{dataset_id}/v{version_number}.parquet
        dataset_dir = self.storage_root / dataset_id
        dataset_dir.mkdir(parents=True, exist_ok=True)
        target_parquet = dataset_dir / f"v{version_number}.parquet"

        con = duckdb.connect(":memory:")

        try:
            # 1. Load into DuckDB staging table
            if ext in [".csv", ".tsv", ".txt"]:
                # Try DuckDB auto csv reader with delimiter detection
                try:
                    con.execute(
                        f"CREATE TABLE raw_data AS SELECT * FROM read_csv_auto('{source_path.as_posix()}', all_varchar=False, header=True)"
                    )
                except Exception as csv_err:
                    logger.warning("DuckDB read_csv_auto failed, falling back to manual delimiter sniff: %s", csv_err)
                    # Detect delimiter manually
                    with open(source_path, "r", encoding="utf-8", errors="ignore") as f:
                        sample = f.read(8192)
                        dialect = csv.Sniffer().sniff(sample, delimiters=",\t;|")
                        delimiter = dialect.delimiter
                    con.execute(
                        f"CREATE TABLE raw_data AS SELECT * FROM read_csv('{source_path.as_posix()}', delim='{delimiter}', header=True)"
                    )

            elif ext in [".xlsx", ".xls"]:
                # Read via pandas then register in DuckDB
                df = pd.read_excel(source_path, sheet_name=0)
                con.register("df_excel", df)
                con.execute("CREATE TABLE raw_data AS SELECT * FROM df_excel")

            elif ext == ".parquet":
                con.execute(f"CREATE TABLE raw_data AS SELECT * FROM read_parquet('{source_path.as_posix()}')")

            elif ext == ".json":
                con.execute(f"CREATE TABLE raw_data AS SELECT * FROM read_json_auto('{source_path.as_posix()}')")

            # 2. Check row count
            row_count_res = con.execute("SELECT COUNT(*) FROM raw_data").fetchone()
            row_count = row_count_res[0] if row_count_res else 0

            if row_count == 0:
                raise ValidationError("Dataset contains 0 rows.")

            if row_count > MAX_ROWS:
                raise BizLensError(
                    "ROW_LIMIT_EXCEEDED",
                    f"Dataset contains {row_count:,} rows, exceeding the {MAX_ROWS:,} row limit.",
                    status_code=413,
                )

            # 3. Retrieve columns and sanitize names
            describe_res = con.execute("DESCRIBE raw_data").fetchall()
            original_names = [row[0] for row in describe_res]
            raw_types = [row[1] for row in describe_res]

            clean_names, orig_map = deduplicate_column_names(original_names)

            # Construct projection query with alias renaming
            select_clauses = [
                f'"{orig}" AS "{clean}"' for orig, clean in zip(original_names, clean_names)
            ]
            projection = ", ".join(select_clauses)

            con.execute(f"CREATE TABLE clean_data AS SELECT {projection} FROM raw_data")

            # Get final cleaned column metadata
            clean_describe = con.execute("DESCRIBE clean_data").fetchall()
            col_meta_list: List[ColumnMeta] = []
            for (clean_col, col_type, *_), orig_name in zip(clean_describe, original_names):
                col_meta_list.append(
                    ColumnMeta(
                        original_name=orig_name,
                        clean_name=clean_col,
                        detected_type=col_type,
                    )
                )

            # 4. Export to Snappy-compressed Parquet
            con.execute(
                f"COPY clean_data TO '{target_parquet.as_posix()}' (FORMAT PARQUET, COMPRESSION SNAPPY)"
            )

            logger.info(
                "Ingested %s: %d rows, %d cols -> %s (hash: %s)",
                source_path.name,
                row_count,
                len(col_meta_list),
                target_parquet,
                content_hash[:8],
            )

            return IngestionResult(
                dataset_id=dataset_id,
                version_number=version_number,
                parquet_path=str(target_parquet.resolve()),
                row_count=row_count,
                col_count=len(col_meta_list),
                columns=col_meta_list,
                content_hash=content_hash,
                file_size_bytes=file_size,
            )

        except BizLensError:
            raise
        except Exception as e:
            logger.error("Failed to ingest file %s: %s", source_path, e, exc_info=True)
            raise BizLensError("INGESTION_FAILED", f"Failed to ingest dataset: {str(e)}", status_code=400)
        finally:
            con.close()


ingestion_engine = IngestionEngine()
