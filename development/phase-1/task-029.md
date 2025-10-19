# Task-029: E2E 整合測試

> **建立日期:** 2025-10-19
> **狀態:** ⏳ 未開始  
> **預計時間:** 16 小時
> **優先級:** P0 (必須)

---

## 關聯文件

### 技術規格
- **後端測試:** `tech-specs/backend/testing.md`
- **前端測試:** `tech-specs/frontend/testing.md`

### 相關任務
- **前置任務:** Task-001 ~ Task-028 (所有前端與後端任務)
- **後續任務:** Task-030 (Electron 打包)

---

## 任務目標

### 簡述
實作完整的 E2E 整合測試，涵蓋所有核心使用者流程與第三方 API 整合。

### 成功標準
- [x] 8 個核心流程的 E2E 測試完成
- [x] 第三方 API Mock 完成
- [x] CI/CD 整合完成
- [x] 測試覆蓋率 > 80%
- [x] 所有測試通過

---

## 8 個核心 E2E 測試流程

### 1. 首次設定流程
- 導航到 `/setup`
- 輸入各種 API Keys
- 完成 YouTube OAuth
- 驗證設定儲存

### 2. 建立專案流程
- 導航到 `/project/new`
- 輸入專案資訊
- 配置視覺參數
- 配置 Prompt
- 配置 YouTube 資訊
- 提交專案

### 3. 生成影片流程
- 選擇專案
- 開始生成
- 監控進度
- 驗證各階段狀態更新

### 4. 查看結果流程
- 導航到結果頁
- 預覽影片
- 下載影片
- 上傳到 YouTube

### 5. 配置管理流程
- 建立視覺配置
- 建立 Prompt 範本
- 複製配置
- 套用到專案

### 6. 模板管理流程
- 建立自訂模板
- 匯出模板
- 匯入模板
- 套用模板

### 7. 批次處理流程
- 建立批次任務
- 批次生成多個專案
- 暫停批次
- 繼續批次

### 8. 錯誤處理流程
- API 額度耗盡
- 網路錯誤
- 第三方服務錯誤
- 驗證錯誤回應

---

## Mock 策略

### 第三方 API Mock
- Google Gemini API
- Stability AI API
- D-ID API
- YouTube Data API

### Mock 工具
- MSW (Mock Service Worker)
- Nock (HTTP mocking)

---

## CI/CD 整合

### GitHub Actions Workflow
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
      - name: Setup Python
        uses: actions/setup-python@v4
      - name: Install dependencies
        run: |
          npm install
          pip install -r requirements.txt
      - name: Run E2E tests
        run: npm run test:e2e
```

---

## 驗證檢查

### 測試執行
- [ ] 所有 8 個流程測試通過
- [ ] Mock 正確運作
- [ ] 測試執行時間 < 10 分鐘

### 測試覆蓋率
- [ ] 整體覆蓋率 > 80%
- [ ] 核心業務邏輯 > 90%

---

## 完成檢查清單

- [ ] 8 個 E2E 測試完成
- [ ] 第三方 API Mock 完成
- [ ] CI/CD 整合完成
- [ ] 測試覆蓋率達標
- [ ] 所有測試通過
- [ ] 測試文件完成
