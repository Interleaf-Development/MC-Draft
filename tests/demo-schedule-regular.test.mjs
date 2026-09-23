import test from 'node:test';
import assert from 'node:assert/strict';

// The HH timetable is the original billing walkthrough's weekly fixture.
globalThis.location = { pathname: '/hh/' };
const model = await import('../dist/model.js');
const { normalizeDemoSchedule, isUntouchedDemoLesson, DEMO_SCHEDULE_SOURCE } = await import('../dist/demo-schedule.js');
const { previewRegularScheduleChange, applyRegularScheduleChange } = await import('../dist/regular-schedule.js');
const input = { studentId: 'oliver', invoiceId: 'INV-1028', effectiveDate: '2026-10-01', weekday: 4, start: 840, tutor: model.tutors[0].id };
function state() {
  const value = model.seed();
  model.seedTeacherSchedules(value); model.seedBusyAfternoons(value); normalizeDemoSchedule(value);
  return value;
}
const copies = value => value.bookings.filter(booking => booking.studentId === input.studentId && booking.source === DEMO_SCHEDULE_SOURCE && booking.date > '2026-11-30');
function apply(value, change = input) {
  const preview = previewRegularScheduleChange(value, change);
  return applyRegularScheduleChange(value, change, { extra: 'allow', shortfall: 'credit', fingerprint: preview.fingerprint });
}

test('extended sample months allow the paid-period change and follow its permanent rule without expanding the receipt', () => {
  const value = state(), before = structuredClone(value), preview = previewRegularScheduleChange(value, input);
  assert.deepEqual(value, before, 'preview must not mutate bookings or receipts');
  assert.deepEqual(preview.conflicts, []);
  assert.equal(preview.beforeCount, 8); assert.equal(preview.proposedCount, 9);
  assert.ok(preview.continuationIds.length > 5, 'original busy week repeats several sessions per pupil');
  assert.deepEqual(preview.continuationLessons.map(lesson => lesson.date), ['2026-12-03', '2026-12-10', '2026-12-17', '2026-12-24', '2026-12-31']);
  const result = apply(value);
  assert.equal(result.revision.lessonCount, 9);
  assert.ok(result.revision.lessonDates.every(lesson => lesson.date <= '2026-11-30'));
  assert.deepEqual(copies(value).map(booking => booking.date), preview.continuationLessons.map(lesson => lesson.date));
  assert.ok(copies(value).every(booking => booking.start === 840 && booking.tutor === input.tutor && isUntouchedDemoLesson(booking)));
  assert.equal(new Set(value.bookings.map(booking => booking.id)).size, value.bookings.length);
  assert.deepEqual(value.bankTransactions, before.bankTransactions);
  const reloaded = structuredClone(value); normalizeDemoSchedule(reloaded);
  assert.deepEqual(reloaded, value, 'reload cannot restore the old repeated timetable');
});

test('temporary changes leave the later repeated timetable untouched', () => {
  const value = state(), before = structuredClone(copies(value));
  const change = { ...input, endDate: '2026-10-21' }, preview = previewRegularScheduleChange(value, change);
  assert.deepEqual(preview.conflicts, []);
  assert.deepEqual(preview.continuationIds, []);
  assert.deepEqual(preview.continuationLessons, []);
  apply(value, change);
  assert.deepEqual(copies(value), before);
});

test('edited or externally linked future copies retain the future-period safeguard', () => {
  const edits = [
    (value, booking) => { booking.note = 'Parent requested this specific lesson'; },
    (value, booking) => { booking.start += 30; },
    (value, booking) => { booking.attendance = 'present'; },
    (value, booking) => { booking.status = 'absent'; booking.attendance = 'absent'; },
    (value, booking) => { booking.status = 'cancelled'; },
    (value, booking) => { value.checkInPasses = [{ bookingId: booking.id }]; },
    (value, booking) => { value.savedHistory = [{ createdBookingIds: [booking.id] }]; },
    (value, booking) => { value.bookings.push({ id: 'linked-makeup', studentId: booking.studentId, sourceId: booking.id, status: 'cancelled', date: '2026-11-15', start: 840, duration: 60, tutor: booking.tutor }); }
  ];
  const baseline = state();
  for (const edit of edits) {
    const value = structuredClone(baseline); edit(value, copies(value)[0]);
    const before = structuredClone(value), preview = previewRegularScheduleChange(value, input);
    assert.ok(preview.conflicts.some(item => item.type === 'future-period'), edit.toString());
    assert.throws(() => applyRegularScheduleChange(value, input, { extra: 'allow', fingerprint: preview.fingerprint }), /future paid period/);
    assert.deepEqual(value, before);
  }
});

test('actual future paid periods and manually created future lessons still block a permanent change', () => {
  const baseline = state();
  for (const kind of ['paid', 'manual']) {
    const value = structuredClone(baseline);
    if (kind === 'paid') {
      value.invoices.push({ id: 'future-invoice', studentId: input.studentId, period: 'Dec–Jan 2026/2027', receiptId: 'future-receipt' });
      value.receipts.push({ id: 'future-receipt', invoiceId: 'future-invoice', studentId: input.studentId });
    } else value.bookings.push({ id: 'manual-december', studentId: input.studentId, date: '2026-12-12', start: 840, duration: 60, tutor: input.tutor, status: 'scheduled', attendance: 'unmarked', note: '' });
    const before = structuredClone(value), preview = previewRegularScheduleChange(value, input);
    assert.ok(preview.conflicts.some(item => item.type === 'future-period'));
    assert.throws(() => applyRegularScheduleChange(value, input, { extra: 'allow', fingerprint: preview.fingerprint }), /future paid period/);
    assert.deepEqual(value, before);
  }
});

test('a collision in the continued demo months leaves the paid receipt and entire timetable unchanged', () => {
  const value = state();
  for (let i = 0; i < 6; i++) value.bookings.push({ id: 'dec-full-' + i, studentId: 'other-' + i, date: '2026-12-03', start: input.start, duration: 60, tutor: input.tutor, status: 'scheduled' });
  const before = structuredClone(value), preview = previewRegularScheduleChange(value, input);
  assert.ok(preview.conflicts.some(item => item.type === 'schedule' && item.date === '2026-12-03'));
  assert.throws(() => applyRegularScheduleChange(value, input, { extra: 'allow', fingerprint: preview.fingerprint }), /six/);
  assert.deepEqual(value, before);
});

test('a second permanent edit can replace the untouched continuation again', () => {
  const value = state(); apply(value);
  const change = { ...input, start: 900 }, preview = previewRegularScheduleChange(value, change);
  assert.deepEqual(preview.conflicts, []);
  apply(value, change);
  assert.ok(copies(value).every(booking => booking.start === 900 && isUntouchedDemoLesson(booking)));
  assert.equal(copies(value).length, 5);
});
