import test from 'node:test';
import assert from 'node:assert/strict';
import { seed, seedCentreVolume, students, clone } from '../dist/model.js';
import { normalizeConversations, sendConversationMessage } from '../dist/conversations.js';
import { normalizeBillingAutomation } from '../dist/billing-automation.js';
import { familyChatMessage } from '../dist/chat-seed-locale.js';

const fresh = () => normalizeBillingAutomation(normalizeConversations(seedCentreVolume(seed())));
const threadFor = (state, id) => state.messages.find(thread => thread.id === id);
const billingThread = state => threadFor(state, 'thread-' + students[11].id);
const display = (thread, index, role = 'parent') => familyChatMessage(thread, thread.messages[index], role);

test('every family message in the current normalized fixtures is displayed in Traditional Chinese for parents without changing state', () => {
  const state = fresh(), before = clone(state);
  const familyThreads = state.messages.filter(thread => thread.audience !== 'staff');
  assert.equal(familyThreads.length, 123);
  assert.equal(familyThreads.reduce((sum, thread) => sum + thread.messages.length, 0), 214);
  for (const thread of familyThreads) for (const message of thread.messages) {
    const translated = familyChatMessage(thread, message, 'parent');
    assert.notEqual(translated, message.text, message.id);
    assert.match(translated, /\p{Script=Han}/u, message.id);
  }
  assert.equal(display(threadFor(state, 'thread-chloe'), 1), '可以，我們可以這樣安排。我會為你查看可選時段。');
  assert.deepEqual(state, before);
});

test('staff and student displays preserve all seeded content, and staff-group content stays English even with parent role', () => {
  const state = fresh();
  for (const thread of state.messages) for (const message of thread.messages) {
    for (const role of ['admin', 'teacher', 'student', undefined]) {
      assert.equal(familyChatMessage(thread, message, role), message.text, role + ': ' + message.id);
    }
    if (thread.audience === 'staff') assert.equal(familyChatMessage(thread, message, 'parent'), message.text);
  }
});

test('messages sent by users remain verbatim even when they exactly copy fixture wording', () => {
  const state = fresh(), thread = threadFor(state, 'thread-chloe');
  for (const [role, index] of [['parent', 0], ['teacher', 1]]) {
    const source = thread.messages[index].text;
    const message = sendConversationMessage(state, thread.id, { viewer: { role, studentId: 'chloe' }, text: source });
    assert.match(message.id, /^message-/);
    assert.equal(familyChatMessage(thread, message, 'parent'), source);
  }
});

test('edited fixture text and a canonical text from another topic are preserved verbatim', () => {
  const state = fresh(), thread = threadFor(state, 'thread-chloe');
  thread.messages[0].text += ' Please call me.';
  assert.equal(display(thread, 0), thread.messages[0].text);
  const first = threadFor(state, 'thread-' + students[8].id);
  first.messages[0].text = billingThread(state).messages[0].text;
  assert.equal(display(first, 0), first.messages[0].text);
});

test('translation requires the exact fixture thread, student, message ID, original index and author', () => {
  const original = threadFor(fresh(), 'thread-chloe');
  const cases = [
    thread => { delete thread.id; },
    thread => { delete thread.messages[0].id; },
    thread => { thread.id = 'thread-custom'; },
    thread => { thread.studentId = 'ethan'; },
    thread => { thread.messages[0].id += '-copy'; },
    thread => { thread.messages[0].id = thread.id + '-message-2'; },
    thread => { thread.messages[0].author = 'centre'; },
    thread => { thread.messages.reverse(); },
    thread => { thread.type = 'group'; },
    thread => { thread.audience = 'staff'; }
  ];
  for (const change of cases) {
    const thread = clone(original);
    change(thread);
    for (const message of thread.messages) {
      // Only test the original parent fixture; unrelated valid replies may still translate.
      if (message.text === original.messages[0].text) assert.equal(familyChatMessage(thread, message, 'parent'), message.text);
    }
  }
});

test('generated fixtures are limited to the first 120 directory students and actual seeded reply positions', () => {
  const state = fresh();
  const last = threadFor(state, 'thread-' + students[127].id);
  assert.notEqual(display(last, 0), last.messages[0].text);
  const beyond = clone(threadFor(state, 'thread-' + students[8].id));
  beyond.studentId = students[128].id;
  beyond.id = 'thread-' + beyond.studentId;
  beyond.messages[0].id = beyond.id + '-message-0';
  assert.equal(display(beyond, 0), beyond.messages[0].text);
  const noReply = threadFor(state, 'thread-' + students[8].id);
  noReply.messages.push({ id: noReply.id + '-message-1', author: 'centre', text: 'Your regular lesson time is unchanged. We look forward to seeing you.' });
  assert.equal(display(noReply, 1), noReply.messages[1].text);
});

test('original and normalized billing fixture variants remain supported', () => {
  const state = fresh(), thread = billingThread(state);
  const variants = [
    [0, 'I have sent the tuition payment proof. Please let me know if you need anything else.'],
    [0, 'When is the next tuition payment due?'],
    [1, 'Thank you. Reception will issue the receipt and our accounts team will reconcile the bank entry.'],
    [1, 'Your receipt is available in Payments. We’ll match it to the bank statement.'],
    [1, 'We need a clearer payment proof. Please upload it in Payments.']
  ];
  for (const [index, text] of variants) {
    thread.messages[index].text = text;
    assert.notEqual(display(thread, index), text, text);
  }
  const ethan = threadFor(state, 'thread-ethan');
  ethan.messages[0].text = 'I have sent the payment proof for October and November. Thank you!';
  assert.equal(display(ethan, 0), '我已傳送十月及十一月的付款證明。謝謝！');
});

test('a billing-normalized custom due date translates only its exact canonical English date shape', () => {
  const state = seedCentreVolume(seed()), studentId = students[11].id;
  const invoice = state.invoices.filter(item => item.studentId === studentId).sort((a, b) => b.issued.localeCompare(a.issued))[0];
  invoice.receiptId = null;
  invoice.proof = false;
  invoice.due = '2026-09-07';
  billingThread(state).messages[1].text = 'Your receipt is available in Payments. We’ll match it to the bank statement.';
  normalizeConversations(seedCentreVolume(state));
  const thread = billingThread(state);
  assert.match(thread.messages[1].text, /Payment is due on 7 Sept?\.$/);
  assert.equal(display(thread, 1), '繳費通知已可在「繳費」查看。請於9月7日或之前繳費。');
  for (const date of ['07 Sep', '7 September', '31 Apr', '30 Feb', '7 sept', '7 Sep 2026', '7 Sep.\n']) {
    thread.messages[1].text = 'Your invoice is in Payments. Payment is due on ' + date + '.';
    assert.equal(display(thread, 1), thread.messages[1].text, date);
  }
});

test('attachments and other message fields are never translated or mutated', () => {
  const thread = threadFor(fresh(), 'thread-chloe');
  thread.messages[0].attachment = { kind: 'document', name: 'Lesson plan.pdf', dataUrl: 'data:application/pdf;base64,JVBERg==' };
  const before = clone(thread);
  assert.notEqual(display(thread, 0), thread.messages[0].text);
  assert.deepEqual(thread, before);
  const textOnly = { text: before.messages[0].text };
  assert.equal(familyChatMessage(thread, textOnly, 'parent'), textOnly.text);
});
