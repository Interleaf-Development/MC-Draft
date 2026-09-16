import { TODAY, centre, students, tutors, activeBooking, time } from './model.js';

const studentsById = new Map(students.map(student => [student.id, student]));
const textLimits = {
  chineseName: 100, dateOfBirth: 10, school: 160,
  parentRelation: 40, parentSurname: 100, parentGivenName: 100, parentLanguage: 60,
  parentEmail: 254, parentMobile: 40, parentPhone: 40,
  region: 100, area: 100, address: 400,
  remark: 2000, fpsRemark: 500, referralCode: 80, referralNotes: 1000, marketingNotes: 1000
};
const booleanFields = new Set(['paymentReminder', 'marketingOptIn']);
const editableFields = new Set([...Object.keys(textLimits), ...booleanFields]);
const fixtureChineseNames = { chloe: '陳樂怡', ethan: '黃俊熙', mia: '張悅晴' };

function requireStudent(id) {
  const student = studentsById.get(id);
  if (!student) throw new Error('Choose a valid student.');
  return student;
}

function storedFields(state, id) {
  const saved = state.studentProfiles?.[id];
  return saved && typeof saved === 'object' && !Array.isArray(saved)
    ? Object.fromEntries(Object.entries(saved).filter(([key]) => editableFields.has(key))) : {};
}

// These are fictional demo details. Core identity and lesson data stay in model.js.
export function getStudentProfile(state, id) {
  const student = requireStudent(id), number = Number(student.number.slice(3));
  const [givenName, ...surnameParts] = student.name.split(' '), surname = surnameParts.join(' ');
  const enrolled = student.id !== 'mia' || Boolean(state.assessment?.enrolled);
  const firstLesson = student.id === 'mia' && enrolled
    ? state.bookings?.find(booking => booking.studentId === id && activeBooking(booking)) : null;
  const parent = student.id === 'mia' && enrolled ? state.assessment.parent || student.parent : student.parent;
  const phone = student.id === 'mia' && enrolled ? state.assessment.phone || student.phone : student.phone;
  const birthYears = { K3: 2020, P1: 2019, P2: 2018, P3: 2017, P4: 2016, P5: 2015, P6: 2014, S1: 2013, S2: 2012 };
  const dateOfBirth = `${birthYears[student.level] || 2017}-${String(number % 12 + 1).padStart(2, '0')}-${String(number % 27 + 1).padStart(2, '0')}`;
  const day = firstLesson ? new Date(firstLesson.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long' }) : student.day;
  const enrolmentInvoice = student.id === 'mia' && enrolled ? state.invoices?.find(invoice => invoice.studentId === id) : null;
  return {
    studentId: id, branch: centre.name, studentNumber: student.number,
    englishName: student.name, givenName, surname,
    chineseName: fixtureChineseNames[id] || '', dateOfBirth,
    school: student.level === 'K3' ? 'Demo Kindergarten' : student.level.startsWith('S') ? 'Demo Secondary School' : 'Demo Primary School',
    grade: student.level,
    parentRelation: /^Mrs\b/.test(parent) ? 'Mother' : /^Mr\b/.test(parent) ? 'Father' : 'Guardian',
    parentSurname: parent.replace(/^(?:Mrs|Mr|Ms)\s+/, ''), parentGivenName: '', parentLanguage: 'Cantonese',
    parentEmail: student.number.toLowerCase() + '@example.com', parentMobile: phone, parentPhone: '',
    region: '', area: '', address: '', paymentReminder: true, remark: '', fpsRemark: '',
    instructor: enrolled ? tutors.find(tutor => tutor.id === (firstLesson?.tutor || student.tutor))?.name || '' : '',
    course: enrolled ? 'Mathematics' : 'Entrance assessment',
    lessonTime: enrolled ? firstLesson ? time(firstLesson.start) : student.regular.split(' · ')[1] || '' : '',
    lessonDuration: enrolled ? firstLesson?.duration || 60 : 0,
    lessonDays: enrolled && day ? [day] : [],
    enrolledSince: !enrolled ? '' : student.id === 'mia' ? state.assessment.enrolledDate || enrolmentInvoice?.issued || TODAY : `${2024 + number % 3}-${String(number % 6 + 1).padStart(2, '0')}-01`,
    status: enrolled && student.id === 'mia' ? 'active' : student.status,
    referralCode: '', referralNotes: '', marketingOptIn: false, marketingNotes: '',
    ...storedFields(state, id),
    // No messages or communications are invented for the profile history.
    smsHistory: []
  };
}

export function saveStudentProfile(state, id, patch) {
  requireStudent(id);
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new Error('Enter valid profile details.');
  const validated = {};
  for (const [key, value] of Object.entries(patch)) {
    if (!editableFields.has(key)) throw new Error('This profile field cannot be edited: ' + key + '.');
    if (booleanFields.has(key)) {
      if (typeof value !== 'boolean') throw new Error('Choose yes or no for ' + key + '.');
      validated[key] = value;
      continue;
    }
    if (typeof value !== 'string') throw new Error('Enter text for ' + key + '.');
    const text = value.trim();
    if (text.length > textLimits[key]) throw new Error(key + ' is too long.');
    if (key === 'dateOfBirth' && text) {
      const parsed = new Date(text + 'T00:00:00Z');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== text || text > TODAY) {
        throw new Error('Enter a valid date of birth on or before ' + TODAY + '.');
      }
    }
    if (key === 'parentEmail' && text && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) throw new Error('Enter a valid email address.');
    if (['parentMobile', 'parentPhone'].includes(key) && text && (!/^[+\d\s().-]+$/.test(text) || !/^\d{7,15}$/.test(text.replace(/\D/g, '')))) {
      throw new Error('Enter a valid contact number with 7 to 15 digits.');
    }
    validated[key] = text;
  }
  state.studentProfiles = { ...state.studentProfiles, [id]: { ...storedFields(state, id), ...validated } };
  return getStudentProfile(state, id);
}
