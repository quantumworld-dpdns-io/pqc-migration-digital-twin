# PQC Migration Digital Twin — API Reference

All requests go through **nginx** (the single public entry point).  
Set `GATEWAY_BASE_URL` to the nginx endpoint for your environment.

| Environment | Base URL |
|-------------|---------|
| Local dev | `http://localhost:8080` |
| Choreo dev | `https://<nginx-choreo-dev-url>` ← get from Choreo console |
| Choreo prod | `https://<nginx-choreo-prod-url>` |

Full OpenAPI spec: [`gateway-openapi.json`](./gateway-openapi.json)

---

## Health

### `GET /health`
```bash
curl $GATEWAY_BASE_URL/health
# {"status":"ok"}
```

---

## Discovery

### `POST /api/v1/discovery` — Run PQC asset scan
```bash
curl -X POST $GATEWAY_BASE_URL/api/v1/discovery \
  -H 'Content-Type: application/json' \
  -d '{"address":"example.com","port":443}'
```
**Response**
```json
{
  "target": { "address": "example.com", "port": 443 },
  "findings": [...],
  "persisted_new": 1,
  "persisted_total": 1
}
```

### `GET /api/v1/assets` — List all discovered assets
```bash
curl $GATEWAY_BASE_URL/api/v1/assets
```
**Response**
```json
{ "count": 1, "assets": [...] }
```

---

## Risk Scoring

### `POST /api/v1/risk` — HNDL exposure score
```bash
curl -X POST $GATEWAY_BASE_URL/api/v1/risk \
  -H 'Content-Type: application/json' \
  -d '{"total_assets":100,"quantum_vulnerable_assets":40,"policy":"balanced"}'
```
**Response**
```json
{ "policy": "balanced", "exposure_ratio": 0.4, "score": 72 }
```

### `POST /api/v1/risk/backlog` — Ranked remediation backlog
```bash
curl -X POST $GATEWAY_BASE_URL/api/v1/risk/backlog \
  -H 'Content-Type: application/json' \
  -d '{
    "policy": "balanced",
    "asset_rows": [
      {"asset_id":"asset-a","total_assets":100,"quantum_vulnerable_assets":65},
      {"asset_id":"asset-b","total_assets":100,"quantum_vulnerable_assets":20}
    ]
  }'
```

---

## ZK Proof (Rust)

### `POST /api/v1/proof` — Generate zero-knowledge risk proof
```bash
curl -X POST $GATEWAY_BASE_URL/api/v1/proof \
  -H 'Content-Type: application/json' \
  -d '{"statement":"pqc-risk-statement","credit_score":720,"debt_to_income_bps":3500,"late_payments":1,"existing_loans":2}'
```

---

## QASM Examples

### `POST /api/v1/qasm` — List or fetch QASM circuit files
```bash
# List all examples
curl -X POST $GATEWAY_BASE_URL/api/v1/qasm \
  -H 'Content-Type: application/json' \
  -d '{}'

# Fetch a specific file
curl -X POST $GATEWAY_BASE_URL/api/v1/qasm \
  -H 'Content-Type: application/json' \
  -d '{"name":"bell_pair.qasm"}'
```

---

## Governance

### `GET /api/v1/governance/exceptions` — List exceptions
```bash
curl $GATEWAY_BASE_URL/api/v1/governance/exceptions
```

### `POST /api/v1/governance/exceptions` — Create exception
```bash
curl -X POST $GATEWAY_BASE_URL/api/v1/governance/exceptions \
  -H 'Content-Type: application/json' \
  -d '{"asset_id":"asset-001","reason":"Temporary exemption","owner":"alice@example.com"}'
```

### `GET /api/v1/governance/verifier-drift` — Check verifier version drift
```bash
curl $GATEWAY_BASE_URL/api/v1/governance/verifier-drift
```
**Response**
```json
{ "current_verifier_version": "v0.1.0", "latest_verifier_version": "v0.1.0", "drift": false }
```

---

## Audit

### `GET /api/v1/audit/events` — Recent audit log
```bash
curl "$GATEWAY_BASE_URL/api/v1/audit/events?limit=20"
```
**Response**
```json
{ "events": [{ "timestamp": "...", "route": "/api/v1/risk", "method": "POST", "outcome": "success" }] }
```
