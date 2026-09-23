import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as model from '../dist/model.js';
import { serializeDemoState } from '../dist/demo-state-storage.js';

const source = await readFile(new URL('../dist/app.js', import.meta.url), 'utf8');
function functionSource(name) {
  const start = source.indexOf('function ' + name + '(');
  assert.notEqual(start, -1, name);
  const next = source.slice(start + 1).search(/\n(?:function |const |let |document\.)/);
  return source.slice(start, next === -1 ? undefined : start + 1 + next);
}

function harness() {
  const state = model.seed(), ui = { role: 'parent', page: 'overview', familyStudent: 'chloe' };
  const booking = (id, date, extra = {}) => ({ id, studentId: 'chloe', date, start: 960, duration: 60, tutor: model.centre.managerId, status: 'scheduled', attendance: 'unmarked', note: '', ...extra });
  state.bookings = [
    booking('own-future', '2026-10-07'), booking('own-today', model.TODAY),
    booking('own-attended', '2026-10-08', { attendance: 'present' }),
    booking('own-past', '2026-09-29'), booking('own-absent', '2026-10-09', { status: 'absent', attendance: 'absent' }),
    booking('own-moved', '2026-10-10', { status: 'moved' }), booking('own-cancelled', '2026-10-11', { status: 'cancelled' }),
    booking('other-child', '2026-10-07', { studentId: 'ethan' })
  ];
  state.makeups = [];
  state.leaveRequests = [];
  const events = { dialogs: [], closed: 0, rendered: 0, toasts: [], saved: null, order: [], saveAttempts: 0 };
  const error = { textContent: '', visible: false, classList: { add() { error.visible = true; } } };
  let valid = true, failStorage = false;
  const fields = new Map(Object.entries({
    '#parent-schedule-change-form': { reportValidity: () => valid },
    '#parent-change-lesson': { value: 'own-future' },
    '#parent-change-reason': { value: '  學校活動  ' },
    '#parent-change-note': { value: '  星期六下午較方便  ' },
    '#schedule-preferred-date-0': { value: '2026-10-10' },
    '#schedule-preferred-date-1': { value: '2026-10-12' },
    '#schedule-preferred-date-2': { value: '' }
  }));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const sandbox = vm.createContext({
    ...model, serializeDemoState, state, ui, previousState: null, STORAGE: 'parent-schedule-test',
    $: selector => selector === '#form-error' ? error : fields.get(selector),
    t: (en, zh) => zh || en, esc,
    tutorName: id => model.tutors.find(tutor => tutor.id === id)?.name || '',
    field: (label, input) => '<label>' + label + '</label>' + input,
    action: (name, label, cls, attrs = '') => '<button type="button" data-action="' + name + '" ' + attrs + '>' + label + '</button>',
    modal: (title, body, footer) => events.dialogs.push({ title, body, footer }),
    closeModal: () => { events.closed++; events.order.push('close'); },
    render: () => { events.rendered++; events.order.push('render'); },
    toast: text => { events.toasts.push(text); events.order.push('toast'); },
    localStorage: { setItem: (key, value) => {
      events.saveAttempts++;
      if (failStorage) throw new Error('quota exceeded');
      events.saved = JSON.parse(value); events.order.push('save');
    } }
  });
  vm.runInContext(['nextLessons', 'saveBillingChange', 'openParentScheduleChange', 'submitParentScheduleChange'].map(functionSource).join('\n'), sandbox);
  return {
    sandbox, ui, fields, events, error,
    get state() { return sandbox.state; },
    open: () => sandbox.openParentScheduleChange(), submit: () => sandbox.submitParentScheduleChange(),
    setValid(value) { valid = value; }, setStorageFailure(value) { failStorage = value; }
  };
}

test('parent popup lists only their upcoming unattended active lessons and their own pending make-ups', () => {
  const app = harness();
  app.state.makeups.push(
    { id: 'own-pending', studentId: 'chloe', sourceId: 'own-absent', minutes: 60, used: 0 },
    { id: 'own-arranged', studentId: 'chloe', sourceId: 'own-past', minutes: 60, used: 60 },
    { id: 'other-pending', studentId: 'ethan', sourceId: 'other-child', minutes: 60, used: 0 }
  );
  app.open();
  const dialog = app.events.dialogs.at(-1);
  const ids = [...dialog.body.matchAll(/<option value="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(ids, ['own-today', 'own-future']);
  assert.match(dialog.body, /data-id="own-pending"/);
  assert.doesNotMatch(dialog.body, /data-id="(?:own-arranged|other-pending)"/);
  assert.match(dialog.body, /意願日期並非預約/);
  assert.match(dialog.footer, /data-action="submit-parent-schedule-change"/);
  assert.equal(app.events.saved, null);
});

test('no eligible lesson shows an empty popup without a submission action; other roles cannot open it', () => {
  const app = harness();
  app.state.bookings = app.state.bookings.filter(booking => !['own-today', 'own-future'].includes(booking.id));
  app.open();
  assert.match(app.events.dialogs.at(-1).body, /暫無可調整的未來課堂/);
  assert.doesNotMatch(app.events.dialogs.at(-1).footer, /submit-parent-schedule-change/);
  for (const role of ['student', 'teacher', 'admin']) { app.ui.role = role; app.open(); }
  assert.equal(app.events.dialogs.length, 1);
});

test('successful intent confirms absence and stores nonbinding preferences before closing without creating a replacement booking', () => {
  const app = harness(), beforeBookings = structuredClone(app.state.bookings);
  app.open(); app.submit();
  const lesson = app.state.bookings.find(booking => booking.id === 'own-future');
  assert.equal(lesson.status, 'absent');
  assert.equal(lesson.attendance, 'absent');
  const request = app.state.leaveRequests.find(item => item.bookingId === lesson.id);
  assert.equal(request.status, 'confirmed');
  assert.equal(request.studentId, 'chloe');
  assert.equal(request.reason, '學校活動');
  const makeup = app.state.makeups.find(item => item.id === request.makeupId);
  assert.equal(makeup.sourceId, lesson.id);
  assert.equal(makeup.minutes, 60);
  assert.equal(makeup.used, 0);
  assert.equal(makeup.followUpStatus, 'pending');
  assert.deepEqual(makeup.preferredDates, ['2026-10-10', '2026-10-12']);
  assert.equal(makeup.preferencesNote, '星期六下午較方便');
  assert.equal(app.state.bookings.length, beforeBookings.length);
  assert.deepEqual(app.state.bookings.filter(booking => booking.id !== lesson.id), beforeBookings.filter(booking => booking.id !== lesson.id));
  assert.deepEqual(app.events.saved, app.state);
  assert.deepEqual(app.events.order, ['save', 'render', 'close', 'toast']);
  assert.equal(app.events.closed, 1);
  assert.match(app.events.toasts.at(-1), /中心會聯絡你確認/);
});

test('a parent may submit leave with all optional reason and preferences fields empty', () => {
  const app = harness();
  for (const selector of ['#parent-change-reason', '#parent-change-note', '#schedule-preferred-date-0', '#schedule-preferred-date-1', '#schedule-preferred-date-2']) app.fields.get(selector).value = '';
  app.submit();
  assert.equal(app.events.closed, 1);
  assert.deepEqual(app.state.makeups[0].preferredDates, []);
  assert.equal(app.state.makeups[0].preferencesNote, '');
  assert.equal(app.state.leaveRequests[0].reason, '');
});

test('invalid preferred dates roll back the absence and all new records while retaining the popup and entered values', () => {
  for (const invalidDates of [['2026-10-10', '2026-10-10'], ['2026-09-29', ''], ['2026-02-30', '']]) {
    const app = harness(), before = structuredClone(app.state);
    app.open();
    app.fields.get('#schedule-preferred-date-0').value = invalidDates[0];
    app.fields.get('#schedule-preferred-date-1').value = invalidDates[1];
    app.submit();
    assert.deepEqual(app.state, before);
    assert.equal(app.events.closed, 0);
    assert.equal(app.events.rendered, 0);
    assert.equal(app.events.saveAttempts, 0);
    assert.equal(app.error.visible, true);
    assert.match(app.error.textContent, /preferred date/i);
    assert.equal(app.fields.get('#schedule-preferred-date-0').value, invalidDates[0]);
    assert.equal(app.fields.get('#parent-change-reason').value, '  學校活動  ');
  }
});

test('storage failure restores all state, keeps the popup recoverable and allows a single successful retry', () => {
  const app = harness(), before = structuredClone(app.state);
  app.open(); app.setStorageFailure(true); app.submit();
  assert.deepEqual(app.state, before);
  assert.equal(app.events.closed, 0);
  assert.equal(app.events.rendered, 0);
  assert.equal(app.events.saved, null);
  assert.match(app.error.textContent, /未能儲存/);
  app.setStorageFailure(false); app.submit();
  assert.equal(app.events.closed, 1);
  assert.equal(app.state.leaveRequests.length, 1);
  assert.equal(app.state.makeups.length, 1);
  assert.equal(app.events.saved.leaveRequests.length, 1);
});

test('submission rejects another child and lessons that became attended, past, moved, absent or cancelled', () => {
  for (const id of ['other-child', 'missing-lesson', 'own-attended', 'own-past', 'own-moved', 'own-absent', 'own-cancelled']) {
    const app = harness(), before = structuredClone(app.state);
    app.fields.get('#parent-change-lesson').value = id;
    app.submit();
    assert.deepEqual(app.state, before);
    assert.equal(app.events.closed, 0);
    assert.equal(app.events.saveAttempts, 0);
    assert.ok(app.error.textContent);
    if (['other-child', 'missing-lesson'].includes(id)) assert.match(app.error.textContent, /你子女的課堂/);
  }
});

test('switching children while a popup is open cannot submit the previous child’s lesson', () => {
  const app = harness(), before = structuredClone(app.state);
  app.open(); app.ui.familyStudent = 'ethan'; app.submit();
  assert.deepEqual(app.state, before);
  assert.match(app.error.textContent, /你子女的課堂/);
  assert.equal(app.events.closed, 0);
});

test('role, form existence and browser validity guards prevent changes before domain processing', () => {
  for (const role of ['student', 'teacher', 'admin']) {
    const app = harness(), before = structuredClone(app.state);
    app.ui.role = role; app.submit();
    assert.deepEqual(app.state, before);
    assert.equal(app.events.saveAttempts, 0);
  }
  const app = harness(), before = structuredClone(app.state);
  app.setValid(false); app.submit();
  assert.deepEqual(app.state, before);
  app.fields.delete('#parent-schedule-change-form'); app.setValid(true); app.submit();
  assert.deepEqual(app.state, before);
  assert.equal(app.events.closed, 0);
  assert.equal(app.events.saveAttempts, 0);
});
