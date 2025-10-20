import pytest
from app.utils.prompt_template import PromptTemplateEngine


@pytest.fixture
def template_engine():
    """PromptTemplateEngine fixture"""
    return PromptTemplateEngine()


def test_render_simple_variables(template_engine):
    """測試 4：Prompt 模板引擎（變數替換）"""
    template = """你是一個專業的 YouTube 影片腳本撰寫助手。

【原始內容】
{content}

【輸出格式要求】
1. 將內容拆分為多個段落
2. 每個段落時長控制在 {min_duration}-{max_duration} 秒
3. 生成 YouTube metadata
"""

    variables = {
        "content": "這是一篇關於 Python 的文章...",
        "min_duration": 5,
        "max_duration": 20
    }

    rendered = template_engine.render(template, variables)

    # 驗證：{content} 被正確替換
    assert "這是一篇關於 Python 的文章..." in rendered
    assert "{content}" not in rendered

    # 驗證：{min_duration} 和 {max_duration} 被正確替換
    assert "5-20 秒" in rendered
    assert "{min_duration}" not in rendered
    assert "{max_duration}" not in rendered


def test_render_missing_variable(template_engine):
    """測試：缺少變數時不會出錯（保留原樣或根據設計）"""
    template = "這是 {var1} 和 {var2} 的測試"

    variables = {
        "var1": "變數一"
        # var2 缺失
    }

    rendered = template_engine.render(template, variables)

    # 驗證：var1 被替換
    assert "變數一" in rendered

    # 驗證：var2 保留原樣
    assert "{var2}" in rendered


def test_render_empty_variables(template_engine):
    """測試：空變數字典"""
    template = "這是一個沒有變數的模板"

    variables = {}

    rendered = template_engine.render(template, variables)

    # 驗證：模板保持原樣
    assert rendered == template


def test_render_special_characters(template_engine):
    """測試：包含特殊字符的變數值"""
    template = "用戶輸入：{user_input}"

    variables = {
        "user_input": "包含 {} [] () 等特殊符號"
    }

    rendered = template_engine.render(template, variables)

    # 驗證：特殊字符正確替換
    assert "包含 {} [] () 等特殊符號" in rendered
    assert "{user_input}" not in rendered
