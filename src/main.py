import json
import os
from typing import Optional

try:
    from formatter import format_mcc_response
    from matcher import match_mcc
    from mcc import find_mcc
except ModuleNotFoundError:
    from src.formatter import format_mcc_response
    from src.matcher import match_mcc
    from src.mcc import find_mcc


def parse_mcc_command(text: str) -> Optional[int]:
    parts = text.strip().split()

    if not parts:
        return None

    command = parts[0].split("@", 1)[0].lower()

    if command != "/mcc":
        return None

    if len(parts) < 2:
        return None

    return find_mcc(" ".join(parts[1:]))


def usage_message() -> str:
    return (
        "Usage: /mcc <4 digit MCC or description>\n\n"
        "Example:\n"
        "/mcc 4411\n"
        "/mcc cruise"
    )


def help_message() -> str:
    return (
        "MCC Rewards Bot\n\n"
        "Use:\n"
        "/mcc <4 digit MCC or description>\n\n"
        "Example:\n"
        "/mcc 4411\n"
        "/mcc cruise"
    )


async def telegram_request(token: str, method: str, payload: dict):
    from js import fetch, Headers

    url = f"https://api.telegram.org/bot{token}/{method}"
    headers = Headers.new()
    headers.set("Content-Type", "application/json")
    return await fetch(
        url,
        method="POST",
        headers=headers,
        body=json.dumps(payload),
    )


async def send_message(token: str, chat_id: int, text: str):
    return await telegram_request(
        token,
        "sendMessage",
        {
            "chat_id": chat_id,
            "text": text,
        },
    )


class Default:
    def __init__(self, env):
        self.env = env

    async def fetch(self, request):
        from workers import Response

        if request.method == "GET":
            return Response("OK")

        if request.method != "POST":
            return Response("Method Not Allowed", status=405)

        secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token")

        if secret != self.env.TELEGRAM_WEBHOOK_SECRET:
            return Response("Unauthorized", status=401)

        try:
            update = await request.json()
        except Exception:
            return Response("Bad Request", status=400)

        message = update.get("message")
        if not message:
            return Response("OK")

        text = message.get("text")
        if not text:
            return Response("OK")

        chat = message.get("chat")
        if not chat:
            return Response("OK")

        chat_id = chat.get("id")
        if chat_id is None:
            return Response("OK")

        normalized = text.strip()

        if normalized.lower().startswith("/start"):
            await send_message(self.env.TELEGRAM_BOT_TOKEN, chat_id, help_message())
            return Response("OK")

        if normalized.lower().startswith("/help"):
            await send_message(self.env.TELEGRAM_BOT_TOKEN, chat_id, help_message())
            return Response("OK")

        if normalized.lower().startswith("/mcc"):
            mcc = parse_mcc_command(normalized)

            if mcc is None:
                await send_message(self.env.TELEGRAM_BOT_TOKEN, chat_id, usage_message())
                return Response("OK")

            results = match_mcc(mcc)
            response_text = format_mcc_response(mcc, results)
            await send_message(self.env.TELEGRAM_BOT_TOKEN, chat_id, response_text)
            return Response("OK")

        return Response("OK")
