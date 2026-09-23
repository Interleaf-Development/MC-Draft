import { billingText, billingDate as dateLabel } from './billing-locale.js';
import { centre, tutors, money, studentById } from './model.js';
import { analyzeStatement, importBankStatement, demoStatementRows } from './billing-automation.js';
import { parseStatementCSV } from './statement-csv.js';
import { getStudentProfile } from './student-profile.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const button = (action, label, attrs = '', className = 'btn') => `<button type="button" class="${className}" data-action="bankcheck-${action}" ${attrs}>${label}</button>`;
const channels = [['non-face-to-face','網上付款'],['cash','現金'],['cheque','支票']];
const filters = [['pending','待對數'],['reconciled','已對數']];
const auditFilters = [['all','所有收據'],['pending','待跟進'],['reconciled','已配對']];
const rowStatus = row => row.status === 'matched' && !row.linked ? 'ready' : row.status;

export function createBankCheckUI({getState, getViewer, change, render, modal, closeModal, toast, openMatch, finalAudit = false}) {
  const statusFilters = finalAudit ? auditFilters : filters, defaultFilter = finalAudit ? 'all' : 'pending';
  let query = '', filter = defaultFilter, channel = 'non-face-to-face', page = 1, depositPage = 1, historyPage = 1, ledgerPage = 1, draft = null, searchTimer, queueOpen = false;
  const canUse = () => getViewer().role === 'admin';
  const requireAdmin = () => { if (!canUse()) throw new Error('銀行對數只供' + (tutors.find(tutor => tutor.id === centre.managerId)?.name || centre.manager) + '在行政介面使用。'); };
  const showError = error => { const area = document.querySelector('#form-error'); if (area) {area.textContent = billingText(error.message); area.classList.add('visible');} else toast(billingText(error.message),false,true); };
  const safely = fn => {try {return fn();} catch(error) {showError(error);return false;}};
  const paginate = (items, current, size = 25) => {const pages = Math.max(1,Math.ceil(items.length/size));current = Math.max(1,Math.min(current,pages));return {items:items.slice((current-1)*size,current*size),page:current,pages,total:items.length,start:items.length?(current-1)*size+1:0,end:Math.min(current*size,items.length)};};
  const pager = (result, kind) => result.pages === 1 ? '' : `<div class="collection-footer"><span class="small muted">第 ${result.start}–${result.end} 項，共 ${result.total} 項</span><div class="flex">${button('page','上一頁',`data-kind="${kind}" data-direction="previous" data-page="${result.page-1}"${result.page===1?' disabled':''}`,'btn small')}<span class="small muted">${result.page} / ${result.pages}</span>${button('page','下一頁',`data-kind="${kind}" data-direction="next" data-page="${result.page+1}"${result.page===result.pages?' disabled':''}`,'btn small')}</div></div>`;

  const paymentDate = (state, receipt) => {
    const invoice = state.invoices.find(item => item.id === receipt.invoiceId), review = invoice?.proofReview;
    return review?.extracted?.paymentDate || invoice?.claimedPaymentDate || receipt.paymentDate || receipt.proofDate || null;
  };
  const receiptChannel = row => row.paymentChannel || 'non-face-to-face';
  const dateText = date => date ? dateLabel(date) : '未有紀錄';
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
    return canUse() ? button('upload','上載銀行結單','','btn primary') : '';
  }
  function secondaryActions() {
    if (!canUse()) return '';
    const analysis = analyzeStatement(getState());
    const review = analysis.receipts.filter(row => (finalAudit || receiptChannel(row) === 'non-face-to-face') && rowStatus(row) !== 'matched').length;
    const ready = analysis.receipts.some(row => rowStatus(row) === 'ready');
    return `${review ? button('queue',`${finalAudit?'待跟進收據':'待對數付款 · 所有日期'} (${review})`,'','btn ghost small') : ''}${ready ? button('rerun','核對已匯入紀錄','','btn ghost small') : ''}${button('deposits',`未配對的銀行入賬（${analysis.unmatchedDeposits.length}）`,'','btn ghost small')}${button('ledger','銀行流水賬','','btn ghost small')}${button('history','結單紀錄','','btn ghost small')}`;
  }
  function bankTable(rows, result, kind) {
    const state = getState();
    const tableRows = result.items.map(bank => {
      const outgoing = bank.direction === 'debit' || bank.direction === 'outgoing' || Number(bank.amount) < 0;
      const linked = state.receipts.filter(receipt => receipt.bankId === bank.id);
      const link = linked.length ? linked.map(receipt => button('review',receipt.id,`data-id="${esc(receipt.id)}"`,'btn small')).join(' ') : outgoing ? '支出' : '未分配';
      return `<tr><td class="nowrap">${dateText(bank.date)}</td><td><strong class="small">${esc(bank.payer || bank.description || bank.reference)}</strong>${bank.payer ? `<div class="row-meta">${esc(bank.description || bank.reference)}</div>` : ''}</td>${kind === 'ledger' ? `<td class="billing-amount nowrap">${outgoing?'—':money(bank.amount)}</td><td class="billing-amount nowrap">${outgoing?money(Math.abs(bank.amount)):'—'}</td><td>${link}</td>` : `<td class="billing-amount nowrap">${money(bank.amount)}</td>`}</tr>`;
    }).join('');
    return `<section class="panel billing-table bank-ledger-table"><div class="table-scroll"><table><thead><tr><th>銀行入賬日期</th><th>交易摘要／付款人</th>${kind === 'ledger' ? `<th>入賬</th><th>支出</th><th>${finalAudit?'收據':'付款確認'}／狀態</th>` : '<th>入賬</th>'}</tr></thead><tbody>${tableRows}</tbody></table></div>${rows.length?'':`<div class="empty"><h3>${kind === 'ledger'?'尚未有銀行交易紀錄':'沒有未配對的銀行入賬'}</h3></div>`}${pager(result,kind)}</section>`;
  }
  function unmatchedSection(analysis) {
    const rows = analysis.unmatchedDeposits, result = paginate(rows,depositPage,10); depositPage = result.page;
    return `<section class="bank-unmatched-section"><div class="bank-section-heading"><h3>未配對的銀行入賬 <span class="muted">${rows.length}</span></h3></div><p class="small muted bank-section-note">包含所有付款方式，請先核實這些入賬再作分配。</p>${bankTable(rows,result,'unmatched')}</section>`;
  }
  function auditMatchStatus(row, bankMap) {
    const status = rowStatus(row), method = receiptChannel(row);
    const labels = {matched:'已配對',ready:'可配對','amount-mismatch':'金額不符',ambiguous:'有多項可能配對',missing:'未找到',deferred:method === 'cash' ? '現金處理' : '支票處理'};
    const tone = status === 'matched' ? 'matched' : status === 'ready' ? 'ready' : status === 'amount-mismatch' ? 'mismatch' : 'review';
    const banks = row.candidateBankIds.map(id=>bankMap.get(id)).filter(Boolean);
    let detail = '';
    if (status === 'ambiguous') detail = banks.length > 1 ? `${banks.length} 筆銀行入賬可能相符，請先覆核再連結。` : '一筆銀行入賬可能對應多張收據。';
    else if (banks.length === 1) {
      const bank = banks[0];
      detail = `${dateText(bank.date)} · ${money(bank.amount)} · ${bank.reference || bank.description || bank.payer || '銀行入賬'}`;
      if (status === 'amount-mismatch' && Number.isFinite(row.difference)) detail += ` · ${money(Math.abs(row.difference))} ${row.difference > 0 ? '不足' : '多付'}`;
    } else if (banks.length > 1) detail = `${banks.length} 筆可能相符的入賬金額不同。`;
    else if (status === 'missing') detail = row.linked ? billingText(row.reason) : '請上載結單或查看銀行流水賬。';
    return `<span class="billing-status ${tone}">${labels[status] || '待覆核'}</span>${detail?`<div class="row-meta">${esc(detail)}</div>`:''}`;
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
      const method = channels.find(([value])=>value===receiptChannel(row))?.[1] || '網上付款';
      return `<tr data-audit-receipt="${esc(receipt.id)}" data-bank-status="${status}"><td><strong>${esc(student?.name || receipt.studentId)}</strong><div class="row-meta">${esc(receipt.invoiceId)} · ${esc(receipt.id)}</div></td><td class="billing-amount nowrap">${money(receipt.amount)}<div class="row-meta">${method}</div></td><td class="nowrap">${dateText(receipt.issuedDate)}</td><td>${auditMatchStatus(row,banks)}</td><td>${button('review',status === 'matched' ? '查看配對' : '覆核配對',`data-id="${esc(receipt.id)}" aria-label="${status === 'matched'?'查看':'覆核'}收據 ${esc(receipt.id)} 的配對"`,'btn small')}</td></tr>`;
    }).join('');
    const ready = analysis.receipts.some(row=>rowStatus(row)==='ready'), deferred = analysis.receipts.some(row=>row.status==='deferred');
    const empty = search ? '沒有符合條件的收據' : filter === 'reconciled' ? '沒有已配對的收據' : filter === 'pending' ? '沒有待跟進收據' : '尚未發出收據';
    return `<div ${reviewQueue?'id="bankcheck-review-queue" ':''}class="billing-workspace bank-workspace bank-final-audit">${reviewQueue?'':'<p class="small muted bank-section-note">核對已發收據與銀行入賬。此對數步驟不會發出或重發收據。</p>'}<div class="billing-toolbar"><input id="bankcheck-search" type="search" value="${esc(query)}" placeholder="學生、繳費通知或收據" aria-label="搜尋收據"><select id="bankcheck-status" aria-label="銀行配對狀態">${auditFilters.map(([value,label])=>`<option value="${value}"${filter===value?' selected':''}>${label}</option>`).join('')}</select>${reviewQueue?'':`${ready?button('rerun','核對已匯入紀錄'):''}${primaryActions()}`}</div><section class="panel bank-results-table bank-audit-table"><div class="table-scroll"><table><thead><tr><th>學生／繳費通知</th><th>金額</th><th>收據日期</th><th>銀行配對狀態</th><th>操作</th></tr></thead><tbody>${tableRows}</tbody></table></div>${rows.length?'':`<div class="empty"><h3>${empty}</h3></div>`}${pager(result,'receipts')}</section>${deferred?'<p class="small muted bank-section-note">現金存款及支票兌現需要另外處理，自動銀行配對只適用於網上付款。</p>':''}${reviewQueue?'':`<div class="billing-secondary-actions">${button('ledger','銀行流水賬','','btn ghost small')}${button('history','結單紀錄','','btn ghost small')}${button('deposits',`未配對的銀行入賬（${analysis.unmatchedDeposits.length}）`,'','btn ghost small')}</div><p class="small muted bank-section-note">示範：CSV 結單只保留在此裝置，自動配對為模擬操作。</p>`}</div>`;
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
    const channelTabs = `<nav class="bank-channel-tabs" aria-label="付款方式">${channels.map(([value,label])=>button('channel',label,`data-id="${value}" aria-pressed="${channel===value}"`,channel===value?'bank-channel-tab active':'bank-channel-tab')).join('')}</nav>`;
    const context = channel === 'non-face-to-face' ? '' : `<p class="small muted bank-channel-context">${channel==='cash'?'現金收取及存款處理':'支票收取及兌現'}流程將另行訂定。此處列出現有付款確認，不適用於自動轉賬配對。</p>`;
    const empty = query ? '沒有符合條件的付款' : filter === 'reconciled' ? '沒有已對數的付款' : `沒有待對數的${channels.find(([value]) => value === channel)?.[1] || '付款'}紀錄`;
    return `<div ${reviewQueue?'id="bankcheck-review-queue" ':''}class="billing-workspace bank-workspace">${channelTabs}<div class="billing-toolbar"><input id="bankcheck-search" type="search" value="${esc(query)}" placeholder="學生或家長" aria-label="搜尋付款"><select id="bankcheck-status" aria-label="對數狀態">${filters.map(([value,label])=>`<option value="${value}"${filter===value?' selected':''}>${label}</option>`).join('')}</select>${reviewQueue?'':`${ready?button('rerun','核對已匯入紀錄'):''}${primaryActions()}`}</div>${context}<section class="panel bank-results-table bank-payment-table"><div class="table-scroll"><table><thead><tr><th>學生／家長</th><th>金額</th><th>付款日期</th></tr></thead><tbody>${tableRows}</tbody></table></div>${rows.length?'':`<div class="empty"><h3>${empty}</h3></div>`}${pager(result,'receipts')}</section>${reviewQueue?'':`<div class="billing-secondary-actions">${button('ledger','銀行流水賬','','btn ghost small')}${button('history','結單紀錄','','btn ghost small')}</div>${unmatchedSection(analysis)}`}</div>`;
  }
  function reviewQueueDialog() {
    requireAdmin();
    const unmatched = analyzeStatement(getState()).unmatchedDeposits.length;
    modal(finalAudit?'待跟進收據':'待對數付款',workspace({reviewQueue:true}),button('deposits',`未配對的銀行入賬（${unmatched}）`,'','btn ghost')+button('close','關閉'),true);
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
    modal('未配對的銀行入賬',`<div class="billing-workspace"><p class="small muted">包含所有付款方式。</p>${bankTable(rows,result,'deposits')}</div>`,button('close','關閉'),true);
  }
  function ledgerDialog() {
    requireAdmin();
    queueOpen=false;clearTimeout(searchTimer);
    const rows = [...getState().bankTransactions].sort((a,b)=>(b.date || '').localeCompare(a.date || ''));
    const result = paginate(rows,ledgerPage,25);ledgerPage=result.page;
    modal('銀行流水賬',`<div class="billing-workspace"><p class="small muted">所有付款方式的入賬及支出。連結${finalAudit?'收據':'付款確認'}不會新增銀行交易紀錄。</p>${bankTable(rows,result,'ledger')}</div>`,button('close','關閉'),true);
  }
  function historyDialog() {
    requireAdmin();
    queueOpen=false;clearTimeout(searchTimer);
    const result=paginate([...(getState().bankStatementImports||[])].reverse(),historyPage,10);historyPage=result.page;
    const rows=result.items.map(batch=>`<tr><td>${dateLabel(batch.importedDate)}</td><td><strong class="small">${esc(batch.name)}</strong><div class="row-meta">新增 ${batch.added} 項 · ${batch.duplicates} 項已匯入</div></td><td>${batch.counts.autoMatched}</td></tr>`).join('');
    modal('結單紀錄',`<div class="billing-workspace"><section class="panel billing-table"><div class="table-scroll"><table><thead><tr><th>核對日期</th><th>結單</th><th>已配對</th></tr></thead><tbody>${rows}</tbody></table></div>${result.total?'':'<div class="empty"><h3>尚未上載結單</h3></div>'}${pager(result,'history')}</section></div>`,button('close','關閉'),true);
  }

  function renderUpload() {
    const rows = draft.rows || [];
    modal('上載銀行結單',`<div class="bank-upload-flow"><input id="bankcheck-file" class="visually-hidden" type="file" accept=".csv,text/csv" aria-label="選擇銀行結單"><div class="bank-upload-dropzone"><strong>${esc(draft.name||'選擇銀行結單')}</strong><p class="small muted">CSV · 不超過 2 MB</p></div><div class="bank-upload-actions">${button('choose-file','選擇檔案')}${button('sample','使用示範結單','','btn ghost')}</div><details class="billing-help"><summary>CSV 格式</summary><p class="small muted">欄位名稱須為 Date（日期）、Description（摘要）、Debit（支出）、Credit（入賬），可選填 Ledger Balance（結餘）；或使用 Date、Amount（金額）、Reference／Transaction ID（參考／交易編號）。日期格式為 YYYY-MM-DD 或 DD/MM/YYYY。可加入 Payer（付款人）及 Direction（入賬／支出）以協助配對。銀行摘要會保留原文；如缺少付款人或參考編號，請核實配對。</p></details>${draft.notice?`<div class="notice blue">${esc(draft.notice)}</div>`:''}${draft.loading?'<p class="small muted" role="status">正在開啟結單…</p>':''}${rows.length?`<div class="bank-import-summary"><strong>${rows.length} 筆交易</strong><span>${rows.filter(row=>row.direction!=='debit').length} 筆入賬 · ${rows.filter(row=>row.direction==='debit').length} 筆支出</span></div><div class="bank-preview-scroll"><table><thead><tr><th>日期</th><th>付款人／參考編號</th><th>金額</th><th>入賬／支出</th></tr></thead><tbody>${rows.slice(0,20).map(row=>`<tr><td class="nowrap">${dateLabel(row.date)}</td><td>${esc(row.payer||row.reference)}${row.payer?`<div class="row-meta">${esc(row.reference)}</div>`:''}</td><td class="nowrap">${money(row.amount)}</td><td>${row.direction==='debit'?'支出':'入賬'}</td></tr>`).join('')}</tbody></table></div>${rows.length>20?'<p class="small muted">預覽顯示首 20 行，核對時會檢查所有資料。</p>':''}`:''}<p class="small muted">示範：CSV 只在此裝置讀取，尚未連接 PDF／圖片資料讀取功能。</p></div>`,button('close','取消')+button('import','匯入並核對','data-bank-import'+(!rows.length||draft.loading?' disabled':''),'btn primary'),true);
  }
  function openUpload() { requireAdmin(); queueOpen=false;clearTimeout(searchTimer);draft = {name:'',rows:[],notice:'',loading:false};renderUpload(); }
  function importRows(name, rows) {
    let batch;
    if(change(()=> {requireAdmin();try { batch=importBankStatement(getState(),{name,rows}); } catch (error) { throw new Error(billingText(error.message)); }})) {draft=null;queueOpen=false;clearTimeout(searchTimer);closeModal();filter='pending';page=1;render();toast(`已核對 ${batch.counts.autoMatched} 筆付款。新增 ${batch.added} 項銀行紀錄；${batch.duplicates} 項已匯入。`);}
  }
  function handleAction(action,id,el) {
    if(!action.startsWith('bankcheck-'))return false;
    safely(()=> {
      requireAdmin();
      const name=action.slice(10);
      if(name==='upload')openUpload();
      else if(name==='queue')openReviewQueue();
      else if(name==='channel'){if(!channels.some(([value])=>value===id))throw new Error('請選擇有效的付款方式。');channel=id;page=1;query='';clearTimeout(searchTimer);refreshResults();}
      else if(name==='review'){if(!getState().receipts.some(receipt=>receipt.id===id))throw new Error('找不到收據。');queueOpen=false;clearTimeout(searchTimer);openMatch(id);}
      else if(name==='deposits'){depositPage=1;depositsDialog();}
      else if(name==='history'){historyPage=1;historyDialog();}
      else if(name==='ledger'){ledgerPage=1;ledgerDialog();}
      else if(name==='close'){draft=null;queueOpen=false;clearTimeout(searchTimer);closeModal();}
      else if(name==='rerun'){importRows('重新核對已匯入銀行紀錄',getState().bankTransactions.map(row=>({...row,direction:row.direction || (row.amount < 0 ? 'debit' : 'credit')})));}
      else if(name==='page'){const next=Number(el?.dataset.page);if(!Number.isSafeInteger(next)||next<1)throw new Error('請選擇有效頁面。');if(el.dataset.kind==='deposits'){depositPage=next;depositsDialog();}else if(el.dataset.kind==='history'){historyPage=next;historyDialog();}else if(el.dataset.kind==='ledger'){ledgerPage=next;ledgerDialog();}else if(el.dataset.kind==='unmatched'){depositPage=next;refreshResults();}else if(el.dataset.kind==='receipts'){const direction=next<page?'previous':'next';page=next;refreshResults(null,null,direction);}else throw new Error('無法識別這份收據清單。');}
      else if(!['choose-file','sample','import'].includes(name))throw new Error('無法識別這項銀行操作。');
      else if(!draft)throw new Error('請先開啟上載結單。');
      else if(name==='choose-file')document.querySelector('#bankcheck-file')?.click();
      else if(name==='sample'){draft={name:'示範銀行結單.csv',rows:demoStatementRows(getState()),notice:'虛構示範結單。',loading:false};renderUpload();}
      else if(name==='import'){if(!draft.rows.length||draft.loading)throw new Error('請先選擇結單。');importRows(draft.name,draft.rows);}
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
    if(event.target.id==='bankcheck-status'){safely(()=>{requireAdmin();if(!statusFilters.some(([value])=>value===event.target.value))throw new Error('請選擇有效的對數狀態。');clearTimeout(searchTimer);filter=event.target.value;page=1;refreshResults('bankcheck-status');});return true;}
    if(event.target.id!=='bankcheck-file')return false;
    safely(()=> {
      requireAdmin();const file=event.target.files?.[0];if(!file)return;
      if(file.size>2*1024*1024)throw new Error('請選擇小於 2 MB 的結單。');
      if(!file.size)throw new Error('這個檔案沒有內容。');
      if(!/\.csv$/i.test(file.name)&&file.type!=='text/csv'){draft={name:file.name,rows:[],loading:false,notice:'尚未讀取這個檔案。請使用匯出的 CSV，或選擇虛構示範結單體驗對數流程。'};renderUpload();return;}
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
