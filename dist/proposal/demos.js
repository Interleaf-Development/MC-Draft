// Demo controls stay in Hong Kong Traditional Chinese in both proposal languages.
const t = (_en, zh) => zh;

// These frames load the operational demo itself: no duplicate application UI.
const views = {
  schedule: {label:t('Schedule','時間表'), role:'admin', page:'schedule'},
  students: {label:t('Students','學生'), role:'admin', page:'students'},
  billing: {label:t('Billing & final audit','收費及最終對帳'), role:'admin', page:'billing'},
  messages: {label:t('Conversations','通訊紀錄'), role:'admin', page:'messages'},
  teacher: {label:t('Progress chart','學習進度表'), role:'teacher', page:'progress'},
  classroom: {label:t('My classroom','我的課堂'), role:'teacher', page:'classroom'},
  teacherSchedule: {label:t('My schedule','我的時間表'), role:'teacher', page:'schedule'},
  notes: {label:t('Lesson records','課堂紀錄'), role:'teacher', page:'notes'},
  student: {label:t('Student binder','學生學習冊'), role:'student', page:'work'},
  game: {label:t('Maths kart','數學飛車'), role:'game', page:'race'},
  parent: {label:t('Parent home','家長主頁'), role:'parent', page:'overview', initialStudentId:'twn-c64262b4d67d'},
  parentCalendar: {label:t('Lessons','課堂安排'), role:'parent', page:'lessons'},
  parentReports: {label:t('Lesson reports','課堂報告'), role:'parent', page:'handbook'},
  parentHomework: {label:t('Homework','功課'), role:'parent', page:'homework'},
  parentBilling: {label:t('Payments','繳費及收據'), role:'parent', page:'payments'},
  parentMessages: {label:t('Centre messages','與中心溝通'), role:'parent', page:'messages'},
  parentLessons: {label:t('Parent lessons','子女課堂安排'), role:'parent', page:'lessons', studentId:'twn-c64262b4d67d'},
  parentPayments: {label:t('Parent payments','家長繳費'), role:'parent', page:'payments', studentId:'chloe'},
  tw: {label:t('Tsuen Wan','荃灣'), role:'admin', page:'schedule', branch:'tw'},
  hh: {label:t('Hang Hau','坑口'), role:'admin', page:'schedule', branch:'hh'}
};
const scenes = {
  student: ['student'],
  game: ['game'],
  teacher: ['teacher','classroom','teacherSchedule','notes'],
  operations: ['schedule','parentLessons','messages','students'],
  billing: ['billing','parentPayments'],
  parent: ['parent','parentCalendar','parentReports','parentHomework','parentBilling','parentMessages'],
  franchise: ['tw','hh']
};
const dimensions = {admin:[1440,1000],teacher:[1440,1000],student:[1024,1366],parent:[390,844],game:[960,540]};
const selection = new Map();
const frames = new Map();
let active = null, initialised = false, notify = () => {};
const worksheetStudents = new Map();
const $ = selector => document.querySelector(selector);

export function demoIsSaving() {
  return [...frames.values()].some(entry=>entry.saving);
}
export function demoNavigationBlocked() {
  if (!demoIsSaving()) return false;
  notify(t('Saving payment review. Please wait before leaving this view.','正在儲存付款審核結果，請等候完成後再離開此頁。'));
  return true;
}
function syncSavingFrames() {
  const saving=demoIsSaving();
  for(const entry of frames.values())entry.frame.inert=saving&&!entry.saving;
}

function sourceURL(view) {
  if(view.role==='game')return '/game1/?proposal=1&proposalPreload=1&lang=zh-HK';
  const base = view.branch === 'hh' ? '/hh/' : '/';
  const path = ['parent','student'].includes(view.role) ? base+view.role+'/' : base;
  const params = new URLSearchParams({proposal:'1',proposalPreload:'1',lang:'zh-HK',role:view.role,page:view.page});
  const studentId=view.studentId||view.initialStudentId;
  if(studentId)params.set('studentId',studentId);
  return path+'?'+params;
}
function selectedView(key) {
  const view={...views[key]};
  const studentId=worksheetStudents.get(view.branch||'tw');
  if(studentId&&['teacher','student'].includes(view.role))view.studentId=studentId;
  return view;
}
function shell(id) {
  const chosen = selection.get(id)||scenes[id][0];
  return `<div class="live-demo${id==='game'?' live-demo-game':''}" data-live-demo="${id}"><div class="live-demo-toolbar"><div class="live-demo-views" role="group" aria-label="${t('Demo views','示範畫面')}">${scenes[id].map(key=>`<button type="button" data-demo-view="${key}" aria-pressed="${chosen===key}">${views[key].label}</button>`).join('')}</div>${id==='game'?`<a class="demo-full-game" href="/game1/" target="_blank" rel="noopener">${t('Open full game ↗','獨立開啟遊戲 ↗')}</a>`:''}</div><div class="demo-viewport"><div class="demo-loading" role="status">${t('Loading demo…','正在載入示範畫面…')}</div></div></div>`;
}
function sizeFrame(entry = active) {
  if (!entry || !entry.stage.clientWidth) return;
  const {frame,stage,view} = entry;
  if(view.role==='game') {
    // Keep the race in landscape, scaling the whole view on narrow screens.
    const [minimumWidth,minimumHeight]=dimensions.game;
    const width=Math.max(minimumWidth,stage.clientWidth);
    const height=width*minimumHeight/minimumWidth;
    const scale=Math.min(1,stage.clientWidth/width);
    stage.style.height=Math.ceil(height*scale)+'px';
    frame.style.width=width+'px';
    frame.style.height=height+'px';
    frame.style.transform=`scale(${scale})`;
  } else {
    const [width,height] = dimensions[view.role]||dimensions.admin;
    const scale = Math.min(1,stage.clientWidth/width,900/height);
    stage.style.height=Math.ceil(height*scale)+'px';
    frame.style.width=width+'px';
    frame.style.height=height+'px';
    frame.style.transform=`scale(${scale})`;
  }
}
function syncControls(entry = active) {
  if (!entry) return;
  for (const button of entry.box.querySelectorAll('[data-demo-view]')) {
    const view=views[button.dataset.demoView];
    const match=view.role===entry.view.role && view.page===entry.view.page && (view.branch||'tw')===(entry.view.branch||'tw');
    button.setAttribute('aria-pressed',String(match));
  }
}
function send(entry,type,details={}) {
  entry.frame.contentWindow.postMessage({type,...details},location.origin);
}
function setActive(entry) {
  if (active===entry) return true;
  if (demoIsSaving()) return false;
  if (active?.ready) send(active,'mc-proposal:deactivate');
  active=entry;
  if (active?.ready && !document.hidden) send(active,'mc-proposal:activate');
  return true;
}
function mount(id, key) {
  const host=$('#demo-'+id);
  if(!host)return null;
  const chosen=key||selection.get(id)||scenes[id][0];
  const view=selectedView(chosen);
  const existing=frames.get(id);
  if (existing && (existing.view.branch||'tw')===(view.branch||'tw')) return existing;
  if (existing) {
    if(active===existing)setActive(null);
    existing.observer?.disconnect();
    existing.visibilityObserver?.disconnect();
    clearTimeout(existing.timeout);
    existing.frame.remove();
  }
  selection.set(id,chosen);
  host.innerHTML=shell(id);
  const box=host.querySelector('.live-demo'),stage=box.querySelector('.demo-viewport');
  const frame=document.createElement('iframe');
  frame.className='actual-demo-frame';
  frame.title=t(`MathConcept demo — ${view.label}`,`MathConcept 示範 — ${view.label}`);
  frame.setAttribute('allow','fullscreen');
  frame.loading='eager';
  const entry={id,box,stage,frame,view,ready:false,pendingView:null,saving:false};
  frames.set(id,entry);
  syncSavingFrames();
  frame.src=sourceURL(view);
  stage.append(frame);
  sizeFrame(entry);
  entry.observer=new ResizeObserver(()=>sizeFrame(entry));
  entry.observer.observe(stage);
  if(view.role==='game' && typeof IntersectionObserver!=='undefined') {
    entry.visibilityObserver=new IntersectionObserver(records=>{
      const visible=records.some(record=>record.isIntersecting);
      entry.visible=visible;
      if(visible && !document.hidden)setActive(entry);
      else if(!visible && active===entry)setActive(null);
    },{threshold:0});
    entry.visibilityObserver.observe(stage);
  }
  entry.timeout=setTimeout(()=>{
    if(entry.ready || frames.get(id)!==entry)return;
    const loading=stage.querySelector('.demo-loading');
    if(loading)loading.innerHTML=`<span>${t('The demo is taking longer to load.','示範畫面仍在載入。')}</span><button type="button" data-demo-retry>${t('Retry','重新載入')}</button>`;
  },20000);
  return entry;
}
function choose(id,key) {
  if (!scenes[id]?.includes(key)) return;
  if (demoNavigationBlocked()) return;
  const view=selectedView(key);
  selection.set(id,key);
  const entry=mount(id,key);
  setActive(entry);
  entry.view=view;
  entry.frame.title=t(`MathConcept demo — ${view.label}`,`MathConcept 示範 — ${view.label}`);
  if(entry.ready)navigateFrame(entry,view);else entry.pendingView=view;
  syncControls(entry);sizeFrame(entry);
}
function navigateFrame(entry,view) {
  if(view.role==='game')return;
  if(demoIsSaving()){entry.pendingView=view;return;}
  send(entry,'mc-proposal:navigate',{role:view.role,page:view.page,...(view.studentId?{studentId:view.studentId}:{})});
}
export function activateDemo(id) {
  if (!initialised || demoIsSaving()) return;
  const scene=id==='system'?'operations':id;
  const entry=scenes[scene]?mount(scene):null;
  setActive(entry);
  if(entry)sizeFrame(entry);
}
export function initDemos(options = {}) {
  if (typeof options.notify === 'function') notify=options.notify;
  for (const id of Object.keys(scenes)) {const host=$('#demo-'+id);if(host)host.innerHTML=shell(id);}
  initialised=true;
  document.addEventListener('click',event=>{
    const box=event.target.closest('[data-live-demo]');
    const view=event.target.closest('[data-demo-view]');
    if (view&&box) choose(box.dataset.liveDemo,view.dataset.demoView);
    if (event.target.closest('[data-demo-retry]')&&box) {
      if (demoNavigationBlocked()) return;
      const entry=frames.get(box.dataset.liveDemo);
      if(entry){entry.ready=false;entry.frame.src=sourceURL(entry.view);}
    }
  });
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin)return;
    const entry=[...frames.values()].find(item=>event.source===item.frame.contentWindow);
    if(!entry)return;
    const data=event.data;
    if(data?.type==='mc-proposal:saving'){
      if(typeof data.saving!=='boolean')return;
      if(data.saving&&!demoIsSaving())setActive(entry);
      entry.saving=data.saving;
      syncSavingFrames();
      if(!demoIsSaving())for(const pending of frames.values())if(pending.ready&&pending.pendingView){
        const view=pending.pendingView;pending.pendingView=null;navigateFrame(pending,view);
      }
      return;
    }
    if(data?.type==='mc-proposal:focused'){setActive(entry);return;}
    if(!data||!['mc-proposal:ready','mc-proposal:state'].includes(data.type)||!Object.hasOwn(dimensions,data.role))return;
    if(data.type==='mc-proposal:ready'){
      entry.ready=true;
      clearTimeout(entry.timeout);
      entry.stage.querySelector('.demo-loading')?.remove();
      if(active===entry&&!document.hidden)send(entry,'mc-proposal:activate');
      if(entry.pendingView){const view=entry.pendingView;entry.pendingView=null;navigateFrame(entry,view);return;}
    }else if(entry.pendingView)return;
    if(entry===active&&['teacher','student'].includes(data.role)&&typeof data.studentId==='string')worksheetStudents.set(entry.view.branch||'tw',data.studentId);
    entry.view={...entry.view,role:data.role,page:typeof data.page==='string'?data.page:entry.view.page};
    syncControls(entry);sizeFrame(entry);
  });
  window.addEventListener('resize',()=>{for(const entry of frames.values())sizeFrame(entry);});
  document.addEventListener('visibilitychange',()=>{
    if(active?.ready)send(active,document.hidden?'mc-proposal:deactivate':'mc-proposal:activate');
  });
  window.addEventListener('beforeunload',event=>{
    if(!demoIsSaving())return;
    event.preventDefault();
    event.returnValue='';
  });
  // Start the requested scene first, then warm the rest without replacing it.
  const chapter=location.hash.slice(1);
  const first=chapter==='system'?'operations':scenes[chapter]?chapter:'student';
  mount(first);
  setTimeout(()=>{for(const id of Object.keys(scenes))if(!frames.has(id))mount(id);},0);
}
