"""MVP scaffold runner for QASM workflows."""

from __future__ import annotations

from pathlib import Path

from .manifest import QasmManifest


def run_manifest(manifest: QasmManifest) -> dict[str, str | int]:
    """MVP scaffold runner that validates minimal execution metadata."""
    qasm_file = Path(manifest.qasm_path)
    if not qasm_file.exists():
        raise FileNotFoundError(f"QASM file not found: {qasm_file}")
    if qasm_file.suffix.lower() != ".qasm":
        raise ValueError(f"QASM file must use .qasm extension: {qasm_file}")
    if manifest.shots <= 0:
        raise ValueError("shots must be a positive integer")

    qasm_text = qasm_file.read_text(encoding="utf-8")
    if not qasm_text.strip():
        raise ValueError(f"QASM file is empty: {qasm_file}")

    return {
        "workflow_name": manifest.workflow_name,
        "qasm_path": str(qasm_file),
        "shots": manifest.shots,
        "line_count": len(qasm_text.splitlines()),
        "manifest_hash": manifest.hash(),
        "status": "validated",
    }
