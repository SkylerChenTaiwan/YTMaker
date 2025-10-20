# Task-030: Electron 打包與部署

> **建立日期:** 2025-10-19
> **狀態:** ⏳ 未開始
> **預計時間:** 12 小時
> **優先級:** P0 (必須)

---

## 關聯文件

### 技術規格
- **技術框架:** `tech-specs/framework.md#1.4-開發工具與測試框架`
- **技術框架:** `tech-specs/framework.md#5.3-版本管理策略`
- **前端架構:** `tech-specs/frontend/overview.md#桌面打包`

### 產品設計
- **產品概述:** `product-design/overview.md#部署方式`

### 相關任務
- **前置任務:** Task-029 ✅ (E2E 測試)
- **後續任務:** 無（Phase 1 最終任務）

---

## 任務目標

### 簡述
使用 Electron 將應用打包為跨平台桌面應用（macOS、Windows、Linux），整合前後端服務自動啟動，配置自動更新機制，並生成安裝程式。

### 詳細目標
1. 配置 Electron 主程序，整合 Next.js 前端與 FastAPI 後端
2. 實現後端服務（FastAPI、Redis）自動啟動與生命週期管理
3. 配置 electron-builder 進行跨平台打包（macOS .dmg、Windows .exe、Linux .AppImage/.deb）
4. 整合 electron-updater 實現自動更新機制
5. 設計應用圖示、啟動畫面等品牌資源
6. 在 3 個平台上測試打包與安裝

### 成功標準
- [ ] Electron 主程序實現完成（main.js, preload.js）
- [ ] 後端服務自動啟動功能完成（FastAPI、Redis）
- [ ] electron-builder 配置完成
- [ ] 3 個平台打包成功（macOS .dmg, Windows .exe, Linux .AppImage/.deb）
- [ ] 自動更新機制整合完成（electron-updater）
- [ ] 應用圖示與品牌資源完成
- [ ] 跨平台打包測試通過（至少在 macOS 上測試）
- [ ] 安裝程式可正常安裝與卸載

---

## 測試要求

### 功能測試

#### 測試 1：Electron 主程序啟動測試

**目的：** 驗證 Electron 主程序可正常啟動並載入前端頁面

**測試步驟：**
1. 在開發模式下啟動 Electron 應用：`npm run electron:dev`
2. 驗證主視窗正常打開（1280x800）
3. 驗證載入 Next.js 開發伺服器（http://localhost:3000）
4. 驗證 DevTools 可正常開啟

**預期結果：**
```
✓ 主視窗成功開啟
✓ 前端頁面正常載入（顯示主控台）
✓ DevTools 可開啟（開發模式）
✓ 控制台無錯誤訊息
```

**驗證點：**
- [ ] 視窗尺寸為 1280x800
- [ ] 視窗標題為 "YTMaker"
- [ ] 前端路由正常（可導航到 /dashboard, /setup 等）
- [ ] 無白屏或載入錯誤

---

#### 測試 2：後端服務自動啟動測試

**目的：** 驗證 Electron 啟動時自動啟動 FastAPI 和 Redis 服務

**前置條件：**
- 已安裝 Python 3.9+ 和所有 backend dependencies
- 已安裝 Redis（或使用 bundled Redis）

**測試步驟：**
1. 啟動 Electron 應用
2. 檢查後端服務是否啟動：`curl http://localhost:8000/health`
3. 檢查 Redis 是否啟動：`redis-cli ping`
4. 在前端調用一個 API 端點（如 GET /api/v1/projects）
5. 關閉 Electron 應用
6. 驗證後端服務與 Redis 是否自動關閉

**預期結果：**
```json
// GET http://localhost:8000/health
{
  "status": "healthy",
  "backend": "running",
  "redis": "connected",
  "database": "connected"
}
```

**驗證點：**
- [ ] FastAPI 在 8000 port 啟動
- [ ] Redis 在 6379 port 啟動
- [ ] API 調用成功（200 OK）
- [ ] 關閉 Electron 後服務自動終止（無殘留程序）

---

#### 測試 3：生產模式打包測試（macOS）

**目的：** 驗證在 macOS 上可成功打包為 .dmg 安裝檔

**測試步驟：**
1. 建置前端生產版本：`cd frontend && npm run build`
2. 執行 Electron 打包：`npm run electron:build:mac`
3. 驗證 `release/` 目錄生成 .dmg 檔案
4. 掛載 .dmg 並執行安裝
5. 啟動已安裝的 YTMaker.app
6. 驗證應用功能正常（可建立專案、生成影片）

**預期輸出：**
```
release/
├── YTMaker-1.0.0.dmg         # macOS 安裝檔
├── YTMaker-1.0.0-mac.zip      # macOS 壓縮包
└── mac/
    └── YTMaker.app/           # 應用程式 bundle
```

**驗證點：**
- [ ] .dmg 檔案成功生成（檔案大小 > 100 MB）
- [ ] .dmg 可正常掛載
- [ ] 應用程式可拖曳到「應用程式」資料夾
- [ ] 啟動應用後前後端服務自動運行
- [ ] 可完成完整的影片生成流程
- [ ] 應用圖示正確顯示

---

#### 測試 4：生產模式打包測試（Windows）

**目的：** 驗證在 Windows 上可成功打包為 .exe 安裝檔

**注意：** 如果開發環境為 macOS，此測試可選（需要 Windows 實體機或 VM）

**測試步驟：**
1. 在 Windows 環境或使用 CI/CD 執行：`npm run electron:build:win`
2. 驗證 `release/` 目錄生成 .exe 檔案
3. 執行安裝程式
4. 啟動已安裝的 YTMaker
5. 驗證應用功能正常

**預期輸出：**
```
release/
├── YTMaker Setup 1.0.0.exe   # NSIS 安裝檔
├── YTMaker 1.0.0.exe          # Portable 版本
└── win-unpacked/              # 未打包的應用
```

**驗證點：**
- [ ] .exe 安裝檔成功生成
- [ ] 安裝程式可正常執行
- [ ] 應用程式安裝到 Program Files
- [ ] 桌面與開始選單有捷徑
- [ ] 應用功能正常運作
- [ ] 卸載程式可正常移除應用

---

#### 測試 5：生產模式打包測試（Linux）

**目的：** 驗證在 Linux 上可成功打包為 .AppImage 和 .deb

**測試步驟：**
1. 在 Linux 環境或使用 CI/CD 執行：`npm run electron:build:linux`
2. 驗證 `release/` 目錄生成 .AppImage 和 .deb 檔案
3. 測試 AppImage：`chmod +x YTMaker-1.0.0.AppImage && ./YTMaker-1.0.0.AppImage`
4. 測試 deb 安裝：`sudo dpkg -i YTMaker_1.0.0_amd64.deb`
5. 驗證應用功能正常

**預期輸出：**
```
release/
├── YTMaker-1.0.0.AppImage     # AppImage 格式
├── ytmaker_1.0.0_amd64.deb    # Debian 套件
└── linux-unpacked/            # 未打包的應用
```

**驗證點：**
- [ ] .AppImage 和 .deb 成功生成
- [ ] AppImage 可直接執行（無需安裝）
- [ ] deb 可使用 dpkg 安裝
- [ ] 已安裝的應用可在應用程式選單找到
- [ ] 應用功能正常運作

---

#### 測試 6：自動更新機制測試

**目的：** 驗證 electron-updater 自動更新功能

**前置條件：**
- 已設定更新伺服器（GitHub Releases 或自架伺服器）
- 已發布兩個版本（如 v1.0.0 和 v1.0.1）

**測試步驟：**
1. 安裝舊版本（v1.0.0）
2. 啟動應用
3. 發布新版本到更新伺服器（v1.0.1）
4. 應用自動檢查更新（或手動觸發）
5. 驗證更新通知彈出
6. 確認下載並安裝更新
7. 重啟應用，驗證版本已更新

**預期流程：**
```
1. 應用啟動時檢查更新
2. 發現新版本 v1.0.1
3. 彈出通知：「發現新版本 v1.0.1，是否下載？」
4. 使用者確認 → 下載更新（顯示進度）
5. 下載完成 → 提示重啟
6. 重啟後版本更新為 v1.0.1
```

**驗證點：**
- [ ] 自動檢查更新功能正常
- [ ] 更新通知正確顯示
- [ ] 下載進度正確顯示
- [ ] 更新安裝成功
- [ ] 重啟後版本正確

---

### 整合測試

#### 測試 7：完整安裝與使用流程（E2E）

**目的：** 驗證從安裝到使用的完整流程

**測試步驟：**
1. 在乾淨的系統上安裝 YTMaker（從 .dmg / .exe / .AppImage）
2. 首次啟動應用（應跳轉到 /setup 頁面）
3. 完成首次設定精靈（設定 API Keys、YouTube 授權）
4. 建立新專案並生成影片（完整的 Flow-1）
5. 驗證生成的影片可正常播放
6. 上傳到 YouTube 並驗證成功
7. 關閉應用並重新開啟（驗證狀態持久化）
8. 卸載應用

**預期結果：**
- 所有步驟無錯誤
- 影片成功生成並上傳
- 應用可正常關閉與重啟
- 卸載後無殘留檔案（除使用者資料）

**驗證點：**
- [ ] 安裝流程順暢（< 5 分鐘）
- [ ] 首次設定精靈正常運作
- [ ] 影片生成功能完全正常
- [ ] YouTube 上傳成功
- [ ] 應用狀態正確持久化（重啟後保留設定）
- [ ] 卸載乾淨（可選保留使用者資料）

---

### 效能測試

#### 測試 8：應用啟動時間測試

**目的：** 驗證應用啟動時間符合效能標準

**測試步驟：**
1. 完全關閉應用
2. 記錄啟動時間（從點擊圖示到主控台完全載入）
3. 重複測試 5 次，取平均值

**效能標準：**
- **啟動時間：** < 5 秒（冷啟動）
- **主視窗顯示：** < 2 秒

**驗證點：**
- [ ] 冷啟動時間 < 5 秒
- [ ] 主視窗顯示時間 < 2 秒
- [ ] 無明顯卡頓或白屏

---

#### 測試 9：記憶體使用測試

**目的：** 驗證應用記憶體使用在合理範圍內

**測試步驟：**
1. 啟動應用（閒置狀態）
2. 記錄記憶體使用（活動監視器 / 工作管理員）
3. 執行影片生成任務
4. 記錄生成過程中的峰值記憶體
5. 生成完成後記錄記憶體（驗證無洩漏）

**效能標準：**
- **閒置記憶體：** < 300 MB
- **生成峰值記憶體：** < 800 MB

**驗證點：**
- [ ] 閒置記憶體 < 300 MB
- [ ] 生成峰值記憶體 < 800 MB
- [ ] 無明顯記憶體洩漏（生成完成後記憶體恢復）

---

## 實作規格

### 需要建立/修改的檔案

#### 1. Electron 主程序：`electron/main.js`

**職責：** Electron 應用主程序，管理視窗、生命週期、後端服務

**主要功能：**
- 建立主視窗
- 啟動與管理後端服務（FastAPI、Redis）
- 處理應用生命週期事件
- 實現 IPC 通訊
- 整合 electron-updater

**程式碼骨架：**

```javascript
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// 後端服務程序
let backendProcess = null;
let redisProcess = null;
let mainWindow = null;

// 日誌配置
log.transports.file.level = 'info';
autoUpdater.logger = log;

/**
 * 啟動後端服務（FastAPI）
 */
function startBackendService() {
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    // 開發模式：假設已手動啟動 uvicorn
    log.info('Development mode: Backend should be started manually');
    return;
  }

  // 生產模式：啟動打包的 Python 應用
  const backendPath = path.join(
    process.resourcesPath,
    'backend',
    process.platform === 'win32' ? 'api.exe' : 'api'
  );

  backendProcess = spawn(backendPath, ['--port', '8000'], {
    detached: false,
    stdio: 'pipe'
  });

  backendProcess.stdout.on('data', (data) => {
    log.info(`[Backend] ${data}`);
  });

  backendProcess.stderr.on('data', (data) => {
    log.error(`[Backend Error] ${data}`);
  });

  backendProcess.on('close', (code) => {
    log.info(`Backend process exited with code ${code}`);
  });

  log.info('Backend service started');
}

/**
 * 啟動 Redis 服務
 */
function startRedisService() {
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    // 開發模式：假設已使用 Docker 啟動 Redis
    log.info('Development mode: Redis should be started via Docker');
    return;
  }

  // 生產模式：啟動 bundled Redis
  const redisPath = path.join(
    process.resourcesPath,
    'redis',
    process.platform === 'win32' ? 'redis-server.exe' : 'redis-server'
  );

  const redisConfig = path.join(
    process.resourcesPath,
    'redis',
    'redis.conf'
  );

  redisProcess = spawn(redisPath, [redisConfig], {
    detached: false,
    stdio: 'pipe'
  });

  redisProcess.stdout.on('data', (data) => {
    log.info(`[Redis] ${data}`);
  });

  redisProcess.stderr.on('data', (data) => {
    log.error(`[Redis Error] ${data}`);
  });

  redisProcess.on('close', (code) => {
    log.info(`Redis process exited with code ${code}`);
  });

  log.info('Redis service started');
}

/**
 * 停止後端服務
 */
function stopBackendServices() {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
    log.info('Backend service stopped');
  }

  if (redisProcess) {
    redisProcess.kill();
    redisProcess = null;
    log.info('Redis service stopped');
  }
}

/**
 * 建立主視窗
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    title: 'YTMaker',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    },
    show: false // 等載入完成再顯示（避免白屏）
  });

  // 載入前端
  const isDev = process.env.NODE_ENV === 'development';
  const url = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../frontend/out/index.html')}`;

  mainWindow.loadURL(url);

  // 視窗準備好後顯示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 開發模式開啟 DevTools
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // 視窗關閉事件
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * 檢查更新
 */
function checkForUpdates() {
  autoUpdater.checkForUpdatesAndNotify();
}

/**
 * 應用程式準備完成
 */
app.whenReady().then(() => {
  log.info('App is ready');

  // 啟動服務
  startRedisService();
  startBackendService();

  // 等待後端啟動（簡單延遲，實際應檢查健康端點）
  setTimeout(() => {
    createWindow();
  }, 2000);

  // 檢查更新（生產模式）
  if (process.env.NODE_ENV === 'production') {
    setTimeout(() => {
      checkForUpdates();
    }, 5000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

/**
 * 所有視窗關閉
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    stopBackendServices();
    app.quit();
  }
});

/**
 * 應用程式退出前
 */
app.on('before-quit', () => {
  log.info('App is quitting');
  stopBackendServices();
});

/**
 * 自動更新事件
 */
autoUpdater.on('update-available', (info) => {
  log.info('Update available:', info);
  // 發送訊息給前端
  if (mainWindow) {
    mainWindow.webContents.send('update-available', info);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded:', info);
  // 發送訊息給前端
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded', info);
  }
});

autoUpdater.on('error', (err) => {
  log.error('Update error:', err);
});

/**
 * IPC 處理（前端請求安裝更新）
 */
ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall(false, true);
});
```

---

#### 2. Preload 腳本：`electron/preload.js`

**職責：** 提供安全的 IPC 橋接，讓前端可調用 Electron API

**程式碼骨架：**

```javascript
const { contextBridge, ipcRenderer } = require('electron');

/**
 * 暴露安全的 API 給前端
 */
contextBridge.exposeInMainWorld('electron', {
  // 應用資訊
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // 更新相關
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (event, info) => callback(info));
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', (event, info) => callback(info));
  },
  installUpdate: () => {
    ipcRenderer.send('install-update');
  },

  // 檔案系統（如需要）
  selectFolder: () => ipcRenderer.invoke('select-folder'),

  // 日誌
  log: (level, message) => {
    ipcRenderer.send('log', { level, message });
  }
});
```

---

#### 3. Electron Builder 配置：`electron-builder.yml`

**職責：** 配置跨平台打包規則

```yaml
appId: com.ytmaker.app
productName: YTMaker
copyright: Copyright © 2025 YTMaker
buildVersion: ${env.BUILD_VERSION}

directories:
  output: release
  buildResources: build

files:
  - electron/**/*
  - frontend/out/**/*
  - package.json
  - "!node_modules"

extraResources:
  - from: backend/dist/
    to: backend
  - from: redis/
    to: redis

# macOS 配置
mac:
  category: public.app-category.productivity
  icon: build/icon.icns
  target:
    - target: dmg
      arch:
        - x64
        - arm64
    - target: zip
      arch:
        - x64
        - arm64
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist

dmg:
  title: YTMaker ${version}
  icon: build/icon.icns
  background: build/dmg-background.png
  window:
    width: 540
    height: 380
  contents:
    - x: 140
      y: 180
      type: file
    - x: 400
      y: 180
      type: link
      path: /Applications

# Windows 配置
win:
  icon: build/icon.ico
  target:
    - target: nsis
      arch:
        - x64
    - target: portable
      arch:
        - x64

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: always
  createStartMenuShortcut: true
  shortcutName: YTMaker
  uninstallDisplayName: YTMaker

# Linux 配置
linux:
  icon: build/icon.png
  target:
    - AppImage
    - deb
  category: Utility
  synopsis: YouTube 影片自動化生產工具
  description: |
    YTMaker 是一個本地端桌面應用，能夠從文字內容自動生成 YouTube 影片。
    整合 AI 腳本生成、圖片生成、語音合成、影片渲染等功能。

appImage:
  license: MIT

deb:
  depends:
    - ffmpeg
    - python3

# 自動更新配置
publish:
  provider: github
  owner: your-username
  repo: ytmaker
  releaseType: release
```

---

#### 4. Package.json 腳本：`package.json`（根目錄）

**職責：** 定義 Electron 打包與開發腳本

```json
{
  "name": "ytmaker",
  "version": "1.0.0",
  "description": "YouTube 影片自動化生產工具",
  "main": "electron/main.js",
  "scripts": {
    "electron:dev": "NODE_ENV=development electron .",
    "electron:build": "electron-builder",
    "electron:build:mac": "electron-builder --mac",
    "electron:build:win": "electron-builder --win",
    "electron:build:linux": "electron-builder --linux",
    "electron:build:all": "electron-builder -mwl",
    "package": "npm run package:frontend && npm run package:backend",
    "package:frontend": "cd frontend && npm run build",
    "package:backend": "cd backend && pyinstaller api.spec",
    "release": "npm run package && npm run electron:build:all"
  },
  "dependencies": {
    "electron-log": "^5.0.0",
    "electron-updater": "^6.1.0"
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.9.0"
  },
  "build": {
    "extends": "./electron-builder.yml"
  }
}
```

---

#### 5. PyInstaller 配置：`backend/api.spec`

**職責：** 將 FastAPI 後端打包為可執行檔

```python
# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['app/main.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('app', 'app'),
        ('.env.example', '.'),
    ],
    hiddenimports=[
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'sqlalchemy.ext.baked',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='api',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
```

---

#### 6. 應用圖示資源

**需要準備的檔案：**

```
build/
├── icon.icns           # macOS 圖示（1024x1024）
├── icon.ico            # Windows 圖示（256x256）
├── icon.png            # Linux 圖示（512x512）
├── dmg-background.png  # macOS DMG 背景圖
└── entitlements.mac.plist  # macOS 權限設定
```

**macOS 權限設定範例（`build/entitlements.mac.plist`）：**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
  <key>com.apple.security.network.client</key>
  <true/>
  <key>com.apple.security.network.server</key>
  <true/>
</dict>
</plist>
```

---

#### 7. 前端更新通知元件：`frontend/src/components/UpdateNotification.tsx`

**職責：** 顯示自動更新通知

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Modal, Button, Progress } from 'antd';

interface UpdateInfo {
  version: string;
  releaseNotes?: string;
}

export default function UpdateNotification() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    // 檢查是否在 Electron 環境
    if (typeof window !== 'undefined' && window.electron) {
      // 監聽更新事件
      window.electron.onUpdateAvailable((info: UpdateInfo) => {
        setUpdateInfo(info);
        setUpdateAvailable(true);
      });

      window.electron.onUpdateDownloaded((info: UpdateInfo) => {
        setUpdateInfo(info);
        setUpdateDownloaded(true);
      });
    }
  }, []);

  const handleInstallUpdate = () => {
    if (window.electron) {
      window.electron.installUpdate();
    }
  };

  return (
    <>
      {/* 發現更新 Modal */}
      <Modal
        title="發現新版本"
        open={updateAvailable && !updateDownloaded}
        onOk={() => setUpdateAvailable(false)}
        onCancel={() => setUpdateAvailable(false)}
        footer={[
          <Button key="later" onClick={() => setUpdateAvailable(false)}>
            稍後提醒
          </Button>,
          <Button key="download" type="primary" onClick={() => setUpdateAvailable(false)}>
            下載更新
          </Button>
        ]}
      >
        <p>發現新版本 {updateInfo?.version}，是否下載？</p>
        {updateInfo?.releaseNotes && (
          <div>
            <h4>更新內容：</h4>
            <p>{updateInfo.releaseNotes}</p>
          </div>
        )}
      </Modal>

      {/* 更新已下載 Modal */}
      <Modal
        title="更新已就緒"
        open={updateDownloaded}
        onOk={handleInstallUpdate}
        onCancel={() => setUpdateDownloaded(false)}
        footer={[
          <Button key="later" onClick={() => setUpdateDownloaded(false)}>
            稍後安裝
          </Button>,
          <Button key="install" type="primary" onClick={handleInstallUpdate}>
            立即安裝並重啟
          </Button>
        ]}
      >
        <p>新版本 {updateInfo?.version} 已下載完成，是否立即安裝？</p>
        <p className="text-gray-500 text-sm">安裝過程中應用程式將重新啟動</p>
      </Modal>
    </>
  );
}
```

**TypeScript 類型定義（`frontend/src/types/electron.d.ts`）：**

```typescript
export {};

declare global {
  interface Window {
    electron?: {
      getAppVersion: () => Promise<string>;
      onUpdateAvailable: (callback: (info: any) => void) => void;
      onUpdateDownloaded: (callback: (info: any) => void) => void;
      installUpdate: () => void;
      selectFolder: () => Promise<string | null>;
      log: (level: string, message: string) => void;
    };
  }
}
```

---

### 打包流程

#### 完整打包步驟

```bash
# Step 1: 清理舊的建置
rm -rf release/ frontend/out/ backend/dist/

# Step 2: 建置前端（Next.js SSG）
cd frontend
npm run build  # 生成 out/ 靜態檔案
cd ..

# Step 3: 打包後端（PyInstaller）
cd backend
pyinstaller api.spec  # 生成 dist/api（可執行檔）
cd ..

# Step 4: （可選）打包 Redis
# 下載預編譯的 Redis binary 並放到 redis/ 目錄

# Step 5: 執行 Electron Builder
# macOS:
npm run electron:build:mac

# Windows:
npm run electron:build:win

# Linux:
npm run electron:build:linux

# 全平台（需要在 CI/CD 或多平台環境）:
npm run electron:build:all
```

---

## 開發指引

### Step-by-Step 開發流程

#### 階段 1：環境準備（30 分鐘）

**Step 1: 安裝依賴**

```bash
# 根目錄安裝 Electron 相關依賴
npm install --save electron electron-builder electron-log electron-updater

# 檢查 Python 與 PyInstaller
cd backend
pip install pyinstaller
cd ..
```

**Step 2: 建立目錄結構**

```bash
mkdir -p electron
mkdir -p build
mkdir -p redis
```

**Step 3: 準備應用圖示**

- 設計或找到 1024x1024 的應用圖示
- 使用工具轉換為 .icns（macOS）、.ico（Windows）、.png（Linux）
- 放到 `build/` 目錄

---

#### 階段 2：實作 Electron 主程序（2 小時）

**Step 1: 撰寫 `electron/main.js`**

1. 實作基本的視窗建立邏輯
2. 設定開發/生產模式切換
3. 測試視窗是否正常開啟：`npm run electron:dev`

**Step 2: 實作後端服務啟動邏輯**

1. 撰寫 `startBackendService()` 函數
2. 撰寫 `startRedisService()` 函數
3. 撰寫 `stopBackendServices()` 函數
4. 測試服務是否正確啟動與終止

**Step 3: 撰寫 `electron/preload.js`**

1. 實作 IPC 橋接
2. 暴露安全的 API 給前端
3. 測試前端可調用 `window.electron` API

**測試檢查點：**
- [ ] `npm run electron:dev` 可正常啟動
- [ ] 主視窗正常顯示 Next.js 頁面
- [ ] 控制台無錯誤訊息

---

#### 階段 3：配置 Electron Builder（1.5 小時）

**Step 1: 建立 `electron-builder.yml`**

1. 配置基本資訊（appId, productName）
2. 配置 macOS 打包規則
3. 配置 Windows 打包規則
4. 配置 Linux 打包規則

**Step 2: 更新 `package.json`**

1. 添加 `main` 欄位指向 `electron/main.js`
2. 添加打包腳本（`electron:build:mac` 等）
3. 配置 `build` 欄位

**Step 3: 建立 macOS 權限檔案**

1. 建立 `build/entitlements.mac.plist`
2. 配置必要的權限（網路存取、JIT 等）

**測試檢查點：**
- [ ] `electron-builder.yml` 語法正確
- [ ] `package.json` 配置正確

---

#### 階段 4：打包後端服務（2 小時）

**Step 1: 建立 PyInstaller spec 檔案**

1. 建立 `backend/api.spec`
2. 配置打包規則（包含所有依賴、資料檔案）
3. 配置 hiddenimports（uvicorn、sqlalchemy 等）

**Step 2: 測試打包**

```bash
cd backend
pyinstaller api.spec
./dist/api  # 測試執行
```

**Step 3: 驗證打包結果**

1. 檢查 `backend/dist/api` 可執行
2. 檢查啟動後 API 正常運作
3. 檢查檔案大小合理（< 100 MB）

**測試檢查點：**
- [ ] PyInstaller 打包成功
- [ ] 可執行檔可正常啟動
- [ ] API 端點可正常調用
- [ ] 無缺少依賴錯誤

---

#### 階段 5：整合自動更新（1.5 小時）

**Step 1: 在 `main.js` 中整合 electron-updater**

1. 添加 `checkForUpdates()` 函數
2. 監聽更新事件（update-available, update-downloaded）
3. 實作 IPC 通訊（前端觸發安裝）

**Step 2: 實作前端更新通知元件**

1. 建立 `frontend/src/components/UpdateNotification.tsx`
2. 監聽 Electron IPC 事件
3. 顯示更新 Modal
4. 實作「立即安裝」按鈕

**Step 3: 配置更新伺服器**

1. 在 `electron-builder.yml` 中配置 `publish`
2. 設定 GitHub Releases 為更新來源

**測試檢查點：**
- [ ] 更新檢查邏輯正常
- [ ] 前端可接收更新事件
- [ ] Modal 正常顯示

---

#### 階段 6：macOS 打包測試（2 小時）

**Step 1: 建置前端**

```bash
cd frontend
npm run build  # 生成 out/
cd ..
```

**Step 2: 執行打包**

```bash
npm run electron:build:mac
```

**Step 3: 測試安裝與運行**

1. 掛載生成的 .dmg 檔案
2. 拖曳 YTMaker.app 到「應用程式」資料夾
3. 啟動應用
4. 執行完整的影片生成流程（Flow-1）

**Step 4: 檢查問題**

- 檢查應用圖示是否正確
- 檢查後端服務是否自動啟動
- 檢查日誌（~/Library/Logs/YTMaker/）

**測試檢查點：**
- [ ] .dmg 檔案成功生成
- [ ] 應用可正常安裝
- [ ] 應用可正常啟動
- [ ] 後端服務自動運行
- [ ] 影片生成功能正常

---

#### 階段 7：Windows/Linux 打包（2 小時）

**注意：** 如果開發環境為 macOS，建議使用 CI/CD 或虛擬機測試

**Step 1: 配置 CI/CD（GitHub Actions）**

建立 `.github/workflows/build.yml`：

```yaml
name: Build

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'

      - name: Install dependencies
        run: |
          npm install
          cd backend && pip install -r requirements.txt && pip install pyinstaller

      - name: Build frontend
        run: cd frontend && npm install && npm run build

      - name: Build backend
        run: cd backend && pyinstaller api.spec

      - name: Build Electron app
        run: npm run electron:build
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: ${{ matrix.os }}
          path: release/*
```

**Step 2: 推送 tag 觸發建置**

```bash
git tag v1.0.0
git push origin v1.0.0
```

**Step 3: 下載並測試建置結果**

從 GitHub Actions 下載建置產物並測試。

---

#### 階段 8：效能與品質檢查（1 小時）

**Step 1: 啟動時間測試**

1. 記錄啟動時間（5 次平均）
2. 如果 > 5 秒，優化啟動邏輯

**Step 2: 記憶體使用測試**

1. 記錄閒置記憶體
2. 記錄生成峰值記憶體
3. 檢查是否有記憶體洩漏

**Step 3: 安裝包大小檢查**

1. 檢查 .dmg / .exe / .AppImage 大小
2. 如果過大（> 500 MB），檢查是否包含不必要的檔案

**Step 4: 日誌檢查**

1. 檢查應用日誌是否正常記錄
2. 檢查無敏感資訊洩漏

---

### 注意事項

#### 安全性

- ⚠️ **不要在前端暴露 Node.js API**：使用 contextIsolation 和 preload 腳本
- ⚠️ **不要在日誌中記錄 API Keys**：後端日誌應過濾敏感資訊
- ⚠️ **程式碼簽名**：macOS 需要簽名才能通過 Gatekeeper
- ⚠️ **權限最小化**：只申請必要的系統權限

#### 效能

- 💡 **延遲載入後端**：等待 Redis 和 FastAPI 啟動後再顯示視窗
- 💡 **打包大小優化**：使用 UPX 壓縮可執行檔、排除不必要的依賴
- 💡 **啟動優化**：避免在主程序做耗時操作

#### 跨平台相容性

- 🔗 **路徑處理**：使用 `path.join()` 而非硬編碼路徑
- 🔗 **程序管理**：Windows 與 Unix 的程序終止方式不同（`.kill()` vs `.kill('SIGTERM')`）
- 🔗 **檔案權限**：Linux/macOS 需要設定執行權限（`chmod +x`）

#### 測試

- ✅ **在真實環境測試**：打包後的應用在虛擬機或實體機測試
- ✅ **測試更新流程**：發布兩個版本測試自動更新
- ✅ **測試安裝/卸載**：確保卸載乾淨（無殘留檔案）

---

### 完成檢查清單

#### 功能完整性
- [ ] Electron 主程序實現完成（main.js）
- [ ] Preload 腳本實現完成（preload.js）
- [ ] 後端服務自動啟動功能完成
- [ ] Redis 服務自動啟動功能完成
- [ ] electron-builder 配置完成
- [ ] 自動更新機制整合完成

#### 跨平台打包
- [ ] macOS 打包成功（.dmg）
- [ ] Windows 打包成功（.exe）- 至少在 CI/CD 測試
- [ ] Linux 打包成功（.AppImage/.deb）- 至少在 CI/CD 測試
- [ ] 應用圖示正確顯示（所有平台）

#### 測試
- [ ] 測試 1 通過：主程序啟動測試
- [ ] 測試 2 通過：後端服務自動啟動測試
- [ ] 測試 3 通過：macOS 打包測試
- [ ] 測試 4 通過：Windows 打包測試（CI/CD）
- [ ] 測試 5 通過：Linux 打包測試（CI/CD）
- [ ] 測試 6 通過：自動更新測試
- [ ] 測試 7 通過：完整安裝與使用流程
- [ ] 測試 8 通過：啟動時間 < 5 秒
- [ ] 測試 9 通過：記憶體使用 < 300 MB（閒置）

#### 程式碼品質
- [ ] ESLint 檢查通過（前端）
- [ ] 無 console.log 或除錯程式碼
- [ ] 日誌記錄完整且安全（無敏感資訊）

#### 文件
- [ ] 安裝指南文件完成（README.md）
- [ ] 使用者手冊更新（如需要）
- [ ] CHANGELOG 記錄版本變更

#### 部署
- [ ] GitHub Releases 配置完成
- [ ] CI/CD 自動建置配置完成（.github/workflows/build.yml）
- [ ] 程式碼簽名配置完成（macOS，如適用）

---

## 預估時間分配

- **環境準備：** 30 分鐘
- **Electron 主程序實作：** 2 小時
- **Electron Builder 配置：** 1.5 小時
- **後端服務打包：** 2 小時
- **自動更新整合：** 1.5 小時
- **macOS 打包測試：** 2 小時
- **Windows/Linux 打包（CI/CD）：** 2 小時
- **效能與品質檢查：** 1 小時

**總計：約 12.5 小時**

---

## 參考資源

### Electron 官方文檔
- [Electron 官方文檔](https://www.electronjs.org/docs/latest/)
- [Security Best Practices](https://www.electronjs.org/docs/latest/tutorial/security)
- [IPC 通訊](https://www.electronjs.org/docs/latest/tutorial/ipc)

### Electron Builder
- [Electron Builder 文檔](https://www.electron.build/)
- [配置參考](https://www.electron.build/configuration/configuration)
- [Multi-platform Build](https://www.electron.build/multi-platform-build)

### Electron Updater
- [electron-updater](https://www.electron.build/auto-update)
- [GitHub Releases Provider](https://www.electron.build/configuration/publish#githuboptions)

### PyInstaller
- [PyInstaller 文檔](https://pyinstaller.org/en/stable/)
- [.spec 檔案參考](https://pyinstaller.org/en/stable/spec-files.html)

### 專案內部文件
- `tech-specs/framework.md` - 技術框架規格
- `tech-specs/frontend/overview.md` - 前端架構總覽
- `development/phase-1/overview.md` - Phase 1 總覽

---

## 常見問題

### Q1: 如何在開發模式下測試 Electron？

**A:** 使用以下命令：

```bash
# 終端 1: 啟動 Next.js 開發伺服器
cd frontend
npm run dev

# 終端 2: 啟動後端（手動）
cd backend
uvicorn app.main:app --reload

# 終端 3: 啟動 Electron
npm run electron:dev
```

---

### Q2: 打包後的應用很大（> 500 MB），如何優化？

**A:** 優化建議：

1. **排除不必要的檔案**：在 `electron-builder.yml` 中配置 `files` 排除 `node_modules`、測試檔案等
2. **使用 asar 打包**：Electron Builder 預設會使用 asar，可減少檔案數量
3. **壓縮可執行檔**：使用 UPX 壓縮 Python 可執行檔（在 PyInstaller spec 中設定 `upx=True`）
4. **優化依賴**：移除不必要的 Python 依賴

---

### Q3: macOS 打包後顯示「應用程式已損毀」？

**A:** 這是因為沒有簽名。解決方式：

1. **移除隔離屬性**（臨時方案）：
   ```bash
   xattr -cr /Applications/YTMaker.app
   ```

2. **正式簽名**（推薦）：
   - 申請 Apple Developer 帳號
   - 取得簽名證書
   - 在 `electron-builder.yml` 中配置 `identity`
   - 執行公證（notarization）

---

### Q4: 如何測試自動更新？

**A:** 測試步驟：

1. 建立並發布 v1.0.0 到 GitHub Releases
2. 本地安裝 v1.0.0
3. 建立並發布 v1.0.1 到 GitHub Releases
4. 啟動 v1.0.0，應自動檢測到更新

---

### Q5: Windows 打包失敗，缺少 Python DLL？

**A:** 確保 PyInstaller 打包時包含所有依賴：

```python
# 在 api.spec 中添加
binaries=[
    ('C:/Python39/python39.dll', '.'),
],
```

或使用 `--onefile` 模式將所有內容打包成單一執行檔。

---

**準備好了嗎？** 開始打包 YTMaker 為跨平台桌面應用！🚀
