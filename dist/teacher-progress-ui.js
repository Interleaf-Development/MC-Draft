import { p6Topics, p6Worksheets, p6SupplementGroups } from './p6-curriculum.js';
import { p3Topics, p3Worksheets, p3SupplementGroups } from './p3-curriculum.js';
import { progressRecordCatalogues } from './progress-records.js';
import { TODAY, worksheets, time } from './model.js';
import { getTeacherClasses, worksheetProgress, assignTeacherWorksheets } from './teacher-progress.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const statuses = {
  prepared: ['已備課', 'prepared'],
  upcoming: ['已派發', 'sent'],
  'in-progress': ['進行中', 'working'],
  submitted: ['待批改', 'submitted'],
  corrections: ['待改正', 'corrections'],
  completed: ['已完成', 'completed']
};
const termLabels = { first: '上學期', second: '下學期', extended: '延伸部分', books: '練習冊及應用題', supplementary: '補充工作紙' };
const worksheetMap = new Map(worksheets.map(worksheet => [worksheet.id, worksheet]));
const grades = ['K', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3'];
const gradeLabels = { K: '幼稚園', K1: '幼兒班', K2: '幼稚園低班', K3: '幼稚園高班', P1: '小一', P2: '小二', P3: '小三', P4: '小四', P5: '小五', P6: '小六', S1: '中一', S2: '中二', S3: '中三' };
const familyLabels = { topic: '課題', math: 'Math 1–6', excel: 'EXCEL', revision: '溫習', ce: '綜合溫習', ps: '應用題', sspa: '呈分試練習', ex: '練習', mc: '選擇題', quiz: '小測', books: '練習冊', supplementary: '補充工作紙' };
const action = (name, label, attributes = '', className = '') => '<button type="button" class="'+esc(className)+'" data-action="teacher-progress-'+name+'" '+attributes+'>'+label+'</button>';
// Translate the presentation only: catalogue titles, codes and saved work retain
// their original values, while every grade uses its supplied Chinese topic name.
const titleFor = item => item.titleZh || item.title;
const sectionLabel = (section, family) => family === 'ps' || family === 'sspa' ? section.titleZh || section.label : section.label;
const searchIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>';

export function createTeacherProgressUI({ getState, getTutorId, change, render, onStudentChange, openAssignment, openFolder, openStudentView }) {
  let selectedStudent = null;
  let selectedClass = null;
  let worksheetGrade = null;
  let selected = new Set();
  let worksheetSearch = '';
  let homework = false;

  function classes() { return getTeacherClasses(getState(), getTutorId()); }

  function classNearDate(list, date) {
    return list.find(session => session.date >= date) || list.at(-1);
  }

  function currentClass() {
    const list = classes();
    if (!list.some(session => session.id === selectedClass)) selectedClass = classNearDate(list, TODAY)?.id || null;
    return list.find(session => session.id === selectedClass);
  }

  function useStudent(student) {
    selectedStudent = student?.id || null;
    // This chooses a worksheet collection, never fills in the pupil's grade.
    worksheetGrade = student ? /^K[123]?$/.test(student.level) ? 'K' : grades.includes(student.level) ? student.level : 'P6' : null;
    selected.clear();
    worksheetSearch = '';
    if (student) onStudentChange?.(student.id);
  }

  function currentStudent() {
    const list = currentClass()?.students || [];
    if (!list.some(student => student.id === selectedStudent)) useStudent(list[0]);
    return list.find(student => student.id === selectedStudent);
  }

  function selectStudent(id) {
    let session = currentClass();
    if (!session?.students.some(student => student.id === id)) {
      session = classNearDate(classes().filter(item => item.students.some(student => student.id === id)), TODAY);
    }
    const student = session?.students.find(student => student.id === id);
    if (!student) return false;
    selectedClass = session.id;
    if (selectedStudent !== id) useStudent(student);
    return true;
  }

  function selectClass(id) {
    const session = classes().find(item => item.id === id);
    if (!session) return false;
    selectedClass = id;
    useStudent(session.students.find(student => student.id === selectedStudent) || session.students[0]);
    return true;
  }

  function curriculum() {
    if (worksheetGrade === 'P6') return { topics: p6Topics, worksheets: p6Worksheets, groups: p6SupplementGroups };
    if (worksheetGrade === 'P3') return { topics: p3Topics, worksheets: p3Worksheets, groups: p3SupplementGroups };
    if (progressRecordCatalogues[worksheetGrade]) return progressRecordCatalogues[worksheetGrade];
    return { topics: [], worksheets: worksheets.filter(sheet => sheet.level === worksheetGrade), groups: [] };
  }

  // The application replaces the workbench on render. Preserve its independently
  // scrolling regions and keyboard focus while selecting worksheets or searching.
  function preserveView(callback, options = {}) {
    if (typeof document === 'undefined') return callback();
    const root = document.querySelector('.teacher-progress');
    const positions = ['.teacher-progress-classes-list', '.teacher-progress-students-list', '.teacher-progress-chart-scroll'].map(selector => {
      const element = root?.querySelector(selector);
      return { selector, top: element?.scrollTop || 0, left: element?.scrollLeft || 0 };
    });
    const active = document.activeElement;
    const focusId = active?.id;
    const focusAction = active?.dataset?.action;
    const focusWorksheet = active?.dataset?.worksheet;
    const focusStudent = active?.dataset?.student;
    const focusClass = active?.dataset?.class;
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
    if (!target && focusAction) target = [...nextRoot.querySelectorAll('[data-action]')].find(element => element.dataset.action === focusAction && (!focusWorksheet || element.dataset.worksheet === focusWorksheet) && (!focusStudent || element.dataset.student === focusStudent) && (!focusClass || element.dataset.class === focusClass));
    if (target) {
      target.focus({ preventScroll: true });
      if (selection && target.setSelectionRange) target.setSelectionRange(...selection);
    }
    return result;
  }

  function revealClass() {
    if (typeof document === 'undefined') return;
    const list = document.querySelector('.teacher-progress-classes-list');
    const active = list?.querySelector('.teacher-progress-class.is-active');
    if (!active) return;
    const listBounds = list.getBoundingClientRect(), activeBounds = active.getBoundingClientRect();
    // Only move the class strip; selecting a worksheet must not scroll the page.
    list.scrollLeft += activeBounds.left - listBounds.left - (list.clientWidth - activeBounds.width) / 2;
  }

  function statusFor(worksheetId) {
    return worksheetProgress(getState(), selectedStudent, worksheetId);
  }

  function worksheetButton(worksheet) {
    if (!worksheet) return '';
    const assignment = statusFor(worksheet.id);
    const status = assignment ? statuses[assignment.status] || ['已派發', 'sent'] : ['未派發', 'available'];
    const picked = !assignment && selected.has(worksheet.id);
    const label = worksheet.variant || worksheet.code;
    const title = worksheet.code+' · '+titleFor(worksheet)+' · '+(picked ? '已選取' : status[0]);
    return action('worksheet', '<span>'+esc(label)+'</span>', 'data-worksheet="'+esc(worksheet.id)+'" aria-label="'+esc(title)+(assignment ? ' · 開啟工作紙' : '')+'" title="'+esc(title)+'"'+(!assignment ? ' aria-pressed="'+picked+'"' : ''), 'teacher-progress-box is-'+status[1]+(picked ? ' is-selected' : '')+(worksheetSearch.trim() ? matches(worksheet) ? ' is-match' : ' is-muted' : ''));
  }

  function topicWorksheets(topic, family) {
    return curriculum().worksheets.filter(worksheet => String(worksheet.topicId ?? worksheet.topicCode) === String(topic.id) && worksheet.family === family);
  }

  function matches(worksheet) {
    const normalize = value => String(value || '').toLowerCase().replace(/\s+/g, '');
    const query = normalize(worksheetSearch);
    return !query || [worksheet.code, worksheet.title, titleFor(worksheet), worksheet.topic, worksheet.topicZh, worksheet.familyLabel, familyLabels[worksheet.family]].some(value => normalize(value).includes(query));
  }

  function groupSections(family, term) {
    return (curriculum().groups.find(group => group.id === family)?.sections || []).filter(section => !term || section.term === term);
  }

  function sectionButtons(section) {
    return section.worksheetIds.map(id => worksheetButton(worksheetMap.get(id))).join('');
  }

  function termCollection(family, term) {
    return groupSections(family, term).map(section => '<div class="teacher-progress-collection-group"><div class="teacher-progress-group-label" title="'+esc(section.titleZh || section.label)+'">'+esc(sectionLabel(section, family))+'</div><div class="teacher-progress-boxes">'+sectionButtons(section)+'</div></div>').join('');
  }

  function combinedChart() {
    const data = curriculum();
    if (data.columns) return topicFamilyChart(data);
    if (!data.topics.length) {
      if (!data.worksheets.length) return '<div class="teacher-progress-empty">此示範暫無'+esc(gradeLabels[worksheetGrade] || worksheetGrade)+'工作紙，請選擇其他年級。</div>';
      return '<table class="teacher-progress-table teacher-progress-samples"><thead><tr><th scope="col">課題</th><th scope="col">示範工作紙</th></tr></thead><tbody>'+data.worksheets.map(sheet => '<tr><th scope="row">'+esc(titleFor(sheet))+'</th><td>'+worksheetButton(sheet)+'</td></tr>').join('')+'</tbody></table>';
    }
    const columns = [['topic',familyLabels.topic],['math',familyLabels.math],['excel',familyLabels.excel],['revision',familyLabels.revision], ...(data.groups.some(group => group.id === 'ce') ? [['ce',familyLabels.ce]] : []), ['ps',familyLabels.ps]];
    const banks = columns.filter(([id]) => ['ce','ps'].includes(id));
    const header = '<table class="teacher-progress-table teacher-progress-grade-'+esc(worksheetGrade)+'"><colgroup>'+columns.map(([id]) => '<col class="teacher-progress-'+id+'-col">').join('')+'</colgroup><thead><tr>'+columns.map(([, label]) => '<th scope="col">'+label+'</th>').join('')+'</tr></thead><tbody>';
    const terms = Object.entries(termLabels).map(([term, label]) => {
      const topics = data.topics.filter(topic => topic.term === term);
      if (!topics.length) return '';
      const revisions = groupSections('revision', term);
      return '<tr class="teacher-progress-term"><th colspan="'+columns.length+'" scope="colgroup">'+label+'</th></tr>'+topics.map((topic, index) => {
        const revision = revisions.find(section => section.topicCodes[0] === topic.code);
        const covered = revisions.some(section => section.topicCodes.includes(topic.code));
        const revisionCell = revision ? '<td rowspan="'+revision.topicCodes.length+'" class="teacher-progress-revision-cell"><div class="teacher-progress-revision-group"><strong>'+esc(revision.label)+'</strong><div class="teacher-progress-boxes">'+sectionButtons(revision)+'</div></div></td>' : covered ? '' : '<td class="teacher-progress-empty-cell"></td>';
        return '<tr><th scope="row" title="'+esc(titleFor(topic))+'"><span class="teacher-progress-topic-code">'+esc(topic.code)+'</span><span class="teacher-progress-topic-name">'+esc(titleFor(topic))+'</span></th><td><div class="teacher-progress-boxes">'+topicWorksheets(topic, 'math').map(worksheetButton).join('')+'</div></td><td><div class="teacher-progress-boxes">'+topicWorksheets(topic, 'excel').map(worksheetButton).join('')+'</div></td>'+revisionCell+(index === 0 ? banks.map(([id]) => '<td rowspan="'+topics.length+'" class="teacher-progress-term-bank teacher-progress-'+id+'-bank">'+termCollection(id, term)+'</td>').join('') : '')+'</tr>';
      }).join('');
    }).join('');
    const sspa = groupSections('sspa').map(section => '<tr class="teacher-progress-sspa-row"><th scope="row">'+esc(sectionLabel(section, 'sspa'))+'</th><td colspan="'+(columns.length-1)+'"><div class="teacher-progress-boxes">'+sectionButtons(section)+'</div></td></tr>').join('');
    return header+terms+sspa+'</tbody></table>';
  }

  // Secondary EX/MC/REV/QUIZ and the shared kindergarten index have their own
  // column families. Keep every family on one chart, just like the source.
  function topicFamilyChart(data) {
    const columns = [['topic', familyLabels.topic], ...data.columns.map(([family, label]) => [family, familyLabels[family] || label])];
    const sections = data.termLabels ? Object.fromEntries(Object.entries(data.termLabels).map(([term, label]) => [term, term === 'all' ? gradeLabels[worksheetGrade] || label : termLabels[term] || label])) : { all: gradeLabels[worksheetGrade] || worksheetGrade };
    return '<table class="teacher-progress-table teacher-progress-family-chart teacher-progress-grade-'+esc(worksheetGrade)+'"><colgroup>'+columns.map(([id]) => '<col class="teacher-progress-'+esc(id)+'-col">').join('')+'</colgroup><thead><tr>'+columns.map(([, label]) => '<th scope="col">'+esc(label)+'</th>').join('')+'</tr></thead><tbody>'+Object.entries(sections).map(([term, label]) => '<tr class="teacher-progress-term"><th colspan="'+columns.length+'" scope="colgroup">'+esc(label)+'</th></tr>'+data.topics.filter(topic => topic.term === term).map(topic => '<tr><th scope="row"><span class="teacher-progress-topic-code">'+esc(topic.code)+'</span><span class="teacher-progress-topic-name">'+esc(titleFor(topic))+(topic.pagesLabel ? '<small class="teacher-progress-page-ref">第 '+esc(topic.pagesLabel)+' 頁</small>' : '')+'</span></th>'+data.columns.map(([family]) => '<td><div class="teacher-progress-boxes">'+topicWorksheets(topic, family).map(worksheetButton).join('')+'</div></td>').join('')+'</tr>').join('')).join('')+'</tbody></table>';
  }

  function footer(student) {
    const chosen = [...selected].map(id => worksheetMap.get(id)).filter(Boolean);
    const codes = chosen.map(worksheet => worksheet.code).join(', ');
    return '<div class="teacher-progress-footer"><div class="teacher-progress-selection" aria-live="polite"><strong>'+chosen.length+' 份已選取</strong><span title="'+esc(codes)+'">'+(chosen.length ? esc(codes) : '選取工作紙')+'</span></div><div class="teacher-progress-send-actions">'+(chosen.length ? action('clear', '清除', '', 'btn ghost small') : '')+'<select id="teacher-progress-purpose" aria-label="工作紙用途"><option value="classwork"'+(!homework ? ' selected' : '')+'>課堂練習</option><option value="homework"'+(homework ? ' selected' : '')+'>家課</option></select>'+action('prepare', '稍後派發', 'aria-label="為 '+esc(student.name)+' 預備 '+chosen.length+' 份工作紙"'+(!chosen.length ? ' disabled' : ''), 'btn small')+action('send', '派發給學生', 'aria-label="派發 '+chosen.length+' 份工作紙給 '+esc(student.name)+'"'+(!chosen.length ? ' disabled' : ''), 'btn primary')+'</div></div>';
  }

  function classNavigation() {
    const list = classes(), session = currentClass();
    const index = list.findIndex(item => item.id === session?.id);
    const arrow = direction => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="'+(direction === 'previous' ? 'm14 6-6 6 6 6' : 'm10 6 6 6-6 6')+'"/></svg>';
    return '<section class="teacher-progress-classes" aria-label="課堂及學生"><div class="teacher-progress-classes-heading"><strong>課堂</strong>'+action('today', '今天', '', 'btn ghost small')+'</div><div class="teacher-progress-date-actions"><input id="teacher-progress-class-date" type="date" aria-label="按日期尋找課堂" value="'+(session?.date || TODAY)+'"></div><div class="teacher-progress-class-navigation">'+action('previous-class', arrow('previous'), 'aria-label="上一堂"'+(index <= 0 ? ' disabled' : ''), 'teacher-progress-class-arrow')+'<div class="teacher-progress-classes-list" role="group" aria-label="過往及即將開始的課堂">'+list.map(item => {
      const date = new Intl.DateTimeFormat('zh-HK', { month: 'short', day: 'numeric', weekday: 'short' }).format(new Date(item.date+'T12:00:00')), hours = time(item.start)+'–'+time(item.end);
      return action('class', '<strong>'+hours+'</strong>', 'data-class="'+esc(item.id)+'" aria-pressed="'+(selectedClass === item.id)+'" aria-label="'+esc(date+' · '+hours)+'"', 'teacher-progress-class'+(selectedClass === item.id ? ' is-active' : ''));
    }).join('')+'</div>'+action('next-class', arrow('next'), 'aria-label="下一堂"'+(index < 0 || index === list.length-1 ? ' disabled' : ''), 'teacher-progress-class-arrow')+'</div><div class="teacher-progress-students-list" role="group" aria-label="所選課堂的學生">'+(session ? session.students.map(student => action('student', '<span>'+esc(student.name)+'</span>'+(student.level ? '<small>'+esc(gradeLabels[student.level] || student.level)+'</small>' : ''), 'data-student="'+esc(student.id)+'" aria-pressed="'+(selectedStudent === student.id)+'"', 'teacher-progress-student'+(selectedStudent === student.id ? ' is-active' : ''))).join('') : '<p class="teacher-progress-empty">這位老師暫無已安排的課堂。</p>')+'</div></section>';
  }

  function renderUI() {
    const student = currentStudent();
    const matchesCount = worksheetSearch.trim() ? curriculum().worksheets.filter(matches).length : null;
    const gradePicker = '<label class="teacher-progress-grade-label">工作紙<select id="teacher-progress-grade" aria-label="工作紙年級">'+grades.map(grade => '<option value="'+grade+'"'+(grade === worksheetGrade ? ' selected' : '')+'>'+(gradeLabels[grade] || grade)+'</option>').join('')+'</select></label>';
    const header = student ? '<header class="teacher-progress-header"><div class="teacher-progress-identity"><h2>'+esc(student.name)+'</h2>'+(student.level ? '<span>'+esc(gradeLabels[student.level] || student.level)+'</span>' : '')+'</div>'+gradePicker+'<div class="teacher-progress-header-actions">'+action('folder', '學習檔案', '', 'btn small')+action('student-view', '查看學生介面', '', 'btn small')+'</div><div class="teacher-progress-search-area"><label class="teacher-progress-search teacher-progress-worksheet-search">'+searchIcon+'<input id="teacher-progress-worksheet-search" type="search" placeholder="課題或編號" aria-label="按課題或編號尋找工作紙" value="'+esc(worksheetSearch)+'"></label>'+(matchesCount === null ? '' : '<span class="teacher-progress-search-result" aria-live="polite">'+(matchesCount ? matchesCount+' 項結果' : '找不到工作紙')+'</span>')+'</div></header>' : '';
    const legend = '<div class="teacher-progress-legend" aria-label="工作紙狀態圖例">'+[['available','未派發'], ...Object.values(statuses).map(([label, status]) => [status, label])].map(([status, label]) => '<span><i class="is-'+status+'" aria-hidden="true"></i>'+label+'</span>').join('')+'</div>';
    return '<div class="teacher-progress">'+classNavigation()+'<section class="teacher-progress-workbench" aria-label="工作紙進度">'+(student ? header+'<div class="teacher-progress-chart-scroll" tabindex="0" aria-label="工作紙進度表">'+combinedChart()+'</div>'+legend+footer(student) : '<div class="teacher-progress-empty">請選擇課堂以查看學生進度。</div>')+'</section></div>';
  }

  function onClick(button) {
    const name = button?.dataset?.action;
    if (!name?.startsWith('teacher-progress-')) return false;
    if (name === 'teacher-progress-student') {
      selectStudent(button.dataset.student);
      preserveView(render, { resetChart: true });

    } else if (['teacher-progress-class', 'teacher-progress-previous-class', 'teacher-progress-next-class', 'teacher-progress-today'].includes(name)) {
      const list = classes(), index = list.findIndex(session => session.id === currentClass()?.id);
      const target = name === 'teacher-progress-class' ? button.dataset.class : name === 'teacher-progress-today' ? classNearDate(list, TODAY)?.id : list[index + (name === 'teacher-progress-previous-class' ? -1 : 1)]?.id;
      if (selectClass(target)) { preserveView(render, { resetChart: true }); revealClass(); }
    } else if (name === 'teacher-progress-worksheet') {
      const id = button.dataset.worksheet;
      if (!currentStudent() || !curriculum().worksheets.some(sheet => sheet.id === id)) return true;
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
    } else if (name === 'teacher-progress-send' || name === 'teacher-progress-prepare') {
      const student = currentStudent();
      if (!student || !selected.size) return true;
      const chosen = [...selected];
      const prepared = name === 'teacher-progress-prepare';
      preserveView(() => change(() => {
        assignTeacherWorksheets(getState(), { studentId: student.id, worksheetIds: chosen, homework, prepared, tutorId: getTutorId() });
        selected.clear();
      }, prepared ? '已為 '+student.name+' 預備工作紙。' : '已派發工作紙給 '+student.name+'。'));
    } else if (name === 'teacher-progress-folder') {
      if (currentStudent()) openFolder?.(selectedStudent);
    } else if (name === 'teacher-progress-student-view') {
      if (currentStudent()) openStudentView?.(selectedStudent);
    }
    return true;
  }

  function onInput(event) {
    if (event.target.id === 'teacher-progress-worksheet-search') worksheetSearch = event.target.value;
    else return false;
    preserveView(render, { resetChart: event.target.id === 'teacher-progress-worksheet-search' });
    if (event.target.id === 'teacher-progress-worksheet-search' && worksheetSearch.trim() && typeof document !== 'undefined') {
      document.querySelector('.teacher-progress-box.is-match')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    return true;
  }

  function onChange(event) {
    if (event.target.id === 'teacher-progress-purpose') homework = event.target.value === 'homework';
    else if (event.target.id === 'teacher-progress-grade') {
      if (!grades.includes(event.target.value)) return true;
      worksheetGrade = event.target.value;
      selected.clear();
      worksheetSearch = '';
      preserveView(render, { resetChart: true });
    } else if (event.target.id === 'teacher-progress-class-date') {
      if (!event.target.value) return true;
      if (selectClass(classNearDate(classes(), event.target.value)?.id)) { preserveView(render, { resetChart: true }); revealClass(); }
    } else return false;
    return true;
  }

  return { render: renderUI, afterRender: revealClass, onClick, onInput, onChange, selectStudent,
    get selectedStudentId() { return currentStudent()?.id || null; },
    reset() { selectedStudent = null; selectedClass = null; worksheetGrade = null; selected.clear(); worksheetSearch = ''; homework = false; }
  };
}
