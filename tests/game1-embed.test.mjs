import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as engine from '../dist/game1/engine.js';

const source = await readFile(new URL('../dist/game1/game.js', import.meta.url), 'utf8');
const origin = 'https://demo.example';

// Run the actual controller against its DOM/audio boundaries. The race engine is
// real; only browser rendering, focus, timers and the audio device are replaced.
function harness() {
  const listeners = new Map(), elements = new Map(), scheduled = [], messages = [], audioDevices = [];
  let now = 0;
  const on = (type, callback) => {
    if (!listeners.has(type)) listeners.set(type, []);
    listeners.get(type).push(callback);
  };
  const emit = (type, event = {}) => {
    for (const callback of listeners.get(type) || []) callback(event);
  };
  class Element {
    constructor(id = '') {
      this.id = id; this.textContent = ''; this.innerHTML = ''; this.className = '';
      this.children = []; this.attributes = new Map(); this.listeners = new Map(); this.style = {};
      this.isConnected = true; this.hidden = false; this.tagName = 'BUTTON';
    }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    setAttribute(key, value) { this.attributes.set(key, String(value)); }
    getAttribute(key) { return this.attributes.get(key); }
    querySelector(selector) { return get(this.id + selector); }
    querySelectorAll() { return this.children; }
    closest() { return null; }
    addEventListener(type, callback) { this.listeners.set(type, callback); }
    focus() { document.activeElement = this; emit('focusin'); }
  }
  const get = id => {
    if (!elements.has(id)) elements.set(id, new Element(id));
    return elements.get(id);
  };
  const lanes = [0, 1, 2].map(id => get('lane-' + id));
  const document = {
    hidden: false, activeElement: null,
    getElementById: get, querySelectorAll: () => lanes,
    createElement: () => new Element(), addEventListener: on
  };
  const parent = { postMessage: (data, targetOrigin) => messages.push({ data, targetOrigin }) };
  const parameter = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {}, setTargetAtTime() {} });
  class AudioContext {
    constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; audioDevices.push(this); }
    createOscillator() { return { frequency: parameter(), connect: target => target, start() {}, stop() {}, disconnect() {} }; }
    createGain() { return { gain: parameter(), connect: target => target, disconnect() {} }; }
    resume() { this.state = 'running'; return Promise.resolve(); }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
  }
  class KartRenderer {
    constructor() { this.lane = 1; }
    draw() {}
    resize() {}
  }
  const scope = vm.createContext({
    ...engine, KartRenderer, document,
    window: { parent, AudioContext, addEventListener: on },
    location: { origin, search: '?proposal=1&proposalPreload=1' }, URLSearchParams,
    performance: { now: () => now },
    requestAnimationFrame: callback => scheduled.push(callback),
    ResizeObserver: class { observe() {} }
  });
  vm.runInContext(source.replace(/^import[^\n]+\n/gm, ''), scope);
  return {
    messages, audioDevices, document, get,
    click(id) { get(id).listeners.get('click')({}); },
    tick(count = 1) { for (let i = 0; i < count; i++) { now += 60; scheduled.shift()(now); } },
    message(type, sender = parent, eventOrigin = origin) { emit('message', { source: sender, origin: eventOrigin, data: { type } }); },
    phase() { return get('game').getAttribute('data-phase'); }
  };
}

test('the preloaded game is quiet, pauses when its proposal becomes inactive and only resumes after a player action', () => {
  const h = harness();
  assert.equal(h.phase(), 'ready');
  assert.equal(h.audioDevices.length, 0);
  assert.equal(h.messages[0].data.type, 'mc-proposal:ready');
  assert.equal(h.messages[0].data.role, 'game');
  assert.equal(h.messages[0].targetOrigin, origin);
  h.tick(5);
  assert.equal(h.phase(), 'ready');
  assert.equal(h.audioDevices.length, 0);

  h.message('mc-proposal:activate');
  h.click('start');
  h.tick(60);
  assert.equal(h.phase(), 'driving');
  assert.equal(h.audioDevices[0].state, 'running');
  h.message('mc-proposal:deactivate');
  assert.equal(h.phase(), 'paused');
  assert.equal(h.audioDevices[0].state, 'suspended');
  const before = h.get('round-label').textContent;
  h.tick(200);
  h.message('mc-proposal:activate');
  h.tick(50);
  assert.equal(h.phase(), 'paused');
  assert.equal(h.get('round-label').textContent, before);
  assert.equal(h.audioDevices[0].state, 'suspended');
  h.click('resume');
  h.tick(1);
  assert.equal(h.phase(), 'driving');
  assert.equal(h.audioDevices[0].state, 'running');
});

test('only the same-origin proposal parent can pause a running embedded race', () => {
  const h = harness();
  h.message('mc-proposal:activate'); h.click('start'); h.tick(60);
  h.message('mc-proposal:deactivate', {});
  h.message('mc-proposal:deactivate', undefined, 'https://untrusted.example');
  assert.equal(h.phase(), 'driving');
  assert.equal(h.audioDevices[0].state, 'running');
  h.message('mc-proposal:deactivate');
  assert.equal(h.phase(), 'paused');
});
