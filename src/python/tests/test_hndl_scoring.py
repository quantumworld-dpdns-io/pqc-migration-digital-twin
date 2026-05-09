from hndl_analysis import ExposureInput, calculate_exposure, get_policy_template, score_exposure


def test_score_full_when_below_threshold() -> None:
    policy = get_policy_template("balanced")
    exposure = calculate_exposure(ExposureInput(total_assets=100, quantum_vulnerable_assets=20))
    assert score_exposure(exposure, policy) == 100


def test_score_drops_when_above_threshold() -> None:
    policy = get_policy_template("strict")
    exposure = calculate_exposure(ExposureInput(total_assets=100, quantum_vulnerable_assets=40))
    score = score_exposure(exposure, policy)
    assert 0 <= score < 100
