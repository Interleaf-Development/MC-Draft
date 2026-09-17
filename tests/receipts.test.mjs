import test from 'node:test';
import assert from 'node:assert/strict';
import { TODAY, seed, seedCentreVolume, money } from '../dist/model.js';
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
  assert.deepEqual(receiptPeriod('2028-02-29'), { start: '2028-02-28', end: '2028-03-05' });
  assert.deepEqual(receiptPeriod('2026-02-29'), receiptPeriod(TODAY));
});

test('sent-date register uses receipt issue date, not proof date or bank credit date', () => {
  const state = fresh();
  const receipt = state.receipts.find(item => item.id === 'R-1025');
  assert.equal(receipt.issuedDate, '2026-08-01');
  state.bankTransactions.push({ id: 'bank-test', date: '2026-08-03', amount: 2000 });
  receipt.bankId = 'bank-test'; receipt.proofDate = '2026-07-26';
  assert.equal(receiptRegister(state, { date: receipt.proofDate, query: receipt.id }).total, 0);
  assert.equal(receiptRegister(state, { date: '2026-08-03', query: receipt.id }).total, 0);
  const result = receiptRegister(state, { date: '2026-08-01', query: receipt.id });
  assert.equal(result.total, 1);
  assert.deepEqual(result.groups.find(group => group.date === '2026-08-01').rows.map(row => row.receipt.id), [receipt.id]);
  assert.equal(result.items[0].receipt, receipt);
});

test('week includes both endpoints, excludes adjacent dates and keeps all seven sent days in calendar order', () => {
  const state = { invoices: [], receipts: ['2026-09-27', '2026-09-28', '2026-09-30', '2026-10-04', '2026-10-05'].map((issuedDate, index) => ({ id: 'R-' + index, studentId: 'chloe', amount: 2000, issuedDate })) };
  const result = receiptRegister(state);
  assert.equal(result.total, 3); assert.equal(result.amount, 6000);
  assert.deepEqual(result.groups.map(group => group.date), ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
  assert.deepEqual(result.groups.map(group => group.rows.length), [1, 0, 1, 0, 0, 0, 1]);
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

test('busy week contains every receipt once across seven columns, without hiding later records behind pagination', () => {
  const state = fresh(), before = JSON.stringify(state);
  const result = receiptRegister(state), grouped = result.groups.flatMap(group => group.rows);
  const expected = state.receipts.filter(receipt => receipt.issuedDate >= result.start && receipt.issuedDate <= result.end);
  assert.ok(result.total > 100);
  assert.equal(result.items.length, expected.length);
  assert.equal(grouped.length, expected.length);
  assert.equal(result.groups.length, 7);
  assert.deepEqual(new Set(grouped.map(row => row.receipt.id)), new Set(expected.map(receipt => receipt.id)));
  assert.ok(result.items.some(row => row.receipt.id === expected.at(-1).id));
  for (const group of result.groups) assert.ok(group.rows.every(row => row.receipt.issuedDate === group.date));
  assert.equal(result.amount, expected.reduce((total, receipt) => total + receipt.amount, 0));
  assert.equal(JSON.stringify(state), before, 'Reading the receipt register never modifies fixture records');
});

test('new automatically issued receipt appears in today’s group with its saved payment proof', () => {
  const state = fresh();
  assert.equal(receiptRegister(state, { query: 'Chloe Chan' }).total, 0);
  submitPaymentProof(state, 'INV-1024', { scenario: 'pass', reference: 'FPS RECEIPTS-TEST', paymentDate: TODAY });
  const result = receiptRegister(state, { query: 'Chloe Chan' });
  assert.equal(result.total, 1);
  assert.deepEqual(result.groups.find(group => group.date === TODAY).rows.map(row => row.receipt.id), ['R-1024']);
  assert.equal(result.items[0].receipt.id, 'R-1024');
  assert.ok(result.items[0].proofAvailable);
});

test('receipt and payment-proof actions open the correct connected records without changing data', () => {
  const state = fresh(), before = JSON.stringify(state), { ui, calls } = createUI(state);
  const html = ui.render();
  assert.doesNotMatch(html, /data-action="receipts-proof"/);
  assert.match(html, /aria-label="Receipts by sent date"/);
  ui.handleAction('receipts-open', 'R-1027');
  ui.handleAction('receipts-proof', 'R-1027');
  ui.handleAction('receipts-proof', 'unknown');
  assert.deepEqual(calls.receipts, ['R-1027']);
  assert.deepEqual(calls.proofs, ['INV-1027']);
  assert.equal(JSON.stringify(state), before);
});

test('seven-column board shows only student names and amounts in its receipt entries', () => {
  const state = fresh(), { ui } = createUI(state), html = ui.render();
  const rows = new Map(receiptRegister(state).items.map(row => [row.receipt.id, row]));
  const columns = html.match(/class="[^"]*\breceipts-day-column\b[^"]*"/g) || [];
  const entries = [...html.matchAll(/<button\b(?=[^>]*data-action="receipts-open")([^>]*)>([\s\S]*?)<\/button>/g)];
  assert.equal(columns.length, 7);
  assert.equal(entries.length, rows.size);
  for (const [, attributes, content] of entries) {
    const id = attributes.match(/data-id="([^"]+)"/)?.[1];
    const row = rows.get(id);
    assert.ok(row, `Receipt entry links to a known receipt: ${id}`);
    const visibleText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    assert.equal(visibleText, `${row.student.name} ${money(row.receipt.amount)}`);
  }
  assert.doesNotMatch(html, /data-action="receipts-(?:view|page)"|id="receipts-page-size"/);
});

test('missing legacy proof remains unavailable; valid saved uploads and explicit demo samples are viewable', () => {
  const state = fresh(), invoice = state.invoices.find(item => item.id === 'INV-1027');
  assert.ok(hasReceiptProof(invoice));
  delete invoice.proofReview;
  const { ui, calls } = createUI(state);
  ui.onChange({ target: { id: 'receipts-date', value: '2026-09-29' } });
  ui.onInput({ target: { id: 'receipts-search', value: 'R-1027', isConnected: false } });
  assert.equal(receiptRegister(state, { query: 'R-1027' }).items[0].proofAvailable, false);
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

test('week navigation, date jumps and reset retain a seven-day period', () => {
  const { ui } = createUI(fresh());
  ui.handleAction('receipts-previous');
  assert.match(ui.render(), /value="2026-09-23"/);
  ui.handleAction('receipts-next');
  assert.match(ui.render(), /value="2026-09-30"/);
  ui.handleAction('receipts-next');
  assert.match(ui.render(), /value="2026-10-07"/);
  ui.onChange({ target: { id: 'receipts-date', value: '2027-01-01' } });
  for (const date of ['2026-12-28', '2027-01-03']) assert.ok(ui.render().includes(date));
  ui.onChange({ target: { id: 'receipts-date', value: '' } });
  assert.match(ui.render(), /value="2027-01-01"/);
  ui.handleAction('receipts-today');
  assert.match(ui.render(), /value="2026-09-30"/);
  ui.onChange({ target: { id: 'receipts-date', value: '2027-01-01' } });
  ui.onInput({ target: { id: 'receipts-search', value: 'missing-receipt', isConnected: false } });
  ui.reset();
  assert.match(ui.render(), /value="2026-09-30"/);
  assert.doesNotMatch(ui.render(), /missing-receipt/);
  assert.ok(ui.render().includes('R-1027'));
});

test('an empty or searched-empty week still displays all seven dates', () => {
  const { ui } = createUI({ invoices: [], receipts: [] });
  const result = receiptRegister({ invoices: [], receipts: [] });
  assert.equal(result.total, 0); assert.equal(result.amount, 0);
  assert.equal(result.groups.length, 7);
  assert.ok(result.groups.every(group => group.rows.length === 0));
  for (const date of result.groups.map(group => group.date)) assert.ok(ui.render().includes(date));
  ui.onInput({ target: { id: 'receipts-search', value: 'nobody', isConnected: false } });
  assert.equal((ui.render().match(/class="[^"]*\breceipts-day-column\b[^"]*"/g) || []).length, 7);
  assert.doesNotMatch(ui.render(), /data-action="receipts-open"/);
  ui.reset();
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
