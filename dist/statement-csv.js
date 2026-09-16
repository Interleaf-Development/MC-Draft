/** Read a local CSV statement. Bank-specific PDF/image extraction is outside this demo. */
export function parseStatementCSV(text) {
  const input = String(text).replace(/^\uFEFF/, '');
  const table = []; let row = [], cell = '', quoted = false, closedQuote = false;
  const pushCell = () => { row.push(cell.trim()); cell = ''; closedQuote = false; };
  const pushRow = () => { pushCell(); if (row.some(Boolean)) table.push(row); row = []; if (table.length > 5001) throw new Error('Use a statement with up to 5,000 rows.'); };
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') { quoted = false; closedQuote = true; }
      else cell += char;
    } else if (char === '"') {
      if (cell.trim() || closedQuote) throw new Error('The CSV contains an unexpected quotation mark.');
      cell = ''; quoted = true;
    } else if (char === ',') pushCell();
    else if (char === '\n' || char === '\r') { if (char === '\r' && input[i + 1] === '\n') i++; pushRow(); }
    else if (closedQuote && char.trim()) throw new Error('The CSV contains text after a closing quotation mark.');
    else if (!closedQuote) cell += char;
  }
  if (quoted) throw new Error('The CSV contains an unclosed quotation mark.');
  if (cell || row.length) pushRow();
  if (table.length < 2) throw new Error('The CSV needs a header and at least one transaction.');
  const names = table.shift().map(name => name.toLowerCase().replace(/[\s_-]/g, ''));
  const index = key => names.indexOf(key);
  if (new Set(names).size !== names.length) throw new Error('The CSV has duplicate column names.');
  for (const name of ['date', 'amount']) if (index(name) < 0) throw new Error('The CSV needs Date and Amount columns.');
  if (index('reference') < 0 && index('transactionid') < 0) throw new Error('Include a Reference or Transaction ID column to compare payments.');
  return table.map((cells, i) => {
    if (cells.length !== names.length) throw new Error(`Row ${i + 2}: the number of columns does not match the header. Put commas inside quoted values.`);
    const get = key => cells[index(key)] || '';
    const date = get('date');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error(`Row ${i + 2}: use a real date in YYYY-MM-DD format.`);
    const amountText = get('amount').replace(/^(?:HK\$|HKD|\$)\s*/i, '').replace(/,/g, '');
    if (!/^-?\d+(?:\.\d{1,2})?$/.test(amountText)) throw new Error(`Row ${i + 2}: enter a valid amount with up to two decimal places.`);
    const amount = Number(amountText);
    if (!Number.isSafeInteger(Math.round(amount * 100)) || amount === 0) throw new Error(`Row ${i + 2}: enter a non-zero amount.`);
    const type = get('direction').toLowerCase();
    if (type && !['credit', 'deposit', 'cr', 'debit', 'withdrawal', 'dr'].includes(type)) throw new Error(`Row ${i + 2}: Direction must be credit or debit.`);
    const direction = amount < 0 || ['debit', 'withdrawal', 'dr'].includes(type) ? 'debit' : 'credit';
    return { date, amount: Math.abs(amount), reference: get('reference'), payer: get('payer'), ...(get('transactionid') ? { transactionId: get('transactionid') } : {}), direction };
  });
}
