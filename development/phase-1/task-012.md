# Task-012: D-ID API 整合（虛擬主播）

> **建立日期：** 2025-10-19
> **狀態：** ⏳ 未開始
> **預計時間：** 8 小時
> **優先級：** P0 (必須)

---

## 關聯文件

### 產品設計
- **產品概述：** `product-design/overview.md#核心功能-3-虛擬主播`
- **使用者流程：** `product-design/flows.md#Flow-1` (素材生成階段)

### 技術規格
- **第三方整合：** `tech-specs/backend/integrations.md#D-ID API`
- **業務邏輯：** `tech-specs/backend/business-logic.md#虛擬主播生成`

### 相關任務
- **前置任務:** Task-003 ✅, Task-006 ✅
- **後置任務:** Task-014 (Celery 任務), Task-015 (影片渲染)
- **並行任務:** Task-010, 011, 013 (可並行開發)

---

## 任務目標

### 簡述
整合 D-ID API，生成虛擬主播影片（開場、結尾），實作嘴型同步驗證、時長驗證、配額監控。

### 成功標準
- [x] DIDClient 類別完整實作
- [x] AvatarGenerationService 業務邏輯完整
- [x] 嘴型同步驗證完成
- [x] 時長驗證（誤差 < 5%）完成
- [x] 配額監控（90 分鐘/月）完成
- [x] 錯誤處理與 fallback 完成
- [x] 單元測試與 Mock 完成

---

## 主要產出

### 1. D-ID 客戶端
```python
# backend/app/integrations/did_client.py
class DIDClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.endpoint = "https://api.d-id.com/talks"

    async def create_talk(
        self,
        audio_url: str,
        presenter_id: str = "amy-jcwCkr1grs",
        driver_id: str = "uM00QMwJ9x"
    ) -> str:
        """
        建立虛擬主播影片

        Returns:
            talk_id: 影片 ID
        """
        pass

    async def get_talk_status(self, talk_id: str) -> Dict:
        """查詢生成狀態"""
        pass

    async def download_video(self, video_url: str) -> bytes:
        """下載生成的影片"""
        pass
```

### 2. 虛擬主播生成服務
```python
# backend/app/services/avatar_service.py
class AvatarGenerationService:
    async def generate_avatar_video(
        self,
        project_id: int,
        audio_file_path: str,
        segment_type: Literal["intro", "outro"]
    ) -> Asset:
        """
        生成虛擬主播影片

        流程：
        1. 上傳音訊到臨時儲存
        2. 調用 D-ID API 建立 talk
        3. 輪詢狀態（等待生成完成）
        4. 下載影片
        5. 驗證嘴型同步與時長
        6. 儲存檔案
        7. 建立 Asset 記錄
        """
        pass

    def validate_video(
        self,
        video_path: str,
        audio_duration: float
    ) -> Dict[str, bool]:
        """
        驗證影片品質

        檢查項目：
        - 時長匹配（誤差 < 5%）
        - 嘴型同步（目視或自動檢測）
        """
        pass
```

---

## D-ID API 流程

### 1. 建立 Talk
```python
POST https://api.d-id.com/talks
{
  "source_url": "https://...",  # Presenter 圖片
  "script": {
    "type": "audio",
    "audio_url": "https://..."  # 音訊 URL
  },
  "config": {
    "driver_id": "uM00QMwJ9x"  # 驅動模型
  }
}

# 回應
{
  "id": "talk_123",
  "status": "created"
}
```

### 2. 輪詢狀態
```python
GET https://api.d-id.com/talks/{talk_id}

# 回應
{
  "id": "talk_123",
  "status": "done",  # created | started | done | error
  "result_url": "https://..."  # 影片下載連結
}
```

### 3. 下載影片
```python
GET {result_url}
# 下載 MP4 檔案
```

---

## 時長驗證

### 驗證邏輯
```python
def validate_duration(video_duration: float, audio_duration: float) -> bool:
    """
    驗證影片時長是否與音訊匹配

    允許誤差：5%
    """
    error_rate = abs(video_duration - audio_duration) / audio_duration
    return error_rate < 0.05
```

### 處理時長不符
```python
if not validate_duration(video_duration, audio_duration):
    logger.warning(f"Duration mismatch: video={video_duration}s, audio={audio_duration}s")

    # 重試選項
    # 1. 重新生成（最多 3 次）
    # 2. 跳過虛擬主播（使用純音訊 + 圖片）
    # 3. 接受誤差（如果 < 10%）
```

---

## 配額監控

### D-ID 配額
- **Basic Plan:** 90 分鐘/月
- **每支影片:** 開場（~15 秒）+ 結尾（~15 秒）= 0.5 分鐘
- **月產能:** 90 / 0.5 = 180 支

### 配額檢查
```python
async def check_quota(self) -> Dict[str, Any]:
    """
    查詢 D-ID 配額

    Returns:
        {
            "used_minutes": 45,
            "total_minutes": 90,
            "remaining_minutes": 45,
            "percentage_used": 50
        }
    """
    # 調用 D-ID API 查詢配額
    pass

async def can_generate_avatar(self, estimated_duration: int) -> bool:
    """檢查是否有足夠配額"""
    quota = await self.check_quota()
    return quota["remaining_minutes"] >= (estimated_duration / 60)
```

---

## 錯誤處理與 Fallback

### 錯誤類型
- `401 Unauthorized` - API Key 無效
- `402 Payment Required` - 配額用盡
- `422 Unprocessable Entity` - 音訊格式錯誤
- `500 Internal Error` - 伺服器錯誤（重試）

### Fallback 策略
```python
async def generate_with_fallback(
    self,
    project_id: int,
    audio_path: str,
    segment_type: str
) -> Optional[Asset]:
    """
    嘗試生成虛擬主播，失敗時返回 None

    Fallback 方案：
    - 跳過虛擬主播功能
    - 使用純音訊 + 靜態圖片代替
    """
    try:
        return await self.generate_avatar_video(project_id, audio_path, segment_type)
    except QuotaExceededError:
        logger.warning("D-ID quota exceeded, skipping avatar")
        return None
    except Exception as e:
        logger.error(f"Avatar generation failed: {e}")
        # 重試 3 次後 fallback
        return None
```

---

## 驗證檢查

### 單元測試
```bash
pytest tests/integrations/test_did_client.py -v
pytest tests/services/test_avatar_service.py -v
# 測試覆蓋率 > 80%
```

### 整合測試
```bash
# 需要真實的 D-ID API Key
pytest tests/integration/test_avatar_generation.py --api-key=YOUR_KEY
```

---

## 完成檢查清單

- [ ] DIDClient 類別實作完成
- [ ] AvatarGenerationService 完成
- [ ] 嘴型同步驗證完成
- [ ] 時長驗證完成
- [ ] 配額監控完成
- [ ] 錯誤處理與 fallback 完成
- [ ] 單元測試完成（含 Mock）
- [ ] 整合測試完成
- [ ] 測試覆蓋率 > 80%
