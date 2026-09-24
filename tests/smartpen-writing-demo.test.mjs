import test from 'node:test';
import assert from 'node:assert/strict';
import { smartpenWritingDemo, initSmartpenWritingDemo } from '../dist/proposal/smartpen-writing-demo.js';

// Exercise the exported initializer against its rendered HTML. The boundary
// supplies events, visibility, SVG geometry and a controllable animation clock;
// playback state and stroke timing belong entirely to the real module.
class Events {
  listeners = new Map();
  addEventListener(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(callback);
  }
  removeEventListener(type, callback) { this.listeners.get(type)?.delete(callback); }
  emit(type, event = {}) { for (const callback of this.listeners.get(type) ?? []) callback(event); }
}

class Element extends Events {
  constructor(tagName, attributes = {}) {
    super();
    this.tagName = tagName;
    this.attributes = attributes;
    this.children = [];
    this.parentElement = null;
    this.style = {};
    this.textContent = '';
    this.classList = {
      toggle: (name, force) => {
        const classes = new Set((this.attributes.class ?? '').split(/\s+/).filter(Boolean));
        const enabled = force ?? !classes.has(name);
        if (enabled) classes.add(name); else classes.delete(name);
        this.attributes.class = [...classes].join(' ');
        return enabled;
      }
    };
  }
  get ownerDocument() { return this.document ?? this.parentElement?.ownerDocument; }
  get hidden() { return Object.hasOwn(this.attributes, 'hidden'); }
  set hidden(value) { if (value) this.attributes.hidden = ''; else delete this.attributes.hidden; }
  get dataset() {
    return Object.fromEntries(Object.entries(this.attributes)
      .filter(([name]) => name.startsWith('data-'))
      .map(([name, value]) => [name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()), value]));
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  append(child) { child.parentElement = this; this.children.push(child); }
  matches(selector) {
    if (selector.startsWith('.')) return (this.attributes.class ?? '').split(/\s+/).includes(selector.slice(1));
    const attribute = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
    return attribute ? attribute[2] === undefined
      ? Object.hasOwn(this.attributes, attribute[1])
      : this.attributes[attribute[1]] === attribute[2]
      : this.tagName === selector;
  }
  closest(selector) {
    for (let node = this; node; node = node.parentElement) if (node.matches(selector)) return node;
    return null;
  }
  querySelectorAll(selector) {
    return this.children.flatMap(child => [
      ...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)
    ]);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  getClientRects() { return this.closest('[hidden]') ? [] : [{}]; }
  getTotalLength() { return 100; }
  getPointAtLength(length) { return { x: length, y: 100 }; }
}

function parseHTML(html) {
  const container = new Element('section');
  const stack = [container];
  for (const token of html.matchAll(/<\/?[a-z][^>]*>|[^<]+/gi)) {
    const text = token[0];
    if (text.startsWith('</')) { stack.pop(); continue; }
    if (!text.startsWith('<')) { stack.at(-1).textContent += text; continue; }
    const tag = text.match(/^<([a-z][a-z0-9-]*)(.*?)(\/?)>$/i);
    const attributes = Object.fromEntries([...tag[2].matchAll(/([a-z][a-z0-9-]*)(?:="([^"]*)")?/gi)]
      .map(attribute => [attribute[1], attribute[2] ?? '']));
    const node = new Element(tag[1], attributes);
    stack.at(-1).append(node);
    if (!tag[3]) stack.push(node);
  }
  return container;
}

function setup(t, { reducedMotion = false, language = 'zh-HK' } = {}) {
  const container = parseHTML(smartpenWritingDemo(language));
  const doc = new Events();
  const view = new Events();
  const media = Object.assign(new Events(), { matches: reducedMotion });
  const frames = new Map();
  const mutations = new Set();
  const intersections = new Set();
  let now = 0;
  let nextFrame = 0;
  doc.hidden = false;
  doc.defaultView = view;
  container.document = doc;
  Object.assign(view, {
    performance: { now: () => now },
    requestAnimationFrame(callback) { const id = ++nextFrame; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    matchMedia: () => media,
    MutationObserver: class {
      constructor(callback) { this.callback = callback; }
      observe() { mutations.add(this.callback); }
      disconnect() { mutations.delete(this.callback); }
    },
    IntersectionObserver: class {
      constructor(callback) { this.callback = callback; }
      observe() { intersections.add(this.callback); }
      disconnect() { intersections.delete(this.callback); }
    }
  });
  const cleanup = initSmartpenWritingDemo(container);
  t.after(cleanup);
  const find = selector => container.querySelector(selector);
  const paths = () => container.querySelectorAll('[data-writing-stroke]');
  const snapshot = () => paths().map(path => ({ ...path.style }));
  return {
    container, cleanup, find, paths, snapshot, doc, view, frames,
    toggle: () => find('[data-writing-action="toggle"]').emit('click'),
    replay: () => find('[data-writing-action="replay"]').emit('click'),
    time: () => find('[data-writing-time]').textContent,
    status: () => find('[data-writing-status]').textContent,
    advance(milliseconds) {
      now += milliseconds;
      const pending = [...frames];
      frames.clear();
      for (const [, callback] of pending) callback(now);
    },
    hide() { container.hidden = true; for (const callback of mutations) callback([]); },
    show() { container.hidden = false; for (const callback of mutations) callback([]); },
    intersect(isIntersecting) { for (const callback of intersections) callback([{ isIntersecting }]); },
    reduce(value) { media.matches = value; media.emit('change'); }
  };
}

test('writing starts static and mirrors every animated stroke in the two views', t => {
  const h = setup(t);
  assert.equal(h.frames.size, 0, 'there is no autoplay');
  assert.equal(h.find('[data-writing-action="replay"]').hidden, true);
  h.toggle();
  h.advance(750);
  assert.equal(h.time(), '0.8 s');
  const visible = h.snapshot();
  assert.deepEqual(visible.slice(0, 3), visible.slice(3), 'paper and digital ink render together');
  assert.equal(visible[0].visibility, 'visible');
  assert.ok(Number(visible[0].strokeDashoffset) > 0, 'stroke is partially written');
  assert.equal(h.find('.smartpen-writing-pen').getAttribute('visibility'), 'visible');
});

test('pause freezes writing and resume continues from the retained elapsed time', t => {
  const h = setup(t);
  h.toggle();
  h.advance(800);
  h.toggle();
  const frozen = h.snapshot();
  assert.equal(h.frames.size, 0);
  assert.equal(h.find('[data-writing-action="toggle"]').textContent, '繼續播放');
  h.advance(10_000);
  assert.equal(h.time(), '0.8 s');
  assert.deepEqual(h.snapshot(), frozen);
  h.toggle();
  h.advance(300);
  assert.equal(h.time(), '1.1 s', 'time away does not jump the animation forward');
  assert.notDeepEqual(h.snapshot(), frozen);
});

test('switching away from the panel pauses playback without losing progress', t => {
  const h = setup(t);
  h.toggle();
  h.advance(600);
  h.hide();
  const frozen = h.snapshot();
  assert.equal(h.frames.size, 0);
  assert.match(h.status(), /已暫停/);
  h.advance(9000);
  h.show();
  assert.equal(h.frames.size, 0, 'showing the panel does not autoplay');
  assert.deepEqual(h.snapshot(), frozen);
  h.toggle();
  h.advance(100);
  assert.equal(h.time(), '0.7 s');
});

test('replay resets both visible ink and the elapsed clock', t => {
  const h = setup(t);
  h.toggle();
  h.advance(2000);
  assert.ok(h.snapshot().some(path => path.visibility === 'visible'));
  assert.match(h.status(), /停筆 3 秒/);
  h.replay();
  assert.equal(h.time(), '0.0 s');
  assert.ok(h.snapshot().every(path => path.visibility === 'hidden'));
  assert.equal(h.frames.size, 1, 'replay replaces the old frame loop');
  h.advance(20_000);
  assert.equal(h.frames.size, 0);
  assert.ok(h.snapshot().every(path => path.visibility === 'visible' && Number(path.strokeDashoffset) === 0));
  assert.match(h.status(), /示意完成/);
});

test('reduced-motion preference shows a complete static sequence', t => {
  const h = setup(t, { reducedMotion: true, language: 'eng' });
  assert.equal(h.frames.size, 0);
  assert.equal(h.find('[data-writing-action="toggle"]').hidden, true);
  assert.equal(h.find('.smartpen-writing-pen').getAttribute('visibility'), 'hidden');
  assert.ok(h.snapshot().every(path => Number(path.strokeDashoffset) === 0));
  assert.match(h.status(), /reduced motion/);
  h.reduce(false);
  assert.equal(h.find('[data-writing-action="toggle"]').hidden, false);
  h.toggle();
  h.advance(800);
  assert.equal(h.frames.size, 1);
  h.reduce(true);
  assert.equal(h.frames.size, 0, 'changing the preference stops an active animation');
  assert.ok(h.snapshot().every(path => Number(path.strokeDashoffset) === 0));
});

test('offscreen and page lifecycle events stop playback, and cleanup removes listeners', t => {
  const h = setup(t);
  h.toggle();
  h.advance(500);
  h.intersect(false);
  assert.equal(h.frames.size, 0);
  h.toggle();
  h.view.emit('pagehide');
  assert.equal(h.frames.size, 0);
  h.toggle();
  h.cleanup();
  const frozen = h.snapshot();
  h.advance(1000);
  h.toggle();
  assert.equal(h.frames.size, 0);
  assert.deepEqual(h.snapshot(), frozen);
});
