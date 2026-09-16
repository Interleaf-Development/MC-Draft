import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStatementCSV } from '../dist/statement-csv.js';

test('statement CSV handles BOM, quoted amounts and payer names, escaped quotes and newlines', () => {
  const rows = parseStatementCSV('\uFEFFDate,Amount,Reference,Payer,Transaction ID,Direction\r\n2026-09-30,"HK$2,000.00","FPS 910277\nDeposit","Chan, \"\"May\"\"",123,credit\r\n');
  assert.deepEqual(rows, [{date:'2026-09-30',amount:2000,reference:'FPS 910277\nDeposit',payer:'Chan, "May"',transactionId:'123',direction:'credit'}]);
});
test('statement CSV marks outgoing rows for the importer to ignore', () => {
  const rows = parseStatementCSV('Date,Amount,Reference,Direction\n2026-09-30,-200,Withdrawal,\n2026-10-01,500,Rent,debit');
  assert.ok(rows.every(row => row.direction === 'debit'));
});
test('statement CSV rejects ambiguous dates, bad money and broken input before import', () => {
  for (const csv of [
    'Date,Amount,Reference\n30/09/2026,2000,FPS',
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
