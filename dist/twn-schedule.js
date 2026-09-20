import { centre, WEEK, seed, seedTeacherSchedules, seedBusyAfternoons } from './model.js';
import { twnRoster } from './twn-roster.js';

export const TWN_SCHEDULE_VERSION = 1;
const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const bookingKeys = ['studentId', 'date', 'start', 'duration', 'tutor', 'status', 'attendance', 'note'];
const shape = booking => JSON.stringify(bookingKeys.map(key => booking[key]));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function fixtureState() {
  const state = seed();
  seedTeacherSchedules(state);
  seedBusyAfternoons(state);
  return state;
}

function linkedBookingIds(state) {
  const ids = new Set();
  // References can also occur in receipt revisions and regular-schedule history.
  // Preserve the lesson whenever another record points to it.
  function visit(value) {
    if (!value || typeof value !== 'object') return;
    for (const [key, item] of Object.entries(value)) {
      if (['bookingId', 'sourceId'].includes(key) && typeof item === 'string') ids.add(item);
      else if (item && typeof item === 'object') visit(item);
    }
  }
  visit(state);
  return ids;
}

function removeUntouchedExamples(state, fixtures) {
  const fixed = new Map(fixtures.bookings.map(booking => [booking.id, booking]));
  const coreShapes = new Set(fixtures.bookings.filter(booking => booking.id.startsWith('lesson-')).map(shape));
  const linked = linkedBookingIds(state);
  state.bookings = state.bookings.filter(booking => {
    if (linked.has(booking.id) || state.regularSchedules?.[booking.studentId]
      || booking.status !== 'scheduled' || booking.sourceId || booking.caseId
      || Object.keys(booking).some(key => key !== 'id' && !bookingKeys.includes(key))) return true;
    // Random seed IDs are recognized by the complete, otherwise untouched shape.
    if (booking.id.startsWith('lesson-')) return !coreShapes.has(shape(booking));
    const original = fixed.get(booking.id);
    return !original || shape(original) !== shape(booking);
  });
}

function allowImportedSlots(state, fixtures, roster) {
  const oldRosters = {
    chan: ['Full', 'Off', 'Full', 'Full', 'Full', 'Full', 'Off'],
    wong: ['PM', 'Full', 'Full', 'AM', 'Full', 'Full', 'Off']
  };
  for (const baseline of fixtures.staff) {
    let staff = state.staff.find(item => item.id === baseline.id);
    if (!staff) { staff = structuredClone(baseline); state.staff.push(staff); }
    // Widen only the untouched demonstration roster; saved staff leave records
    // and manually edited working patterns are not changed by this import.
    if (!same(staff.roster, baseline.roster) && !same(staff.roster, oldRosters[staff.id])) continue;
    const next = [...staff.roster];
    for (const slot of roster.flatMap(student => student.sessions).filter(slot => slot.tutor === staff.id)) {
      next[slot.weekday - 1] = 'Full';
    }
    staff.roster = next;
    staff.daysOff = next.map((unit, day) => unit === 'Full' ? null : weekdays[day] + (unit === 'AM' ? ' PM' : unit === 'PM' ? ' AM' : '')).filter(Boolean).join(' · ');
  }
}

// Each source slot becomes one lesson in the displayed demo week. The marker
// keeps later moves, deletions, attendance and notes intact across reloads.
export function normalizeTwnSchedule(state, { roster = twnRoster, branchCode = centre.code } = {}) {
  if (branchCode !== 'TWN' || state.twnScheduleVersion || !roster.length) return state;
  const fixtures = fixtureState();
  state.bookings ??= [];
  state.staff ??= [];
  removeUntouchedExamples(state, fixtures);
  allowImportedSlots(state, fixtures, roster);
  const ids = new Set(state.bookings.map(booking => booking.id));
  for (const student of roster) {
    for (const slot of student.sessions) {
      const id = ['twn-v1', student.id, slot.tutor, slot.weekday, slot.start, slot.duration].join('-');
      if (ids.has(id)) continue;
      // Actual rosters are copied as supplied, without applying the synthetic
      // six-seat limit or invented staff off-days from earlier demo fixtures.
      state.bookings.push({
        id, studentId: student.id, date: WEEK[slot.weekday - 1],
        start: slot.start, duration: slot.duration, tutor: slot.tutor,
        status: 'scheduled', attendance: 'unmarked', note: '', source: 'twn-schedule'
      });
      ids.add(id);
    }
  }
  state.twnScheduleVersion = TWN_SCHEDULE_VERSION;
  return state;
}
