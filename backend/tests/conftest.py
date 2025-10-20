import pytest


@pytest.fixture
def test_config():
    """測試配置"""
    return {
        "ENV": "test",
        "DEBUG": True,
    }
