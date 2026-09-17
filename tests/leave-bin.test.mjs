import test from 'node:test';
import assert from 'node:assert/strict';
import { seed, clone, tutors, TODAY, activeBooking, parkBookingForMakeup, requestAbsence, bookMakeup, normalizeParentLeave } from '../dist/model.js';

function fixture(patch = {}) {
  const state = seed();
  const booking = { id: 'bin-lesson', studentId: 'chloe', date: '2026-10-07', start: 960, duration: 60, tutor: tutors[0].id, status: 'scheduled', attendance: 'unmarked', note: 'Keep this teaching note', ...patch };
  state.bookings = [booking];
  state.makeups = [];
  state.leaveRequests = [];
  return { state, booking };
}
function rejectsWithoutMutation(state, callback, message) {
  const before = clone(state);
  assert.throws(callback, message);
  assert.deepEqual(state, before);
}

for (const date of ['2026-09-28', TODAY, '2026-10-07']) {
  test(`staff can park an unattended lesson on ${date} without booking a replacement or changing billing`, () => {
    const { state, booking } = fixture({ date });
    const before = clone(state);
    const result = parkBookingForMakeup(state, booking.id, { actor: 'Koko Ko' });
    assert.equal(result.booking, booking);
    assert.equal(result.alreadyParked, false);
    assert.equal(booking.status, 'absent');
    assert.equal(booking.attendance, 'absent');
    assert.equal(activeBooking(booking), false);
    assert.equal(booking.note, before.bookings[0].note);
    assert.equal(state.bookings.length, 1);
    assert.equal(result.request.status, 'confirmed');
    assert.equal(result.request.kind, 'absence');
    assert.equal(result.request.bookingId, booking.id);
    assert.equal(result.request.makeupId, result.makeup.id);
    assert.equal(result.makeup.sourceId, booking.id);
    assert.equal(result.makeup.minutes, 60);
    assert.equal(result.makeup.used, 0);
    assert.equal(result.makeup.followUpStatus, 'pending');
    assert.deepEqual(result.makeup.preferredDates, []);
    assert.equal(result.makeup.expiry, date <= TODAY ? '2026-09-30' : '2026-11-30');
    assert.equal(state.audit[0].actor, 'Koko Ko');
    assert.match(state.audit[0].text, /Customer service to arrange/);
    for (const field of ['invoices', 'receipts', 'bankTransactions', 'staffLeave']) assert.deepEqual(state[field], before[field], field);
    const restored = JSON.parse(JSON.stringify(state));
    normalizeParentLeave(restored);
    assert.deepEqual(restored, state, 'confirmed staff leave survives the parent-leave normalizer');
  });
}

test('90-minute leave keeps all minutes and can be arranged later through the existing make-up flow', () => {
  const { state, booking } = fixture({ duration: 90, attendance: 'absent' });
  const { makeup } = parkBookingForMakeup(state, booking.id);
  assert.equal(makeup.minutes, 90);
  assert.equal(makeup.used, 0);
  assert.equal(state.audit[0].actor, 'Staff');
  const [replacement] = bookMakeup(state, makeup.id, [{ date: '2026-10-08', start: 960, duration: 90, tutor: booking.tutor }]);
  assert.equal(replacement.duration, 90);
  assert.equal(replacement.caseId, makeup.id);
  assert.equal(makeup.followUpStatus, 'arranged');
  assert.equal(booking.status, 'moved');
});

test('repeat drops and a parent-confirmed absence reuse the pending case without changing records', () => {
  for (const parentFirst of [false, true]) {
    const { state, booking } = fixture();
    if (parentFirst) requestAbsence(state, booking.id, 'School activity');
    else parkBookingForMakeup(state, booking.id);
    const before = clone(state), result = parkBookingForMakeup(state, booking.id, { actor: 'Teacher' });
    assert.equal(result.alreadyParked, true);
    assert.equal(result.makeup, state.makeups[0]);
    assert.equal(result.request, state.leaveRequests[0]);
    assert.deepEqual(state, before);
  }
});

test('an existing absent fixture with a pending case is not given a second entitlement', () => {
  const state = seed(), makeup = state.makeups.find(item => item.id === 'makeup-chloe');
  const before = clone(state);
  const result = parkBookingForMakeup(state, makeup.sourceId);
  assert.equal(result.alreadyParked, true);
  assert.equal(result.makeup, makeup);
  assert.deepEqual(state, before);
});

test('previously marked absence without a make-up case can be placed in the bin', () => {
  const { state, booking } = fixture({ status: 'absent', attendance: 'absent' });
  const result = parkBookingForMakeup(state, booking.id);
  assert.equal(result.alreadyParked, false);
  assert.equal(result.request.status, 'confirmed');
  assert.equal(state.makeups.length, 1);
});

test('attended, moved, cancelled and missing lessons reject atomically', () => {
  for (const patch of [{ attendance: 'present' }, { status: 'moved' }, { status: 'cancelled' }]) {
    const { state, booking } = fixture(patch);
    rejectsWithoutMutation(state, () => parkBookingForMakeup(state, booking.id), /attended|moved or cancelled/);
  }
  const { state } = fixture();
  rejectsWithoutMutation(state, () => parkBookingForMakeup(state, 'missing'), /Choose a lesson/);
});

test('past leave does not gain a new deadline, and exhausted quota is flagged for staff', () => {
  const { state, booking } = fixture({ date: '2026-09-28' });
  state.makeups = Array.from({ length: 3 }, (_, index) => ({ id: 'used-' + index, studentId: booking.studentId, period: 'Aug–Sep 2026', minutes: 60, used: 60 }));
  const { makeup } = parkBookingForMakeup(state, booking.id);
  assert.equal(makeup.period, 'Aug–Sep 2026');
  assert.equal(makeup.expiry, '2026-09-30');
  assert.equal(makeup.originalExpiry, '2026-09-30');
  assert.equal(makeup.policyReviewRequired, true);
  assert.match(makeup.policyNote, /Three reschedules/);
  rejectsWithoutMutation(state, () => bookMakeup(state, makeup.id, [{ date: '2026-10-01', start: 960, duration: 60, tutor: booking.tutor }]), /after the make-up deadline/);
});

test('parking a missed split replacement inherits its paid block and preserves its sibling', () => {
  const state = seed(), parent = state.makeups.find(item => item.id === 'makeup-chloe');
  const [replacement, sibling] = bookMakeup(state, parent.id, [
    { date: '2026-10-02', start: 1020, duration: 30, tutor: tutors[0].id },
    { date: '2026-10-07', start: 1020, duration: 30, tutor: tutors[0].id }
  ]);
  const beforeParent = clone(parent), beforeSibling = clone(sibling);
  const { makeup } = parkBookingForMakeup(state, replacement.id, { actor: 'Koko Ko' });
  assert.equal(makeup.parentCaseId, parent.id);
  assert.equal(makeup.sourceId, replacement.id);
  assert.equal(makeup.minutes, 30);
  assert.equal(makeup.used, 0);
  assert.equal(makeup.period, parent.period);
  assert.equal(makeup.expiry, parent.expiry);
  assert.equal(makeup.originalExpiry, parent.originalExpiry);
  assert.equal(makeup.expiryReason, parent.reason);
  assert.equal(replacement.caseId, parent.id);
  assert.deepEqual(parent, beforeParent);
  assert.deepEqual(sibling, beforeSibling);
  assert.equal(state.bookings.filter(item => item.caseId === parent.id && activeBooking(item)).reduce((total, item) => total + item.duration, 0) + makeup.minutes, 60);
});

test('a source-less schedule-shortfall replacement retains its original receipt period and deadline', () => {
  const { state } = fixture();
  state.bookings = [];
  const credit = { id: 'shortfall', kind: 'schedule-shortfall', studentId: 'chloe', sourceDate: '2026-09-23', minutes: 60, used: 0, period: 'Aug–Sep 2026', expiry: '2026-10-14', originalExpiry: '2026-09-30', reason: 'Approved extension' };
  state.makeups.push(credit);
  const [replacement] = bookMakeup(state, credit.id, [{ date: '2026-10-02', start: 1020, duration: 60, tutor: tutors[0].id }]);
  assert.equal(replacement.sourceId, undefined);
  const beforeCredit = clone(credit), { makeup } = parkBookingForMakeup(state, replacement.id);
  assert.equal(makeup.parentCaseId, credit.id);
  assert.equal(makeup.period, 'Aug–Sep 2026');
  assert.equal(makeup.expiry, '2026-10-14');
  assert.equal(makeup.originalExpiry, '2026-09-30');
  assert.equal(makeup.expiryReason, 'Approved extension');
  assert.equal(replacement.caseId, credit.id);
  assert.deepEqual(credit, beforeCredit);
  assert.equal(makeup.minutes, 60);
});

test('staff access does not loosen parent restrictions or parent audit attribution', () => {
  const { state, booking } = fixture({ date: '2026-09-28' });
  rejectsWithoutMutation(state, () => requestAbsence(state, booking.id), /upcoming, unattended/);
  parkBookingForMakeup(state, booking.id, { actor: 'Teacher Koko' });
  assert.equal(state.audit[0].actor, 'Teacher Koko');
  const next = fixture();
  requestAbsence(next.state, next.booking.id, 'Parent reason');
  assert.equal(next.state.audit[0].actor, 'Parent');
  rejectsWithoutMutation(next.state, () => requestAbsence(next.state, next.booking.id), /already been recorded/);
});

test('partially arranged pending leave keeps its remaining minutes on repeated drops', () => {
  const { state, booking } = fixture();
  const { makeup } = parkBookingForMakeup(state, booking.id);
  bookMakeup(state, makeup.id, [{ date: '2026-10-08', start: 960, duration: 30, tutor: booking.tutor }]);
  const before = clone(state), result = parkBookingForMakeup(state, booking.id);
  assert.equal(result.alreadyParked, true);
  assert.equal(result.makeup.used, 30);
  assert.equal(result.makeup.minutes, 60);
  assert.deepEqual(state, before);
});
