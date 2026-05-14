# Phase 5 Evidence Retention and Access-Control Policy

Purpose: define retention, integrity, and access controls for audit artifacts used in production readiness and release governance.

## Scope
- Artifacts from CI, integration tests, DR drills, security scans, release approvals.
- Applies to evidence linked from `06-release-evidence-pack-template.md` and `03-controls-evidence-matrix.md`.

## Evidence classes
- Build/test evidence: CI logs, job summaries, smoke outputs.
- Security evidence: Trivy outputs, Checkov outputs, SBOM artifacts.
- Reliability evidence: resilience logs, DR drill logs, recovery timings.
- Governance evidence: go/no-go approvals, risk exceptions, sign-off records.

## Retention policy
- Release evidence pack: 3 years minimum.
- Security scan/SBOM artifacts: 3 years minimum.
- DR drill and incident exercise evidence: 2 years minimum.
- Routine CI transient logs not linked to a release: 90 days.

## Access-control policy
- Principle: least privilege, need-to-know.
- Write access: release managers, security approvers, designated SRE/Ops owners.
- Read access: engineering leads, compliance/security reviewers, incident managers.
- Public sharing prohibited unless redacted and explicitly approved.

## Integrity and immutability requirements
- Evidence links must reference immutable commit SHA or immutable CI run artifacts.
- Post-approval edits to evidence records require a new append-only correction entry.
- Tamper checks: hash or artifact ID captured for security-critical reports when available.

## Storage locations
- In-repo control docs/templates:
- `docs/dev-docs/phase1/phase5/03-controls-evidence-matrix.md`
- `docs/dev-docs/phase1/phase5/06-release-evidence-pack-template.md`
- External artifact stores (CI platform/object store/ticketing system) hold raw logs/reports.

## Verification checklist
- [ ] All required release evidence fields are populated.
- [ ] Links resolve to immutable artifacts.
- [ ] Access ACL reviewed for current release folder/run.
- [ ] Sensitive content redaction completed where required.
- [ ] Retention expiry metadata assigned.
- [ ] Reviewer signed retention/access compliance.

## Exceptions
- Any deviation (shorter retention, broader access) requires documented risk acceptance with owner and expiry.
