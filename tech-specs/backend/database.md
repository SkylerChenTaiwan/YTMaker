# 資料模型 (Data Models)

## 關聯文件
- [後端總覽](./overview.md)
- [API 設計 - 專案管理](./api-projects.md)
- [API 設計 - 配置管理](./api-configurations.md)
- [API 設計 - YouTube 授權](./api-youtube.md)
- [業務邏輯](./business-logic.md)

---

## 2.1 資料庫 Schema 設計

### 2.1.1 Project（專案）

**資料表名稱：** `projects`

| 欄位名稱 | 類型 | 約束 | 說明 |
|---------|------|------|------|
| id | UUID | PRIMARY KEY | 專案 ID |
| name | VARCHAR(200) | NOT NULL | 專案名稱 |
| content | TEXT | NOT NULL | 原始文字內容 |
| status | ENUM | NOT NULL | 專案狀態（見下方） |
| configuration | JSON | NULLABLE | 視覺化配置 |
| prompt_template_id | UUID | FOREIGN KEY | Prompt 範本 ID |
| gemini_model | VARCHAR(50) | NOT NULL | Gemini 模型名稱 |
| youtube_settings | JSON | NULLABLE | YouTube 設定 |
| youtube_video_id | VARCHAR(50) | NULLABLE | YouTube 影片 ID |
| script | JSON | NULLABLE | 生成的腳本 |
| created_at | TIMESTAMP | NOT NULL | 建立時間 |
| updated_at | TIMESTAMP | NOT NULL | 最後更新時間 |

**Status 枚舉值：**
- `INITIALIZED` - 已初始化
- `SCRIPT_GENERATING` - 腳本生成中
- `SCRIPT_GENERATED` - 腳本已生成
- `ASSETS_GENERATING` - 素材生成中
- `ASSETS_GENERATED` - 素材已生成
- `RENDERING` - 影片渲染中
- `RENDERED` - 影片已渲染
- `THUMBNAIL_GENERATING` - 封面生成中
- `THUMBNAIL_GENERATED` - 封面已生成
- `UPLOADING` - 上傳中
- `COMPLETED` - 已完成
- `FAILED` - 失敗
- `PAUSED` - 暫停

**索引：**
- `idx_status` ON `status`
- `idx_created_at` ON `created_at`
- `idx_updated_at` ON `updated_at`

---

### 2.1.2 Configuration（配置模板）

**資料表名稱：** `configurations`

| 欄位名稱 | 類型 | 約束 | 說明 |
|---------|------|------|------|
| id | UUID | PRIMARY KEY | 配置 ID |
| name | VARCHAR(200) | NOT NULL | 配置名稱 |
| configuration | JSON | NOT NULL | 配置內容 |
| created_at | TIMESTAMP | NOT NULL | 建立時間 |
| last_used_at | TIMESTAMP | NULLABLE | 最後使用時間 |
| usage_count | INTEGER | DEFAULT 0 | 使用次數 |

**索引：**
- `idx_last_used_at` ON `last_used_at`

---

### 2.1.3 PromptTemplate（Prompt 範本）

**資料表名稱：** `prompt_templates`

| 欄位名稱 | 類型 | 約束 | 說明 |
|---------|------|------|------|
| id | UUID | PRIMARY KEY | 範本 ID |
| name | VARCHAR(200) | NOT NULL | 範本名稱 |
| content | TEXT | NOT NULL | Prompt 內容 |
| is_default | BOOLEAN | DEFAULT FALSE | 是否為預設範本 |
| created_at | TIMESTAMP | NOT NULL | 建立時間 |
| usage_count | INTEGER | DEFAULT 0 | 使用次數 |

**索引：**
- `idx_is_default` ON `is_default`

---

### 2.1.4 YouTubeAccount（YouTube 帳號）

**資料表名稱：** `youtube_accounts`

| 欄位名稱 | 類型 | 約束 | 說明 |
|---------|------|------|------|
| id | UUID | PRIMARY KEY | 帳號 ID |
| channel_name | VARCHAR(200) | NOT NULL | 頻道名稱 |
| channel_id | VARCHAR(100) | NOT NULL UNIQUE | YouTube 頻道 ID |
| access_token | TEXT | NOT NULL | OAuth Access Token（加密） |
| refresh_token | TEXT | NOT NULL | OAuth Refresh Token（加密） |
| token_expires_at | TIMESTAMP | NOT NULL | Token 過期時間 |
| subscriber_count | INTEGER | DEFAULT 0 | 訂閱數 |
| is_authorized | BOOLEAN | DEFAULT TRUE | 是否已授權 |
| authorized_at | TIMESTAMP | NOT NULL | 授權時間 |

**索引：**
- `idx_channel_id` ON `channel_id`

---

### 2.1.5 Asset（素材）

**資料表名稱：** `assets`

| 欄位名稱 | 類型 | 約束 | 說明 |
|---------|------|------|------|
| id | UUID | PRIMARY KEY | 素材 ID |
| project_id | UUID | FOREIGN KEY | 專案 ID |
| type | ENUM | NOT NULL | 素材類型（見下方） |
| file_path | VARCHAR(500) | NOT NULL | 檔案路徑 |
| status | ENUM | NOT NULL | 素材狀態 |
| segment_index | INTEGER | NULLABLE | 段落索引（若為圖片） |
| created_at | TIMESTAMP | NOT NULL | 建立時間 |

**Type 枚舉值：**
- `AUDIO` - 語音
- `IMAGE` - 圖片
- `AVATAR_INTRO` - 開場虛擬主播
- `AVATAR_OUTRO` - 結尾虛擬主播
- `THUMBNAIL` - 封面
- `FINAL_VIDEO` - 最終影片

**Status 枚舉值：**
- `PENDING` - 等待生成
- `GENERATING` - 生成中
- `COMPLETED` - 已完成
- `FAILED` - 失敗

**索引：**
- `idx_project_id` ON `project_id`
- `idx_type` ON `type`

---

### 2.1.6 BatchTask（批次任務）

**資料表名稱：** `batch_tasks`

| 欄位名稱 | 類型 | 約束 | 說明 |
|---------|------|------|------|
| id | UUID | PRIMARY KEY | 批次任務 ID |
| name | VARCHAR(200) | NOT NULL | 任務名稱 |
| total_projects | INTEGER | NOT NULL | 總專案數 |
| completed_projects | INTEGER | DEFAULT 0 | 已完成數 |
| failed_projects | INTEGER | DEFAULT 0 | 失敗數 |
| status | ENUM | NOT NULL | 任務狀態 |
| created_at | TIMESTAMP | NOT NULL | 建立時間 |

**Status 枚舉值：**
- `QUEUED` - 排隊中
- `RUNNING` - 執行中
- `COMPLETED` - 已完成
- `FAILED` - 失敗

**索引：**
- `idx_status` ON `status`
- `idx_created_at` ON `created_at`

---

### 2.1.7 SystemSettings（系統設定）

**資料表名稱：** `system_settings`

| 欄位名稱 | 類型 | 約束 | 說明 |
|---------|------|------|------|
| key | VARCHAR(100) | PRIMARY KEY | 設定鍵 |
| value | TEXT | NOT NULL | 設定值（JSON） |
| updated_at | TIMESTAMP | NOT NULL | 最後更新時間 |

**常用設定鍵：**
- `default_voice_gender` - 預設語音性別
- `default_voice_speed` - 預設語速
- `default_privacy` - 預設隱私設定
- `project_retention_days` - 專案保留天數
- `keep_intermediate_assets` - 是否保留中間素材
- `notification_enabled` - 是否啟用通知

---

## 2.2 資料關聯設計

```
projects (1) ─── (N) assets
projects (N) ─── (1) prompt_templates
projects (N) ─── (1) configurations
batch_tasks (1) ─── (N) projects
```

**關聯說明：**
- 一個專案可以有多個素材（語音、圖片、虛擬主播、封面、最終影片）
- 多個專案可以使用同一個 Prompt 範本
- 多個專案可以使用同一個配置模板
- 一個批次任務包含多個專案
