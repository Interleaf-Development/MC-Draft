import { TODAY, centre, allStudents, uid, validateSlot, record } from './model.js';

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

/** Four centre teaching weeks. Only an explicitly fully closed week is skipped. */
export function buildTeachingCycle({ startDate, sessions = [{ weekday: 3 }], closedWeeks = [] }) {
  requireDate(startDate);
  if (!Array.isArray(sessions) || !sessions.length || sessions.some(slot => !Number.isInteger(slot.weekday) || slot.weekday < 1 || slot.weekday > 7)) throw new Error('Choose a regular teaching day.');
  if (!Array.isArray(closedWeeks)) throw new Error('Choose valid fully closed weeks.');
  const closed = new Set(closedWeeks.map(date => monday(requireDate(date))));
  const teachingWeeks = [], skippedWeeks = [], lessonDates = [];
  let cursor = monday(startDate);
  // A partial starting week with no remaining scheduled lesson is not counted.
  if (!sessions.some(slot => addDays(cursor, slot.weekday - 1) >= startDate)) cursor = addDays(cursor, 7);
  for (let scanned = 0; teachingWeeks.length < 4 && scanned < 260; scanned++, cursor = addDays(cursor, 7)) {
    if (closed.has(cursor)) { skippedWeeks.push(cursor); continue; }
    const dates = [...new Set(sessions.map(slot => addDays(cursor, slot.weekday - 1)).filter(date => date >= startDate))].sort();
    const week = { start: cursor, end: addDays(cursor, 6), lessonDates: dates };
    teachingWeeks.push(week); lessonDates.push(...dates);
  }
  if (teachingWeeks.length !== 4) throw new Error('Could not find four open teaching weeks.');
  const firstLessonDate = lessonDates[0], lastLessonDate = lessonDates.at(-1);
  return { startDate: firstLessonDate, endDate: teachingWeeks.at(-1).end, firstLessonDate, lastLessonDate, teachingWeeks, skippedWeeks, lessonDates,
    nextInvoiceOn: addDays(teachingWeeks[2].end, 1), nextCycleStart: addDays(teachingWeeks.at(-1).end, 1) };
}

export function teachingCycleLabel(cycle) {
  const label = date => new Date(date + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).replace('Sept', 'Sep');
  const firstYear = cycle.firstLessonDate.slice(0, 4), lastYear = cycle.lastLessonDate.slice(0, 4);
  return `${label(cycle.firstLessonDate)}${firstYear !== lastYear ? ' ' + firstYear : ''} – ${label(cycle.lastLessonDate)} ${lastYear}`;
}

function cycleLessonPlan(cycle, sessions) {
  const lessonDates = cycle.teachingWeeks.flatMap(week => sessions.map(slot => ({ date: addDays(week.start, slot.weekday - 1), start: slot.start, duration: slot.duration, tutor: slot.tutor })))
    .filter(lesson => lesson.date >= cycle.firstLessonDate && lesson.date <= cycle.endDate)
    .sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);
  return { lessonCount: lessonDates.length, lessonPlan: { lessonCount: lessonDates.length, lessonDates, makeUpLessonCount: 0 } };
}

function cycleInvoice(state, { id, studentId, cycle, sessions, amount, issued, chargeType = 'recurring', ...extra }) {
  const invoice = { id: invoiceIdFor(state, id), studentId, chargeType, amount: amountValue(amount), period: teachingCycleLabel(cycle), periodStart: cycle.firstLessonDate, periodEnd: cycle.endDate,
    billingMonth: cycle.firstLessonDate.slice(0, 7), issued, due: addDays(cycle.firstLessonDate, -1), firstLessonDate: cycle.firstLessonDate,
    description: chargeType === 'first-tuition' ? 'First tuition · 4 teaching weeks' : 'Recurring tuition · 4 teaching weeks', teachingCycle: structuredClone(cycle), teachingWeeks: 4, ...cycleLessonPlan(cycle, sessions), proof: false, receiptId: null, ...extra };
  state.invoices ??= []; state.invoices.push(invoice);
  return invoice;
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
  const cycle = buildTeachingCycle({ startDate: application.firstLessonDate, sessions, closedWeeks: state.billingCalendar?.closedWeeks || [] });
  const invoice = cycleInvoice(state, { id: invoiceId || 'INV-FIRST-' + application.studentId, studentId: application.studentId, amount, cycle, sessions, issued: actionDate(now), chargeType: 'first-tuition', enrolmentApplicationId: application.id });
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

/** Local demo catch-up. Stable plan/cycle keys prevent a second invoice on rerender. */
export function runTuitionBilling(state, { today = TODAY } = {}) {
  requireDate(today);
  const created = [];
  for (const plan of Object.values(state.tuitionPlans || {})) {
    if (plan.status !== 'active' || !plan.currentCycle) continue;
    for (let count = 0; count < 120; count++) {
      const current = plan.currentCycle;
      if (today < current.nextInvoiceOn) break;
      const next = buildTeachingCycle({ startDate: current.nextCycleStart, sessions: plan.sessions, closedWeeks: state.billingCalendar?.closedWeeks || [] });
      const key = plan.studentId + ':' + next.firstLessonDate;
      let invoice = (state.invoices || []).find(item => item.tuitionCycleKey === key);
      if (!invoice) {
        invoice = cycleInvoice(state, { id: 'INV-CYCLE-' + plan.studentId + '-' + next.firstLessonDate.replaceAll('-', ''), studentId: plan.studentId, cycle: next, sessions: plan.sessions, amount: plan.amount, issued: current.nextInvoiceOn, tuitionCycleKey: key, automaticallyIssued: true });
        created.push(invoice);
        appendAudit(state, `Issued ${invoice.id} after teaching week 3; payment due ${invoice.due}`);
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

/** Existing paid documents are historical evidence and are never rewritten. */
export function normalizeTeachingBilling(state) {
  if (state.teachingBillingVersion) return state;
  state.teachingBillingVersion = 1;
  const original = (state.invoices || []).find(invoice => invoice.id === 'INV-1024' && invoice.studentId === 'chloe');
  if (!original) return state;
  const closedWeeks = state.billingCalendar?.closedWeeks || ['2026-09-14'];
  state.billingCalendar ??= { closedWeeks: [...closedWeeks], demo: true };
  const sessions = [{ weekday: 3, start: 960, duration: 60, tutor: centre.managerId }];
  const currentCycle = buildTeachingCycle({ startDate: '2026-08-31', sessions, closedWeeks });
  const nextCycle = buildTeachingCycle({ startDate: currentCycle.nextCycleStart, sessions, closedWeeks });
  const hasReceipt = invoice => Boolean(invoice.receiptId || (state.receipts || []).some(receipt => receipt.invoiceId === invoice.id));
  // Only the original, untouched invoice fixture may be carried into the new
  // sample plan. User proof uploads/edits and already issued receipts stay intact.
  const unchangedOriginal = !original.proof && !hasReceipt(original) && original.amount === 2000 && original.period === 'Oct–Nov 2026' && original.description === 'Regular programme · 8 lessons' && original.issued === '2026-09-20' && original.due === '2026-10-20';
  if (unchangedOriginal) Object.assign(original, { period: teachingCycleLabel(nextCycle), periodStart: nextCycle.firstLessonDate, periodEnd: nextCycle.endDate, billingMonth: nextCycle.firstLessonDate.slice(0, 7), firstLessonDate: nextCycle.firstLessonDate, issued: currentCycle.nextInvoiceOn, due: addDays(nextCycle.firstLessonDate, -1), description: 'Recurring tuition · 4 teaching weeks', teachingWeeks: 4, teachingCycle: nextCycle, ...cycleLessonPlan(nextCycle, sessions), tuitionCycleKey: 'chloe:' + nextCycle.firstLessonDate, automaticallyIssued: true });
  const fixtureStarts = {
    'INV-8001': ['2026-08-03', 'Aug–Sep 2026', '2026-07-20', '2026-08-20'],
    'INV-8002': ['2026-08-31', 'Sep–Oct 2026', '2026-08-20', '2026-09-20'],
    'INV-8006': ['2026-05-04', 'May–Jun 2026', '2026-04-20', '2026-05-01']
  };
  for (const invoice of state.invoices) {
    if (!invoice.workflowFixture || !fixtureStarts[invoice.id] || hasReceipt(invoice) || invoice.description !== 'Regular programme · 8 lessons' || invoice.amount !== 2000) continue;
    const [startDate, period, issued, due] = fixtureStarts[invoice.id];
    if (invoice.period !== period || invoice.issued !== issued || invoice.due !== due || invoice.proof && !invoice.proofReview?.fixture || invoice.proofReturnHistory?.length) continue;
    const cycle = buildTeachingCycle({ startDate, sessions, closedWeeks });
    Object.assign(invoice, { period: teachingCycleLabel(cycle), periodStart: cycle.firstLessonDate, periodEnd: cycle.endDate, billingMonth: cycle.firstLessonDate.slice(0, 7), firstLessonDate: cycle.firstLessonDate, description: 'Recurring tuition · 4 teaching weeks', teachingWeeks: 4, teachingCycle: cycle, ...cycleLessonPlan(cycle, sessions), due: addDays(cycle.firstLessonDate, -1) });
  }
  const studentsById = new Map(allStudents.map(student => [student.id, student]));
  for (const invoice of state.invoices) {
    const student = studentsById.get(invoice.studentId);
    const untouched = student && !invoice.workflowFixture && !hasReceipt(invoice) && !invoice.cancelled && !invoice.voided && !invoice.status
      && invoice.amount === 2000 && invoice.period === 'Oct–Nov 2026' && invoice.description === 'Regular programme · 8 lessons'
      && invoice.issued === '2026-09-20' && invoice.due === '2026-10-20'
      && (!invoice.proof || invoice.proofReview?.fixture && invoice.proofDate >= '2026-09-28');
    if (!untouched) continue;
    const day = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].indexOf(student.day) + 1;
    if (!day) continue;
    const [hour, minute] = student.regular.split(' · ')[1].split(':').map(Number);
    const studentSessions = [{ weekday: day, start: hour * 60 + minute, duration: student.sessions?.[0]?.duration || 60, tutor: student.tutor }];
    const cycle = buildTeachingCycle({ startDate: '2026-10-05', sessions: studentSessions, closedWeeks });
    Object.assign(invoice, { period: teachingCycleLabel(cycle), periodStart: cycle.firstLessonDate, periodEnd: cycle.endDate, billingMonth: cycle.firstLessonDate.slice(0, 7), firstLessonDate: cycle.firstLessonDate, issued: '2026-09-28', due: addDays(cycle.firstLessonDate, -1), description: 'Recurring tuition · 4 teaching weeks', teachingWeeks: 4, teachingCycle: cycle, ...cycleLessonPlan(cycle, studentSessions), automaticallyIssued: true });
  }
  // If the owner changed the original fixture, do not silently create an extra
  // charge for that student while introducing the new sample billing policy.
  if (unchangedOriginal) {
    state.tuitionPlans ??= {};
    state.tuitionPlans.chloe ??= { studentId: 'chloe', status: 'active', amount: 2000, sessions, currentCycle, demo: true };
    runTuitionBilling(state);
  }
  return state;
}
