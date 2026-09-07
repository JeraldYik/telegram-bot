from dataclasses import dataclass
from enum import Enum
from typing import Optional


class Status(str, Enum):
    BONUS = "BONUS"
    CONDITIONAL = "CONDITIONAL"
    NO_BONUS = "NO_BONUS"


@dataclass(frozen=True)
class CardResult:
    card: str
    status: Status
    category: Optional[str]
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
    "Beauty & Wellness": {5912, 5977, 7230, 7231, 7298, 7297},
    "Dining": {5811, 5812, 5814, 5499},
    "Entertainment": {5813, 7832, 7922},
    "Family": {5411, 5641},
    "Fashion": {5311, 5611, 5621, 5631, 5651, 5655, 5661, 5691, 5699, 5948},
    "Transport": {4111, 4121, 4789, 5541, 5542},
}


MAYBANK_XL_CATEGORIES = {
    "Dine": {5811, 5812, 5814, 5462},
    "Shop": {5262, 5310, 5311, 5331, 5399, 5621, 5631, 5651, 5655, 5661, 5691, 5699, 5941},
    "Play": {4899, 5813, 5815, 7832, 7993, 7994},
    "Travel": {4511, 4722, 7011},
}


MAYBANK_XL_TRAVEL_RANGES = (
    range(3000, 3300),
    range(3300, 3309),
)


def find_lady_categories(mcc: int) -> list[str]:
    return [
        category for category, mccs in LADY_SOLITAIRE_CATEGORIES.items() if mcc in mccs
    ]


def find_maybank_categories(mcc: int) -> list[str]:
    categories = [
        category for category, mccs in MAYBANK_XL_CATEGORIES.items() if mcc in mccs
    ]

    if any(mcc in r for r in MAYBANK_XL_TRAVEL_RANGES):
        categories.append("Travel")

    return categories
