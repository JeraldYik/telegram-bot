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
            status=Status.BONUS,
            category="Selected Online Transactions",
            reason=(
                "This MCC is in UOB Preferred Visa's eligible "
                "Selected Online Transactions MCC list."
            ),
        )

    return CardResult(
        card="UOB Preferred Visa",
        status=Status.NO_BONUS,
        category=None,
        reason=(
            "This MCC is not in UOB Preferred Visa's eligible "
            "Selected Online Transactions MCC list."
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
        )

    category = ", ".join(categories)

    return CardResult(
        card="UOB Lady's Solitaire",
        status=Status.BONUS,
        category=category,
        reason=(
            f"MCC {mcc} belongs to the Lady's Solitaire "
            f"{category} category."
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
    )


def match_mcc(mcc: int) -> list[CardResult]:
    return [
        match_uob_preferred(mcc),
        match_lady_solitaire(mcc),
        match_maybank(mcc),
    ]
