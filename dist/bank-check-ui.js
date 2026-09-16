import { money, studentById, dateLabel, reconciliation } from './model.js';
import { analyzeStatement, importBankStatement, demoStatementRows } from './billing-automation.js';
import { parseStatementCSV } from './statement-csv.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const button = (action, label, attrs = '', className = 'btn') => `<button type="button" class="${className}" data-action="bankcheck-${action}" ${attrs}>${label}</button>`;
const badge = (label, colour = '') => `<span class="badge ${colour}">${esc(label)}</span>`;
const labels = {matched:'Bank matched',ready:'Ready to check',ambiguous:'Ambiguous', 'amount-mismatch':'Amount mismatch',missing:'No matching deposit'};
const rowStatus = row => row.status === 'matched' && !row.linked ? 'ready' : row.status;

export function createBankCheckUI({getState, getViewer, change, render, modal, closeModal, toast, openMatch}) {
  let query = '', filter = 'review', page = 1, depositPage = 1, draft = null, searchTimer;
  const canUse = () => getViewer().role === 'admin';
  const requireAdmin = () => { if (!canUse()) throw new Error('Bank reconciliation is available to Koko in the Admin view.'); };
  const showError = error => { const area = document.querySelector('#form-error'); if (area) {area.textContent = error.message; area.classList.add('visible');} else toast(error.message,false,true); };
  const safely = fn => {try {return fn();} catch(error) {showError(error);return false;}};
  const paginate = (items, current, size = 25) => {const pages = Math.max(1,Math.ceil(items.length/size));current = Math.max(1,Math.min(current,pages));return {items:items.slice((current-1)*size,current*size),page:current,pages,total:items.length,start:items.length?(current-1)*size+1:0,end:Math.min(current*size,items.length)};};
  const pager = (result, kind) => `<div class="collection-footer"><span class="small muted">${result.start}–${result.end} of ${result.total}</span><div class="flex">${button('page','Previous',`data-kind="${kind}" data-page="${result.page-1}"${result.page===1?' disabled':''}`,'btn small')}<span class="small muted">${result.page} / ${result.pages}</span>${button('page','Next',`data-kind="${kind}" data-page="${result.page+1}"${result.page===result.pages?' disabled':''}`,'btn small')}</div></div>`;

  function workspace() {
    if (!canUse()) return '';
    const state = getState(), analysis = analyzeStatement(state), latest = state.bankStatementImports?.at(-1);
    const matched = analysis.receipts.filter(row=>rowStatus(row)==='matched').length;
    const ready = analysis.receipts.filter(row=>rowStatus(row)==='ready').length;
    const reviewCount = analysis.receipts.length - matched - ready;
    const receiptMap = new Map(state.receipts.map(receipt=>[receipt.id,receipt]));
    const statuses = ['all','review','ambiguous','amount-mismatch','missing','ready','matched'];
    const rank = {'amount-mismatch':0,ambiguous:1,missing:2,ready:3,matched:4};
    const search = query.trim().toLowerCase();
    const rows = analysis.receipts.filter(row=> {
      const receipt = receiptMap.get(row.receiptId), student = studentById(receipt.studentId), invoice = state.invoices.find(i=>i.id===receipt.invoiceId);
      const status = rowStatus(row);
      return (filter==='all'||(filter==='review'?!['matched','ready'].includes(status):filter===status)) && (!search||[receipt.id,receipt.invoiceId,student.name,student.number,student.parent,invoice?.proofReference].join(' ').toLowerCase().includes(search));
    }).sort((a,b)=>rank[rowStatus(a)]-rank[rowStatus(b)]);
    const result = paginate(rows,page); page = result.page;
    const tableRows = result.items.map(row=> {
      const receipt = receiptMap.get(row.receiptId), student = studentById(receipt.studentId), status = rowStatus(row), match = reconciliation(state,receipt);
      return `<tr><td><strong class="small">${esc(receipt.id)}</strong><div class="row-meta">${esc(student.name)} · ${esc(student.number)}</div></td><td class="nowrap strong">${money(receipt.amount)}</td><td class="nowrap">${dateLabel(receipt.issuedDate)}<div class="row-meta">Proof ${dateLabel(receipt.proofDate)}</div></td><td class="nowrap">${match.bank?dateLabel(match.bank.date):'—'}</td><td>${badge(labels[status],status==='matched'?'green':['ambiguous','ready','missing'].includes(status)?'amber':'red')}<p class="bank-result-reason">${esc(status==='ready'?'Unique candidate found. Run the bank check to confirm.':status==='matched'?'':row.reason)}${row.difference?` ${money(Math.abs(row.difference))} difference.`:''}</p></td><td>${match.adjustment?badge(match.adjustment,'blue'):'—'}</td><td>${button('review','Review',`data-id="${esc(receipt.id)}"`,'btn small')}</td></tr>`;
    }).join('');
    const deposits = paginate(analysis.unmatchedDeposits,depositPage,10); depositPage = deposits.page;
    const depositRows = deposits.items.map(bank=>`<tr><td>${dateLabel(bank.date)}</td><td><strong class="small">${esc(bank.payer||bank.reference)}</strong>${bank.payer?`<div class="row-meta">${esc(bank.reference)}</div>`:''}</td><td class="nowrap strong">${money(bank.amount)}</td></tr>`).join('');
    const history = [...(state.bankStatementImports||[])].reverse().slice(0,10);
    return `<div class="bank-workspace"><div class="bank-run-bar"><div>${latest?`<strong class="small">${esc(latest.name)}</strong><p class="small muted">Checked ${dateLabel(latest.importedDate)} · ${latest.counts.autoMatched} automatically matched</p>`:'<span class="small muted">Upload a statement whenever you’re ready to reconcile.</span>'}</div><div class="flex">${ready?button('rerun','Run bank check') : ''}${button('upload','Upload statement','','btn primary')}</div></div><div class="bank-summary"><div><strong>${matched}</strong><span>Bank matched</span></div><div><strong>${reviewCount}</strong><span>Receipts to review</span></div><div><strong>${analysis.unmatchedDeposits.length}</strong><span>Unlinked deposits</span></div></div><div class="bank-filters"><input id="bankcheck-search" type="search" value="${esc(query)}" placeholder="Student, receipt or payment reference" aria-label="Search reconciliation"><select id="bankcheck-status" aria-label="Reconciliation status">${statuses.map(status=>`<option value="${status}"${filter===status?' selected':''}>${esc(status==='all'?'All receipts':status==='review'?'Needs review':labels[status])}</option>`).join('')}</select></div><section class="panel bank-results-table"><div class="table-scroll"><table><thead><tr><th>Receipt / student</th><th>Amount</th><th>Receipt issued</th><th>Bank credited</th><th>Bank check</th><th>Date adjustment</th><th></th></tr></thead><tbody>${tableRows}</tbody></table></div>${rows.length?'':'<div class="empty"><h3>No receipts in this view</h3></div>'}${pager(result,'receipts')}</section><p class="small muted">Receipt dates stay unchanged. The bank-credit date determines the HQ reporting month.</p><details class="panel bank-batch-history"><summary>Deposits without a receipt match <span class="small muted">${analysis.unmatchedDeposits.length}</span></summary><div class="table-scroll"><table><thead><tr><th>Credited</th><th>Payer / reference</th><th>Amount</th></tr></thead><tbody>${depositRows}</tbody></table></div>${analysis.unmatchedDeposits.length?'':'<p class="panel-body small muted">Every imported deposit has a receipt match.</p>'}${pager(deposits,'deposits')}</details>${history.length?`<details class="panel bank-batch-history"><summary>Recent statement checks <span class="small muted">${history.length}</span></summary>${history.map(batch=>`<div class="list-row"><div class="grow"><strong class="small">${esc(batch.name)}</strong><p class="row-meta">${dateLabel(batch.importedDate)} · ${batch.added} new · ${batch.duplicates} already imported · ${batch.ignored} outgoing ignored</p></div><span class="small">${batch.counts.autoMatched} matched</span></div>`).join('')}</details>`:''}</div>`;
  }

  function renderUpload() {
    const rows = draft.rows || [];
    modal('Upload bank statement',`<div class="bank-upload-flow"><input id="bankcheck-file" class="visually-hidden" type="file" accept=".csv,text/csv,.pdf,application/pdf,image/png,image/jpeg" aria-label="Choose bank statement"><div class="bank-upload-dropzone"><strong>${esc(draft.name||'Choose a bank statement')}</strong><p class="small muted">CSV · up to 2 MB</p></div><div class="bank-upload-actions">${button('choose-file','Choose file')}${button('sample','Use sample statement','','btn ghost')}</div><p class="small muted">CSV columns: Date (YYYY-MM-DD), Amount, Reference, Payer, Transaction ID, Direction. Date, Amount and a Reference or Transaction ID are required.</p>${draft.notice?`<div class="notice blue">${esc(draft.notice)}</div>`:''}${draft.loading?'<p class="small muted" role="status">Opening statement…</p>':''}${rows.length?`<div class="bank-import-summary"><strong>${rows.length} transactions</strong><span>${rows.filter(row=>row.direction!=='debit').length} deposits · ${rows.filter(row=>row.direction==='debit').length} outgoing</span></div><div class="bank-preview-scroll"><table><thead><tr><th>Date</th><th>Payer / reference</th><th>Amount</th><th>Direction</th></tr></thead><tbody>${rows.slice(0,20).map(row=>`<tr><td class="nowrap">${dateLabel(row.date)}</td><td>${esc(row.payer||row.reference)}${row.payer?`<div class="row-meta">${esc(row.reference)}</div>`:''}</td><td class="nowrap">${money(row.amount)}</td><td>${row.direction==='debit'?'Outgoing':'Deposit'}</td></tr>`).join('')}</tbody></table></div>${rows.length>20?'<p class="small muted">Preview shows the first 20 rows. All rows will be checked.</p>':''}`:''}<p class="small muted">Files stay in this browser. PDF and image extraction is not connected in this demo.</p></div>`,button('close','Cancel')+button('import','Import & check','data-bank-import'+(!rows.length||draft.loading?' disabled':''),'btn primary'),true);
  }
  function openUpload() { requireAdmin(); draft = {name:'',rows:[],notice:'',loading:false};renderUpload(); }
  function importRows(name, rows) {
    let batch;
    if(change(()=> {requireAdmin();batch=importBankStatement(getState(),{name,rows});})) {draft=null;closeModal();filter='review';page=1;render();toast(`${batch.counts.autoMatched} receipts matched. ${batch.added} new deposits; ${batch.duplicates} already imported.`);}
  }
  function handleAction(action,id,el) {
    if(!action.startsWith('bankcheck-'))return false;
    safely(()=> {
      requireAdmin();
      const name=action.slice(10);
      if(name==='upload')openUpload();
      else if(name==='review')openMatch(id);
      else if(name==='close'){draft=null;closeModal();}
      else if(name==='rerun'){importRows('Recheck imported bank entries',getState().bankTransactions.map(row=>({...row,direction:'credit'})));}
      else if(name==='page'){if(el.dataset.kind==='deposits')depositPage=Number(el.dataset.page);else page=Number(el.dataset.page);const expanded=document.querySelector('.bank-batch-history')?.open;render();if(expanded)document.querySelector('.bank-batch-history').open=true;}
      else if(!draft)throw new Error('Open Upload statement first.');
      else if(name==='choose-file')document.querySelector('#bankcheck-file')?.click();
      else if(name==='sample'){draft={name:'Sample bank statement.csv',rows:demoStatementRows(getState()),notice:'Fictional sample with a date back, date forward, amount difference and ambiguous deposits.',loading:false};renderUpload();}
      else if(name==='import'){if(!draft.rows.length||draft.loading)throw new Error('Choose a statement first.');importRows(draft.name,draft.rows);}
    });
    return true;
  }
  function onInput(event) {
    if(event.target.id!=='bankcheck-search')return false;
    const cursor=event.target.selectionStart;query=event.target.value;page=1;clearTimeout(searchTimer);
    searchTimer=setTimeout(()=>{if(!event.target.isConnected||!canUse())return;render();const input=document.querySelector('#bankcheck-search');input?.focus();input?.setSelectionRange(cursor,cursor);},150);return true;
  }
  function onChange(event) {
    if(event.target.id==='bankcheck-status'){filter=event.target.value;page=1;render();return true;}
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
  return {render:workspace,openUpload,handleAction,onInput,onChange,reset:()=>{query='';filter='review';page=1;depositPage=1;draft=null;clearTimeout(searchTimer);}};
}
