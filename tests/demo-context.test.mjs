import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createDemoContext, DEMO_PAGES, demoNavigationFromUrl, proposalEntryUrl, proposalMessage, validateDemoNavigation } from '../dist/demo-context.js';
import { entryUrl } from '../dist/entry-points.js';
import * as model from '../dist/model.js';
import { getP6Students, assignP6Worksheets, normalizeP6Progress } from '../dist/teacher-progress.js';
import { canStudentOpenAssignment } from '../dist/student-work.js';
import { createTeacherProgressUI } from '../dist/teacher-progress-ui.js';
import { normalizeBillingAutomation, submitPaymentProof } from '../dist/billing-automation.js';
import { normalizeBillingWorkflow, billingStage, confirmInvoicePayment } from '../dist/billing-workflow.js';

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

test('only explicitly preloaded proposal frames start inactive', () => {
  const local = memory(), session = memory();
  assert.equal(context('/?proposal=1&proposalPreload=1', local, session).isPreloading, true);
  for (const path of ['/', '/?proposalPreload=1', '/?proposal=1', '/?proposal=1&proposalPreload=0']) {
    assert.equal(context(path, local, session).isPreloading, false);
  }
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
  for (const type of ['activate', 'deactivate']) {
    const activation = { ...event, data: { type: 'mc-proposal:' + type } };
    assert.deepEqual(proposalMessage(activation, options), { type });
    assert.equal(proposalMessage({ ...activation, source: self }, options), null);
    assert.equal(proposalMessage({ ...activation, origin: 'https://elsewhere.example' }, options), null);
    assert.equal(proposalMessage(activation, { ...options, isProposal: false }), null);
  }
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
  assert.equal(billingStage(adminState, adminState.invoices.find(item => item.id === proof.invoice.id)), 'review');
  assert.equal(proof.receipt, null);
  const approved = confirmInvoicePayment(adminState, proof.invoice.id);
  admin.storage.setItem(key, JSON.stringify(adminState));
  assert.equal(billingStage(adminState, approved.invoice), 'issued');
  assert.ok(JSON.parse(parent.storage.getItem(key)).receipts.some(item => item.id === approved.receipt.id));
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
    seedCentreVolume: noOp, seedTeacherSchedules: noOp, seedBusyAfternoons: noOp, normalizeParentLeave: noOp, normalizeStaffLeave: noOp, normalizeConversations: noOp, normalizeBillingAutomation: noOp, normalizeBillingWorkflow: noOp, normalizeP6Progress: noOp, normalizeTwnSchedule: noOp, runTuitionBilling: noOp,
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

async function proposalFrameHarness(state, ui = {}) {
  const source = await readFile(new URL('../dist/app.js', import.meta.url), 'utf8');
  const lifecycle = source.slice(source.indexOf('function persistProposalStudentSelection('), source.indexOf('function postProposalStatus('));
  let saved = JSON.stringify(state);
  const counts = { saves: 0, renders: 0, statuses: 0, closes: 0 };
  const statusTypes = [];
  const overlay = { children: [] };
  const noOp = () => {};
  const scope = {
    demoContext: { isProposal: true }, proposalIsActive: false,
    students: model.allStudents, state, previousState: {},
    ui: { role: 'student', page: 'work', selectedStudent: 'chloe', familyStudent: 'chloe', ...ui },
    localStorage: { getItem: () => saved }, STORAGE: key, $: () => overlay,
    seedCentreVolume: noOp, seedTeacherSchedules: noOp, seedBusyAfternoons: noOp, normalizeParentLeave: noOp, normalizeStaffLeave: noOp, normalizeConversations: noOp, normalizeBillingAutomation: noOp, normalizeBillingWorkflow: noOp, normalizeP6Progress: noOp, normalizeTwnSchedule: noOp, runTuitionBilling: noOp,
    conversationUI: { reset: noOp }, bankCheckUI: { reset: noOp }, billingWorkflowUI: { reset: noOp }, regularScheduleUI: { reset: noOp }, teacherProgressUI: { reset: noOp, selectStudent: noOp },
    persist() { counts.saves++; saved = JSON.stringify(scope.state); },
    closeModal() { counts.closes++; overlay.children = []; },
    render() { counts.renders++; scope.postProposalStatus(); },
    postProposalStatus(type = 'mc-proposal:state') { counts.statuses++; statusTypes.push(type); }
  };
  const sandbox = vm.createContext(scope);
  vm.runInContext(lifecycle, sandbox);
  return { sandbox, counts, statusTypes, overlay, saveSiblingState(next) { saved = typeof next === 'string' ? next : JSON.stringify(next); }, readSaved() { return JSON.parse(saved); } };
}

test('preloaded teacher selection changes only its preview until the frame becomes active', async () => {
  const state = model.seed();
  state.demoWorksheetStudent = 'mia';
  const { sandbox, counts, readSaved } = await proposalFrameHarness(state, { role: 'teacher', page: 'progress' });
  const teacher = createTeacherProgressUI({
    getState: () => sandbox.state, getTutorId: () => model.centre.managerId,
    onStudentChange(id) { sandbox.ui.selectedStudent = id; sandbox.persistProposalStudentSelection(id); }
  });
  assert.equal(teacher.selectStudent('chloe'), true);
  sandbox.followProposalStudent('chloe');
  assert.equal(sandbox.ui.selectedStudent, 'chloe');
  assert.equal(sandbox.ui.familyStudent, 'chloe');
  assert.equal(sandbox.state.demoWorksheetStudent, 'mia');
  assert.equal(readSaved().demoWorksheetStudent, 'mia');
  assert.equal(counts.saves, 0, 'Background rendering cannot overwrite the shared selected pupil');
  sandbox.activateProposalFrame();
  assert.equal(sandbox.proposalIsActive, true);
  assert.equal(readSaved().demoWorksheetStudent, 'chloe');
  assert.equal(counts.saves, 1);
  assert.equal(counts.statuses, 1, 'Activation acknowledges once');
});

test('reactivating a retained frame keeps current editing UI when shared data is unchanged', async () => {
  const { sandbox, counts, overlay } = await proposalFrameHarness(
    { version: 4, demoWorksheetStudent: 'chloe' },
    { page: 'worksheet', assignmentId: 'work-1', moveId: 'lesson-1', expanded: true }
  );
  overlay.children = [{}];
  sandbox.activateProposalFrame();
  assert.equal(sandbox.ui.page, 'worksheet');
  assert.equal(sandbox.ui.assignmentId, 'work-1');
  assert.equal(sandbox.ui.moveId, 'lesson-1');
  assert.equal(overlay.children.length, 1);
  assert.deepEqual(counts, { saves: 0, renders: 0, statuses: 1, closes: 0 });
});

test('activation refreshes sibling changes before a stale modal, worksheet or move can save', async () => {
  for (const role of ['teacher', 'student']) {
    const { sandbox, counts, overlay, saveSiblingState, readSaved } = await proposalFrameHarness(
      { version: 4, marker: 'old', demoWorksheetStudent: 'chloe', assignments: [] },
      { role, page: 'worksheet', assignmentId: 'old-work', moveId: 'old-move', expanded: true, workNotes: true, proposalRefreshPending: true }
    );
    overlay.children = [{}];
    saveSiblingState({ version: 4, marker: 'new', demoWorksheetStudent: 'mia', assignments: [{ id: 'new-assignment' }] });
    sandbox.activateProposalFrame();
    assert.equal(sandbox.ui.page, role === 'teacher' ? 'progress' : 'work');
    assert.equal(sandbox.ui.assignmentId, null);
    assert.equal(sandbox.ui.moveId, null);
    assert.equal(sandbox.ui.expanded, false);
    assert.equal(sandbox.ui.workNotes, false);
    assert.equal(sandbox.ui.proposalRefreshPending, false);
    assert.equal(sandbox.ui.familyStudent, 'mia');
    assert.equal(sandbox.state.marker, 'new');
    assert.equal(overlay.children.length, 0);
    assert.deepEqual(counts, { saves: 0, renders: 1, statuses: 1, closes: 1 });
    sandbox.state.note = 'Later edit';
    sandbox.persist();
    assert.deepEqual(readSaved().assignments, [{ id: 'new-assignment' }], 'A subsequent save retains the sibling assignment');
  }
});

test('invalid shared data does not discard an open edit during activation', async () => {
  const { sandbox, counts, overlay, saveSiblingState } = await proposalFrameHarness(
    { version: 4, demoWorksheetStudent: 'chloe' }, { page: 'worksheet', assignmentId: 'work-1' }
  );
  overlay.children = [{}];
  saveSiblingState('{broken');
  sandbox.activateProposalFrame();
  assert.equal(sandbox.ui.page, 'worksheet');
  assert.equal(sandbox.ui.assignmentId, 'work-1');
  assert.equal(counts.closes, 0);
  assert.equal(counts.statuses, 1);
});

test('real input in an inactive inline frame refreshes it before interaction and notifies its parent', async () => {
  const { sandbox, counts, statusTypes, saveSiblingState } = await proposalFrameHarness({ version: 4, demoWorksheetStudent: 'chloe', marker: 'old' });
  saveSiblingState({ version: 4, demoWorksheetStudent: 'chloe', marker: 'new' });
  sandbox.activateProposalInteraction({ isTrusted: false });
  assert.equal(sandbox.proposalIsActive, false, 'Programmatic input and startup scripts do not activate background scenes');
  assert.equal(counts.statuses, 0);
  sandbox.activateProposalInteraction({ isTrusted: true });
  assert.equal(sandbox.proposalIsActive, true);
  assert.equal(sandbox.state.marker, 'new');
  assert.deepEqual(statusTypes, ['mc-proposal:state', 'mc-proposal:focused']);
  sandbox.activateProposalInteraction({ isTrusted: true });
  assert.equal(counts.statuses, 2, 'Later input in the same scene does not repeat activation');
});

test('parent demo keeps its child across views and sibling refreshes, with a round trip to the initial child', async () => {
  const source = await readFile(new URL('../dist/app.js', import.meta.url), 'utf8');
  const initialChild = 'twn-c64262b4d67d';
  const { sandbox, counts, saveSiblingState, readSaved } = await proposalFrameHarness(
    { version: 4, demoWorksheetStudent: 'mia', marker: 'initial', assessment: { enrolled: false } },
    { role: 'parent', page: 'overview' }
  );
  const host = {}, messages = [];
  let onMessage;
  Object.assign(sandbox, {
    window: { parent: host, addEventListener(type, callback) { if (type === 'message') onMessage = callback; } },
    location: { origin: url('/').origin },
    proposalMessage,
    requestedNavigation: { role: 'parent', studentId: initialChild },
    studentById: model.studentById,
    t: (value, chinese) => chinese || value,
    esc: value => String(value),
    target: { value: 'chloe' }, type: 'family-student'
  });
  host.postMessage = message => messages.push(message);
  sandbox.billingWorkflowUI.isSaving = () => false;
  vm.runInContext(source.slice(source.indexOf('function postProposalStatus('), source.indexOf('// A neighbouring inline scene')), sandbox);
  vm.runInContext(source.slice(source.indexOf("window.addEventListener('message',event=>{"), source.indexOf("if(demoContext.isProposal&&ui.role==='teacher')teacherProgressUI.selectStudent")), sandbox);
  vm.runInContext(source.slice(source.indexOf('const childSwitch=()=>{'), source.indexOf('function nextLessons(')), sandbox);
  const childChange = source.slice(source.indexOf(" else if(type==='family-student')"), source.indexOf(" else if(type==='report-month')")).replace('else if', 'if');
  const navigate = (page, studentId) => onMessage({
    source: host, origin: url('/').origin,
    data: { type: 'mc-proposal:navigate', role: 'parent', page, ...(studentId ? { studentId } : {}) }
  });

  sandbox.followProposalStudent(initialChild);
  sandbox.activateProposalFrame();
  assert.equal(sandbox.ui.familyStudent, initialChild);
  assert.equal(readSaved().demoWorksheetStudent, 'mia', 'Opening a parent preview does not select the teacher’s worksheet pupil');
  navigate('lessons');
  assert.equal(sandbox.ui.familyStudent, initialChild);

  vm.runInContext(childChange, sandbox);
  assert.equal(sandbox.ui.familyStudent, 'chloe');
  assert.equal(sandbox.ui.thread, 'thread-chloe');
  assert.equal(readSaved().demoWorksheetStudent, 'mia', 'Changing the parent child does not change the worksheet selection');
  assert.match(vm.runInContext('childSwitch()', sandbox), new RegExp('value="' + initialChild + '"'), 'The original scheduled child remains selectable');
  navigate('payments');
  assert.equal(sandbox.ui.familyStudent, 'chloe');
  assert.equal(messages.at(-1).studentId, 'chloe', 'Parent status reports the actual displayed child');

  saveSiblingState({ ...sandbox.state, demoWorksheetStudent: 'ethan', marker: 'teacher edit' });
  navigate('handbook');
  assert.equal(sandbox.state.marker, 'teacher edit', 'Shared records still refresh');
  assert.equal(sandbox.state.demoWorksheetStudent, 'ethan');
  assert.equal(sandbox.ui.familyStudent, 'chloe', 'Refreshing sibling records keeps the parent’s chosen child');

  sandbox.target.value = initialChild;
  vm.runInContext(childChange, sandbox);
  navigate('overview');
  assert.equal(sandbox.ui.familyStudent, initialChild);
  assert.match(vm.runInContext('childSwitch()', sandbox), new RegExp('value="' + initialChild + '" selected'));
  assert.equal(messages.at(-1).studentId, initialChild);
  assert.equal(counts.saves, 0, 'Parent navigation and child switching do not write shared worksheet selection');

  navigate('payments', 'mia');
  assert.equal(sandbox.ui.familyStudent, 'mia', 'Explicit parent navigation can still choose a different child');
  assert.equal(sandbox.state.demoWorksheetStudent, 'ethan');
});

test('student child switching still updates the shared worksheet selection', async () => {
  const source = await readFile(new URL('../dist/app.js', import.meta.url), 'utf8');
  const { sandbox, readSaved } = await proposalFrameHarness({ version: 4, demoWorksheetStudent: 'mia' });
  sandbox.target = { value: 'chloe' };
  sandbox.type = 'family-student';
  const childChange = source.slice(source.indexOf(" else if(type==='family-student')"), source.indexOf(" else if(type==='report-month')")).replace('else if', 'if');
  vm.runInContext(childChange, sandbox);
  assert.equal(sandbox.ui.familyStudent, 'chloe');
  assert.equal(readSaved().demoWorksheetStudent, 'chloe');
});
