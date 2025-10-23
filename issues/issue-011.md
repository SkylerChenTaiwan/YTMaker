# Issue-011: Flow-1 影片生成流程完全失敗（核心功能）

> **建立日期:** 2025-10-23
> **優先級:** 🔴 P0 - 必須立即修復
> **狀態:** ⏳ 未解決
> **發現於:** Task-029E 真實環境測試

---

## 問題描述

在 Task-029E 的零 Mock 真實環境測試中，**Flow-1: 影片生成流程**測試完全失敗。這是系統的**核心功能**，如果無法生成影片並上傳到 YouTube，整個系統就失去存在價值。

### 失敗的測試

**測試文件:** `tests/e2e/real/flow-1-video-generation.spec.ts`
**測試案例:** `應該完整生成影片並上傳到 YouTube`
**執行時間:** 31.3秒後超時失敗

### 影響範圍

- ❌ 無法生成影片
- ❌ 無法上傳到 YouTube
- ❌ 核心業務流程中斷
- ⚠️ 系統無法交付價值給用戶

---

## 重現步驟

1. 啟動 backend 和 frontend
2. 執行測試：
   ```bash
   cd /Users/skyler/coding/YTMaker-task-029E
   npx playwright test -c playwright.config.real.ts tests/e2e/real/flow-1-video-generation.spec.ts
   ```
3. 觀察測試在 31.3 秒後失敗

### 測試期望的完整流程

測試預期執行以下 14 個步驟：

1. ✅ 建立新專案
2. ✅ 輸入專案名稱
3. ❓ 上傳文字內容
4. ❓ 配置視覺元素
5. ❓ 選擇 Prompt 範本
6. ❓ 選擇 Gemini 模型
7. ❓ 設定 YouTube 資訊
8. ❓ 選擇 YouTube 頻道
9. ❓ 等待腳本生成（真實調用 Gemini API）
10. ❓ 等待素材生成
11. ❓ 等待影片渲染（FFmpeg）
12. ❓ 等待封面生成
13. ❓ 等待 YouTube 上傳
14. ❓ 查看結果

**問題：** 不確定在哪個步驟失敗，需要查看詳細 trace。

---

## 根本原因分析

### 需要調查的方向

1. **前端路由問題**
   - `/project/create` 路由是否存在？
   - 頁面是否正確載入？

2. **前端表單問題**
   - 表單元素是否存在？
   - 元素的 name 屬性是否正確？
   - 檔案上傳功能是否正常？

3. **Backend API 問題**
   - 專案建立 API 是否正常運作？
   - 腳本生成 API 是否正常？
   - 是否有錯誤日誌？

4. **外部 API 整合問題**
   - Gemini API 是否正確配置？
   - YouTube API 是否正確配置？

### 查看詳細錯誤

```bash
cd /Users/skyler/coding/YTMaker-task-029E

# 查看詳細 trace（包含每個步驟的截圖和網路請求）
npx playwright show-trace test-results/flow-1-video-generation-*-chromium/trace.zip

# 查看失敗截圖
open test-results/flow-1-video-generation-*-chromium/test-failed-1.png

# 查看測試影片
open test-results/flow-1-video-generation-*-chromium/video.webm
```

---

## 解決方案

### 階段 1: 調查（1-2 小時）

1. **查看 Playwright trace**
   - 找出測試在哪個步驟失敗
   - 查看失敗時的截圖
   - 查看網路請求是否成功

2. **檢查前端路由**
   ```bash
   # 手動訪問測試路由
   open http://localhost:3000/project/create
   ```

3. **檢查 backend 日誌**
   - 查看是否有 API 錯誤
   - 確認 Gemini API Key 是否正確

### 階段 2: 修復（依調查結果而定）

#### 可能情況 A: 前端路由不存在
```typescript
// frontend/src/app/project/create/page.tsx
export default function CreateProjectPage() {
  // 實作專案建立頁面
}
```

#### 可能情況 B: 前端表單元素不匹配
- 更新表單元素的 name 屬性
- 或更新測試的選擇器

#### 可能情況 C: Backend API 未實作
- 實作 `/api/v1/projects` POST endpoint
- 實作腳本生成 API
- 實作影片生成 API

### 階段 3: 驗證修復

執行完整的驗證流程（見下方「驗證測試」章節）。

---

## 驗證測試

### 🎯 測試目標

確認以下功能全部正常運作：
1. 可以建立新專案
2. 可以上傳文字內容
3. 可以生成腳本（真實調用 Gemini API）
4. 可以生成素材
5. 可以渲染影片
6. 可以上傳到 YouTube
7. 可以查看結果

### 📋 驗證步驟

#### 1. 執行自動化測試

```bash
cd /Users/skyler/coding/YTMaker-task-029E

# 執行 Flow-1 測試
npx playwright test -c playwright.config.real.ts \
  tests/e2e/real/flow-1-video-generation.spec.ts \
  --reporter=list

# 預期結果：✅ 1 passed
```

#### 2. 驗證資料庫記錄

測試通過後，驗證資料庫有正確的記錄：

```bash
sqlite3 backend/ytmaker.db <<EOF
-- 查看最新建立的專案
SELECT
  id,
  name,
  status,
  youtube_video_id,
  created_at
FROM projects
WHERE name LIKE 'Test Project%'
ORDER BY created_at DESC
LIMIT 1;
EOF
```

**預期結果：**
- `status` = `'completed'`
- `youtube_video_id` 不為 NULL

#### 3. 驗證檔案生成

```bash
# 取得專案 ID（從上一步的查詢結果）
PROJECT_ID="<從資料庫查詢得到的 ID>"

# 驗證影片檔案存在
ls -lh backend/data/projects/$PROJECT_ID/final_video.mp4

# 驗證封面檔案存在
ls -lh backend/data/projects/$PROJECT_ID/thumbnail.jpg

# 驗證腳本檔案存在
ls -lh backend/data/projects/$PROJECT_ID/script.json
```

**預期結果：**
- `final_video.mp4` 存在且大小 > 1MB
- `thumbnail.jpg` 存在且大小 > 10KB
- `script.json` 存在且包含腳本內容

#### 4. 驗證 YouTube 上傳

```bash
# 從測試輸出或資料庫取得 YouTube 影片 ID
YOUTUBE_VIDEO_ID="<從測試輸出取得>"

# 在瀏覽器中驗證影片存在
open "https://youtube.com/watch?v=$YOUTUBE_VIDEO_ID"
```

**預期結果：**
- 影片可以在 YouTube 上播放
- 影片標題、描述、標籤正確
- 影片隱私設定為 unlisted（測試用）

#### 5. 手動測試（可選）

如果自動化測試通過，進行一次手動測試驗證：

```bash
# 1. 開啟應用
open http://localhost:3000

# 2. 手動執行完整流程
# - 建立新專案
# - 上傳測試文字檔案
# - 配置各項設定
# - 生成影片
# - 確認上傳成功
```

### ✅ 通過標準

**此 Issue 被視為已解決，當且僅當：**

1. ✅ **自動化測試通過**
   ```
   npx playwright test tests/e2e/real/flow-1-video-generation.spec.ts

   結果: ✅ 1 passed (預期 15-20 分鐘)
   ```

2. ✅ **資料庫記錄正確**
   - 專案狀態 = `completed`
   - 有 YouTube video ID

3. ✅ **檔案正確生成**
   - final_video.mp4 存在且 > 1MB
   - thumbnail.jpg 存在且 > 10KB
   - script.json 存在且有效

4. ✅ **YouTube 上傳成功**
   - 影片在 YouTube 上可播放
   - 影片資訊正確

5. ✅ **可重複執行**
   - 測試可以重複執行並通過
   - 不會因為重複執行而失敗

### 📊 測試執行記錄

| 日期 | 執行者 | 結果 | 備註 |
|------|--------|------|------|
| 2025-10-23 | Claude | ❌ 失敗 | 初始發現，31.3秒超時 |
| | | | |

---

## 相關資源

### 測試文件
- 測試檔案: `tests/e2e/real/flow-1-video-generation.spec.ts`
- 測試結果: `test-results/flow-1-video-generation-*-chromium/`
- 測試報告: `test-report-20251023-180621.md`

### 相關 Spec
- `product-design/flows.md` - Flow-1 產品流程定義
- `tech-specs/backend/api-projects.md` - 專案 API 規格
- `tech-specs/backend/api-script-generation.md` - 腳本生成 API
- `tech-specs/backend/api-video-generation.md` - 影片生成 API

### 相關 Issues
- Issue-006: E2E 測試失敗（已解決）
- Issue-009: YouTube OAuth 問題（已解決）

---

## 時間估算

- 🔍 調查: 1-2 小時
- 🔧 修復: 2-8 小時（依問題嚴重程度）
- ✅ 驗證: 30 分鐘
- **總計: 3.5-10.5 小時**

---

## 備註

這是 **Task-029E 發現的最關鍵問題**。如果核心功能無法運作，系統就無法交付價值。建議在修復其他問題之前，優先解決此問題。

修復完成後，建議執行完整的測試套件，確保修復沒有破壞其他功能：

```bash
npx playwright test -c playwright.config.real.ts
```
