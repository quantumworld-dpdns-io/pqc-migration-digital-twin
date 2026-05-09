#!/usr/bin/env python3
"""CLI entrypoint for QASM workflow runner."""

from __future__ import annotations

import argparse
import json

from qasm_workflows import QasmManifest, run_manifest


def main() -> int:
    parser = argparse.ArgumentParser(description="Run QASM workflow stub")
    parser.add_argument("--workflow-name", required=True)
    parser.add_argument("--qasm-path", required=True)
    parser.add_argument("--shots", type=int, default=1024)
    args = parser.parse_args()

    manifest = QasmManifest(
        workflow_name=args.workflow_name,
        qasm_path=args.qasm_path,
        shots=args.shots,
    )
    result = run_manifest(manifest)
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
