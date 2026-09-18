import { p6Topics, p6Worksheets, p6SupplementGroups } from './p6-curriculum.js';
import { getP6Students, worksheetProgress, assignP6Worksheets } from './teacher-progress.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const statuses = {
  upcoming: ['Sent', 'sent'],
  'in-progress': ['In progress', 'working'],
  submitted: ['To mark', 'submitted'],
  corrections: ['Corrections', 'corrections'],
  completed: ['Completed', 'completed']
};
const termLabels = { first: 'First term', second: 'Second term', extended: 'Extended part' };
const worksheetMap = new Map(p6Worksheets.map(worksheet => [worksheet.id, worksheet]));
const action = (name, label, attributes = '', className = '') => '<button type="button" class="'+esc(className)+'" data-action="teacher-progress-'+name+'" '+attributes+'>'+label+'</button>';
const searchIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>';

export function createTeacherProgressUI({ getState, getTutorId, change, render, onStudentChange, openAssignment, openFolder, openStudentView }) {
  let selectedStudent = null;
  let selected = new Set();
  let studentSearch = '';
  let worksheetSearch = '';
  let tab = 'core';
  let homework = false;

  function students() { return getP6Students(getState(), getTutorId()); }

  function currentStudent() {
    const list = students();
    if (!list.some(student => student.id === selectedStudent)) {
      selectedStudent = list[0]?.id || null;
      selected.clear();
      if (selectedStudent) onStudentChange?.(selectedStudent);
    }
    return list.find(student => student.id === selectedStudent);
  }

  function selectStudent(id) {
    if (!students().some(student => student.id === id)) return false;
    if (selectedStudent !== id) {
      selectedStudent = id;
      selected.clear();
      onStudentChange?.(id);
    }
    return true;
  }

  // The application replaces the workbench on render. Preserve its independently
  // scrolling regions and keyboard focus while selecting worksheets or searching.
  function preserveView(callback, options = {}) {
    if (typeof document === 'undefined') return callback();
    const root = document.querySelector('.teacher-progress');
    const positions = ['.teacher-progress-students-list', '.teacher-progress-chart-scroll'].map(selector => {
      const element = root?.querySelector(selector);
      return { selector, top: element?.scrollTop || 0, left: element?.scrollLeft || 0 };
    });
    const active = document.activeElement;
    const focusId = active?.id;
    const focusAction = active?.dataset?.action;
    const focusWorksheet = active?.dataset?.worksheet;
    const focusStudent = active?.dataset?.student;
    const selection = typeof active?.selectionStart === 'number' ? [active.selectionStart, active.selectionEnd] : null;
    const result = callback();
    const nextRoot = document.querySelector('.teacher-progress');
    if (!nextRoot) return result;
    positions.forEach(({ selector, top, left }) => {
      const element = nextRoot.querySelector(selector);
      if (element) {
        element.scrollTop = options.resetChart && selector.includes('chart') ? 0 : top;
        element.scrollLeft = left;
      }
    });
    let target = focusId ? document.getElementById(focusId) : null;
    if (!target && focusAction) target = [...nextRoot.querySelectorAll('[data-action]')].find(element => element.dataset.action === focusAction && (!focusWorksheet || element.dataset.worksheet === focusWorksheet) && (!focusStudent || element.dataset.student === focusStudent));
    if (target) {
      target.focus({ preventScroll: true });
      if (selection && target.setSelectionRange) target.setSelectionRange(...selection);
    }
    return result;
  }

  function statusFor(worksheetId) {
    return worksheetProgress(getState(), selectedStudent, worksheetId);
  }

  function worksheetButton(worksheet) {
    if (!worksheet) return '';
    const assignment = statusFor(worksheet.id);
    const status = assignment ? statuses[assignment.status] || ['Sent', 'sent'] : ['Not sent', 'available'];
    const picked = !assignment && selected.has(worksheet.id);
    const label = worksheet.variant || worksheet.code;
    const title = worksheet.code+' · '+worksheet.title+' · '+(picked ? 'Selected' : status[0]);
    return action('worksheet', '<span>'+esc(label)+'</span>', 'data-worksheet="'+esc(worksheet.id)+'" aria-label="'+esc(title)+(assignment ? ' · Open worksheet' : '')+'" title="'+esc(title)+'"'+(!assignment ? ' aria-pressed="'+picked+'"' : ''), 'teacher-progress-box is-'+status[1]+(picked ? ' is-selected' : ''));
  }

  function topicWorksheets(topic, family) {
    return p6Worksheets.filter(worksheet => String(worksheet.topicId ?? worksheet.topicCode) === String(topic.id) && worksheet.family === family);
  }

  function matches(worksheet) {
    const query = worksheetSearch.trim().toLowerCase();
    return !query || [worksheet.code, worksheet.title, worksheet.titleZh, worksheet.topic].filter(Boolean).join(' ').toLowerCase().includes(query);
  }

  function coreChart() {
    const query = worksheetSearch.trim().toLowerCase();
    const filtered = p6Topics.filter(topic => !query || [topic.code, topic.id, topic.title, topic.titleZh].join(' ').toLowerCase().includes(query) || [...topicWorksheets(topic, 'math'), ...topicWorksheets(topic, 'excel')].some(matches));
    if (!filtered.length) return '<div class="teacher-progress-empty">No worksheets found.</div>';
    return '<table class="teacher-progress-table"><colgroup><col class="teacher-progress-topic-col"><col class="teacher-progress-math-col"><col class="teacher-progress-excel-col"></colgroup><thead><tr><th scope="col">Topic</th><th scope="col">Math 1–6</th><th scope="col">EXCEL</th></tr></thead><tbody>'+Object.entries(termLabels).map(([term, label]) => {
      const topics = filtered.filter(topic => topic.term === term);
      if (!topics.length) return '';
      return '<tr class="teacher-progress-term"><th colspan="3" scope="colgroup">'+label+'</th></tr>'+topics.map(topic => '<tr><th scope="row"><span class="teacher-progress-topic-code">'+esc(topic.code || topic.id)+'</span><span class="teacher-progress-topic-name">'+esc(topic.title)+'</span></th><td><div class="teacher-progress-boxes">'+topicWorksheets(topic, 'math').map(worksheetButton).join('')+'</div></td><td><div class="teacher-progress-boxes">'+topicWorksheets(topic, 'excel').map(worksheetButton).join('')+'</div></td></tr>').join('');
    }).join('')+'</tbody></table>';
  }

  function supplementaryChart() {
    const group = p6SupplementGroups.find(item => item.id === tab);
    if (!group) return '';
    const sections = group.sections.map(section => ({ ...section, worksheets: section.worksheetIds.map(id => worksheetMap.get(id)).filter(Boolean).filter(matches) })).filter(section => section.worksheets.length);
    if (!sections.length) return '<div class="teacher-progress-empty">No worksheets found.</div>';
    return '<table class="teacher-progress-table teacher-progress-supplements"><thead><tr><th scope="col">'+esc(group.label)+'</th><th scope="col">Worksheets</th></tr></thead><tbody>'+sections.map((section, index) => {
      const previous = sections[index - 1];
      return (section.term && section.term !== previous?.term ? '<tr class="teacher-progress-term"><th colspan="2" scope="colgroup">'+esc(termLabels[section.term] || section.term)+'</th></tr>' : '')+'<tr><th scope="row">'+esc(section.label)+'</th><td><div class="teacher-progress-boxes">'+section.worksheets.map(worksheetButton).join('')+'</div></td></tr>';
    }).join('')+'</tbody></table>';
  }

  function footer(student) {
    const chosen = [...selected].map(id => worksheetMap.get(id)).filter(Boolean);
    const codes = chosen.map(worksheet => worksheet.code).join(', ');
    return '<div class="teacher-progress-footer"><div class="teacher-progress-selection" aria-live="polite"><strong>'+chosen.length+' selected</strong><span title="'+esc(codes)+'">'+(chosen.length ? esc(codes) : 'Select worksheet boxes to send')+'</span></div><div class="teacher-progress-send-actions">'+(chosen.length ? action('clear', 'Clear', '', 'btn ghost small') : '')+'<select id="teacher-progress-purpose" aria-label="Send as"><option value="classwork"'+(!homework ? ' selected' : '')+'>Classwork</option><option value="homework"'+(homework ? ' selected' : '')+'>Homework</option></select>'+action('send', 'Send to student', 'aria-label="Send '+chosen.length+' worksheet'+(chosen.length === 1 ? '' : 's')+' to '+esc(student.name)+'"'+(!chosen.length ? ' disabled' : ''), 'btn primary')+'</div></div>';
  }

  function renderUI() {
    const student = currentStudent();
    const allStudents = students();
    const query = studentSearch.trim().toLowerCase();
    const visibleStudents = allStudents.filter(item => !query || [item.name, item.number, item.chineseName].filter(Boolean).join(' ').toLowerCase().includes(query));
    const navigation = [['core', 'Math 1–6 & EXCEL'], ...p6SupplementGroups.map(group => [group.id, group.label])];
    return '<div class="teacher-progress"><aside class="teacher-progress-students" aria-label="P6 students"><div class="teacher-progress-students-head"><strong>P6 students</strong><span>'+allStudents.length+'</span></div><label class="teacher-progress-search teacher-progress-student-search">'+searchIcon+'<input id="teacher-progress-student-search" type="search" placeholder="Find student" aria-label="Find P6 student" value="'+esc(studentSearch)+'"></label><div class="teacher-progress-students-list">'+(visibleStudents.length ? visibleStudents.map(item => action('student', '<span>'+esc(item.name)+'</span><small>'+esc(item.number)+'</small>', 'data-student="'+esc(item.id)+'" aria-pressed="'+(selectedStudent === item.id)+'"', 'teacher-progress-student'+(selectedStudent === item.id ? ' is-active' : ''))).join('') : '<p class="teacher-progress-empty">No students found.</p>')+'</div></aside><section class="teacher-progress-workbench" aria-label="P6 worksheet progress">'+(student ? '<header class="teacher-progress-header"><div class="teacher-progress-identity"><h2>'+esc(student.name)+'</h2><span>P6</span></div><div class="teacher-progress-header-actions">'+action('folder', 'Learning folder', '', 'btn small')+action('student-view', 'View student app', '', 'btn small')+'</div></header><div class="teacher-progress-chart-toolbar"><nav class="teacher-progress-tabs" aria-label="Worksheet collections">'+navigation.map(([id, label]) => action('tab', esc(label), 'data-tab="'+esc(id)+'" aria-pressed="'+(tab === id)+'"', tab === id ? 'is-active' : '')).join('')+'</nav><label class="teacher-progress-search teacher-progress-worksheet-search">'+searchIcon+'<input id="teacher-progress-worksheet-search" type="search" placeholder="Topic or code" aria-label="Find worksheet by topic or code" value="'+esc(worksheetSearch)+'"></label></div><div class="teacher-progress-chart-scroll" tabindex="0" aria-label="Worksheet chart">'+(tab === 'core' ? coreChart() : supplementaryChart())+'</div><div class="teacher-progress-legend" aria-label="Worksheet status legend">'+[['available','Not sent'],['sent','Sent'],['working','In progress'],['submitted','To mark'],['corrections','Corrections'],['completed','Completed']].map(([status, label]) => '<span><i class="is-'+status+'" aria-hidden="true"></i>'+label+'</span>').join('')+'</div>'+footer(student) : '<div class="teacher-progress-empty">No active P6 students for this teacher.</div>')+'</section></div>';
  }

  function onClick(button) {
    const name = button?.dataset?.action;
    if (!name?.startsWith('teacher-progress-')) return false;
    if (name === 'teacher-progress-student') {
      selectStudent(button.dataset.student);
      preserveView(render, { resetChart: true });
    } else if (name === 'teacher-progress-tab') {
      tab = button.dataset.tab;
      preserveView(render, { resetChart: true });
    } else if (name === 'teacher-progress-worksheet') {
      const id = button.dataset.worksheet;
      if (!worksheetMap.has(id)) return true;
      const assignment = statusFor(id);
      if (assignment) openAssignment?.(assignment.id);
      else {
        if (selected.has(id)) selected.delete(id);
        else selected.add(id);
        preserveView(render);
      }
    } else if (name === 'teacher-progress-clear') {
      selected.clear();
      preserveView(render);
    } else if (name === 'teacher-progress-send') {
      const student = currentStudent();
      if (!student || !selected.size) return true;
      const chosen = [...selected];
      preserveView(() => change(() => {
        assignP6Worksheets(getState(), { studentId: student.id, worksheetIds: chosen, homework, tutorId: getTutorId() });
        selected.clear();
      }, 'Worksheets sent to '+student.name+'.'));
    } else if (name === 'teacher-progress-folder') {
      if (currentStudent()) openFolder?.(selectedStudent);
    } else if (name === 'teacher-progress-student-view') {
      if (currentStudent()) openStudentView?.(selectedStudent);
    }
    return true;
  }

  function onInput(event) {
    if (event.target.id === 'teacher-progress-student-search') studentSearch = event.target.value;
    else if (event.target.id === 'teacher-progress-worksheet-search') worksheetSearch = event.target.value;
    else return false;
    preserveView(render, { resetChart: event.target.id === 'teacher-progress-worksheet-search' });
    return true;
  }

  function onChange(event) {
    if (event.target.id !== 'teacher-progress-purpose') return false;
    homework = event.target.value === 'homework';
    return true;
  }

  return { render: renderUI, onClick, onInput, onChange, selectStudent,
    get selectedStudentId() { return currentStudent()?.id || null; },
    reset() { selectedStudent = null; selected.clear(); studentSearch = ''; worksheetSearch = ''; tab = 'core'; homework = false; }
  };
}
