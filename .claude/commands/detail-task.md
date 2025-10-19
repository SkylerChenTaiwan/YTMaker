# Detail Task Command

填充單一 task 的詳細內容。

**用途：** 當你使用 `/plan-phase` 生成了 task 骨架後，使用此命令來填充單一 task 的完整詳細內容。

**重要：** 此命令一次只處理一個 task，因為一個上下文專注於填寫一個詳細的 task 已經很夠了。

---

## 使用方式

### 基本用法

```
/detail-task 001
/detail-task task-001
/detail-task 3
```

提供 task 編號即可，格式可以是：
- `001` - 只有編號
- `task-001` - 完整格式
- `3` - 不補零也可以

---

## 執行流程

### Step 1: 讀取並分析

我會自動讀取並分析：

#### 1. Task 骨架文件
- 讀取 `development/phase-X/task-XXX.md`
- 提取任務目標、關聯 spec、前後置任務等資訊

#### 2. Phase Overview
- 讀取 `development/phase-X/overview.md`
- 了解此 task 在整體規劃中的位置
- 確認依賴關係和執行順序

#### 3. 關聯的 Spec 文件
根據 task 骨架中列出的關聯 spec，讀取：
- `product-design/*.md` - 產品設計文件
- `tech-specs/backend/*.md` - 後端規格
- `tech-specs/frontend/*.md` - 前端規格
- `tech-specs/framework.md` - 技術框架

---

### Step 2: 分析任務性質

我會判斷這個 task 的類型：

**後端 API 任務**
- 需要實作的 API 端點
- 資料驗證規則
- 錯誤處理
- 權限檢查

**前端頁面/元件任務**
- 頁面結構和佈局
- 元件層級架構
- 狀態管理
- API 整合

**資料庫任務**
- Schema 設計
- Migration 腳本
- 索引優化
- 關聯關係

**整合/測試任務**
- 測試範圍
- 測試策略
- 測試工具

---

### Step 3: 生成詳細內容

根據任務性質，生成完整的 task 文件內容：

#### 1. 關聯文件（更新）
更新並補充關聯的 spec 和產品設計文件，具體到章節。

#### 2. 任務目標（擴充）
- 詳細的成功標準
- 可驗證的檢查點
- 預期產出

#### 3. 測試要求（重點！）

**單元測試（3-5 個）**
每個測試包含：
```markdown
#### 測試 X：[測試名稱]

**目的：** [測試什麼]

**輸入：**
```json/typescript
[具體的測試資料]
```

**預期輸出：**
```json/typescript
[預期的回傳結果]
```

**驗證點：**
- [ ] [檢查點 1]
- [ ] [檢查點 2]
- [ ] [檢查點 3]
```

**整合測試（如適用）**
- API 整合測試
- 跨模組測試
- 資料流測試

**E2E 測試（如適用）**
- 完整使用者流程測試

#### 4. 實作規格（詳細）

**需要建立/修改的檔案**
列出每個檔案的：
- 完整路徑
- 職責說明
- 主要方法/函數
- 程式碼骨架（如適用）

**API 端點（如果是後端任務）**
```
POST /api/v1/xxx
Request Body: {...}
Response: {...}
Status Codes: ...
```

**元件架構（如果是前端任務）**
```
ComponentName/
├── index.tsx
├── styles.module.css
└── types.ts
```

**資料流程**
- 請求/回應流程
- 狀態變化流程
- 錯誤處理流程

#### 5. 開發指引

**TDD 流程（step-by-step）**
1. 閱讀相關 spec
2. 撰寫測試 1
3. 實作功能讓測試通過
4. 撰寫測試 2
5. ...
6. 重構
7. 檢查測試覆蓋率

**注意事項**
- 技術陷阱
- 效能考量
- 安全性檢查
- 與其他模組的整合點

**完成檢查清單**
- [ ] 所有測試通過
- [ ] 測試覆蓋率 > 80%
- [ ] Spec 已同步（如有修改）
- [ ] 程式碼已格式化
- [ ] 無 linter 警告
- [ ] 文件已更新

---

## 輸出範例

填充後的 task 文件會是一個**完整可用**的開發指南：

````markdown
# Task-003: 用戶認證 API 實作

> **建立日期：** 2025-01-19
> **狀態：** ⏳ 未開始
> **預計時間：** 4 小時
> **優先級：** P0

---

## 關聯文件

### 產品設計
- **User Flow:** `product-design/flows.md#Flow-1-用戶註冊登入流程`
- **頁面設計:** `product-design/pages.md#Page-02-登入頁面`

### 技術規格
- **後端規格:** `tech-specs/backend/auth.md#認證系統設計`
- **API 設計:** `tech-specs/backend/api-design.md#RESTful-API-規範`
- **資料庫:** `tech-specs/backend/database.md#users-資料表`

### 相關任務
- **前置任務:** Task-001 ✅, Task-002 ✅
- **後續任務:** Task-004, Task-017
- **可並行:** Task-005, Task-006

---

## 任務目標

### 簡述
實作完整的用戶認證 API，包含註冊、登入、登出功能，支援 JWT token 生成與驗證，符合 OAuth 2.0 標準。

### 成功標準
- [ ] POST /api/auth/register 實作完成且測試通過
- [ ] POST /api/auth/login 實作完成且測試通過
- [ ] POST /api/auth/logout 實作完成且測試通過
- [ ] JWT token 生成與驗證功能正常
- [ ] 密碼使用 bcrypt 加密
- [ ] 所有錯誤情境都有適當處理
- [ ] API 文檔已更新（Swagger）
- [ ] 單元測試覆蓋率 > 90%

---

## 測試要求

### 單元測試

#### 測試 1：成功註冊新用戶

**目的：** 驗證用戶可以成功註冊並收到 JWT token

**輸入：**
```json
POST /api/auth/register
{
  "email": "test@example.com",
  "password": "SecurePass123!",
  "username": "testuser"
}
```

**預期輸出：**
```json
Status: 201 Created
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-v4",
      "email": "test@example.com",
      "username": "testuser",
      "createdAt": "2025-01-19T10:00:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**驗證點：**
- [ ] 回傳 201 狀態碼
- [ ] 資料庫中新增了 user 記錄
- [ ] 密碼已使用 bcrypt 加密儲存（不是明文）
- [ ] JWT token 有效且可解碼
- [ ] Token payload 包含 userId 和 email
- [ ] 回傳的 user 物件不包含 password

---

#### 測試 2：Email 已存在時註冊失敗

**目的：** 驗證系統防止重複 email 註冊

**前置條件：**
資料庫中已存在 email 為 "existing@example.com" 的用戶

**輸入：**
```json
POST /api/auth/register
{
  "email": "existing@example.com",
  "password": "AnotherPass456!",
  "username": "newuser"
}
```

**預期輸出：**
```json
Status: 409 Conflict
{
  "success": false,
  "error": {
    "code": "EMAIL_ALREADY_EXISTS",
    "message": "此 Email 已被註冊"
  }
}
```

**驗證點：**
- [ ] 回傳 409 狀態碼
- [ ] 錯誤訊息清楚
- [ ] 未新增重複的 user 記錄
- [ ] 未產生 token

---

#### 測試 3：密碼格式不符合要求時註冊失敗

**目的：** 驗證密碼強度驗證

**輸入：**
```json
POST /api/auth/register
{
  "email": "test@example.com",
  "password": "123",
  "username": "testuser"
}
```

**預期輸出：**
```json
Status: 400 Bad Request
{
  "success": false,
  "error": {
    "code": "INVALID_PASSWORD",
    "message": "密碼必須至少 8 個字元，包含大小寫字母和數字",
    "field": "password"
  }
}
```

**驗證點：**
- [ ] 回傳 400 狀態碼
- [ ] 錯誤訊息包含密碼要求說明
- [ ] 未新增 user 記錄

---

#### 測試 4：成功登入

**目的：** 驗證已註冊用戶可以成功登入

**前置條件：**
資料庫中存在用戶：
- email: "user@example.com"
- password: "ValidPass123!" (bcrypt hash)

**輸入：**
```json
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "ValidPass123!"
}
```

**預期輸出：**
```json
Status: 200 OK
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "existinguser"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**驗證點：**
- [ ] 回傳 200 狀態碼
- [ ] 密碼驗證使用 bcrypt.compare
- [ ] 回傳有效的 JWT token
- [ ] Token 包含正確的 user 資訊

---

#### 測試 5：密碼錯誤時登入失敗

**目的：** 驗證密碼驗證機制

**輸入：**
```json
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "WrongPassword!"
}
```

**預期輸出：**
```json
Status: 401 Unauthorized
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email 或密碼錯誤"
  }
}
```

**驗證點：**
- [ ] 回傳 401 狀態碼
- [ ] 錯誤訊息不透露是 email 還是密碼錯誤（安全性）
- [ ] 未產生 token

---

### 整合測試

#### 測試 6：完整註冊登入流程

**目的：** 驗證註冊後可立即登入

**流程：**
1. 註冊新用戶 → 取得 token1
2. 使用 token1 存取受保護的端點 → 成功
3. 登出
4. 再次登入 → 取得 token2
5. 使用 token2 存取受保護的端點 → 成功

**驗證點：**
- [ ] 整個流程無錯誤
- [ ] Token 可正常使用
- [ ] 登出後舊 token 失效（如有實作 token revocation）

---

## 實作規格

### 需要建立/修改的檔案

#### 1. Controller: `backend/app/api/v1/auth.py`

**職責：** 處理認證相關的 HTTP 請求

**方法：**

```python
from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.auth import RegisterRequest, LoginRequest, AuthResponse
from app.services.auth_service import AuthService
from app.core.security import create_access_token

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(
    data: RegisterRequest,
    auth_service: AuthService = Depends()
):
    """
    註冊新用戶

    - **email**: 用戶 email (唯一)
    - **password**: 密碼 (最少 8 字元，包含大小寫和數字)
    - **username**: 用戶名稱
    """
    # 實作註冊邏輯
    pass

@router.post("/login", response_model=AuthResponse)
async def login(
    data: LoginRequest,
    auth_service: AuthService = Depends()
):
    """
    用戶登入

    - **email**: 用戶 email
    - **password**: 密碼
    """
    # 實作登入邏輯
    pass

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    token: str = Depends(get_current_token)
):
    """
    用戶登出（如果實作 token revocation）
    """
    # 實作登出邏輯
    pass
```

---

#### 2. Service: `backend/app/services/auth_service.py`

**職責：** 認證業務邏輯

**方法：**

```python
from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest
from app.core.security import hash_password, verify_password, create_access_token
from fastapi import HTTPException, status

class AuthService:
    def __init__(self, db: Session):
        self.db = db

    async def register_user(self, data: RegisterRequest) -> dict:
        """
        註冊新用戶

        1. 檢查 email 是否已存在
        2. 驗證密碼強度
        3. Hash 密碼
        4. 建立 user 記錄
        5. 生成 JWT token
        """
        # 檢查 email
        existing_user = self.db.query(User).filter(User.email == data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"code": "EMAIL_ALREADY_EXISTS", "message": "此 Email 已被註冊"}
            )

        # 驗證密碼強度
        if not self._validate_password(data.password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "INVALID_PASSWORD",
                    "message": "密碼必須至少 8 個字元，包含大小寫字母和數字",
                    "field": "password"
                }
            )

        # Hash 密碼並建立用戶
        hashed_password = hash_password(data.password)
        user = User(
            email=data.email,
            username=data.username,
            password_hash=hashed_password
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        # 生成 token
        token = create_access_token({"sub": str(user.id), "email": user.email})

        return {"user": user, "token": token}

    async def login_user(self, data: LoginRequest) -> dict:
        """
        用戶登入

        1. 查找用戶
        2. 驗證密碼
        3. 生成 JWT token
        """
        user = self.db.query(User).filter(User.email == data.email).first()

        if not user or not verify_password(data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"code": "INVALID_CREDENTIALS", "message": "Email 或密碼錯誤"}
            )

        token = create_access_token({"sub": str(user.id), "email": user.email})

        return {"user": user, "token": token}

    def _validate_password(self, password: str) -> bool:
        """驗證密碼強度"""
        if len(password) < 8:
            return False
        if not any(c.isupper() for c in password):
            return False
        if not any(c.islower() for c in password):
            return False
        if not any(c.isdigit() for c in password):
            return False
        return True
```

---

#### 3. Schemas: `backend/app/schemas/auth.py`

**職責：** Request/Response 資料驗證

```python
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    username: str = Field(..., min_length=2, max_length=50)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    created_at: datetime

    class Config:
        from_attributes = True

class AuthResponse(BaseModel):
    success: bool = True
    data: dict  # {"user": UserResponse, "token": str}
```

---

#### 4. Security Utils: `backend/app/core/security.py`

**職責：** 密碼 hash、JWT token 處理

```python
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """使用 bcrypt hash 密碼"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """驗證密碼"""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    """生成 JWT token"""
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=24)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")

    return encoded_jwt
```

---

#### 5. 測試檔案: `backend/tests/api/test_auth.py`

**職責：** API 測試

```python
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_register_success():
    """測試 1：成功註冊"""
    response = client.post("/api/v1/auth/register", json={
        "email": "test@example.com",
        "password": "SecurePass123!",
        "username": "testuser"
    })

    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert "token" in data["data"]
    assert data["data"]["user"]["email"] == "test@example.com"

def test_register_duplicate_email():
    """測試 2：重複 email"""
    # 先註冊一次
    client.post("/api/v1/auth/register", json={
        "email": "duplicate@example.com",
        "password": "SecurePass123!",
        "username": "user1"
    })

    # 再次註冊相同 email
    response = client.post("/api/v1/auth/register", json={
        "email": "duplicate@example.com",
        "password": "AnotherPass456!",
        "username": "user2"
    })

    assert response.status_code == 409
    data = response.json()
    assert data["error"]["code"] == "EMAIL_ALREADY_EXISTS"

# ... 其他測試
```

---

### API 端點規格

#### POST /api/v1/auth/register

**請求：**
```json
{
  "email": "string (email format)",
  "password": "string (min 8 chars)",
  "username": "string (2-50 chars)"
}
```

**回應：**
- **201 Created** - 註冊成功
- **400 Bad Request** - 輸入驗證失敗
- **409 Conflict** - Email 已存在

---

#### POST /api/v1/auth/login

**請求：**
```json
{
  "email": "string",
  "password": "string"
}
```

**回應：**
- **200 OK** - 登入成功
- **401 Unauthorized** - 憑證錯誤

---

### 資料流程

```
註冊流程：
Client → POST /api/auth/register → AuthController
  → AuthService.register_user()
    → 檢查 email 是否存在
    → 驗證密碼強度
    → hash_password()
    → 建立 User 記錄
    → create_access_token()
  → 回傳 {user, token}

登入流程：
Client → POST /api/auth/login → AuthController
  → AuthService.login_user()
    → 查找用戶 by email
    → verify_password()
    → create_access_token()
  → 回傳 {user, token}
```

---

## 開發指引

### TDD 開發流程

#### 第 1 步：環境準備（5 分鐘）
1. 確認 Task-001 和 Task-002 已完成
2. 確認測試環境可運行：`pytest`
3. 閱讀 `tech-specs/backend/auth.md`

#### 第 2 步：撰寫第一個測試（15 分鐘）
1. 建立 `tests/api/test_auth.py`
2. 撰寫「測試 1：成功註冊」
3. 執行測試 → 失敗（預期，因為還沒實作）

#### 第 3 步：實作基礎架構（30 分鐘）
1. 建立 `app/schemas/auth.py` - Pydantic models
2. 建立 `app/services/auth_service.py` - Service 骨架
3. 建立 `app/api/v1/auth.py` - Router 骨架
4. 在 `app/main.py` 註冊 router

#### 第 4 步：實作註冊功能（45 分鐘）
1. 實作 `AuthService.register_user()`
2. 實作 `security.py` 中的密碼 hash 函數
3. 實作 JWT token 生成
4. 執行測試 1 → 通過 ✅

#### 第 5 步：撰寫錯誤處理測試（20 分鐘）
1. 撰寫「測試 2：重複 email」
2. 撰寫「測試 3：密碼格式錯誤」
3. 執行測試 → 失敗

#### 第 6 步：實作錯誤處理（30 分鐘）
1. 加入 email 重複檢查
2. 加入密碼強度驗證
3. 執行所有測試 → 通過 ✅

#### 第 7 步：實作登入功能（30 分鐘）
1. 撰寫「測試 4：成功登入」
2. 撰寫「測試 5：密碼錯誤」
3. 實作 `AuthService.login_user()`
4. 執行所有測試 → 通過 ✅

#### 第 8 步：整合測試（20 分鐘）
1. 撰寫「測試 6：完整註冊登入流程」
2. 確保端到端流程正常
3. 執行所有測試 → 通過 ✅

#### 第 9 步：重構與優化（20 分鐘）
1. 檢查程式碼重複
2. 提取共用邏輯
3. 改善錯誤訊息
4. 再次執行所有測試

#### 第 10 步：文件與檢查（20 分鐘）
1. 更新 Swagger 文檔註釋
2. 檢查測試覆蓋率：`pytest --cov`
3. 執行 linter：`ruff check .`
4. 格式化程式碼：`ruff format .`

---

### 注意事項

#### 安全性
- ⚠️ **絕對不要**在日誌中記錄密碼（即使是錯誤日誌）
- ⚠️ 錯誤訊息不應透露是 email 還是密碼錯誤（防止帳號列舉）
- ⚠️ 使用 bcrypt（不是 MD5 或 SHA）
- ⚠️ JWT secret 必須是強隨機字串，存在環境變數中

#### 效能
- 💡 bcrypt hash 很慢（這是設計），考慮使用 async
- 💡 Database 查詢記得加上 index（email 欄位）

#### 測試
- ✅ 每個測試前清空測試資料庫
- ✅ 使用 fixture 建立測試用戶
- ✅ 測試應該可以獨立執行（不依賴順序）

#### 與其他模組整合
- 🔗 Task-004（用戶管理 API）會使用這裡的 JWT middleware
- 🔗 Task-017（登入頁面）會呼叫這些 API

---

### 完成檢查清單

#### 功能完整性
- [ ] POST /api/v1/auth/register 可正常運作
- [ ] POST /api/v1/auth/login 可正常運作
- [ ] JWT token 可正確生成和驗證
- [ ] 密碼使用 bcrypt hash
- [ ] Email 重複檢查正常
- [ ] 密碼強度驗證正常

#### 測試
- [ ] 所有單元測試通過（5 個測試）
- [ ] 整合測試通過（1 個測試）
- [ ] 測試覆蓋率 > 90%
- [ ] 測試可獨立執行

#### 程式碼品質
- [ ] Ruff check 無錯誤：`ruff check .`
- [ ] 程式碼已格式化：`ruff format .`
- [ ] 無 type 錯誤（如使用 mypy）
- [ ] 無安全性警告

#### 文件
- [ ] API 文檔已更新（Swagger/OpenAPI）
- [ ] 函數都有 docstring
- [ ] README 已更新（如需要）

#### 整合
- [ ] 在本地環境手動測試註冊登入流程
- [ ] 使用 Postman/curl 測試 API
- [ ] 檢查資料庫記錄正確建立
- [ ] JWT token 可在 jwt.io 解碼驗證

#### Spec 同步
- [ ] 如果實作與 spec 有差異，已更新 `tech-specs/backend/auth.md`
- [ ] 如果有新的依賴套件，已更新 `requirements.txt`

---

## 預估時間分配

- 閱讀與準備：15 分鐘
- 撰寫測試：35 分鐘
- 實作功能：105 分鐘
- 重構優化：20 分鐘
- 文件檢查：25 分鐘

**總計：約 3.5 小時**（預留 0.5 小時 buffer = 4 小時）

---

## 參考資源

### FastAPI 官方文檔
- [Security](https://fastapi.tiangolo.com/tutorial/security/)
- [OAuth2 with Password and Bearer](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/)

### 相關套件文檔
- [passlib](https://passlib.readthedocs.io/) - 密碼 hash
- [python-jose](https://python-jose.readthedocs.io/) - JWT
- [pytest](https://docs.pytest.org/) - 測試框架

### 專案內部文件
- `tech-specs/backend/auth.md` - 認證系統設計
- `tech-specs/backend/api-design.md` - API 設計規範
- `tech-specs/backend/security.md` - 安全性規範

---

**準備好了嗎？** 開始使用 TDD 方式實作這個 task！🚀
````

---

## 使用流程範例

### 情境 1：填充第一個 task

```
User: /detail-task 001

Claude:
讀取中...
✓ development/phase-1/task-001.md (骨架)
✓ development/phase-1/overview.md
✓ tech-specs/framework.md
✓ product-design/overview.md

分析中...
這是一個「專案初始化」任務，屬於基礎建設類型。

我會生成：
- 5 個單元測試（啟動測試、依賴安裝測試等）
- 詳細的實作規格（需要建立的所有配置檔案）
- Step-by-step 開發指引

開始填充詳細內容...

✅ task-001.md 已更新！

你現在可以：
1. 閱讀完整的 task-001.md
2. 按照 TDD 流程開始實作
3. 或繼續填充下一個 task：`/detail-task 002`
```

---

### 情境 2：填充 API 任務

```
User: /detail-task 3

Claude:
讀取中...
✓ development/phase-1/task-003.md (骨架)
✓ development/phase-1/overview.md
✓ tech-specs/backend/auth.md
✓ tech-specs/backend/api-design.md
✓ product-design/flows.md

分析中...
這是一個「後端 API」任務，需要實作認證相關 API。

從 spec 中識別到：
- 3 個 API 端點：register, login, logout
- JWT token 機制
- bcrypt 密碼加密
- 用戶資料驗證

我會生成：
- 5 個單元測試（成功/失敗情境）
- 1 個整合測試（完整流程）
- 5 個檔案的詳細實作規格
- API 端點規格
- 資料流程圖
- TDD step-by-step 指引

開始填充...

✅ task-003.md 已更新為完整的開發指南！

檔案大小：約 600 行
包含：6 個詳細測試 + 5 個檔案規格 + 完整開發流程

你可以直接按照這個文件開始 TDD 開發了！
```

---

### 情境 3：填充前端任務

```
User: /detail-task 17

Claude:
讀取中...
✓ development/phase-1/task-017.md (骨架)
✓ development/phase-1/overview.md
✓ tech-specs/frontend/pages.md
✓ tech-specs/frontend/component-architecture.md
✓ product-design/pages.md#Page-02-登入頁面

分析中...
這是一個「前端頁面」任務，需要實作登入註冊頁面。

從 spec 中識別到：
- 2 個頁面：Login, Register
- 表單驗證（Zod）
- API 整合（React Query）
- 狀態管理（Zustand）
- Ant Design 元件

我會生成：
- 4 個元件測試（表單驗證、API 整合）
- 2 個 E2E 測試（完整登入/註冊流程）
- 元件架構規格
- API 整合方式
- 狀態管理設計
- TDD 開發流程

開始填充...

✅ task-017.md 已更新！

現在包含完整的前端開發指引，包括：
- React Testing Library 測試案例
- 元件結構設計
- Form 驗證邏輯
- API 整合範例

可以開始實作了！
```

---

## 設計理念

### 為什麼一次只處理一個 task？

**上下文限制**
- 填充一個詳細的 task 需要：
  - 讀取多個 spec 文件
  - 分析任務性質
  - 生成 5-10 個詳細測試
  - 撰寫完整的實作規格
  - 設計開發流程
- 一個 task 的詳細內容可能長達 500-800 行
- 專注於單一 task 可以提供更高品質的輸出

**品質優於數量**
- 每個 task 都是一個完整的開發指南
- 包含所有必要的細節
- 可以直接使用，不需要額外查找資訊

**工作流程自然**
- 規劃階段：`/plan-phase` 看全貌
- 執行階段：`/detail-task` 填充當前要做的 task
- 符合實際開發節奏

---

## 準備好了嗎？

使用方式：

```
/detail-task [task編號]
```

範例：
```
/detail-task 001
/detail-task task-003
/detail-task 15
```

我會讀取相關文件、分析任務性質，並生成完整詳細的開發指南！
