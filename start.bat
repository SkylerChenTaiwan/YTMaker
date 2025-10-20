@echo off
REM YTMaker 一鍵啟動腳本 (Windows)
REM 自動啟動前端、後端和所有背景服務

setlocal enabledelayedexpansion

REM 獲取腳本所在目錄
set "SCRIPT_DIR=%~dp0"
set "BACKEND_DIR=%SCRIPT_DIR%backend"
set "FRONTEND_DIR=%SCRIPT_DIR%frontend"

echo.
echo ============================================================
echo   YTMaker - AI YouTube Video Generator
echo ============================================================
echo.

REM 檢查 Python
echo [INFO] Checking Python...
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python not found. Please install Python 3.9+
    pause
    exit /b 1
)
for /f "tokens=2" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo [SUCCESS] Python %PYTHON_VERSION% installed
echo.

REM 檢查 Node.js
echo [INFO] Checking Node.js...
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js 18+
    pause
    exit /b 1
)
for /f "tokens=1" %%i in ('node --version') do set NODE_VERSION=%%i
echo [SUCCESS] Node.js %NODE_VERSION% installed
echo.

REM 檢查 Redis (Docker)
echo [INFO] Checking Redis...
docker ps | find "ytmaker-redis" >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [INFO] Starting Redis with Docker...
    docker run -d --name ytmaker-redis -p 6379:6379 redis:alpine
    timeout /t 3 >nul
)
echo [SUCCESS] Redis is running
echo.

echo ============================================================
echo   Installing Dependencies
echo ============================================================
echo.

REM 安裝後端依賴
if not exist "%BACKEND_DIR%\venv" (
    echo [INFO] Creating Python virtual environment...
    cd /d "%BACKEND_DIR%"
    python -m venv venv
    echo [SUCCESS] Virtual environment created
)

echo [INFO] Installing backend dependencies...
cd /d "%BACKEND_DIR%"
call venv\Scripts\activate.bat
pip install -q -r requirements.txt
echo [SUCCESS] Backend dependencies installed
echo.

REM 安裝前端依賴
if not exist "%FRONTEND_DIR%\node_modules" (
    echo [INFO] Installing frontend dependencies...
    cd /d "%FRONTEND_DIR%"
    call npm install
    echo [SUCCESS] Frontend dependencies installed
)
echo.

echo ============================================================
echo   Starting Services
echo ============================================================
echo.

REM 啟動後端
echo [INFO] Starting backend...
cd /d "%BACKEND_DIR%"
call venv\Scripts\activate.bat
start /b cmd /c "uvicorn app.main:app --host 0.0.0.0 --port 8000 > ..\backend.log 2>&1"
timeout /t 5 >nul
echo [SUCCESS] Backend started
echo.

REM 啟動前端
echo [INFO] Starting frontend...
cd /d "%FRONTEND_DIR%"
start /b cmd /c "npm run dev > ..\frontend.log 2>&1"
timeout /t 5 >nul
echo [SUCCESS] Frontend started
echo.

echo ============================================================
echo   YTMaker Started Successfully!
echo ============================================================
echo.
echo   Frontend:  http://localhost:3000
echo   Backend:   http://localhost:8000
echo   API Docs:  http://localhost:8000/docs
echo   Status:    http://localhost:8000/status
echo.
echo ============================================================
echo.
echo Press any key to stop all services...
pause >nul

REM 清理
echo.
echo [INFO] Stopping all services...
taskkill /f /im node.exe >nul 2>nul
taskkill /f /im python.exe >nul 2>nul
echo [SUCCESS] All services stopped
pause
