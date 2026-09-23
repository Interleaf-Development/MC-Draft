import test from 'node:test';
import assert from 'node:assert/strict';
import { seed, seedCentreVolume, students, clone, legacyFixtureReceiptDocument } from '../dist/model.js';
import { normalizeBillingAutomation } from '../dist/billing-automation.js';
import { normalizeBillingWorkflow } from '../dist/billing-workflow.js';
import { buildTeachingCycle, normalizeTeachingBilling, runTuitionBilling } from '../dist/billing-cycles.js';
import { fixtureLessonDocument } from '../dist/billing-fixture-lessons.js';
import { renderReceiptDocument } from '../dist/receipt-document.js';

const fresh = () => normalizeBillingWorkflow(normalizeBillingAutomation(seedCentreVolume(seed())));
function legacy(state = fresh()) {
  for (const invoice of state.invoices.filter(item => item.receiptId)) { delete invoice.lessonPlan; delete invoice.lessonCount; }
  for (const receipt of state.receipts) delete receipt.originalDocument;
  return state;
}

test('all new paid examples save actual dated lessons and independent original documents', () => {
  const state = fresh(), counts = {};
  assert.equal(state.receipts.length, 595);
  for (const receipt of state.receipts) {
    const invoice = state.invoices.find(item => item.id === receipt.invoiceId);
    const student = students.find(item => item.id === receipt.studentId);
    const snapshot = receipt.originalDocument;
    const startDate = { 'Jul–Aug 2026': '2026-07-01', 'Aug–Sep 2026': '2026-08-01', 'Oct–Nov 2026': '2026-10-01' }[invoice.period];
    const [hour, minute] = student.regular.split(' · ')[1].split(':').map(Number);
    const weekday = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].indexOf(student.day) + 1;
    const expected = buildTeachingCycle({ startDate, sessions: [{ weekday, start: hour * 60 + minute, duration: 60, tutor: student.tutor }] }).resolvedLessons;
    assert.deepEqual(invoice.lessonPlan.lessonDates, expected, invoice.id);
    assert.deepEqual(snapshot.lessonDates, expected, receipt.id);
    assert.equal(snapshot.lessonCount, expected.length);
    assert.equal(snapshot.receiptDate, receipt.issuedDate);
    assert.equal(snapshot.paymentDate, invoice.claimedPaymentDate);
    assert.equal(snapshot.due, invoice.due);
    assert.equal(snapshot.description, invoice.description);
    assert.notEqual(snapshot.lessonDates, invoice.lessonPlan.lessonDates);
    assert.notEqual(snapshot.lessonDates[0], invoice.lessonPlan.lessonDates[0]);
    assert.equal(snapshot.lessonPlan, undefined, 'Do not duplicate every date in local storage');
    const html = renderReceiptDocument(state, receipt.id);
    assert.doesNotMatch(html, /課堂日期待確認|時間待確認/, receipt.id);
    assert.equal((html.match(/<li>/g) || []).length, expected.length);
    counts[expected.length] = (counts[expected.length] || 0) + 1;
  }
  assert.deepEqual(counts, { 8: 198, 9: 397 });
  const historical = state.invoices.find(item => item.id === 'INV-1025');
  assert.deepEqual([historical.issued, historical.due, historical.claimedPaymentDate, historical.amount], ['2026-07-20', '2026-08-20', '2026-07-31', 2000]);
  const first = state.invoices.find(item => item.id === 'INV-8003');
  assert.deepEqual([first.issued, first.due, first.claimedPaymentDate, first.amount], ['2026-06-20', '2026-07-01', '2026-06-23', 1800]);
});

test('new original snapshots survive live invoice edits and repeated normalization', () => {
  const state = fresh(), receipt = state.receipts.find(item => item.id === 'R-1028');
  const original = clone(receipt.originalDocument), invoice = state.invoices.find(item => item.id === receipt.invoiceId);
  invoice.period = 'Changed by manager'; invoice.due = '2027-01-01'; invoice.description = 'Later agreement';
  invoice.lessonPlan.lessonDates[0].date = '2027-01-07';
  invoice.lessonPlan.lessonDates[0].start = 540;
  seedCentreVolume(state); normalizeBillingAutomation(state); normalizeBillingWorkflow(state); normalizeTeachingBilling(state); runTuitionBilling(state);
  assert.deepEqual(receipt.originalDocument, original);
  const before = clone(state), html = renderReceiptDocument(state, receipt.id);
  assert.match(html, /2026年10月7日/);
  assert.match(html, /16:00–17:00/);
  assert.match(html, /繳費限期<\/dt><dd>2026年10月20日/);
  assert.doesNotMatch(html, /Changed by manager|Later agreement|2027年/);
  assert.deepEqual(state, before);
});

test('untouched old fictional receipts gain a pure display fallback without changing saved history', () => {
  const state = legacy(), before = clone(state);
  for (const receipt of state.receipts) {
    const document = legacyFixtureReceiptDocument(state, receipt);
    assert.ok(document?.lessonDates.length >= 8, receipt.id);
    assert.doesNotMatch(renderReceiptDocument(state, receipt.id), /課堂日期待確認/, receipt.id);
  }
  assert.deepEqual(state, before);
  seedCentreVolume(state); normalizeBillingAutomation(state); normalizeBillingWorkflow(state); normalizeTeachingBilling(state); runTuitionBilling(state);
  assert.deepEqual(state.receipts, before.receipts);
  assert.deepEqual(state.invoices.filter(item => item.receiptId), before.invoices.filter(item => item.receiptId));
});

test('legacy display dates use the static fictional timetable, even after unrelated booking or directory changes', () => {
  const state = legacy(seed()), receipt = state.receipts.find(item => item.id === 'R-1028');
  state.bookings = [{ id: 'new-booking', studentId: 'oliver', date: '2026-10-09', start: 540, duration: 120 }];
  receipt.bankId = 'new-reconciled-bank';
  const student = students.find(item => item.id === 'oliver'), oldRegular = student.regular;
  try {
    student.regular = 'Friday · 09:00';
    const before = clone(state), document = legacyFixtureReceiptDocument(state, receipt);
    assert.equal(document.lessonDates[0].date, '2026-10-07');
    assert.equal(document.lessonDates[0].start, 960);
    assert.equal(document.lessonDates[0].duration, 60);
    assert.deepEqual(state, before);
  } finally { student.regular = oldRegular; }
});

test('legacy fallback rejects uploads, unknown records, edited financial history, snapshots and schedule changes', () => {
  const edits = [
    (_s, i) => { i.proofReview.file = { name: 'payment.png' }; },
    (_s, i) => { delete i.proofReview.fixture; },
    (_s, i) => { i.proofReview.status = 'needs-review'; },
    (_s, i) => { i.id = 'INV-UNKNOWN'; },
    (_s, i) => { i.studentId = 'twn-real-student'; },
    (_s, i) => { i.amount = 1900; },
    (_s, i) => { i.period = 'Nov–Dec 2026'; },
    (_s, i) => { i.description = 'Negotiated lesson plan'; },
    (_s, i) => { i.claimedPaymentDate = '2026-09-27'; },
    (_s, i) => { i.issued = '2026-09-19'; },
    (_s, i) => { i.due = '2026-10-19'; },
    (_s, i) => { i.lessonPlan = { lessonCount: 0, lessonDates: [] }; },
    (_s, i) => { i.lessonDates = []; },
    (_s, i) => { i.scheduleChangeId = 'change-1'; },
    (_s, _i, r) => { r.note = 'Spoke to parent'; },
    (_s, _i, r) => { r.issuedDate = '2026-09-29'; },
    (_s, _i, r) => { r.originalDocument = { period: 'Oct–Nov 2026' }; },
    (_s, _i, r) => { r.revisions = []; },
    (_s, _i, r) => { r.activeRevisionId = 'R-1028-A1'; },
    (s) => { s.regularSchedules = { oliver: { weekday: 4, start: 840 } }; },
    (s) => { s.regularScheduleChanges = [{ studentId: 'oliver' }]; },
    (s) => { s.bookings.push({ studentId: 'oliver', regularScheduleChangeId: 'change-1' }); }
  ];
  for (const edit of edits) {
    const state = legacy(seed()), receipt = state.receipts.find(item => item.id === 'R-1028');
    const invoice = state.invoices.find(item => item.id === receipt.invoiceId);
    edit(state, invoice, receipt);
    const before = clone(state);
    assert.equal(legacyFixtureReceiptDocument(state, receipt), null, edit.toString());
    assert.deepEqual(state, before);
  }
  const state = legacy(seed()), receipt = state.receipts.find(item => item.id === 'R-1028');
  state.invoices.find(item => item.id === receipt.invoiceId).proofReview.file = null;
  assert.equal(legacyFixtureReceiptDocument(state, receipt).lessonCount, 8);
});

test('unknown periods and incomplete fictional timetables cannot generate lesson dates', () => {
  const state = legacy(seed()), receipt = state.receipts.find(item => item.id === 'R-1028');
  const invoice = state.invoices.find(item => item.id === receipt.invoiceId), student = students.find(item => item.id === receipt.studentId);
  assert.equal(fixtureLessonDocument(student, { ...invoice, period: 'Future period' }, receipt), null);
  assert.equal(fixtureLessonDocument({ ...student, regular: '' }, invoice, receipt), null);
  assert.equal(fixtureLessonDocument({ ...student, regular: 'Wednesday · 24:00' }, invoice, receipt), null);
});
