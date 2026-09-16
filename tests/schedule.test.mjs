import test from 'node:test';
import assert from 'node:assert/strict';
import { TODAY, WEEK, tutors, students, seed, clone, seedCentreVolume, seedTeacherSchedules, validateSlot, studentById, CENTRE_OPEN, CENTRE_CLOSE, HALF_DAY_BOUNDARY } from '../dist/model.js';

const slot = overrides => ({ studentId: 'test-student', date: TODAY, start: 540, duration: 60, tutor: 'chan', ...overrides });
const emptySchedule = () => ({ ...seed(), bookings: [], staffLeave: [] });

test('the eight teacher tabs have the requested order and preserve legacy teacher IDs', () => {
  assert.deepEqual(tutors.map(tutor => tutor.name), ['Koko', 'Ming', 'Oscar', 'Peter', 'Polly', 'Shileen', 'Tiffany', 'Winky']);
  assert.deepEqual(tutors.map(tutor => tutor.id), ['chan', 'wong', 'oscar', 'peter', 'polly', 'shileen', 'tiffany', 'winky']);
  assert.equal(new Set(students.slice(8).map(student => student.tutor)).size, 8);
});

test('lessons can start at 09:00 and finish at 19:00 but cannot exceed centre hours', () => {
  const state = emptySchedule();
  assert.equal(CENTRE_OPEN, 540);
  assert.equal(CENTRE_CLOSE, 1140);
  assert.equal(validateSlot(state, slot()), null);
  assert.equal(validateSlot(state, slot({ start: 1080 })), null);
  assert.equal(validateSlot(state, slot({ start: 1110, duration: 30 })), null);
  assert.match(validateSlot(state, slot({ start: 510 })), /09:00 and 19:00/);
  assert.match(validateSlot(state, slot({ start: 1110, duration: 60 })), /09:00 and 19:00/);
  assert.match(validateSlot(state, slot({ start: 1140, duration: 30 })), /09:00 and 19:00/);
  assert.match(validateSlot(state, slot({ tutor: 'unknown' })), /available tutor/);
  assert.match(validateSlot(state, slot({ date: '2026-10-04' })), /Sundays/);
});

test('AM and PM roster availability uses the 14:00 boundary and checks the whole lesson', () => {
  const state = emptySchedule();
  assert.equal(HALF_DAY_BOUNDARY, 840);
  const am = { tutor: 'wong', date: '2026-10-01' };
  assert.equal(validateSlot(state, slot(am)), null);
  assert.equal(validateSlot(state, slot({ ...am, start: 810, duration: 30 })), null);
  assert.match(validateSlot(state, slot({ ...am, start: 810, duration: 60 })), /not available/);
  assert.match(validateSlot(state, slot({ ...am, start: 840 })), /not available/);
  const pm = { tutor: 'wong', date: '2026-09-28' };
  assert.match(validateSlot(state, slot(pm)), /not available/);
  assert.match(validateSlot(state, slot({ ...pm, start: 810, duration: 60 })), /not available/);
  assert.equal(validateSlot(state, slot({ ...pm, start: 840 })), null);
  assert.equal(validateSlot(state, slot({ ...pm, start: 1080 })), null);
  assert.match(validateSlot(state, slot({ date: '2026-09-29' })), /not available/);
});

test('approved AM/PM leave blocks only the overlapping half of the working day', () => {
  const state = emptySchedule();
  const leave = { id: 'half-day', staffId: 'chan', date: TODAY, unit: 'AM', days: 0.5, status: 'approved' };
  state.staffLeave.push(leave);
  assert.match(validateSlot(state, slot()), /approved leave/);
  assert.match(validateSlot(state, slot({ start: 810, duration: 60 })), /approved leave/);
  assert.equal(validateSlot(state, slot({ start: 840 })), null);
  leave.unit = 'PM';
  assert.equal(validateSlot(state, slot()), null);
  assert.equal(validateSlot(state, slot({ start: 810, duration: 30 })), null);
  assert.match(validateSlot(state, slot({ start: 810, duration: 60 })), /approved leave/);
  assert.match(validateSlot(state, slot({ start: 840 })), /approved leave/);
  leave.unit = 'Full day';
  assert.match(validateSlot(state, slot()), /approved leave/);
  assert.match(validateSlot(state, slot({ start: 1080 })), /approved leave/);
  leave.status = 'pending';
  assert.equal(validateSlot(state, slot()), null);
  assert.equal(validateSlot(state, slot({ start: 1080 })), null);
});

test('teacher migration preserves original lessons and make-ups while renaming staff and message owners', () => {
  const state = seedCentreVolume(seed()), originalBookings = clone(state.bookings), originalMakeups = clone(state.makeups);
  assert.equal(seedTeacherSchedules(state), state);
  assert.deepEqual(state.bookings.slice(0, originalBookings.length), originalBookings);
  assert.deepEqual(state.makeups, originalMakeups);
  assert.equal(state.staff.length, 8);
  for (const tutor of tutors) assert.equal(state.staff.find(staff => staff.id === tutor.id).name, tutor.name);
  assert.equal(state.staff.find(staff => staff.id === 'chan').allowance, 14);
  assert.equal(state.staff.find(staff => staff.id === 'chan').taken, 4);
  assert.equal(state.messages.find(thread => thread.id === 'thread-chloe').assignedTo, 'Koko');
  assert.ok(state.messages.every(thread => ['Reception', ...tutors.map(tutor => tutor.name)].includes(thread.assignedTo)));
  assert.equal(state.teacherSchedulesVersion, 1);
});

test('new teacher schedules span the opening hours and remain consistent with student metadata and capacity', () => {
  const state = seedTeacherSchedules(seed()), samples = state.bookings.filter(booking => booking.id.startsWith('schedule-v1-'));
  assert.ok(samples.length > 0);
  assert.ok(samples.some(booking => booking.attendance === 'present'));
  assert.ok(samples.some(booking => booking.attendance === 'unmarked'));
  for (const tutor of tutors.slice(2)) {
    const starts = new Set(samples.filter(booking => booking.tutor === tutor.id).map(booking => booking.start));
    assert.ok(starts.has(CENTRE_OPEN), tutor.name + ' needs a morning example');
    assert.ok(starts.has(CENTRE_CLOSE - 60), tutor.name + ' needs an evening example');
    const staff = state.staff.find(staff => staff.id === tutor.id);
    assert.equal(staff.roster.filter(unit => unit === 'Full').length, 5);
  }
  for (const booking of samples) {
    const student = studentById(booking.studentId);
    assert.equal(booking.tutor, student.tutor);
    assert.equal(student.status, 'active');
    assert.equal(student.day, new Date(booking.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long' }));
    assert.equal(validateSlot(state, booking, [booking.id]), null, booking.id);
    assert.ok(WEEK.includes(booking.date));
  }
  assert.equal(new Set(state.bookings.map(booking => booking.id)).size, state.bookings.length);
});

test('migration marker preserves edited, moved and deleted sample bookings on subsequent loads', () => {
  const state = seedTeacherSchedules(seed());
  const index = state.bookings.findIndex(booking => booking.id.startsWith('schedule-v1-'));
  state.bookings.splice(index, 1);
  const moved = state.bookings.find(booking => booking.id.startsWith('schedule-v1-'));
  moved.status = 'moved';
  moved.note = 'Manager changed this lesson';
  const before = clone(state);
  seedTeacherSchedules(state);
  assert.deepEqual(state, before);
  const other = seedTeacherSchedules(seed());
  assert.deepEqual(other.bookings.filter(booking => booking.id.startsWith('schedule-v1-')).map(booking => booking.id), seedTeacherSchedules(seed()).bookings.filter(booking => booking.id.startsWith('schedule-v1-')).map(booking => booking.id));
});

test('first migration respects an existing student booking instead of introducing a conflict', () => {
  const sample = seedTeacherSchedules(seed()).bookings.find(booking => booking.id.startsWith('schedule-v1-'));
  const state = seed();
  state.bookings.push({ ...sample, id: 'existing-manual-lesson', note: 'Keep this booking' });
  seedTeacherSchedules(state);
  assert.ok(state.bookings.some(booking => booking.id === 'existing-manual-lesson'));
  assert.equal(state.bookings.some(booking => booking.id === sample.id), false);
});
