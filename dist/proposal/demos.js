// These frames load the operational demo itself: no duplicate application UI.
const views = {
  schedule: {label:'Schedule', role:'admin', page:'schedule'},
  students: {label:'Students', role:'admin', page:'students'},
  billing: {label:'Billing & final audit', role:'admin', page:'billing'},
  messages: {label:'Conversations', role:'admin', page:'messages'},
  teacher: {label:'Progress chart', role:'teacher', page:'progress'},
  classroom: {label:'My classroom', role:'teacher', page:'classroom'},
  teacherSchedule: {label:'My schedule', role:'teacher', page:'schedule'},
  notes: {label:'Lesson records', role:'teacher', page:'notes'},
  student: {label:'Student binder', role:'student', page:'work'},
  parent: {label:'Parent app', role:'parent', page:'overview'},
  parentLessons: {label:'Parent lessons', role:'parent', page:'lessons', studentId:'twn-c64262b4d67d'},
  parentPayments: {label:'Parent payments', role:'parent', page:'payments', studentId:'chloe'},
  tw: {label:'Tsuen Wan', role:'admin', page:'schedule', branch:'tw'},
  hh: {label:'Hang Hau', role:'admin', page:'schedule', branch:'hh'}
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
let active = null, initialised = false, phase = 0;
const worksheetStudents = new Map();
const $ = selector => document.querySelector(selector);
const esc = text => String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function sourceURL(view) {
  const base = view.branch === 'hh' ? '/hh/' : '/';
  const path = ['parent','student'].includes(view.role) ? base+view.role+'/' : base;
  const params = new URLSearchParams({proposal:'1',role:view.role,page:view.page});
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
  return `<div class="live-demo" data-live-demo="${id}"><div class="live-demo-toolbar"><div class="live-demo-views" role="group" aria-label="Demo views">${scenes[id].map(key=>`<button type="button" data-demo-view="${key}" aria-pressed="${chosen===key}">${views[key].label}</button>`).join('')}</div><button type="button" class="demo-expand" data-demo-expand aria-expanded="false">Expand ↗</button></div><div class="demo-viewport"><div class="demo-loading"><span class="demo-loading-mark">M</span><button type="button" data-demo-start>Open ${esc(views[chosen].label)}</button></div></div></div>`;
}
function sizeFrame() {
  if (!active) return;
  const {frame,stage,box,view} = active;
  const expanded = box.classList.contains('is-expanded');
  if (expanded) {
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
function syncControls() {
  if (!active) return;
  for (const button of active.box.querySelectorAll('[data-demo-view]')) {
    const view=views[button.dataset.demoView];
    const match=view.role===active.view.role && view.page===active.view.page && (view.branch||'tw')===(active.view.branch||'tw');
    button.setAttribute('aria-pressed',String(match));
  }
}
function unmount() {
  if (!active) return;
  if (active.box.classList.contains('is-expanded')) expand(false);
  const {id,frame}=active;
  frame.remove();
  $('#demo-'+id).innerHTML=shell(id);
  active=null;
}
function mount(id, key) {
  const chosen=key||selection.get(id)||scenes[id][0];
  const view=selectedView(chosen);
  selection.set(id,chosen);
  unmount();
  const host=$('#demo-'+id);
  host.innerHTML=shell(id);
  const box=host.querySelector('.live-demo'),stage=box.querySelector('.demo-viewport');
  const frame=document.createElement('iframe');
  frame.className='actual-demo-frame';
  frame.title=`MathConcept demo — ${view.label}`;
  frame.setAttribute('allow','fullscreen');
  frame.addEventListener('load',()=>{
    if (active?.frame!==frame) return;
    stage.querySelector('.demo-loading')?.remove();
    sizeFrame();
  });
  frame.src=sourceURL(view);
  active={id,box,stage,frame,view,ready:false,pendingView:null};
  stage.append(frame);
  sizeFrame();
}
function choose(id,key) {
  if (!scenes[id]?.includes(key)) return;
  const view=selectedView(key);
  selection.set(id,key);
  if (active?.id!==id || (active.view.branch||'tw')!==(view.branch||'tw')) {
    const expanded=active?.box.classList.contains('is-expanded');
    mount(id,key);
    if (expanded) expand(true);
    return;
  }
  active.view=view;
  active.frame.title=`MathConcept demo — ${view.label}`;
  if(active.ready)navigateFrame(view);else active.pendingView=view;
  syncControls();sizeFrame();
}
function navigateFrame(view) {
  active.frame.contentWindow.postMessage({type:'mc-proposal:navigate',role:view.role,page:view.page,...(view.studentId?{studentId:view.studentId}:{})},location.origin);
}
function expand(value) {
  if (!active) return;
  const enabled=value??!active.box.classList.contains('is-expanded');
  active.box.classList.toggle('is-expanded',enabled);
  document.body.classList.toggle('demo-expanded',enabled);
  active.box.setAttribute('role',enabled?'dialog':'region');
  active.box.setAttribute('aria-label',enabled?'Expanded MathConcept demo':'MathConcept demo');
  if (enabled) active.box.setAttribute('aria-modal','true'); else active.box.removeAttribute('aria-modal');
  const button=active.box.querySelector('[data-demo-expand]');
  button.textContent=enabled?'Close expanded view ×':'Expand ↗';
  button.setAttribute('aria-expanded',String(enabled));
  for (const element of document.querySelectorAll('.sidebar,.topbar,.presentation-footer')) element.inert=enabled;
  requestAnimationFrame(sizeFrame);
  button.focus({preventScroll:true});
}
export function activateDemo(id) {
  if (!initialised || document.body.classList.contains('demo-expanded')) return;
  if (active?.id===id) return;
  if (scenes[id]) mount(id); else unmount();
}
const phases=[{label:'Discover',title:'Understand the real collection and routines.',body:'Inventory a representative sample of materials and operational records. Confirm the authoritative versions, essential workflows, device requirements and owners.',items:['Material formats, page counts and exceptions','Sample schedules, balances and bank exports','Pilot scope, responsibilities and success measures'],gate:'An agreed scope and a realistic migration estimate.'},{label:'Build the pilot',title:'Make one centre’s core journeys work.',body:'Implement the agreed library, teaching, student, parent and administration flows. Start with a limited curriculum set and the selected devices.',items:['Role permissions and controlled content delivery','Save, retry, review and correction flows','Training, migration checks and support arrangements'],gate:'Staff can complete the agreed journeys with validated data.'},{label:'Validate',title:'Test the parts a screen cannot prove.',body:'Run the pilot with real staff routines. Measure content fidelity, writing behaviour, scheduling consistency and financial exceptions.',items:['Print success, failure and retry behaviour','Bank matching, duplicate imports and allocations','Access boundaries, recovery and launch blockers'],gate:'Owners accept the evidence and resolve launch blockers.'},{label:'Expand',title:'Roll out what the pilot has established.',body:'Move additional materials and centres in manageable batches. Extend native authoring and AI assistance after their content checks are proven.',items:['Batch migration with exception reports','Centre onboarding and support coverage','Overseas policies, languages and curriculum entitlements'],gate:'Each centre is ready before its access and operations go live.'}];
function renderRollout() {
  const item=phases[phase];
  $('#demo-rollout').innerHTML=`<div class="demo-toolbar"><strong>Delivery sequence · dates to agree</strong></div><div class="phase-track">${phases.map((p,i)=>`<button class="${phase===i?'active':''}" data-phase="${i}" aria-pressed="${phase===i}"><span>${String(i+1).padStart(2,'0')}</span><strong>${p.label}</strong></button>`).join('')}</div><div class="phase-content"><div><h3>${item.title}</h3><p>${item.body}</p></div><ul>${item.items.map(text=>`<li>${text}</li>`).join('')}</ul><div class="phase-gate"><span>PROCEED WHEN</span><strong>${item.gate}</strong></div></div>`;
}
export function initDemos() {
  for (const id of Object.keys(scenes)) {const host=$('#demo-'+id);if(host)host.innerHTML=shell(id);}
  renderRollout();initialised=true;
  document.addEventListener('click',event=>{
    const box=event.target.closest('[data-live-demo]');
    const view=event.target.closest('[data-demo-view]');
    if (view&&box) choose(box.dataset.liveDemo,view.dataset.demoView);
    if (event.target.closest('[data-demo-start]')&&box) mount(box.dataset.liveDemo);
    if (event.target.closest('[data-demo-expand]')&&box) {if(active?.id!==box.dataset.liveDemo)mount(box.dataset.liveDemo);expand();}
    const phaseButton=event.target.closest('[data-phase]');
    if(phaseButton){phase=Number(phaseButton.dataset.phase);renderRollout();}
  });
  window.addEventListener('message',event=>{
    if(!active||event.origin!==location.origin||event.source!==active.frame.contentWindow)return;
    const data=event.data;
    if(!data||!['mc-proposal:ready','mc-proposal:state'].includes(data.type)||!Object.hasOwn(dimensions,data.role))return;
    if(data.type==='mc-proposal:ready'){
      active.ready=true;
      if(active.pendingView){const view=active.pendingView;active.pendingView=null;navigateFrame(view);return;}
    }else if(active.pendingView)return;
    if(['teacher','student'].includes(data.role)&&typeof data.studentId==='string')worksheetStudents.set(active.view.branch||'tw',data.studentId);
    active.view={...active.view,role:data.role,page:typeof data.page==='string'?data.page:active.view.page};
    active.stage.querySelector('.demo-loading')?.remove();
    syncControls();sizeFrame();
  });
  window.addEventListener('resize',sizeFrame);
  window.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&active?.box.classList.contains('is-expanded')){event.preventDefault();expand(false);}
  });
}
