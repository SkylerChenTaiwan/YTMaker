# Claude Code 專案範本

這是一個專為 Claude Code 設計的專案開發範本，採用**文件驅動開發 (Document-Driven Development)** 和**測試驅動開發 (Test-Driven Development)** 的方法論。

---

## 核心理念

### 有文件才有開發
- 所有功能必須先在規格文件中定義
- 規格必須與程式碼 100% 同步
- 不允許未經設計就直接開發

### 測試驅動開發
- 開發前先定義測試
- 所有功能都必須有測試
- 測試通過才算完成

### 遇到問題先記錄
- 發現問題不直接改程式碼
- 建立問題記錄，分析根因
- 必要時更新規格再修改程式碼

---

## 專案結構

```
專案範本/
├── .claude/                 # Claude Code 設定
│   ├── claude.md           # 主要開發指南
│   ├── commands/           # Slash commands
│   │   ├── generate-flows.md
│   │   ├── generate-pages.md
│   │   ├── plan-phase.md
│   │   ├── create-task.md
│   │   ├── log-issue.md
│   │   └── sync-specs.md
│   └── prompts/            # Prompt 範本
│
├── product-design/         # 產品設計文件
│   ├── overview.md         # 產品概述
│   ├── flows.md            # 使用者流程、需求
│   └── pages.md            # 頁面設計
│
├── tech-specs/             # 技術規格文件
│   ├── framework.md        # 技術框架規範
│   ├── backend-spec.md     # 後端技術規格
│   └── frontend-spec.md    # 前端技術規格
│
├── development/            # 開發計劃與記錄
│   ├── README.md          # 開發流程說明
│   ├── phase-1/           # 第一階段
│   │   ├── overview.md    # 階段總覽
│   │   ├── task-template.md # 任務範本
│   │   └── task-XXX.md    # 具體任務
│   └── phase-2/           # 第二階段
│
├── issues/                 # 問題追蹤
│   ├── README.md          # 問題處理流程
│   ├── issue-template.md  # 問題範本
│   └── issue-XXX.md       # 具體問題
│
├── tests/                  # 測試檔案
│   ├── unit/              # 單元測試
│   ├── integration/       # 整合測試
│   └── e2e/               # E2E 測試
│
├── GIT_WORKFLOW.md        # Git 工作流程
└── README.md              # 本文件
```

---

## 快速開始

**💡 提示：** 建議先閱讀 [`TASK_GENERATION_GUIDE.md`](./TASK_GENERATION_GUIDE.md) 了解批量任務生成的詳細說明。

### 1. 複製範本

將這個範本複製到你的新專案：

```bash
cp -r Claude_Code專案設定 my-new-project
cd my-new-project
```

### 2. 開始產品設計

#### Step 1: 撰寫產品概述
編輯 `product-design/overview.md`，填寫：
- 產品是什麼
- 目標用戶
- 核心功能
- 用戶體驗目標

#### Step 2: 生成使用者流程
使用 Claude Code slash command：
```
/generate-flows
```
這會基於 overview.md 生成完整的 flows.md

#### Step 3: 生成頁面設計
```
/generate-pages
```
這會基於 flows.md 生成頁面設計規格

### 3. 定義技術規格

#### Step 1: 選擇技術框架
編輯 `tech-specs/framework.md`，定義：
- 前端/後端技術棧
- 專案結構
- 開發規範
- 測試策略

#### Step 2: 生成後端規格
基於產品設計，填寫 `tech-specs/backend-spec.md`：
- 資料庫設計
- API 設計
- 業務邏輯
- 認證授權

#### Step 3: 生成前端規格
填寫 `tech-specs/frontend-spec.md`：
- 元件設計
- 狀態管理
- API 整合
- 路由設計

### 4. 規劃開發階段

使用 Claude Code slash command：
```
/plan-phase
```

告訴 Claude Code 你要規劃什麼：
- 方式 A：基於完整 spec（適合 Phase 1）
- 方式 B：基於部分 spec（適合 Phase 2+）
- 方式 C：直接描述功能需求

Claude Code 會：
- 分析你的需求
- 拆分成合理大小的任務
- 分析依賴關係
- **批量生成所有 task 文件**
- 生成 phase overview

大約 5-15 分鐘完成所有任務的建立！

### 5. 執行開發

1. 選擇一個任務（例如 `task-001.md`）
2. 將整個任務文件作為 prompt 提供給 Claude Code
3. Claude Code 會：
   - 先寫測試
   - 實作功能
   - 執行測試
   - 確保通過
4. 測試通過後，標記任務為完成 `[v]`

### 6. 規劃下一階段

完成一個階段後，規劃下一階段：
```
/plan-phase
```

告訴 Claude Code：
- 這個階段要做什麼功能
- 可以基於部分 spec 或直接描述

它會：
- 跟你討論需求細節
- 建議任務拆分
- 分析依賴關係
- **批量生成所有任務**

### 7. 處理問題

當遇到問題時：
```
/log-issue
```

然後按照問題記錄的流程處理。

### 8. 同步檢查

定期執行：
```
/sync-specs
```

確保規格與程式碼保持同步。

---

## 開發工作流程

```
產品設計 → 技術規格 → 任務規劃 → 開發執行 → 測試驗證 → 問題處理
    ↓         ↓          ↓          ↓          ↓          ↓
overview   framework  phase plan   task      tests     issues
flows      backend     tasks      (TDD)     passing   resolved
pages      frontend    順序規劃
```

### 詳細流程

#### 階段 1: 設計階段
1. 產品經理視角：撰寫產品設計
2. 系統分析：定義所有流程和需求
3. UI/UX 設計：規劃所有頁面

#### 階段 2: 架構階段
1. CTO 視角：定義技術框架
2. 後端架構：設計 API 和資料庫
3. 前端架構：設計元件和狀態

#### 階段 3: 規劃階段
1. 任務拆分：將功能分解為獨立任務
2. 依賴分析：確定執行順序
3. 並行規劃：找出可並行的任務

#### 階段 4: 執行階段
1. 測試優先：先寫測試
2. 功能開發：實作功能
3. 驗證測試：確保通過

#### 階段 5: 品質保證
1. Spec 同步：確保文件正確
2. Code Review：檢查程式碼品質
3. 整合測試：驗證整體功能

---

## Git 工作流程

詳見 `GIT_WORKFLOW.md`

**重點：**
- 每個 task 使用 `feature/task-XXX` 分支
- 測試通過才能合併
- 遵循 commit 訊息規範
- 並行開發時注意檔案衝突

---

## 可用的 Slash Commands

| Command | 用途 |
|---------|------|
| `/generate-flows` | 基於 overview.md 生成 flows.md |
| `/generate-pages` | 基於 flows.md 生成 pages.md |
| `/plan-phase` | 規劃開發階段，批量生成所有任務（適用所有 Phase） |
| `/log-issue` | 記錄問題 |
| `/sync-specs` | 檢查 spec 與程式碼同步 |

---

## 核心原則詳解

### 1. 文件驅動開發

**為什麼？**
- 確保需求清楚
- 避免返工
- 維護性高
- 團隊協作容易

**如何做？**
- 所有功能先有 spec
- Spec 必須詳細且可執行
- 程式碼必須符合 spec
- Spec 與程式碼保持同步

### 2. 測試驅動開發

**為什麼？**
- 確保程式碼品質
- 防止回歸錯誤
- 文件化程式碼行為
- 重構更安全

**如何做？**
- 開發前先寫測試
- 測試要覆蓋所有情境
- 包含 edge cases
- 包含錯誤處理

### 3. 問題驅動改進

**為什麼？**
- 避免盲目修改
- 累積知識
- 改進流程
- 預防重複問題

**如何做？**
- 發現問題先記錄
- 深入分析根因
- 提出系統性解決方案
- 更新規格和測試

---

## 專案類型適配

### Web 應用
- ✅ 完整支援
- 使用 frontend + backend spec
- 定義完整的 API 規格

### API 專案
- ✅ 完整支援
- 主要使用 backend spec
- 重點在 API 設計和測試

### CLI 工具
- ✅ 支援
- 調整 pages.md 為 commands.md
- 定義命令規格

### Library/Package
- ✅ 支援
- 調整 pages.md 為 api.md
- 定義公開 API 規格

---

## 最佳實踐

### DO ✅
- 先設計再開發
- 先測試再實作
- 保持文件同步
- 記錄所有問題
- 遵循 Git 流程
- Code review
- 定期 sync check

### DON'T ❌
- 跳過設計直接寫程式碼
- 沒有測試就標記完成
- 遇到問題直接改程式碼
- Spec 與程式碼不一致
- 未經審查就合併
- 忽略測試失敗

---

## 團隊協作

### 單人開發
- 所有步驟按順序執行
- 使用 slash commands 輔助
- 定期檢查文件同步

### 多人協作
- 分配不同 phase 給不同成員
- 使用並行任務提高效率
- 每個人負責獨立的 feature branch
- 定期同步和 code review

### 與 Claude Code 協作
- 將任務文件作為 prompt
- 開多個 Claude Code 實例並行開發
- 使用 slash commands 自動化流程
- 讓 Claude Code 協助文件生成

---

## 常見問題

**Q: 這個流程會不會太慢？**
A: 前期會慢一點，但長期來說：
- 減少返工
- 降低 bug 率
- 提高可維護性
- 整體效率更高

**Q: 必須嚴格遵循嗎？**
A: 核心原則必須遵循：
- 有文件才開發
- 有測試才完成
- 遇到問題先記錄
其他可以根據專案調整。

**Q: 適合快速原型嗎？**
A: 如果是拋棄式原型，可以簡化。
如果是要持續維護的專案，建議完整使用。

**Q: 如何處理需求變更？**
A:
1. 先更新產品設計文件
2. 檢查影響範圍
3. 更新相關 spec
4. 建立新任務或修改現有任務
5. 執行開發和測試

---

## 進階使用

### 自訂 Slash Commands
在 `.claude/commands/` 新增自己的命令檔案。

### 擴展範本
根據專案需求修改範本結構。

### 整合 CI/CD
- 自動執行測試
- 自動檢查 spec 同步
- 自動部署

### 文件自動生成
使用工具從程式碼生成 API 文件，再與 spec 比對。

---

## 授權

本範本採用 MIT 授權，可自由使用和修改。

---

## 貢獻

歡迎提出改進建議！

---

## 聯絡

如有問題或建議，請開 Issue 討論。

---

**記住：品質比速度重要。先做對，再做快。**

Happy Coding with Claude! 🚀
