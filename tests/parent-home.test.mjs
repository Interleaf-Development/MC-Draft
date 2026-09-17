import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as model from '../dist/model.js';
import { familyText, familyContent, familyDate } from '../dist/family-locale.js';

const source = await readFile(new URL('../dist/app.js', import.meta.url), 'utf8');

// Load production renderers without starting the application's DOM event loop.
function functionSource(name) {
  const start = source.indexOf('function ' + name + '(');
  assert.notEqual(start, -1, 'Production function exists: ' + name);
  const tail = source.slice(start + 1);
  const next = tail.search(/\n(?:function |const |let |document\.)/);
  return source.slice(start, next === -1 ? undefined : start + 1 + next);
}

function renderer() {
  const state = model.seed();
  const ui = { role: 'parent', page: 'overview', familyStudent: 'chloe', selectedStudent: 'chloe', assignmentId: null, readonly: false, showOriginal: false, pen: 'pen', ink: '#35475f' };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const context = vm.createContext({
    ...model, state, ui,
    t: (en, zh) => zh ?? familyText(en, ui.role),
    content: value => familyContent(value, ui.role),
    dateLabel: (date, options) => familyDate(date, ui.role, options),
    familyDate, esc,
    heading: (title, actions = '') => '<h1>' + esc(title) + '</h1>' + actions,
    action: (name, label, cls = '', attrs = '') => '<button data-action="' + name + '" class="' + cls + '" ' + attrs + '>' + label + '</button>',
    icon: name => '<span aria-hidden="true" data-icon="' + name + '"></span>', art: () => '', avatar: () => '', thumbnail: () => '', childSwitch: () => '',
    empty: (title, message) => '<h3>' + esc(title) + '</h3><p>' + esc(message) + '</p>',
    tag: label => '<span>' + esc(label) + '</span>',
    tutorName: id => model.tutors.find(tutor => tutor.id === id)?.name || 'Unassigned'
  });
  const statusSource = source.slice(source.indexOf('const assignmentStatus ='), source.indexOf('const thumbnail ='));
  const names = ['nextLessons', 'lessonRow', 'noteCard', 'assessmentOverview', 'assignmentRow', 'parentLessonGroups', 'parentOverview', 'parentHomework', 'parentBottomNav', 'fraction', 'paperQuestions', 'currentAssignment', 'canDraw', 'worksheetPage'];
  vm.runInContext(statusSource + '\n' + names.map(functionSource).join('\n'), context);
  return { state, ui, call: (name, ...args) => context[name](...args) };
}

const booking = (id, date, start, extra = {}) => ({ id, studentId: 'chloe', date, start, duration: 60, tutor: 'chan', status: 'scheduled', attendance: 'unmarked', ...extra });
const plain = value => JSON.parse(JSON.stringify(value));

test('Parent home groups only this child’s active lessons from today through day six', () => {
  const app = renderer();
  app.state.bookings = [
    booking('last-day', '2026-10-06', 960),
    booking('next-week', '2026-10-07', 960),
    booking('today-late', model.TODAY, 1020),
    booking('yesterday', '2026-09-29', 960),
    booking('other-child', model.TODAY, 960, { studentId: 'mia' }),
    booking('cancelled', model.TODAY, 900, { status: 'cancelled' }),
    booking('moved-source', model.TODAY, 840, { status: 'moved' }),
    booking('absent-source', model.TODAY, 780, { status: 'absent' }),
    booking('today-early', model.TODAY, 960)
  ];
  const before = model.clone(app.state);
  const groups = plain(app.call('parentLessonGroups', 'chloe'));
  assert.deepEqual(groups.map(group => group.date), [model.TODAY, '2026-10-06']);
  assert.deepEqual(groups.map(group => group.lessons.map(lesson => lesson.id)), [['today-early', 'today-late'], ['last-day']]);
  assert.deepEqual(app.state, before, 'Rendering must not reorder or rewrite shared bookings');
});

test('same-day split make-ups remain separate from the regular lesson and checked-in lessons remain visible', () => {
  const app = renderer();
  app.state.bookings = [
    booking('extension-two', '2026-10-06', 1020, { duration: 30, sourceId: 'old-lesson', caseId: 'split' }),
    booking('extension-one', model.TODAY, 1020, { duration: 30, sourceId: 'old-lesson', caseId: 'split' }),
    booking('regular', model.TODAY, 960, { attendance: 'present' }),
    booking('old-lesson', model.TODAY, 900, { status: 'moved' })
  ];
  const groups = plain(app.call('parentLessonGroups', 'chloe'));
  assert.deepEqual(groups.map(group => group.lessons.map(lesson => lesson.id)), [['regular', 'extension-one'], ['extension-two']]);
  assert.equal(groups[0].lessons[0].attendance, 'present');
  assert.equal(groups[0].lessons[1].duration, 30);
  assert.equal(groups[1].lessons[0].sourceId, 'old-lesson');
});

test('the Parent home keeps usable report, homework and timetable routes with a central check-in action', () => {
  const app = renderer(), before = model.clone(app.state);
  const home = app.call('parentOverview');
  for (const page of ['lessons', 'handbook', 'homework']) assert.match(home, new RegExp('data-page="' + page + '"'));
  const navigation = app.call('parentBottomNav');
  assert.deepEqual([...navigation.matchAll(/data-page="([^"]+)"/g)].map(match => match[1]), ['overview', 'lessons', 'messages', 'payments']);
  assert.equal([...navigation.matchAll(/data-action="show-checkin"/g)].length, 1);
  const actionOrder = [...navigation.matchAll(/data-action="([^"]+)"/g)].map(match => match[1]);
  assert.equal(actionOrder.indexOf('show-checkin'), 2);
  assert.deepEqual(app.state, before);
});

test('Parent homework includes assigned homework and excludes classroom work and another child’s work', () => {
  const app = renderer(), example = app.state.assignments.find(item => item.id === 'assignment-chloe-2');
  app.state.assignments.push(
    { ...model.clone(example), id: 'other-child-homework', studentId: 'mia' },
    { ...model.clone(example), id: 'classroom-work', homework: false },
    { ...model.clone(example), id: 'unclassified-work', homework: undefined },
    { ...model.clone(example), id: 'nonboolean-work', homework: 'true' }
  );
  const before = model.clone(app.state), html = app.call('parentHomework');
  assert.match(html, /data-id="assignment-chloe-2"/);
  assert.match(html, /data-readonly="true"/);
  for (const id of ['assignment-chloe-1', 'assignment-chloe-3', 'other-child-homework', 'classroom-work', 'unclassified-work', 'nonboolean-work']) assert.ok(!html.includes('data-id="' + id + '"'), id);
  assert.deepEqual(app.state, before);
  app.ui.assignmentId = example.id; app.ui.page = 'worksheet';
  // Parent role must remain read-only even if the optional UI flag was not set.
  app.ui.readonly = false;
  assert.equal(app.call('canDraw'), false);
  const worksheet = app.call('worksheetPage');
  assert.match(worksheet, /id="student-working" readonly/);
  assert.match(worksheet, /pointer-events:none/);
  assert.doesNotMatch(worksheet, /data-action="(?:submit-work|pen-tool|undo-ink|complete-work)"/);
  assert.deepEqual(app.state, before);
});

test('Mia’s assessment and enrolment remain available before she has regular lessons or homework', () => {
  const app = renderer(); app.ui.familyStudent = 'mia';
  const before = model.clone(app.state), home = app.call('parentOverview');
  assert.match(home, /入學評估報告/);
  assert.match(home, /data-action="enrol-mia"/);
  assert.deepEqual(plain(app.call('parentLessonGroups', 'mia')), []);
  assert.doesNotMatch(app.call('parentHomework'), /data-action="open-assignment"/);
  assert.deepEqual(app.state, before);
  app.state.assessment.enrolled = true;
  app.state.bookings.push(booking('mia-first', model.TODAY, 1020, { studentId: 'mia' }));
  const enrolledHome = app.call('parentOverview');
  assert.doesNotMatch(enrolledHome, /data-action="enrol-mia"/);
  assert.match(enrolledHome, /data-page="lessons"/);
  assert.deepEqual(plain(app.call('parentLessonGroups', 'mia')).flatMap(group => group.lessons.map(lesson => lesson.id)), ['mia-first']);
});

test('home lesson cards remain read-only and confirmed leave disappears from upcoming lessons immediately', () => {
  const app = renderer();
  app.state.bookings = [
    booking('today', model.TODAY, 960, { attendance: 'present' }),
    booking('future', '2026-10-02', 960),
    booking('cancelled', model.TODAY, 960, { status: 'cancelled' }),
    booking('other-child', model.TODAY, 960, { studentId: 'mia' })
  ];
  const request = model.requestAbsence(app.state, 'future', 'School activity');
  assert.equal(request.status, 'confirmed');
  assert.equal(app.state.bookings.find(item => item.id === 'future').status, 'absent');
  const before = model.clone(app.state), home = app.call('parentOverview');
  const cards = [...home.matchAll(/<article class="parent-day-card">([\s\S]*?)<\/article>/g)].map(match => match[1]);
  assert.equal(cards.length, 1);
  assert.match(cards[0], /已登記出席/);
  assert.deepEqual(plain(app.call('parentLessonGroups', 'chloe')).flatMap(group => group.lessons.map(lesson => lesson.id)), ['today']);
  assert.doesNotMatch(home, /請假待確認/);
  for (const card of cards) {
    assert.match(card, /16:00–17:00/);
    assert.match(card, /數學/);
    assert.doesNotMatch(card, /<(?:button|a)\b|data-action=|tabindex=|role="button"|data-icon="right"/);
  }
  assert.doesNotMatch(home, /data-action="(?:parent-lesson|request-leave|show-lesson-checkin)"/);
  assert.deepEqual(app.state, before);
});
