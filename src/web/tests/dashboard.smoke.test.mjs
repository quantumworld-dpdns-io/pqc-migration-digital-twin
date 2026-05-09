import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

test('dashboard page includes governance smoke content', async () => {
  const pageSource = await readFile(path.join(rootDir, 'app/page.tsx'), 'utf8');

  assert.match(pageSource, /<h1>Operational Dashboard<\/h1>/);
  assert.match(pageSource, /Panel title="Inventory"/);
  assert.match(pageSource, /Panel title="Governance"/);
  assert.match(pageSource, /EX-2026-014/);
  assert.match(pageSource, /proof-verifier/);
});

test('globals.css has correct panel selectors', async () => {
  const css = await readFile(path.join(rootDir, 'app/globals.css'), 'utf8');
  const correctPattern = /\.panel:nth-child\(1\),\s*\.panel:nth-child\(4\),\s*\.panel:nth-child\(5\) \{\s*grid-column: span 12;\s*\}/m;
  assert.ok(correctPattern.test(css), 'Should contain correctly grouped panel selectors for span 12');
});
