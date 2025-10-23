# Issue-009-1: Issue-009 修復後的配置丟失與前端整合問題

**建立日期：** 2025-10-23
**發現時機：** Issue-009 修復完成並刪除 worktree 後測試時
**母 Issue：** Issue-009 (YouTube OAuth 授權流程完全失效)
**類型：** Bug - 開發流程問題 + 配置錯誤 + 前端整合缺陷
**優先級：** P1 (高) - 影響開發流程和功能完整性

---

## 1. 問題描述

### 簡述
在 worktree 中完成 Issue-009 修復後，刪除 worktree 時未保留 gitignored 配置檔案（client_secrets.json 和 .env），導致主目錄測試時需要重新配置。同時發現 OAuth Desktop application 配置理解錯誤、前端缺少初始化檢查、API 路徑錯誤等多個衍生問題。

### 母 Issue 背景
Issue-009 修復了 YouTube OAuth 授權流程的核心問題（endpoint 錯誤、postMessage 處理），但在實際測試過程中發現多個配置和整合問題。

### 本 Issue 涵蓋的衍生問題

1. **Worktree 管理缺陷** - gitignored 檔案未複製回主目錄
2. **OAuth 配置理解錯誤** - Desktop vs Web application 類型混淆
3. **前端狀態持久化缺失** - 刷新後狀態丟失
4. **API 路徑不一致** - 新建立的 youtubeApi.ts 缺少 /api/v1 前綴
5. **瀏覽器快取問題** - 修正後仍使用舊程式碼

---

## 2. 問題時間線

### 2025-10-23 14:30 - 發現配置檔案丟失

**問題：** 啟動 backend 時找不到 client_secrets.json

**原因：** worktree 中的 gitignored 檔案未複製回主目錄就刪除了 worktree

**使用者回饋：**
> "這太詭異了吧！一樣就是少了這個檔案而已，我把檔案補回去了，結果現在又告訴我需要點env。之前都不需要，現在突然就需要了，到底是爲什麼？"

### 2025-10-23 14:35 - ENCRYPTION_KEY 驗證失敗

**問題：** 缺少 .env 檔案，Settings 物件回傳空字串導致 Fernet key 驗證錯誤

**錯誤訊息：**
```
ValueError: Fernet key must be 32 url-safe base64-encoded bytes.
```

**解決：** 生成新的 Fernet key 並建立 .env 檔案

### 2025-10-23 14:40 - .env 位置錯誤

**問題：** .env 被建立在 `backend/backend/.env` 而非 `backend/.env`

**解決：** 移動檔案到正確位置

### 2025-10-23 14:45 - OAuth redirect_uri_mismatch

**問題：** Google OAuth 回傳錯誤 400: redirect_uri_mismatch

**截圖：** 使用者提供了 Google OAuth 錯誤頁面截圖

### 2025-10-23 14:50 - Desktop vs Web Application 混淆

**Claude 誤判：** 建議使用 Web application 類型的 OAuth client

**使用者強烈糾正：**
> "不是，你他媽的，我們本來就是一個下載的應用程式，而不是一個Web的應用程式，這種檔案才是對的。你之前完全改錯了。"

**關鍵理解：**
- ✅ 這是 Desktop application（"installed" type）
- ❌ 不是 Web application（"web" type）
- client_secrets.json 應使用 "installed" key

### 2025-10-23 15:00 - 資料庫未初始化

**問題：** ytmaker.db 檔案大小為 0 bytes

**解決：**
1. 執行 `alembic upgrade head`
2. Migration 002 失敗（SQLite constraint 問題）
3. 手動添加 thumbnail_url 欄位

### 2025-10-23 15:10 - OAuth 授權成功

**成果：** 授權視窗顯示「授權成功！陳昭宇」

**截圖：** 使用者提供授權成功頁面截圖

**資料庫驗證：**
```
陳昭宇|UCRPgIZmw4RlEsqpyk6iJzKA|1
```

### 2025-10-23 15:15 - 完成頁面仍顯示「未連結」

**問題：** OAuth 成功後，Setup 完成頁面仍顯示 YouTube「未連結（0個帳號）」

**截圖：** 使用者提供完成頁面截圖

**原因：** 前端缺少初始化檢查，只依賴 postMessage

### 2025-10-23 15:20 - 修正前端整合

**修改：**
1. 添加初始化時查詢 `/api/v1/youtube/accounts`
2. 修正 postMessage origin 檢查（允許 backend origin）
3. 建立新的 youtubeApi.ts 模組

### 2025-10-23 15:30 - API 路徑錯誤

**問題：** youtubeApi.ts 中 API 路徑缺少 `/api/v1` 前綴

**錯誤：**
```typescript
'/youtube/accounts'  // ❌ 404 Not Found
```

**正確：**
```typescript
'/api/v1/youtube/accounts'  // ✅ 200 OK
```

### 2025-10-23 15:35 - 瀏覽器快取

**問題：** 修正 API 路徑後，Backend 日誌仍顯示混合請求

**觀察：**
```
GET /api/v1/youtube/accounts 200 OK  ← 新程式碼
GET /youtube/accounts 404 Not Found  ← 快取的舊程式碼
```

**解決：** 建議使用者強制刷新瀏覽器 (Cmd + Shift + R)

---

## 3. 根因分析

### 根因 A: Worktree 管理流程不完整

**問題：**
刪除 worktree 時只刪除目錄，未檢查並複製 gitignored 檔案回主目錄。

**影響檔案：**
- `backend/client_secrets.json` (gitignored)
- `backend/.env` (gitignored)
- 未來可能有更多 gitignored 配置檔案

**應該執行的流程：**
```bash
# 1. 檢查 gitignored 檔案
cd /Users/skyler/coding/YTMaker-issue-009
git ls-files --others --ignored --exclude-standard

# 2. 複製重要配置檔案
cp backend/client_secrets.json /Users/skyler/coding/YTMaker/backend/
cp backend/.env /Users/skyler/coding/YTMaker/backend/

# 3. 驗證主目錄已有檔案
ls -la /Users/skyler/coding/YTMaker/backend/{client_secrets.json,.env}

# 4. 刪除 worktree
git worktree remove /Users/skyler/coding/YTMaker-issue-009
```

### 根因 B: OAuth Desktop Application 配置細節不熟悉

**Claude 的錯誤理解：**
- 看到 redirect_uri_mismatch 錯誤
- 誤以為需要切換到 Web application 類型
- 忽略了專案實際上是 Desktop application

**正確配置：**

**client_secrets.json 結構（Desktop）：**
```json
{
  "installed": {  ← 使用 "installed" key
    "client_id": "...",
    "client_secret": "...",
    "redirect_uris": ["http://localhost:8000/api/v1/youtube/callback"]
  }
}
```

**vs Web application 結構（錯誤）：**
```json
{
  "web": {  ← 錯誤的 key
    "client_id": "...",
    "client_secret": "...",
    "redirect_uris": ["..."]
  }
}
```

**Google Cloud Console 配置：**
- 應用程式類型：桌面應用程式
- Redirect URI：不需要在 Console 配置（Desktop app 使用 loopback）

### 根因 C: 前端狀態管理設計缺陷

**問題：**
YouTubeAuthStep.tsx 只依賴 postMessage 更新狀態，缺少持久化檢查。

**流程分析：**

**現有流程（有缺陷）：**
```
1. 使用者點擊「連結 YouTube」
2. 開啟 OAuth 視窗
3. 完成授權
4. Callback 頁面發送 postMessage
5. ✅ 主頁面接收並更新狀態
6. 使用者刷新頁面
7. ❌ 狀態重置，顯示「未連結」
```

**正確流程：**
```
1. 元件掛載時查詢 backend
2. 如果有授權記錄 → 顯示「已連結」
3. OAuth 流程 postMessage 更新狀態
4. 刷新頁面後重新查詢
5. ✅ 持續顯示「已連結」
```

### 根因 D: API 模組建立時缺少路徑檢查

**問題：**
建立新的 youtubeApi.ts 時，沒有參考其他 API 模組的路徑格式。

**檢查其他模組：**
```typescript
// systemApi.ts
export const systemApi = {
  async checkHealth() {
    const response = await apiClient.get<HealthCheckResponse>('/api/v1/system/health')
    //                                                          ^^^^^^^^ 有 /api/v1
  }
}
```

**應該參考並保持一致：**
```typescript
// youtubeApi.ts
export const youtubeApi = {
  async getAccounts() {
    const response = await apiClient.get('/api/v1/youtube/accounts')
    //                                    ^^^^^^^^ 必須有 /api/v1
  }
}
```

---

## 4. 解決方案總結

### 解決方案 A: 更新專案指引文件

**檔案：** `.claude/CLAUDE.md`

**新增章節：Worktree 刪除前檢查清單**

```markdown
### Worktree 刪除前必做檢查

**在刪除 worktree 前，必須完成以下步驟：**

#### 1. 檢查 gitignored 檔案
```bash
cd <worktree-path>
git ls-files --others --ignored --exclude-standard
```

#### 2. 識別重要配置檔案
- `backend/client_secrets.json` - Google OAuth 憑證
- `backend/.env` - 環境變數（包含 ENCRYPTION_KEY）
- `frontend/.env.local` - 前端環境變數
- 任何 `*.local` 檔案

#### 3. 複製到主目錄
```bash
cp backend/client_secrets.json /Users/skyler/coding/YTMaker/backend/
cp backend/.env /Users/skyler/coding/YTMaker/backend/
```

#### 4. 驗證複製成功
```bash
ls -la /Users/skyler/coding/YTMaker/backend/{client_secrets.json,.env}
```

#### 5. 確認後刪除
```bash
git worktree remove <worktree-path>
```
```

### 解決方案 B: 恢復並修正 OAuth 配置

**已執行的修正：**

1. **重新下載 Desktop application OAuth 憑證**
   - 使用者從 Google Cloud Console 下載
   - 確認是「桌面應用程式」類型

2. **修正 config.py (commit 6fddbe4)**
   ```python
   # backend/app/core/config.py:39
   GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/youtube/callback"
   ```

3. **更新 client_secrets.json.example (commit 6fddbe4)**
   - 改用 "installed" type
   - 添加 redirect_uris 欄位示例

4. **恢復 .env 檔案**
   - 生成新的 Fernet key
   - 建立在正確位置 `backend/.env`

### 解決方案 C: 添加前端初始化檢查 (commit 774023f)

**檔案：** `frontend/src/components/setup/steps/YouTubeAuthStep.tsx`

**新增 useEffect：**
```typescript
// 初始化時檢查授權狀態
useEffect(() => {
  const checkYouTubeAuth = async () => {
    try {
      const response = await youtubeApi.getAccounts()
      if (response.success && response.data.accounts.length > 0) {
        const account = response.data.accounts[0]
        setYouTubeAuth({
          connected: true,
          channel_name: account.channel_name,
          channel_id: account.channel_id,
          thumbnail_url: account.thumbnail_url,
        })
      }
    } catch (error) {
      console.error('檢查 YouTube 授權狀態失敗:', error)
    }
  }

  checkYouTubeAuth()
}, [setYouTubeAuth])
```

**修正 postMessage origin 檢查：**
```typescript
const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const backendOrigin = new URL(backendUrl).origin

const allowedOrigins = [window.location.origin, backendOrigin]
if (!allowedOrigins.includes(event.origin)) {
  return
}
```

### 解決方案 D: 建立 youtubeApi.ts (commit 774023f)

**檔案：** `frontend/src/services/api/youtubeApi.ts` (新建)

**初版（錯誤）：**
```typescript
async getAccounts(): Promise<YouTubeAccountsResponse> {
  const response = await apiClient.get('/youtube/accounts')  // ❌ 缺少 /api/v1
  return response.data
}
```

### 解決方案 E: 修正 API 路徑 (commit 468ec02)

**檔案：** `frontend/src/services/api/youtubeApi.ts`

**修正：**
```typescript
async getAccounts(): Promise<YouTubeAccountsResponse> {
  const response = await apiClient.get('/api/v1/youtube/accounts')  // ✅ 加上 /api/v1
  return response.data
}

async deleteAccount(accountId: string): Promise<void> {
  await apiClient.delete(`/api/v1/youtube/accounts/${accountId}`)  // ✅ 加上 /api/v1
}
```

---

## 5. 相關 Commits

| Commit | 日期 | 說明 |
|--------|------|------|
| 6fddbe4 | 2025-10-23 | fix: 修正 OAuth redirect URI 配置支援 Desktop application |
| 367572c | 2025-10-23 | fix: 更新 OAuth redirect URI 為完整的 callback 端點 |
| 774023f | 2025-10-23 | fix: 修正 YouTube OAuth postMessage 接收與初始化檢查 |
| 468ec02 | 2025-10-23 | fix: 修正 YouTube API 路徑缺少 /api/v1 前綴 |

---

## 6. 測試驗證

### OAuth 授權流程

✅ **成功驗證：**
1. 點擊「連結 YouTube 帳號」
2. 開啟 Google OAuth 授權頁面
3. 完成授權
4. 成功取得 access token 和 refresh token
5. 從 YouTube API 取得頻道資訊
6. 資料正確儲存到資料庫
7. 授權視窗顯示「授權成功！陳昭宇」

### 前端狀態持久化

⏳ **待驗證（需要使用者清除瀏覽器快取）：**
1. OAuth 授權成功
2. 刷新頁面
3. 應該仍顯示「已連結」狀態

### 資料庫記錄

✅ **驗證成功：**
```sql
sqlite3 ytmaker.db "SELECT channel_name, channel_id, is_authorized FROM youtube_accounts;"

結果:
陳昭宇|UCRPgIZmw4RlEsqpyk6iJzKA|1
```

---

## 7. 重要教訓

### 給 Claude Code 的提醒

1. **不要臆測專案架構**
   - 當使用者明確說明是 Desktop application，不要建議改成 Web application
   - Desktop 和 Web OAuth 配置差異很大，混淆會導致嚴重錯誤

2. **Worktree 管理務必謹慎**
   - 刪除 worktree 前主動提醒檢查 gitignored 檔案
   - 提供明確的複製指令

3. **建立新 API 模組時檢查現有模式**
   - 先查看其他 API 模組的路徑格式
   - 保持整個專案的一致性

4. **前端狀態管理考慮持久化**
   - postMessage 只是即時更新
   - 必須在初始化時從 backend 載入狀態

### 給開發者的提醒

1. **Worktree 刪除前檢查**
   - 養成習慣：先複製 gitignored 檔案
   - 考慮使用自動化腳本

2. **明確告知 Claude 專案類型**
   - 明確說明 Desktop vs Web application
   - 避免 Claude 誤判

3. **瀏覽器快取問題**
   - 修改前端程式碼後強制刷新
   - 開發時建議停用快取

---

## 8. 預防措施

### 建議 1: 建立 Worktree 管理腳本

**檔案：** `.scripts/worktree-cleanup.sh`

```bash
#!/bin/bash
# Worktree 安全刪除腳本

WORKTREE_PATH=$1
MAIN_DIR="/Users/skyler/coding/YTMaker"

if [ -z "$WORKTREE_PATH" ]; then
  echo "用法: ./worktree-cleanup.sh <worktree-path>"
  exit 1
fi

echo "檢查 gitignored 檔案..."
cd "$WORKTREE_PATH"

# 檢查重要配置檔案
CONFIG_FILES=(
  "backend/client_secrets.json"
  "backend/.env"
  "frontend/.env.local"
)

FOUND_FILES=()
for file in "${CONFIG_FILES[@]}"; do
  if [ -f "$file" ]; then
    FOUND_FILES+=("$file")
  fi
done

if [ ${#FOUND_FILES[@]} -gt 0 ]; then
  echo "發現以下配置檔案："
  printf '%s\n' "${FOUND_FILES[@]}"
  echo ""
  read -p "是否複製到主目錄? (y/n) " -n 1 -r
  echo

  if [[ $REPLY =~ ^[Yy]$ ]]; then
    for file in "${FOUND_FILES[@]}"; do
      TARGET="$MAIN_DIR/$file"
      mkdir -p "$(dirname "$TARGET")"
      cp "$file" "$TARGET"
      echo "✓ 複製 $file"
    done
    echo "複製完成"
  fi
fi

echo "刪除 worktree..."
git worktree remove "$WORKTREE_PATH"
echo "完成"
```

### 建議 2: Backend 啟動時驗證配置

**檔案：** `backend/app/main.py`

```python
@app.on_event("startup")
async def validate_config():
    """驗證必要的配置檔案存在"""
    from pathlib import Path

    required_files = {
        "client_secrets.json": "Google OAuth 憑證",
        ".env": "環境變數（包含 ENCRYPTION_KEY）",
    }

    missing_files = []
    for file, description in required_files.items():
        if not Path(file).exists():
            missing_files.append(f"{file} ({description})")

    if missing_files:
        logger.error("缺少必要配置檔案:")
        for file in missing_files:
            logger.error(f"  - {file}")
        logger.error("\n請參考 .env.example 和 client_secrets.json.example")
        raise FileNotFoundError("缺少必要配置檔案")
```

### 建議 3: 統一管理 API 路徑

**檔案：** `frontend/src/constants/apiRoutes.ts` (新建)

```typescript
export const API_ROUTES = {
  SYSTEM: {
    HEALTH: '/api/v1/system/health',
    SETTINGS: '/api/v1/system/settings',
  },
  YOUTUBE: {
    ACCOUNTS: '/api/v1/youtube/accounts',
    AUTH: '/api/v1/youtube/auth',
    CALLBACK: '/api/v1/youtube/callback',
  },
  GEMINI: {
    TEST: '/api/v1/gemini/test',
  },
} as const
```

**使用：**
```typescript
import { API_ROUTES } from '@/constants/apiRoutes'

const response = await apiClient.get(API_ROUTES.YOUTUBE.ACCOUNTS)
```

---

## 9. 相關資源

### 相關 Issues
- [Issue-009](./✓%20issue-009.md) - YouTube OAuth 授權流程完全失效（母 Issue）

### 相關文件
- `.claude/CLAUDE.md` - 專案開發指引
- `backend/.env.example` - 環境變數範例
- `backend/client_secrets.json.example` - OAuth 憑證範例

### 參考連結
- [Google OAuth 2.0 for Desktop Apps](https://developers.google.com/identity/protocols/oauth2/native-app)
- [Git Worktree Documentation](https://git-scm.com/docs/git-worktree)

---

## 10. 時間記錄

| 時間 | 事件 |
|------|------|
| 14:30 | 發現 client_secrets.json 丟失 |
| 14:35 | 發現 .env 丟失，ENCRYPTION_KEY 錯誤 |
| 14:40 | 修正 .env 位置錯誤 |
| 14:45 | OAuth redirect_uri_mismatch 錯誤 |
| 14:50 | 使用者糾正 Desktop vs Web application |
| 14:55 | 更新 config.py 和 client_secrets.json |
| 15:00 | 資料庫初始化，手動添加欄位 |
| 15:10 | OAuth 授權成功（陳昭宇頻道） |
| 15:15 | 發現前端不顯示「已連結」 |
| 15:20 | 添加初始化檢查和修正 origin |
| 15:25 | 建立 youtubeApi.ts |
| 15:30 | 修正 API 路徑（加上 /api/v1） |
| 15:35 | 發現瀏覽器快取問題 |
| 15:40 | 建議強制刷新瀏覽器 |

**總處理時間：** 約 1.17 小時

---

## 11. 待辦事項

- [ ] 使用者清除瀏覽器快取並驗證前端狀態持久化
- [ ] 建立 worktree-cleanup.sh 腳本
- [ ] 在 backend/app/main.py 添加配置驗證
- [ ] 建立 API_ROUTES 常數統一管理路徑
- [ ] 更新 .claude/CLAUDE.md 添加 Worktree 檢查清單

---

## 12. 變更歷史

| 日期 | 變更內容 | 修改者 |
|------|---------|--------|
| 2025-10-23 15:50 | 建立 Issue-009-1，記錄所有衍生問題和解決方案 | Claude Code |
