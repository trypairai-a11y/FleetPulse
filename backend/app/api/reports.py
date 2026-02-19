"""Report generation, history, and download endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.report import GeneratedReport
from app.models.user import User
from app.schemas.report import (
    GeneratedReportResponse,
    ReportGenerateRequest,
    ReportListResponse,
)
from app.services.storage_service import storage_service


router = APIRouter(prefix="/api/reports", tags=["reports"])


def _report_to_response(report: GeneratedReport) -> GeneratedReportResponse:
    return GeneratedReportResponse(
        id=report.id,
        report_type=report.report_type,
        format=report.format,
        filename=report.filename,
        file_size=report.file_size,
        date_from=report.date_from,
        date_to=report.date_to,
        filters=report.filters or {},
        download_url=f"/api/reports/{report.id}/download",
        created_at=report.created_at,
    )


@router.post("/generate", response_model=GeneratedReportResponse)
async def generate_report(
    body: ReportGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a report, store it, and return metadata with download URL."""
    from app.services.report_service import generate_report

    try:
        file_bytes, filename, content_type = await generate_report(
            report_type=body.report_type,
            format=body.format,
            date_from=body.date_from,
            date_to=body.date_to,
            filters=body.filters or {},
            db=db,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

    # Store file
    storage_path = f"{current_user.tenant_id}/reports/{uuid.uuid4()}/{filename}"
    await storage_service.upload(file_bytes, storage_path, content_type)

    # Save record
    report = GeneratedReport(
        tenant_id=current_user.tenant_id,
        report_type=body.report_type,
        format=body.format,
        filename=filename,
        storage_path=storage_path,
        file_size=len(file_bytes),
        date_from=body.date_from,
        date_to=body.date_to,
        filters=body.filters or {},
        created_by=current_user.id,
    )
    db.add(report)
    await db.flush()

    return _report_to_response(report)


@router.get("", response_model=ReportListResponse)
async def list_reports(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    report_type: str | None = Query(None),
    format: str | None = Query(None, alias="format"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List generated reports for the current tenant, newest first."""
    base = select(GeneratedReport)
    if report_type:
        base = base.where(GeneratedReport.report_type == report_type)
    if format:
        base = base.where(GeneratedReport.format == format)

    # Count
    count_result = await db.execute(
        select(func.count()).select_from(base.subquery())
    )
    total = count_result.scalar() or 0

    # Paginated results
    stmt = (
        base
        .order_by(GeneratedReport.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    result = await db.execute(stmt)
    reports = result.scalars().all()

    return ReportListResponse(
        items=[_report_to_response(r) for r in reports],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/{report_id}/download")
async def download_report(
    report_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Download a previously generated report by ID."""
    result = await db.execute(
        select(GeneratedReport).where(GeneratedReport.id == report_id)
    )
    report = result.scalar_one_or_none()

    if report is None:
        raise HTTPException(404, "Report not found")

    # Get the download URL from storage
    url = storage_service.get_url(report.storage_path)

    # For local storage, read the file and return it directly
    if not url.startswith("http"):
        import asyncio
        from pathlib import Path

        uploads_dir = Path(__file__).resolve().parents[2] / "uploads"
        file_path = uploads_dir / report.storage_path

        loop = asyncio.get_running_loop()
        try:
            file_bytes = await loop.run_in_executor(None, file_path.read_bytes)
        except FileNotFoundError:
            raise HTTPException(404, "Report file not found on disk")

        content_types = {
            "pdf": "application/pdf",
            "excel": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "csv": "text/csv",
        }
        return Response(
            content=file_bytes,
            media_type=content_types.get(report.format, "application/octet-stream"),
            headers={
                "Content-Disposition": f'attachment; filename="{report.filename}"',
            },
        )

    # For S3 storage, redirect to the presigned URL
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=url)
