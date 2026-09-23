import { centreConfig } from './branch-config.js';
import { getPublishedReports, getStudentStamps, HANDBOOK_CALENDAR, HANDBOOK_WEATHER, HANDBOOK_NOTICES } from './handbook.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const ratingLabels = [['punctual', '準時上課'], ['homework', '交齊功課'], ['diligence', '上課認真'], ['selfLearning', '自學自習']];
const button = (name, label, className = 'btn', attrs = '') => `<button type="button" class="${esc(className)}" data-action="${esc(name)}" ${attrs}>${label}</button>`;
const plainDate = value => String(value || '').slice(0, 10);
const plainTutor = value => value || '未填寫';
const options = value => '<option value="">—</option>' + ['A', 'B', 'C', 'D', 'E'].map(rating => `<option value="${rating}"${value === rating ? ' selected' : ''}>${rating}</option>`).join('');
const field = (id, label, input) => `<div class="field"><label for="${esc(id)}">${label}</label>${input}</div>`;
const starArt = '<svg viewBox="0 0 80 80" fill="none" aria-hidden="true"><path d="m40 9 9.4 19.1 21.1 3.1-15.3 14.9 3.6 21L40 57.2 21.2 67l3.6-20.9L9.5 31.2l21.1-3.1Z" fill="currentColor"/><path d="m28.5 42.5 8 8 16-18" stroke="white" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function reportTopics(note, content) {
  if (Array.isArray(note.topicRows) && note.topicRows.some(row => row.title)) return note.topicRows.filter(row => row.title).map(row => ({ ...row, title: note.id === 'note-chloe-sep16' ? content(row.title) : row.title }));
  const title = note.id === 'note-chloe-sep16' ? content(note.topics || '') : note.topics;
  return title ? [{ title, rating: '' }] : [];
}

export function renderLessonReport(note, { audience = 'teacher', canEdit = true, action = button, dateLabel = plainDate, tutorName = plainTutor, content = value => value } = {}) {
  const isParent = audience === 'parent';
  const display = key => note.id === 'note-chloe-sep16' ? content(note[key] || '') : note[key] || '';
  const topics = reportTopics(note, content);
  const hasRatings = ratingLabels.some(([key]) => note.ratings?.[key]);
  const ratingRows = ratingLabels.map(([key, label]) => `<div><dt>${label}</dt><dd>${esc(note.ratings?.[key] || '—')}</dd></div>`).join('');
  const acknowledgement = note.parentAcknowledgedAt
    ? `<div class="report-acknowledged"><span>家長已閱 · ${esc(dateLabel(note.parentAcknowledgedAt.slice(0, 10)))}</span>${note.parentReply ? `<p><strong>給老師的話</strong>${esc(note.parentReply)}</p>` : ''}</div>`
    : isParent ? `<div class="report-acknowledgement">${field('report-reply-' + note.id, '給老師的話（選填）', `<textarea id="report-reply-${esc(note.id)}" rows="2" maxlength="1000" placeholder="有甚麼想讓老師知道？"></textarea>`)}${action('acknowledge-report', '已閱讀，通知老師', 'btn report-ack-button', `data-id="${esc(note.id)}"`)}</div>` : '<p class="report-awaiting-read">待家長閱讀</p>';
  return `<article class="lesson-report${isParent ? ' lesson-report-parent' : ''}" aria-label="${esc(dateLabel(note.date))} 課堂報告"><header class="lesson-report-header"><div><h2><time datetime="${esc(note.date)}">${esc(dateLabel(note.date, { weekday: 'short' }))}</time></h2><p>${esc(tutorName(note.tutor))} 老師</p></div>${!isParent ? `<div class="lesson-report-tools"><span class="report-publish-state">${note.published ? note.draft ? '已發佈 · 有草稿' : '已發佈' : '草稿'}</span>${canEdit ? action('write-note', '編輯', 'btn small', `data-id="${esc(note.studentId)}" data-note-id="${esc(note.id)}"`) : ''}</div>` : ''}</header>${hasRatings ? `<dl class="report-ratings" aria-label="課堂表現">${ratingRows}</dl>` : ''}${topics.length ? `<section class="report-topics"><h3>學習重點</h3><ul>${topics.map(row => `<li><span>${esc(row.title)}</span>${row.rating ? `<strong aria-label="評級 ${esc(row.rating)}">${esc(row.rating)}</strong>` : ''}</li>`).join('')}</ul></section>` : ''}${!hasRatings && note.performance ? `<p class="report-performance">${esc(display('performance'))}</p>` : ''}${note.comment ? `<section class="report-message"><h3>給家長的話</h3><p>${esc(display('comment'))}</p></section>` : ''}${note.homework ? `<section class="report-homework"><h3>家課</h3><p>${esc(display('homework'))}</p></section>` : ''}${note.published ? acknowledgement : ''}</article>`;
}

export function renderLessonReportForm({ note, student, date, tutorId, tutors = [], action = button }) {
  const draft = note?.draft || note || {};
  const rows = reportTopics(draft, value => value);
  const tutor = draft.tutor || tutorId;
  return `<form id="lesson-report-form" class="lesson-report-form"><p class="report-student-name">${esc(student.name)}${student.number ? `<span>${esc(student.number)}</span>` : ''}</p><div class="field-row">${field('report-date', '課堂日期', `<input id="report-date" type="date" required value="${esc(draft.date || date)}">`)}${field('report-tutor', '老師', `<select id="report-tutor" required>${tutors.map(item => `<option value="${esc(item.id)}"${item.id === tutor ? ' selected' : ''}>${esc(item.name)}</option>`).join('')}</select>`)}</div><fieldset class="report-form-section"><legend>課堂表現</legend><div class="report-rating-inputs">${ratingLabels.map(([key, label]) => field('report-rating-' + key, label, `<select id="report-rating-${key}">${options(draft.ratings?.[key])}</select>`)).join('')}</div></fieldset><fieldset class="report-form-section"><legend>學習重點</legend><div class="report-topic-labels" aria-hidden="true"><span>課題</span><span>評級</span></div>${[0, 1, 2].map(index => `<div class="report-topic-input"><input id="report-topic-${index}" maxlength="160" aria-label="學習重點 ${index + 1}" placeholder="${index === 0 ? '例如：小數除法' : '其他課題（選填）'}" value="${esc(rows[index]?.title || '')}"><select id="report-topic-rating-${index}" aria-label="學習重點 ${index + 1} 評級">${options(rows[index]?.rating)}</select></div>`).join('')}</fieldset>${field('note-comment', '給家長的話', `<textarea id="note-comment" rows="3" maxlength="2000" placeholder="記下孩子的進展及需要跟進的地方">${esc(draft.comment || '')}</textarea>`)}${field('note-homework', '家課（選填）', `<textarea id="note-homework" rows="2" maxlength="1000" placeholder="例如：完成工作紙 601B，下一課帶回">${esc(draft.homework || '')}</textarea>`)}<div class="report-stamp-option"><label class="report-stamp-check"><input type="checkbox" id="report-award-stamp"${draft.awardStamp === true ? ' checked' : ''}><span>發佈時送出一個印章</span><span class="report-stamp-mini" aria-hidden="true">${starArt}</span></label><div class="report-stamp-reason">${field('report-stamp-reason', '鼓勵孩子的一句話', `<input id="report-stamp-reason" maxlength="160" value="${esc(draft.stampReason ?? '認真完成今天的練習')}" placeholder="例如：遇到難題仍願意繼續嘗試">`)}</div></div></form>`;
}

function renderCalendar(month, action, icon) {
  if (!/^\d{4}-\d{2}$/.test(month || '') || Number(month.slice(5)) < 1 || Number(month.slice(5)) > 12) month = '2026-09';
  const [year, monthNumber] = month.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const calendar = HANDBOOK_CALENDAR.filter(item => item.date.startsWith(month));
  const byDate = new Map(calendar.map(item => [item.date, item]));
  const inCalendar = month >= '2026-09' && month <= '2027-12';
  const cells = Array.from({ length: weekday }, () => '<span class="handbook-calendar-blank" aria-hidden="true"></span>');
  for (let day = 1; day <= days; day++) {
    const date = `${month}-${String(day).padStart(2, '0')}`, item = byDate.get(date);
    cells.push(`<span class="handbook-calendar-day${item ? ' holiday-' + (item.kind === 'public' ? 'public' : 'centre') : ''}"${item ? ` aria-label="${monthNumber}月${day}日，${esc(item.label)}，停課"` : ''}><time datetime="${date}">${day}</time>${item ? '<i aria-hidden="true"></i>' : ''}</span>`);
  }
  return `<section class="handbook-calendar"><header class="handbook-month-heading">${action('handbook-month', icon('left'), 'icon-btn border', 'data-delta="-1" aria-label="上一個月"' + (month <= '2026-09' ? ' disabled' : ''))}<h2>${year} 年 ${monthNumber} 月</h2>${action('handbook-month', icon('right'), 'icon-btn border', 'data-delta="1" aria-label="下一個月"' + (month >= '2027-12' ? ' disabled' : ''))}</header><div class="handbook-calendar-grid" aria-label="${year} 年 ${monthNumber} 月中心校曆">${['日', '一', '二', '三', '四', '五', '六'].map(day => `<span class="handbook-calendar-weekday">${day}</span>`).join('')}${cells.join('')}</div><div class="handbook-calendar-legend"><span><i class="holiday-public"></i>公眾假期</span><span><i class="holiday-centre"></i>中心假期</span><span>以上日子停課</span></div><div class="handbook-closure-list">${calendar.length ? calendar.map(item => `<div><span class="handbook-closure-date">${monthNumber} 月 ${Number(item.date.slice(8))} 日</span><span class="handbook-closure-kind ${item.kind === 'public' ? 'public' : 'centre'}">${esc(item.label)}</span></div>`).join('') : `<p>${inCalendar ? '本月沒有校曆列明的假期。' : '未有這個月份的校曆。'}</p>`}</div><p class="handbook-source">2026–27 中心校曆 · 按提供的學生手冊列示</p></section>`;
}

function renderCentreInfo(action) {
  const weather = HANDBOOK_WEATHER.map(item => `<div class="handbook-weather-row"><strong>${esc({ amber: '黃雨', red: '紅雨', black: '黑雨' }[item.signal] || item.signal)}</strong><div><h4>${esc(item.label)}</h4><p>${esc(item.arrangement)}</p></div></div>`).join('');
  return `<div class="handbook-information"><section class="handbook-centre-contact"><div><h2>MathConcept</h2><p>${esc(centreConfig.centre.branchZh)}中心</p></div>${action('navigate', '聯絡中心', 'btn', 'data-page="messages"')}</section><section class="handbook-parent-notices"><h2>家長須知</h2>${HANDBOOK_NOTICES.map(item => `<details><summary>${esc(item.title)}</summary><p>${esc(item.body)}</p></details>`).join('')}</section><details class="handbook-weather"><summary>颱風及暴雨上課安排</summary><div>${weather}<p class="handbook-weather-note">上課期間如發出八號或以上風球、紅色或黑色暴雨警告，中心會照顧已到校的學生，直至安排安全回家。請同時留意中心的最新通知。</p></div></details></div>`;
}

export function renderParentHandbook({ state, student, tab = 'reports', month = '2026-09', childSwitch = '', completedWork = '', icon = () => '', action = button, dateLabel = plainDate, tutorName = plainTutor, content = value => value }) {
  const tabs = [['reports', '課堂報告'], ['calendar', '中心校曆'], ['info', '中心資訊']];
  if (!tabs.some(([id]) => id === tab)) tab = 'reports';
  const reports = getPublishedReports(state, student.id);
  const page = tab === 'calendar' ? renderCalendar(month, action, icon) : tab === 'info' ? renderCentreInfo(action) : `<div class="handbook-report-list">${reports.length ? reports.map(note => renderLessonReport(note, { audience: 'parent', action, dateLabel, tutorName, content })).join('') : '<div class="handbook-empty"><h2>暫無課堂報告</h2><p>老師發佈後，你便可在這裏閱讀及回覆。</p></div>'}${completedWork ? `<section class="panel"><div class="panel-head"><h2>已批改功課</h2></div>${completedWork}</section>` : ''}</div>`;
  return `<div class="parent-handbook"><header class="handbook-heading"><h1>家長手冊</h1>${typeof childSwitch === 'function' ? childSwitch() : childSwitch}</header><nav class="handbook-tabs" aria-label="家長手冊分類">${tabs.map(([id, label]) => action('handbook-tab', label, id === tab ? 'active' : '', `data-tab="${id}" aria-pressed="${id === tab}"`)).join('')}</nav>${page}</div>`;
}

export function renderStampAwardForm({ student }) {
  return `<form id="stamp-award-form" class="lesson-report-form"><p class="report-student-name">${esc(student.name)}</p><div class="award-stamp-preview" aria-hidden="true">${starArt}</div>${field('stamp-reason', '鼓勵孩子的一句話', '<input id="stamp-reason" maxlength="160" required placeholder="例如：遇到難題仍願意繼續嘗試" list="stamp-reason-options"><datalist id="stamp-reason-options"><option value="認真完成今天的練習"><option value="主動完成改正"><option value="遇到難題仍願意繼續嘗試"><option value="能清楚說出自己的解題方法"></datalist>')}</form>`;
}

export function renderStudentStamps({ state, student, studentPicker = '', icon = () => '', action = button, dateLabel = plainDate, tutorName = plainTutor }) {
  const stamps = getStudentStamps(state, student.id);
  const latest = stamps.at(-1);
  const sheetCount = Math.max(1, Math.ceil(stamps.length / 50));
  const sheets = Array.from({ length: sheetCount }, (_, sheetIndex) => {
    const sheetStamps = stamps.slice(sheetIndex * 50, (sheetIndex + 1) * 50);
    return `<section class="stamp-sheet" aria-label="第 ${sheetIndex + 1} 頁印章"><div class="stamp-sheet-heading"><h2>${sheetCount > 1 ? `第 ${sheetIndex + 1} 頁` : '每一個，都是我的努力'}</h2><span>${sheetStamps.length} / 50</span></div><div class="stamp-grid">${Array.from({ length: 50 }, (_, index) => {
      const stamp = sheetStamps[index];
      const number = sheetIndex * 50 + index + 1;
      const colour = ['ochre', 'coral', 'sage', 'blue', 'lavender'][Math.floor(index / 10)];
      return stamp ? action('stamp-detail', `<span class="stamp-ink" aria-hidden="true">${starArt}</span><span class="stamp-number">${number}</span>`, `stamp-cell earned stamp-${colour}`, `data-id="${esc(stamp.id)}" aria-label="第 ${number} 個印章：${esc(stamp.reason)}，${esc(dateLabel(stamp.date))}，${esc(tutorName(stamp.tutor))} 老師"`) : `<span class="stamp-cell is-empty" aria-label="第 ${number} 個印章，等待收集"><span class="stamp-number">${number}</span>${(index + 1) % 10 === 0 ? '<span class="stamp-empty-star" aria-hidden="true">☆</span>' : ''}</span>`;
    }).join('')}</div><div class="stamp-milestones" aria-label="收集里程碑">${[10, 20, 30, 40, 50].map(count => `<span class="stamp-milestone${sheetStamps.length >= count ? ' reached' : ''}" aria-label="${count} 個印章${sheetStamps.length >= count ? '，已達成' : ''}"><span aria-hidden="true">${sheetStamps.length >= count ? '★' : '☆'}</span><small>${count}</small></span>`).join('')}</div></section>`;
  }).join('');
  return `<div class="student-stamps"><header class="binder-top"><div class="binder-brand"><img src="/brand/mathconcept-logo.png" alt="MathConcept"><span>我的印章冊</span></div><div class="binder-student">${studentPicker}${action('demo-controls', icon('more'), 'binder-demo', 'aria-label="示範設定"')}</div></header><div class="stamp-page-nav">${action('navigate', icon('left') + ' 回到工作簿', 'stamp-back', 'data-page="work"')}</div><div class="stamp-collection-heading"><div><h1>我的印章冊</h1><p>${stamps.length ? `我收集了 <strong>${stamps.length}</strong> 個印章` : '等老師送我第一個印章'}</p></div><span class="stamp-cover-star" aria-hidden="true">${starArt}</span></div>${latest ? `<div class="stamp-latest"><span aria-hidden="true">★</span><p><strong>${esc(tutorName(latest.tutor))} 老師</strong>${esc(latest.reason)}</p></div>` : ''}${sheets}</div>`;
}
