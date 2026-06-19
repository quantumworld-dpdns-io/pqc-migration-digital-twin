import json
import threading
from http.client import HTTPConnection
from http.server import ThreadingHTTPServer

from service import Handler


def _post(server: ThreadingHTTPServer, payload: dict) -> tuple[int, dict]:
    conn = HTTPConnection("127.0.0.1", server.server_port, timeout=5)
    conn.request("POST", "/qasm/run", body=json.dumps(payload), headers={"Content-Type": "application/json"})
    response = conn.getresponse()
    return response.status, json.loads(response.read().decode("utf-8"))


def test_qasm_run_resolves_named_example_and_backend(tmp_path, monkeypatch) -> None:
    (tmp_path / "bell_pair.qasm").write_text("OPENQASM 2.0;\nqreg q[2];\n", encoding="utf-8")
    monkeypatch.setenv("QASM_EXAMPLES_DIR", str(tmp_path))
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        status, body = _post(server, {
            "name": "bell_pair.qasm",
            "workflow_name": "browser-run",
            "backend": "simulator",
            "shots": 256,
        })
        invalid_status, _ = _post(server, {"name": "../bell_pair.qasm", "shots": 1})
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)

    assert status == 200
    assert body["status"] == "validated"
    assert body["workflow_name"] == "browser-run"
    assert body["backend"] == "simulator"
    assert body["shots"] == 256
    assert body["line_count"] == 2
    assert invalid_status == 400
