import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as model from '../dist/model.js';
import { makeCheckInPass, qrSvg, redeemCheckIn } from '../dist/checkin.js';
import { familyText, familyDate } from '../dist/family-locale.js';

const source = await readFile(new URL('../dist/app.js', import.meta.url), 'utf8');

function functionSource(name) {
  const start = source.indexOf('function ' + name + '(');
  assert.notEqual(start, -1, 'Production function exists: ' + name);
  const next = source.slice(start + 1).search(/\n(?:function |const |let |document\.)/);
  return source.slice(start, next === -1 ? undefined : start + 1 + next);
}

// Exercise the production renderers and focus lifecycle without starting the app.
// Actual browser Tab order and native details behavior are checked separately.
function renderer() {
  const state = model.seed();
  const ui = { role: 'parent', page: 'overview', familyStudent: 'chloe', checkInBooking: null };
  const overlay = { innerHTML: '' }, app = { inert: false };
  const document = { body: { style: { overflow: '' } }, activeElement: null };
  const element = () => ({
    isConnected: true, attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
    focus() { document.activeElement = this; }
  });
  const trigger = element(), close = element();
  let currentTrigger = trigger, persisted = 0;
  document.activeElement = trigger;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const t = (en, zh) => zh ?? familyText(en, ui.role);
  const context = vm.createContext({
    ...model, makeCheckInPass, qrSvg, state, ui, document, esc, t,
    billingWorkflowUI: { isSaving: () => false, onModalClosed() {} },
    proofUI: { onModalClosed() {} },
    dateLabel: (value, options) => familyDate(value, ui.role, options),
    persist: () => { persisted++; },
    icon: () => '<svg aria-hidden="true"></svg>',
    action: (name, label, cls = '', attrs = '') => '<button type="button" data-action="' + name + '" class="' + cls + '" ' + attrs + '>' + t(label) + '</button>',
    $: selector => {
      if (selector === '#overlay') return overlay;
      if (selector === '#app') return app;
      if (selector === '.parent-qr-button') return currentTrigger;
      if (selector === '.checkin-modal') return overlay.innerHTML.includes('class="modal checkin-modal"') ? {} : null;
      if (selector === '.checkin-close') return overlay.innerHTML.includes('class="checkin-close"') ? close : null;
      throw new Error('Unexpected selector: ' + selector);
    }
  });
  vm.runInContext('let returnFocus = null;\n' + ['closeModal', 'checkInOverlay', 'checkInDialog', 'parentBottomNav'].map(functionSource).join('\n'), context);
  return {
    state, ui, overlay, app, document, trigger, close,
    get persisted() { return persisted; },
    call: (name, ...args) => context[name](...args),
    replaceTrigger() { currentTrigger.isConnected = false; currentTrigger = element(); return currentTrigger; }
  };
}

test('attendance card contains the actual local QR, child and lesson date with demo tools collapsed', () => {
  const app = renderer();
  app.call('checkInDialog');
  const html = app.overlay.innerHTML;
  assert.match(html, /id="attendance-qr-dialog"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*aria-labelledby="checkin-title"/);
  assert.match(html, /id="checkin-title"[^>]*>出席二維碼</);
  assert.match(html, /<h3>Chloe Chan<\/h3>/);
  assert.match(html, /請向接待處出示二維碼/);
  assert.match(html, /<svg[^>]*role="img"/);
  assert.match(html, /課堂出席二維碼/);
  const expected = qrSvg(app.ui.checkInPayload).replace('Lesson check-in QR code', '課堂出席二維碼').replace('An opaque demo pass for today’s lesson.', '用於今天課堂的示範出席碼。');
  assert.ok(html.includes(expected), 'Card must render the QR from its redeemable token');
  assert.ok(html.includes(familyDate(model.TODAY, 'parent', { weekday: 'short' })));
  assert.match(html, /<details class="checkin-tools"><summary>示範工具<\/summary><button[^>]*data-action="simulate-checkin"/);
  assert.doesNotMatch(html, /<details[^>]*\bopen(?:\s|=|>)/);
  assert.doesNotMatch(html, /class="checkin-success/);
  assert.equal(app.state.checkInPasses.length, 1);
  assert.equal(app.persisted, 1);
  assert.equal(app.state.bookings.find(item => item.id === app.ui.checkInBooking).attendance, 'unmarked');
});

test('switching to a child without a lesson removes the stale QR and scan action without changing records', () => {
  const app = renderer();
  app.call('checkInDialog');
  const before = model.clone(app.state), persisted = app.persisted;
  app.ui.familyStudent = 'mia'; app.ui.checkInBooking = null;
  app.call('checkInDialog');
  assert.equal(app.ui.checkInPayload, null);
  assert.match(app.overlay.innerHTML, /Mia Cheung/);
  assert.match(app.overlay.innerHTML, /沒有可登記的課堂/);
  assert.match(app.overlay.innerHTML, /data-action="close-modal"/);
  assert.doesNotMatch(app.overlay.innerHTML, /class="checkin-qr"|data-action="simulate-checkin"|id="checkin-lesson"/);
  assert.deepEqual(app.state, before);
  assert.equal(app.persisted, persisted);
});

test('same-day lesson selector keeps a split make-up distinct and check-in status follows the selected lesson', () => {
  const app = renderer();
  const regular = app.state.bookings.find(item => item.studentId === 'chloe' && item.date === model.TODAY);
  const [makeup] = model.bookMakeup(app.state, 'makeup-chloe', [{ date: model.TODAY, start: 1020, duration: 30, tutor: 'chan' }]);
  app.call('checkInDialog');
  const firstPayload = app.ui.checkInPayload;
  assert.equal(app.ui.checkInBooking, regular.id);
  const select = app.overlay.innerHTML.match(/<select id="checkin-lesson"[\s\S]*?<\/select>/)?.[0];
  assert.ok(select);
  assert.deepEqual([...select.matchAll(/<option value="([^"]+)"/g)].map(match => match[1]), [regular.id, makeup.id]);
  app.ui.checkInBooking = makeup.id;
  app.call('checkInDialog');
  assert.notEqual(app.ui.checkInPayload, firstPayload);
  assert.ok(app.overlay.innerHTML.includes('<option value="' + makeup.id + '" selected>'));
  assert.match(app.overlay.innerHTML, /17:00–17:30/);
  const scan = redeemCheckIn(app.state, app.ui.checkInPayload);
  assert.equal(scan.booking.id, makeup.id);
  app.call('checkInDialog');
  assert.equal(app.ui.checkInBooking, makeup.id);
  assert.equal(regular.attendance, 'unmarked');
  assert.equal(makeup.attendance, 'present');
  assert.match(app.overlay.innerHTML, /class="checkin-success[^>]*role="status"[\s\S]*?已登記出席/);
  assert.ok(app.overlay.innerHTML.includes(familyText('Scan again (demo)', 'parent')));
});

test('a selected booking invalidated while the card is open cannot leave a redeemable QR on screen', () => {
  const app = renderer();
  app.call('checkInDialog');
  const payload = app.ui.checkInPayload;
  app.state.bookings.find(item => item.id === app.ui.checkInBooking).status = 'cancelled';
  const before = model.clone(app.state);
  app.call('checkInDialog');
  assert.equal(app.ui.checkInPayload, null);
  assert.match(app.overlay.innerHTML, /沒有可登記的課堂/);
  assert.doesNotMatch(app.overlay.innerHTML, /class="checkin-qr"|data-action="simulate-checkin"/);
  assert.throws(() => redeemCheckIn(app.state, payload), /no longer active/);
  assert.deepEqual(app.state, before);
});

test('QR launcher has an accessible name and dialog target without a visible text label', () => {
  const app = renderer();
  const html = app.call('parentBottomNav');
  const trigger = html.match(/<button[^>]*data-action="show-checkin"[^>]*>([\s\S]*?)<\/button>/);
  assert.ok(trigger);
  assert.match(trigger[0], /aria-label="開啟出席二維碼"/);
  assert.match(trigger[0], /aria-haspopup="dialog"/);
  assert.match(trigger[0], /aria-controls="attendance-qr-dialog"/);
  assert.match(trigger[0], /aria-expanded="false"/);
  assert.match(trigger[1], /<img[^>]*alt=""/);
  assert.equal(trigger[1].replace(/<[^>]+>/g, '').trim(), '');
});

test('overlay refresh preserves the launcher and close restores focus, scroll and background interaction', () => {
  const app = renderer();
  app.call('checkInDialog');
  assert.equal(app.app.inert, true);
  assert.equal(app.document.body.style.overflow, 'hidden');
  assert.equal(app.document.activeElement, app.close);
  assert.equal(app.trigger.attributes['aria-expanded'], 'true');
  assert.match(app.overlay.innerHTML, /<section[^>]*>[\s\S]*data-action="close-modal"[^>]*aria-label="關閉出席二維碼"[\s\S]*<\/section>/);
  app.call('checkInDialog');
  app.call('closeModal');
  assert.equal(app.document.activeElement, app.trigger, 'A refreshed card must not replace its saved launcher with its own close button');
  assert.equal(app.trigger.attributes['aria-expanded'], 'false');
  assert.equal(app.app.inert, false);
  assert.equal(app.document.body.style.overflow, '');
  assert.equal(app.overlay.innerHTML, '');

  app.call('checkInDialog');
  const replacement = app.replaceTrigger();
  redeemCheckIn(app.state, app.ui.checkInPayload);
  app.call('checkInDialog');
  app.call('closeModal');
  assert.equal(app.document.activeElement, replacement, 'After a main-app render disconnects the launcher, close must focus its current replacement');
  assert.equal(replacement.attributes['aria-expanded'], 'false');
  assert.equal(app.app.inert, false);
});
