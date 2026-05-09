# Python Test Setup

## Dev dependency

Install minimal test dependency:

```bash
python -m pip install -r src/python/requirements-dev.txt
```

## Test layout

Pytest discovers tests from the existing layout:

- `src/python/tests/test_manifest_hashing.py`
- `src/python/tests/test_hndl_scoring.py`
- `src/python/tests/test_runner.py`

The `test_*.py` naming and `tests/` directory are pytest-discoverable by default.

## Run tests

From repository root:

```bash
python -m pytest src/python/tests -q
```

Or from `src/python`:

```bash
python -m pytest tests -q
```
