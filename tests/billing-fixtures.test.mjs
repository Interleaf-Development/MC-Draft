import test from 'node:test';
import assert from 'node:assert/strict';
import { TODAY, students, seed, seedCentreVolume, seedBillingLedger, BILLING_FIXTURE_VERSION, clone } from '../dist/model.js';
import { normalizeBillingAutomation, demoStatementRows, importBankStatement, submitPaymentProof, previewPaymentProof } from '../dist/billing-automation.js';

import { confirmInvoicePayment } from '../dist/billing-workflow.js';

const fresh = () => normalizeBillingAutomation(seedCentreVolume(seed()));
function assertLedger(state) {
  for (const key of ['invoices', 'receipts', 'bankTransactions']) assert.equal(new Set(state[key].map(item => item.id)).size, state[key].length, 'Unique ' + key);
  assert.equal(new Set(state.receipts.map(item => item.invoiceId)).size, state.receipts.length);
  const linked = state.receipts.filter(item => item.bankId);
  assert.equal(new Set(linked.map(item => item.bankId)).size, linked.length);
  for (const invoice of state.invoices) {
    assert.ok(invoice.issued <= TODAY);
    if (invoice.proof) {
      assert.ok(invoice.issued <= invoice.claimedPaymentDate && invoice.claimedPaymentDate <= invoice.proofDate && invoice.proofDate <= TODAY, invoice.id + ' proof chronology');
      assert.notEqual(invoice.proofPayer, students.find(student => student.id === invoice.studentId).name);
      assert.ok(invoice.proofPayer.split(' ').length >= 2);
    }
    const receipt = state.receipts.find(item => item.id === invoice.receiptId);
    assert.equal(Boolean(receipt), Boolean(invoice.receiptId));
    if (receipt) {
      assert.equal(receipt.invoiceId, invoice.id); assert.equal(receipt.studentId, invoice.studentId);
      assert.equal(receipt.amount, invoice.amount); assert.ok(invoice.proof);
      assert.ok(invoice.proofDate <= receipt.issuedDate && receipt.issuedDate <= TODAY);
      assert.equal(invoice.proofReview.status, 'passed');
      if (receipt.bankId) {
        const bank = state.bankTransactions.find(item => item.id === receipt.bankId);
        assert.ok(bank); assert.equal(bank.amount, receipt.amount); assert.equal(bank.payer, invoice.proofPayer);
        assert.equal(bank.suggestedStudent, invoice.studentId);
      }
    } else if (invoice.proof) assert.equal(invoice.proofReview.status, 'needs-review');
  }
  for (const bank of state.bankTransactions) assert.ok(bank.date <= TODAY, bank.id + ' is not in the future');
}

test('700-student ledger is mostly paid, chronologically coherent, and has few actionable exceptions', () => {
  const state = fresh();
  assert.equal(state.invoices.length, 702);
  assert.equal(new Set(state.invoices.map(invoice => invoice.studentId)).size, 700);
  assert.equal(state.receipts.length, 594);
  assert.equal(state.receipts.filter(receipt => receipt.bankId).length, 590);
  assert.equal(state.invoices.filter(invoice => !invoice.proof).length, 107);
  assert.equal(state.invoices.filter(invoice => invoice.proof && !invoice.receiptId).length, 1);
  assert.ok(!state.invoices.some(invoice => invoice.id === 'INV-1029'), 'Mia enrollment ID remains available');
  for (const student of students.filter(student => student.status === 'paused')) assert.equal(state.invoices.find(invoice => invoice.studentId === student.id).period, 'Aug–Sep 2026');
  for (const student of students.filter(student => student.status === 'active')) assert.ok(state.invoices.some(invoice => invoice.studentId === student.id && invoice.period === 'Oct–Nov 2026'), student.id + ' current invoice');
  for (let start = 8; start < 600; start += 100) {
    const ids = new Set(students.slice(start, start + 100).map(student => student.id));
    const unpaid = state.invoices.filter(invoice => ids.has(invoice.studentId) && !invoice.proof);
    assert.ok(unpaid.length >= 10 && unpaid.length <= 20, 'Awaiting payments are spread through the directory');
  }
  for (const thread of state.messages.filter(thread => thread.messages.some(message => message.text.startsWith('Your receipt is available')))) assert.ok(state.invoices.some(invoice => invoice.studentId === thread.studentId && invoice.receiptId));
  assertLedger(state);
});

test('sample import adds new real ledger rows and leaves just the deliberate reconciliation exceptions', () => {
  const state = fresh();
  submitPaymentProof(state, 'INV-1024', { scenario: 'pass', reference: '910277', paymentDate: TODAY });
  confirmInvoicePayment(state, 'INV-1024');
  const rows = demoStatementRows(state), batch = importBankStatement(state, { name: 'Demo statement', rows });
  assert.equal(batch.added, 8); assert.equal(batch.duplicates, 1); assert.equal(batch.ignored, 0); assert.equal(batch.addedDebits, 1);
  assert.equal(batch.counts.autoMatched, 3); assert.equal(batch.counts.ambiguous, 1); assert.equal(batch.counts.amountMismatch, 1); assert.equal(batch.counts.missing, 0);
  for (const row of rows) assert.ok(row.date <= TODAY);
  for (const id of ['R-1025', 'R-1026']) {
    const receipt = state.receipts.find(item => item.id === id), invoice = state.invoices.find(item => item.id === receipt.invoiceId), bank = state.bankTransactions.find(item => item.id === receipt.bankId);
    assert.equal(invoice.period, 'Aug–Sep 2026'); assert.ok(invoice.issued <= bank.date);
    assert.notEqual(bank.date.slice(0, 7), receipt.issuedDate.slice(0, 7));
  }
  assert.equal(importBankStatement(state, { name: 'Repeat', rows }).added, 0);
});

// Reconstruct the prior release's persisted fixture shapes; no production legacy helper is used.
function legacyState() {
  const state = seed(); delete state.billingFixtureVersion;
  state.invoices = []; state.receipts = []; state.bankTransactions = [];
  for (const [index, student] of students.slice(8).entries()) {
    const suffix = String(5001 + index), historic = student.status === 'paused', group = index % 10;
    const proof = historic || group >= 2, receipted = historic || group >= 4, matched = historic || group >= 6, mismatch = !historic && group === 9 && index % 3 === 0;
    const invoice = { id: 'INV-' + suffix, studentId: student.id, amount: 2000, period: historic ? 'Aug–Sep 2026' : 'Oct–Nov 2026', issued: historic ? '2026-07-20' : '2026-09-20', due: historic ? '2026-08-20' : '2026-10-20', description: 'Regular programme · 8 lessons', receiptId: receipted ? 'R-' + suffix : null, proof, ...(proof ? { proofDate: historic ? '2026-08-21' : '2026-09-29', proofReference: 'DEMO ' + student.number } : {}) };
    state.invoices.push(invoice);
    if (receipted) {
      state.receipts.push({ id: invoice.receiptId, invoiceId: invoice.id, studentId: student.id, amount: 2000, proofDate: invoice.proofDate, issuedDate: historic ? '2026-08-21' : group === 6 ? '2026-10-01' : '2026-09-29', bankId: matched ? 'BANK-' + suffix : null, note: mismatch ? 'Review the HK$200 difference with the parent.' : '' });
      state.bankTransactions.push({ id: 'BANK-' + suffix, date: historic ? '2026-08-21' : group === 6 ? '2026-09-30' : group === 7 ? '2026-10-01' : '2026-09-29', amount: mismatch ? 1800 : 2000, reference: 'DEMO TRANSFER · ' + student.number, suggestedStudent: student.id });
    }
  }
  for (const [index, studentId] of ['chloe', 'ethan', 'lucas', 'emma', 'oliver'].entries()) {
    const suffix = String(1024 + index), proof = index > 0, date = index === 3 ? '2026-09-29' : index === 4 ? '2026-09-28' : '2026-09-30';
    state.invoices.push({ id: 'INV-' + suffix, studentId, amount: 2000, period: 'Oct–Nov 2026', issued: '2026-09-20', due: '2026-10-20', description: 'Regular programme · 8 lessons', receiptId: proof ? 'R-' + suffix : null, proof, ...(proof ? { proofReference: ['','908142','724810','909003','903416'][index] } : {}) });
    if (proof) state.receipts.push({ id: 'R-' + suffix, invoiceId: 'INV-' + suffix, studentId, amount: 2000, proofDate: date, issuedDate: index === 1 ? '2026-10-01' : date, bankId: index === 4 ? 'BANK-104' : null, note: '' });
    state.bankTransactions.push({ id: 'BANK-' + (index === 0 ? '105' : 100 + index), date: index === 2 ? '2026-10-02' : date, amount: index === 3 ? 1800 : 2000, reference: ['FPS 910277 · CHAN', 'FPS 908142 · WONG', 'TRANSFER 724810 · LEE', 'FPS 909003 · LAM', 'FPS 903416 · HO'][index], suggestedStudent: studentId });
  }
  return state;
}

test('saved legacy fixtures upgrade without resetting other state; prior automatic bank links remain linked', () => {
  const state = legacyState(), bookings = clone(state.bookings);
  for (const receipt of state.receipts.filter(item => !item.bankId)) {
    const bank = state.bankTransactions.find(item => item.suggestedStudent === receipt.studentId);
    if (bank.amount === receipt.amount) { receipt.bankId = bank.id; bank.payer = students.find(student => student.id === receipt.studentId).name; }
  }
  const linked = state.receipts.find(item => item.id === 'R-1026').bankId;
  seedBillingLedger(state);
  assert.equal(state.billingFixtureVersion, BILLING_FIXTURE_VERSION); assert.deepEqual(state.bookings, bookings);
  assert.equal(state.receipts.find(item => item.id === 'R-1026').bankId, linked);
  assert.equal(state.receipts.find(item => item.id === 'R-1026').issuedDate, '2026-07-31');
  assert.equal(state.bankTransactions.find(item => item.id === linked).date, '2026-08-02');
  assert.equal(state.invoices.length, 702); assertLedger(state);
  const once = clone(state); seedBillingLedger(state); assert.deepEqual(state, once);
});

test('migration preserves edited invoices, proof uploads, receipt notes, manual links and bank rows as whole bundles', () => {
  const state = legacyState();
  state.invoices.find(item => item.id === 'INV-5001').description = 'Manager description';
  state.invoices.find(item => item.id === 'INV-5003').proofReview = { status: 'needs-review', file: { name: 'Parent upload.pdf' } };
  state.receipts.find(item => item.id === 'R-5005').note = 'Discussed with parent';
  state.receipts.find(item => item.id === 'R-5006').bankId = 'CUSTOM-BANK';
  state.bankTransactions.find(item => item.id === 'BANK-5007').amount = 1999;
  state.bankTransactions.push({ id: 'CUSTOM-BANK', date: TODAY, amount: 2000, reference: 'User import 987654', payer: 'Custom Parent' });
  const ids = ['5001', '5003', '5005', '5006', '5007'];
  const bundles = () => ids.map(suffix => ({ invoice: state.invoices.find(item => item.id === 'INV-' + suffix), receipt: state.receipts.find(item => item.id === 'R-' + suffix), bank: state.bankTransactions.find(item => item.id === 'BANK-' + suffix) }));
  const before = clone(bundles()), custom = clone(state.bankTransactions.at(-1));
  seedBillingLedger(state);
  assert.deepEqual(bundles(), before); assert.deepEqual(state.bankTransactions.find(item => item.id === custom.id), custom);
  assert.equal(state.invoices.find(item => item.id === 'INV-5012').proofReview.status, 'passed');
});

test('the in-session v1 upgrade spreads pending payments, adds current invoices, and preserves edits', () => {
  const state = fresh(), oldAwaitingIds = new Set(students.slice(8).filter(student => student.status === 'active').slice(-104).map(student => student.id));
  // Reconstruct the pre-snapshot release rather than changing a current paid plan.
  for (const invoice of state.invoices) { delete invoice.lessonPlan; delete invoice.lessonCount; }
  for (const receipt of state.receipts) delete receipt.originalDocument;
  const restored = state.invoices.find(invoice => oldAwaitingIds.has(invoice.studentId) && invoice.receiptId);
  const receiptId = restored.receiptId, bankId = state.receipts.find(receipt => receipt.id === receiptId).bankId;
  state.receipts = state.receipts.filter(receipt => receipt.id !== receiptId); state.bankTransactions = state.bankTransactions.filter(bank => bank.id !== bankId);
  restored.proof = false; restored.receiptId = null;
  for (const key of ['proofDate', 'claimedPaymentDate', 'proofReference', 'proofReview']) delete restored[key];
  state.invoices = state.invoices.filter(invoice => !['INV-1032', 'INV-1033'].includes(invoice.id));
  state.billingFixtureVersion = 1;
  const edited = state.invoices.find(invoice => invoice.id === 'INV-5001'); edited.description = 'Keep the owner’s edit';
  const beforeEdited = clone(edited);
  state.messages.push({ id: 'known-template', studentId: 'oliver', messages: [{ author: 'centre', text: 'Thank you. Reception will issue the receipt and our accounts team will reconcile the bank entry.' }, { author: 'centre', text: 'Custom parent discussion about payment.' }] });
  seedBillingLedger(state);
  assert.equal(state.invoices.find(invoice => invoice.id === restored.id).receiptId, receiptId);
  assert.ok(state.invoices.some(invoice => invoice.id === 'INV-1032')); assert.ok(state.invoices.some(invoice => invoice.id === 'INV-1033'));
  assert.deepEqual(state.invoices.find(invoice => invoice.id === edited.id), beforeEdited);
  assert.equal(state.messages.at(-1).messages[0].text, 'Your receipt is available in Payments. We’ll match it to the bank statement.');
  assert.equal(state.messages.at(-1).messages[1].text, 'Custom parent discussion about payment.');
  const once = clone(state); seedBillingLedger(state); assert.deepEqual(state, once);
});

test('sample import respects preserved legacy bank dates instead of colliding with saved bank IDs', () => {
  const state = legacyState();
  state.receipts.find(receipt => receipt.id === 'R-1025').note = 'Owner reviewed this payment';
  state.receipts.find(receipt => receipt.id === 'R-1026').note = 'Keep this saved payment';
  seedBillingLedger(state);
  const existing = clone(state.bankTransactions.find(bank => bank.id === 'BANK-101'));
  const rows = demoStatementRows(state);
  assert.equal(rows.find(row => row.id === 'BANK-101').date, existing.date);
  assert.ok(!rows.some(row => row.id === 'BANK-102'), 'A preserved future-dated legacy row is not submitted as a new sample event');
  assert.doesNotThrow(() => importBankStatement(state, { name: 'Sample after saved edits', rows }));
  assert.deepEqual(state.bankTransactions.find(bank => bank.id === 'BANK-101'), existing);
  assert.equal(state.receipts.find(receipt => receipt.id === 'R-1025').note, 'Owner reviewed this payment');
});

test('future payments and statement credits are rejected before state mutation', () => {
  const state = fresh(), before = clone(state);
  assert.throws(() => previewPaymentProof(state, 'INV-1024', { paymentDate: '2026-10-01' }), /today/);
  assert.throws(() => previewPaymentProof(state, 'INV-1024', { paymentDate: '2026-09-19' }), /invoice date/);
  assert.throws(() => importBankStatement(state, { name: 'Future', rows: [{ date: '2026-10-01', amount: 2000, reference: '123456' }] }), /today/);
  assert.deepEqual(state, before);
});
