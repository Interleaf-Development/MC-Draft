import { familyContent } from './family-locale.js';

// Translate only known system messages and generated billing descriptions.
// Uploaded filenames, bank records, payer names and user notes bypass this map.
const copy = {
  'Assessment': '入學評估', 'First tuition': '首次學費', 'Recurring tuition': '續期學費',
  'Period not recorded': '未有記錄涵蓋時段',
  'Invoice not found.': '找不到這張繳費通知。',
  'Archived invoices cannot be changed.': '已封存的繳費通知不可更改。',
  'Enter a valid action time.': '請輸入有效的操作時間。',
  'Review a current payment proof before confirming payment.': '請先覆核目前的付款證明，再確認付款。',
  'Only a current proof awaiting centre review can be returned.': '只可退回目前等待中心覆核的付款證明。',
  'Enter a reason for returning the proof.': '請填寫退回付款證明的原因。',
  'Only invoices waiting for the parent can be reminded.': '只可為等待家長處理的繳費通知發出提醒。',
  'Wait 24 hours after the last reminder before sending another.': '請於上次提醒 24 小時後再發出提醒。',
  'Choose whether automatic sending is enabled.': '請選擇是否啟用自動發送。',
  'Payment proof': '付款證明', 'Recipient is MathConcept': '收款人是 MathConcept',
  'Amount matches invoice': '金額與繳費通知相符', 'Proof has not been used': '付款證明未曾使用',
  'Payment details cannot be read.': '無法讀取付款資料。',
  'The amount is not readable.': '無法讀取金額。',
  'The example is not a transfer confirmation.': '這份示範文件並非轉賬確認。',
  'The demonstration contains transfer details.': '示範文件包含轉賬資料。',
  'Recipient could not be read.': '無法讀取收款人。', 'Amount could not be read.': '無法讀取金額。',
  'This proof or payment reference has already been used.': '這份證明或轉賬參考編號已被使用。',
  'No duplicate found in the demonstration records.': '示範紀錄中沒有重複的付款證明。',
  'No duplicate fixture proof.': '示範紀錄中沒有重複的付款證明。',
  'Fictional transfer confirmation.': '虛構轉賬確認。',
  'Please confirm the transfer details.': '請確認轉賬資料。',
  'Demo Other Learning Centre': '其他教育中心（示範）', 'Demo retail receipt': '購物收據（示範）',
  'The linked bank entry is outgoing, so it cannot confirm this payment.': '已連結的銀行紀錄是支出，無法用作確認此付款。',
  'The linked bank entry is missing.': '找不到已連結的銀行紀錄。',
  'Existing bank link preserved.': '已保留原有銀行連結。',
  'Unique amount, identity/reference and date match.': '金額、付款人／參考編號及日期只有一項相符紀錄。',
  'Multiple receipts or deposits could use this payment.': '這筆付款可能對應多張收據或多筆入賬。',
  'Payer/reference matches, but the amount differs.': '付款人／參考編號相符，但金額不同。',
  'No deposit with strong identity/reference evidence within seven days.': '前後七天內未找到付款人／參考編號明確相符的入賬。',
  'Every statement row needs a date on or before today and a non-zero amount with at most two decimal places.': '結單每行須有今天或之前的日期，以及不為零並最多保留兩個小數位的金額。',
  'Choose a valid transaction direction.': '請選擇有效的入賬／支出類別。',
  'Statement references and payer names must be text.': '結單參考編號及付款人姓名須為文字。',
  'Every statement row needs a reference, description or transaction ID.': '結單每行須有參考編號、摘要或交易編號。',
  'Enter a valid ledger balance with at most two decimal places.': '請輸入有效結餘，最多保留兩個小數位。',
  'Choose a statement with at least one transaction.': '請選擇包含至少一筆交易的結單。',
  'A transaction ID conflicts with an existing bank entry.': '交易編號與現有銀行紀錄衝突。',
  'A bank entry ID is already used by a different transaction.': '此銀行紀錄編號已用於另一筆交易。',
  'Use a statement with up to 5,000 rows.': '請使用不超過 5,000 行的結單。',
  'The CSV contains an unexpected quotation mark.': 'CSV 含有位置不正確的引號。',
  'The CSV contains text after a closing quotation mark.': 'CSV 在結束引號後含有多餘文字。',
  'The CSV contains an unclosed quotation mark.': 'CSV 含有未成對的引號。',
  'The CSV needs a header and at least one transaction.': 'CSV 須包含欄位標題及至少一筆交易。',
  'The CSV has duplicate column names.': 'CSV 含有重複欄位名稱。',
  'The CSV needs a Date column.': 'CSV 須包含 Date（日期）欄位。',
  'The CSV needs Amount, or Debit and Credit columns.': 'CSV 須包含 Amount（金額），或 Debit（支出）及 Credit（入賬）欄位。',
  'Include a Description, Reference or Transaction ID column to compare payments.': '請加入 Description（摘要）、Reference（參考編號）或 Transaction ID（交易編號）欄位以核對付款。',
  'the number of columns does not match the header. Put commas inside quoted values.': '欄位數目與標題不符，包含逗號的內容須以引號括起。',
  'use a real date in YYYY-MM-DD, DD/MM/YYYY or DD MMM YYYY format.': '請以 YYYY-MM-DD、DD/MM/YYYY 或 DD MMM YYYY 格式輸入有效日期。',
  'enter a valid amount with up to two decimal places.': '請輸入有效金額，最多保留兩個小數位。',
  'enter a valid amount.': '請輸入有效金額。',
  'enter one positive Debit or Credit amount per transaction.': '每筆交易只可輸入一個大於零的 Debit（支出）或 Credit（入賬）金額。',
  'enter a non-zero amount.': '請輸入不為零的金額。',
  'Direction must be credit or debit.': 'Direction 須為 credit（入賬）或 debit（支出）。',
  'a credit cannot have a negative amount.': '入賬金額不可為負數。'
};

export function billingText(value) {
  if (typeof value !== 'string') return value;
  if (Object.hasOwn(copy, value)) return copy[value];
  const row = /^Row (\d+): (.+)$/.exec(value);
  if (row && Object.hasOwn(copy, row[2])) return `第 ${row[1]} 行：${copy[row[2]]}`;
  const amount = /^HK\$(.+) shown; HK\$(.+) expected\.$/.exec(value);
  if (amount) return `證明金額：HK$${amount[1]}；應付金額：HK$${amount[2]}。`;
  const method = /^Use the (cash|cheque) payment workflow for this record\.$/.exec(value);
  if (method) return `請透過${method[1] === 'cash' ? '現金' : '支票'}付款流程處理此紀錄。`;
  const month = /^(\d{4})-(\d{2})$/.exec(value);
  if (month) return `${month[1]} 年 ${Number(month[2])} 月`;
  return familyContent(value, 'parent');
}

export function billingDate(value) {
  if (!value) return '未有紀錄';
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? value + 'T12:00:00+08:00' : value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat('zh-HK', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Hong_Kong' }).format(date)
    : '未有紀錄';
}
