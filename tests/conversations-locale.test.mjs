import test from 'node:test';
import assert from 'node:assert/strict';
import { seed } from '../dist/model.js';
import { normalizeConversations, sendConversationMessage } from '../dist/conversations.js';
import { createConversationUI } from '../dist/conversations-ui.js';

function withUI(run) {
  const previousDocument=globalThis.document, previousMatchMedia=globalThis.matchMedia;
  const input={id:'chat-input',value:'',style:{},scrollHeight:36}, send={classList:{toggle() {}}};
  globalThis.document={querySelector:selector=>selector==='.wa-send'?send:null,getElementById:id=>id==='chat-input'?input:null};
  globalThis.matchMedia=()=>({matches:true});
  try {
    const state=normalizeConversations(seed()), viewer={role:'parent',studentId:'chloe'}, dialogs=[], notices=[];
    const ui=createConversationUI({getState:()=>state,getViewer:()=>viewer,persist() {},render() {},modal:(...args)=>dialogs.push(args),closeModal() {},toast:(...args)=>notices.push(args),childSwitch:()=>''});
    const type=(id,value)=>{if(id==='chat-input')input.value=value;ui.onInput({target:{id,value,selectionStart:value.length}});};
    run({ui,state,viewer,dialogs,notices,type,input});
  } finally {
    if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;
    if(previousMatchMedia===undefined)delete globalThis.matchMedia;else globalThis.matchMedia=previousMatchMedia;
  }
}

test('parent chat renders Chinese controls and fixture content for staff too',()=>withUI(({ui,state,viewer})=>{
  const thread=state.messages.find(thread=>thread.id==='thread-chloe');
  const texts=thread.messages.map(message=>message.text);
  const parent=ui.render();
  assert.match(parent,/MathConcept（荃灣）/);
  assert.match(parent,/aria-label="傳送訊息"/);
  assert.match(parent,/placeholder="輸入訊息"/);
  assert.match(parent,/今天/);
  assert.match(parent,/分兩次補堂/);
  assert.doesNotMatch(parent,/Could Chloe make up/);
  assert.deepEqual(thread.messages.map(message=>message.text),texts);
  viewer.role='teacher';
  const staff=ui.render();
  assert.match(staff,/aria-label="傳送訊息"/);
  assert.match(staff,/分兩次補堂/);
  assert.doesNotMatch(staff,/Could Chloe make up|Send message/);
}));

test('list and message searches match Chinese display text and original English content',()=>withUI(({ui,type})=>{
  ui.render();
  for(const query of ['半小時','half-hour','荃灣']) {
    type('wa-list-search',query);
    assert.match(ui.render().split('</aside>')[0],/data-id="thread-chloe"/);
  }
  type('wa-list-search','找不到這句');
  assert.doesNotMatch(ui.render().split('</aside>')[0],/data-id="thread-chloe"/);
  type('wa-list-search','');
  ui.handleAction('wa-search-chat',null,{});
  type('wa-chat-search','半小時');
  const log=ui.render().split('role="log"')[1].split('<div class="wa-compose-wrap">')[0];
  assert.match(log,/<mark>半小時<\/mark>/);
  assert.match(log,/data-message-id="thread-chloe-message-0"/);
  assert.doesNotMatch(log,/data-message-id="thread-chloe-message-1"/);
  type('wa-chat-search','half-hour');
  assert.match(ui.render().split('role="log"')[1],/data-message-id="thread-chloe-message-0"/);
}));

test('drafts and new messages retain exact user text even when it duplicates a seed',()=>withUI(({ui,state,type})=>{
  ui.render();
  const text='Could Chloe make up her missed lesson as two half-hour extensions?';
  type('chat-input',text);
  assert.match(ui.render(),/草稿：<\/span>Could Chloe make up/);
  ui.handleAction('wa-send',null,{});
  const last=state.messages.find(thread=>thread.id==='thread-chloe').messages.at(-1);
  assert.equal(last.text,text);
  assert.match(ui.render(),/class="wa-message-text">Could Chloe make up/);
}));

test('worksheet dialogs localize labels while shared IDs and stored attachment names remain unchanged',()=>withUI(({ui,state,dialogs})=>{
  ui.render();
  ui.handleAction('wa-worksheet-picker',null,{});
  assert.equal(dialogs.at(-1)[0],'分享工作紙');
  assert.match(dialogs.at(-1)[1],/等值分數/);
  assert.match(dialogs.at(-1)[1],/小三 · 分數/);
  assert.match(dialogs.at(-1)[1],/data-id="fractions-01"/);
  ui.handleAction('wa-share-worksheet','fractions-01',{});
  assert.match(ui.render(),/wa-attachment-preview[\s\S]*等值分數/);
  ui.handleAction('wa-send',null,{});
  const attachment=state.messages.find(thread=>thread.id==='thread-chloe').messages.at(-1).attachment;
  assert.deepEqual(attachment,{kind:'worksheet',name:'Equivalent fractions',worksheetId:'fractions-01'});
  ui.handleAction('wa-attachment','fractions-01',{});
  assert.equal(dialogs.at(-1)[0],'等值分數');
  assert.match(dialogs.at(-1)[1],/學生的學習資料夾/);
}));

test('uploaded names and download URLs stay original while attachment controls and errors localize',()=>withUI(({ui,state,dialogs,notices,type})=>{
  const attachment={kind:'document',name:'Equivalent fractions.pdf',dataUrl:'data:application/pdf;base64,JVBERg=='};
  const message=sendConversationMessage(state,'thread-chloe',{viewer:{role:'admin'},attachment});
  ui.render();
  ui.handleAction('wa-attachment','',{closest:()=>({dataset:{messageId:message.id}})});
  assert.equal(dialogs.at(-1)[0],attachment.name);
  assert.match(dialogs.at(-1)[1],/下載文件/);
  assert.ok(dialogs.at(-1)[1].includes('href="'+attachment.dataUrl+'"'));
  assert.ok(dialogs.at(-1)[1].includes('download="'+attachment.name+'"'));
  ui.onChange({target:{id:'wa-file',files:[{size:3*1024*1024,type:'application/pdf'}]}});
  assert.equal(notices.at(-1)[0],'此示範只支援小於 2 MB 的檔案。');
  type('chat-input','字'.repeat(4001));
  ui.handleAction('wa-send',null,{});
  assert.equal(notices.at(-1)[0],'訊息不可超過 4,000 個字元。');
}));
