"""測試 QuotaService"""

from datetime import date
from unittest.mock import Mock

import pytest

from app.models.quota_usage import QuotaUsage
from app.services.quota_service import QuotaService


@pytest.fixture
def mock_db_session():
    """模擬資料庫 session"""
    return Mock()


class TestQuotaService:
    """QuotaService 測試套件"""

    @pytest.mark.asyncio
    async def test_check_quota_sufficient(self, mock_db_session):
        """測試配額檢查（配額充足）"""
        # 設定今日使用 3000 units
        today = date.today()
        mock_usage = QuotaUsage(service="youtube", date=today, used_units=3000)

        mock_db_session.query().filter().first.return_value = mock_usage

        # 執行測試
        service = QuotaService(mock_db_session)
        result = await service.check_quota("youtube", cost=1650)

        # 驗證：剩餘 7000 units，足夠上傳（需要 1650）
        assert result is True

    @pytest.mark.asyncio
    async def test_check_quota_insufficient(self, mock_db_session):
        """測試配額檢查（配額不足）"""
        # 設定今日使用 9000 units
        today = date.today()
        mock_usage = QuotaUsage(service="youtube", date=today, used_units=9000)

        mock_db_session.query().filter().first.return_value = mock_usage

        # 執行測試
        service = QuotaService(mock_db_session)
        result = await service.check_quota("youtube", cost=1650)

        # 驗證：剩餘 1000 units，不足夠上傳（需要 1650）
        assert result is False

    @pytest.mark.asyncio
    async def test_check_quota_no_usage_today(self, mock_db_session):
        """測試配額檢查（今日尚未使用）"""
        # 今日沒有使用記錄
        mock_db_session.query().filter().first.return_value = None

        # 執行測試
        service = QuotaService(mock_db_session)
        result = await service.check_quota("youtube", cost=1650)

        # 驗證：今日未使用，配額充足
        assert result is True

    @pytest.mark.asyncio
    async def test_record_usage_new_entry(self, mock_db_session):
        """測試記錄配額使用（新記錄）"""
        today = date.today()

        # 今日沒有使用記錄
        mock_db_session.query().filter().first.return_value = None

        # 執行測試
        service = QuotaService(mock_db_session)
        await service.record_usage("youtube", cost=1600)

        # 驗證：建立新記錄
        assert mock_db_session.add.called
        # 取得 add() 被調用時的參數
        added_usage = mock_db_session.add.call_args[0][0]
        assert added_usage.service == "youtube"
        assert added_usage.date == today
        assert added_usage.used_units == 1600
        assert mock_db_session.commit.called

    @pytest.mark.asyncio
    async def test_record_usage_update_existing(self, mock_db_session):
        """測試記錄配額使用（更新現有記錄）"""
        today = date.today()
        mock_usage = QuotaUsage(service="youtube", date=today, used_units=1600)

        mock_db_session.query().filter().first.return_value = mock_usage

        # 執行測試
        service = QuotaService(mock_db_session)
        await service.record_usage("youtube", cost=50)

        # 驗證：更新現有記錄
        assert mock_usage.used_units == 1650  # 1600 + 50
        assert mock_db_session.commit.called

    @pytest.mark.asyncio
    async def test_get_quota_usage(self, mock_db_session):
        """測試查詢配額使用情況"""
        query_date = date.today()
        mock_usage = QuotaUsage(service="youtube", date=query_date, used_units=3200)

        mock_db_session.query().filter().first.return_value = mock_usage

        # 執行測試
        service = QuotaService(mock_db_session)
        result = await service.get_quota_usage("youtube", query_date)

        # 驗證
        assert result["service"] == "youtube"
        assert result["date"] == query_date.isoformat()
        assert result["total_quota"] == 10000
        assert result["used_units"] == 3200
        assert result["remaining_units"] == 6800
        # 3200 / (1600 + 50) ≈ 1.93，取整數為 1
        assert result["uploads_today"] == 1
        assert result["can_upload"] is True

    @pytest.mark.asyncio
    async def test_get_quota_usage_no_record(self, mock_db_session):
        """測試查詢配額使用情況（無記錄）"""
        query_date = date.today()

        # 今日沒有使用記錄
        mock_db_session.query().filter().first.return_value = None

        # 執行測試
        service = QuotaService(mock_db_session)
        result = await service.get_quota_usage("youtube", query_date)

        # 驗證
        assert result["used_units"] == 0
        assert result["remaining_units"] == 10000
        assert result["uploads_today"] == 0
        assert result["can_upload"] is True

    @pytest.mark.asyncio
    async def test_get_quota_usage_cannot_upload(self, mock_db_session):
        """測試查詢配額使用情況（配額不足，無法上傳）"""
        query_date = date.today()
        # 今日已使用 9500 units
        mock_usage = QuotaUsage(service="youtube", date=query_date, used_units=9500)

        mock_db_session.query().filter().first.return_value = mock_usage

        # 執行測試
        service = QuotaService(mock_db_session)
        result = await service.get_quota_usage("youtube", query_date)

        # 驗證
        assert result["used_units"] == 9500
        assert result["remaining_units"] == 500
        # 剩餘 500 < 1650（影片 1600 + 封面 50），無法上傳
        assert result["can_upload"] is False
