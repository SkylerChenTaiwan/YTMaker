#!/bin/bash
# 生成真實測試報告

set -e

REPORT_DIR="test-results"
REPORT_FILE="$REPORT_DIR/test-report-real-$(date +%Y%m%d-%H%M%S).md"

echo "📊 生成真實環境測試報告..."

# 確保報告目錄存在
mkdir -p "$REPORT_DIR"

# 開始生成報告
cat > "$REPORT_FILE" <<EOF
# YTMaker 真實環境測試報告

**測試日期:** $(date '+%Y-%m-%d %H:%M:%S')
**測試環境:** 本地開發環境
**測試類型:** E2E 真實環境測試（零 Mock）

---

## 📋 測試執行摘要

EOF

# 檢查是否有 Playwright 測試結果
if [ -f "$REPORT_DIR/results.json" ]; then
    echo "✅ 找到 Playwright 測試結果"

    # 解析測試結果（簡單版本）
    TOTAL_TESTS=$(grep -o '"tests"' "$REPORT_DIR/results.json" | wc -l)
    echo "- **總測試數:** $TOTAL_TESTS" >> "$REPORT_FILE"

    # 如果有 jq，可以做更詳細的解析
    if command -v jq &> /dev/null; then
        PASSED=$(jq '[.suites[].specs[] | select(.ok == true)] | length' "$REPORT_DIR/results.json" 2>/dev/null || echo "N/A")
        FAILED=$(jq '[.suites[].specs[] | select(.ok == false)] | length' "$REPORT_DIR/results.json" 2>/dev/null || echo "N/A")

        cat >> "$REPORT_FILE" <<EOF
- **通過測試:** $PASSED
- **失敗測試:** $FAILED
EOF
    fi
else
    cat >> "$REPORT_FILE" <<EOF
- **總測試數:** 未找到測試結果
- **通過測試:** N/A
- **失敗測試:** N/A

⚠️  注意：未找到 Playwright 測試結果檔案
EOF
fi

cat >> "$REPORT_FILE" <<EOF

---

## 🧪 測試套件狀態

### ✅ Flow-0: 首次設定流程
EOF

if grep -q "Flow-0.*通過" "$REPORT_DIR"/*.log 2>/dev/null; then
    echo "- 狀態：**通過** ✅" >> "$REPORT_FILE"
else
    echo "- 狀態：未執行或失敗 ⚠️" >> "$REPORT_FILE"
fi

cat >> "$REPORT_FILE" <<EOF
- 測試檔案：\`tests/e2e/real/flow-0-setup.spec.ts\`
- 測試項目：
  - 完整首次設定流程
  - API Key 無效處理
  - 跳過 YouTube 授權

### 🎬 Flow-1: 影片生成流程
EOF

if grep -q "Flow-1.*通過" "$REPORT_DIR"/*.log 2>/dev/null; then
    echo "- 狀態：**通過** ✅" >> "$REPORT_FILE"
else
    echo "- 狀態：未執行或失敗 ⚠️" >> "$REPORT_FILE"
fi

cat >> "$REPORT_FILE" <<EOF
- 測試檔案：\`tests/e2e/real/flow-1-video-generation.spec.ts\`
- 測試項目：
  - 完整影片生成流程
  - 真實 Gemini API 調用
  - 真實 FFmpeg 渲染
  - 真實 YouTube 上傳

### 💾 資料持久化測試
EOF

if grep -q "持久化.*通過" "$REPORT_DIR"/*.log 2>/dev/null; then
    echo "- 狀態：**通過** ✅" >> "$REPORT_FILE"
else
    echo "- 狀態：未執行或失敗 ⚠️" >> "$REPORT_FILE"
fi

cat >> "$REPORT_FILE" <<EOF
- 測試檔案：\`tests/e2e/real/data-persistence.spec.ts\`
- 測試項目：
  - 重啟後資料保持
  - Cookie 過期處理
  - 資料庫持久化

### ❌ 錯誤處理測試
EOF

if grep -q "錯誤處理.*通過" "$REPORT_DIR"/*.log 2>/dev/null; then
    echo "- 狀態：**通過** ✅" >> "$REPORT_FILE"
else
    echo "- 狀態：未執行或失敗 ⚠️" >> "$REPORT_FILE"
fi

cat >> "$REPORT_FILE" <<EOF
- 測試檔案：\`tests/e2e/real/error-handling.spec.ts\`
- 測試項目：
  - 文字長度驗證
  - 專案名稱重複
  - API Key 無效
  - 網路錯誤

### 📺 多頻道管理測試
EOF

if grep -q "多頻道.*通過" "$REPORT_DIR"/*.log 2>/dev/null; then
    echo "- 狀態：**通過** ✅" >> "$REPORT_FILE"
else
    echo "- 狀態：未執行或失敗 ⚠️" >> "$REPORT_FILE"
fi

cat >> "$REPORT_FILE" <<EOF
- 測試檔案：\`tests/e2e/real/multi-channel.spec.ts\`
- 測試項目：
  - 查看已連結頻道
  - 連結第二個頻道
  - 移除頻道
  - 重複頻道檢測

---

## 🎬 真實生成的影片

EOF

# 查詢資料庫中的測試專案
if [ -f "backend/ytmaker.db" ]; then
    echo "查詢測試專案..."

    sqlite3 backend/ytmaker.db "SELECT name, youtube_video_id, created_at FROM projects WHERE name LIKE 'Test Project%' ORDER BY created_at DESC LIMIT 5" 2>/dev/null | while read -r line; do
        if [ -n "$line" ]; then
            # 解析結果（格式：name|video_id|date）
            PROJECT_NAME=$(echo "$line" | cut -d '|' -f 1)
            VIDEO_ID=$(echo "$line" | cut -d '|' -f 2)
            CREATED_AT=$(echo "$line" | cut -d '|' -f 3)

            cat >> "$REPORT_FILE" <<EOF
### $PROJECT_NAME
- **YouTube ID:** \`$VIDEO_ID\`
- **建立時間:** $CREATED_AT
- **影片連結:** [https://youtube.com/watch?v=$VIDEO_ID](https://youtube.com/watch?v=$VIDEO_ID)

EOF
        fi
    done

    # 檢查是否有結果
    TEST_PROJECT_COUNT=$(sqlite3 backend/ytmaker.db "SELECT COUNT(*) FROM projects WHERE name LIKE 'Test Project%'" 2>/dev/null || echo "0")

    if [ "$TEST_PROJECT_COUNT" -eq 0 ]; then
        echo "⚠️  沒有找到測試專案" >> "$REPORT_FILE"
    fi
else
    echo "❌ 找不到資料庫檔案" >> "$REPORT_FILE"
fi

cat >> "$REPORT_FILE" <<EOF

---

## 📊 外部 API 調用記錄

EOF

# 檢查 API 日誌（如果存在）
if [ -f "backend/logs/api.log" ]; then
    GEMINI_CALLS=$(grep -c "Gemini API" backend/logs/api.log 2>/dev/null || echo "0")
    YOUTUBE_CALLS=$(grep -c "YouTube API" backend/logs/api.log 2>/dev/null || echo "0")

    cat >> "$REPORT_FILE" <<EOF
- **Gemini API 調用次數:** $GEMINI_CALLS
- **YouTube API 調用次數:** $YOUTUBE_CALLS

EOF
else
    cat >> "$REPORT_FILE" <<EOF
⚠️  找不到 API 日誌檔案

EOF
fi

cat >> "$REPORT_FILE" <<EOF

---

## 💡 測試環境資訊

### Backend
- **URL:** http://localhost:8000
- **資料庫:** backend/ytmaker.db
- **Python 版本:** $(python3 --version 2>/dev/null || echo "未檢測到")

### Frontend
- **URL:** http://localhost:3000
- **Node 版本:** $(node --version 2>/dev/null || echo "未檢測到")

### 測試工具
- **Playwright:** $(npx playwright --version 2>/dev/null || echo "未安裝")

---

## ⚠️  已知問題與限制

EOF

# 檢查測試日誌中的警告
if [ -d "$REPORT_DIR" ]; then
    WARNINGS=$(grep -h "⚠️" "$REPORT_DIR"/*.log 2>/dev/null | sort -u || echo "")
    if [ -n "$WARNINGS" ]; then
        echo "$WARNINGS" | while read -r warning; do
            echo "- $warning" >> "$REPORT_FILE"
        done
    else
        echo "無明顯警告" >> "$REPORT_FILE"
    fi
else
    echo "無測試日誌可供分析" >> "$REPORT_FILE"
fi

cat >> "$REPORT_FILE" <<EOF

---

## 📝 建議與後續步驟

1. **清理測試資料**
   - 執行 \`./tests/e2e/cleanup-real-env.sh\` 清理測試環境
   - 手動刪除 YouTube 上的測試影片

2. **檢查失敗測試**
   - 查看 \`$REPORT_DIR/html/index.html\` 瀏覽詳細測試報告
   - 檢查截圖和影片記錄

3. **API 配額管理**
   - 檢查 Gemini API 配額使用情況
   - 檢查 YouTube API 配額使用情況

4. **持續改進**
   - 根據測試結果改善錯誤處理
   - 優化測試速度
   - 增加測試覆蓋率

---

**報告生成時間:** $(date '+%Y-%m-%d %H:%M:%S')
**報告位置:** \`$REPORT_FILE\`

EOF

echo "✅ 報告已生成: $REPORT_FILE"
echo ""
echo "📖 查看報告: cat $REPORT_FILE"
echo "📊 查看 HTML 報告: open $REPORT_DIR/html/index.html"
