from pathlib import Path

import pytest

from qasm_workflows import QasmManifest, run_manifest


def test_run_manifest_returns_validated_metadata(tmp_path: Path) -> None:
    qasm_file = tmp_path / "simple.qasm"
    qasm_file.write_text("OPENQASM 2.0;\nqreg q[1];\n", encoding="utf-8")
    manifest = QasmManifest(workflow_name="wf", qasm_path=str(qasm_file), shots=16)

    result = run_manifest(manifest)

    assert result["status"] == "validated"
    assert result["line_count"] == 2
    assert result["manifest_hash"] == manifest.hash()


def test_run_manifest_rejects_non_qasm_extension(tmp_path: Path) -> None:
    bad_file = tmp_path / "simple.txt"
    bad_file.write_text("OPENQASM 2.0;\n", encoding="utf-8")
    manifest = QasmManifest(workflow_name="wf", qasm_path=str(bad_file), shots=16)

    with pytest.raises(ValueError, match=r"\.qasm extension"):
        run_manifest(manifest)


def test_run_manifest_rejects_non_positive_shots(tmp_path: Path) -> None:
    qasm_file = tmp_path / "simple.qasm"
    qasm_file.write_text("OPENQASM 2.0;\n", encoding="utf-8")
    manifest = QasmManifest(workflow_name="wf", qasm_path=str(qasm_file), shots=0)

    with pytest.raises(ValueError, match="positive integer"):
        run_manifest(manifest)
