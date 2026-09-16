import test from 'node:test';
import assert from 'node:assert/strict';
import { centre, seed, seedTeacherSchedules, clone, activeStaffLeave, staffLeaveUnits, normalizeStaffLeave, setStaffLeave, cancelStaffLeave, staffBalance, validateSlot } from '../dist/model.js';

const setup = () => seedTeacherSchedules(seed());
const request = overrides => ({ staffId: 'chan', date: '2026-10-02', unit: 'Full day', reason: 'Personal appointment', ...overrides });
const slot = overrides => ({ studentId: 'leave-check', tutor: 'chan', date: '2026-10-02', start: 540, duration: 60, ...overrides });

test('Koko directly records full and half days with immediate deduction and an audit, leaving lessons intact', () => {
  const state = setup(), bookings = clone(state.bookings), before = staffBalance(state, 'chan').available;
  assert.deepEqual(state.staffLeave, []);
  const full = setStaffLeave(state, request());
  const half = setStaffLeave(state, request({ date: '2026-10-01', unit: 'PM', reason: '  Afternoon appointment  ' }));
  assert.equal(full.status, 'recorded');
  assert.equal(full.days, 1);
  assert.equal(full.recordedBy, centre.manager);
  assert.equal(half.days, 0.5);
  assert.equal(half.reason, 'Afternoon appointment');
  assert.equal(staffBalance(state, 'chan').available, before - 1.5);
  assert.equal(staffBalance(state, 'chan').pending, 0);
  assert.equal(state.audit[0].actor, centre.manager);
  assert.match(state.audit[0].text, /Recorded annual leave/);
  assert.deepEqual(state.bookings, bookings);
  const mingBefore = staffBalance(state, 'wong').available;
  setStaffLeave(state, request({ staffId: 'wong', date: '2026-10-04', unit: 'PM' }));
  assert.equal(staffBalance(state, 'wong').available, mingBefore - 0.5);
  assert.equal(staffBalance(state, 'chan').available, before - 1.5);
});

test('working-unit options follow full days, own days off and AM/PM rosters', () => {
  const state = setup();
  assert.deepEqual(staffLeaveUnits(state, 'chan', '2026-10-02'), ['Full day', 'AM', 'PM']);
  assert.deepEqual(staffLeaveUnits(state, 'chan', '2026-10-01'), ['PM']);
  assert.deepEqual(staffLeaveUnits(state, 'chan', '2026-10-04'), ['AM']);
  assert.deepEqual(staffLeaveUnits(state, 'chan', '2026-10-06'), []);
  assert.deepEqual(staffLeaveUnits(state, 'wong', '2026-10-01'), ['AM']);
  assert.deepEqual(staffLeaveUnits(state, 'unknown', '2026-10-02'), []);
  assert.deepEqual(staffLeaveUnits(state, 'chan', '2026-02-30'), []);
  assert.deepEqual(staffLeaveUnits(state, 'chan', '2027-01-01'), []);
});

test('invalid dates, unknown staff, nonworking units and insufficient balance fail atomically', () => {
  const state = setup();
  for (const input of [
    { date: '2026-02-30' }, { date: '2026-13-01' }, { date: '2025-10-02' }, { date: '2027-10-02' },
    { date: '' }, { staffId: 'unknown' }, { date: '2026-10-06' }, { date: '2026-10-01', unit: 'Full day' },
    { date: '2026-10-01', unit: 'AM' }, { unit: 'Evening' }, { reason: {} }
  ]) {
    const before = clone(state);
    assert.throws(() => setStaffLeave(state, request(input)));
    assert.deepEqual(state, before);
  }
  state.staff.find(staff => staff.id === 'chan').taken = 15;
  const before = clone(state);
  assert.throws(() => setStaffLeave(state, request()), /available balance/);
  assert.deepEqual(state, before);
});

test('duplicate and full/half overlap is rejected while separate AM and PM records are allowed', () => {
  const state = setup();
  setStaffLeave(state, request({ unit: 'AM' }));
  for (const unit of ['AM', 'Full day']) {
    const before = clone(state);
    assert.throws(() => setStaffLeave(state, request({ unit })), /already recorded/);
    assert.deepEqual(state, before);
  }
  setStaffLeave(state, request({ unit: 'PM' }));
  assert.equal(state.staffLeave.length, 2);
  assert.equal(staffBalance(state, 'chan').available, 10);
  const another = setup();
  setStaffLeave(another, request());
  assert.throws(() => setStaffLeave(another, request({ unit: 'PM' })), /already recorded/);
});

test('recorded leave blocks only its interval; cancellation restores balance and availability', () => {
  const state = setup(), before = staffBalance(state, 'chan').available;
  const leave = setStaffLeave(state, request({ unit: 'AM' }));
  assert.match(validateSlot(state, slot()), /tutor is on leave/);
  assert.match(validateSlot(state, slot({ start: 810 })), /tutor is on leave/);
  assert.equal(validateSlot(state, slot({ start: 840 })), null);
  assert.equal(activeStaffLeave(leave), true);
  assert.equal(cancelStaffLeave(state, leave.id), leave);
  assert.equal(leave.status, 'cancelled');
  assert.equal(leave.cancelledBy, centre.manager);
  assert.equal(activeStaffLeave(leave), false);
  assert.equal(staffBalance(state, 'chan').available, before);
  assert.equal(validateSlot(state, slot()), null);
  const snapshot = clone(state);
  assert.throws(() => cancelStaffLeave(state, leave.id), /not an active record/);
  assert.throws(() => cancelStaffLeave(state, 'unknown'), /not an active record/);
  assert.deepEqual(state, snapshot);
  assert.doesNotThrow(() => setStaffLeave(state, request({ unit: 'AM' })));
});

test('legacy migration preserves pending data as inactive and does not alter any lessons or audit', () => {
  const state = setup();
  state.staffLeave.push(
    { id: 'legacy-approved', ...request(), days: 1, status: 'approved' },
    { id: 'legacy-pending', ...request({ date: '2026-10-07', unit: 'PM' }), days: 0.5, status: 'pending' },
    { id: 'legacy-declined', ...request({ date: '2026-10-09' }), days: 1, status: 'declined' }
  );
  const bookings = clone(state.bookings), audit = clone(state.audit), originals = clone(state.staffLeave);
  assert.equal(activeStaffLeave(state.staffLeave[0]), true);
  assert.equal(staffBalance(state, 'chan').available, 10);
  assert.match(validateSlot(state, slot()), /on leave/);
  assert.equal(normalizeStaffLeave(state), state);
  assert.deepEqual(state.staffLeave.map(leave => leave.status), ['recorded', 'unrecorded', 'cancelled']);
  for (let index = 0; index < originals.length; index++) {
    const { status, ...unchanged } = state.staffLeave[index];
    const { status: oldStatus, ...original } = originals[index];
    assert.deepEqual(unchanged, original);
  }
  assert.deepEqual(state.bookings, bookings);
  assert.deepEqual(state.audit, audit);
  assert.equal(staffBalance(state, 'chan').available, 10);
  assert.equal(staffBalance(state, 'chan').pending, 0);
  assert.equal(validateSlot(state, slot({ date: '2026-10-07', start: 1020, duration: 30 })), null);
  assert.throws(() => cancelStaffLeave(state, 'legacy-pending'), /not an active record/);
  const normalized = clone(state);
  normalizeStaffLeave(state);
  assert.deepEqual(state, normalized);
  assert.doesNotThrow(() => setStaffLeave(state, request({ date: '2026-10-07', unit: 'PM' })));
});
