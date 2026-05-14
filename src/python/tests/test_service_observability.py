from __future__ import annotations

import json
import threading
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer

from service import Handler


def _start_server() -> tuple[ThreadingHTTPServer, str]:
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    host, port = server.server_address
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, f"http://{host}:{port}"


def test_health_endpoints_and_request_id_header() -> None:
    server, base_url = _start_server()
    try:
        for path in ("/health", "/live", "/ready"):
            req = urllib.request.Request(f"{base_url}{path}")
            req.add_header("X-Request-Id", "test-req-id")
            with urllib.request.urlopen(req) as resp:  # noqa: S310
                payload = json.loads(resp.read().decode("utf-8"))
                assert resp.status == 200
                assert payload["status"] == "ok"
                assert resp.headers.get("X-Request-Id") == "test-req-id"
    finally:
        server.shutdown()
        server.server_close()


def test_metrics_endpoint_exports_red_counters() -> None:
    server, base_url = _start_server()
    try:
        with urllib.request.urlopen(f"{base_url}/health") as resp:  # noqa: S310
            assert resp.status == 200

        try:
            urllib.request.urlopen(f"{base_url}/missing")  # noqa: S310
            raise AssertionError("expected 404")
        except urllib.error.HTTPError as err:
            assert err.code == 404

        with urllib.request.urlopen(f"{base_url}/metrics") as resp:  # noqa: S310
            assert resp.status == 200
            assert resp.headers.get("Content-Type", "").startswith("text/plain")
            body = resp.read().decode("utf-8")
            assert "request_count " in body
            assert "error_count " in body
            assert "latency_ms_sum " in body
    finally:
        server.shutdown()
        server.server_close()
