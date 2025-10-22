# 測試 Fixtures

這個目錄包含用於測試的靜態資源檔案。

## 檔案清單

### 圖片檔案

- **test-image.png**: 測試用圖片（當前為 1x1 像素的最小 PNG）
  - 用途：模擬使用者上傳的圖片、Stability AI 生成的圖片
  - 建議：替換為真實的 1920x1080 測試圖片以獲得更真實的測試結果

- **test-logo.png**: 測試用 Logo（當前為 1x1 像素的最小 PNG）
  - 用途：模擬 Logo 上傳、小型圖示測試
  - 建議：替換為真實的 100x100 Logo 圖片

### 文字檔案

- **test-content.txt**: 測試用文字內容（約 600 字）
  - 用途：模擬使用者輸入的文字內容，用於腳本生成測試
  - 內容：關於 AI 技術發展的繁體中文文章

## 重新生成圖片

如果需要重新生成最小 PNG 圖片：

```bash
cd frontend/tests/mocks/fixtures
node generate-images.js
```

## 使用真實圖片

為了獲得更真實的測試結果，建議替換為真實圖片：

```bash
# 將你的測試圖片複製到這個目錄
cp /path/to/your/test-image.png frontend/tests/mocks/fixtures/test-image.png
cp /path/to/your/test-logo.png frontend/tests/mocks/fixtures/test-logo.png
```

## 注意事項

- 這些檔案會被 Git 追蹤，確保它們的大小合理
- 建議測試圖片大小不超過 1MB
- 使用 PNG 格式以確保跨平台相容性
