# Task-002: 資料庫 Schema 設計與實作

> **建立日期：** 2025-10-19
> **狀態：** ⏳ 未開始
> **預計時間：** 8 小時
> **優先級：** P0 (必須)

---

## 關聯文件

### 技術規格
- **資料庫設計：** `tech-specs/backend/database.md`
- **API 設計：** `tech-specs/backend/api-design.md`
- **資料模型：** 10 個資料表定義

### 相關任務
- **前置任務：** Task-001 ✅ (專案初始化)
- **後續任務：** Task-004 ~ 009 (所有 API 實作)
- **依賴關係：** 所有需要資料庫操作的任務都依賴此任務

---

## 任務目標

### 簡述
使用 SQLAlchemy 實作所有 10 個資料模型，設計索引和關聯關係，建立資料庫遷移腳本，並準備測試資料。

### 成功標準
- [x] 10 個 SQLAlchemy 模型完整實作
- [x] 所有模型關聯關係正確定義
- [x] 必要欄位建立索引
- [x] Alembic 遷移腳本可正常執行
- [x] 資料庫初始化腳本完成
- [x] 測試資料 seeder 完成
- [x] 模型單元測試覆蓋率 > 80%

---

## 主要產出

### 1. 資料模型 (10 個)

#### projects (專案表)
- id, name, status, content_file_path
- script, youtube_metadata
- created_at, updated_at

#### assets (素材表)
- id, project_id, asset_type, status
- file_path, metadata
- created_at, updated_at

#### configurations (配置表)
- id, name, config_data, is_template
- created_at, updated_at

#### prompt_templates (Prompt 範本表)
- id, name, content, is_default
- usage_count, created_at, updated_at

#### youtube_accounts (YouTube 帳號表)
- id, channel_id, channel_name, access_token
- refresh_token, expires_at
- created_at, updated_at

#### visual_templates (視覺模板表)
- id, name, description, thumbnail_path
- config_data, usage_count
- created_at, updated_at

#### batch_tasks (批次任務表)
- id, name, status, total_count
- success_count, failed_count
- created_at, updated_at

#### batch_items (批次項目表)
- id, batch_id, project_id, status
- error_message, created_at

#### system_settings (系統設定表)
- id, key, value, category
- updated_at

#### api_keys (API 金鑰表)
- id, service_name, key_hash
- last_tested_at, status
- created_at, updated_at

### 2. 遷移腳本
- Alembic 配置
- 初始遷移腳本
- 版本控制

### 3. 測試資料
- 開發用測試資料
- 單元測試用 fixtures

---

## 資料庫關聯

```
projects (1) ----< (N) assets
projects (N) ----< (1) configurations
projects (N) ----< (1) youtube_accounts
batch_tasks (1) ----< (N) batch_items
batch_items (N) ----< (1) projects
```

---

## 索引設計

### projects 表
- `idx_status` on status
- `idx_created_at` on created_at

### assets 表
- `idx_project_id` on project_id
- `idx_type_status` on (asset_type, status)

### batch_items 表
- `idx_batch_id` on batch_id
- `idx_status` on status

---

## 驗證檢查

### 遷移測試
```bash
alembic upgrade head
# 應該成功建立所有資料表

alembic downgrade -1
# 應該成功回退一個版本

alembic upgrade head
# 應該再次成功升級
```

### 模型測試
```bash
pytest tests/models/
# 所有模型測試應通過
```

---

## 注意事項

1. **外鍵約束：** 確保所有外鍵正確設定級聯刪除規則
2. **時間戳：** 使用 UTC 時間，統一使用 `datetime.utcnow()`
3. **JSON 欄位：** 使用 SQLAlchemy JSON 類型儲存複雜資料
4. **索引效能：** 避免過度索引，只對頻繁查詢欄位建立索引

---

## 完成檢查清單

- [ ] 所有 10 個模型定義完成
- [ ] 模型關聯關係正確
- [ ] 必要索引已建立
- [ ] Alembic 配置完成
- [ ] 初始遷移腳本可執行
- [ ] 測試資料 seeder 完成
- [ ] 模型單元測試完成
- [ ] 測試覆蓋率 > 80%
- [ ] 資料庫文件已更新
