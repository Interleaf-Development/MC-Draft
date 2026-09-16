import test from 'node:test';
import assert from 'node:assert/strict';
import { students, seed, clone, studentById } from '../dist/model.js';
import { getStudentProfile, saveStudentProfile } from '../dist/student-profile.js';

test('all 701 fictional profiles resolve without mutating state or claiming sent communications', () => {
  const state = seed(), before = clone(state);
  for (const student of students) {
    const profile = getStudentProfile(state, student.id);
    assert.equal(profile.studentNumber, student.number);
    assert.equal(profile.englishName, student.name);
    assert.match(profile.school, /^Demo /);
    assert.match(profile.parentEmail, /@example\.com$/);
    assert.match(profile.parentMobile, /^0000 \d{4}$/);
    assert.equal(profile.address, '');
    assert.equal(profile.marketingOptIn, false);
    assert.deepEqual(profile.smsHistory, []);
    assert.deepEqual(profile, getStudentProfile(seed(), student.id));
  }
  assert.deepEqual(state, before);
  assert.throws(() => getStudentProfile(state, 'unknown-student'), /valid student/);
});

test('profile edits survive serialization and remain isolated from other students and operational records', () => {
  const state = seed(), other = getStudentProfile(state, 'ethan'), records = clone(state), core = clone(studentById('chloe'));
  saveStudentProfile(state, 'chloe', { school: 'Demo Alternative School', parentEmail: 'family@example.com', remark: 'Prefers an afternoon call', paymentReminder: false });
  saveStudentProfile(state, 'chloe', { chineseName: '陳樂怡', parentLanguage: 'English' });
  const restored = JSON.parse(JSON.stringify(state)), profile = getStudentProfile(restored, 'chloe');
  assert.equal(profile.school, 'Demo Alternative School');
  assert.equal(profile.parentEmail, 'family@example.com');
  assert.equal(profile.parentLanguage, 'English');
  assert.equal(profile.paymentReminder, false);
  assert.deepEqual(getStudentProfile(state, 'ethan'), other);
  assert.deepEqual(studentById('chloe'), core);
  const { studentProfiles, ...unchanged } = state;
  assert.deepEqual(unchanged, records);
  assert.deepEqual(Object.keys(studentProfiles), ['chloe']);
});

test('invalid date, contact or core-field changes fail atomically', () => {
  const state = seed();
  saveStudentProfile(state, 'chloe', { remark: 'Keep this note' });
  for (const invalid of [
    { dateOfBirth: '2023-02-29' }, { dateOfBirth: '2017-04-31' }, { dateOfBirth: '2026-10-01' },
    { dateOfBirth: '17/03/2017' }, { parentEmail: 'not-an-email' }, { parentMobile: 'call me' },
    { parentPhone: '123' }, { marketingOptIn: 'yes' }, { englishName: 'Different identity' },
    { lessonDays: ['Sunday'] }, { status: 'paused' }, { remark: {} }
  ]) {
    const before = clone(state);
    assert.throws(() => saveStudentProfile(state, 'chloe', { school: 'Should not save', ...invalid }));
    assert.deepEqual(state, before);
  }
  const before = clone(state);
  assert.throws(() => saveStudentProfile(state, 'unknown-student', { remark: 'Wrong student' }), /valid student/);
  assert.deepEqual(state, before);
});

test('valid leap dates, optional blank contacts and plain-text notes round-trip without model escaping', () => {
  const state = seed(), note = '<b>Show working</b> & explain "why"';
  const profile = saveStudentProfile(state, 'chloe', { dateOfBirth: '2016-02-29', parentMobile: '+000 (0000) 0001', parentPhone: '', parentEmail: '', remark: note });
  assert.equal(profile.dateOfBirth, '2016-02-29');
  assert.equal(profile.parentPhone, '');
  assert.equal(profile.parentEmail, '');
  assert.equal(profile.remark, note);
  assert.equal(saveStudentProfile(state, 'chloe', { dateOfBirth: '' }).dateOfBirth, '');
});

test('Mia’s profile follows assessment enrolment and lesson details while retaining edited contact fields', () => {
  const state = seed(), assessment = getStudentProfile(state, 'mia');
  assert.equal(assessment.status, 'assessment');
  assert.equal(assessment.enrolledSince, '');
  assert.deepEqual(assessment.lessonDays, []);
  saveStudentProfile(state, 'mia', { parentEmail: 'mia-family@example.com' });
  Object.assign(state.assessment, { enrolled: true, parent: 'Mr Cheung', phone: '0000 9999' });
  state.bookings.push({ id: 'mia-first', studentId: 'mia', date: '2026-10-02', start: 1080, duration: 60, tutor: 'wong', status: 'scheduled' });
  state.invoices.push({ id: 'mia-enrol', studentId: 'mia', issued: '2026-09-29' });
  const enrolled = getStudentProfile(state, 'mia');
  assert.equal(enrolled.status, 'active');
  assert.equal(enrolled.parentRelation, 'Father');
  assert.equal(enrolled.parentMobile, '0000 9999');
  assert.equal(enrolled.parentEmail, 'mia-family@example.com');
  assert.equal(enrolled.instructor, 'Ming');
  assert.equal(enrolled.lessonTime, '18:00');
  assert.equal(enrolled.lessonDuration, 60);
  assert.deepEqual(enrolled.lessonDays, ['Friday']);
  assert.equal(enrolled.enrolledSince, '2026-09-29');
});
