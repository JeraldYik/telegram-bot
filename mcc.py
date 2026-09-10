from difflib import SequenceMatcher
import re
from typing import Optional

from mcc_data import MCC_NAMES


NAME_TO_MCC: dict[str, tuple[int, ...]] = {}
NORMALIZED_NAME_TO_MCC: dict[str, tuple[int, ...]] = {}


for mcc, name in MCC_NAMES.items():
    key = name.casefold()
    NAME_TO_MCC[key] = (*NAME_TO_MCC.get(key, ()), mcc)
    normalized_key = re.sub(r"[^a-z0-9]+", " ", key).strip()
    NORMALIZED_NAME_TO_MCC[normalized_key] = (
        *NORMALIZED_NAME_TO_MCC.get(normalized_key, ()),
        mcc,
    )


def _normalize(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.casefold()).strip()


def _tokens(value: str) -> set[str]:
    return set(_normalize(value).split())


def _candidate_score(query: str, name: str) -> float:
    normalized_query = _normalize(query)
    normalized_name = _normalize(name)
    query_tokens = _tokens(query)
    name_tokens = _tokens(name)

    score = SequenceMatcher(None, normalized_query, normalized_name).ratio() * 0.35
    if normalized_query in normalized_name:
        score += 0.35
    if query_tokens:
        token_scores = [
            max(
                SequenceMatcher(None, query_token, name_token).ratio()
                for name_token in name_tokens
            )
            for query_token in query_tokens
        ]
        score += (sum(token_scores) / len(token_scores)) * 0.65
    return score


def find_mcc(query: str) -> Optional[int]:
    value = query.strip()
    if value.isdigit() and len(value) == 4:
        return int(value)

    normalized_query = _normalize(value)
    if not normalized_query:
        return None

    exact_matches = NORMALIZED_NAME_TO_MCC.get(normalized_query)
    if exact_matches:
        return exact_matches[0]

    scored = sorted(
        (
            _candidate_score(value, name),
            mcc,
        )
        for name, mccs in NAME_TO_MCC.items()
        for mcc in mccs
    )
    if not scored:
        return None

    score, mcc = scored[-1]
    if score < 0.72:
        return None
    return mcc


def mcc_name(mcc: int) -> Optional[str]:
    return MCC_NAMES.get(mcc)