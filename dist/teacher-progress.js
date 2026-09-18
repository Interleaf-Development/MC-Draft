import { TODAY, centre, enrolledStudents, uid, record } from './model.js';
import { p6Worksheets } from './p6-curriculum.js';

const catalog = new Map(p6Worksheets.map(worksheet => [worksheet.id, worksheet]));

export function getP6Students(state, tutorId = centre.managerId) {
  return enrolledStudents(state).filter(student => student.level === 'P6' && student.status === 'active' && student.tutor === tutorId)
    .sort((a, b) => a.number.localeCompare(b.number));
}

export function worksheetProgress(state, studentId, worksheetId) {
  return (state.assignments || []).findLast(assignment => assignment.studentId === studentId && assignment.worksheetId === worksheetId);
}

export function assignP6Worksheets(state, { studentId, worksheetIds, homework = false, tutorId = centre.managerId }) {
  const student = getP6Students(state, tutorId).find(student => student.id === studentId);
  if (!student) throw new Error('Choose a P6 student from your list.');
  const ids = [...new Set(worksheetIds || [])];
  if (!ids.length) throw new Error('Select at least one worksheet.');
  if (ids.some(id => !catalog.has(id))) throw new Error('One of the worksheets is no longer available.');
  const assigned = [], skipped = [];
  // Validate the entire selection before adding anything to the student's folder.
  state.assignments ??= [];
  for (const worksheetId of ids) {
    if (worksheetProgress(state, studentId, worksheetId)) { skipped.push(worksheetId); continue; }
    const assignment = {
      id: uid('assignment'), studentId, worksheetId, status: 'upcoming', homework: Boolean(homework),
      strokes: [], feedback: [], working: '', note: '', assignedDate: TODAY, assignedBy: tutorId
    };
    state.assignments.push(assignment);
    assigned.push(assignment);
  }
  if (assigned.length) {
    state.demoWorksheetStudent = studentId;
    record(state, 'Sent ' + assigned.map(item => catalog.get(item.worksheetId).code).join(', ') + ' to ' + student.name);
  }
  return { assigned, skipped };
}

export function normalizeP6Progress(state) {
  if (state.p6ProgressVersion === 1) return;
  state.assignments ??= [];
  const examples = [
    ['p6-math-601-A', 'completed', '2026-09-02'],
    ['p6-math-601-B', 'completed', '2026-09-09'],
    ['p6-math-601-C', 'submitted', '2026-09-23'],
    ['p6-math-602-A', 'in-progress', '2026-09-30'],
    ['p6-math-604-A', 'upcoming', '2026-09-30']
  ];
  getP6Students(state).slice(0, 3).forEach((student, index) => {
    examples.slice(0, examples.length - index).forEach(([worksheetId, status, assignedDate]) => {
      if (!catalog.has(worksheetId) || worksheetProgress(state, student.id, worksheetId)) return;
      state.assignments.push({
        id: 'p6-demo-' + student.id + '-' + worksheetId, studentId: student.id, worksheetId, status,
        homework: false, strokes: [], feedback: [], working: '', note: '', assignedDate,
        assignedBy: centre.managerId, demoProgress: true
      });
    });
  });
  state.p6ProgressVersion = 1;
}
