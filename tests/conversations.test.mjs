import test from 'node:test';
import assert from 'node:assert/strict';
import { seed, seedCentreVolume, clone } from '../dist/model.js';
import { normalizeConversations, conversationThreads, unreadCount, markConversationRead, sendConversationMessage, toggleConversationPreference, toggleConversationReaction, viewerKey, canViewConversation } from '../dist/conversations.js';

const admin = { role: 'admin' }, teacher = { role: 'teacher' }, parent = { role: 'parent', studentId: 'chloe' };
const setup = () => normalizeConversations(seedCentreVolume(seed()));
const getThread = (state, id = 'thread-chloe') => state.messages.find(thread => thread.id === id);

test('normalization preserves legacy content and deterministically adds message IDs and one staff group', () => {
  const state = seed(), original = clone(state.messages);
  normalizeConversations(state);
  for (const thread of original) thread.messages.forEach((message, index) => {
    const normalized = getThread(state, thread.id).messages[index];
    for (const field of ['author', 'text', 'time']) assert.equal(normalized[field], message[field]);
    assert.equal(normalized.id, thread.id + '-message-' + index);
    assert.equal(normalized.date, message.time === 'Yesterday' ? '2026-09-29' : '2026-09-30');
    assert.deepEqual(normalized.readBy, []);
  });
  const before = clone(state);
  normalizeConversations(state);
  assert.deepEqual(state, before);
  assert.equal(state.messages.filter(thread => thread.type === 'group').length, 1);
  assert.equal(new Set(state.messages.flatMap(thread => thread.messages.map(message => message.id))).size, state.messages.flatMap(thread => thread.messages).length);
});

test('roles see only their allowed conversations and every mutating helper enforces that scope', () => {
  const state = setup();
  assert.equal(conversationThreads(state, admin).length, state.messages.length);
  assert.equal(conversationThreads(state, teacher).length, state.messages.length);
  assert.deepEqual(conversationThreads(state, parent).map(thread => thread.id), ['thread-chloe']);
  assert.deepEqual(conversationThreads(state, { role: 'student', studentId: 'chloe' }), []);
  assert.equal(canViewConversation(state, getThread(state, 'thread-ethan'), parent), false);
  assert.equal(canViewConversation(state, { ...getThread(state, 'thread-ethan'), studentId: 'chloe' }, parent), false);
  for (const threadId of ['thread-ethan', 'thread-staff-team']) {
    const before = clone(state), messageId = getThread(state, threadId).messages[0].id;
    assert.throws(() => sendConversationMessage(state, threadId, { viewer: parent, text: 'Not allowed' }), /not available/);
    assert.throws(() => markConversationRead(state, threadId, parent), /not available/);
    assert.throws(() => toggleConversationPreference(state, threadId, parent, 'archive'), /not available/);
    assert.throws(() => toggleConversationReaction(state, threadId, messageId, parent, '👍'), /not available/);
    assert.deepEqual(state, before);
  }
});

test('read state is viewer-specific and follows incoming authors, including named staff group senders', () => {
  const state = setup(), thread = getThread(state), group = getThread(state, 'thread-staff-team');
  assert.equal(unreadCount(thread, admin), 1);
  assert.equal(unreadCount(thread, parent), 1);
  assert.equal(unreadCount(group, admin), 2);
  assert.equal(unreadCount(group, teacher), 3);
  markConversationRead(state, thread.id, admin);
  assert.equal(unreadCount(thread, admin), 0);
  assert.equal(unreadCount(thread, teacher), 1);
  assert.equal(unreadCount(thread, parent), 1);
  const before = clone(state);
  markConversationRead(state, thread.id, admin);
  assert.deepEqual(state, before);
  assert.equal(viewerKey(parent), 'parent:chloe');
});

test('local send, reply, attachment, reactions and read receipts survive serialization', () => {
  const state = setup(), thread = getThread(state);
  markConversationRead(state, thread.id, parent);
  const attachment = { kind: 'document', name: 'Demo note.pdf', dataUrl: 'data:application/pdf;base64,JVBERg==', mimeType: 'application/pdf', size: 4 };
  const message = sendConversationMessage(state, thread.id, { viewer: admin, text: '  Please review this note.  ', replyToId: thread.messages[0].id, attachment });
  assert.equal(message.text, 'Please review this note.');
  assert.equal(message.senderName, 'Koko Ko');
  assert.equal(message.author, 'centre');
  assert.deepEqual(message.attachment, attachment);
  assert.deepEqual(message.readBy, ['admin']);
  assert.equal(unreadCount(thread, parent), 1);
  toggleConversationReaction(state, thread.id, message.id, parent, '👍');
  toggleConversationReaction(state, thread.id, message.id, admin, '👍');
  toggleConversationReaction(state, thread.id, message.id, parent, '👍');
  assert.deepEqual(message.reactions, [{ emoji: '👍', by: ['admin'] }]);
  markConversationRead(state, thread.id, parent);
  const restored = JSON.parse(JSON.stringify(state));
  normalizeConversations(restored);
  assert.deepEqual(getThread(restored).messages.at(-1), message);
  assert.equal(unreadCount(getThread(restored), parent), 0);
});

test('archive, favourite and manual unread filters are independent per viewer and survive reload', () => {
  const state = setup(), id = 'thread-chloe';
  markConversationRead(state, id, admin);
  toggleConversationPreference(state, id, admin, 'favourite');
  toggleConversationPreference(state, id, admin, 'unread');
  assert.deepEqual(conversationThreads(state, { ...admin, filter: 'favourites' }).map(thread => thread.id), [id]);
  assert.equal(conversationThreads(state, { ...admin, filter: 'unread' }).find(thread => thread.id === id).unreadCount, 1);
  assert.equal(conversationThreads(state, { ...teacher, filter: 'favourites' }).length, 0);
  toggleConversationPreference(state, id, admin, 'archive');
  assert.ok(!conversationThreads(state, admin).some(thread => thread.id === id));
  assert.deepEqual(conversationThreads(state, { ...admin, filter: 'archived' }).map(thread => thread.id), [id]);
  assert.equal(conversationThreads(state, parent).length, 1);
  const restored = normalizeConversations(JSON.parse(JSON.stringify(state)));
  const saved = conversationThreads(restored, { ...admin, filter: 'archived' })[0];
  assert.equal(saved.favourite, true);
  assert.equal(saved.markedUnread, true);
  toggleConversationPreference(restored, id, admin, 'unread');
  assert.equal(conversationThreads(restored, { ...admin, filter: 'archived' })[0].unreadCount, 0);
});

test('search and group filters find student identity and message content within viewer scope', () => {
  const state = setup();
  for (const query of ['MC-0001', 'mc0001', 'Chloe Chan', 'half-hour extensions']) assert.deepEqual(conversationThreads(state, { ...admin, query }).map(thread => thread.id), ['thread-chloe'], query);
  assert.ok(conversationThreads(state, { ...admin, query: 'Mrs Chan' }).some(thread => thread.id === 'thread-chloe'));
  assert.deepEqual(conversationThreads(state, { ...admin, filter: 'groups' }).map(thread => thread.id), ['thread-staff-team']);
  assert.deepEqual(conversationThreads(state, { ...parent, filter: 'groups' }), []);
  assert.deepEqual(conversationThreads(state, { ...parent, query: 'Ethan Wong' }), []);
});

test('follow-up filter retains manager flags for staff without exposing them to parents', () => {
  const state = setup(), flagged = state.messages.filter(thread => thread.followUp).map(thread => thread.id).sort();
  assert.ok(flagged.includes('thread-chloe'));
  for (const viewer of [admin, teacher]) assert.deepEqual(conversationThreads(state, { ...viewer, filter: 'followup' }).map(thread => thread.id).sort(), flagged);
  assert.deepEqual(conversationThreads(state, { ...parent, filter: 'followup' }), []);
  toggleConversationPreference(state, 'thread-chloe', admin, 'archive');
  assert.ok(!conversationThreads(state, { ...admin, filter: 'followup' }).some(thread => thread.id === 'thread-chloe'));
  assert.ok(conversationThreads(state, { ...teacher, filter: 'followup' }).some(thread => thread.id === 'thread-chloe'));
});

test('invalid sends and reply targets fail without changing state', () => {
  const state = setup();
  for (const input of [
    { text: '  ' }, { text: 'x'.repeat(4001) }, { text: {} },
    { text: 'Reply', replyToId: getThread(state, 'thread-ethan').messages[0].id },
    { attachment: { kind: 'image', name: 'bad.png', url: 'javascript:alert(1)' } },
    { attachment: { kind: 'image', name: 'bad.svg', dataUrl: 'data:image/svg+xml;base64,PHN2Zz4=' } },
    { attachment: { kind: 'worksheet', name: 'Missing worksheet', worksheetId: 'missing' } }
  ]) {
    const before = clone(state);
    assert.throws(() => sendConversationMessage(state, 'thread-chloe', { viewer: admin, ...input }));
    assert.deepEqual(state, before);
  }
  const sent = sendConversationMessage(state, 'thread-chloe', { viewer: parent, attachment: { kind: 'worksheet', name: 'Equivalent fractions', worksheetId: 'fractions-01' } });
  assert.equal(sent.author, 'parent');
  assert.equal(sent.senderName, 'Mrs Chan');
  assert.equal(sent.text, '');
});
