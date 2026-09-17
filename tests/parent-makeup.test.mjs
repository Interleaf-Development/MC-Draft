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
  const absenceReason = { value: 'School activity' };
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
    icon: name => '<span aria-hidden="true" data-icon="' + name + '"></span>', art: () => '', childSwitch: () => '',
    tag: label => '<span>' + esc(t(label)) + '</span>',
    empty: (title, message = '') => '<h3>' + esc(title) + '</h3><p>' + esc(message) + '</p>',
    tutorName: id => model.tutors.find(item => item.id === id)?.name || id,
    modal: (title, body, footer) => { Object.assign(dialog, { title, body, footer }); dialog.opened++; },
    closeModal: () => { dialog.closed++; },
    toast: message => messages.push(message), persist: () => {}, render: () => {},
    $: selector => {
      if (selector === '#absence-reason') return absenceReason;
      assert.equal(selector, '#form-error');
      return error;
    },
    $$: selector => {
      assert.equal(selector, 'input[name="makeup-slot"]:checked');
      return selected.map(value => ({ value: String(value) }));
    }
  });
  vm.runInContext('let previousState = null;\n' + ['change', 'nextLessons', 'lessonRow', 'parentLessonGroups', 'parentOverview', 'parentLessons', 'openMakeup', 'handleAction'].map(functionSource).join('\n'), context);
  return {
    ui, dialog, error, messages,
    get state() { return context.state; },
    call: (name, ...args) => context[name](...args),
    act: (name, id, dataset = {}) => context.handleAction(name, id, { dataset }),
    dismiss: () => context.closeModal(),
    confirm(indices = [0]) { selected = indices; context.handleAction('confirm-makeup', undefined, { dataset: {} }); }
  };
}

const plain = value => JSON.parse(JSON.stringify(value));
const slot = (duration, extra = {}) => ({ date: model.TODAY, start: 600, duration, tutor: 'chan', ...extra });
const upcoming = app => app.state.bookings.find(item => item.studentId === 'chloe' && item.date === model.TODAY && model.activeBooking(item));

test('Parent home lesson cards display lesson information without links, controls or chevrons', () => {
  const app = renderer(), lesson = upcoming(app);
  model.requestAbsence(app.state, lesson.id, 'School activity');
  const page = app.call('parentOverview');
  const cards = [...page.matchAll(/<article class="parent-day-card">([\s\S]*?)<\/article>/g)];
  assert.ok(cards.length > 0);
  for (const [, card] of cards) {
    assert.match(card, /class="parent-home-lesson"/);
    assert.match(card, /<time datetime="\d{4}-\d{2}-\d{2}">/);
    assert.match(card, /數學/);
    assert.doesNotMatch(card, /<(?:button|a)\b|data-action=|tabindex=|role="button"|data-icon="right"/);
  }
  assert.match(cards[0][1], /請假待確認/);
  assert.match(page, /data-page="lessons"/, 'Quick action still opens the lesson management page');
});

test('Submitting leave immediately prompts for a replacement without booking it; Skip preserves pending leave', () => {
  const app = renderer(), lesson = upcoming(app), before = model.clone(app.state);
  app.act('send-leave-request', lesson.id);
  assert.equal(app.error.textContent, '');
  assert.equal(app.state.leaveRequests.length, 1);
  const request = app.state.leaveRequests[0];
  assert.equal(request.bookingId, lesson.id);
  assert.equal(request.status, 'pending');
  assert.equal(request.reason, 'School activity');
  assert.equal(app.dialog.opened, 1);
  assert.equal(app.ui.makeupLeaveRequestId, request.id);
  assert.ok(app.ui.makeupCandidates.length > 0);
  assert.ok(app.ui.makeupCandidates.every(item => item.duration === lesson.duration));
  assert.match(app.dialog.footer, /data-action="close-modal"[^>]*>稍後再安排<\/button>/);
  assert.deepEqual(app.state.bookings, before.bookings);
  assert.deepEqual(app.state.makeups, before.makeups);
  assert.deepEqual(app.state.audit, before.audit);
  const pending = model.clone(app.state);
  app.dismiss();
  assert.deepEqual(app.state, pending, 'Dismissal never approves leave, reserves a place or loses the request');
  assert.match(app.call('parentLessons'), new RegExp('data-action="absence-makeup"[^>]*data-id="' + request.id + '"'));
});

for (const duration of [60, 90]) {
  test(`Parent can propose one ${duration}-minute replacement while leave awaits approval`, () => {
    const app = renderer(), lesson = upcoming(app);
    lesson.duration = duration;
    app.act('send-leave-request', lesson.id);
    assert.equal(app.error.textContent, '');
    assert.ok(app.ui.makeupCandidates.length > 0);
    assert.ok(app.ui.makeupCandidates.every(item => item.duration === duration));
    const selected = plain(app.ui.makeupCandidates[0]), before = model.clone(app.state);
    app.confirm();
    assert.equal(app.error.textContent, '');
    assert.equal(app.dialog.closed, 1);
    assert.equal(app.state.leaveRequests.length, 1, 'Replacement belongs to the original leave request');
    assert.equal(app.state.leaveRequests[0].status, 'pending');
    assert.deepEqual(plain(app.state.leaveRequests[0].replacementSlots), [selected]);
    assert.deepEqual(app.state.bookings, before.bookings);
    assert.deepEqual(app.state.makeups, before.makeups);
    assert.deepEqual(app.state.audit, before.audit);
  });
}

test('Parent can reopen a skipped request and context switches when choosing another pending absence', () => {
  const app = renderer();
  const first = model.requestAbsence(app.state, upcoming(app).id, 'School activity');
  const laterLesson = app.state.bookings.find(item => item.studentId === 'chloe' && item.date === '2026-10-02');
  laterLesson.duration = 90;
  const second = model.requestAbsence(app.state, laterLesson.id, 'Medical appointment');
  const before = model.clone(app.state);
  app.act('absence-makeup', first.id);
  assert.equal(app.ui.makeupLeaveRequestId, first.id);
  const firstContext = app.ui.makeupContextKey;
  assert.ok(app.ui.makeupCandidates.every(item => item.duration === 60));
  app.dismiss();
  app.act('absence-makeup', second.id);
  assert.equal(app.ui.makeupLeaveRequestId, second.id);
  assert.notEqual(app.ui.makeupContextKey, firstContext);
  assert.ok(app.ui.makeupCandidates.length > 0);
  assert.ok(app.ui.makeupCandidates.every(item => item.duration === 90));
  app.call('openMakeup', 'makeup-chloe');
  assert.equal(app.ui.makeupLeaveRequestId, null, 'An approved make-up clears pending-absence context');
  assert.deepEqual(app.state, before, 'Switching contexts never changes any lesson or request');
});

test('Invalid or foreign pending leave cannot offer replacement choices', () => {
  for (const scenario of ['missing', 'foreign', 'approved', 'declined', 'changed-lesson']) {
    const app = renderer();
    const lesson = upcoming(app);
    const request = model.requestAbsence(app.state, lesson.id, 'School activity');
    let requestId = request.id;
    if (scenario === 'missing') requestId = 'missing-request';
    if (scenario === 'foreign') request.studentId = 'mia';
    if (['approved', 'declined'].includes(scenario)) request.status = scenario;
    if (scenario === 'changed-lesson') lesson.status = 'moved';
    const before = model.clone(app.state);
    assert.doesNotThrow(() => app.act('absence-makeup', requestId), scenario);
    if (scenario === 'changed-lesson') {
      assert.equal(app.ui.makeupCandidates.length, 0);
      assert.doesNotMatch(app.dialog.body + app.dialog.footer, /name="makeup-slot"|data-action="confirm-makeup"/);
      assert.match(app.dialog.footer, /稍後再安排/);
    } else assert.equal(app.dialog.opened, 0, scenario);
    assert.deepEqual(app.state, before, scenario);
  }
});

test('Pending absence confirmation rejects stale, foreign, short and split proposals without booking', () => {
  for (const scenario of ['approved', 'foreign', 'changed-lesson', 'short', 'split', 'missing-option']) {
    const app = renderer(), lesson = upcoming(app);
    const request = model.requestAbsence(app.state, lesson.id, 'School activity');
    app.act('absence-makeup', request.id);
    assert.ok(app.ui.makeupCandidates.length > 0);
    let indices = [0];
    if (scenario === 'approved') request.status = 'approved';
    if (scenario === 'foreign') app.ui.familyStudent = 'mia';
    if (scenario === 'changed-lesson') lesson.status = 'moved';
    if (scenario === 'short') app.ui.makeupCandidates = [slot(30)];
    if (scenario === 'split') { app.ui.makeupCandidates = [slot(30), slot(30, { start: 630 })]; indices = [0, 1]; }
    if (scenario === 'missing-option') indices = [99];
    const before = model.clone(app.state);
    assert.doesNotThrow(() => app.confirm(indices), scenario);
    assert.ok(app.error.textContent, scenario + ' reports a recoverable error');
    assert.equal(app.dialog.closed, 0, scenario);
    assert.deepEqual(app.state, before, scenario + ' keeps bookings and pending requests unchanged');
  }
});

test('A duplicate or foreign leave submission cannot launch a new replacement picker', () => {
  for (const scenario of ['duplicate', 'foreign']) {
    const app = renderer(), lesson = upcoming(app);
    if (scenario === 'duplicate') model.requestAbsence(app.state, lesson.id, 'Already requested');
    else app.ui.familyStudent = 'mia';
    const before = model.clone(app.state);
    app.act('send-leave-request', lesson.id);
    assert.ok(app.error.textContent, scenario);
    assert.equal(app.dialog.opened, 0, scenario);
    assert.deepEqual(app.state, before, scenario);
  }
});

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
