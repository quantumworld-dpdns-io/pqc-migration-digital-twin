#!/usr/bin/env python3
"""CLI entrypoint for HNDL analysis."""

from __future__ import annotations

import argparse

from hndl_analysis import ExposureInput, calculate_exposure, get_policy_template, score_exposure


def main() -> int:
    parser = argparse.ArgumentParser(description="Run HNDL exposure analysis")
    parser.add_argument("--total-assets", type=float, required=True)
    parser.add_argument("--quantum-vulnerable-assets", type=float, required=True)
    parser.add_argument("--policy", default="balanced", choices=["strict", "balanced", "lenient"])
    args = parser.parse_args()

    exposure = calculate_exposure(
        ExposureInput(
            total_assets=args.total_assets,
            quantum_vulnerable_assets=args.quantum_vulnerable_assets,
        )
    )
    policy = get_policy_template(args.policy)
    score = score_exposure(exposure, policy)

    print(f"policy={policy.name} exposure_ratio={exposure.exposure_ratio:.4f} score={score}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
