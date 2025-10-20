"""
Keychain Manager - cross-platform keychain integration.
"""

from typing import Optional

import keyring


class KeychainManager:
    """
    跨平台 Keychain 管理器

    使用 keyring 套件統一處理：
    - macOS: Keychain Access
    - Linux: Secret Service (GNOME Keyring, KWallet)
    - Windows: Credential Manager
    """

    SERVICE_NAME = "ytmaker"

    def save_api_key(self, provider: str, api_key: str) -> None:
        """
        儲存 API Key 到系統 Keychain

        Args:
            provider: 服務提供者（gemini, stability_ai, did）
            api_key: API Key 字串

        Raises:
            Exception: 如果儲存失敗
        """
        key_name = f"{provider}_api_key"
        try:
            keyring.set_password(self.SERVICE_NAME, key_name, api_key)
        except Exception as e:
            raise Exception(f"無法儲存到 Keychain：{str(e)}")

    def get_api_key(self, provider: str) -> Optional[str]:
        """
        從 Keychain 讀取 API Key

        Args:
            provider: 服務提供者

        Returns:
            API Key 字串，如果不存在則回傳 None
        """
        key_name = f"{provider}_api_key"
        try:
            return keyring.get_password(self.SERVICE_NAME, key_name)
        except Exception:
            return None

    def delete_api_key(self, provider: str) -> None:
        """
        從 Keychain 刪除 API Key

        Args:
            provider: 服務提供者
        """
        key_name = f"{provider}_api_key"
        try:
            keyring.delete_password(self.SERVICE_NAME, key_name)
        except Exception:
            pass  # 如果不存在就忽略
