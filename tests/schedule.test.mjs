import test from 'node:test';
import assert from 'node:assert/strict';
import { TODAY, WEEK, tutors, students, seed, clone, seedCentreVolume, seedTeacherSchedules, seedSundaySchedules, filterStudents, validateSlot, studentById, CENTRE_OPEN, CENTRE_CLOSE, HALF_DAY_BOUNDARY } from '../dist/model.js';

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
  assert.equal(validateSlot(state, slot({ date: '2026-10-04' })), null);
});

test('Sunday lessons follow each tutor’s own roster, leave and capacity', () => {
  const state = seedTeacherSchedules(emptySchedule()), date = WEEK[6];
  state.bookings = [];
  assert.equal(date, '2026-10-04');
  assert.equal(WEEK.length, 7);
  assert.equal(validateSlot(state, slot({ date })), null);
  assert.equal(validateSlot(state, slot({ date, start: 810, duration: 30 })), null);
  assert.match(validateSlot(state, slot({ date, start: 810, duration: 60 })), /not available/);
  assert.match(validateSlot(state, slot({ date, start: 840 })), /not available/);
  assert.match(validateSlot(state, slot({ date, tutor: 'wong' })), /not available/);
  assert.equal(validateSlot(state, slot({ date, tutor: 'wong', start: 840 })), null);
  assert.equal(validateSlot(state, slot({ date, tutor: 'wong', start: 1080 })), null);
  assert.match(validateSlot(state, slot({ date, tutor: 'oscar' })), /not available/);
  state.staffLeave.push({ staffId: 'chan', date, unit: 'AM', status: 'approved' });
  assert.match(validateSlot(state, slot({ date })), /on leave/);
  state.staffLeave = [];
  state.bookings = Array.from({ length: 6 }, (_, index) => ({ ...slot({ date, studentId: 'other-' + index }), id: 'occupied-' + index, status: 'scheduled' }));
  assert.match(validateSlot(state, slot({ date })), /six students/);
});

test('Sunday examples cover opening to closing while retaining five-day staff equivalents', () => {
  const state = seedTeacherSchedules(seed()), samples = state.bookings.filter(booking => booking.id.startsWith('sunday-v1-'));
  assert.equal(samples.length, 6);
  assert.equal(state.sundayScheduleVersion, 1);
  assert.deepEqual(samples.map(booking => booking.start), [540, 660, 780, 840, 960, 1080]);
  for (const staff of state.staff) assert.equal(staff.roster.reduce((days, unit) => days + (unit === 'Full' ? 1 : ['AM', 'PM'].includes(unit) ? 0.5 : 0), 0), 5, staff.name);
  for (const booking of samples) {
    const student = studentById(booking.studentId);
    assert.equal(student.day, 'Sunday');
    assert.equal(student.tutor, booking.tutor);
    assert.equal(validateSlot(state, booking, [booking.id]), null);
  }
  const directory = filterStudents(state, { sort: 'day' });
  assert.equal(filterStudents(state, { day: 'Sunday' }).length, 6);
  assert.ok(directory.slice(-6).every(student => student.day === 'Sunday'));
  const empty = { ...state, bookings: [], staffLeave: [] };
  for (const student of students.slice(8)) {
    const day = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].indexOf(student.day);
    const [hour, minute] = student.regular.split(' · ')[1].split(':').map(Number);
    assert.equal(validateSlot(empty, { studentId: student.id, date: WEEK[day], start: hour * 60 + minute, duration: 60, tutor: student.tutor }), null, student.number + ' regular lesson must fit the default roster');
  }
});

const legacyRosters = {
  chan: ['Full', 'Off', 'Full', 'Full', 'Full', 'Full', 'Off'],
  wong: ['PM', 'Full', 'Full', 'AM', 'Full', 'Full', 'Off']
};
function legacySavedState() {
  const state = seedTeacherSchedules(seed());
  state.bookings = state.bookings.filter(booking => !booking.id.startsWith('sunday-v1-'));
  delete state.sundayScheduleVersion;
  for (const [id, roster] of Object.entries(legacyRosters)) state.staff.find(staff => staff.id === id).roster = [...roster];
  return state;
}

test('Sunday migration updates saved default rosters without reseeding the established week', () => {
  const state = legacySavedState(), originalBookings = clone(state.bookings);
  assert.equal(state.teacherSchedulesVersion, 1);
  seedTeacherSchedules(state);
  assert.deepEqual(state.bookings.slice(0, originalBookings.length), originalBookings);
  assert.deepEqual(state.staff.find(staff => staff.id === 'chan').roster, ['Full', 'Off', 'Full', 'PM', 'Full', 'Full', 'AM']);
  assert.deepEqual(state.staff.find(staff => staff.id === 'wong').roster, ['PM', 'PM', 'Full', 'AM', 'Full', 'Full', 'PM']);
  assert.equal(state.bookings.length, originalBookings.length + 6);
  const removed = state.bookings.find(booking => booking.id.startsWith('sunday-v1-'));
  state.bookings = state.bookings.filter(booking => booking.id !== removed.id);
  const moved = state.bookings.find(booking => booking.id.startsWith('sunday-v1-'));
  moved.status = 'moved';
  moved.note = 'Moved by centre manager';
  const before = clone(state);
  seedTeacherSchedules(state);
  seedSundaySchedules(state);
  assert.deepEqual(state, before);
});

test('Sunday migration retains custom rosters and saved lessons conflicting with the proposed half-day change', () => {
  const custom = legacySavedState(), staff = custom.staff.find(staff => staff.id === 'chan');
  staff.roster = ['Off', 'Off', 'Full', 'Full', 'Full', 'Full', 'Full'];
  const customRoster = [...staff.roster];
  seedTeacherSchedules(custom);
  assert.deepEqual(staff.roster, customRoster);
  assert.equal(custom.bookings.filter(booking => booking.id.startsWith('sunday-v1-')).length, 6);

  const conflicted = legacySavedState();
  const saved = [
    { ...slot({ date: '2026-10-01' }), id: 'saved-thursday-am', status: 'scheduled' },
    { ...slot({ date: '2026-09-29', tutor: 'wong' }), id: 'saved-tuesday-am', status: 'scheduled' }
  ];
  conflicted.bookings.push(...saved);
  seedTeacherSchedules(conflicted);
  for (const [id, roster] of Object.entries(legacyRosters)) assert.deepEqual(conflicted.staff.find(staff => staff.id === id).roster, roster);
  for (const booking of saved) {
    assert.ok(conflicted.bookings.includes(booking));
    assert.equal(validateSlot(conflicted, booking, [booking.id]), null);
  }
  assert.equal(conflicted.bookings.some(booking => booking.id.startsWith('sunday-v1-')), false);
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
  assert.match(validateSlot(state, slot()), /on leave/);
  assert.match(validateSlot(state, slot({ start: 810, duration: 60 })), /on leave/);
  assert.equal(validateSlot(state, slot({ start: 840 })), null);
  leave.unit = 'PM';
  assert.equal(validateSlot(state, slot()), null);
  assert.equal(validateSlot(state, slot({ start: 810, duration: 30 })), null);
  assert.match(validateSlot(state, slot({ start: 810, duration: 60 })), /on leave/);
  assert.match(validateSlot(state, slot({ start: 840 })), /on leave/);
  leave.unit = 'Full day';
  assert.match(validateSlot(state, slot()), /on leave/);
  assert.match(validateSlot(state, slot({ start: 1080 })), /on leave/);
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
  for (const tutor of tutors) assert.equal(state.staff.find(staff => staff.id === tutor.id).name, tutor.id === 'chan' ? 'Koko Ko' : tutor.name);
  assert.equal(state.staff.find(staff => staff.id === 'chan').role, 'Centre manager');
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
