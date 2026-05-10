#!/usr/bin/env python3
"""Lightweight tests for qasm example service behavior."""

from __future__ import annotations

import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from qasm_service import Handler


class _Headers:
    def __init__(self, value: str | None = None) -> None:
        self._value = value

    def get(self, key: str, default: str = "") -> str:
        if key.lower() == "x-request-id" and self._value is not None:
            return self._value
        return default


class _WFile:
    def __init__(self) -> None:
        self.data = b""

    def write(self, b: bytes) -> None:
        self.data += b


class _FakeHandler:
    _request_id = Handler._request_id
    _json = Handler._json
    _log_request = Handler._log_request

    def __init__(self, path: str, inbound_request_id: str | None = None) -> None:
        self.path = path
        self.command = "GET"
        self.client_address = ("127.0.0.1", 12345)
        self.headers = _Headers(inbound_request_id)
        self._status_code = 500
        self._start_ts = 0.0
        self._rid = ""
        self.response_status = None
        self.response_headers = {}
        self.wfile = _WFile()

    def send_response(self, code: int) -> None:
        self.response_status = code

    def send_header(self, key: str, value: str) -> None:
        self.response_headers[key] = value

    def end_headers(self) -> None:
        return


class QasmServiceTests(unittest.TestCase):
    def test_health_live_ready_and_request_id(self) -> None:
        for path in ("/health", "/live", "/ready"):
            fake = _FakeHandler(path, "req-test-123456")
            Handler.do_GET(fake)  # type: ignore[arg-type]
            self.assertEqual(fake._status_code, 200)
            self.assertEqual(fake.response_headers.get("X-Request-Id"), "req-test-123456")

    def test_metrics_endpoint_exports_red_counters(self) -> None:
        Handler.do_GET(_FakeHandler("/health"))  # type: ignore[arg-type]
        Handler.do_GET(_FakeHandler("/missing"))  # type: ignore[arg-type]
        metrics = _FakeHandler("/metrics")
        Handler.do_GET(metrics)  # type: ignore[arg-type]
        self.assertEqual(metrics.response_status, 200)
        self.assertTrue(metrics.response_headers.get("Content-Type", "").startswith("text/plain"))
        body = metrics.wfile.data.decode("utf-8")
        self.assertIn("request_count ", body)
        self.assertIn("error_count ", body)
        self.assertIn("latency_ms_sum ", body)


if __name__ == "__main__":
    unittest.main()
