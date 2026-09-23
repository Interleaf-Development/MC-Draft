import { centre, WEEK, seed, seedTeacherSchedules, seedBusyAfternoons } from './model.js';
import { twnRoster } from './twn-roster.js';

export const DEMO_SCHEDULE_SOURCE = 'demo-schedule-repeat';
export const DEMO_SCHEDULE_END = '2026-12-31';
const VERSION = 1;
const fields = ['studentId', 'date', 'start', 'duration', 'tutor'];
const allowedKeys = new Set(['id', ...fields, 'status', 'attendance', 'note', 'source', 'demoTemplate']);
const addDays = (date, count) => new Date(Date.parse(date + 'T00:00:00Z') + count * 86400000).toISOString().slice(0, 10);
const templateOf = slot => Object.fromEntries(fields.map(key => [key, slot[key]]));
const lessonId = (slot, branchCode) => ['demo-repeat-v1', branchCode, slot.studentId, slot.tutor, slot.date, slot.start, slot.duration].join('-');

export function createDemoLesson(slot, branchCode = centre.code) {
  const template = templateOf(slot);
  return { id: lessonId(template, branchCode), ...template, status: 'scheduled', attendance: 'unmarked', note: '', source: DEMO_SCHEDULE_SOURCE, demoTemplate: { ...template } };
}

// A moved, marked, linked or otherwise edited lesson must never be treated as
// disposable sample data. Callers also check external references to this ID.
export function isUntouchedDemoLesson(booking) {
  return booking?.source === DEMO_SCHEDULE_SOURCE && booking.status === 'scheduled'
    && booking.attendance === 'unmarked' && booking.note === ''
    && booking.demoTemplate && Object.keys(booking.demoTemplate).length === fields.length
    && fields.every(key => booking[key] === booking.demoTemplate[key])
    && Object.keys(booking).every(key => allowedKeys.has(key))
    && booking.id === lessonId(booking.demoTemplate, centre.code);
}

let weeklyTemplates;
function sourceWeek() {
  if (weeklyTemplates) return weeklyTemplates;
  if (centre.code === 'TWN') {
    weeklyTemplates = twnRoster.flatMap(student => student.sessions.map(slot => ({ studentId: student.id, date: WEEK[slot.weekday - 1], start: slot.start, duration: slot.duration, tutor: slot.tutor })));
  } else {
    const baseline = seed();
    seedTeacherSchedules(baseline);
    seedBusyAfternoons(baseline);
    weeklyTemplates = baseline.bookings.filter(booking => WEEK.includes(booking.date) && booking.status === 'scheduled' && !booking.sourceId && !booking.caseId).map(templateOf);
  }
  return weeklyTemplates;
}

// Repeat the source timetable, not saved attendance, one-off moves or leave.
// Install once: reloads must not recreate deleted lessons or undo local edits.
export function normalizeDemoSchedule(state) {
  if (state.demoScheduleVersion >= VERSION) return state;
  if (centre.code === 'TWN' && !state.twnScheduleVersion) return state;
  state.bookings ??= [];
  const ids = new Set(state.bookings.map(booking => booking.id));
  const byStudentDate = new Map();
  for (const booking of state.bookings) {
    const key = booking.studentId + '|' + booking.date;
    if (!byStudentDate.has(key)) byStudentDate.set(key, []);
    byStudentDate.get(key).push(booking);
  }
  for (const template of sourceWeek()) {
    // Existing saved recurring changes remain authoritative.
    if (state.regularSchedules?.[template.studentId]) continue;
    for (let date = addDays(template.date, 7); date <= DEMO_SCHEDULE_END; date = addDays(date, 7)) {
      const booking = createDemoLesson({ ...template, date });
      const key = booking.studentId + '|' + date, recorded = byStudentDate.get(key) || [];
      if (ids.has(booking.id) || recorded.some(item => item.start < booking.start + booking.duration && booking.start < item.start + item.duration)) continue;
      state.bookings.push(booking);
      ids.add(booking.id);
      recorded.push(booking);
      byStudentDate.set(key, recorded);
    }
  }
  state.demoScheduleVersion = VERSION;
  state.demoScheduleThrough = DEMO_SCHEDULE_END;
  return state;
}
