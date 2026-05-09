"""Score exposure results against a policy template."""

from __future__ import annotations

from .exposure_model import ExposureResult
from .policy_templates import PolicyTemplate


def score_exposure(exposure: ExposureResult, policy: PolicyTemplate) -> int:
    """Higher scores are better (less exposed)."""
    if exposure.exposure_ratio <= policy.threshold:
        return policy.max_score

    overflow = (exposure.exposure_ratio - policy.threshold) / max(1e-9, (1.0 - policy.threshold))
    penalty = int(round(overflow * policy.max_score))
    return max(0, policy.max_score - penalty)
