import test from 'node:test';
import assert from 'node:assert/strict';
import { seed, seedCentreVolume, clone, centre } from '../dist/model.js';
import { buildTeachingCycle, teachingCycleLabel, createAssessmentInvoice, submitEnrolmentApplication, reviewEnrolmentApplication, runTuitionBilling, normalizeTeachingBilling } from '../dist/billing-cycles.js';
import { normalizeBillingWorkflow, confirmInvoicePayment, billingStage } from '../dist/billing-workflow.js';
import { submitPaymentProof } from '../dist/billing-automation.js';
import { renderReceiptDocument } from '../dist/receipt-document.js';
import { getRemainingStudentLessons, previewRegularScheduleChange } from '../dist/regular-schedule.js';

const sessions = [{ weekday: 3, start: 1020, duration: 60, tutor: centre.managerId }];
const firstApplication = state => submitEnrolmentApplication(state, { studentId: 'mia', parent: 'Mrs Cheung', phone: '9000 0000', firstLessonDate: '2026-10-07', start: 1020, tutor: centre.managerId });
const planState = (startDate = '2026-08-01', studentId = 'chloe', extra = {}) => ({ invoices: [], audit: [], tuitionPlans: { [studentId]: { studentId, status: 'active', amount: 2000, sessions, currentCycle: buildTeachingCycle({ startDate, sessions }) } }, ...extra });

test('calendar pairs keep 7, 8 and 9 scheduled lessons at the same nominal 8-lesson package price', () => {
  for (const [weekday, closedDates, expected] of [[3, ['2026-10-14'], 7], [3, [], 8], [4, [], 9]]) {
    const state = planState();
    state.tuitionPlans.chloe.sessions = [{ ...sessions[0], weekday }];
    state.billingCalendar = { closedDates };
    const [invoice] = runTuitionBilling(state, { today: '2026-09-20' });
    assert.equal(invoice.amount, 2000);
    assert.equal(invoice.packageLessonCount, 8);
    assert.equal(invoice.billingMonths, 2);
    assert.equal(invoice.lessonCount, expected);
    assert.equal(invoice.lessonPlan.lessonDates.length, expected);
    assert.equal(invoice.period, 'Oct–Nov 2026');
    assert.equal(invoice.periodStart, '2026-10-01');
    assert.equal(invoice.periodEnd, '2026-11-30');
    assert.equal(invoice.description, 'Regular programme · 8 lessons');
    assert.equal(invoice.teachingWeeks, undefined);
    assert.equal(state.makeups, undefined, 'A calendar count difference creates no automatic credit');
  }
});

test('closed weeks remove scheduled dates without extending the fixed calendar period', () => {
  const cycle = buildTeachingCycle({ startDate: '2026-10-07', sessions, closedWeeks: ['2026-10-12'] });
  assert.equal(cycle.startDate, '2026-10-01');
  assert.equal(cycle.firstLessonDate, '2026-10-07');
  assert.equal(cycle.lastLessonDate, '2026-11-25');
  assert.equal(cycle.endDate, '2026-11-30');
  assert.equal(cycle.lessonDates.length, 7);
  assert.ok(!cycle.lessonDates.includes('2026-10-14'));
  assert.equal(cycle.nextInvoiceOn, '2026-11-20');
  assert.equal(cycle.nextCycleStart, '2026-12-01');
  const allClosed = buildTeachingCycle({ startDate: '2026-10-01', sessions, closedWeeks: ['2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30'] });
  assert.equal(allClosed.lessonDates.length, 0);
  assert.equal(allClosed.firstLessonDate, null);
  assert.equal(allClosed.endDate, '2026-11-30');
});

test('student-specific month pairing and year boundaries do not depend on an even-month cohort', () => {
  const september = buildTeachingCycle({ startDate: '2026-09-01', sessions });
  assert.equal(teachingCycleLabel(september), 'Sep–Oct 2026');
  assert.equal(september.endDate, '2026-10-31');
  assert.equal(september.issueDate, '2026-08-20');
  assert.equal(september.dueDate, '2026-09-20');
  const december = buildTeachingCycle({ startDate: '2026-12-01', sessions });
  assert.equal(teachingCycleLabel(december), 'Dec–Jan 2026/2027');
  assert.equal(december.endDate, '2027-01-31');
  assert.equal(december.nextInvoiceOn, '2027-01-20');
  assert.equal(buildTeachingCycle({ startDate: '2028-01-01', sessions }).endDate, '2028-02-29');
  assert.throws(() => buildTeachingCycle({ startDate: '2026-02-30', sessions }), /valid date/);
  assert.throws(() => buildTeachingCycle({ startDate: '2026-01-01', sessions: [] }), /teaching day/);
});

test('renewals issue on the preceding 20th and fall due on the first-month 20th, once per student pair', () => {
  const state = planState();
  assert.deepEqual(runTuitionBilling(state, { today: '2026-09-19' }), []);
  const [invoice] = runTuitionBilling(state, { today: '2026-09-20' });
  assert.equal(invoice.issued, '2026-09-20');
  assert.equal(invoice.due, '2026-10-20');
  assert.equal(invoice.tuitionCycleKey, 'chloe:2026-10-01');
  assert.deepEqual(runTuitionBilling(state, { today: '2026-09-30' }), []);
  assert.deepEqual(runTuitionBilling(state, { today: '2026-10-01' }), []);
  assert.equal(state.tuitionPlans.chloe.currentCycle.startDate, '2026-10-01');
  assert.deepEqual(runTuitionBilling(state, { today: '2026-11-19' }), []);
  const [next] = runTuitionBilling(state, { today: '2026-11-20' });
  assert.equal(next.issued, '2026-11-20'); assert.equal(next.due, '2026-12-20');
  assert.equal(next.period, 'Dec–Jan 2026/2027');
  assert.deepEqual(runTuitionBilling(state, { today: '2026-11-20' }), []);
  const other = planState('2026-07-01', 'ethan');
  assert.equal(runTuitionBilling(other, { today: '2026-08-20' })[0].period, 'Sep–Oct 2026');
  assert.equal(runTuitionBilling(other, { today: '2026-10-20' })[0].period, 'Nov–Dec 2026');
});

test('paused and unpaid first-enrolment plans cannot issue renewal invoices', () => {
  for (const status of ['paused', 'awaiting-first-payment']) {
    const state = planState(); state.tuitionPlans.chloe.status = status;
    assert.deepEqual(runTuitionBilling(state), []);
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
  assert.equal(state.bookings.length, bookingCount + 8);
  assert.equal(state.tuitionPlans.mia.status, 'active');
  const once = clone(state);
  assert.equal(confirmInvoicePayment(state, reviewed.invoice.id).createdReceipt, false);
  assert.deepEqual(state, once);
  const [renewal] = runTuitionBilling(state, { today: '2026-11-20' });
  renewal.proof = true;
  const activation = clone(state.enrolments.mia), beforeBookings = state.bookings.length;
  assert.equal(confirmInvoicePayment(state, renewal.id, { now: '2026-11-20T12:00:00+08:00' }).activatedEnrolment, false);
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


test('late first-enrolment uses the reviewed amount without inventing mid-month proration', () => {
  const state = seed(); state.bookings = [];
  const application = submitEnrolmentApplication(state, { studentId: 'mia', parent: 'Mrs Cheung', phone: '9000 0000', firstLessonDate: '2026-10-28', start: 1020 });
  const { invoice } = reviewEnrolmentApplication(state, application.id, { amount: 1650, regularAmount: 2000 });
  assert.equal(invoice.amount, 1650);
  assert.equal(invoice.periodStart, '2026-10-01'); assert.equal(invoice.periodEnd, '2026-11-30');
  assert.equal(invoice.due, '2026-10-27', 'First-enrolment keeps its own before-first-lesson deadline');
  assert.equal(invoice.lessonPlan.lessonDates[0].date, '2026-10-28');
  assert.equal(state.tuitionPlans.mia.amount, 2000);
});

test('versioned migration upgrades untouched baseline records but preserves receipts, actual proofs and edits', () => {
  const state = seedCentreVolume(seed());
  const receiptBefore = clone(state.receipts), paidBefore = clone(state.invoices.filter(invoice => invoice.receiptId));
  const edited = state.invoices.find(invoice => !invoice.receiptId && invoice.id !== 'INV-1024');
  edited.description = 'Keep this negotiated arrangement'; const editedBefore = clone(edited);
  const actualProof = state.invoices.find(invoice => !invoice.receiptId && invoice.id !== edited.id && invoice.id !== 'INV-1024');
  actualProof.proof = true; actualProof.proofReview = { file: { name: 'actual-proof.png' } }; const proofBefore = clone(actualProof);
  normalizeBillingWorkflow(state);
  assert.deepEqual(state.receipts.filter(receipt => !receipt.workflowFixture), receiptBefore);
  for (const invoice of paidBefore) assert.deepEqual(state.invoices.find(item => item.id === invoice.id), invoice);
  assert.deepEqual(state.invoices.find(item => item.id === edited.id), editedBefore);
  assert.deepEqual(state.invoices.find(item => item.id === actualProof.id), proofBefore);
  assert.ok(state.invoices.filter(invoice => invoice.billingMonths === 2).length > 90);
  assert.equal(state.invoices.find(invoice => invoice.id === 'INV-1024').due, '2026-10-20');
  assert.equal(state.invoices.find(invoice => invoice.id === 'INV-8002').period, 'Sep–Oct 2026');
  assert.equal(state.invoices.find(invoice => invoice.id === 'INV-8006').due, '2026-05-20');
  runTuitionBilling(state);
  const once = clone(state); normalizeTeachingBilling(state); runTuitionBilling(state);
  assert.deepEqual(state, once);
});

// Shapes persisted by the previous four-week release, including a fixture proof.
function oldCycle(first, end, weekStarts, dates, nextInvoiceOn, nextCycleStart, skippedWeeks = []) {
  return { startDate: first, endDate: end, firstLessonDate: first, lastLessonDate: dates.at(-1),
    teachingWeeks: weekStarts.map((start, i) => ({ start, end: new Date(Date.parse(start + 'T12:00:00Z') + 6 * 86400000).toISOString().slice(0, 10), lessonDates: [dates[i]] })), skippedWeeks, lessonDates: dates, nextInvoiceOn, nextCycleStart };
}
function oldInvoice(id, cycle, issued, period, extra = {}) {
  const lessonDates = cycle.lessonDates.map(date => ({ date, start: 960, duration: 60, tutor: centre.managerId }));
  return { id, studentId: 'chloe', amount: 2000, period, periodStart: cycle.firstLessonDate, periodEnd: cycle.endDate,
    firstLessonDate: cycle.firstLessonDate, issued, due: new Date(Date.parse(cycle.firstLessonDate + 'T12:00:00Z') - 86400000).toISOString().slice(0, 10),
    description: 'Recurring tuition · 4 teaching weeks', teachingWeeks: 4, teachingCycle: cycle, lessonCount: 4,
    lessonPlan: { lessonCount: 4, lessonDates, makeUpLessonCount: 0 }, proof: false, receiptId: null, ...extra };
}
test('previous four-week release upgrades its untouched proofs/queues and never duplicates a protected invoice', () => {
  const sept = oldCycle('2026-09-02', '2026-10-04', ['2026-08-31', '2026-09-07', '2026-09-21', '2026-09-28'], ['2026-09-02', '2026-09-09', '2026-09-23', '2026-09-30'], '2026-09-28', '2026-10-05', ['2026-09-14']);
  const oct = oldCycle('2026-10-07', '2026-11-01', ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'], ['2026-10-07', '2026-10-14', '2026-10-21', '2026-10-28'], '2026-10-26', '2026-11-02');
  for (const protect of [false, 'proof', 'receipt', 'edit']) {
    const next = oldInvoice('INV-1024', clone(oct), '2026-09-28', '7 Oct – 28 Oct 2026', { tuitionCycleKey: 'chloe:2026-10-07', automaticallyIssued: true });
    if (protect === 'proof') { next.proof = true; next.proofReview = { file: { name: 'submitted-proof.png' } }; }
    if (protect === 'receipt') next.receiptId = 'R-SAVED';
    if (protect === 'edit') next.amount = 1750;
    const review = oldInvoice('INV-8002', clone(sept), '2026-08-20', '2 Sep – 30 Sep 2026', { workflowFixture: true, proof: true, proofReview: { fixture: true, status: 'needs-review', file: null }, proofSubmittedAt: '2026-09-28T10:15:00+08:00' });
    const proofBefore = clone(review.proofReview), protectedBefore = clone(next);
    const state = { invoices: [next, review], receipts: [], audit: [], teachingBillingVersion: 1, billingCalendar: { closedWeeks: ['2026-09-14'], demo: true }, tuitionPlans: { chloe: { studentId: 'chloe', status: 'active', amount: 2000, sessions: [{ ...sessions[0], start: 960 }], currentCycle: clone(sept), demo: true } } };
    normalizeTeachingBilling(state);
    assert.equal(review.period, 'Sep–Oct 2026'); assert.equal(review.due, '2026-09-20');
    assert.deepEqual(review.proofReview, proofBefore); assert.equal(review.proofSubmittedAt, '2026-09-28T10:15:00+08:00');
    if (protect) assert.deepEqual(next, protectedBefore);
    else { assert.equal(next.period, 'Oct–Nov 2026'); assert.equal(next.lessonCount, 8); assert.equal(next.due, '2026-10-20'); }
    assert.equal(state.billingCalendar, undefined);
    assert.equal(state.tuitionPlans.chloe.currentCycle.startDate, '2026-08-01');
    assert.deepEqual(runTuitionBilling(state), []);
    assert.equal(state.invoices.length, 2);
  }
});

test('calendar receipts use actual dated lessons and respect closures without changing the package fee', () => {
  const state = { ...seed(), ...planState(), bookings: [], billingCalendar: { closedWeeks: ['2026-10-12'] } };
  const [invoice] = runTuitionBilling(state); invoice.proof = true;
  const { receipt } = confirmInvoicePayment(state, invoice.id);
  assert.equal(invoice.lessonCount, 7); assert.equal(invoice.packageLessonCount, 8); assert.equal(invoice.amount, 2000);
  assert.match(renderReceiptDocument(state, receipt.id), /課堂安排 · 7 堂/);
  assert.equal(getRemainingStudentLessons(state, 'chloe').lessons.length, 7);
  const input = { studentId: 'chloe', invoiceId: invoice.id, effectiveDate: '2026-10-01', weekday: 4, start: 1020, tutor: centre.managerId };
  const preview = previewRegularScheduleChange(state, input);
  assert.equal(preview.beforeTotalCount, 7);
  assert.equal(preview.proposedTotalCount, 8);
  assert.ok(!preview.proposedLessons.some(lesson => lesson.date === '2026-10-15'));
});

test('renewals resolve permanent and temporary rules without duplicating or rewriting already-issued periods', () => {
  const state = planState();
  state.regularSchedules = { chloe: { ...sessions[0], weekday: 4, start: 960, effectiveDate: '2026-10-05', endDate: '2026-10-18', previousRule: { ...sessions[0] } } };
  const [invoice] = runTuitionBilling(state);
  assert.deepEqual(invoice.lessonPlan.lessonDates.slice(0, 4).map(lesson => [lesson.date, lesson.start]), [['2026-10-08', 960], ['2026-10-15', 960], ['2026-10-21', 1020], ['2026-10-28', 1020]]);
  assert.equal(invoice.due, '2026-10-20');
  for (const paid of [false, true]) {
    if (paid) invoice.receiptId = 'R-KEEP';
    const before = clone(invoice);
    state.regularSchedules.chloe = { ...sessions[0], weekday: 4, start: 960, effectiveDate: '2026-10-01', previousRule: { ...sessions[0] } };
    assert.deepEqual(runTuitionBilling(state), []);
    assert.deepEqual(invoice, before);
  }
  const [nextInvoice] = runTuitionBilling(state, { today: '2026-11-20' });
  assert.equal(nextInvoice.period, 'Dec–Jan 2026/2027');
  assert.equal(nextInvoice.due, '2026-12-20');
  assert.ok(nextInvoice.lessonPlan.lessonDates.every(lesson => new Date(lesson.date + 'T12:00:00Z').getUTCDay() === 4 && lesson.start === 960));
  assert.equal(runTuitionBilling(state, { today: '2026-11-20' }).length, 0);
});
