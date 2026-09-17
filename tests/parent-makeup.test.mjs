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

// Exercise the production leave/preferences handlers against the real model.
// DOM stubs provide only editable form values and the modal error area.
function renderer(role = 'parent') {
  const ui = { role, page: 'lessons', familyStudent: 'chloe' };
  const state = model.seed();
  model.normalizeParentLeave(state);
  const dialog = { title: '', body: '', footer: '', opened: 0, closed: 0 };
  const error = { textContent: '', classList: { add() {} } };
  const absenceReason = { value: 'School activity' };
  const preferencesNote = { value: '' };
  const messages = [];
  let selected = [], preferredDates = ['', '', ''];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const t = (en, zh) => ui.role === 'parent' ? (zh ?? familyText(en, ui.role)) : en;
  const context = vm.createContext({
    ...model, ui, state, t, esc,
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
      if (selector === '#makeup-preferences-note') return preferencesNote;
      assert.equal(selector, '#form-error');
      return error;
    },
    $$: selector => {
      if (selector === 'input[name="preferred-makeup-date"]') return preferredDates.map(value => ({ value }));
      assert.equal(selector, 'input[name="makeup-slot"]:checked');
      return selected.map(value => ({ value: String(value) }));
    }
  });
  const names = ['change', 'nextLessons', 'lessonRow', 'parentLessonGroups', 'parentOverview', 'makeupPreferencesSummary', 'parentMakeupCard', 'parentLessons', 'openMakeupPreferences', 'openMakeup', 'handleAction'];
  vm.runInContext('let previousState = null;\n' + names.map(functionSource).join('\n'), context);
  return {
    ui, dialog, error, messages,
    get state() { return context.state; },
    call: (name, ...args) => context[name](...args),
    act: (name, id, dataset = {}) => context.handleAction(name, id, { dataset }),
    dismiss: () => context.closeModal(),
    save(id, dates = [], note = '') {
      preferredDates = [...dates]; preferencesNote.value = note;
      context.handleAction('save-makeup-preferences', id, { dataset: {} });
    },
    confirm(indices = [0]) { selected = indices; context.handleAction('confirm-makeup', undefined, { dataset: {} }); }
  };
}

const plain = value => JSON.parse(JSON.stringify(value));
const upcoming = app => app.state.bookings.find(item => item.studentId === 'chloe' && item.date === model.TODAY && model.activeBooking(item));
const noBookingControls = html => assert.doesNotMatch(html, /name="makeup-slot"|id="makeup-(?:date|tutor)"|data-action="(?:confirm-makeup|makeup-mode)"|data-mode="split"/);

for (const duration of [60, 90]) {
  test(`Submitting ${duration}-minute leave immediately confirms absence and opens optional date preferences`, () => {
    const app = renderer(), lesson = upcoming(app);
    lesson.duration = duration;
    const before = model.clone(app.state);
    app.act('send-leave-request', lesson.id);
    assert.equal(app.error.textContent, '');
    assert.equal(app.state.leaveRequests.length, before.leaveRequests.length + 1);
    const request = app.state.leaveRequests.at(-1);
    const makeup = app.state.makeups.find(item => item.id === request.makeupId);
    assert.equal(request.bookingId, lesson.id);
    assert.equal(request.status, 'confirmed');
    assert.equal(request.reason, 'School activity');
    assert.equal(lesson.status, 'absent');
    assert.equal(lesson.attendance, 'absent');
    assert.equal(lesson.caseId, makeup.id);
    assert.equal(makeup.sourceId, lesson.id);
    assert.equal(makeup.minutes, duration);
    assert.equal(makeup.used, 0);
    assert.equal(makeup.followUpStatus, 'pending');
    assert.deepEqual(plain(makeup.preferredDates), []);
    assert.equal(app.state.bookings.length, before.bookings.length, 'Leave adds no replacement or reservation');
    assert.deepEqual(app.state.bookings.filter(item => item.id !== lesson.id), before.bookings.filter(item => item.id !== lesson.id));
    assert.equal(app.dialog.opened, 1);
    const dialog = app.dialog.title + app.dialog.body + app.dialog.footer;
    assert.match(dialog, /請假已確認/);
    assert.match(dialog, /客服會聯絡你確認補堂日期及時間/);
    assert.match(dialog, /意願日期並非預約/);
    assert.equal([...app.dialog.body.matchAll(/name="preferred-makeup-date"/g)].length, 3);
    assert.match(app.dialog.footer, /data-action="close-modal"/);
    assert.match(app.dialog.footer, new RegExp('data-action="save-makeup-preferences"[^>]*data-id="' + makeup.id + '"'));
    noBookingControls(dialog);
    const confirmed = model.clone(app.state);
    app.dismiss();
    assert.deepEqual(app.state, confirmed, 'Skipping preferences preserves confirmed leave and an admin follow-up');
    const page = app.call('parentLessons');
    assert.match(page, /請假已確認/);
    assert.match(page, /待客服聯絡/);
    assert.match(page, new RegExp('data-action="makeup-preferences"[^>]*data-id="' + makeup.id + '"'));
    assert.doesNotMatch(page, /請假待確認|選擇補堂時間|data-action="(?:approve-absence|decline-absence)"/);
  });
}

test('Parent can save several preferred dates and reopen them without reserving or choosing a session', () => {
  const app = renderer(), lesson = upcoming(app);
  app.act('send-leave-request', lesson.id);
  const request = app.state.leaveRequests.at(-1), makeup = app.state.makeups.find(item => item.id === request.makeupId);
  const before = model.clone(app.state);
  const dates = ['2026-10-01', '2026-10-05', '2026-10-08'];
  app.save(makeup.id, dates, '放學後較方便');
  assert.equal(app.error.textContent, '');
  assert.equal(app.dialog.closed, 1);
  assert.deepEqual(plain(makeup.preferredDates), dates);
  assert.equal(makeup.preferencesNote, '放學後較方便');
  assert.equal(makeup.followUpStatus, 'pending');
  assert.equal(makeup.used, 0);
  assert.deepEqual(app.state.bookings, before.bookings);
  assert.deepEqual(app.state.leaveRequests, before.leaveRequests);
  assert.deepEqual(app.state.makeups.filter(item => item.id !== makeup.id), before.makeups.filter(item => item.id !== makeup.id));
  app.act('makeup-preferences', makeup.id);
  for (const date of dates) assert.match(app.dialog.body, new RegExp('value="' + date + '"'));
  assert.match(app.dialog.body, /放學後較方便/);
  noBookingControls(app.dialog.body + app.dialog.footer);
  assert.match(app.call('parentLessons'), /待客服聯絡/);
});

test('Dates are optional and may be cleared without cancelling leave or removing the follow-up', () => {
  const app = renderer(), lesson = upcoming(app);
  app.act('send-leave-request', lesson.id);
  const request = app.state.leaveRequests.at(-1), makeup = app.state.makeups.find(item => item.id === request.makeupId);
  app.save(makeup.id, ['2026-10-02'], 'Please call');
  const bookings = model.clone(app.state.bookings);
  app.act('makeup-preferences', makeup.id);
  app.save(makeup.id, ['', '', ''], '');
  assert.equal(app.error.textContent, '');
  assert.deepEqual(plain(makeup.preferredDates), []);
  assert.equal(makeup.preferencesNote, '');
  assert.equal(makeup.followUpStatus, 'pending');
  assert.equal(request.status, 'confirmed');
  assert.equal(lesson.status, 'absent');
  assert.deepEqual(app.state.bookings, bookings);
});

test('Reopening different make-up cases cannot leak another case’s preferences', () => {
  const app = renderer();
  const first = model.requestAbsence(app.state, upcoming(app).id, 'School activity');
  const laterLesson = app.state.bookings.find(item => item.studentId === 'chloe' && item.date === '2026-10-02');
  const second = model.requestAbsence(app.state, laterLesson.id, 'Medical appointment');
  model.setMakeupPreferences(app.state, first.makeupId, ['2026-10-03'], 'First case');
  model.setMakeupPreferences(app.state, second.makeupId, ['2026-10-06'], 'Second case');
  const before = model.clone(app.state);
  app.act('makeup-preferences', first.makeupId);
  assert.match(app.dialog.body, /value="2026-10-03"/);
  assert.match(app.dialog.body, /First case/);
  app.act('makeup-preferences', second.makeupId);
  assert.match(app.dialog.body, /value="2026-10-06"/);
  assert.match(app.dialog.body, /Second case/);
  assert.doesNotMatch(app.dialog.body, /First case|value="2026-10-03"/);
  assert.deepEqual(app.state, before);
});

test('All parent make-up entry points, including a stale split-mode action, open preferences only', () => {
  for (const entry of ['open', 'makeup-book', 'makeup-preferences', 'makeup-mode']) {
    const app = renderer(), before = model.clone(app.state);
    app.ui.makeupId = 'makeup-chloe';
    app.ui.makeupMode = 'split';
    if (entry === 'open') app.call('openMakeup', 'makeup-chloe', 'split');
    else app.act(entry, 'makeup-chloe', { mode: 'split' });
    assert.equal(app.dialog.opened, 1, entry);
    noBookingControls(app.dialog.body + app.dialog.footer);
    assert.match(app.dialog.body, /name="preferred-makeup-date"/);
    assert.match(app.dialog.body, /意願日期並非預約/);
    assert.deepEqual(app.state, before, entry + ' never changes the schedule');
  }
});

test('A partial make-up remains a CS arrangement with date preferences, never a parent half-hour booking', () => {
  const app = renderer();
  app.state.makeups[0].used = 30;
  const before = model.clone(app.state), page = app.call('parentLessons');
  assert.match(page, /data-action="makeup-preferences"[^>]*data-id="makeup-chloe"/);
  assert.match(page, /待客服聯絡/);
  app.call('openMakeup', 'makeup-chloe', 'split');
  noBookingControls(app.dialog.body + app.dialog.footer);
  assert.match(app.dialog.body, /客服/);
  assert.deepEqual(app.state, before);
});

test('Parent cannot open or edit a missing, foreign or fully arranged make-up case', () => {
  for (const scenario of ['missing', 'foreign', 'arranged']) {
    const app = renderer(), makeup = app.state.makeups[0];
    let id = makeup.id;
    if (scenario === 'missing') id = 'missing-makeup';
    if (scenario === 'foreign') makeup.studentId = 'mia';
    if (scenario === 'arranged') { makeup.used = makeup.minutes; makeup.followUpStatus = 'arranged'; }
    const before = model.clone(app.state);
    assert.doesNotThrow(() => app.call('openMakeup', id), scenario);
    assert.equal(app.dialog.opened, 0, scenario);
    assert.doesNotThrow(() => app.save(id, ['2026-10-02'], 'Changed'), scenario);
    assert.deepEqual(app.state, before, scenario);
  }
});

test('Saving stale or invalid preferences reports an error without changing any records', () => {
  for (const scenario of ['child-switched', 'arranged', 'invalid-date', 'past-date']) {
    const app = renderer(), makeup = app.state.makeups[0];
    app.call('openMakeup', makeup.id);
    let dates = ['2026-10-02'];
    if (scenario === 'child-switched') app.ui.familyStudent = 'mia';
    if (scenario === 'arranged') makeup.used = makeup.minutes;
    if (scenario === 'invalid-date') dates = ['2026-02-30'];
    if (scenario === 'past-date') dates = ['2026-09-29'];
    const before = model.clone(app.state);
    assert.doesNotThrow(() => app.save(makeup.id, dates, 'Changed'), scenario);
    assert.ok(app.error.textContent || app.messages.length, scenario + ' reports a recoverable error');
    assert.equal(app.dialog.closed, 0, scenario);
    assert.deepEqual(app.state, before, scenario);
  }
});

test('Duplicate or foreign leave cannot create a second absence or new preferences prompt', () => {
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

test('A synthetic parent confirmation never books time, even with valid stale admin slot data', () => {
  for (const duration of [30, 60, 90]) {
    const app = renderer();
    app.ui.makeupId = 'makeup-chloe';
    app.ui.makeupMode = 'single';
    app.ui.makeupCandidates = [{ date: model.TODAY, start: 600, duration, tutor: 'chan' }];
    const before = model.clone(app.state);
    assert.doesNotThrow(() => app.confirm());
    assert.ok(app.messages.some(message => /客服/.test(message)));
    assert.equal(app.dialog.closed, 0);
    assert.deepEqual(app.state, before);
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

test('schedule shortfall appears as an adjustment and can be arranged without a fictional absence', () => {
  const app = renderer();
  app.state.makeups = [{ id: 'schedule-credit', kind: 'schedule-shortfall', studentId: 'chloe', sourceDate: '2026-11-25', minutes: 60, duration: 60, used: 0, expiry: '2026-11-30', originalExpiry: '2026-11-30', period: 'Oct–Nov 2026', preferredDates: [], preferencesNote: '' }];
  const html = app.call('parentLessons');
  assert.match(html, /課表調整補堂/);
  assert.doesNotMatch(html, /Invalid Date|請假已確認/);
  app.act('makeup-preferences', 'schedule-credit');
  assert.match(app.dialog.body, /客服會聯絡/);
  model.bookMakeup(app.state, 'schedule-credit', [{ date: '2026-10-01', start: 840, duration: 60, tutor: 'chan' }]);
  const booking = app.state.bookings.at(-1);
  assert.match(app.call('lessonRow', booking), /補堂/);
});
