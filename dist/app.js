import { TODAY, centre, WEEK, seed, clone, uid, time, money, students, studentById, worksheets, worksheetById, tutors, activeBooking, validateSlot, moveBooking, requestAbsence, approveAbsence, bookMakeup, usedReschedules, reconciliation, matchReceipt, reportingTotals, assessmentCredit, staffBalance, activeStaffLeave, staffLeaveUnits, normalizeStaffLeave, setStaffLeave, cancelStaffLeave, record, cycleForDate, enrolledStudents, filterStudents, paginate, seedCentreVolume, seedTeacherSchedules, seedBusyAfternoons, CENTRE_OPEN, CENTRE_CLOSE, HALF_DAY_BOUNDARY } from './model.js';
import { makeCheckInPass, qrSvg, redeemCheckIn } from './checkin.js';
import { getStudentProfile, saveStudentProfile } from './student-profile.js';
import { normalizeConversations } from './conversations.js';
import { createConversationUI } from './conversations-ui.js';
import { normalizeBillingAutomation, analyzeStatement } from './billing-automation.js';
import { createProofUI } from './billing-proof-ui.js';
import { createBankCheckUI } from './bank-check-ui.js';
import { isFamilyRole, familyText, familyDate, familyContent } from './family-locale.js';
import { roleFromUrl, syncEntryPoint } from './entry-points.js';
const STORAGE = 'mathconcept-demo-v4';
let state;
try { const saved = JSON.parse(localStorage.getItem(STORAGE)); state = saved?.version === 4 ? saved : seed(); } catch { state = seed(); }
seedCentreVolume(state);seedTeacherSchedules(state);seedBusyAfternoons(state);normalizeStaffLeave(state);normalizeConversations(state);normalizeBillingAutomation(state);
const ui = { role: 'admin', page: 'schedule', scheduleView: 'week', scheduleTutor:'chan', date: TODAY, weekOffset: 0, selectedStudent: 'chloe', familyStudent: 'chloe', folderTab: 'All work', billingTab: 'Invoices', studentsTab: 'Students', libraryFilter: 'All topics', search: '', thread: 'thread-chloe', moveId: null, assignmentId: null, pen: 'pen', ink: '#35475f', expanded: false, reportMonth: '2026-09', classDate:TODAY, classStart:960, classTutor:'chan' };
const t = (en, zh) => isFamilyRole(ui.role) ? (zh ?? familyText(en, ui.role)) : en;
const content = value => familyContent(value, ui.role);
const dateLabel = (value, options = {}) => familyDate(value, ui.role, options);
let previousState = null;
let returnFocus = null;
let lastPageKey = '';
const $ = (query, root = document) => root.querySelector(query);
const $$ = (query, root = document) => [...root.querySelectorAll(query)];
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const icons = {
 qr: '<path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h3v3h3v3h-6v-3h-3v-6h3z"/>',
 calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
 users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/>',
 wallet: '<path d="M20 7H5a2 2 0 0 1 0-4h13v4M3 5v14a2 2 0 0 0 2 2h15V7"/><path d="M20 12h-5v5h5"/>',
 message: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/>',
 briefcase: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12a20 20 0 0 0 18 0M12 12v3"/>',
 settings: '<path d="m12 3 2 3 3-.5.5 3 3 2-2 2 .5 3-3 .5-2 3-2-2-3 .5-.5-3-3-2 2-2-.5-3 3-.5Z"/><circle cx="12" cy="12" r="3"/>',
 book: '<path d="M12 7v14M3 3h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5v17h-5a4 4 0 0 0-4 1 4 4 0 0 0-4-1H3Z"/>',
 folder: '<path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
 home: '<path d="m3 10 9-7 9 7v10H3ZM9 20v-7h6v7"/>',
 check: '<path d="m5 12 4 4L19 6"/>',
 circlecheck: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
 clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 plus: '<path d="M12 5v14M5 12h14"/>',
 x: '<path d="m6 6 12 12M18 6 6 18"/>',
 left: '<path d="m14 6-6 6 6 6"/>',
 right: '<path d="m10 6 6 6-6 6"/>',
 down: '<path d="m6 9 6 6 6-6"/>',
 arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
 move: '<path d="M12 3v18M3 12h18m-12-6 3-3 3 3m-6 12 3 3 3-3M6 9l-3 3 3 3m12-6 3 3-3 3"/>',
 more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
 search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
 reset: '<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7"/>',
 bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
 file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8ZM14 2v6h6M8 13h8M8 17h5"/>',
 edit: '<path d="m16 3 5 5M4 20l4-1L21 6a2.1 2.1 0 0 0-3-3L5 16Z"/>',
 eraser: '<path d="m3 14 10-11a2 2 0 0 1 3 0l5 5a2 2 0 0 1 0 3l-9 10H8l-5-4a2 2 0 0 1 0-3ZM8 9l9 8M12 21h9"/>',
 undo: '<path d="M3 10h11a7 7 0 0 1 0 14M3 10l5-5M3 10l5 5" transform="translate(0 -3)"/>',
 expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
 send: '<path d="m22 2-7 20-4-9-9-4ZM22 2 11 13"/>',
 download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
 upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
 info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
 star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>',
 menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
 shield: '<path d="m12 3 9 4v5c0 5-9 10-9 10S3 17 3 12V7Z"/><path d="m8 12 3 3 5-6"/>',
 flag: '<path d="M4 22V3m0 0c5-4 11 4 16 0v10c-5 4-11-4-16 0"/>',
 receipt: '<path d="M5 3v18l3-2 4 2 4-2 3 2V3l-3 2-4-2-4 2ZM8 9h8M8 13h8"/>'
};
const icon = (name, cls = '') => '<svg class="icon ' + cls + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (icons[name] || icons.file) + '</svg>';
const action = (name, label, cls = 'btn', attrs = '') => '<button type="button" class="' + cls + '" data-action="' + name + '" ' + attrs + '>' + t(label) + '</button>';
const avatar = (s, cls = '') => '<span class="avatar ' + s.colour + ' ' + cls + '">' + s.initials + '</span>';
const tag = (text, cls = '') => '<span class="badge ' + cls + '">' + esc(t(text)) + '</span>';
const art = (n, cls = '', alt = '') => '<img src="/brand/Asset%20' + n + '.svg" class="' + cls + '" alt="' + esc(alt) + '">';
const empty = (title, message = '', asset = null) => '<div class="empty">' + (asset ? art(asset) : icon('circlecheck')) + '<h3>' + esc(t(title)) + '</h3><p class="small">' + esc(t(message)) + '</p></div>';
const heading = (title, right = '') => '<h1 class="visually-hidden">' + title + '</h1>' + (right ? '<div class="page-heading page-actions"><div class="flex">' + right + '</div></div>' : '');
const tabs = (items, active, type) => '<div class="tabs">' + items.map(item => action(type, item, item === active ? 'active' : '', 'data-value="' + esc(item) + '"')).join('') + '</div>';
const field = (label, input) => {const id=input.match(/\bid="([^"]+)"/)?.[1];return '<div class="field"><label'+(id?' for="'+esc(id)+'"':'')+'>' + t(label) + '</label>' + input + '</div>';};
const regularLabel = s => s.id==='mia'&&state.assessment.enrolled ? (()=>{const b=state.bookings.find(b=>b.studentId==='mia'&&activeBooking(b));return b?dateLabel(b.date,{weekday:'long',day:undefined,month:undefined})+' · '+time(b.start):'Time to be confirmed';})() : s.regular;

const toast = (message, undo = false, error = false) => {
  const el = document.createElement('div'); el.className = 'toast' + (error ? ' error' : '');
  el.innerHTML = icon(error ? 'info' : 'check') + '<span>' + esc(t(message)) + '</span>' + (undo ? action('undo-state', 'Undo', '') : '');
  $('#notifications').append(el); setTimeout(() => el.remove(), undo ? 10000 : 5000);
};
function persist() { try { localStorage.setItem(STORAGE, JSON.stringify(state)); } catch { toast('Browser storage is full. Changes will last for this session.', false, true); } }
function change(fn, message = '', undo = false) {
  const before = clone(state);
  try { fn(); previousState = undo ? before : null; persist(); render(); if (message) toast(message, undo); return true; }
  catch (err) { state=before; const area = $('#form-error'); if (area) { area.textContent = t(err.message); area.classList.add('visible'); } else toast(err.message, false, true); return false; }
}
function closeModal() { $('#overlay').innerHTML = ''; document.body.style.overflow = ''; if (returnFocus?.isConnected) returnFocus.focus(); }
function modal(title, body, footer = '', wide = false) {
  returnFocus = document.activeElement;
  $('#overlay').innerHTML = '<div class="modal-backdrop" data-backdrop><section class="modal ' + (wide ? 'wide' : '') + '" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-head"><h2 id="modal-title" class="modal-title">' + t(title) + '</h2>' + action('close-modal', icon('x'), 'icon-btn', 'aria-label="'+t('Close dialog')+'"') + '</div><div class="modal-body"><div id="form-error" class="form-error" role="alert"></div>' + body + '</div>' + (footer ? '<div class="modal-footer">' + footer + '</div>' : '') + '</section></div>';
  document.body.style.overflow = 'hidden'; setTimeout(() => $('.modal input:not([type=hidden]), .modal select, .modal button')?.focus(), 30);
}
const NAV = {
 admin: [['schedule','calendar','Schedule'],['students','users','Students'],['billing','wallet','Billing & reconciliation'],['messages','message','Conversations'],['calendar','settings','Centre calendar']],
 teacher: [['classroom','users','My classroom'],['schedule','calendar','My schedule'],['library','book','Worksheet library'],['notes','file','Lesson records'],['messages','message','Conversations']],
 parent: [['overview','home','Overview'],['lessons','calendar','Lessons'],['handbook','file','課堂報告'],['homework','book','功課'],['payments','wallet','Payments'],['messages','message','Messages']],
 student: [['work','edit','My work'],['past','folder','Past work']]
};
const requestedRole = roleFromUrl(new URL(location.href));
if (Object.hasOwn(NAV, requestedRole)) {
 ui.role = requestedRole;
 ui.page = NAV[requestedRole][0][0];
}
const identity = () => ui.role === 'admin' ? { name: centre.manager, title: 'Centre manager', initials: 'KK', colour: 'slate' } : ui.role === 'teacher' ? { name: centre.manager, title: 'Teacher', initials: 'KK', colour: 'blue' } : ui.role === 'parent' ? { name: studentById(ui.familyStudent).parent, title: studentById(ui.familyStudent).name + ' · ' + studentById(ui.familyStudent).level, initials: 'PC', colour: 'rose' } : studentById(ui.familyStudent);
const conversationUI = createConversationUI({getState:()=>state,getViewer:()=>({role:ui.role,studentId:ui.familyStudent}),persist:()=>{previousState=null;persist();},render:()=>render(),modal,closeModal,toast,childSwitch:()=>childSwitch()});
const proofUI = createProofUI({getState:()=>state,getViewer:()=>({role:ui.role,studentId:ui.familyStudent}),change,modal,closeModal,toast,openReceipt:receiptDialog});
const bankCheckUI = createBankCheckUI({getState:()=>state,getViewer:()=>({role:ui.role}),change,render:()=>render(),modal,closeModal,toast,openMatch:matchDialog});
function render() {
  document.documentElement.lang = isFamilyRole(ui.role) ? 'zh-HK' : 'en';
  syncEntryPoint(ui.role);
  const nav = NAV[ui.role]; const user = identity();
  const pageKey=ui.role+'|'+ui.page+'|'+(ui.assignmentId||'');
  const oldPaper=$('.paper-wrap');
  const paperScroll=pageKey===lastPageKey&&oldPaper?{top:oldPaper.scrollTop,left:oldPaper.scrollLeft}:null;
  document.body.className = 'role-' + ui.role + (ui.page === 'worksheet' ? ' worksheet-open' : '') + (ui.workNotes ? ' work-notes-open' : '') + (ui.page === 'messages' ? ' messages-open' : '');
  $('#app').innerHTML = '<div class="app-shell"><aside class="sidebar"><div class="wordmark"><img class="brand-logo" src="/brand/mathconcept-logo.png" width="2172" height="724" alt="MathConcept"></div><div class="centre-label">('+t(centre.branch)+')</div><div class="nav-section">' + t({admin:'Centre',teacher:'Teaching',parent:'Family',student:'My classroom'}[ui.role]) + '</div><nav class="nav-list" aria-label="'+t('Main navigation','主要導覽')+'">' + nav.map(([id, ic, label]) => action('navigate', icon(ic) + '<span>' + t(label) + '</span>', 'nav-item' + (ui.page === id ? ' active' : ''), 'data-page="' + id + '"' + (ui.page === id ? ' aria-current="page"' : ''))).join('') + '</nav><div class="sidebar-bottom"><div class="flex">' + avatar(user) + '<div><div class="small strong">' + esc(user.name) + '</div><div class="user-caption">' + esc(t(user.title || user.level)) + '</div></div></div></div></aside><header class="topbar"><div class="mobile-brand">' + action('toggle-menu', icon('menu'), 'icon-btn mobile-menu', 'aria-label="'+t('Open navigation','開啟導覽')+'"') + '<span class="brand-lockup"><span class="wordmark"><img class="brand-logo" src="/brand/mathconcept-logo.png" width="2172" height="724" alt="MathConcept"></span><span class="brand-branch">('+t(centre.branch)+')</span></span></div><div class="role-switch" role="group" aria-label="'+t('Demo role','示範角色')+'">' + ['admin','teacher','parent','student'].map(r => action('role', t(r[0].toUpperCase() + r.slice(1)), ui.role === r ? 'active' : '', 'data-role="' + r + '" aria-pressed="' + (ui.role === r) + '"')).join('') + '</div><div class="topbar-actions"><span class="date">'+t('Wednesday, 30 September 2026','2026 年 9 月 30 日（星期三）')+'</span>' + action(ui.role==='parent'?'demo-controls':'demo-info', 'Demo', 'demo-label', 'aria-label="'+t(ui.role==='parent'?'Demo controls':'About this demo')+'"') + action('reset-demo', icon('reset') + '<span class="reset-label">'+t('Reset')+'</span>', 'btn ghost small', 'aria-label="'+t('Reset demo')+'"') + '</div></header><main class="main ' + (['parent','student'].includes(ui.role) ? 'family-main' : '') + '" id="main-content">' + page() + '</main><nav class="mobile-bottom-nav" aria-label="'+t('Mobile navigation','手機導覽')+'">' + (ui.role === 'parent' ? parentBottomNav() : nav.slice(0,5).map(([id,ic,label]) => action('navigate', icon(ic) + '<span>' + t(label === 'Billing & reconciliation' ? 'Billing' : ({'My classroom':'Classroom','My work':'My work','My schedule':'Schedule'}[label]||label)) + '</span>', ui.page === id ? 'active' : '', 'data-page="' + id + '"')).join('')) + '</nav></div>';
  attachDrawing();
  if(ui.page==='messages')conversationUI.afterRender();
  if(paperScroll&&$('.paper-wrap')){$('.paper-wrap').scrollTop=paperScroll.top;$('.paper-wrap').scrollLeft=paperScroll.left;}
  if(pageKey!==lastPageKey){window.scrollTo(0,0);lastPageKey=pageKey;}
}
function page() {
  if (['admin','teacher'].includes(ui.role) && ui.page === 'schedule') return schedulePage();
  if (ui.role === 'admin' && ui.page === 'students') return studentsPage();
  if (ui.role === 'admin' && ui.page === 'billing') return billingPage();
  if (ui.role === 'admin' && ui.page === 'calendar') return centreCalendarPage();
  if (ui.page === 'messages') return messagesPage();
  if (ui.role === 'teacher' && ui.page === 'classroom') return classroomPage();
  if (ui.role === 'teacher' && ui.page === 'library') return libraryPage();
  if (ui.role === 'teacher' && ui.page === 'notes') return notesPage();
  if (ui.role === 'parent' && ui.page === 'overview') return parentOverview();
  if (ui.role === 'parent' && ui.page === 'lessons') return parentLessons();
  if (ui.role === 'parent' && ui.page === 'handbook') return parentHandbook();
  if (ui.role === 'parent' && ui.page === 'homework') return parentHomework();
  if (ui.role === 'parent' && ui.page === 'payments') return parentPayments();
  if (ui.role === 'student' && ['work','past'].includes(ui.page)) return studentWork();
  if (ui.page === 'worksheet') return worksheetPage();
  return heading('MathConcept') + empty('Your workspace');
}
function shiftedWeek() { return WEEK.map(date => { const d = new Date(date + 'T12:00:00'); d.setDate(d.getDate() + ui.weekOffset * 7); return d.toISOString().slice(0,10); }); }
const tutorName = id => tutors.find(t=>t.id===id)?.name || 'Unassigned';
const SCHEDULE_HOURS = Array.from({length:(CENTRE_CLOSE-CENTRE_OPEN)/60},(_,i)=>CENTRE_OPEN+i*60);
function lessonTimeOptions(duration=60,selected=CENTRE_OPEN){
 return Array.from({length:Math.floor((CENTRE_CLOSE-duration-CENTRE_OPEN)/30)+1},(_,i)=>CENTRE_OPEN+i*30).map(start=>'<option value="'+start+'"'+(start===selected?' selected':'')+'>'+time(start)+'</option>').join('');
}
function slotBookings(date,start,tutor){
 return state.bookings.filter(b=>b.date===date&&b.tutor===tutor&&b.start<start+60&&(activeBooking(b)?b.start+b.duration>start:b.start>=start)).sort((a,b)=>a.start-b.start);
}
function bookingChip(b,rowStart=b.start){
 const student=studentById(b.studentId),source=state.bookings.find(x=>x.id===b.sourceId),continued=b.start<rowStart;
 const detail=[student.name,tutorName(b.tutor),dateLabel(b.date),time(b.start)+'–'+time(b.start+b.duration),source?'Rescheduled from '+dateLabel(source.date):'',continued?'Continues from previous hour':'',b.attendance==='present'?'Attended':'',b.note].filter(Boolean).join(' · ');
 return '<button class="booking-chip '+b.status+(b.sourceId?' makeup':'')+(continued?' continuation':'')+'" draggable="'+(ui.role==='admin'&&activeBooking(b))+'" data-action="booking-detail" data-id="'+b.id+'" title="'+esc(detail)+'" aria-label="'+esc(detail)+'">'+(b.attendance==='present'?icon('check','attendance-tick'):'')+(continued?'<span class="continuation-mark" aria-hidden="true">↳</span>':'')+'<span class="chip-name">'+esc(student.name)+'</span>'+(source?'<span class="chip-from">'+dateLabel(source.date)+'</span>':b.duration!==60?'<span class="chip-duration">'+(b.duration===90?'1½h':'½h')+'</span>':'')+(b.start%60&&!continued?'<span class="chip-offset">:'+String(b.start%60).padStart(2,'0')+'</span>':'')+'</button>';
}
function calendarCell(date,start,tutor,rowHeight){
 const bookings=slotBookings(date,start,tutor);
 const moving=ui.role==='admin'&&ui.moveId;
 const targetStart=start+(state.bookings.find(b=>b.id===moving)?.start%60||0);
 const onLeave=state.staffLeave.some(l=>l.staffId===tutor&&l.date===date&&activeStaffLeave(l)&&(l.unit==='Full day'||l.unit==='AM'&&start<HALF_DAY_BOUNDARY||l.unit==='PM'&&start+60>HALF_DAY_BOUNDARY));
 return '<div class="calendar-cell'+(moving?' pick-target':'')+(onLeave?' tutor-away':'')+'" style="--row-height:'+rowHeight+'px" data-slot data-date="'+date+'" data-start="'+start+'" data-tutor="'+tutor+'"'+(moving?' tabindex="0" role="button" aria-label="Move lesson to '+esc(tutorName(tutor)+' · '+dateLabel(date)+' · '+time(targetStart))+'"':'')+'>'+bookings.map(b=>bookingChip(b,start)).join('')+(onLeave?'<span class="tutor-away-note">On leave</span>':'')+'</div>';
}
function timetable(dates,tutor){
 const days=dates.map(date=>action('schedule-date','<span class="day-name">'+dateLabel(date,{weekday:'short',day:undefined,month:undefined})+'</span><span class="day-number">'+Number(date.slice(8))+'</span>','timetable-dayhead'+(date===TODAY?' today':''),'data-date="'+date+'" aria-label="View '+dateLabel(date,{weekday:'long'})+'"')).join('');
 const rows=SCHEDULE_HOURS.map(start=>{
  const count=Math.max(0,...dates.map(date=>slotBookings(date,start,tutor).length));
  const hasLeave=dates.some(date=>state.staffLeave.some(l=>l.staffId===tutor&&l.date===date&&activeStaffLeave(l)&&(l.unit==='Full day'||l.unit==='AM'&&start<HALF_DAY_BOUNDARY||l.unit==='PM'&&start+60>HALF_DAY_BOUNDARY)));
  const rowHeight=Math.max(40,count*24+8+(hasLeave?18:0));
  return '<div class="timetable-time" style="--row-height:'+rowHeight+'px" data-hour="'+start+'">'+time(start)+'</div>'+dates.map(date=>calendarCell(date,start,tutor,rowHeight)).join('');
 }).join('');
 return '<div class="timetable '+(ui.scheduleView==='day'?'day':'week')+'" style="--day-count:'+dates.length+'" role="group" aria-label="'+tutorName(tutor)+' schedule"><div class="timetable-corner">Time</div>'+days+rows+'<div class="timetable-end">'+time(CENTRE_CLOSE)+'</div><div class="timetable-end-fill"></div></div>';
}
function teachingBookings(){return state.bookings.filter(b=>b.date===ui.classDate&&b.start<=ui.classStart&&b.start+b.duration>ui.classStart&&b.tutor===ui.classTutor&&activeBooking(b));}
function classSelector(){
 const keys=[...new Set(state.bookings.filter(b=>activeBooking(b)&&b.tutor==='chan'&&(b.date>=TODAY||b.date===ui.classDate&&b.start===ui.classStart)).map(b=>b.date+'|'+b.start+'|'+b.tutor))].sort((a,b)=>{const [ad,at]=a.split('|'),[bd,bt]=b.split('|');return ad.localeCompare(bd)||Number(at)-Number(bt);});
 return '<select class="btn" data-change="class-session" aria-label="Teaching session">'+keys.map(key=>{const [date,start]=key.split('|');return '<option value="'+key+'"'+(key===ui.classDate+'|'+ui.classStart+'|'+ui.classTutor?' selected':'')+'>'+dateLabel(date)+' · '+time(Number(start))+'</option>';}).join('')+'</select>';
}
function schedulePage(){
 const admin=ui.role==='admin',tutor=admin&&tutors.some(t=>t.id===ui.scheduleTutor)?ui.scheduleTutor:'chan';
 const dates=ui.scheduleView==='week'?shiftedWeek():[ui.date],moving=admin&&state.bookings.find(b=>b.id===ui.moveId);
 const teacherTabs=admin?'<div class="teacher-tabs" role="tablist" aria-label="Teacher schedules">'+tutors.map(t=>action('teacher-tab',t.name,'teacher-tab'+(tutor===t.id?' active':''),'id="teacher-tab-'+t.id+'" role="tab" aria-selected="'+(tutor===t.id)+'" aria-controls="teacher-schedule" tabindex="'+(tutor===t.id?'0':'-1')+'" data-tutor="'+t.id+'"')).join('')+'</div>':'';
 const dateTitle=ui.scheduleView==='week'?dateLabel(dates[0])+' – '+dateLabel(dates.at(-1),{year:'numeric'}):dateLabel(ui.date,{weekday:'long',year:'numeric'});
 const calendar='<section class="panel" id="teacher-schedule" '+(admin?'role="tabpanel" aria-labelledby="teacher-tab-'+tutor+'"':'aria-label="My schedule"')+'><div class="calendar-toolbar"><div class="calendar-controls">'+action('prev-week',icon('left'),'icon-btn border','aria-label="Previous '+ui.scheduleView+'"')+action('next-week',icon('right'),'icon-btn border','aria-label="Next '+ui.scheduleView+'"')+'<span class="calendar-title">'+dateTitle+'</span>'+action('today','Today','btn small')+'</div><div class="calendar-tools"><div class="segmented">'+action('calendar-view','Day',ui.scheduleView==='day'?'active':'','data-view="day"')+action('calendar-view','Week',ui.scheduleView==='week'?'active':'','data-view="week"')+'</div>'+(admin?action('find-schedule-student',icon('search')+' Find student','btn small')+action('new-booking',icon('plus')+' Add lesson','btn primary small'):'')+'</div></div><div class="calendar-scroll">'+timetable(dates,tutor)+'</div><div class="calendar-legend"><span><i class="legend-line"></i>Regular lesson</span><span><i class="legend-line red"></i>Rescheduled</span><span><i class="legend-line gray"></i>Original booking</span><span>'+icon('check','attendance-tick')+' Attended</span></div></section>';
 return heading(admin?'Schedule':'My schedule')+teacherTabs+(moving?'<div class="move-banner"><span>Choose a new time for <strong>'+studentById(moving.studentId).name+'</strong>.</span>'+action('cancel-move','Cancel','btn ghost small')+'</div>':'')+'<div class="schedule-layout'+(admin?'':' teacher-schedule-layout')+'"><div class="schedule-main">'+calendar+scheduleLeaveStrip(tutor)+'</div>'+(admin?'<aside class="schedule-rail stack">'+scheduleQueues()+'</aside>':'')+'</div>';
}
function bookingDetail(id) {
  const b = state.bookings.find(x=>x.id===id), s = studentById(b.studentId), source = state.bookings.find(x=>x.id===b.sourceId);
  if(ui.role==='teacher'){modal(s.name,'<dl class="detail-grid"><div><dt>Date</dt><dd>'+dateLabel(b.date,{weekday:'long'})+'</dd></div><div><dt>Time</dt><dd>'+time(b.start)+'–'+time(b.start+b.duration)+'</dd></div><div><dt>Teacher</dt><dd>'+esc(tutorName(b.tutor))+'</dd></div><div><dt>Attendance</dt><dd>'+(b.attendance==='present'?'Attended':b.status==='moved'?'Rescheduled':b.status==='absent'?'Absent':'Not marked')+'</dd></div></dl>'+(b.note?'<p class="small">'+esc(b.note)+'</p>':''),action('close-modal','Close','btn')+(activeBooking(b)?action('open-calendar-class','Open classroom','btn primary','data-id="'+id+'"'):''));return;}
  modal(s.name, '<div class="flex">' + avatar(s,'large') + '<div><h3>' + s.level + ' · Mathematics</h3><p class="small muted">' + s.focus + '</p></div></div><dl class="detail-grid"><div><dt>Date</dt><dd>' + dateLabel(b.date,{weekday:'long'}) + '</dd></div><div><dt>Time</dt><dd>' + time(b.start) + '–' + time(b.start+b.duration) + '</dd></div><div><dt>Teacher</dt><dd>' + tutors.find(t=>t.id===b.tutor).name + '</dd></div><div><dt>Booking</dt><dd>' + (source ? 'Rescheduled from ' + dateLabel(source.date) : b.status === 'moved' ? 'Rescheduled' : b.status === 'absent' ? 'Absent · make-up pending' : 'Regular lesson') + '</dd></div></dl>' + field('Remark','<input id="booking-note" aria-label="Booking remark" value="' + esc(b.note) + '" placeholder="Add a note for the teacher">') + (b.caseId ? '<p class="small muted mt-16">Linked to one reschedule case, including any split replacements.</p>' : ''), action('save-booking-note','Save remark','btn','data-id="'+id+'"') + (activeBooking(b) ? action('begin-move',icon('move')+' Move lesson','btn primary','data-id="'+id+'"') : ''));
}
function moveTo(id, slot) {
  if(ui.role!=='admin')return;
  const booking=state.bookings.find(b=>b.id===id),makeup=state.makeups.find(m=>m.id===booking?.caseId);
  // Calendar rows represent hours; moving a :30 start keeps its minute offset.
  if(booking)slot={...slot,start:Math.floor(slot.start/60)*60+booking.start%60};
  if(booking && slot.date>(makeup?.expiry || cycleForDate(booking.date).expiry) && !slot.approvedExpiry){
    ui.pendingMove={id,slot};
    modal('Approve a deadline extension','<p class="small muted mb-16">This move falls after the current make-up deadline. Record the exception before moving the lesson.</p><div class="form-stack">'+field('New deadline','<input type="date" id="extension-date" value="'+slot.date+'" min="'+slot.date+'" aria-label="New deadline">')+field('Reason','<input id="extension-reason" aria-label="Extension reason" placeholder="Reason for carrying this lesson forward">')+'</div>',action('close-modal','Cancel','btn')+action('confirm-move-extension','Approve & move','btn primary'));return;
  }
  if (change(()=>moveBooking(state,id,slot),'Lesson moved. Both bookings stay linked.',true)) { ui.moveId=null; render(); }
}
function markupStub(title) { return heading(title) + '<div class="panel">' + empty('Preparing this view') + '</div>'; }
const STUDENT_LEVELS=[...new Set(students.map(s=>s.level))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
const collection = key => (ui.collections ??= {})[key] ??= { query:'', page:1, pageSize:25, level:'all', tutor:'all', day:'all', status:'all', sort:'number' };
function collectionPage(key, items, size){
 const c=collection(key),p=paginate(items,c.page,size||c.pageSize);c.page=p.page;return p;
}
function pager(key,p,compact=false){
 if(compact&&p.total<=p.pageSize)return '';
 return '<div class="pagination '+(compact?'compact':'')+'"><span class="small muted" aria-live="polite">'+(p.total?p.start+'–'+p.end:'0')+' of '+p.total+'</span><div class="flex">'+(!compact?'<label class="small muted">Rows <select class="btn small" data-change="page-size" data-list="'+key+'" aria-label="Rows per page">'+[25,50,100].map(n=>'<option value="'+n+'"'+(p.pageSize===n?' selected':'')+'>'+n+'</option>').join('')+'</select></label>':'')+action('list-page',icon('left'),'icon-btn border','data-list="'+key+'" data-page-number="'+(p.page-1)+'" aria-label="Previous '+key+' page" '+(p.page===1?'disabled':''))+'<span class="small nowrap">'+p.page+' / '+p.pageCount+'</span>'+action('list-page',icon('right'),'icon-btn border','data-list="'+key+'" data-page-number="'+(p.page+1)+'" aria-label="Next '+key+' page" '+(p.page===p.pageCount?'disabled':''))+'</div></div>';
}
function searchControl(key,label,placeholder=label){
 return '<div class="search grow">'+icon('search')+'<input type="search" data-list-query="'+key+'" aria-label="'+label+'" placeholder="'+placeholder+'" value="'+esc(collection(key).query)+'">'+action('list-search',icon('arrow','sm'),'icon-btn','data-list="'+key+'" aria-label="Apply '+label.toLowerCase()+'"')+'</div>';
}
function filterControl(key,filter,label,options){
 return '<select class="btn" data-change="list-filter" data-list="'+key+'" data-filter="'+filter+'" aria-label="'+label+'">'+options.map(([value,text])=>'<option value="'+value+'"'+(collection(key)[filter]===value?' selected':'')+'>'+text+'</option>').join('')+'</select>';
}
const matchesStudent=(id,query)=>{const s=studentById(id);return !query||[s.name,s.number,s.parent,s.phone,s.level].join(' ').toLowerCase().includes(query.toLowerCase())||s.phone?.replaceAll(' ','').includes(query.replaceAll(' ',''));};
const PROFILE_EDIT_FIELDS=['chineseName','dateOfBirth','school','parentRelation','parentSurname','parentGivenName','parentLanguage','parentEmail','parentMobile','parentPhone','region','area','address','paymentReminder','remark','fpsRemark','referralCode','referralNotes'];
const profileDate=value=>value?dateLabel(value,{year:'numeric'}):'—';
const profileFact=(label,value,wide=false)=>'<div'+(wide?' class="wide"':'')+'><dt>'+esc(label)+'</dt><dd>'+esc(value||'—')+'</dd></div>';
const profileNote=(label,value)=>'<dl class="student-note"><dt>'+esc(label)+'</dt><dd>'+esc(value||'—')+'</dd></dl>';
function studentDirectory(){
 const c=collection('students'),query=c.query.toLowerCase().trim();
 const list=filterStudents(state,{...c,query:''}).filter(s=>{
  if(!query)return true;
  const p=getStudentProfile(state,s.id),words=[s.name,s.number,s.parent,s.phone,s.level,p.chineseName,p.school,p.parentSurname,p.parentGivenName,p.parentEmail,p.parentMobile,p.parentPhone,p.fpsRemark].join(' ').toLowerCase();
  const compact=query.replace(/[\s()+.-]/g,'');
  return query.split(/\s+/).every(part=>words.includes(part))||(compact&&[s.number,p.parentMobile,p.parentPhone].some(value=>value.toLowerCase().replace(/[\s()+.-]/g,'').includes(compact)));
 });
 const p=collectionPage('students',list),total=enrolledStudents(state).length;
 ui.directoryStudent??='chloe';
 const filters=filterControl('students','level','Year level',[['all','All levels'],...STUDENT_LEVELS.map(x=>[x,x])])+filterControl('students','tutor','Teacher',[['all','All teachers'],...tutors.map(t=>[t.id,t.name])])+filterControl('students','day','Lesson day',[['all','All days'],...['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d=>[d,d])])+filterControl('students','status','Student status',[['all','All statuses'],['active','Active'],['paused','Paused']])+filterControl('students','sort','Sort students',[['number','Student ID'],['name','Name A–Z'],['name-desc','Name Z–A'],['level','Level']])+action('clear-list','Clear filters','btn ghost small','data-list="students"');
 const filterCount=['level','tutor','day','status'].filter(key=>c[key]!=='all').length;
 return '<div id="student-workspace" class="student-workspace"><aside class="student-selector panel" aria-label="Student directory"><div class="student-selector-tools">'+searchControl('students','Search students','Name, ID, parent or phone')+'<details class="student-filter-disclosure"'+(ui.studentFiltersOpen?' open':'')+'><summary>Filters & sort'+(filterCount?' · '+filterCount+' active':'')+'</summary><div>'+filters+'</div></details></div><div class="student-selector-summary" aria-live="polite">'+(query||filterCount?list.length+' matching · ':'')+total+' enrolled students</div><div class="student-selector-list">'+p.items.map(s=>action('select-directory-student',avatar(s,'small')+'<span class="grow"><strong>'+esc(s.name)+'</strong><span class="row-meta picker-meta">'+esc(s.number)+' · '+esc(s.level)+(s.status==='paused'?' · Paused':'')+'</span></span>','student-list-item'+(ui.directoryStudent===s.id?' active':''),'data-id="'+s.id+'" aria-pressed="'+(ui.directoryStudent===s.id)+'" aria-label="Open '+esc(s.name)+' '+s.number+'"')).join('')+(list.length?'':empty('No students found','Try another search or clear the filters.'))+'</div><div class="student-selector-footer">'+pager('students',p,true)+'<label>Students per page <select class="btn small" data-change="page-size" data-list="students" aria-label="Students per page">'+[25,50,100].map(n=>'<option value="'+n+'"'+(p.pageSize===n?' selected':'')+'>'+n+'</option>').join('')+'</select></label></div></aside>'+studentProfilePanel(ui.directoryStudent)+'</div>';
}
function studentProfilePanel(id){
 const s=studentById(id),p=getStudentProfile(state,id),draft=ui.profileDrafts?.[id];
 const studentFacts=profileFact('Branch',p.branch+' · TWN',true)+profileFact('Student ID',p.studentNumber)+profileFact('Chinese name',p.chineseName)+profileFact('Given name',p.givenName)+profileFact('Surname',p.surname)+profileFact('Date of birth',profileDate(p.dateOfBirth))+profileFact('Grade',p.grade)+profileFact('School',p.school,true)+profileFact('Enrolled since',profileDate(p.enrolledSince));
 const parentFacts=profileFact('Relationship',p.parentRelation)+profileFact('Language',p.parentLanguage)+profileFact('Given name',p.parentGivenName)+profileFact('Surname',p.parentSurname)+profileFact('Mobile',p.parentMobile)+profileFact('Phone',p.parentPhone)+profileFact('Email',p.parentEmail,true)+profileFact('Region',p.region)+profileFact('Area',p.area)+profileFact('Address',p.address,true);
 const notes='<div class="student-notes-grid">'+profileNote('Student / parent remarks',p.remark)+profileNote('FPS remark',p.fpsRemark)+'</div>';
 const regular='<div class="student-regular-row"><dl class="student-facts">'+profileFact('Regular lesson',p.lessonDays.join(', ')+(p.lessonTime?' · '+p.lessonTime:''))+profileFact('Teacher',p.instructor)+profileFact('Course / duration',p.course+(p.lessonDuration?' · '+p.lessonDuration+' min':''))+profileFact('Payment reminders',p.paymentReminder?'Enabled':'Off')+'</dl></div>';
 const active=ui.profileHistoryTab||'Student information',showInformation=active==='Student information',editing=showInformation&&draft;
 const workbenchTabs='<div class="student-history-tabs tabs" aria-label="Student workbench">'+['Student information','Student schedule','Payment history','E-coupon & referral'].map(item=>action('profile-history-tab',item,active===item?'active':'','data-value="'+esc(item)+'" aria-pressed="'+(active===item)+'"')).join('')+'</div>';
 const information='<div class="student-info-grid"><section class="student-info-section"><h3>Student details</h3><dl class="student-facts">'+studentFacts+'</dl></section><section class="student-info-section"><h3>Parent information</h3><dl class="student-facts">'+parentFacts+'</dl></section></div>'+notes+regular;
 const content=showInformation?(editing?studentProfileForm(id,draft):information):'<div class="student-history-body" id="student-history-body">'+studentProfileHistory(id,p)+'</div>';
 return '<section class="student-detail panel" aria-label="Student profile"><header class="student-profile-head"><div class="flex">'+avatar(s,'large')+'<div><h2>'+esc(p.englishName)+'</h2><div class="row-meta">'+esc(p.studentNumber)+' · '+esc(p.grade)+' · '+(p.status==='paused'?'Paused':p.status==='assessment'?'Assessment':'Active')+(editing?' · Editing':'')+'</div></div></div><div class="student-profile-actions">'+(editing?action('cancel-profile-edit','Cancel','btn small','data-id="'+id+'"')+action('save-profile-edit','Save changes','btn primary small','data-id="'+id+'"'):action('edit-profile',draft?'Resume editing':'Edit details','btn small','data-id="'+id+'"')+action('view-student-folder',icon('folder','sm')+' Learning folder','btn small','data-id="'+id+'"'))+'</div></header>'+workbenchTabs+'<div class="student-profile-scroll" role="region" aria-label="'+esc(active)+'">'+content+'</div></section>';
}
function studentProfileHistory(id,p){
 const tab=ui.profileHistoryTab||'Student schedule',key='profile-'+id+'-'+tab;
 if(tab==='Student schedule'){
  const bookings=state.bookings.filter(b=>b.studentId===id).sort((a,b)=>b.date.localeCompare(a.date)||a.start-b.start),page=collectionPage(key,bookings,10);
  const attended=bookings.find(b=>b.date<=TODAY&&b.attendance==='present'),year=TODAY.slice(0,4),regularCount=y=>bookings.filter(b=>b.date.startsWith(y)&&activeBooking(b)&&!b.sourceId).length;
  const summary='<dl class="student-facts student-history-summary">'+profileFact('Last attended lesson',attended?profileDate(attended.date):'—')+profileFact('Recorded regular lessons',year+': '+regularCount(year)+' · '+(Number(year)-1)+': '+regularCount(String(Number(year)-1)))+profileFact('Reschedules used',usedReschedules(state,id)+' / 3 this block')+profileFact('Pending make-up',state.makeups.filter(m=>m.studentId===id).reduce((n,m)=>n+m.minutes-m.used,0)+' min')+'</dl>';
  return summary+(bookings.length?'<div class="table-scroll"><table><thead><tr><th>Date / time</th><th>Duration</th><th>Teacher</th><th>Remark</th><th>Attendance</th><th></th></tr></thead><tbody>'+page.items.map(b=>{
   const source=b.sourceId&&state.bookings.find(x=>x.id===b.sourceId),status=b.status==='moved'?'Moved':b.status==='absent'||b.attendance==='absent'?'Absent':b.status==='cancelled'?'Cancelled':b.attendance==='present'?'Attended':'Unmarked';
   const remark=[b.note,source?'Rescheduled from '+dateLabel(source.date):''].filter(Boolean).join(' · ');
   return '<tr><td><span'+(['moved','cancelled'].includes(b.status)?' class="muted" style="text-decoration:line-through"':'')+'>'+profileDate(b.date)+'</span><div class="row-meta">'+time(b.start)+'</div></td><td>'+b.duration+' min</td><td>'+esc(tutorName(b.tutor))+'</td><td>'+esc(remark||'—')+'</td><td>'+tag(status,status==='Attended'?'green':'')+'</td><td>'+action('booking-detail','Open','btn small','data-id="'+b.id+'" aria-label="Open lesson '+profileDate(b.date)+' '+time(b.start)+'"')+'</td></tr>';
  }).join('')+'</tbody></table></div>'+pager(key,page,true):empty('No lessons recorded'));
 }
 if(tab==='Payment history'){
  const invoices=state.invoices.filter(i=>i.studentId===id).sort((a,b)=>b.issued.localeCompare(a.issued)),page=collectionPage(key,invoices,10);
  return invoices.length?'<div class="table-scroll"><table><thead><tr><th>Invoice / period</th><th>Amount</th><th>Due</th><th>Receipt / bank match</th><th></th></tr></thead><tbody>'+page.items.map(i=>{
   const receipt=state.receipts.find(r=>r.id===i.receiptId),match=receipt&&reconciliation(state,receipt);
   return '<tr><td>'+esc(i.id)+'<div class="row-meta">'+esc(i.period)+'</div></td><td>'+money(i.amount)+'</td><td>'+profileDate(i.due)+'</td><td>'+tag(receipt?'Receipt issued':i.proof?'Proof received':'Awaiting proof',receipt?'green':i.proof?'blue':'')+(receipt?'<div class="row-meta">'+esc(receipt.id)+' · '+esc(match.status)+'</div>':'')+'</td><td><div class="flex wrap">'+action('view-invoice','Invoice','btn small','data-id="'+i.id+'"')+(receipt?action('view-receipt','Receipt','btn small','data-id="'+receipt.id+'"'):'')+'</div></td></tr>';
  }).join('')+'</tbody></table></div>'+pager(key,page,true):empty('No payment history');
 }
 if(tab==='E-coupon & referral')return '<dl class="student-facts student-history-summary">'+profileFact('Referral code',p.referralCode)+profileFact('Referral notes',p.referralNotes,true)+'</dl>'+empty('No e-coupons recorded');
 return '';
}
function studentProfileForm(id,draft){
 const text=(key,label,type='text',wide=false)=>'<div class="field'+(wide?' wide':'')+'"><label for="profile-'+key+'">'+label+'</label>'+(type==='textarea'?'<textarea id="profile-'+key+'" data-profile-field="'+key+'">'+esc(draft[key])+'</textarea>':'<input id="profile-'+key+'" data-profile-field="'+key+'" type="'+type+'" value="'+esc(draft[key])+'"'+(type==='date'?' max="'+TODAY+'"':'')+'>')+'</div>';
 const boolean=(key,label)=>'<label class="check-option"><input type="checkbox" data-profile-field="'+key+'" '+(draft[key]?'checked':'')+'>'+label+'</label>';
 return '<form id="student-profile-form" class="student-edit-form" data-student-id="'+id+'"><div class="form-error wide" id="profile-form-error" role="alert"></div><h3>Student information</h3>'+text('chineseName','Chinese name')+text('dateOfBirth','Date of birth','date')+text('school','School','text',true)+'<h3>Parent information</h3>'+text('parentRelation','Relationship')+text('parentLanguage','Preferred language')+text('parentGivenName','Parent given name')+text('parentSurname','Parent surname')+text('parentMobile','Mobile','tel')+text('parentPhone','Phone','tel')+text('parentEmail','Email','email',true)+text('region','Region')+text('area','Area')+text('address','Address','textarea',true)+text('remark','Student / parent remarks','textarea',true)+text('fpsRemark','FPS remark','textarea',true)+boolean('paymentReminder','Payment reminders')+'<h3>Referral</h3>'+text('referralCode','Referral code')+text('referralNotes','Referral notes','textarea',true)+'</form>';
}
function renderStudentWorkspace(resetDetails=false){
 const old=$('#student-workspace');if(!old){render();return;}
 const left=$('.student-selector-list').scrollTop,right=$('.student-profile-scroll').scrollTop,tabsLeft=$('.student-history-tabs').scrollLeft,oldTab=$('.student-history-tabs .active')?.dataset.value,filters=$('.student-filter-disclosure');
 ui.studentFiltersOpen=filters.open;
 old.outerHTML=studentDirectory();
 $('.student-selector-list').scrollTop=left;
 $('.student-profile-scroll').scrollTop=resetDetails?0:right;
 $('.student-history-tabs').scrollLeft=tabsLeft;
 if(oldTab!==$('.student-history-tabs .active')?.dataset.value)$('.student-history-tabs .active')?.scrollIntoView({block:'nearest',inline:'nearest'});
}
function updateProfileDraft(target){
 const form=target.closest('#student-profile-form'),key=target.dataset.profileField;
 if(form&&key&&ui.profileDrafts?.[form.dataset.studentId])ui.profileDrafts[form.dataset.studentId][key]=target.type==='checkbox'?target.checked:target.value;
}
function pickerResults(){
 const p=ui.picker;
 let list=filterStudents(state,{query:p.query,level:p.level,sort:'number'});
 if(p.scope==='selected')list=list.filter(s=>p.selected.has(s.id));
 if(p.scope==='class'){const ids=new Set(teachingBookings().map(b=>b.studentId));list=list.filter(s=>ids.has(s.id));}
 const page=paginate(list,p.page,10);p.page=page.page;
 return '<div class="picker-summary between"><span class="small muted">'+(p.multiple?p.selected.size+' selected'+(p.selected.size?' · '+[...p.selected].slice(0,2).map(id=>esc(studentById(id).name)).join(', ')+(p.selected.size>2?' +'+(p.selected.size-2)+' more':''):''):p.selected.size?'Selected: '+studentById([...p.selected][0]).name:'Select one student')+'</span>'+(p.multiple?'<span class="flex">'+action('picker-selected','Review','inline-link')+action('picker-clear','Clear','inline-link')+'</span>':'')+'</div><div class="picker-options">'+page.items.map(s=>p.multiple?'<label class="check-option"><input type="checkbox" data-picker-student="'+s.id+'" '+(p.selected.has(s.id)?'checked':'')+'>'+avatar(s,'small')+'<span class="grow"><strong class="small">'+s.name+'</strong><span class="row-meta picker-meta">'+s.number+' · '+s.level+' · '+s.parent+'</span></span></label>':action('pick-student',avatar(s,'small')+'<span class="grow"><strong class="small">'+s.name+'</strong><span class="row-meta picker-meta">'+s.number+' · '+s.level+' · '+s.parent+'</span></span>'+(p.selected.has(s.id)?icon('check'):''),'picker-option','data-id="'+s.id+'"')).join('')+(list.length?'':empty('No students found','Try another name or student ID.'))+'</div><div class="pagination compact"><span class="small muted">'+(page.total?page.start+'–'+page.end:'0')+' of '+page.total+'</span><div class="flex">'+action('picker-page',icon('left'),'icon-btn border','data-page-number="'+(page.page-1)+'" aria-label="Previous student results" '+(page.page===1?'disabled':''))+'<span class="small">'+page.page+' / '+page.pageCount+'</span>'+action('picker-page',icon('right'),'icon-btn border','data-page-number="'+(page.page+1)+'" aria-label="Next student results" '+(page.page===page.pageCount?'disabled':''))+'</div></div>';
}
function pickerMarkup(){
 const p=ui.picker;
 return '<div class="student-picker"><div class="filters">'+(p.multiple?'<select class="btn" data-change="picker-scope" aria-label="Student group"><option value="class"'+(p.scope==='class'?' selected':'')+'>Current class</option><option value="all"'+(p.scope==='all'?' selected':'')+'>Whole centre</option><option value="selected">Selected students</option></select>':'')+'<div class="search grow">'+icon('search')+'<input type="search" id="picker-query" aria-label="Find a student" placeholder="Name, ID or parent" value="'+esc(p.query)+'"></div><select class="btn" data-change="picker-level" aria-label="Student picker level"><option value="all">All levels</option>'+STUDENT_LEVELS.map(l=>'<option'+(p.level===l?' selected':'')+'>'+l+'</option>').join('')+'</select></div><div id="picker-results">'+pickerResults()+'</div></div>';
}
function startPicker(purpose,multiple=false){ui.picker={purpose,multiple,query:'',page:1,level:'all',scope:multiple&&!ui.standaloneFolder&&teachingBookings().some(b=>b.studentId===ui.selectedStudent)?'class':'all',selected:new Set(multiple?[ui.selectedStudent]:[])};}
function updatePicker(){if($('#picker-results'))$('#picker-results').innerHTML=pickerResults();}
function chooseStudentDialog(purpose){startPicker(purpose);modal(purpose==='record'?'Choose a student':'Find a student',pickerMarkup(),action('close-modal','Cancel','btn'),true);}
function assignmentDialog(id){
 startPicker('assign',true);ui.picker.worksheetId=id;
 const w=worksheetById(id);
 modal('Assign '+w.title,'<p class="small muted mb-16">'+w.code+' · '+w.level+'</p>'+pickerMarkup()+'<label class="check-option mt-16"><input type="checkbox" id="assign-homework">Assign as homework</label>',action('close-modal','Cancel','btn')+action('confirm-assignment','Add to folders','btn primary','data-id="'+id+'"'),true);
}
function bankResults(){
 const r=state.receipts.find(r=>r.id===ui.matchReceiptId),c=collection('bank'),candidates=ui.matchCandidates||[];
 const available=state.bankTransactions.filter(b=>!state.receipts.some(other=>other.id!==r.id&&other.bankId===b.id)).filter(b=>!c.query||[b.id,b.transactionId,b.reference,b.payer,b.date,b.amount].join(' ').toLowerCase().includes(c.query.toLowerCase())).sort((a,b)=>Number(candidates.includes(b.id))-Number(candidates.includes(a.id))||Number(b.amount===r.amount)-Number(a.amount===r.amount));
 const p=collectionPage('bank',available,10);
 return p.items.map(b=>'<button class="bank-choice '+(b.id===ui.selectedBank?'selected':'')+'" aria-pressed="'+(b.id===ui.selectedBank)+'" data-action="choose-bank" data-id="'+b.id+'"><div class="between"><strong class="small">'+money(b.amount)+'</strong><span class="small">'+dateLabel(b.date)+'</span></div><p class="row-meta">'+esc(b.reference)+'</p><p class="row-meta">'+esc(b.transactionId||b.id)+'</p>'+(b.payer?'<p class="row-meta">'+esc(b.payer)+'</p>':'')+'</button>').join('')+(p.total?'':empty('No bank entries found'))+pager('bank',p,true);
}
function renderCollection(key){if(key==='bank'){$('#bank-results').innerHTML=bankResults();return;}if((key==='students'||key.startsWith('profile-'))&&$('#student-workspace')){renderStudentWorkspace();return;}render();}
function applyListSearch(key,input){const c=collection(key);c.query=input.value;c.page=1;const focus=input.getAttribute('data-list-query'),cursor=input.selectionStart;renderCollection(key);const next=$('[data-list-query="'+focus+'"]');if(next){next.focus();if(next.type==='search')next.setSelectionRange(cursor,cursor);}}
function checkInDialog(){
 const s=studentById(ui.familyStudent);let pass;
 try{pass=makeCheckInPass(state,s.id,{bookingId:ui.checkInBooking||undefined});ui.checkInBooking=pass.booking.id;persist();}catch(err){modal('Attendance QR','<div class="empty">'+icon('calendar')+'<h3>'+t('No lesson to check in','沒有可登記的課堂')+'</h3><p>'+esc(t(err.message))+'</p></div>',action('close-modal','Close','btn'));return;}
 ui.checkInPayload=pass.payload;
 const eligible=state.bookings.filter(b=>b.studentId===s.id&&b.date===TODAY&&['scheduled','makeup'].includes(b.status)).sort((a,b)=>a.start-b.start);
 const lessonChoice=eligible.length>1?'<div class="field mt-16"><label for="checkin-lesson">'+t('Lesson','課堂')+'</label><select id="checkin-lesson" data-change="checkin-lesson">'+eligible.map(b=>'<option value="'+b.id+'"'+(b.id===pass.booking.id?' selected':'')+'>'+time(b.start)+'–'+time(b.start+b.duration)+(b.sourceId?' · '+t('Make-up'):'')+(b.attendance==='present'?' · '+t('Checked in'):'')+'</option>').join('')+'</select></div>':'';
 const qr=qrSvg(pass.payload).replace('Lesson check-in QR code',t('Lesson check-in QR code','課堂出席二維碼')).replace('An opaque demo pass for today’s lesson.',t('An opaque demo pass for today’s lesson.','用於今天課堂的示範出席碼。'));
 modal('Attendance QR','<div class="checkin-pass"><div class="flex">'+avatar(s,'large')+'<div><h3>'+s.name+'</h3><p class="small muted">'+s.number+' · '+t(s.level)+'</p></div></div>'+lessonChoice+'<div class="checkin-qr">'+qr+'</div><h3>'+dateLabel(pass.booking.date,{weekday:'long'})+' · '+time(pass.booking.start)+'</h3><p class="small muted mt-8">'+t('Show this code at the centre to check in.','到達中心後，請出示此碼登記出席。')+'</p>'+(pass.checkedIn?'<div class="checkin-success mt-16">'+icon('circlecheck')+' '+t('Checked in')+'</div>':'')+'<p class="small muted mt-16">'+t('Valid for this lesson on '+dateLabel(pass.booking.date)+'.','只適用於 '+dateLabel(pass.booking.date)+' 的這節課堂。')+'</p></div>',action('close-modal','Close','btn')+action('simulate-checkin',pass.checkedIn?'Scan again (demo)':'Simulate centre scan','btn primary'));
}

function studentsPage(){
 return heading('Students')+'<div class="students-view-toolbar">'+tabs(['Students','Assessments'],ui.studentsTab,'students-tab')+action('assessment-details',icon('plus')+' Assessment & enrolment','btn primary')+'</div>'+(ui.studentsTab==='Students'?studentDirectory():'<section class="panel"><div class="list-row">'+avatar(studentById('mia'),'large')+'<div class="grow"><h3>Mia Cheung</h3><p class="small muted">P2 · Assessment on '+dateLabel(state.assessment.assessmentDate)+'</p></div>'+tag(state.assessment.enrolled?'Enrolled':'Report ready',state.assessment.enrolled?'green':'blue')+action('assessment-details','View assessment','btn')+'</div><div class="panel-body"><div class="notice">The HK$200 assessment deduction is available when enrolment is completed within seven days of the assessment.</div></div></section>');
}
function invoiceStatus(invoice){
 if(invoice.receiptId)return 'issued';
 if(invoice.proofReview&&invoice.proofReview.status!=='passed')return 'review';
 return invoice.proof?'proof':invoice.due<TODAY?'overdue':'awaiting';
}
function billingPage(){
 const key='invoices',c=collection(key);
 const shell=heading('Billing & reconciliation')+tabs(['Invoices','Reconciliation','HQ report'],ui.billingTab,'billing-tab');
 if(ui.billingTab==='Reconciliation')return shell+bankCheckUI.render();
 if(ui.billingTab==='HQ report')return shell+directorReview();
 const labels={issued:'Receipt issued',review:'Proof needs review',proof:'Needs screening',awaiting:'Awaiting payment',overdue:'Overdue'};
 const list=state.invoices.filter(item=>!c.query||matchesStudent(item.studentId,c.query)||[item.id,item.proofReference].join(' ').toLowerCase().includes(c.query.toLowerCase())).filter(item=>c.status==='all'||invoiceStatus(item)===c.status).sort((a,b)=>b.issued.localeCompare(a.issued)||studentById(a.studentId).number.localeCompare(studentById(b.studentId).number));
 const p=collectionPage(key,list);
 const filters='<div class="billing-toolbar">'+searchControl(key,'Search invoices','Student or invoice')+filterControl(key,'status','Invoice status',[['all','All invoices'],['review','Proof needs review'],...(state.invoices.some(i=>invoiceStatus(i)==='proof')?[['proof','Needs screening']]:[]),['awaiting','Awaiting payment'],['overdue','Overdue'],['issued','Receipt issued']])+((c.query||c.status!=='all')?action('clear-list','Clear','btn ghost small','data-list="'+key+'"'):'')+'</div>';
 const rows=p.items.map(i=>{const student=studentById(i.studentId),status=invoiceStatus(i);return '<tr><td><strong class="small">'+student.name+'</strong><div class="row-meta">'+student.number+'</div></td><td>'+esc(i.period)+'</td><td class="nowrap billing-amount">'+money(i.amount)+'</td><td class="nowrap">'+dateLabel(i.due)+'</td><td><span class="billing-status '+(status==='issued'?'matched':['review','overdue'].includes(status)?'review':'')+'">'+labels[status]+'</span></td><td>'+action('view-invoice','Open','btn small','data-id="'+i.id+'" aria-label="Open invoice '+i.id+' for '+esc(student.name)+'"')+'</td></tr>';}).join('');
 return shell+'<div class="billing-workspace">'+filters+'<section class="panel billing-table"><div class="table-scroll"><table><thead><tr><th>Student</th><th>Period</th><th class="billing-amount">Amount</th><th>Due</th><th>Status</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>'+(p.total?'':empty('No matching invoices'))+(p.pageCount>1?pager(key,p):'')+'</section></div>';
}
function directorReview(){
 const months=[...new Set([TODAY.slice(0,7),...state.bankTransactions.map(bank=>bank.date.slice(0,7))])].sort().reverse();
 if(!months.includes(ui.reportMonth))ui.reportMonth=months[0];
 const totals=reportingTotals(state,ui.reportMonth),matched=collectionPage('matched',totals.matched,25);
 const exceptions=totals.unresolved.length+totals.unmatchedBank.length;
 const rows=matched.items.map(e=>'<tr><td><strong class="small">'+studentById(e.receipt.studentId).name+'</strong><div class="row-meta">'+e.receipt.id+'</div></td><td>'+dateLabel(e.receipt.issuedDate)+'</td><td>'+dateLabel(e.bank.date)+'</td><td class="nowrap billing-amount">'+money(e.bank.amount)+'</td><td>'+action('match-receipt','Details','btn small','data-id="'+e.receipt.id+'"')+'</td></tr>').join('');
 const monthLabel=month=>dateLabel(month+'-01',{day:undefined,month:'long',year:'numeric'});
 return '<div class="billing-workspace"><div class="billing-toolbar"><select class="btn" data-change="report-month" aria-label="Reporting month">'+months.map(month=>'<option value="'+month+'"'+(ui.reportMonth===month?' selected':'')+'>'+monthLabel(month)+'</option>').join('')+'</select><div class="billing-total"><span>Matched deposits</span><strong>'+money(totals.total)+'</strong></div>'+action('export-report',icon('download')+' Export report','btn')+'</div><section class="panel billing-table"><div class="table-scroll"><table><thead><tr><th>Student / receipt</th><th>Receipt issued</th><th>Bank credited</th><th class="billing-amount">Amount</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>'+(matched.total?'':empty('No matched deposits this month'))+(matched.pageCount>1?pager('matched',matched):'')+'</section><div class="billing-secondary-actions">'+(exceptions?action('report-exceptions','Review exceptions ('+exceptions+')','btn ghost small'):'')+action('mark-report-reviewed',state.reviewedMonths?.[ui.reportMonth]?'Review recorded':'Mark report reviewed','btn ghost small',state.reviewedMonths?.[ui.reportMonth]?'disabled':'')+'</div></div>';
}
function scheduleQueues(){
 const pending=state.makeups.filter(m=>m.minutes>m.used).sort((a,b)=>a.expiry.localeCompare(b.expiry)),requests=state.leaveRequests.filter(r=>r.status==='pending');
 const filtered=pending.filter(m=>matchesStudent(m.studentId,collection('makeups').query)),makeupsPage=collectionPage('makeups',filtered,5),requestsPage=collectionPage('requests',requests,5);
 return '<section class="panel rail-card"><div class="rail-title"><h3>Pending make-ups</h3>'+tag(pending.length)+'</div>'+(pending.length>5?searchControl('makeups','Search make-ups','Student or ID'):'')+(pending.length?makeupsPage.items.map(m=>{const s=studentById(m.studentId),source=state.bookings.find(b=>b.id===m.sourceId);return '<div class="makeup-card"><div class="flex">'+avatar(s,'small')+'<div><div class="small strong">'+s.name+'</div><div class="user-caption">'+s.number+' · '+(m.minutes-m.used)+' min remaining</div></div></div><div class="makeup-meta">Missed '+dateLabel(source.date)+'<br>Use by '+dateLabel(m.expiry)+'</div>'+action('makeup-book','Find a time '+icon('arrow','sm'),'btn small w-full','data-id="'+m.id+'"')+'</div>';}).join(''):'<p class="small muted">All make-ups are booked.</p>')+pager('makeups',makeupsPage,true)+'</section><section class="panel rail-card"><div class="rail-title"><h3>Parent requests</h3>'+tag(requests.length)+'</div>'+(requests.length?requestsPage.items.map(r=>'<div class="makeup-card"><p class="small strong">'+studentById(r.studentId).name+'</p><p class="small muted mt-8">'+esc(r.reason||'Absence request')+'</p><div class="flex mt-16">'+action('approve-absence','Approve','btn small soft','data-id="'+r.id+'"')+action('decline-absence','Decline','btn small ghost','data-id="'+r.id+'"')+'</div></div>').join(''):'<div class="flex" style="align-items:flex-start">'+icon('circlecheck')+'<p class="small muted">You’re up to date.</p></div>')+pager('requests',requestsPage,true)+'</section>';
}
function scheduleLeaveStrip(staffId){
 const balance=staffBalance(state,staffId);
 return '<section class="panel schedule-leave-strip" aria-label="'+esc(tutorName(staffId))+' annual leave"><div class="leave-strip-balance"><h3>Annual leave</h3><p><strong>'+balance.available+'</strong> days available</p></div><div class="leave-strip-actions">'+action('leave-details','Details','btn small','data-id="'+staffId+'"')+(ui.role==='admin'?action('set-staff-leave',icon('plus')+' Set leave','btn small','data-id="'+staffId+'"'):'')+'</div></section>';
}
function leaveAffectedBookings(leave){
 return state.bookings.filter(b=>b.tutor===leave.staffId&&b.date===leave.date&&activeBooking(b)&&(leave.unit==='Full day'||leave.unit==='AM'&&b.start<HALF_DAY_BOUNDARY||leave.unit==='PM'&&b.start+b.duration>HALF_DAY_BOUNDARY));
}
function staffLeaveDialog(staffId,more=false){
 if(!['admin','teacher'].includes(ui.role))return;
 if(ui.role==='teacher')staffId='chan';
 const staff=state.staff.find(s=>s.id===staffId);if(!staff)return;
 ui.leaveDialogStaff=staffId;ui.leaveHistoryLimit=more?(ui.leaveHistoryLimit||20)+20:20;
 const balance=staffBalance(state,staffId);
 const entries=state.staffLeave.filter(l=>l.staffId===staffId&&(activeStaffLeave(l)||l.status==='cancelled')).sort((a,b)=>b.date.localeCompare(a.date));
 const totals='<dl class="leave-summary-grid"><div><dt>Annual allowance</dt><dd>'+balance.allowance+'</dd></div><div><dt>Holiday credits</dt><dd>+'+balance.holidayCredit+'</dd></div><div><dt>Used / scheduled</dt><dd>−'+balance.taken+'</dd></div><div><dt>Available</dt><dd>'+balance.available+' days</dd></div></dl><div class="leave-roster"><h3>Regular working days</h3><div class="roster-grid">'+['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>'<div class="roster-header">'+d+'</div>').join('')+staff.roster.map(d=>'<div class="roster-cell '+(d==='Off'?'off':d==='AM'||d==='PM'?'half':'')+'">'+(d==='Full'?'Full day':d)+'</div>').join('')+'</div></div><h3 class="mb-16">Leave history</h3>';
 const rows=entries.slice(0,ui.leaveHistoryLimit).map(l=>{const affected=activeStaffLeave(l)?leaveAffectedBookings(l).length:0;return '<div class="leave-entry-row"><div class="leave-entry-copy"><p class="small strong">'+dateLabel(l.date,{year:'numeric'})+' · '+esc(l.unit)+' · '+l.days+' day'+(l.days===1?'':'s')+'</p>'+(l.reason?'<p class="row-meta">'+esc(l.reason)+'</p>':'')+(affected?'<div class="mt-8">'+action('leave-affected-lessons',affected+' affected booking'+(affected===1?'':'s'),'inline-link small','data-id="'+l.id+'"')+'</div>':'')+'</div><div class="leave-entry-actions">'+(l.status==='cancelled'?tag('Cancelled'):ui.role==='admin'?action('remove-staff-leave','Remove','btn small','data-id="'+l.id+'" aria-label="Remove '+esc(tutorName(staffId))+' leave on '+dateLabel(l.date)+' '+esc(l.unit)+'"'):'')+'</div></div>';}).join('');
 modal(esc(tutorName(staffId))+' · Annual leave '+TODAY.slice(0,4),totals+'<div class="leave-entry-list">'+(rows||'<p class="small muted">No leave recorded yet.</p>')+'</div>'+(entries.length>ui.leaveHistoryLimit?'<div class="mt-16">'+action('more-leave-history','Show more','btn small')+'</div>':''),action('close-modal','Close','btn')+(ui.role==='admin'?action('set-staff-leave',icon('plus')+' Set leave','btn primary','data-id="'+staffId+'"'):''),true);
}
function refreshStaffLeaveUnits(){
 const select=$('#al-unit');if(!select)return;
 const units=staffLeaveUnits(state,ui.leaveEditingStaff,$('#al-date').value),value=select.value;
 select.innerHTML=units.length?units.map(unit=>'<option'+(unit===value?' selected':'')+'>'+unit+'</option>').join(''):'<option value="">Non-working day</option>';
 select.disabled=!units.length;
 $('[data-action="save-staff-leave"]').disabled=!units.length;
 $('#al-roster-note').textContent=units.length===1?tutorName(ui.leaveEditingStaff)+' works '+units[0]+' only. This uses 0.5 day of leave.':!units.length?'Choose a working day for '+tutorName(ui.leaveEditingStaff)+'.':'';
 refreshStaffLeaveImpact();
}
function refreshStaffLeaveImpact(){
 const date=$('#al-date')?.value,unit=$('#al-unit')?.value,notice=$('#al-affected');if(!notice)return;
 const count=unit?leaveAffectedBookings({staffId:ui.leaveEditingStaff,date,unit}).length:0;
 notice.hidden=!count;notice.textContent=count?count+' student booking'+(count===1?' overlaps':'s overlap')+' this leave.':'';
}
function centreCalendarPage(){
 const periods=['Jan–Feb','Mar–Apr','May–Jun','Jul–Aug','Sep–Oct','Nov–Dec'];
 return heading('Centre calendar',tag('2026'),'Annual teaching plan')+'<div class="two-columns"><section class="panel"><div class="panel-head"><h3>Lesson allocation by day</h3><span class="small muted">Annual target: 48</span></div><div class="table-scroll"><table><thead><tr><th>Period</th>'+['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>'<th>'+d+'</th>').join('')+'</tr></thead><tbody>'+periods.map((p,i)=>'<tr><td class="strong">'+p+'</td>'+[0,1,2,3,4,5,6].map(d=>'<td>'+(d===2&&i===2?tag('7','amber'):d===2&&i===3?tag('9','blue'):'8')+'</td>').join('')+'</tr>').join('')+'<tr><td class="strong">Annual total</td>'+Array(7).fill('<td class="strong green-text">48</td>').join('')+'</tr></tbody></table></div><div class="panel-footer"><p class="small muted">Illustrative allocation for discussion. Actual closure dates and billing blocks need the centre’s annual calendar.</p></div></section><aside class="stack"><section class="panel"><div class="panel-head"><h3>Calendar balancing</h3></div><div class="panel-body"><p class="small muted">A seven-lesson period may be balanced by a later nine-lesson period within the calendar year. If there is no later balancing period, arrange an extra lesson.</p><div class="notice blue mt-16">Planned centre closures are separate from a student’s absence and make-up record.</div></div></section><section class="panel"><div class="panel-body"><h3>Parent notices</h3><p class="small muted mt-8">Confirmed closures should appear on the schedule and in affected families’ upcoming lessons.</p></div></section></aside></div>';
}
function messagesPage(){return conversationUI.render();}
const assignmentStatus = status => ({upcoming:['Up next','blue'],'in-progress':['In progress','amber'],submitted:['Ready to mark','blue'],corrections:['Corrections needed','red'],completed:['Completed','green']}[status] || [status,'']);
const thumbnail = w => '<span class="sheet-thumb '+w.colour+'"><span class="symbol">'+({Fractions:'½',Division:'÷','Word problems':'+','Number sense':'123',Decimals:'.5'}[w.topic] || '∑')+'</span><span class="line"></span><span class="line"></span></span>';
function assignmentRow(a, readonly=false){
 const w=worksheetById(a.worksheetId),st=assignmentStatus(a.status);
 return '<div class="worksheet-row">'+thumbnail(w)+'<div class="grow"><div class="row-title">'+t(w.title)+'</div><div class="row-meta">'+w.code+' · '+t(w.level)+(a.homework?' · '+t('Homework'):'')+'</div></div>'+tag(st[0],st[1])+action('open-assignment',ui.role==='teacher'&&['submitted','corrections'].includes(a.status)?'Review':'Open','btn small','data-id="'+a.id+'"'+(readonly?' data-readonly="true"':''))+'</div>';
}
function classroomPage(){
 const lessonStudents=teachingBookings();
 if(!ui.standaloneFolder&&!lessonStudents.some(b=>b.studentId===ui.selectedStudent))ui.selectedStudent=lessonStudents[0]?.studentId||'chloe';
 const s=studentById(ui.selectedStudent);
 const all=state.assignments.filter(a=>a.studentId===s.id).sort((a,b)=>Number(a.status==='completed')-Number(b.status==='completed')||b.assignedDate.localeCompare(a.assignedDate));
 const visible=all.filter(a=>ui.folderTab==='All work'||ui.folderTab==='Upcoming'&&a.status==='upcoming'||ui.folderTab==='In progress'&&['in-progress','submitted'].includes(a.status)||ui.folderTab==='Corrections'&&a.status==='corrections'||ui.folderTab==='Completed'&&a.status==='completed');
 const note=state.lessonNotes.filter(n=>n.studentId===s.id&&n.published).at(-1),workPage=collectionPage('folder-work',visible,12);
 return (ui.standaloneFolder?heading('Student folder',action('back-classroom','Back to my class','btn')+action('write-note',icon('edit')+' Lesson record','btn primary','data-id="'+s.id+'"'),s.number+' · '+s.level):heading('My classroom',classSelector()+action('mark-class-present',icon('check')+' Mark attendance','btn')+action('write-note',icon('edit')+' Lesson record','btn primary','data-id="'+s.id+'"'),dateLabel(ui.classDate,{weekday:'long'})+' · '+time(ui.classStart)+'–'+time(ui.classStart+60))+
 '<div class="class-students">'+lessonStudents.map(b=>{const st=studentById(b.studentId);return '<button class="student-card '+(s.id===st.id?'selected':'')+'" data-action="select-student" data-id="'+st.id+'">'+avatar(st)+(b.attendance==='present'?'<span class="attendance-check">'+icon('circlecheck','sm')+'</span>':'')+'<div class="name">'+st.name+'</div><div class="meta">'+st.level+' · '+b.duration+' minutes</div>'+tag(b.attendance==='present'?'Present':'Not checked in',b.attendance==='present'?'green':'')+'</button>';}).join('')+'</div>')+
 '<div class="folder-layout"><section><div class="folder-heading">'+avatar(s,'large')+'<div class="grow"><h2>'+s.name+'’s folder</h2><p class="small muted">'+s.number+' · '+s.level+' · '+s.focus+'</p></div>'+action('navigate',icon('plus')+' Add work','btn','data-page="library"')+'</div>'+tabs(['All work','Upcoming','In progress','Corrections','Completed'],ui.folderTab,'folder-tab')+'<div class="panel">'+(visible.length?workPage.items.map(a=>assignmentRow(a)).join('')+pager('folder-work',workPage,true):empty('No worksheets here','Assign a worksheet from the library.'))+'</div></section><aside class="folder-side stack"><section class="panel"><div class="panel-head"><h3>Last lesson</h3><span class="small muted">'+(note?dateLabel(note.date):'—')+'</span></div><div class="panel-body">'+(note?'<p class="strong small">'+esc(note.topics)+'</p><p class="small muted mt-8" style="line-height:1.8">'+esc(note.comment)+'</p>':'<p class="small muted">No lesson record yet.</p>')+'</div></section><div class="helper-art"><div><h4>Ready for the next step</h4><p>Keep unfinished work and corrections in the student’s folder.</p></div>'+art(10)+'</div></aside></div>';
}
function libraryPage(){
 const query=ui.search.toLowerCase();const list=worksheets.filter(w=>(ui.libraryFilter==='All topics'||w.topic===ui.libraryFilter)&&(!query||(w.title+' '+w.code+' '+w.level).toLowerCase().includes(query)));
 return heading('Worksheet library',action('open-folder','Back to '+studentById(ui.selectedStudent).name.split(' ')[0]+'’s folder','btn'),'Teaching materials')+
 '<div class="filters"><div class="search grow">'+icon('search')+'<input id="library-search" aria-label="Search worksheets" placeholder="Search topic, worksheet or level" value="'+esc(ui.search)+'">'+action('search-library',icon('arrow','sm'),'icon-btn','aria-label="Search worksheets"')+'</div><select class="btn" data-change="library-filter" aria-label="Filter by topic">'+['All topics','Fractions','Division','Word problems','Number sense','Decimals'].map(t=>'<option'+(t===ui.libraryFilter?' selected':'')+'>'+t+'</option>').join('')+'</select></div><div class="library-grid">'+list.map(w=>'<article class="library-card"><div class="library-preview"><div class="mini-paper"><div class="mini-title">'+w.code+'</div><div class="mini-math">'+(w.topic==='Fractions'?'½ = ²⁄₄':w.topic==='Division'?'84 ÷ 4':w.topic==='Decimals'?'0.5 + 0.2':'12 + 8')+'</div><div class="mini-line"></div><div class="mini-line"></div><div class="mini-line"></div></div></div><div class="library-details"><p class="eyebrow">'+w.topic+' · '+w.level+'</p><h3>'+w.title+'</h3><p class="small muted">'+w.code+' · '+w.pages+' page · ~'+w.minutes+' min</p><div class="bottom">'+action('preview-worksheet','Preview','inline-link','data-id="'+w.id+'"')+action('assign-worksheet',icon('plus','sm')+' Assign','btn small','data-id="'+w.id+'"')+'</div></div></article>').join('')+'</div>'+(list.length?'':empty('No worksheets found','Try another topic or search.'));
}
function noteCard(n){
 const display = field => n.id==='note-chloe-sep16' ? content(n[field]) : n[field];
 return '<article class="panel note-card"><div class="between"><p class="note-date">'+dateLabel(n.date,{weekday:'long'})+'</p>'+tag(n.published?'Shared with parent':'Draft',n.published?'green':'amber')+'</div><h3>'+esc(display('topics'))+'</h3><div class="mt-8">'+tag(n.performance,'blue')+'</div><p class="note-comment">'+esc(display('comment'))+'</p>'+(n.homework?'<div class="homework-strip">'+icon('book','sm')+' <strong>'+t('Homework')+'</strong> · '+esc(display('homework'))+'</div>':'')+'</article>';
}

function notesPage(){
 const list=state.lessonNotes.filter(n=>n.studentId===ui.selectedStudent).slice().reverse(),recordPage=collectionPage('lesson-records',list,10);
 return heading('Lesson records',action('write-note',icon('plus')+' Add record','btn primary','data-id="'+ui.selectedStudent+'"'))+'<div class="filters">'+action('choose-record-student',icon('search')+' '+studentById(ui.selectedStudent).name+' · '+studentById(ui.selectedStudent).number,'btn')+'</div><div class="two-columns"><div class="stack">'+(list.length?recordPage.items.map(noteCard).join('')+pager('lesson-records',recordPage,true):empty('No lesson records yet','Add the first lesson summary.'))+'</div><aside class="helper-art"><div><h3>The digital handbook</h3><p>Published lesson summaries appear in the parent’s handbook.</p></div>'+art(10)+'</aside></div>';
}
function assessmentOverview(){
 const a=state.assessment;
 return heading('入學評估',childSwitch())+'<div class="family-grid"><section class="panel"><div class="panel-head"><h3>入學評估報告</h3>'+tag('Completed','green')+'</div><div class="panel-body"><p class="small muted">'+dateLabel(a.assessmentDate)+' · 小二數學</p><p class="mt-16 muted">'+esc(content(a.report))+'</p><div class="mt-24 flex">'+action('enrol-mia','為 Mia 報名','btn primary')+action('navigate','聯絡中心','btn','data-page="messages"')+'</div></div></section><aside class="panel panel-body"><h3>評估費</h3><p class="small muted mt-16">已於 '+dateLabel(a.assessmentDate)+' 繳付 HK$200。</p><div class="notice mt-16">10 月 3 日或之前報名，可於首次學費扣減 HK$200 評估費。</div></aside></div>';
}
const childSwitch=()=>'<select class="btn" data-change="family-student" aria-label="'+t('Child')+'"><option value="chloe"'+(ui.familyStudent==='chloe'?' selected':'')+'>Chloe Chan · '+t('P3')+'</option><option value="mia"'+(ui.familyStudent==='mia'?' selected':'')+'>Mia Cheung · '+t(state.assessment.enrolled?'P2':'Assessment')+'</option></select>';

function nextLessons(studentId){return state.bookings.filter(b=>b.studentId===studentId&&activeBooking(b)&&b.date>=TODAY).sort((a,b)=>a.date.localeCompare(b.date)||a.start-b.start);}
function lessonRow(b,allowLeave=false){
 const src=state.bookings.find(s=>s.id===b.sourceId);const request=state.leaveRequests.find(r=>r.bookingId===b.id&&r.status==='pending');
 return '<div class="lesson-item"><div class="date-tile '+(b.date===TODAY?'red':'')+'"><span class="month">'+dateLabel(b.date,{day:undefined,month:'short'})+'</span><span class="day">'+Number(b.date.slice(8))+'</span></div><div class="grow"><div class="strong">'+dateLabel(b.date,{weekday:'long',day:undefined,month:undefined})+' · '+time(b.start)+'–'+time(b.start+b.duration)+'</div><div class="row-meta">'+tutorName(b.tutor)+(src?' · '+t('Make-up from '+dateLabel(src.date),dateLabel(src.date)+' 的補堂'):' · '+t('Mathematics'))+'</div></div>'+(request?tag('Leave requested','amber'):allowLeave?action('request-leave','Request leave','btn small','data-id="'+b.id+'"'):'')+'</div>';
}

function parentBottomNav(){
 const selected=['handbook','homework','worksheet'].includes(ui.page)?'overview':ui.page;
 const item=(id,ic,label)=>action('navigate',icon(ic)+'<span>'+label+'</span>','parent-nav-item'+(selected===id?' active':''),'data-page="'+id+'"'+(selected===id?' aria-current="page"':''));
 return item('overview','home','主頁')+item('lessons','calendar','課堂')+action('show-checkin','<span class="parent-qr-disc"><img src="/icons/mathconcept-192.png" width="192" height="192" alt=""></span><span>二維碼</span>','parent-qr-button','aria-label="開啟出席二維碼" aria-haspopup="dialog"')+item('messages','message','訊息')+item('payments','wallet','繳費');
}
function parentLessonGroups(studentId){
 const end=new Date(TODAY+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+6);
 const last=end.toISOString().slice(0,10),groups=[];
 for(const lesson of nextLessons(studentId).filter(b=>b.date<=last)){
  let group=groups.at(-1);if(!group||group.date!==lesson.date){group={date:lesson.date,lessons:[]};groups.push(group);}group.lessons.push(lesson);
 }
 return groups;
}
function parentOverview(){
 if(ui.familyStudent==='mia'&&!state.assessment.enrolled)return assessmentOverview();
 const groups=parentLessonGroups(ui.familyStudent);
 const shortcuts=[['lessons','calendar','上課時間'],['handbook','file','課堂報告'],['homework','book','功課']];
 return heading('家長主頁')+'<nav class="parent-quick-actions" aria-label="常用功能">'+shortcuts.map(([page,ic,label])=>action('navigate',icon(ic)+'<span>'+label+'</span>','parent-quick-action','data-page="'+page+'"')).join('')+'</nav><section class="parent-upcoming" aria-labelledby="parent-week-title"><div class="parent-week-heading"><h2 id="parent-week-title">未來 7 天的課堂</h2>'+childSwitch()+'</div>'+(groups.length?'<div class="parent-lesson-days">'+groups.map(group=>'<article class="parent-day-card"><h3><time datetime="'+group.date+'">'+dateLabel(group.date,{weekday:'short'})+(group.date===TODAY?'（今天）':'')+'</time></h3><div>'+group.lessons.map(b=>{const pending=state.leaveRequests.some(r=>r.bookingId===b.id&&r.status==='pending');return action('parent-lesson','<span class="parent-lesson-copy"><strong>'+time(b.start)+'–'+time(b.start+b.duration)+'</strong><span class="parent-lesson-meta">數學 · '+esc(tutorName(b.tutor))+(b.sourceId?'<span class="parent-lesson-status">補堂</span>':'')+'</span>'+(b.attendance==='present'?'<span class="parent-attendance">'+icon('check','sm')+'已登記出席</span>':pending?'<span class="parent-lesson-status">請假待確認</span>':'')+'</span>'+icon('right','sm'),'parent-home-lesson','data-id="'+b.id+'" aria-label="'+esc(dateLabel(b.date)+' '+time(b.start)+'–'+time(b.start+b.duration)+' 數學課堂詳情')+'"');}).join('')+'</div></article>').join('')+'</div>':'<p class="parent-no-lessons">未來 7 天暫無已安排的課堂。</p>')+'</section>';
}
function parentHomework(){
 const list=state.assignments.filter(a=>a.studentId===ui.familyStudent&&a.homework===true);
 return heading('功課',childSwitch())+'<section class="panel"><div class="panel-head"><h2>功課</h2></div>'+(list.length?list.map(a=>assignmentRow(a,true)).join(''):empty('暫無功課','老師安排的家課將顯示於這裏。'))+'</section>';
}
function parentLessonDialog(id){
 const b=state.bookings.find(b=>b.id===id&&b.studentId===ui.familyStudent&&activeBooking(b));if(!b)return;
 const source=state.bookings.find(item=>item.id===b.sourceId),pending=state.leaveRequests.some(r=>r.bookingId===id&&r.status==='pending');
 modal('課堂詳情','<p class="strong">'+esc(studentById(b.studentId).name)+' · 數學</p><dl class="detail-grid"><div><dt>日期</dt><dd>'+dateLabel(b.date,{weekday:'long'})+'</dd></div><div><dt>時間</dt><dd>'+time(b.start)+'–'+time(b.start+b.duration)+'</dd></div><div><dt>老師</dt><dd>'+esc(tutorName(b.tutor))+'</dd></div><div><dt>中心</dt><dd>MathConcept（荃灣）</dd></div></dl>'+(source?'<p class="small muted">補回 '+dateLabel(source.date)+' 的課堂</p>':'')+(b.attendance==='present'?'<p class="parent-attendance">'+icon('check','sm')+'已登記出席</p>':pending?'<p class="small muted">請假待中心確認</p>':''),action('close-modal','關閉','btn')+(b.attendance!=='present'&&!pending?action('request-leave','申請請假','btn','data-id="'+b.id+'"'):'')+(b.date===TODAY?action('show-lesson-checkin','出席二維碼','btn primary','data-id="'+b.id+'"'):''));
}

function parentLessons(){
 const id=ui.familyStudent,list=nextLessons(id),makeups=state.makeups.filter(m=>m.studentId===id),remaining=makeups.reduce((n,m)=>n+m.minutes-m.used,0);
 return heading('課堂',childSwitch())+'<div class="family-grid"><section class="panel"><div class="panel-head"><h3>即將上課</h3><span class="small muted">'+t(studentById(id).level)+' · 數學</span></div>'+(list.length?list.map(b=>lessonRow(b,true)).join(''):empty('暫未安排課堂','中心會協助安排固定上課時間。'))+'</section><aside class="stack"><section class="panel"><div class="panel-head"><h3>補堂</h3></div><div class="panel-body"><p class="small muted">8 至 9 月課程</p><div class="stat-pair"><div><div class="number">'+remaining+' <span class="small muted">分鐘</span></div><div class="label">待安排</div></div><div><div class="number">'+usedReschedules(state,id)+' <span class="small muted">/ 3</span></div><div class="label">已用調堂次數</div></div></div></div>'+(makeups.length?makeups.map(m=>'<div class="panel-footer"><div class="between"><div><p class="small strong">剩餘 '+(m.minutes-m.used)+' 分鐘</p><p class="small muted">補堂限期 '+dateLabel(m.expiry)+'</p></div>'+(m.minutes>m.used?action('makeup-book','Find a time','btn small','data-id="'+m.id+'"'):tag('Booked','green'))+'</div></div>').join(''):'')+'</section><div class="helper-art"><div><h4>稍後再安排補堂</h4><p>你可以先申請請假，之後再選擇補堂時間。</p></div>'+art(16)+'</div></aside></div>';
}

function parentHandbook(){
 const list=state.lessonNotes.filter(n=>n.studentId===ui.familyStudent&&n.published).slice().reverse();
 const completed=state.assignments.filter(a=>a.studentId===ui.familyStudent&&['completed','corrections'].includes(a.status));
 return heading('學習手冊',childSwitch())+'<div class="family-grid"><div class="stack">'+(list.length?list.map(noteCard).join(''):'<div class="panel">'+empty('暫無課堂紀錄','老師會在課後分享學習近況。',15)+'</div>')+'</div><section class="panel"><div class="panel-head"><h3>已批改功課</h3></div>'+(completed.length?completed.map(a=>assignmentRow(a,true)).join(''):empty('暫無已批改功課','老師批改後，功課會顯示於這裏。'))+'</section></div>';
}

function parentPayments(){
 const invoices=state.invoices.filter(i=>i.studentId===ui.familyStudent);
 return heading(t('Payments','繳費'),childSwitch())+'<div class="stack">'+(invoices.length?invoices.map(i=>{const status=invoiceStatus(i);return '<section class="panel"><div class="panel-head"><div><h3>'+esc(content(i.period))+'</h3><p class="small muted mt-8">'+i.id+' · '+t('Issued','發出日期')+' '+familyDate(i.issued,ui.role)+'</p></div>'+tag(i.receiptId?t('Receipt issued','已發出收據'):status==='review'?t('Proof needs attention','付款證明待覆核'):i.proof?t('Proof submitted','已提交付款證明'):t('Due','繳費限期')+' '+familyDate(i.due,ui.role),i.receiptId?'green':status==='review'?'amber':i.proof?'blue':'amber')+'</div><div class="panel-body between wrap"><div><h2>'+money(i.amount)+'</h2><p class="small muted mt-8">'+esc(content(i.description))+'</p></div><div class="flex">'+action('view-invoice',t('View invoice','查看繳費通知'),'btn','data-id="'+i.id+'"')+(i.receiptId?action('view-receipt',icon('receipt')+' '+t('Receipt','收據'),'btn primary','data-id="'+i.receiptId+'"'):i.proof?action('view-proof',status==='review'?t('View result','查看結果'):t('View proof','查看付款證明'),'btn','data-id="'+i.id+'"'):action('submit-proof',icon('upload')+' '+t('Submit payment proof','提交付款證明'),'btn primary','data-id="'+i.id+'"'))+'</div></div></section>';}).join(''):'<div class="panel">'+empty(t('No invoices yet','暫時沒有繳費通知'),t('Your centre will issue an invoice after enrolment.','完成報名後，中心會發出繳費通知。'),14)+'</div>')+'</div>';
}

function studentWork(){
 const s=studentById(ui.familyStudent),past=ui.page==='past',assignments=state.assignments.filter(a=>a.studentId===s.id&&(past?a.status==='completed':a.status!=='completed'));
 return heading(past?t('Past work','已完成的工作紙'):t('Hi, '+s.name.split(' ')[0]+'.',s.name.split(' ')[0]+'，你好！'),childSwitch())+'<div class="family-work-grid">'+assignments.map(a=>{
  const w=worksheetById(a.worksheetId),st=assignmentStatus(a.status);
  const label=a.status==='corrections'?t('Make corrections','改正答案'):a.status==='in-progress'?t('Continue working','繼續作答'):a.status==='submitted'||past?t('View work','查看工作紙'):t('Start worksheet','開始作答');
  return '<article class="work-card">'+thumbnail(w)+'<h3>'+esc(t(w.title))+'</h3><p class="small muted mb-16">'+esc(a.homework?t('Homework','家課'):t(w.topic))+' · '+esc(t(w.level))+'</p>'+tag(ui.role==='student'&&a.status==='submitted'?t('With your teacher','待老師批改'):t(st[0]),st[1])+action('open-assignment',label,'btn '+(a.status==='in-progress'||a.status==='corrections'?'primary':''),'data-id="'+a.id+'"')+'</article>';
 }).join('')+'</div>'+(!assignments.length?'<div class="panel">'+empty(past?t('Your completed work will live here','已完成的工作紙會顯示在這裏'):t('All caught up!','全部完成！'),past?t('Keep learning, one worksheet at a time.','每完成一份工作紙，都在進步。'):t('Your teacher will choose what comes next.','老師會為你安排下一份工作紙。'),past?7:18)+'</div>':'')+(!past?'<div class="student-past"><div class="flex">'+icon('folder')+'<span class="small">'+t('Looking for something you’ve finished?','想重溫已完成的工作紙？')+'</span></div>'+action('navigate',t('Past work','已完成的工作紙')+' '+icon('arrow','sm'),'inline-link','data-page="past"')+'</div>':'');
}
function fraction(n,d){return '<span class="fraction"><span>'+n+'</span><span>'+d+'</span></span>';}
function paperQuestions(w){
 const q=(n,title,body)=>'<div class="question"><div class="question-title"><span class="q-number">'+n+'</span><span>'+title+'</span></div>'+body+'</div>';
 if(w.topic==='Fractions')return q(1,t('Complete the equivalent fractions.','完成以下等值分數。'),'<div class="fraction-row">'+fraction(1,2)+'<span>=</span>'+fraction('<span class="answer-box"></span>',4)+'<span style="margin-left:12px">'+fraction(2,3)+'</span><span>=</span>'+fraction('<span class="answer-box"></span>',6)+'</div>')+q(2,t('Shade the second bar to show the same amount.','在第二個長方形內塗色，表示相同的份量。'),'<div class="fraction-bars"><div class="fraction-bar"><i class="fill"></i><i></i></div><div class="fraction-bar"><i></i><i></i><i></i><i></i></div></div><div class="working-lines" style="height:6.4cqw"></div>')+q(3,t('Chloe shares a pizza equally with a friend. What fraction does each person get? Explain your thinking.','Chloe 把一個薄餅與一位朋友平均分，每人分得整個薄餅的幾分之幾？說明你的想法。'),'<div class="working-lines"></div>')+q(4,t('Write two different fractions that are equal to one half.','寫出兩個不同的分數，它們的值都等於二分之一。'),'<div class="working-lines"></div>');
 if(w.topic==='Division')return q(1,t('Work out 84 ÷ 4. Show each step.','計算 84 ÷ 4，並列出每個步驟。'),'<div class="working-lines"></div>')+q(2,t('Share 96 stickers equally between 6 children. How many does each child get?','把 96 張貼紙平均分給 6 個小朋友，每人可分得多少張？'),'<div class="working-lines"></div>')+q(3,t('Find 135 ÷ 5. Check your answer with multiplication.','計算 135 ÷ 5，並用乘法驗算。'),'<div class="working-lines"></div>');
 if(w.topic==='Decimals')return q(1,t('Write one half as a decimal.','把二分之一寫成小數。'),'<div class="working-lines" style="height:7.8cqw"></div>')+q(2,t('Work out 0.5 + 0.2. Explain with a drawing.','計算 0.5 + 0.2，並畫圖說明。'),'<div class="working-lines"></div>')+q(3,t('Put these in order, from smallest to largest: 0.7, 0.25, 0.5.','把以下小數由小至大排列：0.7、0.25、0.5。'),'<div class="working-lines"></div>');
 if(w.topic==='Word problems')return q(1,t('Emma buys 3 apples for HK$4 each. How much does she spend?','Emma 買了 3 個蘋果，每個 4 港元。她共花了多少錢？'),'<div class="working-lines"></div>')+q(2,t('She pays with HK$20. How much change should she receive?','她付了 20 港元，應找回多少錢？'),'<div class="working-lines"></div>')+q(3,t('A basket holds 6 oranges. How many oranges are in 4 baskets? Show a drawing.','每籃有 6 個橙，4 籃共有多少個橙？畫圖說明。'),'<div class="working-lines"></div>');
 return q(1,t('Continue the pattern: 4, 8, 12, __, __.','依照規律填上數字：4、8、12、__、__。'),'<div class="working-lines" style="height:7.8cqw"></div>')+q(2,t('What is the rule? Explain in your own words.','這組數字有甚麼規律？用自己的話說明。'),'<div class="working-lines"></div>')+q(3,t('Make a pattern that starts at 3 and adds 5 each time.','由 3 開始，每次加 5，寫出一組有規律的數字。'),'<div class="working-lines"></div>')+q(4,t('Create your own number pattern.','設計一組自己的數字規律。'),'<div class="working-lines" style="height:7.8cqw"></div>');
}
function currentAssignment(){return state.assignments.find(a=>a.id===ui.assignmentId);}
function canDraw(){const a=currentAssignment();return !!a&&!ui.readonly&&!ui.showOriginal&&(ui.role==='teacher'||ui.role==='student'&&['upcoming','in-progress','corrections'].includes(a.status));}
function worksheetPage(){
 const a=currentAssignment(),w=worksheetById(a?.worksheetId||ui.previewWorksheet),s=studentById(a?.studentId||ui.selectedStudent),teacher=ui.role==='teacher'&&!!a,editable=canDraw();
 const status=a?assignmentStatus(a.status):null;
 const noteText=a&&['assignment-chloe-3','assignment-lucas'].includes(a.id)?content(a.note):a?.note||'';
 const tools=editable?action('pen-tool',icon('edit'),'tool-btn '+(ui.pen==='pen'?'active':''),'data-tool="pen" aria-label="'+t('Pen','筆')+'"')+action('pen-tool',icon('eraser'),'tool-btn '+(ui.pen==='eraser'?'active':''),'data-tool="eraser" aria-label="'+t('Eraser','橡皮擦')+'"')+action('pen-tool',icon('move')+'<span>'+t('Move page','移動頁面')+'</span>','tool-btn pan-tool '+(ui.pen==='pan'?'active':''),'data-tool="pan" aria-label="'+t('Move page','移動頁面')+'"')+action('undo-ink',icon('undo'),'tool-btn','aria-label="'+t('Undo last stroke','撤銷上一筆')+'"')+['#35475f','#4167ab','#ce424b'].map(c=>action('ink-colour','','colour-tool '+(ui.ink===c?'active':''),'style="--ink-colour:'+c+'" data-colour="'+c+'" aria-label="'+(c==='#35475f'?t('Graphite ink','深灰色筆'):c==='#4167ab'?t('Blue ink','藍色筆'):t('Red ink','紅色筆'))+'"')).join(''):'<span class="small muted flex">'+icon('file')+(ui.showOriginal?t('Original submission','首次提交的版本'):t('Worksheet preview','工作紙預覽'))+'</span>';
 return heading(t(w.title),action('back-work',icon('left')+' '+t('Back','返回'),'btn')+(teacher?action('return-corrections','Request corrections','btn','data-id="'+a.id+'"')+action('complete-work',icon('check')+' Mark complete','btn primary','data-id="'+a.id+'"'):ui.role==='student'&&editable?action('submit-work',icon('check')+' '+t('Hand in','交功課'),'btn primary','data-id="'+a.id+'"'):''),s.name+' · '+w.code)+
 (ui.role==='student'&&a?.note?'<div class="notice blue worksheet-feedback"><strong>'+t('Your teacher: ','老師評語：')+'</strong>'+esc(noteText)+'</div>':'')+'<div class="worksheet-layout '+(ui.expanded?'expanded':'')+'"><section class="panel"><div class="drawing-tools">'+tools+'<div class="grow"></div>'+(a?.submissions?.length?action('toggle-original',ui.showOriginal?t('Latest work','最新版本'):t('Original submission','首次提交的版本'),'btn small'):'')+(ui.role==='student'?action('toggle-work-notes',icon('message')+' '+t('Notes','筆記'),'btn','aria-expanded="'+!!ui.workNotes+'" aria-controls="worksheet-notes"'):action('expand-work',icon('expand'),'tool-btn','aria-label="'+t('Expand worksheet','放大工作紙')+'"'))+'</div>'+
 '<div class="paper-wrap"><div class="paper"><div class="paper-content"><div class="paper-label">MathConcept · '+esc(t(w.level))+'</div><div class="paper-title">'+esc(t(w.title))+'</div><div class="paper-caption">'+w.code+' · '+esc(t(w.topic))+'</div><div class="paper-rule"><span>'+t('Name: ','姓名：')+esc(s.name)+'</span><span>'+dateLabel(TODAY,{year:'numeric',month:'long'})+'</span></div>'+paperQuestions(w)+'<div class="paper-foot"><span>MathConcept · '+t('Demonstration worksheet','示範工作紙')+'</span><span>1 / 1</span></div></div><canvas id="ink-canvas" class="ink-canvas" aria-label="'+(editable?t('Handwriting and rough working area','手寫及草稿區'):t('Student worksheet and annotations','學生工作紙及批註'))+'"'+(!editable?' style="pointer-events:none"':'')+'></canvas></div></div></section>'+
 '<aside class="work-side" id="worksheet-notes">'+(ui.role==='student'?'<div class="between notes-heading"><h2>'+t('Notes & working','筆記與作答')+'</h2>'+action('toggle-work-notes',icon('x'),'icon-btn','aria-label="'+t('Close notes','關閉筆記')+'"')+'</div>':'')+(a?'<section class="panel"><div class="panel-head"><h3>'+(teacher?'Teacher feedback':t('Your worksheet','工作紙'))+'</h3></div><div class="panel-body">'+tag(t(status[0]),status[1])+(teacher?'<div class="field mt-16"><label for="work-feedback">Comment</label><textarea id="work-feedback" placeholder="Add a hint or comment…">'+esc(a.note)+'</textarea></div>':a.note?'<p class="small mt-16">'+esc(noteText)+'</p>':'<p class="small muted mt-16">'+(editable?t('Write with your pen or finger. Choose Move page to scroll. Your work saves as you go.','用觸控筆或手指作答，選擇「移動頁面」便可捲動。作答內容會自動儲存。'):t('Your work is saved in your folder.','你的作答已儲存在學習資料夾。'))+'</p>')+'</div></section>'+
 '<section class="panel"><div class="panel-head"><h3>'+t('Written working','解題步驟')+'</h3></div><div class="panel-body"><div class="field"><label class="small muted" for="student-working">'+(editable&&ui.role==='student'?t('You can type your explanation here, too.','也可以在這裏輸入你的解題方法。'):t('Student’s explanation','學生的解題說明'))+'</label><textarea id="student-working" '+(ui.role!=='student'||!editable?'readonly':'')+' placeholder="'+t('Explain your thinking…','說明你的解題方法…')+'">'+esc(ui.showOriginal?a.submissions?.[0]?.working||'':a.working)+'</textarea></div></div></section>':'')+'<div class="helper-art">'+art(10)+'<div><h4>'+t('Show your thinking','列出解題過程')+'</h4><p>'+t('Your working is just as useful as your answer.','解題過程和答案一樣重要。')+'</p></div></div></aside></div>';
}
function updateDrawingTools(){
 const panning=ui.pen==='pan'||!canDraw();$('.paper')?.classList.toggle('pan-mode',panning);
 $$('[data-action=pen-tool]').forEach(b=>{b.classList.toggle('active',b.dataset.tool===ui.pen);b.setAttribute('aria-pressed',String(b.dataset.tool===ui.pen));});
 $$('[data-action=ink-colour]').forEach(b=>{b.classList.toggle('active',b.dataset.colour===ui.ink);b.setAttribute('aria-pressed',String(b.dataset.colour===ui.ink));});
 $('#ink-canvas')?.setAttribute('aria-label',!canDraw()?t('Student worksheet and annotations','學生工作紙及批註'):panning?t('Worksheet page. Move page tool is selected.','工作紙頁面，已選擇移動頁面工具。'):t('Handwriting and rough working area','手寫及草稿區'));
}
let canvasObserver;
function attachDrawing(){
 canvasObserver?.disconnect();const canvas=$('#ink-canvas');if(!canvas)return;const a=currentAssignment();const ctx=canvas.getContext('2d');let drawing=null,activePointer=null;updateDrawingTools();
 const visible=()=>ui.showOriginal?(a?.submissions?.[0]?.strokes||[]):(a?.strokes||[]);
 const stroke=(s)=>{if(!s.points?.length)return;const w=canvas.clientWidth,h=canvas.clientHeight;ctx.strokeStyle=s.colour;ctx.lineWidth=(s.width||2.4)*w/700;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();s.points.forEach((p,i)=>i?ctx.lineTo(p.x*w,p.y*h):ctx.moveTo(p.x*w,p.y*h));if(s.points.length===1){ctx.lineTo(s.points[0].x*w+.1,s.points[0].y*h+.1);}ctx.stroke();};
 const redraw=()=>{const ratio=window.devicePixelRatio||1,w=canvas.clientWidth,h=canvas.clientHeight;canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,w,h);visible().forEach(stroke);if(!ui.showOriginal)(a?.feedback||[]).forEach(stroke);if(drawing)stroke(drawing);};
 canvasObserver=new ResizeObserver(redraw);canvasObserver.observe(canvas);
 const point=e=>{const rect=canvas.getBoundingClientRect();return{x:(e.clientX-rect.left)/rect.width,y:(e.clientY-rect.top)/rect.height};};
 canvas.addEventListener('pointerdown',e=>{
  if(!canDraw()||ui.pen==='pan'||activePointer!==null||e.button!==0)return;
  e.preventDefault();activePointer=e.pointerId;canvas.setPointerCapture(e.pointerId);
  const p=point(e),list=ui.role==='teacher'?a.feedback:a.strokes;
  if(ui.pen==='eraser'){const i=list.findLastIndex(s=>s.points.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<.035));if(i>=0){list.splice(i,1);persist();redraw();}return;}
  drawing={points:[p],colour:ui.ink,width:ui.role==='teacher'?2.7:2.3};
  if(a.status==='upcoming'&&ui.role==='student')a.status='in-progress';redraw();
 });
 canvas.addEventListener('pointermove',e=>{if(!drawing||e.pointerId!==activePointer)return;e.preventDefault();drawing.points.push(point(e));redraw();});
 const finish=e=>{if(e.pointerId!==activePointer)return;if(drawing){(ui.role==='teacher'?a.feedback:a.strokes).push(drawing);drawing=null;persist();redraw();}activePointer=null;};
 canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);canvas.addEventListener('lostpointercapture',finish);
}

document.addEventListener('click', e => {
  conversationUI.onDocumentClick(e);
  const button = e.target.closest('[data-action]');
  if (!button) {
    const slot = e.target.closest('[data-slot]');
    if (ui.role==='admin' && slot && ui.moveId) moveTo(ui.moveId,{ date:slot.dataset.date,start:Number(slot.dataset.start),tutor:slot.dataset.tutor });
    if (e.target.matches('[data-backdrop]')) closeModal();
    return;
  }
  const a=button.dataset.action, id=button.dataset.id;
  if (a.startsWith('wa-')) {conversationUI.handleAction(a,id,button);return;}
  if (proofUI.handleAction(a,id,button)||bankCheckUI.handleAction(a,id,button))return;
  if (a==='navigate') { ui.page=button.dataset.page;if(ui.page==='classroom')ui.standaloneFolder=false; ui.assignmentId=null; ui.search=''; render(); }
  else if (a==='role') { closeModal(); ui.standaloneFolder=false;ui.role=button.dataset.role; ui.page=NAV[ui.role][0][0]; ui.moveId=null; ui.assignmentId=null; render(); }
  else if (a==='close-modal') closeModal();
  else if (a==='toggle-menu') $('.sidebar').classList.toggle('open');
  else if (a==='calendar-view') {ui.scheduleView=button.dataset.view;render();}
  else if (a==='teacher-tab') {ui.scheduleTutor=button.dataset.tutor;render();$('#teacher-tab-'+ui.scheduleTutor)?.focus();}
  else if (a==='schedule-date') {ui.date=button.dataset.date;ui.scheduleView='day';render();}
  else if (a==='prev-week'||a==='next-week') {const delta=a==='prev-week'?-1:1,d=new Date(ui.date+'T12:00:00');d.setDate(d.getDate()+delta*(ui.scheduleView==='week'?7:1));ui.date=d.toISOString().slice(0,10);ui.weekOffset=Math.floor((new Date(ui.date+'T12:00:00')-new Date(WEEK[0]+'T12:00:00'))/604800000);render();}
  else if (a==='today') {ui.weekOffset=0;ui.date=TODAY;render();}
  else if (a==='booking-detail') {const slot=button.closest('[data-slot]');if(ui.role==='admin'&&ui.moveId&&slot)moveTo(ui.moveId,{date:slot.dataset.date,start:Number(slot.dataset.start),tutor:slot.dataset.tutor});else bookingDetail(id);}
  else if (a==='begin-move') {const b=state.bookings.find(b=>b.id===id);ui.moveId=id;ui.role='admin';ui.page='schedule';ui.scheduleTutor=b.tutor;ui.date=b.date;ui.weekOffset=Math.floor((Date.parse(b.date+'T12:00:00Z')-Date.parse(WEEK[0]+'T12:00:00Z'))/(7*86400000));closeModal();render();}
  else if (a==='cancel-move') {ui.moveId=null;render();}
  else if (a==='save-booking-note') {const value=$('#booking-note').value;change(()=>{state.bookings.find(b=>b.id===id).note=value;},'Remark saved');closeModal();}
  else if (a==='undo-state') {if(previousState){state=previousState;previousState=null;persist();render();toast('Change undone.');}}
  else if (a==='demo-controls') modal('Demo controls','<div class="form-stack">'+['admin','teacher','parent','student'].map(r=>action('role',r[0].toUpperCase()+r.slice(1),'btn'+(ui.role===r?' soft':''),'data-role="'+r+'"')).join('')+'</div>',action('reset-demo','Reset demo','btn')+action('demo-info','About this demo','btn'));
  else if (a==='demo-info') modal('About this demo','<p>'+t('This is a front-end prototype with fictional students and payments. Changes stay in this browser. No messages, payments or reports are sent to an external service.','這是使用虛構學生及付款資料的介面示範。修改只儲存在此瀏覽器，不會向外傳送訊息、付款或報告。')+'</p><p class="mt-16 muted">'+t('The demo lesson date is 30 September 2026. Sample bank transactions include month-end examples so you can try date-forward and date-back reconciliation.','示範課堂日期為 2026 年 9 月 30 日。銀行交易樣本包含跨月例子，可試用入賬日期調整及對賬流程。')+'</p>',action('close-modal','Continue','btn primary'));
  else if (a==='reset-demo') modal('Reset the demo?','<p>'+t('Restore the original fictional students, lessons and payments. Your demo edits and handwriting in this browser will be cleared.','還原最初的虛構學生、課堂及付款資料。你在此瀏覽器的示範修改及手寫內容將被清除。')+'</p>',action('close-modal','Keep my changes','btn')+action('confirm-reset','Reset demo','btn primary'));
  else if (a==='confirm-reset') {state=seed();seedCentreVolume(state);seedTeacherSchedules(state);seedBusyAfternoons(state);normalizeStaffLeave(state);normalizeConversations(state);normalizeBillingAutomation(state);conversationUI.reset();bankCheckUI.reset();ui.matchDraft=null;ui.collections={};ui.profileDrafts={};ui.directoryStudent='chloe';ui.profileHistoryTab='Student information';ui.studentFiltersOpen=false;ui.picker=null;ui.standaloneFolder=false;ui.scheduleTutor='chan';previousState=null;persist();closeModal();Object.assign(ui,{assignmentId:null,selectedStudent:'chloe',familyStudent:'chloe',classDate:TODAY,classStart:960,classTutor:'chan',moveId:null,weekOffset:0,date:TODAY,thread:'thread-chloe',billingTab:'Invoices',folderTab:'All work',studentsTab:'Students',search:'',showOriginal:false,readonly:false,workNotes:false,expanded:false,pen:'pen'});ui.page=NAV[ui.role][0][0];render();toast('Demo restored.');}
  else handleAction(a,id,button);
});
function openMakeup(id,mode='single'){
 const m=state.makeups.find(m=>m.id===id),parent=ui.role==='parent',remaining=m.minutes-m.used;
 if(state.leaveRequests.some(r=>r.kind==='makeup'&&r.makeupId===id&&r.status==='pending')){toast('A replacement request is already awaiting confirmation.');return;}
 if(ui.makeupId!==id||!ui.makeupDate||!ui.makeupTutor){
  const next=state.bookings.filter(b=>b.studentId===m.studentId&&activeBooking(b)&&b.date>=TODAY&&b.date<=m.expiry).sort((a,b)=>a.date.localeCompare(b.date)||a.start-b.start)[0];
  const source=state.bookings.find(b=>b.id===m.sourceId);
  ui.makeupDate=next?.date||TODAY;
  ui.makeupTutor=next?.tutor||source?.tutor||studentById(m.studentId).tutor||tutors[0].id;
 }
 ui.makeupMode=mode;ui.makeupId=id;
 const candidates=[];
 if(mode==='split'){
  state.bookings.filter(b=>b.studentId===m.studentId&&activeBooking(b)&&b.date>=TODAY&&b.date<=m.expiry&&b.duration===60).forEach(b=>{const slot={date:b.date,start:b.start+b.duration,duration:30,tutor:b.tutor};if(!validateSlot(state,{...slot,studentId:m.studentId}))candidates.push(slot);});
 }else{
  const duration=remaining>=90?90:remaining>=60?60:30;
  if(remaining>=duration&&ui.makeupDate>=TODAY&&ui.makeupDate<=m.expiry){
   for(let start=CENTRE_OPEN;start+duration<=CENTRE_CLOSE;start+=30){
    const slot={date:ui.makeupDate,start,duration,tutor:ui.makeupTutor};
    if(!validateSlot(state,{...slot,studentId:m.studentId}))candidates.push(slot);
   }
  }
 }
 ui.makeupCandidates=candidates;
 const filters=mode==='single'?'<div class="field-row mb-16">'+field('Date','<input type="date" id="makeup-date" data-change="makeup-date" aria-label="'+t('Make-up date','補堂日期')+'" value="'+esc(ui.makeupDate)+'" min="'+TODAY+'" max="'+m.expiry+'">')+field('Teacher','<select id="makeup-tutor" data-change="makeup-tutor" aria-label="'+t('Make-up teacher','補堂老師')+'">'+tutors.map(t=>'<option value="'+t.id+'"'+(t.id===ui.makeupTutor?' selected':'')+'>'+t.name+'</option>').join('')+'</select>')+'</div>':'';
 const unavailable=mode==='single'&&m.expiry>=TODAY?t('No available times for this teacher on this date. Choose another date or teacher.','這位老師當天沒有空檔，請選擇其他日期或老師。'):t('No suitable times before this deadline. ','期限內沒有合適時段。')+(parent?'請聯絡中心商討延長補堂期限。':'Extend the deadline to show more options.');
 modal('Arrange a make-up','<div class="between mb-16"><div><h3>'+studentById(m.studentId).name+'</h3><p class="small muted">'+t(remaining+' min remaining · Use by '+dateLabel(m.expiry),'剩餘 '+remaining+' 分鐘 · 補堂限期 '+dateLabel(m.expiry))+'</p></div>'+(!parent?action('extend-makeup','Extend deadline','inline-link','data-id="'+id+'"'):'')+'</div><div class="segmented mb-16">'+action('makeup-mode','One lesson',mode==='single'?'active':'','data-mode="single"')+action('makeup-mode','30-minute extensions',mode==='split'?'active':'','data-mode="split"')+'</div>'+filters+'<div class="form-stack" style="gap:9px">'+candidates.map((s,i)=>'<label class="check-option"><input type="'+(mode==='split'?'checkbox':'radio')+'" name="makeup-slot" value="'+i+'"><span class="grow"><strong class="small">'+dateLabel(s.date,{weekday:'short'})+' · '+time(s.start)+'–'+time(s.start+s.duration)+'</strong><span class="row-meta" style="display:block">'+tutorName(s.tutor)+(mode==='split'?' · '+t('Extends the existing lesson','延長原有課堂'):' · '+s.duration+' '+t('minutes','分鐘'))+'</span></span></label>').join('')+(candidates.length?'':'<p class="small muted">'+unavailable+'</p>')+'</div>'+(mode==='split'?'<div class="notice blue mt-16">'+t('Both half-hour extensions belong to the same missed lesson and use one reschedule.','兩次延長各 30 分鐘，合共補回同一節缺席課堂，只計一次調堂。')+'</div>':''),action('close-modal','Cancel','btn')+action('confirm-makeup',parent?'Request these times':'Confirm booking','btn primary',candidates.length?'':'disabled'),true);
}
function openProof(invoiceId){
 const note=$('#reconcile-note');
 if(note)ui.matchDraft={receiptId:ui.matchReceiptId,bankId:ui.selectedBank,note:note.value,editing:ui.matchEditing};
 const opened=proofUI.openProof(invoiceId);
 if(opened&&note&&ui.role==='admin')$('.modal-footer')?.insertAdjacentHTML('afterbegin',action('return-bank-review','Back to bank review','btn','data-id="'+ui.matchReceiptId+'"'));
 return opened;
}
function receiptDialog(receiptId){
 const r=state.receipts.find(r=>r.id===receiptId),i=state.invoices.find(i=>i.id===r.invoiceId);
 modal(t('Receipt','收據')+' '+r.id,'<div class="receipt-paper"><div class="between"><div class="wordmark"><img class="brand-logo" src="/brand/mathconcept-logo.png" width="2172" height="724" alt="MathConcept"></div><span class="eyebrow">'+t('Receipt','收據')+'</span></div><p class="small muted mt-16">'+esc(content(centre.name))+'</p><dl class="detail-grid"><div><dt>'+t('Receipt no.','收據編號')+'</dt><dd>'+r.id+'</dd></div><div><dt>'+t('Issued','發出日期')+'</dt><dd>'+familyDate(r.issuedDate,ui.role)+'</dd></div><div><dt>'+t('Parent / guardian','家長／監護人')+'</dt><dd>'+esc(studentById(r.studentId).parent)+'</dd></div><div><dt>'+t('Student','學生')+'</dt><dd>'+esc(studentById(r.studentId).name)+'</dd></div></dl><p class="strong small">'+esc(i?.description?content(i.description):t('Regular programme','常規課程'))+'</p><p class="small muted mt-8">'+esc(content(i?.period||''))+' · '+r.invoiceId+'</p><div class="receipt-total"><span>'+t('Payment amount','付款金額')+'</span><span>'+money(r.amount)+'</span></div><p class="small muted">'+t('Issued from payment proof · bank reconciliation is separate.','根據付款證明發出 · 銀行對賬另行處理。')+'<br>'+t('Demonstration receipt · no actual payment','示範收據 · 不涉及實際付款')+'</p></div>',action('close-modal',t('Close','關閉'),'btn')+action('print-receipt',icon('download')+' '+t('Print / save PDF','列印／儲存 PDF'),'btn primary'));
}
function matchDialog(receiptId,editing=false){
 const r=state.receipts.find(r=>r.id===receiptId),invoice=state.invoices.find(i=>i.id===r.invoiceId),analysis=analyzeStatement(state).receipts.find(row=>row.receiptId===receiptId);
 ui.matchEditing=editing;ui.matchReceiptId=receiptId;ui.selectedBank=ui.matchDraft?.receiptId===receiptId?ui.matchDraft.bankId:r.bankId||null;ui.matchCandidates=analysis?.candidateBankIds||[];
 Object.assign(collection('bank'),{page:1,query:''});
 const linked=reconciliation(state,r);
 if(linked.status==='Matched'&&!editing){
  const bank=linked.bank;
  modal('Payment · '+esc(studentById(r.studentId).name),'<div class="billing-workspace"><div class="two-columns"><section><p class="small muted">Receipt '+r.id+'</p><h3 class="mt-8">'+money(r.amount)+'</h3><dl class="detail-grid"><div><dt>Receipt issued</dt><dd>'+dateLabel(r.issuedDate)+'</dd></div><div><dt>Payment date on proof</dt><dd>'+dateLabel(invoice?.claimedPaymentDate||r.proofDate)+'</dd></div></dl>'+action('view-proof','View payment proof','inline-link','data-id="'+r.invoiceId+'"')+'</section><section><p class="small muted">Bank deposit</p><h3 class="mt-8">'+money(bank.amount)+'</h3><dl class="detail-grid"><div><dt>Bank credited</dt><dd>'+dateLabel(bank.date)+'</dd></div><div><dt>HQ month</dt><dd>'+dateLabel(bank.date,{day:undefined,month:'long',year:'numeric'})+'</dd></div><div><dt>Payer</dt><dd>'+esc(bank.payer||invoice?.proofPayer||'Not recorded')+'</dd></div><div><dt>Reference</dt><dd>'+esc(bank.reference)+'</dd></div></dl>'+(linked.adjustment?'<p class="small muted">'+linked.adjustment+'</p>':'')+'</section></div>'+(r.note?'<p class="small">'+esc(r.note)+'</p>':'')+'</div>',action('change-bank-match','Change match','btn ghost','data-id="'+r.id+'"')+action('close-modal','Close','btn'),true);
  return;
 }
 const warning=analysis?.status==='ambiguous'?(ui.matchCandidates.length>1?ui.matchCandidates.length+' deposits could match this receipt.':'This deposit could match more than one receipt.'):analysis?.status==='amount-mismatch'?'The deposit amount differs from the receipt.':'';
 const details='<dl class="detail-grid"><div><dt>Receipt issued</dt><dd>'+dateLabel(r.issuedDate)+'</dd></div><div><dt>Payment date on proof</dt><dd>'+dateLabel(invoice?.claimedPaymentDate||r.proofDate)+'</dd></div><div><dt>Payer</dt><dd>'+esc(invoice?.proofReview?.extracted?.payer||invoice?.proofPayer||studentById(r.studentId).parent)+'</dd></div><div><dt>Reference</dt><dd>'+esc(invoice?.proofReference||'Not recorded')+'</dd></div></dl>';
 modal('Bank match · '+esc(studentById(r.studentId).name),'<div class="billing-workspace">'+(warning?'<p class="billing-status review">'+esc(warning)+'</p>':'')+'<div class="two-columns"><section><p class="small muted">'+r.id+'</p><h3 class="mt-8">'+money(r.amount)+'</h3>'+details+action('view-proof','View payment proof','inline-link','data-id="'+r.invoiceId+'"')+'<div id="match-comparison" class="mt-16">'+matchComparison(r,ui.selectedBank)+'</div></section><section>'+searchControl('bank','Search bank deposits','Payer, reference or date')+'<div id="bank-results">'+bankResults()+'</div></section></div>'+field('Review note','<input id="reconcile-note" value="'+esc(ui.matchDraft?.receiptId===receiptId?ui.matchDraft.note:r.note)+'" placeholder="Optional">')+'</div>',action('close-modal','Cancel','btn')+action('confirm-match','Save bank match','btn primary'),true);
}
function matchComparison(r,bankId){
 const b=state.bankTransactions.find(b=>b.id===bankId);if(!b)return '';
 const difference=r.amount-b.amount,adjustment=b.date<r.issuedDate?'Date back':b.date>r.issuedDate?'Date forward':null;
 return '<div class="stack-sm"><span class="billing-status '+(difference?'red':'matched')+'">'+(difference?money(Math.abs(difference))+(difference>0?' short':' extra'):'Amounts match')+'</span><p class="small">Bank credited '+dateLabel(b.date)+'</p><p class="small muted">HQ month: '+dateLabel(b.date,{day:undefined,month:'long',year:'numeric'})+(adjustment?' · '+adjustment:'')+'</p></div>';
}
function enrolDialog(){
 const a=state.assessment,credit=assessmentCredit(a,TODAY);
 modal(t('Enrol Mia Cheung','為 Mia Cheung 報名'),'<div class="form-stack">'+field(t('Parent / guardian','家長／監護人'),'<input id="enrol-parent" value="Mrs Cheung" aria-label="'+t('Parent name','家長姓名')+'">')+field(t('Contact number','聯絡電話'),'<input id="enrol-phone" inputmode="tel" value="9000 0000" aria-label="'+t('Contact number','聯絡電話')+'">')+'<div class="field-row">'+field(t('First lesson','首次上課日期'),'<input id="enrol-date" type="date" value="2026-09-30" aria-label="'+t('First lesson date','首次上課日期')+'">')+field(t('Lesson time','上課時間'),'<select id="enrol-time" aria-label="'+t('First lesson time','首次上課時間')+'"><option value="1020">17:00–18:00</option><option value="960">16:00–17:00</option></select>')+'</div>'+field(t('Tuition arrangement','學費安排'),'<select id="enrol-plan" aria-label="'+t('Tuition arrangement','學費安排')+'"><option value="intro">'+t('1 introductory lesson + Oct–Nov block','1 堂單堂課程 + 10 至 11 月課程')+'</option><option value="block">'+t('Oct–Nov block only','只報讀 10 至 11 月課程')+'</option></select>')+'<div class="notice blue">'+t('Assessment on '+dateLabel(a.assessmentDate)+'. Enrolment today qualifies for a '+money(credit)+' deduction.','評估日期為 '+dateLabel(a.assessmentDate)+'，今天報名可扣減 '+money(credit)+'。')+'</div><p class="small muted">'+t('The sample introductory lesson is HK$250. Confirm the centre’s actual introductory rate.','示範中的單堂學費為 HK$250，實際金額以中心確認為準。')+'</p></div>',action('close-modal','Cancel','btn')+action('confirm-enrol',t('Create enrolment & invoice','確認報名及建立繳費通知'),'btn primary'));
}
function downloadText(filename,content,type='text/csv'){
 const url=URL.createObjectURL(new Blob([content],{type}));const link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function handleAction(a,id,button){
 if(a==='select-directory-student'){ui.directoryStudent=id;renderStudentWorkspace(true);$('[data-action="select-directory-student"][data-id="'+id+'"]').focus({preventScroll:true});return;}
 if(a==='profile-history-tab'){ui.profileHistoryTab=button.dataset.value;renderStudentWorkspace(true);$('[data-action="profile-history-tab"][data-value="'+ui.profileHistoryTab+'"]').focus({preventScroll:true});return;}
 if(a==='edit-profile'){
  const p=getStudentProfile(state,id);ui.profileHistoryTab='Student information';ui.profileDrafts??={};ui.profileDrafts[id]??=Object.fromEntries(PROFILE_EDIT_FIELDS.map(key=>[key,p[key]]));renderStudentWorkspace(true);$('#profile-chineseName').focus({preventScroll:true});return;
 }
 if(a==='cancel-profile-edit'){delete ui.profileDrafts[id];renderStudentWorkspace(true);$('[data-action="edit-profile"]').focus({preventScroll:true});return;}
 if(a==='save-profile-edit'){
  const form=$('#student-profile-form');if(!form||form.dataset.studentId!==id||!form.reportValidity())return;
  $$('[data-profile-field]',form).forEach(updateProfileDraft);
  try{saveStudentProfile(state,id,ui.profileDrafts[id]);delete ui.profileDrafts[id];previousState=null;persist();renderStudentWorkspace(true);toast('Student details saved.');$('[data-action="edit-profile"]').focus({preventScroll:true});}
  catch(error){const area=$('#profile-form-error');area.textContent=error.message;area.classList.add('visible');area.scrollIntoView({block:'nearest'});}return;
 }

 if(a==='show-checkin'){ui.checkInBooking=null;checkInDialog();return;}
 if(a==='parent-lesson'){parentLessonDialog(id);return;}
 if(a==='show-lesson-checkin'){ui.checkInBooking=id;checkInDialog();return;}
 if(a==='simulate-checkin'){
  let result;if(change(()=>{result=redeemCheckIn(state,ui.checkInPayload);},t('Demo scan: '+studentById(ui.familyStudent).name+' is checked in.','模擬掃描：'+studentById(ui.familyStudent).name+' 已登記出席。')))checkInDialog();return;
 }
 if(a==='list-page'){collection(button.dataset.list).page=Number(button.dataset.pageNumber);if(button.dataset.list==='conversations')ui.thread=null;renderCollection(button.dataset.list);return;}
 if(a==='list-search'){applyListSearch(button.dataset.list,$('[data-list-query="'+button.dataset.list+'"]'));return;}
 if(a==='clear-list'){delete ui.collections[button.dataset.list];renderCollection(button.dataset.list);return;}
 if(a==='choose-record-student'){chooseStudentDialog('record');return;}
 if(a==='find-schedule-student'){chooseStudentDialog('schedule');return;}
 if(a==='back-classroom'){ui.standaloneFolder=false;ui.selectedStudent=teachingBookings()[0]?.studentId||'chloe';render();return;}
 if(a==='picker-page'){ui.picker.page=Number(button.dataset.pageNumber);updatePicker();return;}
 if(a==='picker-selected'){ui.picker.scope='selected';ui.picker.query='';ui.picker.level='all';ui.picker.page=1;$('[data-change=picker-scope]').value='selected';$('[data-change=picker-level]').value='all';$('#picker-query').value='';updatePicker();return;}
 if(a==='picker-clear'){ui.picker.selected.clear();updatePicker();return;}
 if(a==='change-booking-student'){$('.student-picker').hidden=false;$('#picker-query').focus();return;}
 if(a==='pick-student'){
  ui.picker.selected=new Set([id]);
  if(ui.picker.purpose==='booking'){$('#new-student').value=id;const s=studentById(id);$('#booking-student-summary').innerHTML='<div class="between selected-student"><div class="flex">'+avatar(s,'small')+'<div><strong>'+s.name+'</strong><div class="row-meta">'+s.number+' · '+s.level+'</div></div></div>'+action('change-booking-student','Change','btn small')+'</div>';$('.student-picker').hidden=true;$('#new-date').focus();}
  else if(ui.picker.purpose==='record'){ui.selectedStudent=id;collection('lesson-records').page=1;closeModal();render();}
  else {closeModal();handleAction('student-profile',id,button);}return;
 }
 if(a==='older-messages'){ui.messageLimit=(ui.messageLimit||50)+50;render();return;}

 if(a==='new-booking'){
  startPicker('booking');
  modal('Add a lesson','<div class="form-stack">'+'<input type="hidden" id="new-student"><div id="booking-student-summary" class="small muted">Choose a student</div>'+pickerMarkup()+'<div class="field-row">'+field('Date','<input type="date" id="new-date" value="'+TODAY+'" aria-label="Lesson date">')+field('Time','<select id="new-time" aria-label="Lesson time">'+lessonTimeOptions(60,960)+'</select>')+'</div><div class="field-row">'+field('Teacher','<select id="new-tutor" aria-label="Teacher">'+tutors.map(t=>'<option value="'+t.id+'"'+(t.id===ui.scheduleTutor?' selected':'')+'>'+t.name+'</option>').join('')+'</select>')+field('Duration','<select id="new-duration" aria-label="Duration"><option value="60">60 minutes</option><option value="90">90 minutes</option><option value="30">30 minutes</option></select>')+'</div>'+field('Remark','<input id="new-note" placeholder="e.g. New student, trial lesson">')+'</div>',action('close-modal','Cancel','btn')+action('save-new-booking','Add lesson','btn primary'));
 }else if(a==='save-new-booking'){
  const b={id:uid('lesson'),studentId:$('#new-student').value,date:$('#new-date').value,start:Number($('#new-time').value),tutor:$('#new-tutor').value,duration:Number($('#new-duration').value),note:$('#new-note').value,status:'scheduled',attendance:'unmarked'};
  if(change(()=>{if(!enrolledStudents(state).some(s=>s.id===b.studentId))throw new Error('Choose an enrolled student.');const error=validateSlot(state,b);if(error)throw new Error(error);state.bookings.push(b);record(state,'Added a lesson for '+studentById(b.studentId).name);},'Lesson added'))closeModal();
 }else if(a==='confirm-move-extension'){
  const extension={approvedExpiry:$('#extension-date').value,overrideReason:$('#extension-reason').value};const move=ui.pendingMove;
  if(change(()=>moveBooking(state,move.id,{...move.slot,...extension}),'Deadline extended and lesson moved.',true)){ui.moveId=null;closeModal();render();}
 }else if(a==='makeup-book')openMakeup(id);
 else if(a==='makeup-mode')openMakeup(ui.makeupId,button.dataset.mode);
 else if(a==='extend-makeup'){
  const m=state.makeups.find(m=>m.id===id);
  modal('Extend make-up deadline','<div class="form-stack">'+field('New deadline','<input type="date" id="makeup-expiry" value="'+m.expiry+'" min="'+m.expiry+'">')+field('Reason','<input id="makeup-reason" placeholder="Reason for this exception" value="'+esc(m.reason)+'">')+'</div>',action('close-modal','Cancel','btn')+action('save-makeup-extension','Save extension','btn primary','data-id="'+id+'"'));
 }else if(a==='save-makeup-extension'){
  const expiry=$('#makeup-expiry').value,reason=$('#makeup-reason').value.trim();
  if(change(()=>{const m=state.makeups.find(m=>m.id===id);if(!expiry||expiry<m.expiry||!reason)throw new Error('Enter a valid later deadline and a reason.');m.expiry=expiry;m.reason=reason;record(state,'Extended make-up deadline for '+studentById(m.studentId).name+' to '+dateLabel(expiry));},'Deadline updated'))openMakeup(id);
 }else if(a==='confirm-makeup'){
  const slots=$$('input[name="makeup-slot"]:checked').map(el=>ui.makeupCandidates[Number(el.value)]),m=state.makeups.find(m=>m.id===ui.makeupId);
  if(change(()=>{if(!slots.length)throw new Error('Choose a replacement time.');if(ui.role==='parent'){const trial=clone(state);bookMakeup(trial,m.id,slots);state.leaveRequests.push({id:uid('request'),kind:'makeup',makeupId:m.id,studentId:m.studentId,slots,reason:slots.map(s=>dateLabel(s.date)+' '+time(s.start)+' · '+s.duration+' min').join('; '),status:'pending'});}else bookMakeup(state,m.id,slots);},ui.role==='parent'?'Times requested. The centre will confirm.':'Make-up booked. One reschedule, linked replacements.'))closeModal();
 }else if(a==='request-leave'){
  const b=state.bookings.find(b=>b.id===id);modal('Request leave','<p class="strong mb-16">'+dateLabel(b.date,{weekday:'long'})+' · '+time(b.start)+'–'+time(b.start+b.duration)+'</p>'+field('Reason','<textarea id="absence-reason" placeholder="'+t('Let the centre know why you cannot attend.','請填寫未能上課的原因。')+'"></textarea>')+'<p class="small muted mt-16">'+t('You can arrange the replacement after your leave is approved.','請假獲確認後，你可以再安排補堂。')+'</p>',action('close-modal','Cancel','btn')+action('send-leave-request','Send request','btn primary','data-id="'+id+'"'));
 }else if(a==='send-leave-request'){const reason=$('#absence-reason').value;if(change(()=>requestAbsence(state,id,reason),'Leave request sent to the centre.'))closeModal();}
 else if(a==='approve-absence'){change(()=>{const r=state.leaveRequests.find(r=>r.id===id);if(r.kind==='makeup'){bookMakeup(state,r.makeupId,r.slots);r.status='approved';}else approveAbsence(state,id);},'Request approved. The schedules are updated.');}
 else if(a==='decline-absence'){change(()=>{state.leaveRequests.find(r=>r.id===id).status='declined';},'Request declined.');}
 else if(a==='select-student'){collection('folder-work').page=1;ui.selectedStudent=id;ui.folderTab='All work';render();}
 else if(a==='folder-tab'){collection('folder-work').page=1;ui.folderTab=button.dataset.value;render();}
 else if(a==='open-folder'){ui.page='classroom';render();}
 else if(a==='mark-class-present'){
  const bookings=teachingBookings();
  modal('Class attendance','<p class="small muted mb-16">Check the students who are present.</p><div class="form-stack" style="gap:9px">'+bookings.map(b=>'<label class="check-option"><input type="checkbox" name="attendance" value="'+b.id+'" '+(b.attendance!=='absent'?'checked':'')+'>'+avatar(studentById(b.studentId),'small')+'<span>'+studentById(b.studentId).name+'</span></label>').join('')+'</div>',action('close-modal','Cancel','btn')+action('save-attendance','Save attendance','btn primary'));
 }else if(a==='save-attendance'){const fields=$$('input[name="attendance"]').map(el=>({id:el.value,checked:el.checked}));if(change(()=>fields.forEach(el=>{state.bookings.find(b=>b.id===el.id).attendance=el.checked?'present':'absent';}),'Attendance saved'))closeModal();}
 else if(a==='search-library'){ui.search=$('#library-search').value;render();}
 else if(a==='assign-worksheet'){assignmentDialog(id); }else if(a==='confirm-assignment'){
  const selected=[...ui.picker.selected],homework=$('#assign-homework').checked;
  if(change(()=>{if(!selected.length)throw new Error('Choose at least one student.');selected.forEach(studentId=>state.assignments.push({id:uid('assignment'),studentId,worksheetId:id,status:'upcoming',homework,strokes:[],feedback:[],working:'',note:'',assignedDate:TODAY}));},'Worksheet added to the selected folders.'))closeModal();
 }else if(a==='preview-worksheet'){ui.previousPage=ui.page;ui.assignmentId=null;ui.previewWorksheet=id;ui.readonly=true;ui.showOriginal=false;ui.page='worksheet';render();}
 else if(a==='open-assignment'){ui.previousPage=ui.page;ui.assignmentId=id;ui.readonly=button.dataset.readonly==='true'||ui.role==='parent';ui.showOriginal=false;ui.page='worksheet';ui.pen='pen';ui.workNotes=false;ui.expanded=false;ui.ink=ui.role==='teacher'?'#ce424b':'#35475f';render();}
 else if(a==='back-work'){ui.page=ui.previousPage||NAV[ui.role][0][0];ui.assignmentId=null;ui.readonly=false;ui.showOriginal=false;render();}
 else if(a==='pen-tool'){ui.pen=button.dataset.tool;updateDrawingTools();}
 else if(a==='toggle-work-notes'){ui.workNotes=!ui.workNotes;document.body.classList.toggle('work-notes-open',ui.workNotes);$('.drawing-tools [data-action=toggle-work-notes]')?.setAttribute('aria-expanded',String(ui.workNotes));$(ui.workNotes?'.notes-heading .icon-btn':'.drawing-tools [data-action=toggle-work-notes]')?.focus();}
 else if(a==='ink-colour'){ui.ink=button.dataset.colour;ui.pen='pen';updateDrawingTools();}
 else if(a==='undo-ink'){const assignment=currentAssignment();if(assignment&&canDraw())change(()=>{(ui.role==='teacher'?assignment.feedback:assignment.strokes).pop();});}
 else if(a==='expand-work'){ui.expanded=!ui.expanded;render();}
 else if(a==='toggle-original'){ui.showOriginal=!ui.showOriginal;render();}
 else if(a==='submit-work'){
  const assignment=currentAssignment();
  const working=$('#student-working')?.value??assignment.working;
  change(()=>{if(!canDraw()||ui.role!=='student')throw new Error('This worksheet cannot be submitted now.');assignment.working=working;assignment.submissions??=[];assignment.submissions.push({strokes:clone(assignment.strokes),working:assignment.working,date:TODAY});assignment.status='submitted';},'Handed in. Your teacher can review it now.');
 }else if(a==='return-corrections'||a==='complete-work'){
  const assignment=state.assignments.find(a=>a.id===id),note=$('#work-feedback')?.value||assignment.note;
  change(()=>{assignment.note=note;assignment.status=a==='complete-work'?'completed':'corrections';},a==='complete-work'?'Work marked complete.':'Corrections returned to the student.');
 }else if(a==='write-note'){
  const existing=state.lessonNotes.find(n=>n.studentId===id&&n.date===ui.classDate),student=studentById(id);
  modal('Lesson record · '+student.name,'<div class="form-stack">'+field('Topics covered','<input id="note-topics" value="'+esc(existing?.topics||student.focus)+'">')+field('Performance','<input id="note-performance" list="performance-options" value="'+esc(existing?.performance||'Developing understanding')+'"><datalist id="performance-options"><option>Working confidently</option><option>Developing understanding</option><option>Needs support</option></datalist>')+field('Parent-facing summary','<textarea id="note-comment" placeholder="What went well? What will you work on next?">'+esc(existing?.comment||'')+'</textarea>')+field('Homework','<input id="note-homework" value="'+esc(existing?.homework||'Complete Comparing fractions, questions 1–2.')+'">')+'</div>',action('save-note-draft','Save draft','btn','data-id="'+id+'"')+action('publish-note','Share with parent','btn primary','data-id="'+id+'"'));
 }else if(a==='save-note-draft'||a==='publish-note'){
  const note={studentId:id,date:ui.classDate,topics:$('#note-topics').value.trim(),performance:$('#note-performance').value.trim(),comment:$('#note-comment').value.trim(),homework:$('#note-homework').value.trim(),published:a==='publish-note'};
  if(change(()=>{if(!note.topics||!note.comment)throw new Error('Add the topics and a lesson summary.');const existing=state.lessonNotes.find(n=>n.studentId===id&&n.date===note.date);if(existing)Object.assign(existing,note);else state.lessonNotes.push({id:uid('note'),...note});},a==='publish-note'?'Shared in the parent’s handbook.':'Draft saved.'))closeModal();
 }else if(a==='students-tab'){ui.studentsTab=button.dataset.value;ui.search='';render();}
 else if(a==='student-profile'){
  ui.role='admin';ui.page='students';ui.studentsTab='Students';ui.directoryStudent=id;ui.profileHistoryTab='Student information';const c=collection('students');c.query=studentById(id).number;c.page=1;c.level=c.tutor=c.day=c.status='all';render();
 }else if(a==='view-student-folder'){closeModal();ui.role='teacher';ui.moveId=null;ui.page='classroom';ui.selectedStudent=id;ui.standaloneFolder=true;collection('folder-work').page=1;render();}
 else if(a==='assessment-details'){
  const assessment=state.assessment;modal('Mia Cheung · assessment','<div class="timeline"><div class="timeline-item"><span class="timeline-mark done">'+icon('check','sm')+'</span><div><h4>Assessment booked & paid</h4><p>'+dateLabel(assessment.assessmentDate)+' · HK$200</p></div></div><div class="timeline-item"><span class="timeline-mark done">'+icon('file','sm')+'</span><div><h4>Report ready</h4><p>'+esc(assessment.report)+'</p></div></div><div class="timeline-item"><span class="timeline-mark '+(assessment.enrolled?'done':'')+'">'+icon('users','sm')+'</span><div><h4>'+(assessment.enrolled?'Enrolled':'Discuss programme & enrol')+'</h4><p>Assessment deduction available until 3 October.</p></div></div></div>',action('close-modal','Close','btn')+(assessment.enrolled?'':action('enrol-mia','Enrol student','btn primary')));
 }else if(a==='enrol-mia')enrolDialog();
 else if(a==='confirm-enrol'){
  const parent=$('#enrol-parent').value.trim(),phone=$('#enrol-phone').value.trim(),date=$('#enrol-date').value,start=Number($('#enrol-time').value),plan=$('#enrol-plan').value;
  if(change(()=>{if(!parent||!phone)throw new Error('Add the parent’s name and contact number.');if(state.assessment.enrolled)throw new Error('Mia is already enrolled.');if(plan==='block'&&(date<'2026-10-01'||date>'2026-11-30'))throw new Error('For block-only enrolment, choose a first lesson in October or November.');const b={id:uid('lesson'),studentId:'mia',date,start,duration:60,tutor:'chan',status:'scheduled',attendance:'unmarked',note:'New student'};const error=validateSlot(state,b);if(error)throw new Error(error);const credit=assessmentCredit(state.assessment,TODAY);state.assessment.enrolled=true;state.assessment.parent=parent;state.assessment.phone=phone;state.assessment.status='enrolled';state.bookings.push(b);state.invoices.push({id:'INV-1029',studentId:'mia',amount:2000+(plan==='intro'?250:0)-credit,period:plan==='intro'?'Introductory lesson + Oct–Nov 2026':'Oct–Nov 2026',issued:TODAY,due:'2026-10-20',description:(plan==='intro'?'1 introductory lesson (HK$250) + ':'')+'8-lesson block'+(credit?' − HK$200 assessment deduction':''),receiptId:null,proof:false});record(state,'Enrolled Mia Cheung with '+money(credit)+' assessment deduction');},'Enrolment and first invoice created.'))closeModal();
 }else if(a==='billing-tab'){ui.billingTab=button.dataset.value;render();}
 else if(a==='report-exceptions'){ui.billingTab='Reconciliation';bankCheckUI.reset();render();}
 else if(a==='view-invoice'){
  const i=state.invoices.find(i=>i.id===id);modal(t('Invoice '+id,'繳費通知 '+id),'<div class="receipt-paper"><div class="wordmark"><img class="brand-logo" src="/brand/mathconcept-logo.png" width="2172" height="724" alt="MathConcept"></div><p class="small muted mt-16">'+t(centre.name)+'</p><dl class="detail-grid"><div><dt>' + t('Student','學生') + '</dt><dd>'+studentById(i.studentId).name+'</dd></div><div><dt>' + t('Tuition period','學費期數') + '</dt><dd>'+content(i.period)+'</dd></div><div><dt>' + t('Issued','發出日期') + '</dt><dd>'+dateLabel(i.issued)+'</dd></div><div><dt>' + t('Payment due','繳費限期') + '</dt><dd>'+dateLabel(i.due)+'</dd></div></dl><p class="small">'+esc(content(i.description))+'</p><div class="receipt-total"><span>' + t('Total','總額') + '</span><span>'+money(i.amount)+'</span></div></div>',action('close-modal','Close','btn')+(i.proof?action('view-proof','Payment proof','btn','data-id="'+id+'"'):'')+(i.receiptId?action('view-receipt','Receipt','btn primary','data-id="'+i.receiptId+'"'):action('submit-proof',i.proof?'Replace proof':'Add payment proof','btn primary','data-id="'+id+'"')));
 }else if(a==='submit-proof')proofUI.openSubmit(id);
 else if(a==='view-proof')openProof(id);
 else if(a==='view-receipt')receiptDialog(id);
 else if(a==='print-receipt')window.print();
 else if(a==='match-receipt')matchDialog(id);
 else if(a==='return-bank-review')matchDialog(id,Boolean(ui.matchDraft?.editing));
 else if(a==='change-bank-match')matchDialog(id,true);
 else if(a==='choose-bank'){ui.selectedBank=id;$$('.bank-choice').forEach(el=>{el.classList.toggle('selected',el.dataset.id===id);el.setAttribute('aria-pressed',String(el.dataset.id===id));});$('#match-comparison').innerHTML=matchComparison(state.receipts.find(r=>r.id===ui.matchReceiptId),id);}
 else if(a==='confirm-match'){
  const note=$('#reconcile-note').value;
  if(change(()=>{if(!ui.selectedBank)throw new Error('Select a bank transaction.');const result=matchReceipt(state,ui.matchReceiptId,ui.selectedBank);state.receipts.find(r=>r.id===ui.matchReceiptId).note=note;},'Bank match saved. Receipt issue date preserved.')){ui.matchDraft=null;closeModal();}
 }else if(a==='mark-report-reviewed'){change(()=>{state.reportSubmitted=true;state.reviewedMonths??={};state.reviewedMonths[ui.reportMonth]=true;record(state,'Reviewed '+dateLabel(ui.reportMonth+'-01',{day:undefined,month:'long',year:'numeric'})+' report','Centre director');},'Director review recorded. No report was sent externally.');}
 else if(a==='export-report'){
  const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
  const rows=[['Section','Receipt / bank ID','Student / bank reference','Receipt amount','Bank amount','Receipt issued','Bank credited','HQ month','Match','Date adjustment','Note']];
  state.receipts.forEach(r=>{const match=reconciliation(state,r);if(match.month===ui.reportMonth||match.status!=='Matched')rows.push(['Receipt',r.id,studentById(r.studentId).name,r.amount,match.bank?.amount||'',r.issuedDate,match.bank?.date||'',match.month||'Unallocated',match.status,match.adjustment||'',r.note]);});
  reportingTotals(state,ui.reportMonth).unmatchedBank.forEach(b=>rows.push(['Unmatched bank entry',b.id,b.reference,'',b.amount,'',b.date,b.date.slice(0,7),'Unmatched','','']));
  downloadText('MathConcept-Tsuen-Wan-'+ui.reportMonth+'-demo-report.csv','\uFEFF'+rows.map(r=>r.map(quote).join(',')).join('\r\n'));toast('Report exported with unmatched items and exceptions.');
 }else if(a==='leave-details')staffLeaveDialog(id);
 else if(a==='more-leave-history')staffLeaveDialog(ui.leaveDialogStaff,true);
 else if(a==='leave-affected-lessons'){const leave=state.staffLeave.find(l=>l.id===id);if(!leave||!['admin','teacher'].includes(ui.role)||ui.role==='teacher'&&leave.staffId!=='chan')return;ui.page='schedule';ui.scheduleTutor=leave.staffId;ui.date=leave.date;ui.weekOffset=Math.floor((Date.parse(leave.date+'T12:00:00Z')-Date.parse(WEEK[0]+'T12:00:00Z'))/(7*86400000));ui.scheduleView='day';ui.moveId=null;closeModal();render();}
 else if(a==='open-calendar-class'){const b=state.bookings.find(b=>b.id===id);if(ui.role!=='teacher'||!b||b.tutor!=='chan')return;ui.classDate=b.date;ui.classStart=b.start;ui.classTutor=b.tutor;ui.selectedStudent=b.studentId;ui.standaloneFolder=false;ui.page='classroom';closeModal();render();}
 else if(a==='set-staff-leave'){
  if(ui.role!=='admin'||!state.staff.some(s=>s.id===id))return;
  ui.leaveEditingStaff=id;
  modal(esc(tutorName(id))+' · Set leave','<div class="form-stack">'+field('Date','<input type="date" id="al-date" value="'+ui.date+'" min="'+TODAY.slice(0,4)+'-01-01" max="'+TODAY.slice(0,4)+'-12-31">')+field('Duration','<select id="al-unit"><option>Full day</option><option>AM</option><option>PM</option></select><p id="al-roster-note" class="small muted mt-8"></p>')+field('Note','<input id="al-reason" placeholder="Optional note">')+'<p id="al-affected" class="notice" hidden></p></div>',action('close-modal','Cancel','btn')+action('save-staff-leave','Save leave','btn primary','data-id="'+id+'"'));
  refreshStaffLeaveUnits();
 }else if(a==='save-staff-leave'){
  if(ui.role!=='admin'||id!==ui.leaveEditingStaff)return;
  const date=$('#al-date').value,unit=$('#al-unit').value,reason=$('#al-reason').value;
  if(change(()=>setStaffLeave(state,{staffId:id,date,unit,reason}),'Leave recorded.',true))closeModal();
 }else if(a==='remove-staff-leave'){
  if(ui.role!=='admin')return;
  const leave=state.staffLeave.find(l=>l.id===id);if(!leave)return;
  if(change(()=>cancelStaffLeave(state,id),'Leave removed. Balance updated.',true))closeModal();
 }

}
document.addEventListener('change',e=>{
 if(conversationUI.onChange(e)||proofUI.onChange(e)||bankCheckUI.onChange(e))return;
 const target=e.target,type=target.dataset.change;
 if(target.id==='al-date'){refreshStaffLeaveUnits();return;}
 if(target.id==='al-unit'){refreshStaffLeaveImpact();return;}
 if(target.dataset.profileField){updateProfileDraft(target);return;}
 if(type==='makeup-date'||type==='makeup-tutor'){ui[type==='makeup-date'?'makeupDate':'makeupTutor']=target.value;openMakeup(ui.makeupId,'single');return;}
 if(target.id==='new-duration'){const duration=Number(target.value),current=Number($('#new-time').value);$('#new-time').innerHTML=lessonTimeOptions(duration,Math.min(current,CENTRE_CLOSE-duration));return;}
 if(type==='checkin-lesson'){ui.checkInBooking=target.value;checkInDialog();return;}
 if(type==='page-size'){const c=collection(target.dataset.list);c.pageSize=Number(target.value);c.page=1;renderCollection(target.dataset.list);return;}
 if(type==='list-filter'){const c=collection(target.dataset.list);c[target.dataset.filter]=target.value;c.page=1;if(target.dataset.list==='conversations')ui.thread=null;renderCollection(target.dataset.list);return;}
 if(type==='picker-scope'||type==='picker-level'){ui.picker[type==='picker-scope'?'scope':'level']=target.value;ui.picker.page=1;updatePicker();return;}
 if(target.dataset.pickerStudent){const id=target.dataset.pickerStudent;if(target.checked)ui.picker.selected.add(id);else ui.picker.selected.delete(id);updatePicker();$('[data-picker-student="'+id+'"]')?.focus();return;}
 if(type==='library-filter'){ui.libraryFilter=target.value;render();}
 else if(type==='class-session'){ui.standaloneFolder=false;const [date,start,tutor]=target.value.split('|');ui.classDate=date;ui.classStart=Number(start);ui.classTutor=tutor;ui.selectedStudent=teachingBookings()[0]?.studentId||'chloe';render();}
 else if(type==='record-student'){ui.selectedStudent=target.value;render();}
 else if(type==='family-student'){ui.familyStudent=target.value;ui.thread='thread-'+target.value;render();}
 else if(type==='report-month'){collection('matched').page=1;collection('exceptions').page=1;ui.reportMonth=target.value;render();}
 else if(target.id==='student-working'&&currentAssignment()&&ui.role==='student'&&canDraw()){currentAssignment().working=target.value;persist();}
 else if(target.id==='work-feedback'&&currentAssignment()&&ui.role==='teacher'){currentAssignment().note=target.value;persist();}
});
document.addEventListener('keydown',e=>{if(conversationUI.onKeyDown(e))return;if(e.target.matches('[data-action=teacher-tab]')&&['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const index=tutors.findIndex(t=>t.id===ui.scheduleTutor);ui.scheduleTutor=tutors[e.key==='Home'?0:e.key==='End'?tutors.length-1:(index+(e.key==='ArrowRight'?1:-1)+tutors.length)%tutors.length].id;render();$('#teacher-tab-'+ui.scheduleTutor).focus();return;}if(ui.role==='admin'&&ui.moveId&&e.target.matches('[data-slot]')&&['Enter',' '].includes(e.key)){e.preventDefault();moveTo(ui.moveId,{date:e.target.dataset.date,start:Number(e.target.dataset.start),tutor:e.target.dataset.tutor});return;}if(e.key==='Enter'&&e.target.dataset.listQuery){e.preventDefault();clearTimeout(searchTimer);applyListSearch(e.target.dataset.listQuery,e.target);}else if(e.key==='Enter'&&e.target.id==='library-search')$('[data-action="search-library"]').click();else if(e.key==='Enter'&&e.target.id==='student-search')$('[data-action="search-students"]').click();});
document.addEventListener('submit',e=>{if(e.target.id==='student-profile-form'){e.preventDefault();handleAction('save-profile-edit',e.target.dataset.studentId);}});
let searchTimer;
document.addEventListener('input',e=>{
 if(conversationUI.onInput(e)||bankCheckUI.onInput(e))return;
 if(e.target.dataset.profileField){updateProfileDraft(e.target);return;}
 if(e.target.id==='picker-query'){ui.picker.query=e.target.value;ui.picker.page=1;updatePicker();return;}
 if(e.target.dataset.listQuery){const input=e.target;clearTimeout(searchTimer);searchTimer=setTimeout(()=>{if(input.isConnected)applyListSearch(input.dataset.listQuery,input);},180);return;}
 const assignment=currentAssignment();if(!assignment)return;
 if(e.target.id==='student-working'&&ui.role==='student'&&canDraw()){assignment.working=e.target.value;persist();}
 else if(e.target.id==='work-feedback'&&ui.role==='teacher'){assignment.note=e.target.value;persist();}
});
document.addEventListener('dragstart', e=>{const chip=e.target.closest('.booking-chip[draggable=true]');if(chip){e.dataTransfer.setData('text/plain',chip.dataset.id);e.dataTransfer.effectAllowed='move';}});
document.addEventListener('dragover',e=>{const slot=e.target.closest('[data-slot]');if(slot){e.preventDefault();slot.classList.add('drag-over');}});
document.addEventListener('dragleave',e=>{const slot=e.target.closest('[data-slot]');if(slot&&!slot.contains(e.relatedTarget))slot.classList.remove('drag-over');});
document.addEventListener('drop',e=>{if(ui.role!=='admin')return;const slot=e.target.closest('[data-slot]');if(slot){e.preventDefault();slot.classList.remove('drag-over');const id=e.dataTransfer.getData('text/plain');if(state.bookings.some(b=>b.id===id))moveTo(id,{date:slot.dataset.date,start:Number(slot.dataset.start),tutor:slot.dataset.tutor});}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if($('#overlay').children.length)closeModal();else if(ui.workNotes){ui.workNotes=false;document.body.classList.remove('work-notes-open');const trigger=$('.drawing-tools [data-action=toggle-work-notes]');trigger?.setAttribute('aria-expanded','false');trigger?.focus();}else if(ui.moveId){ui.moveId=null;render();}else $('.sidebar')?.classList.remove('open');}if(e.key==='Tab'&&$('.modal')){const focusables=$$('button,input,select,textarea,a[href]', $('.modal')).filter(el=>!el.disabled&&el.offsetParent!==null);const first=focusables[0],last=focusables.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}});
render();
if(document.modelContext?.registerTool){
 const lifecycle=new AbortController();
 const register=tool=>{try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
 register({name:'navigate_demo',title:'Open a MathConcept demo view',description:'Switch the visible demo role and screen. Does not modify lesson or financial records.',inputSchema:{type:'object',properties:{role:{type:'string',enum:['admin','teacher','parent','student']},page:{type:'string'}},required:['role'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!NAV[input?.role])throw new Error('Unknown demo role.');const target=input.page||NAV[input.role][0][0];if(!NAV[input.role].some(([page])=>page===target))throw new Error('Unknown screen for this role.');closeModal();ui.role=input.role;ui.page=target;ui.moveId=null;ui.assignmentId=null;ui.standaloneFolder=false;render();return{role:ui.role,page:ui.page};}});
 register({name:'read_demo_summary',title:'Read the current demo summary',description:'Read a compact summary of the visible role, pending make-up requests and receipt matching. Fictional demonstration data only.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(){return{role:ui.role,page:ui.page,worksheet:currentAssignment()?{status:currentAssignment().status,studentStrokes:currentAssignment().strokes.length,teacherStrokes:currentAssignment().feedback.length,working:currentAssignment().working,submissions:currentAssignment().submissions?.length||0}:null,pendingRequests:state.leaveRequests.filter(r=>r.status==='pending').length,makeups:state.makeups.map(m=>({student:studentById(m.studentId).name,remainingMinutes:m.minutes-m.used,expiry:m.expiry,period:m.period})),centre:{enrolled:enrolledStudents(state).length,invoices:state.invoices.length,conversations:state.messages.length},attendance:state.bookings.filter(b=>b.date===TODAY&&b.attendance==='present').map(b=>({studentId:b.studentId,bookingId:b.id})),receipts:state.receipts.slice(0,10).map(r=>({id:r.id,issued:r.issuedDate,...(({status,adjustment,month})=>({status,adjustment,bankMonth:month}))(reconciliation(state,r))}))};}});
 addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
