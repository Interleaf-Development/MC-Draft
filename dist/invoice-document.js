import { allStudents, centre, money, time, tutors } from './model.js';
import { familyContent } from './family-locale.js';

export const escapeDocumentText = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const esc = escapeDocumentText;
const dateOnly = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + 'T12:00:00Z')) && new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value;

export function documentDate(value) {
  if (!value) return '未有紀錄';
  const raw = String(value), date = new Date(dateOnly(raw) ? raw + 'T12:00:00Z' : raw);
  if (!Number.isFinite(date.getTime()) || /^\d{4}-\d{2}-\d{2}$/.test(raw) && !dateOnly(raw)) return '未有紀錄';
  return new Intl.DateTimeFormat('zh-HK', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Hong_Kong' }).format(date);
}

export const documentPeriod = value => familyContent(value || '', 'parent');
export const documentDetail = (label, value) => `<div><dt>${esc(label)}</dt><dd>${esc(value || '未有紀錄')}</dd></div>`;

export function documentStudent(state, id, provided) {
  const student = provided || allStudents.find(item => item.id === id) || {};
  const profile = state.studentProfiles?.[id] || {};
  const parent = [profile.parentGivenName, profile.parentSurname].filter(value => typeof value === 'string' && value.trim()).map(value => value.trim()).join(' ');
  return { ...student, name: student.name || profile.name || '未有紀錄', number: student.number || '', parent: parent || student.parent || '' };
}

export function renderDocumentHeader(title) {
  return `<header class="billing-document-header"><div class="billing-document-brand"><img src="/brand/mathconcept-logo.png" width="2172" height="724" alt="MathConcept"><p>${esc(familyContent(centre.name, 'parent'))}</p></div><div class="billing-document-heading"><span class="eyebrow">${esc(title)}</span></div></header>`;
}

export function documentDescription(description, lessonCount) {
  if (/^Regular programme · \d+ lessons?$/.test(description || '') && Number.isFinite(lessonCount)) return `常規課程 · ${lessonCount} 堂`;
  return familyContent(description || '常規課程', 'parent');
}

/** Read only the dated lesson record supplied by this document. Never infer a
 * schedule from a student's current weekday, the tuition period or the count. */
export function renderDocumentLessons({ lessonDates = [], lessonCount, makeUpLessonCount = 0, excludedDates = [], assessment = false, kind = 'invoice' } = {}) {
  const dated = (Array.isArray(lessonDates) ? lessonDates : []).map(item => typeof item === 'string' ? { date: item } : item).filter(item => item && dateOnly(item.date));
  const count = Number.isFinite(lessonCount) ? lessonCount : dated.length ? dated.length + makeUpLessonCount : null;
  const title = assessment ? '評估安排' : '課堂安排';
  const list = dated.length ? `<div class="billing-document-lesson-head" aria-hidden="true"><span>日期</span><span>時間及老師</span></div><ol class="billing-document-lesson-list ${kind}-lesson-list">${dated.map(lesson => {
    const tutor = tutors.find(item => item.id === lesson.tutor)?.name || lesson.tutor || '';
    const start = Number.isFinite(lesson.start) ? lesson.start : null;
    const span = start === null ? '時間待確認' : Number.isFinite(lesson.duration) ? `${time(start)}–${time(start + lesson.duration)}` : `${time(start)}（結束時間待確認）`;
    return `<li><span>${esc(documentDate(lesson.date))}</span><span>${esc(span)}${tutor ? ` · ${esc(tutor)}` : ''}</span></li>`;
  }).join('')}</ol>` : `<p class="billing-document-missing">${assessment ? '評估日期待確認。' : '課堂日期待確認。'}</p>`;
  const scheduled = makeUpLessonCount ? `<p class="billing-document-note">已列出日期的常規課堂：${dated.length} 堂</p>` : '';
  const makeup = makeUpLessonCount ? `<p class="billing-document-note">補堂名額：${makeUpLessonCount} 堂 · 請聯絡中心安排。</p>` : '';
  const incomplete = count !== null && dated.length && dated.length + makeUpLessonCount < count ? `<p class="billing-document-note">尚有 ${count - dated.length - makeUpLessonCount} 堂日期待確認。</p>` : '';
  const excluded = excludedDates.length ? `<p class="receipt-excluded-dates billing-document-note"><strong>以下日期不設課堂：</strong>${excludedDates.filter(dateOnly).map(value => esc(documentDate(value))).join('、')}</p>` : '';
  return `<section class="billing-document-lessons ${kind}-lessons"><h3>${title}${count === null ? '' : ` · ${count} ${assessment ? '次' : '堂'}`}</h3>${scheduled}${list}${incomplete}${makeup}${excluded}</section>`;
}

export function documentLessonRecord(record = {}) {
  const plan = record.lessonPlan || record;
  const assessment = record.chargeType === 'assessment';
  const assessmentDate = [record.assessmentDate, record.periodStart, record.period].find(dateOnly);
  const dates = Array.isArray(record.lessonDates) ? record.lessonDates : Array.isArray(plan.lessonDates) ? plan.lessonDates : [];
  return {
    assessment,
    lessonDates: assessment && !dates.length && assessmentDate ? [{ date: assessmentDate, start: record.assessmentStart, duration: record.assessmentDuration, tutor: record.assessmentTutor }] : dates,
    lessonCount: record.lessonCount ?? plan.lessonCount ?? (assessment && assessmentDate ? 1 : undefined),
    makeUpLessonCount: record.makeUpLessonCount ?? plan.makeUpLessonCount ?? 0,
    excludedDates: record.excludedDates || []
  };
}

const chargeNames = { assessment: '入學評估費', 'first-tuition': '首次學費', recurring: '續期學費' };

export function renderInvoiceDocument(state, invoiceOrId, { student: suppliedStudent, chargeLabel } = {}) {
  const invoice = typeof invoiceOrId === 'string' ? state.invoices?.find(item => item.id === invoiceOrId) : invoiceOrId;
  if (!invoice) return '';
  const student = documentStudent(state, invoice.studentId, suppliedStudent);
  const lessons = documentLessonRecord(invoice);
  const charge = chargeNames[invoice.chargeType] || familyContent(chargeLabel || '學費', 'parent');
  const description = documentDescription(invoice.description || charge, lessons.lessonCount);
  const period = documentPeriod(invoice.period) || (invoice.periodStart && invoice.periodEnd ? documentDate(invoice.periodStart) + ' 至 ' + documentDate(invoice.periodEnd) : '未有紀錄');
  const assessmentDate = typeof lessons.lessonDates[0] === 'string' ? lessons.lessonDates[0] : lessons.lessonDates[0]?.date;
  return `<article class="billing-document invoice-paper" lang="zh-HK" aria-label="繳費通知 ${esc(invoice.id)}">${renderDocumentHeader('繳費通知')}<dl class="billing-document-meta">${documentDetail('繳費通知編號', invoice.id)}${documentDetail('發出日期', documentDate(invoice.issued || invoice.issuedDate))}${documentDetail('繳費限期', documentDate(invoice.due))}</dl><section class="billing-document-recipient"><dl>${documentDetail('學生', student.name)}${documentDetail('學生編號', student.number)}${documentDetail('家長／監護人', student.parent)}${documentDetail(lessons.assessment ? '評估日期' : '學費期數', lessons.assessment ? documentDate(assessmentDate) : period)}</dl></section><section class="billing-document-charge"><h3>收費項目</h3><p>${esc(description)}</p></section>${renderDocumentLessons(lessons)}<div class="billing-document-total"><span>應付金額</span><strong>${money(invoice.amount)}</strong></div><footer class="billing-document-footer"><p>請於繳費限期前付款，並提交付款證明予中心核對。</p><p>示範繳費通知 · 不涉及實際付款</p></footer></article>`;
}
