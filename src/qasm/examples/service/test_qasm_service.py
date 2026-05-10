#!/usr/bin/env python3
"""Lightweight unit tests for qasm example service logic."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from qasm_service import Handler


class _Headers:
    def __init__(self, value: str | None = None) -> None:
        self._value = value

    def get(self, key: str, default: str = "") -> str:
        if key.lower() == "x-request-id" and self._value is not None:
            return self._value
        return default


class _FakeHandler:
    def __init__(self, path: str, inbound_request_id: str | None = None) -> None:
        self.path = path
        self.command = "GET"
        self.client_address = ("127.0.0.1", 12345)
        self.headers = _Headers(inbound_request_id)
        self.payload = None
        self._status_code = 500
        self.logged = False

    _request_id = Handler._request_id

    def _json(self, code: int, payload: dict) -> None:
        self._status_code = int(code)
        self.payload = payload

    def _log_request(self, *, error: str | None = None) -> None:
        self.logged = True


class QasmServiceTests(unittest.TestCase):
    def test_health_live_ready(self) -> None:
        for path in ("/health", "/live", "/ready"):
            fake = _FakeHandler(path)
            Handler.do_GET(fake)  # type: ignore[arg-type]
            self.assertEqual(fake._status_code, 200)
            self.assertEqual(fake.payload["status"], "ok")
            self.assertEqual(fake.payload["service"], "qasm-examples")
            self.assertTrue(fake.logged)

    def test_request_id_echo_and_generate(self) -> None:
        inbound = "req-inbound-abc123"
        fake_with_inbound = _FakeHandler("/examples", inbound)
        Handler.do_GET(fake_with_inbound)  # type: ignore[arg-type]
        self.assertEqual(fake_with_inbound._rid, inbound)

        fake_generated = _FakeHandler("/examples")
        Handler.do_GET(fake_generated)  # type: ignore[arg-type]
        self.assertTrue(str(fake_generated._rid).startswith("req-"))


if __name__ == "__main__":
    unittest.main()
