import { TODAY, centre, record, worksheets } from './model.js';
import { getTeacherStudents } from './teacher-progress.js';

const readableStatuses = new Set(['upcoming', 'in-progress', 'submitted', 'corrections', 'completed']);
const editableStatuses = new Set(['upcoming', 'in-progress', 'corrections']);

export function binderSection(assignment) {
  if (assignment?.status === 'prepared') return 'future';
  if (assignment?.status === 'completed') return 'past';
  return 'current';
}

export function canStudentOpenAssignment(assignment, studentId) {
  return Boolean(studentId && assignment?.studentId === studentId && readableStatuses.has(assignment.status));
}

export function canStudentEditAssignment(assignment, studentId) {
  return canStudentOpenAssignment(assignment, studentId) && editableStatuses.has(assignment.status)
    && !worksheets.find(worksheet => worksheet.id === assignment.worksheetId)?.catalogueOnly;
}

export function releasePreparedAssignment(state, { assignmentId, tutorId = centre.managerId }) {
  const assignment = (state.assignments || []).find(item => item.id === assignmentId);
  if (!assignment) throw new Error('This worksheet is no longer available.');
  const student = getTeacherStudents(state, tutorId).find(item => item.id === assignment.studentId);
  if (!student) throw new Error('Choose a student from your classes.');
  if (assignment.status !== 'prepared') throw new Error('Only prepared worksheets can be released.');
  assignment.status = 'upcoming';
  assignment.releasedDate = TODAY;
  assignment.releasedBy = tutorId;
  state.demoWorksheetStudent = assignment.studentId;
  const worksheet = worksheets.find(item => item.id === assignment.worksheetId);
  record(state, 'Released ' + (worksheet?.code || assignment.worksheetId) + ' to ' + student.name);
  return assignment;
}
