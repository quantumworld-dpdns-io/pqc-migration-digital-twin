import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

test('api client throws ApiError with upstream status code', async () => {
  const apiSource = await readFile(path.join(rootDir, 'lib/api.ts'), 'utf8');
  assert.match(apiSource, /throw new ApiError\(res\.status,\s*text\)/);
});

test('api client error message prefers response body text and falls back to statusText', async () => {
  const apiSource = await readFile(path.join(rootDir, 'lib/api.ts'), 'utf8');
  assert.match(apiSource, /const text = await res\.text\(\)\.catch\(\(\) => res\.statusText\)/);
});

test('ApiError class exposes status and stable name for callers', async () => {
  const apiSource = await readFile(path.join(rootDir, 'lib/api.ts'), 'utf8');
  assert.match(apiSource, /export class ApiError extends Error/);
  assert.match(apiSource, /public readonly status: number/);
  assert.match(apiSource, /this\.name = 'ApiError'/);
});

test('typed client exposes asset create and QASM run gateway operations', async () => {
  const apiSource = await readFile(path.join(rootDir, 'lib/api.ts'), 'utf8');
  assert.match(apiSource, /export const createAsset/);
  assert.match(apiSource, /'POST', '\/api\/v1\/assets'/);
  assert.match(apiSource, /export const runQasm/);
  assert.match(apiSource, /'POST', '\/api\/v1\/qasm\/run'/);
  assert.match(apiSource, /export type BacklogRow = \{/);
  assert.doesNotMatch(apiSource, /risk_score: number/);
});
