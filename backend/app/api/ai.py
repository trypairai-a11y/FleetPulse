"""AI endpoints: chat (SSE), alerts, digest, scores."""

import json
import uuid
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db, require_role
from app.models.ai import AIChatHistory, AIDigest, AIScore, Alert
from app.models.user import User
from app.schemas.ai import (
    AlertResponse, AlertUpdate, ChatRequest, DigestResponse, ScoreResponse,
)

router = APIRouter(prefix="/api/ai", tags=["ai"])

KWT = timezone(timedelta(hours=3))


# ── Chat (SSE streaming) ──

@router.post("/chat")
async def ai_chat(
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Stream AI chat response via Server-Sent Events."""
    from app.ai.claude_client import stream_chat
    from app.ai.tools import FLEET_TOOLS
    from app.ai.tool_executor import execute_tool

    # Save user message
    user_msg = AIChatHistory(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        channel="web",
        role="user",
        content=body.message,
    )
    db.add(user_msg)
    await db.flush()

    # Load recent chat history for context (last 20 messages)
    history_result = await db.execute(
        select(AIChatHistory)
        .where(
            AIChatHistory.tenant_id == current_user.tenant_id,
            AIChatHistory.user_id == current_user.id,
        )
        .order_by(AIChatHistory.created_at.desc())
        .limit(20)
    )
    history_rows = list(reversed(history_result.scalars().all()))

    messages = []
    for h in history_rows:
        msg = {"role": h.role, "content": h.content}
        messages.append(msg)

    async def event_stream():
        nonlocal messages
        full_response = ""
        all_tool_calls = []
        max_tool_rounds = 3
        round_count = 0

        while round_count < max_tool_rounds:
            round_count += 1
            round_tool_calls = []

            async for chunk in stream_chat(messages, tools=FLEET_TOOLS):
                if chunk["type"] == "text_delta":
                    full_response += chunk["text"]
                    yield f"data: {json.dumps({'type': 'text', 'content': chunk['text']})}\n\n"

                elif chunk["type"] == "tool_use":
                    round_tool_calls.append(chunk)
                    yield f"data: {json.dumps({'type': 'tool_call', 'name': chunk['name']})}\n\n"

                elif chunk["type"] == "message_end":
                    if not chunk.get("tool_calls"):
                        pass  # No tools, final message

            if not round_tool_calls:
                break

            all_tool_calls.extend(round_tool_calls)

            # Build assistant message with tool_use blocks
            assistant_content = []
            if full_response:
                assistant_content.append({"type": "text", "text": full_response})
            for tc in round_tool_calls:
                assistant_content.append({
                    "type": "tool_use",
                    "id": tc["id"],
                    "name": tc["name"],
                    "input": tc["input"],
                })
            messages.append({"role": "assistant", "content": assistant_content})

            # Execute tools and build tool_result message
            tool_results = []
            for tc in round_tool_calls:
                result = await execute_tool(tc["name"], tc["input"], db)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tc["id"],
                    "content": json.dumps(result, ensure_ascii=False, default=str),
                })
            messages.append({"role": "user", "content": tool_results})

            # Reset for next streaming round
            full_response = ""

        # Save assistant response
        assistant_msg = AIChatHistory(
            tenant_id=current_user.tenant_id,
            user_id=current_user.id,
            channel="web",
            role="assistant",
            content=full_response,
            tool_calls=[{"name": tc["name"], "input": tc["input"]} for tc in all_tool_calls] if all_tool_calls else None,
        )
        db.add(assistant_msg)
        await db.flush()

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── Chat History ──

@router.get("/chat/history")
async def get_chat_history(
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AIChatHistory)
        .where(
            AIChatHistory.tenant_id == current_user.tenant_id,
            AIChatHistory.user_id == current_user.id,
        )
        .order_by(AIChatHistory.created_at.desc())
        .limit(limit)
    )
    messages = list(reversed(result.scalars().all()))
    return [
        {
            "id": str(m.id),
            "role": m.role,
            "content": m.content,
            "tool_calls": m.tool_calls,
            "created_at": m.created_at.isoformat(),
        }
        for m in messages
    ]


# ── Alerts ──

@router.get("/alerts")
async def get_alerts(
    status: str = Query(None),
    severity: str = Query(None),
    alert_type: str = Query(None, alias="type"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Alert)
    count_q = select(func.count(Alert.id))

    if status:
        q = q.where(Alert.status == status)
        count_q = count_q.where(Alert.status == status)
    if severity:
        q = q.where(Alert.severity == severity)
        count_q = count_q.where(Alert.severity == severity)
    if alert_type:
        q = q.where(Alert.type == alert_type)
        count_q = count_q.where(Alert.type == alert_type)

    total = (await db.execute(count_q)).scalar() or 0

    q = q.order_by(Alert.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(q)
    alerts = result.scalars().all()

    return {
        "items": [
            {
                "id": str(a.id),
                "type": a.type,
                "severity": a.severity,
                "title": a.title,
                "title_ar": a.title_ar,
                "message": a.message,
                "message_ar": a.message_ar,
                "driver_id": str(a.driver_id) if a.driver_id else None,
                "vehicle_id": str(a.vehicle_id) if a.vehicle_id else None,
                "data": a.data,
                "status": a.status,
                "acknowledged_by": str(a.acknowledged_by) if a.acknowledged_by else None,
                "acknowledged_at": a.acknowledged_at.isoformat() if a.acknowledged_at else None,
                "created_at": a.created_at.isoformat(),
            }
            for a in alerts
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


@router.get("/alerts/count")
async def get_alert_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    count = (await db.execute(
        select(func.count(Alert.id)).where(Alert.status == "active")
    )).scalar() or 0
    return {"count": count}


@router.patch("/alerts/{alert_id}")
async def update_alert(
    alert_id: str,
    body: AlertUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Alert).where(Alert.id == uuid.UUID(alert_id))
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(404, "Alert not found")

    alert.status = body.status
    if body.status == "acknowledged":
        alert.acknowledged_by = current_user.id
        alert.acknowledged_at = datetime.now(KWT)

    await db.flush()
    return {"status": "updated", "id": alert_id}


# ── Digest ──

@router.get("/digest")
async def get_latest_digest(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AIDigest).order_by(AIDigest.date.desc()).limit(1)
    )
    digest = result.scalar_one_or_none()
    if not digest:
        return {"message": "No digest available yet", "digest": None}
    return {
        "digest": {
            "id": str(digest.id),
            "date": digest.date.isoformat(),
            "content": digest.content,
            "content_ar": digest.content_ar,
            "generated_at": digest.generated_at.isoformat(),
        }
    }


@router.get("/digests")
async def get_digests(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    total = (await db.execute(select(func.count(AIDigest.id)))).scalar() or 0
    result = await db.execute(
        select(AIDigest)
        .order_by(AIDigest.date.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    digests = result.scalars().all()
    return {
        "items": [
            {
                "id": str(d.id),
                "date": d.date.isoformat(),
                "content": d.content,
                "content_ar": d.content_ar,
                "generated_at": d.generated_at.isoformat(),
            }
            for d in digests
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


@router.post("/digest/generate")
async def generate_digest(
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    from app.ai.digest import generate_daily_digest
    result = await generate_daily_digest(db, current_user.tenant_id)
    return result


# ── Scores ──

@router.get("/scores")
async def get_scores(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort: str = Query("desc", pattern="^(asc|desc)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get latest scores for all drivers."""
    from sqlalchemy import and_

    # Subquery: latest date per driver
    subq = (
        select(
            AIScore.driver_id,
            func.max(AIScore.date).label("max_date"),
        )
        .group_by(AIScore.driver_id)
        .subquery()
    )

    base = (
        select(AIScore)
        .join(subq, and_(
            AIScore.driver_id == subq.c.driver_id,
            AIScore.date == subq.c.max_date,
        ))
    )

    total = (await db.execute(
        select(func.count()).select_from(base.subquery())
    )).scalar() or 0

    order = AIScore.composite_score.desc() if sort == "desc" else AIScore.composite_score.asc()
    result = await db.execute(
        base.order_by(order).offset((page - 1) * per_page).limit(per_page)
    )
    scores = result.scalars().all()

    return {
        "items": [
            {
                "id": str(s.id),
                "driver_id": str(s.driver_id),
                "date": s.date.isoformat(),
                "composite_score": float(s.composite_score),
                "attendance_score": float(s.attendance_score) if s.attendance_score else None,
                "punctuality_score": float(s.punctuality_score) if s.punctuality_score else None,
                "performance_score": float(s.performance_score) if s.performance_score else None,
                "maintenance_score": float(s.maintenance_score) if s.maintenance_score else None,
                "score_breakdown": s.score_breakdown,
                "trend": s.trend,
            }
            for s in scores
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


@router.get("/scores/{driver_id}")
async def get_driver_score_history(
    driver_id: str,
    limit: int = Query(30, ge=1, le=90),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AIScore)
        .where(AIScore.driver_id == uuid.UUID(driver_id))
        .order_by(AIScore.date.desc())
        .limit(limit)
    )
    scores = list(reversed(result.scalars().all()))

    return [
        {
            "id": str(s.id),
            "date": s.date.isoformat(),
            "composite_score": float(s.composite_score),
            "attendance_score": float(s.attendance_score) if s.attendance_score else None,
            "punctuality_score": float(s.punctuality_score) if s.punctuality_score else None,
            "performance_score": float(s.performance_score) if s.performance_score else None,
            "maintenance_score": float(s.maintenance_score) if s.maintenance_score else None,
            "trend": s.trend,
        }
        for s in scores
    ]


@router.post("/scores/compute")
async def trigger_score_computation(
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    from app.ai.scoring import compute_all_driver_scores
    count = await compute_all_driver_scores(db, current_user.tenant_id)
    return {"message": f"Computed scores for {count} drivers", "count": count}
