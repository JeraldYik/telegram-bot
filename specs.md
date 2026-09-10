Telegram MCC Rewards Bot — Specification
1. Overview
Build a Telegram bot that accepts:

/mcc <4 digit MCC>

and returns whether the MCC is a bonus category for these three Singapore credit cards:

UOB Preferred Visa
UOB Lady's Solitaire
Maybank XL Rewards
The bot must distinguish between:

BONUS — the MCC is a bonus category and, based on the available information, qualifies.
CONDITIONAL — the MCC can qualify, but additional transaction or card information is required.
NO BONUS — the MCC is not a configured bonus category.
The application is deployed as a Cloudflare Python Worker behind a Telegram webhook.

No database is required for v1.

All card rules are bundled as static Python data.

2. Goals
Functional
The bot must:

Accept /mcc 5411.
Validate that the MCC is exactly four numeric digits.
Look up the MCC against all three cards.
Return the relevant bonus category.
Explain important caveats.
Avoid claiming that a transaction is guaranteed to earn bonus points when MCC alone is insufficient.
Be deterministic.
Require no external API other than Telegram's Bot API.
Require no database.
Run entirely on Cloudflare Workers.
Non-goals
Version 1 does not need to:

Track user spending.
Track monthly bonus caps.
Store UOB Lady's Solitaire category selections.
Determine a merchant's actual MCC.
Query Visa/Mastercard MCC databases.
Query bank reward systems.
Calculate actual points/miles earned.
Use an LLM.
Provide an admin UI.
3. Architecture
                         HTTPS
Telegram ──────────────────────────────────┐
                                           │
                                           ▼
                              ┌─────────────────────────┐
                              │ Cloudflare Worker       │
                              │                         │
                              │ Python                  │
                              │                         │
                              │ Telegram webhook        │
                              │        │                │
                              │        ▼                │
                              │ Command parser          │
                              │        │                │
                              │        ▼                │
                              │ MCC matcher             │
                              │        │                │
                              │        ▼                │
                              │ Response formatter      │
                              └─────────┬───────────────┘
                                        │
                                        │ HTTPS
                                        ▼
                                  Telegram Bot API

The normal request path should contain no database lookup or external rewards API.

4. Repository Structure
mcc-bot/
├── main.py
├── cards.py
├── matcher.py
├── formatter.py
│
├── tests/
│   └── test_matcher.py
│
├── pyproject.toml
├── wrangler.jsonc
└── specs.md

5. Runtime
Use:

Cloudflare Python Workers
pywrangler
Telegram Bot API
Python standard library where possible
No database
No external MCC API
Keep the Worker lightweight.

6. Configuration
The Worker requires two secrets:

TELEGRAM_BOT_TOKEN
TELEGRAM_WEBHOOK_SECRET

Store both as Cloudflare secrets.

Never commit them to Git.

7. Telegram Webhook
The Worker exposes:

POST /

Telegram sends updates to this endpoint.

The Worker must:

Require POST.
Validate X-Telegram-Bot-Api-Secret-Token.
Reject an incorrect secret with HTTP 401.
Parse the JSON update.
Ignore updates without a text message.
Process supported commands.
Return HTTP 200.
A simple GET / health endpoint may return:

OK

8. Commands
/start
Return:

MCC Rewards Bot

Use:
/mcc <4 digit MCC>

Example:
/mcc 5411

/help
Same response as /start.

/mcc
Syntax:

/mcc <4 digit MCC>

Examples:

/mcc 5411
/mcc 5812
/mcc 5541

Telegram's bot username syntax should also be supported:

/mcc@my_bot 5411

Whitespace should be tolerated:

/mcc    5411

Invalid:

/mcc
/mcc 541
/mcc 54111
/mcc ABCD
/mcc 54A1
/mcc 12

Response:

Usage: /mcc <4 digit MCC>

Example:
/mcc 5411

9. Result States
Every card result must have one of three states:

BONUS
CONDITIONAL
NO_BONUS

Use the following icons:

State	Icon
BONUS	🟢
CONDITIONAL	🟡
NO_BONUS	🔴

Internal model:

from dataclasses import dataclass
from enum import Enum


class Status(str, Enum):
    BONUS = "BONUS"
    CONDITIONAL = "CONDITIONAL"
    NO_BONUS = "NO_BONUS"


@dataclass(frozen=True)
class CardResult:
    card: str
    status: Status
    category: str | None
    reason: str
    caveats: tuple[str, ...] = ()

10. Card Rules
10.1 UOB Preferred Visa
Formerly known as UOB Preferred Platinum Visa.

There are two relevant bonus mechanisms:

Selected Online Transactions
Mobile Contactless Transactions
Therefore, MCC alone is not always sufficient.

Selected Online Transactions
Configured eligible MCCs:

UOB_PREFERRED_ONLINE_MCCS = {
    4816,
    5262,
    5306,
    5309,
    5310,
    5311,
    5331,
    5399,
    5611,
    5621,
    5631,
    5641,
    5651,
    5661,
    5691,
    5699,
    5732,
    5733,
    5734,
    5735,
    5912,
    5942,
    5944,
    5945,
    5946,
    5947,
    5948,
    5949,
    5964,
    5966,
    5967,
    5968,
    5969,
    5970,
    5992,
    5999,

    5811,
    5812,
    5814,
    5333,
    5411,
    5441,
    5462,
    5499,
    8012,
    9751,

    7278,
    7832,
    7841,
    7922,
    7991,
    7996,
    7998,
    7999,
}

Important
MCC 5965 must not be treated as an eligible MCC.

Online transaction caveats
The MCC match does not itself guarantee bonus points.

The transaction must:

Be a qualifying online retail transaction.
Be made through a qualifying online channel.
Not be a recurring payment.
Not fall under UOB's excluded transaction types.
Other exclusions include various:

Financial transactions
Government payments
Utility payments
Insurance
Quasi-cash
Gambling
Education
Charitable transactions
Other excluded transactions
UOB may also change the eligible MCC list.

Mobile Contactless
UOB Preferred Visa has a separate Mobile Contactless bonus mechanism.

Examples include:

Apple Pay
Google Pay
Samsung Pay
when used as a mobile device at a qualifying physical contactless terminal.

A physical-card contactless transaction should not automatically be treated as Mobile Contactless.

An in-app wallet transaction should not automatically be treated as Mobile Contactless.

SimplyGo
Eligible SimplyGo Account Based Ticketing transactions can qualify under the Mobile Contactless mechanism.

This cannot be reliably determined from MCC alone.

Matcher behavior
If the MCC is in UOB_PREFERRED_ONLINE_MCCS:

CONDITIONAL

Reason:

This MCC is eligible for UOB Preferred Visa's Selected Online
Transactions category, but the transaction must actually qualify
as an online transaction. Other exclusions apply.

If the MCC is not in the online list:

CONDITIONAL

Reason:

This MCC is not in the Selected Online Transactions MCC list.

However, UOB Preferred Visa has a separate Mobile Contactless
bonus mechanism, which cannot be determined from MCC alone.

This deliberately avoids false negatives.

11. UOB Lady's Solitaire
UOB Lady's Solitaire allows the cardholder to select two Preferred Rewards Categories.

Available categories:

Beauty & Wellness
Dining
Entertainment
Family
Fashion
Transport
Travel
Category selections are quarterly.

The bot does not know the user's current selections.

Therefore, a matching MCC should normally return:

CONDITIONAL

rather than BONUS.

11.1 Beauty & Wellness
LADY_SOLITAIRE_BEAUTY = {
    5912,
    5977,
    7230,
    7231,
    7298,
    7297,
}

11.2 Dining
LADY_SOLITAIRE_DINING = {
    5811,
    5812,
    5814,
    5499,
}

11.3 Entertainment
LADY_SOLITAIRE_ENTERTAINMENT = {
    5813,
    7832,
    7922,
}

11.4 Family
LADY_SOLITAIRE_FAMILY = {
    5411,
    5641,
}

11.5 Fashion
LADY_SOLITAIRE_FASHION = {
    5311,
    5611,
    5621,
    5631,
    5651,
    5655,
    5661,
    5691,
    5699,
    5948,
}

11.6 Transport
LADY_SOLITAIRE_TRANSPORT = {
    4111,
    4121,
    4789,
    5541,
    5542,
}

11.7 Travel
Travel should not be represented as a generic MCC-only category.

It concerns qualifying major airlines and/or hotels whose main business activity is flights and/or hotels.

Therefore:

Travel eligibility cannot be guaranteed from MCC alone.

12. Lady's Solitaire Matcher
For MCC 5541:

UOB Lady's Solitaire
🟡 CONDITIONAL — Transport

Reason:

MCC 5541 belongs to the Transport category.

Bonus applies only if Transport is one of the cardholder's
two currently selected Preferred Rewards Categories.

For MCC 5812:

UOB Lady's Solitaire
🟡 CONDITIONAL — Dining

For MCC 5411:

UOB Lady's Solitaire
🟡 CONDITIONAL — Family

For an MCC that does not belong to a configured category:

UOB Lady's Solitaire
🔴 NO BONUS CATEGORY

13. Lady's Solitaire Cap
For the standard UOB Lady's Solitaire:

2,700 bonus UNI$ / month

Equivalent bonus-category spending:

S$1,500 / month

Each selected category has:

1,350 bonus UNI$
S$750 equivalent spending

The bot does not track spending.

Therefore include:

Monthly bonus caps apply; this bot does not track your remaining cap.

Do not confuse this with the Solitaire Metal Card, which has different limits.

14. Maybank XL Rewards
The Maybank XL Rewards Card has five relevant bonus categories:

Dine
Shop
Travel
Play
Foreign Spend
15. Maybank Dine
MAYBANK_XL_DINE = {
    5811,
    5812,
    5814,
    5462,
}

16. Maybank Shop
MAYBANK_XL_SHOP = {
    5262,
    5310,
    5311,
    5331,
    5399,
    5621,
    5631,
    5651,
    5655,
    5661,
    5691,
    5699,
    5941,
}

17. Maybank Travel
Specific MCCs:

MAYBANK_XL_TRAVEL_MCCS = {
    4511,
    4722,
    7011,
}

Airline ranges:

MAYBANK_XL_TRAVEL_RANGES = (
    range(3000, 3300),
    range(3300, 3309),
)

18. Maybank Play
MAYBANK_XL_PLAY = {
    4899,
    5813,
    5815,
    7832,
    7993,
    7994,
}

19. Maybank Foreign Spend
Foreign Spend is not an MCC category.

It depends on whether the transaction is a qualifying foreign transaction, including foreign-currency online transactions.

Therefore:

MCC alone → CONDITIONAL

The bot must not infer Foreign Spend solely from MCC.

20. Maybank Minimum Spend
Maybank XL Rewards requires:

S$500 aggregate Eligible Transactions
per calendar month

to receive the applicable bonus points.

The bot does not know the user's monthly spend.

Therefore all Maybank bonus-category matches must include:

Subject to the S$500 monthly minimum eligible spend.

21. Maybank Monthly Cap
The bonus is capped at:

10,000 bonus TREATS Points / month

The bot does not track the user's monthly bonus usage.

Therefore include:

Subject to the monthly bonus-point cap.

22. Maybank Rounding
TREATS Points are calculated in S$5 blocks per transaction.

Example:

S$129 transaction
→ S$125 eligible block

The bot does not calculate actual points, so this is informational only.

23. Maybank Exclusions
The implementation should document that various transactions are excluded.

Examples include:

NETS / eNETS
Government payments
Government/statutory-board services
Betting/gambling
Brokerage/securities
Charitable/religious/political organisations
Cleaning/maintenance/janitorial services
Utilities
Insurance payments/premiums, subject to specified exceptions
Financial institution transactions
Quasi-cash
AXS / SAM
Instalment plans
Funds transfers
Cash advances
Finance charges
Late-payment charges
Annual fees
Interest charges
Certain prepaid-account transactions
Other specifically excluded transaction descriptions
Maybank also has transaction-description-specific exclusions.

Therefore:

MCC match != guaranteed reward

24. Global Caveat
Every /mcc response must end with:

━━━━━━━━━━━━━━━━━━━━

⚠️ MCC is not a guarantee of rewards.

Banks may apply additional rules based on payment method,
merchant classification, transaction type, minimum spend,
monthly caps and other exclusions.

25. cards.py
from dataclasses import dataclass
from enum import Enum


class Status(str, Enum):
    BONUS = "BONUS"
    CONDITIONAL = "CONDITIONAL"
    NO_BONUS = "NO_BONUS"


@dataclass(frozen=True)
class CardResult:
    card: str
    status: Status
    category: str | None
    reason: str
    caveats: tuple[str, ...] = ()


UOB_PREFERRED_ONLINE_MCCS = {
    4816, 5262, 5306, 5309, 5310, 5311,
    5331, 5399, 5611, 5621, 5631, 5641,
    5651, 5661, 5691, 5699,
    5732, 5733, 5734, 5735,
    5912,
    5942, 5944, 5945, 5946, 5947, 5948, 5949,
    5964, 5966, 5967, 5968, 5969, 5970,
    5992, 5999,

    5811, 5812, 5814,
    5333, 5411, 5441, 5462, 5499,
    8012, 9751,

    7278, 7832, 7841, 7922,
    7991, 7996, 7998, 7999,
}


LADY_SOLITAIRE_CATEGORIES = {
    "Beauty & Wellness": {
        5912, 5977, 7230, 7231, 7298, 7297,
    },
    "Dining": {
        5811, 5812, 5814, 5499,
    },
    "Entertainment": {
        5813, 7832, 7922,
    },
    "Family": {
        5411, 5641,
    },
    "Fashion": {
        5311, 5611, 5621, 5631, 5651,
        5655, 5661, 5691, 5699, 5948,
    },
    "Transport": {
        4111, 4121, 4789, 5541, 5542,
    },
}


MAYBANK_XL_CATEGORIES = {
    "Dine": {
        5811, 5812, 5814, 5462,
    },
    "Shop": {
        5262, 5310, 5311, 5331, 5399,
        5621, 5631, 5651, 5655, 5661,
        5691, 5699, 5941,
    },
    "Play": {
        4899, 5813, 5815, 7832, 7993, 7994,
    },
    "Travel": {
        4511, 4722, 7011,
    },
}


MAYBANK_XL_TRAVEL_RANGES = (
    range(3000, 3300),
    range(3300, 3309),
)


def find_lady_categories(mcc: int) -> list[str]:
    return [
        category
        for category, mccs in LADY_SOLITAIRE_CATEGORIES.items()
        if mcc in mccs
    ]


def find_maybank_categories(mcc: int) -> list[str]:
    categories = [
        category
        for category, mccs in MAYBANK_XL_CATEGORIES.items()
        if mcc in mccs
    ]

    if any(mcc in r for r in MAYBANK_XL_TRAVEL_RANGES):
        categories.append("Travel")

    return categories

26. matcher.py
from cards import (
    CardResult,
    Status,
    UOB_PREFERRED_ONLINE_MCCS,
    find_lady_categories,
    find_maybank_categories,
)


def match_uob_preferred(mcc: int) -> CardResult:
    if mcc in UOB_PREFERRED_ONLINE_MCCS:
        return CardResult(
            card="UOB Preferred Visa",
            status=Status.CONDITIONAL,
            category="Selected Online Transactions",
            reason=(
                "This MCC is in UOB Preferred Visa's eligible "
                "Selected Online Transactions MCC list."
            ),
            caveats=(
                "The transaction must actually qualify as an online retail transaction.",
                "Recurring payments and other excluded transactions do not qualify.",
                "UOB also has a separate Mobile Contactless bonus mechanism.",
            ),
        )

    return CardResult(
        card="UOB Preferred Visa",
        status=Status.CONDITIONAL,
        category="Mobile Contactless",
        reason=(
            "This MCC is not in the Selected Online Transactions MCC list, "
            "but MCC alone cannot rule out UOB Preferred Visa's separate "
            "Mobile Contactless bonus."
        ),
        caveats=(
            "Mobile Contactless depends on how the transaction was made.",
            "Eligible mobile-wallet contactless transactions may qualify.",
            "MCC alone is insufficient to determine this mechanism.",
        ),
    )


def match_lady_solitaire(mcc: int) -> CardResult:
    categories = find_lady_categories(mcc)

    if not categories:
        return CardResult(
            card="UOB Lady's Solitaire",
            status=Status.NO_BONUS,
            category=None,
            reason=(
                "This MCC is not in the configured Lady's Solitaire "
                "category MCC lists."
            ),
            caveats=(
                "Travel eligibility may depend on qualifying airline/hotel merchant classification.",
            ),
        )

    category = ", ".join(categories)

    return CardResult(
        card="UOB Lady's Solitaire",
        status=Status.CONDITIONAL,
        category=category,
        reason=(
            f"MCC {mcc} belongs to the Lady's Solitaire "
            f"{category} category."
        ),
        caveats=(
            "The category must be one of the cardholder's two currently selected Preferred Rewards Categories.",
            "Category selections are quarterly.",
            "UOB relies on the merchant's registered MCC.",
            "Monthly bonus caps apply.",
        ),
    )


def match_maybank(mcc: int) -> CardResult:
    categories = find_maybank_categories(mcc)

    if not categories:
        return CardResult(
            card="Maybank XL Rewards",
            status=Status.NO_BONUS,
            category=None,
            reason=(
                "This MCC is not in the configured Maybank XL Rewards "
                "bonus categories."
            ),
            caveats=(
                "Foreign Spend cannot be determined from MCC alone.",
                "Other transaction exclusions apply.",
            ),
        )

    category = ", ".join(categories)

    return CardResult(
        card="Maybank XL Rewards",
        status=Status.BONUS,
        category=category,
        reason=(
            f"MCC {mcc} is in the Maybank XL Rewards "
            f"{category} bonus category."
        ),
        caveats=(
            "S$500 aggregate eligible monthly spend is required for the bonus.",
            "Monthly bonus-point caps apply.",
            "Certain transaction types and descriptions are excluded.",
            "Foreign Spend eligibility cannot be determined from MCC alone.",
        ),
    )


def match_mcc(mcc: int) -> list[CardResult]:
    return [
        match_uob_preferred(mcc),
        match_lady_solitaire(mcc),
        match_maybank(mcc),
    ]

27. formatter.py
from cards import CardResult, Status


STATUS_ICON = {
    Status.BONUS: "🟢",
    Status.CONDITIONAL: "🟡",
    Status.NO_BONUS: "🔴",
}


def format_card_result(result: CardResult) -> str:
    icon = STATUS_ICON[result.status]

    category = ""
    if result.category:
        category = f" — {result.category}"

    lines = [
        result.card,
        f"{icon} {result.status.value.replace('_', ' ')}{category}",
        "",
        result.reason,
    ]

    if result.caveats:
        lines.append("")
        lines.append("Caveats:")
        lines.extend(f"• {caveat}" for caveat in result.caveats)

    return "\n".join(lines)


def format_mcc_response(
    mcc: int,
    results: list[CardResult],
) -> str:
    lines = [
        f"MCC {mcc}",
        "",
    ]

    for index, result in enumerate(results):
        if index:
            lines.extend([
                "",
                "━━━━━━━━━━━━━━━━━━━━",
                "",
            ])

        lines.append(format_card_result(result))

    lines.extend([
        "",
        "━━━━━━━━━━━━━━━━━━━━",
        "",
        "⚠️ MCC is not a guarantee of rewards.",
        (
            "Banks may apply transaction-method, merchant-classification, "
            "minimum-spend, monthly-cap and other exclusions."
        ),
    ])

    return "\n".join(lines)

28. main.py
import json

from js import fetch, Headers
from workers import WorkerEntrypoint, Response

from matcher import match_mcc
from formatter import format_mcc_response


def parse_mcc_command(text: str) -> int | None:
    parts = text.strip().split()

    if not parts:
        return None

    command = parts[0].split("@", 1)[0].lower()

    if command != "/mcc":
        return None

    if len(parts) != 2:
        return None

    value = parts[1]

    if len(value) != 4 or not value.isdigit():
        return None

    return int(value)


def usage_message() -> str:
    return (
        "Usage: /mcc <4 digit MCC>\n\n"
        "Example:\n"
        "/mcc 5411"
    )


def help_message() -> str:
    return (
        "MCC Rewards Bot\n\n"
        "Use:\n"
        "/mcc <4 digit MCC>\n\n"
        "Example:\n"
        "/mcc 5411"
    )


async def telegram_request(
    token: str,
    method: str,
    payload: dict,
):
    url = f"https://api.telegram.org/bot{token}/{method}"

    headers = Headers.new()
    headers.set("Content-Type", "application/json")

    return await fetch(
        url,
        method="POST",
        headers=headers,
        body=json.dumps(payload),
    )


async def send_message(
    token: str,
    chat_id: int,
    text: str,
):
    return await telegram_request(
        token,
        "sendMessage",
        {
            "chat_id": chat_id,
            "text": text,
        },
    )


class Default(WorkerEntrypoint):

    async def fetch(self, request):
        if request.method == "GET":
            return Response("OK")

        if request.method != "POST":
            return Response(
                "Method Not Allowed",
                status=405,
            )

        secret = request.headers.get(
            "X-Telegram-Bot-Api-Secret-Token"
        )

        if secret != self.env.TELEGRAM_WEBHOOK_SECRET:
            return Response(
                "Unauthorized",
                status=401,
            )

        try:
            update = await request.json()
        except Exception:
            return Response(
                "Bad Request",
                status=400,
            )

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
            await send_message(
                self.env.TELEGRAM_BOT_TOKEN,
                chat_id,
                help_message(),
            )
            return Response("OK")

        if normalized.lower().startswith("/help"):
            await send_message(
                self.env.TELEGRAM_BOT_TOKEN,
                chat_id,
                help_message(),
            )
            return Response("OK")

        if normalized.lower().startswith("/mcc"):
            mcc = parse_mcc_command(normalized)

            if mcc is None:
                await send_message(
                    self.env.TELEGRAM_BOT_TOKEN,
                    chat_id,
                    usage_message(),
                )
                return Response("OK")

            results = match_mcc(mcc)

            response_text = format_mcc_response(
                mcc,
                results,
            )

            await send_message(
                self.env.TELEGRAM_BOT_TOKEN,
                chat_id,
                response_text,
            )

            return Response("OK")

        return Response("OK")

29. wrangler.jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "telegram-bot",
    "main": "main.py",
  "compatibility_date": "2026-09-06",
  "compatibility_flags": [
    "python_workers"
  ]
}

30. pyproject.toml
[project]
name = "telegram-bot"
version = "0.1.0"
description = "Telegram MCC credit card rewards lookup bot"
requires-python = ">=3.13"
dependencies = []

[dependency-groups]
dev = [
    "workers-py",
    "workers-runtime-sdk",
]

31. Local Development
Run:

uv run pywrangler dev

The Worker should start locally and expose a development URL.

Test the health endpoint:

curl http://localhost:8787/

Expected:

OK

32. Cloudflare Secrets
Set the Telegram bot token:

uv run pywrangler secret put TELEGRAM_BOT_TOKEN

Set the webhook secret:

uv run pywrangler secret put TELEGRAM_WEBHOOK_SECRET

Do not put secrets in wrangler.jsonc.

33. Deployment
Deploy with:

uv run pywrangler deploy

The resulting Worker URL will be similar to:

https://telegram-bot.<subdomain>.workers.dev

34. Telegram Webhook
Register the Worker URL with Telegram:

curl -X POST \
  "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -d "url=https://telegram-bot.<subdomain>.workers.dev" \
  -d "secret_token=${TELEGRAM_WEBHOOK_SECRET}"

The secret_token must match:

TELEGRAM_WEBHOOK_SECRET

35. Security
The Worker must:

Never expose TELEGRAM_BOT_TOKEN.
Never expose TELEGRAM_WEBHOOK_SECRET.
Validate Telegram's secret header.
Reject unauthorized webhook requests.
Never log secrets.
Avoid storing Telegram user messages.
Avoid storing Telegram user IDs unless a future feature requires it.
36. Unit Tests
tests/test_matcher.py:

from matcher import match_mcc
from cards import Status


def test_5812():
    results = match_mcc(5812)

    assert results[0].status == Status.CONDITIONAL
    assert results[1].status == Status.CONDITIONAL
    assert results[2].status == Status.BONUS


def test_5541():
    results = match_mcc(5541)

    assert results[0].status == Status.CONDITIONAL
    assert results[1].status == Status.CONDITIONAL
    assert results[2].status == Status.NO_BONUS


def test_5411():
    results = match_mcc(5411)

    assert results[0].status == Status.CONDITIONAL
    assert results[1].status == Status.CONDITIONAL
    assert results[2].status == Status.NO_BONUS


def test_unknown_mcc():
    results = match_mcc(9999)

    assert results[1].status == Status.NO_BONUS
    assert results[2].status == Status.NO_BONUS

37. Important Business Logic Rule
Do not implement the application as:

CARD_MCCS[card].contains(mcc)

Instead:

MCC
 ↓
MCC category match
 ↓
Transaction conditions
 ↓
Card state
 ↓
Actual reward eligibility

Version 1 only knows the MCC.

Therefore, when missing information could change the answer, return:

🟡 CONDITIONAL

rather than:

🟢 BONUS

38. Examples
/mcc 5812
Expected:

MCC 5812

UOB Preferred Visa
🟡 CONDITIONAL — Selected Online Transactions

This MCC is in UOB Preferred Visa's eligible Selected Online
Transactions MCC list.

The transaction must actually qualify as an online retail
transaction.

Caveats:
• Recurring payments and other exclusions do not qualify.
• UOB also has a separate Mobile Contactless mechanism.

━━━━━━━━━━━━━━━━━━━━

UOB Lady's Solitaire
🟡 CONDITIONAL — Dining

MCC 5812 belongs to the Dining category.

Caveats:
• Dining must be one of the cardholder's two selected categories.
• Category selections are quarterly.
• Merchant MCC classification applies.
• Monthly bonus caps apply.

━━━━━━━━━━━━━━━━━━━━

Maybank XL Rewards
🟢 BONUS — Dine

MCC 5812 is in the Dine bonus category.

Caveats:
• S$500 monthly minimum eligible spend applies.
• Monthly bonus-point cap applies.
• Other transaction exclusions apply.

━━━━━━━━━━━━━━━━━━━━

⚠️ MCC is not a guarantee of rewards.

Banks may apply additional rules based on payment method,
merchant classification, transaction type, minimum spend,
monthly caps and other exclusions.

/mcc 5541
Expected:

MCC 5541

UOB Preferred Visa
🟡 CONDITIONAL

This MCC is not in the Selected Online Transactions MCC list.

However, UOB Preferred Visa has a separate Mobile Contactless
bonus mechanism, which cannot be determined from MCC alone.

━━━━━━━━━━━━━━━━━━━━

UOB Lady's Solitaire
🟡 CONDITIONAL — Transport

MCC 5541 belongs to the Transport category.

Bonus applies only if Transport is one of the cardholder's
two currently selected Preferred Rewards Categories.

━━━━━━━━━━━━━━━━━━━━

Maybank XL Rewards
🔴 NO BONUS

MCC 5541 is not in the configured Maybank XL Rewards
bonus-category list.

━━━━━━━━━━━━━━━━━━━━

⚠️ MCC is not a guarantee of rewards.

/mcc 5411
Expected:

MCC 5411

UOB Preferred Visa
🟡 CONDITIONAL — Selected Online Transactions

MCC 5411 is in the Selected Online Transactions MCC list.

The transaction must actually qualify as an online retail
transaction and must not fall under an exclusion.

━━━━━━━━━━━━━━━━━━━━

UOB Lady's Solitaire
🟡 CONDITIONAL — Family

MCC 5411 belongs to the Family category.

Bonus applies only if Family is one of the cardholder's
two currently selected categories.

━━━━━━━━━━━━━━━━━━━━

Maybank XL Rewards
🔴 NO BONUS

MCC 5411 is not in the configured Maybank XL Rewards
bonus-category list.

━━━━━━━━━━━━━━━━━━━━

⚠️ MCC is not a guarantee of rewards.

39. Unknown MCC
For:

/mcc 9999

return:

MCC 9999

No configured bonus-category matches were found.

⚠️ An unknown MCC does not necessarily mean that the transaction
cannot earn rewards. This bot only evaluates the configured rules.

━━━━━━━━━━━━━━━━━━━━

⚠️ MCC is not a guarantee of rewards.

40. Future Transaction Context
The architecture should support a future version where the user can provide transaction context.

Potential syntax:

/mcc 5812 online
/mcc 5812 contactless
/mcc 5812 foreign

The matcher could eventually become:

match_transaction(
    mcc=mcc,
    channel=channel,
    currency=currency,
    selected_categories=selected_categories,
)

Version 1 should not implement this.

41. Future UOB Lady's Solitaire Preferences
A future version could allow users to configure their current categories:

/setcategories transport travel

The bot could then change:

🟡 CONDITIONAL — Transport

into:

🟢 BONUS — Transport

This requires persistent storage.

Possible Cloudflare options:

KV
D1
Durable Objects
Do not introduce persistent storage in v1.

42. Future Admin Rule Updates
Future architecture:

Admin UI
   ↓
Cloudflare D1
   ↓
Worker
   ↓
MCC matcher

For v1, static source-controlled rules are preferred.

Advantages:

No database latency.
No database failure mode.
Simple deployment.
Easy auditing.
Atomic rule updates.
Extremely fast lookups.
43. Performance
The MCC lookup should be effectively constant-time.

Normal request path:

Telegram
   ↓
Cloudflare Worker
   ↓
Parse command
   ↓
In-memory MCC lookup
   ↓
Format response
   ↓
Telegram API

There should be no:

Database query
External MCC query
Bank API call
LLM call
Merchant lookup
The only external request in the normal flow is:

Worker → Telegram Bot API

44. Cold Start
The Worker should avoid expensive initialization.

Keep:

MCC sets as module-level constants.
Imports minimal.
No database connections.
No model initialization.
No large configuration files.
No network calls during initialization.
The workload is intentionally small enough that the Worker remains lightweight.

45. Source of Truth
Card rules should be data-driven.

Avoid:

if mcc == 5812:
    ...

inside the Telegram webhook handler.

Prefer:

MAYBANK_XL_CATEGORIES = {
    "Dine": {
        5811,
        5812,
        5814,
        5462,
    }
}

with:

match_maybank(mcc)

This keeps the rules auditable and easy to update.

46. Updating Rules
When card terms change:

Update cards.py.
Update matcher logic if required.
Add/update unit tests.
Update specs.md.
Record the effective date of the rule change.
Deploy the Worker.
Test representative MCCs.
Do not silently change reward rules without updating the source documentation.

47. Acceptance Criteria
The implementation is complete when:

 /start works.
 /help works.
 /mcc 5411 works.
 /mcc 5812 works.
 /mcc 5541 works.
 Invalid MCCs return usage instructions.
 Telegram webhook secret is validated.
 Bot token is stored as a Cloudflare secret.
 No database is required.
 No external MCC API is called.
 No LLM is called.
 UOB Preferred Visa distinguishes online MCC eligibility from Mobile Contactless caveats.
 UOB Lady's Solitaire distinguishes MCC category from selected categories.
 Maybank XL distinguishes MCC category from the S$500 monthly minimum and monthly cap.
 Maybank Foreign Spend is not inferred from MCC.
 Relevant caveats are included in responses.
 Unknown MCCs do not cause errors.
 Unit tests cover representative MCCs.
 Secrets are not committed.
 Worker deploys successfully to Cloudflare.
 Telegram webhook receives and responds to commands.
48. Design Principle
The bot is an MCC rewards classifier, not a rewards guarantee engine.

The most important UX distinction is:

🟢 BONUS
The configured rules indicate a bonus category.

🟡 CONDITIONAL
The MCC can qualify, but more information is required.

🔴 NO BONUS
The MCC is not a configured bonus category.

This distinction should remain throughout the application.