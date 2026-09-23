import test from 'node:test';
import assert from 'node:assert/strict';
import { TODAY, students, seed, seedCentreVolume, seedTeacherSchedules, seedBusyAfternoons, clone, moveBooking, requestAbsence, bookMakeup } from '../dist/model.js';
import { getRemainingStudentLessons, previewRegularScheduleChange, applyRegularScheduleChange } from '../dist/regular-schedule.js';

const dates = result => result.lessons.map(item => item.date);
function state() {
  const value = seed();
  value.bookings = []; value.makeups = [];
  return value;
}
function lesson(id, date, patch = {}) {
  return { id, studentId: 'oliver', date, start: 960, duration: 60, tutor: 'chan', status: 'scheduled', attendance: 'unmarked', ...patch };
}
function invoicePlan(value, lessonDates) {
  value.invoices.find(item => item.id === 'INV-1028').lessonPlan = { lessonDates, lessonCount: lessonDates.length, makeUpLessonCount: 0 };
}

test('seeded Iris Choi and a primary student get the full paid dates beyond the representative week, without mutations', () => {
  const value = seed(); seedCentreVolume(value); seedTeacherSchedules(value); seedBusyAfternoons(value);
  const iris = students.find(item => item.name === 'Iris Choi');
  const primary = students.find(item => item.id.startsWith('student-') && /^P/.test(item.level) && value.invoices.some(invoice => invoice.studentId === item.id && invoice.receiptId && invoice.period === 'Oct–Nov 2026'));
  const before = clone(value), remaining = getRemainingStudentLessons(value, iris.id);
  assert.deepEqual(dates(remaining), ['2026-10-03', '2026-10-10', '2026-10-17', '2026-10-24', '2026-10-31', '2026-11-07', '2026-11-14', '2026-11-21', '2026-11-28']);
  const recorded = value.bookings.find(item => item.studentId === iris.id && item.date === '2026-10-03');
  assert.equal(remaining.lessons[0].bookingId, recorded.id);
  assert.equal(remaining.lessons[0].start, recorded.start, 'actual fixture time wins over directory time');
  assert.equal(remaining.pendingMinutes, 0); assert.equal(remaining.hasPaidPeriod, true);
  const primaryRemaining = getRemainingStudentLessons(value, primary.id);
  assert.equal(primaryRemaining.lessons.length, 9);
  assert.ok(primaryRemaining.lessons.every(item => item.date >= '2026-10-01' && item.date <= '2026-11-30'));
  assert.deepEqual(value, before);
});

test('unpaid invoices and payment proofs without an issued receipt do not create paid dates', () => {
  const value = state();
  assert.deepEqual(getRemainingStudentLessons(value, 'chloe'), { lessons: [], pendingMinutes: 0, periodLabel: null, hasPaidPeriod: false });
  const invoice = value.invoices.find(item => item.studentId === 'chloe');
  invoice.proof = true;
  assert.equal(getRemainingStudentLessons(value, 'chloe').lessons.length, 0);
  invoice.receiptId = 'not-issued';
  assert.equal(getRemainingStudentLessons(value, 'chloe').hasPaidPeriod, false);
  value.receipts.push({ id: 'not-issued', invoiceId: invoice.id, studentId: 'chloe', issuedDate: '2026-10-01' });
  assert.equal(getRemainingStudentLessons(value, 'chloe', TODAY).hasPaidPeriod, false);
  assert.equal(getRemainingStudentLessons(value, 'chloe', '2026-10-01').lessons.length, 8);
});

test('an exhausted current period does not hide the next issued-receipt period', () => {
  const value = state();
  value.invoices.push({ id: 'INV-current', studentId: 'oliver', period: 'Aug–Sep 2026', receiptId: 'R-current', description: 'Regular programme · 8 lessons' });
  value.receipts.push({ id: 'R-current', invoiceId: 'INV-current', studentId: 'oliver', issuedDate: '2026-08-01' });
  value.bookings.push(lesson('current-final-attended', '2026-09-30', { attendance: 'present' }));
  const remaining = getRemainingStudentLessons(value, 'oliver');
  assert.equal(remaining.lessons.length, 8);
  assert.equal(remaining.lessons[0].date, '2026-10-07');
  assert.equal(remaining.lessons.at(-1).date, '2026-11-25');
  assert.equal(getRemainingStudentLessons(value, 'oliver', '2026-12-01').hasPaidPeriod, false);
});

test('past, attended, cancelled and absent originals are excluded, with unarranged leave shown only as minutes', () => {
  const value = state();
  invoicePlan(value, ['2026-10-07', '2026-10-14', '2026-10-21', '2026-10-28', '2026-11-04']);
  value.bookings.push(lesson('past', '2026-10-07'), lesson('attended', '2026-10-14', { attendance: 'present' }), lesson('cancelled', '2026-10-21', { status: 'cancelled' }), lesson('absent', '2026-10-28', { status: 'absent', attendance: 'absent', caseId: 'leave' }));
  value.makeups.push({ id: 'leave', studentId: 'oliver', sourceId: 'absent', minutes: 60, used: 0, period: 'Oct–Nov 2026', expiry: '2026-11-30' });
  const remaining = getRemainingStudentLessons(value, 'oliver', '2026-10-14');
  assert.deepEqual(dates(remaining), ['2026-11-04']);
  assert.equal(remaining.pendingMinutes, 60);
});

test('one-off moves, repeat moves and a missed replacement retain only the active destination or pending credit', () => {
  const value = state(); invoicePlan(value, ['2026-10-07']);
  value.bookings.push(lesson('original', '2026-10-07'));
  const first = moveBooking(value, 'original', { date: '2026-10-08', start: 840 });
  const second = moveBooking(value, first.id, { date: '2026-10-09', start: 840 });
  assert.deepEqual(dates(getRemainingStudentLessons(value, 'oliver')), ['2026-10-09']);
  const leave = requestAbsence(value, second.id, 'School event');
  let remaining = getRemainingStudentLessons(value, 'oliver');
  assert.deepEqual(remaining.lessons, []); assert.equal(remaining.pendingMinutes, 60);
  const [replacement] = bookMakeup(value, leave.makeupId, [{ date: '2026-10-12', start: 840, duration: 60, tutor: 'chan' }]);
  remaining = getRemainingStudentLessons(value, 'oliver');
  assert.deepEqual(dates(remaining), ['2026-10-12']); assert.equal(remaining.lessons[0].bookingId, replacement.id); assert.equal(remaining.pendingMinutes, 0);
  replacement.attendance = 'present';
  assert.deepEqual(getRemainingStudentLessons(value, 'oliver').lessons, []);
});

test('split replacement sessions each appear once alongside any still unarranged minutes', () => {
  const value = state(); invoicePlan(value, ['2026-10-07']); value.bookings.push(lesson('original', '2026-10-07'));
  const leave = requestAbsence(value, 'original', 'School event');
  bookMakeup(value, leave.makeupId, [{ date: '2026-10-08', start: 840, duration: 30, tutor: 'chan' }]);
  let remaining = getRemainingStudentLessons(value, 'oliver');
  assert.deepEqual(dates(remaining), ['2026-10-08']); assert.equal(remaining.pendingMinutes, 30);
  bookMakeup(value, leave.makeupId, [{ date: '2026-10-09', start: 840, duration: 30, tutor: 'chan' }]);
  remaining = getRemainingStudentLessons(value, 'oliver');
  assert.deepEqual(dates(remaining), ['2026-10-08', '2026-10-09']); assert.equal(remaining.pendingMinutes, 0);
});

test('a revised invoice plan excludes declined extra dates, including after a reload', () => {
  const value = state();
  const input = { studentId: 'oliver', invoiceId: 'INV-1028', effectiveDate: '2026-10-01', weekday: 4, start: 840, tutor: 'chan' };
  const preview = previewRegularScheduleChange(value, input);
  const result = applyRegularScheduleChange(value, input, { extra: 'decline', fingerprint: preview.fingerprint });
  const remaining = getRemainingStudentLessons(JSON.parse(JSON.stringify(value)), 'oliver');
  assert.equal(remaining.lessons.length, 8);
  assert.deepEqual(dates(remaining), result.revision.lessonDates.map(item => item.date));
  assert.equal(dates(remaining).includes('2026-11-26'), false);
});

test('schedule-shortfall credit appears as pending minutes then as its booked case without an original source booking', () => {
  const value = state();
  const input = { studentId: 'oliver', invoiceId: 'INV-1028', effectiveDate: '2026-10-07', weekday: 2, start: 960, tutor: 'wong' };
  const preview = previewRegularScheduleChange(value, input);
  const result = applyRegularScheduleChange(value, input, { shortfall: 'credit', fingerprint: preview.fingerprint });
  let remaining = getRemainingStudentLessons(value, 'oliver');
  assert.equal(remaining.lessons.length, 7); assert.equal(remaining.pendingMinutes, 60);
  const [replacement] = bookMakeup(value, result.makeup.id, [{ date: '2026-10-08', start: 840, duration: 60, tutor: 'chan' }]);
  remaining = getRemainingStudentLessons(value, 'oliver');
  assert.equal(remaining.lessons.length, 8); assert.equal(remaining.pendingMinutes, 0);
  assert.equal(remaining.lessons.filter(item => item.bookingId === replacement.id).length, 1);
});

test('unexpired carryover from an older paid period is included without generating any extra regular dates', () => {
  const value = state();
  invoicePlan(value, ['2026-10-07']); value.bookings.push(lesson('original', '2026-10-07'));
  const leave = requestAbsence(value, 'original', 'School event');
  const makeup = value.makeups.find(item => item.id === leave.makeupId); makeup.expiry = '2026-12-31';
  assert.equal(getRemainingStudentLessons(value, 'oliver', '2026-12-01').pendingMinutes, 60);
  assert.equal(getRemainingStudentLessons(value, 'oliver', '2027-01-01').pendingMinutes, 0);
  bookMakeup(value, makeup.id, [{ date: '2026-12-03', start: 840, duration: 60, tutor: 'chan' }]);
  const remaining = getRemainingStudentLessons(value, 'oliver', '2026-12-01');
  assert.deepEqual(dates(remaining), ['2026-12-03']); assert.equal(remaining.pendingMinutes, 0);
});

test('overlapping paid invoice plans do not duplicate the same recorded or planned appointment', () => {
  const value = state(); invoicePlan(value, ['2026-10-07', '2026-10-14']);
  value.bookings.push(lesson('shared', '2026-10-07'));
  value.invoices.push({ id: 'INV-overlap', studentId: 'oliver', period: 'Oct–Nov 2026', receiptId: 'R-overlap', lessonPlan: { lessonDates: ['2026-10-07', '2026-10-14'], lessonCount: 2 } });
  value.receipts.push({ id: 'R-overlap', invoiceId: 'INV-overlap', studentId: 'oliver', issuedDate: TODAY });
  const remaining = getRemainingStudentLessons(value, 'oliver');
  assert.deepEqual(dates(remaining), ['2026-10-07', '2026-10-14']);
  assert.equal(remaining.lessons[0].bookingId, 'shared');
});
