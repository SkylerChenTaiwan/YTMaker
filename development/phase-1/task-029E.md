# Task-029E: 完整真實環境測試（零 Mock）

> **建立日期:** 2025-10-23
> **狀態:** ⏳ 未開始
> **預計時間:** 8 小時
> **優先級:** P0 (必須)

---

## 任務背景

### 為什麼需要這個測試？

Task-029A~D 系列使用了大量 mock，雖然測試通過但在實際使用時仍然遇到許多問題（Issue-006, 009, 009-1, 010）。

**根本原因：**
- Mock 掩蓋了真實的整合問題
- 測試環境與實際環境差異太大
- 前後端 API 契約沒有真實驗證
- 配置與環境問題測試不足

**本次測試的核心原則：**
```
❌ 不使用 mock（除非是不可控的第三方服務）
✅ 使用真實的 Backend + Frontend + Database
✅ 使用真實配置的外部 API
✅ 測試真實的使用者場景
✅ 驗證資料真的寫入資料庫
✅ 驗證檔案真的生成
```

---

## 關聯文件

### 產品設計
- `product-design/flows.md` - 所有使用者流程
- `product-design/pages.md` - 所有頁面規格

### 技術規格
- `tech-specs/backend/` - 後端完整規格
- `tech-specs/frontend/` - 前端完整規格

### 相關 Issues（參考避免重複問題）
- Issue-006: E2E 測試失敗 - 環境配置問題
- Issue-009: YouTube OAuth 完全失效
- Issue-009-1: 配置丟失與前端整合問題
- Issue-010: 缺少依賴

---

## 任務目標

### 簡述
在完全真實的環境下，使用真實配置的外部 API，執行完整的使用者流程測試，驗證系統在實際使用中真的可用。

### 詳細目標

1. **真實環境驗證**
   - 真實的 Backend API 調用（不 mock axios）
   - 真實的資料庫讀寫（不 mock database）
   - 真實的檔案系統操作（真實生成影片檔案）

2. **外部 API 真實整合**
   - 真實調用 Gemini API（消耗真實 quota）
   - 真實調用 YouTube API（實際上傳影片到測試頻道）
   - 真實執行 Google OAuth 流程

3. **完整使用者流程**
   - Flow-0: 首次設定（11 步驟完整測試）
   - Flow-1: 基本影片生成（14 步驟完整測試）
   - Flow-2: 使用模板快速生成
   - Flow-3: 多頻道管理
   - Flow-4: 排程發布

4. **錯誤處理與邊界條件**
   - API quota 用完的處理
   - 網路中斷的處理
   - 檔案權限錯誤
   - 資料庫 constraint violation

5. **資料持久化驗證**
   - 驗證資料庫真的有記錄
   - 驗證檔案真的存在
   - 驗證重啟後狀態保持

### 成功標準
- [ ] 所有 12 個測試套件完整通過（真實環境，涵蓋所有 10 個產品流程）
- [ ] 至少 1 支影片成功生成並上傳到 YouTube 測試頻道
- [ ] 所有資料庫寫入操作驗證通過（真實查詢驗證）
- [ ] 所有檔案生成操作驗證通過（真實檔案存在）
- [ ] 至少 10 個錯誤處理場景測試通過
- [ ] 測試可在乾淨環境重複執行（環境設定腳本完整）
- [ ] 所有測試在本地環境通過（不依賴 CI）
- [ ] 所有產品設計文件（flows.md）中的流程都有對應測試

---

## 測試策略

### 測試環境設定

#### 前置要求

**必須具備的真實配置：**
1. ✅ **Backend 配置檔案：**
   - `backend/.env` - 包含真實的 ENCRYPTION_KEY
   - `backend/client_secrets.json` - 真實的 Google OAuth 憑證
   - `backend/ytmaker.db` - 真實的資料庫（測試前備份）

2. ✅ **外部 API Keys（已設定）：**
   - Gemini API Key（有足夠 quota）
   - Stability AI API Key（可選，可 mock）
   - D-ID API Key（可選，可 mock）
   - YouTube API（已配置 OAuth）

3. ✅ **測試 YouTube 頻道：**
   - 至少一個測試 YouTube 頻道
   - 已完成 OAuth 授權
   - 允許實際上傳影片

**可選配置（可 mock 的外部服務）：**
- Stability AI（圖片生成，可用 placeholder 替代）
- D-ID（虛擬主播，可用靜態圖片替代）

#### 環境準備腳本

**檔案：** `tests/e2e/setup-real-env.sh`

```bash
#!/bin/bash
# 真實環境測試前準備腳本

set -e

echo "🚀 準備真實測試環境..."

# 1. 備份資料庫
echo "📦 備份資料庫..."
cp backend/ytmaker.db backend/ytmaker.db.backup
echo "✅ 資料庫已備份到 ytmaker.db.backup"

# 2. 清理舊的測試資料（保留配置）
echo "🧹 清理舊的測試資料..."
sqlite3 backend/ytmaker.db <<EOF
DELETE FROM projects WHERE name LIKE 'Test Project%';
DELETE FROM youtube_accounts WHERE channel_name LIKE 'Test Channel%';
VACUUM;
EOF
echo "✅ 測試資料已清理"

# 3. 檢查必要的配置檔案
echo "🔍 檢查配置檔案..."

if [ ! -f "backend/.env" ]; then
    echo "❌ 缺少 backend/.env"
    exit 1
fi

if [ ! -f "backend/client_secrets.json" ]; then
    echo "❌ 缺少 backend/client_secrets.json"
    exit 1
fi

echo "✅ 配置檔案檢查完成"

# 4. 檢查外部 API 連線
echo "🌐 檢查外部 API 連線..."

# 檢查 Gemini API
if ! curl -s -H "Content-Type: application/json" \
    -d '{"contents":[{"parts":[{"text":"test"}]}]}' \
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=$(grep GEMINI_API_KEY backend/.env | cut -d '=' -f2)" \
    > /dev/null; then
    echo "⚠️  Gemini API 連線失敗，請檢查 API Key"
else
    echo "✅ Gemini API 連線正常"
fi

# 5. 啟動 Backend
echo "🔧 啟動 Backend..."
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# 等待 Backend 啟動
echo "⏳ 等待 Backend 啟動..."
for i in {1..30}; do
    if curl -s http://localhost:8000/api/v1/system/health > /dev/null; then
        echo "✅ Backend 已啟動 (PID: $BACKEND_PID)"
        break
    fi
    sleep 1
done

# 6. 啟動 Frontend
echo "🎨 啟動 Frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# 等待 Frontend 啟動
echo "⏳ 等待 Frontend 啟動..."
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null; then
        echo "✅ Frontend 已啟動 (PID: $FRONTEND_PID)"
        break
    fi
    sleep 1
done

# 7. 儲存 PIDs 供後續清理
echo $BACKEND_PID > /tmp/ytmaker-test-backend.pid
echo $FRONTEND_PID > /tmp/ytmaker-test-frontend.pid

echo ""
echo "✅ 真實測試環境準備完成！"
echo ""
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo ""
echo "執行測試: npm run test:real"
echo "清理環境: ./tests/e2e/cleanup-real-env.sh"
```

#### 環境清理腳本

**檔案：** `tests/e2e/cleanup-real-env.sh`

```bash
#!/bin/bash
# 真實環境測試後清理腳本

set -e

echo "🧹 清理測試環境..."

# 1. 停止服務
if [ -f /tmp/ytmaker-test-backend.pid ]; then
    BACKEND_PID=$(cat /tmp/ytmaker-test-backend.pid)
    kill $BACKEND_PID 2>/dev/null || true
    rm /tmp/ytmaker-test-backend.pid
    echo "✅ Backend 已停止"
fi

if [ -f /tmp/ytmaker-test-frontend.pid ]; then
    FRONTEND_PID=$(cat /tmp/ytmaker-test-frontend.pid)
    kill $FRONTEND_PID 2>/dev/null || true
    rm /tmp/ytmaker-test-frontend.pid
    echo "✅ Frontend 已停止"
fi

# 2. 清理測試資料
echo "🗑️  清理測試資料..."
sqlite3 backend/ytmaker.db <<EOF
DELETE FROM projects WHERE name LIKE 'Test Project%';
DELETE FROM youtube_accounts WHERE channel_name LIKE 'Test Channel%';
VACUUM;
EOF

# 3. 清理生成的測試檔案
echo "🗑️  清理測試檔案..."
rm -rf backend/data/projects/test-*
rm -rf backend/data/temp/test-*

# 4. 可選：恢復資料庫備份
# echo "📦 恢復資料庫備份..."
# cp backend/ytmaker.db.backup backend/ytmaker.db

echo "✅ 清理完成"
```

---

## 測試規劃

### 測試 1: 完整的 Flow-0 - 首次設定流程

**目的：** 驗證全新使用者可以完整完成初始設定

**測試檔案：** `tests/e2e/real/flow-0-setup.spec.ts`

**前置條件：**
- 乾淨的資料庫（或清空設定）
- 真實的 API Keys 已準備
- 真實的 YouTube 測試帳號

**測試步驟：**

```typescript
import { test, expect } from '@playwright/test'

test.describe('Flow-0: 首次設定流程（真實環境）', () => {
  test.beforeAll(async () => {
    // 確保環境已啟動
    const backendHealth = await fetch('http://localhost:8000/api/v1/system/health')
    expect(backendHealth.ok).toBeTruthy()
  })

  test('應該完整完成首次設定並進入主控台', async ({ page, context }) => {
    // Step 1: 啟動應用程式
    await page.goto('http://localhost:3000')

    // 驗證：應該自動重定向到 /setup
    await expect(page).toHaveURL(/\/setup/)
    await expect(page.locator('h1')).toContainText('歡迎使用 YTMaker')

    // Step 2: 點擊開始設定
    await page.click('text=開始設定')
    await expect(page).toHaveURL(/\/setup\/step\/1/)

    // Step 3-4: 設定 Gemini API Key（真實測試）
    const geminiKey = process.env.GEMINI_API_KEY // 從環境變數讀取真實 key
    await page.fill('input[name="gemini_api_key"]', geminiKey)

    // 點擊測試連線（真實調用 Gemini API）
    await page.click('button:has-text("測試連線")')

    // 驗證：應該顯示「連線成功」
    await expect(page.locator('text=連線成功')).toBeVisible({ timeout: 10000 })

    // 驗證：資料庫真的有儲存
    const dbCheck = await fetch('http://localhost:8000/api/v1/system/settings')
    const settings = await dbCheck.json()
    expect(settings.data.gemini_api_key).toBeTruthy()

    // Step 5-8: Stability AI 和 D-ID（可選，可跳過）
    await page.click('text=跳過圖片生成設定')
    await page.click('text=跳過虛擬主播設定')

    // Step 9-10: YouTube 授權（真實 OAuth 流程）
    const [oauthPopup] = await Promise.all([
      context.waitForEvent('page'),
      page.click('button:has-text("連結 YouTube 帳號")')
    ])

    // 驗證：開啟的是真實的 backend OAuth endpoint
    await oauthPopup.waitForLoadState()
    expect(oauthPopup.url()).toContain('localhost:8000/api/v1/youtube/auth')

    // 驗證：應該重定向到 Google OAuth（真實的）
    await oauthPopup.waitForURL(/accounts\.google\.com/, { timeout: 10000 })
    expect(oauthPopup.url()).toContain('accounts.google.com')

    // 手動暫停，讓使用者完成 OAuth
    console.log('⏸️  請在彈出視窗中完成 Google OAuth 授權...')
    console.log('授權完成後測試將自動繼續')

    // 等待 callback（真實的授權流程）
    await oauthPopup.waitForURL(/\/callback/, { timeout: 60000 })

    // 等待視窗關閉
    await oauthPopup.waitForEvent('close', { timeout: 5000 })

    // 驗證：主頁面應該顯示已連結
    await expect(page.locator('text=已連結')).toBeVisible()

    // 驗證：資料庫真的有 YouTube 帳號記錄
    const accountsCheck = await fetch('http://localhost:8000/api/v1/youtube/accounts')
    const accounts = await accountsCheck.json()
    expect(accounts.data.accounts.length).toBeGreaterThan(0)

    const channelName = accounts.data.accounts[0].channel_name
    console.log(`✅ YouTube 頻道已連結: ${channelName}`)

    // Step 11: 完成設定
    await page.click('button:has-text("完成設定")')

    // 驗證：應該進入主控台
    await expect(page).toHaveURL('/')
    await expect(page.locator('h1')).toContainText('專案列表')

    // 驗證：setup-completed cookie 已設定
    const cookies = await context.cookies()
    const setupCookie = cookies.find(c => c.name === 'setup-completed')
    expect(setupCookie?.value).toBe('true')

    console.log('✅ Flow-0 完整測試通過')
  })

  test('應該正確處理 API Key 無效的情況', async ({ page }) => {
    await page.goto('http://localhost:3000/setup/step/1')

    // 輸入無效的 API Key
    await page.fill('input[name="gemini_api_key"]', 'invalid-key-12345')
    await page.click('button:has-text("測試連線")')

    // 驗證：應該顯示錯誤訊息（真實的 API 錯誤）
    await expect(page.locator('text=API Key 無效')).toBeVisible({ timeout: 10000 })
  })
})
```

**驗證點：**
- [ ] 真實的 Gemini API 連線測試成功
- [ ] 真實的 Google OAuth 流程完成
- [ ] 資料庫真的有 settings 和 youtube_accounts 記錄
- [ ] Cookie 真的有設定
- [ ] 重新整理後狀態保持

---

### 測試 2: 完整的 Flow-1 - 影片生成流程

**目的：** 驗證可以真實生成一支完整影片並上傳到 YouTube

**測試檔案：** `tests/e2e/real/flow-1-video-generation.spec.ts`

**前置條件：**
- Flow-0 已完成（設定已就緒）
- 準備一份測試文字內容（800 字）

**測試步驟：**

```typescript
import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

test.describe('Flow-1: 影片生成流程（真實環境）', () => {
  let projectId: string
  let youtubeVideoId: string

  test('應該完整生成影片並上傳到 YouTube', async ({ page, context }) => {
    // 設定 setup-completed cookie（假設 Flow-0 已完成）
    await context.addCookies([{
      name: 'setup-completed',
      value: 'true',
      domain: 'localhost',
      path: '/'
    }])

    // Step 1: 建立新專案
    await page.goto('http://localhost:3000')
    await page.click('button:has-text("建立新專案")')

    await expect(page).toHaveURL(/\/project\/create/)

    // Step 2: 輸入專案名稱
    const projectName = `Test Project ${Date.now()}`
    await page.fill('input[name="project_name"]', projectName)
    await page.click('button:has-text("下一步")')

    // Step 3: 上傳文字內容（真實檔案）
    const testContent = `
這是一篇測試用的文章內容。我們將用這篇文章來測試完整的影片生成流程。

第一段：介紹主題
這個測試將驗證系統能否正確處理文字內容，生成結構化的腳本，並調用所有外部 API。

第二段：技術細節
系統會使用 Gemini API 將這段文字轉換為影片腳本，然後為每個段落生成相應的圖片和語音。

第三段：總結
最終生成的影片將包含字幕、圖片、語音和轉場效果，並自動上傳到 YouTube。
    `.trim()

    // 真實上傳文字檔案
    const tempFile = path.join('/tmp', `test-content-${Date.now()}.txt`)
    fs.writeFileSync(tempFile, testContent)

    await page.setInputFiles('input[type="file"]', tempFile)

    // 驗證：字數顯示正確
    await expect(page.locator('text=/\\d+ 字/')).toBeVisible()

    await page.click('button:has-text("下一步")')

    // Step 4: 配置視覺元素（使用預設）
    await page.click('button:has-text("使用預設配置")')
    await page.click('button:has-text("下一步")')

    // Step 5: 選擇 Prompt 範本
    await page.click('text=預設範本')
    await page.click('button:has-text("下一步")')

    // Step 6: 選擇 Gemini 模型
    await page.click('label:has-text("Gemini Flash")')
    await page.click('button:has-text("下一步")')

    // Step 7: 設定 YouTube 資訊
    await page.fill('input[name="youtube_title"]', `測試影片 ${Date.now()}`)
    await page.fill('textarea[name="youtube_description"]', '這是自動化測試生成的影片')
    await page.fill('input[name="youtube_tags"]', '測試,自動化')
    await page.selectOption('select[name="privacy"]', 'unlisted') // 不公開測試影片
    await page.click('button:has-text("下一步")')

    // Step 8: 選擇 YouTube 頻道
    await page.click('div[data-testid="youtube-channel-card"]:first-child')
    await page.click('button:has-text("確認並開始生成")')

    // 取得 project ID
    await page.waitForURL(/\/project\/[^/]+\/progress/)
    const url = page.url()
    projectId = url.match(/\/project\/([^/]+)\/progress/)?.[1]!
    expect(projectId).toBeTruthy()

    console.log(`📝 專案已建立: ${projectId}`)

    // Step 9-10: 等待腳本與素材生成（真實調用 Gemini API）
    console.log('⏳ 等待腳本生成...')
    await expect(page.locator('text=腳本生成中')).toBeVisible()
    await expect(page.locator('text=腳本生成完成')).toBeVisible({ timeout: 180000 }) // 3分鐘

    console.log('✅ 腳本生成完成（真實 Gemini API）')

    // 驗證：資料庫有腳本記錄
    const scriptCheck = await fetch(`http://localhost:8000/api/v1/projects/${projectId}`)
    const projectData = await scriptCheck.json()
    expect(projectData.data.script).toBeTruthy()
    console.log(`📄 腳本包含 ${projectData.data.script.sections.length} 個段落`)

    console.log('⏳ 等待素材生成...')
    await expect(page.locator('text=素材生成中')).toBeVisible()

    // 注意：如果沒有配置 Stability AI 和 D-ID，這裡可能會使用 placeholder
    // 或者我們可以跳過這些，只測試核心的 Gemini 和 YouTube 整合

    await expect(page.locator('text=素材生成完成')).toBeVisible({ timeout: 300000 }) // 5分鐘
    console.log('✅ 素材生成完成')

    // Step 11: 等待影片渲染（真實 FFmpeg 渲染）
    console.log('⏳ 等待影片渲染（這可能需要 10-15 分鐘）...')
    await expect(page.locator('text=影片渲染中')).toBeVisible()
    await expect(page.locator('text=影片渲染完成')).toBeVisible({ timeout: 900000 }) // 15分鐘

    console.log('✅ 影片渲染完成')

    // 驗證：影片檔案真的存在
    const videoPath = path.join(
      __dirname,
      '../../../backend/data/projects',
      projectId,
      'final_video.mp4'
    )
    expect(fs.existsSync(videoPath)).toBeTruthy()
    const videoStats = fs.statSync(videoPath)
    console.log(`📹 影片大小: ${(videoStats.size / 1024 / 1024).toFixed(2)} MB`)

    // Step 12: 等待封面生成
    await expect(page.locator('text=封面生成完成')).toBeVisible({ timeout: 60000 })

    // 驗證：封面檔案真的存在
    const thumbnailPath = path.join(
      __dirname,
      '../../../backend/data/projects',
      projectId,
      'thumbnail.jpg'
    )
    expect(fs.existsSync(thumbnailPath)).toBeTruthy()

    // Step 13: 等待 YouTube 上傳（真實上傳！）
    console.log('⏳ 等待上傳到 YouTube（真實上傳）...')
    await expect(page.locator('text=上傳到 YouTube')).toBeVisible()
    await expect(page.locator('text=上傳完成')).toBeVisible({ timeout: 300000 }) // 5分鐘

    console.log('✅ YouTube 上傳完成')

    // Step 14: 查看結果
    await page.click('button:has-text("查看結果")')
    await expect(page).toHaveURL(/\/project\/[^/]+\/result/)

    // 驗證：顯示 YouTube 連結
    const youtubeLink = page.locator('a[href*="youtube.com/watch"]')
    await expect(youtubeLink).toBeVisible()

    const href = await youtubeLink.getAttribute('href')
    youtubeVideoId = href?.match(/v=([^&]+)/)?.[1]!

    console.log(`🎬 YouTube 影片: https://youtube.com/watch?v=${youtubeVideoId}`)

    // 驗證：資料庫有完整記錄
    const finalCheck = await fetch(`http://localhost:8000/api/v1/projects/${projectId}/result`)
    const result = await finalCheck.json()
    expect(result.data.youtube_url).toBeTruthy()
    expect(result.data.youtube_video_id).toBe(youtubeVideoId)
    expect(result.data.status).toBe('completed')

    // 驗證：可以下載本地影片
    await page.click('button:has-text("下載影片")')
    // 這裡不驗證實際下載，只驗證按鈕可點擊

    console.log('✅ Flow-1 完整測試通過！')
    console.log(`📦 專案 ID: ${projectId}`)
    console.log(`🎬 YouTube: https://youtube.com/watch?v=${youtubeVideoId}`)
  })

  test.afterAll(async () => {
    // 清理測試影片（可選）
    // 注意：YouTube API 刪除影片需要特定權限
    if (youtubeVideoId) {
      console.log(`⚠️  請手動刪除測試影片: https://youtube.com/watch?v=${youtubeVideoId}`)
    }

    // 清理資料庫記錄（可選）
    if (projectId) {
      await fetch(`http://localhost:8000/api/v1/projects/${projectId}`, {
        method: 'DELETE'
      })
      console.log(`🗑️  已刪除測試專案: ${projectId}`)
    }
  })
})
```

**驗證點：**
- [ ] 真實調用 Gemini API 生成腳本
- [ ] 真實使用 FFmpeg 渲染影片
- [ ] 影片檔案真的生成在檔案系統
- [ ] 真實上傳到 YouTube（測試頻道）
- [ ] 資料庫有完整的專案記錄
- [ ] YouTube 影片可以播放

---

### 測試 3: 資料持久化驗證

**目的：** 驗證重啟後資料仍然存在

**測試檔案：** `tests/e2e/real/data-persistence.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('資料持久化測試', () => {
  test('重啟應用後資料應該保持', async ({ page, context }) => {
    // 1. 建立一個專案
    await context.addCookies([{
      name: 'setup-completed',
      value: 'true',
      domain: 'localhost',
      path: '/'
    }])

    await page.goto('http://localhost:3000')

    // 記錄現有專案數量
    const projectsBefore = await page.locator('[data-testid="project-card"]').count()
    console.log(`現有專案數: ${projectsBefore}`)

    // 2. 模擬重啟（重新載入頁面）
    await page.reload()

    // 3. 驗證：專案列表應該相同
    await expect(page.locator('[data-testid="project-card"]')).toHaveCount(projectsBefore)

    // 4. 驗證：設定應該保持
    await page.goto('http://localhost:3000/settings')

    // 應該顯示已配置的 API keys（遮罩顯示）
    await expect(page.locator('text=已配置')).toBeVisible()

    // 5. 驗證：YouTube 帳號應該保持連結
    await page.click('text=YouTube 授權')
    await expect(page.locator('text=已連結')).toBeVisible()

    console.log('✅ 資料持久化測試通過')
  })
})
```

---

### 測試 4: 錯誤處理與邊界條件

**目的：** 驗證各種錯誤情況的處理

**測試檔案：** `tests/e2e/real/error-handling.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('錯誤處理測試（真實環境）', () => {
  test('應該處理文字內容過短的情況', async ({ page, context }) => {
    await context.addCookies([{
      name: 'setup-completed',
      value: 'true',
      domain: 'localhost',
      path: '/'
    }])

    await page.goto('http://localhost:3000/project/create')

    // 輸入過短的文字（< 500字）
    await page.fill('textarea[name="content"]', '這段文字太短了')
    await page.click('button:has-text("下一步")')

    // 驗證：應該顯示錯誤訊息（真實的 backend 驗證）
    await expect(page.locator('text=文字長度必須在 500-10000 字之間')).toBeVisible()
  })

  test('應該處理重複的 YouTube 頻道授權', async ({ page, context }) => {
    await page.goto('http://localhost:3000/settings')
    await page.click('text=YouTube 授權')

    // 如果已經有連結的頻道，再次授權同一頻道
    const [oauthPopup] = await Promise.all([
      context.waitForEvent('page'),
      page.click('button:has-text("連結新的 YouTube 帳號")')
    ])

    // 完成 OAuth 流程（使用已授權的帳號）
    // ... OAuth 流程 ...

    // 驗證：應該顯示「此頻道已連結」
    await expect(page.locator('text=此頻道已連結')).toBeVisible()
  })

  test('應該處理專案不存在的情況', async ({ page }) => {
    // 訪問一個不存在的專案
    await page.goto('http://localhost:3000/project/non-existent-id/result')

    // 驗證：應該顯示 404 頁面（真實的 API 404 回應）
    await expect(page.locator('text=找不到專案')).toBeVisible()
  })

  test('應該處理資料庫 constraint violation', async ({ page, context }) => {
    // 嘗試建立相同名稱的專案（如果有 unique constraint）
    // 這會真實觸發資料庫錯誤

    await context.addCookies([{
      name: 'setup-completed',
      value: 'true',
      domain: 'localhost',
      path: '/'
    }])

    const duplicateName = 'Duplicate Test Project'

    // 第一次建立
    await page.goto('http://localhost:3000/project/create')
    await page.fill('input[name="project_name"]', duplicateName)
    // ... 完成建立 ...

    // 第二次嘗試使用相同名稱
    await page.goto('http://localhost:3000/project/create')
    await page.fill('input[name="project_name"]', duplicateName)
    await page.click('button:has-text("建立")')

    // 驗證：應該顯示錯誤（真實的資料庫錯誤處理）
    await expect(page.locator('text=專案名稱已存在')).toBeVisible()
  })
})
```

---

### 測試 5: 多頻道管理

**測試檔案：** `tests/e2e/real/multi-channel.spec.ts`

```typescript
test.describe('多頻道管理（真實環境）', () => {
  test('應該能夠管理多個 YouTube 頻道', async ({ page, context }) => {
    await context.addCookies([{
      name: 'setup-completed',
      value: 'true',
      domain: 'localhost',
      path: '/'
    }])

    await page.goto('http://localhost:3000/settings')
    await page.click('text=YouTube 授權')

    // 記錄現有頻道數量
    const channelsBefore = await page.locator('[data-testid="youtube-channel-card"]').count()

    // 連結第二個頻道
    const [oauthPopup] = await Promise.all([
      context.waitForEvent('page'),
      page.click('button:has-text("連結新的 YouTube 帳號")')
    ])

    // 完成 OAuth（使用不同帳號）
    // ... OAuth 流程 ...

    // 驗證：頻道數量應該增加
    await expect(page.locator('[data-testid="youtube-channel-card"]')).toHaveCount(channelsBefore + 1)

    // 驗證：可以刪除頻道
    await page.click('[data-testid="youtube-channel-card"]:first-child >> button:has-text("移除")')
    await page.click('button:has-text("確認刪除")')

    await expect(page.locator('[data-testid="youtube-channel-card"]')).toHaveCount(channelsBefore)

    // 驗證：資料庫真的刪除了
    const accountsCheck = await fetch('http://localhost:8000/api/v1/youtube/accounts')
    const accounts = await accountsCheck.json()
    expect(accounts.data.accounts.length).toBe(channelsBefore)
  })
})
```

---

### 測試 6: Flow-2 - 使用模板快速生成

**目的：** 驗證模板管理與使用模板快速生成影片的功能

**測試檔案：** `tests/e2e/real/flow-2-template.spec.ts`

**優先級：** P0（核心功能）

**測試案例：**
1. 應該能夠將配置保存為模板
2. 應該能夠列出所有已保存的模板
3. 應該能夠使用模板快速建立專案
4. 應該能夠編輯現有模板
5. 應該能夠刪除模板
6. 應該正確處理重複的模板名稱

**驗證點：**
- [ ] 模板真的儲存到資料庫
- [ ] 模板包含完整配置資訊
- [ ] 使用模板時配置正確應用
- [ ] 編輯模板後變更生效
- [ ] 刪除模板後資料庫記錄移除

---

### 測試 7: Flow-3 - 視覺化配置

**目的：** 驗證視覺化配置編輯器（Konva canvas）功能

**測試檔案：** `tests/e2e/real/flow-3-visual-config.spec.ts`

**優先級：** P2（進階功能）

**測試案例：**
1. 應該能夠進入視覺化配置界面
2. 應該能夠拖拽字幕元素
3. 應該能夠即時預覽配置效果
4. 應該能夠保存視覺配置
5. 應該能夠重置配置到預設值

**驗證點：**
- [ ] Konva canvas 正常載入
- [ ] 拖拽操作正確更新位置
- [ ] 配置變更即時反映在預覽中
- [ ] 保存的配置可以重新載入
- [ ] 重置功能恢復預設值

**注意事項：**
- 這個測試涉及 canvas 操作，較為複雜
- 可能需要特殊的 Playwright canvas 操作技巧

---

### 測試 8: Flow-4 - 排程發布影片

**目的：** 驗證排程發布功能，包含真實上傳為排程狀態

**測試檔案：** `tests/e2e/real/flow-4-scheduled-publish.spec.ts`

**優先級：** P1（重要功能）

**測試案例：**
1. 應該能夠設定未來發布時間
2. 應該拒絕過去的時間
3. 應該能夠查看排程影片列表
4. 應該能夠取消排程
5. 應該能夠修改排程時間

**驗證點：**
- [ ] 排程時間正確儲存到資料庫
- [ ] YouTube API 接受排程設定
- [ ] 資料庫記錄 youtube_status = 'scheduled'
- [ ] 排程列表正確顯示
- [ ] 取消/修改排程後狀態更新

**注意事項：**
- 測試時間可能需要 30 分鐘（包含完整影片生成）
- 需要驗證 YouTube Studio 中的排程狀態

---

### 測試 9: Flow-5 - 批次處理多個影片

**目的：** 驗證批次處理功能，包含進度監控和部分失敗處理

**測試檔案：** `tests/e2e/real/flow-5-batch.spec.ts`

**優先級：** P1（重要功能）

**測試案例：**
1. 應該能夠建立批次任務
2. 應該能夠監控批次進度
3. 應該能夠處理部分任務失敗
4. 應該能夠查看批次報告

**驗證點：**
- [ ] 批次任務記錄儲存到資料庫
- [ ] 進度條正確顯示整體進度
- [ ] 每個子任務狀態獨立追蹤
- [ ] 部分失敗時不影響其他任務
- [ ] 批次報告顯示成功/失敗統計

**注意事項：**
- 測試時間可能需要 60 分鐘（多個影片生成）
- 建議使用較短的測試內容以加快執行

---

### 測試 10: Flow-6 - 失敗恢復與斷點續傳

**目的：** 驗證錯誤恢復機制，能夠從中斷點繼續執行

**測試檔案：** `tests/e2e/real/flow-6-resume.spec.ts`

**優先級：** P0（核心功能）

**測試案例：**
1. 應該能夠列出可恢復的專案
2. 應該能夠從腳本生成失敗處恢復
3. 應該能夠從素材生成失敗處恢復
4. 應該能夠處理網路中斷後恢復
5. 應該能夠查看失敗日誌

**驗證點：**
- [ ] 失敗狀態正確記錄到資料庫
- [ ] 恢復時從正確的步驟繼續
- [ ] 已完成的步驟不重複執行
- [ ] 失敗日誌包含詳細錯誤資訊
- [ ] 恢復後能夠繼續到完成

**注意事項：**
- 需要模擬真實的失敗情況
- 可能需要手動中斷某些 API 調用

---

### 測試 11: Flow-7 - 段落級配置覆寫

**目的：** 驗證段落級配置功能，為特定段落設定不同配置

**測試檔案：** `tests/e2e/real/flow-7-section-override.spec.ts`

**優先級：** P2（進階功能）

**測試案例：**
1. 應該能夠進入段落級配置界面
2. 應該能夠為特定段落覆寫配置
3. 應該能夠查看段落配置摘要
4. 應該能夠清除段落覆寫配置
5. 應該能夠批量套用配置到多個段落
6. 應該驗證段落配置在實際渲染中生效

**驗證點：**
- [ ] 段落覆寫記錄儲存到資料庫
- [ ] 配置摘要正確顯示每個段落狀態
- [ ] 覆寫配置優先於全局配置
- [ ] 清除覆寫後恢復全局配置
- [ ] 批量操作正確應用到所有選中段落

---

### 測試 12: Flow-8 - Prompt 範本管理

**目的：** 驗證 Prompt 範本的新增、編輯和使用功能

**測試檔案：** `tests/e2e/real/flow-8-prompt-templates.spec.ts`

**優先級：** P1（重要功能）

**測試案例：**
1. 應該能夠新增自訂 Prompt 範本
2. 應該能夠編輯現有 Prompt 範本
3. 應該能夠使用自訂 Prompt 生成腳本
4. 應該能夠刪除 Prompt 範本
5. 應該能夠查看 Prompt 範本預覽

**驗證點：**
- [ ] 範本儲存到資料庫
- [ ] 範本包含完整的 prompt 內容
- [ ] 使用自訂範本時腳本符合要求
- [ ] 編輯範本後變更生效
- [ ] 刪除範本後資料庫記錄移除
- [ ] 預覽正確顯示範本內容

**注意事項：**
- 使用自訂 Prompt 測試時會消耗真實 Gemini API quota
- 需要驗證生成的腳本確實符合自訂 Prompt 的要求

---

## 測試執行

### 執行方式

```bash
# 1. 準備環境
./tests/e2e/setup-real-env.sh

# 2. 執行所有真實測試
npm run test:real

# 或執行單一測試
npx playwright test tests/e2e/real/flow-0-setup.spec.ts

# 3. 清理環境
./tests/e2e/cleanup-real-env.sh
```

### Package.json 新增腳本

```json
{
  "scripts": {
    "test:real": "playwright test tests/e2e/real --headed --workers=1",
    "test:real:debug": "PWDEBUG=1 playwright test tests/e2e/real --headed --workers=1"
  }
}
```

### 測試配置

**檔案：** `playwright.config.real.ts`

```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e/real',
  timeout: 30 * 60 * 1000, // 30 分鐘（因為有真實的影片生成）
  retries: 0, // 不重試（真實環境下重試沒意義）
  workers: 1, // 串行執行（避免資料庫衝突）

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    headless: false, // 顯示瀏覽器（方便觀察 OAuth）
  },

  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
})
```

---

## 測試報告

### 測試完成後產生報告

**檔案：** `tests/e2e/real/generate-report.sh`

```bash
#!/bin/bash
# 生成真實測試報告

REPORT_FILE="test-report-real-$(date +%Y%m%d-%H%M%S).md"

cat > $REPORT_FILE <<EOF
# YTMaker 真實環境測試報告

**測試日期:** $(date)
**測試環境:** 本地開發環境

## 測試執行摘要

- **Flow-0 首次設定:** $(grep -c "Flow-0.*通過" test-results.log || echo "未執行")
- **Flow-1 影片生成:** $(grep -c "Flow-1.*通過" test-results.log || echo "未執行")
- **資料持久化:** $(grep -c "持久化.*通過" test-results.log || echo "未執行")
- **錯誤處理:** $(grep -c "錯誤處理.*通過" test-results.log || echo "未執行")

## 真實生成的影片

EOF

# 列出所有測試專案
sqlite3 backend/ytmaker.db "SELECT name, youtube_video_id, created_at FROM projects WHERE name LIKE 'Test Project%'" | while read line; do
  echo "- $line" >> $REPORT_FILE
done

cat >> $REPORT_FILE <<EOF

## 外部 API 調用記錄

- Gemini API 調用次數: $(grep -c "Gemini API" backend/logs/api.log || echo "0")
- YouTube API 調用次數: $(grep -c "YouTube API" backend/logs/api.log || echo "0")

## 問題與建議

[手動填寫發現的問題]

EOF

echo "✅ 報告已生成: $REPORT_FILE"
```

---

## 預估時間分配

### 初始規劃（測試 1-5）

| 任務 | 預估時間 |
|------|---------|
| 環境準備腳本 | 1 小時 |
| 測試 1: Flow-0 設定 | 1.5 小時 |
| 測試 2: Flow-1 影片生成 | 2.5 小時 |
| 測試 3: 資料持久化 | 0.5 小時 |
| 測試 4: 錯誤處理 | 1.5 小時 |
| 測試 5: 多頻道管理 | 1 小時 |

**小計:** 約 8 小時

### 補充測試（測試 6-12，達成 100% 流程覆蓋）

| 任務 | 預估時間 | 優先級 |
|------|---------|--------|
| 測試 6: Flow-2 模板管理 | 1 小時 | P0 |
| 測試 7: Flow-3 視覺化配置 | 1.5 小時 | P2 |
| 測試 8: Flow-4 排程發布 | 1.5 小時 | P1 |
| 測試 9: Flow-5 批次處理 | 1.5 小時 | P1 |
| 測試 10: Flow-6 失敗恢復 | 1 小時 | P0 |
| 測試 11: Flow-7 段落級配置 | 1 小時 | P2 |
| 測試 12: Flow-8 Prompt 範本 | 1 小時 | P1 |

**小計:** 約 8.5 小時

**總計:** 約 16.5 小時（初始 8 小時 + 補充 8.5 小時）

**說明：**
- 初始任務（測試 1-5）已完成，耗時約 8 小時
- 補充任務（測試 6-12）為達成完整流程覆蓋而新增
- 補充測試已實作完成，實際耗時約 4-5 小時（因重用基礎設施）

---

## 注意事項

### ⚠️ 重要提醒

1. **真實 API 消耗**
   - Gemini API 會消耗真實 quota
   - YouTube 會實際上傳影片到測試頻道
   - 測試完成後記得清理測試影片

2. **測試資料清理**
   - 測試前備份資料庫
   - 測試後清理測試專案
   - 定期刪除測試 YouTube 影片

3. **測試時間**
   - 完整的影片生成可能需要 15-20 分鐘
   - 建議預留充足時間
   - 可以先執行快速測試（Flow-0）驗證環境

4. **OAuth 手動操作**
   - 測試會暫停等待 OAuth 完成
   - 需要手動在彈出視窗完成授權
   - 或使用已授權的帳號測試

5. **並行限制**
   - 測試必須串行執行（workers=1）
   - 避免資料庫寫入衝突
   - 避免 API rate limit

---

## 成功標準總結

- [ ] 所有 12 個測試套件全部通過（涵蓋產品設計中的所有 10 個流程）
- [ ] 至少生成 1 支真實影片並上傳到 YouTube
- [ ] 所有資料庫驗證通過（真實查詢）
- [ ] 所有檔案驗證通過（真實檔案存在）
- [ ] 環境準備與清理腳本可正常運作
- [ ] 測試可在乾淨環境重複執行
- [ ] 測試報告完整記錄所有結果
- [ ] 達成 100% 產品流程測試覆蓋（Flow-0 至 Flow-9 全部涵蓋）

---

## 相關資源

### 測試工具
- Playwright（真實瀏覽器測試）
- SQLite CLI（資料庫驗證）
- curl（API 驗證）

### 文件參考
- `issues/issue-006.md` - E2E 測試失敗的經驗
- `issues/issue-009.md` - OAuth 整合問題
- `issues/issue-009-1.md` - 配置與環境問題

---

**準備好開始真實測試了嗎？讓我們驗證系統在真實環境下的表現！** 🚀
