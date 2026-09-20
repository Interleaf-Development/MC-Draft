import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { twnRoster } from '../dist/twn-roster.js';
import { allStudents, students, twnStudents, studentById, enrolledStudents, billingPayerName, WEEK, seed, seedCentreVolume, seedTeacherSchedules, seedBusyAfternoons, clone } from '../dist/model.js';
import { normalizeTwnSchedule, TWN_SCHEDULE_VERSION } from '../dist/twn-schedule.js';

const roster = Array.from({ length: 7 }, (_, index) => ({
  id: 'twn-test-' + index, name: 'Import pupil ' + index,
  sessions: [{ tutor: 'chan', weekday: 2, start: 960, duration: 60 }]
}));
const setup = () => { const state = seed(); seedCentreVolume(state); seedTeacherSchedules(state); seedBusyAfternoons(state); return state; };

test('timetable import includes every supplied slot regardless of demo off-days or six-student capacity', () => {
  const state = setup(), originalFinance = clone({ invoices: state.invoices, receipts: state.receipts, bankTransactions: state.bankTransactions, messages: state.messages });
  normalizeTwnSchedule(state, { roster });
  const imported = state.bookings.filter(booking => booking.source === 'twn-schedule');
  assert.equal(imported.length, 7);
  assert.ok(imported.every(booking => booking.date === WEEK[1] && booking.start === 960 && booking.tutor === 'chan'));
  assert.ok(imported.every(booking => booking.status === 'scheduled' && booking.attendance === 'unmarked' && booking.note === ''));
  assert.equal(state.staff.find(staff => staff.id === 'chan').roster[1], 'Full');
  assert.equal(state.twnScheduleVersion, TWN_SCHEDULE_VERSION);
  assert.deepEqual({ invoices: state.invoices, receipts: state.receipts, bankTransactions: state.bankTransactions, messages: state.messages }, originalFinance);
  assert.equal(state.bookings.filter(booking => !booking.source).length, 1, 'only the linked missed lesson remains from an untouched schedule');
  assert.equal(state.bookings.find(booking => !booking.source).id, 'missed-sep23');
});

test('import is stable on reload and never restores deleted or changes moved imported lessons', () => {
  const state = normalizeTwnSchedule(setup(), { roster });
  const imported = state.bookings.filter(booking => booking.source === 'twn-schedule');
  state.bookings = state.bookings.filter(booking => booking.id !== imported[0].id);
  Object.assign(imported[1], { date: WEEK[4], start: 1020, note: 'Local edit', status: 'moved' });
  const before = clone(state);
  normalizeTwnSchedule(state, { roster });
  seedTeacherSchedules(state); seedBusyAfternoons(state);
  assert.deepEqual(state, before);
  const another = normalizeTwnSchedule(setup(), { roster });
  assert.deepEqual(another.bookings.filter(booking => booking.source === 'twn-schedule').map(booking => booking.id), imported.map(booking => booking.id));
});

test('edited, unknown and linked legacy records retain their IDs and student identity', () => {
  const state = setup(), candidates = state.bookings.filter(booking => booking.id.startsWith('afternoon-v1-')).slice(0, 6);
  Object.assign(candidates[0], { note: 'Keep local remark' });
  Object.assign(candidates[1], { start: candidates[1].start + 30 });
  Object.assign(candidates[2], { scheduleColour: 'green' });
  state.checkInPasses = [{ id: 'saved-pass', bookingId: candidates[3].id }];
  state.receipts[0].revisions = [{ lessonDates: [{ bookingId: candidates[4].id }] }];
  state.bookings.push({ ...candidates[5], id: 'saved-manual-booking' });
  const saved = clone([...candidates.slice(0, 5), state.bookings.at(-1)]);
  normalizeTwnSchedule(state, { roster });
  for (const booking of saved) assert.deepEqual(state.bookings.find(item => item.id === booking.id), booking);
  for (const booking of saved) assert.ok(enrolledStudents(state).some(student => student.id === booking.studentId));
  assert.ok(enrolledStudents(state).filter(student => student.source !== 'twn-schedule').length < 50, 'the full invented directory is not retained by its sample billing records');
});

test('the import leaves custom staff patterns and all annual-leave records alone', () => {
  const state = setup();
  state.staff.find(staff => staff.id === 'chan').roster = ['AM', 'Off', 'AM', 'Off', 'AM', 'Off', 'Off'];
  state.staffLeave.push({ id: 'saved-leave', staffId: 'chan', date: WEEK[1], unit: 'Full day', status: 'recorded' });
  const staff = clone(state.staff.find(staff => staff.id === 'chan')), leave = clone(state.staffLeave);
  normalizeTwnSchedule(state, { roster });
  assert.deepEqual(state.staff.find(item => item.id === 'chan'), staff);
  assert.deepEqual(state.staffLeave, leave);
  assert.equal(state.bookings.filter(booking => booking.source === 'twn-schedule').length, 7);
});

test('each imported pupil has only a real name and real timetable, with no invented contact, grade or payer', () => {
  assert.ok(twnRoster.length > 0);
  assert.equal(allStudents.length, students.length + twnRoster.length);
  assert.equal(twnStudents.length, twnRoster.length);
  for (const source of twnRoster) {
    const student = studentById(source.id);
    assert.equal(student.name, source.name);
    assert.equal(student.source, 'twn-schedule');
    assert.deepEqual(student.sessions, source.sessions);
    for (const key of ['level', 'parent', 'phone', 'focus', 'number']) assert.equal(student[key], '');
    assert.equal(billingPayerName(null, student.id), '');
    assert.deepEqual(Object.keys(source).sort(), ['id', 'name', 'sessions']);
    for (const slot of source.sessions) assert.deepEqual(Object.keys(slot).sort(), ['duration', 'start', 'tutor', 'weekday']);
  }
  assert.equal(studentById('chloe').name, 'Chloe Chan', 'legacy billing and worksheet IDs remain separate');
});

test('the actual timetable fills the demo week without generating any extra pupil history', () => {
  const state = normalizeTwnSchedule(setup());
  const slots = twnRoster.flatMap(student => student.sessions.map(slot => ({ studentId: student.id, ...slot })));
  const imported = state.bookings.filter(booking => booking.source === 'twn-schedule');
  assert.equal(imported.length, slots.length);
  assert.equal(new Set(imported.map(booking => booking.id)).size, slots.length);
  assert.deepEqual(imported.map(({ studentId, tutor, date, start, duration }) => ({ studentId, tutor, weekday: WEEK.indexOf(date) + 1, start, duration })), slots);
  assert.ok(imported.some(booking => booking.start % 60 !== 0), 'explicit non-hourly source times are retained');
  assert.ok(imported.some(booking => booking.start + booking.duration > 1140), 'the final source lesson is retained beyond the old demo closing hour');
  const importedIds = new Set(twnRoster.map(student => student.id));
  for (const collection of ['assignments', 'lessonNotes', 'messages', 'invoices', 'receipts']) assert.ok(state[collection].every(item => !importedIds.has(item.studentId)));
  assert.equal(enrolledStudents(state).filter(student => student.source === 'twn-schedule').length, twnRoster.length);
});

test('empty roster does not mark a saved schedule as imported', () => {
  const state = setup(), before = clone(state);
  normalizeTwnSchedule(state, { roster: [] });
  assert.deepEqual(state, before);
});

test('Hang Hau does not load or migrate the Tsuen Wan roster', () => {
  const script = `
    import assert from 'node:assert/strict';
    globalThis.location = { pathname: '/hh/' };
    const model = await import('./dist/model.js');
    const { normalizeTwnSchedule } = await import('./dist/twn-schedule.js');
    const state = model.seed(); model.seedTeacherSchedules(state); model.seedBusyAfternoons(state);
    const before = structuredClone(state);
    normalizeTwnSchedule(state, { roster: ${JSON.stringify(roster)} });
    assert.deepEqual(state, before);
    assert.deepEqual(model.allStudents, model.students);
    assert.equal(model.twnStudents.length, 0);
    console.log('ok');
  `;
  assert.equal(execFileSync(process.execPath, ['--input-type=module', '-e', script], { cwd: new URL('..', import.meta.url), encoding: 'utf8' }).trim(), 'ok');
});
