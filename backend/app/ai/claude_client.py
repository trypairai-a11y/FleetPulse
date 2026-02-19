"""Anthropic Claude client with streaming support and mock fallback."""

import json
import logging
from typing import AsyncGenerator

from app.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """أنت مساعد ذكي لإدارة أسطول التوصيل في الكويت. اسمك "فليت بالس AI".

You are FleetPulse AI, an intelligent assistant for a Gulf delivery fleet management system operating in Kuwait.

Rules:
- Respond in Gulf Arabic (الكويتي) by default. If the user writes in English, respond in English.
- Use Kuwaiti Dinar (KWD, د.ك) with 3 decimal places for all monetary values.
- Timezone is Asia/Kuwait (UTC+3).
- Be concise and actionable. Fleet supervisors are busy.
- When you have access to fleet data via tools, always use them to give real answers.
- Format numbers clearly. Use tables for comparisons.
- For driver names, use the Arabic name when available.
- If you don't have enough data, say so honestly.
"""

MOCK_RESPONSES = {
    "default": "مرحبا! أنا مساعد فليت بالس الذكي. حالياً مفتاح الـ API غير مفعّل، لكن أقدر أساعدك لما يتم تفعيله. 🚀",
    "drivers": "عندك 200 سائق مسجلين في النظام. 180 نشطين حالياً على 4 منصات: طلبات، كيتا، ديليفرو، وجاهز.",
    "orders": "اليوم تم تسجيل 150 طلب توصيل. أعلى منصة هي طلبات بـ 45 طلب.",
    "attendance": "نسبة الحضور اليوم 85%. 170 سائق حاضرين من أصل 200.",
}


def _is_mock_mode() -> bool:
    return not settings.ANTHROPIC_API_KEY


async def stream_chat(
    messages: list[dict],
    tools: list[dict] | None = None,
) -> AsyncGenerator[dict, None]:
    """Stream chat responses from Claude or mock mode.

    Yields dicts with keys:
      - {"type": "text_delta", "text": "..."}
      - {"type": "tool_use", "id": "...", "name": "...", "input": {...}}
      - {"type": "message_end", "content": "...", "tool_calls": [...]}
    """
    if _is_mock_mode():
        async for chunk in _mock_stream(messages):
            yield chunk
        return

    import anthropic

    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    api_messages = []
    for m in messages:
        if m["role"] in ("user", "assistant"):
            api_messages.append(m)

    kwargs = {
        "model": settings.CLAUDE_MODEL,
        "max_tokens": 2048,
        "system": SYSTEM_PROMPT,
        "messages": api_messages,
    }
    if tools:
        kwargs["tools"] = tools

    full_text = ""
    tool_calls = []

    async with client.messages.stream(**kwargs) as stream:
        async for event in stream:
            if event.type == "content_block_start":
                if hasattr(event.content_block, "type"):
                    if event.content_block.type == "tool_use":
                        tool_calls.append({
                            "id": event.content_block.id,
                            "name": event.content_block.name,
                            "input": {},
                        })
            elif event.type == "content_block_delta":
                if hasattr(event.delta, "text"):
                    full_text += event.delta.text
                    yield {"type": "text_delta", "text": event.delta.text}
                elif hasattr(event.delta, "partial_json"):
                    if tool_calls:
                        # Accumulate tool input JSON
                        tc = tool_calls[-1]
                        tc["_partial"] = tc.get("_partial", "") + event.delta.partial_json
            elif event.type == "content_block_stop":
                if tool_calls and "_partial" in tool_calls[-1]:
                    tc = tool_calls[-1]
                    try:
                        tc["input"] = json.loads(tc.pop("_partial"))
                    except json.JSONDecodeError:
                        tc["input"] = {}
                        tc.pop("_partial", None)
                    yield {
                        "type": "tool_use",
                        "id": tc["id"],
                        "name": tc["name"],
                        "input": tc["input"],
                    }

    yield {
        "type": "message_end",
        "content": full_text,
        "tool_calls": tool_calls if tool_calls else None,
    }


async def call_chat(
    messages: list[dict],
    tools: list[dict] | None = None,
) -> dict:
    """Non-streaming call to Claude. Returns full message dict.

    Used for digest generation and scoring commentary.
    """
    if _is_mock_mode():
        return {
            "content": MOCK_RESPONSES["default"],
            "tool_calls": None,
        }

    import anthropic

    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    api_messages = []
    for m in messages:
        if m["role"] in ("user", "assistant"):
            api_messages.append(m)

    kwargs = {
        "model": settings.CLAUDE_MODEL,
        "max_tokens": 2048,
        "system": SYSTEM_PROMPT,
        "messages": api_messages,
    }
    if tools:
        kwargs["tools"] = tools

    response = await client.messages.create(**kwargs)

    full_text = ""
    tool_calls = []
    for block in response.content:
        if block.type == "text":
            full_text += block.text
        elif block.type == "tool_use":
            tool_calls.append({
                "id": block.id,
                "name": block.name,
                "input": block.input,
            })

    return {
        "content": full_text,
        "tool_calls": tool_calls if tool_calls else None,
    }


async def _mock_stream(messages: list[dict]) -> AsyncGenerator[dict, None]:
    """Produce a mock streaming response for development."""
    import asyncio

    last_msg = messages[-1]["content"].lower() if messages else ""

    response = MOCK_RESPONSES["default"]
    if any(w in last_msg for w in ["سواق", "driver", "سائق"]):
        response = MOCK_RESPONSES["drivers"]
    elif any(w in last_msg for w in ["طلب", "order", "توصيل"]):
        response = MOCK_RESPONSES["orders"]
    elif any(w in last_msg for w in ["حضور", "attendance", "دوام"]):
        response = MOCK_RESPONSES["attendance"]

    # Simulate streaming by yielding word by word
    words = response.split(" ")
    for i, word in enumerate(words):
        chunk = word + (" " if i < len(words) - 1 else "")
        yield {"type": "text_delta", "text": chunk}
        await asyncio.sleep(0.03)

    yield {"type": "message_end", "content": response, "tool_calls": None}
