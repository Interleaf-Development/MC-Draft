import { renderPaymentPdf } from './billing-pdf-preview.js';
import { centre, money } from './model.js';
import { billingStage, invoiceReceipt, queryBillingInvoices, confirmInvoicePayment, returnInvoiceProof, remindInvoiceParent } from './billing-workflow.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const button = (action, label, attrs = '', className = 'btn') => `<button type="button" class="${className}" data-action="billingflow-${action}" ${attrs}>${label}</button>`;
const stages = [['parent', '待家長付款'], ['review', '待中心核對'], ['issued', '已發收據'], ['audit', 'Final audit']];
const charges = [['all', 'All charge types'], ['assessment', 'Assessment'], ['first-tuition', 'First tuition'], ['recurring', 'Recurring tuition']];
const proofTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf']);
const dataPayload = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const safeFile = file => {
  if (!file || !proofTypes.has(file.mimeType) || typeof file.dataUrl !== 'string') return false;
  const prefix = `data:${file.mimeType};base64,`, payload = file.dataUrl.slice(prefix.length);
  return file.dataUrl.startsWith(prefix) && payload.length > 0 && dataPayload.test(payload);
};
const dateText = value => {
  if (!value) return 'Not recorded';
  const raw = String(value), dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw);
  const date = new Date(dateOnly ? raw + 'T12:00:00Z' : raw);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Hong_Kong', ...(!dateOnly ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}) }).format(date);
};
const monthText = value => /^\d{4}-\d{2}$/.test(value) ? new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value + '-01T12:00:00Z')) : value;

/** The host saves mutations transactionally and owns the underlying list and modal. */
export function createBillingWorkflowUI({ getState, getViewer, save, render, modal, closeModal, toast, openReceipt, renderAudit, renderReport, onSavingChange = () => {}, waitForSave = () => new Promise(resolve => setTimeout(resolve, 650)) }) {
  let stage = 'review', query = '', chargeType = 'all', month = '', page = 1, draft = null, searchTimer, saving = false, cancelPdf = null;
  const disabledControls = new Map();
  const canUse = () => getViewer().role === 'admin';
  const requireAdmin = () => { if (!canUse()) throw new Error('Billing is available in the Admin view.'); };
  const findNode = selector => globalThis.document?.querySelector(selector);
  const showError = error => {
    const message = error?.message || String(error), area = findNode('#form-error');
    if (area) { area.textContent = message; area.classList.add('visible'); }
    else toast(message, false, true);
  };
  const safely = fn => { try { return fn(); } catch (error) { showError(error); return false; } };
  const currentResult = () => queryBillingInvoices(getState(), { stage: stage === 'audit' ? 'review' : stage, query: stage === 'audit' ? '' : query, chargeType: stage === 'audit' ? 'all' : chargeType, month: stage === 'audit' ? '' : month, page, pageSize: 25 });
  const saved = (mutation, success) => {
    if (save(mutation) !== true) {
      if (!findNode('#form-error')?.textContent) showError('Changes could not be saved. Try again.');
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
    return `<div class="collection-footer"><span class="small muted">${result.start}–${result.end} of ${result.total} invoices</span>${result.pages > 1 ? `<div class="flex">${button('page', 'Previous', `data-page="${result.page - 1}" data-direction="previous"${result.page === 1 ? ' disabled' : ''}`, 'btn small')}<span class="small muted">${result.page} / ${result.pages}</span>${button('page', 'Next', `data-page="${result.page + 1}" data-direction="next"${result.page === result.pages ? ' disabled' : ''}`, 'btn small')}</div>` : ''}</div>`;
  }
  function rowDate(row) {
    const { invoice, receipt } = row;
    if (stage === 'review') return esc(dateText(row.proofSubmittedAt));
    if (stage === 'issued') return esc(dateText(receipt?.issuedAt || receipt?.issuedDate));
    if (stage === 'archive') return esc(dateText(invoice.cancelledAt || invoice.canceledAt || invoice.voidedAt || invoice.cancelledDate || invoice.voidedDate));
    return `${esc(dateText(invoice.due))}${row.overdue ? '<div class="billingflow-overdue">Overdue</div>' : ''}${row.replacementProof ? `<div class="billingflow-return-reason">Waiting for replacement proof${invoice.proofReturnReason ? `<span>${esc(invoice.proofReturnReason)}</span>` : ''}</div>` : ''}`;
  }
  function rowAction(row) {
    const id = `data-id="${esc(row.invoice.id)}"`;
    if (stage === 'review') return button('review', 'Review payment', id, 'btn small');
    if (stage === 'issued' || stage === 'archive') return row.receipt ? button('receipt', 'View receipt', id, 'btn small') : '<span class="muted">—</span>';
    const label = row.replacementProof ? 'Remind to replace proof' : 'Remind parent to pay';
    const reminder = row.lastReminderAt ? `<div class="row-meta">Last reminder ${esc(dateText(row.lastReminderAt))}</div>` : '';
    return `${button('remind', label, `${id}${row.reminderAvailable ? '' : ' disabled title="A reminder can be recorded every 24 hours."'}`, 'btn small')}${reminder}${!row.reminderAvailable ? '<div class="row-meta">24-hour reminder cooldown</div>' : ''}`;
  }
  function renderQueue(result) {
    const dateHeading = { parent: 'Payment deadline', review: 'Proof uploaded', issued: 'Receipt issued', archive: 'Archived' }[stage];
    const rows = result.items.map(row => `<tr><td><strong>${esc(row.student.name)}</strong>${row.student.number ? `<div class="row-meta">${esc(row.student.number)}</div>` : ''}</td><td>${esc(row.chargeLabel)}<div class="row-meta">${esc(row.invoice.id)}</div></td><td>${esc(row.periodLabel || 'Not recorded')}</td><td class="billing-amount nowrap">${money(row.invoice.amount)}</td><td class="billingflow-date">${rowDate(row)}${stage === 'archive' ? `<div class="row-meta">${row.invoice.voided || row.invoice.voidedAt || ['void', 'voided'].includes(row.invoice.status || row.invoice.lifecycleStatus) ? 'Void' : 'Cancelled'}</div>` : ''}</td><td>${rowAction(row)}</td></tr>`).join('');
    const emptyText = query || chargeType !== 'all' || month ? 'No matching invoices' : { parent: 'No invoices waiting for parent payment', review: 'No payments waiting for centre review', issued: 'No receipts issued', archive: 'No archived invoices' }[stage];
    return `<section class="panel billing-table billingflow-table"><div class="table-scroll"><table><thead><tr><th>Student</th><th>Charge / invoice</th><th>Date / period</th><th class="billing-amount">Amount</th><th>${dateHeading}</th><th><span class="visually-hidden">Action</span></th></tr></thead><tbody>${rows}</tbody></table></div>${result.total ? '' : `<div class="empty"><h3>${emptyText}</h3></div>`}${pagination(result)}</section>`;
  }
  function renderWorkspace() {
    if (!canUse()) return '';
    const result = currentResult();
    if (stage !== 'audit') page = result.page;
    const navigation = `<nav class="billingflow-tabs" aria-label="Billing stages">${stages.map(([id, label]) => button('stage', `${label}${id === 'audit' ? '' : ` <span class="billingflow-count">${result.counts[id]}</span>`}`, `data-id="${id}" aria-pressed="${stage === id}"${id === 'audit' ? '' : ` aria-label="${label}: ${result.counts[id]} invoices"`}`, `billingflow-tab${stage === id ? ' active' : ''}`)).join('')}</nav>`;
    if (stage === 'audit') return `<div class="billing-workspace billingflow-workspace">${navigation}${renderAudit?.() || ''}${renderReport ? `<div class="billing-secondary-actions">${button('report', 'Billing report', '', 'btn ghost small')}</div>` : ''}</div>`;
    const archive = stage === 'archive';
    const toolbar = `<div class="billing-toolbar billingflow-toolbar"><input id="billingflow-search" type="search" value="${esc(query)}" placeholder="Name, student number or invoice" aria-label="Search by name, student number or invoice"><select id="billingflow-charge" aria-label="Charge type">${charges.map(([id, label]) => `<option value="${id}"${chargeType === id ? ' selected' : ''}>${label}</option>`).join('')}</select><select id="billingflow-month" aria-label="Billing month"><option value=""${month ? '' : ' selected'}>All billing months</option>${result.months.map(value => `<option value="${esc(value)}"${month === value ? ' selected' : ''}>${esc(monthText(value))}</option>`).join('')}</select>${button(archive ? 'back' : 'archive', archive ? 'Back to billing' : `Archive (${result.counts.archive})`, '', 'btn ghost small')}</div>`;
    const archiveHeading = archive ? '<h2 class="billingflow-archive-title">Archive</h2>' : '';
    return `<div class="billing-workspace billingflow-workspace">${navigation}${toolbar}${archiveHeading}${renderQueue(result)}</div>`;
  }
  function reviewRow(id) {
    requireAdmin();
    const state = getState(), invoice = state.invoices.find(item => item.id === id);
    if (!invoice || billingStage(state, invoice) !== 'review') throw new Error('This invoice is no longer waiting for centre review.');
    return queryBillingInvoices({ ...state, invoices: [invoice] }, { stage: 'review' }).items[0];
  }
  const detail = (label, value) => `<div><dt>${label}</dt><dd>${esc(value || 'Not recorded')}</dd></div>`;
  function documentPanel(kind, title, body) {
    const zoom = draft.zoom[kind];
    const controls = button('zoom', '−', `data-document="${kind}" data-step="-25" aria-label="Zoom out ${title.toLowerCase()}"${zoom === 100 ? ' disabled' : ''}`, 'billingflow-zoom-button')
      + button('zoom', `${zoom}%`, `data-document="${kind}" data-step="reset" aria-label="Reset ${title.toLowerCase()} zoom" id="billingflow-${kind}-zoom"`, 'billingflow-zoom-button billingflow-zoom-value')
      + button('zoom', '+', `data-document="${kind}" data-step="25" aria-label="Zoom in ${title.toLowerCase()}"${zoom === 200 ? ' disabled' : ''}`, 'billingflow-zoom-button');
    return `<section class="billingflow-${kind}"><header class="billingflow-document-toolbar"><h3>${title}</h3><div class="billingflow-zoom" role="group" aria-label="${title} zoom">${controls}</div></header><div class="billingflow-document-scroll" tabindex="0" role="region" aria-label="${title} document"><div class="billingflow-document-content" id="billingflow-${kind}-document" style="zoom:${zoom / 100};width:${zoom}%">${body}</div></div></section>`;
  }
  function changeZoom(control) {
    const kind = control?.dataset.document;
    if (!draft || !['invoice', 'proof'].includes(kind)) throw new Error('Open a payment document to zoom.');
    const step = control.dataset.step;
    if (!['-25', '25', 'reset'].includes(step)) throw new Error('Choose a valid zoom level.');
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
    const { invoice, student } = row;
    return documentPanel('invoice', 'Invoice', `<div class="billingflow-invoice-paper"><p class="billingflow-document-brand">${esc(centre.name)}</p><div class="billingflow-document-title"><strong>${esc(invoice.id)}</strong><span>${esc(row.chargeLabel)}</span></div><dl class="billingflow-details">${detail('Student', student.name)}${student.number ? detail('Student number', student.number) : ''}${detail(row.chargeType === 'assessment' ? 'Assessment date' : 'Tuition period', row.periodLabel)}${detail('Issued', dateText(invoice.issued))}${detail('Payment deadline', dateText(invoice.due))}</dl><div class="billingflow-invoice-total"><span>Amount due</span><strong>${money(invoice.amount)}</strong></div></div>`);
  }
  function proofPreview(row) {
    const { invoice } = row, review = invoice.proofReview || {}, file = review.file, extracted = review.extracted || {};
    let evidence;
    if (safeFile(file)) {
      evidence = `<div class="billingflow-proof-file">${file.mimeType.startsWith('image/') ? `<img src="${esc(file.dataUrl)}" alt="Uploaded payment proof" class="billingflow-proof-image">` : `<div class="billingflow-proof-pdf" id="billingflow-pdf-preview" role="region" aria-label="Uploaded payment proof PDF"><p class="billingflow-pdf-status" role="status">Opening PDF…</p></div>`}<p class="billingflow-file-name">${esc(file.name || 'Payment proof')}</p></div>`;
    } else if (file) {
      evidence = '<p class="billingflow-proof-unavailable">The saved proof could not be displayed. Ask the parent to upload it again.</p>';
    } else {
      evidence = `<div class="billingflow-sample"><strong>Sample proof</strong><p>Fictional payment details · no saved attachment</p><dl class="billingflow-details">${detail('Recipient', extracted.recipient)}${detail('Amount', Number.isFinite(extracted.amount) ? money(extracted.amount) : null)}${detail('Payment date', extracted.paymentDate ? dateText(extracted.paymentDate) : null)}${detail('Reference', extracted.reference)}</dl></div>`;
    }
    const details = `<dl class="billingflow-details billingflow-proof-details">${detail('Uploaded', dateText(row.proofSubmittedAt))}${detail('Name on paying account', invoice.proofPayer || extracted.payer)}${detail('Transaction date', invoice.claimedPaymentDate ? dateText(invoice.claimedPaymentDate) : null)}${detail('Reference', invoice.proofReference)}</dl>`;
    const reasons = review.reasons?.length ? `<ul class="billingflow-proof-reasons">${review.reasons.map(reason => `<li>${esc(reason)}</li>`).join('')}</ul>` : '';
    const checks = review.checks?.length ? `<details class="billing-help billingflow-checks"><summary>Demo check details</summary><p>These checks are simulated. No AI read the uploaded file.</p><ul>${review.checks.map(check => `<li><span>${esc(check.label)}</span><strong>${esc({ pass: 'Passed', fail: 'Failed', uncertain: 'Needs review' }[check.status] || 'Needs review')}</strong></li>`).join('')}</ul></details>` : '';
    return documentPanel('proof', 'Payment proof', `${evidence}${details}${reasons}${checks}`);
  }
  function renderReview() {
    cancelPdf?.(); cancelPdf = null;
    const row = reviewRow(draft?.invoiceId);
    if (!row) throw new Error('Invoice not found.');
    const reason = draft.returning ? `<div class="field billingflow-return-field"><label for="billingflow-return-reason">Reason for resubmission</label><textarea id="billingflow-return-reason" rows="3" maxlength="500" required placeholder="Tell the parent what needs to be replaced.">${esc(draft.reason)}</textarea></div>` : '';
    const footer = button('close', 'Cancel', '', 'btn ghost') + button('return', 'Return proof for resubmission', `data-id="${esc(row.invoice.id)}"`) + button('confirm', '確認並發出收據', `data-id="${esc(row.invoice.id)}"`, 'btn primary');
    const recoveryDemo = `<details class="billingflow-save-demo"><summary>Demo save outcome</summary><label for="billingflow-save-outcome">Next submission</label><select id="billingflow-save-outcome">${[['success', 'Success'], ['failed', 'Save fails'], ['uncertain', 'Confirmation interrupted']].map(([value, label]) => `<option value="${value}"${draft.saveOutcome === value ? ' selected' : ''}>${label}</option>`).join('')}</select></details>`;
    modal('Review payment', `<div class="billingflow-review" data-billingflow-review="${esc(row.invoice.id)}"><div class="billingflow-review-columns">${invoicePreview(row)}${proofPreview(row)}</div>${reason}<p id="billingflow-save-status" class="billingflow-save-status" role="status" hidden></p><div id="billingflow-recovery"></div>${recoveryDemo}</div>`, footer, true);
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
    if (!draft || draft.invoiceId !== id) throw new Error('Open this payment again before reviewing it.');
    return reviewRow(id);
  }
  function openAudit() { requireAdmin(); if (saving) return false; clearTimeout(searchTimer); stage = 'audit'; render(); return true; }
  function setSaving(value) {
    saving = value;
    findNode('.modal')?.setAttribute?.('aria-busy', String(value));
    const status = findNode('#billingflow-save-status');
    if (status) { status.hidden = !value; status.textContent = value ? 'Saving… Keep this window open.' : ''; }
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
    toast(kind === 'confirm' ? 'Payment confirmed. Receipt issued in this demo.' : 'Proof returned for resubmission in this demo. No message was sent.');
  }
  function showRecovery(kind) {
    draft.uncertain = true; draft.pendingKind = kind;
    const target = findNode('#billingflow-recovery');
    if (target) target.innerHTML = button('recover', 'Check saved result', '', 'btn small');
    for (const action of ['confirm', 'return']) {
      const control = findNode(`[data-action="billingflow-${action}"]`);
      if (control) control.disabled = true;
    }
    showError('The save result was not confirmed. Check the saved result before trying again.');
  }
  function recoverReview() {
    if (!draft?.uncertain) throw new Error('There is no interrupted submission to check.');
    const invoice = getState().invoices.find(item => item.id === draft.invoiceId);
    if (!invoice) throw new Error('Invoice not found.');
    const completed = draft.pendingKind === 'confirm' ? Boolean(invoiceReceipt(getState(), invoice)) : invoice.proofDisposition === 'returned';
    if (completed) { finishReview(draft.pendingKind); return; }
    draft.uncertain = false; draft.saveOutcome = 'success';
    renderReview();
    showError('No completed save was found. Please try the submission again.');
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
      if (draft !== submission) throw new Error('Open this payment again before reviewing it.');
      if (outcome === 'failed') throw new Error('The demo save failed. Your review remains open. Try again.');
      attempted = true;
      result = await save(() => {
        requireAdmin();
        if (kind === 'confirm') confirmInvoicePayment(getState(), id);
        else returnInvoiceProof(getState(), id, { reason: submission.reason });
      });
    } catch (failure) { error = failure; }
    finally { setSaving(false); }
    if (draft !== submission) return;
    draft.saveOutcome = 'success';
    const outcomeControl = findNode('#billingflow-save-outcome');
    if (outcomeControl) outcomeControl.value = 'success';
    if (error) { if (attempted) showRecovery(kind); else showError(error); return; }
    if (result !== true && result !== false || result === true && outcome === 'uncertain') { showRecovery(kind); return; }
    if (result !== true) {
      if (!findNode('#form-error')?.textContent) showError('Changes could not be saved. Try again.');
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
      if (draft?.uncertain && !['recover', 'close', 'zoom'].includes(name)) throw new Error('Check the saved result before submitting again.');
      if (name === 'stage') {
        if (!stages.some(([value]) => value === id)) throw new Error('Choose a valid billing stage.');
        clearTimeout(searchTimer); stage = id; page = 1; refresh();
      } else if (name === 'archive' || name === 'back') { clearTimeout(searchTimer); stage = name === 'archive' ? 'archive' : 'review'; page = 1; refresh(); }
      else if (name === 'page') {
        const next = Number(control?.dataset.page);
        if (!Number.isInteger(next) || next < 1) throw new Error('Choose a valid invoice page.');
        page = next; refresh(null, null, control?.dataset.direction);
      } else if (name === 'review') openReview(id);
      else if (name === 'close') { cancelPdf?.(); cancelPdf = null; draft = null; closeModal(); }
      else if (name === 'zoom') changeZoom(control);
      else if (name === 'recover') recoverReview();
      else if (name === 'receipt') {
        const state = getState(), invoice = state.invoices.find(item => item.id === id), receipt = invoiceReceipt(state, invoice);
        if (!receipt) throw new Error('Receipt not found.');
        openReceipt(receipt.id);
      } else if (name === 'remind') saved(() => { requireAdmin(); remindInvoiceParent(getState(), id); }, () => toast('Demo reminder recorded. No message was sent.'));
      else if (name === 'confirm') {
        activeReview(id);
        void saveReview('confirm', id);
      } else if (name === 'return') {
        activeReview(id);
        if (!draft.returning) { draft.returning = true; renderReview(); findNode('#billingflow-return-reason')?.focus(); return; }
        draft.reason = findNode('#billingflow-return-reason')?.value ?? draft.reason;
        if (!draft.reason.trim()) throw new Error('Enter a reason for the parent to resubmit their proof.');
        void saveReview('return', id);
      } else if (name === 'report' && renderReport) renderReport();
      else throw new Error('Unknown billing action.');
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
    if (!['billingflow-charge', 'billingflow-month', 'billingflow-save-outcome'].includes(target.id)) return false;
    safely(() => {
      requireAdmin();
      if (saving) return;
      if (target.id === 'billingflow-save-outcome') {
        if (!draft || !['success', 'failed', 'uncertain'].includes(target.value)) throw new Error('Choose a valid demo save outcome.');
        draft.saveOutcome = target.value;
        return;
      }
      if (target.id === 'billingflow-charge') {
        if (!charges.some(([value]) => value === target.value)) throw new Error('Choose a valid charge type.');
        chargeType = target.value;
      } else {
        if (target.value && !/^\d{4}-\d{2}$/.test(target.value)) throw new Error('Choose a valid billing month.');
        month = target.value;
      }
      page = 1; clearTimeout(searchTimer); refresh(target.id);
    });
    return true;
  }
  function reset() { if (saving) return false; clearTimeout(searchTimer); stage = 'review'; query = ''; chargeType = 'all'; month = ''; page = 1; cancelPdf?.(); cancelPdf = null; draft = null; return true; }
  return { render: renderWorkspace, handleAction, onInput, onChange, reset, openAudit, isSaving: () => saving, canClose: () => !saving, onModalClosed: () => { if (!saving) { cancelPdf?.(); cancelPdf = null; draft = null; } } };
}
