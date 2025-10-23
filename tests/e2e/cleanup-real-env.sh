#!/bin/bash
# 真實環境測試後清理腳本

set -e

echo "🧹 清理測試環境..."

# 1. 停止 Backend
if [ -f /tmp/ytmaker-test-backend.pid ]; then
    BACKEND_PID=$(cat /tmp/ytmaker-test-backend.pid)
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        kill $BACKEND_PID 2>/dev/null || true
        echo "✅ Backend 已停止 (PID: $BACKEND_PID)"
    else
        echo "ℹ️  Backend 已經停止"
    fi
    rm /tmp/ytmaker-test-backend.pid
else
    # 嘗試找到並停止在 8000 端口的進程
    BACKEND_PID=$(lsof -ti:8000 2>/dev/null || echo "")
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
        echo "✅ Backend 已停止 (PID: $BACKEND_PID)"
    fi
fi

# 2. 停止 Frontend
if [ -f /tmp/ytmaker-test-frontend.pid ]; then
    FRONTEND_PID=$(cat /tmp/ytmaker-test-frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        kill $FRONTEND_PID 2>/dev/null || true
        echo "✅ Frontend 已停止 (PID: $FRONTEND_PID)"
    else
        echo "ℹ️  Frontend 已經停止"
    fi
    rm /tmp/ytmaker-test-frontend.pid
else
    # 嘗試找到並停止在 3000 端口的進程
    FRONTEND_PID=$(lsof -ti:3000 2>/dev/null || echo "")
    if [ -n "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
        echo "✅ Frontend 已停止 (PID: $FRONTEND_PID)"
    fi
fi

# 3. 清理測試資料
echo "🗑️  清理測試資料..."
if [ -f "backend/ytmaker.db" ]; then
    sqlite3 backend/ytmaker.db <<EOF
DELETE FROM projects WHERE name LIKE 'Test Project%';
DELETE FROM youtube_accounts WHERE channel_name LIKE 'Test Channel%';
VACUUM;
EOF
    echo "✅ 測試資料已清理"
else
    echo "⚠️  資料庫檔案不存在，跳過清理"
fi

# 4. 清理生成的測試檔案
echo "🗑️  清理測試檔案..."
if [ -d "backend/data" ]; then
    rm -rf backend/data/projects/test-* 2>/dev/null || true
    rm -rf backend/data/temp/test-* 2>/dev/null || true
    echo "✅ 測試檔案已清理"
fi

# 5. 清理日誌檔案
rm -f /tmp/ytmaker-backend.log 2>/dev/null || true
rm -f /tmp/ytmaker-frontend.log 2>/dev/null || true

# 6. 可選：恢復資料庫備份
read -p "是否恢復資料庫備份? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -f "backend/ytmaker.db.backup" ]; then
        cp backend/ytmaker.db.backup backend/ytmaker.db
        echo "✅ 資料庫已恢復"
    else
        echo "❌ 找不到備份檔案"
    fi
fi

echo ""
echo "✅ 清理完成"
echo ""
echo "💡 提示:"
echo "  - 如需保留測試資料，請勿執行此腳本"
echo "  - 請記得手動刪除 YouTube 上的測試影片"
echo "  - 資料庫備份位於: backend/ytmaker.db.backup"
