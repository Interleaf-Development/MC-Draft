import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as model from '../dist/model.js';
import { getStudentProfile, saveStudentProfile } from '../dist/student-profile.js';
import { getRemainingStudentLessons } from '../dist/regular-schedule.js';

const source = await readFile(new URL('../dist/app.js', import.meta.url), 'utf8');
function functionSource(name) {
  const start = source.indexOf('function ' + name + '(');
  assert.notEqual(start, -1, 'Production function exists: ' + name);
  const next = source.slice(start + 1).search(/\n(?:function |const |let |document\.)/);
  return source.slice(start, next === -1 ? undefined : start + 1 + next);
}

const booking = (id, studentId, extra = {}) => ({ id, studentId, date: model.TODAY, start: 960, duration: 60, tutor: 'chan', status: 'scheduled', attendance: 'unmarked', note: '', ...extra });
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

function renderer() {
  const state = model.seed();
  state.bookings = [booking('lesson-a', 'chloe', { note: 'Original Chloe remark' }), booking('lesson-b', 'ethan', { note: 'Original Ethan remark' })];
  const ui = { role: 'admin', page: 'schedule', scheduleBookingId: null, scheduleRemarkDrafts: {}, scheduleTutor: 'chan', date: model.TODAY };
  const calls = { modal: [], render: 0, persisted: [], rail: 0, chips: [], toasts: [] };
  const note = { id: 'schedule-booking-note', value: '', dataset: {}, focus() {} }, panel = { innerHTML: '' }, saveButton = { disabled: true };
  const chips = state.bookings.map(item => ({ dataset: { id: item.id }, outerHTML: '', closest: () => ({ dataset: { start: String(item.start) } }) }));
  let context;
  const renderPanel = () => {
    calls.rail++;
    panel.innerHTML = context.scheduleStudentInfo();
    const selected = state.bookings.find(item => item.id === ui.scheduleBookingId);
    note.value = ui.scheduleRemarkDrafts?.[ui.scheduleBookingId] ?? selected?.note ?? '';
    note.dataset.bookingId = ui.scheduleBookingId;
  };
  context = vm.createContext({
    ...model, state, ui, getStudentProfile, getRemainingStudentLessons, previousState: null, esc: escape,
    t: value => value, content: value => value,
    action: (name, label, cls = '', attrs = '') => '<button data-action="' + name + '" class="' + cls + '" ' + attrs + '>' + label + '</button>',
    icon: () => '', avatar: student => '<span>' + escape(student.initials) + '</span>',
    tag: value => '<span>' + escape(value) + '</span>',
    field: (label, input) => '<label>' + escape(label) + '</label>' + input,
    empty: (title, message = '') => '<h3>' + escape(title) + '</h3><p>' + escape(message) + '</p>',
    tutorName: id => model.tutors.find(tutor => tutor.id === id)?.name || '',
    regularLabel: student => student.regular,
    modal: (...args) => calls.modal.push(args), render: () => calls.render++,
    persist: () => calls.persisted.push(model.clone(state)), toast: text => calls.toasts.push(text),
    renderScheduleStudentInfo: renderPanel,
    bookingChip: (item, start) => { calls.chips.push({ id: item.id, note: item.note, start }); return '<button>' + escape(item.note) + '</button>'; },
    $: selector => selector === '#schedule-booking-note' ? note : selector === '#schedule-student-info' ? panel : selector === '#schedule-save-remark' ? saveButton : null,
    $$: selector => selector === '.timetable .booking-chip' ? chips : []
  });
  vm.runInContext(['canParkScheduleBooking', 'scheduleStudentInfo', 'selectScheduleBooking', 'updateScheduleRemarkDraft', 'saveScheduleRemark', 'bookingDetail'].map(functionSource).join('\n'), context);
  return { state, ui, calls, note, panel, saveButton, call: (name, ...args) => context[name](...args) };
}

test('schedule booking selection updates the correct student in place without a modal or data mutation', () => {
  const app = renderer(), before = model.clone(app.state);
  app.call('bookingDetail', 'lesson-a');
  assert.equal(app.ui.scheduleBookingId, 'lesson-a');
  assert.match(app.panel.innerHTML, /Chloe Chan/); assert.match(app.panel.innerHTML, /MC-0001/);
  assert.doesNotMatch(app.panel.innerHTML, /Ethan Wong/);
  app.call('bookingDetail', 'lesson-b');
  assert.equal(app.ui.scheduleBookingId, 'lesson-b');
  assert.match(app.panel.innerHTML, /Ethan Wong/); assert.match(app.panel.innerHTML, /MC-0002/);
  assert.doesNotMatch(app.panel.innerHTML, /Chloe Chan/);
  assert.equal(app.calls.rail, 2); assert.equal(app.calls.modal.length, 0); assert.equal(app.calls.render, 0); assert.equal(app.calls.persisted.length, 0);
  assert.deepEqual(app.state, before);
});

test('the rail reads edited profile contacts and escapes profile and lesson remarks', () => {
  const app = renderer();
  saveStudentProfile(app.state, 'chloe', { school: 'Updated Demo School', parentGivenName: 'Elaine', parentSurname: 'Chan', parentMobile: '0000 8888', remark: 'Discuss <fractions> & practice' });
  app.state.bookings[0].note = '<script>not executable</script>';
  const before = model.clone(app.state);
  app.call('selectScheduleBooking', 'lesson-a');
  for (const value of ['Updated Demo School', 'Elaine Chan', '0000 8888']) assert.ok(app.panel.innerHTML.includes(value));
  assert.match(app.panel.innerHTML, /Discuss &lt;fractions&gt; &amp; practice/);
  assert.match(app.panel.innerHTML, /&lt;script&gt;not executable&lt;\/script&gt;/);
  assert.doesNotMatch(app.panel.innerHTML, /<script>/);
  assert.deepEqual(app.state, before);
});

test('unsaved remark drafts survive switching students and never leak into another booking', () => {
  const app = renderer(), before = model.clone(app.state);
  app.call('selectScheduleBooking', 'lesson-a');
  app.note.value = 'Draft for Chloe';
  // Selecting the next student must capture even an edit whose input event was missed.
  app.call('selectScheduleBooking', 'lesson-b');
  assert.equal(app.ui.scheduleRemarkDrafts['lesson-a'], 'Draft for Chloe');
  assert.equal(app.note.value, 'Original Ethan remark');
  assert.doesNotMatch(app.panel.innerHTML, /Draft for Chloe/);
  app.note.value = 'Draft for Ethan';
  assert.equal(app.call('updateScheduleRemarkDraft', app.note), true);
  assert.equal(app.saveButton.disabled, false);
  app.call('selectScheduleBooking', 'lesson-a');
  assert.equal(app.note.value, 'Draft for Chloe');
  assert.match(app.panel.innerHTML, /Draft for Chloe/); assert.doesNotMatch(app.panel.innerHTML, /Draft for Ethan/);
  assert.equal(app.ui.scheduleRemarkDrafts['lesson-b'], 'Draft for Ethan');
  const staleInput = { id: 'schedule-booking-note', value: 'Wrong stale text', dataset: { bookingId: 'lesson-b' } };
  assert.equal(app.call('updateScheduleRemarkDraft', staleInput), false);
  assert.equal(app.ui.scheduleRemarkDrafts['lesson-b'], 'Draft for Ethan');
  assert.deepEqual(app.state, before); assert.equal(app.calls.persisted.length, 0);
});

test('saving a remark updates and persists only the selected lesson, clears its draft, and refreshes its chip', () => {
  const app = renderer();
  app.call('selectScheduleBooking', 'lesson-a');
  app.ui.scheduleRemarkDrafts['lesson-b'] = 'Keep Ethan draft';
  app.note.value = 'Updated Chloe remark'; app.call('updateScheduleRemarkDraft', app.note);
  const before = model.clone(app.state);
  app.call('saveScheduleRemark', 'lesson-b');
  assert.deepEqual(app.state, before); assert.equal(app.calls.persisted.length, 0);
  app.note.dataset.bookingId = 'lesson-b'; app.call('saveScheduleRemark', 'lesson-a');
  assert.deepEqual(app.state, before); assert.equal(app.calls.persisted.length, 0);
  app.note.dataset.bookingId = 'lesson-a';
  app.call('saveScheduleRemark', 'lesson-a');
  const expected = model.clone(before); expected.bookings[0].note = 'Updated Chloe remark';
  assert.deepEqual(app.state, expected); assert.deepEqual(app.calls.persisted, [expected]);
  assert.equal(Object.hasOwn(app.ui.scheduleRemarkDrafts, 'lesson-a'), false);
  assert.equal(app.ui.scheduleRemarkDrafts['lesson-b'], 'Keep Ethan draft');
  assert.deepEqual(app.calls.chips, [{ id: 'lesson-a', note: 'Updated Chloe remark', start: 960 }]);
  assert.match(app.panel.innerHTML, /Updated Chloe remark/);
  assert.equal(app.calls.modal.length, 0); assert.equal(app.calls.render, 0);
});

test('selection and remark writes are guarded by admin role, schedule page, and a valid selected booking', () => {
  const app = renderer(); app.call('selectScheduleBooking', 'lesson-a');
  app.note.value = 'Do not save this';
  const before = model.clone(app.state), renders = app.calls.rail;
  app.call('selectScheduleBooking', 'missing');
  for (const [role, page] of [['teacher', 'schedule'], ['parent', 'schedule'], ['admin', 'students']]) {
    app.ui.role = role; app.ui.page = page;
    app.call('selectScheduleBooking', 'lesson-b'); app.call('saveScheduleRemark', 'lesson-a');
    assert.equal(app.call('updateScheduleRemarkDraft', app.note), false);
    assert.equal(app.ui.scheduleBookingId, 'lesson-a');
  }
  assert.equal(app.calls.rail, renders); assert.equal(app.calls.persisted.length, 0); assert.deepEqual(app.state, before);
});

test('the schedule rail has no Move action for any booking status; teacher and directory clicks retain their existing dialogs', () => {
  const app = renderer();
  for (const status of ['scheduled', 'moved', 'absent', 'cancelled']) {
    app.state.bookings[0].status = status;
    app.call('selectScheduleBooking', 'lesson-a');
    assert.doesNotMatch(app.panel.innerHTML, /data-action="begin-move"/);
  }
  app.state.bookings[0].status = 'scheduled'; app.call('selectScheduleBooking', 'lesson-a');
  const before = model.clone(app.state), railCount = app.calls.rail;
  app.ui.role = 'teacher'; app.call('bookingDetail', 'lesson-a');
  assert.equal(app.calls.modal.at(-1)[0], 'Chloe Chan');
  assert.match(app.calls.modal.at(-1)[2], /data-action="open-calendar-class"/);
  app.ui.role = 'admin'; app.ui.page = 'students'; app.call('bookingDetail', 'lesson-b');
  assert.equal(app.calls.modal.at(-1)[0], 'Ethan Wong');
  assert.match(app.calls.modal.at(-1)[2], /data-action="save-booking-note"/);
  assert.equal(app.calls.modal.length, 2); assert.equal(app.calls.rail, railCount);
  assert.equal(app.calls.render, 0); assert.deepEqual(app.state, before);
});
