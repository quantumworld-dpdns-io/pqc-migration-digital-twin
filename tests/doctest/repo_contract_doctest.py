"""Repository contract doctest suite.

>>> import json
>>> from pathlib import Path
>>> root = Path(__file__).resolve().parents[2]
>>> spec = json.loads((root / 'docs/api/gateway-openapi.json').read_text(encoding='utf-8'))
>>> spec['openapi'].startswith('3.')
True

Negative API contract checks (disallowed/invalid method coverage):
>>> paths = spec['paths']
>>> 'delete' in {m.lower() for m in paths['/api/v1/risk'].keys()}
False
>>> 'get' in {m.lower() for m in paths['/api/v1/proof'].keys()}
False
>>> {'get', 'post'}.issuperset({m.lower() for m in paths['/api/v1/governance/exceptions'].keys()})
True

Implementation-route parity check:
>>> import re
>>> server_text = (root / 'src/go/gateway/server.go').read_text(encoding='utf-8')
>>> route_literals = set(re.findall(r'mux\\.HandleFunc\\("([^"]+)"', server_text))
>>> set(paths.keys()).issubset(route_literals)
True
"""
