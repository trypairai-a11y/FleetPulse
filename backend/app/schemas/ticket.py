import uuid
from datetime import datetime

from pydantic import BaseModel


class TicketCreate(BaseModel):
    title: str
    title_ar: str | None = None
    description: str | None = None
    category: str
    priority: str = "medium"
    driver_id: uuid.UUID | None = None
    vehicle_id: uuid.UUID | None = None
    assigned_to: uuid.UUID | None = None
    data: dict = {}


class TicketUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    priority: str | None = None
    status: str | None = None
    assigned_to: uuid.UUID | None = None
    data: dict | None = None


class TicketResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    title: str
    title_ar: str | None
    description: str | None
    category: str
    priority: str
    status: str
    driver_id: uuid.UUID | None
    vehicle_id: uuid.UUID | None
    assigned_to: uuid.UUID | None
    created_by: uuid.UUID | None
    data: dict
    resolved_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TicketCommentCreate(BaseModel):
    content: str
    attachments: list = []


class TicketCommentResponse(BaseModel):
    id: uuid.UUID
    ticket_id: uuid.UUID
    user_id: uuid.UUID | None
    content: str
    attachments: list
    created_at: datetime

    model_config = {"from_attributes": True}


class TicketStatsResponse(BaseModel):
    by_status: dict[str, int]
    by_category: dict[str, int]
    by_priority: dict[str, int]
    avg_resolution_hours: float
