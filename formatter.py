from cards import CardResult, Status
from mcc import mcc_name


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

    return "\n".join(lines)


def format_mcc_response(mcc: int, results: list[CardResult]) -> str:
    title = f"MCC {mcc}"
    name = mcc_name(mcc)
    if name:
        title += f" - {name}"

    lines = [
        title,
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
