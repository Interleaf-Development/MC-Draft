import { t } from './locale.js';

// These frames load the operational demo itself: no duplicate application UI.
const views = {
  schedule: {label:t('Schedule','課表'), role:'admin', page:'schedule'},
  students: {label:t('Students','學生'), role:'admin', page:'students'},
  billing: {label:t('Billing & final audit','收費及最終對帳'), role:'admin', page:'billing'},
  messages: {label:t('Conversations','對話'), role:'admin', page:'messages'},
  teacher: {label:t('Progress chart','學習進度'), role:'teacher', page:'progress'},
  classroom: {label:t('My classroom','我的課堂'), role:'teacher', page:'classroom'},
  teacherSchedule: {label:t('My schedule','我的課表'), role:'teacher', page:'schedule'},
  notes: {label:t('Lesson records','課堂紀錄'), role:'teacher', page:'notes'},
  student: {label:t('Student binder','學生學習冊'), role:'student', page:'work'},
  parent: {label:t('Parent app','家長應用程式'), role:'parent', page:'overview'},
  parentLessons: {label:t('Parent lessons','家長課堂頁面'), role:'parent', page:'lessons', studentId:'twn-c64262b4d67d'},
  parentPayments: {label:t('Parent payments','家長繳費頁面'), role:'parent', page:'payments', studentId:'chloe'},
  tw: {label:t('Tsuen Wan','荃灣'), role:'admin', page:'schedule', branch:'tw'},
  hh: {label:t('Hang Hau','坑口'), role:'admin', page:'schedule', branch:'hh'}
};
const scenes = {
  system: ['schedule','teacher','student','parent'],
  library: ['teacher','classroom'],
  teacher: ['teacher','classroom','teacherSchedule','notes'],
  student: ['student'],
  operations: ['schedule','parentLessons','messages','students'],
  billing: ['billing','parentPayments'],
  franchise: ['tw','hh']
};
const dimensions = {admin:[1440,1000],teacher:[1440,1000],student:[1024,1366],parent:[390,844]};
const selection = new Map();
const frames = new Map();
let active = null, initialised = false, phase = 0;
const worksheetStudents = new Map();
const $ = selector => document.querySelector(selector);

function sourceURL(view) {
  const base = view.branch === 'hh' ? '/hh/' : '/';
  const path = ['parent','student'].includes(view.role) ? base+view.role+'/' : base;
  const params = new URLSearchParams({proposal:'1',proposalPreload:'1',role:view.role,page:view.page});
  if(view.studentId)params.set('studentId',view.studentId);
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
  return `<div class="live-demo" data-live-demo="${id}"><div class="live-demo-toolbar"><div class="live-demo-views" role="group" aria-label="${t('Demo views','示範畫面')}">${scenes[id].map(key=>`<button type="button" data-demo-view="${key}" aria-pressed="${chosen===key}">${views[key].label}</button>`).join('')}</div><button type="button" class="demo-expand" data-demo-expand aria-expanded="false">${t('Expand ↗','放大 ↗')}</button></div><div class="demo-viewport"><div class="demo-loading" role="status">${t('Loading demo…','正在載入示範…')}</div></div></div>`;
}
function sizeFrame(entry = active) {
  if (!entry || !entry.stage.clientWidth) return;
  const {frame,stage,box,view} = entry;
  if (box.classList.contains('is-expanded')) {
    stage.style.height='';
    frame.style.width=stage.clientWidth+'px';
    frame.style.height=stage.clientHeight+'px';
    frame.style.transform='none';
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
  if (active===entry) return;
  if (active?.ready) send(active,'mc-proposal:deactivate');
  active=entry;
  if (active?.ready) send(active,'mc-proposal:activate');
}
function mount(id, key) {
  const chosen=key||selection.get(id)||scenes[id][0];
  const view=selectedView(chosen);
  const existing=frames.get(id);
  if (existing && (existing.view.branch||'tw')===(view.branch||'tw')) return existing;
  if (existing) {
    if(existing.box.classList.contains('is-expanded'))expand(false);
    if(active===existing)setActive(null);
    existing.observer?.disconnect();
    clearTimeout(existing.timeout);
    existing.frame.remove();
  }
  selection.set(id,chosen);
  const host=$('#demo-'+id);
  host.innerHTML=shell(id);
  const box=host.querySelector('.live-demo'),stage=box.querySelector('.demo-viewport');
  const frame=document.createElement('iframe');
  frame.className='actual-demo-frame';
  frame.title=t(`MathConcept demo — ${view.label}`,`MathConcept 示範 — ${view.label}`);
  frame.setAttribute('allow','fullscreen');
  frame.loading='eager';
  const entry={id,box,stage,frame,view,ready:false,pendingView:null};
  frames.set(id,entry);
  frame.src=sourceURL(view);
  stage.append(frame);
  sizeFrame(entry);
  entry.observer=new ResizeObserver(()=>sizeFrame(entry));
  entry.observer.observe(stage);
  entry.timeout=setTimeout(()=>{
    if(entry.ready || frames.get(id)!==entry)return;
    const loading=stage.querySelector('.demo-loading');
    if(loading)loading.innerHTML=`<span>${t('The demo is taking longer to load.','示範載入時間較長。')}</span><button type="button" data-demo-retry>${t('Retry','重試')}</button>`;
  },20000);
  return entry;
}
function choose(id,key) {
  if (!scenes[id]?.includes(key)) return;
  const view=selectedView(key);
  const expanded=frames.get(id)?.box.classList.contains('is-expanded');
  selection.set(id,key);
  const entry=mount(id,key);
  setActive(entry);
  entry.view=view;
  entry.frame.title=t(`MathConcept demo — ${view.label}`,`MathConcept 示範 — ${view.label}`);
  if(entry.ready)navigateFrame(entry,view);else entry.pendingView=view;
  syncControls(entry);sizeFrame(entry);
  if(expanded&&!entry.box.classList.contains('is-expanded'))expand(true);
}
function navigateFrame(entry,view) {
  send(entry,'mc-proposal:navigate',{role:view.role,page:view.page,...(view.studentId?{studentId:view.studentId}:{})});
}
function expand(value) {
  if (!active) return;
  const entry=active;
  const enabled=value??!entry.box.classList.contains('is-expanded');
  entry.box.classList.toggle('is-expanded',enabled);
  document.body.classList.toggle('demo-expanded',enabled);
  entry.box.setAttribute('role',enabled?'dialog':'region');
  entry.box.setAttribute('aria-label',enabled?t('Expanded MathConcept demo','已放大的 MathConcept 示範'):t('MathConcept demo','MathConcept 示範'));
  if (enabled) entry.box.setAttribute('aria-modal','true'); else entry.box.removeAttribute('aria-modal');
  const button=entry.box.querySelector('[data-demo-expand]');
  button.textContent=enabled?t('Close expanded view ×','關閉放大畫面 ×'):t('Expand ↗','放大 ↗');
  button.setAttribute('aria-expanded',String(enabled));
  for (const element of document.querySelectorAll('.sidebar,.topbar,.presentation-footer')) element.inert=enabled;
  requestAnimationFrame(()=>sizeFrame(entry));
  button.focus({preventScroll:true});
}
export function activateDemo(id) {
  if (!initialised || document.body.classList.contains('demo-expanded')) return;
  const entry=scenes[id]?mount(id):null;
  setActive(entry);
  if(entry)sizeFrame(entry);
}
const phases=[
  {
    label:t('Discover','了解現況'),
    title:t('Materials and workflow review','教材及營運流程確認'),
    body:t('Inventory a representative sample of materials and operational records. Confirm the authoritative versions, essential workflows, device requirements and owners.','抽取具代表性的教材及營運紀錄作盤點，確認正式版本、核心流程、裝置要求及負責人。'),
    items:[t('Material formats, page counts and exceptions','教材格式、頁數及特殊情況'),t('Sample schedules, balances and bank exports','課表、結餘及銀行匯出檔案樣本'),t('Pilot scope, responsibilities and success measures','試點範圍、分工及成效指標')],
    gate:t('Approve the scope, migration estimate and pilot acceptance criteria.','確認範圍、資料遷移估算及試行驗收準則。')
  },
  {
    label:t('Build the pilot','建立試點'),
    title:t('Pilot delivery','試行版本交付'),
    body:t('Implement the agreed library, teaching, student, parent and administration flows. Start with a limited curriculum set and the selected devices.','落實已議定的教材庫、教學、學生、家長及行政流程，先採用指定裝置及小部分課程內容。'),
    items:[t('Approved materials available to the right people','讓獲授權的人員取用合適教材'),t('Students can save, resume and correct their work','學生可儲存、繼續完成及改正習作'),t('Training, migration checks and support arrangements','培訓、資料遷移核對及支援安排')],
    gate:t('Staff can complete the agreed journeys with validated data.','員工能使用已核實的資料完成議定流程。')
  },
  {
    label:t('Validate','驗證'),
    title:t('User acceptance and operating checks','用戶驗收及營運檢查'),
    body:t('Run the pilot with real staff routines. Measure content fidelity, writing behaviour, scheduling consistency and financial exceptions.','按員工的實際工作流程試行，評估教材還原程度、書寫表現、排課一致性及財務異常情況。'),
    items:[t('Approved printing with clear records and error handling','授權列印，備有清晰紀錄及問題處理安排'),t('Receipts reconcile with money received; discrepancies stand out','核對收據與實收款項，清楚標示差異'),t('Centre privacy, saved work and readiness for daily use','確認中心資料私隱、習作保留及日常使用準備')],
    gate:t('Named reviewers accept the results and outstanding launch issues are resolved.','指定負責人接納驗證結果，並解決所有妨礙啟用的問題。')
  },
  {
    label:t('Expand','逐步推展'),
    title:t('Additional centres and materials','新增中心及教材'),
    body:t('Bring more materials and centres into use at a manageable pace. Extend worksheet creation and AI assistance once their teaching quality is established.','按可管理的進度加入更多教材及中心。確認教學品質後，再擴展工作紙編製及 AI 輔助功能。'),
    items:[t('Batch migration with exception reports','分批遷移並提供異常報告'),t('Centre onboarding and support coverage','中心導入安排及支援範圍'),t('Overseas policies, languages and curriculum entitlements','海外政策、語言及課程使用權限')],
    gate:t('Each centre is ready before its access and operations go live.','各中心準備就緒後，才開放存取權限並正式投入運作。')
  }
];
function renderRollout() {
  const item=phases[phase];
  $('#demo-rollout').innerHTML=`<div class="rollout-interactive"><div class="phase-track" role="group" aria-label="${t('Delivery phases','交付階段')}">${phases.map((p,i)=>`<button type="button" class="${phase===i?'active':''}" data-phase="${i}" aria-pressed="${phase===i}"><span>${String(i+1).padStart(2,'0')}</span><strong>${p.label}</strong></button>`).join('')}</div><div class="phase-content"><div><h3>${item.title}</h3><p>${item.body}</p></div><ul>${item.items.map(text=>`<li>${text}</li>`).join('')}</ul><div class="phase-gate"><span>${t('Completion requirement','完成條件')}</span><strong>${item.gate}</strong></div></div></div><div class="feature-table-wrap rollout-print"><table class="feature-table"><thead><tr><th scope="col">${t('Phase','階段')}</th><th scope="col">${t('Activities','工作內容')}</th><th scope="col">${t('Completion requirement','完成條件')}</th></tr></thead><tbody>${phases.map((item,i)=>`<tr><th scope="row">${i+1}. ${item.label}</th><td><p>${item.body}</p><ul class="plain-list">${item.items.map(text=>`<li>${text}</li>`).join('')}</ul></td><td>${item.gate}</td></tr>`).join('')}</tbody></table></div>`;
}
export function initDemos() {
  for (const id of Object.keys(scenes)) {const host=$('#demo-'+id);if(host)host.innerHTML=shell(id);}
  renderRollout();initialised=true;
  document.addEventListener('click',event=>{
    const box=event.target.closest('[data-live-demo]');
    const view=event.target.closest('[data-demo-view]');
    if (view&&box) choose(box.dataset.liveDemo,view.dataset.demoView);
    if (event.target.closest('[data-demo-retry]')&&box) {
      const entry=frames.get(box.dataset.liveDemo);
      if(entry){entry.ready=false;entry.frame.src=sourceURL(entry.view);}
    }
    if (event.target.closest('[data-demo-expand]')&&box) {setActive(mount(box.dataset.liveDemo));expand();}
    const phaseButton=event.target.closest('[data-phase]');
    if(phaseButton){phase=Number(phaseButton.dataset.phase);renderRollout();$('#demo-rollout [data-phase="'+phase+'"]').focus({preventScroll:true});}
  });
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin)return;
    const entry=[...frames.values()].find(item=>event.source===item.frame.contentWindow);
    if(!entry)return;
    const data=event.data;
    if(data?.type==='mc-proposal:focused'){setActive(entry);return;}
    if(!data||!['mc-proposal:ready','mc-proposal:state'].includes(data.type)||!Object.hasOwn(dimensions,data.role))return;
    if(data.type==='mc-proposal:ready'){
      entry.ready=true;
      clearTimeout(entry.timeout);
      entry.stage.querySelector('.demo-loading')?.remove();
      if(active===entry)send(entry,'mc-proposal:activate');
      if(entry.pendingView){const view=entry.pendingView;entry.pendingView=null;navigateFrame(entry,view);return;}
    }else if(entry.pendingView)return;
    if(entry===active&&['teacher','student'].includes(data.role)&&typeof data.studentId==='string')worksheetStudents.set(entry.view.branch||'tw',data.studentId);
    entry.view={...entry.view,role:data.role,page:typeof data.page==='string'?data.page:entry.view.page};
    syncControls(entry);sizeFrame(entry);
  });
  window.addEventListener('resize',()=>{for(const entry of frames.values())sizeFrame(entry);});
  window.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&active?.box.classList.contains('is-expanded')){event.preventDefault();expand(false);}
  });
  // Start the requested scene first, then warm the rest without replacing it.
  const first=scenes[location.hash.slice(1)]?location.hash.slice(1):'system';
  mount(first);
  setTimeout(()=>{for(const id of Object.keys(scenes))if(!frames.has(id))mount(id);},0);
}
