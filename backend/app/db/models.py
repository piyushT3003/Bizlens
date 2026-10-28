from datetime import datetime, timezone
import json
from typing import Any, Dict, List, Optional
from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, BigInteger
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.types import TypeDecorator
from app.db.base import Base, TimestampMixin


class JSONType(TypeDecorator):
    """Platform-independent JSON type that serializes dicts/lists to JSON strings in SQLite."""
    impl = Text
    cache_ok = True

    def process_bind_param(self, value: Any, dialect: Any) -> Optional[str]:
        if value is not None:
            return json.dumps(value)
        return None

    def process_result_value(self, value: Any, dialect: Any) -> Any:
        if value is not None:
            return json.loads(value)
        return None


class User(Base, TimestampMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)
    failed_login_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    locked_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    settings = relationship("UserSetting", back_populates="user", uselist=False, cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    datasets = relationship("Dataset", back_populates="user", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="user", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")


class RefreshToken(Base, TimestampMixin):
    __tablename__ = "refresh_tokens"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    token_hash: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ip: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)

    user = relationship("User", back_populates="refresh_tokens")


class UserSetting(Base, TimestampMixin):
    __tablename__ = "user_settings"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="INR", nullable=False)
    number_grouping: Mapped[str] = mapped_column(String(16), default="lakh_crore", nullable=False)
    fiscal_year_start_month: Mapped[int] = mapped_column(Integer, default=4, nullable=False)
    date_format_default: Mapped[str] = mapped_column(String(32), default="DD/MM/YYYY", nullable=False)
    timezone: Mapped[str] = mapped_column(String(64), default="Asia/Kolkata", nullable=False)
    week_start: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    theme: Mapped[str] = mapped_column(String(16), default="dark", nullable=False)
    accent_intensity: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    motion_level: Mapped[str] = mapped_column(String(16), default="full", nullable=False)
    density: Mapped[str] = mapped_column(String(16), default="comfortable", nullable=False)
    ai_detail_level: Mapped[str] = mapped_column(String(16), default="balanced", nullable=False)
    gemini_consent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    own_api_key_encrypted: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    user = relationship("User", back_populates="settings")


class Dataset(Base, TimestampMixin):
    __tablename__ = "datasets"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source_filename_sanitized: Mapped[str] = mapped_column(String(255), nullable=False)
    active_version_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="ready", nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, index=True)

    user = relationship("User", back_populates="datasets")
    versions = relationship("DatasetVersion", back_populates="dataset", cascade="all, delete-orphan", foreign_keys="DatasetVersion.dataset_id")


class DatasetVersion(Base, TimestampMixin):
    __tablename__ = "dataset_versions"

    dataset_id: Mapped[str] = mapped_column(String(36), ForeignKey("datasets.id", ondelete="CASCADE"), index=True, nullable=False)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    parquet_path: Mapped[str] = mapped_column(String(512), nullable=False)
    row_count: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    col_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    parent_version_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    created_by_transformation_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    mapping_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    quality_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lock_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    label: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)

    dataset = relationship("Dataset", back_populates="versions", foreign_keys=[dataset_id])
    column_mapping = relationship("ColumnMapping", back_populates="version", uselist=False, cascade="all, delete-orphan")
    quality_report = relationship("QualityReport", back_populates="version", uselist=False, cascade="all, delete-orphan")
    analysis_results = relationship("AnalysisResult", back_populates="version", cascade="all, delete-orphan")
    findings = relationship("Finding", back_populates="version", cascade="all, delete-orphan")
    scenarios = relationship("Scenario", back_populates="version", cascade="all, delete-orphan")
    geo_resolutions = relationship("GeoResolution", back_populates="version", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("dataset_id", "version_number", name="uq_dataset_version_number"),
    )


class ColumnMapping(Base, TimestampMixin):
    __tablename__ = "column_mappings"

    version_id: Mapped[str] = mapped_column(String(36), ForeignKey("dataset_versions.id", ondelete="CASCADE"), unique=True, nullable=False)
    mapping: Mapped[Dict[str, Any]] = mapped_column(JSONType, default=dict, nullable=False)

    version = relationship("DatasetVersion", back_populates="column_mapping")


class Transformation(Base, TimestampMixin):
    __tablename__ = "transformations"

    dataset_id: Mapped[str] = mapped_column(String(36), ForeignKey("datasets.id", ondelete="CASCADE"), index=True, nullable=False)
    from_version_id: Mapped[str] = mapped_column(String(36), nullable=False)
    to_version_id: Mapped[str] = mapped_column(String(36), nullable=False)
    type: Mapped[str] = mapped_column(String(64), nullable=False)
    parameters: Mapped[Dict[str, Any]] = mapped_column(JSONType, default=dict, nullable=False)
    rows_affected: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    before_stats: Mapped[Dict[str, Any]] = mapped_column(JSONType, default=dict, nullable=False)
    after_stats: Mapped[Dict[str, Any]] = mapped_column(JSONType, default=dict, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="applied", nullable=False)


class QualityReport(Base, TimestampMixin):
    __tablename__ = "quality_reports"

    version_id: Mapped[str] = mapped_column(String(36), ForeignKey("dataset_versions.id", ondelete="CASCADE"), unique=True, nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    components: Mapped[Dict[str, Any]] = mapped_column(JSONType, default=dict, nullable=False)
    issues: Mapped[List[Any]] = mapped_column(JSONType, default=list, nullable=False)
    formula_version: Mapped[str] = mapped_column(String(16), default="v1.0", nullable=False)

    version = relationship("DatasetVersion", back_populates="quality_report")


class AnalysisResult(Base, TimestampMixin):
    __tablename__ = "analysis_results"

    cache_key: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    version_id: Mapped[str] = mapped_column(String(36), ForeignKey("dataset_versions.id", ondelete="CASCADE"), index=True, nullable=False)
    operation: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    params: Mapped[Dict[str, Any]] = mapped_column(JSONType, default=dict, nullable=False)
    filters: Mapped[Dict[str, Any]] = mapped_column(JSONType, default=dict, nullable=False)
    result: Mapped[Dict[str, Any]] = mapped_column(JSONType, default=dict, nullable=False)
    lineage: Mapped[List[Any]] = mapped_column(JSONType, default=list, nullable=False)
    registry_version: Mapped[str] = mapped_column(String(16), default="v1.0", nullable=False)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    version = relationship("DatasetVersion", back_populates="analysis_results")


class ChatSession(Base, TimestampMixin):
    __tablename__ = "chat_sessions"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), default="New Conversation", nullable=False)
    context_type: Mapped[str] = mapped_column(String(32), default="current_dataset", nullable=False)
    dataset_ref: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan", order_by="ChatMessage.created_at")
    chat_dataset = relationship("ChatDataset", back_populates="session", uselist=False, cascade="all, delete-orphan")


class ChatMessage(Base, TimestampMixin):
    __tablename__ = "chat_messages"

    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("chat_sessions.id", ondelete="CASCADE"), index=True, nullable=False)
    role: Mapped[str] = mapped_column(String(16), nullable=False)
    blocks: Mapped[List[Any]] = mapped_column(JSONType, default=list, nullable=False)
    operation: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONType, nullable=True)
    evidence_refs: Mapped[List[Any]] = mapped_column(JSONType, default=list, nullable=False)

    session = relationship("ChatSession", back_populates="messages")


class ChatDataset(Base, TimestampMixin):
    __tablename__ = "chat_datasets"

    chat_session_id: Mapped[str] = mapped_column(String(36), ForeignKey("chat_sessions.id", ondelete="CASCADE"), unique=True, nullable=False)
    parquet_path: Mapped[str] = mapped_column(String(512), nullable=False)
    mapping: Mapped[Dict[str, Any]] = mapped_column(JSONType, default=dict, nullable=False)

    session = relationship("ChatSession", back_populates="chat_dataset")


class Finding(Base, TimestampMixin):
    __tablename__ = "findings"

    version_id: Mapped[str] = mapped_column(String(36), ForeignKey("dataset_versions.id", ondelete="CASCADE"), index=True, nullable=False)
    kind: Mapped[str] = mapped_column(String(64), nullable=False)
    priority: Mapped[str] = mapped_column(String(16), default="medium", nullable=False)
    evidence: Mapped[Dict[str, Any]] = mapped_column(JSONType, default=dict, nullable=False)
    interpretation: Mapped[str] = mapped_column(Text, nullable=False)
    potential_action: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="open", index=True, nullable=False)
    status_history: Mapped[List[Any]] = mapped_column(JSONType, default=list, nullable=False)

    version = relationship("DatasetVersion", back_populates="findings")

    @property
    def title(self) -> str:
        if self.evidence and isinstance(self.evidence, dict) and "title" in self.evidence:
            return self.evidence["title"]
        return f"{self.kind.title()} Finding"


class Scenario(Base, TimestampMixin):
    __tablename__ = "scenarios"

    version_id: Mapped[str] = mapped_column(String(36), ForeignKey("dataset_versions.id", ondelete="CASCADE"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    drivers: Mapped[Dict[str, Any]] = mapped_column(JSONType, default=dict, nullable=False)
    assumptions: Mapped[Dict[str, Any]] = mapped_column(JSONType, default=dict, nullable=False)
    result: Mapped[Dict[str, Any]] = mapped_column(JSONType, default=dict, nullable=False)

    version = relationship("DatasetVersion", back_populates="scenarios")


class Report(Base, TimestampMixin):
    __tablename__ = "reports"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    dataset_id: Mapped[str] = mapped_column(String(36), nullable=False)
    version_id: Mapped[str] = mapped_column(String(36), nullable=False)
    mapping_id: Mapped[str] = mapped_column(String(36), nullable=False)
    type: Mapped[str] = mapped_column(String(32), nullable=False)
    period_start: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    period_end: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    filters: Mapped[Dict[str, Any]] = mapped_column(JSONType, default=dict, nullable=False)
    registry_version: Mapped[str] = mapped_column(String(16), default="v1.0", nullable=False)
    facts_snapshot: Mapped[Dict[str, Any]] = mapped_column(JSONType, default=dict, nullable=False)
    pdf_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    csv_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="ready", nullable=False)

    user = relationship("User", back_populates="reports")


class AICallLog(Base, TimestampMixin):
    __tablename__ = "ai_call_log"

    user_id: Mapped[Optional[str]] = mapped_column(String(36), index=True, nullable=True)
    operation: Mapped[str] = mapped_column(String(64), nullable=False)
    facts_hash: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(32), nullable=False)
    model: Mapped[str] = mapped_column(String(64), nullable=False)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    tokens_in: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    tokens_out: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    guardrail_result: Mapped[str] = mapped_column(String(32), default="passed", nullable=False)
    error_code: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)


class AuditLog(Base, TimestampMixin):
    __tablename__ = "audit_logs"

    user_id: Mapped[Optional[str]] = mapped_column(String(36), index=True, nullable=True)
    action: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    resource_type: Mapped[str] = mapped_column(String(64), nullable=False)
    resource_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    ip: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    request_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    metadata_: Mapped[Dict[str, Any]] = mapped_column("metadata", JSONType, default=dict, nullable=False)


class Job(Base, TimestampMixin):
    __tablename__ = "jobs"

    user_id: Mapped[str] = mapped_column(String(36), index=True, nullable=False)
    type: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="queued", index=True, nullable=False)
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    stage: Mapped[str] = mapped_column(String(64), default="initializing", nullable=False)
    error_code: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    result_ref: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)


class GeoResolution(Base, TimestampMixin):
    __tablename__ = "geo_resolutions"

    version_id: Mapped[str] = mapped_column(String(36), ForeignKey("dataset_versions.id", ondelete="CASCADE"), index=True, nullable=False)
    column: Mapped[str] = mapped_column(String(128), nullable=False)
    raw_value: Mapped[str] = mapped_column(String(255), nullable=False)
    resolved_place_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    level: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lon: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    parent: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    method: Mapped[str] = mapped_column(String(32), default="exact", nullable=False)
    user_confirmed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    row_count: Mapped[int] = mapped_column(BigInteger, default=1, nullable=False)

    version = relationship("DatasetVersion", back_populates="geo_resolutions")


class LiveDataCache(Base, TimestampMixin):
    __tablename__ = "live_data_cache"

    connector: Mapped[str] = mapped_column(String(64), nullable=False)
    cache_key: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    payload: Mapped[Dict[str, Any]] = mapped_column(JSONType, default=dict, nullable=False)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    ttl_seconds: Mapped[int] = mapped_column(Integer, default=3600, nullable=False)


class FeatureFlagModel(Base, TimestampMixin):
    __tablename__ = "feature_flags"

    key: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    scope: Mapped[str] = mapped_column(String(32), default="global", nullable=False)
