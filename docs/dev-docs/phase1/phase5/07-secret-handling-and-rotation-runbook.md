# Phase 5 Secret Handling and Rotation Runbook

Purpose: define how to handle, rotate, and verify secrets for this repository's deployment surfaces without storing secrets in git.

## Scope
- Services: `gateway`, `discovery`, `python-analysis`, `rust-risk`, `qasm-service`, `nginx`.
- Environments: local compose and Choreo runtime.
- Secret classes: API keys, DB credentials, tokens, cert private keys, webhook secrets.

## Baseline policy
- Never commit secrets to git.
- Use environment/secret manager injection only.
- Prefer short-lived credentials where provider supports it.
- Rotate all long-lived secrets on schedule and on incident.

## Current repo-grounded secret touch points
- Runtime env wiring: `docker-compose.microservices.yml`, `docker-images/nginx/entrypoint.sh`, `src/web/lib/api.ts`.
- Local cert generation path: `scripts/generate-local-certs.sh` -> `docker-images/nginx/certs`.
- CI workflow (no plaintext secrets checked in): `.github/workflows/ci.yml`.

## Rotation cadence
- High-risk credentials (external provider/API tokens): every 30 days.
- Service-to-service/static credentials: every 90 days.
- Emergency rotation: immediately on incident, suspected leak, or personnel offboarding.

## Standard rotation procedure
1. Inventory affected secret(s): owner, consumers, fallback owner.
2. Create new secret in target secret store.
3. Deploy in dual-read phase if supported (old+new valid window).
4. Update runtime bindings (Choreo/environment variables/CI secret refs).
5. Roll restart services and verify readiness:
- `GET /health`, `GET /ready` for affected services.
6. Execute functional smoke:
- `make docker-smoke` (local) or equivalent CI checks.
7. Revoke old secret and confirm no downstream auth failures.
8. Record rotation evidence in release pack.

## Emergency rotation checklist
- Trigger source documented (alert, ticket, incident).
- Blast radius identified.
- New credentials issued.
- Services restarted and probes green.
- Old credentials revoked.
- Post-rotation validation completed.
- Incident report linked.

## Verification checklist (attach to release evidence)
- [ ] No secret values present in repo history for rotated key names.
- [ ] Runtime references updated for all consumers.
- [ ] Health/readiness probes pass after rotation.
- [ ] Smoke/resilience checks pass after rotation.
- [ ] Old credentials revoked and audit trail captured.
- [ ] Rotation log updated with owner/date/expiry.

## Evidence fields
- Secret ID/class:
- Owner:
- Rotation date/time (UTC):
- Expiry/next rotation due:
- Validation artifacts:
- Approval:

## Known constraints
- This runbook provides process and evidence structure; actual secret-store execution is environment/org-specific and remains operationally executed outside git.
