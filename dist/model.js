export const TODAY = '2026-09-30';
export const WEEK = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03'];
export const uid = (prefix = 'id') => prefix + '-' + Math.random().toString(36).slice(2, 10);
export const clone = value => structuredClone(value);
export function time(minutes) { return String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0'); }
export function dateLabel(date, options = {}) { return new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...options }); }
export const money = value => 'HK$' + Number(value).toLocaleString('en-HK');
export const students = [
  { id: 'chloe', name: 'Chloe Chan', level: 'P3', initials: 'CC', colour: 'rose', parent: 'Mrs Chan', regular: 'Wednesday · 16:00', focus: 'Equivalent fractions' },
  { id: 'ethan', name: 'Ethan Wong', level: 'P4', initials: 'EW', colour: 'blue', parent: 'Mr Wong', regular: 'Wednesday · 16:00', focus: 'Long division' },
  { id: 'lucas', name: 'Lucas Lee', level: 'P3', initials: 'LL', colour: 'green', parent: 'Mrs Lee', regular: 'Wednesday · 16:00', focus: 'Word problems' },
  { id: 'emma', name: 'Emma Lam', level: 'P2', initials: 'EL', colour: 'amber', parent: 'Mrs Lam', regular: 'Wednesday · 16:00', focus: 'Number sense' },
  { id: 'oliver', name: 'Oliver Ho', level: 'P4', initials: 'OH', colour: 'violet', parent: 'Mr Ho', regular: 'Wednesday · 16:00', focus: 'Decimals' },
  { id: 'sophie', name: 'Sophie Ng', level: 'P3', initials: 'SN', colour: 'teal', parent: 'Mrs Ng', regular: 'Wednesday · 16:00', focus: 'Equivalent fractions' },
  { id: 'mia', name: 'Mia Cheung', level: 'P2', initials: 'MC', colour: 'pink', parent: 'Mrs Cheung', regular: 'Not yet enrolled', focus: 'Entrance assessment' },
  { id: 'ryan', name: 'Ryan Lau', level: 'P5', initials: 'RL', colour: 'slate', parent: 'Mr Lau', regular: 'Friday · 15:00', focus: 'Fractions and ratios' }
];
export const studentById = id => students.find(s => s.id === id) || students[0];
export const worksheets = [
  { id: 'fractions-01', code: 'FR · 031', title: 'Equivalent fractions', topic: 'Fractions', level: 'P3', pages: 1, minutes: 15, colour: 'rose' },
  { id: 'fractions-02', code: 'FR · 032', title: 'Comparing fractions', topic: 'Fractions', level: 'P3', pages: 1, minutes: 20, colour: 'amber' },
  { id: 'division-01', code: 'DV · 041', title: 'Long division', topic: 'Division', level: 'P4', pages: 1, minutes: 20, colour: 'blue' },
  { id: 'words-01', code: 'WP · 023', title: 'A trip to the market', topic: 'Word problems', level: 'P3', pages: 1, minutes: 20, colour: 'green' },
  { id: 'numbers-01', code: 'NS · 012', title: 'Number patterns', topic: 'Number sense', level: 'P2', pages: 1, minutes: 15, colour: 'violet' },
  { id: 'decimals-01', code: 'DC · 042', title: 'Understanding decimals', topic: 'Decimals', level: 'P4', pages: 1, minutes: 20, colour: 'teal' }
];
export const worksheetById = id => worksheets.find(w => w.id === id) || worksheets[0];
export const tutors = [{ id: 'chan', name: 'Ms Chan', initials: 'JC' }, { id: 'wong', name: 'Mr Wong', initials: 'AW' }];
export function seed() {
  const bookings = [];
  const add = (studentId, date, start, tutor = 'chan', extra = {}) => bookings.push({ id: uid('lesson'), studentId, date, start, duration: 60, tutor, status: 'scheduled', attendance: 'unmarked', note: '', ...extra });
  WEEK.forEach((date, day) => {
    if (day === 2) {
      students.slice(0, 6).forEach(s => add(s.id, date, 960));
      ['ryan', 'ethan'].forEach(s => add(s, date, 900, 'wong'));
      ['ryan', 'oliver'].forEach(s => add(s, date, 1020));
    } else {
      const group = day % 2 === 0 ? ['chloe', 'emma', 'lucas'] : ['ethan', 'sophie', 'oliver'];
      group.forEach(s => add(s, date, 960, day === 1 ? 'wong' : 'chan'));
      ['ryan', day % 2 ? 'lucas' : 'sophie'].forEach(s => add(s, date, 900, day === 3 ? 'chan' : 'wong'));
      [day % 2 ? 'emma' : 'ethan'].forEach(s => add(s, date, 1020, day === 1 ? 'wong' : 'chan'));
    }
  });
  const missedId = 'missed-sep23';
  add('chloe', '2026-09-23', 960, 'chan', { id: missedId, status: 'absent', attendance: 'absent', note: 'School activity', caseId: 'makeup-chloe' });
  add('chloe', '2026-10-07', 960);
  add('chloe', '2026-10-14', 960);
  const assignments = [
    { id: 'assignment-chloe-1', studentId: 'chloe', worksheetId: 'fractions-01', status: 'in-progress', homework: false, strokes: [], feedback: [], note: '', working: '', assignedDate: TODAY },
    { id: 'assignment-chloe-2', studentId: 'chloe', worksheetId: 'fractions-02', status: 'upcoming', homework: true, strokes: [], feedback: [], note: '', working: '', assignedDate: TODAY },
    { id: 'assignment-chloe-3', studentId: 'chloe', worksheetId: 'numbers-01', status: 'completed', homework: false, strokes: [], feedback: [], note: 'Great work identifying the pattern.', working: '4, 8, 12, 16, 20', assignedDate: '2026-09-16' },
    ...students.slice(1, 6).map((s, i) => ({ id: 'assignment-' + s.id, studentId: s.id, worksheetId: worksheets[(i + 2) % worksheets.length].id, status: i === 1 ? 'corrections' : 'upcoming', homework: false, strokes: [], feedback: [], note: i === 1 ? 'Please show your working for question 2.' : '', working: '', assignedDate: TODAY }))
  ];
  return {
    version: 4, bookings, assignments,
    makeups: [{ id: 'makeup-chloe', studentId: 'chloe', sourceId: missedId, minutes: 60, used: 0, expiry: '2026-10-14', originalExpiry: '2026-09-30', reason: 'Approved extension for school activity.', period: 'Aug–Sep 2026' }],
    leaveRequests: [],
    lessonNotes: [{ id: 'note-chloe-sep16', studentId: 'chloe', date: '2026-09-16', topics: 'Number patterns and multiplication', performance: 'Working confidently', comment: 'Chloe explained her number patterns clearly today. We will build on this with equivalent fractions next lesson.', homework: 'Complete Number patterns, question 4.', published: true }],
    invoices: [
      { id: 'INV-1024', studentId: 'chloe', amount: 2000, period: 'Oct–Nov 2026', issued: '2026-09-20', due: '2026-10-20', description: 'Regular programme · 8 lessons', receiptId: null, proof: false },
      { id: 'INV-1025', studentId: 'ethan', amount: 2000, period: 'Oct–Nov 2026', issued: '2026-09-20', due: '2026-10-20', description: 'Regular programme · 8 lessons', receiptId: 'R-1025', proof: true },
      { id: 'INV-1026', studentId: 'lucas', amount: 2000, period: 'Oct–Nov 2026', issued: '2026-09-20', due: '2026-10-20', description: 'Regular programme · 8 lessons', receiptId: 'R-1026', proof: true },
      { id: 'INV-1027', studentId: 'emma', amount: 2000, period: 'Oct–Nov 2026', issued: '2026-09-20', due: '2026-10-20', description: 'Regular programme · 8 lessons', receiptId: 'R-1027', proof: true },
      { id: 'INV-1028', studentId: 'oliver', amount: 2000, period: 'Oct–Nov 2026', issued: '2026-09-20', due: '2026-10-20', description: 'Regular programme · 8 lessons', receiptId: 'R-1028', proof: true }
    ],
    receipts: [
      { id: 'R-1025', invoiceId: 'INV-1025', studentId: 'ethan', amount: 2000, proofDate: '2026-09-30', issuedDate: '2026-10-01', bankId: null, note: '' },
      { id: 'R-1026', invoiceId: 'INV-1026', studentId: 'lucas', amount: 2000, proofDate: '2026-09-30', issuedDate: '2026-09-30', bankId: null, note: '' },
      { id: 'R-1027', invoiceId: 'INV-1027', studentId: 'emma', amount: 2000, proofDate: '2026-09-29', issuedDate: '2026-09-29', bankId: null, note: '' },
      { id: 'R-1028', invoiceId: 'INV-1028', studentId: 'oliver', amount: 2000, proofDate: '2026-09-28', issuedDate: '2026-09-28', bankId: 'BANK-104', note: '' }
    ],
    bankTransactions: [
      { id: 'BANK-101', date: '2026-09-30', amount: 2000, reference: 'FPS 908142 · WONG', suggestedStudent: 'ethan' },
      { id: 'BANK-102', date: '2026-10-02', amount: 2000, reference: 'TRANSFER 724810 · LEE', suggestedStudent: 'lucas' },
      { id: 'BANK-103', date: '2026-09-29', amount: 1800, reference: 'FPS 909003 · LAM', suggestedStudent: 'emma' },
      { id: 'BANK-104', date: '2026-09-28', amount: 2000, reference: 'FPS 903416 · HO', suggestedStudent: 'oliver' },
      { id: 'BANK-105', date: '2026-09-30', amount: 2000, reference: 'FPS 910277 · CHAN', suggestedStudent: 'chloe' }
    ],
    assessment: { studentId: 'mia', bookedDate: '2026-09-26', assessmentDate: '2026-09-26', paid: true, status: 'report-ready', enrolled: false, creditDays: 7, report: 'Strong number sense. Further support with word problems and explaining mathematical reasoning would be useful.' },
    messages: [
      { id: 'thread-chloe', studentId: 'chloe', assignedTo: 'Ms Chan', followUp: true, messages: [{ author: 'parent', text: 'Could Chloe make up her missed lesson as two half-hour extensions?', time: '09:12' }, { author: 'centre', text: 'Yes, we can arrange that. I will check the available times for you.', time: '09:18' }] },
      { id: 'thread-ethan', studentId: 'ethan', assignedTo: 'Reception', followUp: false, messages: [{ author: 'parent', text: 'I have sent the payment proof for October and November. Thank you!', time: 'Yesterday' }] },
      { id: 'thread-mia', studentId: 'mia', assignedTo: 'Ms Chan', followUp: true, messages: [{ author: 'parent', text: 'Thank you for the assessment. Can we discuss a Wednesday lesson?', time: '10:04' }] }
    ],
    staff: [
      { id: 'chan', name: 'Ms Jenny Chan', role: 'Teacher', tenure: 3, allowance: 14, taken: 4, holidayCredit: 1, daysOff: 'Tuesday · Sunday', roster: ['Full', 'Off', 'Full', 'Full', 'Full', 'Full', 'Off'] },
      { id: 'wong', name: 'Mr Alex Wong', role: 'Teacher', tenure: 2, allowance: 10, taken: 2, holidayCredit: 0.5, daysOff: 'Monday AM · Thursday PM · Sunday', roster: ['PM', 'Full', 'Full', 'AM', 'Full', 'Full', 'Off'] }
    ],
    staffLeave: [{ id: 'al-001', staffId: 'chan', date: '2026-10-07', unit: 'PM', days: 0.5, reason: 'Personal appointment', status: 'pending' }],
    audit: [{ id: 'audit-seed', text: 'R-1028 matched to BANK-104', actor: 'Accounts administrator', at: '28 Sep, 16:40' }],
    reportSubmitted: false
  };
}
export function activeBooking(b) { return !['moved', 'absent', 'cancelled'].includes(b.status); }
export function overlaps(a, b) { return a.date === b.date && a.start < b.start + b.duration && b.start < a.start + a.duration; }
export function validateSlot(state, booking, ignoreIds = []) {
  if (!booking.date || !Number.isFinite(booking.start) || ![30, 60, 90].includes(booking.duration)) return 'Choose a valid lesson time and duration.';
  if (new Date(booking.date + 'T12:00:00').getDay() === 0) return 'The centre is closed on Sundays.';
  if (booking.start < 900 || booking.start + booking.duration > 1110) return 'Choose a time between 15:00 and 18:30.';
  const staff = state.staff.find(s => s.id === booking.tutor);
  const day = (new Date(booking.date + 'T12:00:00').getDay() + 6) % 7;
  if (staff?.roster[day] === 'Off' || staff?.roster[day] === 'AM') return 'This tutor is not available during this session.';
  if (state.staffLeave.some(l => l.staffId === booking.tutor && l.date === booking.date && l.status === 'approved' && ['Full day', 'PM'].includes(l.unit))) return 'This tutor has approved leave at this time.';
  const others = state.bookings.filter(b => activeBooking(b) && !ignoreIds.includes(b.id));
  if (others.some(b => b.studentId === booking.studentId && overlaps(b, booking))) return 'This student already has a lesson at that time.';
  const sameTutor = others.filter(b => b.tutor === booking.tutor && overlaps(b, booking));
  const points = [...new Set([booking.start, ...sameTutor.map(b => Math.max(booking.start, b.start))])];
  if (points.some(point => sameTutor.filter(b => b.start <= point && b.start + b.duration > point).length >= 6)) return 'This time would exceed six students. Please choose another slot.';
  return null;
}
export function record(state, text, actor = 'Centre manager') { state.audit.unshift({ id: uid('audit'), text, actor, at: '30 Sep, '+new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) }); }
export function usedReschedules(state, studentId, period = 'Aug–Sep 2026') { return state.makeups.filter(m => m.studentId === studentId && m.period === period).length; }
export function cycleForDate(date) {
  let year = Number(date.slice(0,4)), month = Number(date.slice(5,7));
  let start = month % 2 === 0 ? month : month - 1;
  if (start === 0) { start = 12; year--; }
  const first = new Date(Date.UTC(year,start-1,1)), last = new Date(Date.UTC(year,start+1,0));
  const name = d => d.toLocaleDateString('en-GB',{month:'short',timeZone:'UTC'}).replace('Sept','Sep');
  return { period: name(first) + '–' + name(last) + ' ' + (first.getUTCFullYear() === last.getUTCFullYear() ? first.getUTCFullYear() : first.getUTCFullYear() + '/' + last.getUTCFullYear()), expiry: last.toISOString().slice(0,10) };
}
export function moveBooking(state, id, destination) {
  const source = state.bookings.find(b => b.id === id);
  if (!source || !activeBooking(source)) throw new Error('Choose an active lesson to move.');
  const proposed = { ...source, date:destination.date, start:destination.start, tutor:destination.tutor || source.tutor, duration:source.duration, id: uid('lesson'), status: 'scheduled', attendance: 'unmarked', sourceId: source.sourceId || source.id };
  if (source.date === proposed.date && source.start === proposed.start && source.tutor === proposed.tutor) throw new Error('Choose a different time.');
  const error = validateSlot(state, proposed, [id]);
  if (error) throw new Error(error);
  let makeup = state.makeups.find(m => m.id === source.caseId);
  let newCase = false;
  if (!makeup) {
    const cycle = cycleForDate(source.date);
    if (usedReschedules(state, source.studentId, cycle.period) >= 3) throw new Error('Three reschedules have been used for this block. A manager policy decision is needed.');
    makeup = { id: uid('makeup'), sourceId: source.id, studentId: source.studentId, minutes: source.duration, used: source.duration, expiry: cycle.expiry, originalExpiry: cycle.expiry, reason: '', period: cycle.period };
    newCase = true;
  }
  if (proposed.date > makeup.expiry) {
    if (!destination.approvedExpiry || destination.approvedExpiry < proposed.date || !destination.overrideReason?.trim()) throw new Error('This make-up is outside its approved deadline. Extend the deadline first.');
  }
  if (destination.approvedExpiry && destination.approvedExpiry > makeup.expiry && destination.overrideReason?.trim()) { makeup.expiry = destination.approvedExpiry; makeup.reason = destination.overrideReason.trim(); }
  if (newCase) state.makeups.push(makeup);
  proposed.caseId = makeup.id;
  source.status = 'moved';
  source.caseId = makeup.id;
  state.bookings.push(proposed);
  record(state, studentById(source.studentId).name + ' moved from ' + dateLabel(source.date) + ' to ' + dateLabel(proposed.date) + ', ' + time(proposed.start));
  return proposed;
}
export function requestAbsence(state, bookingId, reason) {
  const booking = state.bookings.find(b => b.id === bookingId);
  if (!booking || !activeBooking(booking)) throw new Error('This lesson cannot be changed.');
  if (state.leaveRequests.some(r => r.bookingId === bookingId && r.status === 'pending')) throw new Error('A request for this lesson is already pending.');
  const request = { id: uid('request'), bookingId, studentId: booking.studentId, reason, status: 'pending' };
  state.leaveRequests.push(request);
  return request;
}
export function approveAbsence(state, requestId) {
  const request = state.leaveRequests.find(r => r.id === requestId);
  if (!request || request.status !== 'pending') throw new Error('This request has already been handled.');
  const source = state.bookings.find(b => b.id === request.bookingId);
  if (!source || !activeBooking(source)) throw new Error('The lesson has changed. Review this request again.');
  const cycle = cycleForDate(source.date);
  if (usedReschedules(state, source.studentId, cycle.period) >= 3) throw new Error('This student has used three reschedules for this block.');
  source.status = 'absent'; source.attendance = 'absent';
  request.status = 'approved';
  const makeup = { id: uid('makeup'), sourceId: source.id, studentId: source.studentId, minutes: source.duration, used: 0, expiry: cycle.expiry, originalExpiry: cycle.expiry, reason: request.reason, period: cycle.period };
  source.caseId = makeup.id;
  state.makeups.push(makeup);
  record(state, 'Approved absence for ' + studentById(source.studentId).name + ', ' + dateLabel(source.date));
  return makeup;
}
export function bookMakeup(state, makeupId, slots) {
  const makeup = state.makeups.find(m => m.id === makeupId);
  if (!makeup) throw new Error('Make-up not found.');
  if (!Array.isArray(slots) || !slots.length) throw new Error('Choose at least one replacement.');
  const total = slots.reduce((n, s) => n + s.duration, 0);
  if (total > makeup.minutes - makeup.used) throw new Error('The replacement exceeds the remaining make-up time.');
  const trial = clone(state);
  const created = [];
  for (const slot of slots) {
    if (slot.date > makeup.expiry) throw new Error('A selected time is after the make-up deadline.');
    const booking = { id: uid('lesson'), studentId: makeup.studentId, ...slot, status: 'scheduled', attendance: 'unmarked', sourceId: makeup.sourceId, caseId: makeup.id, note: 'Make-up' };
    const error = validateSlot(trial, booking);
    if (error) throw new Error(error);
    trial.bookings.push(booking); created.push(booking);
  }
  state.bookings.push(...created);
  makeup.used += total;
  if (makeup.used === makeup.minutes) {
    const source = state.bookings.find(b => b.id === makeup.sourceId);
    if (source) source.status = 'moved';
  }
  record(state, 'Booked ' + total + ' min of make-up time for ' + studentById(makeup.studentId).name + ' (' + created.length + ' booking' + (created.length > 1 ? 's' : '') + ')');
  return created;
}
export function issueReceipt(state, invoiceId, issuedDate = TODAY) {
  const invoice = state.invoices.find(i => i.id === invoiceId);
  if (!invoice) throw new Error('Invoice not found.');
  if (invoice.receiptId) return state.receipts.find(r => r.id === invoice.receiptId);
  if (!invoice.proof) throw new Error('Record payment proof first.');
  const receipt = { id: 'R-' + invoice.id.split('-')[1], invoiceId, studentId: invoice.studentId, amount: invoice.amount, proofDate: invoice.proofDate || TODAY, issuedDate, bankId: null, note: '' };
  invoice.receiptId = receipt.id; state.receipts.push(receipt);
  state.reportSubmitted = false; state.reviewedMonths = {};
  record(state, 'Issued ' + receipt.id + ' for ' + money(receipt.amount) + '; bank match pending', 'Reception');
  return receipt;
}
export function reconciliation(state, receipt) {
  const bank = state.bankTransactions.find(b => b.id === receipt.bankId);
  if (!bank) return { status: 'Unmatched', adjustment: null, bank: null, month: null, difference: null };
  return { status: bank.amount === receipt.amount ? 'Matched' : 'Difference', adjustment: bank.date < receipt.issuedDate ? 'Date back' : bank.date > receipt.issuedDate ? 'Date forward' : null, bank, month: bank.date.slice(0, 7), difference: receipt.amount - bank.amount };
}
export function matchReceipt(state, receiptId, bankId) {
  const receipt = state.receipts.find(r => r.id === receiptId);
  const bank = state.bankTransactions.find(b => b.id === bankId);
  if (!receipt || !bank) throw new Error('Select a receipt and bank transaction.');
  if (state.receipts.some(r => r.id !== receiptId && r.bankId === bankId)) throw new Error('This bank transaction is already linked to another receipt.');
  receipt.bankId = bankId;
  record(state, receiptId + ' linked to ' + bankId + ' · ' + reconciliation(state, receipt).status, 'Accounts administrator');
  state.reportSubmitted = false; state.reviewedMonths = {};
  return reconciliation(state, receipt);
}
export function reportingTotals(state, month) {
  const entries = state.receipts.map(r => ({ receipt: r, ...reconciliation(state, r) }));
  const matched = entries.filter(e => e.status === 'Matched' && e.month === month);
  return { total: matched.reduce((n, e) => n + e.bank.amount, 0), matched, unresolved: entries.filter(e => e.status !== 'Matched'), unmatchedBank: state.bankTransactions.filter(b => b.date.startsWith(month) && !state.receipts.some(r => r.bankId === b.id)) };
}
export function assessmentCredit(assessment, enrolDate) {
  const days = (Date.parse(enrolDate) - Date.parse(assessment.assessmentDate)) / 86400000;
  return days >= 0 && days <= assessment.creditDays && assessment.paid ? 200 : 0;
}
export function staffBalance(state, staffId) {
  const staff = state.staff.find(s => s.id === staffId);
  const approved = state.staffLeave.filter(l => l.staffId === staffId && l.status === 'approved').reduce((n, l) => n + l.days, 0);
  const pending = state.staffLeave.filter(l => l.staffId === staffId && l.status === 'pending').reduce((n, l) => n + l.days, 0);
  return { allowance: staff.allowance, holidayCredit: staff.holidayCredit, taken: staff.taken + approved, available: staff.allowance + staff.holidayCredit - staff.taken - approved, pending };
}
