import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createDemoContext, DEMO_PAGES, demoNavigationFromUrl, proposalEntryUrl, proposalMessage, validateDemoNavigation } from '../dist/demo-context.js';
import { entryUrl } from '../dist/entry-points.js';
import * as model from '../dist/model.js';
import { getP6Students, assignP6Worksheets, normalizeP6Progress } from '../dist/teacher-progress.js';
import { canStudentOpenAssignment } from '../dist/student-work.js';
import { normalizeBillingAutomation, submitPaymentProof } from '../dist/billing-automation.js';
import { normalizeBillingWorkflow, billingStage } from '../dist/billing-workflow.js';

const url = path => new URL(path, 'https://demo.example');
const students = model.allStudents.map(student => student.id);
const key = 'mathconcept-demo-v4';
const memory = () => {
  const values = new Map();
  return { values, getItem: name => values.get(name) ?? null, setItem: (name, value) => values.set(name, value) };
};
const context = (path, local, session) => createDemoContext({ url: url(path), getLocalStorage: () => local, getSessionStorage: () => session });

test('proposal contexts never access ordinary storage, even when sessionStorage fails', () => {
  const session = memory();
  const proposal = createDemoContext({
    url: url('/?proposal=1'),
    getLocalStorage() { assert.fail('Proposal accessed ordinary localStorage'); },
    getSessionStorage: () => session
  });
  assert.equal(proposal.storage.getItem(key), null);
  proposal.storage.setItem(key, 'isolated');
  assert.equal(session.getItem('mathconcept-proposal-v1:' + key), 'isolated');
  const blocked = createDemoContext({
    url: url('/?proposal=1'),
    getLocalStorage() { assert.fail('No fallback to ordinary localStorage'); },
    getSessionStorage() { throw new Error('Storage disabled'); }
  });
  assert.throws(() => blocked.storage.getItem(key), /Storage disabled/);
  assert.throws(() => blocked.storage.setItem(key, 'saved'), /Storage disabled/);
});

test('ordinary data, branch data and different proposal sessions remain separate', () => {
  const local = memory(), session = memory(), otherSession = memory();
  local.setItem(key, 'existing ordinary demo');
  for (const path of ['/', '/?proposal=0', '/?proposal=true', '/?proposal=01']) {
    const ordinary = context(path, local, session);
    assert.equal(ordinary.isProposal, false);
    assert.equal(ordinary.storage.getItem(key), 'existing ordinary demo');
  }
  const proposal = context('/?proposal=1', local, session);
  proposal.storage.setItem(key, 'Tsuen Wan edits');
  proposal.storage.setItem('mathconcept-demo-hh-v4', 'Hang Hau edits');
  assert.equal(context('/student/?proposal=1', local, session).storage.getItem(key), 'Tsuen Wan edits');
  assert.equal(context('/hh/parent/?proposal=1', local, session).storage.getItem('mathconcept-demo-hh-v4'), 'Hang Hau edits');
  assert.equal(context('/?proposal=1', local, otherSession).storage.getItem(key), null);
  assert.equal(local.getItem(key), 'existing ordinary demo');
  context('/', local, session).storage.setItem(key, 'ordinary update');
  assert.equal(proposal.storage.getItem(key), 'Tsuen Wan edits');
});

test('URL bootstrap allows only a page belonging to its role and known student IDs', () => {
  for (const [role, pages] of Object.entries(DEMO_PAGES)) {
    for (const page of pages) assert.deepEqual(demoNavigationFromUrl(url('/?role=' + role + '&page=' + page), students), { role, page });
  }
  assert.deepEqual(demoNavigationFromUrl(url('/student/?proposal=1&role=admin&page=billing&studentId=chloe'), students), { role: 'student', page: 'work', studentId: 'chloe' });
  assert.deepEqual(demoNavigationFromUrl(url('/parent/?page=payments'), students), { role: 'parent', page: 'payments' });
  for (const page of ['worksheet', '__proto__', 'constructor', '<script>', 'unknown']) {
    assert.deepEqual(demoNavigationFromUrl(url('/?role=teacher&page=' + encodeURIComponent(page) + '&studentId=unknown'), students), { role: 'teacher', page: 'progress' });
  }
});

test('refreshable proposal role URLs keep the namespace, page and branch', () => {
  for (const branch of ['/', '/hh/']) {
    for (const [role, pages] of Object.entries(DEMO_PAGES)) {
      const result = proposalEntryUrl(role, pages.at(-1), url(branch + '?proposal=1&pass=demo#chapter'), 'chloe');
      assert.equal(url(result).searchParams.get('proposal'), '1');
      assert.equal(url(result).searchParams.get('pass'), 'demo');
      assert.equal(url(result).hash, '#chapter');
      assert.ok(result.startsWith(branch));
      assert.deepEqual(demoNavigationFromUrl(url(result), students), { role, page: pages.at(-1) });
      assert.equal(entryUrl(role, url(result)), result, 'syncEntryPoint preserves the proposal query');
    }
  }
  const worksheet = proposalEntryUrl('student', 'worksheet', url('/student/?proposal=1&page=past&studentId=mia'), 'chloe');
  assert.deepEqual(demoNavigationFromUrl(url(worksheet), students), { role: 'student', page: 'work', studentId: 'chloe' });
});

test('parent navigation rejects wrong sources, origins, roles, pages and students', () => {
  const parent = {}, self = {}, options = { isProposal: true, parent, self, origin: url('/').origin, studentIds: students };
  const event = { source: parent, origin: options.origin, data: { type: 'mc-proposal:navigate', role: 'parent', page: 'lessons', studentId: 'chloe' } };
  assert.deepEqual(proposalMessage(event, options), { type: 'navigate', role: 'parent', page: 'lessons', studentId: 'chloe' });
  assert.deepEqual(proposalMessage({ ...event, data: { type: 'mc-proposal:refresh' } }, options), { type: 'refresh' });
  for (const override of [{ source: self }, { source: null }, { origin: 'https://elsewhere.example' }, { data: null }]) assert.equal(proposalMessage({ ...event, ...override }, options), null);
  assert.equal(proposalMessage(event, { ...options, isProposal: false }), null);
  assert.equal(proposalMessage(event, { ...options, self: parent }), null);
  for (const invalid of [{ role: 'hq' }, { role: '__proto__' }, { role: 'constructor' }, { role: 'student', page: 'billing' }, { role: 'teacher', page: 'worksheet' }, { role: 'admin', studentId: 'unknown' }, { role: 'parent', studentId: null }, { role: 'teacher', page: '' }]) {
    assert.equal(validateDemoNavigation(invalid, students), null);
    assert.equal(proposalMessage({ ...event, data: { type: 'mc-proposal:navigate', ...invalid } }, options), null);
  }
});

test('actual assignments, parent leave and payment proof survive proposal view changes without affecting ordinary data', () => {
  const local = memory(), session = memory();
  local.setItem(key, JSON.stringify({ version: 4, marker: 'ordinary saved work' }));
  const teacher = context('/?proposal=1&role=teacher&page=progress', local, session);
  const state = normalizeBillingWorkflow(normalizeBillingAutomation(model.seed()));
  normalizeP6Progress(state);
  const student = getP6Students(state)[0];
  const { assigned: [assignment] } = assignP6Worksheets(state, { studentId: student.id, worksheetIds: ['p6-math-603-P'] });
  teacher.storage.setItem(key, JSON.stringify(state));
  const studentView = context('/student/?proposal=1', local, session);
  const studentState = JSON.parse(studentView.storage.getItem(key));
  assert.equal(studentState.demoWorksheetStudent, student.id);
  assert.equal(canStudentOpenAssignment(studentState.assignments.find(item => item.id === assignment.id), student.id), true);
  const parent = context('/parent/?proposal=1&page=lessons', local, session);
  const parentState = JSON.parse(parent.storage.getItem(key));
  const lesson = parentState.bookings.find(booking => booking.studentId === 'chloe' && booking.date >= model.TODAY && model.activeBooking(booking) && booking.attendance !== 'present');
  const leave = model.requestAbsence(parentState, lesson.id, 'School activity');
  const proof = submitPaymentProof(parentState, 'INV-1024', { scenario: 'pass', reference: 'FPS 910277', paymentDate: '2026-09-30', payerName: 'Elaine Chan', paymentMethod: 'fps' });
  parent.storage.setItem(key, JSON.stringify(parentState));
  const admin = context('/?proposal=1&page=billing', local, session);
  const adminState = JSON.parse(admin.storage.getItem(key));
  assert.ok(adminState.makeups.some(item => item.id === leave.makeupId));
  assert.ok(adminState.leaveRequests.some(item => item.sourceId === lesson.id || item.bookingId === lesson.id));
  assert.equal(billingStage(adminState, adminState.invoices.find(item => item.id === proof.invoice.id)), 'issued');
  assert.ok(adminState.receipts.some(item => item.id === proof.receipt.id));
  assert.deepEqual(JSON.parse(local.getItem(key)), { version: 4, marker: 'ordinary saved work' });
});

test('app refresh defers during dialogs and worksheet editing, then loads the latest session state', async () => {
  const source = await readFile(new URL('../dist/app.js', import.meta.url), 'utf8');
  const refresh = source.slice(source.indexOf('function refreshProposalState('), source.indexOf('function postProposalStatus('));
  let saved = JSON.stringify({ version: 4, marker: 'new', demoWorksheetStudent: 'chloe' });
  let follows = 0;
  const overlay = { children: [{}] }, ui = { role: 'student', page: 'work', proposalRefreshPending: false };
  const noOp = () => {};
  const resettable = { reset: noOp };
  const scope = {
    demoContext: { isProposal: true }, state: { version: 4, marker: 'old' }, ui, previousState: {},
    localStorage: { getItem: () => saved }, STORAGE: key, $: () => overlay,
    seedCentreVolume: noOp, seedTeacherSchedules: noOp, seedBusyAfternoons: noOp, normalizeParentLeave: noOp, normalizeStaffLeave: noOp, normalizeConversations: noOp, normalizeBillingAutomation: noOp, normalizeBillingWorkflow: noOp, normalizeP6Progress: noOp, normalizeTwnSchedule: noOp,
    conversationUI: resettable, bankCheckUI: resettable, billingWorkflowUI: resettable, regularScheduleUI: resettable, teacherProgressUI: resettable,
    followProposalStudent() { follows++; }
  };
  const sandbox = vm.createContext(scope);
  vm.runInContext(refresh, sandbox);
  assert.equal(sandbox.refreshProposalState(), false);
  assert.equal(sandbox.state.marker, 'old');
  assert.equal(sandbox.ui.proposalRefreshPending, true);
  overlay.children = []; ui.page = 'worksheet';
  assert.equal(sandbox.refreshProposalState(), false);
  assert.equal(sandbox.state.marker, 'old');
  ui.page = 'work';
  assert.equal(sandbox.refreshProposalState(), true);
  assert.equal(sandbox.state.marker, 'new');
  assert.equal(sandbox.previousState, null);
  assert.equal(sandbox.ui.proposalRefreshPending, false);
  assert.equal(follows, 1, 'The new saved selection is applied to the visible role');
  assert.equal(sandbox.refreshProposalState(), false, 'Unchanged saved data does not discard view state');
  saved = '{broken';
  assert.equal(sandbox.refreshProposalState(true), false);
  assert.equal(sandbox.state.marker, 'new', 'Bad saved JSON preserves current state');
});
