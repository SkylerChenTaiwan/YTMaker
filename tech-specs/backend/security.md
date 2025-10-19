# 安全措施 (Security Measures)

## 關聯文件
- [認證與授權](./auth.md)
- [API 設計 - 系統初始化](./api-system.md)
- [資料模型](./database.md)

---

## 9. 安全措施

### 9.1 輸入驗證

**使用 Pydantic 驗證所有輸入：**

```python
from pydantic import BaseModel, Field, validator

class CreateProjectRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=500, max_length=10000)

    @validator('content')
    def validate_content(cls, v):
        # 檢查字元編碼
        try:
            v.encode('utf-8')
        except UnicodeEncodeError:
            raise ValueError('文字編碼必須為 UTF-8')
        return v

    @validator('name')
    def validate_name(cls, v):
        # 檢查特殊字元
        if any(char in v for char in ['/', '\\', ':', '*', '?', '"', '<', '>', '|']):
            raise ValueError('專案名稱不能包含特殊字元')
        return v
```

**API 輸入驗證範例：**
```python
from fastapi import FastAPI, HTTPException

app = FastAPI()

@app.post("/api/v1/projects")
async def create_project(request: CreateProjectRequest):
    try:
        # Pydantic 自動驗證輸入
        project = Project(
            name=request.name,
            content=request.content
        )
        db.add(project)
        db.commit()
        return {"success": True, "data": project}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
```

---

### 9.2 SQL Injection 防護

**使用 SQLAlchemy ORM：**
- 自動參數化查詢
- 避免手寫 SQL

**安全範例：**
```python
# ✅ 安全：使用 ORM
def get_project_by_name(name):
    return db.query(Project).filter(Project.name == name).first()

# ❌ 不安全：手寫 SQL（避免使用）
def get_project_by_name_unsafe(name):
    sql = f"SELECT * FROM projects WHERE name = '{name}'"  # 易受 SQL Injection 攻擊
    return db.execute(sql)
```

**必須使用原生 SQL 時的安全方式：**
```python
from sqlalchemy import text

def get_project_by_name_safe(name):
    sql = text("SELECT * FROM projects WHERE name = :name")
    return db.execute(sql, {"name": name})
```

---

### 9.3 敏感資料保護

#### 9.3.1 API Keys 保護

**儲存方式：**
- 使用作業系統 Keychain（不儲存到資料庫）
- 不寫入日誌檔案
- 不在錯誤訊息中顯示

**實作範例：**
```python
import keyring

# 儲存 API Key
def save_api_key(provider, api_key):
    keyring.set_password("ytmaker", provider, api_key)

# 讀取 API Key
def get_api_key(provider):
    return keyring.get_password("ytmaker", provider)

# 刪除 API Key
def delete_api_key(provider):
    keyring.delete_password("ytmaker", provider)
```

**日誌安全：**
```python
import logging

# 設定日誌過濾器
class SensitiveDataFilter(logging.Filter):
    def filter(self, record):
        # 移除 API Key
        if hasattr(record, 'msg'):
            record.msg = record.msg.replace(api_key, '***REDACTED***')
        return True

logger = logging.getLogger(__name__)
logger.addFilter(SensitiveDataFilter())
```

---

#### 9.3.2 OAuth Tokens 保護

**加密儲存：**
- 使用 Fernet (AES-128) 加密
- 加密金鑰從環境變數讀取

**實作範例：**
```python
from cryptography.fernet import Fernet
import os

# 從環境變數讀取加密金鑰
ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY')
cipher = Fernet(ENCRYPTION_KEY)

def encrypt_token(token):
    return cipher.encrypt(token.encode()).decode()

def decrypt_token(encrypted_token):
    return cipher.decrypt(encrypted_token.encode()).decode()

# 儲存加密的 Token
def save_oauth_token(access_token, refresh_token):
    encrypted_access = encrypt_token(access_token)
    encrypted_refresh = encrypt_token(refresh_token)

    account = YouTubeAccount(
        access_token=encrypted_access,
        refresh_token=encrypted_refresh,
        ...
    )
    db.add(account)
    db.commit()

# 讀取並解密 Token
def get_oauth_token(account_id):
    account = db.query(YouTubeAccount).get(account_id)
    return {
        'access_token': decrypt_token(account.access_token),
        'refresh_token': decrypt_token(account.refresh_token)
    }
```

**生成加密金鑰：**
```python
from cryptography.fernet import Fernet

# 初次設定時生成金鑰
key = Fernet.generate_key()
print(f"ENCRYPTION_KEY={key.decode()}")
# 將此金鑰儲存到 .env 檔案
```

---

### 9.4 錯誤訊息安全

**不洩漏系統資訊：**
```python
# ❌ 錯誤：洩漏系統路徑
def get_project_file(project_id):
    file_path = f"/Users/skyler/coding/YTMaker/data/project_{project_id}"
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=404,
            detail=f"File not found: {file_path}"  # 洩漏系統路徑
        )

# ✅ 正確：不洩漏系統資訊
def get_project_file(project_id):
    file_path = f"/Users/skyler/coding/YTMaker/data/project_{project_id}"
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=404,
            detail="專案檔案不存在"
        )
```

**統一錯誤處理：**
```python
from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # 記錄完整錯誤到日誌
    logger.error(f"Unhandled exception: {exc}", exc_info=True)

    # 返回安全的錯誤訊息給用戶
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "伺服器發生錯誤，請稍後再試"
            }
        }
    )
```

---

### 9.5 檔案上傳安全

#### 9.5.1 檔案類型驗證

**驗證檔案副檔名和 MIME 類型：**
```python
from fastapi import UploadFile
import magic

ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg']
ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg']

def validate_image_upload(file: UploadFile):
    # 檢查副檔名
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="不支援的檔案格式，僅支援 PNG 和 JPEG"
        )

    # 檢查 MIME 類型
    file_content = file.file.read(1024)
    mime_type = magic.from_buffer(file_content, mime=True)
    file.file.seek(0)  # 重置檔案指標

    if mime_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="檔案內容不符合允許的格式"
        )

    return True
```

---

#### 9.5.2 檔案大小限制

**限制上傳檔案大小：**
```python
from fastapi import Request

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

@app.middleware("http")
async def limit_upload_size(request: Request, call_next):
    if request.method == "POST":
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_FILE_SIZE:
            return JSONResponse(
                status_code=413,
                content={
                    "success": False,
                    "error": {
                        "code": "FILE_TOO_LARGE",
                        "message": "檔案大小超過限制（最大 10MB）"
                    }
                }
            )

    response = await call_next(request)
    return response
```

---

### 9.6 路徑遍歷防護

**驗證檔案路徑：**
```python
import os

def safe_join(base_path, user_path):
    # 規範化路徑
    abs_base = os.path.abspath(base_path)
    abs_user = os.path.abspath(os.path.join(base_path, user_path))

    # 確保用戶路徑在基礎路徑內
    if not abs_user.startswith(abs_base):
        raise ValueError("非法的檔案路徑")

    return abs_user

# 使用範例
def get_project_file(project_id, filename):
    base_path = "/Users/skyler/coding/YTMaker/data/projects"

    # ❌ 不安全：直接拼接路徑
    # file_path = os.path.join(base_path, project_id, filename)

    # ✅ 安全：驗證路徑
    file_path = safe_join(base_path, f"{project_id}/{filename}")

    return file_path
```

---

### 9.7 CORS 設定

**限制允許的來源：**
```python
from fastapi.middleware.cors import CORSMiddleware

# 本地端應用，只允許本機訪問
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React dev server
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

### 9.8 安全檢查清單

在開發和部署前，確認以下項目：

- [ ] 所有 API 輸入都使用 Pydantic 驗證
- [ ] 使用 SQLAlchemy ORM，避免 SQL Injection
- [ ] API Keys 儲存在 Keychain，不寫入資料庫
- [ ] OAuth Tokens 使用 Fernet 加密
- [ ] 錯誤訊息不洩漏系統路徑或敏感資訊
- [ ] 檔案上傳有類型和大小限制
- [ ] 檔案路徑使用安全驗證
- [ ] CORS 只允許本機訪問
- [ ] 日誌不包含敏感資料
- [ ] 環境變數不提交到版本控制
