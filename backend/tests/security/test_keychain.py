"""
Keychain Manager 測試
"""

import pytest
from unittest.mock import Mock, patch

from app.security.keychain import KeychainManager


def test_save_api_key():
    """測試儲存 API Key"""
    manager = KeychainManager()

    with patch("keyring.set_password") as mock_set:
        manager.save_api_key("gemini", "test_api_key")
        mock_set.assert_called_once_with("ytmaker", "gemini_api_key", "test_api_key")


def test_get_api_key():
    """測試讀取 API Key"""
    manager = KeychainManager()

    with patch("keyring.get_password") as mock_get:
        mock_get.return_value = "test_api_key"

        result = manager.get_api_key("gemini")

        assert result == "test_api_key"
        mock_get.assert_called_once_with("ytmaker", "gemini_api_key")


def test_get_api_key_not_found():
    """測試讀取不存在的 API Key"""
    manager = KeychainManager()

    with patch("keyring.get_password") as mock_get:
        mock_get.return_value = None

        result = manager.get_api_key("stability_ai")

        assert result is None


def test_delete_api_key():
    """測試刪除 API Key"""
    manager = KeychainManager()

    with patch("keyring.delete_password") as mock_delete:
        manager.delete_api_key("gemini")
        mock_delete.assert_called_once_with("ytmaker", "gemini_api_key")


def test_delete_api_key_not_found():
    """測試刪除不存在的 API Key（應該不拋出異常）"""
    manager = KeychainManager()

    with patch("keyring.delete_password") as mock_delete:
        mock_delete.side_effect = Exception("Key not found")

        # 不應該拋出異常
        manager.delete_api_key("gemini")
