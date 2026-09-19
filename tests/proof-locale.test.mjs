import test from 'node:test';
import assert from 'node:assert/strict';
import { seed, clone, TODAY, centre } from '../dist/model.js';
import { createProofUI } from '../dist/billing-proof-ui.js';
import { PROOF_SCENARIOS, submitPaymentProof } from '../dist/billing-automation.js';

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

test('staff sees the same English proof labels and preview', t => {
  const { state, current, ui } = setup(t, 'admin'), before = clone(state);
  ui.openSubmit('INV-1024'); ui.handleAction('proof-sample');
  assert.equal(current.title, 'Submit payment proof');
  assert.match(current.body, /Valid payment proof/);
  assert.match(current.body, /HK\$2000 shown; HK\$2000 expected\./);
  assert.match(current.body, /MathConcept \(Tsuen Wan\)/);
  assert.match(current.body, /<dt>Payer<\/dt><dd>Elaine Chan<\/dd>/);
  assert.doesNotMatch(current.body, /付款證明|示範核對/);
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

test('Parent submission keeps references and uploaded names intact, and exposes the acknowledgement', t => {
  const { state, ui, fields, current } = setup(t);
  ui.openSubmit('INV-1024'); ui.handleAction('proof-sample');
  fields.get('proof-reference').value = 'USER-REFERENCE 876543';
  ui.handleAction('proof-submit', 'INV-1024');
  const invoice = state.invoices.find(item => item.id === 'INV-1024');
  assert.equal(invoice.proofReview.extracted.recipient, centre.name);
  assert.equal(invoice.proofReference, 'USER-REFERENCE 876543');
  assert.ok(invoice.receiptId);
  assert.match(current.body, /已發出付款確認/);
  assert.match(current.footer, /查看付款確認/);
  assert.equal(current.toast, '付款證明已獲接納，付款確認已自動發出。');
  invoice.proofReview.file = { name: 'Payment proof', mimeType: 'application/pdf', size: 3, dataUrl: 'data:application/pdf;base64,YWJj' };
  const before = clone(state);
  ui.openProof(invoice.id);
  assert.match(current.body, /download="Payment proof"/);
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
    assert.match(disclosure, /<summary>Proof check details<\/summary>/);
    assert.match(disclosure, /These are simulated results\. No AI read the uploaded file\./);
    assert.match(disclosure, /class="proof-extracted|class="detail-grid proof-extracted/);
    assert.match(disclosure, /aria-label="Demo proof checks"/);
    const visible = current.body.replace(disclosure, '');
    assert.match(visible, /src="data:image\/png;base64,YWJj"/);
    assert.match(visible, /Parent transfer\.png/);
    assert.match(visible, new RegExp(scenario === 'pass' ? 'Payment acknowledgement issued' : scenario === 'duplicate' ? 'Possible duplicate payment' : 'Proof needs review'));
    assert.deepEqual(state, before, scenario);
  }
  invoice.proofReview.file = { name: 'Parent transfer.pdf', mimeType: 'application/pdf', size: 3, dataUrl: 'data:application/pdf;base64,YWJj' };
  ui.openProof(invoice.id);
  assert.match(current.body.split('<details')[0], /<object[^>]+data="data:application\/pdf;base64,YWJj"/);
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
  assert.ok(invoice.receiptId);
  assert.equal(state.receipts.find(item => item.id === invoice.receiptId).bankId, null);
  assert.match(current.body, /銀行入賬會由中心另行核對/);
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
