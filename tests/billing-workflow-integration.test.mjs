import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { seed, clone } from '../dist/model.js';
import { normalizeBillingAutomation, submitPaymentProof, importBankStatement } from '../dist/billing-automation.js';
import { normalizeBillingWorkflow, billingStage, setBillingAutoSent, confirmInvoicePayment, returnInvoiceProof } from '../dist/billing-workflow.js';
import { isPaymentAcknowledgement } from '../dist/receipt-document.js';
const setup = () => normalizeBillingWorkflow(normalizeBillingAutomation(seed()));
const options = { scenario: 'pass', reference: 'FPS 910277', paymentDate: '2026-09-30', payerName: 'Elaine Chan', paymentMethod: 'fps' };

test('Auto-sent and manual review issue one receipt without creating a bank match', () => {
  for (const autoSent of [true, false]) {
    const state = setup(); setBillingAutoSent(state, autoSent);
    const result = submitPaymentProof(state, 'INV-1024', options);
    assert.equal(billingStage(state, result.invoice), autoSent ? 'issued' : 'review');
    assert.equal(Boolean(result.receipt), autoSent);
    const savedProof = clone(result.review);
    if (!autoSent) {
      setBillingAutoSent(state, true);
      assert.equal(result.invoice.receiptId, null, 'setting does not retroactively issue');
    }
    const confirmed = confirmInvoicePayment(state, 'INV-1024');
    assert.equal(isPaymentAcknowledgement(state, confirmed.receipt), false);
    assert.equal(confirmed.receipt.bankId, null);
    assert.deepEqual(result.invoice.proofReview, savedProof, 'staff confirmation preserves original automated evidence');
    const before = clone(state);
    submitPaymentProof(state, 'INV-1024', { ...options, payerName: 'Someone Else' });
    assert.deepEqual(state, before, 'cannot overwrite proof after the payment was confirmed');
    assert.equal(state.receipts.filter(r => r.invoiceId === 'INV-1024').length, 1);
  }
});

test('returned proof can be resubmitted with identical contents and returns to manual review', () => {
  const state = setup(); setBillingAutoSent(state, false);
  const first = submitPaymentProof(state, 'INV-1024', options);
  const oldProofId = first.review.id;
  returnInvoiceProof(state, 'INV-1024', { reason: 'Please include the full transfer.' });
  assert.equal(billingStage(state, first.invoice), 'parent');
  const next = submitPaymentProof(state, 'INV-1024', options);
  assert.equal(billingStage(state, next.invoice), 'review');
  assert.notEqual(next.review.id, oldProofId);
  assert.equal(next.invoice.proofReturnHistory[0].reason, 'Please include the full transfer.');
  assert.equal(next.receipt, null);
});

test('manually accepted uncertain proof cannot be reused to auto-issue another receipt', () => {
  const state = setup(); setBillingAutoSent(state, false);
  const file = { name: 'confirmation.png', mimeType: 'image/png', size: 3, dataUrl: 'data:image/png;base64,YWJj' };
  submitPaymentProof(state, 'INV-1024', { ...options, scenario: 'unreadable', file });
  confirmInvoicePayment(state, 'INV-1024');
  state.invoices.push({ id: 'INV-9991', studentId: 'chloe', amount: 2000, issued: '2026-09-01', due: '2026-10-01', proof: false });
  setBillingAutoSent(state, true);
  const reused = submitPaymentProof(state, 'INV-9991', { ...options, file });
  assert.equal(reused.review.status, 'duplicate');
  assert.equal(reused.receipt, null);
  assert.equal(billingStage(state, reused.invoice), 'review');
});

test('final audit links a new receipt without creating a second parent document', () => {
  const state = setup();
  const { receipt } = submitPaymentProof(state, 'INV-1024', options);
  const count = state.receipts.length, issued = receipt.issuedAt;
  importBankStatement(state, { name: 'Payment audit.csv', rows: [{ transactionId: 'QA-910277', date: '2026-09-30', amount: 2000, reference: 'FPS 910277', payer: 'Elaine Chan' }] });
  const reconciled = state.receipts.find(r => r.id === receipt.id);
  assert.ok(reconciled.bankId);
  assert.equal(reconciled.issuedAt, issued);
  assert.equal(state.receipts.length, count);
});

test('real billing save rolls back receipt creation if browser persistence fails, then succeeds on retry', async () => {
  const source = await readFile(new URL('../dist/app.js', import.meta.url), 'utf8');
  const save = source.slice(source.indexOf('function saveBillingChange('), source.indexOf('function closeModal('));
  const state = setup(); setBillingAutoSent(state, false); submitPaymentProof(state, 'INV-1024', options);
  const before = clone(state), error = { textContent: '', classList: { add() {} } };
  let fail = true, renders = 0, persisted;
  const context = { state, clone, STORAGE: 'test', previousState: null, t: s => s, $: () => error, toast() {}, render() { renders++; }, localStorage: { setItem(key, value) { if (fail) throw new Error('quota'); persisted = JSON.parse(value); } }, confirmInvoicePayment };
  const host = vm.runInNewContext(save + '\n({save:()=>saveBillingChange(()=>confirmInvoicePayment(state,"INV-1024")),get:()=>state})', context);
  assert.equal(host.save(), false);
  assert.deepEqual(host.get(), before);
  assert.equal(renders, 0);
  assert.match(error.textContent, /Could not save/);
  fail = false;
  assert.equal(host.save(), true);
  assert.equal(renders, 1);
  assert.ok(persisted.invoices.find(i => i.id === 'INV-1024').receiptId);
});
