import { worksheetById, TODAY } from './model.js';
import { binderSection } from './student-work.js';
import { familyText, familyDate } from './family-locale.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const labels = { past: '做好了', current: '現在做', future: '稍後做' };
const priority = { corrections: 0, 'in-progress': 1, upcoming: 2, submitted: 3 };

function inkPreview(assignment) {
  const paths = [...(assignment.strokes || []), ...(assignment.feedback || [])].filter(stroke => stroke.points?.length).map(stroke => {
    const points = stroke.points.filter(point => Number.isFinite(point.x) && Number.isFinite(point.y)).map(point => `${point.x * 1000},${point.y * 1450}`).join(' ');
    const colour = /^#[0-9a-f]{3,8}$/i.test(stroke.colour || '') ? stroke.colour : '#35475f';
    return `<polyline points="${points}" stroke="${colour}" stroke-width="${(Number(stroke.width) || 2.4) * 1000 / 700}"/>`;
  }).join('');
  return paths ? `<svg class="binder-ink" viewBox="0 0 1000 1450" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>` : '';
}

export function renderStudentBinder({ state, student, section = 'current', icon, studentPicker, preview, noteText }) {
  if (!Object.hasOwn(labels, section)) section = 'current';
  const assignments = state.assignments.filter(assignment => assignment.studentId === student.id && binderSection(assignment) === section)
    .sort((a,b) => section === 'past' ? (b.assignedDate || '').localeCompare(a.assignedDate || '') : (priority[a.status] ?? 4) - (priority[b.status] ?? 4));
  const tabs = Object.entries(labels).map(([id,label]) => `<button type="button" class="binder-divider binder-divider-${id}" data-action="binder-section" data-section="${id}" aria-pressed="${id === section}" aria-controls="student-binder-pages">${icon(id === 'past' ? 'book' : id === 'current' ? 'edit' : 'lock')}<span>${label}</span></button>`).join('');
  const papers = assignments.map(assignment => {
    const worksheet = worksheetById(assignment.worksheetId);
    if (!worksheet) return '';
    const title = worksheet.titleZh || familyText(worksheet.title, 'student');
    const submitted = assignment.status === 'submitted', corrections = assignment.status === 'corrections', past = section === 'past';
    const label = submitted ? '看看已交的功課' : past ? '翻開看看' : corrections ? '改一改' : assignment.status === 'in-progress' ? '繼續寫' : '打開工作紙';
    const note = noteText(assignment);
    const cue = corrections ? `<span class="binder-teacher-note">${icon('edit')}<span>${esc(note || '再試一次，老師幫你看看。')}</span></span>` : '';
    const content = submitted ? `<div class="binder-handover">${icon('inbox')}<span>交給老師了</span></div>` : `<div class="binder-paper-preview" aria-hidden="true"><div class="paper-content"><div class="paper-label">MathConcept · ${esc(familyText(worksheet.level,'student'))}</div><div class="paper-title">${esc(title)}</div><div class="paper-caption">${esc(worksheet.code)} · ${esc(worksheet.topicZh || familyText(worksheet.topic,'student'))}</div>${worksheet.demoContent ? '<p class="paper-demo-note">示範題目 · 尚未上載正式工作紙</p>' : ''}<div class="paper-rule"><span>姓名：${esc(student.name)}</span><span>${familyDate(TODAY,'student',{year:'numeric',month:'long'})}</span></div>${preview(worksheet)}</div>${inkPreview(assignment)}</div>`;
    return `<button type="button" class="binder-worksheet${submitted ? ' is-with-teacher' : ''}" data-action="open-assignment" data-id="${esc(assignment.id)}" aria-label="${esc(label + '：' + (title) + ' · ' + worksheet.code)}">${cue}<span class="binder-worksheet-name"><strong>${esc(title)}</strong><small>${esc(worksheet.code)}${assignment.homework ? ' · 家課' : ''}</small></span>${content}<span class="binder-paper-action"><span>${label}</span>${icon(past ? 'book' : corrections ? 'edit' : 'right')}</span></button>`;
  }).join('');
  const future = `<div class="binder-future"><div class="binder-pocket" role="img" aria-label="尚未開放的工作紙，放在老師的封袋裏"><div class="binder-pocket-flap"></div><span class="binder-pocket-seal">${icon('lock')}</span><strong>等老師打開</strong></div><p>老師安排好，就會放到「現在做」。</p></div>`;
  const empty = `<div class="binder-empty">${icon(section === 'past' ? 'book' : 'folder')}<p>${section === 'past' ? '做好的工作紙，會收在這裏。' : '老師會把要做的工作紙放在這裏。'}</p></div>`;
  return `<div class="student-binder"><header class="binder-top"><div class="binder-brand"><img src="/brand/mathconcept-logo.png" alt="MathConcept"><span>我的工作簿</span></div><div class="binder-student"><button type="button" class="binder-stamp-link" data-action="navigate" data-page="stamps">${icon('star')}<span>我的印章</span></button>${studentPicker}<button type="button" data-action="demo-controls" class="binder-demo" aria-label="示範設定">${icon('more')}</button></div></header><div class="binder-stage"><nav class="binder-dividers" aria-label="工作簿分類">${tabs}</nav><section class="binder-cover" aria-label="${labels[section]}"><div class="binder-rings" aria-hidden="true"><i></i><i></i><i></i></div><div id="student-binder-pages" class="binder-pages"><h1>${labels[section]}</h1>${section === 'future' ? future : papers ? `<div class="binder-papers">${papers}</div>` : empty}</div></section></div></div>`;
}
