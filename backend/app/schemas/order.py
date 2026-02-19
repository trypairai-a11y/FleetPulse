import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class CapturedOrderResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    driver_id: uuid.UUID
    device_id: uuid.UUID | None
    platform: str
    order_ref: str | None
    status: str
    parsed_data: dict | None
    amount: Decimal | None
    captured_at: datetime

    model_config = {"from_attributes": True}


class OrderSummaryResponse(BaseModel):
    date: str
    total: int
    by_platform: dict[str, int]
    total_amount: float
    by_platform_amount: dict[str, float]
    top_drivers: list[dict]

class HourlyDistribution(BaseModel):
    hour: int
    count: int
