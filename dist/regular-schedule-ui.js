import { staffText, staffDate, staffContent } from './staff-locale.js';
import { TODAY, money, time, tutors, studentById } from './model.js';
import { getRegularSchedule, getSchedulePeriods, previewRegularScheduleChange, applyRegularScheduleChange } from './regular-schedule.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const days = ['星期一','星期二','星期三','星期四','星期五','星期六','星期日'];
const dateText = date => staffDate(date,{year:'numeric',timeZone:'UTC'});
const button = (action,label,attrs='',cls='btn') => '<button type="button" class="'+cls+'" data-action="regular-'+action+'" '+attrs+'>'+label+'</button>';
const field = (id,label,input) => '<div class="field"><label for="'+id+'">'+label+'</label>'+input+'</div>';
const ruleText = rule => days[rule.weekday-1]+' · '+time(rule.start)+'–'+time(rule.start+rule.duration)+' · '+(tutors.find(t=>t.id===rule.tutor)?.name||'');
const slotKey = slot => [slot.date,slot.start,slot.duration,slot.tutor].join('|');
const addDays = (date,days) => new Date(Date.parse(date+'T12:00:00Z')+days*86400000).toISOString().slice(0,10);

export function createRegularScheduleUI({getState,getViewer,change,modal,closeModal,openReceipt,getRoot=()=>document}) {
 let draft=null,preview=null;
 const admin=()=>getViewer().role==='admin';
 const availablePeriods=studentId=>getSchedulePeriods(getState(),studentId).filter(p=>p.end>=TODAY);
 const periodForDate=(periods,date)=>periods.find(p=>date>=p.start&&date<=p.end);
 const requested=()=>({...draft,endDate:draft.hasEndDate?draft.endDate:undefined});
 function showForm(studentId,keepDraft=false){
  if(!admin())return;
  const state=getState(),periods=availablePeriods(studentId),student=studentById(studentId);
  if(!periods.length){modal('更改常規上課時間','<p class="strong">'+esc(student.name)+'</p><p class="small muted mt-16">需要本期或下期已發出的收據，才能比較課堂數目。</p>',button('close','關閉'));return;}
  if(!keepDraft||draft?.studentId!==studentId){const period=periods[0],effectiveDate=period.start>TODAY?period.start:TODAY,rule=getRegularSchedule(state,studentId,effectiveDate);draft={studentId,invoiceId:period.id,effectiveDate,weekday:rule.weekday,start:rule.start,tutor:rule.tutor,hasEndDate:false,endDate:''};}
  const period=periodForDate(periods,draft.effectiveDate),rule=getRegularSchedule(state,studentId,draft.effectiveDate||TODAY);
  draft.invoiceId=period?.id||'';
  const options=(items,value)=>items.map(([id,label])=>'<option value="'+esc(id)+'"'+(String(id)===String(value)?' selected':'')+'>'+esc(label)+'</option>').join('');
  const startOptions=Array.from({length:Math.floor((1140-rule.duration-540)/30)+1},(_,i)=>[540+i*30,time(540+i*30)]);
  const finalDate='<div class="field regular-final-date"><label class="regular-end-toggle" for="regular-has-end"><input type="checkbox" id="regular-has-end"'+(draft.hasEndDate?' checked':'')+'>結束日期</label>'+(draft.hasEndDate?'<input type="date" id="regular-end" aria-label="結束日期" value="'+esc(draft.endDate)+'" min="'+esc(draft.effectiveDate)+'"'+(period?' max="'+period.end+'"':'')+'>':'')+'</div>';
  modal('更改常規上課時間','<div class="regular-change-form"><div><h3>'+esc(student.name)+'</h3><p class="regular-current-schedule">目前常規課堂：<strong>'+esc(ruleText(rule))+'</strong></p></div><div class="field-row regular-change-dates">'+field('regular-effective','生效日期','<input type="date" id="regular-effective" value="'+esc(draft.effectiveDate)+'" min="'+(periods[0].start>TODAY?periods[0].start:TODAY)+'" max="'+periods.at(-1).end+'">')+finalDate+'</div><fieldset class="regular-new-schedule"><legend>新的常規上課時間</legend><div class="field-row"><select id="regular-weekday" aria-label="新的上課日">'+options(days.map((d,i)=>[i+1,d]),draft.weekday)+'</select><select id="regular-start" aria-label="開始時間">'+options(startOptions,draft.start)+'</select></div></fieldset>'+field('regular-tutor','老師','<select id="regular-tutor">'+options(tutors.map(t=>[t.id,t.name]),draft.tutor)+'</select>')+'<p class="small muted">'+(draft.hasEndDate?'結束日期後恢復原有課表。':'由生效日期起重複安排，不設結束日期。')+'</p></div>',button('close','取消')+button('review','檢視課堂數目','','btn primary'));
 }
 function capture(){
  const root=getRoot();
  const effectiveDate=root.querySelector('#regular-effective').value;
  draft={...draft,invoiceId:periodForDate(availablePeriods(draft.studentId),effectiveDate)?.id||'',effectiveDate,weekday:Number(root.querySelector('#regular-weekday').value),start:Number(root.querySelector('#regular-start').value),tutor:root.querySelector('#regular-tutor').value,hasEndDate:Boolean(root.querySelector('#regular-has-end')?.checked),endDate:root.querySelector('#regular-end')?.value??draft.endDate};
 }
 function showReview(){
  const state=getState(),invoice=state.invoices.find(i=>i.id===preview.invoiceId),receipt=state.receipts.find(r=>r.id===preview.receiptId),delta=preview.delta;
  const beforeKeys=new Set(preview.beforeLessons.map(slotKey)),afterKeys=new Set(preview.proposedLessons.map(slotKey));
  const lessonList=(list,other,side)=>'<ol class="regular-date-list">'+list.map((lesson,index)=>'<li class="'+(!other.has(slotKey(lesson))?'is-'+side:'')+'"><span>'+String(index+1).padStart(2,'0')+'</span><div><strong>'+dateText(lesson.date)+'</strong><span>'+time(lesson.start)+'–'+time(lesson.start+lesson.duration)+'</span></div>'+(!other.has(slotKey(lesson))?'<span class="regular-date-change">'+(side==='added'?'新增':'已取代')+'</span>':'')+'</li>').join('')+'</ol>';
  const preservedKeys=new Set((preview.preservedLessons||[]).map(slotKey));
  const omitted=preview.excludedDateCandidates||(delta>0?preview.proposedLessons.filter(l=>l.date>=draft.effectiveDate&&(!draft.hasEndDate||l.date<=draft.endDate)&&!preservedKeys.has(slotKey(l))).slice(-delta):[]);
  const choice=delta>0?'<fieldset class="regular-decision"><legend>增加 '+delta+' 堂</legend><label class="check-option"><input type="radio" name="regular-decision" value="allow"><span><strong>維持學費，安排 '+preview.proposedCount+' 堂</strong><small>修訂收據以包括新增的課堂。</small></span></label><label class="check-option"><input type="radio" name="regular-decision" value="decline"><span><strong>維持 '+preview.beforeCount+' 堂</strong><small>'+omitted.map(l=>dateText(l.date)).join('、')+' 不設課堂。</small></span></label></fieldset>':delta<0?'<fieldset class="regular-decision"><legend>減少 '+Math.abs(delta)+' 堂</legend><label class="check-option"><input type="radio" name="regular-decision" value="credit"><span><strong>提供 '+Math.abs(delta)+' 堂補堂</strong><small>已安排 '+preview.proposedCount+' 堂，另有 '+Math.abs(delta)+' 堂由客服安排。</small></span></label><label class="check-option"><input type="radio" name="regular-decision" value="decline"><span><strong>維持 '+preview.proposedCount+' 堂，不補堂</strong><small>修訂收據以反映減少的課堂數目，學費維持不變。</small></span></label></fieldset>':'<p class="small muted">課堂數目維持不變，修訂收據將列出新的上課日期。</p>';
  const conflicts=preview.conflicts||[];
  const changeRange='由 '+dateText(draft.effectiveDate)+(preview.temporary?' 至 '+dateText(preview.input.endDate)+'（包括當日）':' 起');
  const resume=preview.temporary?'<p class="regular-resume">恢復原有課表日期：'+dateText(preview.resumeDate)+':<br><strong>'+esc(ruleText(preview.resumeRule))+'</strong></p>':'';
  modal('檢視常規課表更改','<div class="regular-review"><div class="between wrap"><div><h3>'+esc(studentById(draft.studentId).name)+'</h3><p class="small muted mt-8">'+esc(staffContent(preview.period.label))+' · '+changeRange+'</p></div><div class="regular-count">'+preview.beforeCount+' <span>→</span> '+preview.proposedCount+'<small>已安排課堂</small></div></div><div class="regular-rule-summary"><p><span>原有</span>'+esc(ruleText(preview.oldRule))+'</p><p><span>更改為</span>'+esc(ruleText(preview.newRule))+'</p></div>'+resume+(preview.makeUpLessonCount?'<p class="small muted">'+preview.makeUpLessonCount+' 堂現有補堂仍包括在收據內。</p>':'')+choice+(conflicts.length?'<div class="notice amber"><strong>課表衝突</strong><ul>'+conflicts.map(c=>'<li>'+esc(c.date?dateText(c.date)+': ':'')+esc(staffText(c.reason))+'</li>').join('')+'</ul></div>':'')+'<details class="regular-dates" open><summary>比較上課日期</summary><div class="regular-date-columns"><section><h4>目前 · '+preview.beforeCount+'</h4>'+lessonList(preview.beforeLessons,afterKeys,'removed')+'</section><section><h4>建議 · '+preview.proposedCount+'</h4>'+lessonList(preview.proposedLessons,beforeKeys,'added')+'</section></div></details><p class="small muted">'+money(receipt?.amount??invoice?.amount)+' 已繳付 · 收據日期：'+dateText(receipt.issuedDate)+'。新版本會保留原日期並記錄今天的修訂，毋須額外付款。</p></div>',button('back','返回')+button('apply','套用課表更改',delta?'disabled':'','btn primary'),true);
 }
 function handleAction(action){
  if(!action.startsWith('regular-'))return false;
  if(!admin())return true;
  const name=action.slice(8);
  if(name==='close'){closeModal();return true;}
  if(name==='back'){showForm(draft.studentId,true);return true;}
  if(name==='review'){
   try{capture();if(!draft.invoiceId)throw new Error('請選擇已繳費期數內的生效日期。');if(draft.hasEndDate&&!draft.endDate)throw new Error('請選擇結束日期。');preview=previewRegularScheduleChange(getState(),requested());showReview();}catch(error){const el=getRoot().querySelector('#form-error');if(el){el.textContent=staffText(error.message);el.classList.add('visible');}}
   return true;
  }
  if(name==='apply'&&preview){
   const selected=getRoot().querySelector('input[name="regular-decision"]:checked')?.value;
   let result;
   if(change(()=>{result=applyRegularScheduleChange(getState(),requested(),{extra:preview.delta>0?selected:undefined,shortfall:preview.delta<0?selected:undefined,fingerprint:preview.fingerprint});},'已更改常規課表並修訂收據。')){preview=null;openReceipt(result.receipt.id);}
   return true;
  }
  return true;
 }
 function onChange(event){
  if(!admin())return false;
  if(['regular-has-end','regular-effective'].includes(event.target.id)){
   capture();
   if(draft.hasEndDate&&!draft.endDate&&/^\d{4}-\d{2}-\d{2}$/.test(draft.effectiveDate)){const period=periodForDate(availablePeriods(draft.studentId),draft.effectiveDate),suggested=addDays(draft.effectiveDate,20);draft.endDate=period&&suggested>period.end?period.end:suggested;}
   showForm(draft.studentId,true);
   if(event.target.id==='regular-has-end')getRoot().querySelector(draft.hasEndDate?'#regular-end':'#regular-has-end')?.focus?.();
   return true;
  }
  if(event.target.name==='regular-decision'){const apply=getRoot().querySelector('[data-action="regular-apply"]');if(apply)apply.disabled=false;return true;}
  return false;
 }
 return {open:showForm,handleAction,onChange,reset(){draft=null;preview=null;}};
}
