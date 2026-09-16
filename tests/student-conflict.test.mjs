import test from 'node:test';
import assert from 'node:assert/strict';
import { seed, clone, dateLabel, studentTimeConflict, validateSlot, moveBooking, activeBooking } from '../dist/model.js';

const existing = overrides => ({ id: 'existing-lesson', studentId: 'chloe', tutor: 'wong', date: '2026-09-30', start: 900, duration: 60, status: 'scheduled', attendance: 'unmarked', ...overrides });
const candidate = overrides => ({ studentId: 'chloe', tutor: 'chan', date: '2026-09-30', start: 930, duration: 60, ...overrides });
const schedule = booking => ({ ...seed(), bookings: [booking], staffLeave: [] });

test('overlap with another teacher reports the actual student, teacher, full date and interval', () => {
  const booking = existing(), state = schedule(booking);
  assert.equal(studentTimeConflict(state, candidate()), booking);
  assert.equal(validateSlot(state, candidate()), 'Chloe Chan already has a lesson with Ming on ' + dateLabel(booking.date, { year: 'numeric' }) + ', 15:00–16:00.');
  assert.equal(state.bookings.filter(b => b.tutor === 'chan').length, 0, 'An empty destination teacher tab does not remove a real student conflict');
  const before = clone(state);
  studentTimeConflict(state, candidate());
  validateSlot(state, candidate());
  assert.deepEqual(state, before);
});

test('same-teacher overlaps and partial overlaps are blocked', () => {
  const booking = existing({ tutor: 'chan' }), state = schedule(booking);
  for (const slot of [candidate({ start: 900 }), candidate({ start: 870, duration: 60 }), candidate({ start: 930, duration: 30 })]) {
    assert.equal(studentTimeConflict(state, slot), booking);
    assert.match(validateSlot(state, slot), /Chloe Chan already has a lesson with Koko/);
  }
});

test('another teacher at a different or adjacent time and lessons on another date remain available', () => {
  const state = schedule(existing());
  for (const slot of [
    candidate({ start: 720 }), candidate({ start: 840 }), candidate({ start: 960 }),
    candidate({ date: '2026-10-02', start: 900 }), candidate({ studentId: 'ethan' })
  ]) {
    assert.equal(studentTimeConflict(state, slot), undefined);
    assert.equal(validateSlot(state, slot), null);
  }
});

test('moved, absent and cancelled bookings do not block a student', () => {
  for (const status of ['moved', 'absent', 'cancelled']) {
    const state = schedule(existing({ status }));
    assert.equal(studentTimeConflict(state, candidate()), undefined, status);
    assert.equal(validateSlot(state, candidate()), null, status);
  }
});

test('excluding the source allows a same-time move to another teacher without a false self-conflict', () => {
  const source = existing({ tutor: 'chan' }), state = schedule(source), destination = candidate({ tutor: 'wong', start: source.start });
  assert.equal(studentTimeConflict(state, destination), source);
  assert.equal(studentTimeConflict(state, destination, [source.id]), undefined);
  assert.equal(validateSlot(state, destination, [source.id]), null);
  const moved = moveBooking(state, source.id, destination);
  assert.equal(moved.tutor, 'wong');
  assert.equal(moved.start, source.start);
  assert.equal(activeBooking(source), false);
  assert.equal(studentTimeConflict(state, moved, [moved.id]), undefined);
});
