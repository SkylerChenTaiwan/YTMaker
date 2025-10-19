# Task-007: YouTube API 實作

> **建立日期：** 2025-10-19
> **狀態：** ⏳ 未開始
> **預計時間：** 6 小時
> **優先級：** P0 (必須)

---

## 關聯文件

### 產品設計
- **使用者流程：** `product-design/flows.md#Flow-0` (首次啟動)
- **使用者流程：** `product-design/flows.md#Flow-9` (YouTube 授權管理)

### 技術規格
- **API 規格：** `tech-specs/backend/api-youtube.md`
- **認證授權：** `tech-specs/backend/auth.md#YouTube OAuth`

### 相關任務
- **前置任務:** Task-002 ✅, Task-003 ✅
- **後續任務:** Task-013 (YouTube 上傳整合), Task-020 (首次設定頁面)
- **並行任務:** Task-004~006, 008, 009 (可並行開發)

---

## 任務目標

### 簡述
實作 YouTube OAuth 授權、頻道管理、metadata 設定 API。

### 成功標準
- [x] 4 個 API 端點全部實作
- [x] OAuth 2.0 流程完整
- [x] YouTubeAuthService 業務邏輯完整
- [x] 單元測試覆蓋率 > 80%

---

## API 端點清單 (4 個)

### 1. OAuth 授權
- `GET /api/v1/youtube/auth/url` - 取得授權 URL
- `POST /api/v1/youtube/auth/callback` - 處理 OAuth callback

### 2. 帳號管理
- `GET /api/v1/youtube/accounts` - 列出已連結帳號
- `DELETE /api/v1/youtube/accounts/:id` - 移除授權

---

## OAuth 2.0 流程

### 1. 取得授權 URL
```python
@router.get("/auth/url")
async def get_auth_url():
    flow = get_oauth_flow()
    auth_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true'
    )
    return {"auth_url": auth_url, "state": state}
```

### 2. 處理 Callback
```python
@router.post("/auth/callback")
async def handle_callback(code: str):
    flow = get_oauth_flow()
    flow.fetch_token(code=code)
    credentials = flow.credentials
    # 儲存 credentials
    # 取得頻道資訊
    return {"success": True, "channel": {...}}
```

---

## Pydantic Schemas

### YouTubeAccount
```python
class YouTubeAccount(BaseModel):
    id: int
    channel_id: str
    channel_name: str
    channel_thumbnail: Optional[str]
    subscriber_count: Optional[int]
    created_at: datetime
```

---

## 主要產出

### 1. API 路由檔案
- `backend/app/api/v1/youtube.py`

### 2. 業務邏輯檔案
- `backend/app/services/youtube_auth_service.py`

### 3. OAuth 模組
- `backend/app/security/youtube_oauth.py`

### 4. 測試檔案
- `backend/tests/api/test_youtube.py`
- `backend/tests/security/test_youtube_oauth.py`

---

## 驗證檢查

### API 測試
```bash
# 取得授權 URL
curl http://localhost:8000/api/v1/youtube/auth/url

# 列出帳號
curl http://localhost:8000/api/v1/youtube/accounts
```

---

## 完成檢查清單

- [ ] 4 個 API 端點實作完成
- [ ] OAuth 流程完整
- [ ] Token 刷新機制完成
- [ ] 單元測試完成
- [ ] 測試覆蓋率 > 80%
