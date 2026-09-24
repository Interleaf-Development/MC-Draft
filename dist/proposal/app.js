import * as english from './content.js';
import * as chinese from './content.zh-HK.js';
import { language, t, shellText } from './locale.js';
import { getProposalSolution, proposalSolutionUrl } from './solutions.js';
import { getSmartpenProposal } from './smartpen-content.js';
import { buildProposalStructure } from './structure.js';
import { initSmartpenWritingDemo } from './smartpen-writing-demo.js';
let solution = getProposalSolution(new URL(location.href));
// Old section-view links now open the complete document.
const documentUrl = new URL(location.href);
if (documentUrl.searchParams.has('view')) {
  documentUrl.searchParams.delete('view');
  history.replaceState(null, '', documentUrl.pathname + documentUrl.search + documentUrl.hash);
}
const original = language === 'zh-HK' ? chinese : english;
const proposal = buildProposalStructure(language, original, getSmartpenProposal(language, original));
const { chapters } = proposal;
const { chapterHTML } = original;
const copy = { ...shellText, ...proposal.shellTextOverrides };
// Keep shared links working after separating student experience and materials.
const chapterAliases = { student: 'learning', 'smartpen-student': 'learning', teacher: 'teaching', 'smartpen-teacher': 'teaching', library: 'materials', authoring: 'materials', protection: 'materials', 'shared-knowledge': 'materials', 'shared-practice': 'teaching', franchise: 'system', operations: 'system', billing: 'system', rollout: 'vision', proposal: 'vision' };
const chapterIndex = hash => { const id = hash.replace(/^#/, ''); return chapters.findIndex(chapter => chapter.id === (chapterAliases[id] || id)); };
import { initDemos, activateDemo, demoIsSaving, demoNavigationBlocked } from './demos.js';
document.documentElement.lang=language;
if (proposal.overviewHTML) document.getElementById('vision').innerHTML=proposal.overviewHTML;
for(const element of document.querySelectorAll('[data-copy]'))element.textContent=copy[element.dataset.copy];
const topbar=document.querySelector('.topbar');
const measureHeader=()=>document.documentElement.style.setProperty('--proposal-header-height',topbar.getBoundingClientRect().height+'px');
measureHeader();new ResizeObserver(measureHeader).observe(topbar);
document.querySelector('meta[name="description"]').content=t('MathConcept proposal: smartpen and tablet student experiences, teaching materials, centre management and parent services.','MathConcept 系統建議書：智能筆與平板的學生體驗、教材、中心管理及家長服務。');
for(const [id,label] of Object.entries({chapters:t('Proposal chapters','建議書章節'),menu:t('Open contents','開啟目錄')}))document.getElementById(id).setAttribute('aria-label',label);
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
nav.innerHTML=chapters.map((c,i)=>`<a href="#${c.id}" data-index="${i}"><span>${i+1}.</span>${c.title}</a>`).join('');
const sections=[...document.querySelectorAll('.chapter')];
let current=0,toastTimer;
function notify(message){const t=document.getElementById('toast');t.textContent=message;t.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('visible'),4200)}
function update(index){if(demoIsSaving())return;current=Math.max(0,Math.min(chapters.length-1,index));sections.forEach((s,i)=>s.classList.toggle('current',i===current));nav.querySelectorAll('a').forEach((a,i)=>{a.classList.toggle('active',i===current);if(i===current)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current')});document.title='MathConcept Proposal V1';activateDemo(chapters[current].id);for(const link of solutionSwitch.querySelectorAll('[data-solution]'))link.href=proposalSolutionUrl(location.href,link.dataset.solution);}
function go(index){if(demoNavigationBlocked())return;const i=Math.max(0,Math.min(chapters.length-1,index));update(i);history.replaceState(null,'','#'+chapters[i].id);sections[i].scrollIntoView({behavior:'instant',block:'start'})}
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
});
window.addEventListener('hashchange',()=>{if(demoNavigationBlocked()){history.replaceState(null,'','#'+chapters[current].id);return;}const i=chapterIndex(location.hash);if(i>=0)go(i)});
let scrollQueued=false;window.addEventListener('scroll',()=>{if(scrollQueued)return;scrollQueued=true;requestAnimationFrame(()=>{scrollQueued=false;let index=0;sections.forEach((s,i)=>{if(s.getClientRects().length&&s.getBoundingClientRect().top<window.innerHeight*.35)index=i});if(index!==current)update(index)})},{passive:true});
initDemos({notify});
initSmartpenWritingDemo(document);
const initial=chapterIndex(location.hash);if(chapterAliases[location.hash.slice(1)])history.replaceState(null,'','#'+chapters[initial].id);update(Math.max(0,initial));if(initial>0)requestAnimationFrame(()=>sections[initial].scrollIntoView({behavior:'instant'}));
