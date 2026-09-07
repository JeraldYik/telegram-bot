from src.cards import (
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
