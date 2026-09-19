import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStatementCSV } from '../dist/statement-csv.js';

test('statement CSV handles BOM, quoted amounts and payer names, escaped quotes and newlines', () => {
  const rows = parseStatementCSV('\uFEFFDate,Amount,Reference,Payer,Transaction ID,Direction\r\n2026-09-30,"HK$2,000.00","FPS 910277\nDeposit","Chan, \"\"May\"\"",123,credit\r\n');
  assert.deepEqual(rows, [{date:'2026-09-30',amount:2000,reference:'FPS 910277\nDeposit',payer:'Chan, "May"',transactionId:'123',direction:'credit'}]);
});
test('statement CSV marks outgoing rows for the shared ledger', () => {
  const rows = parseStatementCSV('Date,Amount,Reference,Direction\n2026-09-30,-200,Withdrawal,\n2026-10-01,500,Rent,debit');
  assert.ok(rows.every(row => row.direction === 'debit'));
});
test('statement CSV rejects unsupported dates, bad money and broken input before import', () => {
  for (const csv of [
    'Date,Amount,Reference\n09/30/2026,2000,FPS',
    'Date,Amount,Reference\n2026-02-30,2000,FPS',
    'Date,Amount,Reference\n2026-09-30,2000abc,FPS',
    'Date,Amount,Reference\n2026-09-30,2000,"FPS',
    'Date,Amount\n2026-09-30,2000',
    'Date,Amount,Reference,Direction\n2026-09-30,2000,FPS,unknown',
    'Date,Amount,Amount\n2026-09-30,2000,2000',
    'Date,Amount,Reference\n2026-09-30,2,000,FPS 910277'
  ]) assert.throws(() => parseStatementCSV(csv));
});

test("transaction-ID-only statements can be parsed",()=>{ assert.equal(parseStatementCSV("Date,Amount,Transaction ID\n2026-09-30,2000,BANK-123")[0].transactionId,"BANK-123"); });


test('bank-export debit/credit columns retain raw descriptions and balances', () => {
  const rows = parseStatementCSV('Date,Description,Debit,Credit,Ledger Balance (HKD) (DR=Debit)\n30/09/2026,"FPS CHAN TAI MAN 991234 29/09/2026",,"2,000.00","20,000.00"\n30 Sep 2026,FEES,20.00,,19980.00\n2026-09-30,OVERDRAFT,20000,0,20.00DR');
  assert.deepEqual(rows[0], { date: '2026-09-30', description: 'FPS CHAN TAI MAN 991234 29/09/2026', reference: 'FPS CHAN TAI MAN 991234 29/09/2026', payer: '', amount: 2000, direction: 'credit', ledgerBalance: 20000 });
  assert.equal(rows[1].direction, 'debit');
  assert.equal(rows[1].amount, 20);
  assert.equal(rows[2].ledgerBalance, -20);
  assert.equal(parseStatementCSV('Date,Description,Debit,Credit\n01/09/2026,Deposit,-,100')[0].date, '2026-09-01');
});

test('bank export rejects conflicting sides and impossible day-first dates', () => {
  for (const line of ['30/09/2026,Payment,200,100', '30/09/2026,Payment,0,0', '30/09/2026,Payment,-200,0', '31/09/2026,Payment,,100', '30/09/2026,Payment,,100.001']) {
    assert.throws(() => parseStatementCSV('Date,Description,Debit,Credit\n' + line));
  }
});
