import test from 'node:test';
import assert from 'node:assert/strict';
import { createBillingWorkflowUI } from '../dist/billing-workflow-ui.js';
import { demoNow } from '../dist/billing-workflow.js';

function stateWithQueues(count = 28) {
  const invoices = Array.from({ length: count }, (_, index) => ({ id: 'INV-REVIEW-' + String(index).padStart(2, '0'), studentId: 'chloe', amount: 2000, chargeType: 'recurring', period: 'Aug–Sep 2026', issued: '2026-07-20', due: '2026-08-20', proof: true, proofSubmittedAt: '2026-08-' + String(index + 1).padStart(2, '0') + 'T10:15:00+08:00', proofReview: { status: 'needs-review', reasons: ['The amount is not readable.'], extracted: { recipient: 'MathConcept', reference: 'DEMO', amount: 2000 } } }));
  invoices.push({ id: 'INV-PARENT', studentId: 'chloe', amount: 2000, period: 'Oct–Nov 2026', issued: '2026-09-20', due: '2026-09-22', proof: false });
  invoices.push({ id: 'INV-RETURN', studentId: 'ethan', amount: 2000, period: 'Oct–Nov 2026', issued: '2026-09-20', due: '2026-09-22', proof: true, proofDisposition: 'returned', proofReturnReason: 'Show the full transfer reference.', lastReminderAt: new Date(demoNow()).toISOString() });
  invoices.push({ id: 'INV-ASSESS', studentId: 'mia', amount: 200, chargeType: 'assessment', period: '26 Sep 2026', billingMonth: '2026-09', issued: '2026-09-15', due: '2026-09-26', proof: true, proofDate: '2026-09-20' });
  invoices.push({ id: 'INV-ISSUED', studentId: 'chloe', amount: 1800, chargeType: 'first-tuition', period: 'Jul–Aug 2026', issued: '2026-06-20', proof: true, receiptId: 'R-ISSUED' });
  invoices.push({ id: 'INV-ARCHIVE', studentId: 'chloe', amount: 2000, period: 'Jun–Jul 2026', status: 'cancelled', cancelledAt: '2026-06-01T10:00:00+08:00' });
  return { invoices, receipts: [{ id: 'R-ISSUED', invoiceId: 'INV-ISSUED', studentId: 'chloe', amount: 1800, issuedAt: '2026-06-22T11:30:00+08:00', issuedDate: '2026-06-22' }], billingSettings: { autoSent: true }, audit: [] };
}

const settle = () => new Promise(resolve => setImmediate(resolve));

function harness(initial = stateWithQueues(), options = {}) {
  let state = initial, failSave = false;
  const calls = { renders: 0, saves: 0, closed: 0, modals: [], receipts: [], toasts: [], reports: 0 }, viewer = { role: 'admin' }, nodes = new Map();
  const document = { activeElement: null, querySelector: selector => nodes.get(selector) || null };
  const element = (id, value = '') => ({ id, value, checked: true, selectionStart: 0, selectionEnd: 0, textContent: '', style: {}, classList: { add() {}, remove() {} }, focus() { document.activeElement = this; }, setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; } });
  const setControls = html => {
    for (const [, id] of html.matchAll(/\bid="([^"]+)"/g)) if (id !== 'billingflow-pdf-preview') nodes.set('#' + id, element(id));
    const reason = html.match(/<textarea id="billingflow-return-reason"[^>]*>([^<]*)<\/textarea>/);
    if (reason) nodes.get('#billingflow-return-reason').value = reason[1];
  };
  const ui = createBillingWorkflowUI({
    getState: () => state, getViewer: () => viewer,
    waitForSave: options.waitForSave || (() => Promise.resolve()), onSavingChange: options.onSavingChange,
    save: callback => {
      calls.saves++;
      const before = structuredClone(state);
      try {
        callback();
        if (failSave) throw new Error('Browser storage is full. Please free space and retry.');
        calls.renders++; setControls(ui.render());
        if (options.rejectAfterSave) return Promise.reject(new Error('Confirmation connection lost.'));
        return true;
      } catch (error) {
        state = before;
        const area = nodes.get('#form-error');
        if (area) { area.textContent = error.message; area.classList.add('visible'); }
        else calls.toasts.push([error.message, false, true]);
        return false;
      }
    },
    render: () => { calls.renders++; setControls(ui.render()); },
    modal: (title, body, footer, wide) => { setControls(body); nodes.set('#form-error', element('form-error')); nodes.set('.modal', element('modal')); calls.modals.push({ title, body, footer, wide }); },
    closeModal: () => { calls.closed++; nodes.delete('#form-error'); nodes.delete('.modal'); },
    toast: (...args) => calls.toasts.push(args), openReceipt: id => calls.receipts.push(id), renderAudit: () => '<section>Bank reconciliation workspace</section>', renderReport: () => { calls.reports++; }
  });
  globalThis.document = document;
  setControls(ui.render());
  return { ui, calls, viewer, document, nodes, get state() { return state; }, get modal() { return calls.modals.at(-1); }, failSave(value) { failSave = value; } };
}

test('default queue counts invoices, leaves month unrestricted and renders only 25 compact rows', () => {
  const app = harness(), html = app.ui.render();
  assert.match(html, /data-id="review" aria-pressed="true"/);
  assert.match(html, /待中心核對: 29 invoices/);
  assert.match(html, /<option value="" selected>All billing months/);
  assert.match(html, /1–25 of 29 invoices/);
  assert.match(html, /INV-REVIEW-00/);
  assert.doesNotMatch(html, /INV-REVIEW-27/);
  assert.equal((html.match(/data-action="billingflow-review"/g) || []).length, 25);
  assert.doesNotMatch(html, /Auto-sent|billingflow-auto-sent|automatically issue/);
  assert.match(html, /data-action="billingflow-archive"/);
  assert.doesNotMatch(html.match(/<nav[\s\S]*?<\/nav>/)[0], /Archive/);
  const order = ['待家長付款', '待中心核對', '已發收據', 'Final audit'].map(label => html.indexOf(label));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
});

test('filters, search and paging retain selection when opening and closing a review', async () => {
  const app = harness();
  app.ui.onChange({ target: { id: 'billingflow-charge', value: 'recurring' } });
  app.ui.handleAction('billingflow-page', null, { dataset: { page: '2' } });
  const before = app.ui.render();
  assert.match(before, /26–28 of 28 invoices/);
  app.ui.handleAction('billingflow-review', 'INV-REVIEW-27');
  assert.equal(app.modal.wide, true);
  assert.match(app.modal.body, /billingflow-review-columns/);
  assert.ok(app.modal.body.indexOf('billingflow-invoice') < app.modal.body.indexOf('billingflow-proof'));
  assert.match(app.modal.body, /Sample proof/);
  assert.match(app.modal.footer, /確認並發出收據/);
  app.ui.handleAction('billingflow-close');
  assert.equal(app.ui.render(), before);
  const input = app.nodes.get('#billingflow-search');
  input.value = 'INV-REVIEW-27'; input.selectionStart = 2; input.selectionEnd = 8;
  app.ui.onInput({ target: input });
  await new Promise(resolve => setTimeout(resolve, 160));
  assert.match(app.ui.render(), /1–1 of 1 invoices/);
  assert.match(app.ui.render(), /INV-REVIEW-27/);
  assert.equal(app.document.activeElement.id, 'billingflow-search');
  assert.equal(app.document.activeElement.selectionStart, 2);
  assert.equal(app.document.activeElement.selectionEnd, 8);
  app.ui.reset();
});

test('confirm saves once, keeps the modal open on persistence failure and returns to the filtered page on success', async () => {
  const app = harness();
  app.ui.onChange({ target: { id: 'billingflow-charge', value: 'recurring' } });
  app.ui.handleAction('billingflow-page', null, { dataset: { page: '2' } });
  app.ui.handleAction('billingflow-review', 'INV-REVIEW-27');
  const receiptCount = app.state.receipts.length;
  app.failSave(true);
  app.ui.handleAction('billingflow-confirm', 'INV-REVIEW-27');
  await settle();
  assert.equal(app.calls.closed, 0);
  assert.equal(app.state.receipts.length, receiptCount);
  assert.match(app.nodes.get('#form-error').textContent, /storage is full/);
  app.failSave(false);
  app.ui.handleAction('billingflow-confirm', 'INV-REVIEW-27');
  await settle();
  assert.equal(app.calls.closed, 1);
  assert.equal(app.state.receipts.length, receiptCount + 1);
  assert.match(app.ui.render(), /26–27 of 27 invoices/);
  assert.match(app.ui.render(), /<option value="recurring" selected/);
  app.ui.handleAction('billingflow-stage', 'issued');
  assert.match(app.ui.render(), /INV-REVIEW-27/);
});

test('return requires a reason, retains it through failed save and moves the invoice to parent payment', async () => {
  const app = harness(stateWithQueues(1));
  app.ui.handleAction('billingflow-review', 'INV-REVIEW-00');
  app.ui.handleAction('billingflow-return', 'INV-REVIEW-00');
  await settle();
  assert.match(app.modal.body, /id="billingflow-return-reason"/);
  app.ui.handleAction('billingflow-return', 'INV-REVIEW-00');
  await settle();
  assert.equal(app.calls.saves, 0);
  assert.match(app.nodes.get('#form-error').textContent, /Enter a reason/);
  const input = app.nodes.get('#billingflow-return-reason');
  input.value = 'Please include the full amount.';
  app.ui.onInput({ target: input });
  app.failSave(true);
  app.ui.handleAction('billingflow-return', 'INV-REVIEW-00');
  await settle();
  assert.equal(app.calls.closed, 0);
  assert.equal(input.value, 'Please include the full amount.');
  assert.equal(app.state.invoices[0].proofDisposition, undefined);
  app.failSave(false);
  app.ui.handleAction('billingflow-return', 'INV-REVIEW-00');
  await settle();
  assert.equal(app.calls.closed, 1);
  assert.equal(app.state.invoices[0].proofReturnReason, 'Please include the full amount.');
  app.ui.handleAction('billingflow-stage', 'parent');
  assert.match(app.ui.render(), /Please include the full amount\./);
  assert.match(app.ui.render(), /Waiting for replacement proof/);
  assert.match(app.ui.render(), /Remind to replace proof/);
});

test('parent reminders show last reminder and cooldown, use simulated feedback and preserve rollback', () => {
  const app = harness(stateWithQueues(1));
  app.ui.handleAction('billingflow-stage', 'parent');
  const html = app.ui.render();
  assert.match(html, /Last reminder/);
  assert.match(html, /24-hour reminder cooldown/);
  assert.match(html, /data-id="INV-RETURN" disabled/);
  assert.match(html, /Overdue/);
  app.failSave(true);
  app.ui.handleAction('billingflow-remind', 'INV-PARENT');
  assert.equal(app.state.invoices.find(invoice => invoice.id === 'INV-PARENT').lastReminderAt, undefined);
  app.failSave(false);
  app.ui.handleAction('billingflow-remind', 'INV-PARENT');
  assert.equal(app.state.billingReminderEvents.length, 1);
  assert.match(app.calls.toasts.at(-1)[0], /Demo reminder recorded\. No message was sent\./);
  assert.match(app.ui.render(), /data-id="INV-PARENT" disabled/);
  app.ui.handleAction('billingflow-remind', 'INV-PARENT');
  assert.equal(app.state.billingReminderEvents.length, 1);
});

test('saved images and PDFs are shown while unsafe attachments cannot become previews', () => {
  const app = harness(stateWithQueues(1)), invoice = app.state.invoices[0];
  invoice.proofReview.file = { mimeType: 'image/png', dataUrl: 'data:image/png;base64,AA==', name: 'parent-proof.png' };
  app.ui.handleAction('billingflow-review', invoice.id);
  assert.match(app.modal.body, /<img src="data:image\/png;base64,AA==" alt="Uploaded payment proof"/);
  assert.doesNotMatch(app.modal.body, /Sample proof/);
  invoice.proofReview.file = { mimeType: 'application/pdf', dataUrl: 'data:application/pdf;base64,JVBERg==', name: 'parent.pdf' };
  app.ui.handleAction('billingflow-review', invoice.id);
  assert.match(app.modal.body, /id="billingflow-pdf-preview"[^>]+aria-label="Uploaded payment proof PDF"/);
  assert.doesNotMatch(app.modal.body, /<object/);
  invoice.proofReview.file = { mimeType: 'image/png', dataUrl: 'javascript:alert(1)', name: '<unsafe>' };
  app.ui.handleAction('billingflow-review', invoice.id);
  assert.match(app.modal.body, /saved proof could not be displayed/);
  assert.doesNotMatch(app.modal.body, /javascript:|Sample proof|<unsafe>/);
});

test('archive is separate and final audit opens the existing workspace', () => {
  const app = harness(stateWithQueues(1));
  assert.doesNotMatch(app.ui.render(), /data-action="billingflow-report"/);
  app.ui.handleAction('billingflow-archive');
  assert.match(app.ui.render(), /INV-ARCHIVE/);
  assert.doesNotMatch(app.ui.render(), /INV-REVIEW-00/);
  assert.match(app.ui.render(), /Cancelled/);
  app.ui.openAudit();
  assert.match(app.ui.render(), /data-id="audit" aria-pressed="true"/);
  assert.match(app.ui.render(), /Bank reconciliation workspace/);
  assert.match(app.ui.render(), /data-action="billingflow-report"/);
  app.ui.handleAction('billingflow-report');
  assert.equal(app.calls.reports, 1);
  assert.doesNotMatch(app.ui.render(), /billingflow-search/);
  app.ui.handleAction('billingflow-stage', 'issued');
  app.ui.handleAction('billingflow-receipt', 'INV-ISSUED');
  assert.deepEqual(app.calls.receipts, ['R-ISSUED']);
});

test('staff-only controls reject unauthorized and stale review actions without mutation', () => {
  const app = harness(stateWithQueues(1)), before = structuredClone(app.state);
  assert.equal(app.ui.handleAction('unrelated-action'), false);
  app.ui.handleAction('billingflow-confirm', 'INV-REVIEW-00');
  assert.equal(app.calls.saves, 0);
  for (const role of ['parent', 'student', 'teacher']) {
    app.viewer.role = role;
    assert.equal(app.ui.render(), '');
    app.ui.handleAction('billingflow-review', 'INV-REVIEW-00');
    app.ui.handleAction('billingflow-remind', 'INV-PARENT');
    app.ui.onChange({ target: { id: 'billingflow-charge', value: 'recurring' } });
    app.ui.onInput({ target: { id: 'billingflow-search', value: 'unauthorized' } });
    assert.throws(() => app.ui.openAudit(), /Admin view/);
  }
  assert.equal(app.calls.modals.length, 0);
  assert.equal(app.calls.saves, 0);
  assert.deepEqual(app.state, before);
  app.viewer.role = 'admin';
  app.ui.handleAction('billingflow-unknown');
  assert.match(app.calls.toasts.at(-1)[0], /Unknown billing action/);
  app.ui.reset();
});


test('saving blocks duplicate approval, closing and queue navigation until the result is known', async () => {
  let release;
  const transitions = [], app = harness(stateWithQueues(1), { waitForSave: () => new Promise(resolve => { release = resolve; }), onSavingChange: value => transitions.push(value) });
  app.ui.handleAction('billingflow-review', 'INV-REVIEW-00');
  app.ui.handleAction('billingflow-confirm', 'INV-REVIEW-00');
  assert.equal(app.ui.isSaving(), true);
  assert.equal(app.ui.canClose(), false);
  app.ui.handleAction('billingflow-confirm', 'INV-REVIEW-00');
  app.ui.handleAction('billingflow-close');
  app.ui.onModalClosed();
  app.ui.handleAction('billingflow-stage', 'issued');
  assert.equal(app.ui.openAudit(), false);
  assert.equal(app.ui.reset(), false);
  assert.equal(app.calls.closed, 0);
  assert.equal(app.calls.saves, 0);
  assert.match(app.ui.render(), /data-id="review" aria-pressed="true"/);
  release(); await settle();
  assert.equal(app.calls.saves, 1);
  assert.equal(app.calls.closed, 1);
  assert.equal(app.ui.canClose(), true);
  assert.deepEqual(transitions, [true, false]);
});

test('interrupted confirmation stays open, checks the persisted result and does not issue twice', async () => {
  const app = harness(stateWithQueues(1)), receiptsBefore = app.state.receipts.length;
  app.ui.handleAction('billingflow-review', 'INV-REVIEW-00');
  app.ui.onChange({ target: { id: 'billingflow-save-outcome', value: 'uncertain' } });
  app.ui.handleAction('billingflow-confirm', 'INV-REVIEW-00'); await settle();
  assert.equal(app.calls.closed, 0);
  assert.equal(app.state.receipts.length, receiptsBefore + 1);
  assert.match(app.nodes.get('#form-error').textContent, /save result was not confirmed/);
  assert.match(app.nodes.get('#billingflow-recovery').innerHTML, /Check saved result/);
  app.ui.handleAction('billingflow-confirm', 'INV-REVIEW-00');
  assert.equal(app.calls.saves, 1);
  app.ui.handleAction('billingflow-recover');
  assert.equal(app.calls.closed, 1);
  assert.equal(app.state.receipts.length, receiptsBefore + 1);
  assert.equal(app.calls.saves, 1);
});

test('demo failure retains evidence and a safe retry completes the same review', async () => {
  const app = harness(stateWithQueues(1)), receiptsBefore = app.state.receipts.length;
  app.ui.handleAction('billingflow-review', 'INV-REVIEW-00');
  const before = app.modal.body;
  app.ui.onChange({ target: { id: 'billingflow-save-outcome', value: 'failed' } });
  app.ui.handleAction('billingflow-confirm', 'INV-REVIEW-00'); await settle();
  assert.equal(app.calls.closed, 0);
  assert.equal(app.calls.saves, 0);
  assert.equal(app.modal.body, before);
  assert.equal(app.state.receipts.length, receiptsBefore);
  assert.match(app.nodes.get('#form-error').textContent, /save failed/);
  app.ui.handleAction('billingflow-confirm', 'INV-REVIEW-00'); await settle();
  assert.equal(app.calls.closed, 1);
  assert.equal(app.state.receipts.length, receiptsBefore + 1);
});

test('invoice and proof have separate scroll regions and independent zoom levels', () => {
  const app = harness(stateWithQueues(1));
  app.ui.handleAction('billingflow-review', 'INV-REVIEW-00');
  assert.equal((app.modal.body.match(/class="billingflow-document-scroll"/g) || []).length, 2);
  assert.match(app.modal.body, /aria-label="Invoice document"/);
  assert.match(app.modal.body, /aria-label="Payment proof document"/);
  app.ui.handleAction('billingflow-zoom', null, { dataset: { document: 'proof', step: '25' } });
  assert.equal(app.nodes.get('#billingflow-proof-document').style.zoom, 1.25);
  assert.equal(app.nodes.get('#billingflow-proof-document').style.width, '125%');
  assert.equal(app.nodes.get('#billingflow-proof-zoom').textContent, '125%');
  assert.equal(app.nodes.get('#billingflow-invoice-document').style.zoom, undefined);
  for (let n = 0; n < 8; n++) app.ui.handleAction('billingflow-zoom', null, { dataset: { document: 'proof', step: '25' } });
  assert.equal(app.nodes.get('#billingflow-proof-document').style.zoom, 2);
  app.ui.handleAction('billingflow-zoom', null, { dataset: { document: 'proof', step: 'reset' } });
  assert.equal(app.nodes.get('#billingflow-proof-document').style.zoom, 1);
});

test('closing a review invalidates stale actions even when the host closes the modal', () => {
  const app = harness(stateWithQueues(1));
  app.ui.handleAction('billingflow-review', 'INV-REVIEW-00');
  app.ui.onModalClosed();
  app.ui.handleAction('billingflow-confirm', 'INV-REVIEW-00');
  assert.equal(app.calls.saves, 0);
  assert.equal(app.ui.isSaving(), false);
});


test('a rejected save response is recovered from persisted state instead of issuing a second receipt', async () => {
  const app = harness(stateWithQueues(1), { rejectAfterSave: true }), receiptsBefore = app.state.receipts.length;
  app.ui.handleAction('billingflow-review', 'INV-REVIEW-00');
  app.ui.handleAction('billingflow-confirm', 'INV-REVIEW-00'); await settle();
  assert.equal(app.calls.closed, 0);
  assert.equal(app.ui.isSaving(), false);
  assert.match(app.nodes.get('#billingflow-recovery').innerHTML, /Check saved result/);
  app.ui.handleAction('billingflow-recover');
  assert.equal(app.calls.closed, 1);
  assert.equal(app.state.receipts.length, receiptsBefore + 1);
  assert.equal(app.calls.saves, 1);
});
