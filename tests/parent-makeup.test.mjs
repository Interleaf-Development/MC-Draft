import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as model from '../dist/model.js';
import { familyDate, familyText } from '../dist/family-locale.js';

const source = await readFile(new URL('../dist/app.js', import.meta.url), 'utf8');

function functionSource(name) {
  const start = source.indexOf('function ' + name + '(');
  assert.notEqual(start, -1, 'Production function exists: ' + name);
  const next = source.slice(start + 1).search(/\n(?:function |const |let |document\.)/);
  return source.slice(start, next === -1 ? undefined : start + 1 + next);
}

// Run the production renderers and confirmation handler against the real model.
// DOM stubs supply only the selected radio/checkbox indices and modal error area.
function renderer(role = 'parent') {
  const ui = { role, page: 'lessons', familyStudent: 'chloe' };
  const dialog = { title: '', body: '', footer: '', opened: 0, closed: 0 };
  const error = { textContent: '', classList: { add() {} } };
  const messages = [];
  let selected = [];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const t = (en, zh) => ui.role === 'parent' ? (zh ?? familyText(en, ui.role)) : en;
  const context = vm.createContext({
    ...model, ui, state: model.seed(), t, esc,
    dateLabel: (date, options) => familyDate(date, ui.role, options),
    heading: (title, actions = '') => '<h1>' + esc(title) + '</h1>' + actions,
    action: (name, label, cls = '', attrs = '') => '<button data-action="' + name + '" class="' + cls + '" ' + attrs + '>' + t(label) + '</button>',
    field: (label, input) => '<label>' + t(label) + input + '</label>',
    icon: () => '', art: () => '', childSwitch: () => '',
    tag: label => '<span>' + esc(t(label)) + '</span>',
    empty: (title, message = '') => '<h3>' + esc(title) + '</h3><p>' + esc(message) + '</p>',
    tutorName: id => model.tutors.find(item => item.id === id)?.name || id,
    modal: (title, body, footer) => { Object.assign(dialog, { title, body, footer }); dialog.opened++; },
    closeModal: () => { dialog.closed++; },
    toast: message => messages.push(message), persist: () => {}, render: () => {},
    $: selector => {
      assert.equal(selector, '#form-error');
      return error;
    },
    $$: selector => {
      assert.equal(selector, 'input[name="makeup-slot"]:checked');
      return selected.map(value => ({ value: String(value) }));
    }
  });
  vm.runInContext('let previousState = null;\n' + ['change', 'nextLessons', 'lessonRow', 'parentLessons', 'openMakeup', 'handleAction'].map(functionSource).join('\n'), context);
  return {
    ui, dialog, error, messages,
    get state() { return context.state; },
    call: (name, ...args) => context[name](...args),
    confirm(indices = [0]) { selected = indices; context.handleAction('confirm-makeup', undefined, { dataset: {} }); }
  };
}

const plain = value => JSON.parse(JSON.stringify(value));
const slot = (duration, extra = {}) => ({ date: model.TODAY, start: 600, duration, tutor: 'chan', ...extra });

test('Parent stale split-mode calls are normalized to a single full lesson without split controls', () => {
  const app = renderer(), before = model.clone(app.state);
  app.ui.makeupMode = 'split';
  app.call('openMakeup', 'makeup-chloe', 'split');
  assert.equal(app.ui.makeupMode, 'single');
  assert.equal(app.dialog.opened, 1);
  assert.ok(app.ui.makeupCandidates.length > 0);
  assert.ok(app.ui.makeupCandidates.every(item => item.duration === 60));
  assert.match(app.dialog.body, /type="radio" name="makeup-slot"/);
  assert.doesNotMatch(app.dialog.body, /type="checkbox"|data-mode="split"|data-action="makeup-mode"|30-minute extensions|兩次延長各 30 分鐘/);
  assert.deepEqual(app.state, before, 'Opening a picker must not book or request a lesson');
});

for (const duration of [60, 90]) {
  test(`Parent can request one ${duration}-minute lesson without immediately booking it`, () => {
    const app = renderer();
    const makeup = app.state.makeups.find(item => item.id === 'makeup-chloe');
    makeup.minutes = duration;
    app.state.bookings.find(item => item.id === makeup.sourceId).duration = duration;
    const before = model.clone(app.state);
    assert.match(app.call('parentLessons'), /data-action="makeup-book"[^>]*data-id="makeup-chloe"/);
    app.call('openMakeup', makeup.id);
    assert.ok(app.ui.makeupCandidates.length > 0);
    assert.ok(app.ui.makeupCandidates.every(item => item.duration === duration));
    const selected = plain(app.ui.makeupCandidates[0]);
    app.confirm();
    assert.equal(app.error.textContent, '');
    assert.equal(app.dialog.closed, 1);
    assert.equal(app.state.leaveRequests.length, before.leaveRequests.length + 1);
    const request = app.state.leaveRequests.at(-1);
    assert.equal(request.kind, 'makeup');
    assert.equal(request.status, 'pending');
    assert.equal(request.studentId, 'chloe');
    assert.equal(request.makeupId, makeup.id);
    assert.deepEqual(plain(request.slots), [selected]);
    assert.deepEqual(app.state.bookings, before.bookings);
    assert.deepEqual(app.state.makeups, before.makeups);
    assert.deepEqual(app.state.audit, before.audit);
  });
}

test('a 30-minute remainder directs the Parent to the centre and cannot produce self-service options', () => {
  const app = renderer();
  app.state.makeups[0].used = 30;
  const before = model.clone(app.state), page = app.call('parentLessons');
  assert.match(page, /剩餘 30 分鐘/);
  assert.match(page, /聯絡中心/);
  assert.doesNotMatch(page, /data-action="makeup-book"/);
  app.call('openMakeup', 'makeup-chloe', 'split');
  assert.equal(app.ui.makeupMode, 'single');
  assert.equal(app.ui.makeupCandidates.length, 0);
  assert.doesNotMatch(app.dialog.body, /name="makeup-slot"|data-mode="split"/);
  assert.match(app.dialog.footer, /data-action="confirm-makeup"[^>]*disabled/);
  assert.deepEqual(app.state, before);
});

test('Parent cannot open a missing or another child’s make-up case', () => {
  const app = renderer();
  app.state.makeups.push({ ...app.state.makeups[0], id: 'makeup-other-child', studentId: 'mia' });
  const before = model.clone(app.state);
  for (const id of ['missing-makeup', 'makeup-other-child']) {
    assert.doesNotThrow(() => app.call('openMakeup', id, 'split'));
  }
  assert.equal(app.dialog.opened, 0);
  assert.deepEqual(app.state, before);
});

test('Parent confirmation rejects short, split, stale or foreign selections without queuing a request', () => {
  const scenarios = [
    { name: 'no selection', candidates: [slot(60)], indices: [] },
    { name: 'one half hour', candidates: [slot(30)], indices: [0] },
    { name: 'two half hours', candidates: [slot(30), slot(30, { start: 630 })], indices: [0, 1] },
    { name: 'multiple full lessons', candidates: [slot(60), slot(60, { start: 660 })], indices: [0, 1], minutes: 120 },
    { name: 'unsupported duration', candidates: [slot(45)], indices: [0] },
    { name: 'stale option index', candidates: [slot(60)], indices: [99] },
    { name: 'foreign case', candidates: [slot(60)], indices: [0], studentId: 'mia' },
    { name: 'missing case', candidates: [slot(60)], indices: [0], missing: true },
    { name: 'insufficient remainder', candidates: [slot(60)], indices: [0], used: 30 }
  ];
  for (const scenario of scenarios) {
    const app = renderer();
    Object.assign(app.state.makeups[0], {
      minutes: scenario.minutes ?? 60, used: scenario.used ?? 0, studentId: scenario.studentId ?? 'chloe'
    });
    app.ui.makeupId = scenario.missing ? 'missing-makeup' : 'makeup-chloe';
    app.ui.makeupCandidates = scenario.candidates;
    app.ui.makeupMode = 'split';
    const before = model.clone(app.state);
    assert.doesNotThrow(() => app.confirm(scenario.indices), scenario.name);
    assert.ok(app.error.textContent, scenario.name + ' should show a recoverable validation error');
    assert.equal(app.dialog.closed, 0, scenario.name);
    assert.deepEqual(app.state, before, scenario.name + ' must not enqueue a request or change attendance/bookings');
  }
});

test('Admin retains split extensions and can book two halves of one make-up', () => {
  const app = renderer('admin');
  app.call('openMakeup', 'makeup-chloe', 'split');
  assert.equal(app.ui.makeupMode, 'split');
  assert.match(app.dialog.body, /data-mode="split"/);
  assert.match(app.dialog.body, /type="checkbox" name="makeup-slot"/);
  assert.ok(app.ui.makeupCandidates.length >= 2);
  assert.ok(app.ui.makeupCandidates.every(item => item.duration === 30));
  const before = model.clone(app.state), selected = plain(app.ui.makeupCandidates.slice(0, 2));
  app.confirm([0, 1]);
  assert.equal(app.error.textContent, '');
  assert.equal(app.dialog.closed, 1);
  assert.equal(app.state.makeups[0].used, 60);
  assert.equal(app.state.bookings.length, before.bookings.length + 2);
  assert.deepEqual(app.state.leaveRequests, before.leaveRequests);
  const booked = app.state.bookings.slice(-2);
  assert.ok(booked.every(item => item.caseId === 'makeup-chloe' && item.duration === 30));
  assert.deepEqual(booked.map(({ date, start, duration, tutor }) => ({ date, start, duration, tutor })), selected);
});

test('Admin can still arrange a single 30-minute remainder as an exception', () => {
  const app = renderer('admin');
  app.state.makeups[0].used = 30;
  app.call('openMakeup', 'makeup-chloe');
  assert.ok(app.ui.makeupCandidates.length > 0);
  assert.ok(app.ui.makeupCandidates.every(item => item.duration === 30));
  app.confirm();
  assert.equal(app.error.textContent, '');
  assert.equal(app.state.makeups[0].used, 60);
  assert.equal(app.state.bookings.at(-1).duration, 30);
  assert.equal(app.dialog.closed, 1);
});
