import { centre, money, studentById, time, tutors } from './model.js';
import { familyContent, familyDate, isFamilyRole } from './family-locale.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const scheduleReasons = {
  'Extra lesson allowed after a permanent regular schedule change; no additional charge.': '更改固定上課時間後，中心同意增加課堂，不另收費。',
  'Extra lesson declined; final surplus date excluded.': '中心未有批准額外課堂，最後超出的日期不設課堂。',
  'Missing lesson retained as a make-up credit after a permanent regular schedule change.': '更改固定上課時間後，減少的課堂已保留為補堂名額。',
  'Missing lesson accepted without a make-up credit.': '中心確認減少課堂，不另提供補堂名額。',
  'Permanent regular schedule changed with the same lesson count.': '已更改固定上課時間，課堂總數不變。'
};
function receiptPeriod(value, role) {
  if (!isFamilyRole(role)) return value;
  const months = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Sept: 9, Oct: 10, Nov: 11, Dec: 12 };
  const match = /^(\w+)[–-](\w+) (\d{4})$/.exec(value);
  return match && months[match[1]] && months[match[2]] ? `${match[3]} 年 ${months[match[1]]} 至 ${months[match[2]]} 月` : familyContent(value, role);
}

// Receipt revisions are document snapshots of the same payment. Rendering an
// earlier version must never read its lesson entitlement from the live invoice.
export function renderReceiptDocument(state, receiptId, { role = 'admin', revisionId = null } = {}) {
  const receipt = state.receipts?.find(item => item.id === receiptId);
  if (!receipt) return '';
  const invoice = state.invoices?.find(item => item.id === receipt.invoiceId);
  const student = studentById(receipt.studentId);
  const family = isFamilyRole(role);
  const text = (en, zh) => family ? zh : en;
  const date = value => familyDate(value, role, { year: 'numeric' });
  const revisions = Array.isArray(receipt.revisions) ? receipt.revisions : [];
  const selectedId = revisionId ?? receipt.activeRevisionId;
  const revision = selectedId === 'original' ? null : revisions.find(item => item.id === selectedId) || null;
  const original = receipt.originalDocument || {
    description: invoice?.description,
    period: invoice?.period,
    lessonPlan: invoice?.lessonPlan
  };
  const document = revision || original;
  const plan = document.lessonPlan || document;
  const lessonDates = Array.isArray(document.lessonDates) ? document.lessonDates : Array.isArray(plan.lessonDates) ? plan.lessonDates : [];
  const lessonCount = document.lessonCount ?? plan.lessonCount;
  const makeUpLessonCount = document.makeUpLessonCount ?? plan.makeUpLessonCount ?? 0;
  const excludedDates = Array.isArray(revision?.excludedDates) ? revision.excludedDates : [];
  const documentId = revision?.id || receipt.id;
  const description = document.description || (Number.isFinite(lessonCount) ? `Regular programme · ${lessonCount} lessons` : text('Regular programme', '常規課程'));
  const translatedDescription = family && /^Regular programme · \d+ lessons?$/.test(description)
    ? `常規課程 · ${description.match(/\d+/)[0]} 堂`
    : familyContent(description, role);
  const period = document.period ?? original.period ?? invoice?.period ?? '';
  const detail = (label, value) => `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`;
  const documentType = revision ? text('Amended receipt', '修訂收據') : text('Receipt', '收據');
  const bank = state.bankTransactions?.find(item => item.id === receipt.bankId);

  const lessonList = lessonDates.length ? `<ol class="receipt-lesson-list">${lessonDates.map(lesson => {
    const tutor = tutors.find(item => item.id === lesson.tutor)?.name || lesson.tutor || '';
    const span = Number.isFinite(lesson.start) && Number.isFinite(lesson.duration) ? `${time(lesson.start)}–${time(lesson.start + lesson.duration)}` : '';
    return `<li><span>${esc(date(lesson.date))}</span><span>${esc(span)}${tutor ? ` · ${esc(tutor)}` : ''}</span></li>`;
  }).join('')}</ol>` : '';
  const scheduledSummary = makeUpLessonCount ? `<p class="small muted mt-8">${text('Scheduled regular lessons', '已列出日期的常規課堂')}：${lessonDates.length} ${text(lessonDates.length === 1 ? 'lesson' : 'lessons', '堂')}</p>` : '';
  const excluded = excludedDates.length ? `<p class="receipt-excluded-dates small mt-8"><strong>${text('No class on', '以下日期不設課堂')}：</strong>${excludedDates.map(value => esc(date(value))).join(text(', ', '、'))}</p>` : '';
  const lessons = Number.isFinite(lessonCount) ? `<section class="receipt-lessons mt-16"><h3 class="small">${text('Lesson entitlement', '課堂安排')} · ${lessonCount} ${text(lessonCount === 1 ? 'lesson' : 'lessons', '堂')}</h3>${scheduledSummary}${lessonList}${makeUpLessonCount ? `<p class="small mt-8">${text('Make-up entitlement', '補堂名額')}：${makeUpLessonCount} ${text(makeUpLessonCount === 1 ? 'lesson' : 'lessons', '堂')} · ${text('Contact the centre to arrange.', '請聯絡中心安排。')}</p>` : ''}${excluded}</section>` : '';
  const reason = family ? revision?.reasonZh || scheduleReasons[revision?.reason] || revision?.reason : revision?.reason;
  const amendment = revision ? `<div class="receipt-amendment mt-16"><p class="small strong">${text('Amended', '修訂日期')} ${esc(date(revision.revisedAt))}</p><p class="small muted mt-8">${text('The original receipt date and payment amount are unchanged. This replaces the earlier document for the same payment.', '保留原收據日期及付款金額。此修訂版取代同一筆付款的舊版收據。')}</p>${reason ? `<p class="small mt-8 receipt-amendment-reason">${text('Reason', '原因')}：${esc(reason)}</p>` : ''}</div>` : '';
  const history = revisions.length ? `<details class="receipt-revision-history mt-16"><summary class="small">${text('Receipt versions', '收據版本')}</summary><div class="stack mt-8">${[
    { id: 'original', label: `${receipt.id} · ${text('Original', '原始版本')}`, selected: !revision },
    ...revisions.map(item => ({ id: item.id, label: `${item.id} · ${text('Amended', '修訂日期')} ${date(item.revisedAt)}`, selected: revision?.id === item.id }))
  ].map(item => `<button type="button" class="btn ghost" data-action="receipt-revision" data-id="${esc(receipt.id)}" data-revision="${esc(item.id)}"${item.selected ? ' aria-current="true" disabled' : ''}>${esc(item.label)}</button>`).join('')}</div></details>` : '';

  return `<div class="receipt-paper"><div class="between"><div class="wordmark"><img class="brand-logo" src="/brand/mathconcept-logo.png" width="2172" height="724" alt="MathConcept"></div><span class="eyebrow">${documentType}</span></div><p class="small muted mt-16">${esc(familyContent(centre.name, role))}</p><dl class="detail-grid">${detail(text('Receipt no.', '收據編號'), documentId)}${detail(text('Receipt date', '收據日期'), date(revision?.receiptDate || receipt.issuedDate))}${detail(text('Parent / guardian', '家長／監護人'), student.parent)}${detail(text('Student', '學生'), student.name)}${detail(text('Payment proof received', '收到付款證明日期'), date(receipt.proofDate))}${bank ? detail(text('Bank credit date', '銀行入賬日期'), date(bank.date)) : ''}</dl><p class="strong small">${esc(translatedDescription)}</p><p class="small muted mt-8">${esc(receiptPeriod(period, role))}${period ? ' · ' : ''}${esc(receipt.invoiceId)}</p>${amendment}${lessons}<div class="receipt-total"><span>${text('Payment amount', '付款金額')}</span><span>${money(receipt.amount)}</span></div><p class="small muted">${text('Issued from payment proof · bank reconciliation is separate.', '根據付款證明發出 · 銀行對賬另行處理。')}<br>${text('Demonstration receipt · no actual payment', '示範收據 · 不涉及實際付款')}</p></div>${history}`;
}
