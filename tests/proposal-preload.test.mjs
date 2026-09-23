import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../dist/proposal/demos.js', import.meta.url), 'utf8');
const appSource = await readFile(new URL('../dist/proposal/app.js', import.meta.url), 'utf8');
const origin = 'https://demo.example';
const scenes = ['library', 'teacher', 'student', 'game', 'operations', 'billing', 'franchise'];

// A DOM/event boundary for the real module: tests use rendered controls and
// message events, without reaching into its frame map or activation state.
class Element {
  constructor(tagName, attributes = {}) {
    this.tagName = tagName;
    this.attributes = { ...attributes };
    this.children = [];
    this.parentNode = null;
    this.style = {};
    this.clientWidth = 900;
    this.clientHeight = 700;
    this.messages = [];
    this.listeners = new Map();
    if (tagName === 'iframe') this.contentWindow = {
      postMessage: (data, targetOrigin) => this.messages.push({ data, targetOrigin })
    };
    this.classList = {
      contains: name => this.className.split(/\s+/).includes(name),
      add: name => this.classList.toggle(name, true),
      remove: name => this.classList.toggle(name, false),
      toggle: (name, force) => {
        const classes = new Set(this.className.split(/\s+/).filter(Boolean));
        const enabled = force ?? !classes.has(name);
        if (enabled) classes.add(name); else classes.delete(name);
        this.className = [...classes].join(' ');
        return enabled;
      }
    };
  }
  get className() { return this.attributes.class || ''; }
  set className(value) { this.attributes.class = value; }
  get href() { return this.attributes.href || ''; }
  set href(value) { this.attributes.href = value; }
  get dataset() {
    return Object.fromEntries(Object.entries(this.attributes)
      .filter(([name]) => name.startsWith('data-'))
      .map(([name, value]) => [name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()), value]));
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  removeAttribute(name) { delete this.attributes[name]; }
  append(child) { child.parentNode = this; this.children.push(child); }
  remove() {
    if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(child => child !== this);
    this.parentNode = null;
  }
  focus() {}
  addEventListener(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(callback);
  }
  scrollIntoView() {}
  getClientRects() { return [{}]; }
  getBoundingClientRect() { return { top: 1000, left: 0, right: 900, bottom: 1700 }; }
  insertAdjacentHTML(position, html) {
    assert.equal(position, 'beforeend');
    const fragment = new Element('div'); fragment.innerHTML = html;
    for (const child of [...fragment.children]) this.append(child);
  }
  matches(selector) {
    if (selector.includes(',')) return selector.split(',').some(part => this.matches(part.trim()));
    const compound = selector.match(/^([a-z][a-z0-9-]*)(\[.+\])$/i);
    if (compound) return this.tagName === compound[1] && this.matches(compound[2]);
    if (selector.startsWith('#')) return this.attributes.id === selector.slice(1);
    if (selector.startsWith('.')) return this.classList.contains(selector.slice(1));
    const prefix = selector.match(/^\[([^\]]+)\^="([^"]*)"\]$/);
    if (prefix) return (this.attributes[prefix[1]] || '').startsWith(prefix[2]);
    const attribute = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
    if (attribute) return attribute[2] === undefined
      ? Object.hasOwn(this.attributes, attribute[1])
      : this.attributes[attribute[1]] === attribute[2];
    return this.tagName === selector;
  }
  closest(selector) {
    for (let node = this; node; node = node.parentNode) if (node.matches(selector)) return node;
    return null;
  }
  querySelectorAll(selector) {
    const selectors = selector.split(',').map(value => value.trim());
    const matches = [];
    const visit = node => {
      for (const child of node.children) {
        if (selectors.some(value => child.matches(value))) matches.push(child);
        visit(child);
      }
    };
    visit(this);
    return matches;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  set innerHTML(html) {
    for (const child of this.children) child.parentNode = null;
    this.children = [];
    const stack = [this];
    for (const match of html.matchAll(/<(\/?)([a-z][a-z0-9-]*)([^>]*)>/gi)) {
      if (match[1]) { if (stack.length > 1) stack.pop(); continue; }
      const attributes = {};
      for (const attribute of match[3].matchAll(/([a-z][a-z0-9-]*)(?:="([^"]*)")?/gi)) {
        attributes[attribute[1]] = attribute[2] ?? '';
      }
      const child = new Element(match[2], attributes);
      stack.at(-1).append(child);
      if (!['input', 'img', 'br', 'hr', 'meta', 'link'].includes(match[2])) stack.push(child);
    }
  }
}

function harness(hash = '#teacher') {
  const body = new Element('body');
  for (const id of [...scenes, 'rollout']) body.append(new Element('div', { id: 'demo-' + id }));
  const listeners = new Map();
  const addEventListener = (type, callback) => {
    if (!listeners.has(type)) listeners.set(type, []);
    listeners.get(type).push(callback);
  };
  const timers = new Map();
  const notices = [];
  const intersections = new Map();
  let timerId = 0;
  const document = {
    body, addEventListener,
    documentElement: { style: { setProperty() {} } },
    getElementById: id => body.querySelector('#' + id),
    querySelector: selector => body.querySelector(selector),
    querySelectorAll: selector => body.querySelectorAll(selector),
    createElement: tagName => new Element(tagName)
  };
  const address = { origin, hash, href: origin + '/proposal/' + hash };
  const scope = vm.createContext({
    document, window: { addEventListener, scrollTo() {}, print() {}, innerHeight: 1000 }, location: address,
    history: { replaceState(_state, _title, url) { const next = new URL(url, address.href); address.href = next.href; address.hash = next.hash; } },
    URL, URLSearchParams, t: english => english,
    setTimeout(callback, delay) { const id = ++timerId; timers.set(id, { callback, delay }); return id; },
    clearTimeout: id => timers.delete(id),
    requestAnimationFrame: callback => callback(),
    ResizeObserver: class { observe() {} disconnect() {} },
    IntersectionObserver: class {
      constructor(callback) { this.callback = callback; }
      observe(element) { intersections.set(element, this.callback); }
      disconnect() {}
    }
  });
  vm.runInContext(source.replace(/^import[^\n]+\n/, '').replaceAll('export function ', 'function '), scope);
  const emit = (type, event = {}) => { for (const callback of listeners.get(type) ?? []) callback(event); };
  const host = id => document.querySelector('#demo-' + id);
  const frame = id => host(id).querySelector('iframe');
  return {
    document, host, frame, emit, notices, address,
    init() { scope.initDemos({ notify: message => notices.push(message) }); },
    loadApp() {
      for (const child of [...body.children]) child.remove();
      body.append(new Element('meta', { name: 'description' }));
      for (const id of ['chapters', 'menu', 'references', 'close-dialog', 'prev', 'next', 'language-switch', 'main', 'detail-dialog', 'dialog-title', 'dialog-body', 'toast', 'chapter-label', 'slide-counter', 'mode', 'presentation-footer', 'sidebar', 'print-document']) {
        body.append(new Element(id === 'language-switch' ? 'a' : id === 'main' ? 'main' : 'button', { id }));
      }
      document.getElementById('main').append(new Element('section', { id: 'vision', class: 'chapter' }));
      const chapterIds = ['vision', 'student', 'teacher', 'library', 'protection', 'system', 'billing', 'franchise', 'rollout', 'proposal'];
      scope.english = scope.chinese = {
        chapters: chapterIds.map(id => ({ id, title: id })), references: {},
        chapterHTML: chapter => {
          const ids = chapter.id === 'student' ? ['student', 'game'] : chapter.id === 'system' ? ['operations'] : [...scenes, 'rollout'].includes(chapter.id) ? [chapter.id] : [];
          return `<section id="${chapter.id}" class="chapter">${ids.map(id => `<div id="demo-${id}"></div>`).join('')}</section>`;
        }
      };
      scope.language = 'en'; scope.shellText = {};
      scope.proposalLanguageUrl = href => href + '?lang=zh-HK';
      vm.runInContext('(function(){\n' + appSource.replace(/^import[^\n]+\n/gm, '').replaceAll('export function ', 'function ') + '\n})()', scope);
    },
    click(target) {
      const event = { target, prevented: false, preventDefault() { this.prevented = true; } };
      for (const callback of target.listeners.get('click') ?? []) callback(event);
      emit('click', event);
      return event;
    },
    isSaving() { return scope.demoIsSaving(); },
    warm() {
      for (const [id, timer] of [...timers]) if (timer.delay === 0) { timers.delete(id); timer.callback(); }
    },
    activate(id) { scope.activateDemo(id); },
    intersect(id, visible) {
      const stage = host(id).querySelector('.demo-viewport');
      intersections.get(stage)([{ target: stage, isIntersecting: visible }]);
    },
    choose(id, view) {
      const target = host(id).querySelector('[data-demo-view="' + view + '"]');
      assert.ok(target, 'The requested view must be exposed as a control');
      emit('click', { target });
    },
    message(sender, data, eventOrigin = origin) { emit('message', { source: sender, origin: eventOrigin, data }); },
    ready(id, role = 'admin', page = 'schedule') {
      emit('message', { source: frame(id).contentWindow, origin, data: { type: 'mc-proposal:ready', role, page } });
    }
  };
}

const messages = (frame, type) => frame.messages.filter(message => message.data.type === type);

test('the requested scene starts first and all inline scenes warm without visiting their chapters', () => {
  const h = harness();
  h.init();
  assert.ok(h.frame('teacher'));
  h.warm();
  assert.equal(h.document.querySelectorAll('iframe').length, scenes.length);
  for (const id of scenes) {
    const frame = h.frame(id);
    const url = new URL(frame.src, origin);
    assert.equal(frame.loading, 'eager');
    assert.equal(url.searchParams.get('proposal'), '1');
    assert.equal(url.searchParams.get('proposalPreload'), '1');
  }
});

test('background readiness cannot take activation from the visible scene, and revisiting keeps its frame', () => {
  const h = harness(); h.init(); h.warm();
  const teacher = h.frame('teacher');
  const billing = h.frame('billing');
  h.activate('teacher');
  h.ready('teacher', 'teacher', 'progress');
  h.ready('billing', 'admin', 'billing');
  assert.equal(messages(teacher, 'mc-proposal:activate').length, 1);
  assert.equal(messages(billing, 'mc-proposal:activate').length, 0);
  h.activate('billing');
  assert.equal(messages(teacher, 'mc-proposal:deactivate').length, 1);
  assert.equal(messages(billing, 'mc-proposal:activate').length, 1);
  h.activate('teacher');
  assert.equal(h.frame('teacher'), teacher);
  assert.equal(h.frame('billing'), billing);
  assert.equal(messages(teacher, 'mc-proposal:activate').length, 2);
  assert.equal(messages(billing, 'mc-proposal:deactivate').length, 1);
  assert.equal(h.document.querySelectorAll('iframe').length, scenes.length);
});

test('only a known frame from the same origin can clear loading or alter its view', () => {
  const h = harness(); h.init(); h.warm(); h.activate('teacher');
  const frame = h.frame('teacher');
  const ready = { type: 'mc-proposal:ready', role: 'parent', page: 'overview' };
  h.message({}, ready);
  h.message(frame.contentWindow, ready, 'https://untrusted.example');
  h.message(frame.contentWindow, { ...ready, role: '__proto__' });
  assert.ok(h.host('teacher').querySelector('.demo-loading'));
  assert.equal(frame.style.width, '1440px');
  assert.equal(frame.messages.length, 0);
  h.ready('teacher', 'teacher', 'progress');
  assert.equal(h.host('teacher').querySelector('.demo-loading'), null);
  assert.ok(h.host('billing').querySelector('.demo-loading'));
  assert.equal(messages(frame, 'mc-proposal:activate').length, 1);
  assert.ok(frame.messages.every(message => message.targetOrigin === origin));
});

test('role changes reuse a ready frame and an early selection is delivered when that frame becomes ready', () => {
  const h = harness('#billing'); h.init(); h.warm(); h.activate('billing');
  const frame = h.frame('billing');
  h.choose('billing', 'parentPayments');
  assert.equal(h.frame('billing'), frame);
  assert.equal(messages(frame, 'mc-proposal:navigate').length, 0);
  h.ready('billing');
  let navigation = messages(frame, 'mc-proposal:navigate').at(-1).data;
  assert.equal(navigation.role, 'parent');
  assert.equal(navigation.page, 'payments');
  h.message(frame.contentWindow, { type: 'mc-proposal:state', role: 'parent', page: 'payments' });
  assert.equal(frame.style.width, '390px');
  h.choose('billing', 'billing');
  assert.equal(h.frame('billing'), frame);
  navigation = messages(frame, 'mc-proposal:navigate').at(-1).data;
  assert.equal(navigation.role, 'admin');
  assert.equal(navigation.page, 'billing');
  assert.equal(frame.style.width, '1440px');
});

test('switching branches replaces only that scene and ignores messages from its removed frame', () => {
  const h = harness(); h.init(); h.warm();
  const teacher = h.frame('teacher');
  const original = h.frame('franchise');
  h.activate('franchise'); h.ready('franchise');
  h.choose('franchise', 'hh');
  const replacement = h.frame('franchise');
  assert.notEqual(replacement, original);
  assert.equal(new URL(replacement.src, origin).pathname, '/hh/');
  assert.equal(original.parentNode, null);
  assert.equal(h.frame('teacher'), teacher);
  assert.equal(h.document.querySelectorAll('iframe').length, scenes.length);
  h.message(original.contentWindow, { type: 'mc-proposal:ready', role: 'admin', page: 'schedule' });
  assert.ok(h.host('franchise').querySelector('.demo-loading'));
  assert.equal(replacement.messages.length, 0);
  h.ready('franchise');
  assert.equal(h.host('franchise').querySelector('.demo-loading'), null);
  assert.equal(messages(replacement, 'mc-proposal:activate').length, 1);
});

test('hidden chapters keep their frame dimensions and resize correctly when shown again', () => {
  const h = harness(); h.init(); h.warm();
  const frame = h.frame('teacher');
  const stage = h.host('teacher').querySelector('.demo-viewport');
  const before = { ...frame.style };
  const oldHeight = stage.style.height;
  stage.clientWidth = 0;
  h.emit('resize');
  assert.deepEqual(frame.style, before);
  assert.equal(stage.style.height, oldHeight);
  stage.clientWidth = 720;
  h.activate('teacher');
  assert.equal(frame.style.width, '1440px');
  assert.equal(frame.style.transform, 'scale(0.5)');
  assert.equal(stage.style.height, '500px');
});

test('saving accepts only boolean messages from current same-origin frames and protects every scene until unlocked', () => {
  const h = harness('#billing'); h.init(); h.warm(); h.activate('billing');
  h.ready('billing', 'admin', 'billing'); h.ready('franchise');
  const billing = h.frame('billing'), franchise = h.frame('franchise');
  const saving = { type: 'mc-proposal:saving', saving: true };
  h.message({}, saving);
  h.message(billing.contentWindow, saving, 'https://untrusted.example');
  h.message(billing.contentWindow, { ...saving, saving: 'true' });
  assert.equal(h.isSaving(), false);
  h.message(billing.contentWindow, saving);
  assert.equal(h.isSaving(), true);
  assert.equal(billing.inert, false);
  assert.equal(franchise.inert, true, 'Other iframe apps cannot accept input and overwrite the review while it saves');

  h.choose('billing', 'parentPayments');
  h.choose('franchise', 'hh');
  h.activate('teacher');
  h.message(franchise.contentWindow, { type: 'mc-proposal:focused' });
  assert.equal(messages(billing, 'mc-proposal:navigate').length, 0);
  assert.equal(messages(billing, 'mc-proposal:deactivate').length, 0);
  assert.equal(messages(franchise, 'mc-proposal:activate').length, 0);
  assert.equal(h.frame('franchise'), franchise);
  assert.equal(h.document.querySelectorAll('iframe').length, scenes.length);
  assert.ok(h.notices.every(message => /Saving payment review/.test(message)));
  assert.equal(h.notices.length, 2);

  const unloading = { prevented: false, preventDefault() { this.prevented = true; } };
  h.emit('beforeunload', unloading);
  assert.equal(unloading.prevented, true);
  assert.equal(unloading.returnValue, '');
  h.message({}, { ...saving, saving: false });
  h.message(billing.contentWindow, { ...saving, saving: false }, 'https://untrusted.example');
  assert.equal(h.isSaving(), true);
  h.message(billing.contentWindow, { ...saving, saving: false });
  assert.equal(h.isSaving(), false);
  assert.equal(franchise.inert, false);
  const allowed = { prevented: false, preventDefault() { this.prevented = true; } };
  h.emit('beforeunload', allowed);
  assert.equal(allowed.prevented, false);
  h.choose('billing', 'parentPayments');
  assert.equal(messages(billing, 'mc-proposal:navigate').at(-1).data.role, 'parent');
  h.choose('franchise', 'hh');
  assert.notEqual(h.frame('franchise'), franchise);
});

test('expanded demos cannot close by button or Escape during saving and can close after recovery', () => {
  const h = harness('#billing'); h.init(); h.warm(); h.activate('billing'); h.ready('billing', 'admin', 'billing');
  const frame = h.frame('billing');
  const expand = h.host('billing').querySelector('[data-demo-expand]');
  h.emit('click', { target: expand });
  assert.equal(h.document.body.classList.contains('demo-expanded'), true);
  h.message(frame.contentWindow, { type: 'mc-proposal:saving', saving: true });
  h.emit('click', { target: expand });
  let prevented = false;
  h.emit('keydown', { key: 'Escape', preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(h.document.body.classList.contains('demo-expanded'), true);
  assert.equal(h.notices.length, 2);
  h.message(frame.contentWindow, { type: 'mc-proposal:saving', saving: false });
  h.emit('click', { target: expand });
  assert.equal(h.document.body.classList.contains('demo-expanded'), false);
  assert.equal(h.frame('billing'), frame);
});

test('a view requested before another frame starts saving stays queued until all saving finishes', () => {
  const h = harness('#billing'); h.init(); h.warm(); h.activate('billing'); h.ready('billing', 'admin', 'billing');
  h.choose('operations', 'parentLessons');
  const billing = h.frame('billing'), system = h.frame('operations');
  h.message(billing.contentWindow, { type: 'mc-proposal:saving', saving: true });
  h.ready('operations');
  assert.equal(messages(system, 'mc-proposal:navigate').length, 0);
  h.message(billing.contentWindow, { type: 'mc-proposal:saving', saving: false });
  assert.equal(messages(system, 'mc-proposal:navigate').length, 1);
  assert.equal(messages(system, 'mc-proposal:navigate')[0].data.role, 'parent');
});

test('the proposal shell blocks chapter, language and reading-mode navigation while its payment review saves', () => {
  const h = harness('#billing'); h.loadApp(); h.warm(); h.ready('billing', 'admin', 'billing');
  const billing = h.frame('billing');
  const doc = h.document;
  const chapterLink = doc.querySelector('a[href="#teacher"]');
  const mode = doc.getElementById('mode');
  h.message(billing.contentWindow, { type: 'mc-proposal:saving', saving: true });
  assert.equal(h.click(chapterLink).prevented, true);
  assert.equal(h.click(doc.getElementById('language-switch')).prevented, true);
  h.click(mode);
  h.click(doc.getElementById('next'));
  assert.equal(h.address.hash, '#billing');
  assert.equal(doc.getElementById('chapter-label').textContent, 'billing');
  assert.equal(doc.body.classList.contains('present-mode'), false);
  assert.match(doc.getElementById('toast').textContent, /Saving payment review/);
  h.address.hash = '#student';
  h.emit('hashchange');
  assert.equal(h.address.hash, '#billing');
  assert.equal(messages(billing, 'mc-proposal:deactivate').length, 0);

  h.message(billing.contentWindow, { type: 'mc-proposal:saving', saving: false });
  assert.equal(h.click(doc.getElementById('language-switch')).prevented, false);
  h.click(mode);
  assert.equal(doc.body.classList.contains('present-mode'), true);
  h.click(chapterLink);
  assert.equal(h.address.hash, '#teacher');
  assert.equal(doc.getElementById('chapter-label').textContent, 'teacher');
  assert.equal(h.frame('billing'), billing);
  assert.equal(messages(billing, 'mc-proposal:deactivate').length, 1);
});

test('the game preloads alongside the student binder and follows viewport, chapter and tab activity without replacing either frame', () => {
  const h = harness('#student'); h.init(); h.warm(); h.activate('student');
  h.ready('student', 'student', 'work'); h.ready('game', 'game', 'race');
  const student = h.frame('student'), game = h.frame('game');
  assert.equal(new URL(game.src, origin).pathname, '/game1/');
  assert.equal(game.style.width, '675px');
  assert.equal(game.style.transform, 'none');
  assert.equal(h.host('game').querySelector('a').href, '/game1/');
  assert.equal(messages(game, 'mc-proposal:activate').length, 0);

  h.intersect('game', true);
  assert.equal(messages(student, 'mc-proposal:deactivate').length, 1);
  assert.equal(messages(game, 'mc-proposal:activate').length, 1);
  h.intersect('game', false);
  assert.equal(messages(game, 'mc-proposal:deactivate').length, 1);
  h.intersect('game', true);
  h.document.hidden = true; h.emit('visibilitychange');
  assert.equal(messages(game, 'mc-proposal:deactivate').length, 2);
  h.document.hidden = false; h.emit('visibilitychange');
  assert.equal(messages(game, 'mc-proposal:activate').length, 3);
  assert.equal(messages(game, 'mc-proposal:navigate').length, 0);
  h.activate('library');
  assert.equal(messages(game, 'mc-proposal:deactivate').length, 3);
  assert.equal(h.frame('game'), game);
  assert.equal(h.frame('student'), student);
});

test('a hidden document never starts an embedded game and a narrow frame retains usable controls', () => {
  const h = harness('#student'); h.init(); h.warm();
  const game = h.frame('game'), stage = h.host('game').querySelector('.demo-viewport');
  h.document.hidden = true;
  h.intersect('game', true);
  h.ready('game', 'game', 'race');
  assert.equal(messages(game, 'mc-proposal:activate').length, 0);
  stage.clientWidth = 360;
  h.emit('resize');
  assert.equal(game.style.width, '360px');
  assert.equal(game.style.height, '600px');
  assert.equal(game.style.transform, 'none');
});

test('scrolling within the student chapter keeps the visible game active rather than resetting to its binder', () => {
  const h = harness('#student'); h.loadApp(); h.warm();
  h.ready('student', 'student', 'work'); h.ready('game', 'game', 'race');
  h.document.getElementById('student').getBoundingClientRect = () => ({ top: 100 });
  h.intersect('game', true);
  const game = h.frame('game');
  h.emit('scroll');
  assert.equal(h.document.getElementById('chapter-label').textContent, 'student');
  assert.equal(messages(game, 'mc-proposal:activate').length, 1);
  assert.equal(messages(game, 'mc-proposal:deactivate').length, 0);
  assert.equal(h.frame('game'), game);
});

test('legacy chapter links open the merged chapters and reuse their existing demo frames', () => {
  for (const [legacy, chapter, demo] of [['authoring', 'library', 'library'], ['operations', 'system', 'operations']]) {
    const h = harness('#' + legacy); h.loadApp(); h.warm();
    assert.equal(h.address.hash, '#' + chapter);
    assert.equal(h.document.getElementById('chapter-label').textContent, chapter);
    const original = h.frame(demo);
    h.ready(demo, 'admin', 'schedule');
    h.click(h.document.querySelector('a[href="#student"]'));
    h.click(h.document.querySelector(`a[href="#${chapter}"]`));
    assert.equal(h.frame(demo), original);
    assert.equal(h.document.querySelectorAll('iframe').length, scenes.length);
  }
});
