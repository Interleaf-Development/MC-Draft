import test from 'node:test';
import assert from 'node:assert/strict';
import { seed, seedTeacherSchedules, seedBusyAfternoons, clone, activeBooking } from '../dist/model.js';
import { getRegularSchedule, getRemainingStudentLessons, previewRegularScheduleChange, applyRegularScheduleChange } from '../dist/regular-schedule.js';

const input = { studentId: 'oliver', invoiceId: 'INV-1028', effectiveDate: '2026-10-07', endDate: '2026-10-27', weekday: 4, start: 840, tutor: 'chan' };
function state() { const value = seed(); seedTeacherSchedules(value); seedBusyAfternoons(value); return value; }
function apply(value, change = input, decisions = {}) {
  const preview = previewRegularScheduleChange(value, change);
  return applyRegularScheduleChange(value, change, { extra: 'allow', shortfall: 'credit', ...decisions, fingerprint: preview.fingerprint });
}
const ruleFields = rule => ({ weekday: rule.weekday, start: rule.start, duration: rule.duration, tutor: rule.tutor });
const originalRule = { weekday: 3, start: 960, duration: 60, tutor: 'chan' };
const dated = lessons => lessons.map(lesson => [lesson.date, lesson.start, lesson.tutor]);
const regularBookings = value => value.bookings.filter(booking => booking.studentId === 'oliver' && booking.invoiceId === 'INV-1028' && activeBooking(booking) && !booking.sourceId && !booking.caseId);

test('a three-week change preserves original paid dates and restores weekday, time and teacher after reload', () => {
  const value = state(), before = clone(value), change = { ...input, weekday: 2, start: 900, tutor: 'wong' };
  const preview = previewRegularScheduleChange(value, change);
  assert.deepEqual(value, before);
  assert.equal(preview.temporary, true); assert.equal(preview.delta, 0);
  assert.deepEqual(dated(preview.proposedLessons), [
    ['2026-10-13', 900, 'wong'], ['2026-10-20', 900, 'wong'], ['2026-10-27', 900, 'wong'],
    ['2026-10-28', 960, 'chan'], ['2026-11-04', 960, 'chan'], ['2026-11-11', 960, 'chan'], ['2026-11-18', 960, 'chan'], ['2026-11-25', 960, 'chan']
  ]);
  assert.equal(preview.resumeDate, '2026-10-28'); assert.deepEqual(ruleFields(preview.resumeRule), originalRule);
  const result = apply(value, change), reloaded = JSON.parse(JSON.stringify(value));
  seedTeacherSchedules(reloaded); seedBusyAfternoons(reloaded);
  assert.equal(regularBookings(reloaded).length, 8);
  assert.deepEqual(ruleFields(getRegularSchedule(reloaded, 'oliver', '2026-10-06')), originalRule);
  assert.deepEqual(ruleFields(getRegularSchedule(reloaded, 'oliver', '2026-10-27')), { weekday: 2, start: 900, duration: 60, tutor: 'wong' });
  assert.deepEqual(ruleFields(getRegularSchedule(reloaded, 'oliver', '2026-10-28')), originalRule);
  assert.equal(result.revision.endDate, change.endDate); assert.equal(result.change.endDate, change.endDate);
  assert.equal(result.receipt.amount, before.receipts.find(item => item.id === result.receipt.id).amount);
  assert.equal(result.revision.receiptDate, result.receipt.issuedDate);
  assert.deepEqual(value.bankTransactions, before.bankTransactions);
  for (const booking of before.bookings.filter(item => item.studentId === 'oliver' && item.date < change.effectiveDate)) assert.deepEqual(value.bookings.find(item => item.id === booking.id), booking);
});

test('inclusive final date and weekday boundary use whole-period lesson totals', () => {
  const value = state(), inclusive = previewRegularScheduleChange(value, { ...input, endDate: '2026-10-22' });
  assert.ok(inclusive.proposedLessons.some(lesson => lesson.date === '2026-10-22' && lesson.start === 840));
  assert.equal(inclusive.proposedTotalCount, 8);
  const shortfall = { ...input, weekday: 2, tutor: 'wong', endDate: '2026-10-12' };
  const preview = previewRegularScheduleChange(value, shortfall);
  assert.equal(preview.beforeTotalCount, 8); assert.equal(preview.proposedTotalCount, 7); assert.equal(preview.delta, -1);
  const result = apply(value, shortfall);
  assert.equal(result.revision.lessonDates.length, 7); assert.equal(result.revision.lessonCount, 8); assert.equal(result.makeup.minutes, 60);
  assert.equal(result.makeup.countsTowardRescheduleLimit, false);
  assert.ok(result.revision.lessonDates.some(lesson => lesson.date === '2026-10-14' && lesson.start === 960));
  assert.equal(getRemainingStudentLessons(value, 'oliver', '2026-10-07').pendingMinutes, 60);
});

test('declined surplus comes from the temporary range and never removes an original restored lesson', () => {
  const value = state(), change = { ...input, effectiveDate: '2026-10-01', endDate: '2026-10-22' };
  const preview = previewRegularScheduleChange(value, change);
  assert.equal(preview.delta, 1); assert.deepEqual(preview.excludedDateCandidates.map(lesson => lesson.date), ['2026-10-22']);
  const result = apply(value, change, { extra: 'decline' });
  assert.deepEqual(result.excludedDates, ['2026-10-22']); assert.equal(result.revision.lessonCount, 8);
  const preserved = preview.beforeLessons.filter(lesson => lesson.date > change.endDate);
  assert.deepEqual(dated(result.revision.lessonDates.filter(lesson => lesson.date > change.endDate)), dated(preserved));
  assert.ok(result.revision.lessonDates.some(lesson => lesson.date === '2026-11-25'));
  assert.deepEqual(dated(getRemainingStudentLessons(value, 'oliver', '2026-10-23').lessons), dated(preserved));
});

test('a one-day range can add and decline a lesson without touching any existing paid date', () => {
  const value = state(), change = { ...input, effectiveDate: '2026-10-01', endDate: '2026-10-01' };
  const preview = previewRegularScheduleChange(value, change);
  assert.equal(preview.delta, 1); assert.equal(preview.resumeDate, '2026-10-07');
  const result = apply(value, change, { extra: 'decline' });
  assert.deepEqual(dated(result.revision.lessonDates), dated(preview.beforeLessons));
  assert.deepEqual(result.excludedDates, ['2026-10-01']);
});

test('final date validation is atomic and clearing the final date preserves the permanent API', () => {
  const value = state(), before = clone(value);
  for (const endDate of ['2026-10-06', '2026-11-31', '2026-12-01', 'invalid', false]) {
    assert.throws(() => previewRegularScheduleChange(value, { ...input, endDate }), /final date/);
    assert.deepEqual(value, before);
  }
  const { endDate, ...permanent } = input;
  const preview = previewRegularScheduleChange(value, permanent);
  assert.equal(preview.temporary, false); assert.equal(preview.resumeDate, null);
  for (const empty of ['', null, undefined]) assert.deepEqual(previewRegularScheduleChange(value, { ...input, endDate: empty }), preview);
  apply(value, { ...input, endDate: '' });
  assert.equal(getRegularSchedule(value, 'oliver', '2026-12-02').weekday, 4);
  assert.equal(value.regularSchedules.oliver.endDate, undefined);
});

test('temporary conflicts and stale dates commit nothing; a declined-only conflict may be excluded', () => {
  const value = state(); value.staffLeave.push({ id: 'temp-leave', staffId: 'chan', date: '2026-10-15', unit: 'PM', status: 'recorded' });
  let before = clone(value), preview = previewRegularScheduleChange(value, input);
  assert.ok(preview.conflicts.some(conflict => conflict.date === '2026-10-15'));
  assert.throws(() => applyRegularScheduleChange(value, input, { fingerprint: preview.fingerprint }), /on leave/);
  assert.deepEqual(value, before);
  value.staffLeave = []; preview = previewRegularScheduleChange(value, input); before = clone(value);
  assert.throws(() => applyRegularScheduleChange(value, { ...input, endDate: '2026-10-22' }, { fingerprint: preview.fingerprint }), /Preview the change again/);
  assert.deepEqual(value, before);
  const change = { ...input, effectiveDate: '2026-10-01', endDate: '2026-10-22' };
  for (let index = 0; index < 6; index++) value.bookings.push({ id: 'full-temp-' + index, studentId: 'other-' + index, date: '2026-10-22', start: 840, duration: 60, tutor: 'chan', status: 'scheduled' });
  preview = previewRegularScheduleChange(value, change);
  assert.ok(preview.conflicts.some(conflict => conflict.date === '2026-10-22' && /six/.test(conflict.reason)));
  const result = applyRegularScheduleChange(value, change, { extra: 'decline', fingerprint: preview.fingerprint });
  assert.deepEqual(result.excludedDates, ['2026-10-22']);
});

test('attendance, one-off leave and makeup chains retain their exact records', () => {
  const value = state();
  value.bookings.push({ id: 'temp-present', studentId: 'oliver', date: '2026-10-07', start: 960, duration: 60, tutor: 'chan', status: 'scheduled', attendance: 'present' });
  value.bookings.push({ id: 'temp-absent', studentId: 'oliver', date: '2026-10-14', start: 960, duration: 60, tutor: 'chan', status: 'absent', attendance: 'absent', caseId: 'temp-case' });
  value.makeups.push({ id: 'temp-case', studentId: 'oliver', sourceId: 'temp-absent', minutes: 60, used: 60, period: 'Oct–Nov 2026', expiry: '2026-11-30' });
  value.bookings.push({ id: 'temp-replacement', studentId: 'oliver', date: '2026-10-20', start: 840, duration: 60, tutor: 'wong', status: 'scheduled', attendance: 'unmarked', caseId: 'temp-case', sourceId: 'temp-absent' });
  value.bookings.push({ id: 'original-after', studentId: 'oliver', date: '2026-10-28', start: 960, duration: 60, tutor: 'chan', status: 'scheduled', attendance: 'unmarked', note: 'Preserve this note' });
  const originals = clone(value.bookings.filter(item => item.id.startsWith('temp-') || item.id === 'original-after')), makeup = clone(value.makeups);
  const result = apply(value);
  for (const original of originals) assert.deepEqual(value.bookings.find(item => item.id === original.id), original);
  assert.deepEqual(value.makeups, makeup);
  assert.ok(!result.revision.lessonDates.some(lesson => ['2026-10-08', '2026-10-15'].includes(lesson.date)));
  const remaining = getRemainingStudentLessons(value, 'oliver', '2026-10-07');
  assert.equal(remaining.lessons.length, 7);
  assert.ok(remaining.lessons.some(lesson => lesson.bookingId === 'temp-replacement'));
  assert.ok(!remaining.lessons.some(lesson => ['temp-present', 'temp-absent'].includes(lesson.bookingId)));
});

test('nested temporary changes resume the prior temporary rule then the usual rule', () => {
  const value = state(); const first = apply(value), oldRevision = clone(first.revision), originalDocument = clone(first.receipt.originalDocument);
  const second = apply(value, { ...input, effectiveDate: '2026-10-14', endDate: '2026-10-20', weekday: 5, start: 900 });
  assert.equal(getRegularSchedule(value, 'oliver', '2026-10-13').weekday, 4);
  assert.equal(getRegularSchedule(value, 'oliver', '2026-10-16').weekday, 5);
  assert.equal(getRegularSchedule(value, 'oliver', '2026-10-22').weekday, 4);
  assert.deepEqual(ruleFields(getRegularSchedule(value, 'oliver', '2026-10-28')), originalRule);
  assert.deepEqual(second.receipt.revisions[0], oldRevision); assert.deepEqual(second.receipt.originalDocument, originalDocument);
  assert.equal(second.revision.id, 'R-1028-A2'); assert.equal(regularBookings(value).length, 8);
  assert.ok(second.revision.lessonDates.some(lesson => lesson.date === '2026-10-16' && lesson.start === 900));
  assert.ok(second.revision.lessonDates.some(lesson => lesson.date === '2026-10-22' && lesson.start === 840));
});

test('a temporary amendment never resurrects a previously declined lesson outside its range', () => {
  const value = state();
  apply(value, { ...input, effectiveDate: '2026-10-01', endDate: undefined }, { extra: 'decline' });
  const before = clone(value.invoices.find(item => item.id === input.invoiceId).lessonPlan.lessonDates);
  const result = apply(value, { ...input, weekday: 5 });
  assert.ok(!result.revision.lessonDates.some(lesson => lesson.date === '2026-11-26'));
  assert.deepEqual(dated(result.revision.lessonDates.filter(lesson => lesson.date > input.endDate)), dated(before.filter(lesson => lesson.date > input.endDate)));
  assert.equal(getRegularSchedule(value, 'oliver', '2026-10-29').weekday, 4);
});

test('a subsequent permanent request can retain the temporary weekday permanently', () => {
  const value = state(); apply(value);
  const change = { ...input, effectiveDate: '2026-10-14', endDate: '' };
  const preview = previewRegularScheduleChange(value, change);
  assert.equal(preview.unchanged, false);
  apply(value, change);
  assert.equal(getRegularSchedule(value, 'oliver').weekday, 4);
  assert.equal(getRegularSchedule(value, 'oliver', '2026-12-02').weekday, 4);
  assert.equal(value.regularSchedules.oliver.endDate, undefined);
});

test('later non-overlapping paid periods remain usual; overlapping periods block atomically', () => {
  const value = state();
  value.invoices.push({ id: 'INV-next', studentId: 'oliver', period: 'Dec–Jan 2026/2027', receiptId: 'R-next', description: 'Regular programme · 8 lessons' });
  value.receipts.push({ id: 'R-next', invoiceId: 'INV-next', studentId: 'oliver', amount: 2000, issuedDate: '2026-09-29' });
  assert.ok(!previewRegularScheduleChange(value, input).conflicts.some(conflict => conflict.type === 'future-period'));
  apply(value);
  const later = getRemainingStudentLessons(value, 'oliver', '2026-12-01');
  assert.equal(later.lessons[0].date, '2026-12-02'); assert.equal(later.lessons[0].start, 960);
  const overlapping = value.invoices.find(item => item.id === 'INV-next'); overlapping.periodStart = '2026-10-15'; overlapping.periodEnd = '2026-12-15';
  const change = { ...input, weekday: 5 }, before = clone(value), preview = previewRegularScheduleChange(value, change);
  assert.ok(preview.conflicts.some(conflict => conflict.type === 'future-period'));
  assert.throws(() => applyRegularScheduleChange(value, change, { fingerprint: preview.fingerprint }), /future paid period/);
  assert.deepEqual(value, before);
});
