#!/usr/bin/env python3
"""Python analysis microservice for HNDL and QASM workflow validation."""

from __future__ import annotations

import json
import os
from pathlib import Path
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from hndl_analysis import ExposureInput, calculate_exposure, get_policy_template, rank_backlog_rows, score_exposure
from qasm_workflows.manifest import QasmManifest
from qasm_workflows.runner import run_manifest


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
            self._json(HTTPStatus.OK, {"status": "ok", "service": "python-analysis"})
            return
        self._json(HTTPStatus.NOT_FOUND, {"error": "not found"})

    def do_POST(self) -> None:  # noqa: N802
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
                examples_dir = Path(os.environ.get("QASM_EXAMPLES_DIR", "qasm_examples"))
                qasm_path = examples_dir / name
            else:
                qasm_path = Path(str(payload.get("qasm_path", "qasm_examples/bell_pair.qasm")))
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


def main() -> None:
    server = ThreadingHTTPServer(("0.0.0.0", 8082), Handler)
    print("python analysis service listening on :8082")
    server.serve_forever()


if __name__ == "__main__":
    main()
