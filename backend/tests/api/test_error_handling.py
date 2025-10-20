from datetime import datetime

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_basic_health_check():
    """測試 8: 基本健康檢查"""
    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "timestamp" in data

    # 驗證時間戳格式
    timestamp = datetime.fromisoformat(data["timestamp"].replace("Z", "+00:00"))
    assert isinstance(timestamp, datetime)


def test_not_found_error():
    """測試 3: 404 錯誤處理"""
    response = client.get("/api/v1/nonexistent")

    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert "error" in data
    assert "timestamp" in data
    assert "path" in data
    assert data["path"] == "/api/v1/nonexistent"


def test_cors_allowed_origin():
    """測試 6: CORS 允許的來源"""
    response = client.options(
        "/api/v1/health",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET"
        }
    )

    assert response.status_code == 200
    assert "access-control-allow-origin" in response.headers
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_detailed_health_check():
    """測試 9: 詳細健康檢查"""
    response = client.get("/api/v1/health")

    # 根據服務狀態,可能是 200 或 503
    assert response.status_code in [200, 503]
    data = response.json()

    assert "status" in data
    assert "services" in data
    assert "database" in data["services"]
    assert "redis" in data["services"]
    assert "timestamp" in data

    # 檢查服務狀態結構
    for service_name, service_status in data["services"].items():
        assert "status" in service_status
        assert service_status["status"] in ["connected", "disconnected"]
