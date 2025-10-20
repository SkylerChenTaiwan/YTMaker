# Task-012: D-ID API 整合(虛擬主播)

> **建立日期:** 2025-10-19
> **狀態:** ⏳ 未開始
> **預計時間:** 8 小時
> **優先級:** P0 (必須)

---

## 關聯文件

### 產品設計
- **產品概述:** `product-design/overview.md#核心功能-3-虛擬主播`
  - 虛擬主播系統需求說明
  - 開場片段(30秒)和結尾片段(30秒)
  - 嘴型與音訊同步要求
- **使用者流程:** `product-design/flows.md#Flow-1` (素材生成階段)
  - 步驟 4: 素材生成流程說明

### 技術規格
- **第三方整合:** `tech-specs/backend/integrations.md#D-ID-API`
  - D-ID API 端點、認證方式
  - 實作範例與錯誤處理
  - 降級策略說明
- **業務邏輯:** `tech-specs/backend/business-logic.md#虛擬主播生成`
  - 虛擬主播生成處理流程
  - 驗證邏輯(時長、嘴型同步)
  - 失敗後的降級策略
- **背景任務:** `tech-specs/backend/background-jobs.md#影片生成任務`
  - Celery 任務整合
  - 並行素材生成流程

### 相關任務
- **前置任務:** Task-003 ✅ (API 基礎架構), Task-006 ✅ (System API - API Keys 管理)
- **後置任務:** Task-014 (Celery 任務整合), Task-015 (影片渲染 - 虛擬主播片段整合)
- **並行任務:** Task-010 (Gemini), Task-011 (Stability AI), Task-013 (YouTube) - 可同時開發

---

## 任務目標

### 簡述
整合 D-ID API 實現虛擬主播影片生成功能,為影片開場和結尾生成真人虛擬主播片段,支援嘴型同步驗證、時長驗證、配額監控,以及錯誤處理與降級策略。

### 成功標準
- [ ] DIDClient 類別完整實作(建立 talk、查詢狀態、下載影片)
- [ ] AvatarGenerationService 業務邏輯完整實作
- [ ] 嘴型同步驗證機制完成
- [ ] 時長驗證(誤差 < 5%)完成
- [ ] D-ID 配額監控完成(90 分鐘/月)
- [ ] 錯誤處理與 fallback 策略完成
- [ ] 單元測試覆蓋率 > 85%
- [ ] 所有測試通過(含 Mock 測試)

---

## 測試要求

### 單元測試

#### 測試 1: 成功建立 D-ID Talk

**目的:** 驗證可以成功調用 D-ID API 建立虛擬主播生成任務

**前置條件:**
- Mock D-ID API 回應
- 已準備測試用音訊 URL

**輸入:**
```python
audio_url = "https://example.com/test_audio.mp3"
presenter_id = "amy-jcwCkr1grs"
driver_id = "uM00QMwJ9x"
```

**預期輸出:**
```python
{
    "talk_id": "talk_abc123",
    "status": "created"
}
```

**驗證點:**
- [ ] API 請求包含正確的 headers (Authorization: Basic {api_key})
- [ ] API 請求 body 包含正確的結構(source_url, script, config)
- [ ] 回傳的 talk_id 格式正確
- [ ] 初始狀態為 "created"
- [ ] 無錯誤拋出

**測試程式碼骨架:**
```python
@pytest.mark.asyncio
async def test_create_talk_success(mock_did_api):
    # Arrange
    client = DIDClient(api_key="test_key")
    audio_url = "https://example.com/test_audio.mp3"

    mock_did_api.post.return_value = {
        "id": "talk_abc123",
        "status": "created"
    }

    # Act
    talk_id = await client.create_talk(audio_url)

    # Assert
    assert talk_id == "talk_abc123"
    mock_did_api.post.assert_called_once()
    assert "Authorization" in mock_did_api.post.call_args[1]["headers"]
```

---

#### 測試 2: 輪詢 Talk 狀態直到完成

**目的:** 驗證可以正確輪詢 D-ID Talk 狀態,並在完成時返回影片 URL

**前置條件:**
- Mock D-ID API 回應(模擬狀態變化: created → started → done)
- 已有有效的 talk_id

**輸入:**
```python
talk_id = "talk_abc123"
```

**預期輸出:**
```python
{
    "status": "done",
    "result_url": "https://d-id.example.com/videos/video_abc123.mp4",
    "duration": 15.2
}
```

**驗證點:**
- [ ] 正確輪詢 API 端點 `GET /talks/{talk_id}`
- [ ] 檢測狀態變化(created → started → done)
- [ ] 當狀態為 "done" 時停止輪詢
- [ ] 返回正確的 result_url
- [ ] 輪詢間隔約 5 秒
- [ ] 總輪詢次數 <= 120 次(10 分鐘超時)

**測試程式碼骨架:**
```python
@pytest.mark.asyncio
async def test_poll_talk_status_until_done(mock_did_api):
    # Arrange
    client = DIDClient(api_key="test_key")
    talk_id = "talk_abc123"

    # 模擬狀態變化
    mock_responses = [
        {"id": talk_id, "status": "created"},
        {"id": talk_id, "status": "started"},
        {"id": talk_id, "status": "done", "result_url": "https://example.com/video.mp4", "duration": 15.2}
    ]
    mock_did_api.get.side_effect = mock_responses

    # Act
    result = await client.get_talk_status(talk_id)

    # Assert
    assert result["status"] == "done"
    assert result["result_url"] == "https://example.com/video.mp4"
    assert mock_did_api.get.call_count == 3
```

---

#### 測試 3: Talk 生成失敗處理

**目的:** 驗證當 D-ID API 返回錯誤狀態時,能正確處理並拋出異常

**前置條件:**
- Mock D-ID API 回應(status: "error")
- 已有有效的 talk_id

**輸入:**
```python
talk_id = "talk_abc123"
```

**預期輸出:**
拋出 `DIDAPIError` 異常,包含錯誤訊息

**驗證點:**
- [ ] 檢測到 status == "error" 時停止輪詢
- [ ] 拋出自訂異常 `DIDAPIError`
- [ ] 異常訊息包含錯誤原因
- [ ] 記錄錯誤日誌

**測試程式碼骨架:**
```python
@pytest.mark.asyncio
async def test_talk_generation_error(mock_did_api):
    # Arrange
    client = DIDClient(api_key="test_key")
    talk_id = "talk_abc123"

    mock_did_api.get.return_value = {
        "id": talk_id,
        "status": "error",
        "error": {"message": "Audio file is too long"}
    }

    # Act & Assert
    with pytest.raises(DIDAPIError) as exc_info:
        await client.get_talk_status(talk_id)

    assert "Audio file is too long" in str(exc_info.value)
```

---

#### 測試 4: 影片時長驗證通過

**目的:** 驗證生成的虛擬主播影片時長與音訊時長匹配(誤差 < 5%)

**前置條件:**
- 已生成的虛擬主播影片
- 已知的音訊時長

**輸入:**
```python
video_duration = 15.3  # 秒
audio_duration = 15.0  # 秒
```

**預期輸出:**
```python
{
    "is_valid": True,
    "error_rate": 0.02  # 2%
}
```

**驗證點:**
- [ ] 計算誤差率: abs(video_duration - audio_duration) / audio_duration
- [ ] 誤差率 < 0.05 (5%) 則通過
- [ ] 返回驗證結果與誤差率

**測試程式碼骨架:**
```python
def test_validate_duration_success():
    # Arrange
    service = AvatarGenerationService()
    video_duration = 15.3
    audio_duration = 15.0

    # Act
    result = service.validate_duration(video_duration, audio_duration)

    # Assert
    assert result["is_valid"] is True
    assert result["error_rate"] < 0.05
```

---

#### 測試 5: 影片時長驗證失敗

**目的:** 驗證當影片時長誤差過大時(>= 5%),驗證失敗

**輸入:**
```python
video_duration = 20.0  # 秒
audio_duration = 15.0  # 秒
```

**預期輸出:**
```python
{
    "is_valid": False,
    "error_rate": 0.333  # 33.3%
}
```

**驗證點:**
- [ ] 誤差率 >= 5% 則驗證失敗
- [ ] 返回 is_valid: False
- [ ] 記錄警告日誌

**測試程式碼骨架:**
```python
def test_validate_duration_failure():
    # Arrange
    service = AvatarGenerationService()
    video_duration = 20.0
    audio_duration = 15.0

    # Act
    result = service.validate_duration(video_duration, audio_duration)

    # Assert
    assert result["is_valid"] is False
    assert result["error_rate"] > 0.05
```

---

#### 測試 6: D-ID 配額檢查

**目的:** 驗證可以查詢 D-ID API 配額使用情況

**前置條件:**
- Mock D-ID API 配額查詢端點

**輸入:**
無(直接查詢當前配額)

**預期輸出:**
```python
{
    "used_minutes": 45,
    "total_minutes": 90,
    "remaining_minutes": 45,
    "percentage_used": 50
}
```

**驗證點:**
- [ ] 正確調用 D-ID API 配額端點
- [ ] 計算剩餘分鐘數
- [ ] 計算使用百分比
- [ ] 當剩餘 < 10% 時記錄警告

**測試程式碼骨架:**
```python
@pytest.mark.asyncio
async def test_check_quota(mock_did_api):
    # Arrange
    client = DIDClient(api_key="test_key")

    mock_did_api.get.return_value = {
        "used": 2700,  # 秒
        "total": 5400  # 秒
    }

    # Act
    quota = await client.check_quota()

    # Assert
    assert quota["used_minutes"] == 45
    assert quota["total_minutes"] == 90
    assert quota["remaining_minutes"] == 45
    assert quota["percentage_used"] == 50
```

---

#### 測試 7: 配額不足時拒絕生成

**目的:** 驗證當 D-ID 配額不足時,拒絕生成虛擬主播並拋出異常

**前置條件:**
- Mock D-ID API 配額查詢(剩餘 < 1 分鐘)

**輸入:**
```python
estimated_duration = 60  # 秒(1 分鐘)
```

**預期輸出:**
拋出 `QuotaExceededError` 異常

**驗證點:**
- [ ] 在生成前檢查配額
- [ ] 當 remaining_minutes < estimated_duration 時拋出異常
- [ ] 異常訊息包含剩餘配額資訊

**測試程式碼骨架:**
```python
@pytest.mark.asyncio
async def test_quota_exceeded(mock_did_api):
    # Arrange
    service = AvatarGenerationService()

    mock_did_api.get.return_value = {
        "used": 5340,  # 89 分鐘
        "total": 5400  # 90 分鐘
    }

    # Act & Assert
    with pytest.raises(QuotaExceededError) as exc_info:
        await service.can_generate_avatar(estimated_duration=60)

    assert "配額不足" in str(exc_info.value)
```

---

#### 測試 8: Fallback 策略 - 跳過虛擬主播

**目的:** 驗證當虛擬主播生成失敗時,能夠 fallback 為返回 None,不中斷整體流程

**前置條件:**
- Mock D-ID API 失敗(例如: 配額用盡)

**輸入:**
```python
project_id = 123
audio_path = "/path/to/intro_audio.mp3"
segment_type = "intro"
```

**預期輸出:**
```python
None  # 表示跳過虛擬主播
```

**驗證點:**
- [ ] 捕獲 `QuotaExceededError` 異常
- [ ] 記錄警告日誌: "D-ID quota exceeded, skipping avatar"
- [ ] 返回 None 而非拋出異常
- [ ] 不中斷後續流程

**測試程式碼骨架:**
```python
@pytest.mark.asyncio
async def test_fallback_on_quota_exceeded(mock_did_api, mock_logger):
    # Arrange
    service = AvatarGenerationService()

    mock_did_api.get.side_effect = QuotaExceededError("配額用盡")

    # Act
    result = await service.generate_with_fallback(
        project_id=123,
        audio_path="/path/to/audio.mp3",
        segment_type="intro"
    )

    # Assert
    assert result is None
    mock_logger.warning.assert_called_once_with("D-ID quota exceeded, skipping avatar")
```

---

#### 測試 9: 完整虛擬主播生成流程(整合測試)

**目的:** 驗證完整的虛擬主播生成流程(建立 talk → 輪詢狀態 → 下載影片 → 驗證)

**前置條件:**
- Mock 所有 D-ID API 端點
- Mock 檔案下載與儲存

**輸入:**
```python
project_id = 123
audio_file_path = "/projects/123/assets/intro_audio.mp3"
segment_type = "intro"
```

**預期輸出:**
Asset 物件,包含:
```python
{
    "project_id": 123,
    "asset_type": "avatar_intro",
    "file_path": "/projects/123/assets/avatar_intro.mp4",
    "metadata": {
        "duration": 15.2,
        "validation": {
            "duration_valid": True,
            "error_rate": 0.013
        }
    }
}
```

**驗證點:**
- [ ] 正確上傳音訊到臨時儲存(或使用可訪問的 URL)
- [ ] 調用 D-ID API 建立 talk
- [ ] 輪詢狀態直到完成
- [ ] 下載影片並儲存到正確路徑
- [ ] 驗證影片時長
- [ ] 建立 Asset 記錄到資料庫
- [ ] 返回 Asset 物件

**測試程式碼骨架:**
```python
@pytest.mark.asyncio
async def test_full_avatar_generation_flow(
    mock_did_api,
    mock_storage,
    mock_db,
    sample_audio_file
):
    # Arrange
    service = AvatarGenerationService()
    project_id = 123

    # Mock API 回應
    mock_did_api.post.return_value = {"id": "talk_123", "status": "created"}
    mock_did_api.get.side_effect = [
        {"id": "talk_123", "status": "started"},
        {"id": "talk_123", "status": "done", "result_url": "https://example.com/video.mp4", "duration": 15.2}
    ]
    mock_storage.download.return_value = b"fake_video_data"

    # Act
    asset = await service.generate_avatar_video(
        project_id=project_id,
        audio_file_path=sample_audio_file,
        segment_type="intro"
    )

    # Assert
    assert asset.project_id == project_id
    assert asset.asset_type == "avatar_intro"
    assert asset.file_path.endswith("avatar_intro.mp4")
    assert asset.metadata["duration"] == 15.2
    assert asset.metadata["validation"]["duration_valid"] is True

    # 驗證呼叫順序
    assert mock_did_api.post.called
    assert mock_did_api.get.call_count == 2
    assert mock_storage.download.called
    assert mock_db.add.called
```

---

### 整合測試(可選 - 需真實 API Key)

#### 測試 10: D-ID API 失敗應自動重試

**目的:** 驗證 D-ID API 暫時失敗時,系統會自動重試並最終成功

**測試設置:**
```python
import responses

# Mock D-ID API 返回 503 (服務暫時不可用)
with responses.RequestsMock() as rsps:
    # 前兩次調用失敗
    rsps.add(responses.POST, 'https://api.d-id.com/talks',
        status=503, json={'error': 'Service temporarily unavailable'})
    rsps.add(responses.POST, 'https://api.d-id.com/talks',
        status=503, json={'error': 'Service temporarily unavailable'})
    # 第三次調用成功
    rsps.add(responses.POST, 'https://api.d-id.com/talks',
        status=200, json={
            'id': 'talk_abc123',
            'status': 'created'
        })

    # 第一次狀態查詢返回 done
    rsps.add(responses.GET, 'https://api.d-id.com/talks/talk_abc123',
        status=200, json={
            'id': 'talk_abc123',
            'status': 'done',
            'result_url': 'https://example.com/video.mp4',
            'duration': 15.2
        })
```

**測試執行:**
```python
@pytest.mark.asyncio
async def test_did_api_failure_with_retry():
    # Arrange
    client = DIDClient(api_key="test_key")
    audio_url = "https://example.com/test_audio.mp3"

    # Mock 設置如上

    # Act - 第一次失敗,自動重試
    start_time = time.time()
    talk_id = await client.create_talk_with_retry(
        audio_url=audio_url,
        max_retries=3,
        retry_delay=2
    )
    end_time = time.time()

    # Assert
    assert talk_id == "talk_abc123"

    # 驗證重試時間(至少等待 2 + 4 = 6 秒,因為前兩次失敗)
    elapsed_time = end_time - start_time
    assert elapsed_time >= 6, f"Expected retry delay, but only took {elapsed_time}s"

    # 驗證 API 調用次數(3 次 POST + 1 次 GET)
    assert len(rsps.calls) == 4
    assert rsps.calls[0].request.url == 'https://api.d-id.com/talks'
    assert rsps.calls[1].request.url == 'https://api.d-id.com/talks'
    assert rsps.calls[2].request.url == 'https://api.d-id.com/talks'
    assert rsps.calls[3].request.url == 'https://api.d-id.com/talks/talk_abc123'
```

**預期結果:**
- ✅ 前兩次 API 調用返回 503 錯誤
- ✅ 系統等待 2 秒後重試第二次
- ✅ 第二次失敗後等待 4 秒(指數退避)
- ✅ 第三次調用成功並返回 talk_id
- ✅ 總共耗時約 6 秒(2s + 4s)
- ✅ 成功取得虛擬主播生成任務 ID

**實作要求:**
```python
# 在 DIDClient 中新增 create_talk_with_retry 方法
async def create_talk_with_retry(
    self,
    audio_url: str,
    max_retries: int = 3,
    retry_delay: int = 2,
    presenter_id: str = "amy-jcwCkr1grs",
    driver_id: str = "uM00QMwJ9x"
) -> str:
    """
    建立 D-ID Talk 並支援自動重試

    Args:
        audio_url: 音訊檔案 URL
        max_retries: 最大重試次數
        retry_delay: 初始重試延遲(秒),使用指數退避
        presenter_id: Presenter ID
        driver_id: Driver ID

    Returns:
        talk_id

    Raises:
        DIDAPIError: 重試耗盡後仍失敗
    """
    for attempt in range(max_retries):
        try:
            return await self.create_talk(audio_url, presenter_id, driver_id)
        except DIDAPIError as e:
            if attempt < max_retries - 1:
                wait_time = retry_delay * (2 ** attempt)  # 指數退避: 2s, 4s, 8s...
                logger.warning(
                    f"D-ID API call failed (attempt {attempt + 1}/{max_retries}): {str(e)}. "
                    f"Retrying in {wait_time}s..."
                )
                await asyncio.sleep(wait_time)
            else:
                logger.error(f"D-ID API call failed after {max_retries} attempts")
                raise
```

---

#### 測試 11: 真實 D-ID API 整合測試

**目的:** 使用真實的 D-ID API Key 測試完整流程

**前置條件:**
- 有效的 D-ID API Key
- 真實的音訊檔案
- 網路連線正常

**執行方式:**
```bash
pytest tests/integration/test_did_integration.py --api-key=YOUR_REAL_KEY -v
```

**注意事項:**
- 僅在需要驗證實際整合時執行
- 會消耗 D-ID 配額
- 執行時間較長(約 2-3 分鐘)

---

## 實作規格

### 需要建立/修改的檔案

#### 1. D-ID 客戶端: `backend/app/integrations/did_client.py`

**職責:** 封裝 D-ID API 的所有調用邏輯

**主要方法:**

```python
import httpx
import asyncio
import logging
from typing import Dict, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

class DIDClient:
    """D-ID API 客戶端"""

    BASE_URL = "https://api.d-id.com"

    def __init__(self, api_key: str):
        """
        初始化 D-ID 客戶端

        Args:
            api_key: D-ID API Key
        """
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Basic {api_key}",
            "Content-Type": "application/json"
        }

    async def create_talk(
        self,
        audio_url: str,
        presenter_id: str = "amy-jcwCkr1grs",
        driver_id: str = "uM00QMwJ9x"
    ) -> str:
        """
        建立虛擬主播 Talk

        Args:
            audio_url: 音訊檔案的可訪問 URL
            presenter_id: Presenter 圖片 ID(預設使用 D-ID 內建)
            driver_id: 驅動模型 ID(控制嘴型同步品質)

        Returns:
            talk_id: Talk 任務 ID

        Raises:
            DIDAPIError: API 調用失敗
        """
        url = f"{self.BASE_URL}/talks"

        payload = {
            "source_url": f"https://create-images-results.d-id.com/api_docs/assets/{presenter_id}.jpg",
            "script": {
                "type": "audio",
                "audio_url": audio_url
            },
            "config": {
                "driver_id": driver_id,
                "fluent": True,
                "pad_audio": 0.0
            }
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    url,
                    headers=self.headers,
                    json=payload,
                    timeout=30.0
                )
                response.raise_for_status()

                data = response.json()
                talk_id = data["id"]
                logger.info(f"D-ID Talk created: {talk_id}")

                return talk_id

            except httpx.HTTPStatusError as e:
                error_msg = f"D-ID API error: {e.response.status_code} - {e.response.text}"
                logger.error(error_msg)
                raise DIDAPIError(error_msg)
            except Exception as e:
                logger.error(f"Failed to create D-ID talk: {str(e)}")
                raise DIDAPIError(str(e))

    async def get_talk_status(
        self,
        talk_id: str,
        max_wait_time: int = 600,  # 10 分鐘
        poll_interval: int = 5
    ) -> Dict:
        """
        輪詢 Talk 狀態直到完成或失敗

        Args:
            talk_id: Talk ID
            max_wait_time: 最大等待時間(秒)
            poll_interval: 輪詢間隔(秒)

        Returns:
            Talk 狀態資訊,包含 result_url

        Raises:
            DIDAPIError: API 調用失敗或生成失敗
            TimeoutError: 超時
        """
        url = f"{self.BASE_URL}/talks/{talk_id}"
        start_time = asyncio.get_event_loop().time()

        async with httpx.AsyncClient() as client:
            while True:
                # 檢查超時
                elapsed = asyncio.get_event_loop().time() - start_time
                if elapsed > max_wait_time:
                    raise TimeoutError(f"D-ID talk generation timeout after {max_wait_time}s")

                try:
                    response = await client.get(url, headers=self.headers)
                    response.raise_for_status()

                    data = response.json()
                    status = data.get("status")

                    logger.info(f"D-ID Talk {talk_id} status: {status}")

                    if status == "done":
                        return data
                    elif status == "error":
                        error_msg = data.get("error", {}).get("message", "Unknown error")
                        raise DIDAPIError(f"D-ID generation failed: {error_msg}")

                    # 繼續等待(status: created, started)
                    await asyncio.sleep(poll_interval)

                except httpx.HTTPStatusError as e:
                    error_msg = f"D-ID API error: {e.response.status_code}"
                    logger.error(error_msg)
                    raise DIDAPIError(error_msg)

    async def download_video(self, video_url: str) -> bytes:
        """
        下載生成的影片

        Args:
            video_url: 影片下載 URL

        Returns:
            影片二進制數據

        Raises:
            DIDAPIError: 下載失敗
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(video_url, timeout=120.0)
                response.raise_for_status()

                logger.info(f"Downloaded D-ID video: {len(response.content)} bytes")
                return response.content

            except Exception as e:
                error_msg = f"Failed to download D-ID video: {str(e)}"
                logger.error(error_msg)
                raise DIDAPIError(error_msg)

    async def check_quota(self) -> Dict[str, float]:
        """
        查詢 D-ID API 配額使用情況

        Returns:
            {
                "used_minutes": 使用分鐘數,
                "total_minutes": 總配額分鐘數,
                "remaining_minutes": 剩餘分鐘數,
                "percentage_used": 使用百分比
            }

        Note:
            D-ID API 可能沒有公開的配額查詢端點,
            此方法可能需要根據實際 API 調整或通過其他方式追蹤
        """
        # TODO: 根據實際 D-ID API 文檔實作
        # 暫時返回模擬數據或從本地追蹤

        # 範例實作(假設有配額端點):
        # url = f"{self.BASE_URL}/credits"
        # async with httpx.AsyncClient() as client:
        #     response = await client.get(url, headers=self.headers)
        #     data = response.json()
        #     used_seconds = data["used"]
        #     total_seconds = data["total"]

        # 如果沒有 API 端點,可以從資料庫追蹤:
        # - 每次生成後記錄使用時長
        # - 累計本月使用量

        logger.warning("check_quota() not fully implemented - using mock data")

        return {
            "used_minutes": 0,
            "total_minutes": 90,
            "remaining_minutes": 90,
            "percentage_used": 0
        }

    async def can_generate_avatar(self, estimated_duration: int) -> bool:
        """
        檢查是否有足夠配額生成虛擬主播

        Args:
            estimated_duration: 預估時長(秒)

        Returns:
            是否可以生成

        Raises:
            QuotaExceededError: 配額不足
        """
        quota = await self.check_quota()
        remaining_seconds = quota["remaining_minutes"] * 60

        if remaining_seconds < estimated_duration:
            raise QuotaExceededError(
                f"D-ID quota insufficient. Remaining: {quota['remaining_minutes']:.1f} min, "
                f"Required: {estimated_duration/60:.1f} min"
            )

        return True


class DIDAPIError(Exception):
    """D-ID API 錯誤"""
    pass


class QuotaExceededError(DIDAPIError):
    """D-ID 配額用盡"""
    pass
```

---

#### 2. 虛擬主播生成服務: `backend/app/services/avatar_service.py`

**職責:** 虛擬主播生成的業務邏輯層

**主要方法:**

```python
import os
import logging
from typing import Dict, Optional, Literal
from pathlib import Path

from app.integrations.did_client import DIDClient, DIDAPIError, QuotaExceededError
from app.models.asset import Asset
from app.models.project import Project
from app.core.storage import StorageService
from app.core.config import settings
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

class AvatarGenerationService:
    """虛擬主播生成服務"""

    def __init__(self, db: Session):
        self.db = db
        self.storage = StorageService()

        # 從環境變數或設定取得 D-ID API Key
        api_key = settings.DID_API_KEY
        if not api_key:
            raise ValueError("D-ID API Key not configured")

        self.did_client = DIDClient(api_key)

    async def generate_avatar_video(
        self,
        project_id: int,
        audio_file_path: str,
        segment_type: Literal["intro", "outro"]
    ) -> Asset:
        """
        生成虛擬主播影片

        流程:
        1. 上傳音訊到可公開訪問的儲存(或生成臨時 URL)
        2. 調用 D-ID API 建立 Talk
        3. 輪詢狀態等待生成完成
        4. 下載影片
        5. 驗證影片品質(時長)
        6. 儲存檔案
        7. 建立 Asset 記錄

        Args:
            project_id: 專案 ID
            audio_file_path: 音訊檔案路徑(本地)
            segment_type: 片段類型("intro" 或 "outro")

        Returns:
            Asset: 虛擬主播影片 Asset 記錄

        Raises:
            DIDAPIError: D-ID API 調用失敗
            QuotaExceededError: 配額不足
            ValidationError: 影片驗證失敗
        """
        logger.info(f"Starting avatar generation for project {project_id}, segment: {segment_type}")

        # 1. 取得音訊時長(用於配額檢查和驗證)
        audio_duration = self._get_audio_duration(audio_file_path)
        logger.info(f"Audio duration: {audio_duration}s")

        # 2. 檢查配額
        await self.did_client.can_generate_avatar(estimated_duration=int(audio_duration))

        # 3. 上傳音訊到臨時可訪問的 URL
        audio_url = await self.storage.upload_temporary(audio_file_path)
        logger.info(f"Audio uploaded to: {audio_url}")

        try:
            # 4. 建立 D-ID Talk
            talk_id = await self.did_client.create_talk(audio_url)

            # 5. 輪詢狀態
            talk_result = await self.did_client.get_talk_status(talk_id)

            # 6. 下載影片
            video_url = talk_result["result_url"]
            video_data = await self.did_client.download_video(video_url)

            # 7. 儲存影片
            video_filename = f"avatar_{segment_type}.mp4"
            video_path = self.storage.save_asset(
                project_id=project_id,
                filename=video_filename,
                data=video_data
            )
            logger.info(f"Avatar video saved to: {video_path}")

            # 8. 驗證影片
            video_duration = self._get_video_duration(video_path)
            validation_result = self.validate_duration(video_duration, audio_duration)

            if not validation_result["is_valid"]:
                logger.warning(
                    f"Avatar video duration mismatch. "
                    f"Video: {video_duration}s, Audio: {audio_duration}s, "
                    f"Error rate: {validation_result['error_rate']:.2%}"
                )
                # 根據業務需求決定是否接受或重試
                # 這裡選擇接受但記錄警告

            # 9. 建立 Asset 記錄
            asset = Asset(
                project_id=project_id,
                asset_type=f"avatar_{segment_type}",
                file_path=video_path,
                metadata={
                    "duration": video_duration,
                    "talk_id": talk_id,
                    "validation": validation_result,
                    "segment_type": segment_type
                }
            )

            self.db.add(asset)
            self.db.commit()
            self.db.refresh(asset)

            logger.info(f"Avatar asset created: {asset.id}")
            return asset

        finally:
            # 清理臨時音訊 URL
            await self.storage.delete_temporary(audio_url)

    def validate_duration(
        self,
        video_duration: float,
        audio_duration: float,
        tolerance: float = 0.05
    ) -> Dict[str, any]:
        """
        驗證影片時長是否與音訊匹配

        Args:
            video_duration: 影片時長(秒)
            audio_duration: 音訊時長(秒)
            tolerance: 允許誤差(預設 5%)

        Returns:
            {
                "is_valid": bool,
                "error_rate": float,
                "video_duration": float,
                "audio_duration": float
            }
        """
        error_rate = abs(video_duration - audio_duration) / audio_duration
        is_valid = error_rate < tolerance

        return {
            "is_valid": is_valid,
            "error_rate": error_rate,
            "video_duration": video_duration,
            "audio_duration": audio_duration
        }

    async def generate_with_fallback(
        self,
        project_id: int,
        audio_path: str,
        segment_type: Literal["intro", "outro"],
        max_retries: int = 3
    ) -> Optional[Asset]:
        """
        嘗試生成虛擬主播,失敗時返回 None(Fallback)

        Fallback 方案:
        - 跳過虛擬主播功能
        - 後續渲染階段使用純音訊 + 靜態圖片代替

        Args:
            project_id: 專案 ID
            audio_path: 音訊檔案路徑
            segment_type: 片段類型
            max_retries: 最大重試次數

        Returns:
            Asset 或 None(fallback)
        """
        for attempt in range(max_retries):
            try:
                asset = await self.generate_avatar_video(project_id, audio_path, segment_type)
                logger.info(f"Avatar generated successfully on attempt {attempt + 1}")
                return asset

            except QuotaExceededError as e:
                logger.warning(f"D-ID quota exceeded, skipping avatar: {str(e)}")
                return None  # 直接 fallback,不重試

            except DIDAPIError as e:
                logger.error(f"D-ID API error on attempt {attempt + 1}: {str(e)}")

                if attempt < max_retries - 1:
                    # 重試
                    await asyncio.sleep(2 ** attempt)  # 指數退避
                else:
                    # 最後一次重試失敗,fallback
                    logger.warning("Avatar generation failed after max retries, skipping avatar")
                    return None

            except Exception as e:
                logger.error(f"Unexpected error during avatar generation: {str(e)}")

                if attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt)
                else:
                    return None

        return None

    def _get_audio_duration(self, audio_path: str) -> float:
        """
        取得音訊檔案時長

        使用 ffprobe 或 mutagen 等工具
        """
        # TODO: 實作音訊時長取得
        # 範例使用 ffprobe:
        # import subprocess
        # import json
        #
        # result = subprocess.run(
        #     ['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', audio_path],
        #     capture_output=True,
        #     text=True
        # )
        # data = json.loads(result.stdout)
        # duration = float(data['format']['duration'])
        # return duration

        # 暫時返回模擬值
        return 15.0

    def _get_video_duration(self, video_path: str) -> float:
        """
        取得影片時長

        使用 ffprobe
        """
        # TODO: 實作影片時長取得(與 _get_audio_duration 類似)
        return 15.3
```

---

#### 3. 儲存服務(擴充): `backend/app/core/storage.py`

**職責:** 處理檔案上傳、下載、臨時 URL 生成

**新增方法:**

```python
import os
import uuid
from pathlib import Path
from typing import Optional

class StorageService:
    """檔案儲存服務"""

    def __init__(self):
        self.base_path = Path(settings.STORAGE_PATH)
        self.temp_path = self.base_path / "temp"
        self.temp_path.mkdir(parents=True, exist_ok=True)

    async def upload_temporary(self, file_path: str) -> str:
        """
        上傳檔案到臨時可訪問的儲存

        實作方式:
        1. 本地開發: 使用 ngrok 或本地 HTTP 伺服器
        2. 生產環境: 上傳到 S3/GCS 並生成 presigned URL

        Args:
            file_path: 本地檔案路徑

        Returns:
            可公開訪問的 URL
        """
        # TODO: 實作臨時檔案上傳
        # 範例(使用本地 HTTP 伺服器):
        # 1. 複製檔案到 temp/
        # 2. 返回 http://localhost:8000/temp/{filename}

        filename = f"{uuid.uuid4()}_{Path(file_path).name}"
        temp_file_path = self.temp_path / filename

        # 複製檔案
        import shutil
        shutil.copy(file_path, temp_file_path)

        # 生成 URL(假設有本地 HTTP 伺服器在 8000 port)
        url = f"http://localhost:8000/temp/{filename}"

        return url

    async def delete_temporary(self, url: str):
        """刪除臨時檔案"""
        # 從 URL 取得檔案名
        filename = url.split("/")[-1]
        temp_file_path = self.temp_path / filename

        if temp_file_path.exists():
            temp_file_path.unlink()

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

        return str(file_path)
```

---

#### 4. 配置檔案擴充: `backend/app/core/config.py`

**新增 D-ID 相關配置:**

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # ... 其他設定 ...

    # D-ID API
    DID_API_KEY: str = ""
    DID_QUOTA_WARNING_THRESHOLD: float = 0.1  # 10% 剩餘時警告

    # Storage
    STORAGE_PATH: str = "./storage"
    TEMP_FILE_EXPIRY: int = 3600  # 1 小時

    class Config:
        env_file = ".env"

settings = Settings()
```

---

#### 5. 測試檔案: `backend/tests/integrations/test_did_client.py`

**職責:** DIDClient 單元測試

```python
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.integrations.did_client import (
    DIDClient,
    DIDAPIError,
    QuotaExceededError
)

@pytest.fixture
def did_client():
    return DIDClient(api_key="test_api_key")

@pytest.fixture
def mock_httpx_client():
    with patch("app.integrations.did_client.httpx.AsyncClient") as mock:
        yield mock

# 實作測試 1-9 的測試程式碼
# (詳見前面「測試要求」章節)

@pytest.mark.asyncio
async def test_create_talk_success(did_client, mock_httpx_client):
    # 實作測試 1
    pass

@pytest.mark.asyncio
async def test_poll_talk_status_until_done(did_client, mock_httpx_client):
    # 實作測試 2
    pass

# ... 其他測試
```

---

#### 6. 測試檔案: `backend/tests/services/test_avatar_service.py`

**職責:** AvatarGenerationService 單元測試

```python
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.avatar_service import AvatarGenerationService
from app.models.asset import Asset

@pytest.fixture
def db_session():
    # Mock database session
    return MagicMock()

@pytest.fixture
def avatar_service(db_session):
    with patch("app.services.avatar_service.settings") as mock_settings:
        mock_settings.DID_API_KEY = "test_key"
        mock_settings.STORAGE_PATH = "/tmp/test_storage"
        return AvatarGenerationService(db=db_session)

# 實作測試 4-9 的測試程式碼

def test_validate_duration_success(avatar_service):
    # 實作測試 4
    pass

def test_validate_duration_failure(avatar_service):
    # 實作測試 5
    pass

# ... 其他測試
```

---

## 開發指引

### TDD 開發流程

#### 第 1 步: 環境準備(10 分鐘)
1. 確認 Task-003(API 基礎架構)已完成
2. 確認 Task-006(System API)已完成,API Keys 管理可用
3. 確認測試環境可運行: `pytest`
4. 閱讀相關 spec:
   - `tech-specs/backend/integrations.md#D-ID-API`
   - `tech-specs/backend/business-logic.md#虛擬主播生成`

#### 第 2 步: 撰寫 DIDClient 測試(30 分鐘)
1. 建立 `tests/integrations/test_did_client.py`
2. 撰寫測試 1-3(建立 talk、輪詢狀態、錯誤處理)
3. 執行測試 → 失敗(預期,因為還沒實作)

#### 第 3 步: 實作 DIDClient 基礎功能(60 分鐘)
1. 建立 `app/integrations/did_client.py`
2. 實作 `DIDClient.__init__()`
3. 實作 `create_talk()` 方法
4. 實作 `get_talk_status()` 方法(含輪詢邏輯)
5. 實作 `download_video()` 方法
6. 執行測試 1-3 → 通過 ✅

#### 第 4 步: 撰寫配額檢查測試(20 分鐘)
1. 撰寫測試 6-7(配額查詢、配額不足)
2. 執行測試 → 失敗

#### 第 5 步: 實作配額檢查功能(30 分鐘)
1. 實作 `check_quota()` 方法
2. 實作 `can_generate_avatar()` 方法
3. 實作 `QuotaExceededError` 異常類別
4. 執行測試 6-7 → 通過 ✅

#### 第 6 步: 撰寫 AvatarService 測試(30 分鐘)
1. 建立 `tests/services/test_avatar_service.py`
2. 撰寫測試 4-5(時長驗證)
3. 撰寫測試 8(Fallback 策略)
4. 執行測試 → 失敗

#### 第 7 步: 實作 AvatarService(90 分鐘)
1. 建立 `app/services/avatar_service.py`
2. 實作 `__init__()` 與依賴注入
3. 實作 `validate_duration()` 方法
4. 實作 `_get_audio_duration()` 與 `_get_video_duration()` 輔助方法
5. 實作 `generate_avatar_video()` 主流程
6. 實作 `generate_with_fallback()` 方法
7. 執行測試 4-5, 8 → 通過 ✅

#### 第 8 步: 撰寫完整流程整合測試(20 分鐘)
1. 撰寫測試 9(完整虛擬主播生成流程)
2. Mock 所有外部依賴(DIDClient, StorageService, DB)
3. 執行測試 → 失敗

#### 第 9 步: 實作 StorageService 擴充(40 分鐘)
1. 擴充 `app/core/storage.py`
2. 實作 `upload_temporary()` 方法
3. 實作 `delete_temporary()` 方法
4. 實作 `save_asset()` 方法
5. 執行測試 9 → 通過 ✅

#### 第 10 步: 配置與錯誤處理(30 分鐘)
1. 更新 `app/core/config.py` 添加 D-ID 設定
2. 實作 `DIDAPIError` 異常類別
3. 加強錯誤日誌記錄
4. 再次執行所有測試 → 通過 ✅

#### 第 11 步: 重構與優化(30 分鐘)
1. 檢查程式碼重複,提取共用邏輯
2. 改善錯誤訊息清晰度
3. 優化輪詢邏輯(避免無限等待)
4. 再次執行所有測試 → 通過 ✅

#### 第 12 步: 文件與檢查(30 分鐘)
1. 為所有方法添加完整 docstring
2. 檢查測試覆蓋率: `pytest --cov=app/integrations/did_client --cov=app/services/avatar_service`
3. 執行 linter: `ruff check .`
4. 格式化程式碼: `ruff format .`

---

### 注意事項

#### D-ID API 特殊要求
- ⚠️ 音訊檔案必須是可公開訪問的 URL(不能是本地路徑)
  - 需要實作臨時檔案上傳功能
  - 可使用 ngrok、AWS S3 presigned URL 或本地 HTTP 伺服器
- ⚠️ Presenter ID 和 Driver ID 影響生成品質
  - 使用預設值即可,或從配置讀取
- ⚠️ 輪詢間隔建議 5 秒,避免過於頻繁

#### 配額管理
- 💡 D-ID Basic Plan: 90 分鐘/月
- 💡 每支影片開場+結尾約 30 秒 = 0.5 分鐘
- 💡 月產能約 180 支影片
- 💡 配額不足時應提前警告用戶

#### 降級策略
- ✅ 虛擬主播失敗時不應中斷整體流程
- ✅ 跳過虛擬主播,改用純音訊 + 靜態圖片
- ✅ 在後續渲染階段(Task-015)處理 fallback 邏輯

#### 測試
- ✅ 使用 Mock 測試避免消耗配額
- ✅ 整合測試(測試 10)僅在必要時執行
- ✅ 測試應該可獨立執行,不依賴順序

#### 與其他模組整合
- 🔗 Task-014(Celery 任務)會呼叫 `generate_avatar_video()`
- 🔗 Task-015(影片渲染)會判斷是否有虛擬主播素材
- 🔗 Task-006(System API)提供 API Key 管理

---

### 完成檢查清單

#### 功能完整性
- [ ] DIDClient 所有方法實作完成(create_talk, get_talk_status, download_video, check_quota, can_generate_avatar)
- [ ] AvatarGenerationService 所有方法實作完成(generate_avatar_video, validate_duration, generate_with_fallback)
- [ ] StorageService 臨時檔案上傳功能完成
- [ ] 配額檢查與警告機制完成
- [ ] Fallback 策略正確實作

#### 測試
- [ ] 所有單元測試通過(測試 1-9)
- [ ] 測試覆蓋率 > 85%
  - `pytest --cov=app/integrations/did_client --cov=app/services/avatar_service --cov-report=term-missing`
- [ ] 測試可獨立執行,互不影響
- [ ] Mock 測試正確模擬 API 行為

#### 程式碼品質
- [ ] Ruff check 無錯誤: `ruff check .`
- [ ] 程式碼已格式化: `ruff format .`
- [ ] 所有方法都有 docstring
- [ ] 錯誤處理完整(try-except 覆蓋所有外部調用)
- [ ] 日誌記錄清晰(info, warning, error 適當使用)

#### 配置
- [ ] `.env.example` 包含 `DID_API_KEY` 範例
- [ ] `config.py` 包含所有 D-ID 相關設定
- [ ] 設定文件已更新(如有需要)

#### 整合
- [ ] 在本地環境手動測試完整流程(如有真實 API Key)
- [ ] 驗證與 StorageService 整合正常
- [ ] 驗證與資料庫(Asset model)整合正常
- [ ] 檢查配額追蹤邏輯正確

#### Spec 同步
- [ ] 如果實作與 spec 有差異,已更新 `tech-specs/backend/integrations.md`
- [ ] 如果有新的錯誤處理策略,已記錄到 spec
- [ ] 如果修改了配額檢查方式,已更新到 spec

---

## 預估時間分配

- 閱讀與準備: 10 分鐘
- 撰寫測試: 100 分鐘
- 實作 DIDClient: 90 分鐘
- 實作 AvatarService: 120 分鐘
- 實作 StorageService 擴充: 40 分鐘
- 配置與錯誤處理: 30 分鐘
- 重構優化: 30 分鐘
- 文件檢查: 30 分鐘

**總計: 約 7.5 小時**(預留 0.5 小時 buffer = 8 小時)

---

## 參考資源

### D-ID 官方文檔
- [D-ID API Documentation](https://docs.d-id.com/)
- [Create a Talk API](https://docs.d-id.com/reference/createtalk)
- [Get Talk API](https://docs.d-id.com/reference/gettalk)

### Python 套件文檔
- [httpx](https://www.python-httpx.org/) - 非同步 HTTP 客戶端
- [pytest](https://docs.pytest.org/) - 測試框架
- [pytest-asyncio](https://pytest-asyncio.readthedocs.io/) - 非同步測試支援

### 專案內部文件
- `tech-specs/backend/integrations.md` - 第三方整合設計
- `tech-specs/backend/business-logic.md` - 業務邏輯規格
- `tech-specs/backend/background-jobs.md` - 背景任務設計

### FFmpeg 文檔(用於時長取得)
- [ffprobe](https://ffmpeg.org/ffprobe.html) - 媒體檔案分析工具

---

**準備好了嗎?** 開始使用 TDD 方式實作 D-ID API 整合!🚀
