import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const modelUrl = new URL('../dist/model.js', import.meta.url).href;

// Branch configuration is chosen when the module loads. A separate Node process
// gives each scenario the same fresh module graph as a separate branch page.
function inBranch(pathname, assertions) {
  const setup = pathname === null ? '' : 'globalThis.location = { pathname: ' + JSON.stringify(pathname) + ' };';
  const script = `
    import assert from 'node:assert/strict';
    ${setup}
    const model = await import(${JSON.stringify(modelUrl)});
    const normalize = state => {
      model.seedCentreVolume(state);
      model.seedTeacherSchedules(state);
      model.seedBusyAfternoons(state);
      model.normalizeStaffLeave(state);
      return state;
    };
    ${assertions}
    process.stdout.write('ok');
  `;
  assert.equal(execFileSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' }), 'ok');
}

test('Hang Hau uses its configured director and six teachers throughout clean fixtures', () => {
  inBranch('/hh/parent/', String.raw`
    const expectedIds = ['ricco', 'john', 'leo', 'amy', 'melissa', 'jason'];
    const expectedNames = ['Rico', 'John', 'Leo', 'Amy', 'Melissa', 'Jason'];
    assert.deepEqual(model.tutors.map(tutor => tutor.id), expectedIds);
    assert.deepEqual(model.tutors.map(tutor => tutor.name), expectedNames);
    assert.equal(model.centre.name, 'MathConcept (Hang Hau)');
    assert.equal(model.centre.manager, 'Rico');
    assert.equal(model.centre.managerId, 'ricco');
    const clean = model.seed();
    assert.equal(clean.messages.find(thread => thread.id === 'thread-chloe').assignedTo, 'Rico');
    assert.equal(clean.staff[1].name, 'John');
    const state = normalize(clean), allowed = new Set(expectedIds);
    assert.deepEqual(state.staff.map(staff => staff.id), expectedIds);
    assert.deepEqual(state.staff.map(staff => staff.name), expectedNames);
    assert.equal(state.staff.find(staff => staff.id === 'ricco').role, 'Centre director');
    assert.ok(model.students.every(student => allowed.has(student.tutor)));
    assert.ok(state.bookings.every(booking => allowed.has(booking.tutor)));
    assert.ok(state.messages.every(thread => ['Reception', ...expectedNames].includes(thread.assignedTo)));
    assert.ok(state.invoices.filter(invoice => invoice.proofReview?.extracted.recipient).every(invoice => invoice.proofReview.extracted.recipient === model.centre.name));
    assert.doesNotMatch(JSON.stringify(state), /Koko|Ming|Ms Jenny Chan|Ms Chan|Mr Alex Wong|Tsuen Wan/);
  `);
});

test('Hang Hau schedules fit all six rosters and retain six-student capacity', () => {
  inBranch('/hh/', String.raw`
    const state = normalize(model.seed());
    assert.equal(new Set(state.bookings.map(booking => booking.id)).size, state.bookings.length);
    for (const staff of state.staff) {
      assert.equal(staff.roster.length, 7, staff.name);
      assert.equal(staff.roster.reduce((total, unit) => total + (unit === 'Full' ? 1 : ['AM', 'PM'].includes(unit) ? .5 : 0), 0), 5, staff.name);
      assert.ok(state.bookings.some(booking => booking.tutor === staff.id && model.activeBooking(booking)), staff.name + ' needs a teaching example');
    }
    for (const booking of state.bookings.filter(model.activeBooking)) {
      assert.equal(booking.tutor, model.studentById(booking.studentId).tutor, booking.id);
      assert.equal(model.validateSlot(state, booking, [booking.id]), null, booking.id);
    }
    const sunday = state.bookings.filter(booking => booking.id.startsWith('sunday-v1-'));
    assert.equal(sunday.length, 6);
    assert.deepEqual([...new Set(sunday.map(booking => booking.tutor))], ['ricco', 'john']);
    const isolated = { ...state, bookings: [], staffLeave: [] };
    const slot = { studentId: 'capacity-probe', date: model.TODAY, tutor: 'ricco', start: 600, duration: 60 };
    assert.equal(model.validateSlot(isolated, slot), null);
    assert.match(model.validateSlot(isolated, { ...slot, tutor: 'chan' }), /available tutor/);
    isolated.bookings = Array.from({ length: 6 }, (_, index) => ({ ...slot, id: 'occupied-' + index, studentId: 'other-' + index, status: 'scheduled' }));
    assert.match(model.validateSlot(isolated, slot), /six students/);
    isolated.bookings.pop();
    assert.equal(model.validateSlot(isolated, slot), null);
  `);
});

test('Hang Hau preserves the move, split make-up and staff-leave demo workflows', () => {
  inBranch('/hh/', String.raw`
    const state = normalize(model.seed());
    const source = state.bookings.find(booking => booking.studentId === 'chloe' && booking.date === model.TODAY);
    const moved = model.moveBooking(state, source.id, { date: model.TODAY, start: 1020, tutor: 'ricco' });
    assert.equal(moved.tutor, 'ricco');
    assert.equal(moved.sourceId, source.id);
    assert.equal(source.status, 'moved');
    const split = model.bookMakeup(state, 'makeup-chloe', [
      { date: '2026-10-02', start: 1020, duration: 30, tutor: 'ricco' },
      { date: '2026-10-07', start: 1020, duration: 30, tutor: 'ricco' }
    ]);
    assert.equal(split.length, 2);
    assert.ok(split.every(booking => booking.tutor === 'ricco' && booking.caseId === 'makeup-chloe'));
    assert.equal(state.makeups.find(makeup => makeup.id === 'makeup-chloe').used, 60);
    const leave = model.setStaffLeave(state, { staffId: 'john', date: model.TODAY, unit: 'AM', reason: 'Saved local leave' });
    assert.equal(leave.recordedBy, 'Rico');
    assert.equal(leave.staffId, 'john');
    assert.match(model.validateSlot(state, { studentId: 'availability-probe', tutor: 'john', date: model.TODAY, start: 600, duration: 60 }), /on leave/);
    assert.equal(model.cancelStaffLeave(state, leave.id).cancelledBy, 'Rico');
  `);
});

test('Hang Hau normalizers preserve edited, moved and deleted bookings and saved financial details', () => {
  inBranch('/hh/', String.raw`
    const state = normalize(model.seed());
    const generated = state.bookings.filter(booking => booking.id.startsWith('afternoon-v1-'));
    assert.ok(generated.length >= 2);
    state.bookings = state.bookings.filter(booking => booking.id !== generated[0].id);
    Object.assign(generated[1], { status: 'moved', note: 'Keep this centre edit', scheduleColour: 'green' });
    state.staff.find(staff => staff.id === 'amy').roster = ['Full', 'Full', 'Full', 'Full', 'Full', 'Off', 'Off'];
    state.studentProfiles = { chloe: { remark: 'Parent contact preference' } };
    const invoice = state.invoices.find(item => item.id === 'INV-1024');
    Object.assign(invoice, { proof: true, proofReference: 'LOCAL HH TRANSFER', proofDate: model.TODAY });
    const receipt = state.receipts.find(item => item.id === 'R-1028');
    receipt.note = 'Bank checked by Rico';
    state.bankTransactions.push({ id: 'BANK-HH-MANUAL', date: model.TODAY, amount: 2000, reference: 'LOCAL HH TRANSFER', payer: 'Elaine Chan', direction: 'credit' });
    const before = model.clone(state);
    normalize(state);
    assert.deepEqual(state, before);
  `);
});

test('default Tsuen Wan identity and legacy migrations still retain saved work', () => {
  inBranch(null, String.raw`
    assert.equal(model.centre.branch, 'Tsuen Wan');
    assert.equal(model.centre.manager, 'Koko Ko');
    assert.deepEqual(model.tutors.map(tutor => tutor.id), ['chan', 'wong', 'oscar', 'peter', 'polly', 'shileen', 'tiffany', 'winky']);
    const legacy = model.seed();
    legacy.messages.find(thread => thread.id === 'thread-chloe').assignedTo = 'Ms Jenny Chan';
    legacy.staff.find(staff => staff.id === 'wong').name = 'Mr Alex Wong';
    const saved = legacy.bookings.find(booking => booking.studentId === 'chloe' && booking.date === model.TODAY);
    saved.note = 'Existing Tsuen Wan lesson remark'; saved.scheduleColour = 'green'; saved.attendance = 'present';
    const original = model.clone(saved), makeups = model.clone(legacy.makeups);
    normalize(legacy);
    assert.equal(legacy.staff.length, 8);
    assert.equal(legacy.staff.find(staff => staff.id === 'chan').role, 'Centre director');
    assert.equal(legacy.staff.find(staff => staff.id === 'wong').name, 'Ming');
    assert.equal(legacy.messages.find(thread => thread.id === 'thread-chloe').assignedTo, 'Koko');
    assert.deepEqual(legacy.bookings.find(booking => booking.id === saved.id), original);
    assert.deepEqual(legacy.makeups, makeups);
    const remove = legacy.bookings.find(booking => booking.id.startsWith('schedule-v1-'));
    legacy.bookings = legacy.bookings.filter(booking => booking.id !== remove.id);
    const before = model.clone(legacy);
    normalize(legacy);
    assert.deepEqual(legacy, before);
  `);
});
