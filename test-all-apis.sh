#!/bin/bash

# API 測試腳本 - 測試所有端點並驗證響應格式

BASE_URL="http://localhost:8000"
echo "🧪 開始測試所有 API 端點..."
echo "Base URL: $BASE_URL"
echo ""

# 測試計數器
TOTAL=0
PASSED=0
FAILED=0

# 測試函數
test_api() {
    local name=$1
    local url=$2
    local expected_format=$3

    TOTAL=$((TOTAL + 1))
    echo "[$TOTAL] 測試: $name"
    echo "    URL: $url"

    response=$(curl -s "$BASE_URL$url")
    echo "    響應: $(echo $response | jq -c '.')"

    # 檢查響應格式
    if echo "$response" | jq -e "$expected_format" > /dev/null 2>&1; then
        echo "    ✅ PASSED"
        PASSED=$((PASSED + 1))
    else
        echo "    ❌ FAILED - 響應格式不符合預期"
        echo "    預期格式: $expected_format"
        FAILED=$((FAILED + 1))
    fi
    echo ""
}

# 1. 測試 Prompt Templates API
echo "=== Prompt Templates API ==="
test_api "列出所有 Prompt 範本" \
    "/api/v1/prompt-templates" \
    ".success and .data.templates | type == \"array\""

# 2. 測試 Projects API
echo "=== Projects API ==="
test_api "列出所有專案" \
    "/api/v1/projects" \
    ".success and .data.projects | type == \"array\""

# 3. 測試單個專案 (需要先獲取專案 ID)
PROJECT_ID=$(curl -s "$BASE_URL/api/v1/projects" | jq -r '.data.projects[0].id // empty')
if [ -n "$PROJECT_ID" ]; then
    test_api "獲取單個專案" \
        "/api/v1/projects/$PROJECT_ID" \
        ".id"
else
    echo "⚠️  沒有專案可測試"
fi

# 總結
echo "================================"
echo "測試總結:"
echo "  總計: $TOTAL"
echo "  通過: $PASSED"
echo "  失敗: $FAILED"
echo "================================"

if [ $FAILED -eq 0 ]; then
    echo "✅ 所有測試通過！"
    exit 0
else
    echo "❌ 有 $FAILED 個測試失敗"
    exit 1
fi
