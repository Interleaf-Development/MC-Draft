import test from 'node:test';
import assert from 'node:assert/strict';
import { seed, seedCentreVolume, seedTeacherSchedules, seedBusyAfternoons } from '../dist/model.js';
import { normalizeTwnSchedule } from '../dist/twn-schedule.js';
import { createDemoLesson, normalizeDemoSchedule, DEMO_SCHEDULE_SOURCE } from '../dist/demo-schedule.js';
import { serializeDemoState, parseDemoState } from '../dist/demo-state-storage.js';

const lesson = date => createDemoLesson({ studentId: 'sample-student', tutor: 'chan', start: 960, duration: 60, date });

test('packing preserves exact booking order, edits, deletions and reloads without mutating input', () => {
  const state = { bookings: [lesson('2026-10-01'), { id: 'original', note: 'Do not change' }, lesson('2026-10-08'), lesson('2026-10-15'), lesson('2026-10-22')], demoScheduleVersion: 1 };
  state.bookings.splice(2, 1);
  state.bookings[2].date = '2026-10-16';
  state.bookings[2].note = 'Moved by staff';
  const before = structuredClone(state), serialized = serializeDemoState(state);
  assert.deepEqual(state, before);
  assert.equal(JSON.parse(serialized).bookings.length, 2);
  const restored = parseDemoState(serialized);
  assert.deepEqual(restored, before);
  assert.equal(JSON.stringify(restored), JSON.stringify(before));
  normalizeDemoSchedule(restored);
  assert.deepEqual(restored, before);
  assert.deepEqual(parseDemoState(serializeDemoState(restored)), before);
});

test('linked and modified generated lessons remain full records', () => {
  const bookings = ['2026-10-01','2026-10-08','2026-10-15','2026-10-22','2026-10-29'].map(lesson);
  bookings[1].attendance = 'present';
  bookings[2].invoiceId = 'saved-invoice';
  const state = { bookings, receipts: [{ lessonIds: [bookings[3].id] }], makeups: [{ sourceId: bookings[4].id }] };
  const serialized = serializeDemoState(state), saved = JSON.parse(serialized);
  assert.deepEqual(saved.bookings.map(booking => booking.id), bookings.slice(1).map(booking => booking.id));
  assert.deepEqual(parseDemoState(serialized), state);
});

test('legacy state and malformed saved data never silently discard bookings', () => {
  const state = { bookings: [{ id: 'legacy', note: 'Keep' }], receipts: [] };
  assert.deepEqual(parseDemoState(JSON.stringify(state)), state);
  assert.equal(serializeDemoState(state), JSON.stringify(state));
  const packed = JSON.parse(serializeDemoState({ bookings: [lesson('2026-10-01')] }));
  for (const corrupt of [
    value => { value.demoRepeatedLessonsV1.length++; },
    value => { value.demoRepeatedLessonsV1.groups[0][4][0][0] = 100; },
    value => { value.demoRepeatedLessonsV1.groups[0][4][0][1] = '2026-02-31'; },
    value => { value.demoRepeatedLessonsV1.groups[0][4].push([0, '2026-10-08']); value.demoRepeatedLessonsV1.length++; },
    value => { value.demoRepeatedLessonsV1.branch = 'OTHER'; },
    value => { value.demoRepeatedLessonsV1.groups = null; },
    value => { value.bookings = null; }
  ]) {
    const broken = structuredClone(packed); corrupt(broken);
    assert.throws(() => parseDemoState(JSON.stringify(broken)), /Invalid saved/);
  }
  assert.throws(() => serializeDemoState(packed), /unpacked/);
  assert.throws(() => parseDemoState('{'), SyntaxError);
});

test('full real timetable through December fits the browser storage budget and round trips exactly', () => {
  const state = seed();
  seedCentreVolume(state); seedTeacherSchedules(state); seedBusyAfternoons(state); normalizeTwnSchedule(state); normalizeDemoSchedule(state);
  assert.ok(state.bookings.filter(booking => booking.source === DEMO_SCHEDULE_SOURCE).length > 10000);
  const serialized = serializeDemoState(state);
  assert.ok(serialized.length < 2500000, `Saved ${serialized.length} characters; must leave room within a 5 MB UTF-16 quota.`);
  assert.deepEqual(parseDemoState(serialized), state);
  assert.equal(JSON.stringify(parseDemoState(serialized)), JSON.stringify(state));
});
