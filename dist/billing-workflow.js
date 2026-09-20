import { TODAY, allStudents, billingPayerName, issueReceipt, record, uid } from './model.js';

const DAY = 24 * 60 * 60 * 1000;
const studentsById = new Map(allStudents.map(student => [student.id, student]));
const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const chargeLabels = { assessment: 'Assessment', 'first-tuition': 'First tuition', recurring: 'Recurring tuition' };
const normalize = value => String(value ?? '').normalize('NFKC').trim().toLowerCase();

// The demonstration keeps its calendar date while reminders retain real elapsed
// time within that date. Saved source dates are never upgraded to invented times.
export function demoNow() {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Hong_Kong', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(new Date());
  return `${TODAY}T${parts}+08:00`;
}

function instant(value = demoNow()) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('Enter a valid action time.');
  return { milliseconds: date.getTime(), timestamp: date.toISOString(), date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Hong_Kong', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date) };
}

function sourceDate(...values) {
  return values.find(value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value) && Number.isFinite(Date.parse(value))) || null;
}

export function invoiceReceipt(state, invoice) {
  if (!invoice) return null;
  const receipts = state.receipts || [];
  return receipts.find(receipt => receipt.id === invoice.receiptId && (!receipt.invoiceId || receipt.invoiceId === invoice.id))
    || receipts.find(receipt => receipt.invoiceId === invoice.id) || null;
}

function archived(invoice) {
  return Boolean(invoice.cancelled || invoice.canceled || invoice.voided || invoice.cancelledAt || invoice.canceledAt || invoice.voidedAt)
    || [invoice.status, invoice.lifecycleStatus].some(value => ['cancelled', 'canceled', 'void', 'voided'].includes(normalize(value)));
}

function stageFor(invoice, receipt) {
  if (archived(invoice)) return 'archive';
  if (receipt) return 'issued';
  if (invoice.proofDisposition === 'returned') return 'parent';
  return invoice.proof || invoice.proofReview ? 'review' : 'parent';
}

export function billingStage(state, invoice) {
  return stageFor(invoice, invoiceReceipt(state, invoice));
}

function chargeTypeFor(invoice) {
  const explicit = normalize(invoice.chargeType || invoice.type).replace(/[ _]/g, '-');
  if (['assessment', 'assessment-fee'].includes(explicit)) return 'assessment';
  if (['first-tuition', 'first', 'initial-tuition', 'enrolment', 'enrollment'].includes(explicit)) return 'first-tuition';
  const description = normalize(invoice.description);
  if (/assessment|評估/.test(description)) return 'assessment';
  if (/first tuition|first programme|initial tuition|首次學費/.test(description)) return 'first-tuition';
  return 'recurring';
}

function billingMonthFor(invoice) {
  for (const value of [invoice.billingMonth, invoice.periodStart, invoice.billingPeriodStart, invoice.period?.start]) {
    if (typeof value === 'string' && /^\d{4}-(?:0[1-9]|1[0-2])(?:$|-)/.test(value)) return value.slice(0, 7);
  }
  const period = typeof invoice.period === 'string' ? invoice.period : '';
  const iso = period.match(/\b(\d{4}-(?:0[1-9]|1[0-2]))(?:\b|-)/);
  if (iso) return iso[1];
  const matches = [...period.matchAll(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b/gi)];
  const years = [...period.matchAll(/\b(20\d{2})\b/g)];
  if (matches.length && years.length) {
    const firstMonth = monthNames.indexOf(matches[0][1].slice(0, 3).toLowerCase());
    let year = Number(years[0][1]);
    // A single trailing year in Dec–Jan 2027 belongs to the ending month.
    if (years.length === 1 && matches.length > 1 && years[0].index > matches.at(-1).index && firstMonth > monthNames.indexOf(matches.at(-1)[1].slice(0, 3).toLowerCase())) year--;
    return `${year}-${String(firstMonth + 1).padStart(2, '0')}`;
  }
  return '';
}

function studentFor(state, invoice, localStudents) {
  const base = localStudents.get(invoice.studentId) || studentsById.get(invoice.studentId);
  const profile = state.studentProfiles?.[invoice.studentId];
  const profileName = profile?.englishName || [profile?.givenName, profile?.surname].filter(Boolean).join(' ');
  if (base && !profileName && !profile?.studentNumber) return base;
  return { ...base, id: invoice.studentId, name: profileName || base?.name || invoice.studentName || 'Student not recorded', number: profile?.studentNumber || base?.number || invoice.studentNumber || '' };
}

function submittedAt(invoice) {
  return sourceDate(invoice.proofSubmittedAt, invoice.proofReview?.submittedAt, invoice.proofDate, invoice.proofReview?.submittedDate);
}

function canRemind(invoice, stage, now, wallNow = null) {
  if (stage !== 'parent') return false;
  const actualPrevious = sourceDate(invoice.lastReminderWallAt);
  if (wallNow !== null && actualPrevious) return wallNow - Date.parse(actualPrevious) >= DAY;
  const previous = sourceDate(invoice.lastReminderAt);
  return !previous || now - Date.parse(previous) >= DAY;
}

/** Select and page invoices before creating any row display data or proof UI. */
export function queryBillingInvoices(state, { stage = 'review', query = '', chargeType = 'all', month = '', page = 1, pageSize = 25, now } = {}) {
  const clock = instant(now), counts = { parent: 0, review: 0, issued: 0, archive: 0 };
  const wallNow = now === undefined ? Date.now() : null;
  if (!Object.hasOwn(counts, stage)) stage = 'review';
  const receiptsById = new Map(), receiptsByInvoice = new Map();
  for (const receipt of state.receipts || []) {
    if (!receiptsById.has(receipt.id)) receiptsById.set(receipt.id, receipt);
    if (!receiptsByInvoice.has(receipt.invoiceId)) receiptsByInvoice.set(receipt.invoiceId, receipt);
  }
  const localStudents = new Map((state.students || []).map(student => [student.id, student]));
  const tokens = normalize(query).split(/\s+/).filter(Boolean), selected = [], months = new Set();
  for (const invoice of state.invoices || []) {
    const billingMonth = billingMonthFor(invoice);
    if (billingMonth) months.add(billingMonth);
    const type = chargeTypeFor(invoice);
    if (chargeType && chargeType !== 'all' && type !== chargeType || month && billingMonth !== month) continue;
    const student = studentFor(state, invoice, localStudents);
    if (tokens.length) {
      const searchable = normalize([student.name, student.number, invoice.id, invoice.number, invoice.invoiceNumber].filter(Boolean).join(' '));
      const compact = searchable.replace(/[\s-]/g, '');
      if (!tokens.every(token => searchable.includes(token) || compact.includes(token.replace(/-/g, '')))) continue;
    }
    const linked = receiptsById.get(invoice.receiptId);
    const receipt = linked && (!linked.invoiceId || linked.invoiceId === invoice.id) ? linked : receiptsByInvoice.get(invoice.id) || null;
    const currentStage = stageFor(invoice, receipt);
    counts[currentStage]++;
    if (currentStage === stage) selected.push({ invoice, student, receipt, chargeType: type, billingMonth });
  }
  const sortDate = item => stage === 'review' ? submittedAt(item.invoice)
    : stage === 'issued' ? sourceDate(item.receipt?.issuedAt, item.receipt?.issuedDate)
      : stage === 'archive' ? sourceDate(item.invoice.cancelledAt, item.invoice.canceledAt, item.invoice.voidedAt, item.invoice.issuedAt, item.invoice.issued)
        : sourceDate(item.invoice.due, item.invoice.issuedAt, item.invoice.issued);
  selected.sort((a, b) => {
    const left = sortDate(a), right = sortDate(b);
    if (!left || !right) return left ? -1 : right ? 1 : String(a.invoice.id).localeCompare(String(b.invoice.id), 'en', { numeric: true });
    const order = Date.parse(left) - Date.parse(right);
    return (stage === 'issued' || stage === 'archive' ? -order : order) || String(a.invoice.id).localeCompare(String(b.invoice.id), 'en', { numeric: true });
  });
  // The UI deliberately keeps a small page even if a caller requests all rows.
  pageSize = Number.isFinite(Number(pageSize)) ? Math.min(25, Math.max(1, Math.floor(Number(pageSize)))) : 25;
  const total = selected.length, pages = Math.max(1, Math.ceil(total / pageSize));
  page = Number.isFinite(Number(page)) ? Math.min(pages, Math.max(1, Math.floor(Number(page)))) : 1;
  const offset = (page - 1) * pageSize;
  const items = selected.slice(offset, offset + pageSize).map(item => ({
    ...item, chargeLabel: chargeLabels[item.chargeType], periodLabel: typeof item.invoice.period === 'string' && item.invoice.period.trim() ? item.invoice.period : item.billingMonth || 'Period not recorded',
    proofSubmittedAt: submittedAt(item.invoice), lastReminderAt: sourceDate(item.invoice.lastReminderAt), reminderAvailable: canRemind(item.invoice, stage, clock.milliseconds, wallNow),
    overdue: stage === 'parent' && Boolean(item.invoice.due && item.invoice.due < clock.date), replacementProof: item.invoice.proofDisposition === 'returned'
  }));
  return { items, counts, total, page, pages, start: total ? offset + 1 : 0, end: Math.min(offset + pageSize, total), months: [...months].sort().reverse() };
}

function getInvoice(state, id) {
  const invoice = (state.invoices || []).find(item => item.id === id);
  if (!invoice) throw new Error('Invoice not found.');
  if (archived(invoice)) throw new Error('Archived invoices cannot be changed.');
  return invoice;
}

export function confirmInvoicePayment(state, id, { now } = {}) {
  const invoice = getInvoice(state, id), existing = invoiceReceipt(state, invoice);
  if (existing) return { invoice, receipt: existing, createdReceipt: false };
  if (billingStage(state, invoice) !== 'review') throw new Error('Review a current payment proof before confirming payment.');
  const clock = instant(now);
  state.receipts ??= [];
  state.audit ??= [];
  const usedIds = new Set(state.receipts.map(receipt => receipt.id));
  // A stale receipt pointer does not prevent issuing the missing document.
  invoice.receiptId = null;
  invoice.proof = true;
  const receipt = issueReceipt(state, id, clock.date);
  const proofDate = submittedAt(invoice);
  if (proofDate) receipt.proofDate = proofDate.includes('T') ? instant(proofDate).date : proofDate;
  else delete receipt.proofDate;
  if (usedIds.has(receipt.id)) {
    const originalId = receipt.id;
    const base = 'R-' + invoice.id.replace(/^INV-/, '');
    let candidate = base, suffix = 2;
    while (usedIds.has(candidate)) candidate = `${base}-${suffix++}`;
    receipt.id = candidate;
    invoice.receiptId = candidate;
    if (state.audit[0]?.text?.startsWith('Issued ' + originalId + ' ')) state.audit[0].text = state.audit[0].text.replace('Issued ' + originalId + ' ', 'Issued ' + candidate + ' ');
  }
  Object.assign(receipt, { documentType: 'receipt', issuedAt: clock.timestamp, issuedBy: 'Centre review' });
  Object.assign(invoice, { proofDisposition: 'confirmed', proofConfirmedAt: clock.timestamp });
  return { invoice, receipt, createdReceipt: true };
}

export function returnInvoiceProof(state, id, { reason, now } = {}) {
  const invoice = getInvoice(state, id);
  if (billingStage(state, invoice) !== 'review') throw new Error('Only a current proof awaiting centre review can be returned.');
  if (typeof reason !== 'string' || !reason.trim()) throw new Error('Enter a reason for returning the proof.');
  reason = reason.trim();
  const clock = instant(now);
  invoice.proofReviewHistory ??= [];
  if (invoice.proofReview && !invoice.proofReviewHistory.some(review => review.id && review.id === invoice.proofReview.id)) {
    const history = structuredClone(invoice.proofReview);
    if (history.file) delete history.file.dataUrl;
    invoice.proofReviewHistory.push(history);
  }
  Object.assign(invoice, { proofDisposition: 'returned', proofReturnReason: reason, proofReturnedAt: clock.timestamp });
  invoice.proofReturnHistory ??= [];
  invoice.proofReturnHistory.push({ proofId: invoice.proofReview?.id || null, reason, returnedAt: clock.timestamp });
  state.audit ??= [];
  record(state, `Returned payment proof for ${id}: ${reason}`, 'Centre review');
  return { invoice, reason, returnedAt: clock.timestamp };
}

export function remindInvoiceParent(state, id, { now } = {}) {
  const invoice = getInvoice(state, id), stage = billingStage(state, invoice), clock = instant(now);
  const wallNow = now === undefined ? Date.now() : null;
  if (stage !== 'parent') throw new Error('Only invoices waiting for the parent can be reminded.');
  if (!canRemind(invoice, stage, clock.milliseconds, wallNow)) throw new Error('Wait 24 hours after the last reminder before sending another.');
  const replacement = invoice.proofDisposition === 'returned';
  const event = { id: uid('billing-reminder'), invoiceId: id, studentId: invoice.studentId, at: clock.timestamp, simulated: true, type: replacement ? 'replacement-proof' : 'payment',
    text: replacement ? `請為繳費通知 ${id} 上載更清晰或正確的付款證明。原因：${invoice.proofReturnReason || '付款資料需要確認'}。如已付款，無需再次繳費。` : `請查看繳費通知 ${id}，完成繳費後上載付款證明。如已付款，請上載付款證明。` };
  invoice.lastReminderAt = clock.timestamp;
  // The demo calendar remains fixed, so keep a real clock solely for elapsed
  // cooldowns across browser sessions and real midnight. Never display it as
  // the simulated reminder's calendar date.
  if (wallNow !== null) invoice.lastReminderWallAt = new Date(wallNow).toISOString();
  else delete invoice.lastReminderWallAt;
  state.billingReminderEvents ??= [];
  state.billingReminderEvents.push(event);
  state.audit ??= [];
  record(state, `Simulated ${replacement ? 'replacement proof' : 'payment'} reminder for ${id}`, 'Centre review');
  return { invoice, event };
}

export function setBillingAutoSent(state, enabled) {
  if (typeof enabled !== 'boolean') throw new Error('Choose whether automatic sending is enabled.');
  state.billingSettings ??= {};
  state.billingSettings.autoSent = enabled;
  return enabled;
}

function seedWorkflowExamples(state) {
  const hasFixture = (id, studentId) => state.invoices.some(invoice => invoice.id === id && invoice.studentId === studentId);
  if (!hasFixture('INV-1024', 'chloe')) return;
  const examples = [
    { id: 'INV-8001', studentId: 'chloe', amount: 2000, chargeType: 'recurring', period: 'Aug–Sep 2026', periodStart: '2026-08-01', issued: '2026-07-20', due: '2026-08-20', description: 'Regular programme · 8 lessons', proof: false, receiptId: null },
    { id: 'INV-8002', studentId: 'chloe', amount: 2000, chargeType: 'recurring', period: 'Sep–Oct 2026', periodStart: '2026-09-01', issued: '2026-08-20', due: '2026-09-20', description: 'Regular programme · 8 lessons', proof: true, proofDate: '2026-09-28', proofSubmittedAt: '2026-09-28T10:15:00+08:00', receiptId: null },
    { id: 'INV-8003', studentId: 'chloe', amount: 1800, chargeType: 'first-tuition', period: 'Jul–Aug 2026', periodStart: '2026-07-01', issued: '2026-06-20', due: '2026-07-01', description: 'First tuition · assessment credit included', proof: true, proofDate: '2026-06-23', proofSubmittedAt: '2026-06-23T11:30:00+08:00', receiptId: 'R-8003', proofDisposition: 'confirmed' },
    { id: 'INV-8005', studentId: 'chloe', amount: 2000, chargeType: 'recurring', period: 'Jun–Jul 2026', periodStart: '2026-06-01', issued: '2026-05-20', due: '2026-06-01', description: 'Cancelled duplicate invoice', proof: false, receiptId: null, status: 'cancelled', cancelledAt: '2026-05-21T09:00:00+08:00' },
    { id: 'INV-8006', studentId: 'chloe', amount: 2000, chargeType: 'recurring', period: 'May–Jun 2026', periodStart: '2026-05-01', issued: '2026-04-20', due: '2026-05-01', description: 'Regular programme · 8 lessons', proof: true, proofDate: '2026-05-01', proofSubmittedAt: '2026-05-01T12:10:00+08:00', receiptId: null, proofDisposition: 'returned', proofReturnReason: 'The transfer reference is cut off. Please upload the full confirmation.', proofReturnedAt: '2026-05-01T14:00:00+08:00' }
  ];
  if (state.assessment?.studentId === 'mia') examples.push({ id: 'INV-8004', studentId: 'mia', amount: 200, chargeType: 'assessment', period: '26 Sep 2026', periodStart: '2026-09-26', issued: '2026-09-15', due: '2026-09-26', description: 'Entrance assessment', proof: true, proofDate: '2026-09-29', proofSubmittedAt: '2026-09-29T14:20:00+08:00', receiptId: null });
  for (const invoice of examples) {
    if (state.invoices.some(saved => saved.id === invoice.id) || state.receipts.some(saved => saved.invoiceId === invoice.id || invoice.receiptId && saved.id === invoice.receiptId)) continue;
    invoice.workflowFixture = true;
    if (invoice.proof) {
      const confirmed = invoice.proofDisposition === 'confirmed';
      Object.assign(invoice, { claimedPaymentDate: invoice.proofDate, proofPayer: billingPayerName(state, invoice.studentId), proofReference: 'DEMO ' + invoice.id, paymentMethod: 'fps', proofDisposition: invoice.proofDisposition || 'pending' });
      invoice.proofReview = { id: 'fixture-proof-' + invoice.id, mode: 'demo', fixture: true, scenario: confirmed ? 'pass' : 'unreadable', status: confirmed ? 'passed' : 'needs-review', submittedDate: invoice.proofDate, submittedAt: invoice.proofSubmittedAt,
        checks: [{ key: 'isPaymentProof', label: 'Payment proof', status: confirmed ? 'pass' : 'uncertain', detail: confirmed ? 'Fictional transfer confirmation.' : 'Please confirm the transfer details.' }],
        extracted: { recipient: 'MathConcept', amount: invoice.amount, payer: invoice.proofPayer, reference: invoice.proofReference, paymentDate: invoice.claimedPaymentDate }, reasons: confirmed ? [] : ['Please confirm the transfer details.'] };
    }
    state.invoices.push(invoice);
    if (invoice.receiptId) state.receipts.push({ id: invoice.receiptId, invoiceId: invoice.id, studentId: invoice.studentId, amount: invoice.amount, proofDate: invoice.proofDate, issuedDate: invoice.proofDate, issuedAt: invoice.proofSubmittedAt, documentType: 'receipt', issuedBy: 'Centre review', bankId: null, note: '', workflowFixture: true });
  }
}

export function normalizeBillingWorkflow(state) {
  state.billingSettings ??= {};
  state.billingSettings.autoSent ??= true;
  state.invoices ??= [];
  state.receipts ??= [];
  state.billingReminderEvents ??= [];
  if (!state.billingWorkflowVersion) seedWorkflowExamples(state);
  state.billingWorkflowVersion = Math.max(1, Number(state.billingWorkflowVersion) || 0);
  return state;
}
