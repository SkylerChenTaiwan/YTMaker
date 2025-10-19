# Generate Tech Specs Backend Command

請閱讀以下產品設計文件：
- `product-design/overview.md` - 產品概述
- `product-design/flows.md` - 使用者流程與需求
- `product-design/pages.md` - 頁面設計

以及技術框架文件：
- `tech-specs/framework.md` - 技術框架（必須先存在）

基於這些文件，生成完整的 `tech-specs/backend-spec.md` 文件，定義後端系統的詳細技術規格。

## 要求

1. **API 規格 (API Specification)**
   - 列出所有 API endpoints
   - 定義 Request/Response 格式
   - HTTP methods 與狀態碼
   - 認證與授權要求
   - Rate limiting 規則
   - API 版本管理策略

2. **資料模型 (Data Models)**
   - 定義所有資料實體（Entity）
   - 欄位定義與類型
   - 關聯關係（一對一、一對多、多對多）
   - 索引策略
   - 資料驗證規則
   - 軟刪除策略

3. **資料庫設計 (Database Design)**
   - Schema 設計
   - 資料表結構
   - 外鍵約束
   - 索引設計
   - 分區策略（如需要）
   - 遷移策略

4. **業務邏輯 (Business Logic)**
   - 核心服務設計
   - 業務規則定義
   - 工作流程
   - 驗證邏輯
   - 計算邏輯
   - 狀態管理

5. **認證與授權 (Authentication & Authorization)**
   - 用戶認證流程
   - Token 管理（JWT/Session）
   - 權限模型（RBAC/ABAC）
   - 角色定義
   - 資源存取控制
   - 密碼策略

6. **錯誤處理 (Error Handling)**
   - 錯誤碼定義
   - 錯誤訊息格式
   - 異常處理策略
   - 錯誤日誌記錄
   - 用戶友善錯誤訊息

7. **背景任務 (Background Jobs)**
   - 需要的背景任務列表
   - 任務排程策略
   - 重試機制
   - 失敗處理
   - 監控與通知

8. **第三方整合 (Third-party Integrations)**
   - 需要整合的外部服務
   - API 金鑰管理
   - Webhook 處理
   - 錯誤處理與重試
   - 降級方案

9. **快取策略 (Caching Strategy)**
   - 需要快取的資料
   - 快取層級（應用/資料庫/CDN）
   - 快取失效策略
   - 快取更新機制

10. **效能優化 (Performance Optimization)**
    - 資料庫查詢優化
    - N+1 問題處理
    - 批次處理策略
    - 非同步處理
    - 分頁策略

11. **安全措施 (Security Measures)**
    - 輸入驗證
    - SQL Injection 防護
    - XSS 防護
    - CSRF 防護
    - 敏感資料加密
    - API 安全最佳實踐

12. **測試規格 (Testing Specification)**
    - 單元測試要求
    - 整合測試案例
    - API 測試策略
    - Mock 資料設計
    - 測試環境設定

## 輸出

生成完整的 `tech-specs/backend-spec.md` 文件，包含所有上述內容。

確保：
- ✅ API 設計符合 RESTful 最佳實踐（或其他選擇的 API 風格）
- ✅ 資料模型完整且正規化
- ✅ 考慮到效能與安全性
- ✅ 錯誤處理完整
- ✅ 與 framework.md 保持一致
- ✅ 可直接用於開發實作

完成後告訴我：
- 總共定義了多少個 API endpoints
- 設計了多少個資料模型
- 識別了多少個背景任務
- 是否有任何需要回到產品設計或技術框架階段釐清的問題
