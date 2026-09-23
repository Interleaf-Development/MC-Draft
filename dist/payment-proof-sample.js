import { centre } from './model.js';
import { billingText } from './billing-locale.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const amount = value => new Intl.NumberFormat('en-HK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value));
const date = value => {
  if (!value) return '日期未有紀錄';
  const raw = String(value), parsed = new Date(raw.length === 10 ? raw + 'T09:00:00+08:00' : raw);
  return Number.isNaN(parsed.getTime()) ? '日期未有紀錄' : new Intl.DateTimeFormat('zh-HK', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Hong_Kong' }).format(parsed) + ' HKT';
};

// A document-shaped UI fixture, never a substitute for an uploaded attachment.
// Values come from the selected fictional payment, so different invoices do not
// accidentally display the same transaction amount or transfer reference.
export function renderDemoPaymentProof(invoice, review = {}, paymentDetails = {}) {
  const extracted = review.extracted || {};
  const unreadable = review.scenario === 'unreadable';
  const recipient = extracted.recipient || paymentDetails.recipient || centre.name;
  const account = extracted.recipientAccount || paymentDetails.fpsId || 'DEMO-' + centre.code;
  const method = {fps:'FPS 轉數快', 'bank-transfer':'銀行轉帳', alipayhk:'AlipayHK', payme:'PayMe', cash:'現金', cheque:'支票'}[extracted.paymentMethod || invoice.paymentMethod || 'fps'] || '轉帳';
  const payer = extracted.payer || invoice.proofPayer || 'CHAN TAI MAN（示範）';
  const reference = extracted.reference || invoice.proofReference || 'DEMO-' + invoice.id;
  const paid = Number.isFinite(extracted.amount) ? extracted.amount : invoice.amount;
  const paidAt = extracted.paymentDate || invoice.claimedPaymentDate || invoice.proofDate || review.submittedDate;
  const row = (label, value, uncertain = false) => `<div><dt>${label}</dt><dd${uncertain && unreadable ? ' class="sample-transfer-obscured"' : ''}>${value}</dd></div>`;
  if (review.scenario === 'not-proof') return '<article class="sample-transfer sample-transfer-invalid"><div class="sample-transfer-demo">示範附件 · 虛構資料</div><h3>購物清單</h3><p>筆記簿<br>鉛筆<br>書包</p><p class="sample-transfer-note">此附件不是付款證明，須交由職員跟進。</p></article>';
  return `<article class="sample-transfer" aria-label="示範付款證明">
    <div class="sample-transfer-demo">示範付款證明 · 虛構資料</div>
    <header class="sample-transfer-header"><span>轉帳確認</span><span>${esc(method)}</span></header>
    <div class="sample-transfer-success"><span class="sample-transfer-tick" aria-hidden="true">✓</span><h3>轉帳完成</h3><p>款項已按指示轉出。<br>請保留此確認紀錄，以便日後查閱。</p></div>
    <dl class="sample-transfer-fields">
      ${row('付款人', esc(payer), true)}
      ${row('付款戶口', '港元儲蓄戶口<br><span class="sample-transfer-account">DEMO •••• 2846</span>')}
      ${row('收款人', esc(billingText(recipient)), true)}
      ${row('收款戶口／FPS', esc(account), true)}
      ${row('轉帳金額', `<strong>${amount(paid)} HKD</strong>`, true)}
      ${row('手續費', '豁免')}
      ${row('交易日期及時間', esc(date(paidAt)))}
      ${row('參考編號', esc(reference), true)}
    </dl>
    <p class="sample-transfer-note">只供功能示範，不作付款憑據。${unreadable ? '本例部分內容模糊，須人工覆核。' : ''}</p>
  </article>`;
}
