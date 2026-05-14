# Phase 5 Change Freeze and Rollback Criteria

Purpose: define deterministic release freeze controls and rollback thresholds for go/no-go and incident response.

## Freeze window policy
- Standard freeze starts 24 hours before production cutover.
- During freeze, only allow:
- critical reliability/security fixes,
- release-blocking defect fixes,
- explicitly approved rollback-prep changes.

## Entry criteria for freeze
- CI gates green for target SHA.
- Required evidence checklist prepared (`06-release-evidence-pack-template.md`).
- On-call and incident commander contacts confirmed.

## Go criteria at release decision
- Required checks green: `scripts-validation`, `lint`, `test`, `contracts`, `security-readiness`, `dockerfile-build-evidence`, `checkov-dockerfiles`, `integration-docker`, `integration-resilience`.
- Smoke and resilience outcomes attached.
- No unresolved Critical security findings without approved exception.
- Risk exceptions documented with expiry.

## Rollback trigger criteria
Trigger rollback if any are true post-deploy:
- Health/readiness fails for 10 consecutive minutes.
- Error-rate materially above baseline for 10 minutes and customer-impacting.
- Core endpoint regression (`/api/v1/risk`, `/api/v1/inventory`, `/api/v1/migration/*`) blocks primary use case.
- Security control regression (missing headers, failed auth gate, secret exposure risk).

## Rollback execution baseline
- Follow `01-operations-runbooks.md` rollback procedure.
- Revert to last known-good artifact/commit.
- Verify recovery with health probes and smoke checks.
- Capture timeline and decision rationale in release evidence.

## Freeze exception process
- Required fields: justification, risk level, owner, approver, expiry.
- Emergency exceptions must be reviewed within 24 hours after merge/deploy.

## Decision log template
- Release ID:
- Freeze start/end (UTC):
- Decision (`Go`/`No-Go`):
- Decision makers:
- Rollback triggered (`Yes/No`):
- Trigger reason:
- Evidence links:
