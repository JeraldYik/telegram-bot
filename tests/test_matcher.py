from src.matcher import match_mcc
from src.cards import Status


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
