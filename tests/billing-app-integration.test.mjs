import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as model from '../dist/model.js';
import * as billing from '../dist/billing-workflow.js';
import { createAssessmentInvoice, submitEnrolmentApplication, reviewEnrolmentApplication } from '../dist/billing-cycles.js';
import { submitPaymentProof } from '../dist/billing-automation.js';
import { familyDate, familyText, familyContent } from '../dist/family-locale.js';

const source = await readFile(new URL('../dist/app.js', import.meta.url), 'utf8');
function functionSource(name) {
  const start = source.indexOf('function ' + name + '(');
  assert.notEqual(start, -1, name);
  const next = source.slice(start + 1).search(/\n(?:function |const |let |document\.)/);
  return source.slice(start, next === -1 ? undefined : start + 1 + next);
}
function harness() {
  const state = billing.normalizeBillingWorkflow(model.seed()), ui = { role: 'parent', page: 'payments', familyStudent: 'mia' };
  const fields = new Map(Object.entries({ '#enrol-parent': { value: 'Mrs Cheung' }, '#enrol-phone': { value: '9000 0000' }, '#enrol-date': { value: '2026-10-07' }, '#enrol-time': { value: '1020' }, '#assessment-booking-date': { value: '2026-10-07' } }));
  const error = { textContent: '', classList: { add() {} } }, events = { closed: 0, rendered: 0, toast: [], copied: [], saved: null };
  let saving = false, fail = false;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const scope = { ...model, ...billing, createAssessmentInvoice, submitEnrolmentApplication, reviewEnrolmentApplication, state, ui, esc,
    previousState: null, STORAGE: 'test', billingWorkflowUI: { isSaving: () => saving },
    navigator: { clipboard: { writeText: value => { events.copied.push(value); return Promise.resolve(); } } },
    localStorage: { setItem: (key, value) => { if (fail) throw new Error('quota'); events.saved = JSON.parse(value); } },
    $: selector => selector === '#form-error' ? error : fields.get(selector),
    t: (en, zh) => ui.role === 'parent' ? zh || familyText(en, 'parent') : en,
    content: value => familyContent(value, ui.role), familyDate,
    heading: title => '<h1>' + title + '</h1>', childSwitch: () => '', icon: () => '',
    tag: label => '<span>' + label + '</span>',
    action: (name, label, cls, attrs = '') => '<button data-action="' + name + '" ' + attrs + '>' + label + '</button>',
    closeModal: () => { events.closed++; }, render: () => { events.rendered++; }, toast: text => events.toast.push(text)
  };
  const sandbox = vm.createContext(scope);
  vm.runInContext(['saveBillingChange', 'parentPaymentDetails', 'parentPayments', 'handleAction'].map(functionSource).join('\n'), sandbox);
  return { sandbox, fields, events, error, get state() { return sandbox.state; }, setSaving(value) { saving = value; }, setFail(value) { fail = value; }, act: (name, id, dataset = {}) => sandbox.handleAction(name, id, { dataset }) };
}

test('actual enrolment actions separate parent application, staff review and first payment activation', () => {
  const app = harness(), before = app.state.invoices.length;
  app.act('confirm-enrol');
  assert.equal(app.state.invoices.length, before, 'Parent application does not create an invoice');
  const application = app.state.enrolmentApplications[0];
  assert.equal(application.status, 'submitted');
  app.act('review-enrol', application.id);
  assert.equal(app.state.invoices.length, before, 'Parent cannot approve their application');
  app.sandbox.ui.role = 'admin';
  app.act('review-enrol', application.id);
  const invoice = app.state.invoices.find(item => item.enrolmentApplicationId === application.id);
  assert.ok(invoice);
  assert.equal(invoice.amount, 1800);
  assert.equal(invoice.billingMonths, 2);
  assert.equal(invoice.packageLessonCount, 8);
  assert.equal(app.state.assessment.enrolled, false);
  submitPaymentProof(app.state, invoice.id, { paymentDate: model.TODAY, reference: 'FIRST-APP-654321', payerName: 'Mandy Cheung' });
  assert.equal(app.state.assessment.enrolled, false);
  billing.confirmInvoicePayment(app.state, invoice.id);
  assert.equal(app.state.assessment.enrolled, true);
  assert.equal(app.state.invoices.filter(item => item.enrolmentApplicationId === application.id).length, 1);
});

test('app billing saves retain an application error without partially saving or closing, and recover on retry', () => {
  const app = harness(), before = model.clone(app.state);
  app.setFail(true); app.act('confirm-enrol');
  assert.deepEqual(app.state, before);
  assert.equal(app.events.closed, 0);
  assert.match(app.error.textContent, /未能儲存/);
  app.setFail(false); app.act('confirm-enrol');
  assert.equal(app.state.enrolmentApplications.length, 1);
  assert.equal(app.events.closed, 1);
});

test('assessment booking issues its invoice once and parents cannot invoke the staff booking action', () => {
  const app = harness(), before = app.state.invoices.length;
  app.act('confirm-paid-assessment');
  assert.equal(app.state.invoices.length, before);
  app.sandbox.ui.role = 'admin';
  app.act('confirm-paid-assessment'); app.act('confirm-paid-assessment');
  assert.equal(app.state.invoices.length, before + 1);
  assert.equal(app.state.assessmentBookings.length, 1);
  const invoice = app.state.invoices.find(item => item.id === app.state.assessmentBookings[0].invoiceId);
  assert.equal(invoice.chargeType, 'assessment');
  assert.equal(invoice.assessmentDate, '2026-10-07');
  assert.equal(invoice.receiptId, null);
});

test('parent payment cards expose amount, deadline and copyable FPS details, with upload then staff-review state', async () => {
  const app = harness(); app.sandbox.ui.familyStudent = 'chloe';
  app.state.paymentDetails = { recipient: 'Centre testing account', fpsId: 'TEST-FPS-123' };
  const html = app.sandbox.parentPayments();
  assert.match(html, /HK\$2,000/);
  assert.match(html, /繳費限期：/);
  assert.match(html, /data-copy-value="TEST-FPS-123"/);
  assert.match(html, /data-action="submit-proof"/);
  app.act('copy-payment-detail', null, { copyValue: 'TEST-FPS-123' });
  await Promise.resolve();
  assert.deepEqual(app.events.copied, ['TEST-FPS-123']);
  assert.ok(app.events.toast.includes('已複製。'));
  submitPaymentProof(app.state, 'INV-1024', { paymentDate: model.TODAY, reference: 'FPS 910277', payerName: 'Elaine Chan' });
  assert.equal(billing.billingStage(app.state, app.state.invoices.find(item => item.id === 'INV-1024')), 'review');
  assert.match(app.sandbox.parentPayments(), /待中心核對/);
});

test('active billing save blocks app actions until completion', () => {
  const app = harness(), before = model.clone(app.state);
  app.setSaving(true); app.act('confirm-enrol');
  assert.deepEqual(app.state, before);
  assert.equal(app.events.closed, 0);
  app.setSaving(false); app.act('confirm-enrol');
  assert.equal(app.state.enrolmentApplications.length, 1);
});

test('main click dispatcher blocks navigation and role switching before dispatch while saving', () => {
  const start = source.indexOf("document.addEventListener('click', e => {");
  const end = source.indexOf('function openMakeupPreferences(', start);
  let listener, saving = true, renders = 0, dispatches = 0;
  const ui = { role: 'admin', page: 'billing', assignmentId: 'keep', search: 'Chloe' };
  const noopHandler = { handleAction: () => false };
  const sandbox = vm.createContext({ ui,
    document: { addEventListener: (name, callback) => { assert.equal(name, 'click'); listener = callback; } },
    billingWorkflowUI: { isSaving: () => saving, handleAction: () => { dispatches++; return false; } },
    conversationUI: { onDocumentClick() {} }, proofUI: noopHandler, bankCheckUI: noopHandler,
    render: () => { renders++; }
  });
  vm.runInContext(source.slice(start, end), sandbox);
  const click = dataset => listener({ preventDefault() {}, target: { closest: selector => selector === '[data-action]' ? { dataset } : null } });
  click({ action: 'navigate', page: 'schedule' }); click({ action: 'role', role: 'parent' });
  assert.deepEqual(ui, { role: 'admin', page: 'billing', assignmentId: 'keep', search: 'Chloe' });
  assert.equal(renders, 0); assert.equal(dispatches, 0);
  saving = false; click({ action: 'navigate', page: 'schedule' });
  assert.equal(ui.page, 'schedule'); assert.equal(renders, 1);
});
