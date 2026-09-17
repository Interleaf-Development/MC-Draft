import test from 'node:test';
import assert from 'node:assert/strict';
import { TODAY, seed, seedCentreVolume } from '../dist/model.js';
import { normalizeBillingAutomation, submitPaymentProof } from '../dist/billing-automation.js';
import { receiptPeriod, receiptRegister, hasReceiptProof, createReceiptsUI } from '../dist/receipts-ui.js';

const fresh = () => normalizeBillingAutomation(seedCentreVolume(seed()));
const createUI = state => {
  const calls = { renders: 0, receipts: [], proofs: [] };
  const ui = createReceiptsUI({ getState: () => state, render: () => { calls.renders++; }, openReceipt: id => calls.receipts.push(id), openProof: id => calls.proofs.push(id) });
  return { ui, calls };
};

test('receipt week is Monday–Sunday across month, year and leap-day boundaries', () => {
  assert.deepEqual(receiptPeriod('2026-09-30'), { start: '2026-09-28', end: '2026-10-04' });
  assert.deepEqual(receiptPeriod('2027-01-01'), { start: '2026-12-28', end: '2027-01-03' });
  assert.deepEqual(receiptPeriod('2027-01-03'), { start: '2026-12-28', end: '2027-01-03' });
  assert.deepEqual(receiptPeriod('2027-01-04'), { start: '2027-01-04', end: '2027-01-10' });
  assert.deepEqual(receiptPeriod('2028-02-29', 'day'), { start: '2028-02-29', end: '2028-02-29' });
  assert.deepEqual(receiptPeriod('2026-02-29'), receiptPeriod(TODAY));
});

test('sent-date register uses receipt issue date, not proof date or bank credit date', () => {
  const state = fresh();
  const receipt = state.receipts.find(item => item.id === 'R-1025');
  assert.equal(receipt.issuedDate, '2026-08-01');
  state.bankTransactions.push({ id: 'bank-test', date: '2026-07-31', amount: 2000 });
  receipt.bankId = 'bank-test'; receipt.proofDate = '2026-07-31';
  assert.equal(receiptRegister(state, { date: '2026-07-31', view: 'day', query: receipt.id }).total, 0);
  const result = receiptRegister(state, { date: '2026-08-01', view: 'day', query: receipt.id });
  assert.equal(result.total, 1); assert.equal(result.groups[0].date, '2026-08-01');
  assert.equal(result.items[0].receipt, receipt);
});

test('week includes both endpoints, excludes adjacent dates and sorts sent-day groups newest first', () => {
  const state = { invoices: [], receipts: ['2026-09-27', '2026-09-28', '2026-09-30', '2026-10-04', '2026-10-05'].map((issuedDate, index) => ({ id: 'R-' + index, studentId: 'chloe', amount: 2000, issuedDate })) };
  const result = receiptRegister(state);
  assert.equal(result.total, 3); assert.equal(result.amount, 6000);
  assert.deepEqual(result.groups.map(group => group.date), ['2026-10-04', '2026-09-30', '2026-09-28']);
});

test('search finds student, parent, student number, receipt, invoice and payment references within the period', () => {
  const state = fresh();
  for (const query of ['emma lam', 'Mrs Lam', 'Winnie Lam', 'MC-0004', 'R-1027', 'INV-1027', '909003']) {
    const result = receiptRegister(state, { query });
    assert.ok(result.items.some(row => row.receipt.id === 'R-1027'), query);
  }
  const invoice = state.invoices.find(item => item.id === 'INV-1027');
  invoice.proofReview.extracted.payer = 'Different Proof Sender';
  assert.equal(receiptRegister(state, { query: 'Different Proof Sender' }).items[0].receipt.id, 'R-1027');
  assert.equal(receiptRegister(state, { query: 'R-1025' }).total, 0, 'Historical receipt remains outside this week');
  assert.equal(receiptRegister(state, { query: 'Emma Lam' }).items[0].parent, 'Winnie Lam');
});

test('large fixture ledger paginates without duplicates and totals cover all filtered results', () => {
  const state = fresh(), before = JSON.stringify(state);
  const first = receiptRegister(state), second = receiptRegister(state, { page: 2 });
  assert.ok(first.total > 100); assert.equal(first.items.length, 25); assert.equal(second.items.length, 25);
  assert.equal(new Set([...first.items, ...second.items].map(row => row.receipt.id)).size, 50);
  assert.equal(first.amount, first.total * 2000);
  assert.equal(second.amount, first.amount);
  const last = receiptRegister(state, { page: 900, pageSize: 50 });
  assert.equal(last.page, last.pageCount); assert.equal(last.last, last.total);
  assert.equal(last.pageSize, 50); assert.ok(last.items.length <= 50);
  assert.equal(JSON.stringify(state), before, 'Reading the receipt register never modifies fixture records');
});

test('new automatically issued receipt appears in today’s group with its saved payment proof', () => {
  const state = fresh();
  assert.equal(receiptRegister(state, { view: 'day', query: 'Chloe Chan' }).total, 0);
  submitPaymentProof(state, 'INV-1024', { scenario: 'pass', reference: 'FPS RECEIPTS-TEST', paymentDate: TODAY });
  const result = receiptRegister(state, { view: 'day', query: 'Chloe Chan' });
  assert.equal(result.total, 1); assert.equal(result.groups[0].date, TODAY);
  assert.equal(result.items[0].receipt.id, 'R-1024');
  assert.ok(result.items[0].proofAvailable);
});

test('receipt and payment-proof actions open the correct connected records without changing data', () => {
  const state = fresh(), before = JSON.stringify(state), { ui, calls } = createUI(state);
  const html = ui.render();
  assert.match(html, /data-action="receipts-proof"/);
  assert.match(html, /aria-label="Receipts by sent date"/);
  ui.handleAction('receipts-open', 'R-1027');
  ui.handleAction('receipts-proof', 'R-1027');
  ui.handleAction('receipts-proof', 'unknown');
  assert.deepEqual(calls.receipts, ['R-1027']);
  assert.deepEqual(calls.proofs, ['INV-1027']);
  assert.equal(JSON.stringify(state), before);
});

test('missing legacy proof remains unavailable; valid saved uploads and explicit demo samples are viewable', () => {
  const state = fresh(), invoice = state.invoices.find(item => item.id === 'INV-1027');
  assert.ok(hasReceiptProof(invoice));
  delete invoice.proofReview;
  const { ui, calls } = createUI(state);
  ui.onChange({ target: { id: 'receipts-date', value: '2026-09-29' } });
  ui.handleAction('receipts-view', null, { dataset: { view: 'day' } });
  ui.onInput({ target: { id: 'receipts-search', value: 'R-1027', isConnected: false } });
  assert.match(ui.render(), /Proof unavailable/);
  assert.doesNotMatch(ui.render(), /data-action="receipts-proof"/);
  ui.handleAction('receipts-proof', 'R-1027');
  assert.deepEqual(calls.proofs, []);
  invoice.proofReview = { file: { mimeType: 'image/png', dataUrl: 'data:image/png;base64,YQ==' } };
  assert.ok(hasReceiptProof(invoice));
  invoice.proofReview.file.dataUrl = 'https://untrusted.example/proof.png';
  assert.equal(hasReceiptProof(invoice), false);
  invoice.proofReview = { status: 'passed' };
  assert.equal(hasReceiptProof(invoice), false, 'A review alone is not evidence of a saved proof');
  ui.reset();
});

test('day/week navigation, date jumps and pagination reset use the chosen sent period', () => {
  const { ui } = createUI(fresh());
  ui.handleAction('receipts-page', null, { dataset: { page: '3' } });
  assert.match(ui.render(), /51–75 of/);
  ui.handleAction('receipts-view', null, { dataset: { view: 'day' } });
  assert.match(ui.render(), /No receipts sent this day/);
  ui.handleAction('receipts-previous');
  assert.match(ui.render(), /value="2026-09-29"/);
  ui.handleAction('receipts-view', null, { dataset: { view: 'week' } });
  ui.handleAction('receipts-next');
  assert.match(ui.render(), /value="2026-10-06"/);
  ui.onChange({ target: { id: 'receipts-date', value: '2027-01-01' } });
  assert.match(ui.render(), /28 Dec – 3 Jan 2027/);
  ui.onChange({ target: { id: 'receipts-date', value: '' } });
  assert.match(ui.render(), /value="2027-01-01"/);
  ui.handleAction('receipts-today');
  assert.match(ui.render(), /value="2026-09-30"/);
  ui.onChange({ target: { id: 'receipts-page-size', value: '50' } });
  assert.match(ui.render(), /1–50 of/);
  ui.reset();
  assert.match(ui.render(), /1–25 of/);
});

test('debounced search preserves the cursor and only restores focus when the search still owns it', async () => {
  const previousDocument = globalThis.document;
  const source = { id: 'receipts-search', value: 'Emma', isConnected: true, selectionStart: 2, selectionEnd: 3 };
  const focused = [], positions = [], replacement = { focus: () => focused.push(true), setSelectionRange: (...args) => positions.push(args) };
  globalThis.document = { activeElement: source, querySelector: selector => selector === '#receipts-search' ? replacement : null };
  const { ui, calls } = createUI(fresh());
  try {
    ui.onInput({ target: source });
    await new Promise(resolve => setTimeout(resolve, 180));
    assert.equal(calls.renders, 1); assert.equal(focused.length, 1); assert.deepEqual(positions, [[2, 3]]);
    globalThis.document.activeElement = {};
    ui.onInput({ target: source });
    await new Promise(resolve => setTimeout(resolve, 180));
    assert.equal(calls.renders, 2); assert.equal(focused.length, 1, 'No focus stolen from another control');
    assert.match(ui.render(), /Emma Lam/);
  } finally { ui.reset(); globalThis.document = previousDocument; }
});
