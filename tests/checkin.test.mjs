import test from 'node:test';
import assert from 'node:assert/strict';
import { seed, TODAY, bookMakeup, moveBooking } from '../dist/model.js';
import { makeCheckInPass, qrSvg, redeemCheckIn } from '../dist/checkin.js';

test('a locally generated pass selects today and contains no student or parent identity', () => {
  const state = seed();
  const pass = makeCheckInPass(state, 'chloe');
  assert.equal(pass.booking.date, TODAY);
  assert.equal(pass.booking.studentId, 'chloe');
  assert.equal(pass.checkedIn, false);
  assert.match(pass.payload, /^mc-checkin:v1:[a-z0-9-]+$/i);
  assert.doesNotMatch(pass.payload, /chloe|chan|parent|phone/i);
  assert.equal(makeCheckInPass(state, 'chloe').payload, pass.payload);
  assert.equal(state.checkInPasses.length, 1);
});

test('redeeming a pass marks attendance and repeated scans do not duplicate the audit', () => {
  const state = seed();
  const pass = makeCheckInPass(state, 'chloe');
  const audits = state.audit.length;
  const first = redeemCheckIn(state, pass.payload);
  assert.equal(first.booking.attendance, 'present');
  assert.equal(first.alreadyPresent, false);
  assert.equal(state.audit.length, audits + 1);
  const second = redeemCheckIn(state, pass.payload);
  assert.equal(second.booking.id, first.booking.id);
  assert.equal(second.alreadyPresent, true);
  assert.equal(state.audit.length, audits + 1);
  assert.equal(makeCheckInPass(state, 'chloe').checkedIn, true);
});

test('a pass expires after its lesson day without changing attendance or audit', () => {
  const state = seed(), pass = makeCheckInPass(state, 'chloe');
  const before = structuredClone(state);
  assert.throws(() => redeemCheckIn(state, pass.payload, { date: '2026-10-01' }), /expired/);
  assert.deepEqual(state, before);
});

test('a future-date pass cannot check in on the demo day', () => {
  const state = seed();
  const pass = makeCheckInPass(state, 'chloe', { date: '2026-10-07' });
  const before = structuredClone(state);
  assert.throws(() => redeemCheckIn(state, pass.payload), /not valid for today/);
  assert.deepEqual(state, before);
});

test('a booking moved to a different date invalidates its previous pass', () => {
  const state = seed(), pass = makeCheckInPass(state, 'chloe');
  pass.booking.date = '2026-10-07';
  const before = structuredClone(state);
  assert.throws(() => redeemCheckIn(state, pass.payload), /lesson has changed/);
  assert.deepEqual(state, before);
});

for (const status of ['cancelled', 'absent', 'moved']) {
  test(`a ${status} booking cannot be redeemed or issued a new pass`, () => {
    const state = seed(), pass = makeCheckInPass(state, 'chloe');
    pass.booking.status = status;
    const before = structuredClone(state);
    assert.throws(() => redeemCheckIn(state, pass.payload), /no longer active/);
    assert.throws(() => makeCheckInPass(state, 'chloe'), /no scheduled lesson/);
    assert.deepEqual(state, before);
  });
}

test('a replacement booking gets its own eligible pass while its old pass is rejected', () => {
  const state = seed(), pass = makeCheckInPass(state, 'chloe');
  const replacement = moveBooking(state, pass.booking.id, { date: TODAY, start: 1020, tutor: 'chan' });
  assert.throws(() => redeemCheckIn(state, pass.payload), /no longer active/);
  const newPass = makeCheckInPass(state, 'chloe');
  assert.equal(newPass.booking.id, replacement.id);
  assert.notEqual(newPass.payload, pass.payload);
  assert.equal(redeemCheckIn(state, newPass.payload).booking.attendance, 'present');
});

test('a student with only a booked half-hour make-up today can check in', () => {
  const state = seed();
  const regular = state.bookings.find(b => b.studentId === 'chloe' && b.date === TODAY);
  regular.status = 'cancelled';
  const [makeup] = bookMakeup(state, 'makeup-chloe', [{ date: TODAY, start: 1020, duration: 30, tutor: 'chan' }]);
  const pass = makeCheckInPass(state, 'chloe');
  assert.equal(pass.booking.id, makeup.id);
  assert.equal(redeemCheckIn(state, pass.payload).booking.attendance, 'present');
});

test('a parent can choose a second same-day lesson without checking in the first', () => {
  const state = seed();
  const regular = state.bookings.find(b => b.studentId === 'chloe' && b.date === TODAY);
  const [extension] = bookMakeup(state, 'makeup-chloe', [{ date: TODAY, start: 1020, duration: 30, tutor: 'chan' }]);
  assert.equal(makeCheckInPass(state, 'chloe').booking.id, regular.id);
  const pass = makeCheckInPass(state, 'chloe', { bookingId: extension.id });
  assert.equal(pass.booking.id, extension.id);
  redeemCheckIn(state, pass.payload);
  assert.equal(extension.attendance, 'present');
  assert.equal(regular.attendance, 'unmarked');
  assert.equal(makeCheckInPass(state, 'chloe', { bookingId: extension.id }).payload, pass.payload);
});

test('an explicit booking must belong to the child and be active on the selected date', () => {
  const state = seed();
  const otherChild = state.bookings.find(b => b.studentId === 'ethan' && b.date === TODAY);
  const future = state.bookings.find(b => b.studentId === 'chloe' && b.date === '2026-10-07');
  const cancelled = state.bookings.find(b => b.studentId === 'chloe' && b.date === TODAY);
  cancelled.status = 'cancelled';
  const before = structuredClone(state);
  for (const bookingId of [otherChild.id, future.id, cancelled.id, 'missing-booking']) {
    assert.throws(() => makeCheckInPass(state, 'chloe', { bookingId }), /active lesson for this student today/);
  }
  assert.deepEqual(state, before);
});

test('no lesson, unknown tokens and malformed input fail without state changes', () => {
  const state = seed(), before = structuredClone(state);
  assert.throws(() => makeCheckInPass(state, 'mia'), /no scheduled lesson/);
  assert.throws(() => redeemCheckIn(state, 'mc-checkin:v1:0123456789abcdef'), /not issued/);
  assert.throws(() => redeemCheckIn(state, '<script>invalid</script>'), /not a valid/);
  assert.deepEqual(state, before);
});

test('QR output is an offline vector image with a quiet zone and accessible label', () => {
  const pass = makeCheckInPass(seed(), 'chloe');
  const svg = qrSvg(pass.payload);
  assert.match(svg, /^<svg /);
  assert.match(svg, /role="img"/);
  assert.match(svg, /Lesson check-in QR code/);
  assert.match(svg, /fill="white"/);
  assert.match(svg, /M20,20/);
  assert.match(svg, /fill="black"/);
  assert.doesNotMatch(svg, /<image|<script|https?:\/\/(?!www\.w3\.org)/);
  assert.throws(() => qrSvg('arbitrary input'), /not a valid/);
});
