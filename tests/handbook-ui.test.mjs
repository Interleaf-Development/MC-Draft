import test from 'node:test';
import assert from 'node:assert/strict';
import { seed, centre, allStudents, tutors, TODAY } from '../dist/model.js';
import { normalizeHandbook, saveLessonReport, acknowledgeReport, awardStudentStamp } from '../dist/handbook.js';
import { renderParentHandbook, renderLessonReport, renderLessonReportForm, renderStudentStamps } from '../dist/handbook-ui.js';

const student = allStudents.find(item => item.id === 'chloe');
const tutorId = centre.managerId;
const setup = () => normalizeHandbook(seed());
const reportInput = (extra = {}) => ({ studentId: student.id, date: TODAY, topicRows: [{ title: '分數', rating: 'B' }], comment: '課堂進步', ...extra });

test('parent handbook displays published copy only, escapes replies and keeps staff controls private', () => {
  const state = setup();
  const published = saveLessonReport(state, reportInput(), { tutorId, publish: true });
  saveLessonReport(state, reportInput({ id: published.id, comment: '未發布修改' }), { tutorId });
  saveLessonReport(state, reportInput({ date: '2026-10-01', comment: '私人草稿' }), { tutorId });
  let html = renderParentHandbook({ state, student });
  assert.match(html, /課堂進步/);
  assert.doesNotMatch(html, /未發布修改|私人草稿|data-action="write-note"|data-action="award-stamp"/);
  assert.match(html, new RegExp('report-reply-' + published.id));
  acknowledgeReport(state, { studentId: student.id, reportId: published.id, reply: '<img src=x onerror=alert(1)>' });
  html = renderParentHandbook({ state, student });
  assert.match(html, /家長已閱/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(html, /<img src=x/);
  assert.doesNotMatch(renderLessonReport(published, { canEdit: false }), /data-action="write-note"/);
});

test('student stamp book only shows the selected child, with no report or self-award controls', () => {
  const state = setup();
  const stamp = awardStudentStamp(state, { studentId: student.id, tutorId, reason: '解題 <很努力> "加油"' });
  awardStudentStamp(state, { studentId: 'ethan', tutorId, reason: '另一個孩子的印章' });
  const html = renderStudentStamps({ state, student });
  assert.equal((html.match(/class="stamp-cell /g) || []).length, 50);
  assert.equal((html.match(/data-action="stamp-detail"/g) || []).length, 6);
  assert.match(html, new RegExp('data-id="' + stamp.id + '"'));
  assert.match(html, /解題 &lt;很努力&gt; &quot;加油&quot;/);
  assert.doesNotMatch(html, /另一個孩子的印章|課堂報告|中心校曆|data-action="award-stamp"|class="stamp-cell empty"/);
});

test('report editor restores draft fields safely and preserves pending encouragement', () => {
  const state = setup();
  const report = saveLessonReport(state, reportInput(), { tutorId, publish: true });
  saveLessonReport(state, reportInput({ id: report.id, comment: '<b>未發布修改</b>', awardStamp: true, stampReason: '遇到難題 "繼續嘗試"' }), { tutorId });
  const html = renderLessonReportForm({ note: report, student, date: TODAY, tutorId, tutors });
  assert.match(html, /&lt;b&gt;未發布修改&lt;\/b&gt;/);
  assert.match(html, /id="report-award-stamp"[^>]*checked/);
  assert.match(html, /遇到難題 &quot;繼續嘗試&quot;/);
  for (const key of ['punctual', 'homework', 'diligence', 'selfLearning']) assert.match(html, new RegExp('id="report-rating-' + key + '"'));
  assert.equal((html.match(/id="report-topic-\d"/g) || []).length, 3);
});

test('parent reference tabs remain separate from reports and retain existing completed work access', () => {
  const state = setup();
  const calendar = renderParentHandbook({ state, student, tab: 'calendar', month: '2026-12' });
  assert.match(calendar, /2026 年 12 月/);
  assert.match(calendar, /12 月 23 日/);
  assert.match(calendar, /中心假期/);
  assert.doesNotMatch(calendar, /class="lesson-report/);
  const info = renderParentHandbook({ state, student, tab: 'info' });
  assert.match(info, /data-page="messages"/);
  assert.match(info, /黑雨/);
  assert.match(info, /留在安全地方/);
  assert.match(info, /下一個月 20 日或之前/);
  assert.match(renderParentHandbook({ state, student, completedWork: '<button>開啟已批改工作紙</button>' }), /已批改功課/);
});
