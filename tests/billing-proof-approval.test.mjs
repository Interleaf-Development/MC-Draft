import test from 'node:test';
import assert from 'node:assert/strict';
import { seed, clone, centre } from '../dist/model.js';
import { normalizeBillingWorkflow, setProofApprovalMode, billingStage, returnInvoiceProof } from '../dist/billing-workflow.js';
import { normalizeBillingAutomation, previewPaymentProof, submitPaymentProof, paymentDetailsFor, paymentProofChecks, PROOF_SCENARIOS } from '../dist/billing-automation.js';
import { submitEnrolmentApplication, reviewEnrolmentApplication } from '../dist/billing-cycles.js';

const setup = (mode = 'staff') => {
  const state = normalizeBillingWorkflow(normalizeBillingAutomation(seed()));
  setProofApprovalMode(state, mode);
  return state;
};
const proof = extra => ({ payerName: 'Elaine Chan', paymentMethod: 'fps', reference: 'FPS 910277', paymentDate: '2026-09-30', ...extra });
const checksByKey = checks => Object.fromEntries(checks.map(check => [check.key, check.status]));

test('an explicitly automatic centre issues one receipt only after every simulated comparison passes', () => {
  const state = setup('automatic');
  const result = submitPaymentProof(state, 'INV-1024', proof());
  assert.equal(result.createdReceipt, true);
  assert.equal(billingStage(state, result.invoice), 'issued');
  assert.ok(result.review.checks.length >= 9);
  assert.ok(result.review.checks.every(check => check.status === 'pass'));
  assert.equal(result.receipt.bankId, null, 'Proof approval does not imply final bank audit');
  assert.equal(result.receipt.approvalMode, 'automatic');
  assert.equal(result.receipt.documentType, 'receipt');
  assert.equal(result.invoice.proofApprovalMode, 'automatic');
  const saved = clone(state);
  const retry = submitPaymentProof(state, 'INV-1024', proof({ payerName: 'Changed account name' }));
  assert.equal(retry.receipt.id, result.receipt.id);
  assert.equal(retry.createdReceipt, false);
  assert.deepEqual(state, saved, 'Repeating the request cannot replace evidence or duplicate a receipt');
});

test('staff mode keeps even an all-matching proof in the review queue', () => {
  const state = setup();
  const result = submitPaymentProof(state, 'INV-1024', proof());
  assert.ok(result.review.checks.every(check => check.status === 'pass'));
  assert.equal(result.receipt, null);
  assert.equal(billingStage(state, result.invoice), 'review');
});

test('automatic mode retains every exception scenario for staff review', () => {
  for (const { id: scenario } of PROOF_SCENARIOS.filter(item => item.id !== 'pass')) {
    const state = setup('automatic'), count = state.receipts.length;
    const result = submitPaymentProof(state, 'INV-1024', proof({ scenario }));
    assert.equal(result.createdReceipt, false, scenario);
    assert.equal(state.receipts.length, count, scenario);
    assert.equal(billingStage(state, result.invoice), 'review', scenario);
  }
});

test('missing or contradictory extracted fields cannot auto-approve; names compare with the paying account supplied', () => {
  const mismatches = { recipient: 'Another centre', recipientAccount: 'WRONG-ACCOUNT', amount: 1900, payer: 'Another Person', paymentDate: '2026-09-29', paymentMethod: 'payme', reference: 'FPS 555666' };
  for (const [field, wrong] of Object.entries(mismatches)) {
    for (const value of [null, wrong]) {
      const state = setup('automatic');
      const result = submitPaymentProof(state, 'INV-1024', proof({ extracted: { [field]: value } }));
      assert.equal(result.receipt, null, field);
      assert.equal(result.review.checks.find(check => check.key === field).status, value === null ? 'uncertain' : 'fail', field);
    }
  }
  const state = setup('automatic');
  const result = submitPaymentProof(state, 'INV-1024', proof({ payerName: 'Another Person' }));
  assert.equal(result.createdReceipt, true, 'The named account may belong to someone other than the student’s parent');
});

test('receiving account checks respect centre settings and do not invent unavailable non-FPS details', () => {
  const state = setup('automatic');
  state.paymentDetails = { recipient: 'Centre testing account', fpsId: 'TEST-FPS-123' };
  const before = clone(state), preview = previewPaymentProof(state, 'INV-1024', proof());
  assert.equal(preview.extracted.recipient, 'Centre testing account');
  assert.equal(preview.extracted.recipientAccount, 'TEST-FPS-123');
  assert.deepEqual(state, before);
  assert.deepEqual(paymentDetailsFor(state), state.paymentDetails);
  const noAccount = submitPaymentProof(state, 'INV-1024', proof({ paymentMethod: 'bank-transfer' }));
  assert.equal(noAccount.receipt, null);
  assert.equal(checksByKey(noAccount.review.checks).recipientAccount, 'uncertain');
  state.paymentDetails.bankAccount = 'TEST-BANK-456';
  const withAccount = submitPaymentProof(state, 'INV-1024', proof({ paymentMethod: 'bank-transfer' }));
  assert.equal(withAccount.createdReceipt, true);
  for (const paymentMethod of ['cash', 'cheque']) {
    const manual = setup('automatic');
    manual.paymentDetails = { recipient: centre.name, recipientAccount: 'DEMO-MANUAL' };
    const result = submitPaymentProof(manual, 'INV-1024', proof({ paymentMethod }));
    assert.equal(result.receipt, null);
    assert.equal(checksByKey(result.review.checks).paymentMethod, 'uncertain');
  }
});

test('checks are pure for historic uploads and missing fields remain uncertain; new seeded review has a clear example', () => {
  const state = setup(), invoice = state.invoices.find(item => item.id === 'INV-1024');
  invoice.proof = true;
  invoice.proofReview = { status: 'passed', extracted: { recipient: centre.name, amount: 2000 }, file: { name: 'actual-upload.png', dataUrl: 'data:image/png;base64,YWJj' } };
  const before = clone(state), checks = checksByKey(paymentProofChecks(state, invoice));
  for (const key of ['isPaymentProof', 'recipientAccount', 'payer', 'paymentDate', 'paymentMethod', 'reference']) assert.equal(checks[key], 'uncertain', key);
  assert.deepEqual(state, before);
  const fixture = state.invoices.find(item => item.id === 'INV-8002');
  assert.equal(billingStage(state, fixture), 'review');
  assert.ok(paymentProofChecks(state, fixture).every(check => check.status === 'pass'));
  const wrongAmount = state.invoices.find(item => item.id === 'INV-8004');
  assert.equal(checksByKey(paymentProofChecks(state, wrongAmount)).amount, 'fail');
});

test('a duplicate reference or reused pending image remains review-only in automatic mode', () => {
  for (const image of [false, true]) {
    const state = setup();
    const file = { name: 'confirmation.png', mimeType: 'image/png', dataUrl: 'data:image/png;base64,YWJj' };
    submitPaymentProof(state, 'INV-1024', proof(image ? { scenario: 'unreadable', file } : {}));
    state.invoices.push({ id: 'INV-SECOND-AUTO', studentId: 'ethan', amount: 2000, issued: '2026-09-20', proof: false });
    setProofApprovalMode(state, 'automatic');
    const result = submitPaymentProof(state, 'INV-SECOND-AUTO', proof(image ? { file, reference: 'FPS 999123' } : {}));
    assert.equal(result.review.status, 'duplicate');
    assert.equal(result.receipt, null);
  }
});

test('returned proof is a new submission and can be automatically approved after the centre enables the policy', () => {
  const state = setup();
  const first = submitPaymentProof(state, 'INV-1024', proof());
  returnInvoiceProof(state, 'INV-1024', { reason: 'Please show the full confirmation.' });
  setProofApprovalMode(state, 'automatic');
  const next = submitPaymentProof(state, 'INV-1024', proof());
  assert.notEqual(next.review.id, first.review.id);
  assert.equal(next.createdReceipt, true);
  assert.equal(next.invoice.proofReturnHistory.length, 1);
});

function firstEnrolment(state) {
  const application = submitEnrolmentApplication(state, { studentId: 'mia', parent: 'Mrs Cheung', phone: '9000 0000', firstLessonDate: '2026-10-07', start: 1020, tutor: centre.managerId });
  const { invoice } = reviewEnrolmentApplication(state, application.id, { amount: 1800, regularAmount: 2000 });
  return { application, invoice };
}

test('automatic first-payment approval activates enrolment once; later approved payments do not reactivate it', () => {
  const state = setup('automatic'), { application, invoice } = firstEnrolment(state), beforeBookings = state.bookings.length;
  const result = submitPaymentProof(state, invoice.id, proof({ payerName: 'Mandy Cheung', reference: 'FPS 888777' }));
  assert.equal(result.createdReceipt, true);
  assert.equal(result.activatedEnrolment, true);
  assert.equal(application.status, 'active');
  assert.equal(state.assessment.enrolled, true);
  assert.equal(state.bookings.length, beforeBookings + invoice.lessonPlan.lessonDates.length);
  const saved = clone(state);
  assert.equal(submitPaymentProof(state, invoice.id, proof()).createdReceipt, false);
  assert.deepEqual(state, saved);
  const activation = clone(state.enrolments.mia), activeBookings = state.bookings.length;
  const renewal = submitPaymentProof(state, 'INV-1024', proof());
  assert.equal(renewal.activatedEnrolment, false);
  assert.deepEqual(state.enrolments.mia, activation);
  assert.equal(state.bookings.length, activeBookings);
});

test('automatic first-enrolment capacity failure retains proof for recovery and issues no receipt or activation', () => {
  const state = setup('automatic'), { application, invoice } = firstEnrolment(state);
  state.bookings.push(...Array.from({ length: 6 }, (_, index) => ({ id: 'full-' + index, studentId: 'occupied-' + index, date: '2026-10-14', start: 1020, duration: 60, tutor: centre.managerId, status: 'scheduled' })));
  const count = state.receipts.length, bookings = clone(state.bookings);
  const result = submitPaymentProof(state, invoice.id, proof({ payerName: 'Mandy Cheung', reference: 'FPS 888777' }));
  assert.match(result.approvalError, /six students/);
  assert.equal(result.review.automaticApprovalError, result.approvalError);
  assert.equal(result.receipt, null);
  assert.equal(billingStage(state, invoice), 'review');
  assert.equal(state.receipts.length, count);
  assert.equal(application.status, 'awaiting-payment');
  assert.deepEqual(state.bookings, bookings);
});
