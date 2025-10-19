# 產品概述

## 產品定位

**YouTube 影片自動化生產系統** 是一個**本地端桌面應用程式**，提供端到端的影片生成工具，從文字輸入到 YouTube 發布完全自動化。

**核心價值：**
- 自動化影片生產流程
- 無需真人出鏡（虛擬主播）
- 可高度配置的視覺風格
- 適合規模化內容生產

**系統特性：**
- 本地端運行，無需雲端服務
- 單用戶使用，無需帳號註冊或登入
- 資料完全存放在本地，保護隱私
- 可離線工作（除 API 調用外）

---

## 系統架構

### 部署方式
- **類型：** 桌面應用程式（Desktop Application）
- **運行環境：** 本地端（Local）
- **支援平台：** macOS、Linux、Windows

### 架構設計
- **前端：** Web-based UI（使用瀏覽器或 Electron）
- **後端：** Python 服務（處理影片生成邏輯）
- **資料庫：** SQLite（本地資料庫）
- **檔案系統：** 本地儲存（專案、素材、輸出檔案）

### 使用者模式
- **單用戶：** 僅供安裝電腦的用戶使用
- **無需認證：** 啟動後直接進入主控台
- **資料隔離：** 每台電腦的資料獨立存放

### 外部依賴
- **必要 API：**
  - Google Gemini API（腳本生成）
  - Stability AI API（圖片生成 - SDXL 模型）
  - D-ID API（虛擬主播）
  - YouTube Data API（影片上傳）
- **本地工具：**
  - FFmpeg（影片處理）
  - TTS Engine（語音合成）

詳細規格參見 [圖片生成 API 規格](#圖片生成-api-規格)

---

## 輸入與輸出

### 輸入

**必須：**
- 文字內容（500-10000字）

**可選：**
- 視覺化配置（使用前端界面）或選擇配置模板
- 自訂 Prompt 範本（用於腳本生成）
- 發布排程時間
- 隱私設定（公開/私人/不公開）

### 輸出

- YouTube 影片（已發布或排程）
- 影片檔案（final_video.mp4）
- 封面圖（thumbnail.jpg）
- 所有中間素材（可選保留）

---

## 核心功能

### 1. 自動腳本生成
- 將原始文案轉換為結構化腳本
- 使用 **Gemini** 模型（可在前端選擇不同版本）
- 自動分段（開場 + 動態數量段落 + 結尾）
  - **段落時長原則：每段 5-20 秒**
  - 根據文案長度和語音時長動態決定段落數
- 生成每段的圖片描述
- 生成 YouTube metadata（標題、描述、標籤）
- **支援自訂 Prompt 範本**（可修改和儲存）

### 2. 語音合成
- 台灣中文口音
- 自然語調
- 支援男聲/女聲

### 3. 虛擬主播
- 開場片段（30秒）
- 結尾片段（30秒）
- 嘴型與音訊同步

### 4. AI 圖片生成
- 根據段落數動態生成圖片（通常 10-30 張）
- 16:9 比例
- 統一視覺風格
- 每個段落對應一張圖片
- 詳細規格參見 [圖片生成 API 規格](#圖片生成-api-規格)

### 5. 動態視覺效果
- Ken Burns 效果（縮放、平移）
- 多種運鏡模式（zoom_in、zoom_out、pan_left、pan_right）
- 可為每個段落單獨配置

### 6. 字幕系統 ★
- 可配置樣式（大小、顏色、位置）
- 支援邊框、陰影、背景框
- 燒錄到影片中

### 7. 疊加元素系統 ★
- 文字疊加（標題、重點提示）
- 圖片疊加（Logo、圖標）
- 形狀疊加（裝飾線條、圓形）
- 支援段落級配置

### 8. 封面自動生成 ★
- 基於第一張圖片
- 可配置標題樣式
- 支援 Logo 和裝飾元素
- 符合 YouTube 規範（1280×720）

### 9. 視覺化配置系統 ★
- **類似線上剪輯軟體的視覺化界面**
- 拖拽定位：字幕、Logo、標題、疊加元素
- 所見即所得（WYSIWYG）配置
- 配置模板保存與讀取
- 全局配置 + 段落級覆寫
- 即時預覽效果

### 10. Prompt 範本系統 ★
- **管理腳本生成的 Prompt**
- 提供預設 Prompt 範本（包含「每段 5-20 秒」要求）
- 在前端界面修改 Prompt
- 儲存自訂 Prompt 為範本
- 選擇不同範本用於生成
- 支援多版本管理

### 11. 模型選擇
- 使用 **Google Gemini** 作為 LLM
- 前端可選擇不同 Gemini 模型：
  - `gemini-1.5-pro`（高品質）
  - `gemini-1.5-flash`（快速、低成本）
- 顯示模型說明（速度、品質、成本對比）

### 12. YouTube 自動上傳
- 自動上傳影片
- 設定 metadata
- 上傳封面圖
- 支援排程發布
- 標註 AI 生成內容

---

## 影片規格

| 項目 | 規格 |
|------|------|
| 長度 | 3~10 分鐘（180~600秒） |
| 解析度 | 1080p (1920×1080) |
| 幀率 | 30fps |
| 音訊 | AAC, 192kbps |
| 格式 | MP4 (H.264) |
| 檔案大小 | 150-300MB |

---

## 圖片生成 API 規格

### API 服務選擇

**建議方案：Stability AI (Stable Diffusion)**

| API 方案 | 優點 | 缺點 | 適用場景 |
|---------|------|------|---------|
| **Stability AI (SDXL)** ✅ 推薦 | • 官方 API 穩定<br>• 價格合理 ($20/月起)<br>• 支援批次處理<br>• 開源模型生態完善 | • 藝術風格略遜 Midjourney<br>• 需要 prompt 調校 | 自動化批次生產<br>風格可控 |
| **DALL-E 3** | • API 整合簡單<br>• 圖片品質穩定<br>• 適合設計類圖片 | • 按量計費 ($0.04-$0.12/圖)<<br>• 成本較高 (每支影片 $0.4-$3.6) | 小規模使用<br>預算充足 |
| **Midjourney** | • 藝術風格最佳<br>• 視覺效果出色 | • **無公開 API**<br>• 需 Enterprise 方案<br>• 整合困難 | 不適合自動化 |
| **Google Imagen** | • 照片級真實感最強<br>• Google Cloud 整合 | • 價格不透明<br>• 需 GCP 帳號 | 企業級場景 |

**最終選擇：Stability AI SDXL**
- 模型：`stable-diffusion-xl-1024-v1-0`
- 理由：官方 API、價格透明、批次友善、適合自動化

---

### API 端點與參數

**API 基本資訊：**
```
Endpoint: https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image
Method: POST
Authentication: Bearer Token (API Key)
```

**核心參數：**

| 參數 | 值 | 說明 |
|------|-----|------|
| `text_prompts` | `[{text, weight}]` | 圖片描述 prompt |
| `height` | `1080` | 圖片高度 |
| `width` | `1920` | 圖片寬度 (16:9) |
| `cfg_scale` | `7-10` | Prompt 遵循度 |
| `samples` | `1` | 每次生成圖片數量 |
| `steps` | `30-50` | 推理步數（品質 vs 速度） |
| `style_preset` | 可選 | 預設風格 (photographic, digital-art, etc.) |
| `seed` | 可選 | 隨機種子（用於可重現性） |

**Prompt 結構範例：**
```json
{
  "text_prompts": [
    {
      "text": "A serene mountain landscape at sunset, cinematic lighting, 4k quality, photorealistic",
      "weight": 1.0
    },
    {
      "text": "blurry, low quality, watermark, text",
      "weight": -1.0
    }
  ]
}
```

---

### 風格一致性策略

**問題：** 批次生成 10-30 張圖片時，如何保持統一視覺風格？

**解決方案：**

#### 1. **統一 Style Preset**
- 在專案配置中設定全局 `style_preset`
- 例如：`photographic`、`digital-art`、`cinematic`
- 所有圖片使用相同 preset

#### 2. **Prompt 範本系統**
- **基礎 Prompt 模板：**
  ```
  {image_description}, {global_style_modifiers}
  ```

- **範例：**
  ```
  原始描述: "A busy city street"
  最終 Prompt: "A busy city street, cinematic lighting, warm color palette,
                professional photography, 4k quality, photorealistic"
  ```

- **全局風格修飾詞（可配置）：**
  - 視覺風格：`cinematic lighting`, `photorealistic`, `professional photography`
  - 色調控制：`warm color palette`, `vibrant colors`, `muted tones`
  - 品質保證：`4k quality`, `highly detailed`, `sharp focus`

#### 3. **負面 Prompt（統一排除）**
```
blurry, low quality, distorted, watermark, text, logo,
anime, cartoon, sketch, illustration
```

#### 4. **參數標準化**
- 所有圖片使用相同 `cfg_scale`、`steps`
- 確保生成品質一致

#### 5. **後處理驗證**
- 檢查生成圖片的色調分佈
- 若差異過大，標記為異常並重新生成

---

### Prompt Engineering 策略

**由 Gemini 生成的圖片描述 → Stability AI Prompt 轉換**

#### 輸入（Gemini 腳本輸出）：
```json
{
  "image_description": "一座寧靜的山景，夕陽西下"
}
```

#### 處理流程：
1. **翻譯為英文**（Stability AI 建議英文 prompt）
2. **加入全局風格修飾詞**
3. **加入品質保證詞**
4. **組合負面 prompt**

#### 輸出（最終 API 請求）：
```json
{
  "text_prompts": [
    {
      "text": "A serene mountain landscape at sunset, cinematic lighting,
              warm color palette, professional photography, 4k quality,
              highly detailed, photorealistic",
      "weight": 1.0
    },
    {
      "text": "blurry, low quality, watermark, text, anime, cartoon",
      "weight": -1.0
    }
  ]
}
```

---

### 批次處理策略

**需求：** 每支影片需生成 10-30 張圖片

**方案：**

#### 1. **並行處理**
- 同時發送 4-6 個 API 請求
- 避免超過 API rate limit
- 預計耗時：3-5 分鐘（10-30 張）

#### 2. **Rate Limiting**
- Stability AI 限制：約 150 requests/分鐘（依方案而定）
- 實作指數退避重試（exponential backoff）

#### 3. **重試機制**
```python
max_retries = 3
retry_delay = [2, 5, 10]  # 秒

for attempt in range(max_retries):
    try:
        response = generate_image(prompt)
        break
    except RateLimitError:
        wait(retry_delay[attempt])
    except Exception as e:
        if attempt == max_retries - 1:
            raise
```

---

### 成本分析

**Stability AI 價格：**

| 方案 | 價格 | 每月額度 | 每張成本 |
|------|------|---------|---------|
| Basic | $20/月 | ~500 張 | $0.04/張 |
| Professional | $100/月 | ~3000 張 | $0.033/張 |
| Enterprise | 洽詢 | 無限制 | 更低 |

**專案成本估算：**
- 每支影片：10-30 張圖片
- 平均：20 張/支
- 成本：$0.66-$0.80/支（Basic 方案）
- 月產 30 支：約 $20-25

**對比 DALL-E 3：**
- 每張 $0.08（標準品質）
- 每支影片：$1.6（20 張）
- 月產 30 支：$48
- **Stability AI 便宜約 50%**

---

### 品質驗證

**自動檢查項目：**

#### 1. **技術驗證**
- ✅ 圖片解析度 = 1920x1080
- ✅ 檔案格式 = PNG/JPEG
- ✅ 檔案大小 < 10MB
- ✅ 圖片可正常載入

#### 2. **內容驗證（選配）**
- 使用 Vision API（如 GPT-4V）檢查圖片內容
- 確認圖片符合 prompt 描述
- 偵測 NSFW 或不適當內容

#### 3. **風格一致性檢查（進階）**
- 計算圖片色調分佈（Color Histogram）
- 與首張圖片比對，差異 > 閾值則警告
- 可選：人工審核

---

### 錯誤處理

**常見錯誤與處理：**

| 錯誤類型 | HTTP Code | 處理方式 |
|---------|-----------|---------|
| **API Key 無效** | 401 | 提示用戶檢查 API Key 配置 |
| **Rate Limit** | 429 | 等待後重試（exponential backoff） |
| **內容被拒絕** | 400 | 記錄 prompt，嘗試修改後重試 |
| **服務暫時不可用** | 500, 503 | 等待 30 秒後重試，最多 3 次 |
| **Timeout** | - | 增加 timeout 時間或重試 |

**Fallback 策略：**
1. 主要方案失敗 → 重試 3 次
2. 仍失敗 → 記錄錯誤，跳過該圖片
3. 最終檢查：若圖片數量 < 預期 80% → 警告用戶

---

### 配置項目

**在專案配置中可調整：**

```yaml
image_generation:
  provider: "stability_ai"  # 或 "dalle3"
  model: "stable-diffusion-xl-1024-v1-0"

  # 圖片參數
  resolution:
    width: 1920
    height: 1080

  # 生成參數
  cfg_scale: 8
  steps: 40
  style_preset: "photographic"  # 可選

  # 風格一致性
  global_style_modifiers:
    - "cinematic lighting"
    - "professional photography"
    - "4k quality"
    - "photorealistic"

  negative_prompt:
    - "blurry"
    - "low quality"
    - "watermark"
    - "text"

  # 並行處理
  parallel_requests: 4
  max_retries: 3
  retry_delays: [2, 5, 10]
```

---

## 品質要求

### 語音品質
- 發音清晰
- 台灣口音自然
- 語速適中（可調整）
- 情緒表達適當

### 視覺品質
- 圖片解析度 ≥ 1080p
- 統一視覺風格
- 動態效果流暢
- 無黑屏或閃爍

### 技術品質
- 音訊同步誤差 < 0.5秒
- 虛擬主播嘴型同步準確度 > 95%
- 字幕顯示正確
- 封面吸引人

---

## 功能範圍

### ✅ 包含

- 完整的影片生成流程（文字 → YouTube）
- 虛擬主播系統
- **視覺化配置界面**（類似線上剪輯軟體）
- **Prompt 範本管理系統**
- **Gemini 模型選擇**
- 批次處理功能
- 錯誤處理與重試
- 斷點續傳
- 配置模板管理

### ❌ 不包含

- 內容策劃（需用戶提供文案）
- YouTube 頻道運營（SEO、流量優化）
- 觀眾互動管理（留言回覆）
- 多語言支援（僅中文）
- 影片後期編輯（已自動化生成）
- 實拍素材處理

---

## 配置能力

### 配置方式
- **視覺化拖拽界面**（主要方式）
- 配置模板保存與讀取
- 配置參數以 YAML 格式儲存（後端使用）

### 可配置項目

**字幕：**
- 樣式（字型、大小、顏色）
- 位置（拖拽定位或選擇預設位置）
- 邊框和陰影
- 背景框

**封面：**
- 標題樣式
- Logo 位置和大小（拖拽定位）
- 背景效果（模糊、漸層）
- 裝飾元素

**影片段落：**
- Ken Burns 運鏡效果
- 文字疊加（拖拽定位）
- 圖片疊加（拖拽定位）
- 形狀裝飾

**段落級覆寫：**
- 特定段落使用不同配置
- 靈活控制每個段落的呈現

**Prompt 範本：**
- 腳本生成的 Prompt
- 包含段落時長要求（5-20 秒）
- 自訂風格和語氣

**模型選擇：**
- Gemini 模型版本（pro / flash）
- 依據需求選擇品質或速度

詳細配置規格參見 [configuration.md](configuration.md)

---

## 性能指標

### 生產速度
- 腳本生成：3 分鐘以內
- 素材生成（並行）：約 3-5 分鐘
- 影片渲染：約 10-15 分鐘
- 上傳：約 2-5 分鐘
- **總計：約 15-25 分鐘/支**

### 成功率
- 目標：> 99%
- 支援自動重試
- 支援斷點續傳

### 並行處理
- 素材生成階段：4 個任務並行
- 圖片轉影片：所有片段並行處理（通常 10-30 個）
- 封面與上傳：2 個任務並行

---

## 限制與約束

### API 配額
- D-ID：90 分鐘/月（Basic Plan）
  - 支援月產 60 支（每支 60 秒）
- YouTube：10,000 units/日
  - 支援每日上傳約 6 支
- 其他 API：按需付費，無硬性限制

### 系統資源
- FFmpeg 渲染需要 CPU 資源
- 每支影片需要約 300-500MB 暫存空間
- 建議最少 10GB 可用硬碟空間

### 內容限制
- 輸入文案：500-10000 字
- 影片長度：3~10 分鐘（可調整）
- 語言：僅支援繁體中文

---

## 擴展性

### 支援擴展
- 增加產量（需升級 API 方案）
- 更換外部服務（模組化設計）
- 自訂配置項目
- 新增疊加元素類型

### 不支援擴展
- 多語言（架構限制）
- 實時互動（非即時系統）
- 複雜剪輯（超出自動化範圍）
