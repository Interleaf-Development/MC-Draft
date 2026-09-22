import test from 'node:test';
import assert from 'node:assert/strict';
import { seed, clone } from '../dist/model.js';
import { normalizeBillingWorkflow, billingStage, invoiceReceipt, queryBillingInvoices, confirmInvoicePayment, returnInvoiceProof, remindInvoiceParent, setBillingAutoSent } from '../dist/billing-workflow.js';

const NOW = '2026-09-30T10:00:00+08:00';
const invoice = (id, overrides = {}) => ({ id, studentId: 'chloe', period: 'Sep–Oct 2026', issued: '2026-08-20', due: '2026-09-20', amount: 2000, proof: false, receiptId: null, ...overrides });
const stateFor = invoices => ({ invoices, receipts: [], audit: [], messages: [], studentProfiles: {} });
const proof = (id, overrides = {}) => invoice(id, { proof: true, proofReview: { id: 'proof-' + id, submittedDate: '2026-09-29', status: 'needs-review', file: { name: 'transfer.png', dataUrl: 'data:image/png;base64,AA==' } }, ...overrides });

test('normalization preserves saved settings and invoice records, and seeds only known fictional fixtures once', () => {
  const state = seed(), original = clone(state.invoices), receiptCount = state.receipts.length;
  state.billingSettings = { autoSent: false, otherSetting: 'keep' };
  normalizeBillingWorkflow(state);
  assert.equal(state.billingSettings.autoSent, false);
  assert.equal(state.billingSettings.otherSetting, 'keep');
  assert.deepEqual(state.invoices.slice(0, original.length).filter(invoice => invoice.receiptId), original.filter(invoice => invoice.receiptId), 'Historical documents are preserved');
  assert.equal(state.invoices[0].teachingWeeks, 4);
  assert.equal(state.invoices.length, original.length + 6);
  assert.equal(state.receipts.length, receiptCount + 1);
  const examples = state.invoices.filter(item => item.workflowFixture);
  assert.deepEqual(new Set(examples.map(item => billingStage(state, item))), new Set(['parent', 'review', 'issued', 'archive']));
  assert.deepEqual(new Set(examples.map(item => item.chargeType)), new Set(['recurring', 'first-tuition', 'assessment']));
  assert.ok(examples.every(item => ['chloe', 'mia'].includes(item.studentId)));
  const once = clone(state);
  normalizeBillingWorkflow(state);
  assert.deepEqual(state, once);
  const actual = stateFor([invoice('ACTUAL-1', { studentId: 'twn-real-student' })]);
  normalizeBillingWorkflow(actual);
  assert.equal(actual.invoices.length, 1);
  assert.equal(actual.billingSettings.autoSent, false);
  setBillingAutoSent(actual, true);
  assert.equal(actual.billingSettings.autoSent, false, 'The current policy requires staff approval');
  setBillingAutoSent(actual, false);
  normalizeBillingWorkflow(actual);
  assert.equal(actual.billingSettings.autoSent, false);
  assert.throws(() => setBillingAutoSent(actual, 'false'));
});

test('stage precedence archives cancelled/void invoices, resolves either receipt link, and keeps returned proofs out of review', () => {
  const state = stateFor([
    invoice('UNPAID'), proof('REVIEW'), proof('RETURNED', { proofDisposition: 'returned' }),
    invoice('PAID-BY-INVOICE'), invoice('PAID-BY-ID', { receiptId: 'R-ID' }),
    proof('CANCELLED', { status: 'cancelled', receiptId: 'R-CANCELLED' }),
    invoice('VOID', { status: 'void' }), invoice('STALE', { receiptId: 'R-ID' })
  ]);
  state.receipts = [{ id: 'R-ONE', invoiceId: 'PAID-BY-INVOICE' }, { id: 'R-ID', invoiceId: 'PAID-BY-ID' }, { id: 'R-CANCELLED', invoiceId: 'CANCELLED' }];
  assert.deepEqual(state.invoices.map(item => billingStage(state, item)), ['parent', 'review', 'parent', 'issued', 'issued', 'archive', 'archive', 'parent']);
  assert.equal(invoiceReceipt(state, state.invoices[3]).id, 'R-ONE');
  assert.equal(invoiceReceipt(state, state.invoices.at(-1)), null, 'A stale pointer cannot use another invoice’s receipt');
});

test('query counts invoices across stages, applies search/type/month, and uses billing periods rather than invoice issue months', () => {
  const state = stateFor([
    invoice('INV-101'), proof('INV-102'), invoice('INV-103'), invoice('INV-104', { status: 'void' }),
    invoice('INV-105', { chargeType: 'assessment', period: 'September 2026' }),
    invoice('INV-106', { chargeType: 'first-tuition', period: 'Oct–Nov 2026' }),
    invoice('INV-107', { studentId: 'ethan', periodStart: '2026-11-01' }),
    invoice('INV-108', { period: 'Dec–Jan 2027' }), invoice('INV-109', { period: '', issued: '2026-03-01' })
  ]);
  state.receipts.push({ id: 'R-103', invoiceId: 'INV-103', issuedDate: '2026-09-29' });
  const before = clone(state);
  const result = queryBillingInvoices(state, { query: 'Chloe MC0001', chargeType: 'recurring', month: '2026-09', now: NOW });
  assert.deepEqual(result.counts, { parent: 1, review: 1, issued: 1, archive: 1 });
  assert.equal(result.items[0].invoice.id, 'INV-102');
  assert.equal(result.items[0].billingMonth, '2026-09');
  assert.equal(result.items[0].periodLabel, 'Sep–Oct 2026');
  assert.deepEqual(queryBillingInvoices(state, { query: 'INV103', stage: 'issued', now: NOW }).items.map(item => item.invoice.id), ['INV-103']);
  assert.equal(queryBillingInvoices(state, { stage: 'parent', month: '2026-12', now: NOW }).items[0].invoice.id, 'INV-108');
  assert.equal(queryBillingInvoices(state, { stage: 'parent', query: 'INV-109', now: NOW }).items[0].billingMonth, '');
  assert.deepEqual(state, before, 'Filtering and pagination are read only');
});

test('review is oldest submission first, issued is newest receipt first, and unknown times remain unknown', () => {
  const state = stateFor([
    proof('INV-3', { proofDate: '2026-09-29', issued: '2026-07-01', proofReview: null }),
    proof('INV-2', { proofSubmittedAt: '2026-09-28T12:30:00+08:00' }),
    proof('INV-1', { proofReview: { id: 'unknown', status: 'needs-review' } }),
    invoice('INV-4'), invoice('INV-5')
  ]);
  state.receipts.push({ id: 'R-4', invoiceId: 'INV-4', issuedDate: '2026-09-29' }, { id: 'R-5', invoiceId: 'INV-5', issuedDate: '2026-09-30', issuedAt: '2026-09-30T08:00:00+08:00' });
  const review = queryBillingInvoices(state, { now: NOW });
  assert.deepEqual(review.items.map(item => item.invoice.id), ['INV-2', 'INV-3', 'INV-1']);
  assert.equal(review.items[1].proofSubmittedAt, '2026-09-29');
  assert.equal(review.items[2].proofSubmittedAt, null);
  assert.deepEqual(queryBillingInvoices(state, { stage: 'issued', now: NOW }).items.map(item => item.invoice.id), ['INV-5', 'INV-4']);
});

test('pages return at most 25 invoice rows without reading attachment data, including repeated students', () => {
  const state = stateFor(Array.from({ length: 61 }, (_, index) => proof('INV-' + (1000 + index), { proofSubmittedAt: '2026-09-29T09:00:00+08:00' })));
  for (const item of state.invoices) Object.defineProperty(item.proofReview, 'file', { get() { throw new Error('List must not read proof attachment'); } });
  const result = queryBillingInvoices(state, { page: 2, now: NOW });
  assert.equal(result.items.length, 25);
  assert.equal(result.total, 61);
  assert.equal(result.pages, 3);
  assert.equal(result.start, 26);
  assert.equal(result.end, 50);
  assert.equal(new Set(result.items.map(item => item.student.id)).size, 1, 'Each invoice remains its own row');
  assert.equal(queryBillingInvoices(state, { pageSize: 1000, now: NOW }).items.length, 25);
  assert.equal(queryBillingInvoices(state, { page: 999, now: NOW }).items.length, 11);
});

test('confirm creates a real receipt once with a full timestamp, repairs missing links, and rejects archive or returned proof', () => {
  const state = stateFor([proof('INV-901', { receiptId: 'MISSING' }), proof('INV-902', { proofDisposition: 'returned' }), proof('INV-903', { status: 'cancelled' })]);
  const result = confirmInvoicePayment(state, 'INV-901', { now: NOW });
  assert.equal(result.createdReceipt, true);
  assert.equal(result.receipt.documentType, 'receipt');
  assert.equal(result.receipt.issuedAt, '2026-09-30T02:00:00.000Z');
  assert.equal(result.receipt.issuedDate, '2026-09-30');
  assert.equal(result.receipt.proofDate, '2026-09-29', 'Confirmation preserves the saved submission date');
  assert.equal(result.invoice.proofDisposition, 'confirmed');
  assert.equal(billingStage(state, result.invoice), 'issued');
  const after = clone(state);
  assert.equal(confirmInvoicePayment(state, 'INV-901', { now: NOW }).createdReceipt, false);
  assert.deepEqual(state, after);
  delete state.invoices[0].receiptId;
  assert.equal(confirmInvoicePayment(state, 'INV-901', { now: NOW }).receipt.id, result.receipt.id);
  assert.equal(state.receipts.length, 1);
  assert.throws(() => confirmInvoicePayment(state, 'INV-902', { now: NOW }), /current payment proof/);
  assert.throws(() => confirmInvoicePayment(state, 'INV-903', { now: NOW }), /Archived/);
});

test('confirmation keeps receipt IDs unique even when legacy receipt generation abbreviates an invoice ID', () => {
  const state = stateFor([proof('INV-CUSTOM-2')]);
  state.receipts.push({ id: 'R-CUSTOM', invoiceId: 'INV-CUSTOM-1' });
  const { receipt } = confirmInvoicePayment(state, 'INV-CUSTOM-2', { now: NOW });
  assert.equal(receipt.id, 'R-CUSTOM-2');
  assert.equal(new Set(state.receipts.map(item => item.id)).size, 2);
  assert.match(state.audit[0].text, /Issued R-CUSTOM-2 /);
});

test('confirmation does not invent a proof submission date for legacy records', () => {
  const state = stateFor([proof('INV-904', { proofReview: { id: 'legacy', status: 'needs-review' } })]);
  const { receipt } = confirmInvoicePayment(state, 'INV-904', { now: NOW });
  assert.equal(receipt.proofDate, undefined);
  assert.equal(queryBillingInvoices(state, { stage: 'issued', now: NOW }).items[0].proofSubmittedAt, null);
});

test('return requires a reason, retains proof history, and waits for a replacement submission', () => {
  const state = stateFor([proof('INV-910')]), item = state.invoices[0], before = clone(state);
  assert.throws(() => returnInvoiceProof(state, item.id, { reason: '  ', now: NOW }), /reason/);
  assert.deepEqual(state, before);
  const currentProof = clone(item.proofReview);
  returnInvoiceProof(state, item.id, { reason: '  Please include the transfer reference.  ', now: NOW });
  assert.equal(item.proofDisposition, 'returned');
  assert.equal(item.proofReturnReason, 'Please include the transfer reference.');
  assert.equal(item.proofReturnedAt, '2026-09-30T02:00:00.000Z');
  assert.deepEqual(item.proofReview, currentProof);
  assert.equal(item.proofReviewHistory.length, 1);
  assert.equal(item.proofReviewHistory[0].file.name, 'transfer.png');
  assert.equal(item.proofReviewHistory[0].file.dataUrl, undefined);
  assert.equal(billingStage(state, item), 'parent');
  assert.equal(queryBillingInvoices(state, { stage: 'review', now: NOW }).total, 0);
  assert.equal(queryBillingInvoices(state, { stage: 'parent', now: NOW }).items[0].replacementProof, true);
  assert.throws(() => returnInvoiceProof(state, item.id, { reason: 'Again', now: NOW }), /current proof/);
  item.proofDisposition = 'pending';
  item.proofSubmittedAt = '2026-09-30T11:00:00+08:00';
  item.proofReview = { id: 'replacement', submittedAt: item.proofSubmittedAt, status: 'needs-review' };
  assert.equal(billingStage(state, item), 'review');
});

test('reminders are local events with an enforced 24-hour cooldown and replacement wording does not demand another payment', () => {
  const state = stateFor([invoice('INV-920'), proof('INV-921'), proof('INV-922', { proofDisposition: 'returned', proofReturnReason: 'Unclear image' })]);
  state.messages.push({ id: 'existing-family-thread', messages: [] });
  const beforeMessages = clone(state.messages);
  const { event } = remindInvoiceParent(state, 'INV-920', { now: NOW });
  assert.equal(event.simulated, true);
  assert.equal(event.type, 'payment');
  assert.equal(state.invoices[0].lastReminderAt, '2026-09-30T02:00:00.000Z');
  assert.equal(queryBillingInvoices(state, { stage: 'parent', query: 'INV-920', now: '2026-10-01T09:59:59+08:00' }).items[0].reminderAvailable, false);
  const before = clone(state);
  assert.throws(() => remindInvoiceParent(state, 'INV-920', { now: '2026-10-01T09:59:59+08:00' }), /24 hours/);
  assert.deepEqual(state, before);
  remindInvoiceParent(state, 'INV-920', { now: '2026-10-01T10:00:00+08:00' });
  assert.throws(() => remindInvoiceParent(state, 'INV-921', { now: NOW }), /waiting for the parent/);
  const returned = remindInvoiceParent(state, 'INV-922', { now: NOW });
  assert.equal(returned.event.type, 'replacement-proof');
  assert.match(returned.event.text, /無需再次繳費/);
  assert.deepEqual(state.messages, beforeMessages, 'No message is sent or added to a conversation');
});

test('unknown student metadata never substitutes another family and saved profile names are searchable', () => {
  const state = stateFor([invoice('INV-UNKNOWN', { studentId: 'missing' }), invoice('INV-PROFILE')]);
  state.studentProfiles.chloe = { englishName: 'Updated Student', studentNumber: 'CUSTOM-17' };
  assert.equal(queryBillingInvoices(state, { stage: 'parent', query: 'CUSTOM17', now: NOW }).items[0].student.name, 'Updated Student');
  assert.equal(queryBillingInvoices(state, { stage: 'parent', query: 'INV-UNKNOWN', now: NOW }).items[0].student.name, 'Student not recorded');
});

test('default reminder cooldown uses actual elapsed time even though the demo calendar stays fixed', () => {
  const state = stateFor([invoice('INV-930')]);
  remindInvoiceParent(state, 'INV-930');
  const item = state.invoices[0];
  assert.ok(item.lastReminderWallAt);
  assert.equal(queryBillingInvoices(state, { stage: 'parent' }).items[0].reminderAvailable, false);
  assert.throws(() => remindInvoiceParent(state, 'INV-930'), /24 hours/);
  item.lastReminderWallAt = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
  assert.equal(queryBillingInvoices(state, { stage: 'parent' }).items[0].reminderAvailable, true);
  assert.doesNotThrow(() => remindInvoiceParent(state, 'INV-930'));
});
