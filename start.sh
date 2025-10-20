#!/bin/bash

# YTMaker 一鍵啟動腳本
# 自動啟動前端、後端和所有背景服務

set -e  # 遇到錯誤立即停止

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 獲取腳本所在目錄
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# 日誌函數
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 清理函數
cleanup() {
    log_info "正在關閉所有服務..."

    # 殺死所有子進程
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
        log_success "前端已關閉"
    fi

    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
        log_success "後端已關閉"
    fi

    log_success "YTMaker 已安全關閉"
    exit 0
}

# 註冊清理函數
trap cleanup SIGINT SIGTERM

# 顯示標題
echo ""
echo "============================================================"
echo "  🚀 YTMaker - AI 驅動的 YouTube 影片生成工具"
echo "============================================================"
echo ""

# 檢查 Python
log_info "檢查 Python 環境..."
if ! command -v python3 &> /dev/null; then
    log_error "找不到 Python3，請先安裝 Python 3.9+"
    exit 1
fi
PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
log_success "Python $PYTHON_VERSION 已安裝"

# 檢查 Node.js
log_info "檢查 Node.js 環境..."
if ! command -v node &> /dev/null; then
    log_error "找不到 Node.js，請先安裝 Node.js 18+"
    exit 1
fi
NODE_VERSION=$(node --version)
log_success "Node.js $NODE_VERSION 已安裝"

# 檢查 Redis
log_info "檢查 Redis..."
if ! command -v redis-server &> /dev/null; then
    log_warning "找不到 Redis，但後端會自動嘗試啟動"
else
    REDIS_VERSION=$(redis-server --version | cut -d'=' -f2 | cut -d' ' -f1)
    log_success "Redis $REDIS_VERSION 已安裝"
fi

echo ""
echo "============================================================"
echo "  📦 安裝依賴"
echo "============================================================"
echo ""

# 安裝後端依賴
if [ ! -d "$BACKEND_DIR/venv" ]; then
    log_info "首次運行，正在建立 Python 虛擬環境..."
    cd "$BACKEND_DIR"
    python3 -m venv venv
    log_success "虛擬環境已建立"
fi

log_info "安裝後端依賴..."
cd "$BACKEND_DIR"
source venv/bin/activate
pip install -q -r requirements.txt
log_success "後端依賴已安裝"

# 安裝前端依賴
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    log_info "安裝前端依賴..."
    cd "$FRONTEND_DIR"
    npm install
    log_success "前端依賴已安裝"
fi

echo ""
echo "============================================================"
echo "  🚀 啟動服務"
echo "============================================================"
echo ""

# 啟動後端
log_info "啟動後端服務 (包含 Redis 和 Celery)..."
cd "$BACKEND_DIR"
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 > "$SCRIPT_DIR/backend.log" 2>&1 &
BACKEND_PID=$!

# 等待後端啟動
log_info "等待後端就緒..."
for i in {1..30}; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        log_success "後端已啟動 (PID: $BACKEND_PID)"
        break
    fi
    if [ $i -eq 30 ]; then
        log_error "後端啟動超時"
        log_info "查看日誌: tail -f backend.log"
        cleanup
        exit 1
    fi
    sleep 1
done

# 啟動前端
log_info "啟動前端服務..."
cd "$FRONTEND_DIR"
npm run dev > "$SCRIPT_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!

# 等待前端啟動
log_info "等待前端就緒..."
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        log_success "前端已啟動 (PID: $FRONTEND_PID)"
        break
    fi
    if [ $i -eq 30 ]; then
        log_error "前端啟動超時"
        log_info "查看日誌: tail -f frontend.log"
        cleanup
        exit 1
    fi
    sleep 1
done

echo ""
echo "============================================================"
echo "  ✅ YTMaker 已成功啟動！"
echo "============================================================"
echo ""
echo "  📱 前端介面:  http://localhost:3000"
echo "  🔧 後端 API:  http://localhost:8000"
echo "  📚 API 文件:  http://localhost:8000/docs"
echo "  📊 服務狀態:  http://localhost:8000/status"
echo ""
echo "============================================================"
echo ""
log_info "按 Ctrl+C 關閉所有服務"
echo ""

# 顯示日誌
log_info "實時日誌 (按 Ctrl+C 停止):"
echo ""
tail -f "$SCRIPT_DIR/backend.log" "$SCRIPT_DIR/frontend.log" &
TAIL_PID=$!

# 等待
wait
