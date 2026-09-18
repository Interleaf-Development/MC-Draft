import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import * as model from '../dist/model.js';
import { getP6Students, getTeacherClasses, worksheetProgress, assignP6Worksheets, normalizeP6Progress } from '../dist/teacher-progress.js';
import { createTeacherProgressUI } from '../dist/teacher-progress-ui.js';

const selection = ['p6-math-603-P', 'p6-excel-601-A', 'p6-revision-6A01-A1'];

test('sending several chart cells puts classwork and homework in the selected P6 student folder', () => {
  const state = model.seed();
  normalizeP6Progress(state);
  const [student, other] = getP6Students(state);
  assert.ok(student && other, 'The teacher has existing P6 students to teach');
  const before = structuredClone(state.assignments);
  const result = assignP6Worksheets(state, { studentId: student.id, worksheetIds: selection });
  assert.equal(result.assigned.length, 3);
  assert.deepEqual(result.skipped, []);
  assert.deepEqual(result.assigned.map(item => item.worksheetId), selection);
  assert.equal(new Set(result.assigned.map(item => item.id)).size, 3);
  for (const assignment of result.assigned) {
    assert.equal(assignment.studentId, student.id);
    assert.equal(assignment.assignedBy, student.tutor);
    assert.equal(assignment.assignedDate, model.TODAY);
    assert.equal(assignment.status, 'upcoming');
    assert.equal(assignment.homework, false);
    assert.ok(model.worksheets.some(sheet => sheet.id === assignment.worksheetId), 'Assigned sheet is also available to the Student view');
  }
  assert.deepEqual(state.assignments.slice(0, before.length), before, 'Sending preserves already completed and annotated work');
  assert.equal(state.demoWorksheetStudent, student.id);
  const homework = assignP6Worksheets(state, { studentId: other.id, worksheetIds: [selection[0]], homework: true });
  assert.equal(homework.assigned.length, 1);
  assert.equal(homework.assigned[0].studentId, other.id);
  assert.equal(homework.assigned[0].homework, true);
  assert.equal(worksheetProgress(state, student.id, selection[0]).homework, false, 'The same sheet can be classwork for one student and homework for another');
});

test('duplicate selections and repeat sends do not create duplicate work or overwrite progress', () => {
  const state = model.seed(), [student] = getP6Students(state);
  const first = assignP6Worksheets(state, { studentId: student.id, worksheetIds: [selection[0], selection[0]] });
  assert.equal(first.assigned.length, 1);
  Object.assign(first.assigned[0], { status: 'in-progress', working: '3.6 + 12 = 15.6', strokes: [{ points: [[1, 2], [3, 4]] }] });
  const before = structuredClone(state);
  const duplicate = assignP6Worksheets(state, { studentId: student.id, worksheetIds: [selection[0]], homework: true });
  assert.deepEqual(duplicate.assigned, []);
  assert.deepEqual(duplicate.skipped, [selection[0]]);
  assert.deepEqual(state, before, 'A retry preserves answers, category, audit and selected demo student');
  const mixed = assignP6Worksheets(state, { studentId: student.id, worksheetIds: [selection[0], selection[1], selection[1]] });
  assert.deepEqual(mixed.skipped, [selection[0]]);
  assert.deepEqual(mixed.assigned.map(item => item.worksheetId), [selection[1]]);
  assert.deepEqual(state.assignments.find(item => item.id === first.assigned[0].id), before.assignments.find(item => item.id === first.assigned[0].id));
});

test('invalid or empty worksheet selections fail atomically', () => {
  const state = model.seed(), [student] = getP6Students(state);
  for (const worksheetIds of [[], undefined, [selection[0], 'missing-worksheet'], [selection[0], 'fractions-01']]) {
    const before = structuredClone(state);
    assert.throws(() => assignP6Worksheets(state, { studentId: student.id, worksheetIds }));
    assert.deepEqual(state, before, 'No partial assignment or audit is saved when one cell is invalid');
  }
});

test('the P6 list and sending respect active grade and the current regular teacher', () => {
  const state = model.seed();
  const own = getP6Students(state), [student] = own;
  assert.ok(own.length > 0);
  assert.ok(own.every(item => item.level === 'P6' && item.status === 'active' && item.tutor === model.centre.managerId));
  const foreign = model.enrolledStudents(state).find(item => item.level === 'P6' && item.status === 'active' && item.tutor !== model.centre.managerId);
  const paused = model.enrolledStudents(state).find(item => item.level === 'P6' && item.status === 'paused');
  assert.ok(foreign && paused, 'Fixtures include students outside the eligible list');
  for (const studentId of ['unknown-student', 'chloe', paused.id, foreign.id]) {
    const before = structuredClone(state);
    assert.throws(() => assignP6Worksheets(state, { studentId, worksheetIds: [selection[0]] }));
    assert.deepEqual(state, before);
  }
  assert.equal(assignP6Worksheets(state, { studentId: foreign.id, tutorId: foreign.tutor, worksheetIds: [selection[0]] }).assigned[0].assignedBy, foreign.tutor);

  // A permanent teacher change should change the teacher's student list too.
  state.regularSchedules = { [student.id]: { weekday: 3, start: 960, tutor: foreign.tutor } };
  assert.ok(!getP6Students(state).some(item => item.id === student.id));
  assert.ok(getP6Students(state, foreign.tutor).some(item => item.id === student.id));
  const before = structuredClone(state);
  assert.throws(() => assignP6Worksheets(state, { studentId: student.id, worksheetIds: [selection[1]] }));
  assert.deepEqual(state, before);
});

test('chart progress reads saved student work independently for every sheet and student', () => {
  const state = model.seed(), [first, second] = getP6Students(state);
  const statuses = ['upcoming', 'in-progress', 'submitted', 'corrections', 'completed'];
  const ids = ['p6-math-601-A', 'p6-math-601-B', 'p6-math-601-C', 'p6-math-601-D', 'p6-math-601-P'];
  assignP6Worksheets(state, { studentId: first.id, worksheetIds: ids }).assigned.forEach((item, index) => { item.status = statuses[index]; });
  const secondWork = assignP6Worksheets(state, { studentId: second.id, worksheetIds: [ids[0]] }).assigned[0];
  secondWork.status = 'corrections';
  ids.forEach((id, index) => assert.equal(worksheetProgress(state, first.id, id).status, statuses[index]));
  assert.equal(worksheetProgress(state, second.id, ids[0]).status, 'corrections');
  assert.equal(worksheetProgress(state, second.id, ids[1]), undefined);
  assert.equal(worksheetProgress(state, first.id, 'missing-worksheet'), undefined);
});

test('the progress migration preserves saved work, seeds usable examples once and never restores removed examples', () => {
  const state = model.seed(), [student] = getP6Students(state);
  const work = assignP6Worksheets(state, { studentId: student.id, worksheetIds: ['p6-math-601-A'], homework: true }).assigned[0];
  Object.assign(work, { status: 'corrections', working: 'My saved answer', note: 'Keep teacher feedback', feedback: [{ points: [[7, 8]] }] });
  const saved = structuredClone(state);
  normalizeP6Progress(state);
  for (const assignment of saved.assignments) assert.deepEqual(state.assignments.find(item => item.id === assignment.id), assignment);
  assert.equal(state.assignments.filter(item => item.studentId === student.id && item.worksheetId === 'p6-math-601-A').length, 1);
  for (const [key, value] of Object.entries(saved)) if (key !== 'assignments') assert.deepEqual(state[key], value, key + ' is unrelated to progress migration');
  const added = state.assignments.filter(item => !saved.assignments.some(existing => existing.id === item.id));
  assert.ok(added.length > 0);
  assert.ok(added.every(item => getP6Students(state).some(pupil => pupil.id === item.studentId) && model.worksheets.some(sheet => sheet.id === item.worksheetId)));
  const normalized = structuredClone(state);
  normalizeP6Progress(state);
  assert.deepEqual(state, normalized);
  state.assignments = state.assignments.filter(item => item.id !== added[0].id);
  const afterRemoval = structuredClone(state);
  normalizeP6Progress(state);
  assert.deepEqual(state, afterRemoval, 'User-removed seeded work stays removed on subsequent loads');
});

test('Hang Hau uses the same progress and assignment workflow with its own director and teachers', () => {
  const modelUrl = new URL('../dist/model.js', import.meta.url).href;
  const progressUrl = new URL('../dist/teacher-progress.js', import.meta.url).href;
  const script = `
    import assert from 'node:assert/strict';
    globalThis.location = { pathname: '/hh/' };
    const model = await import(${JSON.stringify(modelUrl)});
    const progress = await import(${JSON.stringify(progressUrl)});
    const state = model.seed();
    progress.normalizeP6Progress(state);
    assert.equal(model.centre.manager, 'Rico');
    const [student] = progress.getP6Students(state);
    assert.ok(student);
    assert.equal(student.tutor, model.centre.managerId);
    const result = progress.assignP6Worksheets(state, { studentId: student.id, worksheetIds: ['p6-math-603-P', 'p6-excel-601-A'] });
    assert.equal(result.assigned.length, 2);
    assert.ok(result.assigned.every(item => item.assignedBy === model.centre.managerId && item.studentId === student.id));
    const before = structuredClone(state);
    progress.normalizeP6Progress(state);
    assert.deepEqual(state, before);
    assert.equal(progress.worksheetProgress(state, student.id, 'p6-excel-601-A').status, 'upcoming');
    process.stdout.write('ok');
  `;
  assert.equal(execFileSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' }), 'ok');
});

function chartHarness({ p6 = false, prepare } = {}) {
  const state = model.seed();
  model.seedTeacherSchedules(state);
  model.seedBusyAfternoons(state);
  prepare?.(state);
  normalizeP6Progress(state);
  const calls = { changes: 0, students: [], assignments: [], folders: [], studentViews: [] };
  let html = '', ui;
  const render = () => { html = ui.render(); };
  ui = createTeacherProgressUI({
    getState: () => state, getTutorId: () => model.centre.managerId,
    change(callback) { callback(); calls.changes++; render(); return true; }, render,
    onStudentChange(id) { calls.students.push(id); },
    openAssignment(id) { calls.assignments.push(id); },
    openFolder(id) { calls.folders.push(id); },
    openStudentView(id) { calls.studentViews.push(id); }
  });
  render();
  if (p6) {
    assert.equal(ui.selectStudent(getP6Students(state)[0].id), true);
    render();
  }
  return { state, ui, calls, render, get html() { return html; },
    change(id, value) { return ui.onChange({ target: { id, value } }); },
    click(action, data = {}) { return ui.onClick({ dataset: { action: 'teacher-progress-' + action, ...data } }); }
  };
}

test('the chart clears picked sheets on student change and sends only the new selection once', () => {
  const app = chartHarness({ p6: true }), [first, second] = getP6Students(app.state);
  assert.equal(app.ui.selectedStudentId, first.id);
  const before = structuredClone(app.state.assignments);
  app.click('worksheet', { worksheet: selection[0] });
  app.click('worksheet', { worksheet: selection[2] });
  assert.deepEqual(app.state.assignments, before, 'Picking cells from different collections does not send work');
  app.click('student', { student: second.id });
  assert.equal(app.ui.selectedStudentId, second.id);
  app.click('send');
  assert.equal(app.calls.changes, 0, 'The first student selection must not leak into the second student');
  assert.deepEqual(app.state.assignments, before);
  app.click('worksheet', { worksheet: selection[1] });
  app.ui.onChange({ target: { id: 'teacher-progress-purpose', value: 'homework' } });
  app.click('send');
  assert.equal(app.calls.changes, 1);
  const added = app.state.assignments.slice(before.length);
  assert.equal(added.length, 1);
  assert.equal(added[0].studentId, second.id);
  assert.equal(added[0].worksheetId, selection[1]);
  assert.equal(added[0].homework, true);
  app.click('send');
  assert.equal(app.calls.changes, 1, 'Send clears the selection so repeated clicks cannot send it again');
  app.click('folder');
  app.click('student-view');
  assert.deepEqual(app.calls.folders, [second.id]);
  assert.deepEqual(app.calls.studentViews, [second.id]);
});

test('clicking a completed chart cell opens its saved work instead of selecting or resending it', () => {
  const app = chartHarness({ p6: true }), studentId = app.ui.selectedStudentId;
  const completed = app.state.assignments.find(item => item.studentId === studentId && item.status === 'completed');
  assert.ok(completed);
  const before = structuredClone(app.state);
  app.click('worksheet', { worksheet: completed.worksheetId });
  assert.deepEqual(app.calls.assignments, [completed.id]);
  app.click('send');
  assert.equal(app.calls.changes, 0);
  assert.deepEqual(app.state, before);
  assert.equal(app.ui.onClick({ dataset: { action: 'unrelated-action' } }), false);
});


test('the combined chart keeps every worksheet available exactly once, including extended CE and SSPA', () => {
  const app = chartHarness({ p6: true });
  const ids = [...app.html.matchAll(/data-worksheet="([^"]+)"/g)].map(match => match[1]);
  const expected = model.worksheets.filter(sheet => sheet.level === 'P6').map(sheet => sheet.id);
  assert.equal(ids.length, expected.length);
  assert.deepEqual(new Set(ids), new Set(expected));
  for (const worksheet of ['p6-ce-P6-01', 'p6-sspa-6B-6', 'p6-ps-54']) assert.ok(ids.includes(worksheet));
  app.ui.onInput({ target: { id: 'teacher-progress-worksheet-search', value: '6B01' } });
  assert.match(app.html, /4 matches/);
  assert.equal([...app.html.matchAll(/data-worksheet="([^"]+)"/g)].length, expected.length, 'Searching highlights matches while preserving the chart and merged topic groups');
});

function classHarness() {
  return chartHarness({ prepare(state) {
    const booking = (studentId, date, start) => ({ id: model.uid('lesson'), studentId, date, start, duration: 60, tutor: model.centre.managerId, status: 'scheduled' });
    state.bookings = [
      booking('emma', '2026-09-23', 960),
      booking('chloe', model.TODAY, 960),
      booking('ethan', model.TODAY, 960),
      booking('chloe', model.TODAY, 1020),
      booking('lucas', '2026-10-07', 960)
    ];
  } });
}

function displayedPupils(app) {
  return [...app.html.matchAll(/data-student="([^"]+)"/g)].map(match => match[1]);
}

function selectedClassId(app) {
  return app.html.match(/data-class="([^"]+)" aria-pressed="true"/)?.[1] || null;
}

function displayedGrade(app) {
  return app.html.match(/id="teacher-progress-grade"[^>]*>([\s\S]*?)<\/select>/)?.[1].match(/value="([^"]+)" selected/)?.[1] || null;
}

test('the teacher starts at today\'s actual class with only that class\'s pupils and each pupil\'s own grade', () => {
  const app = classHarness(), classes = getTeacherClasses(app.state);
  assert.equal(selectedClassId(app), classes[1].id);
  assert.deepEqual(displayedPupils(app), ['chloe', 'ethan']);
  assert.equal(app.ui.selectedStudentId, 'chloe');
  assert.equal(displayedGrade(app), 'P3');
  app.click('student', { student: 'ethan' });
  assert.equal(app.ui.selectedStudentId, 'ethan');
  assert.equal(displayedGrade(app), 'P4');
  assert.equal(selectedClassId(app), classes[1].id);
  app.click('class', { class: classes[0].id });
  assert.deepEqual(displayedPupils(app), ['emma']);
  assert.equal(app.ui.selectedStudentId, 'emma');
  assert.equal(displayedGrade(app), 'P2');
});

test('class arrows, date selection and Today navigate real past and upcoming classes', () => {
  const app = classHarness(), classes = getTeacherClasses(app.state);
  app.click('previous-class');
  assert.equal(selectedClassId(app), classes[0].id);
  app.click('previous-class');
  assert.equal(selectedClassId(app), classes[0].id, 'Previous at the first class does not wrap around');
  app.click('next-class');
  assert.equal(selectedClassId(app), classes[1].id);
  app.click('next-class');
  assert.equal(selectedClassId(app), classes[2].id, 'Classes at different times on the same date remain separate');
  assert.deepEqual(displayedPupils(app), ['chloe']);
  app.change('teacher-progress-class-date', '2026-10-01');
  assert.equal(selectedClassId(app), classes[3].id, 'A date without a lesson goes to the next actual class');
  assert.equal(app.ui.selectedStudentId, 'lucas');
  app.click('next-class');
  assert.equal(selectedClassId(app), classes[3].id, 'Next at the final class remains on that class');
  app.change('teacher-progress-class-date', '2027-01-01');
  assert.equal(selectedClassId(app), classes[3].id, 'Dates after the last booking retain the latest class');
  app.click('today');
  assert.equal(selectedClassId(app), classes[1].id);
  assert.equal(app.ui.selectedStudentId, 'chloe');
  app.change('teacher-progress-class-date', '');
  assert.equal(selectedClassId(app), classes[1].id);
  app.click('class', { class: 'missing-class' });
  assert.equal(selectedClassId(app), classes[1].id);
});

test('a teacher may browse another grade and send its worksheet to the selected child', () => {
  const app = classHarness();
  const before = app.state.assignments.length;
  app.change('teacher-progress-grade', 'P6');
  assert.equal(displayedGrade(app), 'P6');
  assert.equal(app.ui.selectedStudentId, 'chloe', 'Changing the worksheet grade does not change its recipient');
  app.click('worksheet', { worksheet: 'p6-math-603-P' });
  app.click('send');
  assert.equal(app.calls.changes, 1);
  assert.equal(app.state.assignments.length, before + 1);
  assert.equal(app.state.assignments.at(-1).studentId, 'chloe');
  assert.equal(app.state.assignments.at(-1).worksheetId, 'p6-math-603-P');
  app.click('student', { student: 'ethan' });
  assert.equal(displayedGrade(app), 'P4', 'Another pupil restores their own grade');
  app.change('teacher-progress-grade', 'P6');
  app.click('student', { student: 'ethan' });
  assert.equal(displayedGrade(app), 'P6', 'Selecting the same pupil retains the teacher\'s chosen grade');
});

test('grade and class changes clear worksheet selections so work cannot leak into a new context', () => {
  const app = classHarness();
  const before = structuredClone(app.state.assignments);
  app.change('teacher-progress-grade', 'P6');
  app.click('worksheet', { worksheet: selection[0] });
  app.change('teacher-progress-grade', 'P4');
  app.click('send');
  assert.equal(app.calls.changes, 0);
  assert.deepEqual(app.state.assignments, before);
  app.click('worksheet', { worksheet: selection[1] });
  app.click('send');
  assert.equal(app.calls.changes, 0, 'A stale worksheet event from a different grade is ignored');
  app.change('teacher-progress-grade', 'P6');
  app.click('worksheet', { worksheet: selection[0] });
  app.click('next-class');
  assert.equal(app.ui.selectedStudentId, 'chloe', 'The same pupil appears in this next class');
  assert.equal(displayedGrade(app), 'P3', 'Changing the class still restores the pupil\'s grade');
  app.click('send');
  assert.equal(app.calls.changes, 0);
  assert.deepEqual(app.state.assignments, before);
  app.change('teacher-progress-grade', 'not-a-grade');
  assert.equal(displayedGrade(app), 'P3');
});

test('opening a scheduled student finds their class while an empty timetable is safe', () => {
  const app = classHarness();
  assert.equal(app.ui.selectStudent('lucas'), true);
  app.render();
  assert.equal(app.ui.selectedStudentId, 'lucas');
  assert.deepEqual(displayedPupils(app), ['lucas']);
  assert.equal(app.ui.selectStudent('sophie'), false, 'A regular pupil without a booking cannot invent a class');
  assert.equal(app.ui.selectedStudentId, 'lucas');
  const empty = chartHarness({ prepare(state) { state.bookings = []; } });
  assert.equal(empty.ui.selectedStudentId, null);
  assert.deepEqual(displayedPupils(empty), []);
  assert.equal(displayedGrade(empty), null);
  const before = structuredClone(empty.state);
  for (const action of ['previous-class', 'next-class', 'today', 'send', 'folder', 'student-view']) empty.click(action);
  empty.click('worksheet', { worksheet: selection[0] });
  empty.change('teacher-progress-class-date', model.TODAY);
  assert.equal(empty.calls.changes, 0);
  assert.deepEqual(empty.calls.folders, []);
  assert.deepEqual(empty.calls.studentViews, []);
  assert.deepEqual(empty.state, before);
});
