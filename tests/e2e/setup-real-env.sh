#!/bin/bash
# 真實環境測試前準備腳本

set -e

echo "🚀 準備真實測試環境..."

# 1. 備份資料庫
echo "📦 備份資料庫..."
if [ -f "backend/ytmaker.db" ]; then
    cp backend/ytmaker.db backend/ytmaker.db.backup
    echo "✅ 資料庫已備份到 ytmaker.db.backup"
else
    echo "⚠️  警告: backend/ytmaker.db 不存在，將在首次運行時創建"
fi

# 2. 清理舊的測試資料（保留配置）
echo "🧹 清理舊的測試資料..."
if [ -f "backend/ytmaker.db" ]; then
    sqlite3 backend/ytmaker.db <<EOF
DELETE FROM projects WHERE name LIKE 'Test Project%';
DELETE FROM youtube_accounts WHERE channel_name LIKE 'Test Channel%';
VACUUM;
EOF
    echo "✅ 測試資料已清理"
else
    echo "⚠️  跳過資料清理（資料庫不存在）"
fi

# 3. 檢查必要的配置檔案
echo "🔍 檢查配置檔案..."

if [ ! -f "backend/.env" ]; then
    echo "❌ 缺少 backend/.env"
    echo "請創建 backend/.env 並設定以下環境變數:"
    echo "  - ENCRYPTION_KEY"
    echo "  - GEMINI_API_KEY"
    echo "  - (可選) STABILITY_API_KEY"
    echo "  - (可選) DID_API_KEY"
    exit 1
fi

if [ ! -f "backend/client_secrets.json" ]; then
    echo "❌ 缺少 backend/client_secrets.json"
    echo "請從 Google Cloud Console 下載 OAuth 2.0 憑證"
    exit 1
fi

echo "✅ 配置檔案檢查完成"

# 4. 檢查外部 API 連線
echo "🌐 檢查外部 API 連線..."

# 檢查 Gemini API
GEMINI_API_KEY=$(grep GEMINI_API_KEY backend/.env | cut -d '=' -f2 | tr -d '"' | tr -d "'")

if [ -n "$GEMINI_API_KEY" ]; then
    if curl -s -H "Content-Type: application/json" \
        -d '{"contents":[{"parts":[{"text":"test"}]}]}' \
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=$GEMINI_API_KEY" \
        > /dev/null 2>&1; then
        echo "✅ Gemini API 連線正常"
    else
        echo "⚠️  Gemini API 連線失敗，請檢查 API Key"
    fi
else
    echo "⚠️  未設定 GEMINI_API_KEY"
fi

# 5. 檢查 Python 虛擬環境
echo "🐍 檢查 Python 環境..."
if [ ! -d "backend/venv" ]; then
    echo "❌ Backend 虛擬環境不存在"
    echo "請執行: cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

# 6. 啟動 Backend
echo "🔧 啟動 Backend..."
cd backend
source venv/bin/activate

# 檢查是否已有 Backend 在運行
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Backend 已在運行 (端口 8000)"
else
    uvicorn app.main:app --reload --port 8000 > /tmp/ytmaker-backend.log 2>&1 &
    BACKEND_PID=$!

    # 等待 Backend 啟動
    echo "⏳ 等待 Backend 啟動..."
    for i in {1..30}; do
        if curl -s http://localhost:8000/api/v1/system/health > /dev/null 2>&1; then
            echo "✅ Backend 已啟動 (PID: $BACKEND_PID)"
            echo $BACKEND_PID > /tmp/ytmaker-test-backend.pid
            break
        fi
        if [ $i -eq 30 ]; then
            echo "❌ Backend 啟動超時"
            cat /tmp/ytmaker-backend.log
            exit 1
        fi
        sleep 1
    done
fi

cd ..

# 7. 檢查 Frontend 依賴
echo "📦 檢查 Frontend 依賴..."
if [ ! -d "frontend/node_modules" ]; then
    echo "❌ Frontend 依賴未安裝"
    echo "請執行: cd frontend && npm install"
    exit 1
fi

# 8. 啟動 Frontend
echo "🎨 啟動 Frontend..."
cd frontend

# 檢查是否已有 Frontend 在運行
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Frontend 已在運行 (端口 3000)"
else
    npm run dev > /tmp/ytmaker-frontend.log 2>&1 &
    FRONTEND_PID=$!

    # 等待 Frontend 啟動
    echo "⏳ 等待 Frontend 啟動..."
    for i in {1..30}; do
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            echo "✅ Frontend 已啟動 (PID: $FRONTEND_PID)"
            echo $FRONTEND_PID > /tmp/ytmaker-test-frontend.pid
            break
        fi
        if [ $i -eq 30 ]; then
            echo "❌ Frontend 啟動超時"
            cat /tmp/ytmaker-frontend.log
            exit 1
        fi
        sleep 1
    done
fi

cd ..

echo ""
echo "✅ 真實測試環境準備完成！"
echo ""
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo ""
echo "執行測試: npm run test:real"
echo "清理環境: ./tests/e2e/cleanup-real-env.sh"
echo ""
echo "⚠️  注意事項:"
echo "  - 測試會消耗真實的 API quota"
echo "  - 影片會實際上傳到 YouTube"
echo "  - 測試完成後請清理測試影片"
