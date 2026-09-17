import { TODAY, money, time, tutors, studentById } from './model.js';
import { getRegularSchedule, getSchedulePeriods, previewRegularScheduleChange, applyRegularScheduleChange } from './regular-schedule.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const dateText = date => new Date(date + 'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
const button = (action,label,attrs='',cls='btn') => '<button type="button" class="'+cls+'" data-action="regular-'+action+'" '+attrs+'>'+label+'</button>';
const field = (id,label,input) => '<div class="field"><label for="'+id+'">'+label+'</label>'+input+'</div>';
const ruleText = rule => days[rule.weekday-1]+' · '+time(rule.start)+'–'+time(rule.start+rule.duration)+' · '+(tutors.find(t=>t.id===rule.tutor)?.name||'');
const slotKey = slot => [slot.date,slot.start,slot.duration,slot.tutor].join('|');

export function createRegularScheduleUI({getState,getViewer,change,modal,closeModal,openReceipt,getRoot=()=>document}) {
 let draft=null,preview=null;
 const admin=()=>getViewer().role==='admin';
 function showForm(studentId,keepDraft=false){
  if(!admin())return;
  const state=getState(),periods=getSchedulePeriods(state,studentId).filter(p=>p.end>=TODAY),rule=getRegularSchedule(state,studentId),student=studentById(studentId);
  if(!periods.length){modal('Change regular schedule','<p class="strong">'+esc(student.name)+'</p><p class="small muted mt-16">An issued receipt for the current or upcoming tuition period is needed to compare lesson entitlement.</p>',button('close','Close'));return;}
  if(!keepDraft||draft?.studentId!==studentId){const period=periods[0];draft={studentId,invoiceId:period.id,effectiveDate:period.start>TODAY?period.start:TODAY,weekday:rule.weekday,start:rule.start,tutor:rule.tutor};}
  const period=periods.find(p=>p.id===draft.invoiceId)||periods[0];draft.invoiceId=period.id;
  const options=(items,value)=>items.map(([id,label])=>'<option value="'+esc(id)+'"'+(String(id)===String(value)?' selected':'')+'>'+esc(label)+'</option>').join('');
  const startOptions=Array.from({length:Math.floor((1140-rule.duration-540)/30)+1},(_,i)=>[540+i*30,time(540+i*30)]);
  modal('Change regular schedule','<div class="regular-change-form"><div><h3>'+esc(student.name)+'</h3><p class="small muted mt-8">Current regular lesson: '+esc(ruleText(rule))+'</p></div>'+field('regular-period','Receipt / tuition period','<select id="regular-period">'+options(periods.map(p=>[p.id,p.label+' · '+p.receiptId]),draft.invoiceId)+'</select>')+field('regular-effective','Change from','<input type="date" id="regular-effective" value="'+esc(draft.effectiveDate)+'" min="'+(period.start>TODAY?period.start:TODAY)+'" max="'+period.end+'">')+'<div class="field-row">'+field('regular-weekday','New regular day','<select id="regular-weekday">'+options(days.map((d,i)=>[i+1,d]),draft.weekday)+'</select>')+field('regular-start','Start time','<select id="regular-start">'+options(startOptions,draft.start)+'</select>')+'</div>'+field('regular-tutor','Teacher','<select id="regular-tutor">'+options(tutors.map(t=>[t.id,t.name]),draft.tutor)+'</select>')+'<p class="small muted">Applies to the regular timetable from this date. Existing leave and one-off make-ups stay linked to their original lessons.</p></div>',button('close','Cancel')+button('review','Review lesson count','','btn primary'));
 }
 function capture(){
  const root=getRoot();
  draft={...draft,invoiceId:root.querySelector('#regular-period').value,effectiveDate:root.querySelector('#regular-effective').value,weekday:Number(root.querySelector('#regular-weekday').value),start:Number(root.querySelector('#regular-start').value),tutor:root.querySelector('#regular-tutor').value};
 }
 function showReview(){
  const state=getState(),invoice=state.invoices.find(i=>i.id===preview.invoiceId),receipt=state.receipts.find(r=>r.id===preview.receiptId),delta=preview.delta;
  const beforeKeys=new Set(preview.beforeLessons.map(slotKey)),afterKeys=new Set(preview.proposedLessons.map(slotKey));
  const lessonList=(list,other,side)=>'<ol class="regular-date-list">'+list.map((lesson,index)=>'<li class="'+(!other.has(slotKey(lesson))?'is-'+side:'')+'"><span>'+String(index+1).padStart(2,'0')+'</span><div><strong>'+dateText(lesson.date)+'</strong><span>'+time(lesson.start)+'–'+time(lesson.start+lesson.duration)+'</span></div>'+(!other.has(slotKey(lesson))?'<span class="regular-date-change">'+(side==='added'?'New':'Replaced')+'</span>':'')+'</li>').join('')+'</ol>';
  const preservedKeys=new Set((preview.preservedLessons||[]).map(slotKey));
  const omitted=delta>0?preview.proposedLessons.filter(l=>l.date>=draft.effectiveDate&&!preservedKeys.has(slotKey(l))).slice(-delta):[];
  const choice=delta>0?'<fieldset class="regular-decision"><legend>'+delta+' extra lesson'+(delta===1?'':'s')+'</legend><label class="check-option"><input type="radio" name="regular-decision" value="allow"><span><strong>Allow '+preview.proposedCount+' lessons at the same fee</strong><small>Amend the receipt to include the extra lesson'+(delta===1?'':'s')+'.</small></span></label><label class="check-option"><input type="radio" name="regular-decision" value="decline"><span><strong>Keep '+preview.beforeCount+' lessons</strong><small>No class on '+omitted.map(l=>dateText(l.date)).join(', ')+'.</small></span></label></fieldset>':delta<0?'<fieldset class="regular-decision"><legend>'+Math.abs(delta)+' fewer lesson'+(delta===-1?'':'s')+'</legend><label class="check-option"><input type="radio" name="regular-decision" value="credit"><span><strong>Give '+Math.abs(delta)+' make-up lesson'+(delta===-1?'':'s')+'</strong><small>'+preview.proposedCount+' scheduled + '+Math.abs(delta)+' to arrange with CS.</small></span></label><label class="check-option"><input type="radio" name="regular-decision" value="decline"><span><strong>Keep '+preview.proposedCount+' lessons, no make-up</strong><small>Amend the receipt to the reduced lesson count. Fee stays unchanged.</small></span></label></fieldset>':'<p class="small muted">The lesson count stays the same. The amended receipt will list the new dates.</p>';
  const conflicts=preview.conflicts||[];
  modal('Review regular schedule change','<div class="regular-review"><div class="between wrap"><div><h3>'+esc(studentById(draft.studentId).name)+'</h3><p class="small muted mt-8">'+esc(preview.period.label)+' · From '+dateText(draft.effectiveDate)+'</p></div><div class="regular-count">'+preview.beforeCount+' <span>→</span> '+preview.proposedCount+'<small>scheduled lessons</small></div></div><div class="regular-rule-summary"><p><span>From</span>'+esc(ruleText(preview.oldRule))+'</p><p><span>To</span>'+esc(ruleText(preview.newRule))+'</p></div>'+(preview.makeUpLessonCount?'<p class="small muted">'+preview.makeUpLessonCount+' existing make-up lesson'+(preview.makeUpLessonCount===1?' remains':'s remain')+' included in the receipt.</p>':'')+choice+(conflicts.length?'<div class="notice amber"><strong>Schedule conflicts</strong><ul>'+conflicts.map(c=>'<li>'+esc(c.date?dateText(c.date)+': ':'')+esc(c.reason)+'</li>').join('')+'</ul></div>':'')+'<details class="regular-dates" open><summary>Compare lesson dates</summary><div class="regular-date-columns"><section><h4>Current · '+preview.beforeCount+'</h4>'+lessonList(preview.beforeLessons,afterKeys,'removed')+'</section><section><h4>Proposed · '+preview.proposedCount+'</h4>'+lessonList(preview.proposedLessons,beforeKeys,'added')+'</section></div></details><p class="small muted">'+money(receipt?.amount??invoice?.amount)+' paid · receipt date '+dateText(receipt.issuedDate)+'. The new version retains that date and records today’s amendment. No additional payment.</p></div>',button('back','Back')+button('apply','Apply schedule change',delta?'disabled':'','btn primary'),true);
 }
 function handleAction(action){
  if(!action.startsWith('regular-'))return false;
  if(!admin())return true;
  const name=action.slice(8);
  if(name==='close'){closeModal();return true;}
  if(name==='back'){showForm(draft.studentId,true);return true;}
  if(name==='review'){
   capture();
   try{preview=previewRegularScheduleChange(getState(),draft);showReview();}catch(error){const el=getRoot().querySelector('#form-error');if(el){el.textContent=error.message;el.classList.add('visible');}}
   return true;
  }
  if(name==='apply'&&preview){
   const selected=getRoot().querySelector('input[name="regular-decision"]:checked')?.value;
   let result;
   if(change(()=>{result=applyRegularScheduleChange(getState(),draft,{extra:preview.delta>0?selected:undefined,shortfall:preview.delta<0?selected:undefined,fingerprint:preview.fingerprint});},'Regular schedule changed. Receipt amended.')){preview=null;openReceipt(result.receipt.id);}
   return true;
  }
  return true;
 }
 function onChange(event){
  if(!admin())return false;
  if(event.target.id==='regular-period'){
   capture();const period=getSchedulePeriods(getState(),draft.studentId).find(p=>p.id===draft.invoiceId);if(period&&(draft.effectiveDate<period.start||draft.effectiveDate>period.end))draft.effectiveDate=period.start>TODAY?period.start:TODAY;
   showForm(draft.studentId,true);return true;
  }
  if(event.target.name==='regular-decision'){const apply=getRoot().querySelector('[data-action="regular-apply"]');if(apply)apply.disabled=false;return true;}
  return false;
 }
 return {open:showForm,handleAction,onChange,reset(){draft=null;preview=null;}};
}
