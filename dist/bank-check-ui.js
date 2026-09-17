import { centre, tutors, money, studentById, dateLabel, reconciliation } from './model.js';
import { analyzeStatement, importBankStatement, demoStatementRows } from './billing-automation.js';
import { parseStatementCSV } from './statement-csv.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const button = (action, label, attrs = '', className = 'btn') => `<button type="button" class="${className}" data-action="bankcheck-${action}" ${attrs}>${label}</button>`;
const statusText = (label, tone = '') => `<span class="billing-status ${tone}">${esc(label)}</span>`;
const labels = {matched:'Bank matched',ready:'Ready to check',ambiguous:'Ambiguous', 'amount-mismatch':'Amount mismatch',missing:'No matching deposit'};
const rowStatus = row => row.status === 'matched' && !row.linked ? 'ready' : row.status;

export function createBankCheckUI({getState, getViewer, change, render, modal, closeModal, toast, openMatch}) {
  let query = '', filter = 'review', page = 1, depositPage = 1, historyPage = 1, draft = null, searchTimer, queueOpen = false;
  const canUse = () => getViewer().role === 'admin';
  const requireAdmin = () => { if (!canUse()) throw new Error('Bank reconciliation is available to ' + (tutors.find(tutor => tutor.id === centre.managerId)?.name || centre.manager) + ' in the Admin view.'); };
  const showError = error => { const area = document.querySelector('#form-error'); if (area) {area.textContent = error.message; area.classList.add('visible');} else toast(error.message,false,true); };
  const safely = fn => {try {return fn();} catch(error) {showError(error);return false;}};
  const paginate = (items, current, size = 25) => {const pages = Math.max(1,Math.ceil(items.length/size));current = Math.max(1,Math.min(current,pages));return {items:items.slice((current-1)*size,current*size),page:current,pages,total:items.length,start:items.length?(current-1)*size+1:0,end:Math.min(current*size,items.length)};};
  const pager = (result, kind) => result.pages === 1 ? '' : `<div class="collection-footer"><span class="small muted">${result.start}–${result.end} of ${result.total}</span><div class="flex">${button('page','Previous',`data-kind="${kind}" data-direction="previous" data-page="${result.page-1}"${result.page===1?' disabled':''}`,'btn small')}<span class="small muted">${result.page} / ${result.pages}</span>${button('page','Next',`data-kind="${kind}" data-direction="next" data-page="${result.page+1}"${result.page===result.pages?' disabled':''}`,'btn small')}</div></div>`;

  function resultLabel(row) {
    const status = rowStatus(row);
    if (status === 'amount-mismatch' && Number.isFinite(row.difference)) return money(Math.abs(row.difference)) + (row.difference > 0 ? ' short' : ' extra');
    if (status === 'ambiguous') return row.candidateBankIds.length > 1 ? row.candidateBankIds.length + ' possible deposits' : 'Payment shared by receipts';
    return {matched:'Matched',ready:'Awaiting bank check',missing:'Deposit not found','amount-mismatch':'Amount differs'}[status];
  }
  function primaryActions() {
    return canUse() ? button('upload','Upload statement','','btn primary') : '';
  }
  function secondaryActions() {
    if (!canUse()) return '';
    const analysis = analyzeStatement(getState());
    const review = analysis.receipts.filter(row => !['matched','ready'].includes(rowStatus(row))).length;
    const ready = analysis.receipts.some(row => rowStatus(row) === 'ready');
    return `${review ? button('queue',`Needs review · all dates (${review})`,'','btn ghost small') : ''}${ready ? button('rerun','Run bank check','','btn ghost small') : ''}${button('deposits',`Unmatched deposits (${analysis.unmatchedDeposits.length})`,'','btn ghost small')}${button('history','Statement history','','btn ghost small')}`;
  }
  function workspace({reviewQueue = false} = {}) {
    if (!canUse()) return '';
    const state = getState(), analysis = analyzeStatement(state);
    const ready = analysis.receipts.filter(row=>rowStatus(row)==='ready').length;
    const receiptMap = new Map(state.receipts.map(receipt=>[receipt.id,receipt]));
    const statuses = ['review','all','matched','ambiguous','amount-mismatch','missing','ready'];
    const rank = {'amount-mismatch':0,ambiguous:1,missing:2,ready:3,matched:4};
    const search = query.trim().toLowerCase();
    const rows = analysis.receipts.filter(row=> {
      const receipt = receiptMap.get(row.receiptId), student = studentById(receipt.studentId), invoice = state.invoices.find(i=>i.id===receipt.invoiceId);
      const status = rowStatus(row);
      return (filter==='all'||(filter==='review'?!['matched','ready'].includes(status):filter===status)) && (!search||[receipt.id,receipt.invoiceId,student.name,student.number,student.parent,invoice?.proofReference].join(' ').toLowerCase().includes(search));
    }).sort((a,b)=>rank[rowStatus(a)]-rank[rowStatus(b)]);
    const result = paginate(rows,page); page = result.page;
    const tableRows = result.items.map(row=> {
      const receipt = receiptMap.get(row.receiptId), student = studentById(receipt.studentId), status = rowStatus(row);
      return `<tr><td><strong class="small">${esc(student.name)}</strong><div class="row-meta">${esc(receipt.id)}</div></td><td class="nowrap">${money(receipt.amount)}</td><td class="nowrap">${dateLabel(receipt.issuedDate)}</td><td>${filter==='matched'?dateLabel(reconciliation(state,receipt).bank.date):statusText(resultLabel(row),status==='matched'?'matched':status==='amount-mismatch'?'red':'review')}</td><td>${button('review',status==='matched'?'Details':'Review',`data-id="${esc(receipt.id)}"`,'btn small')}</td></tr>`;
    }).join('');
    return `<div ${reviewQueue?'id="bankcheck-review-queue" ':''}class="billing-workspace bank-workspace"><div class="billing-toolbar"><input id="bankcheck-search" type="search" value="${esc(query)}" placeholder="Student or receipt" aria-label="Search reconciliation"><select id="bankcheck-status" aria-label="Reconciliation status">${statuses.map(status=>`<option value="${status}"${filter===status?' selected':''}>${esc(status==='all'?'All receipts':status==='review'?'Needs review':labels[status])}</option>`).join('')}</select>${reviewQueue?'':`${ready?button('rerun','Run bank check'):''}${primaryActions()}`}</div><section class="panel bank-results-table"><div class="table-scroll"><table><thead><tr><th>Student / receipt</th><th>Amount</th><th>Issued</th><th>${filter==='matched'?'Bank credited':'Result'}</th><th></th></tr></thead><tbody>${tableRows}</tbody></table></div>${rows.length?'':`<div class="empty"><h3>${filter==='review'&&!query?'No receipts need review':'No matching receipts'}</h3></div>`}${pager(result,'receipts')}</section>${reviewQueue?'':`<div class="billing-secondary-actions">${button('deposits',`Unmatched deposits (${analysis.unmatchedDeposits.length})`,'','btn ghost small')}${button('history','Statement history','','btn ghost small')}</div>`}</div>`;
  }
  function reviewQueueDialog() {
    requireAdmin();
    const unmatched = analyzeStatement(getState()).unmatchedDeposits.length;
    modal('Receipts needing review',workspace({reviewQueue:true}),button('deposits',`Unmatched deposits (${unmatched})`,'','btn ghost')+button('close','Close'),true);
  }
  function openReviewQueue() {
    requireAdmin();
    clearTimeout(searchTimer);query='';filter='review';page=1;draft=null;queueOpen=true;reviewQueueDialog();
  }
  function refreshResults(focusId, selection, pageDirection) {
    if (queueOpen) reviewQueueDialog(); else render();
    if (focusId) {
      const control = document.querySelector('#'+focusId);
      control?.focus();
      if (selection && control?.setSelectionRange) control.setSelectionRange(...selection);
    }
    if (pageDirection) {
      const selector='[data-action="bankcheck-page"][data-kind="receipts"]';
      const control=document.querySelector(selector+'[data-direction="'+pageDirection+'"]:not([disabled])') || document.querySelector(selector+':not([disabled])');
      control?.focus();
    }
  }
  function depositsDialog() {
    requireAdmin();
    queueOpen=false;clearTimeout(searchTimer);
    const rows = analyzeStatement(getState()).unmatchedDeposits, result = paginate(rows,depositPage,10);depositPage=result.page;
    const tableRows = result.items.map(bank=>`<tr><td>${dateLabel(bank.date)}</td><td><strong class="small">${esc(bank.payer||bank.reference)}</strong>${bank.payer?`<div class="row-meta">${esc(bank.reference)}</div>`:''}</td><td class="nowrap">${money(bank.amount)}</td></tr>`).join('');
    modal('Unmatched deposits',`<div class="billing-workspace"><section class="panel billing-table"><div class="table-scroll"><table><thead><tr><th>Credited</th><th>Payer / reference</th><th>Amount</th></tr></thead><tbody>${tableRows}</tbody></table></div>${rows.length?'':'<div class="empty"><h3>No unmatched deposits</h3></div>'}${pager(result,'deposits')}</section></div>`,button('close','Close'),true);
  }
  function historyDialog() {
    requireAdmin();
    queueOpen=false;clearTimeout(searchTimer);
    const result=paginate([...(getState().bankStatementImports||[])].reverse(),historyPage,10);historyPage=result.page;
    const rows=result.items.map(batch=>`<tr><td>${dateLabel(batch.importedDate)}</td><td><strong class="small">${esc(batch.name)}</strong><div class="row-meta">${batch.added} new deposits · ${batch.duplicates} already imported</div></td><td>${batch.counts.autoMatched}</td></tr>`).join('');
    modal('Statement history',`<div class="billing-workspace"><section class="panel billing-table"><div class="table-scroll"><table><thead><tr><th>Checked</th><th>Statement</th><th>Matched</th></tr></thead><tbody>${rows}</tbody></table></div>${result.total?'':'<div class="empty"><h3>No statements uploaded</h3></div>'}${pager(result,'history')}</section></div>`,button('close','Close'),true);
  }

  function renderUpload() {
    const rows = draft.rows || [];
    modal('Upload bank statement',`<div class="bank-upload-flow"><input id="bankcheck-file" class="visually-hidden" type="file" accept=".csv,text/csv,.pdf,application/pdf,image/png,image/jpeg" aria-label="Choose bank statement"><div class="bank-upload-dropzone"><strong>${esc(draft.name||'Choose a bank statement')}</strong><p class="small muted">CSV · up to 2 MB</p></div><div class="bank-upload-actions">${button('choose-file','Choose file')}${button('sample','Use sample statement','','btn ghost')}</div><details class="billing-help"><summary>CSV format</summary><p class="small muted">Required: Date (YYYY-MM-DD), Amount, and Reference or Transaction ID. Optional: Payer and Direction (credit/debit).</p></details>${draft.notice?`<div class="notice blue">${esc(draft.notice)}</div>`:''}${draft.loading?'<p class="small muted" role="status">Opening statement…</p>':''}${rows.length?`<div class="bank-import-summary"><strong>${rows.length} transactions</strong><span>${rows.filter(row=>row.direction!=='debit').length} deposits · ${rows.filter(row=>row.direction==='debit').length} outgoing</span></div><div class="bank-preview-scroll"><table><thead><tr><th>Date</th><th>Payer / reference</th><th>Amount</th><th>Direction</th></tr></thead><tbody>${rows.slice(0,20).map(row=>`<tr><td class="nowrap">${dateLabel(row.date)}</td><td>${esc(row.payer||row.reference)}${row.payer?`<div class="row-meta">${esc(row.reference)}</div>`:''}</td><td class="nowrap">${money(row.amount)}</td><td>${row.direction==='debit'?'Outgoing':'Deposit'}</td></tr>`).join('')}</tbody></table></div>${rows.length>20?'<p class="small muted">Preview shows the first 20 rows. All rows will be checked.</p>':''}`:''}<p class="small muted">Demo: CSV is read locally. PDF/image extraction is not connected.</p></div>`,button('close','Cancel')+button('import','Import & check','data-bank-import'+(!rows.length||draft.loading?' disabled':''),'btn primary'),true);
  }
  function openUpload() { requireAdmin(); queueOpen=false;clearTimeout(searchTimer);draft = {name:'',rows:[],notice:'',loading:false};renderUpload(); }
  function importRows(name, rows) {
    let batch;
    if(change(()=> {requireAdmin();batch=importBankStatement(getState(),{name,rows});})) {draft=null;queueOpen=false;clearTimeout(searchTimer);closeModal();filter='review';page=1;render();toast(`${batch.counts.autoMatched} receipts matched. ${batch.added} new deposits; ${batch.duplicates} already imported.`);}
  }
  function handleAction(action,id,el) {
    if(!action.startsWith('bankcheck-'))return false;
    safely(()=> {
      requireAdmin();
      const name=action.slice(10);
      if(name==='upload')openUpload();
      else if(name==='queue')openReviewQueue();
      else if(name==='review'){if(!getState().receipts.some(receipt=>receipt.id===id))throw new Error('Receipt not found.');queueOpen=false;clearTimeout(searchTimer);openMatch(id);}
      else if(name==='deposits'){depositPage=1;depositsDialog();}
      else if(name==='history'){historyPage=1;historyDialog();}
      else if(name==='close'){draft=null;queueOpen=false;clearTimeout(searchTimer);closeModal();}
      else if(name==='rerun'){importRows('Recheck imported bank entries',getState().bankTransactions.map(row=>({...row,direction:'credit'})));}
      else if(name==='page'){const next=Number(el?.dataset.page);if(!Number.isSafeInteger(next)||next<1)throw new Error('Choose a valid page.');if(el.dataset.kind==='deposits'){depositPage=next;depositsDialog();}else if(el.dataset.kind==='history'){historyPage=next;historyDialog();}else if(el.dataset.kind==='receipts'){const direction=next<page?'previous':'next';page=next;refreshResults(null,null,direction);}else throw new Error('Unknown receipt list.');}
      else if(!['choose-file','sample','import'].includes(name))throw new Error('Unknown bank action.');
      else if(!draft)throw new Error('Open Upload statement first.');
      else if(name==='choose-file')document.querySelector('#bankcheck-file')?.click();
      else if(name==='sample'){draft={name:'Sample bank statement.csv',rows:demoStatementRows(getState()),notice:'Fictional sample statement.',loading:false};renderUpload();}
      else if(name==='import'){if(!draft.rows.length||draft.loading)throw new Error('Choose a statement first.');importRows(draft.name,draft.rows);}
    });
    return true;
  }
  function onInput(event) {
    if(event.target.id!=='bankcheck-search')return false;
    if(!canUse()){safely(requireAdmin);return true;}
    const selection=[event.target.selectionStart,event.target.selectionEnd];query=event.target.value;page=1;clearTimeout(searchTimer);
    searchTimer=setTimeout(()=>{if(!event.target.isConnected||!canUse())return;refreshResults('bankcheck-search',selection);},150);return true;
  }
  function onChange(event) {
    if(event.target.id==='bankcheck-status'){safely(()=>{requireAdmin();if(!['review','all','matched','ambiguous','amount-mismatch','missing','ready'].includes(event.target.value))throw new Error('Choose a valid reconciliation status.');clearTimeout(searchTimer);filter=event.target.value;page=1;refreshResults('bankcheck-status');});return true;}
    if(event.target.id!=='bankcheck-file')return false;
    safely(()=> {
      requireAdmin();const file=event.target.files?.[0];if(!file)return;
      if(file.size>2*1024*1024)throw new Error('Choose a statement smaller than 2 MB.');
      if(!file.size)throw new Error('This file is empty.');
      if(!/\.csv$/i.test(file.name)&&file.type!=='text/csv'){draft={name:file.name,rows:[],loading:false,notice:'This file has not been read. Use a CSV export, or choose the fictional sample to demonstrate reconciliation.'};renderUpload();return;}
      const current={name:file.name,rows:[],notice:'',loading:true};draft=current;renderUpload();
      file.text().then(text=>{
        if(draft!==current||!canUse()||!document.querySelector('#bankcheck-file'))return;
        draft.loading=false;
        try {draft.rows=parseStatementCSV(text);renderUpload();} catch(error) {draft.rows=[];renderUpload();showError(error);}
      }).catch(error=>{if(draft===current&&canUse()&&document.querySelector('#bankcheck-file')){draft.loading=false;renderUpload();showError(error);}});
    });return true;
  }
  return {render:workspace,renderPrimaryActions:primaryActions,renderSecondaryActions:secondaryActions,openReviewQueue,openUpload,handleAction,onInput,onChange,reset:()=>{query='';filter='review';page=1;depositPage=1;historyPage=1;draft=null;queueOpen=false;clearTimeout(searchTimer);}};
}
