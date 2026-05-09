.PHONY: help bootstrap dev test lint contracts risk-sim proof-demo docker-build docker-up docker-down docker-smoke

help:
	@echo "Available targets:"
	@echo "  make bootstrap   # print detected toolchain versions"
	@echo "  make dev         # run lightweight local checks"
	@echo "  make lint        # run available lint/static checks"
	@echo "  make contracts   # run contract compatibility smoke tests"
	@echo "  make test        # run available language test suites + contracts"
	@echo "  make risk-sim    # run Rust risk engine tests"
	@echo "  make proof-demo  # run Rust proof module tests"
	@echo "  make docker-build # build all microservice images"
	@echo "  make docker-up    # start all microservices with docker compose"
	@echo "  make docker-down  # stop microservices"
	@echo "  make docker-smoke # run end-to-end docker microservice smoke test"

bootstrap:
	@set -e; \
	for tool in go cargo python3 node npm; do \
		if command -v $$tool >/dev/null 2>&1; then \
			echo "[bootstrap] $$tool: $$($$tool --version | head -n 1)"; \
		else \
			echo "[bootstrap] $$tool: not found (optional)"; \
		fi; \
	done

dev:
	@$(MAKE) lint

contracts:
	@set -e; \
	if command -v pytest >/dev/null 2>&1; then \
		if [ -d tests/contracts ]; then \
			pytest -q tests/contracts; \
		else \
			echo "[contracts] Skipping: tests/contracts not found."; \
		fi; \
	elif python3 -c "import pytest" >/dev/null 2>&1; then \
		if [ -d tests/contracts ]; then \
			python3 -m pytest -q tests/contracts; \
		else \
			echo "[contracts] Skipping: tests/contracts not found."; \
		fi; \
	else \
		echo "[contracts] Skipping: pytest is not installed."; \
	fi

test:
	@set -e; \
	if command -v go >/dev/null 2>&1; then \
		for modfile in src/go/*/go.mod; do \
			[ -f "$$modfile" ] || continue; \
			moddir="$$(dirname "$$modfile")"; \
			echo "[test][go] $$moddir"; \
			(cd "$$moddir" && go test ./...); \
		done; \
	else \
		echo "[test][go] Skipping: go is not installed."; \
	fi; \
	if command -v cargo >/dev/null 2>&1 && [ -f src/rust/Cargo.toml ]; then \
		echo "[test][rust] src/rust"; \
		(cd src/rust && cargo test --workspace); \
	else \
		echo "[test][rust] Skipping: cargo or src/rust/Cargo.toml not found."; \
	fi; \
	if command -v pytest >/dev/null 2>&1; then \
		ran=0; \
		for p in tests src/python/tests; do \
			if [ -d "$$p" ]; then \
				echo "[test][python] $$p"; \
				pytest -q "$$p"; \
				ran=1; \
			fi; \
		done; \
		if [ "$$ran" -eq 0 ]; then \
			echo "[test][python] Skipping: tests/ and src/python/tests not found."; \
		fi; \
	elif python3 -c "import pytest" >/dev/null 2>&1; then \
		ran=0; \
		for p in tests src/python/tests; do \
			if [ -d "$$p" ]; then \
				echo "[test][python] $$p"; \
				python3 -m pytest -q "$$p"; \
				ran=1; \
			fi; \
		done; \
		if [ "$$ran" -eq 0 ]; then \
			echo "[test][python] Skipping: tests/ and src/python/tests not found."; \
		fi; \
	else \
		echo "[test][python] Skipping: pytest is not installed."; \
	fi; \
	if [ -f src/web/package.json ] && command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then \
		if node -e "const p=require('./src/web/package.json'); process.exit(p.scripts && p.scripts.test ? 0 : 1)"; then \
			echo "[test][node] src/web"; \
			(cd src/web && npm test); \
		else \
			echo "[test][node] Skipping: no test script in src/web/package.json."; \
		fi; \
	else \
		echo "[test][node] Skipping: node/npm or src/web/package.json not found."; \
	fi; \
	$(MAKE) contracts

lint:
	@set -e; \
	if command -v gofmt >/dev/null 2>&1; then \
		files="$$(find src/go -type f -name '*.go')"; \
		if [ -n "$$files" ]; then \
			out="$$(gofmt -l $$files)"; \
			if [ -n "$$out" ]; then \
				echo "$$out"; \
				echo "[lint][go] gofmt check failed."; \
				exit 1; \
			fi; \
			echo "[lint][go] gofmt check passed."; \
		else \
			echo "[lint][go] Skipping: no Go files found."; \
		fi; \
	else \
		echo "[lint][go] Skipping: gofmt is not installed."; \
	fi; \
	if command -v cargo >/dev/null 2>&1 && [ -f src/rust/Cargo.toml ]; then \
		echo "[lint][rust] cargo fmt --check"; \
		(cd src/rust && cargo fmt --all --check); \
		echo "[lint][rust] cargo clippy"; \
		(cd src/rust && cargo clippy --workspace --all-targets -- -D warnings); \
	else \
		echo "[lint][rust] Skipping: cargo or src/rust/Cargo.toml not found."; \
	fi; \
	if command -v python3 >/dev/null 2>&1; then \
		ran=0; \
		for p in tests src/python/tests; do \
			if [ -d "$$p" ]; then \
				echo "[lint][python] python3 -m compileall $$p"; \
				python3 -m compileall -q "$$p"; \
				ran=1; \
			fi; \
		done; \
		if [ "$$ran" -eq 0 ]; then \
			echo "[lint][python] Skipping: tests/ and src/python/tests not found."; \
		fi; \
	else \
		echo "[lint][python] Skipping: python3 is not installed."; \
	fi; \
	if [ -f src/web/package.json ] && command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then \
		if [ -x src/web/node_modules/.bin/next ]; then \
			echo "[lint][node] src/web"; \
			(cd src/web && npm run lint); \
		else \
			echo "[lint][node] Skipping: Next.js dependencies are not installed."; \
		fi; \
	else \
		echo "[lint][node] Skipping: node/npm or src/web/package.json not found."; \
	fi

risk-sim:
	@set -e; \
	if command -v cargo >/dev/null 2>&1 && [ -f src/rust/risk-engine/Cargo.toml ]; then \
		(cd src/rust && cargo test -p risk-engine); \
	else \
		echo "[risk-sim] Skipping: cargo or risk-engine crate not found."; \
	fi

proof-demo:
	@set -e; \
	if command -v cargo >/dev/null 2>&1 && [ -f src/rust/zk-proof/Cargo.toml ]; then \
		(cd src/rust && cargo test -p zk-proof); \
	else \
		echo "[proof-demo] Skipping: cargo or zk-proof crate not found."; \
	fi

docker-build:
	@set -e; \
	if command -v docker >/dev/null 2>&1; then \
		docker compose -f docker-compose.microservices.yml build; \
	else \
		echo "[docker-build] Skipping: docker is not installed."; \
	fi

docker-up:
	@set -e; \
	if command -v docker >/dev/null 2>&1; then \
		docker compose -f docker-compose.microservices.yml up -d; \
	else \
		echo "[docker-up] Skipping: docker is not installed."; \
	fi

docker-down:
	@set -e; \
	if command -v docker >/dev/null 2>&1; then \
		docker compose -f docker-compose.microservices.yml down; \
	else \
		echo "[docker-down] Skipping: docker is not installed."; \
	fi

docker-smoke:
	@set -e; \
	if command -v docker >/dev/null 2>&1 && command -v curl >/dev/null 2>&1; then \
		bash tests/integration/docker_microservices_smoke.sh; \
	else \
		echo "[docker-smoke] Skipping: docker and/or curl not installed."; \
	fi
