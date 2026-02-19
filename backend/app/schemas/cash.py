import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel


class CashRecordCreate(BaseModel):
    driver_id: uuid.UUID
    date: date
    record_type: str
    amount: Decimal
    receipt_url: str | None = None
    deposit_location: str | None = None
    reference_number: str | None = None
    notes: str | None = None


class CashRecordUpdate(BaseModel):
    status: str | None = None
    notes: str | None = None


class CashRecordResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    driver_id: uuid.UUID
    date: date
    record_type: str
    amount: Decimal
    receipt_url: str | None
    deposit_location: str | None
    reference_number: str | None
    status: str
    verified_by: uuid.UUID | None
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class CashSummaryResponse(BaseModel):
    collected: float
    deposited: float
    outstanding: float
    verified: float

class OutstandingDriverResponse(BaseModel):
    driver_id: str
    driver_name: str
    amount: float
    oldest_date: str
