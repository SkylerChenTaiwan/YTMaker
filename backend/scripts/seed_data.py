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
            content="""請根據以下內容生成一段 YouTube 影片腳本：

內容：{content}

要求：
1. 影片總長度約 {duration} 分鐘
2. 分成 {num_segments} 個段落
3. 每個段落包含清晰的主題句和詳細說明
4. 語氣輕鬆、易懂、吸引觀眾
5. 最後加上 CTA (Call To Action)

請以 JSON 格式回傳，格式如下：
{{
  "segments": [
    {{"text": "段落文字", "duration": 秒數}},
    ...
  ]
}}""",
            is_default=True,
            usage_count=0,
        ),
        PromptTemplate(
            name="教學型影片範本",
            content="""請生成一段教學型 YouTube 影片腳本...""",
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
