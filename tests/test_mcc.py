from formatter import format_mcc_response
from matcher import match_mcc
from mcc import MCC_NAMES, NAME_TO_MCC, find_mcc, mcc_name
from src.main import parse_mcc_command


def test_complete_mcc_mapping_and_reverse_index():
    assert len(MCC_NAMES) == 914
    assert len(NAME_TO_MCC) < len(MCC_NAMES)
    assert mcc_name(4411) == "Cruise Lines"
    assert find_mcc("Cruise Lines") == 4411


def test_mcc_command_supports_numeric_and_fuzzy_description_search():
    assert parse_mcc_command("/mcc 4411") == 4411
    assert parse_mcc_command("/mcc cruise") == 4411
    assert parse_mcc_command("/mcc cruze lines") == 4411
    assert parse_mcc_command("/mcc travel agencies and tour operators") == 4722


def test_fuzzy_search_is_case_and_punctuation_insensitive():
    assert find_mcc("  CRUISE-LINES  ") == 4411
    assert find_mcc("airports airport terminals flying fields") == 4582
    assert find_mcc("lodging hotels motels resorts") == 7011


def test_fuzzy_search_handles_partial_terms_and_typos():
    assert find_mcc("cruise") == 4411
    assert find_mcc("telecommunication equpment") == 4812
    assert find_mcc("supermarkts") == 5411
    assert find_mcc("travel agencys") == 4722


def test_fuzzy_search_preserves_numeric_mcc_lookup():
    assert find_mcc("4411") == 4411
    assert find_mcc(" 0742 ") == 742
    assert find_mcc("9999") == 9999


def test_reverse_mapping_retains_duplicate_official_names():
    assert NAME_TO_MCC["testing laboratories (non-medical)"] == (8734, 8743)
    assert find_mcc("Testing Laboratories (Non-Medical)") == 8734


def test_fuzzy_search_rejects_empty_and_unrelated_queries():
    assert find_mcc("") is None
    assert find_mcc("   ") is None
    assert find_mcc("this is not an mcc") is None
    assert find_mcc("123") is None


def test_formatter_includes_official_mcc_name():
    response = format_mcc_response(4411, match_mcc(4411))

    assert response.startswith("MCC 4411 - Cruise Lines")


def test_command_parser_accepts_multiword_fuzzy_queries_and_bot_usernames():
    assert parse_mcc_command("/mcc    cruise   lines") == 4411
    assert parse_mcc_command("/mcc@rewards_bot cruise") == 4411
    assert parse_mcc_command("/mcc@rewards_bot 4411") == 4411


def test_lady_solitaire_uses_only_transport_and_travel():
    assert match_mcc(3000)[1].category == "Travel"
    assert match_mcc(4411)[1].category == "Travel"
    assert match_mcc(4111)[1].category == "Transport"
    assert match_mcc(5812)[1].category is None
