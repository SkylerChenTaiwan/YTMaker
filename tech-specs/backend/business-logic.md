# 業務邏輯 (Business Logic)

## 關聯文件
- [資料模型](./database.md)
- [第三方整合](./integrations.md)
- [背景任務](./background-jobs.md)
- [效能優化](./performance.md)

---

## 3. 業務邏輯

### 3.1 腳本生成邏輯

#### 3.1.1 輸入
- 原始文字內容（500-10000 字）
- Prompt 範本
- Gemini 模型選擇

#### 3.1.2 處理流程

1. **驗證輸入**
   - 檢查文字長度（500-10000 字）
   - 檢查字元編碼（UTF-8）

2. **建構 Prompt**
   - 載入 Prompt 範本
   - 插入原始文字內容
   - 加入段落時長要求（5-20 秒）

3. **調用 Gemini API**
   - 使用選定的模型（pro / flash）
   - 設定參數：temperature=0.7, max_tokens=4000

4. **解析回應**
   - 驗證 JSON 結構
   - 驗證欄位完整性（開場、段落、結尾、metadata）

5. **驗證腳本**
   - 檢查段落時長（5-20 秒）
   - 計算總時長（180-600 秒）
   - 驗證圖片描述是否存在

6. **儲存腳本**
   - 儲存到 `projects.script` 欄位（JSON）

#### 3.1.3 腳本結構

```json
{
  "intro": {
    "text": "開場白文字",
    "duration": 10
  },
  "segments": [
    {
      "index": 1,
      "text": "段落文字",
      "duration": 15,
      "image_description": "圖片描述（英文）"
    }
  ],
  "outro": {
    "text": "結尾文字",
    "duration": 10
  },
  "metadata": {
    "title": "YouTube 影片標題",
    "description": "YouTube 影片描述",
    "tags": ["標籤1", "標籤2"]
  },
  "total_duration": 300
}
```

---

### 3.2 素材生成邏輯

#### 3.2.1 語音合成

**服務：** Azure TTS 或 Google TTS（待決定）

**處理流程：**
1. 合併所有文字（開場 + 段落 + 結尾）
2. 調用 TTS API（台灣中文口音）
3. 生成 MP3 檔案
4. 驗證音訊時長（誤差 < 5%）

---

#### 3.2.2 圖片生成

**服務：** Stability AI SDXL

**處理流程：**
1. 從腳本取得圖片描述（中文）
2. 翻譯為英文（使用 Gemini）
3. 加入全局風格修飾詞（`cinematic lighting`, `photorealistic`）
4. 加入負面 Prompt（`blurry`, `low quality`）
5. 並行生成圖片（4-6 個並行）
6. 重試機制（失敗最多 3 次）
7. 驗證圖片解析度（1920x1080）
8. 儲存圖片（PNG 格式）

**Prompt 範本：**
```
{image_description}, cinematic lighting, warm color palette,
professional photography, 4k quality, highly detailed, photorealistic

Negative: blurry, low quality, watermark, text, anime, cartoon
```

**並行處理策略：**
- 同時發送 4 個請求
- Rate Limiting：每分鐘最多 150 請求
- 指數退避重試：2秒、5秒、10秒

---

#### 3.2.3 虛擬主播生成

**服務：** D-ID API

**處理流程：**
1. 取得開場和結尾語音片段
2. 調用 D-ID API 生成虛擬主播影片
3. 驗證影片時長（誤差 < 5%）
4. 驗證嘴型同步準確度
5. 若失敗多次，跳過虛擬主播（使用純音訊 + 圖片）

---

### 3.3 影片渲染邏輯

**工具：** FFmpeg

**處理流程：**

1. **準備素材**
   - 語音檔案（audio.mp3）
   - 圖片列表（image_01.png ~ image_N.png）
   - 虛擬主播影片（intro_avatar.mp4, outro_avatar.mp4）

2. **生成影片片段**
   - 為每個段落生成影片片段
   - 圖片 + Ken Burns 效果（zoom_in, zoom_out, pan_left, pan_right）
   - 音訊同步

3. **燒錄字幕**
   - 使用配置的字幕樣式
   - 同步顯示時間

4. **添加 Logo 和疊加元素**
   - 全局元素：Logo、標題
   - 段落級元素：特定段落的疊加

5. **合併片段**
   - 開場（虛擬主播）+ 段落（圖片 + 字幕）+ 結尾（虛擬主播）
   - 使用 concat demuxer

6. **編碼輸出**
   - 編碼器：libx264
   - 解析度：1920x1080
   - 幀率：30fps
   - 音訊：AAC, 192kbps

**FFmpeg 命令範例：**
```bash
ffmpeg -i image.png -i audio.mp3 \
  -vf "scale=1920:1080,zoompan=z='zoom+0.002':d=25*5:s=1920x1080" \
  -c:v libx264 -c:a aac -b:a 192k \
  segment.mp4
```

---

### 3.4 封面生成邏輯

**處理流程：**

1. 取得第一張圖片
2. 加入標題文字（配置的樣式）
3. 加入 Logo（可選）
4. 加入裝飾元素（可選）
5. 輸出 1280x720 JPG 圖片

---

### 3.5 YouTube 上傳邏輯

**服務：** YouTube Data API v3

**處理流程：**

1. **驗證授權**
   - 檢查 OAuth Token 是否有效
   - 若過期，使用 Refresh Token 更新

2. **上傳影片**
   - 使用 Resumable Upload
   - 分塊上傳（256KB chunks）
   - 支援斷點續傳

3. **設定 Metadata**
   - 標題、描述、標籤
   - 隱私設定（public/unlisted/private）
   - 排程時間（若有）

4. **上傳封面**
   - 調用 `thumbnails.set` API

5. **標註 AI 生成內容**
   - 設定 `selfDeclaredMadeForKids=false`
   - 標註 AI 生成（YouTube 政策要求）

---

### 3.6 錯誤處理與重試邏輯

#### 3.6.1 重試策略

**指數退避（Exponential Backoff）**

```python
def retry_with_backoff(func, max_retries=3, delays=[2, 5, 10]):
    for attempt in range(max_retries):
        try:
            return func()
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(delays[attempt])
            else:
                raise
```

#### 3.6.2 降級策略

**虛擬主播失敗：**
- 跳過虛擬主播
- 使用純音訊 + 圖片

**部分圖片失敗：**
- 標記失敗圖片
- 提供選項：使用佔位圖 / 移除該段落
