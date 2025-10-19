# 專案開發指南

這是一個使用測試驅動開發 (TDD) 和文件優先策略的專案範本。

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
│   ├── backend-spec.md  # 後端規格
│   └── frontend-spec.md # 前端規格
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

### 階段 2：技術規格
1. 生成 `tech-specs/framework.md` - 技術框架（使用 `/generate-tech-specs-framework`）
2. 生成 `tech-specs/backend-spec.md` - 後端規格（使用 `/generate-tech-specs-backend`）
3. 生成 `tech-specs/frontend-spec.md` - 前端規格（使用 `/generate-tech-specs-frontend`）

### 階段 3：開發計劃
1. 使用 `/plan-phase` 批量生成開發計劃，包含：
   - `development/phase-X/overview.md` - 任務總覽
   - 各個 task 文件（task-XXX.md）
   - 任務依賴關係和並行性標記

### 階段 4：開發執行
1. 選擇一個 task
2. 閱讀 task 文件（包含測試要求）
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
- **保護：** 禁止直接推送，只接受從開發分支 (feature/fix) 的 merge
- **部署：** 自動部署到 staging 環境
- **要求：** 所有測試必須通過才能合併

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

#### 建立分支
```bash
# 從最新的 develop 分支建立
git checkout develop
git pull origin develop

# 功能開發
git checkout -b feature/task-XXX-description

# 問題修復
git checkout -b fix/issue-XXX-description
```

#### 工作流程
```bash
# 1. 開發功能
# [進行開發...]

# 2. 測試通過後 commit
git add .
git commit -m "feat: 完成任務描述 [task-XXX]"
# 或：git commit -m "fix: 修正問題描述 [issue-XXX]"

# 3. 推送到 remote (必須！)
git push origin feature/task-XXX-description
# 或：git push origin fix/issue-XXX-description

# 4. 合併前先同步 develop
git checkout develop
git pull origin develop
git checkout feature/task-XXX-description  # 或 fix/issue-XXX-description
git merge develop

# 5. 解決衝突（如果有）
# [解決衝突...]
git add .
git commit -m "merge: 解決合併衝突"
git push origin feature/task-XXX-description  # 或 fix/issue-XXX-description

# 6. 合併到 develop
git checkout develop
git merge feature/task-XXX-description  # 或 fix/issue-XXX-description

# 7. 推送並刪除分支 (必須推送！)
git push origin develop
git branch -d feature/task-XXX-description  # 或 fix/issue-XXX-description
git push origin --delete feature/task-XXX-description  # 或 fix/issue-XXX-description
```

---

## 並行開發規則

### 可以並行的任務

在 `development/phase-X/overview.md` 中會標記哪些任務可以並行執行。

**條件：**
- ✅ 無直接依賴關係
- ✅ 不修改相同的檔案
- ✅ 可以獨立測試

**範例：**
```
可並行執行 (Parallel Group 1):
├─ Task-001: 專案初始化 (修改根目錄配置)
├─ Task-002: 資料庫設計 (修改 prisma/)
└─ Task-003: 前端架構 (修改 frontend/src/)
```

這三個任務互不影響，可以同時開發。

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

### 開發規劃階段
- `/plan-phase` - 規劃任何開發階段，**批量生成**所有任務
  - 可基於完整 spec（Phase 1）
  - 可基於部分 spec（Phase 2+）
  - 可直接描述功能需求

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
