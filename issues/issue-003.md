# Issue-003: Task-022 測試覆蓋率不足

**狀態：** 待處理
**優先級：** 中
**類型：** 測試改進
**建立日期：** 2025-10-21
**關聯任務：** Task-022

---

## 問題描述

Task-022 實作的新增專案流程（Page-3 和 Page-4）的測試覆蓋率不足，需要補充更完整的測試案例。

### 當前測試狀況

**Page-3 (新增專案頁面)：**
- ✅ 基本的 Schema 驗證測試（8個案例）
- ✅ 簡單的整合測試（7個案例）
- ❌ 缺少：UI 互動測試、Toast 訊息測試、錯誤處理測試

**Page-4 (視覺配置頁面)：**
- ✅ 基本的即時預覽測試（4個案例）
- ✅ 自動儲存機制測試（2個案例）
- ✅ Logo 上傳測試（4個案例）
- ❌ 缺少：UUID 驗證測試、導航測試、完整的配置選項測試

**E2E 測試：**
- ❌ 現有的測試使用了不正確的 Mock 設置
- ❌ 沒有測試真正的完整使用者流程

---

## 需要補充的測試

### 1. Page-3 測試補充（預估 15+ 案例）

#### 表單驗證與 UI 互動
- [ ] 初始狀態檢查
- [ ] 專案名稱驗證（空、超長）
- [ ] 文字長度驗證（上下限、即時提示）
- [ ] 字數統計即時更新
- [ ] 文字來源切換（paste ↔ upload）
- [ ] 錯誤修正後錯誤訊息消失
- [ ] 取消按鈕返回首頁

#### 檔案上傳
- [ ] 上傳多個檔案時只取第一個
- [ ] 檔案讀取失敗的錯誤處理
- [ ] 各種檔案格式的驗證

#### API 整合
- [ ] API 成功回應處理
- [ ] API 失敗錯誤處理
- [ ] API 重試機制
- [ ] 提交中時按鈕狀態
- [ ] Toast 訊息驗證

### 2. Page-4 測試補充（預估 10+ 案例）

#### UUID 驗證
- [ ] 有效的 UUID v4 格式
- [ ] 無效的 UUID 應呼叫 notFound()
- [ ] 空字串應呼叫 notFound()
- [ ] 其他 UUID 版本應拒絕

#### 字幕配置
- [ ] 預設配置載入
- [ ] 陰影配置展開/收起邏輯
- [ ] 陰影顏色變更
- [ ] 邊框設定（border_enabled, border_color, border_width）
- [ ] 背景設定（background_enabled, background_color, background_opacity）
- [ ] 字幕位置設定（position, position_x, position_y）

#### Logo 配置
- [ ] 初始狀態（無 Logo 時不顯示配置）
- [ ] 多種 Logo 格式支援（PNG/JPG/SVG）
- [ ] Logo 讀取失敗處理

#### 導航與儲存
- [ ] 上一步按鈕（router.back()）
- [ ] 下一步按鈕（跳轉到 prompt-model 頁面）
- [ ] 儲存中時按鈕仍可用（非阻塞）
- [ ] 自動儲存失敗的錯誤處理

#### 響應式設計
- [ ] 預覽區正確顯示
- [ ] 配置面板可滾動

### 3. 真正的 E2E 測試（預估 10+ 案例）

#### 完整流程測試
- [ ] 貼上文字模式：填寫表單 → 提交 → API 創建 → 跳轉
- [ ] 上傳檔案模式：切換模式 → 上傳 → 提交 → 跳轉
- [ ] 視覺配置完整流程：調整 → 預覽 → 自動儲存 → 下一步
- [ ] Logo 上傳流程：上傳 → 調整 → 自動儲存

#### 錯誤恢復流程
- [ ] 錯誤 → 修正 → 成功
- [ ] API 失敗 → 重試 → 成功
- [ ] 返回上一步重新編輯

#### 邊界條件
- [ ] 正好 500 字
- [ ] 正好 10000 字
- [ ] 邊界值測試

---

## 技術難點

### 1. Next.js App Router Mock 設置
- **問題：** Next.js 14 的 App Router 在 Jest 環境中需要複雜的 mock 設置
- **解決方案：** 建立全局 mock（在 `jest.setup.js`），或使用專門的測試工具

### 2. Toast 庫 Mock
- **問題：** Sonner toast 庫的 mock 需要特別處理
- **解決方案：** 在 jest.setup.js 中全局 mock sonner

### 3. UI 組件設計問題
- **問題：** `FileUpload` 組件的 label 和 input 沒有正確關聯
- **解決方案：** 修改組件實作，確保 accessibility

---

## 建議的實作步驟

### 階段 1：修復測試基礎設施
1. 在 `jest.setup.js` 中添加全局 Mock：
   - Next.js navigation (useRouter, usePathname, etc.)
   - Sonner toast 庫
2. 確保所有現有測試都能通過

### 階段 2：補充 Page-3 測試
1. 重寫表單驗證與 UI 互動測試
2. 補充完整的檔案上傳測試
3. 添加 API 整合測試
4. 使用真實的 QueryClient，只 mock API 服務層

### 階段 3：補充 Page-4 測試
1. 添加 UUID 驗證測試
2. 補充完整的配置選項測試
3. 添加導航測試
4. 測試真實的驗證邏輯（不 mock validateProjectId）

### 階段 4：建立真正的 E2E 測試
1. 創建跨頁面的完整流程測試
2. 測試資料持久化
3. 測試錯誤恢復機制

---

## Mock 使用原則

### ✅ 應該 Mock 的
- Next.js router（測試環境沒有真實 router）
- Toast 函數（需要驗證調用）
- API 服務層（使用 jest.spyOn）

### ❌ 不應該 Mock 的
- `@tanstack/react-query` hooks → 使用真實的 QueryClient
- `validateProjectId` → 測試真實的驗證邏輯
- 其他純函數、工具函數 → 都測試真實實作

---

## 預期成果

### 測試覆蓋率目標
- Page-3: **80%+** (目前約 35%)
- Page-4: **85%+** (目前約 40%)
- E2E: **完整的使用者流程覆蓋**

### 測試數量目標
- Page-3: **23+ 個測試案例** (目前 8 個)
- Page-4: **24+ 個測試案例** (目前 10 個)
- E2E: **10+ 個測試案例** (目前 7 個但品質不佳)
- **總計：57+ 個測試案例** (目前 25 個)

---

## 參考資料

### 測試改進嘗試記錄
在 2025-10-21 的開發過程中，已經嘗試實作完整的測試改進，遇到了以下問題：
1. Next.js router mock 設置複雜，花費大量時間
2. UI 組件的 accessibility 問題（FileUpload 的 label）
3. Toast mock 設置需要全局配置

部分改進的測試代碼可以作為參考（雖然未完全通過）。

### 相關文件
- Task-022: `/Users/skyler/coding/YTMaker/development/phase-1/✓ task-022.md`
- 產品設計: `/Users/skyler/coding/YTMaker/product-design/pages.md`
- 技術規格: `/Users/skyler/coding/YTMaker/tech-specs/frontend/page-new-project.md`

---

## 建議優先級

**中優先級** - 雖然測試覆蓋率不足，但目前的基本測試已經覆蓋了主要的驗證邏輯，功能本身是完整的。建議在進行下一階段開發前完成測試改進。
