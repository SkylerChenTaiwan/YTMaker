"""
CORS 設定測試

測試目的：驗證 CORS 設定正確允許前端不同端口的請求
相關 Issue: issue-015
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class TestCORSConfiguration:
    """CORS 配置測試"""

    @pytest.mark.parametrize(
        "origin",
        [
            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:3002",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001",
            "http://127.0.0.1:3002",
        ],
    )
    def test_cors_allows_multiple_ports(self, origin):
        """
        測試 2: 邊界條件測試 - 不同端口都能正常運作

        驗證不同的 localhost 端口都能通過 CORS 檢查
        """
        # 發送 OPTIONS preflight 請求
        response = client.options(
            "/api/v1/system/api-keys/test",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )

        # 驗證回應包含正確的 CORS headers
        assert response.status_code == 200
        assert "access-control-allow-origin" in response.headers
        assert response.headers["access-control-allow-origin"] == origin
        assert "access-control-allow-credentials" in response.headers
        assert response.headers["access-control-allow-credentials"] == "true"

    def test_cors_allows_frontend_port_3001(self):
        """
        測試 1: 基本驗證測試 - CORS Headers 正確設定

        特別驗證 port 3001（issue-015 的問題端口）
        """
        origin = "http://localhost:3001"

        # 發送 OPTIONS preflight 請求
        response = client.options(
            "/api/v1/system/api-keys/test",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )

        # 驗證 CORS headers
        assert response.status_code == 200
        assert response.headers.get("access-control-allow-origin") == origin
        assert response.headers.get("access-control-allow-credentials") == "true"

        # 驗證允許的方法包含 POST
        allow_methods = response.headers.get("access-control-allow-methods", "")
        assert "POST" in allow_methods

    @pytest.mark.parametrize(
        "unauthorized_origin",
        [
            "http://evil.com",
            "http://localhost:8080",
            "https://random-domain.com",
            "http://example.com",
        ],
    )
    def test_cors_rejects_unauthorized_origins(self, unauthorized_origin):
        """
        測試 4: 錯誤處理測試 - 不允許的 origin 仍被拒絕

        確保只有白名單中的 origins 被允許
        """
        # 發送 OPTIONS preflight 請求
        response = client.options(
            "/api/v1/system/api-keys/test",
            headers={
                "Origin": unauthorized_origin,
                "Access-Control-Request-Method": "POST",
            },
        )

        # 不應該包含允許此 origin 的 header
        # 或者 header 不應該匹配請求的 origin
        allow_origin = response.headers.get("access-control-allow-origin")
        assert allow_origin != unauthorized_origin

    def test_api_keys_endpoint_accepts_cors_request(self):
        """
        測試 3: 回歸測試 - 原有功能不受影響

        驗證實際的 API endpoint 接受來自允許 origin 的請求
        """
        origin = "http://localhost:3001"

        # 注意：這裡只測試 CORS，不測試 API 邏輯
        # 實際的 API 邏輯應該在其他測試中覆蓋
        response = client.post(
            "/api/v1/system/api-keys/test",
            json={"service": "gemini", "api_key": "test_key"},
            headers={"Origin": origin},
        )

        # 驗證回應包含 CORS header（不管 API 邏輯是否成功）
        assert "access-control-allow-origin" in response.headers
        assert response.headers["access-control-allow-origin"] == origin


class TestCORSWithActualAPIKeys:
    """測試 CORS 與 API Keys 功能整合"""

    def test_cors_with_api_keys_list(self):
        """驗證取得 API Keys 列表時 CORS 正確運作"""
        origin = "http://localhost:3001"

        response = client.get(
            "/api/v1/system/api-keys",
            headers={"Origin": origin},
        )

        # 驗證 CORS headers
        assert "access-control-allow-origin" in response.headers
        assert response.headers["access-control-allow-origin"] == origin

    def test_cors_with_api_keys_save(self):
        """驗證儲存 API Key 時 CORS 正確運作"""
        origin = "http://localhost:3001"

        response = client.post(
            "/api/v1/system/api-keys",
            json={
                "service": "gemini",
                "key_name": "test_key",
                "api_key": "test_api_key_value",
            },
            headers={"Origin": origin},
        )

        # 驗證 CORS headers（不管 API 回應是什麼）
        assert "access-control-allow-origin" in response.headers
        assert response.headers["access-control-allow-origin"] == origin
