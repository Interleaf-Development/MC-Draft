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

function harness(state = fresh()) {
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
    openMatch:id=>{replaceControls('');calls.matches.push(id);}
  });
  return {state,viewer,calls,ui,document,get modal(){return calls.modals.at(-1);}};
}

test('combined actions count all dates, hide unnecessary checks and distinguish ready deposits from matched receipts', () => {
  const app = harness(reviewState(2));
  const [oldReceipt, recentReceipt] = app.state.receipts;
  oldReceipt.bankId = 'BANK-OLD';
  app.state.bankTransactions.push({id:'BANK-OLD',date:'2026-07-31',amount:2000,reference:'PAID 888888'});
  assert.match(app.ui.renderPrimaryActions(), /Upload bank statement/);
  assert.match(app.ui.renderSecondaryActions(), /Pending payments · all dates \(1\)/);
  assert.doesNotMatch(app.ui.renderSecondaryActions(), /Reconcile imported entries/);
  recentReceipt.bankId = 'BANK-RECENT';
  app.state.bankTransactions.push({id:'BANK-RECENT',date:'2026-09-30',amount:2000,reference:'PAID 999999'});
  assert.doesNotMatch(app.ui.renderSecondaryActions(), /Pending payments|Reconcile imported entries/);
  recentReceipt.bankId = null;
  app.state.invoices.find(invoice=>invoice.id===recentReceipt.invoiceId).proofReference='999999';
  assert.match(app.ui.renderSecondaryActions(), /Reconcile imported entries/);
  assert.match(app.ui.renderSecondaryActions(), /Pending payments · all dates \(1\)/);
  assert.match(app.ui.renderSecondaryActions(), /Unmatched bank credits \(1\)/);
  assert.match(app.ui.renderSecondaryActions(), /Statement history/);
});

test('review queue includes historical receipts, paginates in the modal and resets when reopened', () => {
  const app = harness(reviewState());
  globalThis.document = app.document;
  app.ui.openReviewQueue();
  assert.equal(app.modal.title,'Pending payments');
  assert.match(app.modal.body,/R-QUEUE-00/);
  assert.match(app.modal.body,/31 Jul/);
  assert.match(app.modal.body,/<option value="pending" selected/);
  assert.match(app.modal.body,/1–25 of 28/);
  assert.doesNotMatch(app.modal.body+app.modal.footer,/Upload bank statement|Statement history/);
  assert.match(app.modal.footer,/Unmatched bank credits \(0\)/);
  app.ui.handleAction('bankcheck-page',null,{dataset:{kind:'receipts',page:'2'}});
  assert.match(app.modal.body,/26–28 of 28/);
  assert.match(app.modal.body,/R-QUEUE-27/);
  assert.doesNotMatch(app.modal.body,/R-QUEUE-00/);
  assert.equal(app.document.activeElement.direction,'previous','At the last page focus stays on the remaining usable pagination action');
  assert.equal(app.calls.renders,0,'Queue controls refresh the modal, not the covered board');
  app.ui.handleAction('bankcheck-close');
  assert.equal(app.calls.closed,1);
  app.ui.openReviewQueue();
  assert.match(app.modal.body,/1–25 of 28/);
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
  assert.match(app.modal.body,/No matching payments/);
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
  assert.match(app.calls.toasts.at(-1)[0],/Receipt not found/);
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
  assert.match(app.calls.toasts.at(-1)[0],/payments reconciled/);
});

test('recheck uses existing ready entries, refreshes the board and removes the completed action', () => {
  const app = harness(reviewState(1));
  globalThis.document = app.document;
  app.state.invoices[0].proofReference='111222';
  app.state.bankTransactions.push({id:'BANK-READY',date:'2026-07-31',amount:2000,reference:'FPS 111222'});
  assert.match(app.ui.renderSecondaryActions(),/Reconcile imported entries/);
  app.ui.handleAction('bankcheck-rerun');
  assert.equal(app.state.receipts[0].bankId,'BANK-READY');
  assert.equal(app.state.receipts[0].issuedDate,'2026-07-31');
  assert.equal(app.calls.renders,1);
  assert.doesNotMatch(app.ui.renderSecondaryActions(),/Reconcile imported entries|Pending payments/);
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
    assert.throws(()=>app.ui.openReviewQueue(),/Admin view/);
    app.ui.handleAction('bankcheck-queue');
    app.ui.handleAction('bankcheck-rerun');
    app.ui.onInput({target:{id:'bankcheck-search',value:'hidden'}});
    app.ui.onChange({target:{id:'bankcheck-status',value:'pending'}});
  }
  assert.equal(app.calls.modals.length,0);assert.equal(app.calls.changes,0);
  app.viewer.role='admin';
  assert.equal(app.ui.handleAction('unrelated-action'),false);
  app.ui.handleAction('bankcheck-unknown');
  assert.match(app.calls.toasts.at(-1)[0],/Unknown bank action/);
  app.ui.onChange({target:{id:'bankcheck-status',value:'invalid'}});
  assert.match(app.calls.toasts.at(-1)[0],/valid reconciliation status/);
  app.ui.handleAction('bankcheck-page',null,{dataset:{kind:'other',page:'2'}});
  assert.match(app.calls.toasts.at(-1)[0],/Unknown receipt list/);
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
  assert.match(pending,/Online payment/);
  assert.doesNotMatch(pending,/Non-face-to-face/);
  assert.match(pending,/data-id="non-face-to-face" aria-pressed="true"/);
  assert.match(pending,/R-QUEUE-00/);
  assert.doesNotMatch(pending,/R-QUEUE-01|R-QUEUE-02|R-QUEUE-03/);
  assert.match(pending,/Ethan Wong/);
  assert.match(pending,/Mr Wong/);
  assert.match(pending,/<thead><tr><th>Student \/ parent<\/th><th>Amount<\/th><th>Payment date<\/th><\/tr><\/thead>/);
  assert.doesNotMatch(pending,/<th>Invoice \/ acknowledgement<\/th>|<th>Status<\/th>|>Review<\/button>|>Details<\/button>|>INV-QUEUE-0<|>R-QUEUE-00</);
  assert.match(pending,/Upload bank statement/);
  assert.match(pending,/Payment date/);
  app.ui.onChange({target:{id:'bankcheck-status',value:'reconciled'}});
  assert.match(app.ui.render(),/R-QUEUE-03/);
  assert.doesNotMatch(app.ui.render(),/R-QUEUE-00/);
  app.ui.onChange({target:{id:'bankcheck-status',value:'pending'}});
  app.ui.handleAction('bankcheck-channel','cash');
  const cash = app.ui.render();
  assert.match(cash,/R-QUEUE-01/);
  assert.doesNotMatch(cash,/R-QUEUE-00|R-QUEUE-02|R-QUEUE-03/);
  assert.match(cash,/Cash collection and deposit handling will be defined separately/);
  assert.match(cash,/data-action="bankcheck-review"[^>]*data-id="R-QUEUE-01"[^>]*>Chloe Chan<\/button>/);
  assert.doesNotMatch(cash,/>Review<\/button>|>Details<\/button>/);
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
  assert.match(app.modal.body,/25 Jul/);
  assert.doesNotMatch(app.modal.body,/31 Jul/);
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
  assert.equal(app.modal.title,'Bank ledger');
  assert.match(app.modal.body,/Money in/);
  assert.match(app.modal.body,/Money out/);
  assert.match(app.modal.body,/Unclaimed transfer/);
  assert.match(app.modal.body,/Office supplies/);
  assert.match(app.modal.body,/Outgoing/);
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
  assert.match(app.modal.body,/Date, Description, Debit, Credit/);
  app.ui.onChange({target:{id:'bankcheck-file',files:[{name:'statement.pdf',type:'application/pdf',size:1200}]}});
  assert.match(app.modal.body,/This file has not been read/);
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
