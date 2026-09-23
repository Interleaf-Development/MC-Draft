import { centre, money, studentById, time, tutors } from './model.js';
import { familyContent, familyDate } from './family-locale.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const scheduleReasons = {
  'Extra lesson allowed after a permanent regular schedule change; no additional charge.': '更改固定上課時間後，中心同意增加課堂，不另收費。',
  'Extra lesson declined; final surplus date excluded.': '中心未有批准額外課堂，最後超出的日期不設課堂。',
  'Missing lesson retained as a make-up credit after a permanent regular schedule change.': '更改固定上課時間後，減少的課堂已保留為補堂名額。',
  'Missing lesson accepted without a make-up credit.': '中心確認減少課堂，不另提供補堂名額。',
  'Permanent regular schedule changed with the same lesson count.': '已更改固定上課時間，課堂總數不變。',
  'Extra lesson allowed after a temporary regular schedule change; no additional charge.': '暫時更改上課時間後，中心同意增加課堂，不另收費。',
  'Missing lesson retained as a make-up credit after a temporary regular schedule change.': '暫時更改上課時間後，減少的課堂已保留為補堂名額。',
  'Temporary regular schedule changed with the same lesson count.': '已暫時更改上課時間，課堂總數不變。'
};
function familyScheduleReason(revision, role) {
  if (revision?.reasonZh) return revision.reasonZh;
  const reason = revision?.reason;
  const temporary = /^(.*?) Temporary dates: (\d{4}-\d{2}-\d{2}) through (\d{4}-\d{2}-\d{2}) inclusive; previous timetable resumes after the final date\.$/.exec(reason || '');
  if (temporary && scheduleReasons[temporary[1]]) {
    const date = value => familyDate(value, 'parent', { year: 'numeric' });
    return scheduleReasons[temporary[1]] + ' 暫時安排：' + date(temporary[2]) + ' 至 ' + date(temporary[3]) + '（包括最後一天），之後恢復原有上課時間。';
  }
  return scheduleReasons[reason] || reason;
}
function receiptPeriod(value, role) {
  const months = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Sept: 9, Oct: 10, Nov: 11, Dec: 12 };
  const match = /^(\w+)[–-](\w+) (\d{4})$/.exec(value);
  return match && months[match[1]] && months[match[2]] ? `${match[3]} 年 ${months[match[1]]} 至 ${months[match[2]]} 月` : familyContent(value, 'parent');
}
function amendmentTime(value) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return familyDate(value, 'parent', { year: 'numeric' });
  const timestamp = new Date(value);
  return Number.isFinite(timestamp.getTime())
    ? new Intl.DateTimeFormat('zh-HK', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Hong_Kong' }).format(timestamp)
    : '未有紀錄';
}

// Proof acknowledgements are independent of bank reconciliation. Older remote
// proof records use the same semantics; cash and cheque receipts stay receipts.
export function isPaymentAcknowledgement(state, receipt) {
  if (!receipt || receipt.documentType === 'receipt') return false;
  const invoice = state.invoices?.find(item => item.id === receipt.invoiceId);
  const method = receipt.paymentMethod || invoice?.paymentMethod;
  if (['cash', 'cheque'].includes(method)) return false;
  return receipt.documentType === 'payment-acknowledgement' || Boolean(invoice?.proof);
}

// Receipt revisions are document snapshots of the same payment. Rendering an
// earlier version must never read its lesson entitlement from the live invoice.
export function renderReceiptDocument(state, receiptId, { role = 'admin', revisionId = null } = {}) {
  const receipt = state.receipts?.find(item => item.id === receiptId);
  if (!receipt) return '';
  const invoice = state.invoices?.find(item => item.id === receipt.invoiceId);
  const student = studentById(receipt.studentId);
  const text = (_en, zh) => zh;
  const date = value => familyDate(value, 'parent', { year: 'numeric' });
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
  const translatedDescription = /^Regular programme · \d+ lessons?$/.test(description)
    ? `常規課程 · ${Number.isFinite(lessonCount) ? lessonCount : description.match(/\d+/)[0]} 堂`
    : familyContent(description, 'parent');
  const period = document.period ?? original.period ?? invoice?.period ?? '';
  const detail = (label, value) => `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`;
  const acknowledgement = isPaymentAcknowledgement(state, receipt);
  const documentType = acknowledgement
    ? revision ? text('Amended payment acknowledgement', '修訂付款確認') : text('Payment acknowledgement', '付款確認')
    : revision ? text('Amended receipt', '修訂收據') : text('Receipt', '收據');
  const bank = state.bankTransactions?.find(item => item.id === receipt.bankId);
  const paymentDate = Object.hasOwn(document, 'paymentDate') ? document.paymentDate : receipt.paymentDate || invoice?.claimedPaymentDate || invoice?.proofReview?.extracted?.paymentDate;
  const payerName = invoice?.proofPayer || invoice?.proofReview?.extracted?.payer;
  const paymentDetails = acknowledgement
    ? (paymentDate ? detail(text('Transaction date', '交易日期'), date(paymentDate)) : '')
      + (payerName ? detail(text('Name on paying account', '付款戶口姓名'), payerName) : '')
    : paymentDate ? detail(text('Payment date', '付款日期'), date(paymentDate)) : '';

  const lessonList = lessonDates.length ? `<ol class="receipt-lesson-list">${lessonDates.map(lesson => {
    const tutor = tutors.find(item => item.id === lesson.tutor)?.name || lesson.tutor || '';
    const span = Number.isFinite(lesson.start) && Number.isFinite(lesson.duration) ? `${time(lesson.start)}–${time(lesson.start + lesson.duration)}` : '';
    return `<li><span>${esc(date(lesson.date))}</span><span>${esc(span)}${tutor ? ` · ${esc(tutor)}` : ''}</span></li>`;
  }).join('')}</ol>` : '';
  const scheduledSummary = makeUpLessonCount ? `<p class="small muted mt-8">${text('Scheduled regular lessons', '已列出日期的常規課堂')}：${lessonDates.length} ${text(lessonDates.length === 1 ? 'lesson' : 'lessons', '堂')}</p>` : '';
  const excluded = excludedDates.length ? `<p class="receipt-excluded-dates small mt-8"><strong>${text('No class on', '以下日期不設課堂')}：</strong>${excludedDates.map(value => esc(date(value))).join(text(', ', '、'))}</p>` : '';
  const lessons = Number.isFinite(lessonCount) ? `<section class="receipt-lessons mt-16"><h3 class="small">${text('Lesson entitlement', '課堂安排')} · ${lessonCount} ${text(lessonCount === 1 ? 'lesson' : 'lessons', '堂')}</h3>${scheduledSummary}${lessonList}${makeUpLessonCount ? `<p class="small mt-8">${text('Make-up entitlement', '補堂名額')}：${makeUpLessonCount} ${text(makeUpLessonCount === 1 ? 'lesson' : 'lessons', '堂')} · ${text('Contact the centre to arrange.', '請聯絡中心安排。')}</p>` : ''}${excluded}</section>` : '';
  const reason = familyScheduleReason(revision, 'parent');
  const amendedAt = revision?.generatedAt || revision?.revisedAt;
  const sourceDocument = revision ? `<p class="small mt-8">${acknowledgement ? '原付款確認編號' : '原收據編號'}：${esc(revision.originalReceiptId || receipt.id)} · 取代版本：${esc(revision.replacesDocumentId || receipt.id)}</p>` : '';
  const amendment = revision ? `<div class="receipt-amendment mt-16"><p class="small strong">${revision.generatedAt ? '修訂產生時間' : text('Amended', '修訂日期')} ${esc(amendmentTime(amendedAt))}</p>${sourceDocument}<p class="small muted mt-8">${acknowledgement ? text('The original issue date, payment date and amount are unchanged. This replaces the earlier acknowledgement for the same payment.', '保留原發出日期、付款日期及付款金額。此修訂版取代同一筆付款的舊版付款確認。') : text('The original receipt date, payment date and amount are unchanged. This replaces the earlier document for the same payment.', '保留原收據日期、付款日期及付款金額。此修訂版取代同一筆付款的舊版收據。')}</p>${reason ? `<p class="small mt-8 receipt-amendment-reason">${text('Reason', '原因')}：${esc(reason)}</p>` : ''}</div>` : '';
  const history = revisions.length ? `<details class="receipt-revision-history mt-16"><summary class="small">${acknowledgement ? text('Acknowledgement versions', '付款確認版本') : text('Receipt versions', '收據版本')}</summary><div class="stack mt-8">${[
    { id: 'original', label: `${receipt.id} · ${text('Original', '原始版本')}`, selected: !revision },
    ...revisions.map(item => ({ id: item.id, label: `${item.id} · ${item.generatedAt ? '修訂產生時間' : text('Amended', '修訂日期')} ${amendmentTime(item.generatedAt || item.revisedAt)}`, selected: revision?.id === item.id }))
  ].map(item => `<button type="button" class="btn ghost" data-action="receipt-revision" data-id="${esc(receipt.id)}" data-revision="${esc(item.id)}"${item.selected ? ' aria-current="true" disabled' : ''}>${esc(item.label)}</button>`).join('')}</div></details>` : '';

  return `<div class="receipt-paper"><div class="between"><div class="wordmark"><img class="brand-logo" src="/brand/mathconcept-logo.png" width="2172" height="724" alt="MathConcept"></div><span class="eyebrow">${documentType}</span></div><p class="small muted mt-16">${esc(familyContent(centre.name, 'parent'))}</p><dl class="detail-grid">${detail(acknowledgement ? text('Acknowledgement no.', '付款確認編號') : text('Receipt no.', '收據編號'), documentId)}${detail(acknowledgement ? text('Issue date', '發出日期') : text('Receipt date', '收據日期'), date(revision?.receiptDate || receipt.issuedDate))}${detail(text('Parent / guardian', '家長／監護人'), student.parent)}${detail(text('Student', '學生'), student.name)}${detail(text('Payment proof received', '收到付款證明日期'), date(receipt.proofDate))}${paymentDetails}${bank && !acknowledgement ? detail(text('Bank credit date', '銀行入賬日期'), date(bank.date)) : ''}</dl><p class="strong small">${esc(translatedDescription)}</p><p class="small muted mt-8">${esc(receiptPeriod(period, role))}${period ? ' · ' : ''}${esc(receipt.invoiceId)}</p>${amendment}${lessons}<div class="receipt-total"><span>${text('Payment amount', '付款金額')}</span><span>${money(receipt.amount)}</span></div><p class="small muted">${acknowledgement ? text('Payment proof accepted. Bank confirmation is recorded separately.', '付款證明已獲接納，銀行入賬會由中心另行核對。') : text('Issued from payment proof · bank reconciliation is separate.', '根據付款證明發出 · 銀行對賬另行處理。')}<br>${acknowledgement ? text('Demonstration acknowledgement · no actual payment', '示範付款確認 · 不涉及實際付款') : text('Demonstration receipt · no actual payment', '示範收據 · 不涉及實際付款')}</p></div>${history}`;
}
