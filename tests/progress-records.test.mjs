import test from 'node:test';
import assert from 'node:assert/strict';
import { progressRecordCatalogues, progressRecordWorksheets } from '../dist/progress-records.js';
import * as model from '../dist/model.js';
import { createTeacherProgressUI } from '../dist/teacher-progress-ui.js';
import { assignTeacherWorksheets, getTeacherStudents } from '../dist/teacher-progress.js';
import { canStudentOpenAssignment, canStudentEditAssignment, releasePreparedAssignment } from '../dist/student-work.js';

test('all imported levels resolve distinct catalogue entries without pretending the index contains questions', () => {
  assert.deepEqual(Object.keys(progressRecordCatalogues), ['P1', 'P2', 'P4', 'P5', 'S1', 'S2', 'S3', 'K']);
  assert.deepEqual(Object.fromEntries(Object.entries(progressRecordCatalogues).map(([level, catalogue]) => [level, catalogue.worksheets.length])),
    { P1: 332, P2: 394, P4: 335, P5: 336, S1: 140, S2: 165, S3: 142, K: 221 });
  assert.equal(new Set(model.worksheets.map(sheet => sheet.id)).size, model.worksheets.length);
  for (const sheet of progressRecordWorksheets) {
    assert.equal(model.worksheetById(sheet.id), sheet);
    assert.equal(sheet.catalogueOnly, true);
    assert.equal(sheet.format, 'catalogue');
    assert.deepEqual(sheet.questions, []);
    assert.ok(sheet.code && sheet.title && sheet.titleZh && sheet.source.endsWith('.pdf'), sheet.id);
  }
});

test('each imported cell is reachable on its one-page chart and searchable by its exact code', () => {
  const state = model.seed();
  let html = '';
  const ui = createTeacherProgressUI({ getState: () => state, getTutorId: () => model.centre.managerId,
    change: callback => { callback(); html = ui.render(); }, render: () => { html = ui.render(); } });
  html = ui.render();
  const pupil = ui.selectedStudentId;
  for (const [grade, catalogue] of Object.entries(progressRecordCatalogues)) {
    ui.onChange({ target: { id: 'teacher-progress-grade', value: grade } });
    const ids = [...html.matchAll(/data-worksheet="([^"]+)"/g)].map(match => match[1]);
    assert.deepEqual(new Set(ids), new Set(catalogue.worksheets.map(sheet => sheet.id)), grade);
    assert.equal(ui.selectedStudentId, pupil, 'Browsing a different level keeps the selected pupil');
    ui.onInput({ target: { id: 'teacher-progress-worksheet-search', value: catalogue.worksheets.at(-1).code } });
    assert.match(html, /is-match/, grade);
    assert.doesNotMatch(html, /No worksheets found|Worksheet collections/, grade);
  }
});

test('primary revision spans refer to consecutive topics within the printed term', () => {
  for (const grade of ['P1', 'P2', 'P4', 'P5']) {
    const catalogue = progressRecordCatalogues[grade];
    const sections = catalogue.groups.find(group => group.id === 'revision').sections;
    const covered = sections.flatMap(section => section.topicCodes);
    // P2's printed 2B10 revision cell covers 237 BELOW the Extended Part heading.
    assert.deepEqual(covered, catalogue.topics.filter(topic => topic.term !== 'extended' || grade === 'P2' && topic.code === '237').map(topic => topic.code), grade);
    for (const section of sections) {
      const indexes = section.topicCodes.map(code => catalogue.topics.findIndex(topic => topic.code === code));
      assert.equal(indexes.at(-1) - indexes[0] + 1, indexes.length, section.id);
      assert.ok(section.topicCodes.every(code => catalogue.topics.find(topic => topic.code === code).term === section.term), section.id);
      assert.ok(section.worksheetIds.every(id => catalogue.worksheets.some(sheet => sheet.id === id)), section.id);
    }
  }
});

test('secondary split exercises and kindergarten source file identifiers survive import', () => {
  assert.deepEqual(progressRecordCatalogues.S2.worksheets.filter(sheet => sheet.topicCode === '808' && sheet.family === 'ex').map(sheet => sheet.variant), ['1', '2', '3A', '3B', '3C', '4']);
  assert.deepEqual(progressRecordCatalogues.S2.worksheets.filter(sheet => sheet.topicCode === '811' && sheet.family === 'ex').map(sheet => sheet.variant), ['1A', '1B', '2A', '2B', '2C']);
  assert.equal(progressRecordCatalogues.S3.topics.at(-1).code, '912');
  const kindergarten = progressRecordCatalogues.K.worksheets;
  assert.equal(kindergarten.filter(sheet => sheet.family === 'books').length, 95);
  assert.equal(kindergarten.filter(sheet => sheet.family === 'supplementary').length, 126);
  assert.ok(kindergarten.some(sheet => sheet.code === 'K3315_Combining Figures C _01'));
  assert.ok(kindergarten.every(sheet => sheet.level === 'K'), 'The source does not assign books to K1/K2/K3');
});

test('new grades can be prepared and sent without allowing a missing question file to be submitted', () => {
  const state = model.seed(), [student] = getTeacherStudents(state);
  for (const catalogue of Object.values(progressRecordCatalogues)) {
    const sheet = catalogue.worksheets[0];
    const assignment = assignTeacherWorksheets(state, { studentId: student.id, worksheetIds: [sheet.id], prepared: true }).assigned[0];
    assert.equal(canStudentOpenAssignment(assignment, student.id), false);
    releasePreparedAssignment(state, { assignmentId: assignment.id });
    assert.equal(canStudentOpenAssignment(assignment, student.id), true, 'The sent catalogue entry appears in the binder');
    assert.equal(canStudentEditAssignment(assignment, student.id), false, 'No work is submitted against a missing worksheet');
    assert.equal(assignTeacherWorksheets(state, { studentId: student.id, worksheetIds: [sheet.id] }).assigned.length, 0);
  }
});
