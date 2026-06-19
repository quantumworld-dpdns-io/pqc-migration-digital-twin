#!/usr/bin/env python3
"""Python analysis microservice for HNDL and QASM workflow validation."""

from __future__ import annotations

import json
import os
from pathlib import Path
import logging
import threading
import time
import uuid
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from hndl_analysis import ExposureInput, calculate_exposure, get_policy_template, rank_backlog_rows, score_exposure
from qasm_workflows.manifest import QasmManifest
from qasm_workflows.runner import run_manifest


class Metrics:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.request_count = 0
        self.error_count = 0
        self.latency_ms_sum = 0
        self.latency_ms_max = 0

    def record(self, *, status: int, latency_ms: int) -> None:
        with self._lock:
            self.request_count += 1
            if status >= 400:
                self.error_count += 1
            self.latency_ms_sum += latency_ms
            if latency_ms > self.latency_ms_max:
                self.latency_ms_max = latency_ms

    def render(self) -> str:
        with self._lock:
            count = self.request_count
            err = self.error_count
            lat_sum = self.latency_ms_sum
            lat_max = self.latency_ms_max
        lat_avg = (lat_sum / count) if count else 0.0
        return (
            f"request_count {count}\n"
            f"error_count {err}\n"
            f"latency_ms_count {count}\n"
            f"latency_ms_sum {lat_sum}\n"
            f"latency_ms_avg {lat_avg:.3f}\n"
            f"latency_ms_max {lat_max}\n"
        )


METRICS = Metrics()


class Handler(BaseHTTPRequestHandler):
    def _request_id(self) -> str:
        inbound = self.headers.get("X-Request-Id")
        if inbound and len(inbound) <= 128:
            return inbound
        return uuid.uuid4().hex

    def _log_event(self, *, status: int, error: str | None = None) -> None:
        duration_ms = int((time.time() - self._request_start_ts) * 1000)
        METRICS.record(status=status, latency_ms=duration_ms)
        logging.info(
            json.dumps(
                {
                    "ts_ms": int(time.time() * 1000),
                    "service": "python-analysis",
                    "method": self.command,
                    "path": self.path,
                    "status": status,
                    "request_id": getattr(self, "_current_request_id", None),
                    "duration_ms": duration_ms,
                    "client_ip": self.client_address[0] if self.client_address else None,
                    "error": error,
                }
            )
        )

    def _json(self, code: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("X-Request-Id", self._current_request_id)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
        self._log_event(status=code)

    def do_GET(self) -> None:  # noqa: N802
        self._request_start_ts = time.time()
        self._current_request_id = self._request_id()
        if self.path == "/metrics":
            self._metrics()
            return
        if self.path == "/health":
            self._json(HTTPStatus.OK, {"status": "ok", "service": "python-analysis"})
            return
        if self.path in {"/live", "/ready"}:
            self._json(HTTPStatus.OK, {"status": "ok", "service": "python-analysis"})
            return
        self._json(HTTPStatus.NOT_FOUND, {"error": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        self._request_start_ts = time.time()
        self._current_request_id = self._request_id()
        content_len = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(content_len) if content_len else b"{}"
        try:
            payload = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            self._json(HTTPStatus.BAD_REQUEST, {"error": "invalid json"})
            return

        if self.path == "/hndl/score":
            self._handle_hndl(payload)
            return
        if self.path == "/hndl/backlog":
            self._handle_backlog(payload)
            return
        if self.path == "/qasm/run":
            self._handle_qasm(payload)
            return

        self._json(HTTPStatus.NOT_FOUND, {"error": "not found"})

    def log_message(self, format: str, *args: object) -> None:  # noqa: A003
        return

    def _handle_hndl(self, payload: dict) -> None:
        try:
            total_assets = float(payload.get("total_assets", 0))
            quantum_assets = float(payload.get("quantum_vulnerable_assets", 0))
            policy_name = str(payload.get("policy", "balanced"))
            exposure = calculate_exposure(
                ExposureInput(total_assets=total_assets, quantum_vulnerable_assets=quantum_assets)
            )
            policy = get_policy_template(policy_name)
            score = score_exposure(exposure, policy)
        except Exception as exc:  # noqa: BLE001
            self._json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
            return

        self._json(
            HTTPStatus.OK,
            {
                "policy": policy.name,
                "exposure_ratio": exposure.exposure_ratio,
                "score": score,
            },
        )

    def _handle_backlog(self, payload: dict) -> None:
        try:
            policy_name = str(payload.get("policy", "balanced"))
            asset_rows = payload.get("asset_rows", [])
            if not isinstance(asset_rows, list):
                raise ValueError("asset_rows must be a list")
            ranked = rank_backlog_rows(asset_rows, policy_name=policy_name)
        except Exception as exc:  # noqa: BLE001
            self._json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
            return

        self._json(HTTPStatus.OK, {"policy": policy_name, "backlog": ranked})

    def _handle_qasm(self, payload: dict) -> None:
        try:
            name = str(payload.get("name", "")).strip()
            if name:
                if Path(name).name != name or Path(name).suffix.lower() != ".qasm":
                    raise ValueError("name must be a safe .qasm filename")
                configured_dir = os.environ.get("QASM_EXAMPLES_DIR", "").strip()
                if configured_dir:
                    examples_dir = Path(configured_dir)
                else:
                    candidates = (
                        Path(__file__).resolve().parent.parent / "qasm/examples",
                        Path("src/qasm/examples"),
                        Path("qasm_examples"),
                    )
                    examples_dir = next((candidate for candidate in candidates if candidate.is_dir()), candidates[0])
                qasm_path = examples_dir / name
            else:
                qasm_path = Path(str(payload.get("qasm_path", "src/qasm/examples/bell_pair.qasm")))
            manifest = QasmManifest(
                workflow_name=str(payload.get("workflow_name", "default-workflow")),
                qasm_path=str(qasm_path),
                backend=str(payload.get("backend", "simulator")),
                shots=int(payload.get("shots", 1024)),
            )
            result = run_manifest(manifest)
        except Exception as exc:  # noqa: BLE001
            self._json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
            return

        self._json(HTTPStatus.OK, result)

    def _metrics(self) -> None:
        body = METRICS.render().encode("utf-8")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("X-Request-Id", self._current_request_id)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
        self._log_event(status=HTTPStatus.OK)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    server = ThreadingHTTPServer(("0.0.0.0", 8082), Handler)
    print("python analysis service listening on :8082")
    server.serve_forever()


if __name__ == "__main__":
    main()
