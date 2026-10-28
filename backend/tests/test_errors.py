from app.core.errors import BizLensError, ERR_NOT_FOUND


def test_404_error_envelope(client):
    response = client.get("/api/v1/non_existent_route")
    assert response.status_code == 404
    data = response.json()
    assert "error" in data
    assert "code" in data["error"]
    assert "message" in data["error"]
    assert "request_id" in data["error"]
    assert data["error"]["request_id"] is not None


def test_custom_bizlens_error():
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from app.core.errors import BizLensError, ERR_NOT_FOUND
    from app.main import handle_bizlens_error, RequestIdAndSecurityHeadersMiddleware

    test_app = FastAPI()
    test_app.add_middleware(RequestIdAndSecurityHeadersMiddleware)
    test_app.add_exception_handler(BizLensError, handle_bizlens_error)

    @test_app.get("/test-custom-error")
    def trigger_error():
        raise BizLensError(
            code=ERR_NOT_FOUND,
            message="Target resource could not be located.",
            status_code=404,
            details={"resource_id": "res_123"},
        )

    with TestClient(test_app) as client:
        response = client.get("/test-custom-error")
        assert response.status_code == 404
        data = response.json()
        assert data["error"]["code"] == ERR_NOT_FOUND
        assert data["error"]["message"] == "Target resource could not be located."
        assert data["error"]["details"]["resource_id"] == "res_123"
        assert data["error"]["request_id"] is not None
