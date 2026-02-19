"""Schemas for AI endpoints."""

from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)


class ChatMessageResponse(BaseModel):
    id: str
    role: str
    content: str
    tool_calls: list[dict] | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AlertResponse(BaseModel):
    id: str
    type: str
    severity: str
    title: str
    title_ar: str | None = None
    message: str
    message_ar: str | None = None
    driver_id: str | None = None
    vehicle_id: str | None = None
    data: dict = {}
    status: str
    acknowledged_by: str | None = None
    acknowledged_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AlertUpdate(BaseModel):
    status: str = Field(..., pattern="^(acknowledged|dismissed|resolved)$")


class DigestResponse(BaseModel):
    id: str
    date: str
    content: dict
    content_ar: dict | None = None
    generated_at: datetime

    model_config = {"from_attributes": True}


class ScoreResponse(BaseModel):
    id: str
    driver_id: str
    date: str
    composite_score: float
    attendance_score: float | None = None
    punctuality_score: float | None = None
    performance_score: float | None = None
    maintenance_score: float | None = None
    score_breakdown: dict = {}
    trend: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
