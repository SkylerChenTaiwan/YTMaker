# Issue-014: Flow-6 斷點續傳與錯誤恢復功能失敗

> **建立日期:** 2025-10-23
> **優先級:** 🔴 P0 - 必須立即修復
> **狀態:** ⏳ 未解決
> **發現於:** Task-029E 真實環境測試

---

## 問題描述

在 Task-029E 的零 Mock 真實環境測試中，**Flow-6: 斷點續傳與錯誤恢復**有 2 個關鍵測試失敗。這個功能對於長時間運行的影片生成流程至關重要，因為生成過程可能需要 10-20 分鐘，中間可能會因為各種原因中斷。

### 失敗的測試

**測試文件:** `tests/e2e/real/flow-6-resume.spec.ts`

#### 失敗 1: 從腳本生成失敗點恢復
**測試案例:** `應該能夠從腳本生成失敗點恢復`
**執行時間:** 31.5秒失敗

#### 失敗 2: 處理網路中斷後的恢復
**測試案例:** `應該能夠處理網路中斷後的恢復`
**執行時間:** 31.6秒失敗

### 通過的測試（5/7）

✅ 列出可恢復的專案
✅ 從素材生成失敗點恢復
✅ 檢測並顯示專案當前進度
✅ 查看失敗原因並提供解決建議
✅ 保存完整的錯誤日誌

這表示基礎架構存在，但特定的恢復場景有問題。

---

## 重現步驟

### 測試 1: 從腳本生成失敗點恢復

1. 執行測試：
   ```bash
   npx playwright test -c playwright.config.real.ts \
     tests/e2e/real/flow-6-resume.spec.ts:61 \
     --reporter=list
   ```

2. 預期流程：
   - 建立一個專案
   - 模擬腳本生成失敗
   - 從恢復列表中找到該專案
   - 點擊「繼續生成」
   - 重新執行腳本生成
   - 成功完成

3. 實際：31.5秒後失敗

### 測試 2: 處理網路中斷後的恢復

1. 執行測試：
   ```bash
   npx playwright test -c playwright.config.real.ts \
     tests/e2e/real/flow-6-resume.spec.ts:214 \
     --reporter=list
   ```

2. 預期流程：
   - 建立專案並開始生成
   - 模擬網路中斷（離線模式）
   - 專案進入失敗狀態
   - 恢復網路
   - 從失敗點繼續
   - 成功完成

3. 實際：31.6秒後失敗

---

## 根本原因分析

### 可能原因 1: 失敗狀態沒有正確記錄

系統可能沒有正確記錄專案的失敗狀態和失敗點：

```python
# backend/app/services/project_service.py
# 可能缺少以下邏輯

async def handle_generation_failure(project_id: str, step: str, error: Exception):
    """記錄失敗資訊供後續恢復使用"""
    await db.execute(
        """
        UPDATE projects
        SET
            status = 'failed',
            failed_step = ?,
            error_message = ?,
            updated_at = datetime('now')
        WHERE id = ?
        """,
        (step, str(error), project_id)
    )
```

### 可能原因 2: 恢復端點不存在或有問題

Frontend 可能無法找到恢復功能的 UI 或 API：

```typescript
// 測試期望的 UI
await page.click('button:has-text("繼續生成")')

// 但實際可能：
// 1. 按鈕不存在
// 2. 按鈕文字不同
// 3. API endpoint 不存在
```

### 可能原因 3: 恢復邏輯不完整

Backend 可能沒有實作從特定步驟恢復的邏輯：

```python
# 可能需要的 API
@app.post("/api/v1/projects/{project_id}/resume")
async def resume_project(project_id: str):
    """從失敗點繼續執行專案"""
    project = await get_project(project_id)

    # 根據 failed_step 決定從哪裡繼續
    if project.failed_step == "script_generation":
        await generate_script(project_id)
    elif project.failed_step == "asset_generation":
        await generate_assets(project_id)
    # ...
```

### 可能原因 4: 測試模擬失敗的方式不對

測試可能無法正確模擬失敗情況：

```typescript
// 測試試圖模擬失敗
await page.route('**/api/v1/script/generate', route => {
  route.abort()  // 中斷請求
})

// 但可能：
// 1. 路由攔截不成功
// 2. API 路徑不正確
// 3. 系統沒有捕捉這種失敗
```

---

## 解決方案

### 階段 1: 調查（1-2 小時）

#### 1. 查看詳細 trace

```bash
cd /Users/skyler/coding/YTMaker-task-029E

# 測試 1: 腳本生成失敗恢復
npx playwright show-trace test-results/flow-6-resume-*-應該能夠從腳本生成失敗點恢復*-chromium/trace.zip

# 測試 2: 網路中斷恢復
npx playwright show-trace test-results/flow-6-resume-*-應該能夠處理網路中斷後的恢復*-chromium/trace.zip

# 查看失敗截圖
open test-results/flow-6-resume-*-chromium/test-failed-*.png
```

#### 2. 檢查 Backend API

```bash
# 檢查是否有恢復 API
curl http://localhost:8000/docs | grep -i resume

# 或查看 API 文件
open http://localhost:8000/docs
```

#### 3. 檢查資料庫 Schema

```bash
# 檢查 projects 表是否有失敗相關欄位
sqlite3 backend/ytmaker.db <<EOF
PRAGMA table_info(projects);
EOF

# 預期應該有：
# - status (包含 'failed' 狀態)
# - failed_step (記錄在哪個步驟失敗)
# - error_message (錯誤訊息)
```

#### 4. 檢查前端是否有恢復 UI

```bash
# 搜尋恢復相關的程式碼
cd frontend/src
grep -r "繼續生成" .
grep -r "resume" .
grep -r "retry" .
```

### 階段 2: 實作缺失的功能

#### 實作 1: 資料庫 Schema

如果缺少相關欄位，更新 schema：

```sql
-- backend/migrations/add_resume_support.sql
ALTER TABLE projects ADD COLUMN failed_step TEXT;
ALTER TABLE projects ADD COLUMN error_message TEXT;
ALTER TABLE projects ADD COLUMN retry_count INTEGER DEFAULT 0;
```

#### 實作 2: Backend 恢復 API

```python
# backend/app/routers/projects.py

@router.post("/projects/{project_id}/resume")
async def resume_project(
    project_id: str,
    db: Session = Depends(get_db)
):
    """從失敗點恢復專案生成"""
    project = await get_project(db, project_id)

    if project.status != "failed":
        raise HTTPException(400, "專案不在失敗狀態")

    # 更新狀態為進行中
    project.status = "processing"
    project.retry_count += 1
    db.commit()

    # 根據失敗步驟繼續執行
    try:
        if project.failed_step == "script_generation":
            await generate_script(project_id)
        elif project.failed_step == "asset_generation":
            await generate_assets(project_id)
        elif project.failed_step == "video_rendering":
            await render_video(project_id)
        elif project.failed_step == "youtube_upload":
            await upload_to_youtube(project_id)
        else:
            raise ValueError(f"Unknown step: {project.failed_step}")

        return {"success": True, "message": "恢復成功"}

    except Exception as e:
        project.status = "failed"
        project.error_message = str(e)
        db.commit()
        raise HTTPException(500, f"恢復失敗: {str(e)}")
```

#### 實作 3: Frontend 恢復 UI

```typescript
// frontend/src/app/projects/[id]/page.tsx

export default function ProjectPage({ params }: { params: { id: string } }) {
  const { data: project } = useProject(params.id)

  const handleResume = async () => {
    try {
      await fetch(`/api/v1/projects/${params.id}/resume`, {
        method: 'POST'
      })
      // 重新載入專案狀態
      mutate()
    } catch (error) {
      console.error('恢復失敗:', error)
    }
  }

  return (
    <div>
      <h1>{project.name}</h1>

      {project.status === 'failed' && (
        <div className="error-banner">
          <p>生成失敗: {project.error_message}</p>
          <p>失敗步驟: {project.failed_step}</p>
          <button onClick={handleResume}>
            繼續生成
          </button>
        </div>
      )}

      {/* 其他內容 */}
    </div>
  )
}
```

#### 實作 4: 錯誤捕捉與記錄

在生成流程中加入錯誤處理：

```python
# backend/app/services/script_service.py

async def generate_script(project_id: str):
    try:
        # 原有的腳本生成邏輯
        script = await call_gemini_api(...)

        # 成功後更新狀態
        await update_project(project_id, {
            "script": script,
            "status": "script_generated",
            "failed_step": None,
            "error_message": None
        })

    except Exception as e:
        # 失敗時記錄詳細資訊
        await update_project(project_id, {
            "status": "failed",
            "failed_step": "script_generation",
            "error_message": str(e)
        })
        raise
```

---

## 驗證測試

### 🎯 測試目標

確認以下恢復場景全部正常運作：
1. 從腳本生成失敗點恢復
2. 從素材生成失敗點恢復
3. 從影片渲染失敗點恢復
4. 從 YouTube 上傳失敗點恢復
5. 處理網路中斷後的恢復
6. 查看失敗原因和錯誤日誌

### 📋 驗證步驟

#### 1. 執行自動化測試

```bash
cd /Users/skyler/coding/YTMaker-task-029E

# 執行所有 Flow-6 測試
npx playwright test -c playwright.config.real.ts \
  tests/e2e/real/flow-6-resume.spec.ts \
  --reporter=list

# 預期結果：✅ 7 passed (7/7)
```

#### 2. 驗證個別恢復場景

```bash
# 測試 1: 列出可恢復的專案
npx playwright test tests/e2e/real/flow-6-resume.spec.ts:28
# 預期: ✅ passed (已經通過)

# 測試 2: 從腳本生成失敗點恢復
npx playwright test tests/e2e/real/flow-6-resume.spec.ts:61
# 預期: ✅ passed (需要修復)

# 測試 3: 從素材生成失敗點恢復
npx playwright test tests/e2e/real/flow-6-resume.spec.ts:130
# 預期: ✅ passed (已經通過)

# 測試 4: 檢測專案當前進度
npx playwright test tests/e2e/real/flow-6-resume.spec.ts:172
# 預期: ✅ passed (已經通過)

# 測試 5: 處理網路中斷後恢復
npx playwright test tests/e2e/real/flow-6-resume.spec.ts:214
# 預期: ✅ passed (需要修復)

# 測試 6: 查看失敗原因
npx playwright test tests/e2e/real/flow-6-resume.spec.ts:251
# 預期: ✅ passed (已經通過)

# 測試 7: 保存錯誤日誌
npx playwright test tests/e2e/real/flow-6-resume.spec.ts:298
# 預期: ✅ passed (已經通過)
```

#### 3. 手動驗證恢復功能

##### 場景 A: 腳本生成失敗恢復

```bash
# 1. 手動建立一個失敗的專案
sqlite3 backend/ytmaker.db <<EOF
INSERT INTO projects (id, name, status, failed_step, error_message, created_at)
VALUES (
  'test-resume-001',
  'Test Resume Project',
  'failed',
  'script_generation',
  'Gemini API rate limit exceeded',
  datetime('now')
);
EOF

# 2. 訪問專案頁面
open http://localhost:3000/project/test-resume-001

# 3. 驗證 UI 顯示
# 預期看到:
# - 錯誤訊息: "Gemini API rate limit exceeded"
# - 失敗步驟: "script_generation"
# - 「繼續生成」按鈕

# 4. 點擊「繼續生成」
# 預期: 重新開始腳本生成流程

# 5. 驗證資料庫狀態
sqlite3 backend/ytmaker.db <<EOF
SELECT id, status, failed_step, retry_count
FROM projects
WHERE id = 'test-resume-001';
EOF

# 預期:
# status = 'processing' 或 'completed'
# failed_step = NULL
# retry_count = 1
```

##### 場景 B: 網路中斷恢復

```bash
# 這個場景較難手動模擬，主要依賴自動化測試
# 但可以驗證系統對網路錯誤的處理

# 1. 啟動專案生成
# 2. 在生成過程中斷開網路
# 3. 觀察系統行為
# 預期: 進入失敗狀態並記錄錯誤

# 4. 恢復網路
# 5. 點擊「繼續生成」
# 預期: 成功恢復並完成生成
```

#### 4. 驗證恢復 API

```bash
# 直接測試恢復 API
curl -X POST http://localhost:8000/api/v1/projects/test-resume-001/resume

# 預期回應:
# {
#   "success": true,
#   "message": "恢復成功"
# }

# 驗證專案狀態已更新
curl http://localhost:8000/api/v1/projects/test-resume-001 | jq '.data.status'
# 預期: "processing"
```

#### 5. 驗證錯誤日誌

```bash
# 查看專案的完整錯誤日誌
curl http://localhost:8000/api/v1/projects/test-resume-001/logs

# 預期返回:
# - 所有錯誤記錄
# - 每次重試的記錄
# - 時間戳記
# - 詳細錯誤訊息
```

### ✅ 通過標準

**此 Issue 被視為已解決，當且僅當：**

1. ✅ **所有自動化測試通過**
   ```bash
   npx playwright test tests/e2e/real/flow-6-resume.spec.ts
   結果: ✅ 7 passed (7/7)
   ```

2. ✅ **資料庫正確記錄失敗資訊**
   - `status` = `'failed'`
   - `failed_step` 記錄正確的失敗步驟
   - `error_message` 包含有意義的錯誤訊息
   - `retry_count` 正確計數

3. ✅ **前端顯示失敗資訊**
   - 顯示錯誤訊息
   - 顯示失敗步驟
   - 提供「繼續生成」按鈕

4. ✅ **恢復功能正常運作**
   - 點擊「繼續生成」後真的能繼續
   - 從正確的步驟開始執行
   - 不會重複執行已完成的步驟

5. ✅ **錯誤日誌完整**
   - 所有失敗都有記錄
   - 重試歷史可查詢
   - 時間戳記正確

6. ✅ **手動測試通過**
   - 各種失敗場景都能正確恢復
   - UI 友善且易於理解

### 📊 測試執行記錄

| 日期 | 測試案例 | 結果 | 備註 |
|------|---------|------|------|
| 2025-10-23 | 列出可恢復的專案 | ✅ | 已通過 |
| 2025-10-23 | 從腳本生成失敗點恢復 | ❌ | 31.5s 失敗 |
| 2025-10-23 | 從素材生成失敗點恢復 | ✅ | 已通過 |
| 2025-10-23 | 檢測專案當前進度 | ✅ | 已通過 |
| 2025-10-23 | 處理網路中斷後恢復 | ❌ | 31.6s 失敗 |
| 2025-10-23 | 查看失敗原因 | ✅ | 已通過 |
| 2025-10-23 | 保存錯誤日誌 | ✅ | 已通過 |

---

## 相關資源

### 測試文件
- 測試檔案: `tests/e2e/real/flow-6-resume.spec.ts`
- 測試結果: `test-results/flow-6-resume-*-chromium/`

### 相關 Spec
- `product-design/flows.md` - Flow-6 產品流程定義
- `tech-specs/backend/api-projects.md` - 專案 API 規格

### 資料庫
- `backend/ytmaker.db` - SQLite 資料庫
- `backend/migrations/` - 資料庫遷移腳本

---

## 時間估算

- 🔍 調查: 1-2 小時
- 🔧 實作恢復功能: 4-6 小時
- ✅ 驗證: 1-2 小時
- **總計: 6-10 小時**

---

## 備註

斷點續傳是長時間運行任務的關鍵功能。如果沒有這個功能，用戶在生成影片時遇到任何問題（網路、API 限制等），就必須從頭開始，體驗非常差。

建議修復順序：
1. Issue-011（影片生成）- 核心功能優先
2. Issue-012（首次設定 UI）- 快速修復
3. Issue-013（資料持久化）- 資料安全
4. **Issue-014（斷點續傳）** - 用戶體驗關鍵

修復時要注意：
- 每個步驟都要有錯誤捕捉
- 失敗時要保存足夠的資訊供恢復使用
- UI 要清楚告訴用戶發生了什麼以及如何解決
- 重試次數要有上限，避免無限重試
