import { allStudents, tutors, centre, TODAY, uid } from './model.js';

const studentsById = new Map(allStudents.map(student => [student.id, student]));
const tutorIds = new Set(tutors.map(tutor => tutor.id));
const ratingKeys = ['punctual', 'homework', 'diligence', 'selfLearning'];
const emptyRatings = () => Object.fromEntries(ratingKeys.map(key => [key, '']));
const copy = value => structuredClone(value);
const string = value => typeof value === 'string' ? value.trim() : '';
const now = () => new Date().toISOString();
const validDate = date => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date + 'T12:00:00Z')) && new Date(date + 'T12:00:00Z').toISOString().slice(0, 10) === date;

// These dates are transcribed from the supplied 2026–27 centre handbook.
// They describe that calendar, rather than claiming to be a live holiday feed.
export const HANDBOOK_CALENDAR = [
  ['2026-09-26', 'public'], ['2026-10-01', 'public'], ['2026-10-19', 'public'],
  ['2026-12-23', 'centre'], ['2026-12-24', 'centre'], ['2026-12-25', 'public'], ['2026-12-26', 'public'],
  ['2027-01-01', 'public'], ['2027-01-24', 'centre'],
  ['2027-02-06', 'public'], ['2027-02-07', 'centre'], ['2027-02-08', 'public'], ['2027-02-09', 'public'],
  ['2027-03-14', 'centre'], ['2027-03-24', 'centre'], ['2027-03-25', 'centre'], ['2027-03-26', 'public'], ['2027-03-27', 'public'], ['2027-03-29', 'public'],
  ['2027-04-05', 'public'], ['2027-05-01', 'centre'], ['2027-05-13', 'public'],
  ['2027-06-09', 'public'], ['2027-06-29', 'centre'], ['2027-06-30', 'centre'],
  ['2027-07-01', 'public'], ['2027-07-02', 'centre'], ['2027-08-31', 'centre'],
  ['2027-09-01', 'centre'], ['2027-09-16', 'public'], ['2027-10-01', 'public'], ['2027-10-08', 'public'],
  ['2027-12-25', 'public'], ['2027-12-26', 'centre'], ['2027-12-27', 'public'], ['2027-12-28', 'centre']
].map(([date, kind]) => Object.freeze({ date, kind, label: kind === 'public' ? '公眾假期' : '中心假期' }));

export const HANDBOOK_WEATHER = [
  { signal: 'T1', label: '一號熱帶氣旋警告信號', arrangement: '如常上課。' },
  { signal: 'T3', label: '三號熱帶氣旋警告信號', arrangement: '如常上課。' },
  { signal: 'T8+', label: '八號或以上熱帶氣旋警告信號', arrangement: '即時停課。' },
  { signal: 'amber', label: '黃色暴雨警告信號', arrangement: '如常上課。' },
  { signal: 'red', label: '紅色暴雨警告信號', arrangement: '如常上課；如家長認為不宜上課，請聯絡中心商議課堂安排。' },
  { signal: 'black', label: '黑色暴雨警告信號', arrangement: '已抵達中心的學生如常上課；未能抵達的學生應留在安全地方，並與中心聯絡。' }
];

export const HANDBOOK_NOTICES = [
  { title: '課堂與請假', body: '請準時上課。因私人理由請假，須最少於上課前一天的辦公時間內申請；病假補堂須提供病假紙。每期調堂或補堂以三堂為上限，實際安排由中心確認。' },
  { title: '補堂安排', body: '補堂須於付費期內及原課堂起計 60 天內完成。已安排的補堂不得再次更改。請先透過應用程式提交意向，再由中心確認時間。' },
  { title: '繳費安排', body: '每期 HK$2,000，為可於兩個月內使用的 8 堂課程。中心於 20 日發出下一期繳費通知，並於下一個月 20 日或之前收款；個別學生的收費月份可不同。實際金額及期限以繳費通知為準。' },
  { title: '惡劣天氣期間', body: '如警告在上課期間發出，中心會照顧已到校的學生，直至安排學生在安全情況下回家。家長請留意中心發布的最新課堂安排。' }
];

function ensureCollections(state) {
  if (!state || typeof state !== 'object') throw new Error('未能讀取手冊紀錄。');
  state.lessonNotes ??= [];
  state.studentStamps ??= [];
  if (!Array.isArray(state.lessonNotes) || !Array.isArray(state.studentStamps)) throw new Error('手冊紀錄格式不正確。');
}

function validatePeople(studentId, tutorId) {
  if (!studentsById.has(studentId)) throw new Error('請選擇有效的學生。');
  if (!tutorIds.has(tutorId)) throw new Error('請選擇有效的老師。');
}

function checkedRating(value) {
  if (value == null || value === '') return '';
  if (!['A', 'B', 'C', 'D', 'E'].includes(value)) throw new Error('評級只可選擇 A 至 E。');
  return value;
}

function reportContent(input, base, tutorId) {
  const content = {
    studentId: input.studentId ?? base.studentId,
    date: input.date ?? base.date,
    tutor: tutorId,
    topics: string(input.topics ?? base.topics),
    performance: string(input.performance ?? base.performance),
    comment: string(input.comment ?? base.comment),
    homework: string(input.homework ?? base.homework)
  };
  validatePeople(content.studentId, tutorId);
  if (!validDate(content.date)) throw new Error('請輸入有效的課堂日期。');
  const ratings = input.ratings ?? base.ratings ?? emptyRatings();
  if (!ratings || typeof ratings !== 'object' || Array.isArray(ratings)) throw new Error('課堂評級格式不正確。');
  content.ratings = Object.fromEntries(ratingKeys.map(key => [key, checkedRating(ratings[key])]));
  const rows = input.topicRows ?? (Object.hasOwn(input, 'topics') ? [{ title: content.topics, rating: '' }] : base.topicRows) ?? (content.topics ? [{ title: content.topics, rating: '' }] : []);
  if (!Array.isArray(rows) || rows.length > 3) throw new Error('每份課堂紀錄最多可填寫三個學習重點。');
  content.topicRows = rows.map(row => {
    if (!row || typeof row !== 'object') throw new Error('學習重點格式不正確。');
    const title = string(row.title), rating = checkedRating(row.rating);
    if (!title && rating) throw new Error('請先填寫學習重點，再選擇評級。');
    return { title, rating };
  }).filter(row => row.title);
  if (Object.hasOwn(input, 'topicRows')) content.topics = content.topicRows.map(row => row.title).join('、');
  return content;
}

const visibleContent = report => JSON.stringify({
  studentId: report.studentId, date: report.date, tutor: report.tutor,
  topics: report.topics || '', performance: report.performance || '', comment: report.comment || '', homework: report.homework || '',
  ratings: Object.fromEntries(ratingKeys.map(key => [key, report.ratings?.[key] || ''])),
  topicRows: report.topicRows || (report.topics ? [{ title: report.topics, rating: '' }] : [])
});

/** Add missing handbook fields and a small, explicitly labelled demo sample once. */
export function normalizeHandbook(state) {
  ensureCollections(state);
  for (const report of state.lessonNotes) {
    report.tutor ??= state.bookings?.find(booking => booking.studentId === report.studentId && booking.date === report.date)?.tutor || studentsById.get(report.studentId)?.tutor || centre.managerId;
    report.ratings ??= emptyRatings();
    report.topicRows ??= report.topics ? [{ title: report.topics, rating: '' }] : [];
  }
  if (state.handbookVersion >= 1) return state;
  const sampleStudents = ['chloe', ...(centre.code === 'TWN' ? ['twn-c64262b4d67d'] : [])];
  for (const studentId of sampleStudents) {
    const tutor = studentsById.get(studentId)?.tutor || centre.managerId;
    if (!state.studentStamps.some(stamp => stamp.studentId === studentId)) {
      ['2026-09-02', '2026-09-09', '2026-09-16', '2026-09-23', '2026-09-30'].forEach((date, index) => state.studentStamps.push({
        id: 'handbook-demo-stamp-' + studentId + '-' + index, studentId, tutor, date,
        awardedAt: date + 'T10:00:00.000Z', reason: ['專心完成課堂練習', '主動分享解題方法', '認真完成改正', '準時交齊功課', '願意挑戰新題目'][index], source: 'handbook-demo'
      }));
    }
    if (studentId !== 'chloe' && !state.lessonNotes.some(report => report.studentId === studentId)) {
      state.lessonNotes.push({
        id: 'handbook-demo-report-' + studentId, studentId, date: '2026-09-23', tutor,
        topics: '數字規律、解題方法', topicRows: [{ title: '數字規律', rating: 'B' }, { title: '解題方法', rating: 'B' }],
        ratings: { punctual: 'A', homework: 'B', diligence: 'A', selfLearning: 'B' },
        performance: '', comment: '今天能夠說明找到規律的方法。下次會繼續練習把解題步驟寫清楚。', homework: '重溫本課的練習，並完成老師派發的家課。',
        published: true, publishedAt: '2026-09-23T10:00:00.000Z', source: 'handbook-demo'
      });
    }
  }
  state.handbookVersion = 1;
  return state;
}

/** Draft edits never replace the published copy visible to a parent. */
export function saveLessonReport(state, input, { tutorId, publish = false } = {}) {
  ensureCollections(state);
  validatePeople(input?.studentId, tutorId);
  const existing = input.id ? state.lessonNotes.find(report => report.id === input.id) : state.lessonNotes.find(report => report.studentId === input.studentId && report.date === input.date && (!report.tutor || report.tutor === tutorId));
  if (input.id && !existing) throw new Error('找不到這份課堂紀錄，請重新開啟。');
  if (existing && (existing.studentId !== input.studentId || existing.tutor && existing.tutor !== tutorId)) throw new Error('這份課堂紀錄不屬於所選學生或老師。');
  const editing = existing?.draft || existing || {};
  const content = reportContent(input, editing, tutorId);
  if (publish && (!content.topics || !content.comment)) throw new Error('請填寫學習重點及給家長的話。');
  const awardStamp = Object.hasOwn(input, 'awardStamp') ? input.awardStamp === true : editing.awardStamp === true;
  const stampReason = string(Object.hasOwn(input, 'stampReason') ? input.stampReason : editing.stampReason);
  if (publish && awardStamp && !stampReason) throw new Error('請填寫印章獎勵原因。');
  const report = existing || { id: uid('lesson-report'), studentId: content.studentId, date: content.date };
  if (!publish && report.published) {
    report.draft = { ...content, awardStamp, stampReason, savedAt: now() };
  } else if (!publish) {
    Object.assign(report, content, { published: false, awardStamp, stampReason });
    delete report.draft;
  } else {
    const changed = report.published && visibleContent(report) !== visibleContent(content);
    if (changed && (report.parentAcknowledgedAt || report.parentReply)) {
      report.parentResponses ??= [];
      report.parentResponses.push({ acknowledgedAt: report.parentAcknowledgedAt || null, reply: report.parentReply || '', version: report.version || 1 });
      delete report.parentAcknowledgedAt;
      delete report.parentReply;
    }
    const publishedAt = !report.published || changed ? now() : report.publishedAt || now();
    const version = report.published ? (report.version || 1) + (changed ? 1 : 0) : 1;
    Object.assign(report, content, { published: true, publishedAt, version });
    delete report.draft;
    delete report.awardStamp;
    delete report.stampReason;
  }
  if (!existing) state.lessonNotes.push(report);
  if (publish && awardStamp) awardStudentStamp(state, { studentId: content.studentId, tutorId, reason: stampReason, reportId: report.id });
  return report;
}

export function acknowledgeReport(state, { reportId, studentId, reply = '' } = {}) {
  ensureCollections(state);
  const report = state.lessonNotes.find(item => item.id === reportId && item.studentId === studentId && item.published);
  if (!studentsById.has(studentId) || !report) throw new Error('找不到可確認的課堂紀錄。');
  if (typeof reply !== 'string') throw new Error('請輸入有效的家長留言。');
  if (!report.parentAcknowledgedAt || report.parentReply !== reply.trim()) report.parentAcknowledgedAt = now();
  report.parentReply = reply.trim();
  return report;
}

export function awardStudentStamp(state, { studentId, tutorId, reason, reportId } = {}) {
  ensureCollections(state);
  validatePeople(studentId, tutorId);
  reason = string(reason);
  if (!reason) throw new Error('請填寫印章獎勵原因。');
  let report;
  if (reportId) {
    report = state.lessonNotes.find(item => item.id === reportId && item.studentId === studentId && item.tutor === tutorId && item.published);
    if (!report) throw new Error('請先發布這位學生的課堂紀錄。');
    const existing = state.studentStamps.find(stamp => stamp.reportId === reportId);
    if (existing) return existing;
  }
  const stamp = { id: uid('stamp'), studentId, tutor: tutorId, reason, date: report?.date || TODAY, awardedAt: now(), ...(reportId ? { reportId } : {}) };
  state.studentStamps.push(stamp);
  return stamp;
}

export function getStudentStamps(state, studentId) {
  // A stamp occupies the next collection slot when it is awarded. Linking it
  // to an earlier lesson must not renumber the child's existing collection.
  return (state.studentStamps || []).filter(stamp => stamp.studentId === studentId);
}

export function getPublishedReports(state, studentId) {
  return (state.lessonNotes || []).filter(report => report.studentId === studentId && report.published).slice().sort((a, b) => b.date.localeCompare(a.date) || (b.publishedAt || '').localeCompare(a.publishedAt || '')).map(report => {
    const visible = copy(report);
    // Drafts and old parent responses remain teacher-side edit history.
    delete visible.draft;
    delete visible.parentResponses;
    delete visible.awardStamp;
    delete visible.stampReason;
    return visible;
  });
}
