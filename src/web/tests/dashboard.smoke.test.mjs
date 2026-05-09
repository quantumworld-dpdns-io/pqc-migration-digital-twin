import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

test('layout metadata includes dashboard title and description', async () => {
  const layoutSource = await readFile(path.join(rootDir, 'app/layout.tsx'), 'utf8');

  assert.match(layoutSource, /title:\s*'PQC Migration Digital Twin Dashboard'/);
  assert.match(
    layoutSource,
    /description:\s*'Operational dashboard scaffold for PQC migration readiness and risk visibility\.'/
  );
});

test('dashboard page includes expected smoke content', async () => {
  const pageSource = await readFile(path.join(rootDir, 'app/page.tsx'), 'utf8');

  assert.match(pageSource, /<h1>Operational Dashboard<\/h1>/);
  assert.match(pageSource, /Panel title="Inventory"/);
  assert.match(pageSource, /Panel title="HNDL Heatmap"/);
  assert.match(pageSource, /Panel title="Risk Matrix"/);
  assert.match(pageSource, /Panel title="Proof Panel"/);
});
