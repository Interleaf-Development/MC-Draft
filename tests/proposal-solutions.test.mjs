import test from 'node:test';
import assert from 'node:assert/strict';
import { getProposalSolution, proposalSolutionUrl } from '../dist/proposal/solutions.js';
import { getProposalLanguage, proposalLanguageUrl } from '../dist/proposal/locale.js';
import { getSmartpenProposal } from '../dist/proposal/smartpen-content.js';
import { buildProposalStructure } from '../dist/proposal/structure.js';
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
  // Switching an approach focuses the learning section rather than unrelated operations.
  for (const chapter of ['system', 'operations', 'billing', 'protection', 'authoring']) {
    const original = base + '/proposal/?lang=eng&view=present&revision=a3f6e10#' + chapter;
    const switched = new URL(proposalSolutionUrl(original, '2'), base);
    assert.equal(switched.pathname, '/proposal/');
    assert.equal(getProposalSolution(switched), '2');
    assert.equal(getProposalLanguage(switched), 'en');
    assert.equal(switched.searchParams.get('view'), 'present');
    assert.equal(switched.searchParams.get('revision'), 'a3f6e10');
    assert.equal(switched.hash, '#learning');

    const restored = new URL(proposalSolutionUrl(switched.href, '1'), base);
    assert.equal(getProposalSolution(restored), '1');
    assert.equal(restored.searchParams.has('solution'), false);
    assert.equal(restored.searchParams.get('lang'), 'eng');
    assert.equal(restored.searchParams.get('revision'), 'a3f6e10');
    assert.equal(restored.searchParams.get('view'), 'present');
    assert.equal(restored.hash, '#learning');
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


// Read a complete element, including nested elements of the same tag. This keeps
// these content-boundary checks independent of browser implementation details.
function elementByAttribute(html, name, value) {
  const opening = new RegExp(`<([a-z][\\w:-]*)\\b[^>]*\\b${name}=["']${value}["'][^>]*>`, 'i').exec(html);
  assert.ok(opening, `Expected element ${name}="${value}"`);
  const start = opening.index;
  const tags = new RegExp(`<(/?)${opening[1]}\\b[^>]*>`, 'gi');
  tags.lastIndex = start;
  let depth = 0;
  for (let tag; (tag = tags.exec(html));) {
    depth += tag[1] ? -1 : 1;
    if (depth === 0) return { html: html.slice(start, tags.lastIndex), start, end: tags.lastIndex };
  }
  assert.fail(`Unclosed element ${name}="${value}"`);
}

function readableText(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    // Relocating the shared game may update its directional pointer only.
    .replace(/(?:以下|本節末的)「數學飛車」示範/g, '「數學飛車」示範')
    .replace(/(?:下方|本節末的)數學飛車/g, '數學飛車')
    .replace(/(The (?:Maths Kart demo|addition racing game)) (?:below|at the end of this section)/g, '$1');
}

function assertContentPreserved(source, composed, label) {
  const text = readableText(composed);
  if (source.intro) assert.ok(text.includes(readableText(source.intro)), `${label}: introduction preserved`);
  // Check meaningful source copy rather than snapshots of wrapper/heading markup.
  for (const [, , fragment] of source.body.matchAll(/<(p|li|th|td|h[2-6])(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi)) {
    const copy = readableText(fragment);
    assert.ok(text.includes(copy), `${label}: preserved “${copy.slice(0, 90)}”`);
  }
}

for (const [language, original] of [['zh-HK', chinese], ['en', english]]) {
  const alternate = getSmartpenProposal(language, original);
  const structure = buildProposalStructure(language, original, alternate);
  const byId = id => structure.chapters.find(chapter => chapter.id === id);

  test(`unified ${language} proposal uses five chapters and preserves its content inputs`, () => {
    const originalInput = freezeContent(original);
    const alternateInput = Object.freeze({
      ...alternate,
      ...freezeContent(alternate),
      shellTextOverrides: Object.freeze({ ...alternate.shellTextOverrides })
    });
    const before = JSON.stringify([originalInput, alternateInput]);
    const result = buildProposalStructure(language, originalInput, alternateInput);
    assert.deepEqual(result.chapters.map(chapter => chapter.id), ['vision', 'learning', 'materials', 'system', 'parent']);
    assert.equal(result.chapters[1].title, language === 'zh-HK' ? '學生體驗' : 'Student experience');
    assert.deepEqual(Object.keys(result.references).sort(), Object.keys(original.references).sort());
    assert.ok(result.overviewHTML?.trim());
    assert.ok(result.shellTextOverrides.documentTitle?.trim());
    for (const chapter of result.chapters) {
      assert.ok(chapter.title?.trim(), chapter.id + ' has a navigation title');
      if (chapter.id !== 'vision') assert.ok(chapter.body?.trim(), chapter.id + ' has content');
    }
    assert.equal(JSON.stringify([originalInput, alternateInput]), before,
      'composition does not overwrite either source proposal');
  });

  test(`unified ${language} proposal switches only the student experience and presents teaching materials once`, () => {
    const learning = byId('learning').body;
    const switcher = elementByAttribute(learning, 'id', 'solution-switch');
    const options = [...switcher.html.matchAll(/<a\b[^>]*data-solution=["']([^"']+)["']/gi)].map(match => match[1]);
    assert.deepEqual(options.sort(), ['1', '2']);
    const tablet = elementByAttribute(learning, 'data-learning-solution', '1');
    const smartpen = elementByAttribute(learning, 'data-learning-solution', '2');
    assert.deepEqual(demos(tablet.html), ['student']);
    assert.deepEqual(demos(smartpen.html), [], 'proposed smartpen capture does not show connected tablet demonstrations');
    assert.deepEqual(demos(learning), ['student'], 'teacher and practice demos are outside the student device choice');
    assertContentPreserved(original.chapters.find(chapter => chapter.id === 'student'), tablet.html, 'Tablet student');
    assertContentPreserved(alternate.chapters.find(chapter => chapter.id === 'student'), smartpen.html, 'Smartpen student');
    const comparison = elementByAttribute(learning, 'id', 'learning-comparison');
    assert.ok(tablet.start > comparison.start && tablet.end < comparison.end);
    assert.ok(smartpen.start > comparison.start && smartpen.end < comparison.end);
    assert.ok(switcher.start > comparison.start && switcher.end < comparison.end);
    const materials = byId('materials').body;
    for (const id of ['library', 'teacher']) {
      const section = elementByAttribute(materials, 'id', id);
      assertContentPreserved(original.chapters.find(chapter => chapter.id === id), section.html, `Teaching materials ${id}`);
      assert.equal((materials.match(new RegExp(`id="${id}"`, 'g')) || []).length, 1, `${id} is presented once`);
      assert.equal(learning.includes(`id="${id}"`), false, `${id} is outside the device switch`);
    }
    const knowledge = elementByAttribute(materials, 'id', 'shared-knowledge');
    const practice = elementByAttribute(materials, 'id', 'shared-practice');
    assert.ok(knowledge.html.length > 0);
    assert.deepEqual(demos(practice.html), ['game']);
    assert.deepEqual(demos(materials).sort(), ['game', 'teacher']);
    assert.doesNotMatch(materials, /data-learning-solution=/, 'teaching materials do not switch by device');
  });

  test(`unified ${language} proposal has one copy of each demo and unchanged shared management features`, () => {
    const html = structure.overviewHTML + structure.chapters.map(chapter => chapter.body || '').join('');
    assert.deepEqual(demos(html).sort(), ['billing', 'franchise', 'game', 'operations', 'parent', 'student', 'teacher']);
    const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length, 'composing chapters does not duplicate IDs or embed hosts');
    assert.deepEqual(demos(byId('system').body).sort(), ['billing', 'franchise', 'operations']);
    assert.deepEqual(demos(byId('parent').body), ['parent']);
    for (const id of ['system', 'franchise']) {
      assertContentPreserved(original.chapters.find(chapter => chapter.id === id), byId('system').body, `Shared ${id}`);
    }
    assertContentPreserved(original.chapters.find(chapter => chapter.id === 'parent'), byId('parent').intro + byId('parent').body, 'Shared parent');
  });
}
