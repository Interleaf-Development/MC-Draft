import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { seed, clone, tutors, requestAbsence, previewAbsenceMakeup, requestAbsenceReplacement, approveAbsence, activeBooking } from '../dist/model.js';

function fixture(duration = 60) {
  const state = seed(), tutor = tutors[0].id;
  state.bookings = [{ id: 'original-lesson', studentId: 'chloe', date: '2026-10-07', start: 960, duration, tutor, status: 'scheduled', attendance: 'unmarked', note: '' }];
  state.makeups = [];
  const request = requestAbsence(state, 'original-lesson', 'School activity');
  return { state, request, source: state.bookings[0], slot: { date: '2026-10-08', start: 960, duration, tutor } };
}
function rejectsWithoutMutation(state, callback, message) {
  const before = clone(state);
  assert.throws(callback, message);
  assert.deepEqual(state, before);
}

test('a leave preview has a linked make-up on a clone and ignores saved replacement preferences', () => {
  const { state, request, source, slot } = fixture();
  requestAbsenceReplacement(state, request.id, [slot]);
  request.replacementSlots[0].date = '2027-01-01'; // A stale preference cannot break a fresh availability preview.
  const before = clone(state), preview = previewAbsenceMakeup(state, request.id);
  assert.deepEqual(state, before);
  assert.equal(request.status, 'pending');
  assert.equal(source.status, 'scheduled');
  assert.equal(preview.state.leaveRequests[0].status, 'approved');
  assert.equal(preview.makeup.sourceId, source.id);
  assert.equal(preview.makeup.used, 0);
  assert.equal(preview.makeup.expiry, '2026-11-30');
  assert.equal(preview.state.bookings.length, state.bookings.length);
  assert.equal(preview.state.makeups[0], preview.makeup);
});

test('a preferred replacement is saved without approving leave or reserving time', () => {
  const { state, request, source, slot } = fixture(), before = clone(state);
  assert.equal(requestAbsenceReplacement(state, request.id, [slot]), request);
  assert.equal(request.status, 'pending');
  assert.deepEqual(request.replacementSlots, [slot]);
  assert.deepEqual(state.bookings, before.bookings);
  assert.deepEqual(state.makeups, before.makeups);
  assert.deepEqual(state.audit, before.audit);
  assert.equal(source.status, 'scheduled');
  slot.start = 1020;
  assert.equal(request.replacementSlots[0].start, 960, 'saved slot does not retain caller object');
});

test('approval books the saved replacement as one reschedule and preserves linked IDs', () => {
  const { state, request, source, slot } = fixture();
  requestAbsenceReplacement(state, request.id, [slot]);
  const makeup = approveAbsence(state, request.id), replacement = state.bookings.find(booking => booking.id !== source.id);
  assert.equal(request.status, 'approved');
  assert.equal(source.status, 'moved');
  assert.equal(activeBooking(source), false);
  assert.equal(state.makeups.length, 1);
  assert.equal(makeup, state.makeups[0]);
  assert.equal(makeup.used, 60);
  assert.equal(makeup.sourceId, source.id);
  assert.equal(source.caseId, makeup.id);
  assert.equal(replacement.sourceId, source.id);
  assert.equal(replacement.caseId, makeup.id);
  assert.equal(replacement.studentId, request.studentId);
  assert.equal(replacement.date, slot.date);
  assert.equal(replacement.duration, 60);
  assert.equal(state.audit.length, 3);
  rejectsWithoutMutation(state, () => approveAbsence(state, request.id), /already been handled/);
});

test('skipping a replacement keeps ordinary absence approval and a pending make-up', () => {
  const { state, request, source } = fixture(), makeup = approveAbsence(state, request.id);
  assert.equal(request.status, 'approved');
  assert.equal(source.status, 'absent');
  assert.equal(source.attendance, 'absent');
  assert.equal(state.bookings.length, 1);
  assert.equal(makeup.used, 0);
  assert.equal(makeup.minutes, 60);
});

test('90-minute originals accept one full 90-minute replacement', () => {
  const { state, request, slot } = fixture(90);
  requestAbsenceReplacement(state, request.id, [slot]);
  const makeup = approveAbsence(state, request.id);
  assert.equal(makeup.minutes, 90);
  assert.equal(makeup.used, 90);
  assert.equal(state.bookings[1].duration, 90);
});

test('parents cannot split, shorten, extend, omit, or inject replacement booking identities', () => {
  const { state, request, slot } = fixture();
  for (const slots of [[], null, [null], [{ ...slot, duration: 30 }], [{ ...slot, duration: 90 }], [{ ...slot, duration: 30 }, { ...slot, start: 1020, duration: 30 }]]) {
    rejectsWithoutMutation(state, () => requestAbsenceReplacement(state, request.id, slots), /full replacement lesson/);
  }
  requestAbsenceReplacement(state, request.id, [{ ...slot, studentId: 'ethan', id: 'injected', caseId: 'injected', approvedExpiry: '2027-01-01' }]);
  assert.deepEqual(request.replacementSlots, [slot]);
  approveAbsence(state, request.id);
  assert.equal(state.bookings[1].studentId, 'chloe');
  assert.notEqual(state.bookings[1].id, 'injected');
});

test('invalid dates, past dates, same original time, and expired selections leave no partial preference', () => {
  const { state, request, source, slot } = fixture();
  const rejected = [
    [{ ...slot, date: '2026-09-29' }, /upcoming/],
    [{ ...slot, date: '2026-12-01' }, /deadline/],
    [{ ...slot, date: '2026-11-31' }, /valid lesson/],
    [{ ...slot, date: source.date, start: source.start }, /different time/],
    [{ ...slot, start: 961 }, /valid lesson/],
    [{ ...slot, start: 1140 }, /between 09:00 and 19:00/],
    [{ ...slot, tutor: 'missing' }, /available tutor/]
  ];
  for (const [candidate, message] of rejected) rejectsWithoutMutation(state, () => requestAbsenceReplacement(state, request.id, [candidate]), message);
});

test('a full session rejects a preference and a newly full session blocks approval atomically', () => {
  const { state, request, slot } = fixture();
  requestAbsenceReplacement(state, request.id, [slot]);
  state.bookings.push(...Array.from({ length: 6 }, (_, i) => ({ ...slot, id: 'occupied-' + i, studentId: 'other-' + i, status: 'scheduled' })));
  rejectsWithoutMutation(state, () => requestAbsenceReplacement(state, request.id, [slot]), /six students/);
  rejectsWithoutMutation(state, () => approveAbsence(state, request.id), /six students/);
  assert.equal(request.status, 'pending');
  assert.equal(state.makeups.length, 0);
});

test('student collisions and tutor leave are rechecked on approval', () => {
  for (const conflict of ['student', 'tutor']) {
    const { state, request, slot } = fixture();
    requestAbsenceReplacement(state, request.id, [slot]);
    if (conflict === 'student') state.bookings.push({ ...slot, id: 'other-lesson', studentId: 'chloe', status: 'scheduled' });
    else state.staffLeave.push({ id: 'staff-leave', staffId: slot.tutor, date: slot.date, unit: 'Full day', status: 'recorded' });
    rejectsWithoutMutation(state, () => approveAbsence(state, request.id), conflict === 'student' ? /already has a lesson/ : /on leave/);
  }
});

test('a moved, removed, or edited source cannot silently approve a stale preferred replacement', () => {
  for (const change of [source => { source.status = 'moved'; }, source => { source.date = '2026-10-09'; }, source => { source.duration = 90; }, source => { source.studentId = 'ethan'; }]) {
    const { state, request, source, slot } = fixture();
    requestAbsenceReplacement(state, request.id, [slot]);
    change(source);
    rejectsWithoutMutation(state, () => approveAbsence(state, request.id), /lesson has changed/);
  }
  const { state, request, slot } = fixture();
  requestAbsenceReplacement(state, request.id, [slot]);
  state.bookings = [];
  rejectsWithoutMutation(state, () => approveAbsence(state, request.id), /lesson has changed/);
});

test('reschedule limits are checked before preference selection and again before approval', () => {
  const { state, request, slot } = fixture();
  requestAbsenceReplacement(state, request.id, [slot]);
  state.makeups.push(...Array.from({ length: 3 }, (_, i) => ({ id: 'other-makeup-' + i, studentId: 'chloe', period: 'Oct–Nov 2026' })));
  rejectsWithoutMutation(state, () => requestAbsenceReplacement(state, request.id, [slot]), /three reschedules/);
  rejectsWithoutMutation(state, () => approveAbsence(state, request.id), /three reschedules/);
});

test('handled and unknown requests reject preview, selection, and duplicate approval without changes', () => {
  for (const status of ['approved', 'declined']) {
    const { state, request, slot } = fixture();
    request.status = status;
    for (const operation of [() => previewAbsenceMakeup(state, request.id), () => requestAbsenceReplacement(state, request.id, [slot]), () => approveAbsence(state, request.id)]) rejectsWithoutMutation(state, operation, /already been handled/);
  }
  const { state, slot } = fixture();
  for (const operation of [() => previewAbsenceMakeup(state, 'missing'), () => requestAbsenceReplacement(state, 'missing', [slot]), () => approveAbsence(state, 'missing')]) rejectsWithoutMutation(state, operation, /already been handled/);
});

test('a saved pending leave preference survives reload and is approved once', () => {
  const { state, request, slot } = fixture();
  requestAbsenceReplacement(state, request.id, [slot]);
  const restored = JSON.parse(JSON.stringify(state)), makeup = approveAbsence(restored, request.id);
  assert.equal(restored.leaveRequests[0].id, request.id);
  assert.equal(restored.leaveRequests[0].status, 'approved');
  assert.equal(restored.bookings[1].caseId, makeup.id);
  assert.deepEqual(restored.leaveRequests[0].replacementSlots, [slot]);
});

test('Hang Hau uses the same leave preference workflow with its branch teacher IDs', () => {
  const modelUrl = new URL('../dist/model.js', import.meta.url).href;
  const script = `
    import assert from 'node:assert/strict';
    globalThis.location = { pathname: '/hh/parent/' };
    const model = await import(${JSON.stringify(modelUrl)});
    const state = model.seed();
    const source = state.bookings.find(item => item.studentId === 'chloe' && item.date === '2026-10-07');
    const request = model.requestAbsence(state, source.id, '學校活動');
    model.requestAbsenceReplacement(state, request.id, [{ date: '2026-10-08', start: 960, duration: 60, tutor: 'ricco' }]);
    assert.equal(request.status, 'pending');
    const makeup = model.approveAbsence(state, request.id);
    const replacement = state.bookings.find(item => item.caseId === makeup.id && item.id !== source.id);
    assert.equal(replacement.tutor, 'ricco');
    assert.equal(model.centre.manager, 'Rico');
    assert.equal(request.status, 'approved');
    process.stdout.write('ok');
  `;
  assert.equal(execFileSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' }), 'ok');
});
