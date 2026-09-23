import { centre } from './model.js';
import { createDemoLesson, isUntouchedDemoLesson } from './demo-schedule.js';

const PACKED = 'demoRepeatedLessonsV1';
const plainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const invalid = () => { throw new Error('Invalid saved repeated demo lessons.'); };

// Only generated, unedited and unreferenced lessons are compacted. Real records
// stay verbatim, including lesson snapshots and identifiers used by billing.
export function serializeDemoState(state) {
  if (!plainObject(state) || !Array.isArray(state.bookings)) return JSON.stringify(state);
  if (Object.hasOwn(state, PACKED)) throw new Error('Demo state must be unpacked before saving.');
  const candidates = new Set(state.bookings.filter(isUntouchedDemoLesson).map(booking => booking.id));
  if (!candidates.size) return JSON.stringify(state);
  const referenced = new Set();
  const inspect = value => {
    if (typeof value === 'string') { if (candidates.has(value)) referenced.add(value); }
    else if (Array.isArray(value)) value.forEach(inspect);
    else if (plainObject(value)) Object.values(value).forEach(inspect);
  };
  for (const [key, value] of Object.entries(state)) if (key !== 'bookings') inspect(value);
  for (const booking of state.bookings) {
    for (const [key, value] of Object.entries(booking)) if (key !== 'id') inspect(value);
  }
  const groups = new Map(), bookings = [];
  state.bookings.forEach((booking, index) => {
    if (!isUntouchedDemoLesson(booking) || referenced.has(booking.id)) { bookings.push(booking); return; }
    const fields = [booking.studentId, booking.tutor, booking.start, booking.duration];
    const key = JSON.stringify(fields);
    if (!groups.has(key)) groups.set(key, [...fields, []]);
    groups.get(key)[4].push([index, booking.date]);
  });
  if (!groups.size) return JSON.stringify(state);
  return JSON.stringify({ ...state, bookings, [PACKED]: { branch: centre.code, length: state.bookings.length, groups: [...groups.values()] } });
}

export function parseDemoState(json) {
  const state = JSON.parse(json);
  if (!plainObject(state) || !Object.hasOwn(state, PACKED)) return state;
  const packed = state[PACKED];
  if (!plainObject(packed) || packed.branch !== centre.code || !Array.isArray(state.bookings)
    || !Number.isSafeInteger(packed.length) || packed.length < state.bookings.length
    || !Array.isArray(packed.groups)) invalid();
  // Count before allocating so corrupt storage cannot request an enormous array.
  let count = state.bookings.length;
  for (const group of packed.groups) {
    if (!Array.isArray(group) || group.length !== 5 || !Array.isArray(group[4])) invalid();
    count += group[4].length;
  }
  if (count !== packed.length) invalid();
  const bookings = new Array(count);
  for (const [studentId, tutor, start, duration, entries] of packed.groups) {
    if (typeof studentId !== 'string' || !studentId || typeof tutor !== 'string' || !tutor
      || !Number.isSafeInteger(start) || start < 0 || !Number.isSafeInteger(duration) || duration <= 0) invalid();
    for (const item of entries) {
      if (!Array.isArray(item) || item.length !== 2) invalid();
      const [index, date] = item;
      if (!Number.isSafeInteger(index) || index < 0 || index >= count || bookings[index]
        || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) invalid();
      const timestamp = Date.parse(date + 'T00:00:00Z');
      if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== date) invalid();
      bookings[index] = createDemoLesson({ studentId, tutor, start, duration, date });
    }
  }
  let original = 0;
  for (let index = 0; index < count; index++) if (!bookings[index]) bookings[index] = state.bookings[original++];
  if (original !== state.bookings.length) invalid();
  state.bookings = bookings;
  delete state[PACKED];
  return state;
}
