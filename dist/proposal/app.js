import * as english from './content.js';
import * as chinese from './content.zh-HK.js';
import { language, t, shellText, proposalLanguageUrl } from './locale.js';
import { getProposalSolution, proposalSolutionUrl } from './solutions.js';
import { getSmartpenProposal } from './smartpen-content.js';
import { buildProposalStructure } from './structure.js';
import { initSmartpenWritingDemo } from './smartpen-writing-demo.js';
let solution = getProposalSolution(new URL(location.href));
const original = language === 'zh-HK' ? chinese : english;
const proposal = buildProposalStructure(language, original, getSmartpenProposal(language, original));
const { chapters, references } = proposal;
const { chapterHTML } = original;
const copy = { ...shellText, ...proposal.shellTextOverrides };
// Keep shared links working after separating student experience and materials.
const chapterAliases = { student: 'learning', 'smartpen-student': 'learning', teacher: 'materials', 'smartpen-teacher': 'materials', library: 'materials', authoring: 'materials', protection: 'materials', 'shared-knowledge': 'materials', 'shared-practice': 'materials', franchise: 'system', operations: 'system', billing: 'system', rollout: 'vision', proposal: 'vision' };
const chapterIndex = hash => { const id = hash.replace(/^#/, ''); return chapters.findIndex(chapter => chapter.id === (chapterAliases[id] || id)); };
import { initDemos, activateDemo, demoIsSaving, demoNavigationBlocked } from './demos.js';
document.documentElement.lang=language;
if (proposal.overviewHTML) document.getElementById('vision').innerHTML=proposal.overviewHTML;
for(const element of document.querySelectorAll('[data-copy]'))element.textContent=copy[element.dataset.copy];
const topbar=document.querySelector('.topbar');
const measureHeader=()=>document.documentElement.style.setProperty('--proposal-header-height',topbar.getBoundingClientRect().height+'px');
measureHeader();new ResizeObserver(measureHeader).observe(topbar);
document.querySelector('meta[name="description"]').content=t('MathConcept proposal: tablet and smartpen student experiences, teaching materials, centre management and parent services.','MathConcept 系統建議書：平板與智能筆的學生體驗、教材、中心管理及家長服務。');
for(const [id,label] of Object.entries({chapters:t('Proposal chapters','建議書章節'),menu:t('Open contents','開啟目錄'),references:t('Open reference documents','開啟參考文件'),'close-dialog':t('Close dialog','關閉視窗')}))document.getElementById(id).setAttribute('aria-label',label);
document.getElementById('prev').textContent=t('← Previous','← 上一章');
document.getElementById('next').textContent=t('Next →','下一章 →');
const languageSwitch=document.getElementById('language-switch');
languageSwitch.textContent=t('繁體中文','English');
languageSwitch.hreflang=languageSwitch.lang=language==='zh-HK'?'en':'zh-HK';
languageSwitch.setAttribute('aria-label',t('Switch to Hong Kong Traditional Chinese','切換至英文版'));
document.documentElement.style.setProperty('--proposal-print-demo-label',JSON.stringify(t('Explore the actual application in the online proposal.','請開啟網頁版建議書，試用互動示範。')));
const main=document.getElementById('main');
main.insertAdjacentHTML('beforeend',chapters.slice(1).map((c,i)=>chapterHTML(c,i+1)).join('')+`<footer class="document-footer"><img src="assets/mathconcept-logo.png" alt="MathConcept"><div><strong>${copy.documentType}</strong><p>${copy.draftNote} · ${copy.draftDate}</p></div><a href="#vision">${t("Back to the beginning ↑","返回開首 ↑")}</a></footer>`);
const solutionSwitch = document.getElementById('solution-switch');
function applyLearningOption() {
  for (const panel of document.querySelectorAll('[data-learning-solution]')) panel.hidden=panel.dataset.learningSolution!==solution;
  for (const link of solutionSwitch.querySelectorAll('[data-solution]')) {
    link.href=proposalSolutionUrl(location.href,link.dataset.solution);
    if(link.dataset.solution===solution)link.setAttribute('aria-current','true');
    else link.removeAttribute('aria-current');
  }
}
applyLearningOption();
const nav=document.getElementById('chapters');
nav.innerHTML=chapters.map((c,i)=>`<a href="#${c.id}" data-index="${i}"><span>${i+1}.</span>${c.title}</a>`).join('')+`<div class="nav-references"><span>${t("REFERENCE","參考文件")}</span><button data-action="reference" data-ref="scope">${t("Detailed scope ↗","詳細範圍 ↗")}</button><button data-action="reference" data-ref="safeguards">${t("Protection & reliability ↗","教材與營運保障 ↗")}</button><button data-action="reference" data-ref="assumptions">${t("Open decisions ↗","待確認事項 ↗")}</button></div>`;
const sections=[...document.querySelectorAll('.chapter')];
let current=0,present=false,toastTimer;
const dialog=document.getElementById('detail-dialog');
export function openDialog(title,body,className=''){dialog.className=className;document.getElementById('dialog-title').textContent=title;document.getElementById('dialog-body').innerHTML=body;if(!dialog.open)dialog.showModal();dialog.scrollTop=0}
function notify(message){const t=document.getElementById('toast');t.textContent=message;t.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('visible'),4200)}
function update(index){if(demoIsSaving())return;current=Math.max(0,Math.min(chapters.length-1,index));sections.forEach((s,i)=>s.classList.toggle('current',i===current));nav.querySelectorAll('a').forEach((a,i)=>{a.classList.toggle('active',i===current);if(i===current)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current')});document.getElementById('chapter-label').textContent=chapters[current].title;document.getElementById('slide-counter').textContent=`${current+1} / ${chapters.length}`;document.getElementById('prev').disabled=current===0;document.getElementById('next').disabled=current===chapters.length-1;document.title=`MathConcept — ${chapters[current].title}`;activateDemo(chapters[current].id);updateLanguageLink()}
function go(index){if(demoNavigationBlocked())return;const i=Math.max(0,Math.min(chapters.length-1,index));update(i);history.replaceState(null,'','#'+chapters[i].id);if(present)window.scrollTo({top:0,behavior:'instant'});else sections[i].scrollIntoView({behavior:'instant',block:'start'})}
function updateLanguageLink(){languageSwitch.href=proposalLanguageUrl(location.href,language==='zh-HK'?'en':'zh-HK',{chapter:chapters[current].id,present});for(const link of solutionSwitch.querySelectorAll('[data-solution]'))link.href=proposalSolutionUrl(location.href,link.dataset.solution);}
function updateModeLabel(){document.getElementById('mode').textContent=present?t('Full document','完整文件'):t('Section view','逐章閱讀');}
updateModeLabel();
function toggleMode(){if(demoNavigationBlocked())return;present=!present;document.body.classList.toggle('present-mode',present);updateModeLabel();const url=new URL(location.href);if(present)url.searchParams.set('view','present');else url.searchParams.delete('view');history.replaceState(null,'',url.pathname+url.search+url.hash);document.getElementById('mode').setAttribute('aria-pressed',present);document.getElementById('presentation-footer').hidden=!present;go(current)}
document.getElementById('menu').addEventListener('click',()=>{const open=document.getElementById('sidebar').classList.toggle('open');document.getElementById('menu').setAttribute('aria-expanded',open)});
document.addEventListener('click',e=>{
  if(e.target.closest('a[href]')&&demoNavigationBlocked()){e.preventDefault();return;}
  const option=e.target.closest('a[data-solution]');
  if(option&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.altKey){
    e.preventDefault();
    solution=option.dataset.solution;
    history.replaceState(null,'',proposalSolutionUrl(location.href,solution));
    applyLearningOption();
    update(chapterIndex('#learning'));
    solutionSwitch.scrollIntoView({behavior:'instant',block:'start'});
    return;
  }
  const link=e.target.closest('a[href^="#"]');
  if(link){const i=chapterIndex(link.getAttribute('href'));if(i>=0){e.preventDefault();go(i);document.getElementById('sidebar').classList.remove('open');document.getElementById('menu').setAttribute('aria-expanded','false')}}
  const b=e.target.closest('[data-action="reference"]');if(b){const r=references[b.dataset.ref];openDialog(r.title,r.body)}
});
document.getElementById('mode').addEventListener('click',toggleMode);
document.getElementById('print-document').addEventListener('click',()=>window.print());
document.getElementById('prev').addEventListener('click',()=>go(current-1));document.getElementById('next').addEventListener('click',()=>go(current+1));
document.getElementById('close-dialog').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
document.getElementById('references').addEventListener('click',()=>openDialog(t('Reference documents','參考文件'),`<p class="reference-lead">${t('Read the details behind the proposal.','查閱功能範圍、保障措施及待確認事項。')}</p><div class="reference-menu">${Object.entries(references).map(([k,v])=>`<button data-action="reference" data-ref="${k}"><strong>${v.title}</strong><span>→</span></button>`).join('')}</div><p class="small">${t("Explore the application workflows alongside the proposed features.","可配合建議書的功能說明，直接體驗應用程式的操作流程。")}</p>`));
window.addEventListener('hashchange',()=>{if(demoNavigationBlocked()){history.replaceState(null,'','#'+chapters[current].id);return;}const i=chapterIndex(location.hash);if(i>=0)go(i)});
window.addEventListener('keydown',e=>{if(dialog.open||e.target.matches('input,textarea,select,button,[contenteditable]'))return;if(present&&['ArrowRight','PageDown'].includes(e.key)){e.preventDefault();go(current+1)}if(present&&['ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();go(current-1)}if(e.key.toLowerCase()==='p'&&!e.ctrlKey&&!e.metaKey&&!e.altKey)toggleMode()});
let scrollQueued=false;window.addEventListener('scroll',()=>{if(present||scrollQueued)return;scrollQueued=true;requestAnimationFrame(()=>{scrollQueued=false;if(present)return;let index=0;sections.forEach((s,i)=>{if(s.getClientRects().length&&s.getBoundingClientRect().top<window.innerHeight*.35)index=i});if(index!==current)update(index)})},{passive:true});
initDemos({notify,openDialog});
initSmartpenWritingDemo(document);
const initial=chapterIndex(location.hash);if(chapterAliases[location.hash.slice(1)])history.replaceState(null,'','#'+chapters[initial].id);update(Math.max(0,initial));if(new URL(location.href).searchParams.get('view')==='present')toggleMode();else if(initial>0)requestAnimationFrame(()=>sections[initial].scrollIntoView({behavior:'instant'}));
