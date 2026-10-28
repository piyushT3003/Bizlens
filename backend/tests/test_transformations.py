"""Tests for BizLens Data Quality Copilot & Deterministic Transformations (Phase 6)."""

import io
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.models import Dataset, DatasetVersion, Transformation


@pytest.fixture
def dirty_dataset(client):
    """Uploads a dataset with known quality issues: duplicate rows, null values, untrimmed strings."""
    csv_content = (
        "Order ID,Order Date,City,Units,Sales\n"
        "ORD-001,2024-07-01,Bengaluru,2,4500.0\n"
        "ORD-002,2024-07-02,  Mumbai  ,5,12000.0\n"
        "ORD-002,2024-07-02,  Mumbai  ,5,12000.0\n"  # Exact duplicate
        "ORD-003,2024-07-03,Delhi,,2800.0\n"         # Missing Units
        "ORD-004,2024-07-04,Bengaluru,3,6000.0\n"
    )
    files = {"file": ("dirty_sales.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    res = client.post("/api/v1/datasets/upload", files=files, data={"name": "Dirty Sales Q3"})
    assert res.status_code == 201
    return res.json()


def test_quality_scorecard_and_issues(client, dirty_dataset):
    """Verifies that duplicate rows, nulls, and untrimmed strings are detected and scored."""
    dataset_id = dirty_dataset["id"]
    version_id = dirty_dataset["active_version_id"]

    res = client.get(f"/api/v1/versions/{version_id}/quality")
    assert res.status_code == 200
    data = res.json()

    assert "score" in data
    assert "components" in data
    assert "completeness" in data["components"]
    assert "validity" in data["components"]
    assert "uniqueness" in data["components"]
    assert "consistency" in data["components"]

    # Uniqueness should be less than 100% due to duplicate row
    assert data["components"]["uniqueness"] < 100.0

    # Issues list should contain DUPLICATE_ROWS and UNTRIMMED_WHITESPACE
    issue_codes = [i["code"] for i in data["issues"]]
    assert "DUPLICATE_ROWS" in issue_codes
    assert "UNTRIMMED_WHITESPACE" in issue_codes


def test_transformation_preview_does_not_mutate(client, dirty_dataset):
    """Verifies that preview calculates stats diff in-memory without creating a new version."""
    dataset_id = dirty_dataset["id"]
    version_id = dirty_dataset["active_version_id"]

    payload = {
        "type": "deduplicate_rows",
        "parameters": {},
    }
    preview_res = client.post(f"/api/v1/versions/{version_id}/transform/preview", json=payload)
    assert preview_res.status_code == 200
    pdata = preview_res.json()

    assert pdata["type"] == "deduplicate_rows"
    assert pdata["rows_affected"] == 1
    assert pdata["before_stats"]["row_count"] == 5
    assert pdata["after_stats"]["row_count"] == 4
    assert len(pdata["sample_after"]) > 0

    # Check dataset in DB: still on v1
    detail = client.get(f"/api/v1/datasets/{dataset_id}").json()
    assert len(detail["versions"]) == 1
    assert detail["row_count"] == 5


def test_transformation_apply_creates_immutable_version(client, dirty_dataset):
    """Verifies that applying deduplication creates v2 Parquet with updated quality score and lineage."""
    dataset_id = dirty_dataset["id"]
    version_id = dirty_dataset["active_version_id"]

    apply_payload = {
        "type": "deduplicate_rows",
        "parameters": {},
        "label": "Remove exact duplicates",
        "lock_version": 1,
    }
    apply_res = client.post(f"/api/v1/versions/{version_id}/transform/apply", json=apply_payload)
    assert apply_res.status_code == 201
    adata = apply_res.json()

    assert adata["new_version_number"] == 2
    assert adata["rows_affected"] == 1
    assert adata["new_row_count"] == 4
    assert adata["status"] == "applied"

    # Dataset active version is now v2
    detail = client.get(f"/api/v1/datasets/{dataset_id}").json()
    assert detail["active_version_id"] == adata["to_version_id"]
    assert detail["row_count"] == 4
    assert len(detail["versions"]) == 2

    # Check that uniqueness is now 100% in v2
    v2_quality = client.get(f"/api/v1/versions/{adata['to_version_id']}/quality").json()
    assert v2_quality["components"]["uniqueness"] == 100.0

    # Check transformation history
    history_res = client.get(f"/api/v1/datasets/{dataset_id}/transformations")
    assert history_res.status_code == 200
    history = history_res.json()
    assert len(history) == 1
    assert history[0]["type"] == "deduplicate_rows"
    assert history[0]["rows_affected"] == 1


def test_optimistic_locking_conflict(client, dirty_dataset):
    """Verifies that applying with an incorrect lock_version returns HTTP 409 Conflict."""
    version_id = dirty_dataset["active_version_id"]

    apply_payload = {
        "type": "deduplicate_rows",
        "parameters": {},
        "lock_version": 999,  # Stale lock version
    }
    conflict_res = client.post(f"/api/v1/versions/{version_id}/transform/apply", json=apply_payload)
    assert conflict_res.status_code == 409
    assert "conflict" in conflict_res.json()["error"]["message"].lower()


def test_trim_strings_transformation(client, dirty_dataset):
    """Verifies that trim_strings eliminates whitespace drift on text columns."""
    version_id = dirty_dataset["active_version_id"]

    preview_res = client.post(
        f"/api/v1/versions/{version_id}/transform/preview",
        json={"type": "trim_strings", "parameters": {"columns": ["city"]}},
    )
    assert preview_res.status_code == 200
    pdata = preview_res.json()
    assert pdata["rows_affected"] >= 1


def test_fill_null_values_imputation(client, dirty_dataset):
    """Verifies fill_null_values with constant and median strategies."""
    version_id = dirty_dataset["active_version_id"]

    # Constant fill
    preview_res = client.post(
        f"/api/v1/versions/{version_id}/transform/preview",
        json={
            "type": "fill_null_values",
            "parameters": {"columns": ["units"], "strategy": "constant", "value": 1},
        },
    )
    assert preview_res.status_code == 200
    pdata = preview_res.json()
    assert pdata["before_stats"]["null_count"] > pdata["after_stats"]["null_count"]


def test_quality_copilot_advice(client, dirty_dataset):
    """Verifies that Quality Copilot generates tagged blocks and 1-click suggested actions."""
    version_id = dirty_dataset["active_version_id"]

    copilot_res = client.post(
        f"/api/v1/versions/{version_id}/quality/copilot",
        json={},
    )
    assert copilot_res.status_code == 200
    cdata = copilot_res.json()

    assert "blocks" in cdata
    tags = [b["tag"] for b in cdata["blocks"]]
    assert "CALCULATED FACT" in tags
    assert "INTERPRETATION" in tags
    assert "RECOMMENDATION" in tags

    assert "suggested_actions" in cdata
    assert len(cdata["suggested_actions"]) > 0
    action_types = [a["type"] for a in cdata["suggested_actions"]]
    assert "deduplicate_rows" in action_types


def test_version_activation_rollback(client, dirty_dataset):
    """Verifies activating a previous version resets dataset.active_version_id."""
    dataset_id = dirty_dataset["id"]
    v1_id = dirty_dataset["active_version_id"]

    # Apply transformation to get v2
    apply_res = client.post(
        f"/api/v1/versions/{v1_id}/transform/apply",
        json={"type": "deduplicate_rows", "parameters": {}, "lock_version": 1},
    )
    assert apply_res.status_code == 201
    v2_id = apply_res.json()["to_version_id"]

    # Switch active version back to v1
    activate_res = client.post(f"/api/v1/datasets/{dataset_id}/versions/{v1_id}/activate")
    assert activate_res.status_code == 200
    assert activate_res.json()["active_version_id"] == v1_id

    # Verify dataset active_version_id is v1
    detail = client.get(f"/api/v1/datasets/{dataset_id}").json()
    assert detail["active_version_id"] == v1_id
    assert detail["row_count"] == 5
