# MCC Rewards Bot

## Overview

This Telegram bot accepts an MCC and returns whether it qualifies as a bonus category for:

- UOB Preferred Visa
- UOB Lady's Solitaire
- Maybank XL Rewards

It is deployed as a Cloudflare Python Worker behind a Telegram webhook.

## Features

- Accepts `/mcc <4 digit MCC>`
- Validates MCC input format
- Matches MCC data against all three card rules
- Returns one of the states: `BONUS` or `NO_BONUS`
- Explains relevant caveats and exclusions
- Uses static bundled rule data only
- Requires no database or external MCC APIs

## Project structure

- `main.py` — webhook entrypoint and command routing
- `cards.py` — static MCC data and card mappings
- `matcher.py` — card matching logic
- `formatter.py` — Telegram response formatting
- `tests/test_matcher.py` — matcher unit tests
- `wrangler.jsonc` — Cloudflare Worker config
- `pyproject.toml` — Python project metadata
- `specs.md` — product specification

## Local development

Run:

```bash
uv run pywrangler dev
```

Health endpoint:

```bash
curl http://localhost:8787/
```

Expected response:

```text
OK
```

## Required secrets

Set the worker secrets:

```bash
uv run pywrangler secret put TELEGRAM_BOT_TOKEN
uv run pywrangler secret put TELEGRAM_WEBHOOK_SECRET
```

## Telegram webhook setup

Register the webhook:

```bash
curl -X POST \
  "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -d "url=https://telegram-bot.<subdomain>.workers.dev" \
  -d "secret_token=${TELEGRAM_WEBHOOK_SECRET}"
```

## Commands

- `/start`
- `/help`
- `/mcc <4 digit MCC>`

Example:

```text
/mcc 5411
```

## Notes

This bot intentionally avoids assuming a reward is guaranteed from MCC alone. Banks may apply transaction-method, merchant-classification, minimum-spend, monthly-cap and other exclusions.
