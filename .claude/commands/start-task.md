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

## 2. 檢查並創建工作分支

**強制要求：絕對不要在 develop 分支上開發**

```bash
# 檢查當前分支
git branch --show-current

# 如果在 develop，立即創建新分支
git checkout -b feature/task-XXX-description
```

分支命名：`feature/task-XXX-[簡短描述]`

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
- ❌ 不要在 develop 分支上直接開發
- ❌ 不要先寫實作再補測試
- ✅ 先讀 spec → 寫測試 → 寫實作 → 測試通過 → commit
- ✅ 保持 spec 與程式碼同步
- ✅ 定期 push 到 GitHub

---

## 完成標記

當所有測試通過且功能完整時：
- 標記 task 為 `[v]`
- 自動執行合併流程（merge 回 develop）
