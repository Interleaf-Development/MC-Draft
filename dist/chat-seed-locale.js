import { students } from './model.js';

// Display translations belong only to these demo fixtures. Message data, staff
// views, attachments and anything written by a user retain their original text.
const pairs = entries => new Map(entries);
const originalThreads = new Map([
  ['thread-chloe', { studentId: 'chloe', messages: [
    { author: 'parent', text: pairs([
      ['Could Chloe make up her missed lesson as two half-hour extensions?', 'Chloe 可否分兩次補堂，每次在原有課堂後加半小時？']
    ]) },
    { author: 'centre', text: pairs([
      ['Yes, we can arrange that. I will check the available times for you.', '可以，我們可以這樣安排。我會為你查看可選時段。']
    ]) }
  ] }],
  ['thread-ethan', { studentId: 'ethan', messages: [
    { author: 'parent', text: pairs([
      ['I have sent the payment proof for October and November. Thank you!', '我已傳送十月及十一月的付款證明。謝謝！'],
      ['Thank you. I can see the receipt for August and September in Payments.', '謝謝。我已在「繳費」看到八月及九月的收據。']
    ]) }
  ] }],
  ['thread-mia', { studentId: 'mia', messages: [
    { author: 'parent', text: pairs([
      ['Thank you for the assessment. Can we discuss a Wednesday lesson?', '謝謝你們安排評估。我們可以商量星期三上課的安排嗎？']
    ]) }
  ] }]
]);

const topics = [
  [
    pairs([['Could you confirm the time for our next lesson?', '請問可以確認下一堂的上課時間嗎？']]),
    pairs([['Your regular lesson time is unchanged. We look forward to seeing you.', '恆常上課時間維持不變。期待下堂見！']])
  ],
  [
    pairs([['We may need to change a lesson because of a school activity.', '因為學校有活動，我們可能需要改一堂的上課時間。']]),
    pairs([['Please send the date when you have it, and we can check replacement times.', '確定日期後請告訴我們，我們會查看可供調堂的時段。']])
  ],
  [
    pairs([['Thank you for the lesson update. We will finish the homework this week.', '謝謝你們分享上課情況。我們會在本週完成家課。']]),
    pairs([['Thank you. Please keep the working so the tutor can review it next lesson.', '謝謝。請保留計算過程，讓老師在下一堂查看。']])
  ],
  [
    pairs([
      ['I have sent the tuition payment proof. Please let me know if you need anything else.', '我已傳送學費付款證明。如需補充資料，請告訴我。'],
      ['When is the next tuition payment due?', '請問下一期學費的繳費到期日是何時？']
    ]),
    pairs([
      ['Thank you. Reception will issue the receipt and our accounts team will reconcile the bank entry.', '謝謝。接待處會發出收據，會計同事會核對銀行入帳紀錄。'],
      ['Your receipt is available in Payments. We’ll match it to the bank statement.', '收據已可在「繳費」查看。我們會與銀行月結單核對。'],
      ['We need a clearer payment proof. Please upload it in Payments.', '我們需要更清晰的付款證明。請在「繳費」重新上載。']
    ])
  ],
  [
    pairs([['Could the tutor share which topic we should practise at home?', '請問老師可以建議我們在家練習哪些課題嗎？']]),
    pairs([['We will add the recommended practice to the next lesson record.', '我們會在下一堂的課堂紀錄加入建議練習。']])
  ]
];

// seedCentreVolume creates only the first 120 directory conversations, and
// follow-up fixtures intentionally have no centre reply at index 1.
const generatedThreads = new Map(students.slice(8, 128).map((student, index) => [
  'thread-' + student.id,
  { studentId: student.id, topic: index % topics.length, hasReply: index % 4 !== 0 }
]));
const months = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Sept: 9, Oct: 10, Nov: 11, Dec: 12 };
const monthDays = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function invoiceDueText(text) {
  // The billing normalizer uses dateLabel's numeric day + en-GB short month.
  const match = /^Your invoice is in Payments\. Payment is due on ([1-9]|[12]\d|3[01]) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.$/.exec(text);
  if (!match || match[0] !== text) return text;
  const day = Number(match[1]), month = months[match[2]];
  if (day > monthDays[month - 1]) return text;
  return `繳費通知已可在「繳費」查看。請於${month}月${day}日或之前繳費。`;
}

export function familyChatMessage(thread, message, role) {
  const text = message?.text;
  if (role !== 'parent' || typeof text !== 'string' || !thread?.id || !message.id
    || thread.type === 'group' || thread.audience === 'staff') return text;

  const original = originalThreads.get(thread.id), generated = generatedThreads.get(thread.id);
  const fixture = original || generated;
  if (!fixture || thread.studentId !== fixture.studentId) return text;

  const index = message.id === thread.id + '-message-0' ? 0
    : message.id === thread.id + '-message-1' ? 1 : -1;
  if (index < 0 || message.author !== (index === 0 ? 'parent' : 'centre')) return text;
  const stored = thread.messages?.[index];
  if (stored?.id !== message.id || stored.author !== message.author || stored.text !== text) return text;

  if (original) return original.messages[index]?.text.get(text) ?? text;
  if (index === 1 && !generated.hasReply) return text;
  const translated = topics[generated.topic][index].get(text);
  if (translated !== undefined) return translated;
  return generated.topic === 3 && index === 1 ? invoiceDueText(text) : text;
}
