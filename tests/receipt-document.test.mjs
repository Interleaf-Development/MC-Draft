import test from 'node:test';
import assert from 'node:assert/strict';
import { clone } from '../dist/model.js';
import { renderReceiptDocument } from '../dist/receipt-document.js';

const lesson = (date, start = 960) => ({ date, start, duration: 60, tutor: 'chan' });
function fixture() {
  return {
    invoices: [{ id: 'INV-101', studentId: 'chloe', description: 'Regular programme · 8 lessons', period: 'Oct–Nov 2026' }],
    receipts: [{ id: 'R-101', invoiceId: 'INV-101', studentId: 'chloe', amount: 2000, issuedDate: '2026-09-24', proofDate: '2026-09-23', bankId: 'BANK-101' }],
    bankTransactions: [{ id: 'BANK-101', amount: 2000, date: '2026-09-25' }]
  };
}

function amendedFixture() {
  const state = fixture();
  const receipt = state.receipts[0];
  receipt.originalDocument = {
    description: 'Regular programme · 8 lessons', period: 'Oct–Nov 2026',
    lessonCount: 8, lessonDates: [lesson('2026-10-07'), lesson('2026-10-14')], makeUpLessonCount: 0
  };
  receipt.revisions = [{
    id: 'R-101-A1', receiptDate: '2026-09-24', revisedAt: '2026-09-30',
    description: 'Regular programme · 9 lessons', lessonCount: 9,
    lessonDates: [lesson('2026-10-01'), lesson('2026-10-08')], makeUpLessonCount: 0,
    reason: 'Permanent move to Thursday', scheduleChangeId: 'change-101'
  }];
  receipt.activeRevisionId = 'R-101-A1';
  state.invoices[0].description = 'Regular programme · 9 lessons';
  state.invoices[0].lessonPlan = { lessonCount: 9, lessonDates: receipt.revisions[0].lessonDates, makeUpLessonCount: 0 };
  return state;
}

test('legacy unamended receipt retains its description, proof date and single payment', () => {
  const state = fixture(), before = clone(state);
  const html = renderReceiptDocument(state, 'R-101');
  assert.match(html, /<dd>R-101<\/dd>/);
  assert.match(html, /Regular programme · 8 lessons/);
  assert.match(html, /<dt>Receipt date<\/dt><dd>24 Sept 2026<\/dd>/);
  assert.match(html, /<dt>Payment proof received<\/dt><dd>23 Sept 2026<\/dd>/);
  assert.match(html, /<dt>Bank credit date<\/dt><dd>25 Sept 2026<\/dd>/);
  assert.equal(html.match(/HK\$2,000/g).length, 1);
  assert.match(html, /Demonstration receipt · no actual payment/);
  assert.doesNotMatch(html, /Amended receipt|receipt-revision-history|receipt-lesson-list/);
  assert.deepEqual(state, before);
  assert.equal(renderReceiptDocument(state, 'missing'), '');
});

test('active receipt amendment displays original receipt date and actual revision date separately', () => {
  const state = amendedFixture(), before = clone(state);
  const html = renderReceiptDocument(state, 'R-101');
  assert.match(html, /Amended receipt/);
  assert.match(html, /<dd>R-101-A1<\/dd>/);
  assert.match(html, /<dt>Receipt date<\/dt><dd>24 Sept 2026<\/dd>/);
  assert.match(html, /Amended 30 Sept 2026/);
  assert.match(html, /Lesson entitlement · 9 lessons/);
  assert.match(html, /1 Oct 2026/);
  assert.match(html, /16:00–17:00 · Koko/);
  assert.match(html, /Permanent move to Thursday/);
  assert.match(html, /data-revision="original"/);
  assert.match(html, /data-revision="R-101-A1" aria-current="true" disabled/);
  assert.equal(html.match(/HK\$2,000/g).length, 1);
  assert.deepEqual(state, before);
});

test('original and earlier revisions use snapshots after the current invoice changes again', () => {
  const state = amendedFixture();
  state.receipts[0].revisions.push({
    id: 'R-101-A2', receiptDate: '2026-09-24', revisedAt: '2026-10-05',
    description: 'Regular programme · 7 lessons', lessonCount: 7,
    lessonDates: [lesson('2026-10-09', 1020)], makeUpLessonCount: 0,
    reason: 'Friday instead', scheduleChangeId: 'change-102'
  });
  state.receipts[0].activeRevisionId = 'R-101-A2';
  Object.assign(state.invoices[0], { description: 'A changed invoice', period: 'New billing period', lessonPlan: { lessonCount: 6, lessonDates: [] } });
  const before = clone(state);
  const original = renderReceiptDocument(state, 'R-101', { revisionId: 'original' });
  assert.match(original, /Regular programme · 8 lessons/);
  assert.match(original, /Lesson entitlement · 8 lessons/);
  assert.match(original, /7 Oct 2026/);
  assert.match(original, /Oct–Nov 2026/);
  assert.doesNotMatch(original, /A changed invoice|New billing period|Lesson entitlement · 7|9 Oct 2026/);
  const earlier = renderReceiptDocument(state, 'R-101', { revisionId: 'R-101-A1' });
  assert.match(earlier, /Lesson entitlement · 9 lessons/);
  assert.match(earlier, /1 Oct 2026/);
  assert.doesNotMatch(earlier, /Friday instead|A changed invoice|New billing period/);
  assert.deepEqual(state, before);
});

test('receipt distinguishes retained make-up entitlement from dated regular lessons', () => {
  const state = amendedFixture();
  Object.assign(state.receipts[0].revisions[0], { description: 'Regular programme · 8 lessons', lessonCount: 8, makeUpLessonCount: 1 });
  const html = renderReceiptDocument(state, 'R-101');
  assert.match(html, /Lesson entitlement · 8 lessons/);
  assert.match(html, /Make-up entitlement：1 lesson · Contact the centre to arrange\./);
  assert.equal((html.match(/<li>/g) || []).length, 2);
});

test('family receipt labels are HK Traditional Chinese and user-authored reasons remain intact', () => {
  const state = amendedFixture();
  Object.assign(state.receipts[0].revisions[0], { makeUpLessonCount: 1, reason: 'Parent asked for Thursday' });
  for (const role of ['parent', 'student']) {
    const html = renderReceiptDocument(state, 'R-101', { role });
    assert.match(html, /MathConcept（荃灣）/);
    assert.match(html, /修訂收據/);
    assert.match(html, /收據日期/);
    assert.match(html, /修訂日期/);
    assert.match(html, /常規課程 · 9 堂/);
    assert.match(html, /補堂名額：1 堂 · 請聯絡中心安排。/);
    assert.match(html, /原因：Parent asked for Thursday/);
    assert.match(html, /根據付款證明發出 · 銀行對賬另行處理。/);
    assert.match(html, /示範收據 · 不涉及實際付款/);
    assert.doesNotMatch(html, /Receipt no\.|Receipt versions|Payment amount|Regular programme|Lesson entitlement|Original/);
  }
});

test('receipt escapes notes, snapshot content, identifiers and unknown tutor labels', () => {
  const state = amendedFixture();
  const revision = state.receipts[0].revisions[0];
  revision.reason = '<script>alert("x")</script> & keep this note';
  revision.description = '<img src=x onerror=alert(1)>';
  revision.lessonDates[0].tutor = '<button autofocus>';
  revision.id = 'R-101-A1" onclick="bad()';
  state.receipts[0].activeRevisionId = revision.id;
  const before = clone(state);
  const html = renderReceiptDocument(state, 'R-101');
  assert.match(html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt; &amp; keep this note/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html, /&lt;button autofocus&gt;/);
  assert.match(html, /data-revision="R-101-A1&quot; onclick=&quot;bad\(\)"/);
  assert.doesNotMatch(html, /<script>|<img src=x|<button autofocus|data-revision="R-101-A1" onclick=/);
  assert.deepEqual(state, before);
});

test('all generated schedule reasons use Traditional Chinese while custom notes stay unchanged', () => {
  const cases = [
    ['Extra lesson allowed after a permanent regular schedule change; no additional charge.', '中心同意增加課堂，不另收費。'],
    ['Extra lesson declined; final surplus date excluded.', '最後超出的日期不設課堂。'],
    ['Missing lesson retained as a make-up credit after a permanent regular schedule change.', '減少的課堂已保留為補堂名額。'],
    ['Missing lesson accepted without a make-up credit.', '中心確認減少課堂，不另提供補堂名額。'],
    ['Permanent regular schedule changed with the same lesson count.', '已更改固定上課時間，課堂總數不變。']
  ];
  const state = amendedFixture();
  for (const [en, zh] of cases) {
    state.receipts[0].revisions[0].reason = en;
    const before = clone(state);
    const parent = renderReceiptDocument(state, 'R-101', { role: 'parent' });
    assert.ok(parent.includes(zh));
    assert.ok(!parent.includes(en));
    assert.ok(renderReceiptDocument(state, 'R-101').includes(en));
    assert.deepEqual(state, before);
  }
  state.receipts[0].revisions[0].reason = 'Please keep this exact parent note.';
  assert.match(renderReceiptDocument(state, 'R-101', { role: 'parent' }), /Please keep this exact parent note\./);
});

test('seven scheduled dates plus one make-up count as eight lessons on the receipt', () => {
  const state = amendedFixture();
  Object.assign(state.receipts[0].revisions[0], {
    description: 'Regular programme · 8 lessons', lessonCount: 8, makeUpLessonCount: 1,
    lessonDates: ['2026-10-01', '2026-10-08', '2026-10-15', '2026-10-22', '2026-10-29', '2026-11-05', '2026-11-12'].map(value => lesson(value))
  });
  const parent = renderReceiptDocument(state, 'R-101', { role: 'parent' });
  assert.match(parent, /課堂安排 · 8 堂/);
  assert.match(parent, /已列出日期的常規課堂：7 堂/);
  assert.match(parent, /補堂名額：1 堂/);
  assert.equal((parent.match(/<li>/g) || []).length, 7);
  const admin = renderReceiptDocument(state, 'R-101');
  assert.match(admin, /Lesson entitlement · 8 lessons/);
  assert.match(admin, /Scheduled regular lessons：7 lessons/);
});

test('declined extra dates clearly show no class in the selected role language', () => {
  const state = amendedFixture();
  state.receipts[0].originalDocument.period = 'Sep–Oct 2026';
  Object.assign(state.receipts[0].revisions[0], {
    reason: 'Extra lesson declined; final surplus date excluded.', excludedDates: ['2026-10-29']
  });
  const parent = renderReceiptDocument(state, 'R-101', { role: 'parent' });
  assert.match(parent, /2026 年 9 至 10 月/);
  assert.match(parent, /以下日期不設課堂：<\/strong>2026年10月29日/);
  assert.doesNotMatch(parent, /No class on|Extra lesson declined|Sep–Oct/);
  const staff = renderReceiptDocument(state, 'R-101');
  assert.match(staff, /No class on：<\/strong>29 Oct 2026/);
  assert.match(staff, /Extra lesson declined; final surplus date excluded\./);
});

test('temporary receipt reasons explain the inclusive dates and restoration in both family roles', () => {
  const state = amendedFixture();
  const reasons = [
    'Extra lesson allowed after a temporary regular schedule change; no additional charge.',
    'Extra lesson declined; final surplus date excluded.',
    'Missing lesson retained as a make-up credit after a temporary regular schedule change.',
    'Missing lesson accepted without a make-up credit.',
    'Temporary regular schedule changed with the same lesson count.'
  ];
  for (const base of reasons) {
    const reason = base + ' Temporary dates: 2026-10-01 through 2026-10-21 inclusive; previous timetable resumes after the final date.';
    state.receipts[0].revisions[0].reason = reason;
    for (const role of ['parent', 'student']) {
      const html = renderReceiptDocument(state, 'R-101', { role });
      assert.match(html, /暫時安排：/);
      assert.match(html, /包括最後一天/);
      assert.match(html, /之後恢復原有上課時間/);
      assert.doesNotMatch(html, /Temporary dates|regular schedule change|Missing lesson|Extra lesson/);
    }
    assert.ok(renderReceiptDocument(state, 'R-101').includes(reason));
  }
});
