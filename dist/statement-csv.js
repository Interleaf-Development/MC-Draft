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
  if (index('date') < 0) throw new Error('The CSV needs a Date column.');
  const splitAmounts = index('debit') >= 0 && index('credit') >= 0;
  if (!splitAmounts && index('amount') < 0) throw new Error('The CSV needs Amount, or Debit and Credit columns.');
  if (index('reference') < 0 && index('transactionid') < 0 && index('description') < 0) throw new Error('Include a Description, Reference or Transaction ID column to compare payments.');
  const balanceIndex = names.findIndex(name => name.startsWith('ledgerbalance'));
  return table.map((cells, i) => {
    const fail = message => { throw new Error(`Row ${i + 2}: ${message}`); };
    if (cells.length !== names.length) fail('the number of columns does not match the header. Put commas inside quoted values.');
    const get = key => cells[index(key)] || '';
    let date = get('date');
    // Hong Kong bank exports use day/month/year; never interpret them as US month/day/year.
    const dayFirst = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(date);
    if (dayFirst) date = `${dayFirst[3]}-${dayFirst[2].padStart(2, '0')}-${dayFirst[1].padStart(2, '0')}`;
    const namedMonth = /^(\d{1,2})[ -]([A-Za-z]{3})[ -](\d{4})$/.exec(date);
    if (namedMonth) {
      const month = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(namedMonth[2].toLowerCase()) + 1;
      date = `${namedMonth[3]}-${String(month).padStart(2, '0')}-${namedMonth[1].padStart(2, '0')}`;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) fail('use a real date in YYYY-MM-DD, DD/MM/YYYY or DD MMM YYYY format.');
    const parseMoney = (value, optional = false) => {
      const input = value.replace(/^(?:HK\$|HKD|\$)\s*/i, '').replace(/,/g, '');
      if (optional && (!input || /^[-–—]$/.test(input))) return 0;
      if (!/^-?\d+(?:\.\d{1,2})?$/.test(input)) fail('enter a valid amount with up to two decimal places.');
      const amount = Number(input);
      if (!Number.isSafeInteger(Math.round(amount * 100))) fail('enter a valid amount.');
      return amount;
    };
    let amount, direction;
    if (splitAmounts) {
      const debit = parseMoney(get('debit'), true), credit = parseMoney(get('credit'), true);
      if (debit < 0 || credit < 0 || Boolean(debit) === Boolean(credit)) fail('enter one positive Debit or Credit amount per transaction.');
      amount = debit || credit;
      direction = debit ? 'debit' : 'credit';
    } else {
      amount = parseMoney(get('amount'));
      if (amount === 0) fail('enter a non-zero amount.');
      const type = get('direction').toLowerCase();
      if (type && !['credit', 'deposit', 'cr', 'debit', 'withdrawal', 'dr'].includes(type)) fail('Direction must be credit or debit.');
      if (amount < 0 && ['credit', 'deposit', 'cr'].includes(type)) fail('a credit cannot have a negative amount.');
      direction = amount < 0 || ['debit', 'withdrawal', 'dr'].includes(type) ? 'debit' : 'credit';
    }
    const description = get('description');
    const result = { date, amount: Math.abs(amount), reference: get('reference') || description, payer: get('payer'), ...(get('transactionid') ? { transactionId: get('transactionid') } : {}), direction };
    if (index('description') >= 0) result.description = description;
    if (balanceIndex >= 0 && cells[balanceIndex]) {
      const balance = cells[balanceIndex].trim(), debitBalance = /DR$/i.test(balance) || /^\(.*\)$/.test(balance);
      result.ledgerBalance = parseMoney(balance.replace(/\s*(?:DR|CR)$/i, '').replace(/^\((.*)\)$/, '$1'));
      if (debitBalance) result.ledgerBalance = -Math.abs(result.ledgerBalance);
    }
    return result;
  });
}
