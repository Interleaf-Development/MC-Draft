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
export function receiptPeriod(date = TODAY) {
  const anchor = validDate(date) ? date : TODAY;
  const start = addDays(anchor, -((new Date(anchor + 'T00:00:00Z').getUTCDay() + 6) % 7));
  return { start, end: addDays(start, 6) };
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

/** Keep every receipt in its sent-day column, including busy days and empty days. */
export function receiptRegister(state, { date = TODAY, query = '' } = {}) {
  const period = receiptPeriod(date), needle = query.trim().toLocaleLowerCase();
  const invoiceIndex = new Map((state.invoices || []).map(invoice => [invoice.id, invoice]));
  const rows = (state.receipts || []).filter(receipt => validDate(receipt.issuedDate) && receipt.issuedDate >= period.start && receipt.issuedDate <= period.end).map(receipt => {
    const invoice = invoiceIndex.get(receipt.invoiceId);
    const student = studentIndex.get(receipt.studentId) || { id: receipt.studentId, name: receipt.studentId || 'Unknown student', number: '', parent: '' };
    const parent = billingPayerName(state, receipt.studentId) || student.parent;
    return { receipt, invoice, student, parent, proofAvailable: hasReceiptProof(invoice) };
  }).filter(row => !needle || [row.student.name, row.student.number, row.student.parent, row.parent, row.invoice?.proofPayer, row.invoice?.proofReview?.extracted?.payer, row.receipt.id, row.receipt.invoiceId, row.invoice?.proofReference, row.invoice?.proofReview?.extracted?.reference].join(' ').toLocaleLowerCase().includes(needle))
    .sort((a, b) => b.receipt.issuedDate.localeCompare(a.receipt.issuedDate) || b.receipt.id.localeCompare(a.receipt.id, 'en', { numeric: true }));
  const groups = Array.from({ length: 7 }, (_, index) => ({ date: addDays(period.start, index), rows: [] }));
  const byDate = new Map(groups.map(group => [group.date, group]));
  for (const row of rows) byDate.get(row.receipt.issuedDate).rows.push(row);
  return { ...period, items: rows, groups, total: rows.length, amount: rows.reduce((total, row) => total + Number(row.receipt.amount || 0), 0) };
}

/** The host owns rendering and evidence dialogs. This workspace never changes billing records. */
export function createReceiptsUI({ getState, render, openReceipt, openProof }) {
  let date = TODAY, query = '', searchTimer;
  const refresh = () => { clearTimeout(searchTimer); render(); };

  function workspace() {
    const result = receiptRegister(getState(), { date, query });
    const periodTitle = `${dateText(result.start, { year: undefined })} – ${dateText(result.end)}`;
    const columns = result.groups.map(group => `<section class="receipts-day-column" aria-label="${dateText(group.date, { weekday: 'long' })}"><h3 class="receipts-day-heading${group.date === TODAY ? ' is-today' : ''}"><span>${dateText(group.date, { weekday: 'short', day: undefined, month: undefined, year: undefined })}</span><time datetime="${group.date}">${dateText(group.date, { year: undefined })}</time></h3><div class="receipts-day-list">${group.rows.length ? group.rows.map(({ receipt, student }) => button('open', `<span class="receipts-entry-name">${esc(student.name)}</span><span class="receipts-entry-amount">${money(receipt.amount)}</span>`, `data-id="${esc(receipt.id)}" aria-label="Open receipt ${esc(receipt.id)} for ${esc(student.name)}, ${money(receipt.amount)}, sent ${dateText(group.date)}"`, 'receipts-entry')).join('') : '<span class="receipts-day-empty" aria-label="No receipts sent">—</span>'}</div></section>`).join('');
    return `<div class="billing-workspace receipts-workspace"><div class="receipts-toolbar"><div class="receipts-period-controls">${button('previous', arrow('left'), 'aria-label="Previous week"', 'icon-btn border')}${button('next', arrow('right'), 'aria-label="Next week"', 'icon-btn border')}<strong class="receipts-period-title">${esc(periodTitle)}</strong>${button('today', 'This week')}</div><div class="receipts-date-controls"><input id="receipts-search" type="search" value="${esc(query)}" placeholder="Find receipt" aria-label="Search receipts by student, parent, receipt or payment reference"><input id="receipts-date" type="date" value="${date}" aria-label="Choose receipt week"></div></div>${query && !result.total ? '<p class="small muted receipts-empty-search" role="status">No matching receipts this week.</p>' : ''}<section class="panel receipts-board" aria-label="Receipts by sent date" tabindex="0"><div class="receipts-week-grid">${columns}</div></section></div>`;
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
    if (name === 'previous' || name === 'next') date = addDays(date, (name === 'previous' ? -1 : 1) * 7);
    else if (name === 'today') date = TODAY;
    else return true;
    refresh();
    return true;
  }

  function onChange(event) {
    if (event.target.id === 'receipts-date') { if (!validDate(event.target.value)) return true; date = event.target.value; refresh(); return true; }
    return false;
  }

  function onInput(event) {
    if (event.target.id !== 'receipts-search') return false;
    query = event.target.value; clearTimeout(searchTimer);
    const input = event.target, cursor = input.selectionStart, cursorEnd = input.selectionEnd;
    searchTimer = setTimeout(() => {
      if (!input.isConnected) return;
      const focused = document.activeElement === input;
      render();
      if (focused) { const replacement = document.querySelector('#receipts-search'); replacement?.focus(); replacement?.setSelectionRange(cursor, cursorEnd); }
    }, 150);
    return true;
  }

  return { render: workspace, handleAction, onChange, onInput, reset: () => { clearTimeout(searchTimer); date = TODAY; query = ''; } };
}
