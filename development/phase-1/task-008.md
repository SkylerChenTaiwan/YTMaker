# Task-008: Stats API 實作

> **建立日期：** 2025-10-19
> **狀態：** ⏳ 未開始
> **預計時間：** 3 小時
> **優先級：** P1 (重要)

---

## 關聯文件

### 產品設計
- **頁面設計：** `product-design/pages.md#Page-2` (主控台)

### 技術規格
- **API 規格：** `tech-specs/backend/api-stats.md`
- **快取策略：** `tech-specs/backend/caching.md`

### 相關任務
- **前置任務:** Task-002 ✅, Task-003 ✅
- **後續任務:** Task-021 (主控台頁面)
- **並行任務:** Task-004~007, 009 (可並行開發)

---

## 任務目標

### 簡述
實作統計資訊查詢 API，用於主控台顯示統計卡片，整合 Redis 快取。

### 成功標準
- [x] 2 個 API 端點全部實作
- [x] StatsService 業務邏輯完整
- [x] Redis 快取整合完成
- [x] 單元測試覆蓋率 > 80%

---

## API 端點清單 (2 個)

### 1. 統計資訊
- `GET /api/v1/stats` - 取得總體統計
- `GET /api/v1/stats/quota` - 取得配額使用情況

---

## Pydantic Schemas

### StatsResponse
```python
class StatsResponse(BaseModel):
    total_videos: int
    monthly_videos: int
    scheduled_videos: int
    api_quota_remaining: Dict[str, int]
```

---

## Redis 快取策略

### 快取 Key
- `stats:total` - 總體統計（TTL: 5 分鐘）
- `stats:quota` - 配額統計（TTL: 1 分鐘）

### 快取邏輯
```python
async def get_stats():
    # 嘗試從 Redis 取得
    cached = await redis.get("stats:total")
    if cached:
        return json.loads(cached)

    # 計算統計
    stats = await calculate_stats()

    # 存入 Redis
    await redis.setex("stats:total", 300, json.dumps(stats))
    return stats
```

---

## 主要產出

### 1. API 路由檔案
- `backend/app/api/v1/stats.py`

### 2. 業務邏輯檔案
- `backend/app/services/stats_service.py`

### 3. 測試檔案
- `backend/tests/api/test_stats.py`

---

## 完成檢查清單

- [ ] 2 個 API 端點實作完成
- [ ] Redis 快取整合完成
- [ ] 單元測試完成
- [ ] 測試覆蓋率 > 80%
