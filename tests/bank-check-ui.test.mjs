import test from 'node:test';
import assert from 'node:assert/strict';
import { seed, seedCentreVolume } from '../dist/model.js';
import { analyzeStatement, normalizeBillingAutomation } from '../dist/billing-automation.js';
import { createBankCheckUI } from '../dist/bank-check-ui.js';

const fresh = () => normalizeBillingAutomation(seedCentreVolume(seed()));

function reviewState(count = 28) {
  const state = fresh();
  state.bankTransactions = [];
  state.receipts = Array.from({length:count}, (_, index) => ({
    id:'R-QUEUE-'+String(index).padStart(2,'0'), invoiceId:'INV-QUEUE-'+index,
    studentId:index===0?'ethan':'chloe', amount:2000,
    issuedDate:index===0?'2026-07-31':'2026-09-30', bankId:null
  }));
  state.invoices = state.receipts.map(receipt => ({id:receipt.invoiceId,studentId:receipt.studentId,amount:receipt.amount,receiptId:receipt.id,claimedPaymentDate:receipt.issuedDate}));
  return state;
}

function harness(state = fresh(), options = {}) {
  const calls = {renders:0,closed:0,modals:[],matches:[],toasts:[],changes:0};
  const viewer = {role:'admin'}, nodes = new Map();
  let pageControls = [];
  const document = {
    activeElement:null,
    querySelector:selector => {
      if(selector.startsWith('[data-action="bankcheck-page"]')) {
        const direction=selector.match(/data-direction="([^"]+)"/)?.[1];
        return pageControls.find(control=>!control.disabled&&(!direction||control.direction===direction)) || null;
      }
      return nodes.get(selector) || null;
    }
  };
  const replaceControls = html => {
    for (const node of nodes.values()) node.isConnected = false;
    nodes.clear();
    for (const [,id] of html.matchAll(/\bid="([^"]+)"/g)) {
      const node = {id,isConnected:true,value:'',selectionStart:0,selectionEnd:0,focus(){document.activeElement=this;},setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end;}};
      nodes.set('#'+id,node);
    }
    pageControls=[...html.matchAll(/<button\b([^>]*data-action="bankcheck-page"[^>]*)>/g)].map(([,attributes])=>({
      direction:attributes.match(/data-direction="([^"]+)"/)?.[1],disabled:/\sdisabled(?:\s|$)/.test(attributes),focus(){document.activeElement=this;}
    }));
  };
  const ui = createBankCheckUI({
    getState:()=>state,getViewer:()=>viewer,
    change:callback=>{calls.changes++;callback();return true;},
    render:()=>{calls.renders++;},
    modal:(title,body,footer,wide)=>{replaceControls(body);calls.modals.push({title,body,footer,wide});},
    closeModal:()=>{calls.closed++;replaceControls('');},
    toast:(...args)=>calls.toasts.push(args),
    openMatch:id=>{replaceControls('');calls.matches.push(id);},
    ...options
  });
  return {state,viewer,calls,ui,document,get modal(){return calls.modals.at(-1);}};
}

test('combined actions count all dates, hide unnecessary checks and distinguish ready deposits from matched receipts', () => {
  const app = harness(reviewState(2));
  const [oldReceipt, recentReceipt] = app.state.receipts;
  oldReceipt.bankId = 'BANK-OLD';
  app.state.bankTransactions.push({id:'BANK-OLD',date:'2026-07-31',amount:2000,reference:'PAID 888888'});
  assert.match(app.ui.renderPrimaryActions(), /上載銀行結單/);
  assert.match(app.ui.renderSecondaryActions(), /待對數付款 · 所有日期 \(1\)/);
  assert.doesNotMatch(app.ui.renderSecondaryActions(), /核對已匯入紀錄/);
  recentReceipt.bankId = 'BANK-RECENT';
  app.state.bankTransactions.push({id:'BANK-RECENT',date:'2026-09-30',amount:2000,reference:'PAID 999999'});
  assert.doesNotMatch(app.ui.renderSecondaryActions(), /待對數付款|核對已匯入紀錄/);
  recentReceipt.bankId = null;
  app.state.invoices.find(invoice=>invoice.id===recentReceipt.invoiceId).proofReference='999999';
  assert.match(app.ui.renderSecondaryActions(), /核對已匯入紀錄/);
  assert.match(app.ui.renderSecondaryActions(), /待對數付款 · 所有日期 \(1\)/);
  assert.match(app.ui.renderSecondaryActions(), /未配對的銀行入賬（1）/);
  assert.match(app.ui.renderSecondaryActions(), /結單紀錄/);
});

test('review queue includes historical receipts, paginates in the modal and resets when reopened', () => {
  const app = harness(reviewState());
  globalThis.document = app.document;
  app.ui.openReviewQueue();
  assert.equal(app.modal.title,'待對數付款');
  assert.match(app.modal.body,/R-QUEUE-00/);
  assert.match(app.modal.body,/2026年7月31日/);
  assert.match(app.modal.body,/<option value="pending" selected/);
  assert.match(app.modal.body,/第 1–25 項，共 28 項/);
  assert.doesNotMatch(app.modal.body+app.modal.footer,/上載銀行結單|結單紀錄/);
  assert.match(app.modal.footer,/未配對的銀行入賬（0）/);
  app.ui.handleAction('bankcheck-page',null,{dataset:{kind:'receipts',page:'2'}});
  assert.match(app.modal.body,/第 26–28 項，共 28 項/);
  assert.match(app.modal.body,/R-QUEUE-27/);
  assert.doesNotMatch(app.modal.body,/R-QUEUE-00/);
  assert.equal(app.document.activeElement.direction,'previous','At the last page focus stays on the remaining usable pagination action');
  assert.equal(app.calls.renders,0,'Queue controls refresh the modal, not the covered board');
  app.ui.handleAction('bankcheck-close');
  assert.equal(app.calls.closed,1);
  app.ui.openReviewQueue();
  assert.match(app.modal.body,/第 1–25 項，共 28 項/);
  app.ui.reset();
});

test('queue search and status filter refresh the modal while preserving control focus and text selection', async () => {
  const app = harness(reviewState());
  globalThis.document = app.document;
  app.ui.openReviewQueue();
  const input = app.document.querySelector('#bankcheck-search');
  input.value='R-QUEUE-00';input.selectionStart=2;input.selectionEnd=7;
  app.ui.onInput({target:input});
  await new Promise(resolve=>setTimeout(resolve,180));
  assert.match(app.modal.body,/R-QUEUE-00/);
  assert.doesNotMatch(app.modal.body,/R-QUEUE-01/);
  const refreshed = app.document.querySelector('#bankcheck-search');
  assert.equal(app.document.activeElement,refreshed);
  assert.equal(refreshed.selectionStart,2);assert.equal(refreshed.selectionEnd,7);
  assert.equal(input.isConnected,false);
  app.ui.onChange({target:{id:'bankcheck-status',value:'reconciled'}});
  assert.match(app.modal.body,/<option value="reconciled" selected/);
  assert.match(app.modal.body,/沒有符合條件的付款/);
  assert.equal(app.document.activeElement,app.document.querySelector('#bankcheck-status'));
  assert.equal(app.calls.renders,0);
  app.ui.openReviewQueue();
  assert.match(app.modal.body,/<option value="pending" selected/);
  assert.match(app.modal.body,/id="bankcheck-search" type="search" value=""/);
  assert.match(app.modal.body,/R-QUEUE-01/);
  app.ui.reset();
});

test('queue review opens the connected receipt and closing returns to the existing weekly board', () => {
  const app = harness(reviewState());
  globalThis.document = app.document;
  app.ui.openReviewQueue();
  app.ui.handleAction('bankcheck-review','R-QUEUE-00');
  assert.deepEqual(app.calls.matches,['R-QUEUE-00']);
  assert.equal(app.calls.renders,0);
  app.ui.handleAction('bankcheck-review','unknown');
  assert.deepEqual(app.calls.matches,['R-QUEUE-00']);
  assert.match(app.calls.toasts.at(-1)[0],/找不到收據/);
  app.ui.openReviewQueue();
  app.ui.handleAction('bankcheck-close');
  assert.equal(app.calls.closed,1);
  assert.equal(app.calls.renders,0,'Closing does not reset weekly-board navigation');
});

test('statement import updates matching, closes its dialog and refreshes the shared board without changing sent dates', () => {
  const app = harness();
  globalThis.document = app.document;
  const issued = app.state.receipts.map(receipt=>[receipt.id,receipt.issuedDate]);
  const matchedBefore = analyzeStatement(app.state).receipts.filter(row=>row.linked&&row.status==='matched').length;
  app.ui.openUpload();
  app.ui.handleAction('bankcheck-sample');
  app.ui.handleAction('bankcheck-import');
  assert.equal(app.calls.changes,1);
  assert.equal(app.calls.closed,1);
  assert.equal(app.calls.renders,1);
  assert.ok(analyzeStatement(app.state).receipts.filter(row=>row.linked&&row.status==='matched').length>matchedBefore);
  assert.deepEqual(app.state.receipts.map(receipt=>[receipt.id,receipt.issuedDate]),issued);
  assert.match(app.calls.toasts.at(-1)[0],/筆付款/);
});

test('recheck uses existing ready entries, refreshes the board and removes the completed action', () => {
  const app = harness(reviewState(1));
  globalThis.document = app.document;
  app.state.invoices[0].proofReference='111222';
  app.state.bankTransactions.push({id:'BANK-READY',date:'2026-07-31',amount:2000,reference:'FPS 111222'});
  assert.match(app.ui.renderSecondaryActions(),/核對已匯入紀錄/);
  app.ui.handleAction('bankcheck-rerun');
  assert.equal(app.state.receipts[0].bankId,'BANK-READY');
  assert.equal(app.state.receipts[0].issuedDate,'2026-07-31');
  assert.equal(app.calls.renders,1);
  assert.doesNotMatch(app.ui.renderSecondaryActions(),/核對已匯入紀錄|待對數付款/);
});

test('bank controls guard non-admin viewers and reject unknown actions without modifying records', () => {
  const app = harness(reviewState(1));
  globalThis.document = app.document;
  const before = structuredClone(app.state);
  for (const role of ['parent','student','teacher']) {
    app.viewer.role=role;
    assert.equal(app.ui.renderPrimaryActions(),'');
    assert.equal(app.ui.renderSecondaryActions(),'');
    assert.equal(app.ui.render(),'');
    assert.throws(()=>app.ui.openReviewQueue(),/行政介面/);
    app.ui.handleAction('bankcheck-queue');
    app.ui.handleAction('bankcheck-rerun');
    app.ui.onInput({target:{id:'bankcheck-search',value:'hidden'}});
    app.ui.onChange({target:{id:'bankcheck-status',value:'pending'}});
  }
  assert.equal(app.calls.modals.length,0);assert.equal(app.calls.changes,0);
  app.viewer.role='admin';
  assert.equal(app.ui.handleAction('unrelated-action'),false);
  app.ui.handleAction('bankcheck-unknown');
  assert.match(app.calls.toasts.at(-1)[0],/無法識別這項銀行操作/);
  app.ui.onChange({target:{id:'bankcheck-status',value:'invalid'}});
  assert.match(app.calls.toasts.at(-1)[0],/有效的對數狀態/);
  app.ui.handleAction('bankcheck-page',null,{dataset:{kind:'other',page:'2'}});
  assert.match(app.calls.toasts.at(-1)[0],/無法識別這份收據清單/);
  assert.deepEqual(app.state,before);
});

test('payment workspace separates channel queues and reconciled history without hiding older pending acknowledgements', () => {
  const app = harness(reviewState(4));
  globalThis.document = app.document;
  app.state.invoices[1].paymentMethod = 'cash';
  app.state.invoices[2].paymentMethod = 'cheque';
  app.state.receipts[3].bankId = 'BANK-SETTLED';
  app.state.bankTransactions.push({id:'BANK-SETTLED',date:'2026-09-30',amount:2000,reference:'SETTLED'});
  const pending = app.ui.render();
  assert.match(pending,/網上付款/);
  assert.doesNotMatch(pending,/Non-face-to-face/);
  assert.match(pending,/data-id="non-face-to-face" aria-pressed="true"/);
  assert.match(pending,/R-QUEUE-00/);
  assert.doesNotMatch(pending,/R-QUEUE-01|R-QUEUE-02|R-QUEUE-03/);
  assert.match(pending,/Ethan Wong/);
  assert.match(pending,/Mr Wong/);
  assert.match(pending,/<thead><tr><th>學生／家長<\/th><th>金額<\/th><th>付款日期<\/th><\/tr><\/thead>/);
  assert.doesNotMatch(pending,/<th>Invoice \/ acknowledgement<\/th>|<th>Status<\/th>|>覆核<\/button>|>Details<\/button>|>INV-QUEUE-0<|>R-QUEUE-00</);
  assert.match(pending,/上載銀行結單/);
  assert.match(pending,/付款日期/);
  app.ui.onChange({target:{id:'bankcheck-status',value:'reconciled'}});
  assert.match(app.ui.render(),/R-QUEUE-03/);
  assert.doesNotMatch(app.ui.render(),/R-QUEUE-00/);
  app.ui.onChange({target:{id:'bankcheck-status',value:'pending'}});
  app.ui.handleAction('bankcheck-channel','cash');
  const cash = app.ui.render();
  assert.match(cash,/R-QUEUE-01/);
  assert.doesNotMatch(cash,/R-QUEUE-00|R-QUEUE-02|R-QUEUE-03/);
  assert.match(cash,/現金收取及存款處理流程將另行訂定/);
  assert.match(cash,/data-action="bankcheck-review"[^>]*data-id="R-QUEUE-01"[^>]*>Chloe Chan<\/button>/);
  assert.doesNotMatch(cash,/>覆核<\/button>|>Details<\/button>/);
  app.ui.handleAction('bankcheck-channel','cheque');
  assert.match(app.ui.render(),/R-QUEUE-02/);
  assert.doesNotMatch(app.ui.render(),/R-QUEUE-00|R-QUEUE-01|R-QUEUE-03/);
  app.ui.reset();
  assert.match(app.ui.render(),/data-id="non-face-to-face" aria-pressed="true"/);
});

test('payment queue shows the claimed transaction date rather than acknowledgement issue date and searches the payer', async () => {
  const app = harness(reviewState(2));
  globalThis.document = app.document;
  app.state.invoices[0].claimedPaymentDate = '2026-07-25';
  app.state.invoices[0].proofPayer = 'MRS CHAN ACCOUNT';
  app.ui.openReviewQueue();
  assert.match(app.modal.body,/2026年7月25日/);
  assert.doesNotMatch(app.modal.body,/2026年7月31日/);
  const input = app.document.querySelector('#bankcheck-search');
  input.value='MRS CHAN ACCOUNT';
  app.ui.onInput({target:input});
  await new Promise(resolve=>setTimeout(resolve,180));
  assert.match(app.modal.body,/R-QUEUE-00/);
  assert.doesNotMatch(app.modal.body,/R-QUEUE-01/);
  app.ui.reset();
});

test('shared unmatched credits and bank ledger retain outgoing entries without counting them as a payment candidate', () => {
  const app = harness(reviewState(1));
  globalThis.document = app.document;
  app.state.bankTransactions = [
    {id:'CREDIT',date:'2026-09-29',amount:500,reference:'Unclaimed transfer',direction:'credit'},
    {id:'DEBIT',date:'2026-09-29',amount:250,reference:'Office supplies',direction:'debit'}
  ];
  assert.match(app.ui.render(),/Unclaimed transfer/);
  assert.doesNotMatch(app.ui.render(),/Office supplies/);
  app.ui.handleAction('bankcheck-channel','cash');
  assert.match(app.ui.render(),/Unclaimed transfer/,'Unmatched credits stay visible across channels');
  app.ui.handleAction('bankcheck-ledger');
  assert.equal(app.modal.title,'銀行流水賬');
  assert.match(app.modal.body,/入賬/);
  assert.match(app.modal.body,/支出/);
  assert.match(app.modal.body,/Unclaimed transfer/);
  assert.match(app.modal.body,/Office supplies/);
  assert.match(app.modal.body,/支出/);
  app.ui.handleAction('bankcheck-rerun');
  assert.equal(app.state.bankTransactions.length,2,'Rechecking must not duplicate or turn debit entries into credits');
  assert.equal(app.state.bankTransactions.find(row=>row.id==='DEBIT').direction,'debit');
  assert.equal(app.state.receipts[0].bankId,null);
});

test('upload uses CSV only and failed PDF selection cannot import simulated contents', () => {
  const app = harness(reviewState(1));
  globalThis.document = app.document;
  app.ui.openUpload();
  assert.match(app.modal.body,/accept="\.csv,text\/csv"/);
  assert.match(app.modal.body,/Date（日期）、Description（摘要）、Debit（支出）、Credit（入賬）/);
  app.ui.onChange({target:{id:'bankcheck-file',files:[{name:'statement.pdf',type:'application/pdf',size:1200}]}});
  assert.match(app.modal.body,/尚未讀取這個檔案/);
  assert.match(app.modal.footer,/data-bank-import disabled/);
  assert.equal(app.state.bankStatementImports?.length || 0,0);
});


test('closing a review queue with the shared modal close control returns filters to the page', () => {
  const app = harness(reviewState(2));
  globalThis.document = app.document;
  app.ui.openReviewQueue();
  app.document.querySelector = () => null; // The app's shared modal close button removes the dialog.
  app.ui.onChange({target:{id:'bankcheck-status',value:'reconciled'}});
  assert.equal(app.calls.modals.length,1,'Filtering the page must not reopen a dismissed review dialog');
  assert.equal(app.calls.renders,1);
});

function auditState() {
  const state = reviewState(7);
  state.receipts[0].bankId = 'BANK-AUDIT-MATCHED';
  state.invoices[0].claimedPaymentDate = '2026-07-25';
  state.invoices[1].proofReference = 'AUDIT-MISMATCH-101';
  state.invoices[2].proofReference = 'AUDIT-SHARED-102';
  state.invoices[4].paymentMethod = 'cash';
  state.invoices[5].paymentMethod = 'cheque';
  state.invoices[6].proofReference = 'AUDIT-READY-106';
  state.bankTransactions = [
    {id:'BANK-AUDIT-MATCHED',date:'2026-07-25',amount:2000,reference:'AUDIT-MATCHED-100'},
    {id:'BANK-AUDIT-MISMATCH',date:'2026-09-30',amount:1800,reference:'AUDIT-MISMATCH-101'},
    {id:'BANK-AUDIT-SHARED-A',date:'2026-09-30',amount:2000,reference:'AUDIT-SHARED-102'},
    {id:'BANK-AUDIT-SHARED-B',date:'2026-09-30',amount:2000,reference:'AUDIT-SHARED-102'},
    {id:'BANK-AUDIT-READY',date:'2026-09-30',amount:2000,reference:'AUDIT-READY-106'}
  ];
  state.invoices.push({id:'INV-NO-RECEIPT',studentId:'ethan',amount:2000,status:'unpaid'});
  return state;
}

test('final audit lists issued receipts across all channels with bank status and statement controls', () => {
  const app = harness(auditState(),{finalAudit:true}), html = app.ui.render();
  assert.equal([...html.matchAll(/data-audit-receipt=/g)].length,7);
  assert.doesNotMatch(html,/bankcheck-channel|bank-channel-tabs|INV-NO-RECEIPT/);
  assert.match(html,/<option value="all" selected>所有收據/);
  assert.match(html,/<th>學生／繳費通知<\/th><th>金額<\/th><th>收據日期<\/th><th>銀行配對狀態<\/th>/);
  assert.match(html,/INV-QUEUE-0 · R-QUEUE-00/);
  assert.match(html,/data-audit-receipt="R-QUEUE-00"[^]*?<td class="nowrap">2026年7月31日/,'Audit date is the receipt issue date, not the bank or claimed payment date');
  for (const status of ['已配對','金額不符','有多項可能配對','未找到','現金處理','支票處理','可配對']) assert.ok(html.includes('>'+status+'<'),status);
  assert.match(html,/AUDIT-MISMATCH-101[^]*?200[^]*?不足/);
  assert.match(html,/2 筆銀行入賬可能相符/);
  assert.match(html,/data-id="R-QUEUE-00"[^>]*>查看配對<\/button>/);
  assert.match(html,/data-id="R-QUEUE-01"[^>]*>覆核配對<\/button>/);
  for (const label of ['上載銀行結單','銀行流水賬','結單紀錄','未配對的銀行入賬']) assert.ok(html.includes(label),label);
  assert.match(html,/不會發出或重發收據/);
  assert.match(html,/自動銀行配對只適用於網上付款/);
  assert.match(html,/CSV 結單只保留在此裝置，自動配對為模擬操作/);
});

test('final audit filters outstanding and matched receipts while keeping ready, cash and cheque records distinct', () => {
  const app = harness(auditState(),{finalAudit:true});
  globalThis.document = app.document;
  app.ui.onChange({target:{id:'bankcheck-status',value:'pending'}});
  let html = app.ui.render();
  assert.equal([...html.matchAll(/data-audit-receipt=/g)].length,6);
  assert.doesNotMatch(html,/data-audit-receipt="R-QUEUE-00"/);
  assert.match(html,/data-audit-receipt="R-QUEUE-06" data-bank-status="ready"/);
  assert.match(html,/<option value="pending" selected>待跟進/);
  app.ui.onChange({target:{id:'bankcheck-status',value:'reconciled'}});
  html = app.ui.render();
  assert.equal([...html.matchAll(/data-audit-receipt=/g)].length,1);
  assert.match(html,/data-audit-receipt="R-QUEUE-00" data-bank-status="matched"/);
  app.ui.handleAction('bankcheck-review','R-QUEUE-00');
  app.ui.handleAction('bankcheck-review','R-QUEUE-01');
  assert.deepEqual(app.calls.matches,['R-QUEUE-00','R-QUEUE-01']);
  app.ui.reset();
  assert.equal([...app.ui.render().matchAll(/data-audit-receipt=/g)].length,7);
  assert.match(app.ui.render(),/<option value="all" selected/);
});

test('final audit recheck links only the unique online credit and preserves all issued receipts', () => {
  const app = harness(auditState(),{finalAudit:true});
  globalThis.document = app.document;
  const receipts = app.state.receipts.map(({bankId,...receipt})=>receipt);
  app.ui.handleAction('bankcheck-rerun');
  assert.equal(app.state.receipts[6].bankId,'BANK-AUDIT-READY');
  assert.equal(app.state.receipts[1].bankId,null);
  assert.equal(app.state.receipts[2].bankId,null);
  assert.equal(app.state.receipts[4].bankId,null);
  assert.equal(app.state.receipts[5].bankId,null);
  assert.deepEqual(app.state.receipts.map(({bankId,...receipt})=>receipt),receipts);
  assert.equal(app.state.bankTransactions.length,5);
  assert.equal([...app.ui.render().matchAll(/data-audit-receipt=/g)].length,5,'Import returns to the outstanding receipt list');
  app.ui.openUpload();
  assert.match(app.modal.body,/accept="\.csv,text\/csv"/);
  assert.match(app.modal.footer,/匯入並核對/);
});
