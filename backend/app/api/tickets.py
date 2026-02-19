import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.utils import paginate
from app.dependencies import get_current_user, get_db, require_role
from app.models.ticket import Ticket, TicketComment
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.ticket import (
    TicketCommentCreate, TicketCommentResponse,
    TicketCreate, TicketResponse, TicketStatsResponse, TicketUpdate,
)

router = APIRouter(prefix="/api/tickets", tags=["tickets"])


@router.get("", response_model=PaginatedResponse[TicketResponse])
async def list_tickets(
    status_filter: str | None = Query(None, alias="status"),
    category: str | None = None,
    priority: str | None = None,
    driver_id: uuid.UUID | None = None,
    assigned_to: uuid.UUID | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Ticket)
    if status_filter:
        q = q.where(Ticket.status == status_filter)
    if category:
        q = q.where(Ticket.category == category)
    if priority:
        q = q.where(Ticket.priority == priority)
    if driver_id:
        q = q.where(Ticket.driver_id == driver_id)
    if assigned_to:
        q = q.where(Ticket.assigned_to == assigned_to)
    if search:
        q = q.where(Ticket.title.ilike(f"%{search}%"))
    q = q.order_by(Ticket.created_at.desc())

    result = await paginate(db, q, page, per_page)
    result["items"] = [TicketResponse.model_validate(t) for t in result["items"]]
    return result


@router.get("/stats", response_model=TicketStatsResponse)
async def ticket_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # By status
    status_result = await db.execute(
        select(Ticket.status, func.count()).group_by(Ticket.status)
    )
    by_status = {r[0]: r[1] for r in status_result.all()}

    # By category
    cat_result = await db.execute(
        select(Ticket.category, func.count()).group_by(Ticket.category)
    )
    by_category = {r[0]: r[1] for r in cat_result.all()}

    # By priority
    pri_result = await db.execute(
        select(Ticket.priority, func.count()).group_by(Ticket.priority)
    )
    by_priority = {r[0]: r[1] for r in pri_result.all()}

    # Avg resolution time
    avg_hours = (await db.execute(
        select(func.avg(
            func.extract("epoch", Ticket.resolved_at - Ticket.created_at) / 3600
        ))
        .where(Ticket.resolved_at.isnot(None))
    )).scalar() or 0

    return TicketStatsResponse(
        by_status=by_status,
        by_category=by_category,
        by_priority=by_priority,
        avg_resolution_hours=round(float(avg_hours), 1),
    )


@router.post("", response_model=TicketResponse, status_code=201)
async def create_ticket(
    body: TicketCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ticket = Ticket(
        tenant_id=current_user.tenant_id,
        created_by=current_user.id,
        **body.model_dump(),
    )
    db.add(ticket)
    await db.flush()
    return TicketResponse.model_validate(ticket)


@router.get("/{ticket_id}", response_model=TicketResponse)
async def get_ticket(
    ticket_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ticket not found")
    return TicketResponse.model_validate(ticket)


@router.put("/{ticket_id}", response_model=TicketResponse)
async def update_ticket(
    ticket_id: uuid.UUID,
    body: TicketUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ticket not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(ticket, field, value)

    return TicketResponse.model_validate(ticket)


@router.put("/{ticket_id}/assign", response_model=TicketResponse)
async def assign_ticket(
    ticket_id: uuid.UUID,
    user_id: uuid.UUID = Query(...),
    current_user: User = Depends(require_role("admin", "supervisor")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ticket not found")
    ticket.assigned_to = user_id
    if ticket.status == "open":
        ticket.status = "in_progress"
    return TicketResponse.model_validate(ticket)


@router.put("/{ticket_id}/resolve", response_model=TicketResponse)
async def resolve_ticket(
    ticket_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ticket not found")
    ticket.status = "resolved"
    ticket.resolved_at = datetime.now(timezone.utc)
    return TicketResponse.model_validate(ticket)


@router.put("/{ticket_id}/close", response_model=TicketResponse)
async def close_ticket(
    ticket_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ticket not found")
    ticket.status = "closed"
    return TicketResponse.model_validate(ticket)


# ── Comments ──
@router.get("/{ticket_id}/comments", response_model=list[TicketCommentResponse])
async def list_comments(
    ticket_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TicketComment)
        .where(TicketComment.ticket_id == ticket_id)
        .order_by(TicketComment.created_at.asc())
    )
    return [TicketCommentResponse.model_validate(c) for c in result.scalars().all()]


@router.post("/{ticket_id}/comments", response_model=TicketCommentResponse, status_code=201)
async def add_comment(
    ticket_id: uuid.UUID,
    body: TicketCommentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    comment = TicketComment(
        tenant_id=current_user.tenant_id,
        ticket_id=ticket_id,
        user_id=current_user.id,
        content=body.content,
        attachments=body.attachments,
    )
    db.add(comment)
    await db.flush()
    return TicketCommentResponse.model_validate(comment)
