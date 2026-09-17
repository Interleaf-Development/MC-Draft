import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { roleFromUrl, entryUrl, syncEntryPoint } from '../dist/entry-points.js';
const url = path => new URL(path, 'https://mc-draft.example.com');

test('the root opens Admin and dedicated family paths select their role', () => {
  for (const [path, role] of [['/', 'admin'], ['/parent', 'parent'], ['/parent/', 'parent'], ['/parent/index.html', 'parent'], ['/student', 'student'], ['/student/', 'student'], ['/student/index.html', 'student'], ['/parent/?role=student', 'parent'], ['/?role=invalid', 'admin']]) assert.equal(roleFromUrl(url(path)), role, path);
});

test('existing shared role links remain usable', () => {
  for (const role of ['admin', 'teacher', 'parent', 'student']) assert.equal(roleFromUrl(url('/?role=' + role)), role);
});

test('role changes produce refreshable URLs without losing unrelated query parameters', () => {
  assert.equal(entryUrl('parent', url('/?role=parent&pass=demo#today')), '/parent/?pass=demo#today');
  assert.equal(entryUrl('student', url('/parent/?role=parent')), '/student/');
  assert.equal(entryUrl('admin', url('/student/')), '/');
  assert.equal(entryUrl('teacher', url('/parent/')), '/?role=teacher');
  for (const role of ['admin', 'teacher', 'parent', 'student']) assert.equal(roleFromUrl(url(entryUrl(role, url('/')))), role);
});

test('Hang Hau role links stay in their branch, including legacy query links and explicit index paths', () => {
  for (const path of ['/hh', '/hh/', '/hh/index.html']) {
    assert.equal(roleFromUrl(url(path)), 'admin');
    for (const role of ['admin', 'teacher', 'parent', 'student']) {
      const destination = entryUrl(role, url(path + '?pass=demo#today'));
      assert.equal(roleFromUrl(url(destination)), role);
      assert.ok(destination.startsWith('/hh/'), destination);
      assert.equal(url(destination).searchParams.get('pass'), 'demo');
      assert.equal(url(destination).hash, '#today');
      assert.equal(roleFromUrl(url(path + '?role=' + role)), role);
    }
  }
  for (const role of ['parent', 'student']) {
    for (const suffix of ['', '/', '/index.html']) assert.equal(roleFromUrl(url('/hh/' + role + suffix + '?role=teacher')), role);
  }
  assert.equal(entryUrl('student', url('/hh/parent/')), '/hh/student/');
  assert.equal(entryUrl('teacher', url('/hh/student/')), '/hh/?role=teacher');
  assert.equal(entryUrl('admin', url('/hh/parent/')), '/hh/');
  assert.equal(entryUrl('parent', url('/hh-other/')), '/parent/', 'A similar prefix is not the Hang Hau branch');
});

test('role switches keep history, title and install metadata consistent with the current branch', () => {
  const originalWindow = globalThis.window, originalDocument = globalThis.document;
  try {
    for (const [base, branch, shortBranch] of [['/', '荃灣', ''], ['/hh/', '坑口', '坑口']]) {
      const nodes = [], changes = [];
      globalThis.window = { location: url(base), history: { replaceState(_state, _title, path) { changes.push(path); window.location = url(path); } } };
      globalThis.document = {
        title: '', head: { append: node => nodes.push(node) },
        createElement() { return { getAttribute(name) { return this[name]; }, setAttribute(name, value) { this[name] = value; }, remove() { nodes.splice(nodes.indexOf(this), 1); } }; },
        querySelector(selector) { return selector === 'link[rel="manifest"]' ? nodes.find(node => node.rel === 'manifest') : nodes.find(node => node.name === /name="([^"]+)"/.exec(selector)?.[1]); }
      };
      for (const [role, label] of [['parent', '家長'], ['student', '學生']]) {
        syncEntryPoint(role);
        assert.equal(window.location.pathname, base + role + '/');
        assert.equal(document.title, 'MathConcept（' + branch + '）· ' + label);
        assert.equal(document.querySelector('link[rel="manifest"]').href, base + role + '/manifest.webmanifest');
        assert.equal(document.querySelector('meta[name="apple-mobile-web-app-title"]').content, 'MathConcept ' + shortBranch + label);
        const count = changes.length; syncEntryPoint(role); assert.equal(changes.length, count, 'Already canonical URLs do not replace history again');
      }
      syncEntryPoint('teacher');
      assert.equal(window.location.pathname, base); assert.equal(window.location.search, '?role=teacher');
      assert.equal(document.title, 'MathConcept (' + (base === '/' ? 'Tsuen Wan' : 'Hang Hau') + ') · Demo');
      assert.equal(nodes.length, 0, 'Staff entry removes family install metadata');
    }
  } finally {
    if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow;
    if (originalDocument === undefined) delete globalThis.document; else globalThis.document = originalDocument;
  }
});

test('local routes redirect canonical branch paths and serve shared code with distinct family manifests', async t => {
  const server = spawn(process.execPath, ['scripts/serve.mjs'], { env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => server.kill());
  const address = await new Promise((resolve, reject) => {
    let output = '';
    server.once('error', reject); server.once('exit', code => reject(new Error('Server exited: ' + code)));
    server.stdout.on('data', chunk => { output += chunk; const match = /Local: (http:\/\/127\.0\.0\.1:\d+)/.exec(output); if (match) resolve(match[1]); });
  });
  for (const path of ['/parent', '/student', '/hh', '/hh/parent', '/hh/student']) {
    const result = await fetch(address + path + '?role=teacher', { redirect: 'manual' });
    assert.equal(result.status, 308); assert.equal(result.headers.get('location'), path + '/?role=teacher');
  }
  const vercel = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.equal(vercel.trailingSlash, true);
  for (const base of ['/', '/hh/']) {
    const staff = await fetch(address + base + '?role=teacher'); assert.equal(staff.status, 200);
    assert.ok(!(await staff.text()).includes('rel="manifest"'));
    for (const role of ['parent', 'student']) {
      const path = base + role + '/', html = await (await fetch(address + path)).text();
      assert.ok(html.includes('src="/app.js"')); assert.ok(html.includes('href="' + path + 'manifest.webmanifest"'));
      const manifest = await fetch(address + path + 'manifest.webmanifest');
      assert.equal(manifest.headers.get('content-type'), 'application/manifest+json');
      assert.equal((await manifest.json()).scope, path);
      assert.ok(vercel.headers.some(rule => rule.source === path + 'manifest.webmanifest' && rule.headers.some(header => header.key === 'Content-Type' && header.value === 'application/manifest+json')));
    }
  }
  assert.equal((await fetch(address + '/branch-config.js')).status, 200);
  assert.equal((await fetch(address + '/hh/app.js')).status, 404, 'There is no branch fork of the application');
});
