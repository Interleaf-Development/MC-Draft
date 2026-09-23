import test from 'node:test';
import { execFileSync } from 'node:child_process';

// Each branch gets a fresh module graph, just as separate browser entries do.
for (const branch of [
  { path: '/parent', name: 'Tsuen Wan', chinese: '荃灣', director: 'Koko Ko', teacher: 'Koko', colleague: 'Ming' },
  { path: '/hh/parent', name: 'Hang Hau', chinese: '坑口', director: 'Rico', teacher: 'Rico', colleague: 'John' }
]) {
  test(`${branch.name} chats use their branch identity and preserve saved message content`, () => {
    execFileSync(process.execPath, ['--input-type=module', '--eval', `
      import assert from 'node:assert/strict';
      globalThis.location = { pathname: ${JSON.stringify(branch.path)} };
      const expected = ${JSON.stringify(branch)};
      const { seed, seedCentreVolume } = await import('./dist/model.js');
      const { normalizeConversations, sendConversationMessage } = await import('./dist/conversations.js');
      const { createConversationUI } = await import('./dist/conversations-ui.js');
      const { createBankCheckUI } = await import('./dist/bank-check-ui.js');
      const { familyChatMessage } = await import('./dist/chat-seed-locale.js');
      const { familyText } = await import('./dist/family-locale.js');
      const state = normalizeConversations(seedCentreVolume(seed()));
      const group = state.messages.find(thread => thread.id === 'thread-staff-team');
      assert.equal(group.title, expected.name + ' team');
      assert.equal(group.messages[0].senderName, expected.director);
      assert.equal(group.messages[1].senderName, expected.colleague);
      assert.equal(familyText(expected.name, 'parent'), expected.chinese);
      assert.equal(familyText('MathConcept (' + expected.name + ')', 'student'), 'MathConcept（' + expected.chinese + '）');

      for (const thread of state.messages.filter(thread => thread.audience !== 'staff')) {
        for (const message of thread.messages) {
          assert.notEqual(familyChatMessage(thread, message, 'parent'), message.text, message.id);
          assert.equal(familyChatMessage(thread, message, 'teacher'), message.text);
        }
      }
      const thread = state.messages.find(thread => thread.id === 'thread-chloe');
      if (expected.name === 'Hang Hau') {
        thread.assignedTo = 'Ricco';
        group.messages[0].senderName = 'Ricco';
        thread.messages[0].text = 'Please ask Ricco about the lesson.';
        normalizeConversations(state);
        assert.equal(thread.assignedTo, 'Rico');
        assert.equal(group.messages[0].senderName, 'Rico');
        assert.equal(thread.messages[0].text, 'Please ask Ricco about the lesson.');
      }
      const userText = 'Please ask Koko and Ming about the Tsuen Wan lesson.';
      const sent = sendConversationMessage(state, thread.id, { viewer: { role: 'teacher' }, text: userText });
      assert.equal(sent.senderName, expected.teacher);
      assert.equal(familyChatMessage(thread, sent, 'parent'), userText);
      thread.messages[0].text = 'A custom parent message about Tsuen Wan and Koko.';
      group.title = 'Our saved team title';
      group.messages[1].senderName = 'Saved sender';
      const before = structuredClone(state.messages);
      normalizeConversations(state);
      assert.deepEqual(state.messages, before);
      assert.equal(familyChatMessage(thread, thread.messages[0], 'parent'), thread.messages[0].text);

      globalThis.document = { querySelector: () => null, getElementById: () => null };
      globalThis.matchMedia = () => ({ matches: true });
      const viewer = { role: 'parent', studentId: 'chloe' };
      const ui = createConversationUI({ getState: () => state, getViewer: () => viewer, persist() {}, render() {}, modal() {}, closeModal() {}, toast() {}, childSwitch: () => '' });
      assert.ok(ui.render().includes('MathConcept（' + expected.chinese + '）'));
      viewer.role = 'teacher';
      ui.handleAction('wa-thread', group.id, {});
      assert.ok(ui.render().includes(expected.director + '、' + expected.colleague + '、接待處'));
      const bank = createBankCheckUI({ getState: () => state, getViewer: () => viewer });
      assert.throws(() => bank.openUpload(), error => error.message === '銀行對數只供' + expected.teacher + '在行政介面使用。');
    `], { cwd: new URL('..', import.meta.url), encoding: 'utf8', stdio: 'pipe' });
  });
}
