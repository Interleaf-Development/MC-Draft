import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { getCentreConfig } from '../dist/branch-config.js';

test('Hang Hau is selected by a complete path segment and has the requested six teachers', () => {
  const hh = getCentreConfig('/hh/');
  for (const path of ['/hh', '/hh/', '/hh/parent/', '/hh/student/', '/hh/index.html']) assert.equal(getCentreConfig(path), hh);
  for (const path of ['/', '/parent/', '/student/', '/hh-other/', '/parent/hh/']) assert.equal(getCentreConfig(path).id, 'tw');
  assert.equal(hh.centre.branch, 'Hang Hau');
  assert.equal(hh.centre.branchZh, '坑口');
  assert.equal(hh.centre.manager, 'Rico');
  assert.deepEqual(hh.tutors.map(t => t.name), ['Rico', 'John', 'Leo', 'Amy', 'Melissa', 'Jason']);
  assert.equal(getCentreConfig('/').centre.manager, 'Koko Ko');
});

const app = await readFile(new URL('../dist/app.js', import.meta.url), 'utf8');
const startup = app.slice(app.indexOf('const STORAGE ='), app.indexOf('const ui ='));
const persist = app.slice(app.indexOf('function persist()'), app.indexOf('function change('));
function open(config, saved) {
  return vm.runInNewContext(startup + persist + '\n({get:()=>state,save:value=>{state=value;persist();}})', {
    centreConfig: config,
    localStorage: { getItem: key => saved.get(key) || null, setItem: (key, value) => saved.set(key, value) },
    seed: () => ({ version: 4, marker: 'fresh ' + config.id }),
    seedCentreVolume() {}, seedTeacherSchedules() {}, seedBusyAfternoons() {}, normalizeParentLeave() {}, normalizeStaffLeave() {}, normalizeConversations() {}, normalizeBillingAutomation() {}, normalizeBillingWorkflow() {}, normalizeP6Progress() {}, normalizeTwnSchedule() {},
    toast() { throw new Error('Unexpected storage error'); }
  });
}

test('app startup and persistence isolate branches while retaining the existing Tsuen Wan storage key', () => {
  const tw = getCentreConfig('/'), hh = getCentreConfig('/hh/');
  assert.equal(tw.storageKey, 'mathconcept-demo-v4');
  assert.notEqual(tw.storageKey, hh.storageKey);
  const original = JSON.stringify({ version: 4, marker: 'saved TW edits', note: 'Keep my lesson remark' });
  const saved = new Map([[tw.storageKey, original]]);
  const hangHau = open(hh, saved);
  assert.equal(hangHau.get().marker, 'fresh hh');
  hangHau.save({ version: 4, marker: 'HH changes' });
  assert.equal(saved.get(tw.storageKey), original);
  assert.equal(open(hh, saved).get().marker, 'HH changes');
  const tsuenWan = open(tw, saved);
  assert.equal(tsuenWan.get().note, 'Keep my lesson remark');
  tsuenWan.save({ version: 4, marker: 'TW reset' });
  assert.equal(open(hh, saved).get().marker, 'HH changes');
});
