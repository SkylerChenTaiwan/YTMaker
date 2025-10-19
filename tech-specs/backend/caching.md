# 快取策略 (Caching Strategy)

## 關聯文件
- [效能優化](./performance.md)
- [API 設計 - 統計與配額](./api-stats.md)
- [第三方整合](./integrations.md)

---

## 5. 快取策略

### 5.1 快取層級

#### 5.1.1 應用層快取

**使用 Redis**

**快取內容：**
- API 回應（Gemini、Stability AI）
- 模板資料
- 統計資料

**快取鍵命名：**
```
api:gemini:script:{content_hash}
api:stability:{prompt_hash}
template:prompt:{template_id}
stats:dashboard
```

**TTL 設定：**
- API 回應：1 小時
- 模板資料：永久（手動失效）
- 統計資料：5 分鐘

**快取範例：**
```python
# 快取 Gemini API 回應
def generate_script_with_cache(content, prompt_template):
    content_hash = hashlib.md5(content.encode()).hexdigest()
    cache_key = f"api:gemini:script:{content_hash}"

    # 檢查快取
    cached_result = redis.get(cache_key)
    if cached_result:
        return json.loads(cached_result)

    # 調用 API
    result = gemini_api.generate_script(content, prompt_template)

    # 儲存快取（1 小時）
    redis.setex(cache_key, 3600, json.dumps(result))

    return result
```

---

#### 5.1.2 資料庫查詢快取

**使用 SQLAlchemy Query Cache**

**快取內容：**
- 頻繁查詢的資料（配置列表、Prompt 列表）

**實作範例：**
```python
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import scoped_session, sessionmaker
from cachetools import TTLCache

# 建立快取（5 分鐘 TTL）
query_cache = TTLCache(maxsize=100, ttl=300)

def get_prompt_templates_cached():
    cache_key = "prompt_templates_list"

    if cache_key in query_cache:
        return query_cache[cache_key]

    templates = db.query(PromptTemplate).all()
    query_cache[cache_key] = templates

    return templates
```

---

### 5.2 快取失效策略

#### 5.2.1 主動失效

**更新資料時主動刪除快取：**
```python
# 更新 Prompt 範本時
def update_prompt_template(template_id, new_content):
    # 更新資料庫
    db.update(template_id, new_content)
    # 刪除快取
    redis.delete(f"template:prompt:{template_id}")
    redis.delete("prompt_templates_list")
```

**觸發時機：**
- 建立新模板時：刪除列表快取
- 更新模板時：刪除列表快取 + 單一模板快取
- 刪除模板時：刪除列表快取 + 單一模板快取

---

#### 5.2.2 被動失效（TTL）

**依資料更新頻率設定 TTL：**
- 靜態資料（模板）：長 TTL（1 小時以上）或永久
- 動態資料（統計）：短 TTL（5 分鐘）
- 外部 API 回應：中等 TTL（1 小時）

---

### 5.3 快取策略最佳實踐

#### 5.3.1 快取鍵設計原則

1. **使用命名空間**
   - 避免鍵衝突
   - 便於批量刪除

2. **包含版本資訊**
   - 資料結構變更時可平滑遷移
   - 範例：`api:v1:gemini:script:{hash}`

3. **使用內容雜湊**
   - 對於依賴內容的快取，使用 MD5/SHA256 雜湊
   - 確保相同輸入得到相同快取

#### 5.3.2 避免快取穿透

**空值快取：**
```python
def get_project_with_cache(project_id):
    cache_key = f"project:{project_id}"

    # 檢查快取
    cached = redis.get(cache_key)
    if cached == "null":
        return None
    if cached:
        return json.loads(cached)

    # 查詢資料庫
    project = db.query(Project).get(project_id)

    # 快取結果（包括空值）
    if project is None:
        redis.setex(cache_key, 60, "null")  # 短 TTL
    else:
        redis.setex(cache_key, 3600, json.dumps(project))

    return project
```

#### 5.3.3 快取預熱

**系統啟動時預載常用資料：**
```python
def warm_up_cache():
    # 預載 Prompt 範本
    templates = db.query(PromptTemplate).all()
    for template in templates:
        cache_key = f"template:prompt:{template.id}"
        redis.set(cache_key, json.dumps(template))

    # 預載配置模板
    configs = db.query(Configuration).all()
    for config in configs:
        cache_key = f"config:{config.id}"
        redis.set(cache_key, json.dumps(config))
```
