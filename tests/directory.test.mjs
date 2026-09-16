import test from 'node:test';
import assert from 'node:assert/strict';
import { students, studentById, seed, clone, enrolledStudents, filterStudents, paginate, seedCentreVolume } from '../dist/model.js';

test('the directory has 700 enrolled students plus Mia and preserves the original walkthrough order', () => {
  const state = seed(), enrolled = enrolledStudents(state);
  assert.equal(students.length, 701);
  assert.equal(enrolled.length, 700);
  assert.deepEqual(students.slice(0, 8).map(student => student.id), ['chloe', 'ethan', 'lucas', 'emma', 'oliver', 'sophie', 'mia', 'ryan']);
  for (const key of ['id', 'number', 'name', 'phone']) assert.equal(new Set(students.map(student => student[key])).size, 701, key + ' should be unique');
  assert.ok(students.every(student => /^MC-\d{4}$/.test(student.number) && /^0000 \d{4}$/.test(student.phone)));
  assert.ok(enrolled.some(student => student.status === 'paused'));
  assert.ok(enrolled.every(student => ['active', 'paused'].includes(student.status)));
  assert.equal(studentById('student-0701'), students.at(-1));
  assert.ok(state.bookings.every(booking => students.slice(0, 8).some(student => student.id === booking.studentId)));
});

test('enrolling Mia adds her to the directory with the captured family and lesson details', () => {
  const state = seed();
  assert.equal(filterStudents(state, { query: 'Mia Cheung' }).length, 0);
  Object.assign(state.assessment, { enrolled: true, parent: 'Mr Cheung', phone: '0000 9999' });
  state.bookings.push({ id: 'mia-first', studentId: 'mia', date: '2026-09-30', start: 1020, tutor: 'chan', status: 'scheduled' });
  const matches = filterStudents(state, { query: '00009999', status: 'active', day: 'Wednesday' });
  assert.equal(enrolledStudents(state).length, 701);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].id, 'mia');
  assert.equal(matches[0].parent, 'Mr Cheung');
  assert.equal(matches[0].regular, 'Wednesday · 17:00');
});

test('search finds student number, full name, parent and formatted or compact phone', () => {
  const state = seed();
  for (const query of ['MC-0701', 'mc0701', students.at(-1).name, students.at(-1).phone, students.at(-1).phone.replaceAll(' ', '')]) {
    assert.deepEqual(filterStudents(state, { query }).map(student => student.id), [students.at(-1).id], query);
  }
  const parents = filterStudents(state, { query: 'Mrs Kwok' });
  assert.ok(parents.length > 0);
  assert.ok(parents.every(student => student.parent === 'Mrs Kwok'));
});

test('directory filters combine with search and sorting without rearranging the shared catalogue', () => {
  const state = seed(), order = students.map(student => student.id), sample = students.slice(8).find(student => student.status === 'paused');
  const found = filterStudents(state, { level: sample.level, tutor: sample.tutor, day: sample.day, status: 'paused' });
  assert.ok(found.length > 0);
  assert.ok(found.every(student => student.level === sample.level && student.tutor === sample.tutor && student.day === sample.day && student.status === 'paused'));
  assert.equal(filterStudents(state, { level: 'All', status: 'all' }).length, 700);
  assert.equal(filterStudents(state, { query: 'no-such-student' }).length, 0);
  assert.equal(filterStudents(state, { sort: 'number' })[0].id, 'chloe');
  assert.equal(filterStudents(state, { sort: 'number-desc' })[0].id, 'student-0701');
  const byName = filterStudents(state, { sort: 'name' });
  assert.deepEqual(filterStudents(state, { sort: 'name-desc' }).map(student => student.id), byName.map(student => student.id).reverse());
  assert.deepEqual(students.map(student => student.id), order);
});

test('pagination exposes all 700 students once and clamps stale pages after filtering', () => {
  const list = filterStudents(seed(), { sort: 'number' }), first = paginate(list);
  assert.equal(first.total, 700);
  assert.equal(first.pageCount, 28);
  assert.equal(first.start, 1);
  assert.equal(first.end, 25);
  const ids = Array.from({ length: first.pageCount }, (_, index) => paginate(list, index + 1).items.map(student => student.id)).flat();
  assert.equal(ids.length, 700);
  assert.equal(new Set(ids).size, 700);
  const last = paginate(list, 99);
  assert.equal(last.page, 28);
  assert.equal(last.start, 676);
  assert.equal(last.end, 700);
  const filtered = paginate(list.slice(0, 3), 28);
  assert.equal(filtered.page, 1);
  assert.equal(filtered.end, 3);
  assert.equal(paginate(list, -4).page, 1);
  assert.equal(paginate(list, '2', '50').start, 51);
  assert.deepEqual(paginate([], 28), { items: [], total: 0, page: 1, pageSize: 25, pageCount: 1, start: 0, end: 0 });
  assert.equal(paginate(list, NaN, 0).pageSize, 25);
});

test('volume migration adds 693 invoices and 120 conversations without altering original fixtures or bookings', () => {
  const state = seed(), original = clone(state);
  assert.equal(seedCentreVolume(state), state);
  assert.equal(state.invoices.length, original.invoices.length + 693);
  assert.equal(state.messages.length, original.messages.length + 120);
  for (const key of ['invoices', 'messages', 'receipts', 'bankTransactions']) {
    assert.deepEqual(state[key].slice(0, original[key].length), original[key]);
    assert.equal(new Set(state[key].map(item => item.id)).size, state[key].length);
  }
  assert.deepEqual(state.bookings, original.bookings);
  assert.deepEqual(state.assignments, original.assignments);
  for (const invoice of state.invoices.slice(original.invoices.length)) {
    assert.ok(studentById(invoice.studentId).id === invoice.studentId);
    if (invoice.receiptId) assert.ok(state.receipts.some(receipt => receipt.id === invoice.receiptId && receipt.invoiceId === invoice.id));
  }
  for (const receipt of state.receipts.filter(receipt => receipt.bankId)) assert.ok(state.bankTransactions.some(bank => bank.id === receipt.bankId));
  assert.ok(state.invoices.some(invoice => invoice.proof && !invoice.receiptId));
  assert.ok(state.receipts.some(receipt => receipt.bankId === null));
});

test('reapplying volume migration preserves edited records and never duplicates data', () => {
  const state = seedCentreVolume(seed());
  state.invoices.find(invoice => invoice.id === 'INV-5001').description = 'Updated by the manager';
  state.messages.find(thread => thread.id === 'thread-student-0009').messages.push({ author: 'centre', text: 'Manager follow-up', time: 'Now' });
  const before = clone(state);
  seedCentreVolume(state);
  assert.deepEqual(state, before);
});
