# Log Issue Command

**目的：** 記錄並修復開發或測試過程中遇到的問題。

**重要：** 不要直接修改程式碼，必須先建立問題記錄並分析。

---

## 執行步驟

### 1. 準備 Worktree

- 查看 `issues/` 目錄確定下一個 issue 編號
- 回到主目錄 `/Users/skyler/coding/YTMaker`
- 同步最新的 develop：`git checkout develop && git pull origin develop`
- 創建 worktree：`git worktree add -b fix/issue-XXX-brief-description ../YTMaker-issue-XXX`
- 切換到 worktree 目錄：`cd ../YTMaker-issue-XXX`

### 2. 收集問題資訊

向用戶詢問：
1. 問題簡述（用於分支名稱）
2. 發現時機（開發/測試/整合測試）
3. 相關 Task（如果有）
4. 問題類型（Bug/Performance/Security/Design/Integration）
5. 優先級（P0 緊急/P1 高/P2 中/P3 低）

### 3. 深入分析並記錄

生成 `issues/issue-XXX.md`，必須包含：

#### 問題描述
- 簡述
- 詳細說明
- 發現時機

#### 重現步驟
- 前置條件
- 詳細步驟
- 實際結果 vs 預期結果
- 參考 spec
- 錯誤訊息（如有）

#### 影響評估
- 影響範圍
- 頻率
- 嚴重程度
- 替代方案

#### 根因分析
- 分析相關程式碼
- 確定根本原因類型
- 追蹤問題來源

#### 解決方案
- 方案概述
- 詳細步驟
- Spec 更新需求
- 程式碼變更計劃
- 測試計劃
- 風險評估

#### 預防措施
- 如何避免類似問題
- 需要改進的流程

### 4. 執行修復（在 worktree 中）

按順序執行：
1. **更新 Spec**（如需要）
   - 修改相關 spec 文件
   - `git add tech-specs/ && git commit -m "docs: 更新 spec 以修正 issue-XXX [issue-XXX]"`
   - `git push -u origin fix/issue-XXX-description`

2. **修改程式碼**
   - 根據方案修改程式碼
   - `git add . && git commit -m "fix: 修正 XXX 問題 [issue-XXX]"`
   - `git push origin fix/issue-XXX-description`

3. **更新測試**
   - 新增測試覆蓋此問題
   - `git add . && git commit -m "test: 新增測試防止 issue-XXX 再次發生 [issue-XXX]"`
   - `git push origin fix/issue-XXX-description`

4. **執行驗證**
   - 執行所有測試
   - 確認問題已解決
   - 確認無副作用

### 5. 完成檢查與標記

**必須確認以下所有項目：**

- [ ] 所有測試通過
- [ ] Spec 已同步（如有修改）
- [ ] 所有變更已 commit 並 push
- [ ] 無副作用和新問題
- [ ] 編輯 `issues/issue-XXX.md`，標題改為 `# [已解決] Issue-XXX: ...`
- [ ] 使用 `git mv issues/issue-XXX.md "issues/✓ issue-XXX.md"` 重命名檔案
- [ ] `git add . && git commit -m "docs: 標記 issue-XXX 為已解決 [issue-XXX]"`
- [ ] `git push origin fix/issue-XXX-description`

**如果任何項目未完成，不要進入下一步！**

### 6. 自動合併與清理

所有檢查通過後，自動執行：

1. 回到主目錄：`cd /Users/skyler/coding/YTMaker`
2. 同步 develop：`git checkout develop && git pull origin develop`
3. 合併分支：`git merge fix/issue-XXX-description --no-ff`
4. 推送：`git push origin develop`
5. 刪除 worktree：`git worktree remove ../YTMaker-issue-XXX`
6. 刪除分支：`git branch -d fix/issue-XXX-description`
7. 刪除 remote 分支：`git push origin --delete fix/issue-XXX-description`

---

## 輸出摘要

完成後告訴用戶：
- Issue 編號
- 優先級
- 根本原因
- 採用的解決方案
- 是否更新了 spec
- 測試結果
- ✅ 已合併到 develop 並清理完成
