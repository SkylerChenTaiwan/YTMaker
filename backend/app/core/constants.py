"""應用常數"""

# 支援的語音性別
VOICE_GENDERS = ["male", "female"]

# 常見的 Gemini 模型（非限制性列表，系統接受所有以 gemini- 開頭的模型）
GEMINI_MODELS = ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.5-flash-preview-05-20"]

# 專案狀態
PROJECT_STATUS = [
    "draft",  # 草稿
    "generating",  # 生成中
    "completed",  # 已完成
    "failed",  # 失敗
    "cancelled",  # 已取消
]

# 影片隱私設定
VIDEO_PRIVACY = ["public", "unlisted", "private"]

# 發布方式
PUBLISH_METHODS = ["immediate", "scheduled"]
