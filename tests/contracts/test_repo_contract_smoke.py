"""Repository contract smoke tests.

These checks guard compatibility at project boundaries:
- Gateway API route surface and response keys.
- Rust workspace/member contract layout.
- Web package scripts/dependencies required by CI and frontend entrypoints.
"""

from __future__ import annotations

import json
import re
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_gateway_v1_routes_and_response_keys_are_present() -> None:
    server_go = ROOT / "src/go/gateway/server.go"
    text = server_go.read_text(encoding="utf-8")

    required_routes = {
        "/health",
        "/api/v1/discovery",
        "/api/v1/risk",
        "/api/v1/proof",
        "/api/v1/qasm",
    }
    for route in required_routes:
        assert f'"{route}"' in text, f"missing route contract: {route}"

    # Contract keys expected by downstream consumers.
    required_payload_keys = {"service", "status", "risk_score", "proof_id", "qasm", "assets"}
    seen_keys = set(re.findall(r'"([a-z_]+)"\s*:', text))
    missing = required_payload_keys - seen_keys
    assert not missing, f"missing response payload keys: {sorted(missing)}"


def test_rust_workspace_members_and_contract_types_exist() -> None:
    workspace_toml = ROOT / "src/rust/Cargo.toml"
    workspace = tomllib.loads(workspace_toml.read_text(encoding="utf-8"))
    members = workspace["workspace"]["members"]

    for member in members:
        assert (ROOT / "src/rust" / member / "Cargo.toml").is_file(), f"missing Cargo.toml for member: {member}"

    contracts_lib = (ROOT / "src/rust/shared-contracts/src/lib.rs").read_text(encoding="utf-8")
    for symbol in ("ApplicantProfile", "RiskScore", "RiskBand"):
        assert f"struct {symbol}" in contracts_lib or f"enum {symbol}" in contracts_lib, (
            f"missing shared contract type: {symbol}"
        )


def test_web_package_contract_scripts_and_runtime_deps_exist() -> None:
    package_json = ROOT / "src/web/package.json"
    package = json.loads(package_json.read_text(encoding="utf-8"))

    scripts = package.get("scripts", {})
    for script in ("dev", "build", "lint"):
        assert script in scripts, f"missing npm script contract: {script}"

    deps = package.get("dependencies", {})
    for dep in ("next", "react", "react-dom"):
        assert dep in deps, f"missing runtime dependency contract: {dep}"
