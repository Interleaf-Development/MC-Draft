import { centre, tutors, money, studentById, dateLabel } from './model.js';
import { analyzeStatement, importBankStatement, demoStatementRows } from './billing-automation.js';
import { parseStatementCSV } from './statement-csv.js';
import { getStudentProfile } from './student-profile.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const button = (action, label, attrs = '', className = 'btn') => `<button type="button" class="${className}" data-action="bankcheck-${action}" ${attrs}>${label}</button>`;
const channels = [['non-face-to-face','Online payment'],['cash','Cash'],['cheque','Cheque']];
const filters = [['pending','Pending'],['reconciled','Reconciled']];
const auditFilters = [['all','All receipts'],['pending','Outstanding'],['reconciled','Matched']];
const rowStatus = row => row.status === 'matched' && !row.linked ? 'ready' : row.status;

export function createBankCheckUI({getState, getViewer, change, render, modal, closeModal, toast, openMatch, finalAudit = false}) {
  const statusFilters = finalAudit ? auditFilters : filters, defaultFilter = finalAudit ? 'all' : 'pending';
  let query = '', filter = defaultFilter, channel = 'non-face-to-face', page = 1, depositPage = 1, historyPage = 1, ledgerPage = 1, draft = null, searchTimer, queueOpen = false;
  const canUse = () => getViewer().role === 'admin';
  const requireAdmin = () => { if (!canUse()) throw new Error('Bank reconciliation is available to ' + (tutors.find(tutor => tutor.id === centre.managerId)?.name || centre.manager) + ' in the Admin view.'); };
  const showError = error => { const area = document.querySelector('#form-error'); if (area) {area.textContent = error.message; area.classList.add('visible');} else toast(error.message,false,true); };
  const safely = fn => {try {return fn();} catch(error) {showError(error);return false;}};
  const paginate = (items, current, size = 25) => {const pages = Math.max(1,Math.ceil(items.length/size));current = Math.max(1,Math.min(current,pages));return {items:items.slice((current-1)*size,current*size),page:current,pages,total:items.length,start:items.length?(current-1)*size+1:0,end:Math.min(current*size,items.length)};};
  const pager = (result, kind) => result.pages === 1 ? '' : `<div class="collection-footer"><span class="small muted">${result.start}–${result.end} of ${result.total}</span><div class="flex">${button('page','Previous',`data-kind="${kind}" data-direction="previous" data-page="${result.page-1}"${result.page===1?' disabled':''}`,'btn small')}<span class="small muted">${result.page} / ${result.pages}</span>${button('page','Next',`data-kind="${kind}" data-direction="next" data-page="${result.page+1}"${result.page===result.pages?' disabled':''}`,'btn small')}</div></div>`;

  const paymentDate = (state, receipt) => {
    const invoice = state.invoices.find(item => item.id === receipt.invoiceId), review = invoice?.proofReview;
    return review?.extracted?.paymentDate || invoice?.claimedPaymentDate || receipt.paymentDate || receipt.proofDate || null;
  };
  const receiptChannel = row => row.paymentChannel || 'non-face-to-face';
  const dateText = date => date ? dateLabel(date) : 'Not recorded';
  function parentName(state, student) {
    if (!student) return '';
    const saved = state.studentProfiles?.[student.id];
    if (saved && ('parentGivenName' in saved || 'parentSurname' in saved)) {
      const profile = getStudentProfile(state, student.id);
      return [profile.parentGivenName, profile.parentSurname].filter(Boolean).join(' ');
    }
    return student.id === 'mia' && state.assessment?.enrolled ? state.assessment.parent || student.parent : student.parent;
  }
  function primaryActions() {
    return canUse() ? button('upload','Upload bank statement','','btn primary') : '';
  }
  function secondaryActions() {
    if (!canUse()) return '';
    const analysis = analyzeStatement(getState());
    const review = analysis.receipts.filter(row => (finalAudit || receiptChannel(row) === 'non-face-to-face') && rowStatus(row) !== 'matched').length;
    const ready = analysis.receipts.some(row => rowStatus(row) === 'ready');
    return `${review ? button('queue',`${finalAudit?'Outstanding receipts':'Pending payments · all dates'} (${review})`,'','btn ghost small') : ''}${ready ? button('rerun','Reconcile imported entries','','btn ghost small') : ''}${button('deposits',`Unmatched bank credits (${analysis.unmatchedDeposits.length})`,'','btn ghost small')}${button('ledger','Bank ledger','','btn ghost small')}${button('history','Statement history','','btn ghost small')}`;
  }
  function bankTable(rows, result, kind) {
    const state = getState();
    const tableRows = result.items.map(bank => {
      const outgoing = bank.direction === 'debit' || bank.direction === 'outgoing' || Number(bank.amount) < 0;
      const linked = state.receipts.filter(receipt => receipt.bankId === bank.id);
      const link = linked.length ? linked.map(receipt => button('review',receipt.id,`data-id="${esc(receipt.id)}"`,'btn small')).join(' ') : outgoing ? 'Outgoing' : 'Unallocated';
      return `<tr><td class="nowrap">${dateText(bank.date)}</td><td><strong class="small">${esc(bank.payer || bank.description || bank.reference)}</strong>${bank.payer ? `<div class="row-meta">${esc(bank.description || bank.reference)}</div>` : ''}</td>${kind === 'ledger' ? `<td class="billing-amount nowrap">${outgoing?'—':money(bank.amount)}</td><td class="billing-amount nowrap">${outgoing?money(Math.abs(bank.amount)):'—'}</td><td>${link}</td>` : `<td class="billing-amount nowrap">${money(bank.amount)}</td>`}</tr>`;
    }).join('');
    return `<section class="panel billing-table bank-ledger-table"><div class="table-scroll"><table><thead><tr><th>Bank date</th><th>Description / payer</th>${kind === 'ledger' ? `<th>Money in</th><th>Money out</th><th>${finalAudit?'Receipt':'Acknowledgement'} / status</th>` : '<th>Credit</th>'}</tr></thead><tbody>${tableRows}</tbody></table></div>${rows.length?'':`<div class="empty"><h3>${kind === 'ledger'?'No bank entries yet':'No unmatched bank credits'}</h3></div>`}${pager(result,kind)}</section>`;
  }
  function unmatchedSection(analysis) {
    const rows = analysis.unmatchedDeposits, result = paginate(rows,depositPage,10); depositPage = result.page;
    return `<section class="bank-unmatched-section"><div class="bank-section-heading"><h3>Unmatched bank credits <span class="muted">${rows.length}</span></h3></div><p class="small muted bank-section-note">Shared across all payment methods. Identify these credits before allocating them.</p>${bankTable(rows,result,'unmatched')}</section>`;
  }
  function auditMatchStatus(row, bankMap) {
    const status = rowStatus(row), method = receiptChannel(row);
    const labels = {matched:'Matched',ready:'Ready to match','amount-mismatch':'Amount mismatch',ambiguous:'Multiple matches',missing:'Not found',deferred:method === 'cash' ? 'Cash handling' : 'Cheque handling'};
    const tone = status === 'matched' ? 'matched' : status === 'ready' ? 'ready' : status === 'amount-mismatch' ? 'mismatch' : 'review';
    const banks = row.candidateBankIds.map(id=>bankMap.get(id)).filter(Boolean);
    let detail = '';
    if (status === 'ambiguous') detail = banks.length > 1 ? `${banks.length} possible bank credits. Review before linking.` : 'A bank credit could match more than one receipt.';
    else if (banks.length === 1) {
      const bank = banks[0];
      detail = `${dateText(bank.date)} · ${money(bank.amount)} · ${bank.reference || bank.description || bank.payer || 'Bank credit'}`;
      if (status === 'amount-mismatch' && Number.isFinite(row.difference)) detail += ` · ${money(Math.abs(row.difference))} ${row.difference > 0 ? 'short' : 'over'}`;
    } else if (banks.length > 1) detail = `${banks.length} possible credits with different amounts.`;
    else if (status === 'missing') detail = row.linked ? row.reason : 'Upload a statement or review the bank ledger.';
    return `<span class="billing-status ${tone}">${labels[status] || 'Needs review'}</span>${detail?`<div class="row-meta">${esc(detail)}</div>`:''}`;
  }
  function auditWorkspace({reviewQueue = false} = {}) {
    const state = getState(), analysis = analyzeStatement(state), search = query.trim().toLowerCase();
    const receipts = new Map(state.receipts.map(receipt=>[receipt.id,receipt])), banks = new Map(state.bankTransactions.map(bank=>[bank.id,bank]));
    const rows = analysis.receipts.filter(row=> {
      const receipt = receipts.get(row.receiptId), student = studentById(receipt.studentId), invoice = state.invoices.find(item=>item.id===receipt.invoiceId);
      const matched = rowStatus(row) === 'matched';
      return (filter === 'all' || (filter === 'reconciled' ? matched : !matched)) && (!search || [receipt.id,receipt.invoiceId,student?.name,student?.number,parentName(state,student),invoice?.proofPayer,invoice?.proofReview?.extracted?.payer,invoice?.proofReference].join(' ').toLowerCase().includes(search));
    }).sort((a,b)=> (receipts.get(b.receiptId).issuedDate || '').localeCompare(receipts.get(a.receiptId).issuedDate || '') || a.receiptId.localeCompare(b.receiptId));
    const result = paginate(rows,page); page = result.page;
    const tableRows = result.items.map(row=> {
      const receipt = receipts.get(row.receiptId), student = studentById(receipt.studentId), status = rowStatus(row);
      const method = channels.find(([value])=>value===receiptChannel(row))?.[1] || 'Online payment';
      return `<tr data-audit-receipt="${esc(receipt.id)}" data-bank-status="${status}"><td><strong>${esc(student?.name || receipt.studentId)}</strong><div class="row-meta">${esc(receipt.invoiceId)} · ${esc(receipt.id)}</div></td><td class="billing-amount nowrap">${money(receipt.amount)}<div class="row-meta">${method}</div></td><td class="nowrap">${dateText(receipt.issuedDate)}</td><td>${auditMatchStatus(row,banks)}</td><td>${button('review',status === 'matched' ? 'View match' : 'Review match',`data-id="${esc(receipt.id)}" aria-label="${status === 'matched'?'View':'Review'} match for ${esc(receipt.id)}"`,'btn small')}</td></tr>`;
    }).join('');
    const ready = analysis.receipts.some(row=>rowStatus(row)==='ready'), deferred = analysis.receipts.some(row=>row.status==='deferred');
    const empty = search ? 'No matching receipts' : filter === 'reconciled' ? 'No matched receipts' : filter === 'pending' ? 'No outstanding receipts' : 'No receipts issued yet';
    return `<div ${reviewQueue?'id="bankcheck-review-queue" ':''}class="billing-workspace bank-workspace bank-final-audit">${reviewQueue?'':'<p class="small muted bank-section-note">Compare issued receipts with bank deposits. This audit does not issue or resend receipts.</p>'}<div class="billing-toolbar"><input id="bankcheck-search" type="search" value="${esc(query)}" placeholder="Student, invoice or receipt" aria-label="Search receipts"><select id="bankcheck-status" aria-label="Bank match status">${auditFilters.map(([value,label])=>`<option value="${value}"${filter===value?' selected':''}>${label}</option>`).join('')}</select>${reviewQueue?'':`${ready?button('rerun','Reconcile imported entries'):''}${primaryActions()}`}</div><section class="panel bank-results-table bank-audit-table"><div class="table-scroll"><table><thead><tr><th>Student / invoice</th><th>Amount</th><th>Receipt date</th><th>Bank match status</th><th>Action</th></tr></thead><tbody>${tableRows}</tbody></table></div>${rows.length?'':`<div class="empty"><h3>${empty}</h3></div>`}${pager(result,'receipts')}</section>${deferred?'<p class="small muted bank-section-note">Cash deposits and cheque clearance need a separate handling workflow. Automatic bank matching applies to online payments only.</p>':''}${reviewQueue?'':`<div class="billing-secondary-actions">${button('ledger','Bank ledger','','btn ghost small')}${button('history','Statement history','','btn ghost small')}${button('deposits',`Unmatched bank credits (${analysis.unmatchedDeposits.length})`,'','btn ghost small')}</div><p class="small muted bank-section-note">Demo: CSV statements stay on this device. Automatic matching is simulated.</p>`}</div>`;
  }
  function workspace({reviewQueue = false} = {}) {
    if (!canUse()) return '';
    if (finalAudit) return auditWorkspace({reviewQueue});
    const state = getState(), analysis = analyzeStatement(state);
    const ready = analysis.receipts.some(row => rowStatus(row) === 'ready');
    const receiptMap = new Map(state.receipts.map(receipt=>[receipt.id,receipt]));
    const search = query.trim().toLowerCase();
    const rows = analysis.receipts.filter(row=> {
      const receipt = receiptMap.get(row.receiptId), student = studentById(receipt.studentId), invoice = state.invoices.find(i=>i.id===receipt.invoiceId);
      const reconciled = rowStatus(row) === 'matched';
      return receiptChannel(row) === channel && (filter === 'reconciled' ? reconciled : !reconciled) && (!search || [receipt.id,receipt.invoiceId,student?.name,student?.number,parentName(state,student),invoice?.proofPayer,invoice?.proofReview?.extracted?.payer,invoice?.proofReference].join(' ').toLowerCase().includes(search));
    }).sort((a,b)=> {
      const aDate = paymentDate(state,receiptMap.get(a.receiptId)) || '', bDate = paymentDate(state,receiptMap.get(b.receiptId)) || '';
      return aDate.localeCompare(bDate) || a.receiptId.localeCompare(b.receiptId);
    });
    const result = paginate(rows,page); page = result.page;
    const tableRows = result.items.map(row=> {
      const receipt = receiptMap.get(row.receiptId), student = studentById(receipt.studentId);
      return `<tr><td>${button('review',esc(student?.name || receipt.studentId),`data-id="${esc(receipt.id)}"`,'bank-student-link')}<div class="row-meta">${esc(parentName(state,student))}</div></td><td class="billing-amount nowrap">${money(receipt.amount)}</td><td class="nowrap">${dateText(paymentDate(state,receipt))}</td></tr>`;
    }).join('');
    const channelTabs = `<nav class="bank-channel-tabs" aria-label="Payment method">${channels.map(([value,label])=>button('channel',label,`data-id="${value}" aria-pressed="${channel===value}"`,channel===value?'bank-channel-tab active':'bank-channel-tab')).join('')}</nav>`;
    const context = channel === 'non-face-to-face' ? '' : `<p class="small muted bank-channel-context">${channel==='cash'?'Cash collection and deposit handling':'Cheque collection and clearance'} will be defined separately. Existing acknowledgements are listed here; automatic transfer matching does not apply.</p>`;
    const empty = query ? 'No matching payments' : filter === 'reconciled' ? 'No reconciled payments' : `No pending ${channel === 'non-face-to-face' ? 'online' : channel} payments`;
    return `<div ${reviewQueue?'id="bankcheck-review-queue" ':''}class="billing-workspace bank-workspace">${channelTabs}<div class="billing-toolbar"><input id="bankcheck-search" type="search" value="${esc(query)}" placeholder="Student or parent" aria-label="Search payments"><select id="bankcheck-status" aria-label="Reconciliation status">${filters.map(([value,label])=>`<option value="${value}"${filter===value?' selected':''}>${label}</option>`).join('')}</select>${reviewQueue?'':`${ready?button('rerun','Reconcile imported entries'):''}${primaryActions()}`}</div>${context}<section class="panel bank-results-table bank-payment-table"><div class="table-scroll"><table><thead><tr><th>Student / parent</th><th>Amount</th><th>Payment date</th></tr></thead><tbody>${tableRows}</tbody></table></div>${rows.length?'':`<div class="empty"><h3>${empty}</h3></div>`}${pager(result,'receipts')}</section>${reviewQueue?'':`<div class="billing-secondary-actions">${button('ledger','Bank ledger','','btn ghost small')}${button('history','Statement history','','btn ghost small')}</div>${unmatchedSection(analysis)}`}</div>`;
  }
  function reviewQueueDialog() {
    requireAdmin();
    const unmatched = analyzeStatement(getState()).unmatchedDeposits.length;
    modal(finalAudit?'Outstanding receipts':'Pending payments',workspace({reviewQueue:true}),button('deposits',`Unmatched bank credits (${unmatched})`,'','btn ghost')+button('close','Close'),true);
  }
  function openReviewQueue() {
    requireAdmin();
    clearTimeout(searchTimer);query='';filter='pending';channel='non-face-to-face';page=1;draft=null;queueOpen=true;reviewQueueDialog();
  }
  function refreshResults(focusId, selection, pageDirection) {
    queueOpen = queueOpen && Boolean(document.querySelector('#bankcheck-review-queue'));
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
    modal('Unmatched bank credits',`<div class="billing-workspace"><p class="small muted">Shared across all payment methods.</p>${bankTable(rows,result,'deposits')}</div>`,button('close','Close'),true);
  }
  function ledgerDialog() {
    requireAdmin();
    queueOpen=false;clearTimeout(searchTimer);
    const rows = [...getState().bankTransactions].sort((a,b)=>(b.date || '').localeCompare(a.date || ''));
    const result = paginate(rows,ledgerPage,25);ledgerPage=result.page;
    modal('Bank ledger',`<div class="billing-workspace"><p class="small muted">Money in and out across all payment methods. Linking ${finalAudit?'a receipt':'an acknowledgement'} does not create another bank entry.</p>${bankTable(rows,result,'ledger')}</div>`,button('close','Close'),true);
  }
  function historyDialog() {
    requireAdmin();
    queueOpen=false;clearTimeout(searchTimer);
    const result=paginate([...(getState().bankStatementImports||[])].reverse(),historyPage,10);historyPage=result.page;
    const rows=result.items.map(batch=>`<tr><td>${dateLabel(batch.importedDate)}</td><td><strong class="small">${esc(batch.name)}</strong><div class="row-meta">${batch.added} new entries · ${batch.duplicates} already imported</div></td><td>${batch.counts.autoMatched}</td></tr>`).join('');
    modal('Statement history',`<div class="billing-workspace"><section class="panel billing-table"><div class="table-scroll"><table><thead><tr><th>Checked</th><th>Statement</th><th>Matched</th></tr></thead><tbody>${rows}</tbody></table></div>${result.total?'':'<div class="empty"><h3>No statements uploaded</h3></div>'}${pager(result,'history')}</section></div>`,button('close','Close'),true);
  }

  function renderUpload() {
    const rows = draft.rows || [];
    modal('Upload bank statement',`<div class="bank-upload-flow"><input id="bankcheck-file" class="visually-hidden" type="file" accept=".csv,text/csv" aria-label="Choose bank statement"><div class="bank-upload-dropzone"><strong>${esc(draft.name||'Choose a bank statement')}</strong><p class="small muted">CSV · up to 2 MB</p></div><div class="bank-upload-actions">${button('choose-file','Choose file')}${button('sample','Use sample statement','','btn ghost')}</div><details class="billing-help"><summary>CSV format</summary><p class="small muted">Use Date, Description, Debit, Credit (Ledger Balance is optional), or Date, Amount, Reference / Transaction ID. Dates can be YYYY-MM-DD or DD/MM/YYYY. Optional Payer and Direction columns improve matching. Bank descriptions are retained; verify matches when a payer or reference is missing.</p></details>${draft.notice?`<div class="notice blue">${esc(draft.notice)}</div>`:''}${draft.loading?'<p class="small muted" role="status">Opening statement…</p>':''}${rows.length?`<div class="bank-import-summary"><strong>${rows.length} transactions</strong><span>${rows.filter(row=>row.direction!=='debit').length} deposits · ${rows.filter(row=>row.direction==='debit').length} outgoing</span></div><div class="bank-preview-scroll"><table><thead><tr><th>Date</th><th>Payer / reference</th><th>Amount</th><th>Direction</th></tr></thead><tbody>${rows.slice(0,20).map(row=>`<tr><td class="nowrap">${dateLabel(row.date)}</td><td>${esc(row.payer||row.reference)}${row.payer?`<div class="row-meta">${esc(row.reference)}</div>`:''}</td><td class="nowrap">${money(row.amount)}</td><td>${row.direction==='debit'?'Outgoing':'Deposit'}</td></tr>`).join('')}</tbody></table></div>${rows.length>20?'<p class="small muted">Preview shows the first 20 rows. All rows will be checked.</p>':''}`:''}<p class="small muted">Demo: CSV is read locally. PDF/image extraction is not connected.</p></div>`,button('close','Cancel')+button('import','Import & check','data-bank-import'+(!rows.length||draft.loading?' disabled':''),'btn primary'),true);
  }
  function openUpload() { requireAdmin(); queueOpen=false;clearTimeout(searchTimer);draft = {name:'',rows:[],notice:'',loading:false};renderUpload(); }
  function importRows(name, rows) {
    let batch;
    if(change(()=> {requireAdmin();batch=importBankStatement(getState(),{name,rows});})) {draft=null;queueOpen=false;clearTimeout(searchTimer);closeModal();filter='pending';page=1;render();toast(`${batch.counts.autoMatched} payments reconciled. ${batch.added} new bank entries; ${batch.duplicates} already imported.`);}
  }
  function handleAction(action,id,el) {
    if(!action.startsWith('bankcheck-'))return false;
    safely(()=> {
      requireAdmin();
      const name=action.slice(10);
      if(name==='upload')openUpload();
      else if(name==='queue')openReviewQueue();
      else if(name==='channel'){if(!channels.some(([value])=>value===id))throw new Error('Choose a valid payment method.');channel=id;page=1;query='';clearTimeout(searchTimer);refreshResults();}
      else if(name==='review'){if(!getState().receipts.some(receipt=>receipt.id===id))throw new Error('Receipt not found.');queueOpen=false;clearTimeout(searchTimer);openMatch(id);}
      else if(name==='deposits'){depositPage=1;depositsDialog();}
      else if(name==='history'){historyPage=1;historyDialog();}
      else if(name==='ledger'){ledgerPage=1;ledgerDialog();}
      else if(name==='close'){draft=null;queueOpen=false;clearTimeout(searchTimer);closeModal();}
      else if(name==='rerun'){importRows('Recheck imported bank entries',getState().bankTransactions.map(row=>({...row,direction:row.direction || (row.amount < 0 ? 'debit' : 'credit')})));}
      else if(name==='page'){const next=Number(el?.dataset.page);if(!Number.isSafeInteger(next)||next<1)throw new Error('Choose a valid page.');if(el.dataset.kind==='deposits'){depositPage=next;depositsDialog();}else if(el.dataset.kind==='history'){historyPage=next;historyDialog();}else if(el.dataset.kind==='ledger'){ledgerPage=next;ledgerDialog();}else if(el.dataset.kind==='unmatched'){depositPage=next;refreshResults();}else if(el.dataset.kind==='receipts'){const direction=next<page?'previous':'next';page=next;refreshResults(null,null,direction);}else throw new Error('Unknown receipt list.');}
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
    if(event.target.id==='bankcheck-status'){safely(()=>{requireAdmin();if(!statusFilters.some(([value])=>value===event.target.value))throw new Error('Choose a valid reconciliation status.');clearTimeout(searchTimer);filter=event.target.value;page=1;refreshResults('bankcheck-status');});return true;}
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
  return {render:workspace,renderPrimaryActions:primaryActions,renderSecondaryActions:secondaryActions,openReviewQueue,openUpload,handleAction,onInput,onChange,reset:()=>{query='';filter=defaultFilter;channel='non-face-to-face';page=1;depositPage=1;historyPage=1;ledgerPage=1;draft=null;queueOpen=false;clearTimeout(searchTimer);}};
}
