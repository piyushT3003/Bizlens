"""Tests for BizLens Management Reports API, ReportLab PDF, Server-rendered Charts, and Sanitized CSV exports."""

import io
import csv
import pytest
from fastapi.testclient import TestClient

from app.services.report_generator import (
    sanitize_csv_cell,
    compute_fiscal_quarters,
    compute_calendar_months,
)


@pytest.fixture
def demo_dataset(client: TestClient):
    """Seed demo dataset via API endpoint."""
    res = client.post("/api/v1/datasets/demo")
    assert res.status_code == 200
    return res.json()


def test_sanitize_csv_cell_formula_injection():
    """Verify formula injection defense: any cell starting with =, +, -, @, \\t, \\r is escaped with single quote."""
    assert sanitize_csv_cell("=1+1") == "'=1+1"
    assert sanitize_csv_cell("=SUM(A1:A10)") == "'=SUM(A1:A10)"
    assert sanitize_csv_cell("+49123456") == "'+49123456"
    assert sanitize_csv_cell("-100.50") == "'-100.50"
    assert sanitize_csv_cell("@cmd|' /C calc'!A0") == "'@cmd|' /C calc'!A0"
    assert sanitize_csv_cell("\ttab_prefixed") == "'\ttab_prefixed"
    assert sanitize_csv_cell("\rcarriage_return") == "'\rcarriage_return"

    # Benign values should NOT be prepended with quote
    assert sanitize_csv_cell("Electronics") == "Electronics"
    assert sanitize_csv_cell("Total Revenue") == "Total Revenue"
    assert sanitize_csv_cell("₹9.89 Cr") == "₹9.89 Cr"
    assert sanitize_csv_cell(None) == ""


def test_formula_injection_comprehensive():
    """Comprehensive test against advanced formula injection triggers across all export fields."""
    triggers = [
        "=1+1",
        "=SUM(A1:B10)",
        "+cmd|' /C calc'!A0",
        "-2+3*cmd",
        "@SUM(A1:A5)",
        "\tmalicious_tab",
        "\rmalicious_cr",
        "=HYPERLINK('http://evil.com','Click')",
        "+919876543210",
        "-42",
    ]
    for trig in triggers:
        escaped = sanitize_csv_cell(trig)
        assert escaped.startswith("'"), f"Failed to escape dangerous cell payload: {trig}"
        # Second character onwards should preserve original string
        assert escaped[1:] == trig


def test_fiscal_quarters_calculator():
    """Verify fiscal quarter calculation for India FY (April start) and Calendar FY (January start)."""
    # 1. India April-March FY
    q_india = compute_fiscal_quarters("2024-07-01", "2024-09-30", fy_start_month=4)
    assert len(q_india) == 1
    assert q_india[0]["key"] == "2024_Q2"
    assert "FY2024-25 Q2" in q_india[0]["label"]
    assert q_india[0]["start"] == "2024-07-01"
    assert q_india[0]["end"] == "2024-09-30"

    # Spanning across year boundary (Nov 2024 to Feb 2025 in India FY)
    q_span = compute_fiscal_quarters("2024-11-01", "2025-02-15", fy_start_month=4)
    assert len(q_span) == 2
    assert q_span[0]["key"] == "2024_Q3"
    assert "FY2024-25 Q3" in q_span[0]["label"]
    assert q_span[1]["key"] == "2024_Q4"
    assert "FY2024-25 Q4" in q_span[1]["label"]

    # 2. Calendar Year (January start)
    q_cal = compute_fiscal_quarters("2024-07-01", "2024-09-30", fy_start_month=1)
    assert len(q_cal) == 1
    assert q_cal[0]["key"] == "2024_Q3"
    assert "FY2024 Q3" in q_cal[0]["label"]


def test_compute_calendar_months():
    """Verify calendar month generation between two dates."""
    months = compute_calendar_months("2024-07-01", "2024-09-30")
    assert len(months) == 3
    assert months[0]["key"] == "2024-07"
    assert months[0]["label"] == "July 2024"
    assert months[1]["key"] == "2024-08"
    assert months[2]["key"] == "2024-09"


def test_dataset_periods_api(client: TestClient, demo_dataset):
    """Verify GET /reports/dataset-periods/{id} returns date range and fiscal quarter options."""
    res = client.get(f"/api/v1/reports/dataset-periods/{demo_dataset['id']}")
    assert res.status_code == 200
    data = res.json()

    assert data["has_date_column"] is True
    assert data["min_date"] == "2024-07-01"
    assert data["max_date"] == "2024-09-30"
    assert data["fiscal_year_start_month"] == 4
    assert len(data["available_quarters"]) > 0
    assert any("Q2" in q["label"] for q in data["available_quarters"])
    assert len(data["available_months"]) == 3
    assert len(data["available_categories"]) > 0
    assert "capabilities" in data
    assert data["capabilities"]["kpis"]["available"] is True
    assert data["capabilities"]["trends"]["available"] is True


def test_generate_report_and_verify_facts(client: TestClient, demo_dataset):
    """Test generating a management report snapshot with verified facts and guardrail status."""
    payload = {
        "dataset_id": demo_dataset["id"],
        "type": "executive_summary",
        "period_type": "quarterly",
        "period_start": "2024-07-01",
        "period_end": "2024-09-30",
        "period_label": "FY2024-25 Q2",
        "title": "Q3 Executive Management Review",
        "filters": {"categories": ["Electronics", "Fashion"]},
    }
    res = client.post("/api/v1/reports/generate", json=payload)
    assert res.status_code == 201
    report = res.json()

    assert report["id"] is not None
    assert report["type"] == "executive_summary"
    assert report["title"] == "Q3 Executive Management Review"
    assert report["has_pdf"] is True
    assert report["has_csv"] is True
    assert report["status"] == "ready"

    # Facts Snapshot
    facts = report["facts_snapshot"]
    assert "metrics" in facts
    assert "total_revenue" in facts["metrics"]
    assert facts["metrics"]["total_revenue"]["is_available"] is True
    assert facts["metrics"]["total_revenue"]["value"] is not None

    # Lineage Verification
    assert "lineage" in facts
    assert facts["lineage"]["rows_scanned"] > 0
    assert facts["lineage"]["content_hash"] is not None

    # Guardrail Verification: 0 Violations allowed per RULES.md
    assert "guardrail_status" in facts
    assert facts["guardrail_status"]["passed"] is True
    assert facts["guardrail_status"]["violations_count"] == 0

    # Tagged Narrative Blocks
    assert "narrative_blocks" in facts
    tags = [b["tag"] for b in facts["narrative_blocks"]]
    assert "CALCULATED FACT" in tags
    assert "INTERPRETATION" in tags
    assert "RECOMMENDATION" in tags


def test_snapshot_reproducibility(client: TestClient, demo_dataset):
    """Verify snapshot reproducibility: regenerate produces 100% identical numbers and facts (0 deviation)."""
    # 1. Generate original report
    payload = {
        "dataset_id": demo_dataset["id"],
        "type": "executive_summary",
        "period_type": "all",
        "title": "Reproducibility Audit Snapshot",
    }
    gen_res = client.post("/api/v1/reports/generate", json=payload)
    assert gen_res.status_code == 201
    orig = gen_res.json()
    orig_id = orig["id"]
    orig_facts = orig["facts_snapshot"]

    # 2. Call regenerate
    regen_res = client.post(f"/api/v1/reports/{orig_id}/regenerate")
    assert regen_res.status_code == 200
    regen = regen_res.json()
    regen_facts = regen["facts_snapshot"]

    # 3. Assert zero numeric deviation across all metrics
    for m_id, m_data in orig_facts["metrics"].items():
        assert m_id in regen_facts["metrics"]
        assert regen_facts["metrics"][m_id]["value"] == m_data["value"], f"Metric {m_id} drifted on regeneration!"
        assert regen_facts["metrics"][m_id]["formatted_value"] == m_data["formatted_value"]

    # 4. Assert breakdown rankings and shares identical
    assert len(orig_facts["breakdown"]) == len(regen_facts["breakdown"])
    for idx in range(len(orig_facts["breakdown"])):
        assert orig_facts["breakdown"][idx]["dimension_value"] == regen_facts["breakdown"][idx]["dimension_value"]
        assert orig_facts["breakdown"][idx]["share_pct"] == regen_facts["breakdown"][idx]["share_pct"]
        assert orig_facts["breakdown"][idx]["rank"] == regen_facts["breakdown"][idx]["rank"]

    # 5. Assert identical audit hash
    assert orig_facts["content_hash"] == regen_facts["content_hash"]
    assert regen["has_pdf"] is True
    assert regen["has_csv"] is True


def test_refresh_from_latest_data(client: TestClient, demo_dataset):
    """Verify refresh from latest creates a new report version using the latest active version."""
    # 1. Generate base report
    gen_res = client.post(
        "/api/v1/reports/generate",
        json={"dataset_id": demo_dataset["id"], "type": "category_breakdown", "title": "Base Refresh Test"},
    )
    assert gen_res.status_code == 201
    base_id = gen_res.json()["id"]

    # 2. Refresh from latest data
    ref_res = client.post(f"/api/v1/reports/{base_id}/refresh-latest")
    assert ref_res.status_code == 201
    new_report = ref_res.json()

    assert new_report["id"] != base_id
    assert new_report["title"] == "Base Refresh Test"
    assert new_report["has_pdf"] is True
    assert new_report["has_csv"] is True


def test_download_report_pdf(client: TestClient, demo_dataset):
    """Test downloading the generated PDF report and verify PDF signature and server-rendered charts."""
    # 1. Generate report
    gen_res = client.post(
        "/api/v1/reports/generate",
        json={"type": "executive_summary", "title": "Audit PDF Test", "sections": ["kpis", "charts"]},
    )
    assert gen_res.status_code == 201
    report_id = gen_res.json()["id"]

    # 2. Download PDF
    pdf_res = client.get(f"/api/v1/reports/{report_id}/download/pdf")
    assert pdf_res.status_code == 200
    assert "application/pdf" in pdf_res.headers["content-type"]
    assert len(pdf_res.content) > 5000
    # PDF Magic Bytes Header
    assert pdf_res.content.startswith(b"%PDF-")


def test_download_report_csv_and_verify_sanitization(client: TestClient, demo_dataset):
    """Test downloading the generated CSV report and verify table structure and sanitization."""
    # 1. Generate report
    gen_res = client.post(
        "/api/v1/reports/generate",
        json={"type": "category_breakdown", "title": "Category CSV Test"},
    )
    assert gen_res.status_code == 201
    report_id = gen_res.json()["id"]

    # 2. Download CSV
    csv_res = client.get(f"/api/v1/reports/{report_id}/download/csv")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]

    csv_text = csv_res.content.decode("utf-8")
    reader = csv.DictReader(io.StringIO(csv_text))
    rows = list(reader)
    assert len(rows) > 0

    # Verify column headers
    assert "record_type" in rows[0]
    assert "metric_id" in rows[0]
    assert "raw_value" in rows[0]
    assert "formatted_value" in rows[0]
    assert "content_hash" in rows[0]

    # Verify no raw unescaped formula injection characters in any cell
    for row in rows:
        for k, v in row.items():
            if v and v.startswith(("=", "+", "@")):
                # Must be escaped with leading quote
                assert v.startswith("'")


def test_report_lifecycle_list_detail_delete(client: TestClient, demo_dataset):
    """Test report listing, detail retrieval, and deletion."""
    # 1. Generate
    gen_res = client.post(
        "/api/v1/reports/generate",
        json={"type": "financial_performance", "title": "Lifecycle Test Report"},
    )
    assert gen_res.status_code == 201
    report_id = gen_res.json()["id"]

    # 2. List
    list_res = client.get("/api/v1/reports")
    assert list_res.status_code == 200
    reports = list_res.json()
    assert any(r["id"] == report_id for r in reports)

    # 3. Get Detail
    detail_res = client.get(f"/api/v1/reports/{report_id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["id"] == report_id
    assert detail_res.json()["title"] == "Lifecycle Test Report"

    # 4. Delete
    del_res = client.delete(f"/api/v1/reports/{report_id}")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "deleted"

    # 5. Verify 404 after deletion
    after_res = client.get(f"/api/v1/reports/{report_id}")
    assert after_res.status_code == 404
