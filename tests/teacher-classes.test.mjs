import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import * as model from '../dist/model.js';
import { getTeacherClasses, getTeacherStudents, assignTeacherWorksheets, worksheetProgress } from '../dist/teacher-progress.js';

function lesson(studentId, date, start, tutor = model.centre.managerId, extra = {}) {
  return { id: model.uid('lesson'), studentId, date, start, duration: 60, tutor, status: 'scheduled', attendance: 'unmarked', ...extra };
}

test('teacher classes come only from real bookings and group mixed grades by date and start', () => {
  const state = model.seed();
  const paused = model.enrolledStudents(state).find(student => student.status === 'paused');
  state.bookings = [
    lesson('chloe', '2026-10-07', 960),
    lesson('ethan', '2026-09-30', 960, model.centre.managerId, { duration: 90 }),
    lesson('chloe', '2026-09-30', 960),
    lesson('chloe', '2026-09-30', 960), // A duplicate must not show the student twice.
    lesson('emma', '2026-09-30', 990), // Same date, overlapping time, distinct class start.
    lesson('lucas', '2026-09-23', 960, model.centre.managerId, { attendance: 'present' }),
    lesson('ryan', '2026-09-30', 960, model.tutors[1].id),
    ...['moved', 'absent', 'cancelled'].map((status, index) => lesson('sophie', '2026-09-30', 600 + index * 60, model.centre.managerId, { status })),
    lesson(paused.id, '2026-09-30', 540),
    lesson('mia', '2026-09-30', 540), // Assessment-only students are not enrolled.
    lesson('missing-student', '2026-09-30', 540)
  ];
  const before = structuredClone(state);
  const classes = getTeacherClasses(state);
  assert.deepEqual(classes.map(session => [session.date, session.start, session.end, session.students.map(student => student.id)]), [
    ['2026-09-23', 960, 1020, ['lucas']],
    ['2026-09-30', 960, 1050, ['chloe', 'ethan']],
    ['2026-09-30', 990, 1050, ['emma']],
    ['2026-10-07', 960, 1020, ['chloe']]
  ]);
  assert.deepEqual(classes[1].students.map(student => student.level), ['P3', 'P4']);
  assert.ok(classes.every(session => session.tutor === model.centre.managerId));
  assert.equal(new Set(classes.map(session => session.id)).size, classes.length);
  assert.deepEqual(state, before, 'Reading classes must not generate bookings or modify fixture data');
  state.bookings = [];
  assert.deepEqual(getTeacherClasses(state), [], 'A regular teacher assignment alone does not invent a class');
});

test('teacher navigation includes regular students and actual substitute lessons while excluding inactive bookings', () => {
  const state = model.seed(), tutorId = model.centre.managerId;
  const foreign = model.enrolledStudents(state).filter(student => student.status === 'active' && student.tutor !== tutorId);
  const paused = model.enrolledStudents(state).find(student => student.status === 'paused');
  state.bookings = [
    lesson(foreign[0].id, '2026-09-16', 960),
    lesson(foreign[1].id, '2026-10-07', 960),
    lesson(foreign[2].id, '2026-09-30', 960, tutorId, { status: 'moved' }),
    lesson(foreign[3].id, '2026-09-30', 960, tutorId, { status: 'absent' }),
    lesson(foreign[4].id, '2026-09-30', 960, tutorId, { status: 'cancelled' }),
    lesson(paused.id, '2026-09-30', 960)
  ];
  const students = getTeacherStudents(state), ids = students.map(student => student.id);
  assert.ok(ids.includes('chloe'), 'An own student remains accessible before their next booking exists');
  assert.ok(ids.includes(foreign[0].id) && ids.includes(foreign[1].id), 'Past and future substitute lessons are accessible');
  assert.ok(foreign.slice(2, 5).every(student => !ids.includes(student.id)));
  assert.ok(!ids.includes(paused.id));
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(students.map(student => student.number), students.map(student => student.number).toSorted());
  state.regularSchedules = { chloe: { weekday: 3, start: 960, tutor: model.tutors[1].id } };
  assert.ok(!getTeacherStudents(state).some(student => student.id === 'chloe'), 'A regular teacher change is reflected if no lesson remains with the old teacher');
});

test('teachers may assign higher and lower grade worksheets without overwriting existing work', () => {
  const state = model.seed();
  const p6 = getTeacherStudents(state).find(student => student.level === 'P6');
  const raised = assignTeacherWorksheets(state, { studentId: 'chloe', worksheetIds: ['p6-math-601-A', 'p6-math-601-A'], homework: true });
  assert.equal(raised.assigned.length, 1);
  assert.equal(raised.assigned[0].homework, true);
  assert.equal(raised.assigned[0].studentId, 'chloe');
  Object.assign(raised.assigned[0], { status: 'in-progress', working: 'Saved answer', strokes: [{ points: [[1, 2]] }] });
  const before = structuredClone(state);
  const repeat = assignTeacherWorksheets(state, { studentId: 'chloe', worksheetIds: ['p6-math-601-A'] });
  assert.deepEqual(repeat, { assigned: [], skipped: ['p6-math-601-A'] });
  assert.deepEqual(state, before);
  const lowered = assignTeacherWorksheets(state, { studentId: p6.id, worksheetIds: ['fractions-01', 'numbers-01'] });
  assert.equal(lowered.assigned.length, 2);
  assert.ok(lowered.assigned.every(item => item.studentId === p6.id && item.status === 'upcoming' && item.assignedBy === model.centre.managerId));
  assert.equal(worksheetProgress(state, 'chloe', 'p6-math-601-A').working, 'Saved answer');
});

test('all teacher worksheet sends validate student and entire selection before adding assignments', () => {
  const state = model.seed();
  state.bookings = [];
  const foreign = model.enrolledStudents(state).find(student => student.status === 'active' && student.tutor !== model.centre.managerId);
  const paused = model.enrolledStudents(state).find(student => student.status === 'paused');
  for (const options of [
    { studentId: 'chloe', worksheetIds: [] },
    { studentId: 'chloe', worksheetIds: ['p6-math-601-A', 'missing-worksheet'] },
    { studentId: 'unknown-student', worksheetIds: ['p6-math-601-A'] },
    { studentId: paused.id, worksheetIds: ['p6-math-601-A'] },
    { studentId: foreign.id, worksheetIds: ['p6-math-601-A'] }
  ]) {
    const before = structuredClone(state);
    assert.throws(() => assignTeacherWorksheets(state, options));
    assert.deepEqual(state, before);
  }
  state.bookings.push(lesson(foreign.id, '2026-10-07', 960));
  const assigned = assignTeacherWorksheets(state, { studentId: foreign.id, worksheetIds: ['p6-math-601-A'] });
  assert.equal(assigned.assigned.length, 1, 'A student actually scheduled with a substitute teacher can receive their worksheets');
});

test('Hang Hau class navigation and cross-grade worksheet assignment use the same rules', () => {
  const script = `
    import assert from 'node:assert/strict';
    globalThis.location = { pathname: '/hh/' };
    const model = await import(${JSON.stringify(new URL('../dist/model.js', import.meta.url).href)});
    const progress = await import(${JSON.stringify(new URL('../dist/teacher-progress.js', import.meta.url).href)});
    const state = model.seed();
    model.seedTeacherSchedules(state);
    assert.equal(model.centre.manager, 'Rico');
    const classes = progress.getTeacherClasses(state);
    assert.ok(classes.length > 0);
    assert.ok(classes.every(session => session.tutor === model.centre.managerId));
    assert.ok(classes.some(session => session.date < model.TODAY));
    assert.ok(classes.some(session => session.date > model.TODAY));
    assert.ok(classes.flatMap(session => session.students).every(student => progress.getTeacherStudents(state).some(item => item.id === student.id)));
    const own = progress.getTeacherStudents(state).find(student => student.level === 'P6');
    assert.ok(own);
    assert.equal(progress.assignTeacherWorksheets(state, { studentId: own.id, worksheetIds: ['fractions-01'] }).assigned.length, 1);
    assert.equal(progress.assignTeacherWorksheets(state, { studentId: 'chloe', worksheetIds: ['p6-math-601-A'] }).assigned.length, 1);
    process.stdout.write('ok');
  `;
  assert.equal(execFileSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' }), 'ok');
});
