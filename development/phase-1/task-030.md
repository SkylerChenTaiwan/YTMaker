# Task-030: Electron 打包與部署

> **建立日期:** 2025-10-19
> **狀態:** ⏳ 未開始  
> **預計時間:** 12 小時
> **優先級:** P0 (必須)

---

## 關聯文件

### 技術規格
- **技術框架:** `tech-specs/framework.md#桌面應用`
- **前端架構:** `tech-specs/frontend/overview.md`

### 相關任務
- **前置任務:** Task-029 ✅ (E2E 測試)
- **後續任務:** 無（Phase 1 最終任務）

---

## 任務目標

### 簡述
使用 Electron 將應用打包為 macOS、Windows、Linux 桌面應用，設定自動更新機制。

### 成功標準
- [x] Electron 配置完成
- [x] 3 個平台打包成功（macOS, Windows, Linux）
- [x] 自動更新機制完成
- [x] 安裝程式生成完成
- [x] 應用圖示與品牌資源完成
- [x] 打包測試通過

---

## 主要輸出

### 1. Electron 配置
- `electron/main.js` - 主程序
- `electron/preload.js` - Preload 腳本
- `electron-builder.yml` - 打包配置

### 2. 跨平台打包
- macOS: `.dmg` 安裝檔
- Windows: `.exe` 安裝檔
- Linux: `.AppImage` 或 `.deb`

### 3. 自動更新
- 整合 `electron-updater`
- 設定更新伺服器
- 實作更新檢查邏輯

### 4. 品牌資源
- 應用圖示（1024x1024）
- 啟動畫面
- 關於視窗

---

## Electron 主程序範例

```javascript
// electron/main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:3000');
  } else {
    win.loadFile('dist/index.html');
  }
}

app.whenReady().then(createWindow);
```

---

## 打包配置範例

```yaml
# electron-builder.yml
appId: com.ytmaker.app
productName: YTMaker
directories:
  output: release
  buildResources: build

mac:
  category: public.app-category.productivity
  target:
    - dmg
    - zip

win:
  target:
    - nsis
    - portable

linux:
  target:
    - AppImage
    - deb
  category: Utility
```

---

## 驗證檢查

### 功能驗證
- [ ] macOS 版本可正常安裝與執行
- [ ] Windows 版本可正常安裝與執行
- [ ] Linux 版本可正常安裝與執行
- [ ] 自動更新機制運作正常
- [ ] 應用圖示正確顯示

### 效能驗證
- [ ] 應用啟動時間 < 3 秒
- [ ] 記憶體使用 < 500 MB

---

## 完成檢查清單

- [ ] Electron 配置完成
- [ ] macOS 打包成功
- [ ] Windows 打包成功
- [ ] Linux 打包成功
- [ ] 自動更新機制完成
- [ ] 應用圖示與品牌資源完成
- [ ] 跨平台測試通過
- [ ] 部署文件完成
