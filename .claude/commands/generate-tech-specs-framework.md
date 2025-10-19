# Generate Tech Specs Framework Command

請閱讀以下產品設計文件：
- `product-design/overview.md` - 產品概述
- `product-design/flows.md` - 使用者流程與需求
- `product-design/pages.md` - 頁面設計

基於這些文件，生成完整的 `tech-specs/framework.md` 文件，定義整個系統的技術框架。

## 要求

1. **技術棧選擇 (Tech Stack)**
   - 前端框架與函式庫
   - 後端框架與工具
   - 資料庫選擇（主要資料庫、快取、訊息佇列等）
   - 開發工具與測試框架
   - 部署與 CI/CD 工具
   - 每個選擇都要說明理由

2. **系統架構 (System Architecture)**
   - 整體架構設計（單體/微服務/Serverless 等）
   - 前後端分離策略
   - API 設計風格（REST/GraphQL/gRPC）
   - 資料流向圖
   - 服務間通訊方式
   - 說明架構決策的原因

3. **開發環境 (Development Environment)**
   - 本地開發環境設定
   - 開發工具與編輯器配置
   - 程式碼風格與 Linting 規則
   - Git workflow 與分支策略
   - Pre-commit hooks 設定

4. **測試策略 (Testing Strategy)**
   - 單元測試框架與工具
   - 整合測試策略
   - E2E 測試工具
   - 測試覆蓋率目標
   - Mock 與 Stub 策略
   - 測試資料管理

5. **部署架構 (Deployment Architecture)**
   - 環境劃分（dev/staging/production）
   - 容器化策略（Docker/Kubernetes）
   - CI/CD pipeline 設計
   - 版本管理策略
   - Rollback 機制
   - 監控與日誌方案

6. **安全架構 (Security Architecture)**
   - 認證與授權機制
   - 資料加密策略
   - API 安全防護
   - 敏感資料處理
   - 安全審計方案

7. **效能與擴展性 (Performance & Scalability)**
   - 快取策略
   - 負載平衡方案
   - 水平擴展計畫
   - 資料庫優化策略
   - CDN 與靜態資源處理

8. **專案結構 (Project Structure)**
   - 前端專案目錄結構
   - 後端專案目錄結構
   - 共用程式碼組織
   - 設定檔管理
   - 環境變數處理

## 輸出

生成完整的 `tech-specs/framework.md` 文件，包含所有上述內容。

確保：
- ✅ 技術選擇符合產品需求
- ✅ 架構設計考慮到擴展性與維護性
- ✅ 開發流程清晰可執行
- ✅ 測試策略完整
- ✅ 部署與安全方案明確
- ✅ 與產品設計文件保持一致

完成後告訴我：
- 選擇的核心技術棧
- 採用的架構模式
- 是否有任何需要回到產品設計階段釐清的問題
