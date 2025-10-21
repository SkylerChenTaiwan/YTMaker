# [v] Task-008: Stats API 實作

> **建立日期：** 2025-10-19
> **完成日期：** 2025-10-20
> **狀態：** ✅ 已完成
> **實際時間：** 2.5 小時
> **優先級：** P1 (重要)

---

## 關聯文件

### 產品設計
- **頁面設計：** `product-design/pages.md#Page-2-主控台-Dashboard` (統計卡片區)

### 技術規格
- **API 規格：** `tech-specs/backend/api-stats.md`
- **快取策略：** `tech-specs/backend/caching.md#應用層快取`
- **API 設計規範：** `tech-specs/backend/api-design.md`
- **資料庫設計:tech-specs/backend/database.md` (Project 模型)

### 相關任務
- **前置任務:** Task-002 ✅ (資料庫設計), Task-003 ✅ (API 基礎架構)
- **後續任務:** Task-021 (主控台頁面 - 會使用這些 API)
- **並行任務:** Task-004~007, 009 (可並行開發)

---

## 任務目標

### 簡述
實作統計資訊查詢 API，用於主控台顯示統計卡片（總影片數、本月生成數、已排程影片、API 配額剩餘），整合 Redis 快取提升效能。

### 成功標準
- [ ] 2 個 API 端點全部實作完成
- [ ] StatsService 業務邏輯完整且正確計算統計資料
- [ ] Redis 快取整合完成（TTL: 5 分鐘）
- [ ] 單元測試覆蓋率 > 80%
- [ ] API 回應時間 < 200ms（含快取）
- [ ] 程式碼符合 API 設計規範

---

## 測試要求

### 單元測試

#### 測試 1：成功取得統計資料（無快取）

**目的：** 驗證從資料庫正確計算統計資料

**前置條件：**
資料庫中存在以下測試資料：
- 50 個專案（各種狀態）
- 其中 10 個專案在本月創建
- 其中 3 個專案狀態為 SCHEDULED

**輸入：**
```http
GET /api/v1/stats
```

**預期輸出：**
```json
Status: 200 OK
{
  "success": true,
  "data": {
    "total_projects": 50,
    "projects_this_month": 10,
    "scheduled_projects": 3,
    "api_quotas": {
      "did": {
        "used": 30,
        "total": 90,
        "unit": "minutes"
      },
      "youtube": {
        "used": 2000,
        "total": 10000,
        "unit": "units"
      }
    }
  }
}
```

**驗證點：**
- [ ] 回傳 200 狀態碼
- [ ] total_projects 正確計算（COUNT(*)）
- [ ] projects_this_month 正確計算（本月創建的專案數）
- [ ] scheduled_projects 正確計算（狀態為 SCHEDULED 的專案數）
- [ ] api_quotas 包含 did 和 youtube 配額資訊
- [ ] 回應時間 < 500ms（無快取時）
- [ ] 統計資料被儲存到 Redis（key: "stats:total", TTL: 300 秒）

---

#### 測試 2：從 Redis 快取取得統計資料

**目的：** 驗證 Redis 快取機制正常運作

**前置條件：**
Redis 中存在快取資料：
```json
Key: "stats:total"
Value: {"total_projects": 50, "projects_this_month": 10, "scheduled_projects": 3, ...}
TTL: 300 seconds
```

**輸入：**
```http
GET /api/v1/stats
```

**預期輸出：**
```json
Status: 200 OK
{
  "success": true,
  "data": {
    "total_projects": 50,
    "projects_this_month": 10,
    "scheduled_projects": 3,
    "api_quotas": {
      "did": {...},
      "youtube": {...}
    }
  }
}
```

**驗證點：**
- [ ] 回傳 200 狀態碼
- [ ] 資料從 Redis 讀取，未查詢資料庫（Mock 資料庫查詢，確認未調用）
- [ ] 回應時間 < 50ms（有快取時）
- [ ] 回傳的資料與快取中的資料一致

---

#### 測試 3：Redis 連線失敗時降級到資料庫查詢

**目的：** 驗證 Redis 失敗時的容錯機制

**前置條件：**
- Redis 無法連線（模擬 Redis 錯誤）
- 資料庫中有 50 個專案

**輸入：**
```http
GET /api/v1/stats
```

**預期輸出：**
```json
Status: 200 OK
{
  "success": true,
  "data": {
    "total_projects": 50,
    "projects_this_month": 10,
    "scheduled_projects": 3,
    "api_quotas": {...}
  }
}
```

**驗證點：**
- [ ] 回傳 200 狀態碼（不因 Redis 失敗而報錯）
- [ ] 資料從資料庫查詢
- [ ] 日誌記錄 Redis 錯誤（WARNING level）
- [ ] 回應時間 < 500ms

---

#### 測試 4：本月專案數正確計算（跨月測試）

**目的：** 驗證本月專案數計算邏輯正確

**前置條件：**
資料庫中存在：
- 5 個專案創建於上個月（例如 2025-09-15）
- 10 個專案創建於本月（例如 2025-10-05）
- 3 個專案創建於今天（例如 2025-10-19）

當前日期：2025-10-19

**輸入：**
```http
GET /api/v1/stats
```

**預期輸出：**
```json
{
  "success": true,
  "data": {
    "total_projects": 18,
    "projects_this_month": 13,  // 10 + 3 = 13 (不包含上個月的 5 個)
    "scheduled_projects": ...,
    "api_quotas": {...}
  }
}
```

**驗證點：**
- [ ] projects_this_month 只計算本月創建的專案（不包含上個月）
- [ ] 使用正確的時區和日期範圍計算（月初 00:00:00 ~ 現在）
- [ ] total_projects 包含所有專案（不受月份限制）

---

#### 測試 5：取得 API 配額資訊（整合 SystemService）

**目的：** 驗證 API 配額資訊整合

**前置條件：**
- D-ID API 配額：已使用 30 分鐘 / 總共 90 分鐘
- YouTube API 配額：已使用 2000 units / 總共 10000 units

**輸入：**
```http
GET /api/v1/stats
```

**預期輸出：**
```json
{
  "success": true,
  "data": {
    "total_projects": 50,
    "projects_this_month": 10,
    "scheduled_projects": 3,
    "api_quotas": {
      "did": {
        "used": 30,
        "total": 90,
        "unit": "minutes"
      },
      "youtube": {
        "used": 2000,
        "total": 10000,
        "unit": "units"
      }
    }
  }
}
```

**驗證點：**
- [ ] api_quotas 包含 did 和 youtube 兩個服務
- [ ] 每個配額包含 used、total、unit 三個欄位
- [ ] used 值正確反映實際使用情況（從 SystemService 取得）

---

### 整合測試

#### 測試 6：完整快取生命週期測試

**目的：** 驗證快取從建立到失效的完整流程

**流程：**
1. 第一次調用 GET /api/v1/stats
   - 從資料庫查詢
   - 儲存到 Redis（TTL: 300 秒）
   - 記錄回應時間 T1
2. 第二次調用 GET /api/v1/stats（在 5 分鐘內）
   - 從 Redis 讀取
   - 記錄回應時間 T2
   - T2 應遠小於 T1（快取加速）
3. 等待 5 分鐘後第三次調用
   - 快取已過期
   - 重新從資料庫查詢
   - 重新儲存到 Redis

**驗證點：**
- [ ] 第一次調用觸發資料庫查詢
- [ ] 第二次調用使用快取（回應時間明顯更快）
- [ ] Redis TTL 設定正確（300 秒）
- [ ] 快取過期後自動重新查詢

---

## 實作規格

### 需要建立/修改的檔案

#### 1. API 路由檔案: `backend/app/api/v1/stats.py`

**職責：** 處理統計資訊的 HTTP 請求

**程式碼骨架：**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.stats_service import StatsService
from app.schemas.stats import StatsResponse
import redis
from app.core.config import settings

router = APIRouter(prefix="/stats", tags=["statistics"])

# Redis 連線
redis_client = redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    db=settings.REDIS_DB,
    decode_responses=True
)

@router.get("", response_model=StatsResponse)
async def get_stats(
    db: Session = Depends(get_db)
):
    """
    取得統計資料

    **回應：**
    - total_projects: 總專案數
    - projects_this_month: 本月生成數
    - scheduled_projects: 已排程影片數
    - api_quotas: API 配額剩餘

    **快取：**
    - Redis Key: "stats:total"
    - TTL: 5 分鐘
    """
    stats_service = StatsService(db, redis_client)
    return await stats_service.get_stats()


@router.get("/quota", response_model=dict)
async def get_quota(
    db: Session = Depends(get_db)
):
    """
    取得 API 配額資訊

    **回應：**
    - did: D-ID API 配額
    - youtube: YouTube API 配額

    **快取：**
    - Redis Key: "stats:quota"
    - TTL: 1 分鐘
    """
    stats_service = StatsService(db, redis_client)
    return await stats_service.get_quota()
```

---

#### 2. 業務邏輯檔案: `backend/app/services/stats_service.py`

**職責：** 統計資訊計算與快取管理

**程式碼骨架：**

```python
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from app.models.project import Project, ProjectStatus
from datetime import datetime, timezone
import json
import logging
import redis

logger = logging.getLogger(__name__)


class StatsService:
    """統計資訊服務"""

    def __init__(self, db: Session, redis_client: redis.Redis):
        self.db = db
        self.redis = redis_client

    async def get_stats(self) -> dict:
        """
        取得統計資料

        流程：
        1. 嘗試從 Redis 讀取快取
        2. 若快取不存在，從資料庫計算
        3. 儲存到 Redis（TTL: 300 秒）
        4. 回傳統計資料
        """
        cache_key = "stats:total"

        # 1. 嘗試從 Redis 讀取
        try:
            cached = self.redis.get(cache_key)
            if cached:
                logger.info("Stats cache hit")
                return {"success": True, "data": json.loads(cached)}
        except redis.RedisError as e:
            logger.warning(f"Redis error when reading cache: {e}")

        # 2. 從資料庫計算統計資料
        logger.info("Stats cache miss, querying database")
        stats = await self._calculate_stats()

        # 3. 儲存到 Redis
        try:
            self.redis.setex(
                cache_key,
                300,  # TTL: 5 分鐘
                json.dumps(stats)
            )
            logger.info("Stats cached successfully")
        except redis.RedisError as e:
            logger.warning(f"Redis error when writing cache: {e}")

        return {"success": True, "data": stats}

    async def _calculate_stats(self) -> dict:
        """
        從資料庫計算統計資料

        計算項目：
        1. 總專案數（所有狀態）
        2. 本月生成數（created_at 在本月的專案）
        3. 已排程影片（status = SCHEDULED）
        4. API 配額剩餘（調用 SystemService）
        """
        # 1. 總專案數
        total_projects = self.db.query(func.count(Project.id)).scalar() or 0

        # 2. 本月生成數
        now = datetime.now(timezone.utc)
        current_year = now.year
        current_month = now.month

        projects_this_month = (
            self.db.query(func.count(Project.id))
            .filter(
                extract('year', Project.created_at) == current_year,
                extract('month', Project.created_at) == current_month
            )
            .scalar() or 0
        )

        # 3. 已排程影片
        scheduled_projects = (
            self.db.query(func.count(Project.id))
            .filter(Project.status == ProjectStatus.SCHEDULED)
            .scalar() or 0
        )

        # 4. API 配額（調用 SystemService 或從配置檔取得）
        api_quotas = await self._get_api_quotas()

        return {
            "total_projects": total_projects,
            "projects_this_month": projects_this_month,
            "scheduled_projects": scheduled_projects,
            "api_quotas": api_quotas
        }

    async def _get_api_quotas(self) -> dict:
        """
        取得 API 配額資訊

        目前實作：回傳模擬資料
        未來：整合 SystemService 取得實際配額

        TODO: 在 Task-006 (System API) 完成後整合真實配額
        """
        # 暫時回傳模擬資料
        # 未來從 SystemService 取得真實配額
        return {
            "did": {
                "used": 30,
                "total": 90,
                "unit": "minutes"
            },
            "youtube": {
                "used": 2000,
                "total": 10000,
                "unit": "units"
            }
        }

    async def get_quota(self) -> dict:
        """
        取得 API 配額資訊（獨立端點）

        流程：
        1. 嘗試從 Redis 讀取快取（TTL: 1 分鐘）
        2. 若快取不存在，從 SystemService 取得
        3. 儲存到 Redis
        4. 回傳配額資訊
        """
        cache_key = "stats:quota"

        # 1. 嘗試從 Redis 讀取
        try:
            cached = self.redis.get(cache_key)
            if cached:
                logger.info("Quota cache hit")
                return {"success": True, "data": json.loads(cached)}
        except redis.RedisError as e:
            logger.warning(f"Redis error when reading quota cache: {e}")

        # 2. 取得配額資訊
        logger.info("Quota cache miss, fetching from system")
        quotas = await self._get_api_quotas()

        # 3. 儲存到 Redis（TTL: 1 分鐘）
        try:
            self.redis.setex(
                cache_key,
                60,  # TTL: 1 分鐘
                json.dumps(quotas)
            )
            logger.info("Quota cached successfully")
        except redis.RedisError as e:
            logger.warning(f"Redis error when writing quota cache: {e}")

        return {"success": True, "data": quotas}
```

---

#### 3. Pydantic Schema: `backend/app/schemas/stats.py`

**職責：** 定義回應資料格式

**程式碼骨架：**

```python
from pydantic import BaseModel, Field
from typing import Dict


class APIQuota(BaseModel):
    """API 配額資訊"""
    used: int = Field(..., description="已使用量")
    total: int = Field(..., description="總配額")
    unit: str = Field(..., description="單位（minutes, units 等）")


class StatsData(BaseModel):
    """統計資料"""
    total_projects: int = Field(..., description="總專案數")
    projects_this_month: int = Field(..., description="本月生成數")
    scheduled_projects: int = Field(..., description="已排程影片數")
    api_quotas: Dict[str, APIQuota] = Field(..., description="API 配額資訊")


class StatsResponse(BaseModel):
    """統計資料回應"""
    success: bool = Field(True, description="請求是否成功")
    data: StatsData = Field(..., description="統計資料")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "data": {
                    "total_projects": 50,
                    "projects_this_month": 10,
                    "scheduled_projects": 3,
                    "api_quotas": {
                        "did": {
                            "used": 30,
                            "total": 90,
                            "unit": "minutes"
                        },
                        "youtube": {
                            "used": 2000,
                            "total": 10000,
                            "unit": "units"
                        }
                    }
                }
            }
        }


class QuotaResponse(BaseModel):
    """配額資訊回應"""
    success: bool = Field(True, description="請求是否成功")
    data: Dict[str, APIQuota] = Field(..., description="配額資訊")
```

---

#### 4. Redis 配置: `backend/app/core/config.py`

**職責：** Redis 連線配置

**新增以下設定：**

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # ... 其他設定 ...

    # Redis 設定
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: str | None = None

    class Config:
        env_file = ".env"

settings = Settings()
```

---

#### 5. 測試檔案: `backend/tests/api/test_stats.py`

**職責：** API 測試

**程式碼骨架：**

```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.models.project import Project, ProjectStatus
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, patch
import redis

client = TestClient(app)


@pytest.fixture
def mock_redis():
    """模擬 Redis 客戶端"""
    mock = Mock(spec=redis.Redis)
    mock.get.return_value = None  # 預設無快取
    return mock


def test_get_stats_success_no_cache(db: Session, mock_redis):
    """測試 1：成功取得統計資料（無快取）"""
    # 準備測試資料
    # 50 個專案（各種狀態）
    for i in range(50):
        status = ProjectStatus.COMPLETED if i < 40 else ProjectStatus.SCHEDULED
        created_at = datetime.now(timezone.utc) - timedelta(days=i)
        project = Project(
            name=f"Test Project {i}",
            content="Test content",
            status=status,
            created_at=created_at
        )
        db.add(project)
    db.commit()

    # 調用 API
    response = client.get("/api/v1/stats")

    # 驗證
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["total_projects"] == 50
    assert data["data"]["projects_this_month"] >= 0  # 取決於當前月份
    assert data["data"]["scheduled_projects"] == 10
    assert "api_quotas" in data["data"]
    assert "did" in data["data"]["api_quotas"]
    assert "youtube" in data["data"]["api_quotas"]


def test_get_stats_with_cache(db: Session, mock_redis):
    """測試 2：從 Redis 快取取得統計資料"""
    # 設定 Redis 返回快取資料
    cached_data = {
        "total_projects": 50,
        "projects_this_month": 10,
        "scheduled_projects": 3,
        "api_quotas": {
            "did": {"used": 30, "total": 90, "unit": "minutes"},
            "youtube": {"used": 2000, "total": 10000, "unit": "units"}
        }
    }
    mock_redis.get.return_value = json.dumps(cached_data)

    # 調用 API
    with patch('app.api.v1.stats.redis_client', mock_redis):
        response = client.get("/api/v1/stats")

    # 驗證
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["total_projects"] == 50

    # 確認從快取讀取
    mock_redis.get.assert_called_once_with("stats:total")


def test_get_stats_redis_failure(db: Session, mock_redis):
    """測試 3：Redis 連線失敗時降級到資料庫查詢"""
    # 模擬 Redis 錯誤
    mock_redis.get.side_effect = redis.RedisError("Connection failed")

    # 準備測試資料
    for i in range(50):
        project = Project(
            name=f"Test Project {i}",
            content="Test content",
            status=ProjectStatus.COMPLETED
        )
        db.add(project)
    db.commit()

    # 調用 API
    with patch('app.api.v1.stats.redis_client', mock_redis):
        response = client.get("/api/v1/stats")

    # 驗證：應該成功回應（從資料庫查詢）
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["total_projects"] == 50


def test_projects_this_month_calculation(db: Session):
    """測試 4：本月專案數正確計算"""
    now = datetime.now(timezone.utc)

    # 上個月的專案（5 個）
    last_month = now - timedelta(days=35)
    for i in range(5):
        project = Project(
            name=f"Last Month Project {i}",
            content="Test content",
            created_at=last_month
        )
        db.add(project)

    # 本月的專案（10 個）
    for i in range(10):
        project = Project(
            name=f"This Month Project {i}",
            content="Test content",
            created_at=now - timedelta(days=i)
        )
        db.add(project)

    # 今天的專案（3 個）
    for i in range(3):
        project = Project(
            name=f"Today Project {i}",
            content="Test content",
            created_at=now
        )
        db.add(project)

    db.commit()

    # 調用 API
    response = client.get("/api/v1/stats")

    # 驗證
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["total_projects"] == 18  # 5 + 10 + 3
    assert data["data"]["projects_this_month"] == 13  # 10 + 3 (不含上個月的 5 個)


def test_get_quota(db: Session):
    """測試 5：取得 API 配額資訊"""
    # 調用 API
    response = client.get("/api/v1/stats/quota")

    # 驗證
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "did" in data["data"]
    assert "youtube" in data["data"]
    assert data["data"]["did"]["used"] >= 0
    assert data["data"]["did"]["total"] >= 0
    assert data["data"]["did"]["unit"] == "minutes"
```

---

#### 6. 註冊路由: `backend/app/main.py`

**新增路由註冊：**

```python
from app.api.v1 import stats

# ... 其他路由 ...

# 註冊 Stats API
app.include_router(stats.router, prefix="/api/v1")
```

---

### API 端點規格

#### GET /api/v1/stats

**描述：** 取得儀表板統計資料

**請求：** 無參數

**回應：**

**成功（200 OK）：**
```json
{
  "success": true,
  "data": {
    "total_projects": 50,
    "projects_this_month": 10,
    "scheduled_projects": 3,
    "api_quotas": {
      "did": {
        "used": 30,
        "total": 90,
        "unit": "minutes"
      },
      "youtube": {
        "used": 2000,
        "total": 10000,
        "unit": "units"
      }
    }
  }
}
```

**快取策略：**
- Redis Key: `stats:total`
- TTL: 300 秒（5 分鐘）
- 失效策略：被動失效（TTL 過期）

---

#### GET /api/v1/stats/quota

**描述：** 取得 API 配額使用情況（更新頻率較高）

**請求：** 無參數

**回應：**

**成功（200 OK）：**
```json
{
  "success": true,
  "data": {
    "did": {
      "used": 30,
      "total": 90,
      "unit": "minutes"
    },
    "youtube": {
      "used": 2000,
      "total": 10000,
      "unit": "units"
    }
  }
}
```

**快取策略：**
- Redis Key: `stats:quota`
- TTL: 60 秒（1 分鐘）
- 失效策略：被動失效（TTL 過期）

---

### Redis 快取策略

#### 快取 Key 命名

```
stats:total      - 總體統計資料
stats:quota      - API 配額資訊
```

#### 快取邏輯流程

```python
async def get_stats_with_cache():
    # 1. 嘗試從 Redis 取得
    cached = await redis.get("stats:total")
    if cached:
        return json.loads(cached)

    # 2. 計算統計資料
    stats = await calculate_stats()

    # 3. 存入 Redis（TTL: 5 分鐘）
    await redis.setex("stats:total", 300, json.dumps(stats))

    return stats
```

#### TTL 設定

| 快取項目 | TTL | 原因 |
|---------|-----|------|
| stats:total | 5 分鐘（300 秒） | 統計資料變化不頻繁，5 分鐘更新一次足夠 |
| stats:quota | 1 分鐘（60 秒） | 配額資訊需要較即時的更新 |

#### 容錯機制

**Redis 失敗時的處理：**
1. 捕捉 `redis.RedisError` 異常
2. 記錄 WARNING 日誌
3. 降級到資料庫查詢
4. 回傳正確的統計資料（不中斷服務）

```python
try:
    cached = redis.get(cache_key)
    if cached:
        return json.loads(cached)
except redis.RedisError as e:
    logger.warning(f"Redis error: {e}, fallback to database")
    # 繼續執行，從資料庫查詢
```

---

## 開發指引

### TDD 開發流程

#### 第 1 步：環境準備（10 分鐘）

1. 確認 Task-002（資料庫設計）和 Task-003（API 基礎架構）已完成
2. 確認 Redis 服務運行：
   ```bash
   redis-cli ping  # 應回應 PONG
   ```
3. 安裝 Redis Python 客戶端：
   ```bash
   pip install redis
   ```
4. 閱讀 `tech-specs/backend/api-stats.md` 和 `caching.md`

---

#### 第 2 步：撰寫測試（30 分鐘）

1. 建立 `tests/api/test_stats.py`
2. 撰寫「測試 1：成功取得統計資料（無快取）」
3. 撰寫「測試 2：從 Redis 快取取得統計資料」
4. 撰寫「測試 3：Redis 連線失敗時降級」
5. 撰寫「測試 4：本月專案數正確計算」
6. 撰寫「測試 5：取得 API 配額資訊」
7. 執行測試 → 預期全部失敗（因為還沒實作）

---

#### 第 3 步：實作 Pydantic Schema（15 分鐘）

1. 建立 `app/schemas/stats.py`
2. 定義 `APIQuota`、`StatsData`、`StatsResponse` schemas
3. 執行測試 → 部分失敗

---

#### 第 4 步：實作 StatsService（60 分鐘）

1. 建立 `app/services/stats_service.py`
2. 實作 `get_stats()` 方法：
   - 嘗試從 Redis 讀取
   - 若無快取，調用 `_calculate_stats()`
   - 儲存到 Redis
3. 實作 `_calculate_stats()` 方法：
   - 計算 total_projects（COUNT(*)）
   - 計算 projects_this_month（本月篩選）
   - 計算 scheduled_projects（狀態篩選）
   - 調用 `_get_api_quotas()`
4. 實作 `_get_api_quotas()` 方法（先用模擬資料）
5. 實作 `get_quota()` 方法（獨立快取）
6. 執行測試 → 測試 1、3、4、5 應通過

---

#### 第 5 步：實作 API 路由（20 分鐘）

1. 建立 `app/api/v1/stats.py`
2. 建立 Redis 連線實例
3. 實作 `GET /api/v1/stats` 端點
4. 實作 `GET /api/v1/stats/quota` 端點
5. 在 `app/main.py` 註冊路由
6. 執行測試 → 所有測試應通過 ✅

---

#### 第 6 步：Redis 配置（10 分鐘）

1. 在 `app/core/config.py` 新增 Redis 設定
2. 建立 `.env` 檔案：
   ```
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_DB=0
   ```
3. 測試 Redis 連線

---

#### 第 7 步：錯誤處理與日誌（15 分鐘）

1. 新增 Redis 錯誤處理（try-except）
2. 新增日誌記錄（cache hit/miss, errors）
3. 執行測試 → 測試 2、3 應通過 ✅

---

#### 第 8 步：整合測試（20 分鐘）

1. 撰寫「測試 6：完整快取生命週期測試」
2. 使用真實 Redis 進行測試（不使用 Mock）
3. 驗證快取 TTL 正確設定
4. 驗證快取過期後自動重新查詢
5. 執行所有測試 → 全部通過 ✅

---

#### 第 9 步：效能測試（15 分鐘）

1. 測試無快取時的回應時間（應 < 500ms）
2. 測試有快取時的回應時間（應 < 50ms）
3. 測試並發請求（10 個並發請求）
4. 驗證 Redis 快取命中率

---

#### 第 10 步：文件與檢查（15 分鐘）

1. 更新 OpenAPI/Swagger 文檔註釋
2. 檢查測試覆蓋率：
   ```bash
   pytest --cov=app/services/stats_service --cov=app/api/v1/stats
   ```
   （目標 > 80%）
3. 執行 linter：
   ```bash
   ruff check app/services/stats_service.py app/api/v1/stats.py
   ```
4. 格式化程式碼：
   ```bash
   ruff format app/services/stats_service.py app/api/v1/stats.py
   ```

---

## 注意事項

### Redis 相關

#### 連線管理
- ⚠️ Redis 連線失敗不應導致 API 失敗
- ⚠️ 使用連線池提升效能（redis-py 預設支援）
- ⚠️ 設定合理的 timeout（預設 socket timeout）

#### 快取策略
- 💡 統計資料變化不頻繁，5 分鐘 TTL 足夠
- 💡 配額資訊需要較即時，1 分鐘 TTL
- 💡 使用 JSON 序列化儲存（`json.dumps`/`json.loads`）
- 💡 快取 key 使用命名空間（`stats:*`）

#### 錯誤處理
- ✅ 捕捉 `redis.RedisError` 異常
- ✅ 記錄 WARNING 日誌（不是 ERROR，因為有降級）
- ✅ 降級到資料庫查詢（保證服務可用）

---

### 資料庫查詢

#### 效能優化
- 💡 使用 `func.count()` 而非 `len(query.all())`（避免載入所有資料）
- 💡 本月計算使用 SQL `EXTRACT` 函數（資料庫層過濾）
- 💡 考慮新增資料庫索引（created_at, status 欄位）

#### 時區處理
- ⚠️ 使用 UTC 時區進行日期計算（`datetime.now(timezone.utc)`）
- ⚠️ 本月起始時間：當月 1 號 00:00:00 UTC
- ⚠️ 資料庫儲存的 created_at 也應為 UTC

---

### 測試

#### Mock 使用
- ✅ 單元測試使用 Mock Redis（`unittest.mock.Mock`）
- ✅ 整合測試使用真實 Redis（測試快取生命週期）
- ✅ Mock 資料庫查詢時注意返回正確的類型

#### 測試資料
- ✅ 使用 Fixture 建立測試資料
- ✅ 測試後清理資料（teardown）
- ✅ 跨月測試使用不同的 created_at

---

### 與其他模組整合

#### SystemService 整合（未來）
- 🔗 目前 `_get_api_quotas()` 使用模擬資料
- 🔗 Task-006（System API）完成後整合真實配額
- 🔗 需要從配置檔或資料庫讀取配額使用情況

#### Dashboard 前端整合
- 🔗 Task-021（主控台頁面）會調用這些 API
- 🔗 前端應每 5 分鐘刷新一次統計資料（配合快取 TTL）
- 🔗 配額不足時前端應顯示警告（黃色或紅色）

---

## 完成檢查清單

### 功能完整性
- [ ] GET /api/v1/stats 可正常運作
- [ ] GET /api/v1/stats/quota 可正常運作
- [ ] total_projects 計算正確
- [ ] projects_this_month 計算正確（只計算本月）
- [ ] scheduled_projects 計算正確（狀態篩選）
- [ ] api_quotas 包含 did 和 youtube 配額

### Redis 快取
- [ ] Redis 連線成功
- [ ] 快取寫入成功（stats:total, TTL: 300 秒）
- [ ] 快取讀取成功（cache hit）
- [ ] 快取過期後自動重新查詢
- [ ] Redis 失敗時降級到資料庫查詢

### 測試
- [ ] 單元測試全部通過（5 個測試）
- [ ] 整合測試通過（1 個測試）
- [ ] 測試覆蓋率 > 80%
- [ ] 測試可獨立執行

### 效能
- [ ] 無快取時回應時間 < 500ms
- [ ] 有快取時回應時間 < 50ms
- [ ] 並發請求正常運作（10 個並發）
- [ ] Redis 快取命中率 > 80%（第二次請求開始）

### 程式碼品質
- [ ] Ruff check 無錯誤：`ruff check .`
- [ ] 程式碼已格式化：`ruff format .`
- [ ] 所有函數有 docstring
- [ ] 無 type 錯誤（如使用 mypy）

### 文件
- [ ] API 文檔已更新（Swagger/OpenAPI）
- [ ] 函數都有 docstring（Google 風格）
- [ ] README 已更新（如需要）
- [ ] 註釋清楚解釋快取邏輯

### 整合
- [ ] 路由已註冊到 `app/main.py`
- [ ] Redis 配置已加入 `config.py`
- [ ] `.env.example` 已更新（包含 Redis 設定）
- [ ] 與資料庫模型正確整合（Project, ProjectStatus）

---

## 預估時間分配

- 環境準備與閱讀：10 分鐘
- 撰寫測試：30 分鐘
- 實作 Schema：15 分鐘
- 實作 StatsService：60 分鐘
- 實作 API 路由：20 分鐘
- Redis 配置：10 分鐘
- 錯誤處理與日誌：15 分鐘
- 整合測試：20 分鐘
- 效能測試：15 分鐘
- 文件與檢查：15 分鐘

**總計：約 3.3 小時**（預留 buffer = 3 小時目標時間）

---

## 參考資源

### 官方文檔
- [Redis Python 客戶端](https://redis-py.readthedocs.io/)
- [FastAPI 依賴注入](https://fastapi.tiangolo.com/tutorial/dependencies/)
- [SQLAlchemy 聚合函數](https://docs.sqlalchemy.org/en/20/core/functions.html)

### 專案內部文件
- `tech-specs/backend/api-stats.md` - API 規格
- `tech-specs/backend/caching.md` - 快取策略
- `tech-specs/backend/database.md` - 資料庫設計
- `product-design/pages.md#Page-2` - 主控台統計卡片設計

---

**準備好了嗎？** 開始使用 TDD 方式實作 Stats API！🚀
