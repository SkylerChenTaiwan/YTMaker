# 快取策略

> **關聯文件:** [overview.md](./overview.md), [performance.md](./performance.md)

---

## 1. Redis 快取

### 快取內容

| 快取項目 | TTL | 說明 |
|---------|-----|------|
| Prompt 範本 | 1 小時 | 減少資料庫查詢 |
| 視覺配置 | 1 小時 | 配置較少變更 |
| 統計資料 | 5 分鐘 | 即時性要求低 |
| 進度資訊 | 無過期 | 任務完成後刪除 |

---

## 2. 快取實作

### CacheManager

```python
# app/utils/cache_manager.py
import redis
import json
from typing import Optional, Any

class CacheManager:
    """Redis 快取管理器"""

    def __init__(self):
        self.redis = redis.Redis(
            host='localhost',
            port=6379,
            db=0,
            decode_responses=True
        )

    def get(self, key: str) -> Optional[Any]:
        """取得快取

        Args:
            key: 快取鍵

        Returns:
            快取值或 None
        """
        value = self.redis.get(key)
        return json.loads(value) if value else None

    def set(
        self,
        key: str,
        value: Any,
        expire: int = 3600
    ) -> None:
        """設定快取

        Args:
            key: 快取鍵
            value: 快取值
            expire: 過期時間 (秒)
        """
        self.redis.setex(
            key,
            expire,
            json.dumps(value)
        )

    def delete(self, key: str) -> None:
        """刪除快取

        Args:
            key: 快取鍵
        """
        self.redis.delete(key)

    def exists(self, key: str) -> bool:
        """檢查快取是否存在

        Args:
            key: 快取鍵

        Returns:
            True 如果存在
        """
        return self.redis.exists(key) > 0
```

---

## 3. 快取使用範例

### Prompt 範本快取

```python
def get_prompt_template(template_id: str) -> PromptTemplate:
    """取得 Prompt 範本 (含快取)"""
    cache_key = f"prompt_template:{template_id}"

    # 嘗試從快取讀取
    cached = cache_manager.get(cache_key)
    if cached:
        return PromptTemplate(**cached)

    # 從資料庫查詢
    template = db.query(PromptTemplate).filter(
        PromptTemplate.id == template_id
    ).first()

    if template:
        # 寫入快取
        cache_manager.set(
            cache_key,
            template.dict(),
            expire=3600  # 1 小時
        )

    return template
```

---

## 4. 進度快取 (發布/訂閱)

### 發布進度更新

```python
def publish_progress(project_id: str, progress_data: dict):
    """發布進度更新到 Redis"""
    cache_manager.redis.publish(
        f"progress:{project_id}",
        json.dumps(progress_data)
    )
```

### 訂閱進度更新

```python
async def subscribe_progress(project_id: str):
    """訂閱進度更新"""
    pubsub = cache_manager.redis.pubsub()
    pubsub.subscribe(f"progress:{project_id}")

    for message in pubsub.listen():
        if message['type'] == 'message':
            yield json.loads(message['data'])
```

---

## 總結

### 快取策略
- ✅ Redis 快取減少資料庫查詢
- ✅ 合理的 TTL 設定
- ✅ 發布/訂閱模式支援即時更新
