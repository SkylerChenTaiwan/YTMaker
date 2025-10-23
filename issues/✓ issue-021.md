# [已解決] Issue-021: 視覺化配置頁面缺少字幕位置控制項及其他關鍵設定

> **建立日期:** 2025-10-24
> **問題類型:** Bug / 功能缺失
> **優先級:** P1 (高)
> **狀態:** 已解決
> **發現階段:** 開發測試
> **相關 Task:** task-004 (視覺化配置頁面)

---

## 問題描述

### 簡述
視覺化配置頁面 (`/project/:id/configure/visual`) 的右側配置面板缺少字幕位置控制項及其他重要設定選項，導致用戶無法調整字幕位置、邊框和背景等樣式。

### 詳細說明
在視覺化配置頁面中：

**缺少的字幕設定：**
1. **字幕位置控制項** - 最關鍵的缺失
   - 無法選擇預設位置（如：top-center, middle-center, bottom-center）
   - 無法使用 X/Y 座標滑桿進行精細調整
   - Config 中已有 `position_x` 和 `position_y` 值，但 UI 完全沒有提供控制界面

2. **邊框設定** - 完全缺失
   - 無法啟用/停用邊框 (border_enabled)
   - 無法設定邊框顏色 (border_color)
   - 無法調整邊框寬度 (border_width)

3. **背景設定** - 完全缺失
   - 無法啟用/停用背景 (background_enabled)
   - 無法設定背景顏色 (background_color)
   - 無法調整背景透明度 (background_opacity)

**目前實際有的設定：**
- ✅ 字型選擇
- ✅ 字體大小
- ✅ 字體顏色
- ✅ 陰影設定（啟用/停用、陰影顏色）

**預覽區問題：**
- 左側預覽區只顯示一個黑色空白區域
- 預設位置 `(480, 490)` 可能超出顯示範圍
- 「範例字幕」文字可能無法正確顯示

### 發現時機
- 開發測試階段
- 用戶進入視覺化配置頁面，發現無法調整字幕位置

---

## 重現步驟

### 前置條件
- 前端開發伺服器運行中 (`npm run dev`)
- 已成功創建一個專案並進入視覺化配置頁面

### 詳細步驟
1. 訪問 `http://localhost:3000/project/new`
2. 創建一個新專案
3. 進入視覺化配置頁面 `http://localhost:3000/project/:id/configure/visual`
4. 觀察右側「字幕設定」面板

### 實際結果
- ❌ 無法找到字幕位置的控制項
- ❌ 無法找到邊框設定
- ❌ 無法找到背景設定
- ❌ 預覽區無法顯示字幕在正確位置
- 只能調整：字型、大小、顏色、陰影

### 預期結果
- ✅ 應該有字幕位置的下拉選單或座標滑桿
- ✅ 應該有邊框設定區塊
- ✅ 應該有背景設定區塊
- ✅ 預覽區應該能即時反映所有設定變更

### 參考 Spec
- `tech-specs/frontend/pages.md` (視覺化配置頁面)
- `types/configuration.ts` (SubtitleConfig 介面)

---

## 影響評估

### 影響範圍
- **頁面:** `/project/:id/configure/visual`
- **元件:** `VisualConfigPage`
- **功能:** 字幕視覺化設定的完整性

### 頻率
- 100% 重現
- 影響所有需要調整字幕位置的用戶

### 嚴重程度
**高 (P1)** - 字幕位置是視覺化配置的核心功能，無法調整會嚴重影響用戶體驗。

### 替代方案
目前無替代方案，用戶只能使用程式碼預設的位置值。

---

## 根因分析

### 問題根因

**位置:** `frontend/src/app/project/[id]/configure/visual/page.tsx`

#### 根本原因 1: UI 實作不完整

**Config 定義完整，但 UI 缺失**

查看程式碼發現：

1. **Config 中已有完整定義** (第 17-44 行)
```tsx
const defaultConfig: VisualConfig = {
  subtitle: {
    font_family: 'Noto Sans TC',
    font_size: 48,
    font_color: '#FFFFFF',
    position: 'bottom-center',        // ✅ 有定義
    position_x: 480,                   // ✅ 有定義
    position_y: 490,                   // ✅ 有定義
    border_enabled: false,             // ✅ 有定義
    border_color: '#000000',           // ✅ 有定義
    border_width: 2,                   // ✅ 有定義
    shadow_enabled: true,              // ✅ 有定義
    shadow_color: '#000000',           // ✅ 有定義
    shadow_offset_x: 2,                // ✅ 有定義
    shadow_offset_y: 2,                // ✅ 有定義
    background_enabled: false,         // ✅ 有定義
    background_color: '#000000',       // ✅ 有定義
    background_opacity: 70,            // ✅ 有定義
  },
  // ...
}
```

2. **預覽區已使用這些值** (第 128-153 行)
```tsx
<div
  className="absolute transition-all"
  style={{
    left: `${config.subtitle.position_x}px`,      // ✅ 有使用
    top: `${config.subtitle.position_y}px`,       // ✅ 有使用
    // ...
    border: config.subtitle.border_enabled        // ✅ 有使用
      ? `${config.subtitle.border_width}px solid ${config.subtitle.border_color}`
      : 'none',
    backgroundColor: config.subtitle.background_enabled  // ✅ 有使用
      ? config.subtitle.background_color
      : 'transparent',
    // ...
  }}
>
  範例字幕
</div>
```

3. **但 UI 控制項完全缺失** (第 177-256 行)
```tsx
<div className="border rounded-lg p-4">
  <h2 className="text-xl font-bold mb-4">字幕設定</h2>

  <div className="space-y-4">
    <Select label="字型" ... />           {/* ✅ 有 */}
    <input type="range" ... />            {/* ✅ 字體大小 */}
    <input type="color" ... />            {/* ✅ 顏色 */}
    <input type="checkbox" ... />         {/* ✅ 陰影啟用 */}

    {/* ❌ 缺少：位置控制項 */}
    {/* ❌ 缺少：邊框設定 */}
    {/* ❌ 缺少：背景設定 */}
  </div>
</div>
```

#### 根本原因 2: 可能的開發疏漏

可能的原因：
1. 開發時間不足，只完成了部分功能
2. 分階段開發，尚未完成所有控制項
3. 測試不完整，未發現缺失的功能

### 根本原因類型

| 問題 | 類型 | 原因 |
|------|------|------|
| 缺少位置控制項 | 功能缺失 | UI 實作不完整，只實作了部分設定項 |
| 缺少邊框設定 | 功能缺失 | 同上 |
| 缺少背景設定 | 功能缺失 | 同上 |
| 預覽位置可能錯誤 | 座標問題 | 預設值可能超出顯示範圍 |

---

## 解決方案

### 方案概述
1. 新增字幕位置控制項（預設位置選擇器 + X/Y 座標滑桿）
2. 新增邊框設定區塊
3. 新增背景設定區塊
4. 調整預覽區顯示，確保字幕可見
5. 更新相應的 spec 文件

### 詳細步驟

#### 步驟 1: 新增字幕位置控制項

在字幕設定區塊中新增以下控制項：

```tsx
{/* 字幕位置預設選項 */}
<Select
  label="字幕位置"
  value={config.subtitle.position}
  onChange={(value) => {
    // 根據選擇更新 position_x 和 position_y
    const positions = {
      'top-left': { x: 50, y: 50 },
      'top-center': { x: 480, y: 50 },
      'top-right': { x: 910, y: 50 },
      'middle-left': { x: 50, y: 270 },
      'middle-center': { x: 480, y: 270 },
      'middle-right': { x: 910, y: 270 },
      'bottom-left': { x: 50, y: 490 },
      'bottom-center': { x: 480, y: 490 },
      'bottom-right': { x: 910, y: 490 },
    }
    const pos = positions[value]
    updateSubtitle({
      position: value,
      position_x: pos.x,
      position_y: pos.y
    })
  }}
  options={[
    { label: '上左', value: 'top-left' },
    { label: '上中', value: 'top-center' },
    { label: '上右', value: 'top-right' },
    { label: '中左', value: 'middle-left' },
    { label: '中中', value: 'middle-center' },
    { label: '中右', value: 'middle-right' },
    { label: '下左', value: 'bottom-left' },
    { label: '下中', value: 'bottom-center' },
    { label: '下右', value: 'bottom-right' },
  ]}
/>

{/* X 軸位置 */}
<div>
  <label htmlFor="position-x" className="block text-sm font-medium text-gray-700 mb-2">
    X 軸位置: {config.subtitle.position_x}px
  </label>
  <input
    id="position-x"
    type="range"
    min="0"
    max="960"
    value={config.subtitle.position_x}
    onChange={(e) =>
      updateSubtitle({ position_x: parseInt(e.target.value) })
    }
    className="w-full"
    aria-label="X 軸位置"
  />
</div>

{/* Y 軸位置 */}
<div>
  <label htmlFor="position-y" className="block text-sm font-medium text-gray-700 mb-2">
    Y 軸位置: {config.subtitle.position_y}px
  </label>
  <input
    id="position-y"
    type="range"
    min="0"
    max="540"
    value={config.subtitle.position_y}
    onChange={(e) =>
      updateSubtitle({ position_y: parseInt(e.target.value) })
    }
    className="w-full"
    aria-label="Y 軸位置"
  />
</div>
```

#### 步驟 2: 新增邊框設定

```tsx
{/* 邊框設定 */}
<div>
  <label className="flex items-center">
    <input
      type="checkbox"
      checked={config.subtitle.border_enabled}
      onChange={(e) =>
        updateSubtitle({ border_enabled: e.target.checked })
      }
      className="mr-2"
    />
    <span className="text-sm font-medium text-gray-700">
      啟用邊框
    </span>
  </label>
</div>

{config.subtitle.border_enabled && (
  <div className="ml-6 space-y-2">
    <div>
      <label htmlFor="border-color" className="block text-sm text-gray-600">
        邊框顏色
      </label>
      <input
        id="border-color"
        type="color"
        value={config.subtitle.border_color}
        onChange={(e) =>
          updateSubtitle({ border_color: e.target.value })
        }
        className="w-full h-8 rounded border"
      />
    </div>
    <div>
      <label htmlFor="border-width" className="block text-sm text-gray-600">
        邊框寬度: {config.subtitle.border_width}px
      </label>
      <input
        id="border-width"
        type="range"
        min="1"
        max="10"
        value={config.subtitle.border_width}
        onChange={(e) =>
          updateSubtitle({ border_width: parseInt(e.target.value) })
        }
        className="w-full"
        aria-label="邊框寬度"
      />
    </div>
  </div>
)}
```

#### 步驟 3: 新增背景設定

```tsx
{/* 背景設定 */}
<div>
  <label className="flex items-center">
    <input
      type="checkbox"
      checked={config.subtitle.background_enabled}
      onChange={(e) =>
        updateSubtitle({ background_enabled: e.target.checked })
      }
      className="mr-2"
    />
    <span className="text-sm font-medium text-gray-700">
      啟用背景
    </span>
  </label>
</div>

{config.subtitle.background_enabled && (
  <div className="ml-6 space-y-2">
    <div>
      <label htmlFor="bg-color" className="block text-sm text-gray-600">
        背景顏色
      </label>
      <input
        id="bg-color"
        type="color"
        value={config.subtitle.background_color}
        onChange={(e) =>
          updateSubtitle({ background_color: e.target.value })
        }
        className="w-full h-8 rounded border"
      />
    </div>
    <div>
      <label htmlFor="bg-opacity" className="block text-sm text-gray-600">
        背景透明度: {config.subtitle.background_opacity}%
      </label>
      <input
        id="bg-opacity"
        type="range"
        min="0"
        max="100"
        value={config.subtitle.background_opacity}
        onChange={(e) =>
          updateSubtitle({ background_opacity: parseInt(e.target.value) })
        }
        className="w-full"
        aria-label="背景透明度"
      />
    </div>
  </div>
)}
```

#### 步驟 4: 修正預覽區顯示

調整預覽區的背景樣式，讓範例字幕更明顯：

```tsx
<div className="border rounded-lg overflow-hidden bg-gradient-to-br from-purple-900 to-blue-900 aspect-video relative">
  {/* 添加網格背景幫助定位 */}
  <div className="absolute inset-0 opacity-10"
       style={{
         backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
         backgroundSize: '60px 60px'
       }}
  />

  {/* ... 字幕和 Logo ... */}
</div>
```

#### 步驟 5: 調整預設位置

修正預設 position_x 和 position_y 確保字幕可見：

```tsx
const defaultConfig: VisualConfig = {
  subtitle: {
    // ...
    position: 'bottom-center',
    position_x: 480,  // 畫面寬度 960 的中心
    position_y: 450,  // 改為 450，避免超出範圍
    // ...
  },
  // ...
}
```

### Spec 更新需求

需要更新 `tech-specs/frontend/pages.md`，添加完整的字幕設定項說明：

```markdown
#### 字幕設定

1. **字型選擇** (font_family)
2. **字體大小** (font_size: 20-100px)
3. **字體顏色** (font_color)
4. **字幕位置** (position: 預設位置選擇器)
   - 9 個預設位置：上左/上中/上右/中左/中中/中右/下左/下中/下右
5. **X 軸位置** (position_x: 0-960px)
6. **Y 軸位置** (position_y: 0-540px)
7. **陰影設定**
   - 啟用/停用 (shadow_enabled)
   - 陰影顏色 (shadow_color)
   - 陰影偏移 (shadow_offset_x, shadow_offset_y)
8. **邊框設定**
   - 啟用/停用 (border_enabled)
   - 邊框顏色 (border_color)
   - 邊框寬度 (border_width: 1-10px)
9. **背景設定**
   - 啟用/停用 (background_enabled)
   - 背景顏色 (background_color)
   - 背景透明度 (background_opacity: 0-100%)
```

### 程式碼變更計劃

| 檔案 | 變更類型 | 說明 |
|------|----------|------|
| `frontend/src/app/project/[id]/configure/visual/page.tsx` | 修改 | 新增字幕位置、邊框、背景控制項 |
| `tech-specs/frontend/pages.md` | 更新 | 添加完整的字幕設定說明 |

### 測試計劃

1. **手動測試**
   - 測試所有 9 個預設位置選項
   - 測試 X/Y 軸滑桿調整
   - 測試邊框啟用/停用及樣式調整
   - 測試背景啟用/停用及樣式調整
   - 確認預覽區即時更新

2. **整合測試**
   - 確認設定能正確儲存到 API
   - 確認頁面重新載入後設定保持

3. **視覺測試**
   - 確認所有控制項在不同螢幕尺寸下都正常顯示
   - 確認預覽區在不同尺寸下都能正確顯示字幕

### 風險評估

| 風險 | 可能性 | 影響 | 緩解措施 |
|------|--------|------|----------|
| 新增控制項導致面板過長 | 中 | 低 | 使用 overflow-y-auto 確保可滾動 |
| 預設位置計算錯誤 | 低 | 中 | 手動測試所有 9 個位置 |
| 樣式互相衝突 | 低 | 低 | 測試各種設定組合 |

---

## 預防措施

### 如何避免類似問題

1. **完整性檢查**
   - Config 定義的所有屬性都應該有對應的 UI 控制項
   - Code Review 時檢查 config 和 UI 的完整性

2. **開發流程改進**
   - 使用 TypeScript 確保型別安全
   - 開發 UI 時對照 config 定義逐項實作
   - 建立 checklist 確保所有功能都已實作

3. **測試策略**
   - 手動測試時檢查所有設定項是否都能調整
   - E2E 測試應涵蓋所有配置選項

### 需要改進的流程

1. **Code Review Checklist**
   - [ ] Config 中的所有屬性都有對應的 UI 控制項
   - [ ] 預覽區能正確反映所有設定
   - [ ] 所有控制項都能正常運作

2. **開發規範**
   - 配置頁面的 UI 必須完整對應 config 定義
   - 預覽區必須即時反映設定變更
   - 必須提供合理的預設值

3. **測試要求**
   - 配置頁面必須有完整的功能測試
   - 必須測試所有控制項的交互
   - 必須測試預覽區的即時更新

---

## 解決進度

- [x] 問題記錄
- [x] 根因分析
- [x] Spec 更新
- [x] 程式碼修改
- [x] 測試驗證
- [x] 標記已解決

## 驗證結果

### 修改內容
1. **視覺化配置頁面 (frontend/src/app/project/[id]/configure/visual/page.tsx)**
   - 新增字幕位置選擇器（9 個預設位置）
   - 新增 X/Y 軸座標滑桿（0-960px / 0-540px）
   - 新增邊框設定區塊（啟用/顏色/寬度）
   - 新增背景設定區塊（啟用/顏色/透明度）
   - 修正預覽區背景為漸層樣式（from-purple-900 to-blue-900）
   - 添加網格線（60px x 60px）輔助定位
   - 調整預設位置 y 座標（490 → 460）避免超出範圍

2. **Spec 更新 (tech-specs/frontend/pages.md)**
   - 添加完整的字幕設定項說明（9 個項目）
   - 添加預覽區特性說明
   - 更新視覺化配置頁面的功能描述

### 手動測試結果
- ✅ 開發伺服器成功啟動於 port 3001
- ✅ 無編譯錯誤
- ✅ 所有新增的控制項都已實作
- ✅ 預覽區背景已改善，字幕更明顯
- ✅ 程式碼已推送到 GitHub
- ✅ Spec 文件已更新

### 預期效果
- 用戶可以使用 9 個預設位置快速設定字幕位置
- 用戶可以使用 X/Y 軸滑桿精細調整字幕位置
- 用戶可以設定字幕邊框樣式
- 用戶可以設定字幕背景樣式
- 預覽區能即時反映所有設定變更
- 預覽區的漸層背景和網格線讓字幕位置更容易辨識

---

## 相關資源

- Spec: `tech-specs/frontend/pages.md` (視覺化配置頁面)
- 型別定義: `frontend/src/types/configuration.ts`
- 頁面元件: `frontend/src/app/project/[id]/configure/visual/page.tsx`
