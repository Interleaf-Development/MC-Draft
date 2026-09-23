import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { seed, seedTeacherSchedules, seedBusyAfternoons, WEEK } from '../dist/model.js';
import { normalizeTwnSchedule } from '../dist/twn-schedule.js';
import { twnRoster } from '../dist/twn-roster.js';
import { normalizeDemoSchedule, DEMO_SCHEDULE_END, DEMO_SCHEDULE_SOURCE, isUntouchedDemoLesson } from '../dist/demo-schedule.js';

const setup = () => {
  const state = seed(); seedTeacherSchedules(state); seedBusyAfternoons(state); normalizeTwnSchedule(state); return state;
};
const repeats = state => state.bookings.filter(booking => booking.source === DEMO_SCHEDULE_SOURCE);
const pattern = booking => [booking.studentId, new Date(booking.date + 'T00:00:00Z').getUTCDay(), booking.start, booking.duration, booking.tutor].join('|');

test('real timetable repeats unchanged through December without copying finances or lesson history', () => {
  const state = setup(), before = structuredClone(state);
  normalizeDemoSchedule(state);
  const original = before.bookings.filter(booking => booking.source === 'twn-schedule');
  for (const [from, to] of [['2026-10-05','2026-10-11'], ['2026-11-02','2026-11-08'], ['2026-12-21','2026-12-27']]) {
    assert.deepEqual(repeats(state).filter(booking => booking.date >= from && booking.date <= to).map(pattern).sort(), original.map(pattern).sort());
  }
  const finalWeek = repeats(state).filter(booking => booking.date >= '2026-12-28');
  assert.deepEqual(finalWeek.map(pattern).sort(), original.filter(booking => WEEK.indexOf(booking.date) < 4).map(pattern).sort());
  assert.ok(repeats(state).every(booking => booking.date > WEEK.at(-1) && booking.date <= DEMO_SCHEDULE_END && isUntouchedDemoLesson(booking)));
  assert.equal(new Set(state.bookings.map(booking => booking.id)).size, state.bookings.length);
  assert.deepEqual(state.bookings.slice(0, before.bookings.length), before.bookings);
  for (const key of ['invoices','receipts','bankTransactions','assignments','lessonNotes','leaveRequests','makeups']) assert.deepEqual(state[key], before[key]);
  assert.equal(state.demoScheduleThrough, '2026-12-31');
});

test('upgrading saved schedules preserves recorded bookings and skips existing overlaps and recurring changes', () => {
  const state = setup(), student = twnRoster[0], slot = student.sessions[0];
  const originalDate = WEEK[slot.weekday - 1];
  const nextDate = new Date(Date.parse(originalDate + 'T00:00:00Z') + 7 * 86400000).toISOString().slice(0,10);
  const recorded = { id:'saved-moved-lesson', studentId:student.id, date:nextDate, start:slot.start, duration:slot.duration, tutor:slot.tutor, status:'absent', attendance:'absent', note:'Keep this leave', caseId:'saved-makeup' };
  state.bookings.push(recorded);
  const changedStudent = twnRoster[1].id;
  state.regularSchedules = { [changedStudent]: { weekday: 3, start: 900, duration: 60, tutor:'chan', effectiveDate:'2026-10-01' } };
  const before = structuredClone(state);
  normalizeDemoSchedule(state);
  assert.deepEqual(state.bookings.slice(0,before.bookings.length), before.bookings);
  assert.equal(repeats(state).filter(booking => booking.studentId === student.id && booking.date === nextDate && booking.start === slot.start).length, 0);
  assert.equal(repeats(state).filter(booking => booking.studentId === changedStudent).length, 0);
  assert.deepEqual(state.regularSchedules, before.regularSchedules);
});

test('reloads never recreate deleted repeated lessons or overwrite moves, notes and attendance', () => {
  const state = normalizeDemoSchedule(setup());
  const [removed, moved, marked] = repeats(state);
  state.bookings = state.bookings.filter(booking => booking.id !== removed.id);
  moved.date = '2026-12-31'; moved.start += 30; moved.note = 'Changed locally';
  marked.attendance = 'present';
  assert.equal(isUntouchedDemoLesson(moved), false);
  assert.equal(isUntouchedDemoLesson(marked), false);
  const untouched = repeats(state).find(booking => isUntouchedDemoLesson(booking));
  assert.equal(isUntouchedDemoLesson({...untouched, invoiceId:'saved-invoice'}), false);
  const before = structuredClone(state);
  normalizeDemoSchedule(state);
  assert.deepEqual(state, before);
  const reloaded = JSON.parse(JSON.stringify(state));
  normalizeDemoSchedule(reloaded);
  assert.deepEqual(reloaded, before);
});

test('the extension waits for the original timetable import', () => {
  const state = seed(), before = structuredClone(state);
  normalizeDemoSchedule(state);
  assert.deepEqual(state, before);
});

test('Hang Hau repeats its own weekly schedule and resets copied attendance without importing Tsuen Wan pupils', () => {
  const script = `
    import assert from 'node:assert/strict';
    globalThis.location = { pathname: '/hh/' };
    const m = await import('./dist/model.js');
    const { normalizeDemoSchedule, isUntouchedDemoLesson } = await import('./dist/demo-schedule.js');
    const state = m.seed(); m.seedTeacherSchedules(state); m.seedBusyAfternoons(state);
    const finance = structuredClone({ invoices:state.invoices, receipts:state.receipts });
    const pattern = b => [b.studentId,new Date(b.date+'T00:00:00Z').getUTCDay(),b.start,b.duration,b.tutor].join('|');
    const source = state.bookings.filter(b => m.WEEK.includes(b.date) && b.status === 'scheduled' && !b.sourceId && !b.caseId);
    normalizeDemoSchedule(state);
    const november = state.bookings.filter(b => b.date >= '2026-11-02' && b.date <= '2026-11-08');
    assert.deepEqual(november.map(pattern).sort(), source.map(pattern).sort());
    assert.ok(november.every(b => isUntouchedDemoLesson(b) && !b.studentId.startsWith('twn-')));
    assert.deepEqual({ invoices:state.invoices, receipts:state.receipts },finance);
    assert.ok(state.bookings.some(b => b.date >= '2026-12-28'));
    console.log('ok');
  `;
  assert.equal(execFileSync(process.execPath, ['--input-type=module','-e',script], {cwd:new URL('..',import.meta.url),encoding:'utf8'}).trim(),'ok');
});
