import { TODAY, students, billingPayerName, money } from './model.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const studentIndex = new Map(students.map(student => [student.id, student]));
const dayMilliseconds = 24 * 60 * 60 * 1000;
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && Number.isFinite(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
const addDays = (date, count) => new Date(Date.parse(date + 'T00:00:00Z') + count * dayMilliseconds).toISOString().slice(0, 10);
const dateText = (date, options = {}) => new Date(date + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC', ...options });
const button = (action, label, attrs = '', className = 'btn small') => `<button type="button" class="${className}" data-action="receipts-${action}" ${attrs}>${label}</button>`;
const arrow = direction => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${direction === 'left' ? 'm14 7-5 5 5 5' : 'm10 7 5 5-5 5'}"/></svg>`;

/** Receipt dates describe when the receipt was issued/sent, independently of bank credit dates. */
export function receiptPeriod(date = TODAY, view = 'week') {
  const anchor = validDate(date) ? date : TODAY;
  const start = view === 'day' ? anchor : addDays(anchor, -((new Date(anchor + 'T00:00:00Z').getUTCDay() + 6) % 7));
  return { start, end: view === 'day' ? start : addDays(start, 6) };
}

export function hasReceiptProof(invoice) {
  const review = invoice?.proofReview;
  if (!review) return false;
  if (review.file) {
    const { mimeType, dataUrl } = review.file;
    return ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf'].includes(mimeType) && typeof dataUrl === 'string' && dataUrl.startsWith(`data:${mimeType};base64,`);
  }
  return review.mode === 'demo' || review.fixture === true;
}

/** Build a read-only register, paginated after filtering and sorting by receipt sent date. */
export function receiptRegister(state, { date = TODAY, view = 'week', query = '', page = 1, pageSize = 25 } = {}) {
  const period = receiptPeriod(date, view), needle = query.trim().toLocaleLowerCase();
  const invoiceIndex = new Map((state.invoices || []).map(invoice => [invoice.id, invoice]));
  const rows = (state.receipts || []).filter(receipt => validDate(receipt.issuedDate) && receipt.issuedDate >= period.start && receipt.issuedDate <= period.end).map(receipt => {
    const invoice = invoiceIndex.get(receipt.invoiceId);
    const student = studentIndex.get(receipt.studentId) || { id: receipt.studentId, name: receipt.studentId || 'Unknown student', number: '', parent: '' };
    const parent = billingPayerName(state, receipt.studentId) || student.parent;
    return { receipt, invoice, student, parent, proofAvailable: hasReceiptProof(invoice) };
  }).filter(row => !needle || [row.student.name, row.student.number, row.student.parent, row.parent, row.invoice?.proofPayer, row.invoice?.proofReview?.extracted?.payer, row.receipt.id, row.receipt.invoiceId, row.invoice?.proofReference, row.invoice?.proofReview?.extracted?.reference].join(' ').toLocaleLowerCase().includes(needle))
    .sort((a, b) => b.receipt.issuedDate.localeCompare(a.receipt.issuedDate) || b.receipt.id.localeCompare(a.receipt.id, 'en', { numeric: true }));
  const size = pageSize === 50 ? 50 : 25, pageCount = Math.max(1, Math.ceil(rows.length / size));
  const currentPage = Math.max(1, Math.min(Number.isFinite(Number(page)) ? Math.floor(Number(page)) : 1, pageCount));
  const items = rows.slice((currentPage - 1) * size, currentPage * size);
  const groups = [];
  for (const row of items) {
    if (groups.at(-1)?.date !== row.receipt.issuedDate) groups.push({ date: row.receipt.issuedDate, rows: [] });
    groups.at(-1).rows.push(row);
  }
  return { ...period, items, groups, total: rows.length, amount: rows.reduce((total, row) => total + Number(row.receipt.amount || 0), 0), page: currentPage, pageSize: size, pageCount, first: rows.length ? (currentPage - 1) * size + 1 : 0, last: Math.min(currentPage * size, rows.length) };
}

/** The host owns rendering and evidence dialogs. This workspace never changes billing records. */
export function createReceiptsUI({ getState, render, openReceipt, openProof }) {
  let view = 'week', date = TODAY, query = '', page = 1, pageSize = 25, searchTimer;
  const refresh = () => { clearTimeout(searchTimer); render(); };

  function workspace() {
    const result = receiptRegister(getState(), { date, view, query, page, pageSize });
    page = result.page;
    const periodTitle = result.start === result.end ? dateText(result.start, { weekday: 'short' }) : `${dateText(result.start, { year: undefined })} – ${dateText(result.end)}`;
    const groups = result.groups.map(group => `<tbody><tr class="receipts-day"><td colspan="5"><time datetime="${group.date}">${dateText(group.date, { weekday: 'long' })}</time></td></tr>${group.rows.map(({ receipt, invoice, student, parent, proofAvailable }) => `<tr data-receipt-id="${esc(receipt.id)}"><td><strong class="small">${esc(student.name)}</strong><div class="row-meta">${esc(parent)}${student.number ? ' · ' + esc(student.number) : ''}</div></td><td class="nowrap">${esc(receipt.id)}</td><td class="nowrap">${esc(invoice?.period || '—')}</td><td class="billing-amount nowrap">${money(receipt.amount)}</td><td><div class="receipts-row-actions">${button('open', 'Receipt', `data-id="${esc(receipt.id)}" aria-label="Open receipt ${esc(receipt.id)} for ${esc(student.name)}"`)}${proofAvailable ? button('proof', 'Payment proof', `data-id="${esc(receipt.id)}" aria-label="Payment proof for ${esc(student.name)}, ${esc(receipt.id)}"`) : '<span class="receipts-no-proof">Proof unavailable</span>'}</div></td></tr>`).join('')}</tbody>`).join('');
    return `<div class="billing-workspace receipts-workspace"><div class="receipts-period-toolbar"><div class="receipts-period-controls">${button('previous', arrow('left'), `aria-label="Previous ${view}"`, 'icon-btn border')}${button('next', arrow('right'), `aria-label="Next ${view}"`, 'icon-btn border')}<strong class="receipts-period-title">${esc(periodTitle)}</strong>${button('today', view === 'week' ? 'This week' : 'Today')}</div><div class="receipts-date-controls"><label for="receipts-date">Sent</label><input id="receipts-date" type="date" value="${date}" aria-label="Receipt sent date"><div class="segmented" aria-label="Receipt period">${['day', 'week'].map(option => button('view', option === 'day' ? 'Day' : 'Week', `data-view="${option}" aria-pressed="${view === option}"`, view === option ? 'active' : '')).join('')}</div></div></div><div class="billing-toolbar receipts-search-toolbar"><input id="receipts-search" type="search" value="${esc(query)}" placeholder="Student, parent or receipt" aria-label="Search receipts by student, parent, receipt or payment reference"><span class="billing-total" aria-live="polite">${result.total} ${result.total === 1 ? 'receipt' : 'receipts'}<strong>${money(result.amount)}</strong></span></div><section class="panel billing-table receipts-table"><div class="table-scroll"><table aria-label="Receipts by sent date"><thead><tr><th scope="col">Student / parent</th><th scope="col">Receipt</th><th scope="col">Tuition period</th><th scope="col" class="billing-amount">Amount</th><th scope="col"><span class="visually-hidden">Documents</span></th></tr></thead>${groups}</table></div>${result.total ? '' : `<div class="empty"><h3>${query ? 'No matching receipts' : 'No receipts sent this ' + view}</h3></div>`}<div class="collection-footer"><span class="small muted">${result.first}–${result.last} of ${result.total}</span><div class="flex"><label class="receipts-page-size" for="receipts-page-size">Rows<select id="receipts-page-size">${[25, 50].map(size => `<option value="${size}"${pageSize === size ? ' selected' : ''}>${size}</option>`).join('')}</select></label>${result.pageCount > 1 ? button('page', 'Previous', `data-page="${result.page - 1}"${result.page === 1 ? ' disabled' : ''}`) + `<span class="small muted">${result.page} / ${result.pageCount}</span>` + button('page', 'Next', `data-page="${result.page + 1}"${result.page === result.pageCount ? ' disabled' : ''}`) : ''}</div></div></section></div>`;
  }

  function handleAction(action, id, element) {
    if (!action.startsWith('receipts-')) return false;
    const name = action.slice('receipts-'.length);
    if (name === 'open' || name === 'proof') {
      const receipt = getState().receipts.find(item => item.id === id);
      if (!receipt) return true;
      if (name === 'open') openReceipt(receipt.id);
      else if (hasReceiptProof(getState().invoices.find(invoice => invoice.id === receipt.invoiceId))) openProof(receipt.invoiceId);
      return true;
    }
    if (name === 'previous' || name === 'next') { date = addDays(date, (name === 'previous' ? -1 : 1) * (view === 'week' ? 7 : 1)); page = 1; }
    else if (name === 'today') { date = TODAY; page = 1; }
    else if (name === 'view' && ['day', 'week'].includes(element?.dataset.view)) { view = element.dataset.view; page = 1; }
    else if (name === 'page') page = Number(element?.dataset.page) || 1;
    else return true;
    refresh();
    return true;
  }

  function onChange(event) {
    if (event.target.id === 'receipts-date') { if (!validDate(event.target.value)) return true; date = event.target.value; page = 1; refresh(); return true; }
    if (event.target.id === 'receipts-page-size') { pageSize = Number(event.target.value) === 50 ? 50 : 25; page = 1; refresh(); return true; }
    return false;
  }

  function onInput(event) {
    if (event.target.id !== 'receipts-search') return false;
    query = event.target.value; page = 1; clearTimeout(searchTimer);
    const input = event.target, cursor = input.selectionStart, cursorEnd = input.selectionEnd;
    searchTimer = setTimeout(() => {
      if (!input.isConnected) return;
      const focused = document.activeElement === input;
      render();
      if (focused) { const replacement = document.querySelector('#receipts-search'); replacement?.focus(); replacement?.setSelectionRange(cursor, cursorEnd); }
    }, 150);
    return true;
  }

  return { render: workspace, handleAction, onChange, onInput, reset: () => { clearTimeout(searchTimer); view = 'week'; date = TODAY; query = ''; page = 1; pageSize = 25; } };
}
