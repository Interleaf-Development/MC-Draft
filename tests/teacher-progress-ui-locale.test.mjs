import test from 'node:test';
import assert from 'node:assert/strict';
import * as model from '../dist/model.js';
import { p3Topics, p3Worksheets, p3SupplementGroups } from '../dist/p3-curriculum.js';
import { p6Topics, p6Worksheets, p6SupplementGroups } from '../dist/p6-curriculum.js';
import { progressRecordCatalogues } from '../dist/progress-records.js';
import { createTeacherProgressUI } from '../dist/teacher-progress-ui.js';

const catalogues = {
  ...progressRecordCatalogues,
  P3: { topics: p3Topics, worksheets: p3Worksheets, groups: p3SupplementGroups },
  P6: { topics: p6Topics, worksheets: p6Worksheets, groups: p6SupplementGroups }
};
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

function harness() {
  const state = model.seed();
  state.bookings = [{ id: 'locale-class', studentId: 'chloe', date: model.TODAY, start: 960, duration: 60, tutor: model.centre.managerId, status: 'scheduled' }];
  const notifications = [];
  let html = '', ui;
  const render = () => { html = ui.render(); };
  ui = createTeacherProgressUI({
    getState: () => state, getTutorId: () => model.centre.managerId, render,
    change(callback, message) { callback(); notifications.push(message); render(); }
  });
  render();
  return {
    state, ui, notifications, get html() { return html; },
    grade(value) { ui.onChange({ target: { id: 'teacher-progress-grade', value } }); },
    search(value) { ui.onInput({ target: { id: 'teacher-progress-worksheet-search', value } }); },
    click(action, worksheet) { ui.onClick({ dataset: { action: 'teacher-progress-' + action, worksheet } }); }
  };
}

test('every available grade renders Chinese topics and supplement names without changing the catalogue or saved records', () => {
  const app = harness(), originalState = structuredClone(app.state), originalCatalogues = structuredClone(catalogues);
  for (const [grade, catalogue] of Object.entries(catalogues)) {
    app.grade(grade);
    const topics = [...app.html.matchAll(/class="teacher-progress-topic-name">([\s\S]*?)<\/span>/g)].map(match => match[1].replace(/<small[\s\S]*?<\/small>/g, ''));
    assert.deepEqual(topics, catalogue.topics.map(topic => escapeHtml(topic.titleZh)), grade + ' uses Chinese titles for every topic');
    const renderedIds = new Set([...app.html.matchAll(/data-worksheet="([^"]+)"/g)].map(match => match[1]));
    assert.deepEqual(renderedIds, new Set(catalogue.worksheets.map(worksheet => worksheet.id)), grade + ' retains every original worksheet ID');
    for (const group of catalogue.groups.filter(group => group.id === 'ps' || group.id === 'sspa')) {
      for (const section of group.sections) assert.ok(app.html.includes('>'+escapeHtml(section.titleZh)+'</'), grade + ' renders ' + section.id + ' in Chinese');
    }
    for (const worksheet of catalogue.worksheets) assert.ok(app.html.includes('aria-label="'+escapeHtml(worksheet.code+' · '+worksheet.titleZh)+' · '), grade + ' supplies a Chinese accessible worksheet title');
    assert.match(app.html, /aria-label="工作紙狀態圖例"/);
    assert.doesNotMatch(app.html, />Topic<|>First term<|>Second term<|>Extended part<|>Books<|>Supplementary worksheets<|>Form [123]<|>Not sent<|>Prepared<|>To mark<|>Send to student<|pp\. /);
  }
  assert.deepEqual(app.state, originalState, 'Browsing and translation preserve saved student records');
  assert.deepEqual(catalogues, originalCatalogues, 'Rendering preserves canonical curriculum source data');
});

test('Chinese topics and collection labels are searchable, while catalogue codes and English source titles remain searchable', () => {
  const app = harness();
  const matchingIds = () => [...app.html.matchAll(/class="teacher-progress-box [^"]*\bis-match\b[^"]*"[^>]*data-worksheet="([^"]+)"/g)].map(match => match[1]);
  app.grade('P6');
  app.search('小數及整數除以整數');
  assert.ok(matchingIds().includes('p6-math-601-A'));
  app.search('小數除法應用題');
  assert.ok(matchingIds().includes('p6-ps-1'), 'Chinese supplement names match worksheet cells');
  app.search('6B01');
  assert.equal(matchingIds().length, 4);
  assert.match(app.html, /4 項結果/);
  app.grade('S1');
  app.search('選擇題');
  assert.deepEqual(new Set(matchingIds()), new Set(catalogues.S1.worksheets.filter(worksheet => worksheet.family === 'mc').map(worksheet => worksheet.id)));
  app.grade('K');
  app.search('補充工作紙');
  assert.deepEqual(new Set(matchingIds()), new Set(catalogues.K.worksheets.filter(worksheet => worksheet.family === 'supplementary').map(worksheet => worksheet.id)));
  app.grade('P3');
  app.search('Five-digit numbers');
  assert.ok(matchingIds().includes('p3-math-301-A'));
  app.search('使用者輸入 <keep this>');
  assert.match(app.html, /value="使用者輸入 &lt;keep this&gt;"/);
  assert.match(app.html, /找不到工作紙/);
});

test('prepare and send use Chinese controls and notifications while preserving names and canonical assignment values', () => {
  const app = harness();
  app.grade('P6');
  app.click('worksheet', 'p6-math-603-P');
  assert.match(app.html, /aria-label="為 Chloe Chan 預備 1 份工作紙"/);
  assert.match(app.html, /aria-label="派發 1 份工作紙給 Chloe Chan"/);
  app.click('prepare');
  assert.equal(app.notifications.at(-1), '已為 Chloe Chan 預備工作紙。');
  assert.equal(app.state.assignments.at(-1).status, 'prepared');
  assert.equal(app.state.assignments.at(-1).worksheetId, 'p6-math-603-P');
  app.click('worksheet', 'p6-math-601-P');
  app.ui.onChange({ target: { id: 'teacher-progress-purpose', value: 'homework' } });
  app.click('send');
  assert.equal(app.notifications.at(-1), '已派發工作紙給 Chloe Chan。');
  assert.equal(app.state.assignments.at(-1).status, 'upcoming');
  assert.equal(app.state.assignments.at(-1).homework, true);
  assert.equal(app.state.assignments.at(-1).studentId, 'chloe');
});
