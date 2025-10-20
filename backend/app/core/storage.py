import logging
import shutil
import uuid
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


class StorageService:
    """檔案儲存服務"""

    def __init__(self, base_path: Optional[str] = None):
        """
        初始化儲存服務

        Args:
            base_path: 儲存根目錄路徑
        """
        from app.core.config import settings

        self.base_path = Path(base_path or settings.STORAGE_PATH)
        self.temp_path = self.base_path / "temp"
        self.temp_path.mkdir(parents=True, exist_ok=True)

    async def upload_temporary(self, file_path: str) -> str:
        """
        上傳檔案到臨時可訪問的儲存

        實作方式:
        1. 本地開發: 使用本地 HTTP 伺服器
        2. 生產環境: 上傳到 S3/GCS 並生成 presigned URL

        Args:
            file_path: 本地檔案路徑

        Returns:
            可公開訪問的 URL
        """
        filename = f"{uuid.uuid4()}_{Path(file_path).name}"
        temp_file_path = self.temp_path / filename

        # 複製檔案
        shutil.copy(file_path, temp_file_path)

        # 生成 URL(假設有本地 HTTP 伺服器在 8000 port)
        # 在生產環境中,這應該是 S3 presigned URL 或類似的公開 URL
        url = f"http://localhost:8000/temp/{filename}"

        logger.info(f"Uploaded temporary file: {filename}")
        return url

    async def delete_temporary(self, url: str):
        """
        刪除臨時檔案

        Args:
            url: 臨時檔案 URL
        """
        # 從 URL 取得檔案名
        filename = url.split("/")[-1]
        temp_file_path = self.temp_path / filename

        if temp_file_path.exists():
            temp_file_path.unlink()
            logger.info(f"Deleted temporary file: {filename}")

    def save_asset(self, project_id: int, filename: str, data: bytes) -> str:
        """
        儲存 Asset 檔案

        Args:
            project_id: 專案 ID
            filename: 檔案名稱
            data: 檔案二進制數據

        Returns:
            儲存路徑
        """
        project_path = self.base_path / "projects" / str(project_id) / "assets"
        project_path.mkdir(parents=True, exist_ok=True)

        file_path = project_path / filename

        with open(file_path, "wb") as f:
            f.write(data)

        logger.info(f"Saved asset: {file_path}")
        return str(file_path)

    def get_asset_path(self, project_id: int, filename: str) -> Path:
        """
        取得 Asset 檔案路徑

        Args:
            project_id: 專案 ID
            filename: 檔案名稱

        Returns:
            檔案路徑
        """
        return self.base_path / "projects" / str(project_id) / "assets" / filename
