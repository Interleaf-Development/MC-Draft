import { TODAY, centre, allStudents, uid, validateSlot, record, resolveRegularScheduleRule } from './model.js';

const DAY = 86400000;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
function validDate(value) {
  return typeof value === 'string' && datePattern.test(value) && Number.isFinite(Date.parse(value)) && new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value;
}
function requireDate(value) {
  if (!validDate(value)) throw new Error('Choose a valid date.');
  return value;
}
const addDays = (date, days) => new Date(Date.parse(requireDate(date) + 'T12:00:00Z') + days * DAY).toISOString().slice(0, 10);
const weekday = date => (new Date(requireDate(date) + 'T12:00:00Z').getUTCDay() + 6) % 7 + 1;
const monday = date => addDays(date, 1 - weekday(date));
const actionDate = now => requireDate(String(now || TODAY).slice(0, 10));
function amountValue(amount) {
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(Math.round(amount * 100)) || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001) throw new Error('Enter a positive tuition amount with at most two decimal places.');
  return amount;
}
function appendAudit(state, text) { state.audit ??= []; record(state, text, 'Centre billing'); }
function invoiceIdFor(state, requested) {
  if (!state.invoices?.some(invoice => invoice.id === requested)) return requested;
  let suffix = 2;
  while (state.invoices.some(invoice => invoice.id === requested + '-' + suffix)) suffix++;
  return requested + '-' + suffix;
}

const monthDate = (date, offset = 0, day = 1) => new Date(Date.UTC(Number(requireDate(date).slice(0, 4)), Number(date.slice(5, 7)) - 1 + offset, day, 12)).toISOString().slice(0, 10);
const PACKAGE_LESSONS = 8;
const BILLING_VERSION = 2;

/** A student's own pair of calendar months. Closures never extend its end date.
 * The old export name remains for callers and saved-demo compatibility. */
export function buildTeachingCycle({ startDate, sessions = [{ weekday: 3 }], closedWeeks = [], closedDates = [], sessionsOnDate, lessonsFrom }) {
  requireDate(startDate);
  if (!Array.isArray(sessions) || !sessions.length || sessions.some(slot => !Number.isInteger(slot.weekday) || slot.weekday < 1 || slot.weekday > 7)) throw new Error('Choose a regular teaching day.');
  if (!Array.isArray(closedWeeks) || !Array.isArray(closedDates)) throw new Error('Choose valid closure dates.');
  const periodStart = monthDate(startDate), endDate = monthDate(periodStart, 2, 0);
  const from = lessonsFrom ? requireDate(lessonsFrom) : periodStart;
  if (from < periodStart || from > endDate) throw new Error('The first lesson must be within the tuition period.');
  const closed = new Set(closedWeeks.map(date => monday(requireDate(date)))), datesClosed = new Set(closedDates.map(requireDate));
  const resolvedLessons = [], skippedWeeks = new Set();
  for (let date = from; date <= endDate; date = addDays(date, 1)) {
    if (closed.has(monday(date))) { skippedWeeks.add(monday(date)); continue; }
    if (datesClosed.has(date)) continue;
    const datedSessions = sessionsOnDate ? sessionsOnDate(date) : sessions;
    for (const slot of datedSessions.filter(slot => slot.weekday === weekday(date))) resolvedLessons.push({ date, start: slot.start, duration: slot.duration, tutor: slot.tutor });
  }
  resolvedLessons.sort((a, b) => a.date.localeCompare(b.date) || (a.start || 0) - (b.start || 0));
  const lessonDates = [...new Set(resolvedLessons.map(lesson => lesson.date))];
  return { startDate: periodStart, periodStart, endDate, billingMonths: 2, packageLessonCount: PACKAGE_LESSONS,
    firstLessonDate: lessonDates[0] || null, lastLessonDate: lessonDates.at(-1) || null, lessonDates, resolvedLessons,
    skippedWeeks: [...skippedWeeks], lessonsFrom: from, issueDate: monthDate(periodStart, -1, 20), dueDate: monthDate(periodStart, 0, 20),
    nextInvoiceOn: monthDate(periodStart, 1, 20), nextCycleStart: monthDate(periodStart, 2) };
}

export function teachingCycleLabel(cycle) {
  const first = cycle.periodStart || cycle.startDate, last = cycle.endDate;
  const label = date => new Date(date + 'T12:00:00Z').toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }).replace('Sept', 'Sep');
  const firstYear = first.slice(0, 4), lastYear = last.slice(0, 4);
  return `${label(first)}–${label(last)} ${firstYear}${firstYear !== lastYear ? '/' + lastYear : ''}`;
}

function cycleLessonPlan(cycle) {
  const lessonDates = structuredClone(cycle.resolvedLessons);
  return { lessonCount: lessonDates.length, lessonPlan: { lessonCount: lessonDates.length, lessonDates, makeUpLessonCount: 0 } };
}

function invoiceCycleFields(cycle, chargeType = 'recurring') {
  return { period: teachingCycleLabel(cycle), periodStart: cycle.startDate, periodEnd: cycle.endDate,
    billingMonth: cycle.startDate.slice(0, 7), due: cycle.dueDate, firstLessonDate: cycle.firstLessonDate,
    description: chargeType === 'first-tuition' ? 'First tuition · 8-lesson package' : 'Regular programme · 8 lessons',
    teachingCycle: structuredClone(cycle), billingMonths: 2, packageLessonCount: PACKAGE_LESSONS, ...cycleLessonPlan(cycle) };
}
function cycleInvoice(state, { id, studentId, cycle, amount, issued = cycle.issueDate, chargeType = 'recurring', sessions: _sessions, ...extra }) {
  const invoice = { id: invoiceIdFor(state, id), studentId, chargeType, amount: amountValue(amount), ...invoiceCycleFields(cycle, chargeType),
    issued, proof: false, receiptId: null, ...extra };
  state.invoices ??= []; state.invoices.push(invoice);
  return invoice;
}

function closureOptions(state) {
  const closedDates = [...(state.billingCalendar?.closedDates || [])];
  for (const item of [...(state.centreHolidays || []), ...(state.holidays || []), ...(state.closures || [])]) {
    if (typeof item === 'string') { if (validDate(item)) closedDates.push(item); continue; }
    if (!item || item.closed === false || item.status === 'cancelled') continue;
    if (validDate(item.date)) closedDates.push(item.date);
    const start = item.start || item.startDate, end = item.end || item.endDate;
    if (validDate(start) && validDate(end) && start <= end) for (let date = start, days = 0; date <= end && days < 3660; date = addDays(date, 1), days++) closedDates.push(date);
  }
  return { closedWeeks: state.billingCalendar?.closedWeeks || [], closedDates };
}

export function createAssessmentInvoice(state, { studentId, assessmentDate, amount = 200, now, assessmentId, id } = {}) {
  if (!studentId) throw new Error('Choose a student.');
  requireDate(assessmentDate); amountValue(amount);
  const key = assessmentId || `${studentId}:${assessmentDate}`;
  const existing = (state.invoices || []).find(invoice => invoice.chargeType === 'assessment' && invoice.assessmentBookingId === key);
  if (existing) return { invoice: existing, createdInvoice: false };
  const issued = actionDate(now);
  const invoice = { id: invoiceIdFor(state, id || 'INV-ASSESS-' + studentId + '-' + assessmentDate.replaceAll('-', '')), studentId, chargeType: 'assessment', assessmentBookingId: key, assessmentDate,
    period: assessmentDate, periodStart: assessmentDate, billingMonth: assessmentDate.slice(0, 7), amount, issued, due: assessmentDate,
    description: 'Paid entrance assessment', proof: false, receiptId: null };
  state.invoices ??= []; state.invoices.push(invoice);
  appendAudit(state, `Created assessment invoice ${invoice.id} for ${assessmentDate}`);
  return { invoice, createdInvoice: true };
}

export function submitEnrolmentApplication(state, { studentId, parent, phone, firstLessonDate, start, tutor = centre.managerId, duration = 60, now } = {}) {
  if (!studentId || !String(parent || '').trim() || !String(phone || '').trim()) throw new Error('Add the parent’s name and contact number.');
  const submittedDate = actionDate(now);
  requireDate(firstLessonDate);
  if (firstLessonDate < submittedDate) throw new Error('Choose a first lesson on or after the application date.');
  if (state.assessment?.studentId === studentId && state.assessment.enrolled || state.enrolments?.[studentId]?.status === 'active') throw new Error('This student is already enrolled.');
  const existing = (state.enrolmentApplications || []).find(application => application.studentId === studentId && ['submitted', 'awaiting-payment'].includes(application.status));
  if (existing) return existing;
  const error = validateSlot(state, { studentId, date: firstLessonDate, start, tutor, duration });
  if (error) throw new Error(error);
  const application = { id: uid('application'), studentId, parent: parent.trim(), phone: phone.trim(), firstLessonDate, start, tutor, duration, submittedDate, status: 'submitted' };
  state.enrolmentApplications ??= []; state.enrolmentApplications.push(application);
  appendAudit(state, `Enrolment application submitted for ${studentId}; awaiting staff review`);
  return application;
}

export function reviewEnrolmentApplication(state, applicationId, { amount, regularAmount = amount, now, invoiceId } = {}) {
  const application = (state.enrolmentApplications || []).find(item => item.id === applicationId);
  if (!application) throw new Error('Enrolment application not found.');
  const existing = (state.invoices || []).find(invoice => invoice.enrolmentApplicationId === applicationId);
  if (existing) return { application, invoice: existing, createdInvoice: false };
  if (application.status !== 'submitted') throw new Error('Choose an application awaiting staff review.');
  amountValue(amount); amountValue(regularAmount);
  const sessions = [{ weekday: weekday(application.firstLessonDate), start: application.start, duration: application.duration, tutor: application.tutor }];
  const cycle = buildTeachingCycle({ startDate: application.firstLessonDate, lessonsFrom: application.firstLessonDate, sessions, ...closureOptions(state) });
  const invoice = cycleInvoice(state, { id: invoiceId || 'INV-FIRST-' + application.studentId, studentId: application.studentId, amount, cycle, sessions, issued: actionDate(now), chargeType: 'first-tuition', enrolmentApplicationId: application.id, due: addDays(application.firstLessonDate, -1) });
  Object.assign(application, { status: 'awaiting-payment', reviewedDate: actionDate(now), invoiceId: invoice.id, cycle: structuredClone(cycle) });
  state.tuitionPlans ??= {};
  state.tuitionPlans[application.studentId] = { studentId: application.studentId, status: 'awaiting-first-payment', amount: regularAmount, sessions, currentCycle: structuredClone(cycle), applicationId, currentInvoiceId: invoice.id };
  appendAudit(state, `Reviewed application ${application.id}; issued first tuition invoice ${invoice.id}`);
  return { application, invoice, createdInvoice: true };
}

/** Validate before issuing a receipt so a conflict cannot leave a half-approved payment. */
export function prepareFirstEnrolmentActivation(state, invoice) {
  if (invoice.chargeType !== 'first-tuition' || !invoice.enrolmentApplicationId) return null;
  const application = (state.enrolmentApplications || []).find(item => item.id === invoice.enrolmentApplicationId);
  if (!application) throw new Error('The enrolment application is missing. Restore it before approving payment.');
  if (application.status === 'active' || state.enrolments?.[invoice.studentId]?.status === 'active') return null;
  if (application.status !== 'awaiting-payment') throw new Error('Review the enrolment application before confirming payment.');
  const plan = state.tuitionPlans?.[invoice.studentId];
  if (!plan) throw new Error('The enrolment timetable is missing. Restore it before approving payment.');
  const trial = { ...state, bookings: [...(state.bookings || [])] }, bookings = [];
  for (const date of application.cycle.lessonDates) {
    const session = plan.sessions.find(slot => slot.weekday === weekday(date));
    const booking = { id: 'enrol-' + application.id + '-' + date, studentId: invoice.studentId, date, start: session.start, duration: session.duration, tutor: session.tutor, status: 'scheduled', attendance: 'unmarked', note: 'New enrolment', enrolmentApplicationId: application.id };
    const error = validateSlot(trial, booking);
    if (error) throw new Error(error);
    trial.bookings.push(booking); bookings.push(booking);
  }
  return { application, plan, bookings };
}

export function activateFirstEnrolment(state, invoice, activation, { now } = {}) {
  if (!activation) return false;
  const { application, plan, bookings } = activation, activatedDate = actionDate(now);
  state.bookings ??= []; state.bookings.push(...bookings);
  Object.assign(application, { status: 'active', activatedDate, activatedByInvoiceId: invoice.id });
  plan.status = 'active';
  state.enrolments ??= {};
  state.enrolments[invoice.studentId] = { status: 'active', activatedDate, activatedByInvoiceId: invoice.id, applicationId: application.id };
  if (state.assessment?.studentId === invoice.studentId) Object.assign(state.assessment, { enrolled: true, status: 'enrolled', parent: application.parent, phone: application.phone, activatedDate, activatedByInvoiceId: invoice.id });
  state.regularSchedules ??= {};
  const session = plan.sessions[0];
  state.regularSchedules[invoice.studentId] = { ...session, effectiveDate: application.cycle.firstLessonDate };
  if (state.studentProfiles?.[invoice.studentId]) Object.assign(state.studentProfiles[invoice.studentId], { status: 'active', enrolledSince: application.cycle.firstLessonDate });
  appendAudit(state, `Activated enrolment for ${invoice.studentId} after first payment approval (${invoice.id})`);
  return true;
}

function invoicePeriodStart(invoice) {
  if (validDate(invoice.periodStart)) return monthDate(invoice.periodStart);
  const match = String(invoice.period || '').match(/^([A-Za-z]+)[–—-][A-Za-z]+ (\d{4})/);
  if (!match) return null;
  const month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(match[1].slice(0, 3).toLowerCase());
  return month < 0 ? null : `${match[2]}-${String(month + 1).padStart(2, '0')}-01`;
}
function archived(invoice) {
  return invoice.cancelled || invoice.canceled || invoice.voided || invoice.cancelledAt || invoice.voidedAt || ['cancelled', 'canceled', 'void', 'voided'].includes(invoice.status);
}

/** Local demo catch-up: one charge per student and calendar pair, independent of weekday. */
export function runTuitionBilling(state, { today = TODAY } = {}) {
  requireDate(today);
  const created = [];
  for (const plan of Object.values(state.tuitionPlans || {})) {
    if (plan.status !== 'active' || !plan.currentCycle || plan.currentCycle.billingMonths !== 2) continue;
    for (let count = 0; count < 120; count++) {
      const current = plan.currentCycle;
      if (today < current.nextInvoiceOn) break;
      const next = buildTeachingCycle({ startDate: current.nextCycleStart, sessions: plan.sessions, ...closureOptions(state), sessionsOnDate: date => {
        const rule = resolveRegularScheduleRule(state.regularSchedules?.[plan.studentId], date);
        return rule ? [rule] : plan.sessions;
      } });
      const key = plan.studentId + ':' + next.startDate;
      // Preserve a submitted/paid legacy invoice for this pair rather than
      // creating a second charge while its old document remains on record.
      let invoice = (state.invoices || []).find(item => item.studentId === plan.studentId && !archived(item) && item.chargeType !== 'assessment' && (
        item.tuitionCycleKey === key || item.tuitionCycleStart === next.startDate || invoicePeriodStart(item) === next.startDate));
      if (!invoice) {
        invoice = cycleInvoice(state, { id: 'INV-CYCLE-' + plan.studentId + '-' + next.startDate.replaceAll('-', ''), studentId: plan.studentId, cycle: next, amount: plan.amount,
          tuitionCycleKey: key, tuitionCycleStart: next.startDate, automaticallyIssued: true });
        created.push(invoice);
        appendAudit(state, `Issued ${invoice.id} for ${invoice.period}; payment due ${invoice.due}`);
      }
      plan.nextInvoiceId = invoice.id;
      if (today <= current.endDate) break;
      plan.currentCycle = next;
      plan.currentInvoiceId = invoice.id;
      delete plan.nextInvoiceId;
    }
  }
  return created;
}

// Reconstruct only the erroneous release's generated shape to distinguish its
// untouched fixtures from negotiated amounts, edited dates and dated plans.
function legacyFixtureCycle(startDate, sessions, closedWeeks) {
  const closed = new Set(closedWeeks.map(monday)), teachingWeeks = [], skippedWeeks = [], lessonDates = [];
  for (let cursor = monday(startDate), count = 0; teachingWeeks.length < 4 && count < 260; cursor = addDays(cursor, 7), count++) {
    if (closed.has(cursor)) { skippedWeeks.push(cursor); continue; }
    const dates = sessions.map(slot => addDays(cursor, slot.weekday - 1)).filter(date => date >= startDate).sort();
    if (!teachingWeeks.length && !dates.length) continue;
    teachingWeeks.push({ start: cursor, end: addDays(cursor, 6), lessonDates: [...new Set(dates)] }); lessonDates.push(...new Set(dates));
  }
  return { startDate: lessonDates[0], endDate: teachingWeeks.at(-1).end, firstLessonDate: lessonDates[0], lastLessonDate: lessonDates.at(-1), teachingWeeks, skippedWeeks, lessonDates,
    nextInvoiceOn: addDays(teachingWeeks[2].end, 1), nextCycleStart: addDays(teachingWeeks.at(-1).end, 1) };
}
function legacyLabel(cycle) {
  const label = date => new Date(date + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).replace('Sept', 'Sep');
  return `${label(cycle.firstLessonDate)}${cycle.firstLessonDate.slice(0, 4) !== cycle.lastLessonDate.slice(0, 4) ? ' ' + cycle.firstLessonDate.slice(0, 4) : ''} – ${label(cycle.lastLessonDate)} ${cycle.lastLessonDate.slice(0, 4)}`;
}
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function legacyMatches(invoice, cycle, sessions, issued) {
  const lessons = cycle.teachingWeeks.flatMap(week => sessions.map(slot => ({ date: addDays(week.start, slot.weekday - 1), start: slot.start, duration: slot.duration, tutor: slot.tutor }))).filter(lesson => lesson.date >= cycle.firstLessonDate && lesson.date <= cycle.endDate);
  return invoice.teachingWeeks === 4 && invoice.description === 'Recurring tuition · 4 teaching weeks' && invoice.period === legacyLabel(cycle)
    && invoice.periodStart === cycle.firstLessonDate && invoice.periodEnd === cycle.endDate && invoice.firstLessonDate === cycle.firstLessonDate
    && invoice.issued === issued && invoice.due === addDays(cycle.firstLessonDate, -1) && same(invoice.teachingCycle, cycle)
    && invoice.lessonCount === lessons.length && same(invoice.lessonPlan, { lessonCount: lessons.length, lessonDates: lessons, makeUpLessonCount: 0 });
}
function studentSessions(student) {
  const day = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].indexOf(student.day) + 1;
  const [hour, minute] = (student.regular?.split(' · ')[1] || '').split(':').map(Number);
  return day && Number.isFinite(hour) ? [{ weekday: day, start: hour * 60 + minute, duration: student.sessions?.[0]?.duration || 60, tutor: student.tutor }] : null;
}

/** Upgrade known demo baselines only. Receipts, real proofs and user edits survive byte-for-byte. */
export function normalizeTeachingBilling(state) {
  if (state.calendarBillingVersion === BILLING_VERSION) return state;
  const oldClosedWeeks = state.billingCalendar?.closedWeeks || ['2026-09-14'];
  // This was a synthetic closed week introduced solely for the four-week demo.
  if (state.billingCalendar?.demo && same(state.billingCalendar.closedWeeks, ['2026-09-14']) && Object.keys(state.billingCalendar).every(key => ['closedWeeks', 'demo'].includes(key))) delete state.billingCalendar;
  const studentsById = new Map(allStudents.map(student => [student.id, student]));
  const chloeSessions = [{ weekday: 3, start: 960, duration: 60, tutor: centre.managerId }];
  const known = { 'INV-8001': ['2026-08-01', '2026-08-03', '2026-07-20', '2026-08-20'], 'INV-8002': ['2026-09-01', '2026-08-31', '2026-08-20', '2026-09-20'], 'INV-8006': ['2026-05-01', '2026-05-04', '2026-04-20', '2026-05-01'] };
  const updated = new Set();
  for (const invoice of state.invoices || []) {
    if (invoice.receiptId || (state.receipts || []).some(receipt => receipt.invoiceId === invoice.id) || archived(invoice) || invoice.amount !== 2000
      || invoice.proof && !invoice.proofReview?.fixture || invoice.proofReturnHistory?.length || invoice.revisions?.length) continue;
    const student = studentsById.get(invoice.studentId);
    const workflow = invoice.workflowFixture && invoice.studentId === 'chloe' && known[invoice.id];
    const core = student && !invoice.workflowFixture && /^(?:INV-1024|INV-103[0-3]|INV-[56]\d{3})$/.test(invoice.id);
    if (!workflow && !core) continue;
    const [periodStart, legacyStart, originalIssued, originalDue] = workflow || ['2026-10-01', '2026-10-05', '2026-09-20', '2026-10-20'];
    const sessions = workflow || invoice.id === 'INV-1024' ? chloeSessions : studentSessions(student);
    if (!sessions) continue;
    const cycle = buildTeachingCycle({ startDate: periodStart, sessions, ...closureOptions(state) });
    const baseline = invoice.description === 'Regular programme · 8 lessons' && invoice.period === teachingCycleLabel(cycle) && invoice.issued === originalIssued && invoice.due === originalDue
      && !invoice.lessonPlan && !invoice.lessonCount && !invoice.teachingCycle;
    const legacy = legacyMatches(invoice, legacyFixtureCycle(legacyStart, sessions, oldClosedWeeks), sessions, workflow ? originalIssued : '2026-09-28');
    if (!baseline && !legacy) continue;
    Object.assign(invoice, invoiceCycleFields(cycle), { issued: cycle.issueDate, tuitionCycleKey: invoice.studentId + ':' + cycle.startDate, tuitionCycleStart: cycle.startDate });
    delete invoice.teachingWeeks;
    updated.add(invoice.id);
  }
  for (const plan of Object.values(state.tuitionPlans || {})) {
    if (!plan.currentCycle || plan.currentCycle.billingMonths === 2) continue;
    const application = (state.enrolmentApplications || []).find(item => item.id === plan.applicationId);
    // Never shift every student into one centre-wide cohort. A reviewed first
    // application retains its own start month; the known Chloe demo began Aug–Sep.
    const startDate = application?.firstLessonDate || (plan.demo && plan.studentId === 'chloe' ? '2026-08-01' : plan.currentCycle.firstLessonDate);
    if (!validDate(startDate)) continue;
    plan.currentCycle = buildTeachingCycle({ startDate, sessions: plan.sessions, ...closureOptions(state), ...(application ? { lessonsFrom: application.firstLessonDate } : {}) });
    delete plan.nextInvoiceId;
  }
  if (updated.has('INV-1024') && !state.tuitionPlans?.chloe) {
    state.tuitionPlans ??= {};
    state.tuitionPlans.chloe = { studentId: 'chloe', status: 'active', amount: 2000, sessions: chloeSessions,
      currentCycle: buildTeachingCycle({ startDate: '2026-08-01', sessions: chloeSessions, ...closureOptions(state) }), demo: true };
  }
  state.calendarBillingVersion = BILLING_VERSION;
  return state;
}
