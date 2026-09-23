import test from 'node:test';
import assert from 'node:assert/strict';
import { seed, clone, TODAY, centre } from '../dist/model.js';
import { createProofUI } from '../dist/billing-proof-ui.js';
import { PROOF_SCENARIOS, submitPaymentProof } from '../dist/billing-automation.js';
import { returnInvoiceProof, setBillingAutoSent } from '../dist/billing-workflow.js';

function setup(t, role = 'parent') {
  const state = seed(), viewer = { role, studentId: 'chloe' }, fields = new Map();
  const error = { textContent: '', classList: { add() {} } }, preview = { innerHTML: '' };
  const current = { title: '', body: '', footer: '', toast: '' };
  const oldDocument = globalThis.document;
  globalThis.document = {
    getElementById: id => fields.get(id),
    querySelector(selector) {
      if (selector === '#form-error') return error;
      if (selector === '.proof-check-preview') return preview;
      if (selector === '.modal') return { classList: { add() {} } };
      return null;
    }
  };
  t.after(() => { if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument; });
  const ui = createProofUI({
    getState: () => state, getViewer: () => viewer,
    change(fn) { try { fn(); return true; } catch (e) { error.textContent = e.message; return false; } },
    modal(title, body, footer) {
      Object.assign(current, { title, body, footer }); fields.clear();
      for (const id of ['proof-reference', 'proof-payment-date', 'proof-payer-name']) {
        const value = body.match(new RegExp(`id="${id}"[^>]*value="([^"]*)"`))?.[1];
        if (value !== undefined) fields.set(id, { value: value.replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&') });
      }
      for (const id of ['proof-scenario', 'proof-payment-method']) {
        const select = body.match(new RegExp(`<select id="${id}">([\\s\\S]*?)<\\/select>`))?.[1];
        const value = select?.match(/<option value="([^"]*)" selected>/)?.[1];
        if (value) fields.set(id, { value: value.replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&') });
      }
    },
    closeModal() {}, toast(message) { current.toast = message; }, openReceipt() {}
  });
  return { state, viewer, fields, error, preview, current, ui };
}

test('Parent proof preview is Traditional Chinese and leaves billing records unchanged', t => {
  const { state, current, ui } = setup(t), before = clone(state);
  assert.equal(ui.openSubmit('INV-1024'), true);
  assert.equal(current.title, '提交付款證明');
  assert.match(current.body, /aria-label="選擇付款證明圖片或 PDF"/);
  ui.handleAction('proof-sample');
  assert.match(current.body, /核對結果按所選情況模擬/);
  assert.match(current.body, /證明金額：HK\$2000；應付金額：HK\$2000。/);
  assert.match(current.body, /有效付款證明/);
  assert.match(current.body, /MathConcept（荃灣）/);
  assert.match(current.body, /<dt>付款人<\/dt><dd>Elaine Chan<\/dd>/);
  assert.match(current.body, /FPS 910277/);
  assert.doesNotMatch(current.body, />Valid payment proof<|>Payment date<|shown; HK\$/);
  assert.deepEqual(state, before);
});

test('staff proof labels and preview use HK Traditional Chinese', t => {
  const { state, current, ui } = setup(t, 'admin'), before = clone(state);
  ui.openSubmit('INV-1024'); ui.handleAction('proof-sample');
  assert.equal(current.title, '提交付款證明');
  assert.match(current.body, /有效付款證明/);
  assert.match(current.body, /證明金額：HK\$2000；應付金額：HK\$2000。/);
  assert.match(current.body, /MathConcept（荃灣）/);
  assert.match(current.body, /<dt>付款人<\/dt><dd>Elaine Chan<\/dd>/);
  assert.doesNotMatch(current.body, />Valid payment proof<|>Payment date<|shown; HK\$/);
  assert.deepEqual(state, before);
});

test('Parent validation errors are translated and rejected submissions do not change state', t => {
  const { state, ui, fields, error, preview } = setup(t), before = clone(state);
  ui.openSubmit('INV-1024'); ui.handleAction('proof-sample');
  fields.get('proof-payment-date').value = '2026-10-01';
  ui.onChange({ target: { id: 'proof-payment-date' } });
  assert.match(preview.innerHTML, /付款日期須介乎繳費通知發出當日至今天/);
  ui.handleAction('proof-submit', 'INV-1024');
  assert.equal(error.textContent, '付款日期須介乎繳費通知發出當日至今天。');
  assert.deepEqual(state, before);
  ui.openSubmit('INV-1025');
  assert.equal(error.textContent, '此帳戶無法查看這項繳費紀錄。');
});

test('every simulated Parent result is translated without rewriting stored proof data', t => {
  const { state, current, ui } = setup(t);
  for (const { id: scenario } of PROOF_SCENARIOS) {
    const invoice = state.invoices.find(item => item.id === 'INV-1024');
    invoice.proof = false; invoice.receiptId = null; delete invoice.proofReview;
    state.receipts = state.receipts.filter(receipt => receipt.invoiceId !== invoice.id);
    submitPaymentProof(state, invoice.id, { scenario, reference: 'MY REF 555777', paymentDate: TODAY });
    const before = clone(state);
    ui.openProof(invoice.id);
    assert.equal(current.title, '付款證明');
    assert.match(current.body, /以上結果均為模擬/);
    assert.doesNotMatch(current.body, /<details|proof-record-admin/);
    assert.doesNotMatch(current.body, /The example is not|cannot be read|could not be read|already been used|Other Learning Centre|shown; HK\$/);
    assert.deepEqual(state, before, scenario);
  }
});

test('Parent submission keeps references and uploaded names intact while awaiting staff approval', t => {
  const { state, ui, fields, current } = setup(t);
  ui.openSubmit('INV-1024'); ui.handleAction('proof-sample');
  fields.get('proof-reference').value = 'USER-REFERENCE 876543';
  ui.handleAction('proof-submit', 'INV-1024');
  const invoice = state.invoices.find(item => item.id === 'INV-1024');
  assert.equal(invoice.proofReview.extracted.recipient, centre.name);
  assert.equal(invoice.proofReference, 'USER-REFERENCE 876543');
  assert.equal(invoice.receiptId, null);
  assert.match(current.body, /付款證明已提交，待中心覆核/);
  assert.doesNotMatch(current.footer, /查看收據|重新上載證明/);
  assert.equal(current.toast, '付款證明已提交，待中心覆核。');
  invoice.proofReview.file = { name: 'Payment proof', mimeType: 'application/pdf', size: 3, dataUrl: 'data:application/pdf;base64,YWJj' };
  const before = clone(state);
  ui.openProof(invoice.id);
  assert.match(current.body, /id="proof-pdf-preview"/);
  assert.doesNotMatch(current.body, /<object/);
  assert.match(current.body, /<span>Payment proof<\/span>/);
  assert.match(current.body, /aria-label="已選擇的付款證明 PDF"/);
  assert.deepEqual(state, before);
});

test('staff saved proof keeps original evidence and consequential results outside closed check details', t => {
  const { state, current, ui } = setup(t, 'admin');
  const invoice = state.invoices.find(item => item.id === 'INV-1024');
  const image = { name: 'Parent transfer.png', mimeType: 'image/png', size: 3, dataUrl: 'data:image/png;base64,YWJj' };
  for (const { id: scenario } of PROOF_SCENARIOS) {
    invoice.proof = false; invoice.receiptId = null; delete invoice.proofReview;
    state.receipts = state.receipts.filter(receipt => receipt.invoiceId !== invoice.id);
    submitPaymentProof(state, invoice.id, { scenario, reference: 'PARENT 555777', paymentDate: TODAY, file: image });
    const before = clone(state);
    ui.openProof(invoice.id);
    const disclosure = current.body.match(/<details\b[^>]*>[\s\S]*?<\/details>/)?.[0];
    assert.ok(disclosure, scenario);
    assert.doesNotMatch(disclosure.match(/^<details[^>]*>/)[0], /\bopen(?:\s|=|>)/);
    assert.match(disclosure, /<summary>付款證明核對詳情<\/summary>/);
    assert.match(disclosure, /以上結果均為模擬，並非由 AI 讀取上載檔案得出。/);
    assert.match(disclosure, /class="proof-extracted|class="detail-grid proof-extracted/);
    assert.match(disclosure, /aria-label="示範付款證明核對"/);
    const visible = current.body.replace(disclosure, '');
    assert.match(visible, /src="data:image\/png;base64,YWJj"/);
    assert.match(visible, /Parent transfer\.png/);
    assert.match(visible, new RegExp(scenario === 'pass' ? '付款證明已提交，待中心覆核' : scenario === 'duplicate' ? '付款可能重複' : '付款證明待覆核'));
    assert.deepEqual(state, before, scenario);
  }
  invoice.proofReview.file = { name: 'Parent transfer.pdf', mimeType: 'application/pdf', size: 3, dataUrl: 'data:application/pdf;base64,YWJj' };
  ui.openProof(invoice.id);
  assert.match(current.body.split('<details')[0], /id="proof-pdf-preview"[^>]+aria-label="已選擇的付款證明 PDF"/);
});


test('Parent account name, method and transaction date persist independently from upload date', t => {
  const { state, ui, fields, current } = setup(t);
  ui.openSubmit('INV-1024');
  assert.match(current.body, /付款戶口姓名/);
  assert.match(current.body, /交易日期/);
  assert.match(current.body, /付款方式/);
  fields.get('proof-payer-name').value = 'Chan "Tai" & Man';
  fields.get('proof-payment-method').value = 'bank-transfer';
  fields.get('proof-payment-date').value = '2026-09-29';
  ui.handleAction('proof-sample');
  assert.match(current.body, /Chan &quot;Tai&quot; &amp; Man/);
  ui.handleAction('proof-submit', 'INV-1024');
  const invoice = state.invoices.find(item => item.id === 'INV-1024');
  assert.equal(invoice.proofPayer, 'Chan "Tai" & Man');
  assert.equal(invoice.paymentMethod, 'bank-transfer');
  assert.equal(invoice.claimedPaymentDate, '2026-09-29');
  assert.equal(invoice.proofDate, TODAY);
  assert.equal(invoice.receiptId, null);
  assert.match(current.body, /中心會覆核付款證明並發出收據/);
});

test('Parent cannot submit a proof with an empty paying-account name', t => {
  const { state, ui, fields, error } = setup(t);
  ui.openSubmit('INV-1024'); ui.handleAction('proof-sample');
  fields.get('proof-payer-name').value = '  ';
  const before = clone(state);
  ui.handleAction('proof-submit', 'INV-1024');
  assert.equal(error.textContent, '請輸入付款戶口姓名（不超過 120 個字）。');
  assert.deepEqual(state, before);
});


test('manual parent proof submission promises centre review rather than an issued receipt', t => {
  const { state, ui, current } = setup(t);
  setBillingAutoSent(state, false);
  ui.openSubmit('INV-1024'); ui.handleAction('proof-sample'); ui.handleAction('proof-submit', 'INV-1024');
  assert.match(current.body, /付款證明已提交，待中心覆核/);
  assert.match(current.body, /不必再次付款/);
  assert.doesNotMatch(current.body, /已發出收據|已發出付款確認/);
  assert.equal(current.toast, '付款證明已提交，待中心覆核。');
  assert.equal(state.invoices.find(i => i.id === 'INV-1024').receiptId, null);
});

test('returned parent proof shows the staff reason and says no second payment is needed', t => {
  const { state, ui, current } = setup(t);
  setBillingAutoSent(state, false);
  submitPaymentProof(state, 'INV-1024', { scenario: 'pass', reference: 'FPS 333444', paymentDate: TODAY });
  returnInvoiceProof(state, 'INV-1024', { reason: '請提供完整截圖。' });
  ui.openProof('INV-1024');
  assert.match(current.body, /待重新提交付款證明/);
  assert.match(current.body, /請提供完整截圖。/);
  assert.match(current.body, /不必再次付款/);
  ui.openSubmit('INV-1024');
  assert.match(current.body, /請提供完整截圖。/);
  assert.match(current.body, /不必再次付款/);
});


test('a submitted proof stays available for review without offering another upload', t => {
  const { state, ui, current } = setup(t);
  ui.openSubmit('INV-1024'); ui.handleAction('proof-sample'); ui.handleAction('proof-submit', 'INV-1024');
  const before = clone(state);
  ui.openSubmit('INV-1024');
  assert.match(current.body, /付款證明已提交，待中心覆核/);
  assert.doesNotMatch(current.footer, /proof-replace|proof-submit/);
  assert.deepEqual(state, before);
});
