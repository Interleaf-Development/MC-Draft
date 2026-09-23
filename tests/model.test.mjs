import test from 'node:test';
import assert from 'node:assert/strict';
import { seed, clone, activeBooking, validateSlot, moveBooking, requestAbsence, bookMakeup, issueReceipt, matchReceipt, reconciliation, reportingTotals, assessmentCredit, staffBalance, cycleForDate } from '../dist/model.js';
import { demoStatementRows } from '../dist/billing-automation.js';
test('an ordinary move preserves its source and stops it occupying a seat',()=>{
 const s=seed(),source=s.bookings.find(b=>b.studentId==='chloe'&&b.date==='2026-09-30');
 const moved=moveBooking(s,source.id,{date:'2026-09-30',start:1020,tutor:'chan'});
 assert.equal(source.status,'moved');assert.equal(activeBooking(source),false);assert.equal(moved.sourceId,source.id);assert.equal(moved.duration,60);
});
test('full capacity rejects a booking without changing state',()=>{
 const s=seed(),before=clone(s),source=s.bookings.find(b=>b.studentId==='ryan'&&b.date==='2026-09-30'&&b.start===900);
 assert.throws(()=>moveBooking(s,source.id,{date:'2026-09-30',start:960,tutor:'chan'}),/six students/);
 assert.deepEqual(s,before);
});
test('rejected expired move never creates a ghost reschedule',()=>{
 const s=seed(),source=s.bookings.find(b=>b.studentId==='chloe'&&b.date==='2026-09-30'),before=clone(s);
 assert.throws(()=>moveBooking(s,source.id,{date:'2026-10-21',start:960,tutor:'chan'}),/deadline/);
 assert.deepEqual(s,before);
});
test('explicit manager extension is recorded while original expiry remains',()=>{
 const s=seed(),source=s.bookings.find(b=>b.studentId==='chloe'&&b.date==='2026-09-30');
 const moved=moveBooking(s,source.id,{date:'2026-10-01',start:960,tutor:'chan',approvedExpiry:'2026-10-14',overrideReason:'School event'});
 const m=s.makeups.find(m=>m.id===moved.caseId);
 assert.equal(m.expiry,'2026-10-14');assert.equal(m.originalExpiry,'2026-09-30');assert.equal(m.reason,'School event');
});
test('move cannot silently increase lesson duration',()=>{
 const s=seed(),source=s.bookings.find(b=>b.studentId==='chloe'&&b.date==='2026-09-30');
 const moved=moveBooking(s,source.id,{date:'2026-09-30',start:1020,tutor:'chan',duration:90});
 assert.equal(moved.duration,60);assert.equal(s.makeups.find(m=>m.id===moved.caseId).used,60);
});
test('two 30-minute extensions remain one 60-minute make-up case',()=>{
 const s=seed(),count=s.makeups.length;
 const bookings=bookMakeup(s,'makeup-chloe',[{date:'2026-10-02',start:1020,duration:30,tutor:'chan'},{date:'2026-10-07',start:1020,duration:30,tutor:'chan'}]);
 assert.equal(bookings.length,2);assert.equal(s.makeups.length,count);assert.equal(s.makeups[0].used,60);assert.equal(new Set(bookings.map(b=>b.caseId)).size,1);
 assert.equal(s.bookings.find(b=>b.id==='missed-sep23').status,'moved');
});
test('a failed second split booking cannot partially commit the first',()=>{
 const s=seed(),before=clone(s);
 assert.throws(()=>bookMakeup(s,'makeup-chloe',[{date:'2026-10-02',start:1020,duration:30,tutor:'chan'},{date:'2026-10-21',start:1020,duration:30,tutor:'chan'}]),/deadline/);
 assert.deepEqual(s,before);
});
test('capacity checks every overlapping part of an extension',()=>{
 const s=seed();s.bookings=[];
 for(let i=0;i<6;i++)s.bookings.push({id:'b'+i,studentId:'s'+i,date:'2026-10-02',start:1020,duration:60,tutor:'chan',status:'scheduled'});
 assert.match(validateSlot(s,{studentId:'chloe',date:'2026-10-02',start:990,duration:60,tutor:'chan'}),/six students/);
 assert.equal(validateSlot(s,{studentId:'chloe',date:'2026-10-02',start:990,duration:30,tutor:'chan'}),null);
});
test('October absences belong to the October-November block',()=>{
 const s=seed(),b=s.bookings.find(b=>b.studentId==='chloe'&&b.date==='2026-10-07');
 const r=requestAbsence(s,b.id,'School event'),m=s.makeups.find(item=>item.id===r.makeupId);
 assert.equal(m.period,'Oct–Nov 2026');assert.equal(m.expiry,'2026-11-30');
 assert.deepEqual(cycleForDate('2027-01-05'),{period:'Dec–Jan 2026/2027',expiry:'2027-01-31'});
});
test('receipt issues before bank match and repeated issuance is idempotent',()=>{
 const s=seed(),invoice=s.invoices.find(i=>i.id==='INV-1024');invoice.proof=true;s.reportSubmitted=true;
 const r=issueReceipt(s,invoice.id);assert.equal(r.bankId,null);assert.equal(reconciliation(s,r).status,'Unmatched');assert.equal(s.reportSubmitted,false);
 assert.equal(issueReceipt(s,invoice.id).id,r.id);assert.equal(s.receipts.filter(x=>x.id===r.id).length,1);
});
test('date-back preserves the August receipt date and assigns July bank month',()=>{
 const s=seed();s.bankTransactions.push(demoStatementRows(s).find(b=>b.id==='BANK-101'));matchReceipt(s,'R-1025','BANK-101');const r=s.receipts.find(r=>r.id==='R-1025'),m=reconciliation(s,r);
 assert.equal(r.issuedDate,'2026-08-01');assert.equal(m.adjustment,'Date back');assert.equal(m.month,'2026-07');
 assert.ok(reportingTotals(s,'2026-07').matched.some(e=>e.receipt.id==='R-1025'));
});
test('date-forward moves bank reporting into August without changing the July receipt date',()=>{
 const s=seed();s.bankTransactions.push(demoStatementRows(s).find(b=>b.id==='BANK-102'));matchReceipt(s,'R-1026','BANK-102');const r=s.receipts.find(r=>r.id==='R-1026'),m=reconciliation(s,r);
 assert.equal(r.issuedDate,'2026-07-31');assert.equal(m.adjustment,'Date forward');assert.equal(m.month,'2026-08');
 assert.equal(reportingTotals(s,'2026-08').total,2000);
});
test('amount differences stay unresolved, and bank entries cannot be double matched',()=>{
 const s=seed();s.bankTransactions.push(demoStatementRows(s).find(b=>b.id==='BANK-103'));matchReceipt(s,'R-1027','BANK-103');const m=reconciliation(s,s.receipts.find(r=>r.id==='R-1027'));
 assert.equal(m.status,'Difference');assert.equal(m.difference,200);assert.ok(reportingTotals(s,'2026-09').unresolved.some(e=>e.receipt.id==='R-1027'));
 assert.throws(()=>matchReceipt(s,'R-1025','BANK-103'),/already linked/);
});
test('assessment deduction includes the seventh day and expires afterward',()=>{
 const a=seed().assessment;assert.equal(assessmentCredit(a,'2026-10-03'),200);assert.equal(assessmentCredit(a,'2026-10-04'),0);assert.equal(assessmentCredit(a,'2026-09-25'),0);
});
test('holiday overlap credits add to the balance; only recorded leave is deducted',()=>{
 const s=seed();assert.deepEqual(s.staffLeave,[]);assert.deepEqual(staffBalance(s,'chan'),{allowance:14,holidayCredit:1,taken:4,available:11,pending:0});
 s.staffLeave.push({id:'legacy-pending',staffId:'chan',date:'2026-10-07',unit:'PM',days:.5,status:'pending'});
 assert.equal(staffBalance(s,'chan').available,11);assert.equal(staffBalance(s,'chan').pending,0);
 s.staffLeave[0].status='recorded';assert.equal(staffBalance(s,'chan').available,10.5);assert.equal(staffBalance(s,'chan').pending,0);
});


test('make-up periods follow each student’s two-month billing anchor', () => {
 const state = seed();
 state.tuitionPlans = { chloe: { currentCycle: { billingMonths: 2, periodStart: '2026-09-01' } } };
 assert.deepEqual(cycleForDate('2026-10-07', state, 'chloe'), { period: 'Sep–Oct 2026', expiry: '2026-10-31' });
 assert.deepEqual(cycleForDate('2026-12-07', state, 'chloe'), { period: 'Nov–Dec 2026', expiry: '2026-12-31' });
 assert.deepEqual(cycleForDate('2027-01-07', state, 'chloe'), { period: 'Jan–Feb 2027', expiry: '2027-02-28' });
 assert.deepEqual(cycleForDate('2026-10-07', state, 'ethan'), { period: 'Oct–Nov 2026', expiry: '2026-11-30' });
 const source = state.bookings.find(b => b.studentId === 'chloe' && b.date === '2026-10-07');
 const result = requestAbsence(state, source.id, 'School event');
 const makeup = state.makeups.find(item => item.id === result.makeupId);
 assert.equal(makeup.period, 'Sep–Oct 2026');
 assert.equal(makeup.expiry, '2026-10-31');
});

test('two-month invoice anchors work without a plan and ignore void invoices', () => {
 const state = { invoices: [
  { studentId: 's', billingMonths: 2, periodStart: '2026-09-01' },
  { studentId: 's', billingMonths: 2, periodStart: '2026-10-01', voided: true }
 ] };
 assert.deepEqual(cycleForDate('2026-10-07', state, 's'), { period: 'Sep–Oct 2026', expiry: '2026-10-31' });
});


test('legacy paid periods retain their own expiry without new billing metadata', () => {
 const state = { invoices: [{ id: 'old', studentId: 's', period: 'Sep–Oct 2026', receiptId: 'r' }], receipts: [{id:'r',invoiceId:'old'}], tuitionPlans: { s: { currentCycle: { billingMonths:2, periodStart:'2026-10-01' } } } };
 assert.deepEqual(cycleForDate('2026-10-20',state,'s'),{period:'Sep–Oct 2026',expiry:'2026-10-31'});
 state.invoices[0] = {id:'old',studentId:'s',periodStart:'2026-09-01',periodEnd:'2026-10-31'};
 assert.deepEqual(cycleForDate('2026-10-20',state,'s'),{period:'Sep–Oct 2026',expiry:'2026-10-31'});
 state.invoices[0] = {id:'old',studentId:'s',period:'Dec–Jan 2026/2027',receiptId:'r'};
 assert.deepEqual(cycleForDate('2027-01-05',state,'s'),{period:'Dec–Jan 2026/2027',expiry:'2027-01-31'});
});
