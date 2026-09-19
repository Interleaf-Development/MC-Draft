import { money, studentById, centre, TODAY, billingPayerName } from './model.js';
import { PROOF_SCENARIOS, previewPaymentProof, submitPaymentProof } from './billing-automation.js';
import { familyText, familyDate, familyContent } from './family-locale.js';
import { isPaymentAcknowledgement } from './receipt-document.js';

const COPY = {
  'This payment record is not available for this account.': '此帳戶無法查看這項繳費紀錄。',
  'Open this invoice again to submit payment proof.': '請重新開啟這張繳費通知，再提交付款證明。',
  'Open the correct invoice before submitting.': '請先開啟正確的繳費通知。',
  'Choose an image, PDF or demo proof first.': '請先選擇圖片、PDF 或示範付款證明。',
  'Wait for the file to finish opening.': '請稍候，檔案正在開啟。',
  'A receipt has not been issued for this invoice.': '這張繳費通知尚未發出收據。',
  'Choose a PNG, JPEG, WebP, GIF or PDF file.': '請選擇 PNG、JPEG、WebP、GIF 或 PDF 檔案。',
  'Choose a file no larger than 2 MB.': '請選擇不超過 2 MB 的檔案。',
  'This file is empty. Choose another file.': '這個檔案沒有內容，請選擇其他檔案。',
  'This file could not be opened. Choose another file.': '無法開啟這個檔案，請選擇其他檔案。',
  'Choose a valid proof file.': '請選擇有效的付款證明檔案。',
  'Use an image or PDF proof.': '請使用圖片或 PDF 付款證明。',
  'Invoice not found.': '找不到這張繳費通知。',
  'Choose a demonstration scenario.': '請選擇示範情況。',
  'Enter a payment date between the invoice date and today.': '付款日期須介乎繳費通知發出當日至今天。',
  'Enter a payment reference.': '請輸入轉賬參考編號。',
  'Enter the name on the paying account (up to 120 characters).': '請輸入付款戶口姓名（不超過 120 個字）。',
  'Choose a valid payment method.': '請選擇有效的付款方式。',
  'Name on paying account': '付款戶口姓名', 'Payment method': '付款方式',
  'Transaction date': '交易日期', 'Bank transfer': '銀行轉賬', 'FPS': '轉數快',
  'AlipayHK': 'AlipayHK', 'PayMe': 'PayMe',
  'Payment acknowledgement issued': '已發出付款確認',
  'Open payment acknowledgement': '查看付款確認',
  'Proof accepted. Payment acknowledgement issued automatically.': '付款證明已獲接納，付款確認已自動發出。',
  'Payment proof accepted. Bank reconciliation is recorded separately.': '付款證明已獲接納，銀行入賬會由中心另行核對。',
  'A payment acknowledgement has not been issued for this invoice.': '這張繳費通知尚未發出付款確認。',
  'Record payment proof first.': '請先提交付款證明。',
  'Valid payment proof': '有效付款證明',
  'Wrong recipient': '收款人不符',
  'Wrong amount': '金額不符',
  'Unreadable proof': '無法讀取證明',
  'Not a payment proof': '並非付款證明',
  'Previously used proof': '已使用的付款證明',
  'Payment proof': '付款證明',
  'Recipient is MathConcept': '收款人是 MathConcept',
  'Amount matches invoice': '金額與繳費通知相符',
  'Proof has not been used': '付款證明未曾使用',
  'Payment details cannot be read.': '無法讀取付款資料。',
  'The example is not a transfer confirmation.': '這份示範文件並非轉賬確認。',
  'The demonstration contains transfer details.': '示範文件包含轉賬資料。',
  'Recipient could not be read.': '無法讀取收款人。',
  'Amount could not be read.': '無法讀取金額。',
  'This proof or payment reference has already been used.': '這份證明或轉賬參考編號已被使用。',
  'No duplicate found in the demonstration records.': '示範紀錄中沒有重複的付款證明。',
  'No duplicate fixture proof.': '示範紀錄中沒有重複的付款證明。',
  'Fictional transfer confirmation.': '虛構轉賬確認。',
  'Demo Other Learning Centre': '其他教育中心（示範）',
  'Demo retail receipt': '購物收據（示範）',
  'Not readable': '無法讀取',
  'Not recorded': '未有紀錄',
  'Recipient': '收款人', 'Amount': '金額', 'Reference': '參考編號', 'Payment date': '付款日期',
  'Demo proof checks': '示範付款證明核對', 'Passed': '已通過', 'Failed': '未通過', 'Needs review': '待中心覆核',
  'Fictional sample': '虛構示範', 'Shopping list': '購物清單', 'Notebooks': '筆記簿', 'Pencils': '鉛筆', 'School bag': '書包',
  'Fictional transfer confirmation': '虛構轉賬確認', 'Transfer submitted': '已提交轉賬', 'To': '收款人', 'Payer': '付款人', 'Date': '日期',
  'Selected payment proof': '已選擇的付款證明', 'Selected payment proof PDF': '已選擇的付款證明 PDF',
  'PDF preview is unavailable in this browser.': '此瀏覽器未能預覽 PDF。', 'Download PDF': '下載 PDF',
  'Choose payment proof image or PDF': '選擇付款證明圖片或 PDF', 'Upload payment proof': '上載付款證明',
  'Image or PDF · up to 2 MB': '圖片或 PDF · 不超過 2 MB', 'Replace file': '更換檔案', 'Choose file': '選擇檔案',
  'Use demo proof': '使用示範證明', 'Remove': '移除', 'Demo check': '示範核對',
  'Checks are simulated from this selection. Uploaded files are not read by AI in this demo.': '核對結果按所選情況模擬，本示範不會用 AI 讀取上載的檔案。',
  'Demo transfer reference': '示範轉賬參考編號', 'Simulated extracted details': '模擬讀取的資料',
  'Submit payment proof': '提交付款證明', 'Opening file…': '正在開啟檔案…', 'Cancel': '取消', 'Submit proof': '提交證明',
  'Proof received · not reviewed': '已收到證明 · 尚未覆核',
  'This earlier demo record has no saved attachment or automated check result.': '這筆較早的示範紀錄未有保存附件或自動核對結果。',
  'Received': '收到日期', 'Receipt issued': '已發出收據', 'Proof accepted': '付款證明已獲接納',
  'Possible duplicate payment': '付款可能重複', 'Proof needs review': '付款證明待覆核',
  'The centre needs to review this proof. You can submit a clearer or corrected copy.': '中心需要覆核這份證明。你可以重新提交較清晰或更正後的版本。',
  'These are simulated results. No AI read the uploaded file.': '以上結果均為模擬，並非由 AI 讀取上載檔案得出。',
  'A receipt is issued after the proof checks pass. Bank reconciliation is a separate step.': '付款證明通過核對後會發出收據，銀行對賬會另行處理。',
  'Open receipt': '查看收據', 'Upload another proof': '重新上載證明', 'Close': '關閉',
  'Proof accepted. Receipt issued automatically.': '付款證明已獲接納，收據已自動發出。',
  'Proof submitted for review.': '付款證明已提交，待中心覆核。'
};

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
const PAYMENT_METHODS = [['fps', 'FPS'], ['bank-transfer', 'Bank transfer'], ['alipayhk', 'AlipayHK'], ['payme', 'PayMe']];
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf']);
const safeAttachment = file => file && MIME_TYPES.has(file.mimeType) && typeof file.dataUrl === 'string' && file.dataUrl.startsWith(`data:${file.mimeType};base64,`);

/** Payment evidence UI. The host owns persistence, application rendering and modals. */
export function createProofUI({ getState, getViewer, change, modal, closeModal, toast, openReceipt }) {
  let draft = null;
  const t = (value, zh) => ['parent', 'student'].includes(getViewer().role) ? (zh ?? COPY[value] ?? familyText(value, getViewer().role)) : value;
  const content = value => familyContent(value, getViewer().role);
  const safeDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(value)) ? familyDate(value, getViewer().role) : t('Not readable');
  const detailText = value => {
    const amount = String(value || '').match(/^HK\$(.+) shown; HK\$(.+) expected\.$/);
    return amount ? t(value, `證明金額：HK$${amount[1]}；應付金額：HK$${amount[2]}。`) : t(content(value));
  };
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
    message = t(message);
    const area = document.querySelector('#form-error');
    if (area) { area.textContent = message; area.classList.add('visible'); }
    else toast(message, false, true);
  };
  const safely = fn => { try { return fn(); } catch (error) { showError(error.message); return false; } };
  const invoiceSummary = invoice => `<div class="proof-invoice-summary"><div><strong>${esc(content(invoice.period))}</strong><p class="small muted">${esc(studentById(invoice.studentId).name)} · ${esc(invoice.id)}</p></div><strong>${money(invoice.amount)}</strong></div>`;

  function detailFields(extracted = {}) {
    return `<dl class="detail-grid proof-extracted">
      <div><dt>${t('Recipient')}</dt><dd>${esc(extracted.recipient ? detailText(extracted.recipient) : t('Not readable'))}</dd></div>
      <div><dt>${t('Amount')}</dt><dd>${Number.isFinite(extracted.amount) ? money(extracted.amount) : t('Not readable')}</dd></div>
      <div><dt>${t('Reference')}</dt><dd>${esc(extracted.reference || t('Not readable'))}</dd></div>
      <div><dt>${t('Transaction date')}</dt><dd>${safeDate(extracted.paymentDate)}</dd></div>
      <div><dt>${t('Name on paying account')}</dt><dd>${esc(extracted.payer || t('Not readable'))}</dd></div>
      ${extracted.paymentMethod ? `<div><dt>${t('Payment method')}</dt><dd>${esc(t(PAYMENT_METHODS.find(([id]) => id === extracted.paymentMethod)?.[1] || extracted.paymentMethod))}</dd></div>` : ''}
    </dl>`;
  }

  function checks(review) {
    return `<ul class="proof-checks" aria-label="${t('Demo proof checks')}">${(review.checks || []).map(check => {
      const status = ['pass', 'fail', 'uncertain'].includes(check.status) ? check.status : 'uncertain';
      return `<li class="proof-check ${status}"><span class="proof-check-icon">${icons[status]}</span><div><strong>${esc(t(check.label))}</strong>${check.detail ? `<p>${esc(detailText(check.detail))}</p>` : ''}</div><span class="visually-hidden">${t(status === 'pass' ? 'Passed' : status === 'fail' ? 'Failed' : 'Needs review')}</span></li>`;
    }).join('')}</ul>`;
  }

  function samplePreview(review, invoice) {
    if (review.scenario === 'not-proof') {
      return `<div class="proof-sample proof-not-payment"><span class="proof-sample-label">${t('Fictional sample')}</span><h3>${t('Shopping list')}</h3><p>${t('Notebooks')}<br>${t('Pencils')}<br>${t('School bag')}</p></div>`;
    }
    const extracted = review.extracted || {};
    return `<div class="proof-sample${review.scenario === 'unreadable' ? ' proof-unreadable' : ''}"><span class="proof-sample-label">${t('Fictional transfer confirmation')}</span><div class="proof-sample-content">${icons.pass}<h3>${Number.isFinite(extracted.amount) ? money(extracted.amount) : money(invoice.amount)}</h3><p>${t('Transfer submitted')}</p><dl class="detail-grid"><div><dt>${t('To')}</dt><dd>${esc(detailText(extracted.recipient || centre.name))}</dd></div><div><dt>${t('Reference')}</dt><dd>${esc(extracted.reference || t('Not readable'))}</dd></div><div><dt>${t('Date')}</dt><dd>${safeDate(extracted.paymentDate)}</dd></div>${extracted.payer ? `<div><dt>${t('Payer')}</dt><dd>${esc(extracted.payer)}</dd></div>` : ''}</dl></div></div>`;
  }

  function attachmentPreview(file, review, invoice, isSample = false) {
    if (isSample) return `<div class="proof-preview">${samplePreview(review, invoice)}</div>`;
    if (!safeAttachment(file)) return '';
    const image = file.mimeType.startsWith('image/');
    return `<div class="proof-preview">${image
      ? `<img class="proof-preview-image" src="${esc(file.dataUrl)}" alt="${t('Selected payment proof')}">`
      : `<object class="proof-pdf-preview" data="${esc(file.dataUrl)}" type="application/pdf" aria-label="${t('Selected payment proof PDF')}"><p>${t('PDF preview is unavailable in this browser.')}</p><a class="btn" href="${esc(file.dataUrl)}" download="${esc(file.name)}">${t('Download PDF')}</a></object>`}
      <div class="proof-file-meta">${icons.file}<span>${esc(file.name)}</span><span>${Math.max(1, Math.round(Number(file.size || 0) / 1024))} KB</span></div></div>`;
  }

  function draftOptions() {
    return {
      scenario: draft.scenario, reference: draft.reference || undefined, paymentDate: draft.paymentDate, payerName: draft.payerName, paymentMethod: draft.paymentMethod,
      ...(draft.file ? { file: draft.file } : {})
    };
  }

  function syncFields() {
    if (!draft) return;
    const reference = document.getElementById('proof-reference');
    const paymentDate = document.getElementById('proof-payment-date');
    const scenario = document.getElementById('proof-scenario');
    const payerName = document.getElementById('proof-payer-name');
    const paymentMethod = document.getElementById('proof-payment-method');
    if (reference) draft.reference = reference.value.trim();
    if (paymentDate) draft.paymentDate = paymentDate.value;
    if (scenario) draft.scenario = scenario.value;
    if (payerName) draft.payerName = payerName.value.trim();
    if (paymentMethod) draft.paymentMethod = paymentMethod.value;
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
    const upload = `<input id="proof-file" class="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" aria-label="${t('Choose payment proof image or PDF')}">
      ${hasEvidence ? attachmentPreview(draft.file, review, invoice, draft.sample) : `<div class="proof-dropzone">${icons.upload}<strong>${t('Upload payment proof')}</strong><span>${t('Image or PDF · up to 2 MB')}</span></div>`}
      <div class="proof-upload-actions">${button('choose-file', icons.upload + ' ' + t(hasEvidence ? 'Replace file' : 'Choose file'))}${button('sample', t('Use demo proof'), 'btn ghost')}${hasEvidence ? button('remove-file', t('Remove'), 'btn ghost small') : ''}</div>`;
    const payerFields = `<div class="field"><label for="proof-payer-name">${t('Name on paying account')}</label><input id="proof-payer-name" value="${esc(draft.payerName)}" maxlength="120" autocomplete="name" required></div><div class="two-columns"><div class="field"><label for="proof-payment-method">${t('Payment method')}</label><select id="proof-payment-method">${PAYMENT_METHODS.map(([id, label]) => `<option value="${id}"${id === draft.paymentMethod ? ' selected' : ''}>${t(label)}</option>`).join('')}</select></div><div class="field"><label for="proof-payment-date">${t('Transaction date')}</label><input id="proof-payment-date" type="date" value="${esc(draft.paymentDate)}" min="${esc(invoice.issued)}" max="${TODAY}" required></div></div>`;
    const controls = hasEvidence ? `<p class="small muted">${t('Checks are simulated from this selection. Uploaded files are not read by AI in this demo.')}</p><details class="proof-demo-controls proof-check-details"><summary>${t('Demo proof checks')}</summary><div class="proof-check-details-content"><div class="field"><label for="proof-scenario">${t('Demo check')}</label><select id="proof-scenario">${PROOF_SCENARIOS.map(s => `<option value="${esc(s.id)}"${s.id === draft.scenario ? ' selected' : ''}>${esc(t(s.label))}</option>`).join('')}</select></div><div class="field"><label for="proof-reference">${t('Demo transfer reference')}</label><input id="proof-reference" value="${esc(draft.reference)}" maxlength="120" autocomplete="off"></div><div class="proof-check-preview"><h3 class="proof-section-title">${t('Simulated extracted details')}</h3>${detailFields(review.extracted)}${checks(review)}${previewError ? `<p class="proof-validation-error" role="alert">${esc(t(previewError))}</p>` : ''}</div></div></details>` : '';
    modal(t('Submit payment proof'), `<div class="proof-flow" data-proof-editor="${esc(invoice.id)}">${invoiceSummary(invoice)}${payerFields}${upload}${draft.loading ? `<p class="small muted" role="status">${t('Opening file…')}</p>` : ''}${controls}</div>`,
      button('close', t('Cancel')) + button('submit', t('Submit proof'), 'btn primary', `data-id="${esc(invoice.id)}"${!hasEvidence || draft.loading ? ' disabled' : ''}`));
    document.querySelector('.modal')?.classList.add('proof-modal');
  }

  function openSubmit(invoiceId) {
    return safely(() => {
      const invoice = invoiceFor(invoiceId);
      if (invoice.receiptId) return openProof(invoiceId);
      draft = { invoiceId, viewer: viewerKey(), scenario: 'pass', reference: invoice.proofReference || (invoice.id === 'INV-1024' ? 'FPS 910277' : `FPS-${invoice.id.replace(/^INV-/, '')}`), paymentDate: invoice.claimedPaymentDate || TODAY, payerName: invoice.proofPayer || billingPayerName(getState(), invoice.studentId), paymentMethod: PAYMENT_METHODS.some(([id]) => id === invoice.paymentMethod) ? invoice.paymentMethod : 'fps', sample: false, file: null, loading: false, readVersion: 0 };
      renderDraft();
      return true;
    });
  }

  function openProof(invoiceId) {
    return safely(() => {
      const invoice = invoiceFor(invoiceId), review = invoice.proofReview, admin = getViewer().role === 'admin';
      const acknowledgement = isPaymentAcknowledgement(getState(), getState().receipts.find(item => item.id === invoice.receiptId));
      if (!invoice.proof && !review) return openSubmit(invoiceId);
      draft = null;
      let body = invoiceSummary(invoice);
      if (!review) {
        body += `<div class="proof-result uncertain">${icons.uncertain}<div><h3>${t(acknowledgement ? 'Payment acknowledgement issued' : 'Proof received · not reviewed')}</h3><p>${t('This earlier demo record has no saved attachment or automated check result.')}</p></div></div><dl class="detail-grid"><div><dt>${t('Received')}</dt><dd>${invoice.proofDate ? safeDate(invoice.proofDate) : t('Not recorded')}</dd></div><div><dt>${t('Reference')}</dt><dd>${esc(invoice.proofReference || t('Not recorded'))}</dd></div></dl>`;
      } else {
        const passed = review.status === 'passed';
        body += `<div class="proof-result ${passed ? 'pass' : 'uncertain'}"><span class="proof-result-icon">${icons[passed ? 'pass' : 'uncertain']}</span><div><h3>${t(passed && invoice.receiptId ? (acknowledgement ? 'Payment acknowledgement issued' : 'Receipt issued') : passed ? 'Proof accepted' : review.status === 'duplicate' ? 'Possible duplicate payment' : 'Proof needs review')}</h3><p>${passed && invoice.receiptId ? esc(t(`${invoice.receiptId} is available below.`, `可在下方查看${acknowledgement ? '付款確認' : '收據'} ${invoice.receiptId}。`)) : t('The centre needs to review this proof. You can submit a clearer or corrected copy.')}</p></div></div>`;
        body += attachmentPreview(review.file, review, invoice, !review.file);
        const checkDetails = `<p class="small muted">${t('These are simulated results. No AI read the uploaded file.')}</p>${detailFields(review.extracted)}${checks(review)}`;
        const bankNote = passed ? `<p class="proof-footer-note small muted">${t('Payment proof accepted. Bank reconciliation is recorded separately.')}</p>` : '';
        body += admin
          ? `<details class="proof-demo-controls proof-check-details"><summary>Proof check details</summary><div class="proof-check-details-content">${checkDetails}${bankNote}</div></details>`
          : `<section class="proof-demo-controls"><h3 class="proof-section-title">${t('Demo check')}</h3>${checkDetails}</section>${bankNote}`;
      }
      const receiptAction = invoice.receiptId ? button('receipt', icons.receipt + ' ' + t(acknowledgement ? 'Open payment acknowledgement' : 'Open receipt'), 'btn primary', `data-id="${esc(invoice.id)}"`) : button('replace', t('Upload another proof'), 'btn primary', `data-id="${esc(invoice.id)}"`);
      modal(t('Payment proof'), `<div class="proof-flow${admin ? ' proof-record-admin' : ''}" data-proof-record="${esc(invoice.id)}">${body}</div>`, button('close', t('Close')) + receiptAction);
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
      target.innerHTML = `<h3 class="proof-section-title">${t('Simulated extracted details')}</h3>${detailFields(review.extracted)}${checks(review)}`;
      if (draft.sample) {
        const preview = document.querySelector('.proof-preview');
        if (preview) preview.innerHTML = samplePreview(review, invoice);
      }
    } catch (error) {
      target.innerHTML = `<p class="proof-validation-error" role="alert">${esc(t(error.message))}</p>`;
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
      try { result = submitPaymentProof(getState(), invoiceId, options); }
      catch (error) { throw new Error(t(error.message)); }
    })) {
      openProof(invoiceId);
      toast(t(result.review.status === 'passed' ? 'Proof accepted. Payment acknowledgement issued automatically.' : 'Proof submitted for review.'));
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
    if (['proof-scenario', 'proof-reference', 'proof-payment-date', 'proof-payer-name', 'proof-payment-method'].includes(target.id)) { safely(updatePreview); return true; }
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
