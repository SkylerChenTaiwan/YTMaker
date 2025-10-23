# 自動化測試工具

這個目錄包含用於檢查前後端整合的自動化工具。

## 工具列表

### 1. auto-integration-test.py
**自動化整合測試工具**

實際啟動前後端服務並測試 API 整合，自動偵測欄位不匹配等問題。

**使用方法：**
```bash
# 1. 啟動後端服務
cd backend
python3 -m uvicorn app.main:app --port 8000

# 2. 在另一個 terminal 執行測試
cd /Users/skyler/coding/YTMaker
python3 scripts/auto-integration-test.py
```

**測試項目：**
- ✅ POST /api/v1/projects - 創建專案
- ✅ GET /api/v1/projects - 列出專案
- ✅ GET /api/v1/projects/{id} - 取得專案詳情
- ✅ PUT /api/v1/projects/{id}/configuration - 更新配置
- ✅ PUT /api/v1/projects/{id}/prompt-model - 更新 Prompt 與模型
- ✅ PUT /api/v1/projects/{id}/youtube-settings - 更新 YouTube 設定

**輸出：**
- 終端顯示測試結果
- 生成 `integration-test-report.json` 詳細報告

---

### 2. check-api-contract.py
**API 契約靜態檢查工具**

透過靜態分析比對前後端 API 契約，不需要啟動服務。

**使用方法：**
```bash
python3 scripts/check-api-contract.py
```

**檢查項目：**
- 前端 TypeScript interface 欄位
- 後端 Pydantic schema 欄位
- 自動比對差異

**輸出：**
- 終端顯示不匹配的欄位
- 生成 `api-contract-issues.json` 問題清單

---

## 為什麼需要這些工具？

### 問題背景

在 issue-018 中發現，雖然有 E2E 測試且覆蓋率達 90%，但這些測試都是：
1. **使用 Mock API** - 沒有真正打到後端
2. **測試選擇器不存在** - 測試用的 `input[name="title"]` 在實際前端中根本不存在
3. **前後端從未真正整合測試** - 導致欄位名稱不匹配的問題一直沒被發現

### 解決方案

這些自動化工具可以：
- ✅ **真實測試** - 實際發送 HTTP 請求，不使用 Mock
- ✅ **快速掃描** - 數秒內完成所有 API 測試
- ✅ **自動偵測** - 自動找出 422 錯誤和欄位不匹配
- ✅ **CI/CD 整合** - 可以加入到 GitHub Actions

---

## 在 CI/CD 中使用

### GitHub Actions 範例

```yaml
name: API Integration Tests

on: [push, pull_request]

jobs:
  integration-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'

      - name: Install dependencies
        run: |
          pip install requests

      - name: Start Backend
        run: |
          cd backend
          pip install -r requirements.txt
          python3 -m uvicorn app.main:app --port 8000 &
          sleep 5

      - name: Run Integration Tests
        run: |
          python3 scripts/auto-integration-test.py

      - name: Upload Report
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: integration-test-report
          path: integration-test-report.json
```

---

## 擴展測試

要新增更多 API 測試，編輯 `auto-integration-test.py`：

```python
def test_your_new_api(self, project_id: str) -> TestResult:
    """測試你的新 API"""
    print(f"\n🔍 測試: POST /api/v1/your-endpoint")

    test_data = {
        "field1": "value1",
        "field2": "value2"
    }

    try:
        response = requests.post(
            f"{self.backend_url}/api/v1/your-endpoint",
            json=test_data,
            timeout=10
        )

        result = TestResult(
            api="/api/v1/your-endpoint",
            method="POST",
            status_code=response.status_code,
            success=response.status_code == 200,
            request_data=test_data,
            response_data=response.json() if response.ok else None
        )

        if response.status_code == 422:
            # 記錄欄位不匹配問題
            self.issues.append({
                "api": "/api/v1/your-endpoint",
                "method": "POST",
                "severity": "P1",
                "type": "Field Mismatch",
                "error_detail": response.json().get('detail'),
            })

        return result

    except Exception as e:
        return TestResult(
            api="/api/v1/your-endpoint",
            method="POST",
            status_code=0,
            success=False,
            error_message=str(e)
        )
```

然後在 `run_all_tests()` 中呼叫它。

---

## 常見問題

### Q: 測試顯示「後端服務未運行」
**A:** 請先在另一個 terminal 啟動後端：
```bash
cd backend
python3 -m uvicorn app.main:app --port 8000
```

### Q: 如何只測試特定的 API？
**A:** 編輯 `auto-integration-test.py` 的 `run_all_tests()` 方法，註解掉不需要的測試。

### Q: 測試發現問題後該怎麼做？
**A:**
1. 查看生成的 `integration-test-report.json`
2. 使用 `/log-issue` 建立 issue
3. 根據錯誤詳情修正前端或後端
4. 重新執行測試確認修復

---

## 最佳實踐

1. **每次修改 API 後都執行測試**
   ```bash
   python3 scripts/auto-integration-test.py
   ```

2. **Pull Request 前必須通過測試**
   - 所有 API 測試必須通過
   - 不允許有新的 422 錯誤

3. **定期執行契約檢查**
   ```bash
   python3 scripts/check-api-contract.py
   ```

4. **將測試加入 pre-commit hook**
   ```bash
   # .git/hooks/pre-commit
   #!/bin/bash
   python3 scripts/auto-integration-test.py || exit 1
   ```

---

## 參考資料

- [Issue-018: 專案創建 API 422 錯誤](../issues/✓%20issue-018.md)
- [後端 API 文件](../backend/README.md)
- [前端 API 文件](../frontend/src/services/api/README.md)
