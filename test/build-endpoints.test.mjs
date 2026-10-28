import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = fileURLToPath(new URL('../', import.meta.url));
const builderUrl = new URL('../scripts/build-extension.mjs', import.meta.url);
const builder = (await readFile(builderUrl, 'utf8'))
  .replace(/^import .*;\r?\n/gm, '')
  .replaceAll('import.meta.url', JSON.stringify(builderUrl.href));
const background = await readFile(new URL('../background.js', import.meta.url), 'utf8');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

// Run the real builder with an in-memory filesystem: no dist replacement,
// personal browser profile or network is involved in this regression test.
for (const mode of ['dev', 'release']) {
  const files = new Map();
  await new AsyncFunction('cp', 'mkdir', 'readFile', 'rm', 'writeFile', 'path', 'fileURLToPath', 'process', 'console', builder)(
    async (src, dest) => {
      if (['manifest.json', 'piqo-api-client.js'].includes(path.basename(src))) files.set(dest, await readFile(src, 'utf8'));
    },
    async () => {},
    async (file, encoding) => files.has(file) ? files.get(file) : readFile(file, encoding),
    async () => {},
    async (file, content) => { files.set(file, content); },
    path, fileURLToPath, { argv: ['node', fileURLToPath(builderUrl), mode] }, { log() {} },
  );
  const output = path.join(root, 'dist', mode);
  const client = await import('data:text/javascript;base64,' + Buffer.from(files.get(path.join(output, 'piqo-api-client.js'))).toString('base64'));
  assert.equal(client.PIQO_API_BASE_URL, 'https://api.piqoo.ir', `${mode}: search must not use the unconfigured local monitoring server`);
  const monitoringBase = mode === 'dev' ? 'http://127.0.0.1:3000' : 'https://api.piqoo.ir';
  assert.equal(client.PIQO_MONITORING_BASE_URL, monitoringBase, `${mode}: monitoring has its own destination`);

  const endpoints = [];
  const initializers = background.slice(0, background.indexOf('const activeTraces'))
    .replace(/import\s+[\s\S]*?\s+from\s+['"][^'"]+['"];?/g, '');
  vm.runInNewContext(initializers, {
    ...client,
    createDiagnostics: options => { endpoints.push(options.endpoint); return {}; },
    createSurvey: options => { endpoints.push(options.endpoint); return {}; },
    chrome: { storage: { local: {} }, runtime: { getManifest: () => ({ version: '1.1.0' }) } },
  });
  assert.deepEqual(endpoints, [monitoringBase + '/v1/diagnostics/events', monitoringBase + '/v1/surveys']);
  const manifest = JSON.parse(files.get(path.join(output, 'manifest.json')));
  assert.ok(manifest.host_permissions.includes('https://api.piqoo.ir/*'));
  assert.equal(manifest.host_permissions.includes('http://127.0.0.1:3000/*'), mode === 'dev');
}
console.log('Build endpoints: DEV search stays on PIQO API, diagnostics/surveys stay local; release routing unchanged');
