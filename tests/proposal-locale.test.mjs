import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getProposalLanguage, proposalLanguageUrl, shellText } from '../dist/proposal/locale.js';
import * as english from '../dist/proposal/content.js';
import * as chinese from '../dist/proposal/content.zh-HK.js';

const base = 'https://mc-draft-rho.vercel.app';

test('the proposal defaults to Hong Kong Traditional Chinese and accepts explicit English links', () => {
  for (const query of ['', '?lang=zh-HK', '?lang=unknown']) {
    assert.equal(getProposalLanguage(new URL('/proposal/' + query, base)), 'zh-HK');
  }
  for (const query of ['?lang=eng', '?lang=en']) {
    assert.equal(getProposalLanguage(new URL('/proposal/' + query, base)), 'en');
  }
});

test('proposal language links preserve the current chapter, presentation mode and other query parameters', () => {
  const original = base + '/proposal/?lang=eng&campaign=pilot#operations';
  const translated = new URL(proposalLanguageUrl(original, 'zh-HK', { chapter: 'billing', present: true }), base);
  assert.equal(getProposalLanguage(translated), 'zh-HK');
  assert.equal(translated.searchParams.has('lang'), false);
  assert.equal(translated.hash, '#billing');
  assert.equal(translated.searchParams.get('campaign'), 'pilot');
  assert.equal(translated.searchParams.get('view'), 'present');
  const restored = new URL(proposalLanguageUrl(translated, 'en', { chapter: 'billing', present: true }), base);
  assert.equal(getProposalLanguage(restored), 'en');
  assert.equal(restored.searchParams.get('lang'), 'eng');
  assert.equal(restored.hash, '#billing');
  assert.equal(restored.searchParams.get('view'), 'present');
  const reading = new URL(proposalLanguageUrl(restored, 'zh-HK', { chapter: 'student', present: false }), base);
  assert.equal(reading.searchParams.has('view'), false);
  assert.equal(reading.hash, '#student');
  const unchangedView = new URL(proposalLanguageUrl(restored, 'zh-HK'), base);
  assert.equal(unchangedView.searchParams.get('campaign'), 'pilot');
  assert.equal(unchangedView.searchParams.get('view'), 'present');
  assert.equal(unchangedView.hash, '#billing');
});

test('both proposal languages expose the same chapters, live demos and references', () => {
  assert.deepEqual(chinese.chapters.map(c => c.id), ['vision', 'student', 'teacher', 'library', 'system', 'franchise', 'rollout', 'proposal']);
  assert.deepEqual(chinese.chapters.map(c => c.id), english.chapters.map(c => c.id));
  assert.deepEqual(Object.keys(chinese.references), Object.keys(english.references));
  for (const [index, chapter] of chinese.chapters.entries()) {
    assert.match(chapter.title, /[\u3400-\u9fff]/);
    if (!index) continue;
    const enHTML = english.chapterHTML(english.chapters[index], index);
    const zhHTML = chinese.chapterHTML(chapter, index);
    const demos = html => [...html.matchAll(/data-demo="([^"]+)"/g)].map(match => match[1]);
    assert.deepEqual(demos(zhHTML), demos(enHTML), chapter.id);
    assert.match(zhHTML, new RegExp('id="' + chapter.id + '"'));
  }
  for (const key of Object.keys(english.references)) {
    const links = html => [...html.matchAll(/href="([^"]+)"/g)].map(match => match[1]);
    assert.deepEqual(links(chinese.references[key].body), links(english.references[key].body), key);
  }
});

test('all marked cover and navigation text has a locale entry', async () => {
  const html = await readFile(new URL('../dist/proposal/index.html', import.meta.url), 'utf8');
  for (const [, key] of html.matchAll(/data-copy="([^"]+)"/g)) assert.equal(typeof shellText[key], 'string', key);
  assert.match(html, /<html lang="zh-HK">/);
  assert.match(html, /href="\?lang=eng" hreflang="en"/);
  for (const [, key, text] of html.matchAll(/data-copy="([^"]+)"[^>]*>([^<]*)</g)) {
    assert.equal(text, shellText[key], key + ' defaults to the approved Chinese copy');
  }
});


test('materials and centre administration are grouped without duplicating the teacher demo', () => {
  for (const content of [chinese, english]) {
    const materials = content.chapters.find(c => c.id === 'library');
    const centre = content.chapters.find(c => c.id === 'system');
    assert.equal([...materials.body.matchAll(/<h3>/g)].length, 3);
    assert.equal([...centre.body.matchAll(/<h3>/g)].length, 2);
    assert.doesNotMatch(materials.body, /data-demo=/);
    assert.deepEqual([...centre.body.matchAll(/data-demo="([^"]+)"/g)].map(m => m[1]), ['operations', 'billing']);
    const all = content.chapters.slice(1).map((c, i) => content.chapterHTML(c, i + 1)).join('');
    assert.equal([...all.matchAll(/data-demo="teacher"/g)].length, 1);
    assert.doesNotMatch(all, /class="eyebrow"/);
    assert.match(content.chapterHTML(materials, 3), /<h2[^>]+>4\. /);
  }
  const centre = chinese.chapters.find(c => c.id === 'system');
  assert.doesNotMatch(centre.body, /<th[^>]*>使用者<\/th>|已派發的習作保留當時的教材版本/);
});
