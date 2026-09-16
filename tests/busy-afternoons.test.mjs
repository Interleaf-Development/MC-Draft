import test from 'node:test';
import assert from 'node:assert/strict';
import { WEEK, tutors, seed, clone, seedTeacherSchedules, seedBusyAfternoons, activeBooking, validateSlot, moveBooking, bookMakeup, studentById } from '../dist/model.js';

const base = () => seedTeacherSchedules(seed());
const isAdded = booking => booking.id.startsWith('afternoon-v1-');

test('available afternoon sessions have five or six students without conflicts or overloaded student schedules', () => {
  const state = base(), originals = clone(state.bookings);
  seedBusyAfternoons(state);
  assert.deepEqual(state.bookings.slice(0, originals.length), originals);
  const counts = new Set();
  for (const date of WEEK) for (const tutor of tutors) for (const start of [960, 1020, 1080]) {
    const slot = { date, tutor: tutor.id, start, duration: 60, studentId: 'check-availability' };
    if (validateSlot({ ...state, bookings: [] }, slot)) continue;
    const count = state.bookings.filter(booking => activeBooking(booking) && booking.date === date && booking.tutor === tutor.id && booking.start <= start && booking.start + booking.duration > start).length;
    assert.ok(count === 5 || count === 6, `${date} ${tutor.name} ${start}: ${count} students`);
    counts.add(count);
  }
  assert.deepEqual([...counts].sort(), [5, 6]);
  const additions = state.bookings.filter(isAdded);
  assert.ok(additions.length > 0);
  for (const booking of additions) {
    assert.equal(validateSlot(state, booking, [booking.id]), null, booking.id);
    assert.equal(studentById(booking.studentId).status, 'active');
    const lessons = state.bookings.filter(other => activeBooking(other) && other.studentId === booking.studentId && WEEK.includes(other.date));
    assert.ok(lessons.length <= 2);
    assert.equal(lessons.filter(other => other.date === booking.date).length, 1);
  }
});

test('busy fixtures preserve the ordinary move and two-part make-up walkthroughs', () => {
  const state = seedBusyAfternoons(base());
  const source = state.bookings.find(booking => booking.studentId === 'chloe' && booking.date === '2026-09-30');
  assert.doesNotThrow(() => moveBooking(state, source.id, { date: source.date, tutor: 'chan', start: 1020 }));
  const split = bookMakeup(state, 'makeup-chloe', [
    { date: '2026-10-02', tutor: 'chan', start: 1020, duration: 30 },
    { date: '2026-10-07', tutor: 'chan', start: 1020, duration: 30 }
  ]);
  assert.equal(split.length, 2);
});

test('afternoon migration retains saved changes, approved leave and partial-hour capacity', () => {
  const state = base();
  state.staffLeave.push({ staffId: 'oscar', date: '2026-09-30', unit: 'PM', status: 'approved' });
  const partial = { id: 'saved-extension', studentId: 'student-0701', date: '2026-09-30', tutor: 'peter', start: 990, duration: 90, status: 'scheduled', attendance: 'unmarked', note: 'Keep this saved lesson' };
  state.bookings.push(partial);
  seedBusyAfternoons(state);
  assert.ok(state.bookings.includes(partial));
  assert.ok(!state.bookings.some(booking => isAdded(booking) && booking.tutor === 'oscar' && booking.date === '2026-09-30'));
  for (const booking of state.bookings.filter(isAdded)) assert.equal(validateSlot(state, booking, [booking.id]), null);
  const removed = state.bookings.find(isAdded);
  state.bookings = state.bookings.filter(booking => booking.id !== removed.id);
  const changed = state.bookings.find(isAdded);
  changed.status = 'moved';
  changed.note = 'Moved by manager';
  const before = clone(state);
  seedBusyAfternoons(state);
  assert.deepEqual(state, before);
});
