# 前後端整合測試

## 目的

這個目錄包含前後端 API 整合測試，確保：

1. **API 格式一致性**：前端傳送的格式與後端期待的格式一致
2. **HTTP 通訊正確**：Request/Response 格式、Status Code、Error Handling
3. **真實環境測試**：測試真實的前後端通訊，不只是單元測試

## 為什麼需要整合測試？

單元測試只測試個別模組，E2E 測試只測試使用者流程，都無法捕捉「前後端 API 格式不一致」的問題。

**Issue-007 的案例：**
- 前端傳送：`{ provider: "gemini", apiKey: "..." }` (camelCase)
- 後端期待：`{ provider: "gemini", api_key: "..." }` (snake_case)
- 單元測試都通過（各自用正確格式）
- E2E 測試跳過了 API 層級
- 結果：production 才發現問題

**整合測試的價值：**
- 測試「前端實際呼叫後端」的情況
- 捕捉格式不一致、欄位命名錯誤
- 確保 HTTP 通訊層沒有問題

## 測試內容

### 1. API 格式驗證
- ✅ 正確格式應該成功
- ❌ 錯誤格式應該被拒絕 (422)
- 驗證 camelCase → snake_case 轉換

### 2. 錯誤處理
- 驗證 validation errors (422)
- 驗證 not found errors (404)
- 驗證錯誤訊息格式

### 3. 前端 API Client
- 測試前端 API client 真的呼叫後端
- 驗證前端內部的格式轉換

## 如何執行

### 方法 1：手動啟動 (開發時)

```bash
# Terminal 1: 啟動後端測試伺服器
cd backend
poetry run uvicorn app.main:app --reload --port 8000

# Terminal 2: 執行整合測試
npm run test:integration
```

### 方法 2：使用測試腳本 (推薦)

```bash
# 自動啟動後端並執行測試
npm run test:integration:auto
```

這個腳本會：
1. 啟動後端測試伺服器
2. 等待後端準備好
3. 執行整合測試
4. 測試完成後關閉後端

### 方法 3：CI/CD 環境

在 CI/CD 中，使用 Docker Compose：

```bash
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

## 測試涵蓋範圍

### ✅ 已實作

- `POST /api/v1/system/api-keys/test`
  - 正確格式測試
  - 錯誤格式測試 (camelCase)
  - 長度驗證測試

- `POST /api/v1/system/api-keys`
  - 正確格式測試
  - 錯誤格式測試 (camelCase)

- 前端 API Client
  - `systemApi.testApiKey()`
  - `systemApi.saveApiKey()`

### 📋 待實作

- `GET /api/v1/system/api-keys` - 取得 API Keys 狀態
- `GET /api/v1/system/init-status` - 初始化狀態
- `GET /api/v1/system/quota` - 配額狀態
- 其他 API endpoints (projects, scripts, etc.)

## 測試金字塔

```
       E2E (10%)
      /         \
     /           \
    / Integration \    ← 我們在這裡
   /    (30%)      \
  /                 \
 /   Unit (60%)      \
/_____________________\
```

整合測試應該佔測試套件的 30%，專注於：
- 重要的 API endpoints
- 容易出錯的介面（前後端交界）
- 資料格式轉換

## 持續改進

### 短期目標
- [ ] 為所有 System API 添加整合測試
- [ ] 設置自動化測試腳本
- [ ] 加入 CI/CD pipeline

### 中期目標
- [ ] 實作 API Contract Testing (使用 Pact)
- [ ] 自動生成 OpenAPI 規格
- [ ] 前後端 TypeScript types 自動同步

### 長期目標
- [ ] 所有 API 都有整合測試覆蓋
- [ ] 達到 > 80% API 覆蓋率
- [ ] 零格式不一致問題

## 參考資料

- [Integration Testing Best Practices](https://martinfowler.com/bliki/IntegrationTest.html)
- [Contract Testing with Pact](https://docs.pact.io/)
- [Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)

---

最後更新：2025-10-23
相關 Issue：Issue-008
