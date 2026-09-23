import test from 'node:test';
import assert from 'node:assert/strict';
import { seed, centre, tutors, TODAY } from '../dist/model.js';
import {
  normalizeHandbook, saveLessonReport, acknowledgeReport, awardStudentStamp,
  getStudentStamps, getPublishedReports, HANDBOOK_CALENDAR, HANDBOOK_WEATHER, HANDBOOK_NOTICES
} from '../dist/handbook.js';

const tutorId = centre.managerId;
const setup = () => normalizeHandbook(seed());
const input = (overrides = {}) => ({
  studentId: 'chloe', date: TODAY,
  topicRows: [{ title: '等值分數', rating: 'B' }, { title: '解題步驟', rating: 'A' }],
  ratings: { punctual: 'A', homework: 'B', diligence: 'A', selfLearning: 'C' },
  performance: '逐步掌握', comment: '今天能主動解釋答案，繼續練習寫清楚步驟。', homework: '完成第 3 題。',
  ...overrides
});

test('handbook migration preserves legacy/user records and never recreates removed samples', () => {
  const state = seed();
  state.lessonNotes[0].comment = '這是老師自己寫的，不可取代。';
  state.lessonNotes[0].parentReply = '家長原有留言';
  state.studentStamps = [{ id: 'saved-stamp', studentId: 'chloe', reason: '原有獎勵', date: '2026-09-01', tutor: tutorId }];
  const invoices = structuredClone(state.invoices), bookings = structuredClone(state.bookings);
  normalizeHandbook(state);
  assert.equal(state.lessonNotes[0].comment, '這是老師自己寫的，不可取代。');
  assert.equal(state.lessonNotes[0].parentReply, '家長原有留言');
  assert.deepEqual(state.lessonNotes[0].topicRows, [{ title: state.lessonNotes[0].topics, rating: '' }]);
  assert.equal(getStudentStamps(state, 'chloe').length, 1);
  assert.deepEqual(state.invoices, invoices);
  assert.deepEqual(state.bookings, bookings);
  assert.equal(state.handbookVersion, 1);
  const normalized = structuredClone(state);
  normalizeHandbook(state);
  assert.deepEqual(state, normalized);
  state.studentStamps = [];
  state.lessonNotes = [];
  normalizeHandbook(state);
  assert.equal(state.studentStamps.length, 0);
  assert.equal(state.lessonNotes.length, 0);
});

test('only a small explicitly tagged sample is seeded; reports and stamps stay child-specific', () => {
  const state = setup();
  assert.equal(getStudentStamps(state, 'chloe').length, 5);
  assert.ok(state.studentStamps.every(stamp => stamp.source === 'handbook-demo'));
  assert.equal(getStudentStamps(state, 'ethan').length, 0);
  assert.equal(getPublishedReports(state, 'ethan').length, 0);
  if (centre.code === 'TWN') {
    assert.equal(getStudentStamps(state, 'twn-c64262b4d67d').length, 5);
    assert.equal(getPublishedReports(state, 'twn-c64262b4d67d').length, 1);
    assert.equal(getPublishedReports(state, 'twn-c64262b4d67d')[0].source, 'handbook-demo');
  }
});

test('incomplete drafts remain private and cannot award stamps; publishing exposes the complete report', () => {
  const state = setup(), stampCount = state.studentStamps.length;
  const draft = saveLessonReport(state, input({ comment: '', awardStamp: true }), { tutorId });
  assert.equal(draft.published, false);
  assert.equal(state.studentStamps.length, stampCount);
  assert.ok(!getPublishedReports(state, 'chloe').some(report => report.id === draft.id));
  assert.throws(() => acknowledgeReport(state, { reportId: draft.id, studentId: 'chloe' }), /找不到/);
  const published = saveLessonReport(state, input({ id: draft.id, awardStamp: true, stampReason: '解題有進步' }), { tutorId, publish: true });
  assert.equal(published.id, draft.id);
  assert.equal(published.published, true);
  assert.equal(published.topics, '等值分數、解題步驟');
  assert.deepEqual(getPublishedReports(state, 'chloe')[0].topicRows, input().topicRows);
  assert.equal(state.studentStamps.length, stampCount + 1);
  assert.equal(state.studentStamps.at(-1).reportId, draft.id);
  assert.equal(state.studentStamps.at(-1).date, TODAY);
});

test('teacher draft edits leave the published report and parent acknowledgement intact', () => {
  const state = setup();
  const report = saveLessonReport(state, input(), { tutorId, publish: true });
  acknowledgeReport(state, { reportId: report.id, studentId: 'chloe', reply: '收到，謝謝老師。' });
  const published = structuredClone(getPublishedReports(state, 'chloe')[0]);
  saveLessonReport(state, input({ id: report.id, comment: '尚未發布的草稿', awardStamp: true, stampReason: '草稿不應獲印章' }), { tutorId });
  assert.equal(report.draft.comment, '尚未發布的草稿');
  assert.deepEqual(getPublishedReports(state, 'chloe')[0], published);
  assert.equal(report.parentReply, '收到，謝謝老師。');
  const visible = getPublishedReports(state, 'chloe')[0];
  visible.comment = '修改讀取結果';
  assert.equal(report.comment, input().comment);
  assert.equal(state.studentStamps.filter(stamp => stamp.reportId === report.id).length, 0);
});

test('identical republish keeps acknowledgement; changed published content resets it without losing the old reply', () => {
  const state = setup();
  const report = saveLessonReport(state, input(), { tutorId, publish: true });
  acknowledgeReport(state, { reportId: report.id, studentId: 'chloe', reply: '明白' });
  const acknowledgedAt = report.parentAcknowledgedAt, publishedAt = report.publishedAt;
  saveLessonReport(state, input({ id: report.id }), { tutorId, publish: true });
  assert.equal(report.parentAcknowledgedAt, acknowledgedAt);
  assert.equal(report.publishedAt, publishedAt);
  assert.equal(report.version, 1);
  saveLessonReport(state, input({ id: report.id, homework: '改為完成第 4 題。' }), { tutorId });
  assert.equal(report.parentAcknowledgedAt, acknowledgedAt);
  saveLessonReport(state, { id: report.id, studentId: 'chloe' }, { tutorId, publish: true });
  assert.equal(report.homework, '改為完成第 4 題。');
  assert.equal(report.version, 2);
  assert.ok(!report.draft);
  assert.equal(report.parentAcknowledgedAt, undefined);
  assert.equal(report.parentReply, undefined);
  assert.deepEqual(report.parentResponses, [{ acknowledgedAt, reply: '明白', version: 1 }]);
  assert.equal(getPublishedReports(state, 'chloe')[0].parentResponses, undefined);
});

test('republishing a report never duplicates its reward, while a separate teacher award has its own record', () => {
  const state = setup(), before = state.studentStamps.length;
  const report = saveLessonReport(state, input({ awardStamp: true, stampReason: '認真作答' }), { tutorId, publish: true });
  saveLessonReport(state, input({ id: report.id, comment: '更新給家長的話。', awardStamp: true, stampReason: '認真作答' }), { tutorId, publish: true });
  assert.equal(state.studentStamps.length, before + 1);
  const first = awardStudentStamp(state, { studentId: 'chloe', tutorId, reason: '認真作答', reportId: report.id });
  assert.equal(first.id, state.studentStamps.at(-1).id);
  assert.equal(state.studentStamps.length, before + 1);
  const independent = awardStudentStamp(state, { studentId: 'chloe', tutorId, reason: '主動幫忙收拾' });
  assert.equal(independent.date, TODAY);
  assert.equal(independent.reportId, undefined);
  assert.equal(state.studentStamps.length, before + 2);
});

test('new stamps fill the next collection slot even when awarded for an earlier lesson', () => {
  const state = setup(), initialIds = getStudentStamps(state, 'chloe').map(stamp => stamp.id);
  const olderLesson = saveLessonReport(state, input({ date: '2026-09-01', awardStamp: true, stampReason: '補回之前課堂的獎勵' }), { tutorId, publish: true });
  const collected = getStudentStamps(state, 'chloe');
  assert.deepEqual(collected.slice(0, -1).map(stamp => stamp.id), initialIds);
  assert.equal(collected.at(-1).reportId, olderLesson.id);
  assert.equal(collected.at(-1).date, '2026-09-01');
  const recent = awardStudentStamp(state, { studentId: 'chloe', tutorId, reason: '今天的新獎勵' });
  assert.equal(getStudentStamps(state, 'chloe').at(-1).id, recent.id);
  const persisted = structuredClone(state);
  normalizeHandbook(persisted);
  assert.deepEqual(getStudentStamps(persisted, 'chloe'), getStudentStamps(state, 'chloe'));
});

test('saved drafts retain pending stamp choices until explicit publication, including a later decision not to award', () => {
  const state = setup(), before = state.studentStamps.length;
  const draft = saveLessonReport(state, input({ awardStamp: true, stampReason: '主動把解題步驟寫清楚' }), { tutorId });
  assert.equal(draft.awardStamp, true);
  assert.equal(draft.stampReason, '主動把解題步驟寫清楚');
  assert.equal(state.studentStamps.length, before);
  assert.ok(!getPublishedReports(state, 'chloe').some(report => report.id === draft.id));
  saveLessonReport(state, { id: draft.id, studentId: 'chloe', comment: '補充進展。' }, { tutorId });
  assert.equal(draft.awardStamp, true);
  assert.equal(draft.stampReason, '主動把解題步驟寫清楚');
  saveLessonReport(state, { id: draft.id, studentId: 'chloe' }, { tutorId, publish: true });
  assert.equal(state.studentStamps.length, before + 1);
  assert.equal(state.studentStamps.at(-1).reason, '主動把解題步驟寫清楚');
  assert.equal(draft.awardStamp, undefined);
  assert.equal(draft.stampReason, undefined);

  const published = saveLessonReport(state, input({ date: '2026-09-29' }), { tutorId, publish: true });
  saveLessonReport(state, { id: published.id, studentId: 'chloe', awardStamp: true, stampReason: '認真改正' }, { tutorId });
  assert.equal(published.draft.awardStamp, true);
  assert.equal(published.draft.stampReason, '認真改正');
  assert.equal(state.studentStamps.length, before + 1);
  const visible = getPublishedReports(state, 'chloe').find(report => report.id === published.id);
  assert.equal(visible.draft, undefined);
  assert.equal(visible.awardStamp, undefined);
  assert.equal(visible.stampReason, undefined);
  saveLessonReport(state, { id: published.id, studentId: 'chloe', awardStamp: false }, { tutorId, publish: true });
  assert.equal(state.studentStamps.length, before + 1);
  assert.equal(published.draft, undefined);
  assert.equal(published.awardStamp, undefined);
  assert.equal(published.stampReason, undefined);
});

test('publishing a saved edit awards the pending stamp once and validates its saved reason before changing the report', () => {
  const state = setup(), before = state.studentStamps.length;
  const report = saveLessonReport(state, input(), { tutorId, publish: true });
  saveLessonReport(state, { id: report.id, studentId: 'chloe', awardStamp: true, stampReason: '' }, { tutorId });
  const unchanged = structuredClone(state);
  assert.throws(() => saveLessonReport(state, { id: report.id, studentId: 'chloe' }, { tutorId, publish: true }), /原因/);
  assert.deepEqual(state, unchanged);
  saveLessonReport(state, { id: report.id, studentId: 'chloe', stampReason: '主動完成改正' }, { tutorId });
  assert.equal(report.draft.awardStamp, true);
  saveLessonReport(state, { id: report.id, studentId: 'chloe' }, { tutorId, publish: true });
  assert.equal(state.studentStamps.length, before + 1);
  assert.equal(state.studentStamps.at(-1).reason, '主動完成改正');
  assert.equal(report.draft, undefined);
  saveLessonReport(state, { id: report.id, studentId: 'chloe' }, { tutorId, publish: true });
  assert.equal(state.studentStamps.length, before + 1);
});

test('validation rejects unknown people, invalid dates/ratings, wrong report ownership and incomplete publishing atomically', () => {
  const state = setup(), before = structuredClone(state);
  for (const bad of [
    input({ studentId: 'missing' }), input({ date: '2026-02-30' }), input({ date: '2026-9-3' }),
    input({ ratings: { punctual: 'F' } }), input({ topicRows: [{ title: '', rating: 'A' }] }),
    input({ topicRows: Array.from({ length: 4 }, () => ({ title: '課題', rating: '' })) }),
    input({ comment: '' }), input({ topicRows: [] }), input({ awardStamp: true, stampReason: ' ' })
  ]) assert.throws(() => saveLessonReport(state, bad, { tutorId, publish: true }));
  assert.throws(() => saveLessonReport(state, input(), { tutorId: 'unknown', publish: true }));
  assert.deepEqual(state, before);
  const report = saveLessonReport(state, input(), { tutorId, publish: true });
  const otherTutor = tutors.find(tutor => tutor.id !== tutorId).id;
  assert.throws(() => saveLessonReport(state, input({ id: report.id }), { tutorId: otherTutor, publish: true }), /不屬於/);
  assert.throws(() => acknowledgeReport(state, { reportId: report.id, studentId: 'ethan' }), /找不到/);
  assert.throws(() => awardStudentStamp(state, { studentId: 'ethan', tutorId, reason: '測試', reportId: report.id }), /先發布/);
  assert.throws(() => awardStudentStamp(state, { studentId: 'chloe', tutorId, reason: ' ' }), /原因/);
  assert.throws(() => awardStudentStamp(state, { studentId: 'chloe', tutorId: 'missing', reason: '測試' }), /老師/);
});

test('published list is newest first and leaves independent teachers separate on the same lesson date', () => {
  const state = setup();
  const first = saveLessonReport(state, input(), { tutorId, publish: true });
  const otherTutor = tutors.find(tutor => tutor.id !== tutorId).id;
  const second = saveLessonReport(state, input(), { tutorId: otherTutor, publish: true });
  assert.notEqual(first.id, second.id);
  assert.equal(getPublishedReports(state, 'chloe').filter(report => report.date === TODAY).length, 2);
  assert.equal(getPublishedReports(state, 'chloe').at(-1).date, '2026-09-16');
});

test('handbook reference data covers supplied calendar and weather while retaining the confirmed billing policy', () => {
  assert.equal(new Set(HANDBOOK_CALENDAR.map(day => day.date)).size, HANDBOOK_CALENDAR.length);
  assert.ok(HANDBOOK_CALENDAR.every(day => ['centre', 'public'].includes(day.kind)));
  assert.equal(HANDBOOK_CALENDAR.find(day => day.date === '2026-12-23').kind, 'centre');
  assert.equal(HANDBOOK_CALENDAR.find(day => day.date === '2026-12-25').kind, 'public');
  assert.ok(HANDBOOK_CALENDAR.some(day => day.date === '2027-12-28'));
  assert.equal(HANDBOOK_WEATHER.length, 6);
  assert.match(HANDBOOK_WEATHER.find(row => row.signal === 'black').arrangement, /安全地方/);
  const billing = HANDBOOK_NOTICES.find(row => row.title === '繳費安排').body;
  assert.match(billing, /兩個月/);
  assert.match(billing, /20 日發出/);
  assert.match(billing, /下一個月 20 日/);
  assert.doesNotMatch(billing, /首堂|第一堂|四星期|200 手續費/);
});
