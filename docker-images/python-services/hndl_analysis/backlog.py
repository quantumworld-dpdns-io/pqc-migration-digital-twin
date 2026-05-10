"""Backlog ranking export for Phase 2 HNDL analysis."""

from __future__ import annotations

from typing import Any

from .exposure_model import ExposureInput, calculate_exposure
from .policy_templates import get_policy_template
from .scorer import score_exposure


def _risk_band(exposure_ratio: float) -> str:
    if exposure_ratio >= 0.75:
        return "critical"
    if exposure_ratio >= 0.50:
        return "high"
    if exposure_ratio >= 0.25:
        return "medium"
    return "low"


def rank_backlog_rows(asset_rows: list[dict[str, Any]], policy_name: str = "balanced") -> list[dict[str, Any]]:
    """Return ranked backlog rows with rationale fields.

    Ranking is deterministic by sorting descending risk, descending exposure ratio,
    then ascending asset_id.
    """
    policy = get_policy_template(policy_name)
    ranked: list[dict[str, Any]] = []

    for index, row in enumerate(asset_rows):
        asset_id = str(row.get("asset_id", "")).strip()
        if not asset_id:
            raise ValueError(f"asset_rows[{index}] missing non-empty asset_id")

        total_assets = float(row.get("total_assets", 0))
        quantum_assets = float(row.get("quantum_vulnerable_assets", 0))
        exposure = calculate_exposure(
            ExposureInput(total_assets=total_assets, quantum_vulnerable_assets=quantum_assets)
        )
        score = score_exposure(exposure, policy)

        exposure_ratio = exposure.exposure_ratio
        threshold_gap = exposure_ratio - policy.threshold
        over_threshold = threshold_gap > 0
        risk_band = _risk_band(exposure_ratio)

        ranked.append(
            {
                "asset_id": asset_id,
                "total_assets": total_assets,
                "quantum_vulnerable_assets": quantum_assets,
                "policy": policy.name,
                "exposure_ratio": exposure_ratio,
                "score": score,
                "rationale_over_threshold": over_threshold,
                "rationale_threshold_gap": threshold_gap,
                "rationale_risk_band": risk_band,
                "rationale_summary": (
                    f"Exposure {exposure_ratio:.1%} vs policy threshold {policy.threshold:.1%}"
                ),
            }
        )

    ranked.sort(key=lambda item: (item["score"], -item["exposure_ratio"], item["asset_id"]))

    for rank, item in enumerate(ranked, start=1):
        item["rank"] = rank

    return ranked
