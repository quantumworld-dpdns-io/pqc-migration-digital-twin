from qasm_workflows import QasmManifest


def test_manifest_hash_deterministic() -> None:
    a = QasmManifest(workflow_name="wf", qasm_path="src/qasm/examples/bell_pair.qasm", shots=2048)
    b = QasmManifest(workflow_name="wf", qasm_path="src/qasm/examples/bell_pair.qasm", shots=2048)
    assert a.hash() == b.hash()


def test_manifest_hash_changes_on_content_change() -> None:
    a = QasmManifest(workflow_name="wf-a", qasm_path="src/qasm/examples/bell_pair.qasm", shots=2048)
    b = QasmManifest(workflow_name="wf-b", qasm_path="src/qasm/examples/bell_pair.qasm", shots=2048)
    assert a.hash() != b.hash()
