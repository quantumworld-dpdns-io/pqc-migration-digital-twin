"""Runner stub for QASM workflows."""

from __future__ import annotations

from pathlib import Path

from .manifest import QasmManifest


def run_manifest(manifest: QasmManifest) -> dict[str, str | int]:
    """Stub runner that validates path existence and returns metadata."""
    qasm_file = Path(manifest.qasm_path)
    if not qasm_file.exists():
        raise FileNotFoundError(f"QASM file not found: {qasm_file}")

    return {
        "workflow_name": manifest.workflow_name,
        "qasm_path": str(qasm_file),
        "shots": manifest.shots,
        "manifest_hash": manifest.hash(),
        "status": "stubbed",
    }
