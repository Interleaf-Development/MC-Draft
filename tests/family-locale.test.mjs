import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as model from '../dist/model.js';
import { isFamilyRole, familyText, familyContent, familyDate } from '../dist/family-locale.js';
import { staffText, staffContent, staffDate } from '../dist/staff-locale.js';
import { canStudentOpenAssignment, canStudentEditAssignment } from '../dist/student-work.js';
import { renderStudentBinder } from '../dist/student-binder-ui.js';

const source = await readFile(new URL('../dist/app.js', import.meta.url), 'utf8');
const worksheetSource = source.slice(source.indexOf('function studentWork(){'), source.indexOf('let canvasObserver;'));
assert.ok(worksheetSource.includes('function worksheetPage(){'), 'Load the production worksheet renderers');
const statusSource = source.slice(source.indexOf('const assignmentStatus ='), source.indexOf('const thumbnail ='));

// Render the actual shared UI functions without booting DOM listeners or storage.
function renderer() {
  const ui = { role: 'student', familyStudent: 'chloe', selectedStudent: 'chloe', assignmentId: 'assignment-chloe-1', page: 'work', pen: 'pen', ink: '#35475f', readonly: false, showOriginal: false };
  const state = model.seed();
  const escape = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const context = vm.createContext({
    ...model, ui, state, isFamilyRole, canStudentOpenAssignment, canStudentEditAssignment, renderStudentBinder,
    t: (en, zh) => zh ?? staffText(en),
    content: value => staffContent(value), dateLabel: (date, options) => staffDate(date, options), esc: escape,
    heading: (title, actions = '') => '<h1>' + escape(title) + '</h1>' + actions,
    action: (name, label, cls = '', attrs = '') => '<button data-action="' + name + '" class="' + cls + '" ' + attrs + '>' + label + '</button>',
    icon: () => '', thumbnail: () => '', childSwitch: () => '', art: () => '',
    empty: (title, message) => '<h3>' + escape(title) + '</h3><p>' + escape(message) + '</p>',
    tag: text => '<span>' + escape(text) + '</span>'
  });
  vm.runInContext(statusSource + worksheetSource, context);
  return { ui, state, render: () => vm.runInContext('worksheetPage()', context), cards: () => vm.runInContext('studentWork()', context) };
}

test('family locale formats actual lesson dates, tuition periods, levels and statuses without changing staff language', () => {
  for (const role of ['parent', 'student']) {
    assert.ok(isFamilyRole(role));
    assert.equal(familyText('P3', role), '小三');
    assert.equal(familyText('Ready to mark', role), '待老師批改');
    assert.equal(familyContent('Oct–Nov 2026', role), '2026 年 10 至 11 月');
    assert.match(familyDate(model.TODAY, role, true), /2026.*9.*30/);
    assert.match(familyDate(model.TODAY, role, { weekday: 'long', day: undefined, month: undefined }), /星期三/);
    assert.equal(familyDate('', role), '—');
  }
  for (const role of ['teacher', 'admin']) {
    assert.equal(isFamilyRole(role), false);
    assert.equal(familyText('P3', role), 'P3');
    assert.equal(familyText('Ready to mark', role), 'Ready to mark');
    assert.equal(familyContent('Oct–Nov 2026', role), 'Oct–Nov 2026');
    assert.equal(familyDate(model.TODAY, role, true), '30 September 2026');
  }
});

test('the same worksheet renders Chinese for students and parents, and staff', () => {
  const app = renderer(), before = JSON.stringify(app.state);
  for (const role of ['student', 'parent', 'teacher']) {
    app.ui.role = role; app.ui.readonly = role === 'parent';
    const html = app.render();
    if (['student','parent','teacher'].includes(role)) {
      assert.match(html, /等值分數/); assert.match(html, /小三/); assert.match(html, /姓名：Chloe Chan/);
      assert.match(html, /完成以下等值分數。/); assert.match(html, /解題步驟/);
      assert.doesNotMatch(html, /Complete the equivalent fractions\.|Written working/);
    }
    if (role === 'teacher') assert.match(html, /老師評語/);
    if (role === 'student') {
      assert.match(html, /data-action="submit-work"[^>]*>\s*交給老師/);
      assert.match(html, /aria-label="移動頁面"/);
    } else if (role === 'parent') {
      assert.match(html, /工作紙預覽/); assert.doesNotMatch(html, /data-action="submit-work"/);
      assert.match(html, /id="student-working" readonly/);
    }
  }
  assert.equal(JSON.stringify(app.state), before);
});

test('worksheet questions across the seeded curriculum are translated without changing worksheet identity', () => {
  const app = renderer(), assignment = app.state.assignments.find(item => item.id === app.ui.assignmentId);
  for (const [worksheetId, chinese, english] of [
    ['division-01', '並用乘法驗算', 'Check your answer with multiplication'],
    ['decimals-01', '把二分之一寫成小數', 'Write one half as a decimal'],
    ['words-01', '應找回多少錢', 'How much change should she receive'],
    ['numbers-01', '依照規律填上數字', 'Continue the pattern']
  ]) {
    assignment.worksheetId = worksheetId;
    const before = JSON.stringify(app.state), worksheet = model.worksheetById(worksheetId);
    app.ui.role = 'student'; assert.ok(app.render().includes(chinese)); assert.ok(app.render().includes(worksheet.code));
    app.ui.role = 'teacher'; assert.ok(app.render().includes(chinese));
    assert.equal(JSON.stringify(app.state), before);
  }
});

test('only known seed feedback is translated; copied/custom teacher notes and student answers stay verbatim', () => {
  const app = renderer(); app.ui.assignmentId = 'assignment-lucas'; app.ui.familyStudent = 'lucas';
  assert.match(app.render(), /請列出第 2 題的計算步驟。/);
  const seedAssignment = app.state.assignments.find(item => item.id === app.ui.assignmentId);
  const custom = { ...structuredClone(seedAssignment), id: 'new-teacher-assignment', working: 'Equivalent fractions: 1 < 2 & 3 > 2', submissions: [{ working: 'Number patterns', strokes: [], date: model.TODAY }] };
  app.state.assignments.push(custom); app.ui.assignmentId = custom.id;
  const before = JSON.stringify(app.state);
  for (const role of ['student', 'parent']) {
    app.ui.role = role;
    const html = app.render();
    assert.match(html, /Please show your working for question 2\./);
    assert.doesNotMatch(html, /請列出第 2 題的計算步驟。/);
    assert.match(html, /Equivalent fractions: 1 &lt; 2 &amp; 3 &gt; 2/);
    app.ui.showOriginal = true;
    assert.match(app.render(), /<textarea[^>]*>Number patterns<\/textarea>/);
    app.ui.showOriginal = false;
  }
  assert.equal(JSON.stringify(app.state), before);
  seedAssignment.note = 'Please keep my new note <unchanged>.'; app.ui.assignmentId = seedAssignment.id;
  assert.match(app.render(), /Please keep my new note &lt;unchanged&gt;\./);
  assert.equal(seedAssignment.note, 'Please keep my new note <unchanged>.');
});

test('student binder uses Chinese worksheet cues and keeps operational IDs intact', () => {
  const app = renderer(), assignment = app.state.assignments.find(item => item.id === app.ui.assignmentId);
  assignment.status = 'submitted'; const before = JSON.stringify(app.state);
  const html = app.cards();
  assert.match(html, /交給老師了/); assert.match(html, /看看已交的功課/); assert.match(html, /家課/);
  for (const label of ['做好了', '現在做', '稍後做']) assert.ok(html.includes(label));
  assert.ok(html.includes('data-id="' + assignment.id + '"')); assert.ok(html.includes('data-action="open-assignment"'));
  app.ui.page = 'past'; assert.match(app.cards(), /數字規律/);
  assert.equal(JSON.stringify(app.state), before);
});
