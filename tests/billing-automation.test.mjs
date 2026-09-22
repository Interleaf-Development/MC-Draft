import test from 'node:test';
import assert from 'node:assert/strict';
import { seed, seedCentreVolume, clone, reconciliation, matchReceipt, reportingTotals } from '../dist/model.js';
import { PROOF_SCENARIOS, normalizeBillingAutomation, previewPaymentProof, submitPaymentProof, analyzeStatement, importBankStatement, demoStatementRows, paymentChannel } from '../dist/billing-automation.js';

import { confirmInvoicePayment } from '../dist/billing-workflow.js';

const setup = () => normalizeBillingAutomation(seed());
const proof = overrides => ({ scenario: 'pass', reference: 'FPS 910277', paymentDate: '2026-09-30', ...overrides });
function singleReceipt(options) {
  const state = setup();
  state.invoices = [state.invoices.find(invoice => invoice.id === 'INV-1024')];
  state.receipts = [];
  state.bankTransactions = [];
  if (options !== false) { submitPaymentProof(state, 'INV-1024', proof(options)); confirmInvoicePayment(state, 'INV-1024'); }
  return state;
}
const deposit = overrides => ({ id: 'BANK-TEST', date: '2026-09-30', amount: 2000, reference: 'FPS 910277', payer: 'Elaine Chan', direction: 'credit', ...overrides });

test('normalization adds only missing demo metadata and never issues a legacy receipt', () => {
  const state = seed(), count = state.receipts.length;
  state.invoices[0].proof = true;
  state.invoices.find(invoice => invoice.id === 'INV-1025').proofReference = 'CUSTOM 123456';
  normalizeBillingAutomation(state);
  assert.equal(state.receipts.length, count);
  assert.equal(state.invoices[0].receiptId, null);
  assert.equal(state.invoices.find(invoice => invoice.id === 'INV-1025').proofReference, 'CUSTOM 123456');
  assert.equal(state.invoices.find(invoice => invoice.id === 'INV-1026').proofReference, '724810');
  const before = clone(state);
  normalizeBillingAutomation(state);
  assert.deepEqual(state, before);
});

test('passing proof preview is pure; staff approval is required before issuing a receipt', () => {
  const state = setup(), before = clone(state), preview = previewPaymentProof(state, 'INV-1024', proof());
  assert.equal(preview.mode, 'demo');
  assert.equal(preview.status, 'passed');
  assert.deepEqual(state, before);
  const result = submitPaymentProof(state, 'INV-1024', proof());
  assert.equal(result.createdReceipt, false);
  assert.equal(result.receipt, null);
  const approved = confirmInvoicePayment(state, 'INV-1024');
  assert.equal(approved.receipt.bankId, null);
  assert.equal(approved.receipt.issuedDate, '2026-09-30');
  assert.ok(result.review.checks.every(check => check.status === 'pass'));
  const issued = clone(state);
  assert.equal(submitPaymentProof(state, 'INV-1024', proof()).createdReceipt, false);
  assert.deepEqual(state, issued);
});

test('all exception scenarios retain the proof for review without issuing a receipt', () => {
  for (const { id: scenario } of PROOF_SCENARIOS.filter(item => item.id !== 'pass')) {
    const state = singleReceipt();
    state.receipts = []; state.invoices[0].receiptId = null; delete state.invoices[0].proofReview;
    const result = submitPaymentProof(state, 'INV-1024', proof({ scenario }));
    assert.equal(result.receipt, null, scenario);
    assert.equal(result.createdReceipt, false, scenario);
    assert.ok(result.review.reasons.length, scenario);
    assert.equal(result.review.status, scenario === 'duplicate' ? 'duplicate' : 'needs-review');
    assert.equal(state.invoices[0].proof, true);
  }
});

test('proof preview uses an explicitly recorded payer when available', () => {
  const state = setup();
  state.invoices.find(invoice => invoice.id === 'INV-1024').proofPayer = 'Fictional Parent Chan';
  assert.equal(previewPaymentProof(state, 'INV-1024', proof()).extracted.payer, 'Fictional Parent Chan');
});

test('a real reused proof reference or identical image is flagged across invoices', () => {
  const state = singleReceipt();
  state.invoices.push({ id: 'INV-SECOND', studentId: 'ethan', amount: 2000, receiptId: null, proof: false });
  const duplicate = submitPaymentProof(state, 'INV-SECOND', proof());
  assert.equal(duplicate.review.status, 'duplicate');
  assert.equal(duplicate.receipt, null);
  const another = setup(), file = { name: 'demo.png', mimeType: 'image/png', type: 'image', size: 3, dataUrl: 'data:image/png;base64,YWJj' };
  submitPaymentProof(another, 'INV-1024', proof({ file }));
  another.invoices.push({ id: 'INV-SECOND', studentId: 'ethan', amount: 2000, receiptId: null, proof: false });
  assert.equal(submitPaymentProof(another, 'INV-SECOND', proof({ reference: 'DIFFERENT 888888', file })).review.status, 'duplicate');
});

test('matching needs explicit strong identity/reference and the date window, never amount or suggestedStudent alone', () => {
  const state = singleReceipt();
  for (const bank of [
    deposit({ reference: 'TRANSFER', payer: '', suggestedStudent: 'chloe' }),
    deposit({ reference: 'TRANSFER', payer: 'Chan' }),
    deposit({ reference: 'TRANSFER', payer: 'Mrs Chan' }),
    deposit({ date: '2026-10-20' })
  ]) assert.equal(analyzeStatement(state, [bank]).receipts[0].status, 'missing');
  const nameMatch = analyzeStatement(state, [deposit({ reference: 'UNRELATED TRANSFER', payer: 'Elaine Chan' })]).receipts[0];
  assert.equal(nameMatch.autoEligible, true);
  const referenceMatch = analyzeStatement(state, [deposit({ reference: 'TRANSFER 910277 HK', payer: '' })]).receipts[0];
  assert.equal(referenceMatch.autoEligible, true);
  state.invoices[0].proofReview.extracted.reference = 'BANK TRANSFER 2026';
  assert.equal(analyzeStatement(state, [deposit({ reference: 'BANK TRANSFER 2026', payer: '' })]).receipts[0].status, 'missing');
  assert.equal(state.receipts[0].bankId, null, 'Analysis alone must not link a receipt');
});

test('mutual uniqueness blocks both multiple deposits per receipt and multiple receipts per deposit', () => {
  const state = singleReceipt(), rows = [deposit({ transactionId: 'deposit-one' }), deposit({ id: 'BANK-SECOND', transactionId: 'deposit-two' })];
  assert.equal(analyzeStatement(state, rows).receipts[0].status, 'ambiguous');
  const batch = importBankStatement(state, { name: 'Two actual deposits', rows });
  assert.equal(batch.added, 2);
  assert.equal(batch.counts.autoMatched, 0);
  assert.equal(state.receipts[0].bankId, null);
  const shared = singleReceipt();
  shared.invoices.push({ ...shared.invoices[0], id: 'INV-SECOND', receiptId: 'R-SECOND' });
  shared.receipts.push({ ...shared.receipts[0], id: 'R-SECOND', invoiceId: 'INV-SECOND' });
  assert.ok(analyzeStatement(shared, [deposit()]).receipts.every(item => item.status === 'ambiguous'));
  assert.equal(importBankStatement(shared, { name: 'Shared evidence', rows: [deposit()] }).counts.autoMatched, 0);
});

test('wrong amount and outgoing transfers never auto-link', () => {
  const state = singleReceipt();
  const mismatch = analyzeStatement(state, [deposit({ amount: 1800 })]).receipts[0];
  assert.equal(mismatch.status, 'amount-mismatch');
  assert.equal(mismatch.difference, 200);
  const batch = importBankStatement(state, { name: 'Amount review', rows: [deposit({ amount: 1800 }), deposit({ id: 'OUT', direction: 'debit', reference: 'OUTGOING 111111' })] });
  assert.equal(batch.ignored, 0);
  assert.equal(batch.addedDebits, 1);
  assert.equal(batch.counts.autoMatched, 0);
  assert.equal(state.receipts[0].bankId, null);
});

test('statement import is idempotent by bank transaction identity and preserves existing links', () => {
  const state = singleReceipt(), rows = [deposit({ transactionId: 'BANK-REFERENCE-001' })];
  const first = importBankStatement(state, { name: 'Statement', rows });
  assert.equal(first.added, 1);
  assert.equal(first.counts.autoMatched, 1);
  const receipt = clone(state.receipts[0]), count = state.bankTransactions.length;
  const second = importBankStatement(state, { name: 'Statement again', rows });
  assert.equal(second.added, 0);
  assert.equal(second.duplicates, 1);
  assert.equal(second.counts.autoMatched, 0);
  assert.deepEqual(state.receipts[0], receipt);
  assert.equal(state.bankTransactions.length, count);
  assert.equal(importBankStatement(state, { name: 'Separate deposit', rows: [deposit({ id: 'DIFFERENT', transactionId: 'BANK-REFERENCE-002' })] }).added, 1);
  assert.equal(state.receipts[0].bankId, receipt.bankId);
  const separate = singleReceipt();
  const sameDetails = [deposit({ id: 'ONE', transactionId: 'A-BC' }), deposit({ id: 'TWO', transactionId: 'AB-C' })];
  const distinct = importBankStatement(separate, { name: 'Distinct transaction IDs', rows: sameDetails });
  assert.equal(distinct.added, 2);
  assert.equal(distinct.duplicates, 0);
  assert.equal(distinct.receiptResults[0].status, 'ambiguous');
});

test('malformed rows or conflicting transaction IDs fail before any import mutations', () => {
  const state = singleReceipt();
  importBankStatement(state, { name: 'Original', rows: [deposit({ transactionId: 'stable-id' })] });
  for (const rows of [
    [deposit({ id: 'NEW' }), deposit({ date: '2026-02-30' })],
    [deposit({ amount: 0.001 })],
    [deposit({ id: 'NEW', reference: 'NEW 222222' }), deposit({ transactionId: 'stable-id', amount: 1800 })]
  ]) {
    const before = clone(state);
    assert.throws(() => importBankStatement(state, { name: 'Invalid', rows }));
    assert.deepEqual(state, before);
  }
});

test('demo statement shows same-day, date-back, date-forward, amount difference, ambiguity and unmatched credit', () => {
  const state = normalizeBillingAutomation(seedCentreVolume(seed()));
  submitPaymentProof(state, 'INV-1024', proof());
  confirmInvoicePayment(state, 'INV-1024');
  const dates = state.receipts.map(receipt => [receipt.id, receipt.issuedDate]);
  const rows = demoStatementRows(state), batch = importBankStatement(state, { name: 'Fictional statement', rows });
  const result = id => batch.receiptResults.find(item => item.receiptId === id);
  assert.equal(result('R-1024').status, 'matched');
  assert.equal(reconciliation(state, state.receipts.find(receipt => receipt.id === 'R-1025')).adjustment, 'Date back');
  assert.equal(reconciliation(state, state.receipts.find(receipt => receipt.id === 'R-1026')).adjustment, 'Date forward');
  assert.equal(result('R-1027').status, 'amount-mismatch');
  assert.ok(batch.receiptResults.some(item => item.status === 'ambiguous'));
  assert.ok(batch.unmatchedDeposits.some(bank => bank.transactionId === 'DEMO-UNALLOCATED-001'));
  assert.equal(batch.ignored, 0);
  assert.equal(batch.addedDebits, 1);
  assert.deepEqual(state.receipts.map(receipt => [receipt.id, receipt.issuedDate]), dates);
  assert.equal(state.receipts.find(receipt => receipt.id === 'R-1028').bankId, 'BANK-104');
  const again = importBankStatement(state, { name: 'Repeated fictional statement', rows });
  assert.equal(again.added, 0);
  assert.equal(again.counts.autoMatched, 0);
});

test('resolving the sample ambiguity does not change subsequent sample deposits', () => {
  const state = normalizeBillingAutomation(seedCentreVolume(seed()));
  const rows = demoStatementRows(state);
  const batch = importBankStatement(state, { name: 'Fictional statement', rows });
  const ambiguous = batch.receiptResults.find(item => item.receiptId === 'R-5005');
  assert.equal(ambiguous.status, 'ambiguous');
  const selectedBankId = ambiguous.candidateBankIds[0];
  matchReceipt(state, ambiguous.receiptId, selectedBankId);
  assert.deepEqual(demoStatementRows(state), rows);
  const again = importBankStatement(state, { name: 'Same fictional statement after review', rows: demoStatementRows(state) });
  assert.equal(again.added, 0);
  assert.equal(again.counts.autoMatched, 0);
  assert.equal(state.receipts.find(receipt => receipt.id === 'R-5005').bankId, selectedBankId);
});


test('payer name and method persist independently of bank confirmation and affect proof identity', () => {
  const state = singleReceipt(false);
  const options = proof({ payerName: '  William Chan  ', paymentMethod: 'bank-transfer' });
  const result = submitPaymentProof(state, 'INV-1024', options);
  assert.equal(result.invoice.proofPayer, 'William Chan');
  assert.equal(result.invoice.paymentMethod, 'bank-transfer');
  assert.equal(result.review.extracted.payer, 'William Chan');
  assert.equal(result.receipt, null);
  const approved = confirmInvoicePayment(state, 'INV-1024');
  assert.equal(approved.receipt.documentType, 'receipt');
  assert.equal(approved.receipt.bankId, null);
  assert.equal(state.receipts.length, 1);
  assert.notEqual(previewPaymentProof(state, 'INV-1024', { ...options, payerName: 'Someone Else' }).fingerprint, result.review.fingerprint);
  assert.notEqual(previewPaymentProof(state, 'INV-1024', { ...options, paymentMethod: 'payme' }).fingerprint, result.review.fingerprint);
  assert.equal(analyzeStatement(state, [deposit({ payer: 'William Chan', reference: 'OTHER TRANSFER' })]).receipts[0].autoEligible, true);
  assert.equal(analyzeStatement(state, [deposit({ payer: 'Elaine Chan', reference: 'OTHER TRANSFER' })]).receipts[0].autoEligible, false, 'An explicitly supplied account name replaces the household default');
  for (const invalid of [{ payerName: '' }, { payerName: null }, { payerName: 'a'.repeat(121) }, { paymentMethod: 'bitcoin' }]) {
    const before = clone(state);
    assert.throws(() => previewPaymentProof(state, 'INV-1024', proof(invalid)));
    assert.deepEqual(state, before);
  }
});

test('payment channels defer cash and cheque, and legacy receipts remain non-face-to-face', () => {
  const state = singleReceipt(), receipt = state.receipts[0];
  assert.equal(paymentChannel(state, receipt), 'non-face-to-face');
  for (const method of ['cash', 'cheque']) {
    state.invoices[0].paymentMethod = method;
    assert.equal(paymentChannel(state, receipt), method);
    const batch = importBankStatement(state, { name: 'Shared statement', rows: [deposit()] });
    assert.equal(batch.counts.autoMatched, 0);
    assert.equal(batch.counts.missing, 0);
    assert.equal(batch.receiptResults[0].status, 'deferred');
    assert.equal(state.receipts[0].bankId, null);
    assert.throws(() => matchReceipt(state, receipt.id, 'BANK-TEST'), /cash or cheque workflow/);
  }
  state.invoices[0].paymentMethod = 'fps';
  const matched = importBankStatement(state, { name: 'Same statement', rows: [deposit()] });
  assert.equal(matched.added, 0);
  assert.equal(matched.counts.autoMatched, 1);
});

test('outgoing ledger movements are retained once and cannot match manually or through legacy links', () => {
  const state = singleReceipt(), rows = [deposit({ id: 'OUT', direction: 'debit' })];
  const imported = importBankStatement(state, { name: 'Bank movements', rows });
  assert.equal(imported.added, 1);
  assert.equal(state.bankTransactions[0].direction, 'debit');
  assert.equal(imported.counts.autoMatched, 0);
  assert.equal(importBankStatement(state, { name: 'Repeat', rows }).duplicates, 1);
  assert.throws(() => matchReceipt(state, state.receipts[0].id, 'OUT'), /incoming bank credits/);
  state.receipts[0].bankId = 'OUT';
  assert.equal(reconciliation(state, state.receipts[0]).status, 'Unmatched');
  assert.equal(analyzeStatement(state).receipts[0].status, 'missing');
  assert.equal(reportingTotals(state, '2026-09').total, 0);
  assert.equal(reportingTotals(state, '2026-09').unmatchedBank.length, 0);
});

test('same-looking distinct entries survive import while repeated imports retain their multiplicity', () => {
  const state = singleReceipt(), row = deposit();
  delete row.id;
  const batch = importBankStatement(state, { name: 'Two deposits', rows: [row, row] });
  assert.equal(batch.added, 2);
  assert.equal(batch.receiptResults[0].status, 'ambiguous');
  assert.equal(importBankStatement(state, { name: 'Same export', rows: [row, row] }).duplicates, 2);
  assert.equal(state.bankTransactions.length, 2);
  const reversed = [{ ...row, direction: 'debit' }, row];
  assert.equal(importBankStatement(state, { name: 'Including withdrawal', rows: reversed }).added, 1);
  assert.equal(state.bankTransactions.length, 3);
});

test('failed imports do not enrich old rows, link receipts or retain earlier rows', () => {
  const state = singleReceipt();
  importBankStatement(state, { name: 'Original', rows: [deposit({ transactionId: 'original', payer: '' })] });
  const before = clone(state);
  assert.throws(() => importBankStatement(state, { name: 'Conflict', rows: [deposit({ transactionId: 'original', payer: 'New Payer' }), deposit({ id: 'NEW', transactionId: 'new' }), deposit({ transactionId: 'original', direction: 'debit' })] }));
  assert.deepEqual(state, before);
});

test('raw bank descriptions match a full supplied payer name without inventing payer or initiation date fields', () => {
  const state = singleReceipt({ payerName: 'William Chan' });
  const description = 'FPS PAYMENT WILLIAM CHAN 888999 29/09/2026';
  const batch = importBankStatement(state, { name: 'Bank CSV', rows: [deposit({ reference: description, description, payer: '' })] });
  assert.equal(batch.counts.autoMatched, 1);
  assert.equal(state.bankTransactions[0].description, description);
  assert.equal(state.bankTransactions[0].payer, '');
  assert.equal(state.bankTransactions[0].date, '2026-09-30');
  assert.equal(state.receipts[0].issuedDate, '2026-09-30');
});
