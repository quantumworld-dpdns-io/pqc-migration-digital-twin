# Phase 5 Backup and Restore Procedure (Local Compose)

Purpose: provide a concrete, repeatable backup/restore runbook for the current local compose stack with verification steps.

## Scope
- Compose file: `docker-compose.microservices.yml`
- Stateful component focus: `postgres` volume/data.
- Non-goal: cloud backup orchestration (tracked separately as external/runtime work).

## Prerequisites
- Docker + Docker Compose available.
- Running from repository root.
- Baseline stack can start: `make docker-up`.

## Variables
```bash
export BACKUP_DIR=./artifacts/backups
export TS=$(date +%Y%m%d-%H%M%S)
export BACKUP_FILE="$BACKUP_DIR/postgres-$TS.sql"
mkdir -p "$BACKUP_DIR"
```

## A) Create backup
1. Ensure stack is up.
```bash
make docker-up
```
2. Confirm postgres container name.
```bash
docker compose -f docker-compose.microservices.yml ps
```
3. Dump database to host artifact file.
```bash
docker compose -f docker-compose.microservices.yml exec -T postgres \
  pg_dumpall -U postgres > "$BACKUP_FILE"
```
4. Verify backup exists and is non-empty.
```bash
ls -lh "$BACKUP_FILE"
[ -s "$BACKUP_FILE" ]
```

## B) Restore backup
1. Stop stack.
```bash
make docker-down
```
2. Start only postgres.
```bash
docker compose -f docker-compose.microservices.yml up -d postgres
```
3. Wait for postgres readiness.
```bash
until docker compose -f docker-compose.microservices.yml exec -T postgres pg_isready -U postgres; do sleep 2; done
```
4. Restore dump.
```bash
cat "$BACKUP_FILE" | docker compose -f docker-compose.microservices.yml exec -T postgres psql -U postgres
```
5. Start full stack.
```bash
make docker-up
```

## C) Post-restore verification
1. Health check ingress.
```bash
curl -fsS http://localhost:8080/health
```
2. Run microservice smoke.
```bash
make docker-smoke
```
3. Run contracts (optional but recommended before release).
```bash
make contracts
```

## Success criteria
- Backup file created and non-empty.
- Restore command exits successfully.
- `/health` returns `200`.
- Smoke test passes after restore.

## Evidence to retain
- Backup filename and checksum.
```bash
shasum -a 256 "$BACKUP_FILE"
```
- Command transcript for backup + restore.
- Commit SHA used during validation.
```bash
git rev-parse --short HEAD
```

## Failure handling
- If restore fails, keep postgres container logs.
```bash
docker compose -f docker-compose.microservices.yml logs postgres --tail=200
```
- Re-run restore with a known-good backup file.
- Record issue and owner in DR/action tracker.
