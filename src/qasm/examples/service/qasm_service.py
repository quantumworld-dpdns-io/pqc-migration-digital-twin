#!/usr/bin/env python3
"""QASM examples microservice."""

from __future__ import annotations

import hashlib
import json
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

EXAMPLES_DIR = Path(__file__).resolve().parent.parent


class Handler(BaseHTTPRequestHandler):
    def _json(self, code: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/health":
            self._json(HTTPStatus.OK, {"status": "ok", "service": "qasm-examples"})
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
            return

        if self.path.startswith("/examples/"):
            name = self.path.split("/examples/", 1)[1]
            qasm_file = EXAMPLES_DIR / name
            if not qasm_file.exists() or qasm_file.suffix.lower() != ".qasm":
                self._json(HTTPStatus.NOT_FOUND, {"error": "example not found"})
                return
            self._json(HTTPStatus.OK, {"name": name, "source": qasm_file.read_text(encoding="utf-8")})
            return

        self._json(HTTPStatus.NOT_FOUND, {"error": "not found"})


def main() -> None:
    server = ThreadingHTTPServer(("0.0.0.0", 8084), Handler)
    print("qasm examples service listening on :8084")
    server.serve_forever()


if __name__ == "__main__":
    main()
