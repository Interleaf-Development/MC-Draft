import test from 'node:test';
import assert from 'node:assert/strict';
import * as model from '../dist/model.js';
import { assignP6Worksheets, assignTeacherWorksheets, getP6Students } from '../dist/teacher-progress.js';
import { createTeacherProgressUI } from '../dist/teacher-progress-ui.js';
import { binderSection, canStudentOpenAssignment, canStudentEditAssignment, releasePreparedAssignment } from '../dist/student-work.js';

test('the binder keeps released legacy work available and makes only prepared work inaccessible', () => {
  const cases = [
    ['prepared', 'future', false, false],
    ['upcoming', 'current', true, true],
    ['in-progress', 'current', true, true],
    ['corrections', 'current', true, true],
    ['submitted', 'current', true, false],
    ['completed', 'past', true, false]
  ];
  for (const [status, section, readable, editable] of cases) {
    const assignment = { studentId: 'chloe', status };
    assert.equal(binderSection(assignment), section, status);
    assert.equal(canStudentOpenAssignment(assignment, 'chloe'), readable, status);
    assert.equal(canStudentEditAssignment(assignment, 'chloe'), editable, status);
    assert.equal(canStudentOpenAssignment(assignment, 'ethan'), false, 'Another child cannot open ' + status + ' work');
    assert.equal(canStudentEditAssignment(assignment, 'ethan'), false, 'Another child cannot change ' + status + ' work');
  }
  for (const assignment of [null, undefined, {}, { studentId: 'chloe', status: 'unknown' }]) {
    assert.equal(canStudentOpenAssignment(assignment, 'chloe'), false);
    assert.equal(canStudentEditAssignment(assignment, 'chloe'), false);
  }
  assert.equal(canStudentOpenAssignment({ status: 'upcoming' }, undefined), false);
});

test('preparing ahead is separate from releasing and preserves student work when released', () => {
  const state = model.seed(), [student] = getP6Students(state);
  const assignment = assignP6Worksheets(state, {
    studentId: student.id, worksheetIds: ['p6-math-603-P'], homework: true, prepared: true
  }).assigned[0];
  assert.equal(assignment.status, 'prepared');
  assert.equal(assignment.preparedDate, model.TODAY);
  assert.equal(assignment.releasedDate, undefined);
  assert.equal(canStudentOpenAssignment(assignment, student.id), false);
  // Retain any prior local annotations/teacher notes when changing availability.
  Object.assign(assignment, { strokes: [{ points: [[2, 4], [3, 6]] }], feedback: [{ points: [[8, 9]] }], working: 'Saved working', note: 'Teacher note' });
  const before = structuredClone(assignment);
  const released = releasePreparedAssignment(state, { assignmentId: assignment.id });
  assert.equal(released, assignment, 'Existing canvas references remain valid');
  assert.deepEqual(assignment, { ...before, status: 'upcoming', releasedDate: model.TODAY, releasedBy: model.centre.managerId });
  assert.equal(canStudentOpenAssignment(assignment, student.id), true);
  assert.equal(canStudentEditAssignment(assignment, student.id), true);
  assert.equal(binderSection(assignment), 'current');
  assert.equal(state.demoWorksheetStudent, student.id);
  assert.match(state.audit[0].text, /^Released /);
  const after = structuredClone(state);
  assert.throws(() => releasePreparedAssignment(state, { assignmentId: assignment.id }), /Only prepared/);
  assert.deepEqual(state, after, 'Retrying release does not add duplicate audit records or reset work');
});

test('invalid release and teachers outside the student roster cannot change availability', () => {
  const state = model.seed(), [student] = getP6Students(state);
  const assignment = assignTeacherWorksheets(state, { studentId: student.id, worksheetIds: ['p6-math-603-P'], prepared: true }).assigned[0];
  const before = structuredClone(state);
  assert.throws(() => releasePreparedAssignment(state, { assignmentId: 'missing' }), /no longer available/);
  assert.deepEqual(state, before);
  assert.throws(() => releasePreparedAssignment(state, { assignmentId: assignment.id, tutorId: 'unrelated-teacher' }), /your classes/);
  assert.deepEqual(state, before);
});

test('preparing worksheets is atomic and repeat sends cannot silently unlock or duplicate them', () => {
  const state = model.seed();
  const selected = { studentId: 'chloe', worksheetIds: ['p6-math-603-P'], prepared: true };
  const assignment = assignTeacherWorksheets(state, selected).assigned[0];
  assert.equal(assignment.status, 'prepared');
  const before = structuredClone(state);
  const duplicate = assignTeacherWorksheets(state, { ...selected, prepared: false });
  assert.deepEqual(duplicate.assigned, []);
  assert.deepEqual(duplicate.skipped, selected.worksheetIds);
  assert.deepEqual(state, before, 'An already prepared cell is opened for review/release rather than resent');
  assert.throws(() => assignTeacherWorksheets(state, { ...selected, worksheetIds: ['p6-math-603-Q', 'missing'] }));
  assert.deepEqual(state, before);
  const released = assignTeacherWorksheets(state, { studentId: 'chloe', worksheetIds: ['p6-math-603-Q'] }).assigned[0];
  assert.equal(released.status, 'upcoming', 'Send now remains the default');
  assert.equal(released.releasedDate, model.TODAY);
});

test('a teacher prepares from the chart, then opens the prepared worksheet for review and release', () => {
  const state = model.seed();
  state.bookings = [{ id: 'binder-class', studentId: 'chloe', date: model.TODAY, start: 960, duration: 60, tutor: model.centre.managerId, status: 'scheduled' }];
  let ui, html = '', changes = 0;
  const opened = [];
  const render = () => { html = ui.render(); };
  ui = createTeacherProgressUI({
    getState: () => state, getTutorId: () => model.centre.managerId,
    change(callback) { callback(); changes++; render(); return true; }, render,
    openAssignment(id) { opened.push(id); }
  });
  render();
  ui.onChange({ target: { id: 'teacher-progress-grade', value: 'P6' } });
  ui.onClick({ dataset: { action: 'teacher-progress-worksheet', worksheet: 'p6-math-603-P' } });
  ui.onClick({ dataset: { action: 'teacher-progress-prepare' } });
  const assignment = state.assignments.find(item => item.studentId === 'chloe' && item.worksheetId === 'p6-math-603-P');
  assert.equal(assignment.status, 'prepared');
  assert.equal(changes, 1);
  assert.match(html, /is-prepared/);
  assert.match(html, /Prepare for later/);
  ui.onClick({ dataset: { action: 'teacher-progress-prepare' } });
  assert.equal(changes, 1, 'Preparing clears the selection');
  ui.onClick({ dataset: { action: 'teacher-progress-worksheet', worksheet: 'p6-math-603-P' } });
  assert.deepEqual(opened, [assignment.id]);
  assert.equal(canStudentOpenAssignment(assignment, 'chloe'), false, 'Teacher opening a prepared sheet does not release it');
});
