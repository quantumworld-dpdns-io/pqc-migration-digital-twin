from __future__ import annotations

import json
import threading
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
