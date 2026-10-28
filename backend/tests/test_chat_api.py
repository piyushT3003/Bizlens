"""Tests for BizLens Chat API, Ask BizLens Orchestrator, Circuit Breaker, Consent Gate, and SSE Streaming."""

import time
import pytest
from fastapi.testclient import TestClient
from app.services.ai_orchestrator import detect_pii, ai_orchestrator, parse_nl_filter_spec
from app.services.gemini_client import gemini_client, CircuitState


@pytest.fixture
def demo_dataset(client: TestClient):
    """Seed demo dataset via API endpoint."""
    res = client.post("/api/v1/datasets/demo")
    assert res.status_code == 200
    return res.json()


def test_pii_detection():
    # Sensitive email and phone
    text_with_email = "Please send report to john.doe@example.com immediately."
    is_pii, warning = detect_pii(text_with_email)
    assert is_pii is True
    assert "Email Address" in warning

    text_with_phone = "Contact customer at 9876543210 for billing issues."
    is_pii, warning = detect_pii(text_with_phone)
    assert is_pii is True
    assert "Phone Number" in warning

    # Clean text
    clean_text = "What was the total revenue in Q3 across all product categories?"
    is_pii, warning = detect_pii(clean_text)
    assert is_pii is False
    assert warning is None


def test_nl_filter_spec_parsing():
    role_to_col = {"revenue": "sales_amount", "quantity": "units_sold"}

    spec_lakh = parse_nl_filter_spec("Show transactions with sales above 2.5 lakh", role_to_col)
    assert spec_lakh is not None
    assert spec_lakh["value"] == 250000.0
    assert spec_lakh["operator"] == ">="

    spec_crore = parse_nl_filter_spec("Orders exceeding 1.2 crore", role_to_col)
    assert spec_crore is not None
    assert spec_crore["value"] == 12000000.0

    spec_k = parse_nl_filter_spec("Sales under 50k", role_to_col)
    assert spec_k is not None
    assert spec_k["value"] == 50000.0
    assert spec_k["operator"] == "<"


def test_api_chat_session_lifecycle(client: TestClient):
    # 1. Create session
    create_res = client.post("/api/v1/chat/sessions", json={"title": "Q3 Revenue Analysis"})
    assert create_res.status_code == 201
    session = create_res.json()
    assert session["title"] == "Q3 Revenue Analysis"
    session_id = session["id"]

    # 2. List sessions
    list_res = client.get("/api/v1/chat/sessions")
    assert list_res.status_code == 200
    sessions = list_res.json()
    assert any(s["id"] == session_id for s in sessions)

    # 3. Rename session
    patch_res = client.patch(f"/api/v1/chat/sessions/{session_id}", json={"title": "Renamed Q3 Analysis"})
    assert patch_res.status_code == 200
    assert patch_res.json()["title"] == "Renamed Q3 Analysis"

    # 4. Get session detail
    detail_res = client.get(f"/api/v1/chat/sessions/{session_id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["title"] == "Renamed Q3 Analysis"

    # 5. Delete session
    del_res = client.delete(f"/api/v1/chat/sessions/{session_id}")
    assert del_res.status_code == 200

    # 6. Verify deleted
    get_res = client.get(f"/api/v1/chat/sessions/{session_id}")
    assert get_res.status_code == 404


def test_api_consent_flow(client: TestClient):
    # Check initial consent status
    res = client.get("/api/v1/chat/consent")
    assert res.status_code == 200

    # Grant consent
    post_res = client.post("/api/v1/chat/consent")
    assert post_res.status_code == 200
    data = post_res.json()
    assert data["consented"] is True
    assert data["consent_at"] is not None

    # Check updated consent status
    check_res = client.get("/api/v1/chat/consent")
    assert check_res.status_code == 200
    assert check_res.json()["consented"] is True


def test_api_ask_bizlens_current_dataset(client: TestClient, demo_dataset):
    payload = {
        "query": "What were our top-performing product categories by revenue?",
        "context_mode": "current_dataset",
    }
    response = client.post("/api/v1/chat/ask", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["role"] == "assistant"
    assert len(data["blocks"]) >= 3

    tags = [b["tag"] for b in data["blocks"]]
    assert "CALCULATED FACT" in tags
    assert "INTERPRETATION" in tags
    assert "RECOMMENDATION" in tags

    # Verify Show Your Work metadata
    syw = data["show_your_work"]
    assert syw is not None
    assert len(syw["fact_set"]) > 0
    assert syw["engine_query_ms"] >= 0.0
    assert syw["guardrail_result"]["passed"] is True
    assert syw["context_mode"] == "current_dataset"


def test_api_ask_bizlens_streaming(client: TestClient, demo_dataset):
    # Create a session
    sess_res = client.post("/api/v1/chat/sessions", json={"title": "Streaming Test"})
    assert sess_res.status_code == 201
    sess_id = sess_res.json()["id"]

    payload = {
        "query": "Summarize total revenue and profit",
        "context_mode": "current_dataset",
    }
    # Stream endpoint
    with client.stream("POST", f"/api/v1/chat/sessions/{sess_id}/stream", json=payload) as stream_res:
        assert stream_res.status_code == 200
        assert "text/event-stream" in stream_res.headers.get("content-type", "")

        lines = [line for line in stream_res.iter_lines() if line]
        joined = "\n".join(lines)

        assert "event: status" in joined
        assert "analyzing" in joined
        assert "computing" in joined
        assert "event: blocks" in joined
        assert "event: done" in joined


def test_api_ask_bizlens_general_mode(client: TestClient):
    payload = {
        "query": "How do you define gross margin vs operating margin?",
        "context_mode": "general",
    }
    response = client.post("/api/v1/chat/ask", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["role"] == "assistant"
    assert len(data["blocks"]) >= 1
    assert data["show_your_work"]["context_mode"] == "general"


def test_circuit_breaker_resilience():
    cb = gemini_client.circuit_breaker
    cb.reset()
    assert cb.state == CircuitState.CLOSED
    assert cb.can_attempt() is True

    # 3 failures trip to OPEN
    cb.record_failure()
    cb.record_failure()
    cb.record_failure()
    assert cb.state == CircuitState.OPEN
    assert cb.can_attempt() is False

    # Simulate timeout recovery
    cb.last_failure_time = time.time() - 65.0
    assert cb.can_attempt() is True
    assert cb.state == CircuitState.HALF_OPEN

    # Success resets to CLOSED
    cb.record_success()
    assert cb.state == CircuitState.CLOSED
    assert cb.failure_count == 0


def test_api_get_suggested_prompts(client: TestClient, demo_dataset):
    response = client.get("/api/v1/chat/suggested-prompts")
    assert response.status_code == 200
    prompts = response.json()
    assert isinstance(prompts, list)
    assert len(prompts) >= 2
    prompt_texts = [p["prompt"] for p in prompts]
    assert any("revenue" in p.lower() for p in prompt_texts)


def test_general_questions_routing(client: TestClient):
    """Verify general business / formula / definition questions route cleanly to AI without failing on dataset."""
    response = client.post(
        "/api/v1/chat/ask",
        json={"query": "What is EBITDA and how is it calculated?", "context_mode": "auto"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "show_your_work" in data
    assert data["show_your_work"]["context_mode"] == "general"
    content = data["blocks"][0]["content"]
    assert "EBITDA" in content or "Earnings Before" in content
