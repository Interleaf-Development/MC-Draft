import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import vm from 'node:vm';

const dist = resolve('dist'), origin = 'https://mc-draft.example.com';
const workerCode = await readFile(resolve(dist, 'sw.js'), 'utf8');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
function response(body, path, { type = 'basic', redirected = false, contentType, status = 200, url } = {}) {
  const result = new Response(body, { status, headers: { 'Content-Type': contentType || mime[extname(path)] || 'text/html' } });
  Object.defineProperties(result, { type: { value: type }, redirected: { value: redirected }, url: { value: url || origin + path } });
  return result;
}
async function assetResponse(request) {
  const path = new URL(typeof request === 'string' ? request : request.url, origin).pathname;
  return response(await readFile(resolve(dist, '.' + decodeURIComponent(path === '/' ? '/index.html' : path))), path);
}
function harness() {
  const listeners = new Map(), stores = new Map();
  let network = assetResponse;
  const key = request => new URL(typeof request === 'string' ? request : request.url, origin).href;
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      return { async put(request, result) { stores.get(name).set(key(request), result.clone()); }, async match(request) { return stores.get(name).get(key(request))?.clone(); } };
    },
    async keys() { return [...stores.keys()]; },
    async delete(name) { return stores.delete(name); }
  };
  vm.runInNewContext(workerCode, { self: { location: { origin }, addEventListener: (name, listener) => listeners.set(name, listener), skipWaiting: async () => {}, clients: { claim: async () => {} } }, caches, fetch: (...args) => network(...args), URL, Set, Promise, Error });
  return {
    stores, caches, network: handler => { network = handler; },
    async lifecycle(name) { let completion; listeners.get(name)({ waitUntil: value => { completion = value; } }); return completion; },
    async fetch(path, options = {}) {
      let result;
      listeners.get('fetch')({ request: { url: new URL(path, origin).href, method: 'GET', mode: 'cors', ...options }, respondWith: value => { result = value; } });
      return result;
    }
  };
}

test('install manifest opens the parent app and supplies correctly sized PNG icons', async () => {
  const manifest = JSON.parse(await readFile(resolve(dist, 'manifest.webmanifest'), 'utf8'));
  assert.equal(manifest.name, 'MathConcept（荃灣）');
  assert.equal(manifest.lang, 'zh-HK');
  assert.equal(manifest.id, '/'); assert.equal(manifest.scope, '/'); assert.equal(manifest.display, 'standalone');
  assert.equal(new URL(manifest.start_url, origin).searchParams.get('role'), 'parent');
  assert.deepEqual(manifest.icons.map(icon => icon.sizes).sort(), ['192x192', '512x512']);
  for (const [file, size] of [...manifest.icons.map(icon => [icon.src, Number(icon.sizes.split('x')[0])]), ['/icons/apple-touch-icon.png', 180]]) {
    const png = await readFile(resolve(dist, '.' + file));
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(png.readUInt32BE(16), size); assert.equal(png.readUInt32BE(20), size);
  }
});

test('first install caches the complete local module and stylesheet graph for offline parent navigation', async () => {
  const worker = harness(); await worker.lifecycle('install');
  const cached = [...worker.stores.values()][0], seen = new Set();
  async function checkModule(path) {
    if (seen.has(path)) return; seen.add(path);
    assert.ok(cached.has(origin + path), 'Offline module: ' + path);
    const source = await readFile(resolve(dist, '.' + path), 'utf8');
    for (const match of source.matchAll(/^\s*import\s+[^;]+?\s+from\s+['"]([^'"]+)['"]/gm)) {
      assert.ok(match[1].startsWith('.'), 'External module would prevent offline startup');
      await checkModule(new URL(match[1], origin + path).pathname);
    }
  }
  await checkModule('/app.js'); await checkModule('/pwa.js');
  const html = await readFile(resolve(dist, 'index.html'), 'utf8');
  for (const match of html.matchAll(/href="(\/[^"?]+\.css)"/g)) assert.ok(cached.has(origin + match[1]), 'Offline stylesheet: ' + match[1]);
  for (const path of [...Array.from({ length: 18 }, (_, index) => '/brand/Asset%20' + (index + 1) + '.svg'), '/conversation-wallpaper.svg']) assert.ok(cached.has(origin + path));
  worker.network(async () => { throw new Error('Offline'); });
  assert.match(await (await worker.fetch('/?role=parent', { mode: 'navigate' })).text(), /id="app"/);
  assert.match(await (await worker.fetch('/app.js')).text(), /import /);
});

test('online edits replace cached assets and remain available on the next offline visit', async () => {
  const worker = harness(); await worker.lifecycle('install');
  worker.network(async () => response('export const updated = true;', '/app.js'));
  assert.equal(await (await worker.fetch('/app.js')).text(), 'export const updated = true;');
  worker.network(async () => { throw new Error('Offline'); });
  assert.equal(await (await worker.fetch('/app.js')).text(), 'export const updated = true;');
});

test('auth redirects and 200 login HTML cannot poison the offline app cache', async () => {
  for (const replacement of [
    response('<html>Sign in</html>', '/app.js', { contentType: 'text/html' }),
    response('<html>Sign in</html>', '/app.js', { redirected: true, url: 'https://vercel.com/login', contentType: 'text/html' })
  ]) {
    const worker = harness(); await worker.lifecycle('install');
    worker.network(async () => replacement);
    await worker.fetch('/app.js');
    worker.network(async () => { throw new Error('Offline'); });
    assert.match(await (await worker.fetch('/app.js')).text(), /import /);
  }
  const worker = harness();
  worker.network(async request => request === '/' ? response('<html>Sign in</html>', '/', { contentType: 'text/html' }) : assetResponse(request));
  await assert.rejects(worker.lifecycle('install'), /Offline asset unavailable/);
  assert.equal(worker.stores.size, 0, 'An incomplete/authenticated shell must not become an offline cache');
});

test('proofs, private endpoints, cross-origin requests and POSTs are never intercepted or cached', async () => {
  const worker = harness(); await worker.lifecycle('install');
  const count = [...worker.stores.values()][0].size;
  for (const [path, options] of [['/proofs/transfer.pdf'], ['/api/messages'], ['/_vercel/auth'], ['https://fonts.googleapis.com/css2?family=DM+Sans'], ['/app.js', { method: 'POST' }], ['/login', { mode: 'navigate' }]]) assert.equal(await worker.fetch(path, options), undefined);
  assert.equal([...worker.stores.values()][0].size, count);
});

test('activation removes only outdated MathConcept caches', async () => {
  const worker = harness();
  await worker.caches.open('mathconcept-static-old'); await worker.caches.open('other-app-data');
  await worker.lifecycle('install'); await worker.lifecycle('activate');
  assert.ok(!worker.stores.has('mathconcept-static-old')); assert.ok(worker.stores.has('other-app-data'));
  assert.ok([...worker.stores.keys()].some(key => key.startsWith('mathconcept-static-')));
});
