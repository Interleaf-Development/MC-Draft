import test from 'node:test';
import assert from 'node:assert/strict';
import { getProposalSolution, proposalSolutionUrl } from '../dist/proposal/solutions.js';
import { getProposalLanguage, proposalLanguageUrl } from '../dist/proposal/locale.js';
import { getSmartpenProposal } from '../dist/proposal/smartpen-content.js';
import * as english from '../dist/proposal/content.js';
import * as chinese from '../dist/proposal/content.zh-HK.js';

const base = 'https://mc-draft-rho.vercel.app';
const chapterIds = ['vision', 'student', 'teacher', 'library', 'system', 'parent', 'franchise'];
const demos = html => [...html.matchAll(/data-demo="([^"]+)"/g)].map(match => match[1]);

test('existing proposal links keep solution one unless solution two is explicitly selected', () => {
  for (const query of ['', '?lang=eng', '?solution=1', '?solution=unknown']) {
    assert.equal(getProposalSolution(new URL('/proposal/' + query, base)), '1');
  }
  assert.equal(getProposalSolution(new URL('/proposal/?solution=2', base)), '2');
});

test('switching proposals preserves language, presentation mode and shared link parameters', () => {
  // Existing shared URLs include hashes from before the chapters were combined.
  // Switching solution starts at its overview instead of carrying stale context.
  for (const chapter of ['system', 'operations', 'billing', 'protection', 'authoring']) {
    const original = base + '/proposal/?lang=eng&view=present&revision=a3f6e10#' + chapter;
    const switched = new URL(proposalSolutionUrl(original, '2'), base);
    assert.equal(switched.pathname, '/proposal/');
    assert.equal(getProposalSolution(switched), '2');
    assert.equal(getProposalLanguage(switched), 'en');
    assert.equal(switched.searchParams.get('view'), 'present');
    assert.equal(switched.searchParams.get('revision'), 'a3f6e10');
    assert.equal(switched.hash, '#vision');

    const restored = new URL(proposalSolutionUrl(switched.href, '1'), base);
    assert.equal(getProposalSolution(restored), '1');
    assert.equal(restored.searchParams.has('solution'), false);
    assert.equal(restored.searchParams.get('lang'), 'eng');
    assert.equal(restored.searchParams.get('revision'), 'a3f6e10');
    assert.equal(restored.searchParams.get('view'), 'present');
    assert.equal(restored.hash, '#vision');
  }
});

test('a targeted proposal link may select a chapter while language switches retain the selected solution', () => {
  const target = new URL(proposalSolutionUrl(base + '/proposal/?lang=zh-HK#vision', '2', { chapter: 'student' }), base);
  assert.equal(target.hash, '#student');
  const translated = new URL(proposalLanguageUrl(target.href, 'en'), base);
  assert.equal(getProposalSolution(translated), '2');
  assert.equal(getProposalLanguage(translated), 'en');
  assert.equal(translated.hash, '#student');
  const restored = new URL(proposalLanguageUrl(translated.href, 'zh-HK'), base);
  assert.equal(getProposalSolution(restored), '2');
  assert.equal(getProposalLanguage(restored), 'zh-HK');
  assert.equal(restored.searchParams.has('lang'), false);
  assert.equal(restored.hash, '#student');
});

function freezeContent(content) {
  const input = { chapters: structuredClone(content.chapters), references: structuredClone(content.references) };
  const freeze = value => {
    if (value && typeof value === 'object') {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  };
  return freeze(input);
}

for (const [language, original] of [['zh-HK', chinese], ['en', english]]) {
  test(`smartpen proposal keeps the original ${language} proposal intact and exposes all chapters and references`, () => {
    const before = JSON.stringify({ chapters: original.chapters, references: original.references });
    const input = freezeContent(original);
    const alternate = getSmartpenProposal(language, input);
    assert.deepEqual(alternate.chapters.map(chapter => chapter.id), chapterIds);
    assert.deepEqual(Object.keys(alternate.references).sort(), Object.keys(original.references).sort());
    for (const chapter of alternate.chapters) {
      assert.ok(chapter.title?.trim(), chapter.id + ' has a navigation title');
      if (chapter.id !== 'vision') {
        assert.ok(chapter.heading?.trim(), chapter.id + ' has a section heading');
        assert.ok(chapter.body?.trim(), chapter.id + ' has content');
      }
    }
    for (const [key, reference] of Object.entries(alternate.references)) {
      assert.ok(reference.title?.trim(), key + ' has a title');
      assert.ok(reference.body?.trim(), key + ' has content');
    }
    assert.ok(alternate.overviewHTML?.trim());
    assert.ok(alternate.shellTextOverrides.documentTitle?.trim());
    assert.notEqual(alternate.chapters.find(chapter => chapter.id === 'student').intro,
      original.chapters.find(chapter => chapter.id === 'student').intro);
    assert.equal(JSON.stringify(input), before, 'creating solution two does not alter the supplied content');
    assert.equal(JSON.stringify({ chapters: original.chapters, references: original.references }), before,
      'the original proposal remains available unchanged');
  });

  test(`smartpen ${language} proposal avoids presenting tablet handwriting as its demo while keeping shared workflows`, () => {
    const alternate = getSmartpenProposal(language, original);
    const chapter = id => alternate.chapters.find(item => item.id === id);
    for (const id of ['student', 'teacher']) {
      const scenes = demos(chapter(id).body);
      assert.equal(scenes.includes('student'), false, id + ' must not embed the tablet writing binder');
      assert.equal(scenes.includes('teacher'), false, id + ' must not embed tablet assignment as a smartpen flow');
    }
    assert.ok(demos(chapter('system').body).includes('operations'));
    assert.ok(demos(chapter('system').body).includes('billing'));
    assert.ok(demos(chapter('parent').body).includes('parent'));
    assert.ok(demos(chapter('franchise').body).includes('franchise'));
  });
}

test('solution two has separate Chinese and English overviews', () => {
  const zh = getSmartpenProposal('zh-HK', chinese);
  const en = getSmartpenProposal('en', english);
  assert.notEqual(zh.overviewHTML, en.overviewHTML);
  assert.match(zh.overviewHTML, /[\u3400-\u9fff]/);
  assert.match(en.overviewHTML, /smart\s*pen/i);
  assert.notEqual(zh.shellTextOverrides.documentTitle, en.shellTextOverrides.documentTitle);
});
