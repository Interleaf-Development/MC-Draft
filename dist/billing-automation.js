import { TODAY, centre, students, uid, issueReceipt, matchReceipt, record } from './model.js';

export const MATCH_DATE_WINDOW_DAYS = 7;
export const PROOF_SCENARIOS = [
  { id: 'pass', label: 'Valid payment proof' },
  { id: 'wrong-recipient', label: 'Wrong recipient' },
  { id: 'wrong-amount', label: 'Wrong amount' },
  { id: 'unreadable', label: 'Unreadable proof' },
  { id: 'not-proof', label: 'Not a payment proof' },
  { id: 'duplicate', label: 'Previously used proof' }
];
const studentIndex = new Map(students.map(student => [student.id, student]));
const canonical = value => String(value || '').normalize('NFKC').toUpperCase().replace(/[^\p{L}\p{N}]/gu, '');
const cents = value => Math.round(Number(value) * 100);
const hash = value => { let n = 2166136261; for (const char of String(value)) n = Math.imul(n ^ char.charCodeAt(0), 16777619); return (n >>> 0).toString(16); };
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
const credit = row => !['debit', 'outgoing'].includes(row.direction) && Number(row.amount) > 0;
const coreReferences = { 'INV-1025': '908142', 'INV-1026': '724810', 'INV-1027': '909003', 'INV-1028': '903416' };

export function normalizeBillingAutomation(state) {
  state.bankStatementImports ??= [];
  for (const invoice of state.invoices) {
    if (coreReferences[invoice.id] && invoice.proof && !invoice.proofReview && invoice.proofReference === undefined) invoice.proofReference = coreReferences[invoice.id];
  }
  return state;
}

function referenceTokens(value) {
  const text = String(value || '').toUpperCase();
  return new Set([...(text.match(/\bMC[\s-]?\d{4,}\b/g) || []).map(canonical), ...(text.match(/\b\d{6,}\b/g) || [])]);
}
function sameReference(a, b) {
  const substantive = value => canonical(String(value || '').replace(/\b(?:DEMO|BANK|TRANSFER|PAYMENT|FPS|REFERENCE|REF)\b/gi, ''));
  const left = substantive(a), right = substantive(b);
  if (left.length >= 6 && left === right && /\d/.test(left)) return true;
  const tokens = referenceTokens(a);
  return [...referenceTokens(b)].some(token => tokens.has(token));
}
function fullPayer(value) {
  const words = String(value || '').trim().replace(/^(?:MR|MRS|MS|MISS|DR)\.?\s+/i, '').split(/\s+/);
  return words.length >= 2 && words.every(word => /\p{L}{2}/u.test(word)) ? canonical(words.join(' ')) : '';
}
function fileMetadata(file) {
  if (file == null) return undefined;
  if (typeof file !== 'object' || typeof file.name !== 'string' || !file.name.trim()) throw new Error('Choose a valid proof file.');
  const metadata = { name: file.name.trim().slice(0, 200) };
  for (const key of ['type', 'mimeType']) if (typeof file[key] === 'string') metadata[key] = file[key];
  if (file.size !== undefined) {
    if (!Number.isSafeInteger(file.size) || file.size < 0) throw new Error('Choose a valid proof file.');
    metadata.size = file.size;
  }
  if (file.dataUrl !== undefined) {
    if (typeof file.dataUrl !== 'string' || !/^data:(?:image\/(?:png|jpeg|gif|webp)|application\/pdf);base64,[a-z\d+/=]*$/i.test(file.dataUrl)) throw new Error('Use an image or PDF proof.');
    metadata.dataUrl = file.dataUrl;
  }
  return metadata;
}

export function previewPaymentProof(state, invoiceId, { scenario = 'pass', reference, paymentDate = TODAY, file } = {}) {
  const invoice = state.invoices.find(item => item.id === invoiceId);
  if (!invoice) throw new Error('Invoice not found.');
  if (!PROOF_SCENARIOS.some(item => item.id === scenario)) throw new Error('Choose a demonstration scenario.');
  if (!validDate(paymentDate)) throw new Error('Enter a valid payment date.');
  reference ??= invoice.id === 'INV-1024' ? '910277' : 'DEMO ' + invoice.id;
  if (typeof reference !== 'string' || !reference.trim() || reference.length > 160) throw new Error('Enter a payment reference.');
  const attached = fileMetadata(file), fileFingerprint = attached?.dataUrl ? hash(attached.dataUrl) : undefined;
  const extracted = { recipient: scenario === 'wrong-recipient' ? 'Demo Other Learning Centre' : centre.name, amount: scenario === 'wrong-amount' ? Math.max(1, invoice.amount - 200) : invoice.amount, payer: invoice.proofPayer || studentIndex.get(invoice.studentId)?.name || '', reference: reference.trim(), paymentDate };
  if (scenario === 'unreadable') Object.assign(extracted, { recipient: null, amount: null, payer: null, reference: null });
  if (scenario === 'not-proof') extracted.recipient = 'Demo retail receipt';
  const duplicated = scenario === 'duplicate' || state.invoices.some(other => {
    if (other.id === invoice.id || !other.proof) return false;
    const previous = other.proofReview;
    if (previous && previous.status !== 'passed') return false;
    if (fileFingerprint && previous?.fileFingerprint === fileFingerprint) return true;
    const receipt = state.receipts.find(item => item.invoiceId === other.id);
    return sameReference(extracted.reference, previous?.extracted.reference || other.proofReference) && paymentDate === (previous?.extracted.paymentDate || other.claimedPaymentDate || other.proofDate || receipt?.proofDate) && cents(extracted.amount) === cents(previous?.extracted.amount ?? other.amount);
  });
  const uncertain = scenario === 'unreadable';
  const checks = [
    { key: 'isPaymentProof', label: 'Payment proof', status: uncertain ? 'uncertain' : scenario === 'not-proof' ? 'fail' : 'pass', detail: uncertain ? 'Payment details cannot be read.' : scenario === 'not-proof' ? 'The example is not a transfer confirmation.' : 'The demonstration contains transfer details.' },
    { key: 'recipient', label: 'Recipient is MathConcept', status: uncertain ? 'uncertain' : ['wrong-recipient', 'not-proof'].includes(scenario) ? 'fail' : 'pass', detail: uncertain ? 'Recipient could not be read.' : String(extracted.recipient) },
    { key: 'amount', label: 'Amount matches invoice', status: uncertain ? 'uncertain' : scenario === 'wrong-amount' ? 'fail' : 'pass', detail: uncertain ? 'Amount could not be read.' : 'HK$' + extracted.amount + ' shown; HK$' + invoice.amount + ' expected.' },
    { key: 'duplicate', label: 'Proof has not been used', status: duplicated ? 'fail' : 'pass', detail: duplicated ? 'This proof or payment reference has already been used.' : 'No duplicate found in the demonstration records.' }
  ];
  const reasons = checks.filter(check => check.status !== 'pass').map(check => check.detail);
  return { id: 'preview', mode: 'demo', scenario, status: duplicated ? 'duplicate' : reasons.length ? 'needs-review' : 'passed', checks, extracted, reasons, submittedDate: TODAY, ...(attached ? { file: attached } : {}), ...(fileFingerprint ? { fileFingerprint } : {}), fingerprint: hash(JSON.stringify({ scenario, reference: reference.trim(), paymentDate, file: attached })) };
}

export function submitPaymentProof(state, invoiceId, options) {
  const review = previewPaymentProof(state, invoiceId, options), invoice = state.invoices.find(item => item.id === invoiceId);
  if (invoice.proofReview?.fingerprint === review.fingerprint) return { invoice, review: invoice.proofReview, receipt: state.receipts.find(item => item.id === invoice.receiptId) || null, createdReceipt: false };
  review.id = uid('proof');
  const hadReceipt = Boolean(invoice.receiptId);
  invoice.proof = true;
  invoice.proofDate = TODAY;
  invoice.claimedPaymentDate = options?.paymentDate || TODAY;
  invoice.proofReference = options?.reference?.trim() || review.extracted.reference;
  invoice.proofReview = review;
  invoice.proofReviewHistory ??= [];
  const history = { ...review };
  if (history.file) { const { dataUrl, ...metadata } = history.file; history.file = metadata; }
  invoice.proofReviewHistory.push(history);
  const receipt = review.status === 'passed' ? issueReceipt(state, invoiceId, TODAY) : state.receipts.find(item => item.id === invoice.receiptId) || null;
  record(state, 'Demonstration proof check for ' + invoiceId + ': ' + review.status, 'Payment proof demo');
  return { invoice, review, receipt, createdReceipt: !hadReceipt && Boolean(receipt) };
}

function evidence(state, receipt, bank) {
  const invoice = state.invoices.find(item => item.id === receipt.invoiceId), review = invoice?.proofReview;
  const date = review?.status === 'passed' ? review.extracted.paymentDate : invoice?.claimedPaymentDate || receipt.proofDate || receipt.issuedDate;
  if (!validDate(date) || !validDate(bank.date) || Math.abs(Date.parse(bank.date) - Date.parse(date)) > MATCH_DATE_WINDOW_DAYS * 86400000) return false;
  const reference = review?.status === 'passed' ? review.extracted.reference : invoice?.proofReference;
  if (sameReference(reference, bank.reference)) return true;
  const payer = fullPayer(bank.payer);
  if (!payer) return false;
  return [review?.status === 'passed' ? review.extracted.payer : '', invoice?.proofPayer, studentIndex.get(receipt.studentId)?.name].some(name => fullPayer(name) === payer);
}

export function analyzeStatement(state, transactions = state.bankTransactions) {
  const credits = [...new Map(transactions.filter(credit).map(bank => {
    const entry = bank.id ? bank : { ...bank, id: 'BANK-IMPORT-' + hash(rowKey(bank)) };
    return [entry.id, entry];
  })).values()], bankById = new Map([...state.bankTransactions, ...credits].map(bank => [bank.id, bank]));
  const linked = new Set(state.receipts.map(receipt => receipt.bankId).filter(Boolean));
  const candidates = new Map(), owners = new Map();
  for (const receipt of state.receipts.filter(item => !item.bankId)) {
    const possible = credits.filter(bank => !linked.has(bank.id) && evidence(state, receipt, bank));
    const exact = possible.filter(bank => cents(bank.amount) === cents(receipt.amount));
    candidates.set(receipt.id, { possible, exact });
    for (const bank of exact) owners.set(bank.id, [...(owners.get(bank.id) || []), receipt.id]);
  }
  const results = state.receipts.map(receipt => {
    const base = { receiptId: receipt.id, invoiceId: receipt.invoiceId, studentId: receipt.studentId, linked: Boolean(receipt.bankId), autoEligible: false, candidateBankIds: [] };
    if (receipt.bankId) {
      const bank = bankById.get(receipt.bankId);
      return { ...base, bankId: receipt.bankId, candidateBankIds: bank ? [bank.id] : [], status: !bank ? 'missing' : cents(bank.amount) === cents(receipt.amount) ? 'matched' : 'amount-mismatch', reason: !bank ? 'The linked bank entry is missing.' : 'Existing bank link preserved.', difference: bank ? receipt.amount - bank.amount : null };
    }
    const { possible, exact } = candidates.get(receipt.id);
    if (exact.length === 1 && owners.get(exact[0].id).length === 1) return { ...base, status: 'matched', bankId: exact[0].id, candidateBankIds: [exact[0].id], autoEligible: true, reason: 'Unique amount, identity/reference and date match.' };
    if (exact.length) return { ...base, status: 'ambiguous', candidateBankIds: exact.map(bank => bank.id), reason: 'Multiple receipts or deposits could use this payment.' };
    if (possible.length) return { ...base, status: 'amount-mismatch', candidateBankIds: possible.map(bank => bank.id), reason: 'Payer/reference matches, but the amount differs.', difference: possible.length === 1 ? receipt.amount - possible[0].amount : null };
    return { ...base, status: 'missing', reason: 'No deposit with strong identity/reference evidence within seven days.' };
  });
  const unmatchedDeposits = credits.filter(bank => !linked.has(bank.id));
  return { receipts: results, unmatchedDeposits, counts: { matched: results.filter(item => item.status === 'matched').length, ambiguous: results.filter(item => item.status === 'ambiguous').length, amountMismatch: results.filter(item => item.status === 'amount-mismatch').length, missing: results.filter(item => item.status === 'missing').length, unmatchedDeposits: unmatchedDeposits.length } };
}

const rowKey = row => row.transactionId ? 'transaction:' + row.transactionId.trim() : 'entry:' + row.date + '|' + cents(row.amount) + '|' + String(row.reference || '').trim().toUpperCase().replace(/\s+/g, ' ');
function statementRow(row) {
  if (!row || !validDate(row.date) || !Number.isFinite(Number(row.amount)) || Number(row.amount) === 0 || !Number.isSafeInteger(cents(row.amount)) || Math.abs(Number(row.amount) - cents(row.amount) / 100) > 1e-7) throw new Error('Every statement row needs a valid date and a non-zero amount with at most two decimal places.');
  const direction = row.direction || (Number(row.amount) > 0 ? 'credit' : 'debit');
  if (!['credit', 'debit', 'outgoing'].includes(direction) || direction === 'credit' && Number(row.amount) < 0) throw new Error('Choose a valid transaction direction.');
  for (const key of ['reference', 'payer', 'transactionId', 'id']) if (row[key] !== undefined && typeof row[key] !== 'string') throw new Error('Statement references and payer names must be text.');
  if (!String(row.reference || row.transactionId || '').trim()) throw new Error('Every statement row needs a reference or transaction ID.');
  return { date: row.date, amount: Math.abs(cents(row.amount)) / 100, reference: (row.reference || '').trim(), payer: (row.payer || '').trim(), direction, ...(row.transactionId ? { transactionId: row.transactionId.trim() } : {}), ...(row.id ? { id: row.id } : {}) };
}

export function importBankStatement(state, { name, rows }) {
  if (typeof name !== 'string' || !name.trim() || !Array.isArray(rows) || !rows.length) throw new Error('Choose a statement with at least one transaction.');
  const parsed = rows.map(statementRow), existing = new Map(state.bankTransactions.filter(credit).map(row => [rowKey(row), row])), additions = [], enrichments = [];
  let duplicates = 0, ignored = 0;
  for (const row of parsed) {
    if (!credit(row)) { ignored++; continue; }
    const key = rowKey(row), previous = existing.get(key);
    if (previous) {
      if (previous.date !== row.date || cents(previous.amount) !== cents(row.amount)) throw new Error('A transaction ID conflicts with an existing bank entry.');
      duplicates++;
      if (!previous.payer && row.payer) enrichments.push([previous, row.payer]);
      continue;
    }
    const id = row.id || 'BANK-IMPORT-' + hash(key);
    if (state.bankTransactions.some(item => item.id === id) || additions.some(item => item.id === id)) throw new Error('A bank entry ID is already used by a different transaction.');
    const bank = { ...row, id };
    additions.push(bank); existing.set(key, bank);
  }
  state.bankTransactions.push(...additions);
  for (const [bank, payer] of enrichments) bank.payer = payer;
  const before = analyzeStatement(state), auto = before.receipts.filter(item => item.autoEligible);
  for (const item of auto) matchReceipt(state, item.receiptId, item.bankId);
  const analysis = analyzeStatement(state), batch = { id: uid('statement'), name: name.trim(), importedDate: TODAY, added: additions.length, duplicates, ignored, counts: { ...analysis.counts, autoMatched: auto.length }, issues: analysis.receipts.filter(item => item.status !== 'matched'), receiptResults: analysis.receipts, unmatchedDeposits: analysis.unmatchedDeposits };
  state.bankStatementImports ??= [];
  state.bankStatementImports.push(batch);
  if (additions.length) { state.reportSubmitted = false; state.reviewedMonths = {}; }
  record(state, 'Imported statement ' + batch.name + ' · ' + additions.length + ' new deposits · ' + auto.length + ' automatic matches', centre.manager);
  return batch;
}

export function demoStatementRows(state) {
  const examples = [
    ['BANK-101', '2026-09-30', 2000, 'FPS 908142 · WONG', 'Ethan Wong'],
    ['BANK-102', '2026-10-02', 2000, 'TRANSFER 724810 · LEE', 'Lucas Lee'],
    ['BANK-103', '2026-09-29', 1800, 'FPS 909003 · LAM', 'Emma Lam'],
    ['BANK-104', '2026-09-28', 2000, 'FPS 903416 · HO', 'Oliver Ho'],
    ['BANK-105', '2026-09-30', 2000, 'FPS 910277 · CHAN', 'Chloe Chan']
  ].map(([id, date, amount, reference, payer]) => ({ id, date, amount, reference, payer, direction: 'credit' }));
  const ambiguous = state.receipts.find(receipt => receipt.id === 'R-5005')
    || state.receipts.find(receipt => receipt.studentId.startsWith('student-'));
  if (ambiguous) {
    const invoice = state.invoices.find(item => item.id === ambiguous.invoiceId), payer = studentIndex.get(ambiguous.studentId)?.name || '';
    for (const suffix of ['A', 'B']) examples.push({ transactionId: 'DEMO-AMBIGUOUS-' + ambiguous.id + '-' + suffix, date: ambiguous.proofDate || ambiguous.issuedDate, amount: ambiguous.amount, reference: invoice?.proofReference || 'DEMO ' + ambiguous.id, payer, direction: 'credit' });
  }
  examples.push({ transactionId: 'DEMO-UNALLOCATED-001', date: TODAY, amount: 375, reference: 'UNALLOCATED DEMO CREDIT 777001', payer: 'Unallocated Demo Payer', direction: 'credit' });
  examples.push({ transactionId: 'DEMO-OUTGOING-001', date: TODAY, amount: 850, reference: 'DEMO SUPPLIES 777002', payer: 'Demo Supplier', direction: 'debit' });
  return examples;
}
