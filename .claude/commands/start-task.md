# start-task

當用戶執行 `/start-task XXX` 時，你必須按順序完成以下步驟：

---

## 1. 讀取 Task 文件

```bash
# 讀取對應的 task 文件
development/phase-X/task-XXX.md
```

- 如果 task 是空骨架（未填充），提醒用戶先執行 `/detail-task XXX`
- 確認 task 有完整的測試要求和實作規格

---

## 2. 檢查並設置 Worktree

**強制要求：使用 Worktree 來避免分支衝突**

```bash
# 檢查當前工作目錄
pwd
# 應該在 worktree 目錄中，例如：/Users/skyler/coding/YTMaker-task-XXX

# 如果在主目錄 (YTMaker)，需要創建 worktree
git worktree list

# 如果分支已存在（繼續之前的工作）
git worktree add ../YTMaker-task-XXX feature/task-XXX-description

# 如果分支不存在（開始新的 task）
git worktree add -b feature/task-XXX-description ../YTMaker-task-XXX

# 然後切換到 worktree 目錄
cd ../YTMaker-task-XXX
```

**Worktree 命名：**
- Task: `../YTMaker-task-XXX`
- Issue: `../YTMaker-issue-XXX`

**分支命名：**
- Task: `feature/task-XXX-[簡短描述]`
- Issue: `fix/issue-XXX-[簡短描述]`

---

## 3. 閱讀關聯 Spec 文件

**在開始寫程式前，你必須先閱讀：**

- Task 文件中列出的所有 Product Design 文件
- Task 文件中列出的所有 Tech Specs 文件

**不要跳過這一步！** 這些文件包含實作所需的所有細節。

---

## 4. 執行 TDD 開發流程

嚴格遵循以下順序：

1. **先寫測試** - 根據 task 文件的測試要求
2. **再寫實作** - 讓測試通過
3. **執行測試** - 確保全部通過
4. **重構** - 改善程式碼品質
5. **Commit & Push** - 定期推送到 GitHub

---

## 必須遵守的規則

- ❌ 不要跳過閱讀 spec 就開始寫程式
- ❌ 不要在主目錄 (YTMaker) 直接開發
- ❌ 不要在 develop 分支上直接開發
- ❌ 不要先寫實作再補測試
- ✅ 使用 worktree 創建獨立工作空間
- ✅ 先讀 spec → 寫測試 → 寫實作 → 測試通過 → commit
- ✅ 保持 spec 與程式碼同步
- ✅ 定期 push 到 GitHub

---

## 完成標記

當所有測試通過且功能完整時：
- 標記 task 為 `[v]`
- 自動執行合併流程（merge 回 develop）
