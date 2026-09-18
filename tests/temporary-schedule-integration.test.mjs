import test from 'node:test';
import assert from 'node:assert/strict';
import { TODAY, clone, seed, enrolledStudents, filterStudents, tutors, students } from '../dist/model.js';
import { getStudentProfile } from '../dist/student-profile.js';
import { getP6Students } from '../dist/teacher-progress.js';
import { previewRegularScheduleChange, applyRegularScheduleChange, getRegularSchedule } from '../dist/regular-schedule.js';

const original = { weekday: 3, start: 960, duration: 60, tutor: tutors[0].id };
const temporary = { weekday: 4, start: 840, duration: 60, tutor: tutors[1].id, effectiveDate: '2026-09-01', endDate: TODAY, temporary: true, previousRule: original };

test('applying a temporary change updates the profile and directory and books the original timetable after its end', () => {
  const state = seed(), invoice = state.invoices.find(item => item.id === 'INV-1028');
  invoice.periodStart = TODAY;
  invoice.periodEnd = '2026-11-30';
  const input = { studentId: 'oliver', invoiceId: invoice.id, effectiveDate: TODAY, endDate: '2026-10-14', weekday: 4, start: 840, tutor: tutors[0].id };
  const preview = previewRegularScheduleChange(state, input);
  assert.deepEqual(preview.conflicts, []);
  applyRegularScheduleChange(state, input, { fingerprint: preview.fingerprint, extra: 'allow', shortfall: 'credit' });
  const restored = JSON.parse(JSON.stringify(state)), profile = getStudentProfile(restored, 'oliver');
  const student = enrolledStudents(restored).find(item => item.id === 'oliver');
  assert.deepEqual(profile.lessonDays, ['Thursday']);
  assert.equal(profile.lessonTime, '14:00');
  assert.equal(profile.regularEffectiveDate, TODAY);
  assert.equal(profile.regularEndDate, '2026-10-14');
  assert.equal(student.regular, 'Thursday · 14:00');
  assert.ok(filterStudents(restored, { day: 'Thursday' }).some(item => item.id === 'oliver'));
  assert.ok(!filterStudents(restored, { day: 'Wednesday' }).some(item => item.id === 'oliver'));
  const rule = getRegularSchedule(restored, 'oliver', '2026-10-15');
  assert.equal(rule.weekday, 3);
  assert.equal(rule.start, 960);
  const resumed = restored.invoices.find(item => item.id === invoice.id).lessonPlan.lessonDates.filter(item => item.date > input.endDate);
  assert.ok(resumed.length > 0);
  assert.ok(resumed.every(item => new Date(item.date + 'T00:00:00Z').getUTCDay() === 3 && item.start === 960 && item.tutor === original.tutor));
});

test('a future temporary change leaves the current profile and directory on the original timetable', () => {
  const state = seed();
  state.regularSchedules = { oliver: { ...temporary, effectiveDate: '2026-10-01', endDate: '2026-10-31' } };
  const before = clone(state), profile = getStudentProfile(state, 'oliver');
  assert.deepEqual(profile.lessonDays, ['Wednesday']);
  assert.equal(profile.lessonTime, '16:00');
  assert.equal(profile.instructor, tutors[0].name);
  assert.equal(profile.regularEffectiveDate, '');
  assert.equal(profile.regularEndDate, '');
  assert.equal(enrolledStudents(state).find(item => item.id === 'oliver').regular, 'Wednesday · 16:00');
  assert.deepEqual(state, before);
});

test('an expired temporary change restores the previous profile metadata and directory filters', () => {
  const state = seed();
  state.regularSchedules = { oliver: { ...temporary, endDate: '2026-09-29', previousRule: { ...original, effectiveDate: '2026-08-01' } } };
  const profile = getStudentProfile(state, 'oliver'), student = enrolledStudents(state).find(item => item.id === 'oliver');
  assert.deepEqual(profile.lessonDays, ['Wednesday']);
  assert.equal(profile.lessonTime, '16:00');
  assert.equal(profile.instructor, tutors[0].name);
  assert.equal(profile.regularEffectiveDate, '2026-08-01');
  assert.equal(profile.regularEndDate, '');
  assert.equal(student.tutor, tutors[0].id);
  assert.ok(filterStudents(state, { day: 'Wednesday', tutor: tutors[0].id }).some(item => item.id === 'oliver'));
  assert.ok(!filterStudents(state, { day: 'Thursday', tutor: tutors[1].id }).some(item => item.id === 'oliver'));
});

test('the P6 tutor roster returns to the original teacher after a temporary assignment expires', () => {
  const state = seed(), student = students.find(item => item.level === 'P6' && item.status === 'active' && item.tutor === tutors[0].id);
  assert.ok(student);
  state.regularSchedules = { [student.id]: clone(temporary) };
  assert.ok(getP6Students(state, tutors[1].id).some(item => item.id === student.id));
  assert.ok(!getP6Students(state, tutors[0].id).some(item => item.id === student.id));
  state.regularSchedules[student.id].endDate = '2026-09-29';
  assert.ok(getP6Students(state, tutors[0].id).some(item => item.id === student.id));
  assert.ok(!getP6Students(state, tutors[1].id).some(item => item.id === student.id));
});
