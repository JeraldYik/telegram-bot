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


def format_mcc_response(mcc: int, results: list[CardResult]) -> str:
    lines = [
        f"MCC {mcc}",
        "",
    ]

    for index, result in enumerate(results):
        if index:
            lines.extend(["", "━━━━━━━━━━━━━━━━━━━━", ""])

        lines.append(format_card_result(result))

    lines.extend([
        "",
        "━━━━━━━━━━━━━━━━━━━━",
        "",
        "⚠️ MCC is not a guarantee of rewards.",
        "Banks may apply transaction-method, merchant-classification, minimum-spend, monthly-cap and other exclusions.",
    ])

    return "\n".join(lines)
