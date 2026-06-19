"""Manifest model for QASM workflow execution."""

from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass


@dataclass(frozen=True)
class QasmManifest:
    workflow_name: str
    qasm_path: str
    backend: str = "simulator"
    shots: int = 1024

    def canonical_json(self) -> str:
        return json.dumps(asdict(self), sort_keys=True, separators=(",", ":"))

    def hash(self) -> str:
        payload = self.canonical_json().encode("utf-8")
        return hashlib.sha256(payload).hexdigest()
