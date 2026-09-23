import { billingText } from './billing-locale.js';
import { renderPaymentPdf } from './billing-pdf-preview.js';
import { money } from './model.js';
import { renderInvoiceDocument } from './invoice-document.js';
import { renderDemoPaymentProof } from './payment-proof-sample.js';
import { paymentProofChecks, paymentDetailsFor } from './billing-automation.js';
import { billingStage, invoiceReceipt, queryBillingInvoices, confirmInvoicePayment, returnInvoiceProof, remindInvoiceParent, getProofApprovalMode, setProofApprovalMode } from './billing-workflow.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const button = (action, label, attrs = '', className = 'btn') => `<button type="button" class="${className}" data-action="billingflow-${action}" ${attrs}>${label}</button>`;
const stages = [['parent', '待家長付款'], ['review', '待中心核對'], ['issued', '已發收據'], ['audit', '最終對數']];
const charges = [['all', '所有收費類別'], ['assessment', '入學評估'], ['first-tuition', '首次學費'], ['recurring', '續期學費']];
const proofTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf']);
const dataPayload = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const safeFile = file => {
  if (!file || !proofTypes.has(file.mimeType) || typeof file.dataUrl !== 'string') return false;
  const prefix = `data:${file.mimeType};base64,`, payload = file.dataUrl.slice(prefix.length);
  return file.dataUrl.startsWith(prefix) && payload.length > 0 && dataPayload.test(payload);
};
const dateText = value => {
  if (!value) return '未有紀錄';
  const raw = String(value), dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw);
  const date = new Date(dateOnly ? raw + 'T12:00:00Z' : raw);
  if (Number.isNaN(date.getTime())) return '未有紀錄';
  return new Intl.DateTimeFormat('zh-HK', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Hong_Kong', ...(!dateOnly ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}) }).format(date);
};
const monthText = value => /^\d{4}-\d{2}$/.test(value) ? new Intl.DateTimeFormat('zh-HK', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value + '-01T12:00:00Z')) : value;

/** The host saves mutations transactionally and owns the underlying list and modal. */
export function createBillingWorkflowUI({ getState, getViewer, save, render, modal, closeModal, toast, openReceipt, renderAudit, renderReport, onSavingChange = () => {}, waitForSave = () => new Promise(resolve => setTimeout(resolve, 650)) }) {
  let stage = 'review', query = '', chargeType = 'all', month = '', page = 1, draft = null, searchTimer, saving = false, cancelPdf = null;
  const disabledControls = new Map();
  const canUse = () => getViewer().role === 'admin';
  const requireAdmin = () => { if (!canUse()) throw new Error('請在行政介面處理繳費。'); };
  const findNode = selector => globalThis.document?.querySelector(selector);
  const showError = error => {
    const message = billingText(error?.message || String(error)), area = findNode('#form-error');
    if (area) { area.textContent = message; area.classList.add('visible'); }
    else toast(message, false, true);
  };
  const safely = fn => { try { return fn(); } catch (error) { showError(error); return false; } };
  const currentResult = () => queryBillingInvoices(getState(), { stage: stage === 'audit' ? 'review' : stage, query: stage === 'audit' ? '' : query, chargeType: stage === 'audit' ? 'all' : chargeType, month: stage === 'audit' ? '' : month, page, pageSize: 25 });
  const localizedMutation = mutation => () => {
    try { return mutation(); }
    catch (error) { throw new Error(billingText(error.message)); }
  };
  const saved = (mutation, success) => {
    if (save(localizedMutation(mutation)) !== true) {
      if (!findNode('#form-error')?.textContent) showError('未能儲存修改，請重試。');
      return false;
    }
    success?.();
    return true;
  };
  function refresh(focusId, selection, pageDirection) {
    render();
    if (focusId) {
      const target = findNode('#' + focusId);
      target?.focus();
      if (selection && target?.setSelectionRange) target.setSelectionRange(...selection);
    }
    if (pageDirection) {
      const selector = '[data-action="billingflow-page"]';
      (findNode(`${selector}[data-direction="${pageDirection}"]:not([disabled])`) || findNode(`${selector}:not([disabled])`))?.focus();
    }
  }
  function pagination(result) {
    return `<div class="collection-footer"><span class="small muted">第 ${result.start}–${result.end} 項，共 ${result.total} 張繳費通知</span>${result.pages > 1 ? `<div class="flex">${button('page', '上一頁', `data-page="${result.page - 1}" data-direction="previous"${result.page === 1 ? ' disabled' : ''}`, 'btn small')}<span class="small muted">${result.page} / ${result.pages}</span>${button('page', '下一頁', `data-page="${result.page + 1}" data-direction="next"${result.page === result.pages ? ' disabled' : ''}`, 'btn small')}</div>` : ''}</div>`;
  }
  function rowDate(row) {
    const { invoice, receipt } = row;
    if (stage === 'review') return esc(dateText(row.proofSubmittedAt));
    if (stage === 'issued') return esc(dateText(receipt?.issuedAt || receipt?.issuedDate));
    if (stage === 'archive') return esc(dateText(invoice.cancelledAt || invoice.canceledAt || invoice.voidedAt || invoice.cancelledDate || invoice.voidedDate));
    return `${esc(dateText(invoice.due))}${row.overdue ? '<div class="billingflow-overdue">已逾期</div>' : ''}${row.replacementProof ? `<div class="billingflow-return-reason">待重新提交付款證明${invoice.proofReturnReason ? `<span>${esc(invoice.proofReturnReason)}</span>` : ''}</div>` : ''}`;
  }
  function rowAction(row) {
    const id = `data-id="${esc(row.invoice.id)}"`;
    if (stage === 'review') return button('review', '核對付款', id, 'btn small');
    if (stage === 'issued' || stage === 'archive') return row.receipt ? button('receipt', '查看收據', id, 'btn small') : '<span class="muted">—</span>';
    const label = row.replacementProof ? '提醒重新提交證明' : '提醒家長繳費';
    const reminder = row.lastReminderAt ? `<div class="row-meta">上次提醒：${esc(dateText(row.lastReminderAt))}</div>` : '';
    return `${button('remind', label, `${id}${row.reminderAvailable ? '' : ' disabled title="每隔 24 小時可記錄一次提醒。"'}`, 'btn small')}${reminder}${!row.reminderAvailable ? '<div class="row-meta">須相隔 24 小時才可再次提醒</div>' : ''}`;
  }
  function renderQueue(result) {
    const dateHeading = { parent: '繳費期限', review: '證明上載日期', issued: '收據發出日期', archive: '封存日期' }[stage];
    const rows = result.items.map(row => `<tr><td><strong>${esc(row.student.name)}</strong>${row.student.number ? `<div class="row-meta">${esc(row.student.number)}</div>` : ''}</td><td>${esc(billingText(row.chargeLabel))}<div class="row-meta">${esc(row.invoice.id)}</div></td><td>${esc(billingText(row.periodLabel || '未有紀錄'))}</td><td class="billing-amount nowrap">${money(row.invoice.amount)}</td><td class="billingflow-date">${rowDate(row)}${stage === 'archive' ? `<div class="row-meta">${row.invoice.voided || row.invoice.voidedAt || ['void', 'voided'].includes(row.invoice.status || row.invoice.lifecycleStatus) ? '作廢' : '已取消'}</div>` : ''}</td><td>${rowAction(row)}</td></tr>`).join('');
    const emptyText = query || chargeType !== 'all' || month ? '沒有符合條件的繳費通知' : { parent: '沒有等待家長付款的繳費通知', review: '沒有等待中心核對的付款', issued: '尚未發出收據', archive: '沒有已封存的繳費通知' }[stage];
    return `<section class="panel billing-table billingflow-table"><div class="table-scroll"><table><thead><tr><th>學生</th><th>收費／繳費通知</th><th>日期／涵蓋時段</th><th class="billing-amount">金額</th><th>${dateHeading}</th><th><span class="visually-hidden">操作</span></th></tr></thead><tbody>${rows}</tbody></table></div>${result.total ? '' : `<div class="empty"><h3>${emptyText}</h3></div>`}${pagination(result)}</section>`;
  }
  function renderWorkspace() {
    if (!canUse()) return '';
    const result = currentResult();
    if (stage !== 'audit') page = result.page;
    const navigation = `<nav class="billingflow-tabs" aria-label="繳費階段">${stages.map(([id, label]) => button('stage', `${label}${id === 'audit' ? '' : ` <span class="billingflow-count">${result.counts[id]}</span>`}`, `data-id="${id}" aria-pressed="${stage === id}"${id === 'audit' ? '' : ` aria-label="${label}：${result.counts[id]} 張繳費通知"`}`, `billingflow-tab${stage === id ? ' active' : ''}`)).join('')}</nav>`;
    if (stage === 'audit') return `<div class="billing-workspace billingflow-workspace">${navigation}${renderAudit?.() || ''}${renderReport ? `<div class="billing-secondary-actions">${button('report', '繳費報表', '', 'btn ghost small')}</div>` : ''}</div>`;
    const archive = stage === 'archive';
    const policy = `<div class="billingflow-policy"><label for="billingflow-approval-mode">收據發出方式</label><select id="billingflow-approval-mode"><option value="staff"${getProofApprovalMode(getState()) === 'staff' ? ' selected' : ''}>AI 核對後，由職員批准</option><option value="automatic"${getProofApprovalMode(getState()) === 'automatic' ? ' selected' : ''}>全部相符自動發出；例外交職員</option></select></div>`;
    const toolbar = `<div class="billing-toolbar billingflow-toolbar"><input id="billingflow-search" type="search" value="${esc(query)}" placeholder="姓名、學生編號或繳費通知" aria-label="搜尋姓名、學生編號或繳費通知"><select id="billingflow-charge" aria-label="收費類別">${charges.map(([id, label]) => `<option value="${id}"${chargeType === id ? ' selected' : ''}>${label}</option>`).join('')}</select><select id="billingflow-month" aria-label="收費月份"><option value=""${month ? '' : ' selected'}>所有收費月份</option>${result.months.map(value => `<option value="${esc(value)}"${month === value ? ' selected' : ''}>${esc(monthText(value))}</option>`).join('')}</select>${button(archive ? 'back' : 'archive', archive ? '返回繳費' : `封存紀錄（${result.counts.archive}）`, '', 'btn ghost small')}</div>`;
    const archiveHeading = archive ? '<h2 class="billingflow-archive-title">封存紀錄</h2>' : '';
    return `<div class="billing-workspace billingflow-workspace">${navigation}${policy}${toolbar}${archiveHeading}${renderQueue(result)}</div>`;
  }
  function reviewRow(id) {
    requireAdmin();
    const state = getState(), invoice = state.invoices.find(item => item.id === id);
    if (!invoice || billingStage(state, invoice) !== 'review') throw new Error('這張繳費通知已不在待中心核對清單。');
    return queryBillingInvoices({ ...state, invoices: [invoice] }, { stage: 'review' }).items[0];
  }
  const detail = (label, value) => `<div><dt>${label}</dt><dd>${esc(value || '未有紀錄')}</dd></div>`;
  function documentPanel(kind, title, body) {
    const zoom = draft.zoom[kind];
    const controls = button('zoom', '−', `data-document="${kind}" data-step="-25" aria-label="縮小${title}"${zoom === 100 ? ' disabled' : ''}`, 'billingflow-zoom-button')
      + button('zoom', `${zoom}%`, `data-document="${kind}" data-step="reset" aria-label="重設${title}縮放比例" id="billingflow-${kind}-zoom"`, 'billingflow-zoom-button billingflow-zoom-value')
      + button('zoom', '+', `data-document="${kind}" data-step="25" aria-label="放大${title}"${zoom === 200 ? ' disabled' : ''}`, 'billingflow-zoom-button');
    return `<section class="billingflow-${kind}"><header class="billingflow-document-toolbar"><h3>${title}</h3><div class="billingflow-zoom" role="group" aria-label="${title}縮放">${controls}</div></header><div class="billingflow-document-scroll" tabindex="0" role="region" aria-label="${title}文件"><div class="billingflow-document-content" id="billingflow-${kind}-document" style="zoom:${zoom / 100};width:${zoom}%">${body}</div></div></section>`;
  }
  function changeZoom(control) {
    const kind = control?.dataset.document;
    if (!draft || !['invoice', 'proof'].includes(kind)) throw new Error('請先開啟付款文件才調整大小。');
    const step = control.dataset.step;
    if (!['-25', '25', 'reset'].includes(step)) throw new Error('請選擇有效的縮放比例。');
    draft.zoom[kind] = step === 'reset' ? 100 : Math.max(100, Math.min(200, draft.zoom[kind] + Number(step)));
    const zoom = draft.zoom[kind], content = findNode(`#billingflow-${kind}-document`);
    if (content) { content.style.zoom = zoom / 100; content.style.width = `${zoom}%`; }
    const value = findNode(`#billingflow-${kind}-zoom`);
    if (value) value.textContent = `${zoom}%`;
    for (const [direction, disabled] of [['-25', zoom === 100], ['25', zoom === 200]]) {
      const control = findNode(`[data-action="billingflow-zoom"][data-document="${kind}"][data-step="${direction}"]`);
      if (control) control.disabled = disabled;
    }
  }
  function invoicePreview(row) {
    return documentPanel('invoice', '繳費通知', renderInvoiceDocument(getState(), row.invoice, { student: row.student, chargeLabel: row.chargeLabel }));
  }
  function aiReview(row) {
    const checks = paymentProofChecks(getState(), row.invoice);
    const failed = checks.filter(check => check.status !== 'pass').length;
    const fields = checks.map(check => `<div><dt>${esc(billingText(check.label))}</dt><dd><span>${esc(billingText(check.detail || '未有紀錄'))}</span><span class="billingflow-ai-result ${['pass', 'fail', 'uncertain'].includes(check.status) ? check.status : 'uncertain'}">${esc({pass:'✓ 相符',fail:'不相符',uncertain:'待覆核'}[check.status] || '待覆核')}</span></dd></div>`).join('');
    const approvalError = row.invoice.proofReview?.automaticApprovalError;
    return `<section class="billingflow-ai-review" aria-label="AI 付款核對"><div class="billingflow-ai-heading"><h3>AI 核對（示範）</h3><span>${failed ? `${failed} 項需要職員覆核` : '所有核對項目相符'}</span></div><dl class="billingflow-ai-fields">${fields}</dl>${approvalError ? `<p class="billingflow-proof-unavailable">未能自動發出收據，須由職員跟進：${esc(billingText(approvalError))}</p>` : ''}<p class="billingflow-ai-note">示範結果以模擬資料產生；付款證明核對與銀行實際入帳分開處理。</p></section>`;
  }
  function proofPreview(row) {
    const { invoice } = row, review = invoice.proofReview || {}, file = review.file, extracted = review.extracted || {};
    let evidence;
    if (safeFile(file)) {
      evidence = `<div class="billingflow-proof-file">${file.mimeType.startsWith('image/') ? `<img src="${esc(file.dataUrl)}" alt="已上載的付款證明" class="billingflow-proof-image">` : `<div class="billingflow-proof-pdf" id="billingflow-pdf-preview" role="region" aria-label="已上載的付款證明 PDF"><p class="billingflow-pdf-status" role="status">正在開啟 PDF…</p></div>`}<p class="billingflow-file-name">${esc(file.name || '付款證明')}</p></div>`;
    } else if (file) {
      evidence = '<p class="billingflow-proof-unavailable">未能顯示已儲存的證明，請家長重新上載。</p>';
    } else {
      evidence = renderDemoPaymentProof(invoice, review, paymentDetailsFor(getState()));
    }
    const details = `<dl class="billingflow-details billingflow-proof-details">${detail('上載日期', dateText(row.proofSubmittedAt))}${detail('付款戶口姓名', invoice.proofPayer || extracted.payer)}${detail('交易日期', invoice.claimedPaymentDate ? dateText(invoice.claimedPaymentDate) : null)}${detail('參考編號', invoice.proofReference)}</dl>`;
    return documentPanel('proof', '付款證明', `${evidence}${details}`);
  }

  function renderReview() {
    cancelPdf?.(); cancelPdf = null;
    const row = reviewRow(draft?.invoiceId);
    if (!row) throw new Error('找不到這張繳費通知。');
    const reason = draft.returning ? `<div class="field billingflow-return-field"><label for="billingflow-return-reason">重新提交原因</label><textarea id="billingflow-return-reason" rows="3" maxlength="500" required placeholder="請告知家長需要更換哪些資料。">${esc(draft.reason)}</textarea></div>` : '';
    const footer = button('close', '取消', '', 'btn ghost') + button('return', '退回證明並要求重新提交', `data-id="${esc(row.invoice.id)}"`) + button('confirm', '確認並發出收據', `data-id="${esc(row.invoice.id)}"`, 'btn primary');
    const recoveryDemo = `<details class="billingflow-save-demo"><summary>示範儲存結果</summary><label for="billingflow-save-outcome">下次提交</label><select id="billingflow-save-outcome">${[['success', '成功'], ['failed', '儲存失敗'], ['uncertain', '確認程序中斷']].map(([value, label]) => `<option value="${value}"${draft.saveOutcome === value ? ' selected' : ''}>${label}</option>`).join('')}</select></details>`;
    modal('核對付款', `<div class="billingflow-review" data-billingflow-review="${esc(row.invoice.id)}"><div class="billingflow-review-columns">${invoicePreview(row)}${proofPreview(row)}</div>${aiReview(row)}${reason}<p id="billingflow-save-status" class="billingflow-save-status" role="status" hidden></p><div id="billingflow-recovery"></div>${recoveryDemo}</div>`, footer, true);
    findNode('.modal')?.classList.add('billingflow-review-modal');
    const file = row.invoice.proofReview?.file, pdfTarget = findNode('#billingflow-pdf-preview');
    if (pdfTarget && file?.mimeType === 'application/pdf' && safeFile(file)) cancelPdf = renderPaymentPdf(pdfTarget, file.dataUrl);
  }
  function openReview(id) {
    reviewRow(id);
    clearTimeout(searchTimer);
    draft = { invoiceId: id, returning: false, reason: '', zoom: { invoice: 100, proof: 100 }, saveOutcome: 'success', uncertain: false };
    renderReview();
  }
  function activeReview(id) {
    if (!draft || draft.invoiceId !== id) throw new Error('請重新開啟這筆付款才進行核對。');
    return reviewRow(id);
  }
  function openAudit() { requireAdmin(); if (saving) return false; clearTimeout(searchTimer); stage = 'audit'; render(); return true; }
  function setSaving(value) {
    saving = value;
    findNode('.modal')?.setAttribute?.('aria-busy', String(value));
    const status = findNode('#billingflow-save-status');
    if (status) { status.hidden = !value; status.textContent = value ? '正在儲存…請保持此視窗開啟。' : ''; }
    if (value) {
      for (const control of globalThis.document?.querySelectorAll?.('.billingflow-review-modal button, .billingflow-review-modal input, .billingflow-review-modal textarea, .billingflow-review-modal select') || []) {
        disabledControls.set(control, control.disabled); control.disabled = true;
      }
    } else {
      for (const [control, wasDisabled] of disabledControls) control.disabled = wasDisabled;
      disabledControls.clear();
    }
    onSavingChange(value);
  }
  function finishReview(kind) {
    cancelPdf?.(); cancelPdf = null;
    draft = null;
    closeModal();
    render();
    toast(kind === 'confirm' ? '付款已確認，示範收據已發出。' : '已在示範中退回證明以供重新提交，未有發送訊息。');
  }
  function showRecovery(kind) {
    draft.uncertain = true; draft.pendingKind = kind;
    const target = findNode('#billingflow-recovery');
    if (target) target.innerHTML = button('recover', '檢查儲存結果', '', 'btn small');
    for (const action of ['confirm', 'return']) {
      const control = findNode(`[data-action="billingflow-${action}"]`);
      if (control) control.disabled = true;
    }
    showError('未能確認儲存結果，請先檢查已儲存的結果再重試。');
  }
  function recoverReview() {
    if (!draft?.uncertain) throw new Error('沒有需要檢查的中斷提交。');
    const invoice = getState().invoices.find(item => item.id === draft.invoiceId);
    if (!invoice) throw new Error('找不到這張繳費通知。');
    const completed = draft.pendingKind === 'confirm' ? Boolean(invoiceReceipt(getState(), invoice)) : invoice.proofDisposition === 'returned';
    if (completed) { finishReview(draft.pendingKind); return; }
    draft.uncertain = false; draft.saveOutcome = 'success';
    renderReview();
    showError('找不到已完成的儲存紀錄，請重新提交。');
  }
  async function saveReview(kind, id) {
    const submission = draft, outcome = draft.saveOutcome;
    const area = findNode('#form-error');
    if (area) { area.textContent = ''; area.classList.remove?.('visible'); }
    setSaving(true);
    let result = false, error = null, attempted = false;
    try {
      await waitForSave();
      requireAdmin();
      if (draft !== submission) throw new Error('請重新開啟這筆付款才進行核對。');
      if (outcome === 'failed') throw new Error('示範儲存失敗，核對視窗保持開啟，請重試。');
      attempted = true;
      result = await save(localizedMutation(() => {
        requireAdmin();
        if (kind === 'confirm') confirmInvoicePayment(getState(), id);
        else returnInvoiceProof(getState(), id, { reason: submission.reason });
      }));
    } catch (failure) { error = failure; }
    finally { setSaving(false); }
    if (draft !== submission) return;
    draft.saveOutcome = 'success';
    const outcomeControl = findNode('#billingflow-save-outcome');
    if (outcomeControl) outcomeControl.value = 'success';
    if (error) { if (attempted) showRecovery(kind); else showError(error); return; }
    if (result !== true && result !== false || result === true && outcome === 'uncertain') { showRecovery(kind); return; }
    if (result !== true) {
      if (!findNode('#form-error')?.textContent) showError('未能儲存修改，請重試。');
      return;
    }
    finishReview(kind);
  }
  function handleAction(action, id, control) {
    if (!action.startsWith('billingflow-')) return false;
    safely(() => {
      requireAdmin();
      const name = action.slice(12);
      if (saving) return;
      if (draft?.uncertain && !['recover', 'close', 'zoom'].includes(name)) throw new Error('請先檢查儲存結果再重新提交。');
      if (name === 'stage') {
        if (!stages.some(([value]) => value === id)) throw new Error('請選擇有效的繳費階段。');
        clearTimeout(searchTimer); stage = id; page = 1; refresh();
      } else if (name === 'archive' || name === 'back') { clearTimeout(searchTimer); stage = name === 'archive' ? 'archive' : 'review'; page = 1; refresh(); }
      else if (name === 'page') {
        const next = Number(control?.dataset.page);
        if (!Number.isInteger(next) || next < 1) throw new Error('請選擇有效的繳費通知頁面。');
        page = next; refresh(null, null, control?.dataset.direction);
      } else if (name === 'review') openReview(id);
      else if (name === 'close') { cancelPdf?.(); cancelPdf = null; draft = null; closeModal(); }
      else if (name === 'zoom') changeZoom(control);
      else if (name === 'recover') recoverReview();
      else if (name === 'receipt') {
        const state = getState(), invoice = state.invoices.find(item => item.id === id), receipt = invoiceReceipt(state, invoice);
        if (!receipt) throw new Error('找不到收據。');
        openReceipt(receipt.id);
      } else if (name === 'remind') saved(() => { requireAdmin(); remindInvoiceParent(getState(), id); }, () => toast('已記錄示範提醒，未有發送訊息。'));
      else if (name === 'confirm') {
        activeReview(id);
        void saveReview('confirm', id);
      } else if (name === 'return') {
        activeReview(id);
        if (!draft.returning) { draft.returning = true; renderReview(); findNode('#billingflow-return-reason')?.focus(); return; }
        draft.reason = findNode('#billingflow-return-reason')?.value ?? draft.reason;
        if (!draft.reason.trim()) throw new Error('請填寫要求家長重新提交付款證明的原因。');
        void saveReview('return', id);
      } else if (name === 'report' && renderReport) renderReport();
      else throw new Error('無法識別這項繳費操作。');
    });
    return true;
  }
  function onInput(event) {
    const target = event.target;
    if (saving) return target.id?.startsWith('billingflow-') || false;
    if (target.id === 'billingflow-return-reason') { if (canUse() && draft) draft.reason = target.value; return true; }
    if (target.id !== 'billingflow-search') return false;
    if (!canUse()) return true;
    query = target.value; page = 1;
    const selection = [target.selectionStart, target.selectionEnd];
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { if (canUse()) refresh(target.id, selection); }, 120);
    return true;
  }
  function onChange(event) {
    const target = event.target;
    if (!['billingflow-charge', 'billingflow-month', 'billingflow-save-outcome', 'billingflow-approval-mode'].includes(target.id)) return false;
    safely(() => {
      requireAdmin();
      if (saving) return;
      if (target.id === 'billingflow-approval-mode') {
        const selected = target.value;
        saved(() => setProofApprovalMode(getState(), selected), () => { refresh(target.id); toast(selected === 'automatic' ? '新提交的證明全部相符時自動發出收據；現有待核對項目保留。' : '新提交的證明由 AI 核對，再交職員批准。'); });
        target.value = getProofApprovalMode(getState());
        return;
      }
      if (target.id === 'billingflow-save-outcome') {
        if (!draft || !['success', 'failed', 'uncertain'].includes(target.value)) throw new Error('請選擇有效的示範儲存結果。');
        draft.saveOutcome = target.value;
        return;
      }
      if (target.id === 'billingflow-charge') {
        if (!charges.some(([value]) => value === target.value)) throw new Error('請選擇有效的收費類別。');
        chargeType = target.value;
      } else {
        if (target.value && !/^\d{4}-\d{2}$/.test(target.value)) throw new Error('請選擇有效的收費月份。');
        month = target.value;
      }
      page = 1; clearTimeout(searchTimer); refresh(target.id);
    });
    return true;
  }
  function reset() { if (saving) return false; clearTimeout(searchTimer); stage = 'review'; query = ''; chargeType = 'all'; month = ''; page = 1; cancelPdf?.(); cancelPdf = null; draft = null; return true; }
  return { render: renderWorkspace, handleAction, onInput, onChange, reset, openAudit, isSaving: () => saving, canClose: () => !saving, onModalClosed: () => { if (!saving) { cancelPdf?.(); cancelPdf = null; draft = null; } } };
}
