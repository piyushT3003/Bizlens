"""BizLens Reports Pydantic Schemas."""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


class ReportGenerateRequest(BaseModel):
    dataset_id: Optional[str] = None
    type: str = Field(default="executive_summary", description="executive_summary | financial_performance | category_breakdown")
    period_type: str = Field(default="all", description="all | monthly | quarterly | custom")
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    period_label: Optional[str] = None
    sections: Optional[List[str]] = Field(default_factory=lambda: [
        "executive_summary", "kpis", "charts", "insights", "recommendations", "risks", "trends", "supporting_analysis"
    ])
    title: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None


class PeriodOption(BaseModel):
    key: str
    label: str
    start: str
    end: str


class SectionCapability(BaseModel):
    available: bool
    reason: Optional[str] = None


class DatasetPeriodsResponse(BaseModel):
    dataset_id: str
    dataset_name: str
    version_id: str
    version_number: int
    has_date_column: bool
    date_column: Optional[str] = None
    min_date: Optional[str] = None
    max_date: Optional[str] = None
    fiscal_year_start_month: int = 4
    fiscal_year_label: str = "April - March (India FY)"
    available_months: List[PeriodOption] = []
    available_quarters: List[PeriodOption] = []
    available_categories: List[str] = []
    available_regions: List[str] = []
    capabilities: Dict[str, SectionCapability] = {}


class ReportSummaryResponse(BaseModel):
    id: str
    dataset_id: str
    dataset_name: str
    version_id: str
    type: str
    period_type: str = "all"
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    period_label: Optional[str] = None
    title: str
    registry_version: str = "v1.0"
    status: str
    has_pdf: bool
    has_csv: bool
    created_at: str


class ReportDetailResponse(ReportSummaryResponse):
    facts_snapshot: Dict[str, Any]
    filters: Dict[str, Any]
    sections: List[str] = []
    pdf_download_url: str
    csv_download_url: str
