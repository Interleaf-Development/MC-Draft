import { money, studentById, centre, dateLabel, TODAY } from './model.js';
import { PROOF_SCENARIOS, previewPaymentProof, submitPaymentProof } from './billing-automation.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const svg = path => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
const icons = {
  upload: svg('<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>'),
  file: svg('<path d="M14 2H5v20h14V7ZM14 2v6h5M8 13h8M8 17h5"/>'),
  pass: svg('<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>'),
  fail: svg('<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m-6 0 6-6"/>'),
  uncertain: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 4h.01"/>'),
  receipt: svg('<path d="M5 3v18l3-2 4 2 4-2 3 2V3l-3 2-4-2-4 2ZM8 9h8M8 13h8"/>')
};
const button = (action, label, className = 'btn', attrs = '') => `<button type="button" class="${className}" data-action="proof-${action}" ${attrs}>${label}</button>`;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf']);
const safeDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(value)) ? dateLabel(value) : 'Not readable';
const safeAttachment = file => file && MIME_TYPES.has(file.mimeType) && typeof file.dataUrl === 'string' && file.dataUrl.startsWith(`data:${file.mimeType};base64,`);

/** Payment evidence UI. The host owns persistence, application rendering and modals. */
export function createProofUI({ getState, getViewer, change, modal, closeModal, toast, openReceipt }) {
  let draft = null;
  const viewerKey = () => { const viewer = getViewer(); return `${viewer.role}:${viewer.studentId || ''}`; };
  const invoiceFor = id => {
    const viewer = getViewer();
    const invoice = getState().invoices.find(item => item.id === id);
    if (!invoice || !['parent', 'admin'].includes(viewer.role) || (viewer.role === 'parent' && invoice.studentId !== viewer.studentId)) {
      throw new Error('This payment record is not available for this account.');
    }
    return invoice;
  };
  const showError = message => {
    const area = document.querySelector('#form-error');
    if (area) { area.textContent = message; area.classList.add('visible'); }
    else toast(message, false, true);
  };
  const safely = fn => { try { return fn(); } catch (error) { showError(error.message); return false; } };
  const invoiceSummary = invoice => `<div class="proof-invoice-summary"><div><strong>${esc(invoice.period)}</strong><p class="small muted">${esc(studentById(invoice.studentId).name)} · ${esc(invoice.id)}</p></div><strong>${money(invoice.amount)}</strong></div>`;

  function detailFields(extracted = {}) {
    return `<dl class="detail-grid proof-extracted">
      <div><dt>Recipient</dt><dd>${esc(extracted.recipient || 'Not readable')}</dd></div>
      <div><dt>Amount</dt><dd>${Number.isFinite(extracted.amount) ? money(extracted.amount) : 'Not readable'}</dd></div>
      <div><dt>Reference</dt><dd>${esc(extracted.reference || 'Not readable')}</dd></div>
      <div><dt>Payment date</dt><dd>${safeDate(extracted.paymentDate)}</dd></div>
    </dl>`;
  }

  function checks(review) {
    return `<ul class="proof-checks" aria-label="Demo proof checks">${(review.checks || []).map(check => {
      const status = ['pass', 'fail', 'uncertain'].includes(check.status) ? check.status : 'uncertain';
      return `<li class="proof-check ${status}"><span class="proof-check-icon">${icons[status]}</span><div><strong>${esc(check.label)}</strong>${check.detail ? `<p>${esc(check.detail)}</p>` : ''}</div><span class="visually-hidden">${status === 'pass' ? 'Passed' : status === 'fail' ? 'Failed' : 'Needs review'}</span></li>`;
    }).join('')}</ul>`;
  }

  function samplePreview(review, invoice) {
    if (review.scenario === 'not-proof') {
      return `<div class="proof-sample proof-not-payment"><span class="proof-sample-label">Fictional sample</span><h3>Shopping list</h3><p>Notebooks<br>Pencils<br>School bag</p></div>`;
    }
    const extracted = review.extracted || {};
    return `<div class="proof-sample${review.scenario === 'unreadable' ? ' proof-unreadable' : ''}"><span class="proof-sample-label">Fictional transfer confirmation</span><div class="proof-sample-content">${icons.pass}<h3>${Number.isFinite(extracted.amount) ? money(extracted.amount) : money(invoice.amount)}</h3><p>Transfer submitted</p><dl class="detail-grid"><div><dt>To</dt><dd>${esc(extracted.recipient || centre.name)}</dd></div><div><dt>Reference</dt><dd>${esc(extracted.reference || 'Not readable')}</dd></div><div><dt>Date</dt><dd>${safeDate(extracted.paymentDate)}</dd></div></dl></div></div>`;
  }

  function attachmentPreview(file, review, invoice, isSample = false) {
    if (isSample) return `<div class="proof-preview">${samplePreview(review, invoice)}</div>`;
    if (!safeAttachment(file)) return '';
    const image = file.mimeType.startsWith('image/');
    return `<div class="proof-preview">${image
      ? `<img class="proof-preview-image" src="${esc(file.dataUrl)}" alt="Selected payment proof">`
      : `<object class="proof-pdf-preview" data="${esc(file.dataUrl)}" type="application/pdf" aria-label="Selected payment proof PDF"><p>PDF preview is unavailable in this browser.</p><a class="btn" href="${esc(file.dataUrl)}" download="${esc(file.name)}">Download PDF</a></object>`}
      <div class="proof-file-meta">${icons.file}<span>${esc(file.name)}</span><span>${Math.max(1, Math.round(Number(file.size || 0) / 1024))} KB</span></div></div>`;
  }

  function draftOptions() {
    return {
      scenario: draft.scenario, reference: draft.reference, paymentDate: draft.paymentDate,
      ...(draft.file ? { file: draft.file } : {})
    };
  }

  function syncFields() {
    if (!draft) return;
    const reference = document.getElementById('proof-reference');
    const paymentDate = document.getElementById('proof-payment-date');
    const scenario = document.getElementById('proof-scenario');
    if (reference) draft.reference = reference.value.trim();
    if (paymentDate) draft.paymentDate = paymentDate.value;
    if (scenario) draft.scenario = scenario.value;
  }

  function validDraft() {
    if (!draft || draft.viewer !== viewerKey()) throw new Error('Open this invoice again to submit payment proof.');
    return invoiceFor(draft.invoiceId);
  }

  function renderDraft() {
    const invoice = validDraft();
    const hasEvidence = draft.sample || draft.file;
    let review = null, previewError = '';
    if (hasEvidence) {
      try { review = previewPaymentProof(getState(), invoice.id, draftOptions()); }
      catch (error) { review = { scenario: draft.scenario, checks: [], extracted: { reference: draft.reference, paymentDate: draft.paymentDate } }; previewError = error.message; }
    }
    const upload = `<input id="proof-file" class="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" aria-label="Choose payment proof image or PDF">
      ${hasEvidence ? attachmentPreview(draft.file, review, invoice, draft.sample) : `<div class="proof-dropzone">${icons.upload}<strong>Upload payment proof</strong><span>Image or PDF · up to 2 MB</span></div>`}
      <div class="proof-upload-actions">${button('choose-file', icons.upload + (hasEvidence ? ' Replace file' : ' Choose file'))}${button('sample', 'Use demo proof', 'btn ghost')}${hasEvidence ? button('remove-file', 'Remove', 'btn ghost small') : ''}</div>`;
    const controls = hasEvidence ? `<section class="proof-demo-controls"><div class="field"><label for="proof-scenario">Demo check</label><select id="proof-scenario">${PROOF_SCENARIOS.map(s => `<option value="${esc(s.id)}"${s.id === draft.scenario ? ' selected' : ''}>${esc(s.label)}</option>`).join('')}</select></div><p class="small muted">Checks are simulated from this selection. Uploaded files are not read by AI in this demo.</p><div class="two-columns"><div class="field"><label for="proof-reference">Demo transfer reference</label><input id="proof-reference" value="${esc(draft.reference)}" maxlength="120" autocomplete="off"></div><div class="field"><label for="proof-payment-date">Payment date</label><input id="proof-payment-date" type="date" value="${esc(draft.paymentDate)}"></div></div><div class="proof-check-preview"><h3 class="proof-section-title">Simulated extracted details</h3>${detailFields(review.extracted)}${checks(review)}${previewError ? `<p class="proof-validation-error" role="alert">${esc(previewError)}</p>` : ''}</div></section>` : '';
    modal('Submit payment proof', `<div class="proof-flow" data-proof-editor="${esc(invoice.id)}">${invoiceSummary(invoice)}${upload}${draft.loading ? '<p class="small muted" role="status">Opening file…</p>' : ''}${controls}</div>`,
      button('close', 'Cancel') + button('submit', 'Submit proof', 'btn primary', `data-id="${esc(invoice.id)}"${!hasEvidence || draft.loading ? ' disabled' : ''}`));
    document.querySelector('.modal')?.classList.add('proof-modal');
  }

  function openSubmit(invoiceId) {
    return safely(() => {
      const invoice = invoiceFor(invoiceId);
      if (invoice.receiptId) return openProof(invoiceId);
      draft = { invoiceId, viewer: viewerKey(), scenario: 'pass', reference: invoice.proofReference || (invoice.id === 'INV-1024' ? 'FPS 910277' : `FPS-${invoice.id.replace(/^INV-/, '')}`), paymentDate: TODAY, sample: false, file: null, loading: false, readVersion: 0 };
      renderDraft();
      return true;
    });
  }

  function openProof(invoiceId) {
    return safely(() => {
      const invoice = invoiceFor(invoiceId), review = invoice.proofReview;
      if (!invoice.proof && !review) return openSubmit(invoiceId);
      draft = null;
      let body = invoiceSummary(invoice);
      if (!review) {
        body += `<div class="proof-result uncertain">${icons.uncertain}<div><h3>Proof received · not reviewed</h3><p>This earlier demo record has no saved attachment or automated check result.</p></div></div><dl class="detail-grid"><div><dt>Received</dt><dd>${invoice.proofDate ? safeDate(invoice.proofDate) : 'Not recorded'}</dd></div><div><dt>Reference</dt><dd>${esc(invoice.proofReference || 'Not recorded')}</dd></div></dl>`;
      } else {
        const passed = review.status === 'passed';
        body += `<div class="proof-result ${passed ? 'pass' : 'uncertain'}"><span class="proof-result-icon">${icons[passed ? 'pass' : 'uncertain']}</span><div><h3>${passed && invoice.receiptId ? 'Receipt issued' : passed ? 'Proof accepted' : review.status === 'duplicate' ? 'Possible duplicate payment' : 'Proof needs review'}</h3><p>${passed && invoice.receiptId ? `${esc(invoice.receiptId)} is available below.` : 'The centre needs to review this proof. You can submit a clearer or corrected copy.'}</p></div></div>`;
        body += attachmentPreview(review.file, review, invoice, !review.file);
        body += `<section class="proof-demo-controls"><h3 class="proof-section-title">Demo check</h3><p class="small muted">These are simulated results. No AI read the uploaded file.</p>${detailFields(review.extracted)}${checks(review)}</section>`;
        if (passed) body += '<p class="proof-footer-note small muted">A receipt is issued after the proof checks pass. Bank reconciliation is a separate step.</p>';
      }
      const receiptAction = invoice.receiptId ? button('receipt', icons.receipt + ' Open receipt', 'btn primary', `data-id="${esc(invoice.id)}"`) : button('replace', 'Upload another proof', 'btn primary', `data-id="${esc(invoice.id)}"`);
      modal('Payment proof', `<div class="proof-flow" data-proof-record="${esc(invoice.id)}">${body}</div>`, button('close', 'Close') + receiptAction);
      document.querySelector('.modal')?.classList.add('proof-modal');
      return true;
    });
  }

  function updatePreview() {
    const invoice = validDraft();
    syncFields();
    const target = document.querySelector('.proof-check-preview');
    if (!target) return;
    try {
      const review = previewPaymentProof(getState(), invoice.id, draftOptions());
      target.innerHTML = `<h3 class="proof-section-title">Simulated extracted details</h3>${detailFields(review.extracted)}${checks(review)}`;
      if (draft.sample) {
        const preview = document.querySelector('.proof-preview');
        if (preview) preview.innerHTML = samplePreview(review, invoice);
      }
    } catch (error) {
      target.innerHTML = `<p class="proof-validation-error" role="alert">${esc(error.message)}</p>`;
    }
  }

  function submit(invoiceId) {
    validDraft();
    if (draft.invoiceId !== invoiceId) throw new Error('Open the correct invoice before submitting.');
    syncFields();
    if (!draft.sample && !draft.file) throw new Error('Choose an image, PDF or demo proof first.');
    if (draft.loading) throw new Error('Wait for the file to finish opening.');
    const options = draftOptions();
    let result;
    if (change(() => {
      invoiceFor(invoiceId);
      result = submitPaymentProof(getState(), invoiceId, options);
    })) {
      openProof(invoiceId);
      toast(result.review.status === 'passed' ? 'Proof accepted. Receipt issued automatically.' : 'Proof submitted for review.');
    }
  }

  function handleAction(action, id, el) {
    if (!action.startsWith('proof-')) return false;
    safely(() => {
      const actionName = action.slice(6);
      if (actionName === 'close') { draft = null; closeModal(); return; }
      if (actionName === 'open-submit' || actionName === 'replace') { openSubmit(id); return; }
      if (actionName === 'open') { openProof(id); return; }
      if (actionName === 'receipt') {
        const invoice = invoiceFor(id);
        if (!invoice.receiptId) throw new Error('A receipt has not been issued for this invoice.');
        draft = null;
        openReceipt(invoice.receiptId);
        return;
      }
      validDraft();
      if (actionName === 'submit') { submit(id); return; }
      syncFields();
      if (actionName === 'choose-file') document.getElementById('proof-file')?.click();
      else if (actionName === 'sample') { draft.readVersion++; draft.loading = false; draft.sample = true; draft.file = null; renderDraft(); }
      else if (actionName === 'remove-file') { draft.readVersion++; draft.loading = false; draft.sample = false; draft.file = null; renderDraft(); }
    });
    return true;
  }

  function onChange(event) {
    const target = event.target;
    if (['proof-scenario', 'proof-reference', 'proof-payment-date'].includes(target.id)) { safely(updatePreview); return true; }
    if (target.id !== 'proof-file') return false;
    safely(() => {
      validDraft();
      const file = target.files?.[0];
      if (!file) return;
      if (!MIME_TYPES.has(file.type)) throw new Error('Choose a PNG, JPEG, WebP, GIF or PDF file.');
      if (file.size > MAX_FILE_BYTES) throw new Error('Choose a file no larger than 2 MB.');
      if (!file.size) throw new Error('This file is empty. Choose another file.');
      syncFields();
      const currentDraft = draft, version = ++draft.readVersion;
      draft.loading = true;
      renderDraft();
      const stillOpen = () => draft === currentDraft && draft.readVersion === version && draft.viewer === viewerKey() && document.querySelector('[data-proof-editor]')?.dataset.proofEditor === currentDraft.invoiceId;
      const reader = new FileReader();
      reader.onload = () => {
        if (!stillOpen()) return;
        draft.file = { name: file.name, mimeType: file.type, type: file.type.startsWith('image/') ? 'image' : 'document', size: file.size, dataUrl: String(reader.result) };
        draft.sample = false;
        draft.loading = false;
        safely(renderDraft);
      };
      reader.onerror = () => { if (stillOpen()) { draft.loading = false; renderDraft(); showError('This file could not be opened. Choose another file.'); } };
      reader.readAsDataURL(file);
    });
    return true;
  }

  return { openSubmit, openProof, handleAction, onChange };
}
