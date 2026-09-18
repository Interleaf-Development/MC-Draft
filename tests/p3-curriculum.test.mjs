import test from 'node:test';
import assert from 'node:assert/strict';
import { p3Topics, p3Worksheets, p3SupplementGroups } from '../dist/p3-curriculum.js';
import { p6Worksheets } from '../dist/p6-curriculum.js';

test('the P3 reference catalog retains overflow worksheet cells and has distinct IDs from P6', () => {
  assert.equal(p3Topics.length, 35);
  assert.equal(p3Worksheets.length, 294);
  assert.equal(new Set(p3Worksheets.map(sheet => sheet.id)).size, p3Worksheets.length);
  assert.equal(new Set([...p3Worksheets, ...p6Worksheets].map(sheet => sheet.id)).size, p3Worksheets.length + p6Worksheets.length);
  for (const id of ['p3-math-310-G', 'p3-math-318-F', 'p3-excel-318-K', 'p3-excel-334-A']) {
    assert.ok(p3Worksheets.some(sheet => sheet.id === id), `${id} is a visible overflow or extended cell in the reference`);
  }
  assert.deepEqual(p3SupplementGroups.map(group => group.id), ['revision', 'ps'], 'The P3 photo does not contain CE Rev or SSPA');
  assert.ok(!p3Worksheets.some(sheet => sheet.id === 'p3-math-310-H' || sheet.id === 'p3-math-318-G' || sheet.id === 'p3-excel-318-L'));
});

test('every chart cell has one resolvable worksheet and revision spans partition the main topics', () => {
  const visibleIds = p3Topics.flatMap(topic => ['math', 'excel'].flatMap(family => topic[family].map(variant => `p3-${family}-${topic.code}-${variant}`)))
    .concat(p3SupplementGroups.flatMap(group => group.sections.flatMap(section => section.worksheetIds)));
  assert.equal(new Set(visibleIds).size, visibleIds.length, 'No worksheet appears in two chart positions');
  assert.deepEqual(new Set(visibleIds), new Set(p3Worksheets.map(sheet => sheet.id)));
  const ranges = p3SupplementGroups.find(group => group.id === 'revision').sections;
  assert.deepEqual(ranges.flatMap(section => section.topicCodes), p3Topics.filter(topic => topic.term !== 'extended').map(topic => topic.code));
  for (const section of ranges) {
    const indexes = section.topicCodes.map(code => p3Topics.findIndex(topic => topic.code === code));
    assert.equal(indexes.at(-1) - indexes[0] + 1, indexes.length, 'Merged revision cells cover consecutive topic rows');
    assert.ok(section.topicCodes.every(code => p3Topics.find(topic => topic.code === code).term === section.term));
    assert.equal(section.worksheetIds.length, 4);
  }
});

test('PS retains all 38 visible numbers, challenge stars and term placement', () => {
  const ps = p3Worksheets.filter(sheet => sheet.family === 'ps');
  assert.deepEqual(ps.map(sheet => sheet.number).sort((a, b) => a - b), Array.from({ length: 38 }, (_, index) => index + 1));
  assert.deepEqual(ps.filter(sheet => sheet.term === 'first').map(sheet => sheet.number).sort((a, b) => a - b), [13, 14, 15, 16, 17, 21, 38]);
  assert.deepEqual(ps.filter(sheet => sheet.starred).map(sheet => sheet.number).sort((a, b) => a - b), [5, 10, 11, 12, 13, 14, 15, 16, 17, 25, 26, 34, 35, 36, 38]);
});

test('all P3 sheets can open as explicitly illustrative bilingual student work', () => {
  for (const sheet of p3Worksheets) {
    assert.equal(sheet.level, 'P3');
    assert.equal(sheet.demoContent, true);
    assert.equal(sheet.format, 'demo');
    assert.ok(sheet.title && sheet.titleZh && sheet.topic && sheet.topicZh, sheet.id);
    assert.ok(sheet.questions.length >= 1 && sheet.questions.length <= 3, sheet.id);
    assert.ok(sheet.questions.every(question => question.prompt?.trim() && question.promptZh?.trim()), sheet.id);
  }
});
