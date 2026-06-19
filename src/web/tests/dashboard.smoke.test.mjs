import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

test('dashboard uses live governance data and compact responsive layout', async () => {
  const pageSource = await readFile(path.join(rootDir, 'app/page.tsx'), 'utf8');

  assert.match(pageSource, /getGovernanceExceptions/);
  assert.match(pageSource, /getVerifierDrift/);
  assert.match(pageSource, /variant="compact"/);
  assert.match(pageSource, /xl:grid-cols-\[minmax\(0,2fr\)_minmax\(20rem,1fr\)\]/);
  assert.match(pageSource, /Update required/);
});

test('playground results are native canvas objects rather than DOM overlays', async () => {
  const scene = await readFile(path.join(rootDir, 'components/three/PlaygroundScene.tsx'), 'utf8');
  const qasm = await readFile(path.join(rootDir, 'components/three/QasmResultDisplay.tsx'), 'utf8');
  const proof = await readFile(path.join(rootDir, 'components/three/ProofResultDisplay.tsx'), 'utf8');
  assert.match(scene, /<Canvas/);
  assert.match(scene, /<QasmResultDisplay/);
  assert.match(scene, /<ProofResultDisplay/);
  assert.doesNotMatch(scene, /<Html|dangerouslySetInnerHTML/);
  assert.match(qasm, /<Text/);
  assert.match(proof, /score_value/);
});

test('inventory creates assets and sends valid exposure backlog rows', async () => {
  const inventory = await readFile(path.join(rootDir, 'app/inventory/page.tsx'), 'utf8');
  assert.match(inventory, /createAsset\(createInput\)/);
  assert.match(inventory, /total_assets: 1/);
  assert.match(inventory, /quantum_vulnerable_assets: assetVulnerable\(a\) \? 1 : 0/);
  assert.match(inventory, /Download CSV/);
});
