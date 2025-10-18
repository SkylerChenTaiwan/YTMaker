# Task-XXX: [任務名稱]

> **建立日期：** [日期]
> **狀態：** ⏳ 未開始 / 🔄 進行中 / ✅ 已完成
> **預計時間：** [X 小時]
> **實際時間：** [X 小時]

---

## 關聯文件

### 產品設計
- **User Flow:** `product-design/flows.md#[章節名稱]`
- **頁面設計:** `product-design/pages.md#[頁面名稱]`
- **產品概述:** `product-design/overview.md#[章節名稱]`

### 技術規格
- **技術框架:** `tech-specs/framework.md#[章節名稱]`
- **後端規格:** `tech-specs/backend-spec.md#[章節名稱]`
- **前端規格:** `tech-specs/frontend-spec.md#[章節名稱]`

### 相關任務
- **前置任務:** Task-XXX (必須先完成)
- **後續任務:** Task-XXX (完成後可開始)
- **並行任務:** Task-XXX (可同時進行)

---

## 任務目標

### 簡述
[用 1-2 句話描述這個任務要完成什麼]

### 詳細說明
[詳細描述任務的目標、背景、為什麼要做這個任務]

### 成功標準
- [ ] [標準 1：例如，API 回應時間 < 200ms]
- [ ] [標準 2：例如，所有測試通過]
- [ ] [標準 3：例如，符合 spec 定義]

---

## 測試要求

> **重要：** 在開始開發前，必須先定義所有測試案例。遵循測試驅動開發 (TDD) 原則。

### 測試環境設定

**前置條件：**
- [需要什麼環境或資料]
- [需要啟動什麼服務]
- [需要設定什麼環境變數]

**測試資料：**
- [需要準備什麼測試資料]

---

### 單元測試

#### 測試 1：[測試名稱，例如：成功建立用戶]

**測試檔案：** `tests/unit/[檔案名稱].test.ts`

**測試內容：**
```typescript
describe('[功能名稱]', () => {
  describe('[方法名稱]', () => {
    it('應該[預期行為]', () => {
      // Arrange (準備)
      // [設定測試資料]

      // Act (執行)
      // [呼叫要測試的函數]

      // Assert (驗證)
      // [驗證結果]
    });
  });
});
```

**輸入：**
```json
{
  "欄位1": "值1",
  "欄位2": "值2"
}
```

**預期輸出：**
```json
{
  "欄位1": "預期值1",
  "欄位2": "預期值2"
}
```

**驗證點：**
- [ ] 回傳值符合預期
- [ ] 資料庫狀態正確
- [ ] 無副作用

---

#### 測試 2：[錯誤處理 - 輸入驗證失敗]

**測試內容：**
```typescript
it('當輸入無效時應該拋出 ValidationError', () => {
  // ...
});
```

**輸入：**
```json
{
  "欄位1": "無效值"
}
```

**預期輸出：**
- 拋出 `ValidationError`
- 錯誤訊息：`"[具體錯誤訊息]"`
- HTTP Status: 400

**驗證點：**
- [ ] 拋出正確的錯誤類型
- [ ] 錯誤訊息清楚明確
- [ ] 資料庫未被修改

---

#### 測試 3：[Edge Case - 特殊情況]

**情境：** [描述這個邊界情況]

**測試內容：**
[定義測試]

---

### 整合測試

#### API 測試 1：[API 端點測試]

**測試檔案：** `tests/integration/[檔案名稱].test.ts`

**API Endpoint:** `POST /api/v1/[endpoint]`

**請求：**
```json
{
  "欄位1": "值1",
  "欄位2": "值2"
}
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer [token]
```

**成功回應 (200/201)：**
```json
{
  "success": true,
  "data": {
    "欄位1": "值1"
  }
}
```

**錯誤回應 (4xx/5xx)：**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "錯誤訊息"
  }
}
```

**測試案例：**
- [ ] 正常請求回應 200/201
- [ ] 未認證回應 401
- [ ] 無權限回應 403
- [ ] 驗證失敗回應 400
- [ ] 資源不存在回應 404

---

### E2E 測試 (如適用)

#### 流程測試：[完整使用者流程]

**測試檔案：** `tests/e2e/[檔案名稱].spec.ts`

**測試步驟：**
1. [步驟 1：例如，進入登入頁面]
   - 預期：顯示登入表單

2. [步驟 2：例如，輸入帳號密碼]
   - 輸入：email = "test@example.com", password = "password123"

3. [步驟 3：例如，點擊登入按鈕]
   - 預期：導航到 dashboard
   - 預期：顯示歡迎訊息

**完整測試腳本：**
```typescript
test('[流程名稱]', async ({ page }) => {
  // [測試程式碼]
});
```

---

### 效能測試 (如適用)

**效能指標：**
- API 回應時間：< [X] ms
- 資料庫查詢時間：< [X] ms
- 前端渲染時間：< [X] ms

**測試方法：**
[如何測試效能]

---

### 安全測試 (如適用)

**測試項目：**
- [ ] SQL Injection 防護
- [ ] XSS 防護
- [ ] CSRF Token 驗證
- [ ] 輸入清理
- [ ] 權限檢查

---

## 實作規格

### 需要建立/修改的檔案

#### 後端檔案 (如適用)

**1. Controller: `backend/src/controllers/[name]Controller.ts`**

**職責：** [描述這個 controller 的職責]

**方法：**
```typescript
class XxxController {
  async methodName(req: Request, res: Response) {
    // [實作說明]
  }
}
```

**參考 Spec：** `tech-specs/backend-spec.md#[章節]`

---

**2. Service: `backend/src/services/[name]Service.ts`**

**職責：** [描述這個 service 的職責]

**方法：**
```typescript
class XxxService {
  async methodName(params: Type): Promise<ReturnType> {
    // [業務邏輯說明]
  }
}
```

**依賴：**
- [依賴的其他 service]
- [依賴的 repository]

**參考 Spec：** `tech-specs/backend-spec.md#[章節]`

---

**3. Model/Schema (如需要)**

**檔案：** `backend/src/models/[name].ts` 或 `prisma/schema.prisma`

**定義：**
```typescript
// [模型定義]
```

**參考 Spec：** `tech-specs/backend-spec.md#資料庫設計`

---

**4. Route: `backend/src/routes/[name]Routes.ts`**

**路由定義：**
```typescript
router.post('/endpoint', middleware, controller.method);
router.get('/endpoint/:id', middleware, controller.method);
```

**中介軟體：**
- [使用哪些 middleware]

---

#### 前端檔案 (如適用)

**1. Page Component: `frontend/src/pages/[Name]/[Name].tsx`**

**職責：** [這個頁面的職責]

**Props：**
```typescript
interface PageNameProps {
  // [定義 props]
}
```

**State：**
```typescript
interface PageNameState {
  // [定義 state]
}
```

**參考 Spec：**
- `product-design/pages.md#[頁面名稱]`
- `tech-specs/frontend-spec.md#[章節]`

---

**2. Component: `frontend/src/components/[category]/[Name]/[Name].tsx`**

**職責：** [這個元件的職責]

**Props：**
```typescript
interface ComponentProps {
  // [定義 props]
}
```

**使用範例：**
```tsx
<ComponentName prop1="value" prop2={value} />
```

**參考 Spec：** `tech-specs/frontend-spec.md#元件設計`

---

**3. Service: `frontend/src/services/[name]Service.ts`**

**職責：** [API 呼叫相關]

**方法：**
```typescript
export const xxxService = {
  async methodName(params): Promise<ReturnType> {
    // [API 呼叫]
  }
};
```

**參考 Spec：** `tech-specs/frontend-spec.md#API整合`

---

**4. Custom Hook (如需要): `frontend/src/hooks/use[Name].ts`**

**職責：** [這個 hook 的用途]

**回傳值：**
```typescript
export const useXxx = () => {
  // [hook 邏輯]
  return { ... };
};
```

---

### 資料流程

**流程圖：**
```
[前端] → [API] → [Controller] → [Service] → [Database]
                                      ↓
[前端] ← [API] ← [Controller] ← [Service] ← [Database]
```

**詳細流程：**
1. [步驟 1 說明]
2. [步驟 2 說明]
3. [步驟 3 說明]

---

### 錯誤處理

**可能的錯誤：**

1. **[錯誤類型 1]**
   - 情境：[什麼時候會發生]
   - 處理：[如何處理]
   - 使用者看到：[錯誤訊息]

2. **[錯誤類型 2]**
   - 情境：[什麼時候會發生]
   - 處理：[如何處理]
   - 使用者看到：[錯誤訊息]

---

### 驗證規則

**輸入驗證：**
```typescript
const validationSchema = {
  欄位1: {
    required: true,
    type: 'string',
    minLength: X,
    maxLength: Y,
    pattern: /regex/,
    message: '錯誤訊息'
  },
  // [其他欄位]
};
```

**參考 Spec：** `tech-specs/backend-spec.md#資料驗證`

---

## 開發指引

### 開發步驟

1. **閱讀所有關聯文件**
   - 仔細閱讀產品設計文件，理解需求
   - 仔細閱讀技術規格，理解實作方式
   - 確認所有前置任務已完成

2. **設定測試環境**
   - 準備測試資料
   - 設定必要的環境變數
   - 確認測試框架運作正常

3. **撰寫測試（TDD）**
   - 先寫測試，確保測試會失敗（因為功能還沒實作）
   - 測試應該覆蓋所有情境

4. **實作功能**
   - 按照 spec 實作
   - 遵循程式碼規範
   - 寫清楚的註解

5. **執行測試**
   - 執行所有測試
   - 確保測試通過
   - 檢查測試覆蓋率

6. **程式碼審查**
   - 自我審查程式碼
   - 確認符合規範
   - 移除除錯程式碼

7. **更新文件**
   - 如果實作與 spec 有差異，更新 spec
   - 更新 API 文件（如適用）
   - 更新 README（如適用）

8. **標記完成**
   - 所有測試通過後，在標題加上 `[v]`
   - 更新 `overview.md` 中的任務狀態

---

### 注意事項

**程式碼品質：**
- [ ] 遵循 `tech-specs/framework.md` 中的程式碼規範
- [ ] 使用 TypeScript 類型定義
- [ ] 函數和變數命名清楚
- [ ] 適當的錯誤處理
- [ ] 無 console.log 或除錯程式碼

**安全性：**
- [ ] 輸入驗證
- [ ] 輸出清理
- [ ] 認證檢查
- [ ] 權限檢查
- [ ] 敏感資料保護

**效能：**
- [ ] 避免 N+1 查詢
- [ ] 適當的資料庫索引
- [ ] 快取策略（如需要）
- [ ] 前端效能優化（如需要）

---

## 完成檢查清單

### 開發完成
- [ ] 所有功能按照 spec 實作
- [ ] 程式碼遵循規範
- [ ] 適當的錯誤處理
- [ ] 適當的日誌記錄

### 測試完成
- [ ] 所有單元測試通過
- [ ] 整合測試通過（如適用）
- [ ] E2E 測試通過（如適用）
- [ ] 測試覆蓋率達標
- [ ] Edge cases 已測試

### 文件同步
- [ ] Spec 與實作一致
- [ ] API 文件已更新（如適用）
- [ ] 註解清楚完整
- [ ] README 已更新（如需要）

### Git
- [ ] 在正確的 feature branch
- [ ] Commit 訊息清楚
- [ ] 已推送到 remote
- [ ] 準備好合併

### 其他
- [ ] 無衝突檔案
- [ ] 環境變數已記錄在 .env.example
- [ ] 相依套件已加入 package.json

---

## 遇到的問題與解決方案

### 問題 1
**描述：** [遇到什麼問題]
**解決：** [如何解決]
**學習：** [學到什麼]

---

## 實際開發記錄

**開始時間：** [時間]
**完成時間：** [時間]
**實際耗時：** [X 小時]

**主要變更：**
- [變更 1]
- [變更 2]

**與計劃的差異：**
- [差異說明]

**建議：**
- [對未來類似任務的建議]

---

## 更新記錄

| 日期 | 版本 | 修改內容 | 修改人 |
|------|------|----------|--------|
| [日期] | 1.0 | 建立任務 | [名字] |
| | | | |
