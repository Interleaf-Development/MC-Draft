import { TODAY, WEEK, seed, clone, uid, time, dateLabel, money, students, studentById, worksheets, worksheetById, tutors, activeBooking, validateSlot, moveBooking, requestAbsence, approveAbsence, bookMakeup, usedReschedules, issueReceipt, reconciliation, matchReceipt, reportingTotals, assessmentCredit, staffBalance, record, cycleForDate, enrolledStudents, filterStudents, paginate, seedCentreVolume, seedTeacherSchedules, CENTRE_OPEN, CENTRE_CLOSE, HALF_DAY_BOUNDARY } from './model.js';
import { makeCheckInPass, qrSvg, redeemCheckIn } from './checkin.js';
const STORAGE = 'mathconcept-demo-v4';
let state;
try { const saved = JSON.parse(localStorage.getItem(STORAGE)); state = saved?.version === 4 ? saved : seed(); } catch { state = seed(); }
seedCentreVolume(state);seedTeacherSchedules(state);
const ui = { role: 'admin', page: 'schedule', scheduleView: 'week', scheduleTutor:'chan', date: TODAY, weekOffset: 0, selectedStudent: 'chloe', familyStudent: 'chloe', folderTab: 'All work', billingTab: 'Invoices', studentsTab: 'Students', libraryFilter: 'All topics', search: '', thread: 'thread-chloe', moveId: null, assignmentId: null, pen: 'pen', ink: '#35475f', expanded: false, reportMonth: '2026-09', classDate:TODAY, classStart:960, classTutor:'chan' };
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
const action = (name, label, cls = 'btn', attrs = '') => '<button type="button" class="' + cls + '" data-action="' + name + '" ' + attrs + '>' + label + '</button>';
const avatar = (s, cls = '') => '<span class="avatar ' + s.colour + ' ' + cls + '">' + s.initials + '</span>';
const tag = (text, cls = '') => '<span class="badge ' + cls + '">' + esc(text) + '</span>';
const art = (n, cls = '', alt = '') => '<img src="/brand/Asset%20' + n + '.svg" class="' + cls + '" alt="' + esc(alt) + '">';
const empty = (title, message = '', asset = null) => '<div class="empty">' + (asset ? art(asset) : icon('circlecheck')) + '<h3>' + esc(title) + '</h3><p class="small">' + esc(message) + '</p></div>';
const heading = (title, right = '') => '<h1 class="visually-hidden">' + title + '</h1>' + (right ? '<div class="page-heading page-actions"><div class="flex">' + right + '</div></div>' : '');
const tabs = (items, active, type) => '<div class="tabs">' + items.map(item => action(type, item, item === active ? 'active' : '', 'data-value="' + esc(item) + '"')).join('') + '</div>';
const field = (label, input) => {const id=input.match(/\bid="([^"]+)"/)?.[1];return '<div class="field"><label'+(id?' for="'+esc(id)+'"':'')+'>' + label + '</label>' + input + '</div>';};
const regularLabel = s => s.id==='mia'&&state.assessment.enrolled ? (()=>{const b=state.bookings.find(b=>b.studentId==='mia'&&activeBooking(b));return b?dateLabel(b.date,{weekday:'long',day:undefined,month:undefined})+' · '+time(b.start):'Time to be confirmed';})() : s.regular;

const toast = (message, undo = false, error = false) => {
  const el = document.createElement('div'); el.className = 'toast' + (error ? ' error' : '');
  el.innerHTML = icon(error ? 'info' : 'check') + '<span>' + esc(message) + '</span>' + (undo ? action('undo-state', 'Undo', '') : '');
  $('#notifications').append(el); setTimeout(() => el.remove(), undo ? 10000 : 5000);
};
function persist() { try { localStorage.setItem(STORAGE, JSON.stringify(state)); } catch { toast('Browser storage is full. Changes will last for this session.', false, true); } }
function change(fn, message = '', undo = false) {
  const before = clone(state);
  try { fn(); previousState = undo ? before : null; persist(); render(); if (message) toast(message, undo); return true; }
  catch (err) { state=before; const area = $('#form-error'); if (area) { area.textContent = err.message; area.classList.add('visible'); } else toast(err.message, false, true); return false; }
}
function closeModal() { $('#overlay').innerHTML = ''; document.body.style.overflow = ''; if (returnFocus?.isConnected) returnFocus.focus(); }
function modal(title, body, footer = '', wide = false) {
  returnFocus = document.activeElement;
  $('#overlay').innerHTML = '<div class="modal-backdrop" data-backdrop><section class="modal ' + (wide ? 'wide' : '') + '" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-head"><h2 id="modal-title" class="modal-title">' + title + '</h2>' + action('close-modal', icon('x'), 'icon-btn', 'aria-label="Close dialog"') + '</div><div class="modal-body"><div id="form-error" class="form-error" role="alert"></div>' + body + '</div>' + (footer ? '<div class="modal-footer">' + footer + '</div>' : '') + '</section></div>';
  document.body.style.overflow = 'hidden'; setTimeout(() => $('.modal input:not([type=hidden]), .modal select, .modal button')?.focus(), 30);
}
const NAV = {
 admin: [['schedule','calendar','Schedule'],['students','users','Students'],['billing','wallet','Billing & reconciliation'],['messages','message','Conversations'],['staff','briefcase','Staff & leave'],['calendar','settings','Centre calendar']],
 teacher: [['classroom','users','My classroom'],['library','book','Worksheet library'],['notes','file','Lesson records'],['roster','calendar','My roster & leave']],
 parent: [['overview','home','Overview'],['lessons','calendar','Lessons'],['handbook','book','Handbook'],['payments','wallet','Payments'],['messages','message','Messages']],
 student: [['work','edit','My work'],['past','folder','Past work']]
};
const identity = () => ui.role === 'admin' ? { name: 'Grace Lee', title: 'Centre manager', initials: 'GL', colour: 'slate' } : ui.role === 'teacher' ? { name: 'Koko', title: 'Teacher', initials: 'KO', colour: 'blue' } : ui.role === 'parent' ? { name: studentById(ui.familyStudent).parent, title: studentById(ui.familyStudent).name + ' · ' + studentById(ui.familyStudent).level, initials: 'PC', colour: 'rose' } : studentById(ui.familyStudent);
function render() {
  const nav = NAV[ui.role]; const user = identity();
  const pageKey=ui.role+'|'+ui.page+'|'+(ui.assignmentId||'');
  const oldPaper=$('.paper-wrap');
  const paperScroll=pageKey===lastPageKey&&oldPaper?{top:oldPaper.scrollTop,left:oldPaper.scrollLeft}:null;
  document.body.className = 'role-' + ui.role + (ui.page === 'worksheet' ? ' worksheet-open' : '') + (ui.workNotes ? ' work-notes-open' : '') + (ui.page === 'messages' ? ' messages-open' : '');
  $('#app').innerHTML = '<div class="app-shell"><aside class="sidebar"><div class="wordmark">Math<span>Concept</span></div><div class="centre-label">Demo Centre · Hong Kong</div><div class="nav-section">' + ({admin:'Centre',teacher:'Teaching',parent:'Family',student:'My classroom'}[ui.role]) + '</div><nav class="nav-list" aria-label="Main navigation">' + nav.map(([id, ic, label]) => action('navigate', icon(ic) + '<span>' + label + '</span>', 'nav-item' + (ui.page === id ? ' active' : ''), 'data-page="' + id + '"' + (ui.page === id ? ' aria-current="page"' : ''))).join('') + '</nav><div class="sidebar-bottom"><div class="flex">' + avatar(user) + '<div><div class="small strong">' + esc(user.name) + '</div><div class="user-caption">' + esc(user.title || user.level) + '</div></div></div></div></aside><header class="topbar"><div class="mobile-brand">' + action('toggle-menu', icon('menu'), 'icon-btn mobile-menu', 'aria-label="Open navigation"') + '<span class="wordmark">Math<span>Concept</span></span></div><div class="role-switch" role="group" aria-label="Demo role">' + ['admin','teacher','parent','student'].map(r => action('role', r[0].toUpperCase() + r.slice(1), ui.role === r ? 'active' : '', 'data-role="' + r + '" aria-pressed="' + (ui.role === r) + '"')).join('') + '</div><div class="topbar-actions"><span class="date">Wednesday, 30 September 2026</span>' + action(ui.role==='parent'?'demo-controls':'demo-info', 'Demo', 'demo-label', 'aria-label="'+(ui.role==='parent'?'Demo controls':'About this demo')+'"') + action('reset-demo', icon('reset') + '<span class="reset-label">Reset</span>', 'btn ghost small', 'aria-label="Reset demo"') + '</div></header><main class="main ' + (['parent','student'].includes(ui.role) ? 'family-main' : '') + '" id="main-content">' + page() + '</main><nav class="mobile-bottom-nav" aria-label="Mobile navigation">' + nav.slice(0,5).map(([id,ic,label]) => action('navigate', icon(ic) + '<span>' + (label === 'Billing & reconciliation' ? 'Billing' : ({'My classroom':'Classroom','My work':'My work','My roster & leave':'My leave'}[label]||label)) + '</span>', ui.page === id ? 'active' : '', 'data-page="' + id + '"')).join('') + '</nav></div>';
  attachDrawing();
  if(paperScroll&&$('.paper-wrap')){$('.paper-wrap').scrollTop=paperScroll.top;$('.paper-wrap').scrollLeft=paperScroll.left;}
  if(pageKey!==lastPageKey){window.scrollTo(0,0);lastPageKey=pageKey;}
}
function page() {
  if (ui.role === 'admin' && ui.page === 'schedule') return schedulePage();
  if (ui.role === 'admin' && ui.page === 'students') return studentsPage();
  if (ui.role === 'admin' && ui.page === 'billing') return billingPage();
  if (ui.role === 'admin' && ui.page === 'staff') return staffPage();
  if (ui.role === 'admin' && ui.page === 'calendar') return centreCalendarPage();
  if (ui.page === 'messages') return messagesPage();
  if (ui.role === 'teacher' && ui.page === 'classroom') return classroomPage();
  if (ui.role === 'teacher' && ui.page === 'library') return libraryPage();
  if (ui.role === 'teacher' && ui.page === 'notes') return notesPage();
  if (ui.role === 'teacher' && ui.page === 'roster') return rosterPage();
  if (ui.role === 'parent' && ui.page === 'overview') return parentOverview();
  if (ui.role === 'parent' && ui.page === 'lessons') return parentLessons();
  if (ui.role === 'parent' && ui.page === 'handbook') return parentHandbook();
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
 return '<button class="booking-chip '+b.status+(b.sourceId?' makeup':'')+(continued?' continuation':'')+'" draggable="'+activeBooking(b)+'" data-action="booking-detail" data-id="'+b.id+'" title="'+esc(detail)+'" aria-label="'+esc(detail)+'">'+(b.attendance==='present'?icon('check','attendance-tick'):'')+(continued?'<span class="continuation-mark" aria-hidden="true">↳</span>':'')+'<span class="chip-name">'+esc(student.name)+'</span>'+(source?'<span class="chip-from">'+dateLabel(source.date)+'</span>':b.duration!==60?'<span class="chip-duration">'+(b.duration===90?'1½h':'½h')+'</span>':'')+(b.start%60&&!continued?'<span class="chip-offset">:'+String(b.start%60).padStart(2,'0')+'</span>':'')+'</button>';
}
function calendarCell(date,start,tutor,rowHeight){
 const bookings=slotBookings(date,start,tutor);
 const targetStart=start+(state.bookings.find(b=>b.id===ui.moveId)?.start%60||0);
 const onLeave=state.staffLeave.some(l=>l.staffId===tutor&&l.date===date&&l.status==='approved'&&(l.unit==='Full day'||l.unit==='AM'&&start<HALF_DAY_BOUNDARY||l.unit==='PM'&&start+60>HALF_DAY_BOUNDARY));
 return '<div class="calendar-cell'+(ui.moveId?' pick-target':'')+(onLeave?' tutor-away':'')+'" style="--row-height:'+rowHeight+'px" data-slot data-date="'+date+'" data-start="'+start+'" data-tutor="'+tutor+'"'+(ui.moveId?' tabindex="0" role="button" aria-label="Move lesson to '+esc(tutorName(tutor)+' · '+dateLabel(date)+' · '+time(targetStart))+'"':'')+'>'+bookings.map(b=>bookingChip(b,start)).join('')+(onLeave?'<span class="tutor-away-note">On leave</span>':'')+'</div>';
}
function timetable(dates,tutor){
 const days=dates.map(date=>action('schedule-date','<span class="day-name">'+dateLabel(date,{weekday:'short',day:undefined,month:undefined})+'</span><span class="day-number">'+Number(date.slice(8))+'</span>','timetable-dayhead'+(date===TODAY?' today':''),'data-date="'+date+'" aria-label="View '+dateLabel(date,{weekday:'long'})+'"')).join('');
 const rows=SCHEDULE_HOURS.map(start=>{
  const count=Math.max(0,...dates.map(date=>slotBookings(date,start,tutor).length));
  const hasLeave=dates.some(date=>state.staffLeave.some(l=>l.staffId===tutor&&l.date===date&&l.status==='approved'&&(l.unit==='Full day'||l.unit==='AM'&&start<HALF_DAY_BOUNDARY||l.unit==='PM'&&start+60>HALF_DAY_BOUNDARY)));
  const rowHeight=Math.max(40,count*24+8+(hasLeave?18:0));
  return '<div class="timetable-time" style="--row-height:'+rowHeight+'px" data-hour="'+start+'">'+time(start)+'</div>'+dates.map(date=>calendarCell(date,start,tutor,rowHeight)).join('');
 }).join('');
 return '<div class="timetable '+(ui.scheduleView==='day'?'day':'week')+'" style="--day-count:'+dates.length+'" role="group" aria-label="'+tutorName(tutor)+' schedule"><div class="timetable-corner">Time</div>'+days+rows+'<div class="timetable-end">'+time(CENTRE_CLOSE)+'</div><div class="timetable-end-fill"></div></div>';
}
function teachingBookings(){return state.bookings.filter(b=>b.date===ui.classDate&&b.start<=ui.classStart&&b.start+b.duration>ui.classStart&&b.tutor===ui.classTutor&&activeBooking(b));}
function classSelector(){
 const keys=[...new Set(state.bookings.filter(b=>activeBooking(b)&&b.tutor==='chan'&&b.date>=TODAY).map(b=>b.date+'|'+b.start+'|'+b.tutor))].sort((a,b)=>{const [ad,at]=a.split('|'),[bd,bt]=b.split('|');return ad.localeCompare(bd)||Number(at)-Number(bt);});
 return '<select class="btn" data-change="class-session" aria-label="Teaching session">'+keys.map(key=>{const [date,start]=key.split('|');return '<option value="'+key+'"'+(key===ui.classDate+'|'+ui.classStart+'|'+ui.classTutor?' selected':'')+'>'+dateLabel(date)+' · '+time(Number(start))+'</option>';}).join('')+'</select>';
}
function schedulePage(){
 if(!tutors.some(t=>t.id===ui.scheduleTutor))ui.scheduleTutor=tutors[0].id;
 const dates=ui.scheduleView==='week'?shiftedWeek():[ui.date],moving=state.bookings.find(b=>b.id===ui.moveId);
 const teacherTabs='<div class="teacher-tabs" role="tablist" aria-label="Teacher schedules">'+tutors.map(t=>action('teacher-tab',t.name,'teacher-tab'+(ui.scheduleTutor===t.id?' active':''),'id="teacher-tab-'+t.id+'" role="tab" aria-selected="'+(ui.scheduleTutor===t.id)+'" aria-controls="teacher-schedule" tabindex="'+(ui.scheduleTutor===t.id?'0':'-1')+'" data-tutor="'+t.id+'"')).join('')+'</div>';
 const dateTitle=ui.scheduleView==='week'?dateLabel(dates[0])+' – '+dateLabel(dates.at(-1),{year:'numeric'}):dateLabel(ui.date,{weekday:'long',year:'numeric'});
 return heading('Schedule',action('find-schedule-student',icon('search')+' Find student','btn')+action('new-booking',icon('plus')+' Add lesson','btn primary'),'Centre operations')+teacherTabs+(moving?'<div class="move-banner"><span>Choose a new time for <strong>'+studentById(moving.studentId).name+'</strong>.</span>'+action('cancel-move','Cancel','btn ghost small')+'</div>':'')+'<div class="schedule-layout"><section class="panel" id="teacher-schedule" role="tabpanel" aria-labelledby="teacher-tab-'+ui.scheduleTutor+'"><div class="calendar-toolbar"><div class="calendar-controls">'+action('prev-week',icon('left'),'icon-btn border','aria-label="Previous '+ui.scheduleView+'"')+action('next-week',icon('right'),'icon-btn border','aria-label="Next '+ui.scheduleView+'"')+'<span class="calendar-title">'+dateTitle+'</span>'+action('today','Today','btn small')+'</div><div class="segmented">'+action('calendar-view','Day',ui.scheduleView==='day'?'active':'','data-view="day"')+action('calendar-view','Week',ui.scheduleView==='week'?'active':'','data-view="week"')+'</div></div><div class="calendar-scroll">'+timetable(dates,ui.scheduleTutor)+'</div><div class="calendar-legend"><span><i class="legend-line"></i>Regular lesson</span><span><i class="legend-line red"></i>Rescheduled</span><span><i class="legend-line gray"></i>Original booking</span><span>'+icon('check','attendance-tick')+' Attended</span></div></section><aside class="schedule-rail stack">'+scheduleQueues()+'<div class="rail-note"><strong>Move a lesson in one step</strong>Drag a student to another time. Their original booking and the new date stay linked.</div></aside></div>';
}
function bookingDetail(id) {
  const b = state.bookings.find(x=>x.id===id), s = studentById(b.studentId), source = state.bookings.find(x=>x.id===b.sourceId);
  modal(s.name, '<div class="flex">' + avatar(s,'large') + '<div><h3>' + s.level + ' · Mathematics</h3><p class="small muted">' + s.focus + '</p></div></div><dl class="detail-grid"><div><dt>Date</dt><dd>' + dateLabel(b.date,{weekday:'long'}) + '</dd></div><div><dt>Time</dt><dd>' + time(b.start) + '–' + time(b.start+b.duration) + '</dd></div><div><dt>Teacher</dt><dd>' + tutors.find(t=>t.id===b.tutor).name + '</dd></div><div><dt>Booking</dt><dd>' + (source ? 'Rescheduled from ' + dateLabel(source.date) : b.status === 'moved' ? 'Rescheduled' : b.status === 'absent' ? 'Absent · make-up pending' : 'Regular lesson') + '</dd></div></dl>' + field('Remark','<input id="booking-note" aria-label="Booking remark" value="' + esc(b.note) + '" placeholder="Add a note for the teacher">') + (b.caseId ? '<p class="small muted mt-16">Linked to one reschedule case, including any split replacements.</p>' : ''), action('save-booking-note','Save remark','btn','data-id="'+id+'"') + (activeBooking(b) ? action('begin-move',icon('move')+' Move lesson','btn primary','data-id="'+id+'"') : ''));
}
function moveTo(id, slot) {
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
function studentDirectory(){
 const c=collection('students'),list=filterStudents(state,c),p=collectionPage('students',list),total=enrolledStudents(state).length;
 const controls='<div class="filters">'+searchControl('students','Search students','Name, student ID, parent or phone')+filterControl('students','level','Year level',[['all','All levels'],...STUDENT_LEVELS.map(x=>[x,x])])+filterControl('students','tutor','Teacher',[['all','All teachers'],...tutors.map(t=>[t.id,t.name])])+filterControl('students','day','Lesson day',[['all','All days'],...['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d=>[d,d])])+filterControl('students','status','Student status',[['all','All statuses'],['active','Active'],['paused','Paused']])+filterControl('students','sort','Sort students',[['number','Student ID'],['name','Name A–Z'],['name-desc','Name Z–A'],['level','Level']])+action('clear-list','Clear filters','btn ghost small','data-list="students"')+'</div>';
 return '<div class="between directory-summary"><span class="small muted">'+total+' enrolled students'+(list.length!==total?' · '+list.length+' matching':'')+'</span><span class="small muted">Fictional demo records</span></div>'+controls+'<section class="panel"><div class="table-scroll"><table><thead><tr><th>Student</th><th>Parent / contact</th><th>Regular lesson</th><th>Teacher</th><th>Status</th><th></th></tr></thead><tbody>'+p.items.map(s=>'<tr><td><div class="flex">'+avatar(s)+'<div class="row-title">'+s.name+'<div class="row-meta">'+s.number+' · '+s.level+'</div></div></div></td><td>'+esc(s.parent)+'<div class="row-meta">'+esc(s.phone)+'</div></td><td>'+regularLabel(s)+'</td><td>'+tutors.find(t=>t.id===s.tutor)?.name+'</td><td>'+tag(s.status==='paused'?'Paused':'Active',s.status==='paused'?'amber':'green')+'</td><td>'+action('student-profile','View','btn small','data-id="'+s.id+'" aria-label="View '+s.name+' '+s.number+'"')+'</td></tr>').join('')+'</tbody></table></div>'+(list.length?'':empty('No students found','Try another search or clear the filters.'))+pager('students',p)+'</section>';
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
 const r=state.receipts.find(r=>r.id===ui.matchReceiptId),c=collection('bank');
 const available=state.bankTransactions.filter(b=>!state.receipts.some(other=>other.id!==r.id&&other.bankId===b.id)).filter(b=>!c.query||[b.id,b.reference,b.date,b.amount].join(' ').toLowerCase().includes(c.query.toLowerCase())).sort((a,b)=>Number(b.suggestedStudent===r.studentId)-Number(a.suggestedStudent===r.studentId)||Number(b.amount===r.amount)-Number(a.amount===r.amount));
 const p=collectionPage('bank',available,10);
 return p.items.map(b=>'<button class="bank-choice '+(b.id===ui.selectedBank?'selected':'')+'" data-action="choose-bank" data-id="'+b.id+'"><div class="between"><strong class="small">'+money(b.amount)+'</strong><span class="small">'+dateLabel(b.date)+'</span></div><p class="row-meta">'+esc(b.reference)+'</p>'+(b.suggestedStudent===r.studentId?'<p class="row-meta">Student reference matches</p>':'')+'</button>').join('')+(p.total?'':empty('No bank entries found'))+pager('bank',p,true);
}
function renderCollection(key){if(key==='bank'){$('#bank-results').innerHTML=bankResults();return;}render();}
function applyListSearch(key,input){const c=collection(key);c.query=input.value;c.page=1;const focus=input.getAttribute('data-list-query'),cursor=input.selectionStart;renderCollection(key);const next=$('[data-list-query="'+focus+'"]');if(next){next.focus();if(next.type==='search')next.setSelectionRange(cursor,cursor);}}
function checkInDialog(){
 const s=studentById(ui.familyStudent);let pass;
 try{pass=makeCheckInPass(state,s.id,{bookingId:ui.checkInBooking||undefined});ui.checkInBooking=pass.booking.id;persist();}catch(err){modal('Attendance QR','<div class="empty">'+icon('calendar')+'<h3>No lesson to check in</h3><p>'+esc(err.message)+'</p></div>',action('close-modal','Close','btn'));return;}
 ui.checkInPayload=pass.payload;
 const eligible=state.bookings.filter(b=>b.studentId===s.id&&b.date===TODAY&&['scheduled','makeup'].includes(b.status)).sort((a,b)=>a.start-b.start);
 const lessonChoice=eligible.length>1?'<div class="field mt-16"><label for="checkin-lesson">Lesson</label><select id="checkin-lesson" data-change="checkin-lesson">'+eligible.map(b=>'<option value="'+b.id+'"'+(b.id===pass.booking.id?' selected':'')+'>'+time(b.start)+'–'+time(b.start+b.duration)+(b.sourceId?' · Make-up':'')+(b.attendance==='present'?' · Checked in':'')+'</option>').join('')+'</select></div>':'';
 modal('Attendance QR','<div class="checkin-pass"><div class="flex">'+avatar(s,'large')+'<div><h3>'+s.name+'</h3><p class="small muted">'+s.number+' · '+s.level+'</p></div></div>'+lessonChoice+'<div class="checkin-qr">'+qrSvg(pass.payload)+'</div><h3>'+dateLabel(pass.booking.date,{weekday:'long'})+' · '+time(pass.booking.start)+'</h3><p class="small muted mt-8">Show this code at the centre to check in.</p>'+(pass.checkedIn?'<div class="checkin-success mt-16">'+icon('circlecheck')+' Checked in</div>':'')+'<p class="small muted mt-16">Valid for this lesson on '+dateLabel(pass.booking.date)+'.</p></div>',action('close-modal','Close','btn')+action('simulate-checkin',pass.checkedIn?'Scan again (demo)':'Simulate centre scan','btn primary'));
}

function studentsPage(){
 return heading('Students',action('assessment-details',icon('plus')+' Assessment & enrolment','btn primary'))+tabs(['Students','Assessments'],ui.studentsTab,'students-tab')+(ui.studentsTab==='Students'?studentDirectory():'<section class="panel"><div class="list-row">'+avatar(studentById('mia'),'large')+'<div class="grow"><h3>Mia Cheung</h3><p class="small muted">P2 · Assessment on '+dateLabel(state.assessment.assessmentDate)+'</p></div>'+tag(state.assessment.enrolled?'Enrolled':'Report ready',state.assessment.enrolled?'green':'blue')+action('assessment-details','View assessment','btn')+'</div><div class="panel-body"><div class="notice">The HK$200 assessment deduction is available when enrolment is completed within seven days of the assessment.</div></div></section>');
}
function billingPage(){
 const receiptView=ui.billingTab==='Reconciliation',key=receiptView?'receipts':'invoices',c=collection(key);
 const pending=state.receipts.filter(r=>reconciliation(state,r).status==='Unmatched').length,differences=state.receipts.filter(r=>reconciliation(state,r).status==='Difference').length;
 const list=(receiptView?state.receipts:state.invoices).filter(item=>!c.query||matchesStudent(item.studentId,c.query)||item.id.toLowerCase().includes(c.query.toLowerCase())).filter(item=>c.status==='all'||(receiptView?reconciliation(state,item).status:item.receiptId?'issued':item.proof?'proof':'awaiting')===c.status);
 const p=collectionPage(key,list);
 const filters='<div class="filters">'+searchControl(key,receiptView?'Search receipts':'Search invoices','Student, ID, parent or reference')+filterControl(key,'status',receiptView?'Match status':'Invoice status',receiptView?[['all','All match statuses'],['Unmatched','Unmatched'],['Difference','Amount difference'],['Matched','Matched']]:[['all','All invoices'],['proof','Proof received'],['awaiting','Awaiting proof'],['issued','Receipt issued']])+action('clear-list','Clear filters','btn ghost small','data-list="'+key+'"')+'</div>';
 const invoiceRows=p.items.map(i=>{if(receiptView)return '';const s=studentById(i.studentId);return '<tr><td><div class="flex">'+avatar(s,'small')+'<div class="row-title">'+s.name+'<div class="row-meta">'+s.number+' · '+i.id+'</div></div></div></td><td><div>'+i.period+'</div><div class="row-meta">'+esc(i.description)+'</div></td><td class="strong nowrap">'+money(i.amount)+'</td><td class="nowrap">'+dateLabel(i.due)+'</td><td>'+tag(i.receiptId?'Issued':i.proof?'Proof received':'Awaiting proof',i.receiptId?'green':i.proof?'blue':'')+'</td><td class="table-actions">'+(i.receiptId?action('view-receipt','View receipt','btn small','data-id="'+i.receiptId+'"'):i.proof?action('issue-receipt','Issue receipt','btn primary small','data-id="'+i.id+'"'):action('submit-proof','Record proof','btn small','data-id="'+i.id+'"'))+'</td></tr>';}).join('');
 const receiptRows=p.items.map(r=>{if(!receiptView)return '';const match=reconciliation(state,r),s=studentById(r.studentId);return '<tr><td><div class="row-title">'+r.id+'</div><div class="row-meta">'+s.name+' · '+s.number+'</div></td><td class="strong nowrap">'+money(r.amount)+'</td><td class="nowrap">'+dateLabel(r.issuedDate)+'</td><td class="nowrap">'+(match.bank?dateLabel(match.bank.date):'<span class="muted">—</span>')+'</td><td>'+tag(match.status,match.status==='Matched'?'green':match.status==='Difference'?'red':'amber')+(match.difference?'<div class="row-meta red-text">'+money(Math.abs(match.difference))+' difference</div>':'')+'</td><td>'+(match.adjustment?tag(match.adjustment,'blue'):'<span class="muted">—</span>')+'</td><td>'+action('match-receipt',match.bank?'Review':'Match','btn small'+(!match.bank?' primary':''),'data-id="'+r.id+'"')+'</td></tr>';}).join('');
 return heading('Billing & reconciliation',action('export-report',icon('download')+' Export report','btn'))+tabs(['Invoices','Reconciliation','Director review'],ui.billingTab,'billing-tab')+(ui.billingTab==='Director review'?directorReview():(receiptView?'<div class="metric-row"><div class="metric"><p class="label">Receipts to match</p><p class="value">'+pending+'</p></div><div class="metric"><p class="label">Amount differences</p><p class="value">'+differences+'</p></div><div class="metric"><p class="label">Bank matched</p><p class="value">'+state.receipts.filter(r=>reconciliation(state,r).status==='Matched').length+'</p></div></div>':'')+filters+'<section class="panel"><div class="table-scroll"><table><thead><tr>'+(receiptView?'<th>Receipt / student</th><th>Receipt amount</th><th>Issued</th><th>Bank credited</th><th>Match</th><th>Date adjustment</th><th></th>':'<th>Student / invoice</th><th>Tuition period</th><th>Amount</th><th>Due</th><th>Receipt</th><th></th>')+'</tr></thead><tbody>'+(receiptView?receiptRows:invoiceRows)+'</tbody></table></div>'+(p.total?'':empty('No matching records','Try another search or filter.'))+pager(key,p)+'</section>'+(receiptView?'<p class="small muted mt-16">Receipt issue dates stay unchanged. The bank-credit date determines the month in the HQ report.</p>':''));
}
function directorReview(){
 const totals=reportingTotals(state,ui.reportMonth),matched=collectionPage('matched',totals.matched,15);
 const exceptions=[...totals.unresolved.map(e=>({kind:'receipt',...e})),...totals.unmatchedBank.map(bank=>({kind:'bank',bank}))],exceptionPage=collectionPage('exceptions',exceptions,15);
 const matchRows=matched.items.map(e=>'<div class="list-row"><div class="grow"><p class="small strong">'+e.receipt.id+' · '+studentById(e.receipt.studentId).name+'</p><p class="row-meta">Bank credited '+dateLabel(e.bank.date)+(e.adjustment?' · '+e.adjustment:'')+'</p></div><span class="strong small">'+money(e.bank.amount)+'</span></div>').join('');
 const exceptionRows=exceptionPage.items.map(e=>e.kind==='receipt'?'<div class="list-row"><div class="grow"><p class="small strong">'+e.receipt.id+' · '+studentById(e.receipt.studentId).name+'</p><p class="row-meta">'+(e.status==='Unmatched'?'Bank date not yet known':money(Math.abs(e.difference))+' amount difference')+'</p></div>'+action('match-receipt','Review','btn small','data-id="'+e.receipt.id+'"')+'</div>':'<div class="list-row"><div class="grow"><p class="small strong">'+esc(e.bank.reference)+'</p><p class="row-meta">'+dateLabel(e.bank.date)+' · Bank entry without a receipt match</p></div><span class="small strong">'+money(e.bank.amount)+'</span></div>').join('');
 return '<div class="filters"><select class="btn" data-change="report-month" aria-label="Reporting month"><option value="2026-09"'+(ui.reportMonth==='2026-09'?' selected':'')+'>September 2026</option><option value="2026-10"'+(ui.reportMonth==='2026-10'?' selected':'')+'>October 2026</option></select><span class="small muted">Grouped by bank-credit date</span></div><div class="two-columns"><section class="stack"><div class="panel"><div class="panel-body between"><div><p class="small muted">Matched bank receipts</p><p class="report-total mt-8">'+money(totals.total)+'</p></div>'+tag(totals.matched.length+' matched','green')+'</div>'+matchRows+(totals.matched.length?'':empty('No matched bank receipts'))+pager('matched',matched,true)+'</div><section class="panel"><div class="panel-head"><h3>Exceptions to review</h3>'+tag(exceptions.length,'amber')+'</div>'+exceptionRows+(!exceptions.length?empty('All entries accounted for'): '')+pager('exceptions',exceptionPage,true)+'</section></section><aside class="stack"><section class="panel"><div class="panel-head"><h3>Director review</h3></div><div class="panel-body"><p class="small muted">Totals and export include all records in this report, across every page. Receipts without a bank date remain unallocated.</p><div class="mt-16">'+action('mark-report-reviewed',state.reviewedMonths?.[ui.reportMonth]?'Review recorded': 'Record director review','btn primary w-full',state.reviewedMonths?.[ui.reportMonth]?'disabled':'')+'</div></div></section><section class="panel"><div class="panel-head"><h3>Activity</h3></div><div class="panel-body timeline">'+state.audit.slice(0,5).map(a=>'<div class="timeline-item"><span class="timeline-mark">'+icon('check','sm')+'</span><div><p class="small strong">'+esc(a.text)+'</p><p class="row-meta">'+esc(a.actor)+' · '+esc(a.at)+'</p></div></div>').join('')+'</div></section></aside></div>';
}
function scheduleQueues(){
 const pending=state.makeups.filter(m=>m.minutes>m.used).sort((a,b)=>a.expiry.localeCompare(b.expiry)),requests=state.leaveRequests.filter(r=>r.status==='pending');
 const filtered=pending.filter(m=>matchesStudent(m.studentId,collection('makeups').query)),makeupsPage=collectionPage('makeups',filtered,5),requestsPage=collectionPage('requests',requests,5);
 return '<section class="panel rail-card"><div class="rail-title"><h3>Pending make-ups</h3>'+tag(pending.length)+'</div>'+(pending.length>5?searchControl('makeups','Search make-ups','Student or ID'):'')+(pending.length?makeupsPage.items.map(m=>{const s=studentById(m.studentId),source=state.bookings.find(b=>b.id===m.sourceId);return '<div class="makeup-card"><div class="flex">'+avatar(s,'small')+'<div><div class="small strong">'+s.name+'</div><div class="user-caption">'+s.number+' · '+(m.minutes-m.used)+' min remaining</div></div></div><div class="makeup-meta">Missed '+dateLabel(source.date)+'<br>Use by '+dateLabel(m.expiry)+'</div>'+action('makeup-book','Find a time '+icon('arrow','sm'),'btn small w-full','data-id="'+m.id+'"')+'</div>';}).join(''):'<p class="small muted">All make-ups are booked.</p>')+pager('makeups',makeupsPage,true)+'</section><section class="panel rail-card"><div class="rail-title"><h3>Parent requests</h3>'+tag(requests.length)+'</div>'+(requests.length?requestsPage.items.map(r=>'<div class="makeup-card"><p class="small strong">'+studentById(r.studentId).name+'</p><p class="small muted mt-8">'+esc(r.reason||'Absence request')+'</p><div class="flex mt-16">'+action('approve-absence','Approve','btn small soft','data-id="'+r.id+'"')+action('decline-absence','Decline','btn small ghost','data-id="'+r.id+'"')+'</div></div>').join(''):'<div class="flex" style="align-items:flex-start">'+icon('circlecheck')+'<p class="small muted">You’re up to date.</p></div>')+pager('requests',requestsPage,true)+'</section>';
}
function staffPage(){
 const pending=state.staffLeave.filter(l=>l.status==='pending');
 return heading('Staff & leave')+'<div class="two-columns"><section class="stack">'+state.staff.map(s=>staffCard(s)).join('')+'</section><aside class="stack"><section class="panel"><div class="panel-head"><h3>Leave requests</h3>'+tag(pending.length)+'</div>'+(pending.length?pending.map(l=>{const s=state.staff.find(s=>s.id===l.staffId),affected=state.bookings.filter(b=>b.date===l.date&&b.tutor===l.staffId&&activeBooking(b)).length;return '<div class="panel-body"><p class="strong">'+s.name+'</p><p class="small muted mt-8">'+dateLabel(l.date)+' · '+l.unit+' · '+l.days+' day</p><p class="small muted mt-8">'+esc(l.reason)+'</p>'+(affected?'<div class="notice mt-16">'+affected+' student booking'+(affected===1?'':'s')+' will need schedule review.</div>':'')+'<div class="flex mt-16">'+action('approve-staff-leave','Approve','btn primary small','data-id="'+l.id+'"')+action('decline-staff-leave','Decline','btn small','data-id="'+l.id+'"')+'</div></div>';}).join(''):empty('No pending requests'))+'</section><section class="panel"><div class="panel-head"><h3>Leave policy</h3></div><div class="panel-body stack-sm"><div class="between small"><span>First year</span><strong>7 days</strong></div><div class="between small"><span>Second year</span><strong>10 days</strong></div><div class="between small"><span>Third year onward</span><strong>14 days</strong></div><div class="divider" style="margin:8px 0"></div><p class="small muted">Holiday overlaps add leave credit. Full days and AM/PM requests are tracked separately.</p></div></section></aside></div>';
}
function staffCard(s){
 const balance=staffBalance(state,s.id);
 return '<section class="panel"><div class="panel-head"><div class="flex"><span class="avatar blue">'+s.name.split(' ').slice(1).map(n=>n[0]).join('')+'</span><div><h3>'+s.name+'</h3><p class="row-meta">'+s.role+' · Year '+s.tenure+'</p></div></div><div class="small"><strong>'+balance.available+'</strong> days available</div></div><div class="panel-body"><div class="roster-grid">'+['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>'<div class="roster-header">'+d+'</div>').join('')+s.roster.map(d=>'<div class="roster-cell '+(d==='Off'?'off':d==='AM'||d==='PM'?'half':'')+'">'+d+'</div>').join('')+'</div><div class="stat-pair"><div><p class="small muted">Annual allowance</p><p class="strong mt-8">'+balance.allowance+' days</p></div><div><p class="small muted">Holiday credits</p><p class="strong mt-8">+'+balance.holidayCredit+' days</p></div></div><p class="small muted mt-16">'+balance.taken+' days used / approved · '+balance.pending+' days pending</p></div></section>';
}
function centreCalendarPage(){
 const periods=['Jan–Feb','Mar–Apr','May–Jun','Jul–Aug','Sep–Oct','Nov–Dec'];
 return heading('Centre calendar',tag('2026'),'Annual teaching plan')+'<div class="two-columns"><section class="panel"><div class="panel-head"><h3>Lesson allocation by weekday</h3><span class="small muted">Annual target: 48</span></div><div class="table-scroll"><table><thead><tr><th>Period</th>'+['Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>'<th>'+d+'</th>').join('')+'</tr></thead><tbody>'+periods.map((p,i)=>'<tr><td class="strong">'+p+'</td>'+[0,1,2,3,4,5].map(d=>'<td>'+(d===2&&i===2?tag('7','amber'):d===2&&i===3?tag('9','blue'):'8')+'</td>').join('')+'</tr>').join('')+'<tr><td class="strong">Annual total</td>'+Array(6).fill('<td class="strong green-text">48</td>').join('')+'</tr></tbody></table></div><div class="panel-footer"><p class="small muted">Illustrative allocation for discussion. Actual closure dates and billing blocks need the centre’s annual calendar.</p></div></section><aside class="stack"><section class="panel"><div class="panel-head"><h3>Calendar balancing</h3></div><div class="panel-body"><p class="small muted">A seven-lesson period may be balanced by a later nine-lesson period within the calendar year. If there is no later balancing period, arrange an extra lesson.</p><div class="notice blue mt-16">Planned centre closures are separate from a student’s absence and make-up record.</div></div></section><section class="panel"><div class="panel-body"><h3>Parent notices</h3><p class="small muted mt-8">Confirmed closures should appear on the schedule and in affected families’ upcoming lessons.</p></div></section></aside></div>';
}
function messagesPage(){
 const parent=ui.role==='parent',c=collection('conversations');
 const threads=state.messages.filter(t=>parent?t.studentId===ui.familyStudent:matchesStudent(t.studentId,c.query)&&(c.status==='all'||c.status==='followup'&&t.followUp||c.status==='reception'&&t.assignedTo==='Reception'));
 const p=collectionPage('conversations',threads,15);
 const selected=threads.find(t=>t.id===ui.thread)||p.items[0];
 if(selected)ui.thread=selected.id;
 const filters=parent?'':'<div class="filters">'+searchControl('conversations','Search conversations','Student, parent or student ID')+filterControl('conversations','status','Conversation filter',[['all','All conversations'],['followup','Needs follow-up'],['reception','Assigned to reception']])+'</div>';
 if(!selected)return heading(parent?'Messages':'Conversations',parent?childSwitch():'')+filters+'<div class="panel">'+empty(parent?'Start a conversation':'No matching conversations',parent?'Your centre is here to help.':'Try another search or filter.',14)+(parent?action('start-conversation','Message the centre','btn primary','style="margin:0 20px 20px"'):'')+'</div>';
 return heading(parent?'Messages':'Conversations',parent?childSwitch():'')+filters+'<section class="panel inbox"><div class="thread-column"><div class="thread-list">'+p.items.map(t=>{const s=studentById(t.studentId);return '<button class="thread-item '+(t.id===selected.id?'active':'')+'" data-action="thread" data-id="'+t.id+'"><div class="flex">'+avatar(s,'small')+'<div class="grow"><div class="small strong">'+(parent?'MathConcept Centre':s.parent)+'</div><div class="row-meta">'+s.name+' · '+s.number+'</div></div>'+(t.followUp&&!parent?icon('flag','sm'):'')+'</div><div class="thread-snippet">'+esc(t.messages.at(-1)?.text||'New conversation')+'</div></button>';}).join('')+'</div>'+(!parent?pager('conversations',p,true):'')+'</div><div class="conversation"><div class="chat-header between"><div><h3>'+(parent?'MathConcept Centre':studentById(selected.studentId).parent)+'</h3><p class="row-meta">'+(parent?'Reception & teaching team':studentById(selected.studentId).name+' · '+studentById(selected.studentId).number+' · '+selected.assignedTo)+'</p></div>'+(!parent?action('toggle-followup',icon('flag')+(selected.followUp?' Following up':' Follow up'),'btn small'+(selected.followUp?' soft':''),'data-id="'+selected.id+'"'):'')+'</div><div class="chat-messages">'+(selected.messages.length>(ui.messageLimit||50)?action('older-messages','Show earlier messages','btn small'):'')+selected.messages.slice(-(ui.messageLimit||50)).map(m=>'<div class="bubble '+((parent&&m.author==='parent')||(!parent&&m.author==='centre')?'own':'')+'">'+esc(m.text)+'<span class="bubble-time">'+esc(m.time)+'</span></div>').join('')+'</div><div class="chat-compose"><input id="chat-input" aria-label="Message" placeholder="Write a message…">'+action('send-message',icon('send'),'btn primary','data-id="'+selected.id+'" aria-label="Send demo message"')+'</div></div></section>';
}
const assignmentStatus = status => ({upcoming:['Up next','blue'],'in-progress':['In progress','amber'],submitted:['Ready to mark','blue'],corrections:['Corrections needed','red'],completed:['Completed','green']}[status] || [status,'']);
const thumbnail = w => '<span class="sheet-thumb '+w.colour+'"><span class="symbol">'+({Fractions:'½',Division:'÷','Word problems':'+','Number sense':'123',Decimals:'.5'}[w.topic] || '∑')+'</span><span class="line"></span><span class="line"></span></span>';
function assignmentRow(a, readonly=false){
 const w=worksheetById(a.worksheetId),st=assignmentStatus(a.status);
 return '<div class="worksheet-row">'+thumbnail(w)+'<div class="grow"><div class="row-title">'+w.title+'</div><div class="row-meta">'+w.code+' · '+w.level+(a.homework?' · Homework':'')+'</div></div>'+tag(st[0],st[1])+action('open-assignment',ui.role==='teacher'&&['submitted','corrections'].includes(a.status)?'Review':'Open','btn small','data-id="'+a.id+'"'+(readonly?' data-readonly="true"':''))+'</div>';
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
 return '<article class="panel note-card"><div class="between"><p class="note-date">'+dateLabel(n.date,{weekday:'long'})+'</p>'+tag(n.published?'Shared with parent':'Draft',n.published?'green':'amber')+'</div><h3>'+esc(n.topics)+'</h3><div class="mt-8">'+tag(n.performance,'blue')+'</div><p class="note-comment">'+esc(n.comment)+'</p>'+(n.homework?'<div class="homework-strip">'+icon('book','sm')+' <strong>Homework</strong> · '+esc(n.homework)+'</div>':'')+'</article>';
}
function notesPage(){
 const list=state.lessonNotes.filter(n=>n.studentId===ui.selectedStudent).slice().reverse(),recordPage=collectionPage('lesson-records',list,10);
 return heading('Lesson records',action('write-note',icon('plus')+' Add record','btn primary','data-id="'+ui.selectedStudent+'"'))+'<div class="filters">'+action('choose-record-student',icon('search')+' '+studentById(ui.selectedStudent).name+' · '+studentById(ui.selectedStudent).number,'btn')+'</div><div class="two-columns"><div class="stack">'+(list.length?recordPage.items.map(noteCard).join('')+pager('lesson-records',recordPage,true):empty('No lesson records yet','Add the first lesson summary.'))+'</div><aside class="helper-art"><div><h3>The digital handbook</h3><p>Published lesson summaries appear in the parent’s handbook.</p></div>'+art(10)+'</aside></div>';
}
function rosterPage(){
 const s=state.staff.find(s=>s.id==='chan'),balance=staffBalance(state,'chan');
 return heading('My roster & leave',action('request-staff-leave',icon('plus')+' Request leave','btn primary'))+'<div class="two-columns"><section class="stack">'+staffCard(s)+'<section class="panel"><div class="panel-head"><h3>My requests</h3></div>'+state.staffLeave.filter(l=>l.staffId==='chan').map(l=>'<div class="list-row"><div class="grow"><p class="strong small">'+dateLabel(l.date)+' · '+l.unit+'</p><p class="row-meta">'+esc(l.reason)+'</p></div><span class="small muted">'+l.days+' day</span>'+tag(l.status[0].toUpperCase()+l.status.slice(1),l.status==='approved'?'green':l.status==='declined'?'red':'amber')+'</div>').join('')+'</section></section><aside class="panel panel-body"><p class="small muted">Available leave</p><p class="leave-number mt-8">'+balance.available+' <span class="small muted">days</span></p><div class="divider"></div><div class="stack-sm small"><div class="between"><span>Annual allowance</span><strong>'+balance.allowance+'</strong></div><div class="between"><span>Holiday overlap credit</span><strong>+'+balance.holidayCredit+'</strong></div><div class="between"><span>Taken / approved</span><strong>−'+balance.taken+'</strong></div><div class="between muted"><span>Pending requests</span><span>'+balance.pending+'</span></div></div></aside></div>';
}
function assessmentOverview(){
 const a=state.assessment;
 return heading('Welcome, Mrs Cheung',childSwitch())+'<div class="family-grid"><section class="panel"><div class="panel-head"><h3>Assessment report</h3>'+tag('Completed','green')+'</div><div class="panel-body"><p class="small muted">'+dateLabel(a.assessmentDate)+' · P2 Mathematics</p><p class="mt-16 muted">'+esc(a.report)+'</p><div class="mt-24 flex">'+action('enrol-mia','Enrol Mia','btn primary')+action('navigate','Discuss with the centre','btn','data-page="messages"')+'</div></div></section><aside class="panel panel-body"><h3>Your assessment fee</h3><p class="small muted mt-16">HK$200 paid on '+dateLabel(a.assessmentDate)+'.</p><div class="notice mt-16">Enrol by 3 October to deduct HK$200 from the first tuition invoice.</div></aside></div>';
}
const childSwitch=()=>'<select class="btn" data-change="family-student" aria-label="Child"><option value="chloe"'+(ui.familyStudent==='chloe'?' selected':'')+'>Chloe Chan · P3</option><option value="mia"'+(ui.familyStudent==='mia'?' selected':'')+'>Mia Cheung · '+(state.assessment.enrolled?'P2':'Assessment')+'</option></select>';
function nextLessons(studentId){return state.bookings.filter(b=>b.studentId===studentId&&activeBooking(b)&&b.date>=TODAY).sort((a,b)=>a.date.localeCompare(b.date)||a.start-b.start);}
function lessonRow(b,allowLeave=false){
 const src=state.bookings.find(s=>s.id===b.sourceId);const request=state.leaveRequests.find(r=>r.bookingId===b.id&&r.status==='pending');
 return '<div class="lesson-item"><div class="date-tile '+(b.date===TODAY?'red':'')+'"><span class="month">'+dateLabel(b.date,{day:undefined,month:'short'})+'</span><span class="day">'+Number(b.date.slice(8))+'</span></div><div class="grow"><div class="strong">'+dateLabel(b.date,{weekday:'long',day:undefined,month:undefined})+' · '+time(b.start)+'–'+time(b.start+b.duration)+'</div><div class="row-meta">'+tutorName(b.tutor)+(src?' · Make-up from '+dateLabel(src.date):' · Mathematics')+'</div></div>'+(request?tag('Leave requested','amber'):allowLeave?action('request-leave','Request leave','btn small','data-id="'+b.id+'"'):'')+'</div>';
}
function parentOverview(){
 if(ui.familyStudent==='mia'&&!state.assessment.enrolled)return assessmentOverview();
 const s=studentById(ui.familyStudent),next=nextLessons(s.id)[0],notes=state.lessonNotes.filter(n=>n.studentId===s.id&&n.published).slice().reverse(),invoice=state.invoices.find(i=>i.studentId===s.id&&!i.receiptId),displayInvoice=invoice||state.invoices.filter(i=>i.studentId===s.id).at(-1);
 return heading('Hello, '+s.parent,childSwitch())+'<section class="family-banner"><div class="banner-copy"><p class="eyebrow">Next lesson · '+s.name+'</p><h2>'+(next?dateLabel(next.date,{weekday:'long'}):'Your next chapter')+'</h2><p>'+(next?time(next.start)+'–'+time(next.start+next.duration)+' · '+tutorName(next.tutor):'The centre will confirm your lesson time.')+'</p><div class="mt-16">'+action('show-checkin',icon('qr')+' Attendance QR','btn primary')+'</div></div>'+art(1,'','MathConcept friends')+'</section><div class="family-grid"><section><div class="between mb-16"><h2>Latest from the classroom</h2>'+action('navigate','All entries','inline-link','data-page="handbook"')+'</div>'+(notes.length?noteCard(notes[0]):'<div class="panel">'+empty('Your handbook is ready','Lesson updates will appear here.',15)+'</div>')+'</section><aside class="stack"><section class="panel"><div class="panel-head"><h3>Tuition</h3>'+tag(invoice?'Due '+dateLabel(invoice.due):'Receipt available',invoice?'amber':'green')+'</div><div class="panel-body"><p class="small muted">'+esc(displayInvoice?.period||'No invoice yet')+'</p><h2 class="mt-8">'+money(displayInvoice?.amount||0)+'</h2><p class="small muted mt-8">'+esc(displayInvoice?.description||'The centre will confirm tuition.')+'</p><div class="mt-16">'+action('navigate',invoice?'View invoice':'View receipt','btn w-full','data-page="payments"')+'</div></div></section><section class="panel"><div class="panel-body"><div class="flex">'+icon('message')+'<h3>Stay in touch</h3></div><p class="small muted mt-8">A question about '+s.name.split(' ')[0]+'’s lessons?</p><div class="mt-16">'+action('navigate','Message the centre '+icon('arrow','sm'),'inline-link','data-page="messages"')+'</div></div></section></aside></div>';
}
function parentLessons(){
 const id=ui.familyStudent,list=nextLessons(id),makeups=state.makeups.filter(m=>m.studentId===id),remaining=makeups.reduce((n,m)=>n+m.minutes-m.used,0);
 return heading('Lessons',childSwitch())+'<div class="checkin-entry">'+action('show-checkin',icon('qr')+' Attendance QR','btn')+'</div>'+'<div class="family-grid"><section class="panel"><div class="panel-head"><h3>Upcoming lessons</h3><span class="small muted">'+studentById(id).level+' · Mathematics</span></div>'+(list.length?list.map(b=>lessonRow(b,true)).join(''):empty('No lessons booked','Your centre will help arrange a regular time.'))+'</section><aside class="stack"><section class="panel"><div class="panel-head"><h3>Make-up lessons</h3></div><div class="panel-body"><p class="small muted">August–September block</p><div class="stat-pair"><div><div class="number">'+remaining+' <span class="small muted">min</span></div><div class="label">To arrange</div></div><div><div class="number">'+usedReschedules(state,id)+' <span class="small muted">/ 3</span></div><div class="label">Reschedules used</div></div></div></div>'+(makeups.length?makeups.map(m=>'<div class="panel-footer"><div class="between"><div><p class="small strong">'+(m.minutes-m.used)+' min remaining</p><p class="small muted">Use by '+dateLabel(m.expiry)+'</p></div>'+(m.minutes>m.used?action('makeup-book','Find a time','btn small','data-id="'+m.id+'"'):tag('Booked','green'))+'</div></div>').join(''):'')+'</section><div class="helper-art"><div><h4>We’ll find another time</h4><p>You can request leave now and arrange the replacement later.</p></div>'+art(16)+'</div></aside></div>';
}
function parentHandbook(){
 const list=state.lessonNotes.filter(n=>n.studentId===ui.familyStudent&&n.published).slice().reverse();
 const completed=state.assignments.filter(a=>a.studentId===ui.familyStudent&&['completed','corrections'].includes(a.status));
 return heading('Handbook',childSwitch())+'<div class="family-grid"><div class="stack">'+(list.length?list.map(noteCard).join(''):'<div class="panel">'+empty('No lesson updates yet','Your teacher will share an update after the lesson.',15)+'</div>')+'</div><section class="panel"><div class="panel-head"><h3>Marked work</h3></div>'+(completed.length?completed.map(a=>assignmentRow(a,true)).join(''):empty('Work will appear here','Your child’s teacher will share their marked work.'))+'</section></div>';
}
function parentPayments(){
 const invoices=state.invoices.filter(i=>i.studentId===ui.familyStudent);
 return heading('Payments',childSwitch())+'<div class="stack">'+(invoices.length?invoices.map(i=>'<section class="panel"><div class="panel-head"><div><h3>'+i.period+'</h3><p class="small muted mt-8">'+i.id+' · Issued '+dateLabel(i.issued)+'</p></div>'+tag(i.receiptId?'Receipt issued':i.proof?'Proof submitted':'Due '+dateLabel(i.due),i.receiptId?'green':i.proof?'blue':'amber')+'</div><div class="panel-body between wrap"><div><h2>'+money(i.amount)+'</h2><p class="small muted mt-8">'+esc(i.description)+'</p></div><div class="flex">'+action('view-invoice','View invoice','btn','data-id="'+i.id+'"')+(i.receiptId?action('view-receipt',icon('receipt')+' Receipt','btn primary','data-id="'+i.receiptId+'"'):i.proof?action('view-proof','View proof','btn','data-id="'+i.id+'"'):action('submit-proof',icon('upload')+' Submit payment proof','btn primary','data-id="'+i.id+'"'))+'</div></div></section>').join(''):'<div class="panel">'+empty('No invoices yet','Your centre will issue an invoice after enrolment.',14)+'</div>')+'</div>';
}
function studentWork(){
 const s=studentById(ui.familyStudent),past=ui.page==='past',assignments=state.assignments.filter(a=>a.studentId===s.id&&(past?a.status==='completed':a.status!=='completed'));
 return heading(past?'Past work':'Hi, '+s.name.split(' ')[0]+'.',childSwitch())+'<div class="family-work-grid">'+assignments.map(a=>{const w=worksheetById(a.worksheetId),st=assignmentStatus(a.status);return '<article class="work-card">'+thumbnail(w)+'<h3>'+w.title+'</h3><p class="small muted mb-16">'+(a.homework?'Homework':w.topic)+' · '+w.level+'</p>'+tag(ui.role==='student'&&a.status==='submitted'?'With your teacher':st[0],st[1])+action('open-assignment',a.status==='corrections'?'Make corrections':a.status==='in-progress'?'Continue working':a.status==='submitted'||past?'View work':'Start worksheet','btn '+(a.status==='in-progress'||a.status==='corrections'?'primary':''),'data-id="'+a.id+'"')+'</article>';}).join('')+'</div>'+(!assignments.length?'<div class="panel">'+empty(past?'Your completed work will live here':'All caught up!',past?'Keep learning, one worksheet at a time.':'Your teacher will choose what comes next.',past?7:18)+'</div>':'')+(!past?'<div class="student-past"><div class="flex">'+icon('folder')+'<span class="small">Looking for something you’ve finished?</span></div>'+action('navigate','Past work '+icon('arrow','sm'),'inline-link','data-page="past"')+'</div>':'');
}
function fraction(n,d){return '<span class="fraction"><span>'+n+'</span><span>'+d+'</span></span>';}
function paperQuestions(w){
 const q=(n,title,body)=>'<div class="question"><div class="question-title"><span class="q-number">'+n+'</span><span>'+title+'</span></div>'+body+'</div>';
 if(w.topic==='Fractions')return q(1,'Complete the equivalent fractions.','<div class="fraction-row">'+fraction(1,2)+'<span>=</span>'+fraction('<span class="answer-box"></span>',4)+'<span style="margin-left:12px">'+fraction(2,3)+'</span><span>=</span>'+fraction('<span class="answer-box"></span>',6)+'</div>')+q(2,'Shade the second bar to show the same amount.','<div class="fraction-bars"><div class="fraction-bar"><i class="fill"></i><i></i></div><div class="fraction-bar"><i></i><i></i><i></i><i></i></div></div><div class="working-lines" style="height:6.4cqw"></div>')+q(3,'Chloe shares a pizza equally with a friend. What fraction does each person get? Explain your thinking.','<div class="working-lines"></div>')+q(4,'Write two different fractions that are equal to one half.','<div class="working-lines"></div>');
 if(w.topic==='Division')return q(1,'Work out 84 ÷ 4. Show each step.','<div class="working-lines"></div>')+q(2,'Share 96 stickers equally between 6 children. How many does each child get?','<div class="working-lines"></div>')+q(3,'Find 135 ÷ 5. Check your answer with multiplication.','<div class="working-lines"></div>');
 if(w.topic==='Decimals')return q(1,'Write one half as a decimal.','<div class="working-lines" style="height:7.8cqw"></div>')+q(2,'Work out 0.5 + 0.2. Explain with a drawing.','<div class="working-lines"></div>')+q(3,'Put these in order, from smallest to largest: 0.7, 0.25, 0.5.','<div class="working-lines"></div>');
 if(w.topic==='Word problems')return q(1,'Emma buys 3 apples for HK$4 each. How much does she spend?','<div class="working-lines"></div>')+q(2,'She pays with HK$20. How much change should she receive?','<div class="working-lines"></div>')+q(3,'A basket holds 6 oranges. How many oranges are in 4 baskets? Show a drawing.','<div class="working-lines"></div>');
 return q(1,'Continue the pattern: 4, 8, 12, __, __.','<div class="working-lines" style="height:7.8cqw"></div>')+q(2,'What is the rule? Explain in your own words.','<div class="working-lines"></div>')+q(3,'Make a pattern that starts at 3 and adds 5 each time.','<div class="working-lines"></div>')+q(4,'Create your own number pattern.','<div class="working-lines" style="height:7.8cqw"></div>');
}
function currentAssignment(){return state.assignments.find(a=>a.id===ui.assignmentId);}
function canDraw(){const a=currentAssignment();return !!a&&!ui.readonly&&!ui.showOriginal&&(ui.role==='teacher'||ui.role==='student'&&['upcoming','in-progress','corrections'].includes(a.status));}
function worksheetPage(){
 const a=currentAssignment(),w=worksheetById(a?.worksheetId||ui.previewWorksheet),s=studentById(a?.studentId||ui.selectedStudent),teacher=ui.role==='teacher'&&!!a,editable=canDraw();
 return heading(w.title,action('back-work',icon('left')+' Back','btn')+(teacher?action('return-corrections','Request corrections','btn','data-id="'+a.id+'"')+action('complete-work',icon('check')+' Mark complete','btn primary','data-id="'+a.id+'"'):ui.role==='student'&&editable?action('submit-work',icon('check')+' Hand in','btn primary','data-id="'+a.id+'"'):''),s.name+' · '+w.code)+
 (ui.role==='student'&&a?.note?'<div class="notice blue worksheet-feedback"><strong>Your teacher: </strong>'+esc(a.note)+'</div>':'')+'<div class="worksheet-layout '+(ui.expanded?'expanded':'')+'"><section class="panel"><div class="drawing-tools">'+(editable?action('pen-tool',icon('edit'),'tool-btn '+(ui.pen==='pen'?'active':''),'data-tool="pen" aria-label="Pen"')+action('pen-tool',icon('eraser'),'tool-btn '+(ui.pen==='eraser'?'active':''),'data-tool="eraser" aria-label="Eraser"')+action('pen-tool',icon('move')+'<span>Move page</span>','tool-btn pan-tool '+(ui.pen==='pan'?'active':''),'data-tool="pan" aria-label="Move page"')+action('undo-ink',icon('undo'),'tool-btn','aria-label="Undo last stroke"')+['#35475f','#4167ab','#ce424b'].map(c=>action('ink-colour','','colour-tool '+(ui.ink===c?'active':''),'style="--ink-colour:'+c+'" data-colour="'+c+'" aria-label="'+(c==='#35475f'?'Graphite':c==='#4167ab'?'Blue':'Red')+' ink"')).join(''):'<span class="small muted flex">'+icon('file')+(ui.showOriginal?'Original submission':'Worksheet preview')+'</span>')+'<div class="grow"></div>'+(a?.submissions?.length?action('toggle-original',ui.showOriginal?'Latest work':'Original submission','btn small'): '')+(ui.role==='student'?action('toggle-work-notes',icon('message')+' Notes','btn','aria-expanded="'+!!ui.workNotes+'" aria-controls="worksheet-notes"'):action('expand-work',icon('expand'),'tool-btn','aria-label="Expand worksheet"'))+'</div><div class="paper-wrap"><div class="paper"><div class="paper-content"><div class="paper-label">MathConcept · '+w.level+'</div><div class="paper-title">'+w.title+'</div><div class="paper-caption">'+w.code+' · '+w.topic+'</div><div class="paper-rule"><span>Name: '+s.name+'</span><span>30 September 2026</span></div>'+paperQuestions(w)+'<div class="paper-foot"><span>MathConcept · Demonstration worksheet</span><span>1 / 1</span></div></div><canvas id="ink-canvas" class="ink-canvas" aria-label="'+(editable?'Handwriting and rough working area':'Student worksheet and annotations')+'"'+(!editable?' style="pointer-events:none"':'')+'></canvas></div></div></section><aside class="work-side" id="worksheet-notes">'+(ui.role==='student'?'<div class="between notes-heading"><h2>Notes & working</h2>'+action('toggle-work-notes',icon('x'),'icon-btn','aria-label="Close notes"')+'</div>':'')+(a?'<section class="panel"><div class="panel-head"><h3>'+(teacher?'Teacher feedback':'Your worksheet')+'</h3></div><div class="panel-body">'+tag(...assignmentStatus(a.status))+(teacher?'<div class="field mt-16"><label for="work-feedback">Comment</label><textarea id="work-feedback" placeholder="Add a hint or comment…">'+esc(a.note)+'</textarea></div>':a.note?'<p class="small mt-16">'+esc(a.note)+'</p>':'<p class="small muted mt-16">'+(editable?'Write with your pen or finger. Choose Move page to scroll. Your work saves as you go.':'Your work is saved in your folder.')+'</p>')+'</div></section><section class="panel"><div class="panel-head"><h3>Written working</h3></div><div class="panel-body"><div class="field"><label class="small muted" for="student-working">'+(editable&&ui.role==='student'?'You can type your explanation here, too.':'Student’s explanation')+'</label><textarea id="student-working" '+(ui.role!=='student'||!editable?'readonly':'')+' placeholder="Explain your thinking…">'+esc(ui.showOriginal?a.submissions?.[0]?.working||'':a.working)+'</textarea></div></div></section>':'')+'<div class="helper-art">'+art(10)+'<div><h4>Show your thinking</h4><p>Your working is just as useful as your answer.</p></div></div></aside></div>';
}
function updateDrawingTools(){
 const panning=ui.pen==='pan'||!canDraw();$('.paper')?.classList.toggle('pan-mode',panning);
 $$('[data-action=pen-tool]').forEach(b=>{b.classList.toggle('active',b.dataset.tool===ui.pen);b.setAttribute('aria-pressed',String(b.dataset.tool===ui.pen));});
 $$('[data-action=ink-colour]').forEach(b=>b.classList.toggle('active',b.dataset.colour===ui.ink));
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
  const button = e.target.closest('[data-action]');
  if (!button) {
    const slot = e.target.closest('[data-slot]');
    if (slot && ui.moveId) moveTo(ui.moveId,{ date:slot.dataset.date,start:Number(slot.dataset.start),tutor:slot.dataset.tutor });
    if (e.target.matches('[data-backdrop]')) closeModal();
    return;
  }
  const a=button.dataset.action, id=button.dataset.id;
  if (a==='navigate') { ui.page=button.dataset.page;if(ui.page==='classroom')ui.standaloneFolder=false; ui.assignmentId=null; ui.search=''; render(); }
  else if (a==='role') { closeModal(); ui.standaloneFolder=false;ui.role=button.dataset.role; ui.page=NAV[ui.role][0][0]; ui.moveId=null; ui.assignmentId=null; render(); }
  else if (a==='close-modal') closeModal();
  else if (a==='toggle-menu') $('.sidebar').classList.toggle('open');
  else if (a==='calendar-view') {ui.scheduleView=button.dataset.view;render();}
  else if (a==='teacher-tab') {ui.scheduleTutor=button.dataset.tutor;render();$('#teacher-tab-'+ui.scheduleTutor)?.focus();}
  else if (a==='schedule-date') {ui.date=button.dataset.date;ui.scheduleView='day';render();}
  else if (a==='prev-week'||a==='next-week') {const delta=a==='prev-week'?-1:1,d=new Date(ui.date+'T12:00:00');d.setDate(d.getDate()+delta*(ui.scheduleView==='week'?7:1));ui.date=d.toISOString().slice(0,10);ui.weekOffset=Math.floor((new Date(ui.date+'T12:00:00')-new Date(WEEK[0]+'T12:00:00'))/604800000);render();}
  else if (a==='today') {ui.weekOffset=0;ui.date=TODAY;render();}
  else if (a==='booking-detail') {if(ui.moveId){const slot=button.closest('[data-slot]');if(slot)moveTo(ui.moveId,{date:slot.dataset.date,start:Number(slot.dataset.start),tutor:slot.dataset.tutor});}else bookingDetail(id);}
  else if (a==='begin-move') {ui.moveId=id;closeModal();render();}
  else if (a==='cancel-move') {ui.moveId=null;render();}
  else if (a==='save-booking-note') {const value=$('#booking-note').value;change(()=>{state.bookings.find(b=>b.id===id).note=value;},'Remark saved');closeModal();}
  else if (a==='undo-state') {if(previousState){state=previousState;previousState=null;persist();render();toast('Change undone.');}}
  else if (a==='demo-controls') modal('Demo controls','<div class="form-stack">'+['admin','teacher','parent','student'].map(r=>action('role',r[0].toUpperCase()+r.slice(1),'btn'+(ui.role===r?' soft':''),'data-role="'+r+'"')).join('')+'</div>',action('reset-demo','Reset demo','btn')+action('demo-info','About this demo','btn'));
  else if (a==='demo-info') modal('About this demo','<p>This is a front-end prototype with fictional students and payments. Changes stay in this browser. No messages, payments or reports are sent to an external service.</p><p class="mt-16 muted">The demo lesson date is 30 September 2026. Sample bank transactions include month-end examples so you can try date-forward and date-back reconciliation.</p>',action('close-modal','Continue','btn primary'));
  else if (a==='reset-demo') modal('Reset the demo?','<p>Restore the original fictional students, lessons and payments. Your demo edits and handwriting in this browser will be cleared.</p>',action('close-modal','Keep my changes','btn')+action('confirm-reset','Reset demo','btn primary'));
  else if (a==='confirm-reset') {state=seed();seedCentreVolume(state);seedTeacherSchedules(state);ui.collections={};ui.picker=null;ui.standaloneFolder=false;ui.scheduleTutor='chan';previousState=null;persist();closeModal();Object.assign(ui,{assignmentId:null,selectedStudent:'chloe',familyStudent:'chloe',classDate:TODAY,classStart:960,classTutor:'chan',moveId:null,weekOffset:0,date:TODAY,thread:'thread-chloe',billingTab:'Invoices',folderTab:'All work',studentsTab:'Students',search:'',showOriginal:false,readonly:false,workNotes:false,expanded:false,pen:'pen'});ui.page=NAV[ui.role][0][0];render();toast('Demo restored.');}
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
 const filters=mode==='single'?'<div class="field-row mb-16">'+field('Date','<input type="date" id="makeup-date" data-change="makeup-date" aria-label="Make-up date" value="'+esc(ui.makeupDate)+'" min="'+TODAY+'" max="'+m.expiry+'">')+field('Teacher','<select id="makeup-tutor" data-change="makeup-tutor" aria-label="Make-up teacher">'+tutors.map(t=>'<option value="'+t.id+'"'+(t.id===ui.makeupTutor?' selected':'')+'>'+t.name+'</option>').join('')+'</select>')+'</div>':'';
 const unavailable=mode==='single'&&m.expiry>=TODAY?'No available times for this teacher on this date. Choose another date or teacher.':'No suitable times before this deadline. '+(parent?'Message the centre to discuss an extension.':'Extend the deadline to show more options.');
 modal('Arrange a make-up','<div class="between mb-16"><div><h3>'+studentById(m.studentId).name+'</h3><p class="small muted">'+remaining+' min remaining · Use by '+dateLabel(m.expiry)+'</p></div>'+(!parent?action('extend-makeup','Extend deadline','inline-link','data-id="'+id+'"'):'')+'</div><div class="segmented mb-16">'+action('makeup-mode','One lesson',mode==='single'?'active':'','data-mode="single"')+action('makeup-mode','30-minute extensions',mode==='split'?'active':'','data-mode="split"')+'</div>'+filters+'<div class="form-stack" style="gap:9px">'+candidates.map((s,i)=>'<label class="check-option"><input type="'+(mode==='split'?'checkbox':'radio')+'" name="makeup-slot" value="'+i+'"><span class="grow"><strong class="small">'+dateLabel(s.date,{weekday:'short'})+' · '+time(s.start)+'–'+time(s.start+s.duration)+'</strong><span class="row-meta" style="display:block">'+tutorName(s.tutor)+(mode==='split'?' · Extends the existing lesson':' · '+s.duration+' minutes')+'</span></span></label>').join('')+(candidates.length?'':'<p class="small muted">'+unavailable+'</p>')+'</div>'+(mode==='split'?'<div class="notice blue mt-16">Both half-hour extensions belong to the same missed lesson and use one reschedule.</div>':''),action('close-modal','Cancel','btn')+action('confirm-makeup',parent?'Request these times':'Confirm booking','btn primary',candidates.length?'':'disabled'),true);
}
function openProof(invoiceId){
 const i=state.invoices.find(i=>i.id===invoiceId);
 modal('Payment proof','<div class="receipt-paper"><p class="eyebrow">Sample bank transfer confirmation</p><h2 class="mt-16">'+money(i.amount)+'</h2><dl class="detail-grid"><div><dt>Student</dt><dd>'+studentById(i.studentId).name+'</dd></div><div><dt>Invoice</dt><dd>'+i.id+'</dd></div><div><dt>Submitted</dt><dd>'+dateLabel(i.proofDate||TODAY)+'</dd></div><div><dt>Reference</dt><dd>'+esc(i.proofReference||'FPS 910277')+'</dd></div></dl></div><p class="small muted mt-16">Demonstration evidence only. Receipt issuance and bank matching are separate steps.</p>',action('close-modal','Close','btn'));
}
function receiptDialog(receiptId){
 const r=state.receipts.find(r=>r.id===receiptId),i=state.invoices.find(i=>i.id===r.invoiceId);
 modal('Receipt '+r.id,'<div class="receipt-paper"><div class="between"><div class="wordmark">Math<span>Concept</span></div><span class="eyebrow">Receipt</span></div><p class="small muted mt-16">Demo Centre · Hong Kong</p><dl class="detail-grid"><div><dt>Receipt no.</dt><dd>'+r.id+'</dd></div><div><dt>Issued</dt><dd>'+dateLabel(r.issuedDate)+'</dd></div><div><dt>Received from</dt><dd>'+studentById(r.studentId).parent+'</dd></div><div><dt>Student</dt><dd>'+studentById(r.studentId).name+'</dd></div></dl><p class="strong small">'+esc(i?.description||'Regular programme')+'</p><p class="small muted mt-8">'+esc(i?.period||'')+' · '+r.invoiceId+'</p><div class="receipt-total"><span>Amount received</span><span>'+money(r.amount)+'</span></div><p class="small muted">Demonstration receipt · no actual payment</p></div>',action('close-modal','Close','btn')+action('print-receipt',icon('download')+' Print / save PDF','btn primary'));
}
function matchDialog(receiptId){
 const r=state.receipts.find(r=>r.id===receiptId);ui.matchReceiptId=receiptId;ui.selectedBank=r.bankId||null;
 Object.assign(collection('bank'),{page:1,query:''});
 modal('Match receipt to bank','<div class="two-columns"><section><p class="eyebrow">Centre receipt</p><h3 class="mt-16">'+r.id+' · '+studentById(r.studentId).name+'</h3><p class="report-total mt-8">'+money(r.amount)+'</p><dl class="detail-grid"><div><dt>Proof received</dt><dd>'+dateLabel(r.proofDate)+'</dd></div><div><dt>Receipt issued</dt><dd>'+dateLabel(r.issuedDate)+'</dd></div></dl><div class="notice blue">The receipt issue date will stay unchanged.</div><div id="match-comparison" class="mt-16">'+matchComparison(r,r.bankId)+'</div></section><section><p class="eyebrow mb-16">Bank statement entries</p>'+searchControl('bank','Search bank entries','Reference, amount or date')+'<div id="bank-results">'+bankResults()+'</div></section></div><div class="field mt-24"><label for="reconcile-note">Review note</label><input id="reconcile-note" value="'+esc(r.note)+'" placeholder="Add a note for the director"></div>',action('close-modal','Cancel','btn')+action('confirm-match','Save bank match','btn primary'),true);
}
function matchComparison(r,bankId){
 const b=state.bankTransactions.find(b=>b.id===bankId);if(!b)return '<p class="small muted">Select a bank entry to compare the amount and dates.</p>';
 const status=b.amount===r.amount?'Matched':'Difference',adjustment=b.date<r.issuedDate?'Date back':b.date>r.issuedDate?'Date forward':null;
 return '<div class="stack-sm">'+tag(status,status==='Matched'?'green':'red')+(adjustment?tag(adjustment,'blue'):'')+'<p class="small muted">HQ month: <strong>'+dateLabel(b.date,{day:undefined,month:'long',year:'numeric'})+'</strong></p>'+(b.amount!==r.amount?'<p class="small red-text">'+money(Math.abs(r.amount-b.amount))+' difference remains for follow-up.</p>':'')+'</div>';
}
function enrolDialog(){
 const a=state.assessment,credit=assessmentCredit(a,TODAY);
 modal('Enrol Mia Cheung','<div class="form-stack">'+field('Parent / guardian','<input id="enrol-parent" value="Mrs Cheung" aria-label="Parent name">')+field('Contact number','<input id="enrol-phone" inputmode="tel" value="9000 0000" aria-label="Contact number">')+'<div class="field-row">'+field('First lesson','<input id="enrol-date" type="date" value="2026-09-30" aria-label="First lesson date">')+field('Lesson time','<select id="enrol-time" aria-label="First lesson time"><option value="1020">17:00–18:00</option value="960">16:00–17:00</option></select>')+'</div>'+field('Tuition arrangement','<select id="enrol-plan" aria-label="Tuition arrangement"><option value="intro">1 introductory lesson + Oct–Nov block</option><option value="block">Oct–Nov block only</option></select>')+'<div class="notice blue">Assessment on '+dateLabel(a.assessmentDate)+'. Enrolment today qualifies for a '+money(credit)+' deduction.</div><p class="small muted">The sample introductory lesson is HK$250. Confirm the centre’s actual introductory rate.</p></div>',action('close-modal','Cancel','btn')+action('confirm-enrol','Create enrolment & invoice','btn primary'));
}
function downloadText(filename,content,type='text/csv'){
 const url=URL.createObjectURL(new Blob([content],{type}));const link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function handleAction(a,id,button){
 if(a==='show-checkin'){ui.checkInBooking=null;checkInDialog();return;}
 if(a==='simulate-checkin'){
  let result;if(change(()=>{result=redeemCheckIn(state,ui.checkInPayload);},'Demo scan: '+studentById(ui.familyStudent).name+' is checked in.'))checkInDialog();return;
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
  const b=state.bookings.find(b=>b.id===id);modal('Request leave','<p class="strong mb-16">'+dateLabel(b.date,{weekday:'long'})+' · '+time(b.start)+'–'+time(b.start+b.duration)+'</p>'+field('Reason','<textarea id="absence-reason" placeholder="Let the centre know why you cannot attend."></textarea>')+'<p class="small muted mt-16">You can arrange the replacement after your leave is approved.</p>',action('close-modal','Cancel','btn')+action('send-leave-request','Send request','btn primary','data-id="'+id+'"'));
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
  const s=studentById(id);modal(s.name,'<div class="flex">'+avatar(s,'large')+'<div><h3>'+s.level+' · Mathematics</h3><p class="small muted">'+s.number+' · '+esc(s.parent)+' · '+esc(s.phone)+'</p></div></div><dl class="detail-grid"><div><dt>Regular lesson</dt><dd>'+regularLabel(s)+'</dd></div><div><dt>Learning focus</dt><dd>'+s.focus+'</dd></div><div><dt>Current block</dt><dd>Aug–Sep 2026</dd></div><div><dt>Reschedules used</dt><dd>'+usedReschedules(state,id)+' / 3</dd></div></dl><p class="small muted">Pending make-up time: '+state.makeups.filter(m=>m.studentId===id).reduce((n,m)=>n+m.minutes-m.used,0)+' minutes</p>',action('close-modal','Close','btn')+action('view-student-folder','Open learning folder','btn primary','data-id="'+id+'"'));
 }else if(a==='view-student-folder'){closeModal();ui.role='teacher';ui.page='classroom';ui.selectedStudent=id;ui.standaloneFolder=true;collection('folder-work').page=1;render();}
 else if(a==='assessment-details'){
  const assessment=state.assessment;modal('Mia Cheung · assessment','<div class="timeline"><div class="timeline-item"><span class="timeline-mark done">'+icon('check','sm')+'</span><div><h4>Assessment booked & paid</h4><p>'+dateLabel(assessment.assessmentDate)+' · HK$200</p></div></div><div class="timeline-item"><span class="timeline-mark done">'+icon('file','sm')+'</span><div><h4>Report ready</h4><p>'+esc(assessment.report)+'</p></div></div><div class="timeline-item"><span class="timeline-mark '+(assessment.enrolled?'done':'')+'">'+icon('users','sm')+'</span><div><h4>'+(assessment.enrolled?'Enrolled':'Discuss programme & enrol')+'</h4><p>Assessment deduction available until 3 October.</p></div></div></div>',action('close-modal','Close','btn')+(assessment.enrolled?'':action('enrol-mia','Enrol student','btn primary')));
 }else if(a==='enrol-mia')enrolDialog();
 else if(a==='confirm-enrol'){
  const parent=$('#enrol-parent').value.trim(),phone=$('#enrol-phone').value.trim(),date=$('#enrol-date').value,start=Number($('#enrol-time').value),plan=$('#enrol-plan').value;
  if(change(()=>{if(!parent||!phone)throw new Error('Add the parent’s name and contact number.');if(state.assessment.enrolled)throw new Error('Mia is already enrolled.');if(plan==='block'&&(date<'2026-10-01'||date>'2026-11-30'))throw new Error('For block-only enrolment, choose a first lesson in October or November.');const b={id:uid('lesson'),studentId:'mia',date,start,duration:60,tutor:'chan',status:'scheduled',attendance:'unmarked',note:'New student'};const error=validateSlot(state,b);if(error)throw new Error(error);const credit=assessmentCredit(state.assessment,TODAY);state.assessment.enrolled=true;state.assessment.parent=parent;state.assessment.phone=phone;state.assessment.status='enrolled';state.bookings.push(b);state.invoices.push({id:'INV-1029',studentId:'mia',amount:2000+(plan==='intro'?250:0)-credit,period:plan==='intro'?'Introductory lesson + Oct–Nov 2026':'Oct–Nov 2026',issued:TODAY,due:'2026-10-20',description:(plan==='intro'?'1 introductory lesson (HK$250) + ':'')+'8-lesson block'+(credit?' − HK$200 assessment deduction':''),receiptId:null,proof:false});record(state,'Enrolled Mia Cheung with '+money(credit)+' assessment deduction');},'Enrolment and first invoice created.'))closeModal();
 }else if(a==='billing-tab'){ui.billingTab=button.dataset.value;render();}
 else if(a==='view-invoice'){
  const i=state.invoices.find(i=>i.id===id);modal('Invoice '+id,'<div class="receipt-paper"><div class="wordmark">Math<span>Concept</span></div><dl class="detail-grid"><div><dt>Student</dt><dd>'+studentById(i.studentId).name+'</dd></div><div><dt>Tuition period</dt><dd>'+i.period+'</dd></div><div><dt>Issued</dt><dd>'+dateLabel(i.issued)+'</dd></div><div><dt>Payment due</dt><dd>'+dateLabel(i.due)+'</dd></div></dl><p class="small">'+esc(i.description)+'</p><div class="receipt-total"><span>Total</span><span>'+money(i.amount)+'</span></div></div>',action('close-modal','Close','btn')+(!i.proof?action('submit-proof','Submit payment proof','btn primary','data-id="'+id+'"'):''));
 }else if(a==='submit-proof'){
  const i=state.invoices.find(i=>i.id===id);modal('Submit payment proof','<div class="form-stack"><div class="notice blue">Use the sample transfer below for this demo. No money will be transferred.</div><div class="receipt-paper"><p class="eyebrow">Sample transfer confirmation</p><h2 class="mt-16">'+money(i.amount)+'</h2><p class="small muted mt-8">'+studentById(i.studentId).name+' · '+id+'</p></div>'+field('Transfer reference','<input id="proof-reference" value="FPS 910277">')+field('Payment date shown on proof','<input id="proof-date" type="date" value="'+TODAY+'">')+'</div>',action('close-modal','Cancel','btn')+action('save-proof','Submit sample proof','btn primary','data-id="'+id+'"'));
 }else if(a==='save-proof'){
  const ref=$('#proof-reference').value.trim(),proofDate=$('#proof-date').value;
  if(change(()=>{if(!ref||!proofDate)throw new Error('Add a reference and date.');const i=state.invoices.find(i=>i.id===id);i.proof=true;i.proofDate=TODAY;i.claimedPaymentDate=proofDate;i.proofReference=ref;record(state,'Payment proof received for '+id,'Parent');},'Payment proof submitted. Reception can issue a receipt.'))closeModal();
 }else if(a==='view-proof')openProof(id);
 else if(a==='issue-receipt'){if(change(()=>issueReceipt(state,id),'Receipt issued. Bank matching is still pending.'))receiptDialog(state.invoices.find(i=>i.id===id).receiptId);}
 else if(a==='view-receipt')receiptDialog(id);
 else if(a==='print-receipt')window.print();
 else if(a==='match-receipt')matchDialog(id);
 else if(a==='choose-bank'){ui.selectedBank=id;$$('.bank-choice').forEach(el=>el.classList.toggle('selected',el.dataset.id===id));$('#match-comparison').innerHTML=matchComparison(state.receipts.find(r=>r.id===ui.matchReceiptId),id);}
 else if(a==='confirm-match'){
  const note=$('#reconcile-note').value;
  if(change(()=>{if(!ui.selectedBank)throw new Error('Select a bank transaction.');const result=matchReceipt(state,ui.matchReceiptId,ui.selectedBank);state.receipts.find(r=>r.id===ui.matchReceiptId).note=note;},'Bank match saved. Receipt issue date preserved.'))closeModal();
 }else if(a==='mark-report-reviewed'){change(()=>{state.reportSubmitted=true;state.reviewedMonths??={};state.reviewedMonths[ui.reportMonth]=true;record(state,'Reviewed '+(ui.reportMonth==='2026-09'?'September':'October')+' report, including listed exceptions','Centre director');},'Director review recorded. No report was sent externally.');}
 else if(a==='export-report'){
  const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
  const rows=[['Section','Receipt / bank ID','Student / bank reference','Receipt amount','Bank amount','Receipt issued','Bank credited','HQ month','Match','Date adjustment','Note']];
  state.receipts.forEach(r=>{const match=reconciliation(state,r);if(match.month===ui.reportMonth||match.status!=='Matched')rows.push(['Receipt',r.id,studentById(r.studentId).name,r.amount,match.bank?.amount||'',r.issuedDate,match.bank?.date||'',match.month||'Unallocated',match.status,match.adjustment||'',r.note]);});
  reportingTotals(state,ui.reportMonth).unmatchedBank.forEach(b=>rows.push(['Unmatched bank entry',b.id,b.reference,'',b.amount,'',b.date,b.date.slice(0,7),'Unmatched','','']));
  downloadText('MathConcept-'+ui.reportMonth+'-demo-report.csv','\uFEFF'+rows.map(r=>r.map(quote).join(',')).join('\r\n'));toast('Report exported with unmatched items and exceptions.');
 }else if(a==='thread'){ui.messageLimit=50;ui.thread=id;render();}
 else if(a==='toggle-followup'){change(()=>{const t=state.messages.find(t=>t.id===id);t.followUp=!t.followUp;});}
 else if(a==='send-message'){const text=$('#chat-input').value.trim();if(text)change(()=>{state.messages.find(t=>t.id===id).messages.push({author:ui.role==='parent'?'parent':'centre',text,time:'Now'});},'Demo message added.');}
 else if(a==='start-conversation'){change(()=>{const t={id:uid('thread'),studentId:ui.familyStudent,assignedTo:'Reception',followUp:true,messages:[]};state.messages.push(t);ui.thread=t.id;});}
 else if(a==='request-staff-leave'){
  modal('Request annual leave','<div class="form-stack">'+field('Date','<input type="date" id="al-date" value="2026-10-09">')+field('Duration','<select id="al-unit"><option>Full day</option><option>AM</option><option>PM</option></select>')+field('Reason','<input id="al-reason" placeholder="Optional note for the manager">')+'</div>',action('close-modal','Cancel','btn')+action('save-staff-leave','Submit request','btn primary'));
 }else if(a==='save-staff-leave'){
  const date=$('#al-date').value,unit=$('#al-unit').value,reason=$('#al-reason').value,days=unit==='Full day'?1:.5;
  if(change(()=>{if(!date)throw new Error('Choose a date.');const day=(new Date(date+'T12:00:00').getDay()+6)%7,roster=state.staff.find(s=>s.id==='chan').roster[day];if(roster==='Off'||roster==='AM'&&unit==='PM'||roster==='PM'&&unit==='AM')throw new Error('This is already outside your working roster.');if(state.staffLeave.some(l=>l.staffId==='chan'&&l.date===date&&l.status!=='declined'&&(l.unit===unit||l.unit==='Full day'||unit==='Full day')))throw new Error('A leave request already covers this time.');const b=staffBalance(state,'chan');if(days>b.available-b.pending)throw new Error('This request exceeds the available leave balance.');state.staffLeave.push({id:uid('al'),staffId:'chan',date,unit,days,reason,status:'pending'});},'Leave request sent to the manager.'))closeModal();
 }else if(a==='approve-staff-leave'||a==='decline-staff-leave'){change(()=>{const l=state.staffLeave.find(l=>l.id===id);if(l.status!=='pending')throw new Error('This request has already been handled.');l.status=a==='approve-staff-leave'?'approved':'declined';record(state,l.status+' staff leave for '+dateLabel(l.date)+' · '+l.unit);},a==='approve-staff-leave'?'Leave approved. Review affected lessons on the schedule.':'Leave request declined.');}
}
document.addEventListener('change',e=>{
 const target=e.target,type=target.dataset.change;
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
document.addEventListener('keydown',e=>{if(e.target.matches('[data-action=teacher-tab]')&&['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const index=tutors.findIndex(t=>t.id===ui.scheduleTutor);ui.scheduleTutor=tutors[e.key==='Home'?0:e.key==='End'?tutors.length-1:(index+(e.key==='ArrowRight'?1:-1)+tutors.length)%tutors.length].id;render();$('#teacher-tab-'+ui.scheduleTutor).focus();return;}if(ui.moveId&&e.target.matches('[data-slot]')&&['Enter',' '].includes(e.key)){e.preventDefault();moveTo(ui.moveId,{date:e.target.dataset.date,start:Number(e.target.dataset.start),tutor:e.target.dataset.tutor});return;}if(e.key==='Enter'&&e.target.dataset.listQuery){e.preventDefault();clearTimeout(searchTimer);applyListSearch(e.target.dataset.listQuery,e.target);}else if(e.key==='Enter'&&e.target.id==='chat-input'){e.preventDefault();$('[data-action="send-message"]').click();}else if(e.key==='Enter'&&e.target.id==='library-search')$('[data-action="search-library"]').click();else if(e.key==='Enter'&&e.target.id==='student-search')$('[data-action="search-students"]').click();});
let searchTimer;
document.addEventListener('input',e=>{
 if(e.target.id==='picker-query'){ui.picker.query=e.target.value;ui.picker.page=1;updatePicker();return;}
 if(e.target.dataset.listQuery){const input=e.target;clearTimeout(searchTimer);searchTimer=setTimeout(()=>{if(input.isConnected)applyListSearch(input.dataset.listQuery,input);},180);return;}
 const assignment=currentAssignment();if(!assignment)return;
 if(e.target.id==='student-working'&&ui.role==='student'&&canDraw()){assignment.working=e.target.value;persist();}
 else if(e.target.id==='work-feedback'&&ui.role==='teacher'){assignment.note=e.target.value;persist();}
});
document.addEventListener('dragstart', e=>{const chip=e.target.closest('.booking-chip[draggable=true]');if(chip){e.dataTransfer.setData('text/plain',chip.dataset.id);e.dataTransfer.effectAllowed='move';}});
document.addEventListener('dragover',e=>{const slot=e.target.closest('[data-slot]');if(slot){e.preventDefault();slot.classList.add('drag-over');}});
document.addEventListener('dragleave',e=>{const slot=e.target.closest('[data-slot]');if(slot&&!slot.contains(e.relatedTarget))slot.classList.remove('drag-over');});
document.addEventListener('drop',e=>{const slot=e.target.closest('[data-slot]');if(slot){e.preventDefault();slot.classList.remove('drag-over');const id=e.dataTransfer.getData('text/plain');if(state.bookings.some(b=>b.id===id))moveTo(id,{date:slot.dataset.date,start:Number(slot.dataset.start),tutor:slot.dataset.tutor});}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if($('#overlay').children.length)closeModal();else if(ui.workNotes){ui.workNotes=false;document.body.classList.remove('work-notes-open');const trigger=$('.drawing-tools [data-action=toggle-work-notes]');trigger?.setAttribute('aria-expanded','false');trigger?.focus();}else if(ui.moveId){ui.moveId=null;render();}else $('.sidebar')?.classList.remove('open');}if(e.key==='Tab'&&$('.modal')){const focusables=$$('button,input,select,textarea,a[href]', $('.modal')).filter(el=>!el.disabled&&el.offsetParent!==null);const first=focusables[0],last=focusables.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}});
render();
if(document.modelContext?.registerTool){
 const lifecycle=new AbortController();
 const register=tool=>{try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
 register({name:'navigate_demo',title:'Open a MathConcept demo view',description:'Switch the visible demo role and screen. Does not modify lesson or financial records.',inputSchema:{type:'object',properties:{role:{type:'string',enum:['admin','teacher','parent','student']},page:{type:'string'}},required:['role'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!NAV[input?.role])throw new Error('Unknown demo role.');const target=input.page||NAV[input.role][0][0];if(!NAV[input.role].some(([page])=>page===target))throw new Error('Unknown screen for this role.');closeModal();ui.role=input.role;ui.page=target;ui.assignmentId=null;ui.standaloneFolder=false;render();return{role:ui.role,page:ui.page};}});
 register({name:'read_demo_summary',title:'Read the current demo summary',description:'Read a compact summary of the visible role, pending make-up requests and receipt matching. Fictional demonstration data only.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(){return{role:ui.role,page:ui.page,worksheet:currentAssignment()?{status:currentAssignment().status,studentStrokes:currentAssignment().strokes.length,teacherStrokes:currentAssignment().feedback.length,working:currentAssignment().working,submissions:currentAssignment().submissions?.length||0}:null,pendingRequests:state.leaveRequests.filter(r=>r.status==='pending').length,makeups:state.makeups.map(m=>({student:studentById(m.studentId).name,remainingMinutes:m.minutes-m.used,expiry:m.expiry,period:m.period})),centre:{enrolled:enrolledStudents(state).length,invoices:state.invoices.length,conversations:state.messages.length},attendance:state.bookings.filter(b=>b.date===TODAY&&b.attendance==='present').map(b=>({studentId:b.studentId,bookingId:b.id})),receipts:state.receipts.slice(0,10).map(r=>({id:r.id,issued:r.issuedDate,...(({status,adjustment,month})=>({status,adjustment,bankMonth:month}))(reconciliation(state,r))}))};}});
 addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
