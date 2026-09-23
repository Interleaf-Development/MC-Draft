import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { seed } from '../dist/model.js';
import { getStudentProfile, saveStudentProfile } from '../dist/student-profile.js';
import { staffText, staffDate, staffProfile } from '../dist/staff-locale.js';

test('staff profile display localises fixture facts without altering saved user data or student identity', () => {
 const state=seed(), original=getStudentProfile(state,'chloe'), before=JSON.stringify(state);
 const display=staffProfile(state,original);
 assert.equal(display.school,'示範小學');
 assert.equal(display.parentRelation,'母親');
 assert.equal(display.parentLanguage,'廣東話');
 assert.equal(display.englishName,original.englishName);
 assert.equal(display.studentNumber,original.studentNumber);
 assert.equal(JSON.stringify(state),before);
 // Explicitly authored text is kept even when it matches a fixture phrase.
 saveStudentProfile(state,'chloe',{school:'Demo Primary School',parentLanguage:'Cantonese',parentRelation:'Mother',remark:'Teacher'});
 const custom=staffProfile(state,getStudentProfile(state,'chloe'));
 assert.equal(custom.school,'Demo Primary School');
 assert.equal(custom.parentLanguage,'Cantonese');
 assert.equal(custom.parentRelation,'Mother');
 assert.equal(custom.remark,'Teacher');
});

test('staff errors and dates display in Chinese while unknown values pass through', () => {
 assert.equal(staffText('Choose leave within this staff member’s regular working hours.'),'請選擇職員常規工作時間內的休假時段。');
 assert.equal(staffText('Enter text for parentEmail.'),'請在「電郵」輸入文字。');
 assert.equal(staffText('parentEmail is too long.'),'「電郵」的內容過長。');
 assert.match(staffText('2026-10-01: Choose an available tutor.'),/10月1日：請選擇有空檔的老師/);
 assert.equal(staffText('UNCHANGED-123'),'UNCHANGED-123');
 assert.match(staffDate('2026-09-30',{weekday:'long',year:'numeric'}),/2026.*9.*30.*星期三/);
});

test('translated directory filters retain canonical values used by the data model', async () => {
 const source=await readFile(new URL('../dist/app.js',import.meta.url),'utf8');
 const start=source.indexOf('function filterControl('),end=source.indexOf('const matchesStudent=',start);
 const context=vm.createContext({t:staffText,collection:()=>({day:'Wednesday'})});
 vm.runInContext(source.slice(start,end),context);
 const html=context.filterControl('students','day','Lesson day',[['all','All days'],['Wednesday','Wednesday']]);
 assert.match(html,/aria-label="上課日"/);
 assert.match(html,/<option value="Wednesday" selected>星期三<\/option>/);
 assert.match(html,/<option value="all">所有日子<\/option>/);
});
