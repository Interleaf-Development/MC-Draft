import test from 'node:test';
import assert from 'node:assert/strict';
import { seed, seedCentreVolume, clone, centre } from '../dist/model.js';
import { buildTeachingCycle, teachingCycleLabel, createAssessmentInvoice, submitEnrolmentApplication, reviewEnrolmentApplication, runTuitionBilling, normalizeTeachingBilling } from '../dist/billing-cycles.js';
import { normalizeBillingWorkflow, confirmInvoicePayment, billingStage } from '../dist/billing-workflow.js';
import { submitPaymentProof } from '../dist/billing-automation.js';
import { renderReceiptDocument } from '../dist/receipt-document.js';
import { getRemainingStudentLessons, previewRegularScheduleChange, applyRegularScheduleChange } from '../dist/regular-schedule.js';

const sessions = [{ weekday: 3, start: 1020, duration: 60, tutor: centre.managerId }];
const firstApplication = state => submitEnrolmentApplication(state, { studentId: 'mia', parent: 'Mrs Cheung', phone: '9000 0000', firstLessonDate: '2026-10-07', start: 1020, tutor: centre.managerId });

test('cycles count four teaching weeks, skipping only explicitly fully closed weeks', () => {
  const cycle = buildTeachingCycle({ startDate: '2026-08-31', sessions, closedWeeks: ['2026-09-14'] });
  assert.deepEqual(cycle.teachingWeeks.map(week => week.start), ['2026-08-31', '2026-09-07', '2026-09-21', '2026-09-28']);
  assert.deepEqual(cycle.lessonDates, ['2026-09-02', '2026-09-09', '2026-09-23', '2026-09-30']);
  assert.deepEqual(cycle.skippedWeeks, ['2026-09-14']);
  assert.equal(cycle.nextInvoiceOn, '2026-09-28');
  assert.equal(cycle.nextCycleStart, '2026-10-05');
  const twiceWeekly = buildTeachingCycle({ startDate: '2026-08-31', sessions: [{ weekday: 3 }, { weekday: 5 }] });
  assert.equal(twiceWeekly.teachingWeeks.length, 4);
  assert.equal(twiceWeekly.lessonDates.length, 8, 'A teaching week is not assumed to contain just one lesson');
});

test('partial first weeks, closed first weeks and year boundaries produce real lesson dates', () => {
  const partial = buildTeachingCycle({ startDate: '2026-10-01', sessions });
  assert.equal(partial.firstLessonDate, '2026-10-07');
  assert.equal(partial.teachingWeeks[0].start, '2026-10-05');
  const closed = buildTeachingCycle({ startDate: '2026-12-28', sessions, closedWeeks: ['2026-12-28'] });
  assert.equal(closed.firstLessonDate, '2027-01-06');
  assert.equal(closed.lastLessonDate, '2027-01-27');
  assert.equal(teachingCycleLabel(buildTeachingCycle({ startDate: '2026-12-28', sessions })), '30 Dec 2026 – 20 Jan 2027');
  assert.throws(() => buildTeachingCycle({ startDate: '2026-02-30', sessions }), /valid date/);
  assert.throws(() => buildTeachingCycle({ startDate: '2026-01-01', sessions: [] }), /teaching day/);
});

test('renewal invoices appear after teaching week 3, use next-cycle first lesson deadline, and never duplicate', () => {
  const currentCycle = buildTeachingCycle({ startDate: '2026-08-31', sessions, closedWeeks: ['2026-09-14'] });
  const state = { invoices: [], audit: [], billingCalendar: { closedWeeks: ['2026-09-14', '2026-10-05'] }, tuitionPlans: { chloe: { studentId: 'chloe', status: 'active', amount: 2000, sessions, currentCycle } } };
  assert.deepEqual(runTuitionBilling(state, { today: '2026-09-27' }), []);
  const [invoice] = runTuitionBilling(state, { today: '2026-09-28' });
  assert.equal(invoice.issued, '2026-09-28');
  assert.equal(invoice.firstLessonDate, '2026-10-14');
  assert.equal(invoice.due, '2026-10-13');
  assert.equal(invoice.teachingWeeks, 4);
  assert.equal(invoice.receiptId, null);
  assert.deepEqual(runTuitionBilling(state, { today: '2026-09-30' }), []);
  assert.deepEqual(runTuitionBilling(state, { today: '2026-10-05' }), []);
  assert.equal(state.invoices.length, 1);
  assert.equal(state.tuitionPlans.chloe.currentCycle.firstLessonDate, '2026-10-14');
  assert.equal(runTuitionBilling(state, { today: '2026-11-02' }).length, 1, 'A later fourth teaching week issues the following cycle once');
  assert.equal(runTuitionBilling(state, { today: '2026-11-02' }).length, 0);
});

test('paused and unpaid initial enrolment plans cannot issue renewal invoices', () => {
  const currentCycle = buildTeachingCycle({ startDate: '2026-08-31', sessions });
  for (const status of ['paused', 'awaiting-first-payment']) {
    const state = { invoices: [], audit: [], tuitionPlans: { mia: { studentId: 'mia', status, amount: 2000, sessions, currentCycle } } };
    assert.deepEqual(runTuitionBilling(state), []);
    assert.equal(state.invoices.length, 0);
  }
});

test('booking a paid assessment creates one invoice and does not claim payment was received', () => {
  const state = seed(); state.assessment.paid = false;
  const first = createAssessmentInvoice(state, { studentId: 'mia', assessmentDate: '2026-09-26', now: '2026-09-20', amount: 200 });
  assert.equal(first.invoice.chargeType, 'assessment');
  assert.equal(first.invoice.assessmentDate, '2026-09-26');
  assert.equal(first.invoice.proof, false);
  assert.equal(state.assessment.paid, false);
  assert.equal(createAssessmentInvoice(state, { studentId: 'mia', assessmentDate: '2026-09-26', amount: 200 }).createdInvoice, false);
  first.invoice.proof = true;
  confirmInvoicePayment(state, first.invoice.id);
  assert.equal(state.assessment.paid, true);
  assert.equal(state.assessment.enrolled, false);
});

test('application review issues first invoice; proof upload cannot activate enrolment even with legacy auto-send', () => {
  const state = seed(), invoiceCount = state.invoices.length, bookingCount = state.bookings.length;
  const application = firstApplication(state);
  assert.equal(application.status, 'submitted');
  assert.equal(state.invoices.length, invoiceCount);
  assert.equal(state.bookings.length, bookingCount);
  assert.equal(firstApplication(state).id, application.id);
  const reviewed = reviewEnrolmentApplication(state, application.id, { amount: 1800, regularAmount: 2000 });
  assert.equal(reviewed.createdInvoice, true);
  assert.equal(reviewed.invoice.due, '2026-10-06');
  assert.equal(reviewed.invoice.chargeType, 'first-tuition');
  assert.equal(application.status, 'awaiting-payment');
  assert.equal(state.assessment.enrolled, false);
  assert.equal(reviewEnrolmentApplication(state, application.id, { amount: 1800 }).createdInvoice, false);
  state.billingSettings = { autoSent: true };
  const proof = submitPaymentProof(state, reviewed.invoice.id, { paymentDate: '2026-09-30', payerName: 'Mandy Cheung', reference: 'FPS 999123' });
  assert.equal(proof.receipt, null);
  assert.equal(billingStage(state, reviewed.invoice), 'review');
  assert.equal(state.assessment.enrolled, false);
  const confirmed = confirmInvoicePayment(state, reviewed.invoice.id);
  assert.equal(confirmed.activatedEnrolment, true);
  assert.equal(state.assessment.enrolled, true);
  assert.equal(state.assessment.parent, 'Mrs Cheung');
  assert.equal(application.status, 'active');
  assert.equal(state.bookings.length, bookingCount + 4);
  assert.equal(state.tuitionPlans.mia.status, 'active');
  const once = clone(state);
  assert.equal(confirmInvoicePayment(state, reviewed.invoice.id).createdReceipt, false);
  assert.deepEqual(state, once);
  const [renewal] = runTuitionBilling(state, { today: '2026-10-26' });
  renewal.proof = true;
  const activation = clone(state.enrolments.mia), beforeBookings = state.bookings.length;
  assert.equal(confirmInvoicePayment(state, renewal.id, { now: '2026-10-26T12:00:00+08:00' }).activatedEnrolment, false);
  assert.deepEqual(state.enrolments.mia, activation);
  assert.equal(state.bookings.length, beforeBookings, 'A renewal does not repeat first activation');
});

test('capacity conflicts block first approval before receipt, enrolment or lessons mutate', () => {
  const state = seed(), application = firstApplication(state);
  const { invoice } = reviewEnrolmentApplication(state, application.id, { amount: 2000 });
  invoice.proof = true;
  state.bookings.push(...Array.from({ length: 6 }, (_, index) => ({ id: 'full-' + index, studentId: 'occupied-' + index, date: '2026-10-14', start: 1020, duration: 60, tutor: centre.managerId, status: 'scheduled' })));
  const before = clone(state);
  assert.throws(() => confirmInvoicePayment(state, invoice.id), /six students/);
  assert.deepEqual(state, before);
});

test('versioned demo migration updates untouched pending fixtures while preserving receipts and owner edits', () => {
  const state = seedCentreVolume(seed());
  const receiptBefore = clone(state.receipts), paidBefore = clone(state.invoices.filter(invoice => invoice.receiptId));
  const edited = state.invoices.find(invoice => !invoice.receiptId && invoice.id !== 'INV-1024');
  edited.description = 'Keep this negotiated arrangement';
  const editedBefore = clone(edited);
  normalizeBillingWorkflow(state);
  assert.deepEqual(state.receipts.filter(receipt => !receipt.workflowFixture), receiptBefore);
  for (const invoice of paidBefore) assert.deepEqual(state.invoices.find(item => item.id === invoice.id), invoice);
  assert.deepEqual(state.invoices.find(item => item.id === edited.id), editedBefore);
  assert.ok(state.invoices.filter(invoice => invoice.teachingWeeks === 4).length > 90);
  assert.equal(state.invoices.find(invoice => invoice.id === 'INV-1024').due, '2026-10-06');
  assert.deepEqual(state.tuitionPlans.chloe.currentCycle.skippedWeeks, ['2026-09-14']);
  const once = clone(state);
  normalizeTeachingBilling(state); runTuitionBilling(state);
  assert.deepEqual(state, once);
});

test('cycle receipts and schedule changes use the exact lesson plan and exclude closed weeks', () => {
  const state = seed(); state.bookings = [];
  state.billingCalendar = { closedWeeks: ['2026-10-12'] };
  state.tuitionPlans = { chloe: { studentId: 'chloe', status: 'active', amount: 2000, sessions: [{ ...sessions[0], start: 960 }], currentCycle: buildTeachingCycle({ startDate: '2026-09-07', sessions }) } };
  const [invoice] = runTuitionBilling(state);
  assert.equal(invoice.lessonCount, 4);
  assert.deepEqual(invoice.lessonPlan.lessonDates.map(lesson => lesson.date), ['2026-10-07', '2026-10-21', '2026-10-28', '2026-11-04']);
  assert.ok(invoice.lessonPlan.lessonDates.every(lesson => lesson.start === 960 && lesson.duration === 60 && lesson.tutor === centre.managerId));
  invoice.proof = true;
  const { receipt } = confirmInvoicePayment(state, invoice.id);
  assert.match(renderReceiptDocument(state, receipt.id), /課堂安排 · 4 堂/);
  assert.doesNotMatch(renderReceiptDocument(state, receipt.id), /課堂安排 · 8 堂/);
  assert.equal(getRemainingStudentLessons(state, 'chloe').lessons.length, 4);
  const preview = previewRegularScheduleChange(state, { studentId: 'chloe', invoiceId: invoice.id, effectiveDate: '2026-10-07', weekday: 4, start: 960, tutor: centre.managerId });
  assert.equal(preview.beforeTotalCount, 4);
  assert.equal(preview.proposedTotalCount, 4);
  assert.ok(!preview.conflicts.some(conflict => conflict.type === 'plan'));
  assert.deepEqual(preview.proposedLessons.map(lesson => lesson.date), ['2026-10-08', '2026-10-22', '2026-10-29', '2026-11-05']);
  const historical = previewRegularScheduleChange(state, { studentId: 'oliver', invoiceId: 'INV-1028', effectiveDate: '2026-10-01', weekday: 4, start: 960, tutor: centre.managerId });
  assert.equal(historical.beforeTotalCount, 8, 'New calendar fixtures do not rewrite paid historical block documents');
  assert.equal(historical.proposedTotalCount, 9);
});

test('multiple weekly sessions keep their separate dated entitlements within four teaching weeks', () => {
  const state = { invoices: [], audit: [], tuitionPlans: { chloe: { studentId: 'chloe', status: 'active', amount: 2000, sessions: [{ ...sessions[0] }, { ...sessions[0], weekday: 5 }], currentCycle: buildTeachingCycle({ startDate: '2026-09-07', sessions }) } } };
  const [invoice] = runTuitionBilling(state);
  assert.equal(invoice.teachingWeeks, 4);
  assert.equal(invoice.lessonCount, 8);
  assert.equal(invoice.lessonPlan.lessonDates.length, 8);
});

test('a permanent timetable change carries into the next new cycle without replacing the paid cycle', () => {
  const state = seed(); state.bookings = [];
  state.tuitionPlans = { chloe: { studentId: 'chloe', status: 'active', amount: 2000, sessions: [{ ...sessions[0], start: 960 }], currentCycle: buildTeachingCycle({ startDate: '2026-09-07', sessions }) } };
  const [invoice] = runTuitionBilling(state);
  invoice.proof = true;
  const { receipt } = confirmInvoicePayment(state, invoice.id);
  const input = { studentId: 'chloe', invoiceId: invoice.id, effectiveDate: '2026-10-07', weekday: 4, start: 960, tutor: centre.managerId };
  const preview = previewRegularScheduleChange(state, input);
  applyRegularScheduleChange(state, input, { fingerprint: preview.fingerprint });
  const issuedBefore = clone(invoice), receiptBefore = clone(state.receipts.find(item => item.id === receipt.id));
  // applyRegularScheduleChange transactionally replaces state objects.
  const currentInvoiceBefore = clone(state.invoices.find(item => item.id === issuedBefore.id));
  const created = runTuitionBilling(state, { today: '2026-10-26' });
  assert.equal(created.length, 1, 'Changing the old first lesson date cannot create a second October invoice');
  assert.deepEqual(created[0].lessonPlan.lessonDates.map(lesson => lesson.date), ['2026-11-05', '2026-11-12', '2026-11-19', '2026-11-26']);
  assert.ok(created[0].lessonPlan.lessonDates.every(lesson => lesson.start === 960));
  assert.equal(created[0].due, '2026-11-04');
  assert.deepEqual(state.invoices.find(item => item.id === invoice.id), currentInvoiceBefore);
  assert.deepEqual(state.receipts.find(item => item.id === receipt.id), receiptBefore);
  assert.equal(runTuitionBilling(state, { today: '2026-10-26' }).length, 0);
});

test('renewals resolve temporary timetables on each date and return to the previous timetable', () => {
  const state = { invoices: [], audit: [], regularSchedules: { chloe: { ...sessions[0], weekday: 4, start: 960, effectiveDate: '2026-10-05', endDate: '2026-10-18', previousRule: { ...sessions[0] } } },
    tuitionPlans: { chloe: { studentId: 'chloe', status: 'active', amount: 2000, sessions, currentCycle: buildTeachingCycle({ startDate: '2026-09-07', sessions }) } } };
  const [invoice] = runTuitionBilling(state);
  assert.deepEqual(invoice.lessonPlan.lessonDates.map(lesson => [lesson.date, lesson.start]), [['2026-10-08', 960], ['2026-10-15', 960], ['2026-10-21', 1020], ['2026-10-28', 1020]]);
  assert.equal(invoice.due, '2026-10-07');
  const [nextInvoice] = runTuitionBilling(state, { today: '2026-10-26' });
  assert.deepEqual(nextInvoice.lessonPlan.lessonDates.map(lesson => lesson.date), ['2026-11-04', '2026-11-11', '2026-11-18', '2026-11-25']);
  assert.equal(nextInvoice.due, '2026-11-03');
});

test('a changed timetable never silently rewrites an already-issued renewal or duplicates its charge', () => {
  for (const paid of [false, true]) {
    const state = { invoices: [], audit: [], tuitionPlans: { chloe: { studentId: 'chloe', status: 'active', amount: 2000, sessions, currentCycle: buildTeachingCycle({ startDate: '2026-09-07', sessions }) } } };
    const [invoice] = runTuitionBilling(state);
    delete invoice.tuitionCycleStart; // Earlier saved four-week invoices used only first-lesson keys.
    if (paid) invoice.receiptId = 'R-SAVED';
    const before = clone(invoice);
    state.regularSchedules = { chloe: { ...sessions[0], weekday: 4, effectiveDate: '2026-10-01', previousRule: { ...sessions[0] } } };
    assert.deepEqual(runTuitionBilling(state), []);
    assert.deepEqual(state.invoices, [before]);
  }
});
