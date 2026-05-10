# REL-20260510-draft Evidence Bundle

Created: 2026-05-10
Purpose: local draft evidence bundle referenced by `06-release-evidence-pack-2026-05-10.md`.

This bundle indexes the repository artifacts already captured for the 2026-05-10 release-readiness pass.

## Included evidence

| Area | Artifact | Path |
|---|---|---|
| DR drill | Local service-loss drill summary | `tests/integration/artifacts/dr-drill/20260510_145359/summary.json` |
| DR drill | Local service-loss drill log | `tests/integration/artifacts/dr-drill/20260510_145359/drill.log` |
| Benchmark | 10k-equivalent runtime summary | `tests/integration/artifacts/benchmark-10k/20260510_144427/summary.json` |
| Benchmark | 10k-equivalent raw Locust log | `tests/integration/artifacts/benchmark-10k/20260510_144427/locust.log` |
| Benchmark | 10k-equivalent stats CSV | `tests/integration/artifacts/benchmark-10k/20260510_144427/locust_stats.csv` |
| Benchmark | 10k-equivalent failures CSV | `tests/integration/artifacts/benchmark-10k/20260510_144427/locust_failures.csv` |
| Checkov | Dockerfile policy scan result | `tests/integration/artifacts/choreo-validation/20260510_145624/checkov.log` |
| Checkov | Dockerfile policy scan exit code | `tests/integration/artifacts/choreo-validation/20260510_145624/checkov.exit` |

## Supporting docs

| Area | Document |
|---|---|
| Release evidence pack | `docs/dev-docs/phase1/phase5/06-release-evidence-pack-2026-05-10.md` |
| DR evidence record | `docs/dev-docs/phase1/phase5/12-dr-drill-evidence-2026-05-10.md` |
| SLO and RED baseline | `docs/dev-docs/phase1/phase5/04-slo-error-budget-spec.md`, `docs/dev-docs/phase1/phase5/11-red-dashboard-alert-baseline.md` |
| Controls mapping | `docs/dev-docs/phase1/phase5/03-controls-evidence-matrix.md` |

## Notes

- This bundle is a repository-local evidence index.
- External approvals, monitoring exports, and governance sign-offs remain tracked in the parent release evidence document.
