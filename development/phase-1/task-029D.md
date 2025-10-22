# Task-029D: 整合與部署

> **建立日期:** 2025-10-22  
> **狀態:** ⏳ 未開始  
> **預計時間:** 2 小時  
> **優先級:** P0 (必須)  
> **父任務:** Task-029  
> **依賴:** Task-029B, Task-029C

---

## 任務目標

完成整合測試、CI/CD 配置與測試文件,確保整體測試覆蓋率達到 **> 90%**。

### 成功標準
- [ ] 整合測試全部通過
- [ ] CI/CD 自動執行測試
- [ ] **整體測試覆蓋率 > 90%**
- [ ] **核心業務邏輯覆蓋率 > 95%**
- [ ] 測試執行時間 < 10 分鐘
- [ ] 測試文件完整

---

## 實作規格

### 1. 整合測試 (30分鐘)

**檔案:** `tests/e2e/integration/cross-flow.spec.ts`
- 測試批次處理 + 單一專案編輯互不影響

**檔案:** `tests/e2e/integration/data-consistency.spec.ts`
- 測試前後端資料一致性

### 2. GitHub Actions CI/CD (45分鐘)

**檔案:** `.github/workflows/e2e-tests.yml`
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
      - name: Install dependencies
        run: cd frontend && npm ci
      - name: Install Playwright
        run: cd frontend && npx playwright install --with-deps
      - name: Run E2E tests
        run: cd frontend && npm run test:e2e
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### 3. 覆蓋率驗證 (30分鐘)

```bash
# 執行所有測試並生成覆蓋率報告
npm run test:e2e -- --reporter=html
npm test -- --coverage

# 檢查覆蓋率
open coverage/index.html
```

**驗證目標:**
- 整體覆蓋率 > 90%
- 核心業務邏輯 > 95%

### 4. 測試文件撰寫 (15分鐘)

**檔案:** `tests/README.md`
- 測試執行指南
- Mock API 使用說明
- 故障排除

---

## 完成檢查清單

### CI/CD
- [ ] GitHub Actions workflow 建立
- [ ] 測試自動執行
- [ ] 測試失敗時 PR 阻擋
- [ ] Coverage 報告自動上傳

### 覆蓋率
- [ ] **整體覆蓋率 > 90%** ✨
- [ ] **核心業務邏輯 > 95%** ✨  
- [ ] Coverage 報告可正常產生
- [ ] Codecov 整合正常

### 測試文件
- [ ] README.md 完整
- [ ] 執行指南清楚
- [ ] 故障排除完整

---

**預估時間:** 2 小時
