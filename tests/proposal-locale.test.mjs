import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getProposalLanguage, proposalLanguageUrl, shellText } from '../dist/proposal/locale.js';
import * as english from '../dist/proposal/content.js';
import * as chinese from '../dist/proposal/content.zh-HK.js';

const base = 'https://mc-draft-rho.vercel.app';

test('proposal language links preserve the current chapter, presentation mode and other query parameters', () => {
  const original = base + '/proposal/?campaign=pilot#operations';
  const translated = new URL(proposalLanguageUrl(original, 'zh-HK', { chapter: 'billing', present: true }), base);
  assert.equal(getProposalLanguage(translated), 'zh-HK');
  assert.equal(translated.hash, '#billing');
  assert.equal(translated.searchParams.get('campaign'), 'pilot');
  assert.equal(translated.searchParams.get('view'), 'present');
  const restored = new URL(proposalLanguageUrl(translated, 'en', { chapter: 'billing', present: true }), base);
  assert.equal(getProposalLanguage(restored), 'en');
  assert.equal(restored.hash, '#billing');
  assert.equal(restored.searchParams.get('view'), 'present');
  const reading = new URL(proposalLanguageUrl(restored, 'zh-HK', { chapter: 'student' }), base);
  assert.equal(reading.searchParams.has('view'), false);
  assert.equal(reading.hash, '#student');
  assert.equal(getProposalLanguage(new URL('/proposal/?lang=unknown', base)), 'en');
});

test('both proposal languages expose the same chapters, live demos and references', () => {
  assert.deepEqual(chinese.chapters.map(c => c.id), ['vision', 'student', 'teacher', 'library', 'protection', 'system', 'billing', 'franchise', 'rollout', 'proposal']);
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
});
