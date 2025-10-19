# Task-015: 影片渲染服務（FFmpeg）

> **建立日期：** 2025-10-19
> **狀態：** ⏳ 未開始
> **預計時間：** 16 小時
> **優先級：** P0 (必須)

---

## 關聯文件

### 產品設計
- **產品概述：** `product-design/overview.md#核心功能-5-動態視覺效果`
- **產品概述：** `product-design/overview.md#核心功能-6-字幕系統`

### 技術規格
- **業務邏輯：** `tech-specs/backend/business-logic.md#影片渲染服務`

### 相關任務
- **前置任務:** Task-011 ✅ (圖片生成), Task-012 ✅ (虛擬主播)
- **後續任務:** Task-014 (Celery 任務)

---

## 任務目標

### 簡述
使用 FFmpeg 實作影片合成、字幕燒錄、Ken Burns 效果、封面生成。

### 成功標準
- [x] VideoRenderService 類別完整
- [x] FFmpeg 指令生成器完成
- [x] 字幕渲染完成
- [x] Ken Burns 效果完成
- [x] 疊加元素渲染完成
- [x] 虛擬主播整合完成
- [x] 封面生成完成
- [x] 跨平台相容性測試通過

---

## 主要功能

### 1. 影片合成
- 開場（虛擬主播）
- 內容段落（圖片 + Ken Burns + 字幕）
- 結尾（虛擬主播）

### 2. 字幕渲染
- 自訂字型、大小、顏色
- 位置定位
- 邊框、陰影、背景框

### 3. Ken Burns 效果
- zoom_in, zoom_out
- pan_left, pan_right

### 4. 封面生成
- 基於第一張圖片
- 添加標題樣式

---

## FFmpeg 指令範例

### 影片合成
```bash
ffmpeg -i intro.mp4 -i segment1.mp4 ... \
  -filter_complex "[0:v][1:v]...[n:v]concat=n=15:v=1:a=1[outv][outa]" \
  -map "[outv]" -map "[outa]" final_video.mp4
```

---

## 完成檢查清單

- [ ] VideoRenderService 完成
- [ ] FFmpeg 指令生成完成
- [ ] 字幕渲染完成
- [ ] Ken Burns 效果完成
- [ ] 封面生成完成
- [ ] 跨平台測試通過
- [ ] 單元測試完成
