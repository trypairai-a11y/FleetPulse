import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, field_validator


VALID_REPORT_TYPES = {"attendance", "orders", "performance", "maintenance", "cash", "fleet_overview"}
VALID_FORMATS = {"pdf", "excel", "csv"}


class ReportGenerateRequest(BaseModel):
    report_type: str
    format: str
    date_from: date | None = None
    date_to: date | None = None
    filters: dict[str, Any] | None = None

    @field_validator("report_type")
    @classmethod
    def validate_report_type(cls, v: str) -> str:
        if v not in VALID_REPORT_TYPES:
            raise ValueError(
                f"Invalid report_type '{v}'. Must be one of: {', '.join(sorted(VALID_REPORT_TYPES))}"
            )
        return v

    @field_validator("format")
    @classmethod
    def validate_format(cls, v: str) -> str:
        if v not in VALID_FORMATS:
            raise ValueError(
                f"Invalid format '{v}'. Must be one of: {', '.join(sorted(VALID_FORMATS))}"
            )
        return v


class ReportResponse(BaseModel):
    id: str
    report_type: str
    format: str
    filename: str
    status: str
    created_at: datetime


class GeneratedReportResponse(BaseModel):
    id: uuid.UUID
    report_type: str
    format: str
    filename: str
    file_size: int
    date_from: date | None = None
    date_to: date | None = None
    filters: dict[str, Any] = {}
    download_url: str
    created_at: datetime


class ReportListResponse(BaseModel):
    items: list[GeneratedReportResponse]
    total: int
    page: int
    per_page: int
