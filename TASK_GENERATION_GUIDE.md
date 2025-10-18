# 批量任務生成指南

本文件說明如何使用 `/plan-phase` 命令批量生成開發任務。

---

## 核心概念

### 傳統方式 ❌
```
撰寫 spec → 一個一個建立 task → 花費大量時間
```

### 批量生成方式 ✅
```
撰寫 spec → /plan-phase → 批量生成所有 tasks → 5-15 分鐘完成
```

---

## 一個命令適用所有階段

**統一使用 `/plan-phase`**

不論是 Phase 1、Phase 2 還是任何階段，都用同一個命令。

唯一的區別是你提供的資訊方式：
- **Phase 1（完整規劃）：** 提供完整的 spec 文件
- **Phase 2+（增量開發）：** 提供部分 spec 或直接描述功能
- **快速原型：** 直接描述要做什麼

---

## 三種使用方式

### 方式 A：基於完整 Spec（適合 Phase 1）

**適用情境：**
- 專案剛開始
- 所有 spec 都已完成
- 要建立完整的基礎架構

**使用方法：**
```
/plan-phase

我要基於以下完整的 spec 來規劃 Phase 1：
- product-design/overview.md
- product-design/flows.md
- product-design/pages.md
- tech-specs/framework.md
- tech-specs/backend-spec.md
- tech-specs/frontend-spec.md
```

**流程：**
1. Claude Code 讀取並分析所有 spec
2. 識別所有需要實作的功能
3. 拆分成合理大小的任務
4. 分析依賴關係
5. 你確認任務列表
6. 批量生成所有 task 文件

**預估時間：** 5-10 分鐘

**輸出：** 通常 10-20 個任務

---

### 方式 B：基於部分 Spec（適合 Phase 2+）

**適用情境：**
- Phase 1 已完成
- 要新增特定功能
- Spec 中已經有定義

**使用方法：**
```
/plan-phase

Phase 2
我要實作 backend-spec.md 中的「社交功能」部分：
- 貼文系統
- 按讚和評論
- 追蹤系統
```

**流程：**
1. Claude Code 讀取相關的 spec
2. 可能會問一些細節問題
3. 建議任務拆分
4. 你可以調整任務（合併/拆分）
5. 確認後批量生成

**預估時間：** 10-15 分鐘

**輸出：** 通常 5-12 個任務

---

### 方式 C：直接描述需求（適合快速迭代）

**適用情境：**
- 快速原型
- 緊急功能
- Spec 還沒寫

**使用方法：**
```
/plan-phase

我要做檔案上傳功能：
1. 用戶可以上傳圖片和文件
2. 支援拖拉上傳
3. 顯示上傳進度
4. 可以刪除已上傳的檔案
```

**流程：**
1. Claude Code 會問很多技術細節
2. 建議是否要先更新 spec
3. 建議任務拆分
4. 確認後批量生成
5. **提醒你事後補充 spec**

**預估時間：** 15-20 分鐘（因為需要討論）

**輸出：** 通常 3-8 個任務

**注意：** 這種方式雖然快，但建議事後補充 spec，保持文件同步。

---

## 完整範例：Phase 1 開發

### Step 1: 準備 Spec

確保以下文件完成：
- [x] `product-design/overview.md` - 產品概述
- [x] `product-design/flows.md` - 使用者流程（用 `/generate-flows`）
- [x] `product-design/pages.md` - 頁面設計（用 `/generate-pages`）
- [x] `tech-specs/framework.md` - 技術框架
- [x] `tech-specs/backend-spec.md` - 後端規格
- [x] `tech-specs/frontend-spec.md` - 前端規格

### Step 2: 執行 /plan-phase

```
/plan-phase

Phase 1
我要基於以下完整的 spec 來規劃：
- product-design/overview.md
- product-design/flows.md
- product-design/pages.md
- tech-specs/framework.md
- tech-specs/backend-spec.md
- tech-specs/frontend-spec.md

這是一個用戶管理系統，包含認證、CRUD、Dashboard。
```

### Step 3: Claude Code 分析

```
Claude: 正在分析你的 spec...

我已經分析完成。我識別出以下主要功能：
- 用戶認證系統（註冊、登入、JWT）
- 用戶管理 API（CRUD）
- Dashboard 頁面
- 設定頁面
- 錯誤處理和驗證

基於你的 spec，我建議拆分為 15 個任務：

=== 基礎建設 ===
Task-001: 專案初始化與環境設定（2 小時）
Task-002: 資料庫 Schema 設計與遷移（3 小時）
Task-003: 前端專案結構建立（2 小時）

=== 後端開發 ===
Task-004: 用戶認證 API 實作（4 小時）
Task-005: JWT Token 管理（2 小時）
Task-006: 用戶管理 API（3 小時）
Task-007: 資料驗證中介軟體（2 小時）
Task-008: 錯誤處理中介軟體（2 小時）

=== 前端開發 ===
Task-009: 登入註冊頁面（3 小時）
Task-010: Dashboard 頁面（3 小時）
Task-011: 用戶設定頁面（2 小時）
Task-012: 共用元件開發（3 小時）
Task-013: 路由與狀態管理（2 小時）

=== 整合與測試 ===
Task-014: API 整合測試（3 小時）
Task-015: E2E 測試（3 小時）

總計：15 個任務，預估 39 小時（序列）
並行執行（3 實例）：約 20 小時

這樣的拆分合理嗎？
```

### Step 4: 確認並調整

```
User: Task-012 和 Task-013 可以合併

Claude: 好的，我調整為 14 個任務：
[顯示調整後的列表]

現在讓我分析依賴關係...

【執行順序】
第一步：Task-001（必須先完成）
第二步：Task-002, Task-003 可並行
第三步：Task-004, Task-005 序列執行
第四步：Task-006, 007, 008, 009, 010, 011, 012 可並行（部分）
第五步：Task-013, 014 整合測試

檔案衝突分析：
✅ 大部分任務無衝突
⚠️ Task-009, 010, 011 會修改路由檔案，建議協調

確認後我會批量建立所有任務文件。繼續嗎？
```

### Step 5: 生成

```
User: 繼續

Claude: 正在生成任務文件...

✅ development/phase-1/overview.md
✅ task-001.md - 專案初始化與環境設定
✅ task-002.md - 資料庫 Schema 設計與遷移
✅ task-003.md - 前端專案結構建立
✅ task-004.md - 用戶認證 API 實作
✅ task-005.md - JWT Token 管理
✅ task-006.md - 用戶管理 API
✅ task-007.md - 資料驗證中介軟體
✅ task-008.md - 錯誤處理中介軟體
✅ task-009.md - 登入註冊頁面
✅ task-010.md - Dashboard 頁面
✅ task-011.md - 用戶設定頁面
✅ task-012.md - 共用元件與路由
✅ task-013.md - API 整合測試
✅ task-014.md - E2E 測試

完成！總共建立了 14 個任務。

📁 建議執行順序：
1. 先執行 Task-001
2. 然後開 2-3 個 Claude Code 實例並行執行其他任務
3. 查看 overview.md 了解詳細的執行計劃

準備好開始開發了嗎？
```

---

## 任務文件結構

每個生成的 task 文件都包含：

### 1. 關聯文件
明確引用相關的 spec，例如：
```markdown
## 關聯文件

### 產品設計
- **User Flow:** `product-design/flows.md#用戶註冊登入流程`
- **頁面設計:** `product-design/pages.md#登入頁`

### 技術規格
- **後端規格:** `tech-specs/backend-spec.md#認證系統API`
```

### 2. 測試要求（重點）
完整的測試案例，例如：
```markdown
## 測試要求

### 單元測試

#### 測試 1：成功註冊新用戶
**輸入：**
```json
{ "email": "test@example.com", "password": "Pass123" }
```

**預期輸出：**
```json
{ "success": true, "data": { "id": "...", "token": "..." } }
```

**驗證點：**
- [ ] 回傳 201 狀態碼
- [ ] 密碼已加密
- [ ] Token 有效
```

### 3. 實作規格
詳細的實作指引，包含檔案列表、方法簽名等

### 4. 開發指引
TDD 流程：先寫測試 → 實作 → 驗證

### 5. 可直接使用
整個文件可以直接複製給 Claude Code 執行開發

---

## 並行開發策略

### 查看 Overview

打開 `development/phase-1/overview.md`，查看：

```markdown
## 任務執行順序

### 並行組 1（可同時執行）
- Task-001: 專案初始化 [必須先完成]

### 並行組 2（等待 Task-001）
- Task-002: 資料庫 Schema (修改 prisma/)
- Task-003: 前端架構 (修改 frontend/)
可開 2 個 Claude Code 實例

### 序列組 1
- Task-004: 認證 API (依賴 Task-002)
- Task-005: JWT Token (依賴 Task-004)

### 並行組 3（等待 Task-005）
- Task-006: 用戶 API (修改 backend/src/controllers/)
- Task-007: 驗證中介軟體 (修改 backend/src/middlewares/)
- Task-009: 登入頁面 (修改 frontend/src/pages/)
可開 3 個 Claude Code 實例
```

### 執行並行開發

```bash
# Terminal 1 - Claude Code Instance A
cd my-project
git checkout -b feature/task-002-database
# 執行 Task-002

# Terminal 2 - Claude Code Instance B
cd my-project
git checkout -b feature/task-003-frontend
# 執行 Task-003

# Terminal 3 - Claude Code Instance C
cd my-project
git checkout -b feature/task-006-user-api
# 執行 Task-006
```

### 合併順序

按照 overview 中的優先級：
1. Task-002 先合併（其他依賴它）
2. Task-003 再合併
3. Task-006 最後合併

---

## 效率對比

### 傳統方式
```
規劃任務：3 小時
手動建立 15 個 task 文件：3 小時
開始開發：20 小時
總計：26 小時
```

### 使用 /plan-phase
```
規劃任務：包含在命令中
批量生成 15 個 task：10 分鐘
開始開發：20 小時
總計：20 小時 10 分鐘

節省：約 6 小時
```

### 加上並行開發
```
批量生成任務：10 分鐘
並行開發（3 實例）：12 小時
總計：12 小時 10 分鐘

節省：約 14 小時（54% 提升）
```

---

## 常見問題

### Q1: 一定要提供完整的 spec 嗎？

**A:** 不一定。三種方式任選：
- 方式 A：完整 spec（最推薦，Phase 1 必須）
- 方式 B：部分 spec（Phase 2+ 常用）
- 方式 C：直接描述功能（快速但建議事後補 spec）

### Q2: 生成的任務太多/太少怎麼辦？

**A:** 在確認階段告訴 Claude Code：
```
Task-005 太大，請拆成 2 個
或
Task-007 和 Task-008 可以合併
```

### Q3: 任務拆分的標準是什麼？

**A:**
- ✅ 1-4 小時可完成
- ✅ 可在一個 Claude Code 上下文內完成
- ✅ 可以獨立測試
- ✅ 有明確的輸入輸出

### Q4: Phase 2 一定要更新 spec 嗎？

**A:** 建議要，但不強制：
- **推薦：** 先更新 spec，保持文件同步
- **快速：** 直接在 task 中定義，事後補 spec

### Q5: 可以重新生成某個 phase 的任務嗎？

**A:** 可以！只要：
1. 刪除舊的 phase-X 資料夾
2. 重新執行 `/plan-phase`
3. 重新生成

---

## 最佳實踐

### ✅ DO

1. **Phase 1 準備完整 spec**
   - 確保設計完整
   - 避免頻繁返工

2. **檢查生成的任務**
   - 閱讀 overview.md
   - 確認任務合理
   - 調整不合適的拆分

3. **遵循執行順序**
   - 先完成依賴任務
   - 充分利用並行

4. **保持 spec 同步**
   - 實作與 spec 有差異時，更新 spec
   - 定期執行 `/sync-specs`

### ❌ DON'T

1. **不要跳過討論就生成**
   - Claude Code 會問問題是有原因的
   - 想清楚再回答

2. **不要忽略依賴關係**
   - 會導致開發阻塞
   - 浪費時間

3. **不要同時開發衝突任務**
   - 檢查 overview 中的檔案修改分析
   - 避免合併衝突

4. **不要完全不更新 spec**
   - 即使用方式 C，也要事後補充
   - 保持文件同步

---

## 快速參考

### 命令格式

```
/plan-phase

[Phase 編號]（可選）
[規劃範圍]（三選一）
  - 方式 A：列出 spec 文件
  - 方式 B：指定 spec 部分
  - 方式 C：描述功能
[前置條件]（可選）
```

### 範例

**Phase 1:**
```
/plan-phase

Phase 1
基於完整的 spec：
- product-design/ 所有文件
- tech-specs/ 所有文件
```

**Phase 2:**
```
/plan-phase

Phase 2
實作 backend-spec.md 的社交功能部分
前置：Phase 1 已完成
```

**快速原型:**
```
/plan-phase

做檔案上傳功能：
1. 支援圖片和文件
2. 拖拉上傳
3. 顯示進度
```

---

## 總結

**核心概念：**
- 一個命令 `/plan-phase` 適用所有階段
- 根據你提供的資訊靈活調整
- 批量生成節省大量時間
- 配合並行開發效率最高

**關鍵：**
- Phase 1：準備完整 spec
- Phase 2+：可以更靈活
- 保持 spec 同步
- 遵循執行順序

**效率：**
- 節省 50%+ 的規劃時間
- 配合並行可節省 50%+ 的開發時間
- 總效率提升可達 70%+

---

**準備好了嗎？執行 `/plan-phase` 開始批量生成任務！**
