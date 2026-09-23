import test from 'node:test';
import assert from 'node:assert/strict';
import { studentById } from '../dist/model.js';
import { documentDate, renderInvoiceDocument } from '../dist/invoice-document.js';

const lesson = (date, start = 960) => ({ date, start, duration: 60, tutor: 'chan' });
function fixture() {
  return { invoices: [{ id: 'INV-DOC', studentId: 'chloe', chargeType: 'recurring', amount: 2000,
    issued: '2026-09-20', due: '2026-10-20', period: 'Oct–Nov 2026',
    description: 'Regular programme · 8 lessons', packageLessonCount: 8,
    lessonPlan: { lessonCount: 9, lessonDates: ['2026-10-01', '2026-10-08', '2026-10-15', '2026-10-22', '2026-10-29', '2026-11-05', '2026-11-12', '2026-11-19', '2026-11-26'].map(date => lesson(date)) }
  }] };
}

test('invoice gives student, identifiers, deadlines and every actual lesson without changing the package amount or stored records', () => {
  const state = fixture(), before = structuredClone(state), html = renderInvoiceDocument(state, 'INV-DOC');
  assert.match(html, /class="billing-document invoice-paper"/);
  assert.match(html, /alt="MathConcept"/);
  assert.match(html, /MathConcept（荃灣）/);
  assert.match(html, /<dt>繳費通知編號<\/dt><dd>INV-DOC<\/dd>/);
  assert.match(html, /<dt>學生<\/dt><dd>Chloe Chan<\/dd>/);
  assert.ok(html.includes(`<dt>學生編號</dt><dd>${studentById('chloe').number}</dd>`));
  assert.match(html, /<dt>發出日期<\/dt><dd>2026年9月20日<\/dd>/);
  assert.match(html, /<dt>繳費限期<\/dt><dd>2026年10月20日<\/dd>/);
  assert.match(html, /2026 年 10 至 11 月/);
  assert.match(html, /常規課程 · 9 堂/);
  assert.match(html, /課堂安排 · 9 堂/);
  assert.equal([...html.matchAll(/<li>/g)].length, 9);
  assert.match(html, /2026年11月26日/);
  assert.match(html, /16:00–17:00 · Koko/);
  assert.equal([...html.matchAll(/HK\$2,000/g)].length, 1);
  assert.deepEqual(state, before);
  assert.equal(renderInvoiceDocument(state, state.invoices[0]), html);
  assert.equal(renderInvoiceDocument(state, 'unknown'), '');
});

test('missing dates and times remain explicit instead of generating a timetable from the count or current student schedule', () => {
  const state = fixture();
  state.invoices[0].lessonPlan = { lessonCount: 8, lessonDates: [] };
  const html = renderInvoiceDocument(state, 'INV-DOC');
  assert.match(html, /課堂日期待確認/);
  assert.match(html, /課堂安排 · 8 堂/);
  assert.doesNotMatch(html, /<li>|16:00|Invalid Date/);
  state.invoices[0].lessonPlan.lessonDates = ['2026-10-07'];
  const dated = renderInvoiceDocument(state, 'INV-DOC');
  assert.match(dated, /2026年10月7日/);
  assert.match(dated, /時間待確認/);
  assert.match(dated, /尚有 7 堂日期待確認/);
  assert.doesNotMatch(dated, /16:00|Koko/);
});

test('assessment invoices show their booked date and only known time fields', () => {
  const state = { assessment: { assessmentDate: '2026-12-01' }, invoices: [{ id: 'INV-ASSESS', studentId: 'mia', chargeType: 'assessment', amount: 200, issued: '2026-09-15', due: '2026-09-26', assessmentDate: '2026-09-26', assessmentStart: 630, assessmentDuration: 45, description: 'Entrance assessment' }] };
  const html = renderInvoiceDocument(state, 'INV-ASSESS');
  assert.match(html, /入學評估/);
  assert.match(html, /評估安排 · 1 次/);
  assert.match(html, /2026年9月26日/);
  assert.match(html, /10:30–11:15/);
  assert.doesNotMatch(html, /2026年12月1日|課堂安排/);
  delete state.invoices[0].assessmentStart;
  assert.match(renderInvoiceDocument(state, 'INV-ASSESS'), /時間待確認/);
  delete state.invoices[0].assessmentDate;
  assert.match(renderInvoiceDocument(state, 'INV-ASSESS'), /評估日期待確認/);
});

test('supplied student details and free text are escaped and an unknown student never falls back to an unrelated child', () => {
  const state = fixture();
  state.invoices[0].description = '<b>parent note</b> & keep';
  state.invoices[0].lessonPlan.lessonDates[0].tutor = '<img src=x>';
  const html = renderInvoiceDocument(state, 'INV-DOC', { student: { name: 'Jamie <Chan>', number: 'MC-99', parent: 'Mrs & Mr Chan' } });
  assert.match(html, /Jamie &lt;Chan&gt;/);
  assert.match(html, /Mrs &amp; Mr Chan/);
  assert.match(html, /MC-99/);
  assert.match(html, /&lt;b&gt;parent note&lt;\/b&gt; &amp; keep/);
  assert.match(html, /&lt;img src=x&gt;/);
  assert.doesNotMatch(html, /<b>parent note|<img src=x>/);
  state.invoices[0].studentId = 'unknown';
  assert.doesNotMatch(renderInvoiceDocument(state, 'INV-DOC'), /Chloe Chan/);
  for (const invalid of [undefined, '', 'garbage', '2026-02-31']) assert.equal(documentDate(invalid), '未有紀錄');
});
