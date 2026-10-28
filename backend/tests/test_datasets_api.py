"""Tests for BizLens Datasets API endpoints."""

import io
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.db.models import Dataset

def test_upload_dataset_endpoint(client):
    csv_content = (
        "Order ID,Order Date,City,Units,Sales\n"
        "ORD-001,2024-07-01,Bengaluru,2,4500.0\n"
        "ORD-002,2024-07-02,Mumbai,5,12000.0\n"
        "ORD-003,2024-07-03,Delhi,1,2800.0\n"
    )
    files = {"file": ("test_sales.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    response = client.post("/api/v1/datasets/upload", files=files, data={"name": "API Test Sales"})

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "API Test Sales"
    assert data["row_count"] == 3
    assert data["col_count"] == 5
    assert data["active_mapping"] is not None
    assert "order_id" in data["active_mapping"]
    assert data["quality_report"]["score"] > 80.0

    dataset_id = data["id"]

    # Test GET dataset detail
    detail_res = client.get(f"/api/v1/datasets/{dataset_id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["id"] == dataset_id

    # Test GET preview
    preview_res = client.get(f"/api/v1/datasets/{dataset_id}/preview?limit=10")
    assert preview_res.status_code == 200
    preview_data = preview_res.json()
    assert preview_data["total_rows"] == 3
    assert len(preview_data["rows"]) == 3
    assert preview_data["rows"][0]["city"] == "Bengaluru"

    # Test GET profile
    profile_res = client.get(f"/api/v1/datasets/{dataset_id}/profile")
    assert profile_res.status_code == 200
    prof_data = profile_res.json()
    assert "columns" in prof_data
    assert "sales" in prof_data["columns"]

    # Test POST mapping update
    mapping_payload = {
        "mapping": {
            "order_id": {
                "original_name": "Order ID",
                "role": "id",
                "data_type": "VARCHAR",
                "confidence": 1.0,
                "confirmed": True,
            },
            "order_date": {
                "original_name": "Order Date",
                "role": "date",
                "data_type": "DATE",
                "confidence": 1.0,
                "confirmed": True,
            },
            "city": {
                "original_name": "City",
                "role": "region",
                "data_type": "VARCHAR",
                "confidence": 1.0,
                "confirmed": True,
            },
            "units": {
                "original_name": "Units",
                "role": "quantity",
                "data_type": "BIGINT",
                "confidence": 1.0,
                "confirmed": True,
            },
            "sales": {
                "original_name": "Sales",
                "role": "revenue",
                "data_type": "DOUBLE",
                "confidence": 1.0,
                "confirmed": True,
            },
        }
    }
    update_res = client.post(f"/api/v1/datasets/{dataset_id}/mapping", json=mapping_payload)
    assert update_res.status_code == 200
    assert update_res.json()["mapping"]["sales"]["role"] == "revenue"

    # Test DELETE dataset
    del_res = client.delete(f"/api/v1/datasets/{dataset_id}")
    assert del_res.status_code == 200

    # Verify not listed in active datasets
    list_res = client.get("/api/v1/datasets")
    assert list_res.status_code == 200
    ids = [d["id"] for d in list_res.json()]
    assert dataset_id not in ids


def test_load_demo_dataset_endpoint(client):
    response = client.post("/api/v1/datasets/demo")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Sample Retail Q3"
    assert data["row_count"] == 10000
    assert round(data["quality_score"], 1) == 96.2
