import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

test('globals.css has no obvious syntax errors around panel selectors', async () => {
  const css = await readFile(path.join(rootDir, 'app/globals.css'), 'utf8');
  
  // Check for the specific broken pattern I fixed
  const brokenPattern = /\.panel:nth-child\(5\) \{\s*\.panel:nth-child\(4\) \{/m;
  assert.strictEqual(brokenPattern.test(css), false, 'Should not contain nested panel selectors without closing brace');

  // Check for the correct pattern
  const correctPattern = /\.panel:nth-child\(1\),\s*\.panel:nth-child\(4\),\s*\.panel:nth-child\(5\) \{\s*grid-column: span 12;\s*\}/m;
  assert.ok(correctPattern.test(css), 'Should contain correctly grouped panel selectors for span 12');
});
