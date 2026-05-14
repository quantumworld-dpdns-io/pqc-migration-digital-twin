from locust import HttpUser, task, between


RISK_PAYLOAD_10K = {"total_assets": 10000, "quantum_vulnerable_assets": 4200}
BACKLOG_PAYLOAD_10K = {
    "policy": "balanced",
    "asset_rows": [
        {"asset_id": "asset-a", "total_assets": 10000, "quantum_vulnerable_assets": 6700},
        {"asset_id": "asset-b", "total_assets": 10000, "quantum_vulnerable_assets": 3300},
        {"asset_id": "asset-c", "total_assets": 10000, "quantum_vulnerable_assets": 5100},
    ],
}
PROOF_PAYLOAD = {
    "credit_score": 720,
    "debt_to_income_bps": 3500,
    "late_payments": 1,
    "existing_loans": 2,
}


class Benchmark10kUser(HttpUser):
    wait_time = between(0.01, 0.05)

    @task(3)
    def risk_score_10k(self):
        self.client.post("/api/v1/risk", json=RISK_PAYLOAD_10K, name="POST /api/v1/risk (10k)")

    @task(2)
    def risk_backlog_10k(self):
        self.client.post("/api/v1/risk/backlog", json=BACKLOG_PAYLOAD_10K, name="POST /api/v1/risk/backlog (10k)")

    @task(2)
    def discovery_and_assets(self):
        self.client.post(
            "/api/v1/discovery",
            json={"address": "example.com", "port": 443},
            name="POST /api/v1/discovery",
        )
        self.client.get("/api/v1/assets", name="GET /api/v1/assets")

    @task(1)
    def proof(self):
        self.client.post("/api/v1/proof", json=PROOF_PAYLOAD, name="POST /api/v1/proof")

    @task(1)
    def qasm(self):
        self.client.post("/api/v1/qasm", json={}, name="POST /api/v1/qasm")
