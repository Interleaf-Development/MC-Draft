import test from 'node:test';
import assert from 'node:assert/strict';
import * as model from '../dist/model.js';
import { createRegularScheduleUI } from '../dist/regular-schedule-ui.js';
import { getRegularSchedule } from '../dist/regular-schedule.js';

// The production controller talks to a small form surface. No booking logic is
// reimplemented here: integration cases below exercise the real schedule model.
function harness(initialState = model.seed(), factory = createRegularScheduleUI) {
  let state = initialState;
  const viewer = { role: 'admin' }, nodes = new Map();
  const calls = { modals: [], changed: 0, closed: 0, receipts: [], errors: [] };
  let decision = null;
  const root = { querySelector(selector) {
    if (selector === 'input[name="regular-decision"]:checked') return decision && { value: decision };
    return nodes.get(selector) || null;
  } };
  const decode = value => value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>');
  function controls(html) {
    nodes.clear(); decision = null;
    nodes.set('#form-error', { textContent: '', classList: { add() {} } });
    for (const [, attributes] of html.matchAll(/<input\b([^>]*)>/g)) {
      const id = attributes.match(/\bid="([^"]+)"/)?.[1];
      if (id) nodes.set('#' + id, { id, value: decode(attributes.match(/\bvalue="([^"]*)"/)?.[1] || ''), checked: /\bchecked\b/.test(attributes) });
    }
    for (const [, id, body] of html.matchAll(/<select\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)) {
      const options = [...body.matchAll(/<option\b([^>]*)>/g)];
      const selected = options.find(([, attrs]) => /\bselected\b/.test(attrs)) || options[0];
      nodes.set('#' + id, { id, value: decode(selected?.[1].match(/\bvalue="([^"]*)"/)?.[1] || '') });
    }
    const apply = html.match(/<button\b([^>]*data-action="regular-apply"[^>]*)>/);
    if (apply) nodes.set('[data-action="regular-apply"]', { disabled: /\bdisabled\b/.test(apply[1]) });
  }
  const ui = factory({ getState: () => state, getViewer: () => viewer, getRoot: () => root,
    modal(title, body, footer = '') { controls(body + footer); calls.modals.push({ title, body, footer }); },
    closeModal() { calls.closed++; }, openReceipt(id) { calls.receipts.push(id); },
    change(callback) {
      const before = structuredClone(state);
      try { callback(); calls.changed++; return true; }
      catch (error) { state = before; calls.errors.push(error.message); return false; }
    }
  });
  return { ui, viewer, calls, root, get state() { return state; }, get modal() { return calls.modals.at(-1); },
    set(values) { for (const [key, value] of Object.entries(values)) { const node = nodes.get('#regular-' + key); assert.ok(node, key + ' form control'); node.value = String(value); } },
    toggleEnd(checked) { const target = nodes.get('#regular-has-end'); target.checked = checked; ui.onChange({ target }); },
    choose(value) { decision = value; ui.onChange({ target: { name: 'regular-decision', value } }); }
  };
}

function reviewExtra(app) {
  app.ui.open('oliver');
  app.set({ effective: '2026-10-01', weekday: 4, start: 840 });
  app.ui.handleAction('regular-review');
  assert.equal(app.modal.title, 'Review regular schedule change');
  return app;
}

test('reviewing a permanent 8-to-9 change shows receipt impact without modifying bookings or receipts', () => {
  const app = harness(), before = structuredClone(app.state);
  reviewExtra(app);
  assert.match(app.modal.body, /8 <span>→<\/span> 9/);
  assert.match(app.modal.body, /Allow 9 lessons at the same fee/);
  assert.match(app.modal.body, /Keep 8 lessons/);
  assert.match(app.modal.body, /No additional payment/);
  assert.match(app.modal.body, /Compare lesson dates/);
  assert.equal(app.root.querySelector('[data-action="regular-apply"]').disabled, true);
  assert.doesNotMatch(app.modal.body, /type="radio"[^>]*checked/);
  assert.deepEqual(app.state.bookings, before.bookings);
  assert.deepEqual(app.state.receipts, before.receipts);
  assert.equal(app.calls.changed, 0);
});

test('Back retains the proposed day, time and effective date without applying the change', () => {
  const app = reviewExtra(harness()), before = structuredClone(app.state);
  app.ui.handleAction('regular-back');
  assert.equal(app.modal.title, 'Change regular schedule');
  assert.equal(app.root.querySelector('#regular-effective').value, '2026-10-01');
  assert.equal(app.root.querySelector('#regular-weekday').value, '4');
  assert.equal(app.root.querySelector('#regular-start').value, '840');
  assert.deepEqual(app.state, before);
  app.ui.handleAction('regular-review');
  assert.equal(app.root.querySelector('[data-action="regular-apply"]').disabled, true);
});

test('applying an extra lesson requires an explicit decision and amends one payment record', () => {
  const app = reviewExtra(harness()), count = app.state.receipts.length;
  const receipt = app.state.receipts.find(row => row.id === 'R-1028');
  const financial = { bankId: receipt.bankId, amount: receipt.amount, issuedDate: receipt.issuedDate };
  const bankTotal = model.reportingTotals(app.state, '2026-09').total;
  app.ui.handleAction('regular-apply');
  assert.equal(app.calls.changed, 0);
  assert.equal(app.calls.receipts.length, 0);
  assert.ok(app.calls.errors.length);
  app.choose('allow');
  assert.equal(app.root.querySelector('[data-action="regular-apply"]').disabled, false);
  app.ui.handleAction('regular-apply');
  assert.equal(app.calls.changed, 1);
  assert.deepEqual(app.calls.receipts, ['R-1028']);
  assert.equal(app.state.receipts.length, count);
  const amended = app.state.receipts.find(row => row.id === 'R-1028');
  assert.deepEqual({ bankId: amended.bankId, amount: amended.amount, issuedDate: amended.issuedDate }, financial);
  assert.equal(model.reportingTotals(app.state, '2026-09').total, bankTotal);
  app.ui.handleAction('regular-apply');
  assert.equal(app.calls.changed, 1, 'Applying a consumed preview cannot duplicate the change');
});

test('parent, student and teacher roles cannot open or apply admin schedule changes', () => {
  const app = reviewExtra(harness()), before = structuredClone(app.state), modalCount = app.calls.modals.length;
  for (const role of ['parent', 'student', 'teacher']) {
    app.viewer.role = role;
    app.ui.open('oliver');
    for (const action of ['regular-review', 'regular-apply', 'regular-back']) assert.equal(app.ui.handleAction(action), true);
    assert.equal(app.ui.onChange({ target: { name: 'regular-decision', value: 'allow' } }), false);
    assert.equal(app.calls.modals.length, modalCount);
    assert.equal(app.calls.changed, 0);
    assert.deepEqual(app.state, before);
  }
  assert.equal(app.ui.handleAction('unrelated-action'), false);
});

test('the 8-to-7 review requires staff to choose a make-up credit or the reduced entitlement', () => {
  const app = harness();
  app.ui.open('oliver');
  app.set({ effective: '2026-10-07', weekday: 2, start: 960, tutor: model.tutors[1].id });
  const before = structuredClone(app.state);
  app.ui.handleAction('regular-review');
  assert.equal(app.modal.title, 'Review regular schedule change');
  assert.match(app.modal.body, /8 <span>→<\/span> 7/);
  assert.match(app.modal.body, /Give 1 make-up lesson/);
  assert.match(app.modal.body, /7 scheduled \+ 1 to arrange with CS/);
  assert.match(app.modal.body, /Keep 7 lessons, no make-up/);
  assert.equal(app.root.querySelector('[data-action="regular-apply"]').disabled, true);
  assert.doesNotMatch(app.modal.body, /type="radio"[^>]*checked/);
  assert.deepEqual(app.state, before, 'Review does not grant a credit or change a lesson');
  app.ui.handleAction('regular-apply');
  assert.equal(app.calls.changed, 0);
  app.choose('credit');
  assert.equal(app.root.querySelector('[data-action="regular-apply"]').disabled, false);
  assert.equal(app.calls.changed, 0);
  app.ui.handleAction('regular-apply');
  assert.equal(app.calls.changed, 1);
  const credit = app.state.makeups.find(item => item.studentId === 'oliver' && item.kind === 'schedule-shortfall');
  assert.ok(credit);
  assert.equal(credit.minutes - credit.used, 60);
  assert.equal(credit.followUpStatus, 'pending');
  const invoice = app.state.invoices.find(item => item.id === 'INV-1028');
  assert.equal(invoice.lessonPlan.lessonDates.length, 7);
  assert.equal(invoice.lessonPlan.makeUpLessonCount, 1);
  assert.equal(invoice.lessonCount, 8);
  assert.equal(app.state.receipts.length, before.receipts.length);
});

test('declining the surplus lesson leaves no booking on the excluded final date', () => {
  const app = reviewExtra(harness());
  app.choose('decline');
  app.ui.handleAction('regular-apply');
  assert.equal(app.calls.changed, 1);
  const revision = app.state.receipts.find(item => item.id === 'R-1028').revisions.at(-1);
  assert.equal(revision.lessonCount, 8);
  assert.deepEqual(revision.excludedDates, ['2026-11-26']);
  assert.ok(!app.state.bookings.some(item => item.studentId === 'oliver' && item.date === '2026-11-26' && model.activeBooking(item)));
});

test('the declined surplus date shown in review skips preserved leave and matches the actual excluded date', () => {
  const state = model.seed();
  state.bookings.push({ id: 'oliver-preserved-leave', studentId: 'oliver', date: '2026-11-25', start: 960, duration: 60, tutor: model.tutors[0].id, status: 'absent', attendance: 'absent', caseId: 'leave-oliver-nov25' });
  const app = reviewExtra(harness(state));
  assert.match(app.modal.body, /No class on 19 Nov 2026\./);
  assert.doesNotMatch(app.modal.body, /No class on 25 Nov 2026\./);
  app.choose('decline');
  app.ui.handleAction('regular-apply');
  assert.equal(app.calls.changed, 1);
  assert.deepEqual(app.state.receipts.find(item => item.id === 'R-1028').revisions.at(-1).excludedDates, ['2026-11-19']);
  assert.equal(app.state.bookings.find(item => item.id === 'oliver-preserved-leave').status, 'absent');
});

test('declining a shortfall credit records only seven scheduled lessons at the same fee', () => {
  const app = harness(), creditCount = app.state.makeups.length;
  app.ui.open('oliver');
  app.set({ effective: '2026-10-07', weekday: 2, start: 960, tutor: model.tutors[1].id });
  app.ui.handleAction('regular-review');
  app.choose('decline');
  app.ui.handleAction('regular-apply');
  assert.equal(app.calls.changed, 1);
  const receipt = app.state.receipts.find(item => item.id === 'R-1028');
  assert.equal(receipt.amount, 2000);
  assert.equal(receipt.revisions.at(-1).lessonCount, 7);
  assert.equal(receipt.revisions.at(-1).makeUpLessonCount, 0);
  assert.equal(app.state.makeups.length, creditCount);
});

test('three-week change reveals its final date, preserves it on Back, and restores the usual timetable', () => {
  const app = harness();
  app.ui.open('oliver');
  assert.equal(app.root.querySelector('#regular-period'), null);
  assert.equal(app.root.querySelector('#regular-end'), null);
  app.set({ effective: '2026-10-01', weekday: 4, start: 840 });
  app.toggleEnd(true);
  assert.equal(app.root.querySelector('#regular-end').value, '2026-10-21');
  app.ui.handleAction('regular-review');
  assert.equal(app.modal.title, 'Review regular schedule change');
  assert.match(app.modal.body, /From 1 Oct 2026 through 21 Oct 2026 \(inclusive\)/);
  assert.match(app.modal.body, /Usual schedule resumes 28 Oct 2026/);
  app.ui.handleAction('regular-back');
  assert.equal(app.root.querySelector('#regular-has-end').checked, true);
  assert.equal(app.root.querySelector('#regular-end').value, '2026-10-21');
  assert.equal(app.root.querySelector('#regular-weekday').value, '4');
  app.ui.handleAction('regular-review');
  app.ui.handleAction('regular-apply');
  assert.equal(app.calls.changed, 1, app.calls.errors.join(', '));
  assert.equal(getRegularSchedule(app.state, 'oliver', '2026-10-08').weekday, 4);
  assert.equal(getRegularSchedule(app.state, 'oliver', '2026-10-22').weekday, 3);
  const dates = app.state.invoices.find(item => item.id === 'INV-1028').lessonPlan.lessonDates.map(item => item.date);
  assert.ok(dates.includes('2026-10-08'));
  assert.ok(dates.includes('2026-10-28'));
  assert.ok(!dates.includes('2026-10-22'));
});

test('unchecking Final date removes its limit and applies a permanent change', () => {
  const app = harness();
  app.ui.open('oliver');
  app.set({ effective: '2026-10-01', weekday: 4, start: 840 });
  app.toggleEnd(true);
  app.set({ end: '2026-10-21' });
  app.toggleEnd(false);
  assert.equal(app.root.querySelector('#regular-end'), null);
  app.ui.handleAction('regular-review');
  assert.doesNotMatch(app.modal.body, /Usual schedule resumes/);
  app.choose('allow');
  app.ui.handleAction('regular-apply');
  assert.equal(app.calls.changed, 1, app.calls.errors.join(', '));
  assert.equal(app.state.regularSchedules.oliver.endDate, undefined);
  assert.equal(getRegularSchedule(app.state, 'oliver', '2026-12-10').weekday, 4);
});

test('the effective date chooses the paid period without a receipt selector', () => {
  const state = model.seed();
  state.invoices.push({ id: 'INV-next', receiptId: 'R-next', studentId: 'oliver', period: 'Dec–Jan 2026/2027', periodStart: '2026-12-01', periodEnd: '2027-01-31', lessonCount: 8, amount: 2000, description: 'Regular programme · 8 lessons' });
  state.receipts.push({ id: 'R-next', invoiceId: 'INV-next', studentId: 'oliver', issuedDate: '2026-09-30', amount: 2000 });
  const app = harness(state);
  app.ui.open('oliver');
  app.set({ effective: '2026-12-01', weekday: 4, start: 840 });
  app.toggleEnd(true);
  app.ui.handleAction('regular-review');
  assert.equal(app.modal.title, 'Review regular schedule change');
  app.ui.handleAction('regular-apply');
  assert.equal(app.calls.changed, 1, app.calls.errors.join(', '));
  assert.deepEqual(app.calls.receipts, ['R-next']);
  assert.equal(state.receipts.find(item => item.id === 'R-1028').revisions, undefined);
});

test('a checked final date must be present and valid before preview or mutation', () => {
  const app = harness(), before = structuredClone(app.state);
  app.ui.open('oliver');
  app.set({ effective: '2026-10-01', weekday: 4, start: 840 });
  app.toggleEnd(true);
  app.set({ end: '' });
  app.ui.handleAction('regular-review');
  assert.match(app.root.querySelector('#form-error').textContent, /Choose a final date/);
  app.set({ end: '2026-09-30' });
  app.ui.handleAction('regular-review');
  assert.match(app.root.querySelector('#form-error').textContent, /final date on or after/);
  app.set({ effective: '2027-02-01', end: '2027-02-21' });
  app.ui.handleAction('regular-review');
  assert.match(app.root.querySelector('#form-error').textContent, /start date within a paid tuition period/);
  assert.equal(app.modal.title, 'Change regular schedule');
  assert.deepEqual(app.state, before);
});
