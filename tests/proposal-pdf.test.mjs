import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('dist/proposal/pdf-manifest.json', root), 'utf8'));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const rebuild = 'Rebuild the proposal PDF with scripts/build-proposal-pdf.py before publishing.';

test('the downloadable proposal is current with its wording, diagrams and screenshots', async () => {
  assert.equal(manifest.version, 1);
  const required = [
    ...['content.zh-HK', 'smartpen-content', 'structure', 'shared-knowledge', 'smartpen-flow', 'smartpen-writing-demo', 'locale']
      .map(name => `dist/proposal/${name}.js`),
    'dist/proposal/assets/mathconcept-logo.png',
    ...['student-binder', 'student', 'student-stamps', 'teacher', 'game', 'operations', 'billing',
      'parent', 'parent-handbook', 'parent-payments', 'parent-messages']
      .map(name => `dist/proposal/assets/pdf/${name}.png`),
    'scripts/build-proposal-pdf.py'
  ];
  for (const path of required) assert.ok(Object.hasOwn(manifest.dependencies, path), `PDF provenance must cover ${path}`);
  for (const [path, expectedHash] of Object.entries(manifest.dependencies)) {
    assert.match(expectedHash, /^[a-f0-9]{64}$/, `${path} has a SHA-256 digest`);
    const actualHash = sha256(await readFile(new URL(path, root)));
    assert.equal(actualHash, expectedHash, `${path} has changed since the PDF was exported. ${rebuild}`);
  }
});

test('the published PDF matches the verified export and its page count', async () => {
  assert.equal(manifest.pdf, 'dist/proposal/MathConcept-Proposal-V1.pdf');
  const pdf = await readFile(new URL(manifest.pdf, root));
  assert.equal(pdf.subarray(0, 5).toString('ascii'), '%PDF-');
  assert.match(pdf.subarray(-1024).toString('ascii'), /%%EOF\s*$/);
  assert.equal(sha256(pdf), manifest.pdfSha256, `The published PDF differs from its verified export. ${rebuild}`);
  assert.ok(Number.isInteger(manifest.pageCount) && manifest.pageCount > 0);
  // ReportLab leaves page dictionaries uncompressed; distinguish /Page from /Pages.
  const pages = [...pdf.toString('latin1').matchAll(/\/Type\s*\/Page\b/g)].length;
  assert.equal(pages, manifest.pageCount, 'Every verified page is present in the downloadable file');
});

test('the proposal download link resolves to the PDF and production serves it as an attachment', async () => {
  const html = await readFile(new URL('dist/proposal/index.html', root), 'utf8');
  const anchor = html.match(/<a\b[^>]*\bid="download-pdf"[^>]*>/)?.[0];
  assert.ok(anchor, 'The proposal exposes a native PDF download link');
  const href = anchor.match(/\bhref="([^"]+)"/)?.[1];
  assert.ok(href);
  const target = new URL(href, new URL('dist/proposal/index.html', root));
  assert.equal(target.href, new URL(manifest.pdf, root).href);
  assert.match(anchor, /\bdownload="MathConcept-Proposal-V1\.pdf"/);
  assert.ok((await readFile(target)).length > 0, 'The download target exists in the deployed directory');

  const config = JSON.parse(await readFile(new URL('vercel.json', root), 'utf8'));
  const route = config.headers.find(rule => rule.source === '/proposal/MathConcept-Proposal-V1.pdf');
  assert.ok(route, 'The PDF has production response headers');
  const headers = Object.fromEntries(route.headers.map(({ key, value }) => [key.toLowerCase(), value]));
  assert.equal(headers['content-type'], 'application/pdf');
  assert.equal(headers['content-disposition'], 'attachment; filename="MathConcept-Proposal-V1.pdf"');
});
