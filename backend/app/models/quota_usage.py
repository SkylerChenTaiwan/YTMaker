"""配額使用記錄模型"""

from sqlalchemy import Column, Date, Index, Integer, String

from app.models.base import Base


class QuotaUsage(Base):
    """API 配額使用記錄

    追蹤各個 API 服務的每日配額使用情況
    """

    __tablename__ = "quota_usage"

    id = Column(Integer, primary_key=True, index=True)
    service = Column(String(50), nullable=False)  # "youtube", "gemini", "stability", "did"
    date = Column(Date, nullable=False, index=True)
    used_units = Column(Integer, default=0, nullable=False)

    __table_args__ = (
        # 為 (service, date) 建立複合索引以加速查詢
        Index("idx_service_date", "service", "date", unique=True),
    )

    def __repr__(self):
        return f"<QuotaUsage(service={self.service}, date={self.date}, used={self.used_units})>"
