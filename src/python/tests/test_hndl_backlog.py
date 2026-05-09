import json
import threading
from http.client import HTTPConnection
from http.server import ThreadingHTTPServer

from hndl_analysis import rank_backlog_rows
from service import Handler


def test_rank_backlog_rows_deterministic_ordering() -> None:
    rows = [
        {"asset_id": "b", "total_assets": 100, "quantum_vulnerable_assets": 90},
        {"asset_id": "a", "total_assets": 100, "quantum_vulnerable_assets": 90},
        {"asset_id": "c", "total_assets": 100, "quantum_vulnerable_assets": 10},
    ]

    ranked = rank_backlog_rows(rows, policy_name="balanced")

    assert [item["asset_id"] for item in ranked] == ["a", "b", "c"]
    assert [item["rank"] for item in ranked] == [1, 2, 3]


def test_rank_backlog_rows_output_schema() -> None:
    ranked = rank_backlog_rows(
        [{"asset_id": "svc-1", "total_assets": 10, "quantum_vulnerable_assets": 3}],
        policy_name="balanced",
    )

    row = ranked[0]
    expected_keys = {
        "asset_id",
        "total_assets",
        "quantum_vulnerable_assets",
        "policy",
        "exposure_ratio",
        "score",
        "rank",
        "rationale_over_threshold",
        "rationale_threshold_gap",
        "rationale_risk_band",
        "rationale_summary",
    }
    assert expected_keys.issubset(set(row.keys()))


def test_hndl_backlog_endpoint_returns_ranked_schema() -> None:
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    try:
        conn = HTTPConnection("127.0.0.1", server.server_port, timeout=5)
        payload = {
            "policy": "balanced",
            "asset_rows": [
                {"asset_id": "alpha", "total_assets": 100, "quantum_vulnerable_assets": 40},
                {"asset_id": "beta", "total_assets": 100, "quantum_vulnerable_assets": 20},
            ],
        }
        conn.request("POST", "/hndl/backlog", body=json.dumps(payload), headers={"Content-Type": "application/json"})
        response = conn.getresponse()
        body = json.loads(response.read().decode("utf-8"))
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)

    assert response.status == 200
    assert body["policy"] == "balanced"
    assert [item["asset_id"] for item in body["backlog"]] == ["alpha", "beta"]
    assert body["backlog"][0]["rank"] == 1
    assert "rationale_summary" in body["backlog"][0]
