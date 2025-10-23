# YTMaker 真實環境 E2E 測試

這是 YTMaker 的零 Mock 真實環境端到端測試套件。

## 🎯 測試目標

這些測試在**完全真實的環境**下運行，驗證系統的實際可用性：

- ✅ 使用真實的 Backend + Frontend + Database
- ✅ 真實調用 Gemini API
- ✅ 真實調用 YouTube API
- ✅ 真實生成影片檔案
- ✅ 真實上傳到 YouTube
- ❌ 不使用任何 mock 或 stub

## ⚠️  重要警告

**執行這些測試會：**
- 消耗真實的 API quota
- 實際上傳影片到 YouTube
- 需要 10-25 分鐘完成（Flow-1 影片生成）
- 需要手動完成 OAuth 授權

**測試完成後請記得：**
- 手動刪除 YouTube 上的測試影片
- 執行清理腳本清除測試資料

## 📋 前置要求

### 1. 環境配置

確保已設定以下檔案：

#### `backend/.env`
```env
ENCRYPTION_KEY=your-encryption-key
GEMINI_API_KEY=your-gemini-api-key
# 可選
STABILITY_API_KEY=your-stability-api-key
DID_API_KEY=your-did-api-key
```

#### `backend/client_secrets.json`
從 Google Cloud Console 下載的 OAuth 2.0 憑證。

### 2. 依賴安裝

```bash
# Backend 依賴
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..

# Frontend 依賴
cd frontend
npm install
cd ..
```

### 3. 環境變數

測試需要以下環境變數：

```bash
export GEMINI_API_KEY="your-api-key-here"
```

或在執行測試前設定：

```bash
GEMINI_API_KEY="your-key" npm run test:real
```

## 🚀 執行測試

### 1. 準備環境

```bash
# 啟動 Backend 和 Frontend
./tests/e2e/setup-real-env.sh
```

這個腳本會：
- ✅ 備份資料庫
- ✅ 清理舊的測試資料
- ✅ 檢查配置檔案
- ✅ 測試 API 連線
- ✅ 啟動 Backend (port 8000)
- ✅ 啟動 Frontend (port 3000)

### 2. 執行測試

```bash
# 執行所有真實環境測試
cd frontend
npm run test:real

# 或執行特定測試
npm run test:real:flow0   # 首次設定流程
npm run test:real:flow1   # 影片生成流程（需要 10-25 分鐘）

# Debug 模式（顯示瀏覽器）
npm run test:real:debug
```

### 3. 清理環境

```bash
# 停止服務並清理測試資料
./tests/e2e/cleanup-real-env.sh
```

### 4. 生成測試報告

```bash
# 生成 Markdown 報告
./tests/e2e/generate-report.sh

# 查看 HTML 報告
open test-results/html/index.html
```

## 📂 測試結構

```
tests/e2e/
├── real/                           # 真實環境測試
│   ├── flow-0-setup.spec.ts       # 首次設定流程
│   ├── flow-1-video-generation.spec.ts  # 影片生成流程
│   ├── data-persistence.spec.ts   # 資料持久化驗證
│   ├── error-handling.spec.ts     # 錯誤處理測試
│   └── multi-channel.spec.ts      # 多頻道管理測試
├── setup-real-env.sh              # 環境準備腳本
├── cleanup-real-env.sh            # 環境清理腳本
├── generate-report.sh             # 報告生成腳本
└── README.md                      # 本文件
```

## 🧪 測試套件

### Test 1: Flow-0 - 首次設定流程

**檔案:** `flow-0-setup.spec.ts`

**測試內容:**
- 完整的首次設定流程（11 步驟）
- 真實的 Gemini API 連線測試
- 真實的 Google OAuth 流程
- 資料庫寫入驗證
- Cookie 設定驗證

**預估時間:** 2-5 分鐘（需手動完成 OAuth）

**執行:**
```bash
npm run test:real:flow0
```

### Test 2: Flow-1 - 影片生成流程

**檔案:** `flow-1-video-generation.spec.ts`

**測試內容:**
- 完整的影片生成流程（14 步驟）
- 真實調用 Gemini API 生成腳本
- 真實使用 FFmpeg 渲染影片
- 真實上傳到 YouTube
- 檔案系統驗證

**預估時間:** 10-25 分鐘

**執行:**
```bash
npm run test:real:flow1
```

**⚠️  重要:** 這個測試會實際上傳影片到 YouTube！

### Test 3: 資料持久化驗證

**檔案:** `data-persistence.spec.ts`

**測試內容:**
- 重啟後資料保持
- Cookie 過期處理
- 資料庫持久化驗證

**預估時間:** 1-2 分鐘

### Test 4: 錯誤處理與邊界條件

**檔案:** `error-handling.spec.ts`

**測試內容:**
- 文字長度驗證
- 專案名稱重複處理
- API Key 無效處理
- 網路錯誤處理

**預估時間:** 2-3 分鐘

### Test 5: 多頻道管理

**檔案:** `multi-channel.spec.ts`

**測試內容:**
- 查看已連結頻道
- 連結第二個頻道
- 移除頻道
- 重複頻道檢測

**預估時間:** 3-5 分鐘（需手動完成 OAuth）

## 📊 測試報告

測試完成後會生成以下報告：

### Playwright HTML 報告
```bash
open test-results/html/index.html
```

包含：
- 詳細的測試結果
- 截圖和影片記錄
- 錯誤堆棧追蹤

### 自訂 Markdown 報告
```bash
cat test-results/test-report-real-*.md
```

包含：
- 測試執行摘要
- 真實生成的影片列表
- API 調用記錄
- 已知問題與建議

## 🔧 故障排除

### 問題 1: Backend 啟動失敗

**症狀:** `setup-real-env.sh` 報告 Backend 啟動超時

**解決方法:**
```bash
# 檢查 Python 環境
cd backend && source venv/bin/activate && python --version

# 手動啟動 Backend
uvicorn app.main:app --reload --port 8000

# 檢查錯誤訊息
cat /tmp/ytmaker-backend.log
```

### 問題 2: Frontend 啟動失敗

**症狀:** `setup-real-env.sh` 報告 Frontend 啟動超時

**解決方法:**
```bash
# 檢查 Node 版本
node --version

# 重新安裝依賴
cd frontend && rm -rf node_modules && npm install

# 手動啟動 Frontend
npm run dev

# 檢查錯誤訊息
cat /tmp/ytmaker-frontend.log
```

### 問題 3: Gemini API 連線失敗

**症狀:** 測試報告 "API Key 無效"

**解決方法:**
```bash
# 檢查 API Key 是否設定
echo $GEMINI_API_KEY

# 測試 API 連線
curl -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"test"}]}]}' \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=$GEMINI_API_KEY"
```

### 問題 4: OAuth 授權失敗

**症狀:** OAuth 彈出視窗無法重定向

**解決方法:**
1. 確認 `backend/client_secrets.json` 正確
2. 確認 Redirect URI 設定為 `http://localhost:8000/api/v1/youtube/callback`
3. 確認 Google Cloud Console 中的 OAuth 設定

### 問題 5: 資料庫權限錯誤

**症狀:** 測試報告資料庫寫入失敗

**解決方法:**
```bash
# 檢查資料庫權限
ls -l backend/ytmaker.db

# 重設權限
chmod 664 backend/ytmaker.db

# 重新初始化資料庫
cd backend
python -m app.init_db
```

## 📝 最佳實踐

### 1. 測試前

- ✅ 確保 API quota 充足
- ✅ 備份重要資料
- ✅ 預留充足時間（特別是 Flow-1）
- ✅ 準備好測試 YouTube 帳號

### 2. 測試中

- ✅ 不要關閉終端機
- ✅ 不要關閉瀏覽器（OAuth 需要）
- ✅ 監控測試進度（console logs）
- ✅ 注意錯誤訊息

### 3. 測試後

- ✅ 查看測試報告
- ✅ 清理測試資料
- ✅ 刪除 YouTube 測試影片
- ✅ 檢查 API quota 使用情況

## 🔒 安全注意事項

- ⚠️  不要 commit API Keys 到 Git
- ⚠️  不要在公開 YouTube 頻道測試
- ⚠️  使用 unlisted 或 private 隱私設定
- ⚠️  定期檢查 API 使用情況
- ⚠️  測試後清理敏感資料

## 📚 相關文件

- [Product Design - Flows](../../product-design/flows.md)
- [Backend Specification](../../tech-specs/backend/_index.md)
- [Frontend Specification](../../tech-specs/frontend/_index.md)
- [Task-029E 文件](../../development/phase-1/task-029E.md)

## 💡 提示

### 加速測試

如果只是驗證功能而非完整測試，可以：

1. 跳過 Flow-1（最耗時）
2. 使用更短的文字內容
3. 減少測試案例數量

### 持續整合

這些測試**不適合**放在 CI/CD 中，因為：
- 需要真實的 API Keys
- 需要手動 OAuth 操作
- 執行時間過長
- 消耗真實資源

建議僅在以下情況執行：
- 重大發布前
- 修復關鍵 bug 後
- 每週/每月例行驗證

## 🆘 需要幫助？

如果遇到問題：

1. 查看測試日誌
2. 查看 Backend 日誌 (`/tmp/ytmaker-backend.log`)
3. 查看 Frontend 日誌 (`/tmp/ytmaker-frontend.log`)
4. 查看 Playwright trace (`test-results/`)
5. 建立 Issue 並附上錯誤訊息

---

**最後更新:** 2025-10-23
**版本:** 1.0.0
**作者:** Claude Code
