import test from 'node:test';
import assert from 'node:assert/strict';
import { seed, seedTeacherSchedules, seedBusyAfternoons, enrolledStudents, filterStudents, reportingTotals, reconciliation } from '../dist/model.js';
import { familyContent } from '../dist/family-locale.js';
import { getStudentProfile } from '../dist/student-profile.js';
import { analyzeStatement } from '../dist/billing-automation.js';
import { receiptRegister } from '../dist/receipts-ui.js';
import { previewRegularScheduleChange, applyRegularScheduleChange } from '../dist/regular-schedule.js';

const financialReport = state => JSON.parse(JSON.stringify(reportingTotals(state,'2026-09'),(key,value)=>['revisions','originalDocument','activeRevisionId'].includes(key)?undefined:value));

function changed(){
 const state=seed();seedTeacherSchedules(state);seedBusyAfternoons(state);
 const before={totals:financialReport(state),analysis:analyzeStatement(state),register:receiptRegister(state).amount,bank:reconciliation(state,state.receipts.find(r=>r.id==='R-1028'))};
 const input={studentId:'oliver',invoiceId:'INV-1028',effectiveDate:'2026-10-01',weekday:4,start:840,tutor:'chan'};
 const p=previewRegularScheduleChange(state,input);applyRegularScheduleChange(state,input,{extra:'allow',fingerprint:p.fingerprint});
 return{state,before};
}

test('permanent rule is visible in student profile and directory day filters',()=>{
 const {state}=changed(),profile=getStudentProfile(state,'oliver'),student=enrolledStudents(state).find(s=>s.id==='oliver');
 assert.deepEqual(profile.lessonDays,['Thursday']);assert.equal(profile.lessonTime,'14:00');assert.equal(profile.regularEffectiveDate,'2026-10-01');
 assert.equal(student.day,'Thursday');assert.equal(student.regular,'Thursday · 14:00');
 assert.ok(filterStudents(state,{day:'Thursday'}).some(s=>s.id==='oliver'));
 assert.ok(!filterStudents(state,{day:'Wednesday'}).some(s=>s.id==='oliver'));
});

test('amendments preserve bank analysis and HQ totals, and revision IDs find the existing receipt',()=>{
 const {state,before}=changed();
 assert.deepEqual(financialReport(state),before.totals);
 assert.deepEqual(analyzeStatement(state),before.analysis);
 assert.equal(receiptRegister(state).amount,before.register);
 assert.deepEqual(reconciliation(state,state.receipts.find(r=>r.id==='R-1028')),before.bank);
 const result=receiptRegister(state,{query:'R-1028-A1'});assert.equal(result.total,1);assert.equal(result.items[0].receipt.id,'R-1028');
});


test('parent invoice descriptions support amended counts without changing staff copy',()=>{
 for (const count of [7,8,9]) {
  const description='Regular programme · '+count+' lessons';
  assert.equal(familyContent(description,'parent'),'常規課程 · '+count+' 堂');
  assert.equal(familyContent(description,'admin'),description);
 }
});
