# Generate Tech Specs Frontend Command

請閱讀以下產品設計文件：
- `product-design/overview.md` - 產品概述
- `product-design/flows.md` - 使用者流程與需求
- `product-design/pages.md` - 頁面設計

以及技術框架文件：
- `tech-specs/framework.md` - 技術框架（必須先存在）

基於這些文件，生成完整的 `tech-specs/frontend-spec.md` 文件，定義前端系統的詳細技術規格。

## 要求

1. **頁面結構 (Page Structure)**
   - 列出所有頁面/路由
   - 頁面層級結構
   - 路由設計與參數
   - 頁面間導航邏輯
   - 麵包屑設計
   - 權限控制

2. **元件架構 (Component Architecture)**
   - 定義所有共用元件
   - 元件層級結構
   - Props 與事件定義
   - 元件狀態管理
   - 元件複用策略
   - 元件庫組織

3. **狀態管理 (State Management)**
   - 全域狀態設計
   - 本地狀態管理
   - 狀態更新流程
   - 狀態持久化策略
   - 狀態同步機制

4. **API 整合 (API Integration)**
   - API 呼叫策略
   - 請求/回應處理
   - Loading 狀態管理
   - 錯誤處理與重試
   - 快取策略
   - 樂觀更新

5. **表單處理 (Form Handling)**
   - 表單驗證規則
   - 錯誤訊息顯示
   - 欄位格式化
   - 自動儲存策略
   - 離開頁面警告
   - 檔案上傳處理

6. **使用者體驗 (User Experience)**
   - Loading 狀態設計
   - 錯誤提示方式
   - 成功回饋機制
   - 空狀態設計
   - 骨架屏設計
   - Toast/通知系統
   - 模態框管理

7. **響應式設計 (Responsive Design)**
   - 斷點定義
   - 行動版佈局
   - 平板版佈局
   - 桌面版佈局
   - 觸控優化
   - 裝置特定功能

8. **效能優化 (Performance Optimization)**
   - 程式碼分割策略
   - 懶加載設計
   - 圖片優化
   - 資源預載
   - 快取策略
   - Bundle 大小優化
   - 渲染優化

9. **無障礙設計 (Accessibility)**
   - ARIA 標籤使用
   - 鍵盤導航
   - 螢幕閱讀器支援
   - 顏色對比度
   - 焦點管理
   - 語意化 HTML

10. **國際化 (Internationalization)**
    - 支援的語言列表
    - 翻譯檔案結構
    - 語言切換機制
    - 日期時間格式化
    - 貨幣格式化
    - 文字方向支援（RTL）

11. **安全措施 (Security Measures)**
    - XSS 防護
    - CSRF Token 處理
    - 敏感資料處理
    - 第三方腳本管理
    - Content Security Policy
    - 安全標頭設定

12. **路由管理 (Routing)**
    - 路由定義
    - 導航守衛
    - 權限檢查
    - 重定向規則
    - 404 處理
    - 路由參數驗證

13. **資料流設計 (Data Flow)**
    - 資料獲取策略
    - 資料更新流程
    - 即時資料同步（WebSocket/SSE）
    - 離線支援
    - 資料預載

14. **錯誤處理 (Error Handling)**
    - 錯誤邊界設計
    - API 錯誤處理
    - 網路錯誤處理
    - 錯誤日誌記錄
    - 錯誤回報機制

15. **測試規格 (Testing Specification)**
    - 元件單元測試
    - 整合測試策略
    - E2E 測試案例
    - 視覺回歸測試
    - 無障礙測試
    - 效能測試

16. **樣式設計 (Styling)**
    - CSS 架構（CSS-in-JS/CSS Modules/Tailwind 等）
    - 主題系統
    - 設計 token 定義
    - 深色模式支援
    - 動畫與過渡
    - 字體載入策略

## 輸出

生成完整的 `tech-specs/frontend-spec.md` 文件，包含所有上述內容。

確保：
- ✅ 頁面與元件設計完整
- ✅ 狀態管理清晰
- ✅ 使用者體驗流暢
- ✅ 考慮到效能與無障礙
- ✅ 安全措施完善
- ✅ 與 framework.md 和 pages.md 保持一致
- ✅ 可直接用於開發實作

完成後告訴我：
- 總共定義了多少個頁面/路由
- 設計了多少個共用元件
- 識別了多少個全域狀態
- 是否有任何需要回到產品設計或技術框架階段釐清的問題
