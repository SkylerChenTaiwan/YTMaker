# Git 工作流程

本文件定義專案的 Git 分支策略、提交規範和協作流程。

---

## 分支策略

### 主要分支

#### `main` 分支
- **用途：** 穩定的正式版本
- **保護：** 禁止直接推送，只接受從 `develop` 的 merge
- **部署：** 自動部署到 production 環境
- **標籤：** 每個 release 都要打 tag

#### `develop` 分支
- **用途：** 開發主線，整合所有完成的功能
- **保護：** 禁止直接推送，只接受從 feature branch 的 merge
- **部署：** 自動部署到 staging 環境
- **要求：** 所有測試必須通過才能合併

---

### 功能分支 (Feature Branches)

#### 命名規範
```
feature/task-XXX-description

例如：
feature/task-001-project-setup
feature/task-002-database-schema
feature/task-015-user-auth-api
```

**規則：**
- 必須包含 task 編號
- 使用小寫字母
- 用連字號 `-` 分隔
- 描述要簡短但清楚

#### 建立分支
```bash
# 從最新的 develop 分支建立
git checkout develop
git pull origin develop
git checkout -b feature/task-XXX-description
```

#### 工作流程
```bash
# 1. 開發功能
# [進行開發...]

# 2. 測試通過後 commit
git add .
git commit -m "feat: 完成任務描述 [task-XXX]"

# 3. 推送到 remote
git push origin feature/task-XXX-description

# 4. 合併前先同步 develop
git checkout develop
git pull origin develop
git checkout feature/task-XXX-description
git merge develop

# 5. 解決衝突（如果有）
# [解決衝突...]
git add .
git commit -m "merge: 解決合併衝突"

# 6. 合併到 develop
git checkout develop
git merge feature/task-XXX-description

# 7. 推送並刪除分支
git push origin develop
git branch -d feature/task-XXX-description
git push origin --delete feature/task-XXX-description
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

### 並行開發實務

#### 多個 Claude Code 實例

**設定：**
```bash
# Terminal 1 - Claude Code Instance A
cd my-project
git checkout -b feature/task-001-project-setup
# 開始 Task-001

# Terminal 2 - Claude Code Instance B
cd my-project
git checkout -b feature/task-002-database-schema
# 開始 Task-002

# Terminal 3 - Claude Code Instance C
cd my-project
git checkout -b feature/task-003-frontend-structure
# 開始 Task-003
```

**合併順序：**

根據 `phase-X/overview.md` 中定義的優先級，依序合併：

```bash
# 1. 優先級最高的先合併（通常是基礎設施）
git checkout develop
git merge feature/task-001-project-setup
git push origin develop

# 2. 第二優先級
git pull origin develop  # 確保最新
git merge feature/task-002-database-schema
git push origin develop

# 3. 第三優先級
git pull origin develop
git merge feature/task-003-frontend-structure
git push origin develop
```

---

## Commit 訊息規範

### 格式

```
<type>: <description> [task-XXX]

例如：
feat: 實作用戶註冊 API [task-004]
fix: 修正登入驗證錯誤 [task-006]
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
- ✅ Task 編號（如果相關）

**描述要求：**
- 用現在式（"新增" 而非 "新增了"）
- 第一個字母小寫
- 不加句號
- 清楚說明做了什麼

**範例：**

✅ 好的 commit 訊息
```
feat: 實作 JWT token 生成與驗證 [task-005]
fix: 修正用戶註冊時的 email 重複檢查 [task-004]
test: 新增認證 API 的錯誤處理測試 [task-004]
docs: 更新 backend-spec.md 中的認證流程 [task-005]
refactor: 重構 authService 改善可讀性 [task-004]
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

## 衝突處理

### 預防衝突

1. **頻繁同步 develop**
   ```bash
   git checkout feature/task-XXX
   git fetch origin
   git merge origin/develop
   ```

2. **遵循檔案修改範圍**
   - 查看 task 定義的修改檔案範圍
   - 不要修改範圍外的檔案

3. **及時合併**
   - 任務完成後盡快合併
   - 不要累積太多未合併的分支

---

### 解決衝突

**當出現合併衝突時：**

#### Step 1: 停止所有並行開發
通知其他開發者暫停，避免更多衝突。

#### Step 2: 同步最新的 develop
```bash
git checkout develop
git pull origin develop
```

#### Step 3: 在 feature branch 中合併
```bash
git checkout feature/task-XXX
git merge develop
```

#### Step 4: 解決衝突
```bash
# Git 會標記衝突的檔案
# 手動編輯解決衝突

# 完成後
git add .
git commit -m "merge: 解決與 develop 的合併衝突"
```

#### Step 5: 重新測試
```bash
# 執行所有測試確保沒問題
npm test  # 或相應的測試命令
```

#### Step 6: 更新相關 Spec（如需要）
如果衝突涉及功能變更，更新相關的 spec 文件。

#### Step 7: 合併到 develop
```bash
git checkout develop
git merge feature/task-XXX
git push origin develop
```

#### Step 8: 通知其他開發者
告知可以繼續開發。

---

## 每日同步流程

### 開始工作前

```bash
# 1. 切換到 develop
git checkout develop

# 2. 拉取最新變更
git pull origin develop

# 3. 切換回 feature branch
git checkout feature/task-XXX

# 4. 合併最新的 develop
git merge develop

# 5. 解決衝突（如果有）
# [解決衝突...]

# 6. 繼續開發
```

### 結束工作時

```bash
# 1. 確保程式碼通過測試
npm test

# 2. Commit 變更
git add .
git commit -m "feat: 完成 XXX 功能 [task-XXX]"

# 3. 推送到 remote
git push origin feature/task-XXX
```

---

## Code Review 流程

### Pull Request (如果使用)

**建立 PR：**
```bash
# 推送分支後，在 GitHub/GitLab 建立 PR
# 標題：[Task-XXX] 任務描述
# 內容：
# - 完成了什麼
# - 如何測試
# - 相關的 spec 文件
# - 截圖（如果是 UI）
```

**Review Checklist：**
- [ ] 程式碼符合規範
- [ ] 所有測試通過
- [ ] 符合 spec 定義
- [ ] 沒有 console.log 或除錯程式碼
- [ ] 錯誤處理完整
- [ ] 註解清楚
- [ ] Spec 已同步

---

### 直接 Merge（小團隊）

如果不使用 PR，合併前自我檢查：

```bash
# Checklist
- [ ] 所有測試通過
- [ ] Spec 已同步
- [ ] 程式碼已審查
- [ ] 無衝突
- [ ] Commit 訊息清楚
```

---

## Release 流程

### 準備 Release

```bash
# 1. 確保 develop 所有測試通過
git checkout develop
npm test

# 2. 更新版本號（在 package.json 或相應檔案）
# 遵循 Semantic Versioning: MAJOR.MINOR.PATCH

# 3. 更新 CHANGELOG.md
# 記錄這個版本的變更

# 4. Commit 版本更新
git add .
git commit -m "chore: bump version to X.Y.Z"
git push origin develop
```

---

### 合併到 main

```bash
# 1. 切換到 main
git checkout main
git pull origin main

# 2. 合併 develop
git merge develop

# 3. 建立 tag
git tag -a vX.Y.Z -m "Release version X.Y.Z"

# 4. 推送
git push origin main
git push origin vX.Y.Z
```

---

### Hotfix 流程

**緊急修復 production 問題：**

```bash
# 1. 從 main 建立 hotfix 分支
git checkout main
git checkout -b hotfix/issue-XXX-description

# 2. 修復問題
# [進行修復...]

# 3. 測試
npm test

# 4. Commit
git commit -m "fix: 緊急修復 XXX 問題 [issue-XXX]"

# 5. 合併回 main
git checkout main
git merge hotfix/issue-XXX-description
git tag -a vX.Y.Z+1 -m "Hotfix: XXX"
git push origin main
git push origin vX.Y.Z+1

# 6. 同時合併到 develop
git checkout develop
git merge hotfix/issue-XXX-description
git push origin develop

# 7. 刪除 hotfix 分支
git branch -d hotfix/issue-XXX-description
```

---

## Git Hooks

### Pre-commit Hook

```bash
#!/bin/sh
# .git/hooks/pre-commit

# 執行 linter
npm run lint

# 執行測試
npm test

# 如果失敗，阻止 commit
if [ $? -ne 0 ]; then
  echo "測試失敗，請修正後再 commit"
  exit 1
fi
```

### Pre-push Hook

```bash
#!/bin/sh
# .git/hooks/pre-push

# 確保 spec 同步
# [執行 sync-specs 檢查]

# 確保沒有 console.log
if git diff --cached | grep -q "console.log"; then
  echo "發現 console.log，請移除後再 push"
  exit 1
fi
```

---

## 最佳實踐

### DO ✅

- **頻繁 commit**：小步快跑，每完成一個小功能就 commit
- **清楚的訊息**：讓別人（和未來的自己）能理解
- **同步 develop**：每天開始前同步
- **及時合併**：任務完成後盡快合併
- **測試後 commit**：確保測試通過
- **遵循規範**：commit 訊息、分支命名都要規範

### DON'T ❌

- **巨大的 commit**：一次 commit 太多變更
- **模糊的訊息**："update", "fix" 這種沒意義的訊息
- **忽略衝突**：遇到衝突不處理
- **直接推送到 main/develop**：繞過流程
- **未測試就 commit**：製造破壞性變更
- **修改歷史**：不要 rebase 已經 push 的 commit

---

## 團隊協作指南

### 溝通

- **開始任務前**：確認沒有人在做相同或衝突的任務
- **遇到衝突時**：立即溝通協調
- **完成合併後**：通知團隊同步

### 任務分配

參考 `development/phase-X/overview.md`：
- 查看任務依賴關係
- 選擇可並行的任務
- 確認檔案修改範圍

### Code Review

- 互相審查程式碼
- 提供建設性反饋
- 確保符合規範

---

## 工具推薦

### Git GUI
- GitKraken
- SourceTree
- GitHub Desktop

### 命令列工具
- `tig`: 瀏覽 Git 歷史
- `git-flow`: Git flow 輔助工具

### IDE 整合
- VS Code Git 擴展
- JetBrains Git 整合

---

## 常見問題

**Q: 忘記切換分支就開始開發怎麼辦？**
A:
```bash
# 如果還沒 commit
git stash
git checkout -b feature/task-XXX
git stash pop

# 如果已經 commit
git checkout -b feature/task-XXX
# 分支會包含你的 commit
```

**Q: Commit 訊息寫錯了怎麼辦？**
A:
```bash
# 如果還沒 push
git commit --amend -m "正確的訊息"

# 如果已經 push（不建議）
# 只在自己的 feature branch 且無人依賴時使用
git commit --amend -m "正確的訊息"
git push --force origin feature/task-XXX
```

**Q: 要合併了才發現有大量衝突？**
A:
1. 停止合併：`git merge --abort`
2. 分析衝突原因
3. 與相關開發者協調
4. 決定誰先合併
5. 小心地重新合併

**Q: 不小心 push 到錯的分支？**
A:
```bash
# 立即聯絡團隊
# 如果是 main/develop，需要 revert
git revert HEAD
git push origin branch-name
```

---

記住：**Git 是協作工具，不是阻礙。遵循規範能讓協作更順暢。**
