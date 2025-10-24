"""
Seed test data into the database.

Usage:
    python scripts/seed_data.py
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.asset import Asset, AssetStatus, AssetType
from app.models.configuration import Configuration
from app.models.project import Project, ProjectStatus
from app.models.prompt_template import PromptTemplate
from app.models.system_settings import SystemSettings

# Database URL
DATABASE_URL = "sqlite:///./ytmaker.db"

# Create engine and session
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()


def seed_prompt_templates():
    """Seed default prompt templates."""
    templates = [
        PromptTemplate(
            name="預設 YouTube 腳本範本",
            content="""你是一個專業的 YouTube 影片腳本創作者。請根據以下內容生成一個完整的影片腳本。

---

**內容來源：**
{content}

---

**輸出要求：**

請以 JSON 格式回傳，必須嚴格遵循以下 schema：

{{
  "title": "影片標題（吸引人、簡潔、50 字以內）",
  "description": "影片描述（包含關鍵字、150-300 字）",
  "tags": ["標籤1", "標籤2", "標籤3", ...],
  "segments": [
    {{
      "type": "intro" | "content" | "outro",
      "text": "這個段落的旁白文字",
      "duration": 整數（秒數，建議 5-20 秒）,
      "image_description": "這個段落適合搭配的畫面描述（詳細、具體、適合生成圖片）"
    }},
    ...
  ]
}}

**段落類型說明：**
- intro: 開場段落（1 個），介紹主題、吸引觀眾
- content: 內容段落（多個），詳細說明主題
- outro: 結尾段落（1 個），總結、CTA

**段落時長建議：**
- intro: 5-10 秒
- content: 10-20 秒（每段）
- outro: 5-10 秒

**圖片描述要求：**
- 具體、詳細、視覺化
- 適合用於圖片生成 AI
- 與旁白內容高度相關
- 範例："一個現代化的辦公室場景，一位年輕專業人士在電腦前工作，螢幕顯示圖表和數據，明亮的自然光從窗戶透入"

**風格要求：**
- 語氣：輕鬆、專業、易懂
- 目標觀眾：一般大眾
- 總標籤數：5-10 個相關標籤""",
            is_default=True,
            usage_count=0,
        ),
        PromptTemplate(
            name="教學型影片範本",
            content="""你是一個專業的教學影片腳本創作者。請根據以下內容生成一個教學型影片腳本。

---

**教學內容：**
{content}

---

**輸出要求：**

請以 JSON 格式回傳，必須嚴格遵循以下 schema：

{{
  "title": "教學影片標題（清楚說明學習目標，50 字以內）",
  "description": "影片描述（包含學習重點、適合對象、150-300 字）",
  "tags": ["教學", "學習", ...],
  "segments": [
    {{
      "type": "intro" | "content" | "outro",
      "text": "這個段落的教學旁白",
      "duration": 整數（秒數，5-20 秒）,
      "image_description": "教學畫面描述（清楚展示步驟或概念）"
    }},
    ...
  ]
}}

**教學段落要求：**
- intro: 說明本次教學目標與大綱（1 個）
- content: 步驟式教學內容（3-8 個），每個段落專注一個步驟或概念
- outro: 總結重點與鼓勵（1 個）

**教學腳本特點：**
- 清晰的步驟說明
- 適當的重複與強調
- 鼓勵與引導語氣
- 實用的範例說明

**圖片描述重點：**
- 清楚展示操作步驟
- 標註重點區域
- 使用圖表或示意圖""",
            is_default=False,
            usage_count=0,
        ),
    ]
    db.add_all(templates)
    db.commit()
    print(f"✅ Seeded {len(templates)} prompt templates")
    return templates


def seed_configurations():
    """Seed default configurations."""
    configs = [
        Configuration(
            name="預設視覺配置",
            configuration={
                "subtitle": {
                    "font_size": 48,
                    "color": "#FFFFFF",
                    "position": "bottom-center",
                    "background_opacity": 0.8,
                },
                "logo": {"position": "top-right", "opacity": 0.7, "size": "small"},
            },
            usage_count=0,
        ),
    ]
    db.add_all(configs)
    db.commit()
    print(f"✅ Seeded {len(configs)} configurations")
    return configs


def seed_system_settings():
    """Seed default system settings."""
    settings = [
        SystemSettings(key="default_voice_gender", value='"male"'),
        SystemSettings(key="default_voice_speed", value="1.0"),
        SystemSettings(key="default_privacy", value='"unlisted"'),
        SystemSettings(key="project_retention_days", value="30"),
        SystemSettings(key="keep_intermediate_assets", value="false"),
    ]
    db.add_all(settings)
    db.commit()
    print(f"✅ Seeded {len(settings)} system settings")


def seed_projects(templates):
    """Seed example projects."""
    projects = []

    # Project 1: Completed
    p1 = Project(
        name="如何學習 Python 程式設計",
        content="本影片將介紹 Python 的基礎語法..." * 50,
        status=ProjectStatus.COMPLETED,
        gemini_model="gemini-1.5-pro",
        prompt_template_id=templates[0].id,
        youtube_video_id="dQw4w9WgXcQ",
        script={"segments": [{"text": "開場白", "duration": 5}]},
    )
    projects.append(p1)

    # Project 2: Failed
    p2 = Project(
        name="AI 繪圖工具比較",
        content="本影片將比較 Midjourney, Stable Diffusion, DALL-E..." * 40,
        status=ProjectStatus.FAILED,
        gemini_model="gemini-1.5-flash",
        prompt_template_id=templates[0].id,
    )
    projects.append(p2)

    # Project 3: Rendering
    p3 = Project(
        name="最新 macOS 功能介紹",
        content="macOS Sequoia 帶來了許多新功能..." * 60,
        status=ProjectStatus.RENDERING,
        gemini_model="gemini-1.5-pro",
        prompt_template_id=templates[0].id,
        script={"segments": [{"text": "介紹新功能", "duration": 10}]},
    )
    projects.append(p3)

    db.add_all(projects)
    db.commit()
    print(f"✅ Seeded {len(projects)} projects")
    return projects


def seed_assets(projects):
    """Seed example assets."""
    assets = []

    # Assets for Project 1 (completed)
    assets.append(
        Asset(
            project_id=projects[0].id,
            type=AssetType.AUDIO,
            file_path="/data/projects/1/audio.mp3",
            status=AssetStatus.COMPLETED,
        )
    )
    assets.append(
        Asset(
            project_id=projects[0].id,
            type=AssetType.IMAGE,
            file_path="/data/projects/1/image_0.png",
            status=AssetStatus.COMPLETED,
            segment_index=0,
        )
    )
    assets.append(
        Asset(
            project_id=projects[0].id,
            type=AssetType.FINAL_VIDEO,
            file_path="/data/projects/1/final.mp4",
            status=AssetStatus.COMPLETED,
        )
    )

    db.add_all(assets)
    db.commit()
    print(f"✅ Seeded {len(assets)} assets")


def main():
    """Seed all test data."""
    print("🌱 Seeding test data...")

    try:
        templates = seed_prompt_templates()
        seed_configurations()
        seed_system_settings()
        projects = seed_projects(templates)
        seed_assets(projects)

        print("\n✅ All test data seeded successfully!")
        print("📊 Total records:")
        print(f"   - Projects: {len(projects)}")
        print(f"   - Templates: {len(templates)}")
        print("   - Configurations: 1")
        print("   - System Settings: 5")

    except Exception as e:
        print(f"\n❌ Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()
