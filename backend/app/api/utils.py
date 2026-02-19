import math
from typing import Any, TypeVar

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select


async def paginate(
    db: AsyncSession,
    query: Select,
    page: int = 1,
    per_page: int = 20,
) -> dict[str, Any]:
    """Run a paginated query and return items + pagination metadata."""
    # Count total rows
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    # Apply offset/limit
    items_q = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(items_q)
    items = list(result.scalars().all())

    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": math.ceil(total / per_page) if per_page > 0 else 0,
    }
