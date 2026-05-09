"""Simple exposure model for HNDL analysis."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ExposureInput:
    total_assets: float
    quantum_vulnerable_assets: float


@dataclass(frozen=True)
class ExposureResult:
    exposure_ratio: float


def calculate_exposure(data: ExposureInput) -> ExposureResult:
    """Calculate exposure ratio in [0, 1]."""
    if data.total_assets <= 0:
        raise ValueError("total_assets must be > 0")
    if data.quantum_vulnerable_assets < 0:
        raise ValueError("quantum_vulnerable_assets must be >= 0")

    ratio = data.quantum_vulnerable_assets / data.total_assets
    ratio = max(0.0, min(1.0, ratio))
    return ExposureResult(exposure_ratio=ratio)
