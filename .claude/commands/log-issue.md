# Log Issue Command

記錄開發或測試過程中遇到的問題。

**重要：遇到問題時，不要直接修改程式碼。先建立問題記錄。**

## ⚠️ 開始前準備

**在記錄問題和進行任何修改之前，必須先創建專用的 worktree 和分支！**

### 1. 確定 Issue 編號

```bash
# 查看現有 issues，確定下一個編號
ls issues/

# 假設下一個編號是 008
```

### 2. 創建 Worktree 和分支

```bash
# 回到主目錄
cd /Users/skyler/coding/YTMaker

# 確保 develop 是最新的
git checkout develop
git pull origin develop

# 為這個 issue 創建獨立的 worktree 和分支
# 格式：fix/issue-XXX-brief-description
git worktree add -b fix/issue-008-api-key-field-mismatch ../YTMaker-issue-008

# 切換到 worktree 目錄
cd ../YTMaker-issue-008

# 在這個目錄中進行所有工作
```

### 3. 為什麼需要這樣做？

- ✅ **完全隔離**：不會影響其他正在進行的工作
- ✅ **並行修復**：可以同時處理多個 issues
- ✅ **避免衝突**：不同的 issue 在不同的目錄和分支
- ✅ **清晰追蹤**：每個 issue 有自己的提交歷史

---

## 輸入

請告訴我：
1. **問題簡述**：一句話描述問題（用於分支名稱）
2. **發現時機**：開發/測試/整合測試中發現
3. **相關 Task**：在執行哪個 task 時發現（如果有）
4. **問題類型**：Bug / Performance / Security / Design / Integration
5. **優先級**：P0 緊急 / P1 高 / P2 中 / P3 低

## 要求

### 1. 問題描述

- **簡述**：清楚說明問題是什麼
- **詳細說明**：完整描述問題情況
- **發現時機**：在哪個階段、哪個任務發現

### 2. 重現步驟

**必須包含：**
- 前置條件：需要什麼環境/資料
- 詳細步驟：如何重現問題（步驟越詳細越好）
- 實際結果：發生了什麼
- 預期結果：應該發生什麼
- 參考 Spec：這個預期結果來自哪個 spec

**如果有錯誤訊息：**
- 完整的錯誤訊息
- Stack trace
- 相關日誌

**如果可能：**
- 螢幕截圖
- 錄影

### 3. 影響評估

- **影響範圍**：哪些功能受影響
- **影響用戶**：哪些用戶會遇到
- **頻率**：每次/偶爾/特定條件
- **嚴重程度**：系統無法運作/功能受限/小問題
- **替代方案**：是否有 workaround

### 4. 根因分析

**我會協助你進行分析：**

#### 程式碼分析
- 找出相關的程式碼
- 分析問題所在
- 追蹤資料流

#### 確定根本原因
可能的原因類型：
- 程式碼邏輯錯誤
- Spec 定義不清楚
- 驗證規則遺漏
- 錯誤處理不當
- 設計缺陷
- 第三方服務問題
- 環境配置問題

### 5. 解決方案

**提供至少一個解決方案，包含：**

#### 方案概述
清楚說明如何解決

#### 詳細步驟
1. 需要做什麼
2. 修改哪些檔案
3. 改什麼內容

#### Spec 更新需求
- [ ] 需要更新 spec
  - 哪些 spec 文件
  - 為什麼需要更新
  - 要改什麼
- [ ] 不需要更新 spec

#### 程式碼變更
展示修改前後的程式碼對比

#### 測試計劃
- 需要新增什麼測試
- 需要修改什麼測試

#### 優缺點和風險評估

如果有多個方案，提供比較表格。

### 6. 預防措施

思考：
- 為什麼會發生這個問題
- 如何避免類似問題
- 需要改進什麼（開發流程/測試策略/文件規範）

## 輸出

生成 `issues/issue-XXX.md` 文件（按順序編號）。

文件必須包含：
- 完整的問題描述
- 可重現的步驟
- 深入的根因分析
- 具體的解決方案
- 預防措施

## 後續流程

建立問題記錄後（**所有工作都在 worktree 中進行**）：

### 1. 在 Worktree 中進行修復

```bash
# 確認你在正確的 worktree 目錄中
pwd  # 應該顯示 /Users/skyler/coding/YTMaker-issue-XXX

# 確認你在正確的分支上
git branch  # 應該顯示 * fix/issue-XXX-description
```

### 2. 如果需要更新 Spec

- 先更新相關的 spec 文件
- 確保 spec 正確反映設計
- Commit 這些變更

```bash
git add tech-specs/
git commit -m "docs: 更新 spec 以修正 issue-XXX [issue-XXX]"
git push -u origin fix/issue-XXX-description
```

### 3. 修改程式碼

- 根據更新後的 spec 修改
- 確保一致性

```bash
git add .
git commit -m "fix: 修正 XXX 問題 [issue-XXX]"
git push origin fix/issue-XXX-description
```

### 4. 更新測試

- 新增測試覆蓋這個問題
- 確保問題不會再發生

```bash
git add .
git commit -m "test: 新增測試防止 issue-XXX 再次發生 [issue-XXX]"
git push origin fix/issue-XXX-description
```

### 5. 驗證

```bash
# 執行所有測試
npm test  # 或相應的測試命令

# 確認問題已解決
# 確認無副作用
```

### 6. 更新問題狀態

- 更新 `issues/issue-XXX.md` 標題為 `[已解決]`
- 重命名檔案為 `✓ issue-XXX.md`
- 記錄解決方案和驗證結果

```bash
# 更新 issue 文件標題（手動編輯）
# 標記為 [已解決]

# 重命名檔案
git mv issues/issue-XXX.md "issues/✓ issue-XXX.md"

git add .
git commit -m "docs: 標記 issue-XXX 為已解決 [issue-XXX]"
git push origin fix/issue-XXX-description
```

### 7. 合併到 develop

```bash
# 回到主目錄
cd /Users/skyler/coding/YTMaker

# 確保 develop 是最新的
git checkout develop
git pull origin develop

# 合併 issue 分支
git merge fix/issue-XXX-description --no-ff

# 推送到 remote
git push origin develop

# 刪除 worktree 和分支
git worktree remove ../YTMaker-issue-XXX
git branch -d fix/issue-XXX-description
git push origin --delete fix/issue-XXX-description
```

### 8. 完成！

- ✅ Issue 已修復
- ✅ 所有變更已合併到 develop
- ✅ Worktree 和分支已清理
- ✅ 可以開始處理下一個 issue

## 檢查清單

- [ ] 問題描述清楚
- [ ] 重現步驟完整
- [ ] 根因分析深入
- [ ] 解決方案可行
- [ ] 考慮了 spec 同步
- [ ] 定義了測試計劃
- [ ] 提出了預防措施

完成後告訴我：
- Issue 編號
- 優先級
- 建議的解決方案
- 是否需要更新 spec
- 預估修復時間
