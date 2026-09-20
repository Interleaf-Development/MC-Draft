import test from 'node:test';
import assert from 'node:assert/strict';
import { allStudents, students, seed, clone, tutors, billingPayerName, TODAY } from '../dist/model.js';
import { getStudentProfile, saveStudentProfile } from '../dist/student-profile.js';
import { normalizeConversations, conversationThreads, viewerKey } from '../dist/conversations.js';
import { normalizeBillingAutomation } from '../dist/billing-automation.js';
import { receiptRegister } from '../dist/receipts-ui.js';

const imported = allStudents.filter(student => student.source === 'twn-schedule');
const emptyFacts = ['givenName', 'surname', 'chineseName', 'dateOfBirth', 'school', 'grade', 'parentRelation', 'parentSurname', 'parentGivenName', 'parentLanguage', 'parentEmail', 'parentMobile', 'parentPhone', 'region', 'area', 'address', 'course', 'enrolledSince', 'status', 'remark', 'fpsRemark', 'referralCode', 'referralNotes', 'marketingNotes'];

test('imported profiles contain their supplied names and schedules without inferred personal facts', () => {
  assert.ok(imported.length > 0);
  const state = seed(), before = clone(state);
  for (const student of imported) {
    const profile = getStudentProfile(state, student.id);
    assert.equal(profile.englishName, student.name);
    assert.equal(profile.studentNumber, student.number);
    for (const field of emptyFacts) assert.equal(profile[field], '', field + ' must remain blank for ' + student.id);
    assert.equal(profile.paymentReminder, false);
    assert.equal(profile.marketingOptIn, false);
    assert.deepEqual(profile.smsHistory, []);
    assert.deepEqual(profile.lessonSessions.map(({ tutor, weekday, start, duration }) => ({ tutor, weekday, start, duration })), student.sessions);
    assert.equal(billingPayerName(state, student.id), '');
  }
  assert.deepEqual(state, before);
  assert.ok(students.every(student => student.source !== 'twn-schedule'), 'fictional fixture generation stays separate');
});

test('explicitly saved imported profile fields round-trip without filling other blanks', () => {
  const state = seed(), student = imported[0];
  saveStudentProfile(state, student.id, { school: 'Manually entered school', parentGivenName: 'Manual', parentSurname: 'Contact', parentEmail: 'manual@example.com', remark: 'Entered by staff' });
  const profile = getStudentProfile(JSON.parse(JSON.stringify(state)), student.id);
  assert.equal(profile.school, 'Manually entered school');
  assert.equal(profile.parentEmail, 'manual@example.com');
  assert.equal(profile.remark, 'Entered by staff');
  assert.equal(billingPayerName(state, student.id), 'Manual Contact');
  for (const field of emptyFacts.filter(field => !['school', 'parentGivenName', 'parentSurname', 'parentEmail', 'remark'].includes(field))) assert.equal(profile[field], '', field);
});

test('an actual saved regular rule updates imported profile schedule details only', () => {
  const state = seed(), student = imported[0];
  const rule = { weekday: 2, start: 960, duration: 90, tutor: tutors[0].id, effectiveDate: TODAY };
  state.regularSchedules = { ...state.regularSchedules, [student.id]: rule };
  const profile = getStudentProfile(state, student.id);
  assert.deepEqual(profile.lessonDays, ['Tuesday']);
  assert.equal(profile.lessonTime, '16:00');
  assert.equal(profile.lessonDuration, 90);
  assert.equal(profile.instructor, tutors[0].name);
  assert.equal(profile.regularEffectiveDate, TODAY);
  assert.equal(profile.school, '');
  assert.equal(profile.enrolledSince, '');
});

test('normalization does not seed payment records or parent conversations for imported names', () => {
  const state = seed(), ids = new Set(imported.map(student => student.id));
  normalizeBillingAutomation(state);
  normalizeConversations(state);
  for (const field of ['invoices', 'receipts', 'messages']) assert.ok(state[field].every(record => !ids.has(record.studentId)), field);
  assert.equal(viewerKey({ role: 'parent', studentId: imported[0].id }), 'parent:' + imported[0].id);
});

test('explicit imported conversation and receipt records resolve the real student without inventing a parent', () => {
  const state = seed(), student = imported[0];
  state.messages.push({ id: 'manual-imported-thread', type: 'direct', studentId: student.id, messages: [] });
  const thread = conversationThreads(state, { role: 'admin', query: student.name }).find(item => item.id === 'manual-imported-thread');
  assert.equal(thread.title, student.name);
  state.invoices.push({ id: 'manual-imported-invoice', studentId: student.id, amount: 100, paymentMethod: 'fps' });
  state.receipts.push({ id: 'manual-imported-receipt', invoiceId: 'manual-imported-invoice', studentId: student.id, amount: 100, issuedDate: TODAY, proofDate: TODAY });
  const row = receiptRegister(state, { query: student.name }).items.find(item => item.receipt.id === 'manual-imported-receipt');
  assert.equal(row.student.name, student.name);
  assert.equal(row.parent, '');
});
