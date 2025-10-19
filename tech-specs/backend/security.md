# 安全措施

> **關聯文件:** [auth.md](./auth.md), [overview.md](./overview.md)

---

## 1. 輸入驗證

### 使用 Pydantic

**自動驗證輸入:**

```python
from pydantic import BaseModel, Field, validator

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    content: str = Field(..., min_length=500, max_length=10000)

    @validator('content')
    def validate_content_length(cls, v):
        if len(v) < 500:
            raise ValueError("文字長度至少 500 字")
        return v
```

---

## 2. SQL 注入防護

### 使用 ORM 參數化查詢

```python
# ✅ 安全 (SQLAlchemy ORM)
project = db.query(Project).filter(Project.id == project_id).first()

# ❌ 不安全 (直接字串拼接)
query = f"SELECT * FROM projects WHERE id = '{project_id}'"
```

---

## 3. 檔案上傳安全

### 驗證檔案類型與大小

```python
ALLOWED_EXTENSIONS = {'.txt', '.md'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

def validate_file(file):
    """驗證上傳檔案"""
    # 檢查副檔名
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError("不支援的檔案格式")

    # 檢查檔案大小
    file.seek(0, os.SEEK_END)
    size = file.tell()
    if size > MAX_FILE_SIZE:
        raise ValueError("檔案大小超過限制")

    file.seek(0)
```

---

## 4. API Key 保護

### Keychain 儲存

```python
from app.security.keychain_manager import KeychainManager

# ✅ 安全儲存
KeychainManager.set_api_key("gemini", api_key)

# ✅ 不寫入日誌
logger.info("API Key updated")  # 不記錄 API Key 值
```

---

## 5. 速率限制

### 限制 API 調用頻率

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/projects/{id}/generate")
@limiter.limit("5/minute")
async def start_generate(request: Request, id: str):
    ...
```

---

## 總結

### 安全措施
- ✅ Pydantic 輸入驗證
- ✅ ORM 防止 SQL 注入
- ✅ 檔案上傳驗證
- ✅ API Key 安全儲存
- ✅ 速率限制
