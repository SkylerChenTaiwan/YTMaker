# 專案開發指南

這是一個使用測試驅動開發 (TDD) 和文件優先策略的專案範本。

---

## 🌐 語言與溝通原則

**重要：Claude Code 的溝通規則**

- **思考語言：** 可以使用英文或任何語言進行內部思考與推理
- **溝通語言：** 與用戶的所有溝通**必須使用繁體中文**
- **適用範圍：**
  - ✅ 所有回覆訊息必須用繁體中文
  - ✅ 所有說明與解釋必須用繁體中文
  - ✅ 所有提問與確認必須用繁體中文
  - ❌ 程式碼內容、變數名稱、註解可使用英文（依專案慣例）
  - ❌ Git commit 訊息、技術文件可依照專案規範使用英文

---

## ⚠️ 每次對話開始必做 (START OF CONVERSATION CHECKLIST)

**在做任何事情之前，必須先完成以下檢查：**

### 1. 檢查並創建 Worktree

**使用 Git Worktree 來實現真正的並行開發**

```bash
# 檢查現有的 worktrees
git worktree list

# 為新的 task 創建獨立的 worktree
# 功能開發：
git worktree add ../YTMaker-task-XXX feature/task-XXX-description
# 或問題修復：
git worktree add ../YTMaker-issue-XXX fix/issue-XXX-description

# 如果分支不存在，使用 -b 創建新分支
git worktree add -b feature/task-XXX-description ../YTMaker-task-XXX
```

**Worktree 原理：**
- 每個 worktree = 一個獨立的工作目錄 + 一個分支
- 不同的 worktree 可以同時在不同的分支上工作
- 所有 worktree 共享同一個 `.git` 資料庫
- 完全隔離，互不干擾

**規則：**
- ✅ **每個新對話都應該有自己的 worktree**
- ✅ **一個 worktree = 一個 task = 一個 Claude Code terminal**
- ✅ **主目錄保持在 develop 分支作為管理中心**
- ❌ **不要在多個 terminal 中切換同一目錄的分支**

### 2. 確認工作內容

明確這次對話要做什麼：
- [ ] 是開發新 task？→ 使用 `feature/task-XXX-description`
- [ ] 是修復 issue？→ 使用 `fix/issue-XXX-description`
- [ ] 是撰寫/修改 spec？→ 使用 `feature/update-specs-description`
- [ ] 是討論或規劃？→ 可能不需要分支，先與用戶確認

### 3. 確認是否需要開分支

**需要開分支的情況：**
- ✅ 開發新功能或 task
- ✅ 修復 issue
- ✅ 撰寫或大幅修改 spec 文件
- ✅ 任何會產生 commit 的工作
- ✅ 預期會有多個檔案變更的工作

**不需要開分支的情況：**
- ❌ 純粹討論、分析、規劃（沒有任何檔案修改）
- ❌ 用戶只是詢問問題
- ❌ 回答技術問題

**如果不確定，請先問用戶！**

---

## 核心原則

### 1. 有文件才有開發
- **所有功能必須先在 spec 中定義**
- 不允許直接開發功能，必須先有對應的產品設計和技術規格
- Spec 必須與程式碼保持 100% 同步

### 2. 測試驅動開發 (TDD)
- **開發前先寫測試**
- 每個 task 都必須先定義測試要求
- 只有測試全部通過才能標記任務完成

### 3. 遇到問題先記錄
- **不要直接修改程式碼**
- 必須先在 `issues/` 建立問題記錄
- 分析根因 → 更新 spec → 再修改程式碼

---

## 專案結構

```
專案/
├── product-design/       # 產品設計
│   ├── overview.md      # 產品概述
│   ├── flows.md         # 使用者流程與需求
│   └── pages.md         # 頁面設計
├── tech-specs/          # 技術規格
│   ├── framework.md     # 技術框架
│   ├── backend/         # 後端規格（拆分後）
│   │   ├── _index.md   # 後端模塊索引
│   │   ├── database.md # 資料庫設計
│   │   ├── auth.md     # 認證授權
│   │   ├── api-*.md    # API 規格
│   │   └── ...
│   └── frontend/        # 前端規格（拆分後）
│       ├── _index.md   # 前端模塊索引
│       ├── routing.md  # 路由設計
│       ├── state.md    # 狀態管理
│       ├── page-*.md   # 頁面規格
│       └── ...
├── development/         # 開發計劃
│   ├── phase-1/        # 階段一
│   │   ├── overview.md # 任務總覽
│   │   ├── task-001.md # 任務詳細文件
│   │   └── ...
│   └── phase-2/        # 階段二
├── issues/              # 問題追蹤
│   ├── issue-001.md
│   └── ...
└── .claude/            # Claude Code 設定
```

---

## 開發流程

### 階段 1：產品設計
1. 生成 `product-design/overview.md` - 產品概述（使用 `/generate-overview`）
2. 生成 `product-design/flows.md` - 使用者流程（使用 `/generate-flows`）
3. 生成 `product-design/pages.md` - 頁面設計（使用 `/generate-pages`）

### 階段 2：技術規格（初稿）
1. 生成 `tech-specs/framework.md` - 技術框架（使用 `/generate-tech-specs-framework`）
2. 生成 `tech-specs/backend-spec.md` - 後端規格初稿（使用 `/generate-tech-specs-backend`）
3. 生成 `tech-specs/frontend-spec.md` - 前端規格初稿（使用 `/generate-tech-specs-frontend`）

### 階段 2.5：拆分與檢查 Spec
使用 `/split-specs` 命令進行 spec 拆分與品質檢查：

**目的：**
- 將大型 spec 文件拆分成模塊化結構
- 檢查 spec 的完整性與正確性
- 建立清晰的索引便於後續查找

**執行流程：**
1. 讀取 `backend-spec.md` 和 `frontend-spec.md`
2. 分析內容並規劃模塊化結構
3. 品質檢查：
   - 是否有缺失或不清楚的部分
   - 是否有矛盾或不一致
   - 是否符合最佳實踐
4. 拆分成適當大小的文件（100-300 行）
5. 生成 `_index.md` 索引文件
6. 刪除原始的單一大文件

**產出結構：**
```
tech-specs/
├── framework.md
├── backend/
│   ├── _index.md          # 模塊索引與導航
│   ├── overview.md        # 整體架構
│   ├── database.md        # 資料庫設計
│   ├── auth.md           # 認證授權
│   ├── api-*.md          # 各功能 API
│   └── ...
└── frontend/
    ├── _index.md         # 模塊索引與導航
    ├── overview.md       # 整體架構
    ├── routing.md        # 路由設計
    ├── state.md          # 狀態管理
    ├── page-*.md         # 各頁面規格
    └── ...
```

### 階段 3：開發計劃（兩步驟流程）

**Step 1: 規劃階段 - 使用 `/plan-phase`**
生成：
- `development/phase-X/overview.md` - 完整的任務總覽、依賴關係、執行順序
- 所有 `task-XXX.md` 的**空骨架**（只有標題、元資訊、簡短目標、關聯 spec）

**Step 2: 填充階段 - 使用 `/detail-task XXX`**
逐一填充每個 task 的詳細內容：
- 測試要求（3-10 個詳細測試案例）
- 實作規格（需要建立/修改的檔案、程式碼骨架）
- 開發指引（TDD step-by-step 流程）

**重要原則：**
- `/plan-phase` 一次規劃整個 phase，看全貌
- `/detail-task` 一次只處理一個 task，專注品質
- 填充 task 可以在需要時才做，不用一次全部填完

### 階段 4：開發執行
1. 使用 `/detail-task XXX` 填充要執行的 task
2. 閱讀完整的 task 文件（包含詳細測試要求）
3. 先寫測試
4. 實作功能
5. 執行測試
6. 測試通過後標記 `[v]`

### 階段 5：問題處理
當遇到問題時：
1. 建立 `issues/issue-XXX.md`
2. 分析根本原因
3. 提出解決方案
4. 更新 spec（如需要）
5. 修改程式碼
6. 驗證並標記已解決

---

## 重要規則

### Spec 同步規則
- ✅ Spec 必須準確反映程式碼狀態
- ✅ 程式碼變更時，必須同時更新 spec
- ❌ 不允許 spec 與程式碼不一致

### 測試規則
- ✅ 所有功能必須有測試
- ✅ 測試必須在開發前定義
- ❌ 不允許沒有測試就標記任務完成

### 問題處理規則
- ✅ 發現問題先建立 issue
- ✅ 分析根因後再修改
- ❌ 不允許直接修改程式碼

---

## 任務標記規範

### 未完成
```markdown
# Task-001: 用戶認證功能
```

### 已完成
```markdown
# [v] Task-001: 用戶認證功能
```

### 問題未解決
```markdown
# Issue-001: 登入失敗問題
```

### 問題已解決
```markdown
# [已解決] Issue-001: 登入失敗問題
```

---

## Git 工作流程

### **⚠️ 重要：所有改動必須上傳到 GitHub**

**強制要求：**
- ✅ 每次完成任務後必須 commit 並 push 到 GitHub
- ✅ 每次修改 spec 文件必須 commit 並 push
- ✅ 每次修改程式碼必須 commit 並 push
- ✅ 不允許只在本地保留改動而不上傳
- ✅ 定期同步確保遠端倉庫是最新狀態

**推送時機：**
1. 完成一個測試後
2. 完成一個功能後
3. 更新任何 spec 文件後
4. 每日工作結束時
5. 遇到問題並建立 issue 後

---

### 分支策略

#### `main` 分支
- **用途：** 穩定的正式版本
- **保護：** 禁止直接推送，只接受從 `develop` 的 merge
- **部署：** 自動部署到 production 環境
- **標籤：** 每個 release 都要打 tag

#### `develop` 分支
- **用途：** 開發主線，整合所有完成的功能
- **保護：** 禁止直接推送，只接受從工作分支的 merge
- **部署：** 自動部署到 staging 環境
- **要求：** 合併到 main 前所有測試必須通過

---

### 短命分支策略 (Short-lived Branches) + Worktree

#### 核心原則

**每個新的 Claude Code 對話都應該有自己的 Worktree**

**為什麼使用 Worktree？**
- **真正的並行開發**：不同 Claude Code terminals 可以同時工作在不同的 tasks
- **完全隔離**：每個 worktree 有自己的工作目錄和文件，互不干擾
- **避免分支衝突**：不會因為切換分支而影響其他 terminal 的工作
- **清晰的工作空間**：每個 task 有自己的目錄，一目了然

**工作流程：**
1. 開始新對話時，創建新的 worktree（自動創建分支）
2. 在 worktree 目錄中進行所有工作（規劃、設計、實作、測試等）
3. 工作完成後，在主目錄合併到 develop
4. 刪除 worktree 和已合併的分支

#### 何時開新分支

**強制要求：每個新的 Claude Code 對話必須開新分支**

- ✅ 開始新的 task 開發
- ✅ 修復一個 issue
- ✅ 撰寫或大幅修改 spec 文件
- ✅ 任何可能與其他對話衝突的工作
- ✅ 預期會有多個 commits 的工作

**唯一例外：緊急修正**
- 修正明顯的錯字、格式問題
- 極小的配置調整
- 這類情況極少，謹慎使用

---

### 開發分支 (Development Branches)

#### 命名規範

**功能開發分支（Task）：**
```
feature/task-XXX-description

例如：
feature/task-001-project-setup
feature/task-002-database-schema
feature/task-015-user-auth-api
```

**問題修復分支（Issue）：**
```
fix/issue-XXX-description

例如：
fix/issue-001-login-validation-error
fix/issue-005-api-timeout-handling
fix/issue-012-ui-rendering-bug
```

**規則：**
- 功能開發使用 `feature/` 前綴
- 問題修復使用 `fix/` 前綴
- 必須包含 task 或 issue 編號
- 使用小寫字母
- 用連字號 `-` 分隔
- 描述要簡短但清楚

#### 使用 Worktree 建立工作空間

```bash
# 在主目錄 (YTMaker) 執行
cd /Users/skyler/coding/YTMaker

# 確保 develop 是最新的
git checkout develop
git pull origin develop

# 為新 task 創建 worktree（如果分支已存在）
git worktree add ../YTMaker-task-XXX feature/task-XXX-description

# 為新 task 創建 worktree（如果分支不存在）
git worktree add -b feature/task-XXX-description ../YTMaker-task-XXX

# 查看所有 worktrees
git worktree list
```

#### Worktree 工作流程

```bash
# 1. 切換到 worktree 目錄
cd /Users/skyler/coding/YTMaker-task-XXX

# 2. 在 VSCode 打開這個目錄
code .

# 3. 在這個目錄中開發
# [進行開發... 這個目錄獨立於其他 worktrees]

# 4. 測試通過後 commit
git add .
git commit -m "feat: 完成任務描述 [task-XXX]"

# 5. 推送到 remote (必須！)
git push origin feature/task-XXX-description
# 首次推送可能需要：git push -u origin feature/task-XXX-description

# 6. 完成後，回到主目錄合併
cd /Users/skyler/coding/YTMaker
git checkout develop
git pull origin develop
git merge feature/task-XXX-description --no-ff
git push origin develop

# 7. 刪除 worktree 和分支
git worktree remove ../YTMaker-task-XXX
git branch -d feature/task-XXX-description
git push origin --delete feature/task-XXX-description
```

#### Worktree 管理命令

```bash
# 列出所有 worktrees
git worktree list

# 移除 worktree（工作完成後）
git worktree remove ../YTMaker-task-XXX

# 強制移除（有未提交變更時）
git worktree remove -f ../YTMaker-task-XXX

# 清理無效的 worktree 記錄
git worktree prune
```

---

### 自動合併策略

#### 何時自動執行 merge

Claude Code 應該自動檢測以下情況並執行合併：

**觸發條件（滿足任一即可）：**

1. **Task 完成標記**
   - 檢測到 `development/phase-X/task-XXX.md` 標題被標記為 `[v]`
   - 且所有相關測試已執行並通過

2. **Issue 解決標記**
   - 檢測到 `issues/issue-XXX.md` 標題被標記為 `[已解決]`
   - 且修復已驗證

3. **用戶明確指示**
   - 用戶說「完成了」、「可以合併了」、「這個工作做完了」
   - 用戶明確表示要結束當前工作

4. **Spec 撰寫完成**
   - 撰寫或大幅修改 spec 文件後
   - 用戶確認內容完整

#### 自動合併流程

當檢測到觸發條件時，自動執行以下步驟：

```bash
# 1. 確認當前分支有 commits
git log develop..HEAD --oneline

# 2. 同步最新的 develop
git checkout develop
git pull origin develop

# 3. 切回工作分支並嘗試合併 develop
git checkout <當前工作分支>
git merge develop

# 4. 檢查衝突
if [無衝突]; then
    # 5a. 合併到 develop
    git checkout develop
    git merge <當前工作分支> --no-ff
    git push origin develop

    # 6a. 刪除已合併的分支
    git branch -d <當前工作分支>
    git push origin --delete <當前工作分支>

    # 7a. 通知用戶
    echo "✅ 工作已合併到 develop 並刪除分支"
else
    # 5b. 有衝突時提醒用戶
    echo "⚠️ 發現合併衝突，需要手動處理："
    git status
    # 提供解決步驟指引
fi
```

#### 合併前檢查清單

在執行自動合併前，確認：

- [ ] 當前分支至少有 1 個 commit
- [ ] 所有變更已推送到遠端
- [ ] 如果是 task，測試已通過
- [ ] 如果是 issue，修復已驗證
- [ ] 工作確實已完成

#### 何時不自動合併

以下情況**不應該**自動合併：

- ❌ 工作明顯未完成
- ❌ 測試失敗或未執行
- ❌ 用戶表示還要繼續修改
- ❌ 存在未解決的衝突
- ❌ 分支沒有任何 commits

---

## 並行開發規則（使用 Worktree）

### 可以並行的任務

在 `development/phase-X/overview.md` 中會標記哪些任務可以並行執行。

**條件：**
- ✅ 無直接依賴關係
- ✅ 不修改相同的檔案
- ✅ 可以獨立測試

**使用 Worktree 實現真正的並行：**

```bash
# 為每個可並行的 task 創建 worktree
git worktree add ../YTMaker-task-001 feature/task-001-project-setup
git worktree add ../YTMaker-task-002 feature/task-002-database-schema
git worktree add ../YTMaker-task-003 feature/task-003-frontend-arch

# 在不同的 VSCode 窗口/Terminals 同時工作
Terminal 1: cd ../YTMaker-task-001 && code .
Terminal 2: cd ../YTMaker-task-002 && code .
Terminal 3: cd ../YTMaker-task-003 && code .
```

**範例：**
```
可並行執行 (Parallel Group 1):
├─ Task-001: 專案初始化 (YTMaker-task-001 目錄)
├─ Task-002: 資料庫設計 (YTMaker-task-002 目錄)
└─ Task-003: 前端架構 (YTMaker-task-003 目錄)
```

這三個任務各自在獨立的 worktree 中開發，完全互不影響。

---

### 必須序列的任務

**條件：**
- ❌ 有直接依賴關係
- ❌ 會修改相同的檔案
- ❌ 後者需要前者的結果

**範例：**
```
序列執行:
Task-004: 認證 API (依賴 Task-002 資料庫)
    ↓
Task-005: JWT Token (依賴 Task-004 認證邏輯)
    ↓
Task-006: 登入頁面 (依賴 Task-005 Token 機制)
```

這些任務必須按順序完成。

---

## Commit 訊息規範

### 格式

```
<type>: <description> [task-XXX 或 issue-XXX]

例如：
feat: 實作用戶註冊 API [task-004]
fix: 修正登入驗證錯誤 [issue-006]
test: 新增認證測試案例 [task-005]
```

### Type 類型

| Type | 說明 | 範例 |
|------|------|------|
| `feat` | 新功能 | feat: 新增使用者認證功能 |
| `fix` | 修復 bug | fix: 修正密碼驗證邏輯 |
| `test` | 測試相關 | test: 新增 API 整合測試 |
| `docs` | 文件更新 | docs: 更新 API 規格文件 |
| `refactor` | 重構（必須同步更新 spec） | refactor: 重構認證服務 |
| `style` | 程式碼格式（不影響功能） | style: 修正 linter 警告 |
| `chore` | 雜項（建置、工具等） | chore: 更新 dependencies |
| `perf` | 效能優化 | perf: 優化資料庫查詢 |

### 規則

**必須包含：**
- ✅ Type 前綴
- ✅ 清楚的描述
- ✅ Task 或 Issue 編號（如果相關）

**描述要求：**
- 用現在式（"新增" 而非 "新增了"）
- 第一個字母小寫
- 不加句號
- 清楚說明做了什麼

**範例：**

✅ 好的 commit 訊息
```
feat: 實作 JWT token 生成與驗證 [task-005]
fix: 修正用戶註冊時的 email 重複檢查 [issue-004]
test: 新增認證 API 的錯誤處理測試 [task-004]
docs: 更新 backend-spec.md 中的認證流程 [task-005]
refactor: 重構 authService 改善可讀性 [task-004]
fix: 解決登入頁面載入超時問題 [issue-012]
```

❌ 不好的 commit 訊息
```
update code
fix bug
test
WIP
修改了一些東西
```

---

## 每日同步流程

### 開始工作前

```bash
# 1. 切換到 develop
git checkout develop

# 2. 拉取最新變更
git pull origin develop

# 3. 切換回開發分支
git checkout feature/task-XXX  # 或 fix/issue-XXX

# 4. 合併最新的 develop
git merge develop

# 5. 解決衝突（如果有）
# [解決衝突...]

# 6. 繼續開發
```

### 結束工作時

```bash
# 1. 確保程式碼通過測試
npm test  # 或相應的測試命令

# 2. Commit 變更
git add .
git commit -m "feat: 完成 XXX 功能 [task-XXX]"
# 或：git commit -m "fix: 修正 XXX 問題 [issue-XXX]"

# 3. 推送到 remote (必須！)
git push origin feature/task-XXX  # 或 fix/issue-XXX
```

---

## 測試策略

### 測試層級
1. **單元測試：** 測試個別函數/方法
2. **整合測試：** 測試模組間整合
3. **E2E 測試：** 測試完整使用者流程

### 測試覆蓋率目標
- 一般程式碼：> 80%
- 核心業務邏輯：> 90%

---

## Slash Commands 使用

可用的自訂命令：

### 產品設計階段
- `/generate-overview` - 基於用戶需求生成 overview.md
- `/generate-flows` - 基於 overview.md 生成 flows.md
- `/generate-pages` - 基於 flows.md 生成 pages.md

### 技術規格階段
- `/generate-tech-specs-framework` - 基於產品設計文件生成 framework.md
- `/generate-tech-specs-backend` - 基於產品設計與框架生成 backend-spec.md
- `/generate-tech-specs-frontend` - 基於產品設計與框架生成 frontend-spec.md
- `/split-specs` - 拆分並檢查 tech specs（在生成初稿後使用）

### 開發規劃階段（兩步驟）
- `/plan-phase` - 規劃整個開發階段
  - 生成 `overview.md`（完整規劃、依賴關係、執行順序）
  - 生成所有 `task-XXX.md` 的**空骨架**（只有基本資訊）
  - 可基於完整 spec（Phase 1）
  - 可基於部分 spec（Phase 2+）
  - 可直接描述功能需求

- `/detail-task XXX` - 填充單一 task 的詳細內容
  - 一次只處理一個 task
  - 生成詳細的測試要求（3-10 個測試案例）
  - 生成完整的實作規格（檔案列表、程式碼骨架）
  - 生成 TDD step-by-step 開發指引
  - 產出可直接使用的完整開發指南

### 問題處理
- `/log-issue` - 記錄問題並分析解決方案

### 品質檢查
- `/sync-specs` - 檢查 spec 與程式碼同步狀態

---

## 開發時注意事項

### ✅ 應該做的事
- 先閱讀所有相關文件
- 先定義測試再開發
- 保持 spec 同步
- 記錄所有問題
- 寫清楚的註解
- 遵循程式碼規範

### ❌ 不應該做的事
- 跳過文件直接開發
- 沒有測試就完成任務
- 遇到問題直接改程式碼
- Spec 與程式碼不一致
- 跳過測試
- 未經 code review 就合併

---

## 品質檢查清單

### 開發完成前
- [ ] 所有測試通過
- [ ] Spec 已同步
- [ ] 程式碼符合規範
- [ ] 無 console.log 或除錯程式碼
- [ ] 錯誤處理完整
- [ ] 註解清楚

### 合併前
- [ ] Code review 完成
- [ ] 無衝突
- [ ] CI/CD 通過
- [ ] 文件已更新

---

## 參考資源

### 範本檔案
- 任務範本：`development/phase-1/task-template.md`
- 問題範本：`issues/issue-template.md`

### 說明文件
- 開發流程：`development/README.md`
- 問題處理：`issues/README.md`

---

## 常見問題

**Q: 如果需求不清楚怎麼辦？**
A: 停止開發，回到產品設計階段釐清需求，更新文件後再繼續。

**Q: 測試失敗怎麼辦？**
A: 不要直接修改。建立 issue，分析問題，必要時更新 spec。

**Q: 可以跳過測試嗎？**
A: 絕對不行。測試是確保品質的關鍵。

**Q: Spec 和程式碼不一致怎麼辦？**
A: 必須立即修正。更新 spec 或修改程式碼，確保一致。

---

當你收到任務時，請：
1. 仔細閱讀任務文件
2. 確認理解所有關聯的 spec
3. 先定義測試
4. 再開始開發
5. 確保測試通過
6. 確認 spec 同步

記住：**品質比速度更重要。先做對，再做快。**
