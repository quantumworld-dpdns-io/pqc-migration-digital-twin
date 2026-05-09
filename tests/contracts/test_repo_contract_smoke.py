"""Repository contract smoke tests.

These checks guard compatibility at project boundaries:
- Gateway OpenAPI contract exists and is structurally valid.
- Gateway route surface in Go implementation matches OpenAPI paths/methods.
- Rust workspace/member contract layout.
- Web package scripts/dependencies required by CI and frontend entrypoints.
"""

from __future__ import annotations

import json
import re
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_gateway_openapi_contract_is_present_and_valid() -> None:
    spec_path = ROOT / "docs/api/gateway-openapi.json"
    spec = json.loads(spec_path.read_text(encoding="utf-8"))

    assert spec.get("openapi", "").startswith("3."), "openapi version must be 3.x"
    assert spec.get("info", {}).get("title"), "info.title is required"

    required_paths = {
        "/health": {"get"},
        "/api/v1/discovery": {"post"},
        "/api/v1/risk": {"post"},
        "/api/v1/proof": {"post"},
        "/api/v1/qasm": {"post"},
    }

    paths = spec.get("paths", {})
    for path, methods in required_paths.items():
        assert path in paths, f"missing OpenAPI path: {path}"
        present = {m.lower() for m in paths[path].keys()}
        missing = methods - present
        assert not missing, f"missing methods for {path}: {sorted(missing)}"


def test_gateway_code_routes_match_openapi_contract() -> None:
    server_go = ROOT / "src/go/gateway/server.go"
    text = server_go.read_text(encoding="utf-8")

    openapi = json.loads((ROOT / "docs/api/gateway-openapi.json").read_text(encoding="utf-8"))
    openapi_paths = set(openapi["paths"].keys())

    route_literals = set(re.findall(r'mux\.HandleFunc\("([^"]+)"', text))
    assert openapi_paths.issubset(route_literals), (
        f"gateway routes missing OpenAPI paths: {sorted(openapi_paths - route_literals)}"
    )

    # Method contract checks from implementation handlers.
    required_method_checks = {
        "health": "r.Method != http.MethodGet",
        "discovery": "r.Method != http.MethodPost",
        "risk": "r.Method != http.MethodPost",
        "proof": "r.Method != http.MethodPost",
        "qasm": "r.Method != http.MethodPost",
    }
    for label, marker in required_method_checks.items():
        assert marker in text, f"missing method check for {label}: {marker}"


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
    for script in ("dev", "build", "lint", "test"):
        assert script in scripts, f"missing npm script contract: {script}"

    deps = package.get("dependencies", {})
    for dep in ("next", "react", "react-dom"):
        assert dep in deps, f"missing runtime dependency contract: {dep}"
