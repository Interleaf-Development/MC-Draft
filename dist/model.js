import { centreConfig } from './branch-config.js';
import { p6Worksheets } from './p6-curriculum.js';
import { p3Worksheets } from './p3-curriculum.js';
import { progressRecordWorksheets } from './progress-records.js';
import { twnRoster } from './twn-roster.js';
import { twnTutorOffTimes } from './twn-availability.js';

export const TODAY = '2026-09-30';
export const centre = { ...centreConfig.centre };
export const WEEK = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'];
export const uid = (prefix = 'id') => prefix + '-' + Math.random().toString(36).slice(2, 10);
export const clone = value => structuredClone(value);
export function time(minutes) { return String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0'); }
export function dateLabel(date, options = {}) { return new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...options }); }
export const money = value => 'HK$' + Number(value).toLocaleString('en-HK');
export const CENTRE_OPEN = 540;
export const CENTRE_CLOSE = 1140;
// Demo assumption until the centre confirms its AM/PM working-day boundary.
export const HALF_DAY_BOUNDARY = 840;
export const tutors = centreConfig.tutors.map(tutor => ({ ...tutor }));
// Timetable shading follows the source's recurring off-time markings, not
// empty bookings or the legacy demonstration staff roster.
export function isTutorOffTime(state, tutorId, date, start, duration = 60) {
  if (centre.code !== 'TWN' || !state?.twnScheduleVersion || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(start) || !Number.isFinite(duration) || duration <= 0) return false;
  const day = new Date(date + 'T12:00:00Z');
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== date) return false;
  const weekday = (day.getUTCDay() + 6) % 7 + 1;
  return (twnTutorOffTimes[tutorId] || []).some(slot => slot.weekday === weekday && start < slot.end && start + duration > slot.start);
}
const firstTutorId = tutors[0].id, secondTutorId = tutors[1].id;
const legacyTutorRosters = {
  [firstTutorId]: ['Full', 'Off', 'Full', 'Full', 'Full', 'Full', 'Off'],
  [secondTutorId]: ['PM', 'Full', 'Full', 'AM', 'Full', 'Full', 'Off']
};
const demoTutorRosters = {
  [firstTutorId]: ['Full', 'Off', 'Full', 'PM', 'Full', 'Full', 'AM'],
  [secondTutorId]: ['PM', 'PM', 'Full', 'AM', 'Full', 'Full', 'PM'],
  ...Object.fromEntries(tutors.slice(2).map((tutor, index) => [tutor.id, Array.from({ length: 7 }, (_, day) => day === index || day === 6 ? 'Off' : 'Full')]))
};
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
const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const directoryColours = ['rose', 'blue', 'green', 'amber', 'violet', 'teal', 'pink', 'slate'];
const directoryFocus = ['Number sense', 'Addition and subtraction', 'Multiplication', 'Long division', 'Equivalent fractions', 'Decimals', 'Word problems', 'Fractions and ratios', 'Algebra'];
students.forEach((student, index) => Object.assign(student, {
  number: 'MC-' + String(index + 1).padStart(4, '0'),
  phone: '0000 ' + String(index + 1).padStart(4, '0'),
  tutor: student.id === 'ryan' ? secondTutorId : firstTutorId,
  day: student.id === 'mia' ? '' : student.id === 'ryan' ? 'Friday' : 'Wednesday',
  status: student.id === 'mia' ? 'assessment' : 'active'
}));
// Directory records only add sample bookings when seedTeacherSchedules is called.
const givenNames = ['Adrian', 'Amber', 'Aiden', 'Alicia', 'Alvin', 'Anson', 'Ashley', 'Audrey', 'Bella', 'Benjamin', 'Caleb', 'Carmen', 'Celia', 'Clara', 'Daniel', 'Daphne', 'Derek', 'Elena', 'Felix', 'Fiona', 'Gabriel', 'Grace', 'Henry', 'Iris', 'Isaac', 'Jasmine', 'Jasper', 'Joyce', 'Justin', 'Kayla', 'Leo', 'Lydia', 'Marcus', 'Natalie', 'Nathan', 'Nicole', 'Oscar', 'Phoebe', 'Samuel', 'Zoe'];
const familyNames = ['Chan', 'Cheung', 'Chiu', 'Choi', 'Chow', 'Chung', 'Fong', 'Ho', 'Hui', 'Ip', 'Kwan', 'Kwok', 'Lam', 'Lau', 'Lee', 'Leung', 'Lo', 'Lok', 'Ma', 'Mak', 'Ng', 'Pang', 'Poon', 'Siu'];
const directoryNames = new Set(students.map(student => student.name));
for (let candidate = 0; students.length < 701; candidate++) {
  const first = givenNames[candidate % givenNames.length];
  const surname = familyNames[Math.floor(candidate / givenNames.length)];
  const name = first + ' ' + surname;
  if (directoryNames.has(name)) continue;
  // Keep the established Mon–Sat directory allocation stable across migrations.
  const index = students.length - 8, number = students.length + 1, day = weekdays[index % 6];
  let tutorIndex = Math.floor(index / 6) % tutors.length;
  while (demoTutorRosters[tutors[tutorIndex].id][index % 6] === 'Off') tutorIndex = (tutorIndex + 1) % tutors.length;
  const tutor = tutors[tutorIndex].id, roster = demoTutorRosters[tutor][index % 6];
  let regularStart = CENTRE_OPEN + (Math.floor(index / (tutors.length * 6)) % 10) * 60;
  if (roster === 'AM') regularStart = Math.min(regularStart, HALF_DAY_BOUNDARY - 60);
  if (roster === 'PM') regularStart = Math.max(regularStart, HALF_DAY_BOUNDARY);
  students.push({
    id: 'student-' + String(number).padStart(4, '0'), number: 'MC-' + String(number).padStart(4, '0'),
    name, initials: first[0] + surname[0], level: ['K3', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2'][index % 9],
    colour: directoryColours[index % directoryColours.length], parent: (index % 2 ? 'Mr ' : 'Mrs ') + surname,
    phone: '0000 ' + String(number).padStart(4, '0'), tutor, day, status: index % 17 === 0 ? 'paused' : 'active',
    regular: day + ' · ' + time(regularStart),
    focus: directoryFocus[index % directoryFocus.length]
  });
  directoryNames.add(name);
}
const sundayExamples = [firstTutorId, secondTutorId].flatMap(tutor => students.slice(8).filter(student => student.tutor === tutor && student.status === 'active').slice(0, 3).map((student, index) => {
  const start = (tutor === firstTutorId ? CENTRE_OPEN : HALF_DAY_BOUNDARY) + index * 120;
  Object.assign(student, { day: 'Sunday', regular: 'Sunday · ' + time(start) });
  return { studentId: student.id, tutor, start };
}));
// The timetable import supplies names and lesson slots only. Keep all other
// pupil details empty, and keep the original fixtures under their original IDs.
export const twnStudents = centre.code === 'TWN' ? twnRoster.map(student => {
  const first = student.sessions[0], day = first ? weekdays[first.weekday - 1] : '';
  return {
    id: student.id, name: student.name, source: 'twn-schedule', number: '',
    level: '', parent: '', phone: '', focus: '', status: 'active',
    initials: student.name.split(/\s+/).map(part => part[0]).slice(0, 2).join(''), colour: 'slate',
    tutor: first?.tutor || '', day, regular: first ? day + ' · ' + time(first.start) : '',
    sessions: student.sessions.map(slot => ({ ...slot }))
  };
}) : [];
export const allStudents = [...students, ...twnStudents];
const studentsById = new Map(allStudents.map(student => [student.id, student]));
export const studentById = id => studentsById.get(id) || students[0];

// Permanent changes historically display the latest saved rule immediately.
// Temporary rules always resolve by date, and explicit dates resolve the entire
// history so a later override can safely return to an earlier temporary rule.
export function resolveRegularScheduleRule(saved, asOf) {
  const date = asOf ?? (saved?.endDate ? TODAY : null);
  let rule = saved;
  while (rule && date && rule.previousRule && (rule.effectiveDate && date < rule.effectiveDate || rule.endDate && date > rule.endDate)) rule = rule.previousRule;
  return rule;
}

export function enrolledStudents(state) {
  const retainedIds = state?.twnScheduleVersion && centre.code === 'TWN' ? new Set([
    ...(state.bookings || []).map(booking => booking.studentId),
    ...Object.keys(state.regularSchedules || {}), ...Object.keys(state.studentProfiles || {}),
    ...(state.assessment?.enrolled ? ['mia'] : [])
  ]) : null;
  const directory = retainedIds ? allStudents.filter(student => student.source === 'twn-schedule' || retainedIds.has(student.id)) : students;
  return directory.filter(student => student.id !== 'mia' || state?.assessment?.enrolled).map(student => {
    const schedule = resolveRegularScheduleRule(state?.regularSchedules?.[student.id]);
    if (schedule) { const day = weekdays[schedule.weekday - 1]; return { ...student, ...(student.id === 'mia' ? { status: 'active', parent: state.assessment.parent || student.parent, phone: state.assessment.phone || student.phone } : {}), tutor: schedule.tutor, day, regular: day + ' · ' + time(schedule.start) }; }
    if (student.id !== 'mia') return student;
    const booking = state.bookings?.find(item => item.studentId === 'mia' && activeBooking(item));
    const day = booking ? new Date(booking.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long' }) : student.day;
    return { ...student, status: 'active', parent: state.assessment.parent || student.parent, phone: state.assessment.phone || student.phone, tutor: booking?.tutor || student.tutor, day, regular: booking ? day + ' · ' + time(booking.start) : student.regular };
  });
}

export function filterStudents(state, { query = '', level = '', tutor = '', day = '', status = '', sort = 'name' } = {}) {
  const norm = value => String(value ?? '').trim().toLowerCase();
  const requested = { level: norm(level), tutor: norm(tutor), day: norm(day), status: norm(status) };
  const tokens = norm(query).split(/\s+/).filter(Boolean);
  const list = enrolledStudents(state).filter(student => {
    if (Object.entries(requested).some(([key, value]) => value && value !== 'all' && norm(student[key]) !== value)) return false;
    const searchable = [student.number, student.id, student.name, student.parent, student.phone].map(norm).join(' ');
    const compact = searchable.replace(/[\s-]/g, '');
    return tokens.every(token => searchable.includes(token) || compact.includes(token.replace(/-/g, '')));
  });
  const compareName = (a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base', numeric: true }) || a.number.localeCompare(b.number);
  const by = {
    name: compareName,
    'name-asc': compareName,
    'name-desc': (a, b) => -compareName(a, b),
    number: (a, b) => a.number.localeCompare(b.number),
    'number-asc': (a, b) => a.number.localeCompare(b.number),
    'number-desc': (a, b) => b.number.localeCompare(a.number),
    level: (a, b) => ['K3', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2'].indexOf(a.level) - ['K3', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2'].indexOf(b.level) || compareName(a, b),
    day: (a, b) => weekdays.indexOf(a.day) - weekdays.indexOf(b.day) || compareName(a, b)
  };
  return list.sort(by[sort] || compareName);
}

export function paginate(items, page = 1, pageSize = 25) {
  pageSize = Number.isFinite(Number(pageSize)) && Number(pageSize) >= 1 ? Math.floor(Number(pageSize)) : 25;
  const total = items.length, pageCount = Math.max(1, Math.ceil(total / pageSize));
  page = Number.isFinite(Number(page)) ? Math.min(pageCount, Math.max(1, Math.floor(Number(page)))) : 1;
  const offset = (page - 1) * pageSize;
  return { items: items.slice(offset, offset + pageSize), total, page, pageSize, pageCount, start: total ? offset + 1 : 0, end: Math.min(offset + pageSize, total) };
}

export const BILLING_FIXTURE_VERSION = 2;
const parentGivenNames = ['Agnes', 'Albert', 'Anita', 'Bernard', 'Bonnie', 'Charles', 'Christine', 'David', 'Doris', 'Douglas', 'Edith', 'Edward', 'Eileen', 'Francis', 'Gloria', 'Gordon', 'Helen', 'Herman', 'Irene', 'Ivan', 'Janet', 'Jeffrey', 'Joanna', 'Kenneth', 'Lillian', 'Martin', 'May', 'Nelson', 'Pauline', 'Philip', 'Regina', 'Richard', 'Rosanna', 'Simon', 'Stella', 'Stephen', 'Susan', 'Thomas', 'Vivian', 'Wallace'];
const corePayers = { chloe: 'Elaine Chan', ethan: 'Victor Wong', lucas: 'Teresa Lee', emma: 'Winnie Lam', oliver: 'Patrick Ho', sophie: 'Selina Ng', mia: 'Cynthia Cheung', ryan: 'Raymond Lau' };
export function billingPayerName(state, studentId) {
  const student = studentsById.get(studentId), profile = state?.studentProfiles?.[studentId];
  if (!student) return '';
  if (profile?.parentGivenName?.trim() && profile?.parentSurname?.trim()) return profile.parentGivenName.trim() + ' ' + profile.parentSurname.trim();
  if (student.source === 'twn-schedule') return '';
  return corePayers[studentId] || parentGivenNames[(Number(student.number.slice(3)) - 9) % parentGivenNames.length] + ' ' + student.name.split(' ').slice(1).join(' ');
}
const legacyAwaitingGeneratedInvoices = new Set(students.slice(8).filter(student => student.status === 'active').slice(-104).map(student => student.id));
const awaitingGeneratedInvoices = new Set(students.slice(8).filter((student, index) => student.status === 'active' && ![4, 9].includes(index))
  .sort((a, b) => (Math.imul(Number(a.number.slice(3)), 2654435761) >>> 0) - (Math.imul(Number(b.number.slice(3)), 2654435761) >>> 0))
  .slice(0, 104).map(student => student.id));
function fixtureReview(invoice, submittedDate, paymentDate, status = 'passed') {
  const uncertain = status === 'needs-review';
  return { id: 'fixture-proof-' + invoice.id, mode: 'demo', fixture: true, scenario: uncertain ? 'unreadable' : 'pass', status,
    checks: [{ key: 'isPaymentProof', label: 'Payment proof', status: uncertain ? 'uncertain' : 'pass', detail: uncertain ? 'Payment details cannot be read.' : 'Fictional transfer confirmation.' }, { key: 'recipient', label: 'Recipient is MathConcept', status: uncertain ? 'uncertain' : 'pass', detail: centre.name }, { key: 'amount', label: 'Amount matches invoice', status: uncertain ? 'uncertain' : 'pass', detail: 'HK$' + invoice.amount }, { key: 'duplicate', label: 'Proof has not been used', status: 'pass', detail: 'No duplicate fixture proof.' }],
    extracted: { recipient: uncertain ? null : centre.name, amount: uncertain ? null : invoice.amount, payer: uncertain ? null : invoice.proofPayer, reference: uncertain ? null : invoice.proofReference, paymentDate },
    reasons: uncertain ? ['Payment details cannot be read.'] : [], submittedDate };
}
function billingBundle(student, suffix, { historic = false, unpaid = false, review = false, pending = false, submittedDate, paymentDate, bankDate, reference, bankId } = {}) {
  submittedDate ||= historic ? '2026-08-10' : '2026-09-' + String(22 + Number(student.number.slice(3)) % 8).padStart(2, '0');
  paymentDate ||= submittedDate; bankDate ||= paymentDate; reference ||= 'DEMO ' + student.number;
  const invoice = { id: 'INV-' + suffix, studentId: student.id, amount: 2000, period: historic ? 'Aug–Sep 2026' : 'Oct–Nov 2026', issued: historic ? '2026-07-20' : '2026-09-20', due: historic ? '2026-08-20' : '2026-10-20', description: 'Regular programme · 8 lessons', receiptId: unpaid || review ? null : 'R-' + suffix, proof: !unpaid, proofPayer: billingPayerName(null, student.id) };
  if (!unpaid) Object.assign(invoice, { proofDate: submittedDate, claimedPaymentDate: paymentDate, proofReference: reference, proofReview: fixtureReview({ ...invoice, proofReference: reference }, submittedDate, paymentDate, review ? 'needs-review' : 'passed') });
  const receipt = invoice.receiptId ? { id: invoice.receiptId, invoiceId: invoice.id, studentId: student.id, amount: 2000, proofDate: submittedDate, issuedDate: submittedDate, bankId: pending ? null : bankId || 'BANK-' + suffix, note: '', issuedBy: 'Automatic proof check' } : null;
  const bank = receipt && !pending ? { id: receipt.bankId, date: bankDate, amount: 2000, reference, payer: invoice.proofPayer, suggestedStudent: student.id, direction: 'credit' } : null;
  return { invoice, receipt, bank };
}
function generatedBillingBundle(student, index, previous = false) {
  return billingBundle(student, String(5001 + index), { historic: student.status === 'paused', unpaid: (previous ? legacyAwaitingGeneratedInvoices : awaitingGeneratedInvoices).has(student.id), review: index === 9, pending: index === 4 });
}
function coreBillingBundles() {
  return [
    billingBundle(studentById('chloe'), '1024', { unpaid: true }),
    billingBundle(studentById('ethan'), '1025', { historic: true, pending: true, submittedDate: '2026-08-01', paymentDate: '2026-07-31', reference: '908142' }),
    billingBundle(studentById('lucas'), '1026', { historic: true, pending: true, submittedDate: '2026-07-31', paymentDate: '2026-07-31', reference: '724810' }),
    billingBundle(studentById('emma'), '1027', { pending: true, submittedDate: '2026-09-29', reference: '909003' }),
    billingBundle(studentById('oliver'), '1028', { submittedDate: '2026-09-28', reference: 'FPS 903416 · HO', bankId: 'BANK-104' }),
    billingBundle(studentById('sophie'), '1030'),
    billingBundle(studentById('ryan'), '1031'),
    billingBundle(studentById('ethan'), '1032', { unpaid: true }),
    billingBundle(studentById('lucas'), '1033', { unpaid: true })
  ];
}
function appendBillingBundle(state, bundle) {
  state.invoices.push(bundle.invoice);
  if (bundle.receipt) state.receipts.push(bundle.receipt);
  if (bundle.bank) state.bankTransactions.push(bundle.bank);
}

// Exact previous fixture shapes let the upgrade distinguish sample data from edits.
function legacyGeneratedBillingBundle(student, index) {
  const suffix = String(5001 + index), historic = student.status === 'paused', group = index % 10;
  const hasProof = historic || group >= 2, hasReceipt = historic || group >= 4, bankMatched = historic || group >= 6, mismatch = !historic && group === 9 && index % 3 === 0;
  const issuedDate = historic ? '2026-08-21' : group === 6 ? '2026-10-01' : '2026-09-29';
  const invoice = { id: 'INV-' + suffix, studentId: student.id, amount: 2000, period: historic ? 'Aug–Sep 2026' : 'Oct–Nov 2026', issued: historic ? '2026-07-20' : '2026-09-20', due: historic ? '2026-08-20' : '2026-10-20', description: 'Regular programme · 8 lessons', receiptId: hasReceipt ? 'R-' + suffix : null, proof: hasProof, ...(hasProof ? { proofDate: historic ? '2026-08-21' : '2026-09-29', proofReference: 'DEMO ' + student.number } : {}) };
  return { invoice,
    receipt: hasReceipt ? { id: invoice.receiptId, invoiceId: invoice.id, studentId: student.id, amount: 2000, proofDate: invoice.proofDate, issuedDate, bankId: bankMatched ? 'BANK-' + suffix : null, note: mismatch ? 'Review the HK$200 difference with the parent.' : '' } : null,
    bank: hasReceipt ? { id: 'BANK-' + suffix, date: historic ? '2026-08-21' : group === 6 ? '2026-09-30' : group === 7 ? '2026-10-01' : '2026-09-29', amount: mismatch ? 1800 : 2000, reference: 'DEMO TRANSFER · ' + student.number, suggestedStudent: student.id } : null };
}
function legacyCoreBillingBundles() {
  return ['chloe', 'ethan', 'lucas', 'emma', 'oliver'].map((id, index) => {
    const suffix = String(1024 + index), proof = index > 0, date = index === 3 ? '2026-09-29' : index === 4 ? '2026-09-28' : '2026-09-30';
    return {
      invoice: { id: 'INV-' + suffix, studentId: id, amount: 2000, period: 'Oct–Nov 2026', issued: '2026-09-20', due: '2026-10-20', description: 'Regular programme · 8 lessons', receiptId: proof ? 'R-' + suffix : null, proof },
      receipt: proof ? { id: 'R-' + suffix, invoiceId: 'INV-' + suffix, studentId: id, amount: 2000, proofDate: date, issuedDate: index === 1 ? '2026-10-01' : date, bankId: index === 4 ? 'BANK-104' : null, note: '' } : null,
      bank: { id: 'BANK-' + (index === 0 ? '105' : 100 + index), date: index === 2 ? '2026-10-02' : date, amount: index === 3 ? 1800 : 2000, reference: ['FPS 910277 · CHAN', 'FPS 908142 · WONG', 'TRANSFER 724810 · LEE', 'FPS 909003 · LAM', 'FPS 903416 · HO'][index], suggestedStudent: id }
    };
  });
}
function sameFixture(a, b) {
  return a === b || Boolean(a && b && typeof a === 'object' && typeof b === 'object' && Object.keys(a).length === Object.keys(b).length && Object.keys(b).every(key => sameFixture(a[key], b[key])));
}
function normalizeBillingMessages(state) {
  for (const thread of state.messages || []) {
    const invoice = state.invoices.filter(item => item.studentId === thread.studentId).sort((a, b) => b.issued.localeCompare(a.issued))[0];
    for (const message of thread.messages || []) {
      if (message.author === 'centre' && ['Thank you. Reception will issue the receipt and our accounts team will reconcile the bank entry.', 'Your receipt is available in Payments. We’ll match it to the bank statement.'].includes(message.text)) {
        message.text = invoice?.receiptId ? 'Your receipt is available in Payments. We’ll match it to the bank statement.' : invoice?.proof ? 'We need a clearer payment proof. Please upload it in Payments.' : 'Your invoice is in Payments. Payment is due on ' + dateLabel(invoice?.due || '2026-10-20') + '.';
      }
      if (message.author === 'parent' && message.text === 'I have sent the tuition payment proof. Please let me know if you need anything else.' && !invoice?.proof) message.text = 'When is the next tuition payment due?';
      if (thread.id === 'thread-ethan' && message.author === 'parent' && message.text === 'I have sent the payment proof for October and November. Thank you!') message.text = 'Thank you. I can see the receipt for August and September in Payments.';
    }
  }
  return state;
}
export function seedBillingLedger(state) {
  if (state.billingFixtureVersion >= BILLING_FIXTURE_VERSION) return normalizeBillingMessages(state);
  let changed = false;
  const pairs = (state.billingFixtureVersion === 1 ? coreBillingBundles().slice(0, 7) : legacyCoreBillingBundles()).map((old, index) => [old, coreBillingBundles()[index]])
    .concat(students.slice(8).map((student, index) => [state.billingFixtureVersion === 1 ? generatedBillingBundle(student, index, true) : legacyGeneratedBillingBundle(student, index), generatedBillingBundle(student, index)]));
  for (const [old, fresh] of pairs) {
    const invoice = state.invoices.find(item => item.id === old.invoice.id);
    const receipt = state.receipts.find(item => item.invoiceId === old.invoice.id) || null;
    const bank = old.bank ? state.bankTransactions.find(item => item.id === old.bank.id) || null : null;
    if (!invoice) continue;
    const comparableInvoice = { ...invoice }, comparableReceipt = receipt ? { ...receipt } : null, comparableBank = bank ? { ...bank } : null;
    // Earlier normalization only added core references; an import could add payer and the expected bank link.
    const coreReference = { 'INV-1025': '908142', 'INV-1026': '724810', 'INV-1027': '909003', 'INV-1028': '903416' }[old.invoice.id];
    if (!old.invoice.proofReview && coreReference && comparableInvoice.proofReference === coreReference) delete comparableInvoice.proofReference;
    if (comparableBank?.payer === studentById(old.invoice.studentId).name) delete comparableBank.payer;
    if (comparableReceipt?.bankId === old.bank?.id && old.receipt?.bankId === null) comparableReceipt.bankId = null;
    if (!sameFixture(comparableInvoice, old.invoice) || !sameFixture(comparableReceipt, old.receipt) || !sameFixture(comparableBank, old.bank)) continue;
    if (bank && state.receipts.some(item => item.id !== receipt?.id && item.bankId === bank.id)) continue;
    if (fresh.receipt && state.receipts.some(item => item.id === fresh.receipt.id && item !== receipt)) continue;
    if (fresh.bank && state.bankTransactions.some(item => item.id === fresh.bank.id && item !== bank)) continue;
    const retainedLink = receipt?.bankId;
    changed = true;
    Object.keys(invoice).forEach(key => delete invoice[key]); Object.assign(invoice, fresh.invoice);
    if (receipt) state.receipts.splice(state.receipts.indexOf(receipt), 1);
    if (bank) state.bankTransactions.splice(state.bankTransactions.indexOf(bank), 1);
    if (fresh.receipt) {
      // Existing links survive, including matches made by the earlier sample import.
      if (retainedLink) fresh.receipt.bankId = retainedLink;
      state.receipts.push(fresh.receipt);
    }
    if (fresh.bank) state.bankTransactions.push(fresh.bank);
    else if (bank && fresh.receipt) {
      const date = invoice.studentId === 'ethan' ? '2026-07-31' : invoice.studentId === 'lucas' ? '2026-08-02' : fresh.invoice.claimedPaymentDate;
      state.bankTransactions.push({ ...bank, date, payer: fresh.invoice.proofPayer });
    } else if (bank && invoice.studentId === 'chloe') state.bankTransactions.push({ ...bank, payer: invoice.proofPayer });
    // The old sample's two deliberate duplicate deposits are fixture-owned too.
    if (receipt?.id === 'R-5005') for (const duplicate of state.bankTransactions) {
      if (['DEMO-AMBIGUOUS-R-5005-A', 'DEMO-AMBIGUOUS-R-5005-B'].includes(duplicate.transactionId)
        && duplicate.date === old.receipt.proofDate && duplicate.amount === old.receipt.amount
        && duplicate.reference === old.invoice.proofReference && duplicate.payer === studentById(invoice.studentId).name) {
        duplicate.date = fresh.invoice.claimedPaymentDate; duplicate.payer = fresh.invoice.proofPayer;
      }
    }
  }
  for (const bundle of coreBillingBundles().slice(5)) {
    if (!state.invoices.some(item => item.id === bundle.invoice.id || item.studentId === bundle.invoice.studentId && item.period === bundle.invoice.period)
      && !state.receipts.some(item => item.id === bundle.receipt?.id) && !state.bankTransactions.some(item => item.id === bundle.bank?.id)) { appendBillingBundle(state, bundle); changed = true; }
  }
  if (changed) { state.reportSubmitted = false; state.reviewedMonths = {}; }
  state.billingFixtureVersion = BILLING_FIXTURE_VERSION;
  return normalizeBillingMessages(state);
}

// Idempotent browser migration: preserve original scenarios and any user edits.
export function seedCentreVolume(state) {
  const invoiceIds = new Set(state.invoices.map(invoice => invoice.id));
  const threadStudentIds = new Set(state.messages.map(thread => thread.studentId));
  const topics = [
    ['Could you confirm the time for our next lesson?', 'Your regular lesson time is unchanged. We look forward to seeing you.'],
    ['We may need to change a lesson because of a school activity.', 'Please send the date when you have it, and we can check replacement times.'],
    ['Thank you for the lesson update. We will finish the homework this week.', 'Thank you. Please keep the working so the tutor can review it next lesson.'],
    ['I have sent the tuition payment proof. Please let me know if you need anything else.', 'Your receipt is available in Payments. We’ll match it to the bank statement.'],
    ['Could the tutor share which topic we should practise at home?', 'We will add the recommended practice to the next lesson record.']
  ];
  students.slice(8).forEach((student, index) => {
    const suffix = String(5001 + index), invoiceId = 'INV-' + suffix;
    if (!invoiceIds.has(invoiceId)) {
      appendBillingBundle(state, generatedBillingBundle(student, index));
      invoiceIds.add(invoiceId);
    }
    if (index < 120 && !threadStudentIds.has(student.id)) {
      const [question, answer] = topics[index % topics.length], followUp = index % 4 === 0;
      state.messages.push({
        id: 'thread-' + student.id, studentId: student.id, assignedTo: index % 3 === 0 ? 'Reception' : tutors.find(tutor => tutor.id === student.tutor).name, followUp,
        messages: [{ author: 'parent', text: question, time: 'Yesterday' }, ...(!followUp ? [{ author: 'centre', text: answer, time: 'Yesterday' }] : [])]
      });
      threadStudentIds.add(student.id);
    }
  });
  return normalizeBillingMessages(state);
}
const originalWorksheets = [
  { id: 'fractions-01', code: 'FR · 031', title: 'Equivalent fractions', topic: 'Fractions', level: 'P3', pages: 1, minutes: 15, colour: 'rose' },
  { id: 'fractions-02', code: 'FR · 032', title: 'Comparing fractions', topic: 'Fractions', level: 'P3', pages: 1, minutes: 20, colour: 'amber' },
  { id: 'division-01', code: 'DV · 041', title: 'Long division', topic: 'Division', level: 'P4', pages: 1, minutes: 20, colour: 'blue' },
  { id: 'words-01', code: 'WP · 023', title: 'A trip to the market', topic: 'Word problems', level: 'P3', pages: 1, minutes: 20, colour: 'green' },
  { id: 'numbers-01', code: 'NS · 012', title: 'Number patterns', topic: 'Number sense', level: 'P2', pages: 1, minutes: 15, colour: 'violet' },
  { id: 'decimals-01', code: 'DC · 042', title: 'Understanding decimals', topic: 'Decimals', level: 'P4', pages: 1, minutes: 20, colour: 'teal' }
];
export const worksheets = [...originalWorksheets, ...p6Worksheets, ...p3Worksheets, ...progressRecordWorksheets];
export const worksheetById = id => worksheets.find(w => w.id === id) || worksheets[0];
// Keep these original session examples recognizable when upgrading saved demos.
function coreWeekExamples() {
  const examples = [];
  const add = (studentId, date, start, tutor = firstTutorId) => examples.push({ studentId, date, start, tutor });
  WEEK.slice(0, 6).forEach((date, day) => {
    if (day === 2) {
      students.slice(0, 6).forEach(s => add(s.id, date, 960));
      ['ryan', 'ethan'].forEach(s => add(s, date, 900, secondTutorId));
      ['ryan', 'oliver'].forEach(s => add(s, date, 1020));
    } else {
      const group = day % 2 === 0 ? ['chloe', 'emma', 'lucas'] : ['ethan', 'sophie', 'oliver'];
      group.forEach(s => add(s, date, 960, day === 1 ? secondTutorId : firstTutorId));
      ['ryan', day % 2 ? 'lucas' : 'sophie'].forEach(s => add(s, date, 900, day === 3 ? firstTutorId : secondTutorId));
      [day % 2 ? 'emma' : 'ethan'].forEach(s => add(s, date, 1020, day === 1 ? secondTutorId : firstTutorId));
    }
  });
  return examples;
}
export function seed() {
  const bookings = [];
  const add = (studentId, date, start, tutor = firstTutorId, extra = {}) => bookings.push({ id: uid('lesson'), studentId, date, start, duration: 60, tutor, status: 'scheduled', attendance: 'unmarked', note: '', ...extra });
  for (const example of coreWeekExamples()) {
    if (studentById(example.studentId).tutor === example.tutor) add(example.studentId, example.date, example.start, example.tutor);
  }
  const missedId = 'missed-sep23';
  add('chloe', '2026-09-23', 960, firstTutorId, { id: missedId, status: 'absent', attendance: 'absent', note: 'School activity', caseId: 'makeup-chloe' });
  add('chloe', '2026-10-07', 960);
  add('chloe', '2026-10-14', 960);
  const assignments = [
    { id: 'assignment-chloe-1', studentId: 'chloe', worksheetId: 'fractions-01', status: 'in-progress', homework: false, strokes: [], feedback: [], note: '', working: '', assignedDate: TODAY },
    { id: 'assignment-chloe-2', studentId: 'chloe', worksheetId: 'fractions-02', status: 'upcoming', homework: true, strokes: [], feedback: [], note: '', working: '', assignedDate: TODAY },
    { id: 'assignment-chloe-3', studentId: 'chloe', worksheetId: 'numbers-01', status: 'completed', homework: false, strokes: [], feedback: [], note: 'Great work identifying the pattern.', working: '4, 8, 12, 16, 20', assignedDate: '2026-09-16' },
    ...students.slice(1, 6).map((s, i) => ({ id: 'assignment-' + s.id, studentId: s.id, worksheetId: originalWorksheets[(i + 2) % originalWorksheets.length].id, status: i === 1 ? 'corrections' : 'upcoming', homework: false, strokes: [], feedback: [], note: i === 1 ? 'Please show your working for question 2.' : '', working: '', assignedDate: TODAY }))
  ];
  return normalizeParentLeave({
    version: 4, bookings, assignments,
    makeups: [{ id: 'makeup-chloe', studentId: 'chloe', sourceId: missedId, minutes: 60, used: 0, expiry: '2026-10-14', originalExpiry: '2026-09-30', reason: 'Approved extension for school activity.', period: 'Aug–Sep 2026' }],
    leaveRequests: [],
    lessonNotes: [{ id: 'note-chloe-sep16', studentId: 'chloe', date: '2026-09-16', topics: 'Number patterns and multiplication', performance: 'Working confidently', comment: 'Chloe explained her number patterns clearly today. We will build on this with equivalent fractions next lesson.', homework: 'Complete Number patterns, question 4.', published: true }],
    billingFixtureVersion: BILLING_FIXTURE_VERSION,
    invoices: coreBillingBundles().map(bundle => bundle.invoice),
    receipts: coreBillingBundles().flatMap(bundle => bundle.receipt ? [bundle.receipt] : []),
    bankTransactions: coreBillingBundles().flatMap(bundle => bundle.bank ? [bundle.bank] : []),
    assessment: { studentId: 'mia', bookedDate: '2026-09-26', assessmentDate: '2026-09-26', paid: true, status: 'report-ready', enrolled: false, creditDays: 7, report: 'Strong number sense. Further support with word problems and explaining mathematical reasoning would be useful.' },
    messages: [
      { id: 'thread-chloe', studentId: 'chloe', assignedTo: tutors[0].name, followUp: true, messages: [{ author: 'parent', text: 'Could Chloe make up her missed lesson as two half-hour extensions?', time: '09:12' }, { author: 'centre', text: 'Yes, we can arrange that. I will check the available times for you.', time: '09:18' }] },
      { id: 'thread-ethan', studentId: 'ethan', assignedTo: 'Reception', followUp: false, messages: [{ author: 'parent', text: 'Thank you. I can see the receipt for August and September in Payments.', time: 'Yesterday' }] },
      { id: 'thread-mia', studentId: 'mia', assignedTo: tutors[0].name, followUp: true, messages: [{ author: 'parent', text: 'Thank you for the assessment. Can we discuss a Wednesday lesson?', time: '10:04' }] }
    ],
    staff: [
      { id: firstTutorId, name: centre.manager, role: 'Centre director', tenure: 3, allowance: 14, taken: 4, holidayCredit: 1, daysOff: 'Tuesday · Thursday AM · Sunday PM', roster: [...demoTutorRosters[firstTutorId]] },
      { id: secondTutorId, name: tutors[1].name, role: 'Teacher', tenure: 2, allowance: 10, taken: 2, holidayCredit: 0.5, daysOff: 'Monday AM · Tuesday AM · Thursday PM · Sunday AM', roster: [...demoTutorRosters[secondTutorId]] }
    ],
    staffLeave: [],
    audit: [{ id: 'audit-seed', text: 'R-1028 matched to BANK-104', actor: 'Accounts administrator', at: '28 Sep, 16:40' }],
    reportSubmitted: false
  });
}
export function seedTeacherSchedules(state) {
  if (state.twnScheduleVersion && centre.code === 'TWN') return state;
  const manager = state.staff.find(staff => staff.id === centre.managerId);
  if (manager) Object.assign(manager, { name: centre.manager, role: 'Centre director' });
  if (state.teacherSchedulesVersion === 1) return seedSundaySchedules(state);
  const legacyNames = new Map([['Ms Chan', tutors[0].name], ['Ms Jenny Chan', tutors[0].name], ['Mr Wong', tutors[1].name], ['Mr Alex Wong', tutors[1].name]]);
  for (const tutor of tutors) {
    const existing = state.staff.find(staff => staff.id === tutor.id);
    if (existing) existing.name = tutor.id === centre.managerId ? centre.manager : tutor.name;
    else {
      const roster = [...demoTutorRosters[tutor.id]];
      state.staff.push({ id: tutor.id, name: tutor.name, role: 'Teacher', tenure: 2, allowance: 10, taken: 2, holidayCredit: 0, daysOff: roster.map((unit, day) => unit === 'Off' ? weekdays[day] : null).filter(Boolean).join(' · '), roster });
    }
  }
  for (const thread of state.messages) {
    if (legacyNames.has(thread.assignedTo)) {
      const student = studentsById.get(thread.studentId);
      thread.assignedTo = student && student.id.startsWith('student-') ? tutors.find(tutor => tutor.id === student.tutor).name : legacyNames.get(thread.assignedTo);
    }
  }
  const existingIds = new Set(state.bookings.map(booking => booking.id));
  students.slice(8).forEach((student, index) => {
    if ([firstTutorId, secondTutorId].includes(student.tutor) || student.status !== 'active') return;
    const date = WEEK[weekdays.indexOf(student.day)], [hour, minute] = student.regular.split(' · ')[1].split(':').map(Number);
    const booking = { id: 'schedule-v1-' + student.id, studentId: student.id, date, start: hour * 60 + minute, duration: 60, tutor: student.tutor, status: 'scheduled', attendance: date < TODAY || date === TODAY && index % 3 === 0 ? 'present' : 'unmarked', note: '' };
    if (existingIds.has(booking.id) || validateSlot(state, booking)) return;
    state.bookings.push(booking);
    existingIds.add(booking.id);
  });
  state.teacherSchedulesVersion = 1;
  return seedSundaySchedules(state);
}
function rosterAllows(roster, booking) {
  const day = (new Date(booking.date + 'T12:00:00').getDay() + 6) % 7, unit = roster[day];
  return unit === 'Full' || unit === 'AM' && booking.start + booking.duration <= HALF_DAY_BOUNDARY || unit === 'PM' && booking.start >= HALF_DAY_BOUNDARY;
}
export function seedSundaySchedules(state) {
  if (state.twnScheduleVersion && centre.code === 'TWN') return state;
  if (state.sundayScheduleVersion === 1) return state;
  for (const [id, oldRoster] of Object.entries(legacyTutorRosters)) {
    const staff = state.staff.find(item => item.id === id), replacement = demoTutorRosters[id];
    if (!staff || JSON.stringify(staff.roster) !== JSON.stringify(oldRoster)) continue;
    // Do not make a saved lesson unavailable just to install sample Sunday hours.
    if (state.bookings.some(booking => booking.tutor === id && activeBooking(booking) && !rosterAllows(replacement, booking))) continue;
    staff.roster = [...replacement];
    staff.daysOff = replacement.map((unit, day) => unit === 'Full' ? null : weekdays[day] + (unit === 'AM' ? ' PM' : unit === 'PM' ? ' AM' : '')).filter(Boolean).join(' · ');
  }
  const existingIds = new Set(state.bookings.map(booking => booking.id));
  for (const example of sundayExamples) {
    const booking = { id: 'sunday-v1-' + example.studentId, ...example, date: WEEK[6], duration: 60, status: 'scheduled', attendance: 'unmarked', note: '' };
    if (existingIds.has(booking.id) || validateSlot(state, booking)) continue;
    state.bookings.push(booking);
    existingIds.add(booking.id);
  }
  state.sundayScheduleVersion = 1;
  return state;
}
function removeCrossTeacherFixtures(state) {
  const key = booking => [booking.studentId, booking.date, booking.start, booking.tutor].join('|');
  const oldCore = new Set(coreWeekExamples().filter(booking => studentById(booking.studentId).tutor !== booking.tutor).map(key));
  const linkedIds = new Set([
    ...state.bookings.flatMap(booking => [booking.sourceId].filter(Boolean)),
    ...state.makeups.map(makeup => makeup.sourceId),
    ...state.leaveRequests.map(request => request.bookingId),
    ...(state.checkInPasses || []).map(pass => pass.bookingId)
  ]);
  // Only replace untouched generated examples. Saved moves, notes, attendance,
  // make-ups and manual bookings retain their student and history.
  state.bookings = state.bookings.filter(booking => {
    const student = studentsById.get(booking.studentId);
    if (!student || student.tutor === booking.tutor || linkedIds.has(booking.id)
      || booking.status !== 'scheduled' || booking.duration !== 60 || booking.note
      || booking.caseId || booking.sourceId) return true;
    const oldAfternoonId = 'afternoon-v1-' + booking.date + '-' + booking.tutor + '-' + booking.start + '-' + booking.studentId;
    const untouchedAfternoon = booking.id === oldAfternoonId && booking.attendance === (booking.date < TODAY ? 'present' : 'unmarked');
    const untouchedCore = booking.id.startsWith('lesson-') && oldCore.has(key(booking)) && booking.attendance === 'unmarked';
    return !untouchedAfternoon && !untouchedCore;
  });
}
export function seedBusyAfternoons(state) {
  if (state.twnScheduleVersion && centre.code === 'TWN') return state;
  if (state.busyAfternoonsVersion === 2) return state;
  removeCrossTeacherFixtures(state);
  const candidates = students.slice(8).filter(student => student.status === 'active');
  const weeklyLoad = new Map(), bookedDays = new Set();
  for (const booking of state.bookings.filter(booking => activeBooking(booking) && WEEK.includes(booking.date))) {
    weeklyLoad.set(booking.studentId, (weeklyLoad.get(booking.studentId) || 0) + 1);
    bookedDays.add(booking.studentId + '|' + booking.date);
  }
  const existingIds = new Set(state.bookings.map(booking => booking.id));
  WEEK.forEach((date, dayIndex) => tutors.forEach((tutor, tutorIndex) => [960, 1020, 1080].forEach((start, hourIndex) => {
    const slot = { date, tutor: tutor.id, start, duration: 60 };
    if (validateSlot(state, { ...slot, studentId: 'fixture-availability-probe' })) return;
    // Leave a seat for Chloe's move and split-extension walkthroughs.
    const walkthroughSlot = tutor.id === firstTutorId && start === 1020 && [TODAY, '2026-10-02'].includes(date);
    const target = walkthroughSlot || (dayIndex + tutorIndex + hourIndex) % 2 === 0 ? 5 : 6;
    const overlapping = state.bookings.filter(booking => activeBooking(booking) && booking.tutor === tutor.id && overlaps(booking, slot));
    const points = [start, ...overlapping.map(booking => Math.max(start, booking.start))];
    let occupancy = Math.max(0, ...points.map(point => overlapping.filter(booking => booking.start <= point && booking.start + booking.duration > point).length));
    const rotation = (dayIndex * tutors.length * 3 + tutorIndex * 3 + hourIndex) * 37;
    const pool = candidates.map((student, index) => ({ student, rank: (index + rotation) % candidates.length }))
      .filter(({ student }) => student.tutor === tutor.id && (weeklyLoad.get(student.id) || 0) < 2 && !bookedDays.has(student.id + '|' + date))
      .sort((a, b) => (weeklyLoad.get(a.student.id) || 0) - (weeklyLoad.get(b.student.id) || 0)
        || Number(a.student.day !== weekdays[dayIndex]) - Number(b.student.day !== weekdays[dayIndex]) || a.rank - b.rank);
    for (const { student } of pool) {
      if (occupancy >= target) break;
      const booking = { id: 'afternoon-v1-' + date + '-' + tutor.id + '-' + start + '-' + student.id, ...slot, studentId: student.id, status: 'scheduled', attendance: date < TODAY ? 'present' : 'unmarked', note: '' };
      if (existingIds.has(booking.id) || validateSlot(state, booking)) continue;
      state.bookings.push(booking);
      existingIds.add(booking.id);
      weeklyLoad.set(student.id, (weeklyLoad.get(student.id) || 0) + 1);
      bookedDays.add(student.id + '|' + date);
      occupancy++;
    }
  })));
  state.busyAfternoonsVersion = 2;
  return state;
}
export function activeBooking(b) { return !['moved', 'absent', 'cancelled'].includes(b.status); }
export function overlaps(a, b) { return a.date === b.date && a.start < b.start + b.duration && b.start < a.start + a.duration; }
export function studentTimeConflict(state, booking, ignoreIds = []) {
  return state.bookings.find(b => activeBooking(b) && !ignoreIds.includes(b.id) && b.studentId === booking.studentId && overlaps(b, booking));
}
export function validateSlot(state, booking, ignoreIds = []) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(booking.date || '') || !Number.isFinite(Date.parse(booking.date + 'T12:00:00')) || !Number.isFinite(booking.start) || ![30, 60, 90].includes(booking.duration)) return 'Choose a valid lesson time and duration.';
  if (booking.start < CENTRE_OPEN || booking.start + booking.duration > CENTRE_CLOSE) return 'Choose a time between 09:00 and 19:00.';
  const staff = state.staff.find(s => s.id === booking.tutor);
  if (!staff) return 'Choose an available tutor.';
  const end = booking.start + booking.duration;
  if (!rosterAllows(staff.roster, booking)) return 'This tutor is not available during this session.';
  if (state.staffLeave.some(l => l.staffId === booking.tutor && l.date === booking.date && activeStaffLeave(l) && (l.unit === 'Full day' || l.unit === 'AM' && booking.start < HALF_DAY_BOUNDARY || l.unit === 'PM' && end > HALF_DAY_BOUNDARY))) return 'This tutor is on leave at this time.';
  const conflict = studentTimeConflict(state, booking, ignoreIds);
  if (conflict) {
    const studentName = studentsById.get(booking.studentId)?.name || 'This student';
    const tutorName = tutors.find(tutor => tutor.id === conflict.tutor)?.name || state.staff.find(tutor => tutor.id === conflict.tutor)?.name || 'another tutor';
    return studentName + ' already has a lesson with ' + tutorName + ' on ' + dateLabel(conflict.date, { year: 'numeric' }) + ', ' + time(conflict.start) + '–' + time(conflict.start + conflict.duration) + '.';
  }
  const others = state.bookings.filter(b => activeBooking(b) && !ignoreIds.includes(b.id));
  const sameTutor = others.filter(b => b.tutor === booking.tutor && overlaps(b, booking));
  const points = [...new Set([booking.start, ...sameTutor.map(b => Math.max(booking.start, b.start))])];
  if (points.some(point => sameTutor.filter(b => b.start <= point && b.start + b.duration > point).length >= 6)) return 'This time would exceed six students. Please choose another slot.';
  return null;
}
export function record(state, text, actor = 'Centre manager') { state.audit.unshift({ id: uid('audit'), text, actor, at: '30 Sep, '+new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) }); }
export function usedReschedules(state, studentId, period = 'Aug–Sep 2026') { return state.makeups.filter(m => m.studentId === studentId && m.period === period && m.kind !== 'schedule-shortfall').length; }
export function cycleForDate(date, state, studentId) {
  let year = Number(date.slice(0,4)), month = Number(date.slice(5,7));
  let start = month % 2 === 0 ? month : month - 1;
  if (start === 0) { start = 12; year--; }
  // A student's confirmed billing plan can start in either odd or even months.
  // Keep the legacy default only for demo students without a package record.
  const planCycle = state?.tuitionPlans?.[studentId]?.currentCycle;
  const periodStartFor = invoice => {
    const start = invoice.periodStart, end = invoice.periodEnd;
    if (/^\d{4}-\d{2}-\d{2}$/.test(start || '') && (invoice.billingMonths === 2 || end === new Date(Date.UTC(Number(start.slice(0,4)), Number(start.slice(5,7)) + 1, 0)).toISOString().slice(0,10))) return start.slice(0,7) + '-01';
    const match = /^([A-Za-z]+)[–—-]([A-Za-z]+) (\d{4})(?:\/(\d{4}))?$/.exec(invoice.period || '');
    if (!match) return null;
    const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const first = months.indexOf(match[1].slice(0,3).toLowerCase()), last = months.indexOf(match[2].slice(0,3).toLowerCase());
    if (first < 0 || last !== (first + 1) % 12) return null;
    return `${match[3]}-${String(first + 1).padStart(2,'0')}-01`;
  };
  const periods = (state?.invoices || []).filter(invoice => invoice.studentId === studentId && invoice.chargeType !== 'assessment' && !invoice.cancelled && !invoice.canceled && !invoice.voided && !invoice.cancelledAt && !invoice.canceledAt && !invoice.voidedAt && !['cancelled', 'canceled', 'void', 'voided'].includes(invoice.status || invoice.lifecycleStatus))
    .map(invoice => ({ invoice, start: periodStartFor(invoice) })).filter(item => item.start)
    .map(item => ({ ...item, end: new Date(Date.UTC(Number(item.start.slice(0,4)), Number(item.start.slice(5,7)) + 1, 0)).toISOString().slice(0,10) }))
    .sort((a,b) => b.start.localeCompare(a.start));
  const paidPeriod = periods.find(({invoice,start,end}) => start <= date && date <= end && (invoice.receiptId || state?.receipts?.some(receipt => receipt.invoiceId === invoice.id)));
  const candidate = periods.find(item => item.start <= date) || periods[0];
  const anchor = paidPeriod?.start || (planCycle?.billingMonths === 2 ? planCycle.periodStart || planCycle.startDate : candidate?.start);
  if (/^\d{4}-\d{2}-01$/.test(anchor || '')) {
    const anchorMonth = Number(anchor.slice(0, 4)) * 12 + Number(anchor.slice(5, 7)) - 1;
    const dateMonth = Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1;
    const pairMonth = anchorMonth + Math.floor((dateMonth - anchorMonth) / 2) * 2;
    year = Math.floor(pairMonth / 12); start = pairMonth % 12 + 1;
  }
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
    const cycle = cycleForDate(source.date, state, source.studentId);
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
function validPreferenceDate(date) {
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
    && Number.isFinite(Date.parse(date + 'T12:00:00Z'))
    && new Date(date + 'T12:00:00Z').toISOString().slice(0, 10) === date;
}
function pendingMakeupFields(makeup) {
  makeup.preferredDates ??= [];
  makeup.preferencesNote ??= '';
  makeup.followUpStatus = makeup.used >= makeup.minutes ? 'arranged' : 'pending';
  return makeup;
}
function originatingMakeup(state, source, excludeId) {
  // A schedule-shortfall credit has no original absent booking. Its replacement
  // still belongs to its case, and a later absence must retain that paid period.
  const byCase = source.caseId && state.makeups.find(item => item.id !== excludeId && item.studentId === source.studentId && item.id === source.caseId && item.sourceId !== source.id);
  if (byCase) return byCase;
  if (!source.sourceId) return null;
  return state.makeups.find(item => item.id !== excludeId && item.studentId === source.studentId && item.sourceId === source.sourceId && item.sourceId !== source.id) || null;
}
function inheritMakeupCycle(makeup, parent) {
  makeup.parentCaseId = parent.id;
  makeup.period = parent.period;
  makeup.expiry = parent.expiry;
  makeup.originalExpiry = parent.originalExpiry || parent.expiry;
  if (parent.expiry > makeup.originalExpiry) makeup.expiryReason = parent.expiryReason || parent.reason || '';
}
function createAbsenceMakeup(state, source, reason) {
  const parent = originatingMakeup(state, source);
  const cycle = parent || cycleForDate(source.date, state, source.studentId);
  const policyReviewRequired = usedReschedules(state, source.studentId, cycle.period) >= 3;
  const makeup = pendingMakeupFields({
    id: uid('makeup'), sourceId: source.id, studentId: source.studentId,
    minutes: source.duration, used: 0, expiry: cycle.expiry,
    originalExpiry: cycle.expiry, reason, period: cycle.period,
    policyReviewRequired,
    policyNote: policyReviewRequired ? 'Three reschedules have already been used for this block. Check the policy before arranging a make-up.' : ''
  });
  if (parent) inheritMakeupCycle(makeup, parent);
  // A missed replacement remains linked to the case that booked it. The new
  // follow-up points back to that booking and case without changing history.
  else source.caseId = makeup.id;
  state.makeups.push(makeup);
  return makeup;
}
function confirmAbsence(state, source, reason, actor, makeup = createAbsenceMakeup(state, source, reason), existingRequest = null) {
  const request = existingRequest || { id: uid('request'), kind: 'absence', bookingId: source.id, studentId: source.studentId, reason, status: 'confirmed', makeupId: makeup.id };
  request.status = 'confirmed';
  request.makeupId = makeup.id;
  source.status = 'absent';
  source.attendance = 'absent';
  if (!existingRequest) state.leaveRequests.push(request);
  record(state, 'Leave confirmed for ' + studentById(source.studentId).name + ', ' + dateLabel(source.date) + '. Customer service to arrange the make-up.', actor);
  return request;
}
export function requestAbsence(state, bookingId, reason = '') {
  const source = state.bookings.find(booking => booking.id === bookingId);
  if (state.leaveRequests.some(request => request.kind !== 'makeup' && request.bookingId === bookingId && ['pending', 'confirmed', 'approved'].includes(request.status))) throw new Error('Leave has already been recorded for this lesson.');
  if (!source || !activeBooking(source)) throw new Error('This lesson cannot be changed.');
  if (source.date < TODAY || source.attendance === 'present') throw new Error('Leave can only be recorded for an upcoming, unattended lesson.');
  return confirmAbsence(state, source, String(reason).trim(), 'Parent');
}
export function parkBookingForMakeup(state, bookingId, { actor = 'Staff' } = {}) {
  const booking = state.bookings.find(item => item.id === bookingId);
  if (!booking || ['moved', 'cancelled'].includes(booking.status)) throw new Error('Choose a lesson that has not already been moved or cancelled.');
  if (booking.attendance === 'present') throw new Error('An attended lesson cannot be placed in awaiting make-up.');
  const request = state.leaveRequests.find(item => item.kind !== 'makeup' && item.bookingId === bookingId && ['pending', 'confirmed', 'approved'].includes(item.status));
  // Match the missed lesson itself, not its caseId: a replacement retains the
  // case that booked it, so its later absence needs a separate linked follow-up.
  const makeup = state.makeups.find(item => item.studentId === booking.studentId && item.sourceId === bookingId);
  if (makeup) {
    if (makeup.used >= makeup.minutes) throw new Error('This lesson’s make-up has already been arranged.');
    if (booking.status === 'absent' && booking.attendance === 'absent') return { booking, request: request || null, makeup, alreadyParked: true };
    const confirmed = confirmAbsence(state, booking, request?.reason || '', actor, makeup, request);
    return { booking, request: confirmed, makeup, alreadyParked: true };
  }
  if (request) throw new Error('Leave has already been recorded for this lesson. Check its existing make-up record.');
  if (!activeBooking(booking) && booking.status !== 'absent') throw new Error('This lesson cannot be changed.');
  // Staff can record an already missed lesson. Its original paid period,
  // deadline and replacement lineage still come from the shared leave logic.
  const confirmed = confirmAbsence(state, booking, '', actor);
  return { booking, request: confirmed, makeup: state.makeups.find(item => item.id === confirmed.makeupId), alreadyParked: false };
}
export function setMakeupPreferences(state, makeupId, dates, note = '') {
  const makeup = state.makeups.find(item => item.id === makeupId);
  if (!makeup) throw new Error('Make-up not found.');
  if (makeup.used >= makeup.minutes) throw new Error('This make-up has already been arranged.');
  if (!Array.isArray(dates) || dates.length > 3) throw new Error('Choose up to three preferred dates.');
  if (dates.some(date => !validPreferenceDate(date))) throw new Error('Choose valid preferred dates.');
  if (dates.some(date => date < TODAY)) throw new Error('Choose today or a future preferred date.');
  if (new Set(dates).size !== dates.length) throw new Error('Choose different preferred dates.');
  if (typeof note !== 'string') throw new Error('Enter a valid preferences note.');
  makeup.preferredDates = [...dates];
  makeup.preferencesNote = note.trim();
  makeup.followUpStatus = 'pending';
  record(state, 'Make-up preferences updated for ' + studentById(makeup.studentId).name + '. No lesson time has been booked.', 'Parent');
  return makeup;
}
function migratePreferredDates(makeup, slots, dates = []) {
  // Legacy choices are retained only as nonbinding dates. Their times and
  // teachers cannot accidentally recreate a parent's old slot reservation.
  const candidates = [...(makeup.preferredDates || []), ...(Array.isArray(dates) ? dates : []), ...(Array.isArray(slots) ? slots.map(slot => slot?.date) : [])];
  makeup.preferredDates = [...new Set(candidates.filter(validPreferenceDate))].slice(0, 3);
}
export function normalizeParentLeave(state) {
  state.leaveRequests ??= [];
  state.makeups ??= [];
  for (const makeup of state.makeups) {
    pendingMakeupFields(makeup);
    // Repair unarranged legacy follow-ups created from a replacement without
    // giving them a fresh billing block or changing already booked history.
    const source = state.bookings.find(booking => booking.id === makeup.sourceId);
    const parent = source && !makeup.parentCaseId && makeup.used === 0 && originatingMakeup(state, source, makeup.id);
    if (parent) {
      inheritMakeupCycle(makeup, parent);
      if (source.caseId === makeup.id) source.caseId = parent.id;
    }
  }
  for (const request of state.leaveRequests) {
    if (request.kind === 'makeup') {
      if (request.status !== 'pending') continue;
      const makeup = state.makeups.find(item => item.id === request.makeupId && item.studentId === request.studentId);
      if (makeup && makeup.used < makeup.minutes) {
        migratePreferredDates(makeup, request.slots, request.preferredDates);
        if (!makeup.preferencesNote && typeof request.note === 'string') makeup.preferencesNote = request.note.trim();
        request.status = 'preferences-recorded';
      } else request.status = makeup ? 'arranged' : 'cancelled';
      delete request.slots;
      delete request.preferredDates;
      continue;
    }
    if (!['pending', 'approved', 'confirmed'].includes(request.status)) continue;
    const source = state.bookings.find(booking => booking.id === request.bookingId && booking.studentId === request.studentId);
    let makeup = source && state.makeups.find(item => item.studentId === source.studentId && (item.id === request.makeupId || item.sourceId === source.id));
    if (request.status === 'pending') {
      const staleSource = source && request.replacementSource && Object.entries(request.replacementSource).some(([key, value]) => ['id', 'studentId', 'date', 'start', 'duration', 'tutor'].includes(key) && source[key] !== value);
      if (!source || staleSource || source.status === 'cancelled' || source.attendance === 'present' || source.status === 'moved' && !makeup) {
        request.status = 'cancelled';
        request.resolutionNote = 'The original lesson is no longer eligible for leave. Contact the centre if follow-up is needed.';
        delete request.replacementSlots;
        delete request.replacementSource;
        continue;
      }
      if (!makeup) makeup = createAbsenceMakeup(state, source, request.reason || '');
      // Already arranged historical replacements keep their linked bookings.
      if (activeBooking(source)) {
        source.status = 'absent';
        source.attendance = 'absent';
      }
    }
    if (makeup) {
      request.makeupId = makeup.id;
      if (makeup.used < makeup.minutes) migratePreferredDates(makeup, request.replacementSlots, request.preferredDates);
    }
    request.status = 'confirmed';
    request.kind = 'absence';
    delete request.replacementSlots;
    delete request.replacementSource;
    delete request.preferredDates;
  }
  return state;
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
  pendingMakeupFields(makeup);
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
  if (!bank || ['debit', 'outgoing'].includes(bank.direction) || !(bank.amount > 0)) return { status: 'Unmatched', adjustment: null, bank: null, month: null, difference: null };
  return { status: bank.amount === receipt.amount ? 'Matched' : 'Difference', adjustment: bank.date < receipt.issuedDate ? 'Date back' : bank.date > receipt.issuedDate ? 'Date forward' : null, bank, month: bank.date.slice(0, 7), difference: receipt.amount - bank.amount };
}
export function matchReceipt(state, receiptId, bankId) {
  const receipt = state.receipts.find(r => r.id === receiptId);
  const bank = state.bankTransactions.find(b => b.id === bankId);
  if (!receipt || !bank) throw new Error('Select a receipt and bank transaction.');
  if (['debit', 'outgoing'].includes(bank.direction) || !(bank.amount > 0)) throw new Error('Only incoming bank credits can confirm a payment.');
  const invoice = state.invoices.find(item => item.id === receipt.invoiceId);
  if (['cash', 'cheque', 'check'].includes(String(invoice?.paymentMethod || receipt.paymentMethod || '').trim().toLowerCase())) throw new Error('Use the cash or cheque workflow for this payment.');
  if (state.receipts.some(r => r.id !== receiptId && r.bankId === bankId)) throw new Error('This bank transaction is already linked to another receipt.');
  receipt.bankId = bankId;
  record(state, receiptId + ' linked to ' + bankId + ' · ' + reconciliation(state, receipt).status, 'Accounts administrator');
  state.reportSubmitted = false; state.reviewedMonths = {};
  return reconciliation(state, receipt);
}
export function reportingTotals(state, month) {
  const entries = state.receipts.map(r => ({ receipt: r, ...reconciliation(state, r) }));
  const matched = entries.filter(e => e.status === 'Matched' && e.month === month);
  return { total: matched.reduce((n, e) => n + e.bank.amount, 0), matched, unresolved: entries.filter(e => e.status !== 'Matched'), unmatchedBank: state.bankTransactions.filter(b => b.date.startsWith(month) && !['debit', 'outgoing'].includes(b.direction) && b.amount > 0 && !state.receipts.some(r => r.bankId === b.id)) };
}
export function assessmentCredit(assessment, enrolDate) {
  const days = (Date.parse(enrolDate) - Date.parse(assessment.assessmentDate)) / 86400000;
  return days >= 0 && days <= assessment.creditDays && assessment.paid ? 200 : 0;
}
export function activeStaffLeave(leave) { return leave.status === 'recorded' || leave.status === 'approved'; }
export function normalizeStaffLeave(state) {
  const statuses = { approved: 'recorded', declined: 'cancelled', pending: 'unrecorded' };
  state.staffLeave ??= [];
  for (const leave of state.staffLeave) if (Object.hasOwn(statuses, leave.status)) leave.status = statuses[leave.status];
  return state;
}
function validStaffLeaveDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date.slice(0, 4) !== TODAY.slice(0, 4)) return false;
  const parsed = new Date(date + 'T00:00:00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}
export function staffLeaveUnits(state, staffId, date) {
  const staff = state.staff.find(item => item.id === staffId);
  if (!staff || !validStaffLeaveDate(date)) return [];
  const day = (new Date(date + 'T12:00:00Z').getUTCDay() + 6) % 7, roster = staff.roster[day];
  return roster === 'Full' ? ['Full day', 'AM', 'PM'] : ['AM', 'PM'].includes(roster) ? [roster] : [];
}
export function setStaffLeave(state, { staffId, date, unit, reason = '' }) {
  const staff = state.staff.find(item => item.id === staffId);
  if (!staff) throw new Error('Choose a valid staff member.');
  if (!validStaffLeaveDate(date)) throw new Error('Choose a valid date in the ' + TODAY.slice(0, 4) + ' leave year.');
  if (!staffLeaveUnits(state, staffId, date).includes(unit)) throw new Error('Choose leave within this staff member’s regular working hours.');
  if (typeof reason !== 'string') throw new Error('Enter a text note for this leave.');
  if (state.staffLeave.some(leave => leave.staffId === staffId && leave.date === date && activeStaffLeave(leave) && (leave.unit === unit || leave.unit === 'Full day' || unit === 'Full day'))) throw new Error('Leave is already recorded for this time.');
  const days = unit === 'Full day' ? 1 : 0.5;
  if (days > staffBalance(state, staffId).available) throw new Error('This leave exceeds the available balance.');
  const leave = { id: uid('al'), staffId, date, unit, days, reason: reason.trim(), status: 'recorded', recordedBy: centre.manager };
  state.staffLeave.push(leave);
  record(state, 'Recorded annual leave for ' + staff.name + ' · ' + dateLabel(date, { year: 'numeric' }) + ' · ' + unit, centre.manager);
  return leave;
}
export function cancelStaffLeave(state, id) {
  const leave = state.staffLeave.find(item => item.id === id);
  if (!leave || !activeStaffLeave(leave)) throw new Error('This leave is not an active record.');
  leave.status = 'cancelled';
  leave.cancelledBy = centre.manager;
  const staff = state.staff.find(item => item.id === leave.staffId);
  record(state, 'Cancelled annual leave for ' + (staff?.name || leave.staffId) + ' · ' + dateLabel(leave.date, { year: 'numeric' }) + ' · ' + leave.unit, centre.manager);
  return leave;
}
export function staffBalance(state, staffId) {
  const staff = state.staff.find(s => s.id === staffId);
  if (!staff) throw new Error('Choose a valid staff member.');
  const recorded = state.staffLeave.filter(l => l.staffId === staffId && activeStaffLeave(l)).reduce((n, l) => n + l.days, 0);
  return { allowance: staff.allowance, holidayCredit: staff.holidayCredit, taken: staff.taken + recorded, available: staff.allowance + staff.holidayCredit - staff.taken - recorded, pending: 0 };
}
