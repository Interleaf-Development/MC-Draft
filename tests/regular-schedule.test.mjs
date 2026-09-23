import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { seed, seedTeacherSchedules, seedBusyAfternoons, clone, activeBooking, bookMakeup, usedReschedules, requestAbsence, normalizeParentLeave } from '../dist/model.js';
import { getRegularSchedule, getSchedulePeriods, previewRegularScheduleChange, applyRegularScheduleChange } from '../dist/regular-schedule.js';

const positive = { studentId: 'oliver', invoiceId: 'INV-1028', effectiveDate: '2026-10-01', weekday: 4, start: 840, tutor: 'chan' };
const negative = { ...positive, effectiveDate: '2026-10-07', weekday: 2, start: 960, tutor: 'wong' };
function state() { const value = seed(); seedTeacherSchedules(value); seedBusyAfternoons(value); return value; }
function legacyUnplannedState() {
  const value = state(), invoice = value.invoices.find(item => item.id === positive.invoiceId);
  delete invoice.lessonPlan; delete invoice.lessonCount;
  delete value.receipts.find(item => item.id === invoice.receiptId).originalDocument;
  return value;
}
function apply(value, input, decisions) { const preview = previewRegularScheduleChange(value, input); return applyRegularScheduleChange(value, input, { ...decisions, fingerprint: preview.fingerprint }); }
const planned = value => value.bookings.filter(booking => booking.studentId === 'oliver' && booking.invoiceId === 'INV-1028' && activeBooking(booking));

test('preview is pure and derives eight Wednesdays and nine Thursdays from real dates', () => {
  const value = state(), before = clone(value), preview = previewRegularScheduleChange(value, positive);
  assert.deepEqual(value, before);
  assert.equal(preview.beforeCount, 8); assert.equal(preview.proposedCount, 9); assert.equal(preview.delta, 1);
  assert.deepEqual(preview.conflicts, []);
  assert.equal(preview.beforeLessons[0].date, '2026-10-07'); assert.equal(preview.proposedLessons[0].date, '2026-10-01');
  assert.equal(preview.proposedLessons.at(-1).date, '2026-11-26');
});

test('allowing extra lesson creates nine appointments and one revision, with no duplicate cash', () => {
  const value = state(), original = clone(value.receipts.find(item => item.id === 'R-1028')), invoice = clone(value.invoices.find(item => item.id === 'INV-1028')), bank = clone(value.bankTransactions), receiptsCount = value.receipts.length;
  const startedAt = Date.now(), auditBefore = clone(value.audit);
  const result = apply(value, positive, { extra: 'allow' });
  assert.equal(planned(value).length, 9); assert.equal(result.revision.lessonCount, 9); assert.equal(result.revision.makeUpLessonCount, 0);
  assert.equal(result.receipt.activeRevisionId, 'R-1028-A1'); assert.equal(value.receipts.length, receiptsCount);
  for (const [field, expected] of Object.entries(original)) assert.deepEqual(result.receipt[field], expected, field);
  assert.deepEqual(value.bankTransactions, bank);
  assert.equal(result.revision.receiptDate, original.issuedDate);
  assert.ok(Date.parse(result.revision.revisedAt) >= startedAt && Date.parse(result.revision.revisedAt) <= Date.now());
  assert.equal(result.revision.generatedAt, result.revision.revisedAt);
  assert.equal(result.change.createdAt, result.revision.generatedAt);
  assert.equal(result.revision.originalReceiptId, original.id);
  assert.equal(result.revision.replacesDocumentId, original.id);
  assert.equal(result.revision.paymentDate, invoice.claimedPaymentDate);
  assert.equal(value.audit[0].recordedAt, result.revision.generatedAt);
  assert.deepEqual(value.audit.slice(1), auditBefore);
  assert.equal(result.receipt.originalDocument.description, invoice.description);
  assert.equal(result.receipt.originalDocument.lessonDates.length, 8);
  assert.equal(getRegularSchedule(value, 'oliver').weekday, 4);
  const updatedInvoice = value.invoices.find(item => item.id === invoice.id);
  assert.equal(updatedInvoice.description, 'Regular programme · 9 lessons'); assert.equal(updatedInvoice.amount, invoice.amount);
  assert.deepEqual(updatedInvoice.proofReview, invoice.proofReview);
});

test('declining extra lesson excludes the final surplus date and keeps an eight-lesson document', () => {
  const value = state(), result = apply(value, positive, { extra: 'decline' });
  assert.equal(planned(value).length, 8); assert.equal(result.revision.lessonCount, 8);
  assert.deepEqual(result.excludedDates, ['2026-11-26']); assert.equal(result.revision.lessonDates.some(item => item.date === '2026-11-26'), false);
});

test('a conflict solely on the declined extra date does not block valid remaining lessons', () => {
  const value = state();
  for (let index = 0; index < 6; index++) value.bookings.push({ id: 'full-' + index, studentId: 'other-' + index, date: '2026-11-26', start: 840, duration: 60, tutor: 'chan', status: 'scheduled' });
  const preview = previewRegularScheduleChange(value, positive);
  assert.ok(preview.conflicts.some(item => item.date === '2026-11-26' && /six/.test(item.reason)));
  const result = applyRegularScheduleChange(value, positive, { extra: 'decline', fingerprint: preview.fingerprint });
  assert.equal(result.revision.lessonDates.length, 8);
});

test('shortfall can retain eight paid lessons as seven regular lessons plus one unbooked credit', () => {
  const value = state(), preview = previewRegularScheduleChange(value, negative), count = usedReschedules(value, 'oliver', 'Oct–Nov 2026');
  assert.equal(preview.beforeCount, 8); assert.equal(preview.proposedCount, 7); assert.equal(preview.delta, -1);
  const result = applyRegularScheduleChange(value, negative, { shortfall: 'credit', fingerprint: preview.fingerprint });
  assert.equal(planned(value).length, 7); assert.equal(result.revision.lessonCount, 8); assert.equal(result.revision.makeUpLessonCount, 1);
  assert.equal(result.makeup.kind, 'schedule-shortfall'); assert.equal(result.makeup.minutes, 60); assert.equal(result.makeup.used, 0); assert.equal(result.makeup.expiry, '2026-11-30');
  assert.equal(result.makeup.period, 'Oct–Nov 2026'); assert.equal(value.leaveRequests.length, 0);
  assert.equal(usedReschedules(value, 'oliver', 'Oct–Nov 2026'), count);
  const replacement = bookMakeup(value, result.makeup.id, [{ date: '2026-10-08', start: 960, duration: 60, tutor: 'chan' }]);
  assert.equal(replacement.length, 1); assert.equal(value.makeups.find(item => item.id === result.makeup.id).used, 60);
});

test('declining shortfall credit records seven dated lessons without a makeup', () => {
  const value = state(), count = value.makeups.length, result = apply(value, negative, { shortfall: 'decline' });
  assert.equal(result.revision.lessonCount, 7); assert.equal(result.revision.makeUpLessonCount, 0);
  assert.equal(result.makeup, undefined); assert.equal(value.makeups.length, count); assert.equal(result.receipt.amount, 2000);
});

test('equal-count weekday change still records a permanent rule and dated amendment', () => {
  const value = state(), input = { ...positive, weekday: 5, start: 840, effectiveDate: '2026-10-07' }, preview = previewRegularScheduleChange(value, input);
  assert.equal(preview.delta, 0);
  const result = applyRegularScheduleChange(value, input, { fingerprint: preview.fingerprint });
  assert.equal(result.revision.lessonCount, 8); assert.equal(result.revision.lessonDates.length, 8); assert.equal(getRegularSchedule(value, 'oliver').weekday, 5);
});

test('attendance and recorded one-off leave stay intact across a permanent change', () => {
  const value = state();
  value.bookings.push({ id: 'attended-oct7', studentId: 'oliver', date: '2026-10-07', start: 960, duration: 60, tutor: 'chan', status: 'scheduled', attendance: 'present' });
  value.bookings.push({ id: 'absent-oct14', studentId: 'oliver', date: '2026-10-14', start: 960, duration: 60, tutor: 'chan', status: 'absent', attendance: 'absent', caseId: 'leave-oliver' });
  value.makeups.push({ id: 'leave-oliver', studentId: 'oliver', sourceId: 'absent-oct14', minutes: 60, used: 60, period: 'Oct–Nov 2026', expiry: '2026-11-30' });
  value.bookings.push({ id: 'replacement-oct20', studentId: 'oliver', date: '2026-10-20', start: 840, duration: 60, tutor: 'wong', status: 'scheduled', attendance: 'unmarked', caseId: 'leave-oliver', sourceId: 'absent-oct14' });
  const originals = ['attended-oct7', 'absent-oct14', 'replacement-oct20'].map(id => clone(value.bookings.find(item => item.id === id)));
  const result = apply(value, positive, { extra: 'allow' });
  for (const original of originals) assert.deepEqual(value.bookings.find(item => item.id === original.id), original);
  assert.equal(result.revision.lessonDates.length, 9);
  assert.equal(result.revision.lessonDates.some(item => item.date === '2026-10-08'), false);
  assert.equal(result.revision.lessonDates.some(item => item.date === '2026-10-15'), false);
});

test('repeated amendments use stored plan, preserve original snapshot and append immutable history', () => {
  const value = state();
  const first = apply(value, positive, { extra: 'allow' }), originalSnapshot = clone(first.receipt.originalDocument), oldRevision = clone(first.revision);
  const next = { ...positive, weekday: 3, start: 840 };
  const preview = previewRegularScheduleChange(value, next);
  assert.equal(preview.beforeCount, 9); assert.equal(preview.proposedCount, 8);
  const result = applyRegularScheduleChange(value, next, { shortfall: 'decline', fingerprint: preview.fingerprint });
  assert.equal(result.revision.id, 'R-1028-A2'); assert.deepEqual(result.receipt.revisions[0], oldRevision); assert.deepEqual(result.receipt.originalDocument, originalSnapshot);
  assert.equal(result.revision.originalReceiptId, 'R-1028');
  assert.equal(result.revision.replacesDocumentId, oldRevision.id);
  assert.equal(result.revision.paymentDate, oldRevision.paymentDate);
  assert.equal(planned(value).length, 8); assert.equal(value.receipts.filter(item => item.invoiceId === 'INV-1028').length, 1);
});

test('explicit dated invoice plan wins over static weekday assumptions', () => {
  const value = state(), invoice = value.invoices.find(item => item.id === 'INV-1028');
  invoice.lessonPlan = { lessonCount: 7, lessonDates: ['2026-10-07', '2026-10-14', '2026-10-21', '2026-10-28', '2026-11-04', '2026-11-11', '2026-11-18'].map(date => ({ date, start: 960, duration: 60, tutor: 'chan' })), makeUpLessonCount: 0 };
  const preview = previewRegularScheduleChange(value, positive);
  assert.equal(preview.beforeCount, 7); assert.equal(preview.delta, 2);
  const result = applyRegularScheduleChange(value, positive, { extra: 'decline', fingerprint: preview.fingerprint });
  assert.deepEqual(result.excludedDates, ['2026-11-19', '2026-11-26']); assert.equal(result.revision.lessonCount, 7);
});

test('missing decisions, stale previews, teacher leave and capacity failures commit nothing', () => {
  const value = state(); let before = clone(value), preview = previewRegularScheduleChange(value, positive);
  assert.throws(() => applyRegularScheduleChange(value, positive, { fingerprint: preview.fingerprint }), /whether to allow/); assert.deepEqual(value, before);
  value.staffLeave.push({ id: 'leave-oct8', staffId: 'chan', date: '2026-10-08', unit: 'PM', status: 'recorded' }); before = clone(value);
  assert.throws(() => applyRegularScheduleChange(value, positive, { extra: 'allow', fingerprint: preview.fingerprint }), /Preview the change again/); assert.deepEqual(value, before);
  preview = previewRegularScheduleChange(value, positive);
  assert.throws(() => applyRegularScheduleChange(value, positive, { extra: 'allow', fingerprint: preview.fingerprint }), /on leave/); assert.deepEqual(value, before);
  value.staffLeave = [];
  for (let index = 0; index < 6; index++) value.bookings.push({ id: 'capacity-' + index, studentId: 'other-' + index, date: '2026-10-08', start: 840, duration: 60, tutor: 'chan', status: 'scheduled' });
  before = clone(value); preview = previewRegularScheduleChange(value, positive);
  assert.throws(() => applyRegularScheduleChange(value, positive, { extra: 'allow', fingerprint: preview.fingerprint }), /six students/); assert.deepEqual(value, before);
});

test('permanent change blocks unknown extra bookings and later paid periods instead of losing them', () => {
  const value = state();
  value.bookings.push({ id: 'manually-added', studentId: 'oliver', date: '2026-10-06', start: 1020, duration: 60, tutor: 'wong', status: 'scheduled', note: 'Separately agreed extra lesson', attendance: 'unmarked' });
  let before = clone(value), preview = previewRegularScheduleChange(value, positive);
  assert.ok(preview.conflicts.some(item => item.type === 'unclassified-booking'));
  assert.throws(() => applyRegularScheduleChange(value, positive, { extra: 'allow', fingerprint: preview.fingerprint }), /separate lesson/); assert.deepEqual(value, before);
  value.bookings = value.bookings.filter(item => item.id !== 'manually-added');
  value.invoices.push({ id: 'INV-next', studentId: 'oliver', period: 'Dec–Jan 2026/2027', receiptId: 'R-next', description: 'Regular programme · 8 lessons' });
  value.receipts.push({ id: 'R-next', invoiceId: 'INV-next', studentId: 'oliver', amount: 2000, issuedDate: '2026-09-29' });
  before = clone(value); preview = previewRegularScheduleChange(value, positive);
  assert.throws(() => applyRegularScheduleChange(value, positive, { extra: 'allow', fingerprint: preview.fingerprint }), /future paid period/); assert.deepEqual(value, before);
});

test('calendar closures change actual counts while inconsistent explicit lesson plans remain blocked', () => {
  const value = legacyUnplannedState(); value.centreHolidays = [{ date: '2026-10-08', name: 'Centre closure' }];
  const preview = previewRegularScheduleChange(value, positive);
  assert.equal(preview.proposedCount, 8); assert.equal(preview.proposedLessons.some(item => item.date === '2026-10-08'), false);
  value.centreHolidays = ['2026-10-07'];
  const natural = previewRegularScheduleChange(value, positive);
  assert.equal(natural.beforeCount, 7);
  assert.equal(natural.proposedCount, 9);
  assert.equal(natural.delta, 2);
  assert.ok(!natural.conflicts.some(item => item.type === 'plan'));
  value.invoices.find(item => item.id === positive.invoiceId).lessonPlan = { lessonCount: 8, lessonDates: natural.beforeLessons };
  const invalid = previewRegularScheduleChange(value, positive), before = clone(value);
  assert.ok(invalid.conflicts.some(item => item.type === 'plan'));
  assert.throws(() => applyRegularScheduleChange(value, positive, { extra: 'allow', fingerprint: invalid.fingerprint }), /exact lesson dates/); assert.deepEqual(value, before);
});

test('billing-calendar closure dates stay closed when the regular timetable changes', () => {
  const value = state();
  value.billingCalendar = { closedDates: ['2026-10-08'] };
  const preview = previewRegularScheduleChange(value, positive);
  assert.equal(preview.delta, 0);
  assert.ok(!preview.proposedLessons.some(lesson => lesson.date === '2026-10-08'));
  const before = clone(value);
  value.billingCalendar.closedDates.push('2026-10-15');
  assert.throws(() => applyRegularScheduleChange(value, positive, { fingerprint: preview.fingerprint }), /Preview the change again/);
  value.billingCalendar = before.billingCalendar;
  const result = applyRegularScheduleChange(value, positive, { fingerprint: preview.fingerprint });
  assert.equal(result.revision.lessonCount, 8);
  assert.ok(!result.revision.lessonDates.some(lesson => lesson.date === '2026-10-08'));
  assert.ok(!planned(value).some(lesson => lesson.date === '2026-10-08'));
  assert.equal(result.receipt.amount, 2000);
});

test('two-month packages use natural seven, eight or nine dates without changing the HK$2000 fee', () => {
  for (const count of [7, 8, 9]) {
    const value = legacyUnplannedState();
    value.bookings = value.bookings.filter(item => item.studentId !== 'oliver');
    value.regularSchedules = { ...value.regularSchedules, oliver: { weekday: count === 9 ? 4 : 3, start: 960, duration: 60, tutor: 'chan' } };
    if (count === 7) value.centreHolidays = ['2026-10-07'];
    const invoice = value.invoices.find(item => item.id === positive.invoiceId);
    const receipt = value.receipts.find(item => item.id === 'R-1028'), before = clone(value);
    const input = { ...positive, weekday: count === 9 ? 3 : 2, start: 960, tutor: count === 9 ? 'chan' : 'wong' };
    const preview = previewRegularScheduleChange(value, input);
    assert.equal(preview.beforeCount, count);
    assert.equal(preview.proposedCount, 8);
    assert.equal(preview.delta, 8 - count);
    assert.deepEqual(value, before);
    if (count !== 8) {
      assert.throws(() => applyRegularScheduleChange(value, input, { fingerprint: preview.fingerprint }), /Choose whether/);
      assert.deepEqual(value, before);
    }
    const result = applyRegularScheduleChange(value, input, { fingerprint: preview.fingerprint, extra: 'allow', shortfall: 'decline' });
    assert.equal(result.revision.lessonDates.length, 8);
    assert.equal(value.invoices.find(item => item.id === invoice.id).amount, 2000);
    assert.equal(result.receipt.amount, 2000);
    assert.equal(result.receipt.issuedDate, receipt.issuedDate);
    assert.equal(value.receipts.length, before.receipts.length);
    assert.deepEqual(value.bankTransactions, before.bankTransactions);
  }
});

test('an existing eight-date snapshot remains eight when the natural calendar has nine dates', () => {
  const value = state();
  value.bookings = value.bookings.filter(item => item.studentId !== 'oliver');
  value.regularSchedules = { ...value.regularSchedules, oliver: { weekday: 4, start: 840, duration: 60, tutor: 'chan' } };
  const invoice = value.invoices.find(item => item.id === positive.invoiceId);
  invoice.lessonPlan = { lessonCount: 8, makeUpLessonCount: 0, lessonDates: ['2026-10-01', '2026-10-08', '2026-10-15', '2026-10-22', '2026-10-29', '2026-11-05', '2026-11-12', '2026-11-19'].map(date => ({ date, start: 840, duration: 60, tutor: 'chan' })) };
  const before = clone(invoice.lessonPlan), preview = previewRegularScheduleChange(value, { ...positive, weekday: 3 });
  assert.equal(preview.beforeCount, 8);
  assert.equal(preview.delta, 0);
  assert.deepEqual(invoice.lessonPlan, before);
});

test('period discovery includes issued receipts, explicit dates and cross-year ranges only', () => {
  const value = state(); assert.equal(getSchedulePeriods(value, 'chloe').length, 0);
  assert.deepEqual(getSchedulePeriods(value, 'oliver')[0], { id: 'INV-1028', start: '2026-10-01', end: '2026-11-30', label: 'Oct–Nov 2026', receiptId: 'R-1028' });
  const invoice = value.invoices.find(item => item.id === 'INV-1028'); invoice.period = 'Dec–Jan 2026/2027';
  assert.equal(getSchedulePeriods(value, 'oliver')[0].end, '2027-01-31');
  invoice.periodStart = '2026-09-01'; invoice.periodEnd = '2026-10-31'; invoice.period = 'Custom paid block';
  assert.equal(getSchedulePeriods(value, 'oliver')[0].start, '2026-09-01');
});

test('persisted amended plans survive fixture seeders without restoring excluded lessons', () => {
  const value = state(); apply(value, positive, { extra: 'decline' });
  const reloaded = JSON.parse(JSON.stringify(value)); seedTeacherSchedules(reloaded); seedBusyAfternoons(reloaded);
  assert.equal(planned(reloaded).length, 8); assert.equal(planned(reloaded).some(item => item.date === '2026-11-26'), false); assert.equal(getRegularSchedule(reloaded, 'oliver').weekday, 4);
});

test('the same schedule change works with both branch teacher identities', () => {
  for (const pathname of ['/', '/hh/']) {
    const result = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', `globalThis.location={pathname:${JSON.stringify(pathname)}};const m=await import('./dist/model.js');const r=await import('./dist/regular-schedule.js');const s=m.seed();m.seedTeacherSchedules(s);m.seedBusyAfternoons(s);const input={studentId:'oliver',invoiceId:'INV-1028',effectiveDate:'2026-10-01',weekday:4,start:840,tutor:m.tutors[0].id};const p=r.previewRegularScheduleChange(s,input);const result=r.applyRegularScheduleChange(s,input,{extra:'allow',fingerprint:p.fingerprint});console.log(JSON.stringify({count:result.revision.lessonCount,tutor:r.getRegularSchedule(s,'oliver').tutor}));`], { cwd: new URL('..', import.meta.url), encoding: 'utf8' }));
    assert.equal(result.count, 9); assert.equal(result.tutor, pathname === '/' ? 'chan' : 'ricco');
  }
});

test('later effective date materializes unchanged earlier future lessons and preserves past history', () => {
  const value = state(), original = clone(value.bookings.filter(item => item.studentId === 'oliver' && item.date < '2026-10-01'));
  const input = { ...positive, effectiveDate: '2026-10-15' }, result = apply(value, input, { extra: 'allow' });
  assert.ok(planned(value).some(item => item.date === '2026-10-07' && item.start === 960));
  assert.ok(planned(value).some(item => item.date === '2026-10-14' && item.start === 960));
  assert.ok(planned(value).some(item => item.date === '2026-10-15' && item.start === 840));
  assert.equal(planned(value).length, result.revision.lessonCount);
  const allActiveEntitlements = value.bookings.filter(item => item.studentId === 'oliver' && item.date >= '2026-10-01' && item.date <= '2026-11-30' && activeBooking(item) && !item.caseId && !item.sourceId);
  assert.equal(allActiveEntitlements.length, result.revision.lessonCount, 'unmapped earlier fixture dates cannot remain as extra active lessons');
  assert.deepEqual(allActiveEntitlements.map(item => item.date).sort(), result.revision.lessonDates.map(item => item.date).sort());
  for (const booking of original) assert.deepEqual(value.bookings.find(item => item.id === booking.id), booking);
});

test('changing A to B to A to B recreates every current receipt date despite cancelled prior bookings', () => {
  const value = state();
  apply(value, positive, { extra: 'allow' });
  apply(value, { ...positive, weekday: 3, start: 960 }, { shortfall: 'decline' });
  const result = apply(value, positive, { extra: 'allow' });
  assert.equal(result.revision.id, 'R-1028-A3');
  assert.equal(planned(value).length, result.revision.lessonDates.length);
  assert.equal(planned(value).length, 9);
  for (const lesson of result.revision.lessonDates) {
    assert.equal(planned(value).filter(item => item.date === lesson.date && item.start === lesson.start && item.tutor === lesson.tutor).length, 1, lesson.date);
    assert.ok(planned(value).some(item => item.id === lesson.bookingId));
  }
});

test('leave on a booked schedule-shortfall credit inherits its original cycle and extended deadline', () => {
  const value = state(), result = apply(value, negative, { shortfall: 'credit' });
  result.makeup.expiry = '2026-12-15'; result.makeup.expiryReason = 'Director agreed extra time';
  const [replacement] = bookMakeup(value, result.makeup.id, [{ date: '2026-12-03', start: 840, duration: 60, tutor: 'chan' }]);
  assert.equal(replacement.sourceId, undefined);
  const request = requestAbsence(value, replacement.id, 'School activity');
  const child = value.makeups.find(item => item.id === request.makeupId);
  assert.equal(child.parentCaseId, result.makeup.id); assert.equal(child.period, 'Oct–Nov 2026');
  assert.equal(child.expiry, '2026-12-15'); assert.equal(child.originalExpiry, '2026-11-30');
  assert.equal(child.expiryReason, 'Director agreed extra time');
  assert.equal(replacement.caseId, result.makeup.id);
  normalizeParentLeave(value);
  assert.equal(child.parentCaseId, result.makeup.id); assert.equal(child.expiry, '2026-12-15');
});

test('unknown extra bookings before the effective date block instead of silently exceeding the amended receipt', () => {
  const value = state();
  value.bookings.push({ id: 'manual-earlier-extra', studentId: 'oliver', date: '2026-10-06', start: 1020, duration: 60, tutor: 'wong', status: 'scheduled', attendance: 'unmarked', note: 'Check this separately agreed lesson' });
  const input = { ...positive, effectiveDate: '2026-10-15' }, before = clone(value), preview = previewRegularScheduleChange(value, input);
  assert.ok(preview.conflicts.some(item => item.type === 'unclassified-booking' && item.date === '2026-10-06'));
  assert.throws(() => applyRegularScheduleChange(value, input, { extra: 'allow', fingerprint: preview.fingerprint }), /separate lesson/);
  assert.deepEqual(value, before);
});

test('a later permanent change cannot adopt an already booked credit as a regular lesson', () => {
  const value = state(), result = apply(value, negative, { shortfall: 'credit' });
  const [replacement] = bookMakeup(value, result.makeup.id, [{ date: '2026-10-08', start: 840, duration: 60, tutor: 'chan' }]);
  const input = { ...positive, effectiveDate: '2026-10-07' }, before = clone(value), preview = previewRegularScheduleChange(value, input);
  assert.equal(preview.delta, 1);
  assert.ok(preview.conflicts.some(item => item.date === replacement.date && /already has a lesson/.test(item.reason)));
  assert.throws(() => applyRegularScheduleChange(value, input, { extra: 'allow', fingerprint: preview.fingerprint }), /already has a lesson/);
  assert.deepEqual(value, before);
  assert.equal(value.bookings.find(item => item.id === replacement.id).invoiceId, undefined);
  assert.equal(value.makeups.find(item => item.id === result.makeup.id).used, 60);
});
