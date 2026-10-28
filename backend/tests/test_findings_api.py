"""Unit and Integration Tests for BizLens Findings Engine and API Router.

RULES.md Mandate:
- Analytics calculates. GenAI explains. Gemini is not the calculator. Gemini is not allowed to invent dataset numbers.
- Zero fake numbers. All numbers derived from DuckDB Parquet scans.
"""

import io
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.db.models import Dataset, DatasetVersion, Finding
from app.services.findings_engine import findings_engine


@pytest.fixture
def demo_dataset(client: TestClient):
    """Seed demo dataset via API endpoint."""
    res = client.post("/api/v1/datasets/demo")
    assert res.status_code == 200
    return res.json()


def test_evaluate_findings_engine_discovery(client: TestClient, db_session: Session, demo_dataset: dict):
    """Verifies that FindingsEngine discovers real opportunities, risks, and anomalies from DuckDB."""
    dataset_id = demo_dataset["id"]
    findings = findings_engine.evaluate_findings(
        db=db_session,
        dataset_id=dataset_id,
        force_refresh=True,
    )

    assert len(findings) > 0, "Expected at least one business finding to be discovered"

    # Check evidence structure across all findings
    for f in findings:
        assert f.kind in {"opportunity", "risk", "efficiency", "anomaly"}
        assert f.priority in {"high", "medium", "low"}
        assert f.status == "open"
        assert len(f.status_history) >= 1

        ev = f.evidence
        assert "metric" in ev
        assert "impact_amount" in ev
        assert "impact_formatted" in ev
        assert "confidence_score" in ev
        assert 0.0 <= ev["confidence_score"] <= 1.0
        assert "duckdb_sql" in ev
        assert "SELECT" in ev["duckdb_sql"].upper()


def test_get_dataset_findings_api(client: TestClient, demo_dataset: dict):
    """Tests GET /api/v1/findings/dataset/{dataset_id}."""
    dataset_id = demo_dataset["id"]
    resp = client.get(f"/api/v1/findings/dataset/{dataset_id}")
    assert resp.status_code == 200
    data = resp.json()

    assert data["dataset_id"] == dataset_id
    assert data["total_findings"] > 0
    assert "total_impact_at_risk_formatted" in data
    assert "total_upside_potential_formatted" in data
    assert isinstance(data["findings"], list)
    assert len(data["findings"]) == data["total_findings"]


def test_refresh_dataset_findings_api(client: TestClient, demo_dataset: dict):
    """Tests POST /api/v1/findings/dataset/{dataset_id}/refresh."""
    dataset_id = demo_dataset["id"]
    resp = client.post(f"/api/v1/findings/dataset/{dataset_id}/refresh")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_findings"] > 0


def test_finding_detail_api(client: TestClient, db_session: Session, demo_dataset: dict):
    """Tests GET /api/v1/findings/{finding_id}."""
    dataset_id = demo_dataset["id"]
    findings = findings_engine.evaluate_findings(db_session, dataset_id)
    target = findings[0]

    resp = client.get(f"/api/v1/findings/{target.id}")
    assert resp.status_code == 200
    data = resp.json()

    assert data["id"] == target.id
    assert data["kind"] == target.kind
    assert data["priority"] == target.priority
    assert data["status"] == target.status
    assert "duckdb_sql" in data["evidence"]


def test_update_finding_status_lifecycle(client: TestClient, db_session: Session, demo_dataset: dict):
    """Tests PATCH /api/v1/findings/{finding_id}/status lifecycle transitions."""
    dataset_id = demo_dataset["id"]
    findings = findings_engine.evaluate_findings(db_session, dataset_id)
    target = findings[0]

    # 1. Transition open -> applied
    resp1 = client.patch(
        f"/api/v1/findings/{target.id}/status",
        json={"status": "applied", "note": "Assigned to supply chain team"},
    )
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert data1["status"] == "applied"
    assert len(data1["status_history"]) >= 2
    assert data1["status_history"][-1]["status"] == "applied"

    # 2. Transition applied -> completed
    resp2 = client.patch(
        f"/api/v1/findings/{target.id}/status",
        json={"status": "completed", "note": "Inventory buffer successfully deployed"},
    )
    assert resp2.status_code == 200
    assert resp2.json()["status"] == "completed"

    # 3. Transition to invalid status fails
    resp_invalid = client.patch(
        f"/api/v1/findings/{target.id}/status",
        json={"status": "invalid_status"},
    )
    assert resp_invalid.status_code in {400, 422}


def test_pin_finding_to_decision_support(client: TestClient, db_session: Session, demo_dataset: dict):
    """Tests POST /api/v1/findings/{finding_id}/pin-decision."""
    dataset_id = demo_dataset["id"]
    findings = findings_engine.evaluate_findings(db_session, dataset_id)
    target = findings[0]

    resp = client.post(f"/api/v1/findings/{target.id}/pin-decision")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "applied"
    assert any("Decision Support" in h.get("note", "") for h in data["status_history"])


def test_explain_finding_api_with_guardrail(client: TestClient, db_session: Session, demo_dataset: dict):
    """Tests POST /api/v1/findings/{finding_id}/explain with numerical guardrail verification."""
    dataset_id = demo_dataset["id"]
    findings = findings_engine.evaluate_findings(db_session, dataset_id)
    target = findings[0]

    resp = client.post(f"/api/v1/findings/{target.id}/explain")
    assert resp.status_code == 200
    data = resp.json()

    assert data["finding_id"] == target.id
    assert "strategic_context" in data
    assert "risk_assessment" in data
    assert "action_steps" in data
    assert len(data["action_steps"]) >= 2
    assert data["guardrail_result"] in {"passed", "offline_template", "corrected_with_fallback"}


def test_uploaded_user_dataset_findings(client: TestClient, db_session: Session):
    """Verifies that findings engine automatically computes opportunities, risks, and anomalies on newly uploaded user datasets."""
    csv_rows = [
        "order_id,date,region,category,sales,profit,quantity",
        "ORD-001,2024-01-15,North,Electronics,45000.0,9000.0,3",
        "ORD-002,2024-01-16,North,Electronics,52000.0,11000.0,4",
        "ORD-003,2024-01-20,South,Furniture,25000.0,-2500.0,2",
        "ORD-004,2024-02-05,West,Beauty,65000.0,35000.0,12",
        "ORD-005,2024-02-12,East,Beauty,58000.0,31000.0,10",
        "ORD-006,2024-03-01,North,Electronics,98000.0,22000.0,8",
        "ORD-007,2024-03-05,West,Beauty,72000.0,39000.0,14",
        "ORD-008,2024-03-10,South,Furniture,18000.0,-1800.0,1",
        "ORD-009,2024-03-15,North,Apparel,32000.0,4500.0,5",
        "ORD-010,2024-03-20,West,Beauty,85000.0,46000.0,16",
    ]
    csv_content = "\n".join(csv_rows)
    files = {"file": ("user_custom_upload.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    upload_res = client.post("/api/v1/datasets/upload", files=files, data={"name": "User Custom Upload"})
    assert upload_res.status_code == 201
    upload_data = upload_res.json()
    dataset_id = upload_data["id"]

    try:
        # Fetch findings for the uploaded dataset
        resp = client.get(f"/api/v1/findings/dataset/{dataset_id}?currency=INR&number_grouping=lakh_crore")
        assert resp.status_code == 200
        findings_data = resp.json()

        assert findings_data["dataset_id"] == dataset_id
        assert findings_data["total_findings"] > 0
        assert "₹" in findings_data["total_impact_at_risk_formatted"] or "0" in findings_data["total_impact_at_risk_formatted"]
        assert "₹" in findings_data["total_upside_potential_formatted"] or "0" in findings_data["total_upside_potential_formatted"]

        # Check that individual findings have complete evidence and lineage
        for f in findings_data["findings"]:
            assert f["kind"] in {"opportunity", "risk", "efficiency", "anomaly"}
            assert "impact_formatted" in f["evidence"]
            assert f["evidence"]["confidence_score"] > 0.5
    finally:
        client.delete(f"/api/v1/datasets/{dataset_id}")

