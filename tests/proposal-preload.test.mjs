import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../dist/proposal/demos.js', import.meta.url), 'utf8');
const origin = 'https://demo.example';
const scenes = ['system', 'library', 'teacher', 'student', 'operations', 'billing', 'franchise'];

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
    if (tagName === 'iframe') this.contentWindow = {
      postMessage: (data, targetOrigin) => this.messages.push({ data, targetOrigin })
    };
    this.classList = {
      contains: name => this.className.split(/\s+/).includes(name),
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
  matches(selector) {
    if (selector.startsWith('#')) return this.attributes.id === selector.slice(1);
    if (selector.startsWith('.')) return this.classList.contains(selector.slice(1));
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
  let timerId = 0;
  const document = {
    body, addEventListener,
    querySelector: selector => body.querySelector(selector),
    querySelectorAll: selector => body.querySelectorAll(selector),
    createElement: tagName => new Element(tagName)
  };
  const scope = vm.createContext({
    document, window: { addEventListener }, location: { origin, hash },
    URLSearchParams, t: english => english,
    setTimeout(callback, delay) { const id = ++timerId; timers.set(id, { callback, delay }); return id; },
    clearTimeout: id => timers.delete(id),
    requestAnimationFrame: callback => callback(),
    ResizeObserver: class { observe() {} disconnect() {} }
  });
  vm.runInContext(source.replace(/^import[^\n]+\n/, '').replaceAll('export function ', 'function '), scope);
  const emit = (type, event = {}) => { for (const callback of listeners.get(type) ?? []) callback(event); };
  const host = id => document.querySelector('#demo-' + id);
  const frame = id => host(id).querySelector('iframe');
  return {
    document, host, frame, emit,
    init() { scope.initDemos(); },
    warm() {
      for (const [id, timer] of [...timers]) if (timer.delay === 0) { timers.delete(id); timer.callback(); }
    },
    activate(id) { scope.activateDemo(id); },
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
  const h = harness('#system'); h.init(); h.warm(); h.activate('system');
  const frame = h.frame('system');
  h.choose('system', 'student');
  assert.equal(h.frame('system'), frame);
  assert.equal(messages(frame, 'mc-proposal:navigate').length, 0);
  h.ready('system');
  let navigation = messages(frame, 'mc-proposal:navigate').at(-1).data;
  assert.equal(navigation.role, 'student');
  assert.equal(navigation.page, 'work');
  h.message(frame.contentWindow, { type: 'mc-proposal:state', role: 'student', page: 'work' });
  h.choose('system', 'parent');
  assert.equal(h.frame('system'), frame);
  navigation = messages(frame, 'mc-proposal:navigate').at(-1).data;
  assert.equal(navigation.role, 'parent');
  assert.equal(navigation.page, 'overview');
  assert.equal(frame.style.width, '390px');
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
