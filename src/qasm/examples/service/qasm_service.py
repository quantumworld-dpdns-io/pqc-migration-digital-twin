#!/usr/bin/env python3
"""QASM examples microservice."""

from __future__ import annotations

import hashlib
import json
import re
import time
import uuid
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

EXAMPLES_DIR = Path(__file__).resolve().parent.parent
REQUEST_ID_RE = re.compile(r"^[A-Za-z0-9._:-]{6,128}$")


class Handler(BaseHTTPRequestHandler):
    def _request_id(self) -> str:
        inbound = self.headers.get("X-Request-Id", "").strip()
        if inbound and REQUEST_ID_RE.match(inbound):
            return inbound
        return f"req-{uuid.uuid4().hex[:16]}"

    def _json(self, code: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Request-Id", self._rid)
        self.end_headers()
        self.wfile.write(body)
        self._status_code = int(code)

    def _log_request(self, *, error: str | None = None) -> None:
        duration_ms = int((time.time() - self._start_ts) * 1000)
        event = {
            "ts_ms": int(time.time() * 1000),
            "service": "qasm-examples",
            "method": self.command,
            "path": self.path,
            "status": self._status_code,
            "request_id": self._rid,
            "duration_ms": duration_ms,
            "client_ip": self.client_address[0] if self.client_address else "",
            "error": error,
        }
        print(json.dumps(event, separators=(",", ":")))

    def do_GET(self) -> None:  # noqa: N802
        self._start_ts = time.time()
        self._status_code = int(HTTPStatus.INTERNAL_SERVER_ERROR)
        self._rid = self._request_id()
        try:
            if self.path in ("/health", "/live", "/ready"):
                self._json(HTTPStatus.OK, {"status": "ok", "service": "qasm-examples"})
                self._log_request()
                return

            if self.path == "/examples":
                entries = []
                for file in sorted(EXAMPLES_DIR.glob("*.qasm")):
                    content = file.read_bytes()
                    entries.append(
                        {
                            "name": file.name,
                            "sha256": hashlib.sha256(content).hexdigest(),
                            "bytes": len(content),
                        }
                    )
                self._json(HTTPStatus.OK, {"examples": entries})
                self._log_request()
                return

            if self.path.startswith("/examples/"):
                name = self.path.split("/examples/", 1)[1]
                qasm_file = EXAMPLES_DIR / name
                if not qasm_file.exists() or qasm_file.suffix.lower() != ".qasm":
                    self._json(HTTPStatus.NOT_FOUND, {"error": "example not found"})
                    self._log_request()
                    return
                self._json(HTTPStatus.OK, {"name": name, "source": qasm_file.read_text(encoding="utf-8")})
                self._log_request()
                return

            self._json(HTTPStatus.NOT_FOUND, {"error": "not found"})
            self._log_request()
        except Exception as exc:  # pragma: no cover - defensive
            self._json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": "internal server error"})
            self._log_request(error=str(exc))


def main() -> None:
    server = ThreadingHTTPServer(("0.0.0.0", 8084), Handler)
    print("qasm examples service listening on :8084")
    server.serve_forever()


if __name__ == "__main__":
    main()
