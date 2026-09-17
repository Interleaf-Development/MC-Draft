import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { seed, clone, tutors, requestAbsence, setMakeupPreferences, normalizeParentLeave, bookMakeup, activeBooking, usedReschedules } from '../dist/model.js';

function fixture(duration = 60, request = true) {
  const state = seed(), tutor = tutors[0].id;
  state.bookings = [{ id: 'original-lesson', studentId: 'chloe', date: '2026-10-07', start: 960, duration, tutor, status: 'scheduled', attendance: 'unmarked', note: '' }];
  state.makeups = [];
  state.leaveRequests = [];
  const result = { state, source: state.bookings[0], slot: { date: '2026-10-08', start: 960, duration, tutor } };
  if (request) {
    result.request = requestAbsence(state, result.source.id, 'School activity');
    result.makeup = state.makeups.find(item => item.id === result.request.makeupId);
  }
  return result;
}
function rejectsWithoutMutation(state, callback, message) {
  const before = clone(state);
  assert.throws(callback, message);
  assert.deepEqual(state, before);
}
function legacyRequest(source, extra = {}) {
  return { id: 'old-leave', bookingId: source.id, studentId: source.studentId, reason: 'School activity', status: 'pending', ...extra };
}

test('parent leave is confirmed immediately, crosses out the source, and creates only an unbooked follow-up', () => {
  const { state, request, source, makeup } = fixture();
  assert.equal(request.status, 'confirmed');
  assert.equal(request.kind, 'absence');
  assert.equal(source.status, 'absent');
  assert.equal(source.attendance, 'absent');
  assert.equal(activeBooking(source), false);
  assert.equal(state.bookings.length, 1);
  assert.equal(state.makeups.length, 1);
  assert.equal(makeup.sourceId, source.id);
  assert.equal(source.caseId, makeup.id);
  assert.equal(makeup.used, 0);
  assert.equal(makeup.minutes, 60);
  assert.equal(makeup.followUpStatus, 'pending');
  assert.deepEqual(makeup.preferredDates, []);
  assert.equal(makeup.preferencesNote, '');
  assert.equal(makeup.expiry, '2026-11-30');
});

test('a repeated absence cannot create duplicate follow-ups or change confirmed leave', () => {
  const { state, source } = fixture();
  rejectsWithoutMutation(state, () => requestAbsence(state, source.id, 'Again'), /already been recorded/);
});

test('missing, inactive, past and attended lessons cannot receive new parent leave', () => {
  for (const patch of [{ status: 'moved' }, { status: 'absent' }, { status: 'cancelled' }, { date: '2026-09-29' }, { attendance: 'present' }]) {
    const { state, source } = fixture(60, false);
    Object.assign(source, patch);
    rejectsWithoutMutation(state, () => requestAbsence(state, source.id, ''), /cannot be changed|upcoming, unattended/);
  }
  const { state } = fixture(60, false);
  rejectsWithoutMutation(state, () => requestAbsence(state, 'missing', ''), /cannot be changed/);
});

test('preferences are dates and a note only; edits do not book or reserve a lesson', () => {
  const { state, makeup, source } = fixture(), before = clone(state), dates = ['2026-10-08', '2026-10-10'];
  assert.equal(setMakeupPreferences(state, makeup.id, dates, '  Please call after 6 pm.  '), makeup);
  assert.deepEqual(makeup.preferredDates, dates);
  assert.equal(makeup.preferencesNote, 'Please call after 6 pm.');
  dates.push('2026-10-12');
  assert.equal(makeup.preferredDates.length, 2, 'saved preferences do not retain the caller array');
  assert.deepEqual(state.bookings, before.bookings);
  assert.deepEqual(state.leaveRequests, before.leaveRequests);
  assert.equal(makeup.used, 0);
  assert.equal(makeup.followUpStatus, 'pending');
  assert.equal(source.status, 'absent');
  setMakeupPreferences(state, makeup.id, ['2026-10-11'], 'Updated');
  assert.deepEqual(makeup.preferredDates, ['2026-10-11']);
  setMakeupPreferences(state, makeup.id, [], '');
  assert.deepEqual(makeup.preferredDates, []);
  assert.equal(makeup.preferencesNote, '');
});

test('invalid, duplicate, past, too many, or slot-shaped preferences reject atomically', () => {
  const { state, makeup, slot } = fixture();
  const rejected = [
    [null, /up to three/],
    [['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'], /up to three/],
    [['2026-10-01', '2026-10-01'], /different preferred dates/],
    [['2026-09-29'], /today or a future/],
    [['2026-11-31'], /valid preferred dates/],
    [['2026-10-01T16:00:00'], /valid preferred dates/],
    [[slot], /valid preferred dates/]
  ];
  for (const [dates, error] of rejected) rejectsWithoutMutation(state, () => setMakeupPreferences(state, makeup.id, dates), error);
  rejectsWithoutMutation(state, () => setMakeupPreferences(state, makeup.id, [], {}), /valid preferences note/);
  rejectsWithoutMutation(state, () => setMakeupPreferences(state, 'missing', []), /not found/);
});

test('preferences never assert availability, including full sessions, tutor leave, or dates past expiry', () => {
  const { state, makeup, slot } = fixture();
  state.bookings.push(...Array.from({ length: 6 }, (_, index) => ({ ...slot, id: 'busy-' + index, studentId: 'other-' + index, status: 'scheduled' })));
  state.staffLeave.push({ id: 'staff-leave', staffId: slot.tutor, date: slot.date, unit: 'Full day', status: 'recorded' });
  const before = clone(state.bookings);
  setMakeupPreferences(state, makeup.id, ['2026-09-30', slot.date, '2026-12-01']);
  assert.deepEqual(state.bookings, before);
  assert.deepEqual(makeup.preferredDates, ['2026-09-30', '2026-10-08', '2026-12-01']);
  assert.equal(makeup.used, 0);
});

test('staff arrangement alone creates bookings and resolves the follow-up', () => {
  const { state, makeup, request, source, slot } = fixture();
  setMakeupPreferences(state, makeup.id, ['2026-10-10']);
  const [replacement] = bookMakeup(state, makeup.id, [slot]);
  assert.equal(request.status, 'confirmed', 'the absence status is independent of arranging a replacement');
  assert.equal(source.status, 'moved');
  assert.equal(makeup.used, 60);
  assert.equal(makeup.followUpStatus, 'arranged');
  assert.equal(replacement.sourceId, source.id);
  assert.equal(replacement.caseId, makeup.id);
  assert.equal(replacement.date, slot.date, 'staff can arrange a different date after discussion');
  rejectsWithoutMutation(state, () => setMakeupPreferences(state, makeup.id, []), /already been arranged/);
});

test('staff retain split make-ups and the follow-up remains pending until all minutes are arranged', () => {
  const { state, makeup, slot } = fixture();
  bookMakeup(state, makeup.id, [{ ...slot, duration: 30 }]);
  assert.equal(makeup.used, 30);
  assert.equal(makeup.followUpStatus, 'pending');
  bookMakeup(state, makeup.id, [{ ...slot, start: 1020, duration: 30 }]);
  assert.equal(makeup.used, 60);
  assert.equal(makeup.followUpStatus, 'arranged');
  assert.equal(state.makeups.length, 1);
});

test('90-minute leave creates a 90-minute follow-up without a parent time selection', () => {
  const { state, makeup, slot } = fixture(90);
  setMakeupPreferences(state, makeup.id, ['2026-10-08']);
  assert.equal(makeup.minutes, 90);
  assert.equal(makeup.used, 0);
  bookMakeup(state, makeup.id, [slot]);
  assert.equal(makeup.used, 90);
  assert.equal(makeup.followUpStatus, 'arranged');
});

test('staff booking still checks capacity and does not undo the confirmed absence on failure', () => {
  const { state, makeup, source, slot } = fixture();
  state.bookings.push(...Array.from({ length: 6 }, (_, index) => ({ ...slot, id: 'busy-' + index, studentId: 'other-' + index, status: 'scheduled' })));
  rejectsWithoutMutation(state, () => bookMakeup(state, makeup.id, [slot]), /six students/);
  assert.equal(source.status, 'absent');
  assert.equal(makeup.followUpStatus, 'pending');
});

test('exhausted reschedule quota never blocks leave; staff see a policy concern', () => {
  const { state, source, slot } = fixture(60, false);
  state.makeups = Array.from({ length: 3 }, (_, index) => ({ id: 'used-' + index, studentId: 'chloe', period: 'Oct–Nov 2026', minutes: 60, used: 60 }));
  const request = requestAbsence(state, source.id, ''), makeup = state.makeups.find(item => item.id === request.makeupId);
  assert.equal(request.status, 'confirmed');
  assert.equal(source.status, 'absent');
  assert.equal(makeup.policyReviewRequired, true);
  assert.match(makeup.policyNote, /Three reschedules/);
  assert.equal(usedReschedules(state, 'chloe', 'Oct–Nov 2026'), 4);
  setMakeupPreferences(state, makeup.id, ['2026-10-08']);
  bookMakeup(state, makeup.id, [slot]);
  assert.equal(makeup.followUpStatus, 'arranged', 'the staff decision does not require a separate leave approval');
});

test('normalization confirms old pending leave and converts its chosen slots to nonbinding dates', () => {
  const { state, source, slot } = fixture(60, false);
  state.leaveRequests.push(legacyRequest(source, { replacementSlots: [slot, { ...slot, start: 1020 }, { ...slot, date: '2026-10-10' }], preferredDates: ['2026-10-08'], replacementSource: { ...source } }));
  const beforeCount = state.bookings.length;
  assert.equal(normalizeParentLeave(state), state);
  const request = state.leaveRequests[0], makeup = state.makeups[0];
  assert.equal(request.status, 'confirmed');
  assert.equal(request.makeupId, makeup.id);
  assert.equal(source.status, 'absent');
  assert.equal(makeup.used, 0);
  assert.deepEqual(makeup.preferredDates, ['2026-10-08', '2026-10-10']);
  assert.equal(request.replacementSlots, undefined);
  assert.equal(request.replacementSource, undefined);
  assert.equal(state.bookings.length, beforeCount);
  const normalized = clone(state);
  normalizeParentLeave(state);
  assert.deepEqual(state, normalized, 'migration is idempotent');
  setMakeupPreferences(state, makeup.id, []);
  normalizeParentLeave(state);
  assert.deepEqual(makeup.preferredDates, [], 'consumed legacy preferences cannot reappear after the parent clears them');
});

test('legacy pending make-up slot requests become preferences without booking or reserving capacity', () => {
  const { state, makeup, slot } = fixture();
  state.leaveRequests.push({ id: 'old-makeup-request', kind: 'makeup', status: 'pending', makeupId: makeup.id, studentId: makeup.studentId, slots: [{ ...slot, date: '2026-09-01' }, slot], note: 'Call me' });
  const before = clone(state.bookings);
  normalizeParentLeave(state);
  const request = state.leaveRequests[1];
  assert.equal(request.status, 'preferences-recorded');
  assert.deepEqual(makeup.preferredDates, ['2026-09-01', '2026-10-08'], 'past legacy preferences remain descriptive');
  assert.equal(makeup.preferencesNote, 'Call me');
  assert.equal(request.slots, undefined);
  assert.equal(makeup.used, 0);
  assert.deepEqual(state.bookings, before);
  const normalized = clone(state);
  normalizeParentLeave(state);
  assert.deepEqual(state, normalized);
});

test('normalization preserves confirmed historical replacements and does not book old requests twice', () => {
  const { state, request, makeup, source, slot } = fixture();
  bookMakeup(state, makeup.id, [slot]);
  request.status = 'approved';
  request.replacementSlots = [slot];
  state.leaveRequests.push({ id: 'stale-makeup', kind: 'makeup', makeupId: makeup.id, studentId: makeup.studentId, status: 'pending', slots: [slot] });
  const before = clone(state.bookings), used = makeup.used;
  normalizeParentLeave(state);
  assert.deepEqual(state.bookings, before);
  assert.equal(source.status, 'moved');
  assert.equal(makeup.used, used);
  assert.equal(makeup.followUpStatus, 'arranged');
  assert.equal(request.status, 'confirmed');
  assert.equal(state.leaveRequests[1].status, 'arranged');
  assert.deepEqual(makeup.preferredDates, []);
});

test('normalization does not overwrite an attended, cancelled, missing or stale original booking', () => {
  for (const patch of [{ attendance: 'present' }, { status: 'cancelled' }, { status: 'moved' }, { studentId: 'ethan' }, { date: '2026-10-09' }, null]) {
    const { state, source, slot } = fixture(60, false);
    state.leaveRequests.push(legacyRequest(source, { replacementSlots: [slot], replacementSource: { ...source } }));
    if (patch) Object.assign(source, patch);
    else state.bookings = [];
    const before = clone(state.bookings);
    normalizeParentLeave(state);
    assert.equal(state.leaveRequests[0].status, 'cancelled');
    assert.deepEqual(state.bookings, before);
    assert.equal(state.makeups.length, 0);
  }
});

test('normalization of another leave on a replacement does not reuse the fully used original make-up', () => {
  const { state, makeup, slot } = fixture();
  const [replacement] = bookMakeup(state, makeup.id, [slot]);
  state.leaveRequests.push(legacyRequest(replacement, { id: 'second-leave' }));
  normalizeParentLeave(state);
  const second = state.makeups.find(item => item.sourceId === replacement.id);
  assert.ok(second);
  assert.equal(second.used, 0);
  assert.equal(makeup.used, 60);
  assert.notEqual(second.id, makeup.id);
  assert.equal(replacement.status, 'absent');
});

test('saved confirmed leave and optional preferences survive reload without duplicate follow-ups', () => {
  const { state, makeup } = fixture();
  setMakeupPreferences(state, makeup.id, ['2026-10-08'], 'Please call me');
  const restored = JSON.parse(JSON.stringify(state));
  normalizeParentLeave(restored);
  assert.deepEqual(restored, state);
  assert.equal(restored.makeups.length, 1);
  assert.equal(restored.bookings.length, 1);
});

test('both branches use immediate leave and date preferences with their own teacher IDs', () => {
  const modelUrl = new URL('../dist/model.js', import.meta.url).href;
  for (const [path, tutor, director] of [['/parent/', 'chan', 'Koko Ko'], ['/hh/parent/', 'ricco', 'Rico']]) {
    const script = `
      import assert from 'node:assert/strict';
      globalThis.location = { pathname: ${JSON.stringify(path)} };
      const model = await import(${JSON.stringify(modelUrl)});
      const state = model.seed();
      const source = state.bookings.find(item => item.studentId === 'chloe' && item.date === '2026-10-07');
      const count = state.bookings.length;
      const request = model.requestAbsence(state, source.id, '學校活動');
      model.setMakeupPreferences(state, request.makeupId, ['2026-10-08'], '請致電聯絡');
      assert.equal(request.status, 'confirmed');
      assert.equal(source.status, 'absent');
      assert.equal(state.bookings.length, count);
      const makeup = state.makeups.find(item => item.id === request.makeupId);
      assert.equal(makeup.used, 0);
      assert.deepEqual(makeup.preferredDates, ['2026-10-08']);
      const [replacement] = model.bookMakeup(state, makeup.id, [{ date: '2026-10-08', start: 960, duration: 60, tutor: ${JSON.stringify(tutor)} }]);
      assert.equal(replacement.tutor, ${JSON.stringify(tutor)});
      assert.equal(makeup.followUpStatus, 'arranged');
      assert.equal(model.centre.manager, ${JSON.stringify(director)});
      process.stdout.write('ok');
    `;
    assert.equal(execFileSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' }), 'ok');
  }
});

test('leave on an extended replacement inherits its original billing block and deadline', () => {
  const state = seed(), parent = state.makeups.find(item => item.id === 'makeup-chloe');
  const [replacement] = bookMakeup(state, parent.id, [{ date: '2026-10-02', start: 1020, duration: 60, tutor: tutors[0].id }]);
  const originalSourceId = replacement.sourceId, request = requestAbsence(state, replacement.id, 'School event');
  const child = state.makeups.find(item => item.id === request.makeupId);
  assert.equal(child.parentCaseId, parent.id);
  assert.equal(child.sourceId, replacement.id);
  assert.equal(child.period, 'Aug–Sep 2026');
  assert.equal(child.expiry, '2026-10-14');
  assert.equal(child.originalExpiry, '2026-09-30');
  assert.equal(child.expiryReason, parent.reason);
  assert.equal(replacement.caseId, parent.id, 'missed replacement retains its original case membership');
  assert.equal(replacement.sourceId, originalSourceId);
  assert.equal(replacement.status, 'absent');
  assert.equal(parent.used, 60, 'parent allocation remains accounted for by its linked booking history');
  assert.equal(child.used, 0);
  assert.equal(child.minutes, 60);
  rejectsWithoutMutation(state, () => bookMakeup(state, child.id, [{ date: '2026-10-16', start: 1020, duration: 60, tutor: tutors[0].id }]), /deadline/);
  const [rescheduled] = bookMakeup(state, child.id, [{ date: '2026-10-09', start: 1020, duration: 60, tutor: tutors[0].id }]);
  assert.equal(rescheduled.sourceId, replacement.id);
  assert.equal(rescheduled.caseId, child.id);
  assert.equal(state.bookings.filter(item => [parent.id, child.id].includes(item.caseId) && activeBooking(item)).reduce((total, item) => total + item.duration, 0), 60);
  assert.equal(usedReschedules(state, 'chloe', 'Oct–Nov 2026'), 0, 'an October replacement does not create entitlement in a new cycle');
});

test('a missed split replacement only creates its own minutes and preserves the sibling booking', () => {
  const state = seed(), parent = state.makeups.find(item => item.id === 'makeup-chloe');
  const [replacement, sibling] = bookMakeup(state, parent.id, [
    { date: '2026-10-02', start: 1020, duration: 30, tutor: tutors[0].id },
    { date: '2026-10-07', start: 1020, duration: 30, tutor: tutors[0].id }
  ]);
  const beforeSibling = clone(sibling), request = requestAbsence(state, replacement.id, 'School event');
  const child = state.makeups.find(item => item.id === request.makeupId);
  assert.equal(child.parentCaseId, parent.id);
  assert.equal(child.minutes, 30);
  assert.equal(child.used, 0);
  assert.deepEqual(sibling, beforeSibling);
  const [booked] = bookMakeup(state, child.id, [{ date: '2026-10-09', start: 1020, duration: 30, tutor: tutors[0].id }]);
  const nextRequest = requestAbsence(state, booked.id, 'Another event');
  const grandchild = state.makeups.find(item => item.id === nextRequest.makeupId);
  assert.equal(grandchild.parentCaseId, child.id);
  assert.equal(grandchild.period, parent.period);
  assert.equal(grandchild.expiry, parent.expiry);
  assert.equal(grandchild.originalExpiry, parent.originalExpiry);
  assert.equal(grandchild.minutes, 30);
  assert.equal(booked.caseId, child.id);
  assert.equal(state.bookings.filter(item => [parent.id, child.id, grandchild.id].includes(item.caseId) && activeBooking(item)).reduce((total, item) => total + item.duration, 0) + grandchild.minutes - grandchild.used, 60, 'active and unarranged minutes never exceed the original entitlement');
});

test('normalization repairs unbooked legacy replacement leave without rewriting booked replacements', () => {
  const state = seed(), parent = state.makeups.find(item => item.id === 'makeup-chloe');
  const [replacement] = bookMakeup(state, parent.id, [{ date: '2026-10-02', start: 1020, duration: 60, tutor: tutors[0].id }]);
  const request = requestAbsence(state, replacement.id, ''), child = state.makeups.find(item => item.id === request.makeupId);
  delete child.parentCaseId;
  delete child.expiryReason;
  Object.assign(child, { period: 'Oct–Nov 2026', expiry: '2026-11-30', originalExpiry: '2026-11-30' });
  replacement.caseId = child.id;
  normalizeParentLeave(state);
  assert.equal(child.parentCaseId, parent.id);
  assert.equal(child.period, parent.period);
  assert.equal(child.expiry, parent.expiry);
  assert.equal(child.originalExpiry, parent.originalExpiry);
  assert.equal(replacement.caseId, parent.id);
  const normalized = clone(state);
  normalizeParentLeave(state);
  assert.deepEqual(state, normalized);
});
