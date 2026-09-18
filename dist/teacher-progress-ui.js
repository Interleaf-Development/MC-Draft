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
// Keep the compact wording familiar from the printed curriculum index.
const compactTopics = {
 '601':'Div. decimals & whole no. by whole no.', '602':'Div. whole no. & decimals by decimals',
 '603':'Mixed operations with decimals', '604':'Decimals ↔ fractions', '605':'Comparing decimals & fractions',
 '608':'Percentages ↔ decimals ↔ fractions', '609':'Finding percentages',
 '610':'Values by % (part, remaining)', '611':'Values by % (increase, decrease)',
 '614':'Circumferences', '615':'Calculating circumferences', '617':'Angles (degrees)',
 '621':'Travel graphs', '624':'Problem solving with simple equations',
 '626':'Uses & abuses of statistics', '632':'Square & triangular numbers'
};
const shortPsLabels = { 'decimal-division':'Decimal division', 'decimal-mixed':'Mixed decimals', mixed:'Mixed operations', volume:'Volume', averages:'Averages', percentages:'Percentages', circumference:'Circumferences', diagrams:'Diagrams', speed:'Speed', equations:'Equations' };
const searchIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>';

export function createTeacherProgressUI({ getState, getTutorId, change, render, onStudentChange, openAssignment, openFolder, openStudentView }) {
  let selectedStudent = null;
  let selected = new Set();
  let studentSearch = '';
  let worksheetSearch = '';
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
    return action('worksheet', '<span>'+esc(label)+'</span>', 'data-worksheet="'+esc(worksheet.id)+'" aria-label="'+esc(title)+(assignment ? ' · Open worksheet' : '')+'" title="'+esc(title)+'"'+(!assignment ? ' aria-pressed="'+picked+'"' : ''), 'teacher-progress-box is-'+status[1]+(picked ? ' is-selected' : '')+(worksheetSearch.trim() ? matches(worksheet) ? ' is-match' : ' is-muted' : ''));
  }

  function topicWorksheets(topic, family) {
    return p6Worksheets.filter(worksheet => String(worksheet.topicId ?? worksheet.topicCode) === String(topic.id) && worksheet.family === family);
  }

  function matches(worksheet) {
    const normalize = value => String(value || '').toLowerCase().replace(/\s+/g, '');
    const query = normalize(worksheetSearch);
    return !query || [worksheet.code, worksheet.title, worksheet.titleZh, worksheet.topic, worksheet.familyLabel].some(value => normalize(value).includes(query));
  }

  function groupSections(family, term) {
    return (p6SupplementGroups.find(group => group.id === family)?.sections || []).filter(section => !term || section.term === term);
  }

  function sectionButtons(section) {
    return section.worksheetIds.map(id => worksheetButton(worksheetMap.get(id))).join('');
  }

  function termCollection(family, term) {
    return groupSections(family, term).map(section => '<div class="teacher-progress-collection-group"><div class="teacher-progress-group-label" title="'+esc(section.label)+'">'+esc(family === 'ps' ? shortPsLabels[section.id] || section.label : section.label)+'</div><div class="teacher-progress-boxes">'+sectionButtons(section)+'</div></div>').join('');
  }

  function combinedChart() {
    const header = '<table class="teacher-progress-table"><colgroup>'+['topic','math','excel','revision','ce','ps'].map(column => '<col class="teacher-progress-'+column+'-col">').join('')+'</colgroup><thead><tr>'+['Topic','Math 1–6','EXCEL','Revision','CE Rev','PS'].map(label => '<th scope="col">'+label+'</th>').join('')+'</tr></thead><tbody>';
    const terms = Object.entries(termLabels).map(([term, label]) => {
      const topics = p6Topics.filter(topic => topic.term === term);
      const revisions = groupSections('revision', term);
      return '<tr class="teacher-progress-term"><th colspan="6" scope="colgroup">'+label+'</th></tr>'+topics.map((topic, index) => {
        const revision = revisions.find(section => section.topicCodes[0] === topic.code);
        const covered = revisions.some(section => section.topicCodes.includes(topic.code));
        const revisionCell = revision ? '<td rowspan="'+revision.topicCodes.length+'" class="teacher-progress-revision-cell"><div class="teacher-progress-revision-group"><strong>'+esc(revision.label)+'</strong><div class="teacher-progress-boxes">'+sectionButtons(revision)+'</div></div></td>' : covered ? '' : '<td class="teacher-progress-empty-cell"></td>';
        return '<tr><th scope="row" title="'+esc(topic.title)+'"><span class="teacher-progress-topic-code">'+esc(topic.code)+'</span><span class="teacher-progress-topic-name">'+esc(compactTopics[topic.code] || topic.title)+'</span></th><td><div class="teacher-progress-boxes">'+topicWorksheets(topic, 'math').map(worksheetButton).join('')+'</div></td><td><div class="teacher-progress-boxes">'+topicWorksheets(topic, 'excel').map(worksheetButton).join('')+'</div></td>'+revisionCell+(index === 0 ? '<td rowspan="'+topics.length+'" class="teacher-progress-term-bank teacher-progress-ce-bank">'+termCollection('ce', term)+'</td><td rowspan="'+topics.length+'" class="teacher-progress-term-bank teacher-progress-ps-bank">'+termCollection('ps', term)+'</td>' : '')+'</tr>';
      }).join('');
    }).join('');
    const sspa = groupSections('sspa').map(section => '<tr class="teacher-progress-sspa-row"><th scope="row">'+esc(section.label)+'</th><td colspan="5"><div class="teacher-progress-boxes">'+sectionButtons(section)+'</div></td></tr>').join('');
    return header+terms+sspa+'</tbody></table>';
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
    const matchesCount = worksheetSearch.trim() ? p6Worksheets.filter(matches).length : null;
    return '<div class="teacher-progress"><aside class="teacher-progress-students" aria-label="P6 students"><div class="teacher-progress-students-head"><strong>P6 students</strong><span>'+allStudents.length+'</span></div><label class="teacher-progress-search teacher-progress-student-search">'+searchIcon+'<input id="teacher-progress-student-search" type="search" placeholder="Find student" aria-label="Find P6 student" value="'+esc(studentSearch)+'"></label><div class="teacher-progress-students-list">'+(visibleStudents.length ? visibleStudents.map(item => action('student', '<span>'+esc(item.name)+'</span><small>'+esc(item.number)+'</small>', 'data-student="'+esc(item.id)+'" aria-pressed="'+(selectedStudent === item.id)+'"', 'teacher-progress-student'+(selectedStudent === item.id ? ' is-active' : ''))).join('') : '<p class="teacher-progress-empty">No students found.</p>')+'</div></aside><section class="teacher-progress-workbench" aria-label="P6 worksheet progress">'+(student ? '<header class="teacher-progress-header"><div class="teacher-progress-identity"><h2>'+esc(student.name)+'</h2><span>P6</span></div><div class="teacher-progress-header-actions">'+action('folder', 'Learning folder', '', 'btn small')+action('student-view', 'View student app', '', 'btn small')+'</div><div class="teacher-progress-search-area"><label class="teacher-progress-search teacher-progress-worksheet-search">'+searchIcon+'<input id="teacher-progress-worksheet-search" type="search" placeholder="Topic or code" aria-label="Find worksheet by topic or code" value="'+esc(worksheetSearch)+'"></label>'+(matchesCount === null ? '' : '<span class="teacher-progress-search-result" aria-live="polite">'+(matchesCount ? matchesCount+' matches' : 'No worksheets found')+'</span>')+'</div></header><div class="teacher-progress-chart-scroll" tabindex="0" aria-label="Worksheet chart">'+combinedChart()+'</div><div class="teacher-progress-legend" aria-label="Worksheet status legend">'+[['available','Not sent'],['sent','Sent'],['working','In progress'],['submitted','To mark'],['corrections','Corrections'],['completed','Completed']].map(([status, label]) => '<span><i class="is-'+status+'" aria-hidden="true"></i>'+label+'</span>').join('')+'</div>'+footer(student) : '<div class="teacher-progress-empty">No active P6 students for this teacher.</div>')+'</section></div>';
  }

  function onClick(button) {
    const name = button?.dataset?.action;
    if (!name?.startsWith('teacher-progress-')) return false;
    if (name === 'teacher-progress-student') {
      selectStudent(button.dataset.student);
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
    if (event.target.id === 'teacher-progress-worksheet-search' && worksheetSearch.trim() && typeof document !== 'undefined') {
      document.querySelector('.teacher-progress-box.is-match')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    return true;
  }

  function onChange(event) {
    if (event.target.id !== 'teacher-progress-purpose') return false;
    homework = event.target.value === 'homework';
    return true;
  }

  return { render: renderUI, onClick, onInput, onChange, selectStudent,
    get selectedStudentId() { return currentStudent()?.id || null; },
    reset() { selectedStudent = null; selected.clear(); studentSearch = ''; worksheetSearch = ''; homework = false; }
  };
}
