from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

from behave import given, then, when


@given('the gateway base url is configured')
def step_given_base(context):
    base = os.getenv('GATEWAY_BASE_URL', '').strip()
    if not base:
        raise AssertionError('GATEWAY_BASE_URL must be set')
    context.base_url = base.rstrip('/')


@when('I send a GET request to "{path}"')
def step_get(context, path: str):
    req = urllib.request.Request(context.base_url + path, method='GET')
    try:
        with urllib.request.urlopen(req) as resp:
            context.status_code = resp.getcode()
    except urllib.error.HTTPError as err:
        context.status_code = err.code


@when('I send a malformed JSON POST request to "{path}"')
def step_post_bad_json(context, path: str):
    req = urllib.request.Request(
        context.base_url + path,
        data=b'{"asset_id": "A1",',
        method='POST',
        headers={'Content-Type': 'application/json'},
    )
    try:
        with urllib.request.urlopen(req) as resp:
            context.status_code = resp.getcode()
            context.body = resp.read().decode('utf-8')
    except urllib.error.HTTPError as err:
        context.status_code = err.code
        context.body = err.read().decode('utf-8')


@then('the response status should be {status_code:d}')
def step_status(context, status_code: int):
    if context.status_code != status_code:
        payload = ''
        if getattr(context, 'body', ''):
            try:
                payload = json.dumps(json.loads(context.body), indent=2)
            except Exception:
                payload = context.body
        raise AssertionError(f'expected {status_code}, got {context.status_code}. body={payload}')
