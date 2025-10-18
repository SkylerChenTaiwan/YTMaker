# Plan Phase Command

規劃一個開發階段並批量生成所有任務。

**用途：** 不論是 Phase 1、Phase 2 還是後續任何階段，只要你要規劃一個開發階段，就用這個命令。

---

## 使用方式

### 告訴我你要規劃什麼

請提供以下資訊：

1. **Phase 編號**（可選）
   - 這是 Phase 幾？
   - 如果不確定或不重要，可以不說

2. **規劃範圍**（選擇一種方式）

   **方式 A：基於 Spec 文件**
   ```
   我要基於以下 spec 來規劃：
   - product-design/overview.md
   - product-design/flows.md
   - product-design/pages.md
   - tech-specs/framework.md
   - tech-specs/backend-spec.md
   - tech-specs/frontend-spec.md
   ```

   **方式 B：基於部分 Spec**
   ```
   我要實作 backend-spec.md 中的認證系統部分
   ```

   **方式 C：直接描述目標**
   ```
   我要做：
   1. 用戶可以發布貼文
   2. 用戶可以按讚和評論
   3. 實作動態消息流
   ```

3. **前置條件**（可選）
   - 需要先完成什麼？
   - 有哪些依賴？

---

## 執行流程

### Step 1: 我會分析你提供的資訊

**如果你提供 spec 文件：**
- 我會讀取並分析這些 spec
- 識別所有需要實作的功能
- 了解技術架構和要求

**如果你直接描述目標：**
- 我會跟你討論功能細節
- 確認技術實作方式
- 建議是否需要更新 spec

### Step 2: 功能分析與討論

我會跟你確認：

#### 功能範圍
- 具體要實作什麼？
- 有哪些關鍵功能？
- 優先級如何？

#### 技術細節
- 需要哪些 API？
- 需要哪些資料表？
- 需要哪些頁面/元件？
- 有什麼技術限制？

#### 測試要求
- 效能需求？
- 安全要求？
- 測試策略？

**注意：** 如果你提供的是完整的 spec，我可能會跳過大部分討論，直接進入任務拆分。

---

### Step 3: 任務拆分建議

基於分析，我會建議如何拆分任務：

**拆分原則：**
- ✅ 可在一個 Claude Code 上下文內完成（1-4 小時）
- ✅ 有明確的輸入和輸出
- ✅ 可以獨立測試
- ✅ 符合單一職責

**範例拆分：**
```
基於你的需求，我建議拆分為 12 個任務：

=== 基礎建設任務 ===
Task-001: 專案初始化與環境設定
- 建立專案結構
- 安裝依賴套件
- 設定開發環境
估計時間：2 小時

Task-002: 資料庫 Schema 設計
- 根據 backend-spec.md 建立所有資料表
- 定義關聯關係
- 建立索引和遷移
估計時間：3 小時

=== 後端任務 ===
Task-003: 用戶認證 API
- 實作註冊、登入、登出 API
- JWT token 生成與驗證
- 密碼加密
估計時間：4 小時

Task-004: 用戶管理 API
- CRUD operations
- 權限檢查
估計時間：3 小時

=== 前端任務 ===
Task-005: 登入註冊頁面
- Login 頁面
- Register 頁面
- 表單驗證
估計時間：3 小時

Task-006: Dashboard 頁面
- 主控台佈局
- 資料展示
估計時間：3 小時

=== 整合任務 ===
Task-007: 整合測試
- E2E 測試
- API 整合測試
估計時間：3 小時

=== 總計 ===
總任務數：7 個
後端任務：2 個
前端任務：2 個
基礎設施：2 個
整合測試：1 個
預估總時間：21 小時（序列執行）
並行執行：約 12 小時（2-3 個實例）
```

**確認：** 這樣的拆分合理嗎？任務太大或太小嗎？

---

### Step 4: 依賴關係分析

我會分析任務之間的依賴關係：

```
任務依賴與執行順序：

【第一步】基礎建設（必須先完成）
Task-001: 專案初始化
    ↓

【第二步】並行開發資料層（可同時執行）
Task-002: 資料庫 Schema
    ↓

【第三步】並行開發 API 和前端架構
├─ Task-003: 認證 API
└─ Task-005: 前端頁面（部分可並行）
    ↓

【第四步】並行開發功能
├─ Task-004: 用戶管理 API
└─ Task-006: Dashboard
    ↓

【第五步】整合測試
Task-007: 整合測試

檔案修改分析：
✅ Task-002 (prisma/) 和 Task-003 (backend/src/controllers/) 無衝突
✅ Task-003 和 Task-005 (frontend/src/) 無衝突
✅ Task-004 和 Task-006 無衝突
⚠️ 如果多個 task 會修改路由檔案，需要協調執行順序
```

**確認：** 依賴關係和並行規劃是否正確？

---

### Step 5: Spec 同步確認（如需要）

如果你直接描述目標而非基於現有 spec，我會建議：

```
建議更新以下 Spec：

1. product-design/flows.md
   - 新增「用戶發布貼文流程」
   - 新增「按讚評論流程」

2. tech-specs/backend-spec.md
   - 新增 posts 資料表
   - 新增貼文相關 API

要先更新這些 spec 嗎？還是直接在任務中定義？
```

**建議：** 先更新 spec 再生成任務，確保文件同步。

---

### Step 6: 批量生成所有任務

確認後，我會批量建立：

#### 1. Phase Overview
建立 `development/phase-X/overview.md`，包含：
- 階段目標
- 完整任務列表
- 依賴關係圖
- 執行順序規劃
- 並行開發指南
- 合併策略
- 風險評估
- 預估時間

#### 2. 所有 Task 文件
建立所有 `task-XXX.md` 文件，每個包含：

**關聯文件**
- 引用相關的 spec
- 引用相關的產品設計
- 標記依賴任務

**測試要求（重點）**
- 單元測試：3-5 個測試案例
  - 正常流程
  - 錯誤處理
  - Edge cases
- 整合測試（如適用）
- E2E 測試（如適用）
- 每個測試包含：
  - 測試描述
  - 輸入資料
  - 預期輸出
  - 驗證點

**實作規格**
- 需要建立/修改的檔案列表
- 每個檔案的職責和方法
- 資料流程圖
- 錯誤處理規則
- 驗證規則
- 參考對應的 spec 章節

**開發指引**
- 詳細的開發步驟（TDD 流程）
- 注意事項
- 完成檢查清單

**可直接使用**
- 整個文件可以直接複製給 Claude Code 執行開發

---

## 不同情境的使用範例

### 情境 1: Phase 1 - 基於完整 Spec

```
User: /plan-phase

Claude: 請告訴我你要規劃什麼？

User:
Phase 1
我要基於以下完整的 spec 來規劃：
- product-design/overview.md
- product-design/flows.md
- product-design/pages.md
- tech-specs/framework.md
- tech-specs/backend-spec.md
- tech-specs/frontend-spec.md

Claude:
好的，讓我讀取並分析這些 spec...
[分析中...]

我已經分析完成。基於你的 spec，我識別出以下功能：
- 用戶認證系統
- 用戶管理
- Dashboard
- 設定頁面
[...]

我建議拆分為 15 個任務：
[顯示任務列表]

這樣的拆分合理嗎？

User: 合理

Claude:
好的，讓我分析依賴關係...
[顯示依賴關係圖]

確認後我會批量建立所有任務文件。繼續嗎？

User: 繼續

Claude:
✅ 已建立 development/phase-1/overview.md
✅ 已建立 task-001.md ~ task-015.md
完成！你可以開始執行 Task-001 了。
```

---

### 情境 2: Phase 2 - 基於部分 Spec

```
User: /plan-phase

Claude: 請告訴我你要規劃什麼？

User:
Phase 2
我要實作 backend-spec.md 中的「社交功能」部分：
- 貼文系統
- 按讚和評論
- 追蹤系統

Claude:
讓我讀取 backend-spec.md 的社交功能部分...

我看到 spec 中已經定義了資料表和 API。
但我想確認幾個細節：
- 貼文支援圖片嗎？
- 評論可以回覆嗎？
- 追蹤是單向還是雙向？

User: [回答...]

Claude:
了解。我建議拆分為 10 個任務：
[顯示任務列表]

這樣可以嗎？

User: Task-005 和 Task-006 可以合併

Claude:
好的，我調整為 9 個任務：
[顯示調整後的列表]

這樣可以嗎？

User: 可以

Claude:
✅ 已建立 development/phase-2/overview.md
✅ 已建立 task-016.md ~ task-024.md
完成！
```

---

### 情境 3: 直接描述需求

```
User: /plan-phase

Claude: 請告訴我你要規劃什麼？

User:
我要做一個檔案上傳功能：
1. 用戶可以上傳圖片和文件
2. 支援拖拉上傳
3. 顯示上傳進度
4. 可以刪除已上傳的檔案

Claude:
了解。讓我確認幾個技術細節：
- 檔案儲存在哪裡？（本地/S3/其他）
- 檔案大小限制？
- 支援哪些檔案格式？
- 需要圖片壓縮嗎？

User: [回答...]

Claude:
好的。我注意到目前的 spec 中沒有檔案上傳的定義。
建議先更新以下 spec：

1. tech-specs/backend-spec.md
   - 新增檔案上傳 API
   - 新增檔案儲存策略

2. tech-specs/frontend-spec.md
   - 新增上傳元件規格

要先更新 spec 嗎？還是直接在任務中定義？

User: 直接在任務中定義

Claude:
好的。我建議拆分為 5 個任務：
[顯示任務列表]

確認後批量生成？

User: 確認

Claude:
✅ 已建立 task-025.md ~ task-029.md
完成！

注意：建議之後將這些任務的實作補充到 spec 中，保持文件同步。
```

---

## 輸出範例

完成後你會得到：

```
development/phase-X/
├── overview.md                    # 階段總覽
│   ├─ 階段目標
│   ├─ 任務列表
│   ├─ 依賴關係圖
│   ├─ 執行順序
│   ├─ 並行開發指南
│   └─ 預估時間
│
├── task-001.md                    # 專案初始化
│   ├─ 關聯 spec
│   ├─ 詳細測試要求
│   ├─ 實作規格
│   └─ 開發指引
│
├── task-002.md                    # 資料庫設計
├── task-003.md                    # 認證 API
├── ...
└── task-XXX.md                    # 整合測試
```

**統計資訊：**
```
✅ Phase X 規劃完成！

📊 統計：
- 總任務數：12 個
- 後端任務：5 個
- 前端任務：4 個
- 基礎設施：2 個
- 整合測試：1 個

⏱️ 預估時間：
- 序列執行：28 小時
- 並行執行（3 實例）：16 小時

🚀 執行順序：
1. Task-001 先執行（基礎設施）
2. Task-002, 003, 004 可並行
3. Task-005, 006 等待前面完成
4. Task-007, 008, 009 可並行
5. Task-010 最後執行（整合測試）

📁 下一步：
開始執行 Task-001
```

---

## 任務文件範例

生成的每個 task 文件結構：

````markdown
# Task-003: 用戶認證 API 實作

> **建立日期：** 2024-XX-XX
> **狀態：** ⏳ 未開始
> **預計時間：** 4 小時

---

## 關聯文件

### 產品設計
- **User Flow:** `product-design/flows.md#用戶註冊登入流程`
- **頁面設計:** `product-design/pages.md#登入頁`

### 技術規格
- **後端規格:** `tech-specs/backend-spec.md#認證系統API`
- **資料驗證:** `tech-specs/backend-spec.md#驗證規則`

### 相關任務
- **前置任務:** Task-001 ✅, Task-002 ✅
- **後續任務:** Task-004, Task-005

---

## 任務目標

### 簡述
實作完整的用戶認證 API，包含註冊、登入、登出功能。

### 成功標準
- [ ] 所有 API 端點測試通過
- [ ] 符合 backend-spec.md 定義
- [ ] 安全性驗證通過

---

## 測試要求

### 單元測試

#### 測試 1：成功註冊新用戶
**輸入：**
```json
{
  "email": "test@example.com",
  "password": "SecurePass123",
  "username": "testuser"
}
```

**預期輸出：**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "test@example.com",
    "username": "testuser",
    "token": "jwt_token"
  }
}
```

**驗證點：**
- [ ] 回傳 201 狀態碼
- [ ] 密碼已加密儲存
- [ ] JWT token 有效
- [ ] 用戶記錄已建立

#### 測試 2：Email 重複時註冊失敗
[...]

#### 測試 3：登入成功
[...]

### 整合測試
[...]

---

## 實作規格

### 需要建立的檔案

#### 1. Controller: `backend/src/controllers/authController.ts`
```typescript
class AuthController {
  async register(req: Request, res: Response) {
    // 實作註冊邏輯
  }

  async login(req: Request, res: Response) {
    // 實作登入邏輯
  }
}
```

[詳細規格...]

---

## 開發指引

1. 閱讀 `tech-specs/backend-spec.md#認證系統`
2. 先撰寫所有測試
3. 實作功能讓測試通過
4. 檢查安全性
5. 標記完成

---

## 完成檢查清單

- [ ] 所有測試通過
- [ ] Spec 已同步
- [ ] 安全性檢查完成
- [ ] 程式碼已審查
````

---

## 使用時機

### 適合使用 /plan-phase
- ✅ 開始新的開發階段
- ✅ 有明確的功能範圍（不論大小）
- ✅ 需要批量建立多個任務

### 不適合使用
- ❌ 臨時的小修改（直接改就好）
- ❌ 單一文件的小調整
- ❌ 緊急 hotfix（用 `/log-issue`）

---

## 準備好了嗎？

請告訴我：

1. **這是 Phase 幾？**（可選）

2. **你要規劃什麼？**（選擇一種）
   - 方式 A：列出要基於的 spec 文件
   - 方式 B：描述要實作的功能
   - 方式 C：指定 spec 中的某個部分

3. **有什麼前置條件或依賴？**（可選）

我會根據你提供的資訊，分析並批量生成所有任務文件！
