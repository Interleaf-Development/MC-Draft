import { TODAY, WEEK, tutors, students, activeBooking, validateSlot, uid, clone, record, centre, resolveRegularScheduleRule } from './model.js';

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const monthNumbers = new Map(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((name, index) => [name.toLowerCase(), index + 1]));
const iso = date => date.toISOString().slice(0, 10);
const addDays = (date, days) => iso(new Date(Date.parse(date + 'T00:00:00Z') + days * 86400000));
const weekdayOf = date => (new Date(date + 'T00:00:00Z').getUTCDay() + 6) % 7 + 1;
const validDate = date => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date + 'T00:00:00Z')) && iso(new Date(date + 'T00:00:00Z')) === date;
const key = lesson => [lesson.date, lesson.start, lesson.duration, lesson.tutor].join('|');
const sortLessons = lessons => lessons.sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);
const fields = lesson => ({ date: lesson.date, start: lesson.start, duration: lesson.duration, tutor: lesson.tutor, ...(lesson.bookingId ? { bookingId: lesson.bookingId } : {}), ...(lesson.status ? { status: lesson.status } : {}) });

function requireStudent(studentId) {
  const student = students.find(item => item.id === studentId);
  if (!student) throw new Error('Choose a valid student.');
  return student;
}

export function getRegularSchedule(state, studentId, asOf) {
  const student = requireStudent(studentId);
  if (asOf !== undefined && !validDate(asOf)) throw new Error('Choose a valid date.');
  const saved = resolveRegularScheduleRule(state.regularSchedules?.[studentId], asOf);
  if (saved) return clone(saved);
  const [hour, minute] = (student.regular.split(' · ')[1] || '').split(':').map(Number);
  const first = state.bookings.find(booking => booking.studentId === studentId && !booking.sourceId && activeBooking(booking));
  const weekday = weekdays.indexOf(student.day) + 1 || (first ? weekdayOf(first.date) : 0);
  if (!weekday) throw new Error('Set a regular lesson before changing this student’s timetable.');
  return { weekday, start: Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : first?.start || 960, duration: first?.duration || 60, tutor: student.tutor || first?.tutor };
}

function invoicePeriod(invoice) {
  if (validDate(invoice.periodStart) && validDate(invoice.periodEnd) && invoice.periodStart <= invoice.periodEnd) return { start: invoice.periodStart, end: invoice.periodEnd, label: invoice.period || invoice.periodStart + ' – ' + invoice.periodEnd };
  const match = String(invoice.period || '').match(/^([A-Za-z]+)\s*[–—-]\s*([A-Za-z]+)\s+(\d{4})(?:\s*\/\s*(\d{4}))?$/);
  if (!match) return null;
  const firstMonth = monthNumbers.get(match[1].slice(0, 3).toLowerCase()), lastMonth = monthNumbers.get(match[2].slice(0, 3).toLowerCase());
  if (!firstMonth || !lastMonth) return null;
  const firstYear = Number(match[3]), lastYear = Number(match[4] || firstYear + (lastMonth < firstMonth ? 1 : 0));
  const start = iso(new Date(Date.UTC(firstYear, firstMonth - 1, 1))), end = iso(new Date(Date.UTC(lastYear, lastMonth, 0)));
  if (end < start || Date.parse(end) - Date.parse(start) > 366 * 86400000) return null;
  return { start, end, label: invoice.period };
}

export function getSchedulePeriods(state, studentId) {
  requireStudent(studentId);
  return state.invoices.filter(invoice => invoice.studentId === studentId).flatMap(invoice => {
    const receipt = state.receipts.find(item => item.invoiceId === invoice.id && item.id === invoice.receiptId);
    const period = invoicePeriod(invoice);
    return receipt && period ? [{ id: invoice.id, ...period, receiptId: receipt.id }] : [];
  }).sort((a, b) => a.start.localeCompare(b.start));
}

function closureOn(state, date) {
  return [...(state.centreHolidays || []), ...(state.holidays || []), ...(state.closures || [])].find(item => {
    if (typeof item === 'string') return item === date;
    if (!item || item.closed === false || item.status === 'cancelled') return false;
    return item.date === date || validDate(item.start || item.startDate) && validDate(item.end || item.endDate) && date >= (item.start || item.startDate) && date <= (item.end || item.endDate);
  });
}
function datesForRule(state, period, rule, start = period.start) {
  const lessons = [];
  for (let date = start > period.start ? start : period.start; date <= period.end; date = addDays(date, 1)) {
    if (weekdayOf(date) === rule.weekday && !closureOn(state, date)) lessons.push({ date, start: rule.start, duration: rule.duration, tutor: rule.tutor });
  }
  return lessons;
}
function invoicePlan(state, invoice, period, rule) {
  const saved = invoice.lessonPlan;
  const explicit = Array.isArray(saved) ? saved : saved?.lessonDates || saved?.lessons || invoice.lessonDates;
  const makeUpLessonCount = Number(saved?.makeUpLessonCount || 0);
  const expected = Number(saved?.lessonCount ?? invoice.lessonCount ?? String(invoice.description || '').match(/(\d+)\s+lessons?\b/i)?.[1] ?? 8);
  const scheduled = [];
  if (!explicit) {
    for (let date = period.start; date <= period.end; date = addDays(date, 1)) {
      const datedRule = getRegularSchedule(state, invoice.studentId, date);
      if (weekdayOf(date) === datedRule.weekday && !closureOn(state, date)) scheduled.push({ date, start: datedRule.start, duration: datedRule.duration, tutor: datedRule.tutor });
    }
  }
  const dates = explicit ? explicit.map(item => {
    const date = typeof item === 'string' ? item : item.date, datedRule = validDate(date) ? getRegularSchedule(state, invoice.studentId, date) : rule;
    return typeof item === 'string' ? { date, start: datedRule.start, duration: datedRule.duration, tutor: datedRule.tutor } : { ...item, duration: item.duration || datedRule.duration, tutor: item.tutor || datedRule.tutor, start: item.start ?? datedRule.start };
  }) : scheduled.slice(0, Math.max(0, expected - makeUpLessonCount));
  const lessons = sortLessons(dates.map(item => {
    const existing = state.bookings.find(booking => booking.studentId === invoice.studentId && (item.bookingId ? booking.id === item.bookingId : !booking.sourceId && key(booking) === key(item)));
    return { ...fields(item), ...(existing ? { bookingId: existing.id, status: existing.status } : {}) };
  }));
  return { lessons, makeUpLessonCount, expected, explicit: Boolean(explicit) };
}

// The demo calendar only seeds a representative week. Paid invoice plans supply
// the remaining dates; recorded lessons and their make-up chains supply reality.
export function getRemainingStudentLessons(state, studentId, asOf = TODAY) {
  requireStudent(studentId);
  if (!validDate(asOf)) throw new Error('Choose a valid date.');
  const periods = getSchedulePeriods(state, studentId).filter(period => {
    const receipt = state.receipts.find(item => item.id === period.receiptId);
    return !receipt.issuedDate || receipt.issuedDate <= asOf;
  });
  if (!periods.length) return { lessons: [], pendingMinutes: 0, periodLabel: null, hasPaidPeriod: false };
  const rule = getRegularSchedule(state, studentId), bookings = state.bookings.filter(item => item.studentId === studentId);
  const makeups = (state.makeups || []).filter(item => item.studentId === studentId);
  const bookingById = new Map(bookings.map(item => [item.id, item]));
  const relatedBookings = new Set(), relatedCases = new Set(), planned = [], labels = new Set();
  for (const period of periods) {
    const invoice = state.invoices.find(item => item.id === period.id), plan = invoicePlan(state, invoice, period, rule);
    if (period.end >= asOf) labels.add(period.label);
    for (const lesson of plan.lessons) {
      if (!validDate(lesson.date) || lesson.date < period.start || lesson.date > period.end) continue;
      let booking = bookingById.get(lesson.bookingId);
      // Unamended fixture dates sometimes use a different time from the directory
      // rule. A unique recorded original on that date still consumes that lesson.
      if (!booking && !plan.explicit) {
        const sameDate = bookings.filter(item => !item.sourceId && item.date === lesson.date);
        if (sameDate.length === 1) booking = sameDate[0];
      }
      if (booking) relatedBookings.add(booking.id);
      else if (lesson.date >= asOf) planned.push(fields(lesson));
    }
    for (const makeup of makeups) {
      if (makeup.invoiceId === invoice.id || !makeup.invoiceId && makeup.period === period.label) relatedCases.add(makeup.id);
    }
  }
  // Cases can be split into several shorter lessons and a replacement can itself
  // be missed. Follow every generation, retaining each entitlement only once.
  let changed = true;
  while (changed) {
    changed = false;
    for (const makeup of makeups) {
      if (!relatedCases.has(makeup.id) && (relatedBookings.has(makeup.sourceId) || relatedCases.has(makeup.parentCaseId))) {
        relatedCases.add(makeup.id); changed = true;
      }
    }
    for (const booking of bookings) {
      if (!relatedBookings.has(booking.id) && (relatedBookings.has(booking.sourceId) || relatedCases.has(booking.caseId))) {
        relatedBookings.add(booking.id); changed = true;
      }
    }
  }
  const lessons = new Map();
  for (const lesson of planned) {
    if (!['present', 'absent'].includes(lesson.attendance) && activeBooking(lesson)) lessons.set(key(lesson), lesson);
  }
  for (const booking of bookings.filter(item => relatedBookings.has(item.id))) {
    if (!validDate(booking.date) || booking.date < asOf || !activeBooking(booking) || ['present', 'absent'].includes(booking.attendance)) continue;
    lessons.set(key(booking), { ...fields(booking), bookingId: booking.id });
    const makeup = makeups.find(item => item.id === booking.caseId);
    if (makeup?.period) labels.add(makeup.period);
  }
  const pendingMinutes = makeups.filter(item => relatedCases.has(item.id) && (!item.expiry || item.expiry >= asOf)).reduce((total, makeup) => {
    const remaining = Math.max(0, Number(makeup.minutes || 0) - Number(makeup.used || 0));
    if (remaining && makeup.period) labels.add(makeup.period);
    return total + remaining;
  }, 0);
  return { lessons: sortLessons([...lessons.values()]), pendingMinutes, periodLabel: [...labels].join(' · ') || null, hasPaidPeriod: periods.some(period => period.end >= asOf) || lessons.size > 0 || pendingMinutes > 0 };
}
function fingerprint(state, input) {
  const value = JSON.stringify({ input, bookings: state.bookings, invoices: state.invoices.filter(item => item.studentId === input.studentId), receipts: state.receipts.filter(item => item.studentId === input.studentId), staff: state.staff, staffLeave: state.staffLeave, makeups: state.makeups.filter(item => item.studentId === input.studentId), regularSchedules: state.regularSchedules, centreHolidays: state.centreHolidays, holidays: state.holidays, closures: state.closures });
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  return 'schedule-' + (hash >>> 0).toString(16) + '-' + value.length;
}
function bookingException(booking) {
  return booking && (booking.sourceId || booking.caseId || booking.attendance === 'present' || ['absent', 'moved', 'cancelled'].includes(booking.status));
}
function futureUnlinkedBookings(state, input, period) {
  return state.bookings.filter(booking => booking.studentId === input.studentId && booking.date >= TODAY && booking.date <= period.end && booking.date >= period.start && activeBooking(booking) && !bookingException(booking));
}
function untouchedFixture(booking) {
  if (booking.note || booking.attendance !== 'unmarked' || booking.duration !== 60 || !WEEK.includes(booking.date)) return false;
  if (booking.id === 'afternoon-v1-' + booking.date + '-' + booking.tutor + '-' + booking.start + '-' + booking.studentId || booking.id === 'schedule-v1-' + booking.studentId || booking.id === 'sunday-v1-' + booking.studentId) return true;
  if (!booking.id.startsWith('lesson-') || booking.tutor !== tutors[0].id) return false;
  const day = WEEK.indexOf(booking.date);
  const examples = day === 2 ? [['chloe', 960], ['ethan', 960], ['lucas', 960], ['emma', 960], ['oliver', 960], ['sophie', 960], ['oliver', 1020]]
    : day >= 0 && day < 6 ? [...(day % 2 === 0 ? ['chloe', 'emma', 'lucas'] : ['ethan', 'sophie', 'oliver']).map(id => [id, 960]), [day % 2 ? 'emma' : 'ethan', 1020], ...(day === 3 ? [['lucas', 900]] : [])] : [];
  return examples.some(([id, start]) => booking.studentId === id && booking.start === start);
}
function belongsToPlan(booking, beforeLessons, oldRule) {
  return beforeLessons.some(lesson => lesson.bookingId === booking.id || key(lesson) === key(booking)) || weekdayOf(booking.date) === oldRule.weekday && booking.start === oldRule.start && booking.duration === oldRule.duration && booking.tutor === oldRule.tutor;
}
function blocking(type, reason, date = null) { return { type, reason, date, blocking: true }; }
const sameTimetable = (a, b) => a.weekday === b.weekday && a.start === b.start && a.duration === b.duration && a.tutor === b.tutor;

function declineCandidates(preview) {
  return preview.proposedLessons.filter(lesson => lesson.date >= preview.input.effectiveDate && (!preview.input.endDate || lesson.date <= preview.input.endDate) && !preview.preservedLessons.some(item => key(item) === key(lesson))).slice(-Math.max(0, preview.delta));
}

export function previewRegularScheduleChange(state, requested) {
  requireStudent(requested.studentId);
  const periodEntry = getSchedulePeriods(state, requested.studentId).find(period => period.id === requested.invoiceId);
  if (!periodEntry) throw new Error('Choose a paid period with an issued receipt.');
  const { start: periodStart, end, label } = periodEntry, period = { start: periodStart, end, label };
  const oldRule = getRegularSchedule(state, requested.studentId, validDate(requested.effectiveDate) ? requested.effectiveDate : undefined);
  const input = { studentId: requested.studentId, invoiceId: requested.invoiceId, effectiveDate: requested.effectiveDate, ...(requested.endDate !== undefined && requested.endDate !== null && requested.endDate !== '' ? { endDate: requested.endDate } : {}), weekday: Number(requested.weekday), start: Number(requested.start), tutor: requested.tutor || oldRule.tutor };
  if (!validDate(input.effectiveDate) || input.effectiveDate < TODAY || input.effectiveDate < period.start || input.effectiveDate > period.end) throw new Error('Choose an effective date within this paid period, on or after today.');
  const temporary = input.endDate !== undefined;
  if (temporary && (!validDate(input.endDate) || input.endDate < input.effectiveDate || input.endDate > period.end)) throw new Error('Choose a final date on or after the effective date and within this paid period.');
  if (!Number.isInteger(input.weekday) || input.weekday < 1 || input.weekday > 7 || !Number.isInteger(input.start)) throw new Error('Choose a valid weekday and lesson time.');
  const latestRule = state.regularSchedules?.[input.studentId];
  if (latestRule?.effectiveDate && input.effectiveDate < latestRule.effectiveDate) throw new Error('This change must start on or after the last regular schedule change.');
  const newRule = { weekday: input.weekday, start: input.start, duration: oldRule.duration, tutor: input.tutor, effectiveDate: input.effectiveDate, ...(temporary ? { endDate: input.endDate, temporary: true } : {}) };
  const invoice = state.invoices.find(item => item.id === input.invoiceId), plan = invoicePlan(state, invoice, period, oldRule), beforeLessons = plan.lessons;
  const conflicts = [];
  if (!Number.isInteger(plan.expected) || plan.expected < 0 || !Number.isInteger(plan.makeUpLessonCount) || plan.makeUpLessonCount < 0 || beforeLessons.length + plan.makeUpLessonCount !== plan.expected) conflicts.push(blocking('plan', 'The receipt lesson count cannot be mapped to this calendar. Record its exact lesson dates before changing the regular schedule.'));
  if (beforeLessons.some(lesson => !validDate(lesson.date) || lesson.date < period.start || lesson.date > period.end || !Number.isFinite(lesson.start) || ![30, 60, 90].includes(lesson.duration)) || new Set(beforeLessons.map(key)).size !== beforeLessons.length) conflicts.push(blocking('plan', 'The existing invoice lesson plan contains invalid or duplicate dates.'));
  const inRange = lesson => lesson.date >= input.effectiveDate && (!temporary || lesson.date <= input.endDate);
  const preserved = beforeLessons.filter(lesson => !inRange(lesson) || bookingException(state.bookings.find(booking => booking.id === lesson.bookingId)));
  let proposed = datesForRule(state, { ...period, end: input.endDate || period.end }, newRule, input.effectiveDate);
  // A recorded absence, attended lesson or one-off move keeps its entitlement and
  // history. Replace its corresponding new-weekday occurrence rather than adding
  // a second lesson just because the permanent weekday changes.
  for (const lesson of preserved.filter(inRange)) {
    const weekStart = addDays(lesson.date, 1 - weekdayOf(lesson.date)), targetDate = addDays(weekStart, newRule.weekday - 1);
    const index = proposed.findIndex(item => item.date === targetDate);
    if (index >= 0) proposed.splice(index, 1);
  }
  proposed = sortLessons([...preserved.map(fields), ...proposed]);
  let sameRule = true;
  for (let date = input.effectiveDate; date <= (input.endDate || period.end); date = addDays(date, 1)) {
    if (!sameTimetable(getRegularSchedule(state, input.studentId, date), newRule)) { sameRule = false; break; }
  }
  // A permanent request also supersedes any temporary rule that ends beyond the
  // receipt's range; a rule matching only today's override is still a change.
  if (!temporary && latestRule?.endDate) sameRule = false;
  if (sameRule) proposed = beforeLessons.map(fields);
  const candidates = futureUnlinkedBookings(state, input, period).filter(booking => !temporary || inRange(booking));
  const classified = candidates.filter(booking => belongsToPlan(booking, beforeLessons, oldRule) || untouchedFixture(booking));
  const editable = classified.filter(booking => !preserved.some(lesson => lesson.bookingId === booking.id)), ignoredIds = editable.map(booking => booking.id);
  for (const booking of candidates.filter(item => !classified.includes(item))) conflicts.push(blocking('unclassified-booking', 'This student has a separate lesson on ' + booking.date + ' outside the receipt’s regular timetable. Review that booking before changing the regular schedule.', booking.date));
  const trial = { ...state, bookings: state.bookings.filter(booking => !ignoredIds.includes(booking.id)) };
  for (const lesson of proposed.filter(item => item.date >= TODAY)) {
    const explicitlyPreserved = lesson.bookingId && preserved.some(item => item.bookingId === lesson.bookingId);
    const existing = trial.bookings.find(booking => booking.studentId === input.studentId && (explicitlyPreserved ? booking.id === lesson.bookingId : activeBooking(booking) && key(booking) === key(lesson)));
    if (existing && explicitlyPreserved && (activeBooking(existing) || bookingException(existing))) continue;
    const error = closureOn(state, lesson.date) ? 'The centre is closed on this date.' : validateSlot(trial, { ...lesson, studentId: input.studentId });
    if (error) conflicts.push(blocking('schedule', error, lesson.date));
    trial.bookings.push({ ...lesson, studentId: input.studentId, status: 'scheduled' });
  }
  if (!sameRule) {
    const laterPaid = getSchedulePeriods(state, input.studentId).find(other => other.id !== input.invoiceId && other.end >= input.effectiveDate && (!temporary || other.start <= input.endDate));
    const laterBooking = !temporary && state.bookings.find(booking => booking.studentId === input.studentId && booking.date > period.end && activeBooking(booking) && !bookingException(booking));
    if (laterPaid || laterBooking) conflicts.push(blocking('future-period', temporary ? 'This date range overlaps another future paid period. Review that period together before applying this change.' : 'This student has another future paid period or regular lesson after ' + period.end + '. Review that period together before applying a permanent change.', laterPaid?.start || laterBooking.date));
  }
  const beforeKeys = new Set(beforeLessons.map(key)), afterKeys = new Set(proposed.map(key));
  const resumeLesson = temporary ? beforeLessons.find(lesson => lesson.date > input.endDate && !bookingException(state.bookings.find(booking => booking.id === lesson.bookingId))) : null;
  const resumeDate = temporary ? resumeLesson?.date || addDays(input.endDate, 1) : null;
  const resumeRule = temporary ? getRegularSchedule(state, input.studentId, resumeDate) : null;
  const preview = { input, temporary, resumeDate, resumeRule, resumeLessonDate: resumeLesson?.date || null, invoiceId: invoice.id, receiptId: periodEntry.receiptId, period, oldRule, newRule, beforeLessons, proposedLessons: proposed, beforeCount: beforeLessons.length, proposedCount: proposed.length, delta: proposed.length - beforeLessons.length, makeUpLessonCount: plan.makeUpLessonCount, beforeTotalCount: beforeLessons.length + plan.makeUpLessonCount, proposedTotalCount: proposed.length + plan.makeUpLessonCount, removedLessons: beforeLessons.filter(lesson => !afterKeys.has(key(lesson))), addedLessons: proposed.filter(lesson => !beforeKeys.has(key(lesson))), preservedLessons: preserved, editableBookingIds: ignoredIds, conflicts, unchanged: sameRule, fingerprint: fingerprint(state, input) };
  preview.excludedDateCandidates = preview.delta > 0 ? declineCandidates(preview) : [];
  return preview;
}

export function applyRegularScheduleChange(state, input, decisions = {}) {
  const preview = previewRegularScheduleChange(state, input);
  if (!decisions.fingerprint || decisions.fingerprint !== preview.fingerprint) throw new Error('The timetable or billing record changed. Preview the change again before confirming.');
  if (preview.unchanged) throw new Error('Choose a different regular weekday, time or teacher.');
  if (preview.delta > 0 && !['allow', 'decline'].includes(decisions.extra)) throw new Error('Choose whether to allow the extra lesson.');
  if (preview.delta < 0 && !['credit', 'decline'].includes(decisions.shortfall)) throw new Error('Choose whether to give a make-up credit for the missing lesson.');
  const accepted = preview.proposedLessons.map(fields), excludedDates = [];
  if (preview.delta > 0 && decisions.extra === 'decline') {
    if (preview.excludedDateCandidates.length !== preview.delta) throw new Error('The extra lesson cannot be removed without changing recorded attendance or leave.');
    for (const candidate of preview.excludedDateCandidates) {
      const index = accepted.findIndex(lesson => key(lesson) === key(candidate));
      excludedDates.push(candidate.date); accepted.splice(index, 1);
    }
  }
  const structural = preview.conflicts.find(item => item.type !== 'schedule');
  if (structural) throw new Error(structural.reason);
  const trial = clone(state), invoice = trial.invoices.find(item => item.id === preview.invoiceId), receipt = trial.receipts.find(item => item.id === preview.receiptId);
  const acceptedKeys = new Set(accepted.map(key));
  for (const booking of trial.bookings.filter(item => preview.editableBookingIds.includes(item.id))) {
    if (!acceptedKeys.has(key(booking))) Object.assign(booking, { status: 'cancelled', cancellationReason: (preview.temporary ? 'Temporary' : 'Permanent') + ' regular schedule change' });
  }
  const changeId = uid('regular-change'), created = [];
  for (const lesson of accepted.filter(item => item.date >= TODAY)) {
    const explicitlyPreserved = lesson.bookingId && preview.preservedLessons.some(item => item.bookingId === lesson.bookingId);
    const recorded = explicitlyPreserved && trial.bookings.find(item => item.studentId === preview.input.studentId && item.id === lesson.bookingId);
    if (recorded && (activeBooking(recorded) || bookingException(recorded))) continue;
    const existing = trial.bookings.find(item => item.studentId === preview.input.studentId && activeBooking(item) && !bookingException(item) && key(item) === key(lesson));
    const booking = existing || { id: uid('lesson'), ...fields(lesson), studentId: preview.input.studentId, status: 'scheduled', attendance: 'unmarked', note: '' };
    const error = closureOn(trial, lesson.date) ? 'The centre is closed on this date.' : validateSlot(trial, booking, existing ? [existing.id] : []);
    if (error) throw new Error(lesson.date + ': ' + error);
    Object.assign(booking, { invoiceId: invoice.id, regularScheduleChangeId: changeId });
    if (!existing) { trial.bookings.push(booking); created.push(booking.id); }
    lesson.bookingId = booking.id;
  }
  const shortfall = preview.delta < 0 && decisions.shortfall === 'credit' ? -preview.delta : 0;
  const makeUpLessonCount = preview.makeUpLessonCount + shortfall;
  const lessonCount = accepted.length + makeUpLessonCount;
  const kind = preview.temporary ? 'temporary' : 'permanent';
  const reason = (preview.delta > 0 ? decisions.extra === 'allow' ? 'Extra lesson allowed after a ' + kind + ' regular schedule change; no additional charge.' : 'Extra lesson declined; final surplus date excluded.'
    : preview.delta < 0 ? shortfall ? 'Missing lesson retained as a make-up credit after a ' + kind + ' regular schedule change.' : 'Missing lesson accepted without a make-up credit.' : (preview.temporary ? 'Temporary' : 'Permanent') + ' regular schedule changed with the same lesson count.') + (preview.temporary ? ' Temporary dates: ' + preview.input.effectiveDate + ' through ' + preview.input.endDate + ' inclusive; previous timetable resumes after the final date.' : '');
  let makeup;
  if (shortfall) {
    const sourceDate = preview.removedLessons.at(-1)?.date || preview.input.effectiveDate;
    makeup = { id: uid('makeup'), kind: 'schedule-shortfall', studentId: preview.input.studentId, scheduleChangeId: changeId, sourceDate, minutes: shortfall * preview.oldRule.duration, duration: preview.oldRule.duration, used: 0, expiry: preview.period.end, originalExpiry: preview.period.end, period: preview.period.label, invoiceId: invoice.id, reason, preferredDates: [], preferencesNote: '', followUpStatus: 'pending', countsTowardRescheduleLimit: false };
    trial.makeups.push(makeup);
  }
  receipt.originalDocument ??= { description: invoice.description, period: invoice.period, lessonCount: preview.beforeTotalCount, lessonDates: clone(preview.beforeLessons), makeUpLessonCount: preview.makeUpLessonCount, lessonPlan: { lessonCount: preview.beforeTotalCount, lessonDates: clone(preview.beforeLessons), makeUpLessonCount: preview.makeUpLessonCount } };
  const revisions = receipt.revisions || [];
  const temporaryDetails = preview.temporary ? { temporary: true, endDate: preview.input.endDate, resumeDate: preview.resumeDate, resumeRule: clone(preview.resumeRule) } : {};
  const revision = { id: receipt.id + '-A' + (revisions.length + 1), receiptDate: receipt.issuedDate, revisedAt: TODAY, effectiveDate: preview.input.effectiveDate, ...temporaryDetails, lessonCount, lessonDates: clone(accepted), makeUpLessonCount, description: 'Regular programme · ' + lessonCount + ' lessons', reason, scheduleChangeId: changeId, decisions: { extra: preview.delta > 0 ? decisions.extra : null, shortfall: preview.delta < 0 ? decisions.shortfall : null }, excludedDates: [...excludedDates] };
  receipt.revisions = [...revisions, revision]; receipt.activeRevisionId = revision.id;
  invoice.lessonPlan = { lessonCount, lessonDates: clone(accepted), makeUpLessonCount };
  invoice.lessonCount = lessonCount; invoice.description = revision.description;
  const change = { id: changeId, studentId: preview.input.studentId, invoiceId: invoice.id, receiptId: receipt.id, revisionId: revision.id, createdAt: TODAY, effectiveDate: preview.input.effectiveDate, ...temporaryDetails, oldRule: clone(preview.oldRule), newRule: clone(preview.newRule), beforeCount: preview.beforeCount, proposedCount: preview.proposedCount, finalCount: accepted.length, lessonCount, delta: preview.delta, excludedDates, decisions: revision.decisions, reason, createdBookingIds: created, ...(makeup ? { makeupId: makeup.id } : {}) };
  trial.regularScheduleChanges = [...(trial.regularScheduleChanges || []), change];
  trial.regularSchedules = { ...trial.regularSchedules, [preview.input.studentId]: { ...preview.newRule, invoiceId: invoice.id, changeId, previousRule: clone(state.regularSchedules?.[preview.input.studentId] || preview.oldRule) } };
  trial.audit ??= [];
  record(trial, requireStudent(preview.input.studentId).name + ': regular timetable ' + preview.beforeCount + ' → ' + preview.proposedCount + ' lessons. ' + reason + ' Receipt amendment ' + revision.id + ' retains receipt date ' + receipt.issuedDate + '.', centre.manager);
  Object.assign(state, trial);
  return { change, receipt, revision, ...(makeup ? { makeup } : {}), excludedDates };
}
