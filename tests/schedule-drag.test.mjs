import test from 'node:test';
import assert from 'node:assert/strict';
import { createEdgePager } from '../dist/schedule-drag.js';

function fakeClock() {
  let now = 0, nextId = 0;
  const pending = new Map(), callbacks = new Map();
  return {
    get now() { return now; },
    get pendingIds() { return [...pending.keys()]; },
    setTimer(fn, duration) {
      const id = ++nextId;
      pending.set(id, { fn, at: now + duration }); callbacks.set(id, fn);
      return id;
    },
    clearTimer(id) { pending.delete(id); },
    advance(duration) {
      const end = now + duration;
      while (true) {
        const next = [...pending.entries()].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
        if (!next) break;
        pending.delete(next[0]); now = next[1].at; next[1].fn();
      }
      now = end;
    },
    deliverStale(id) { callbacks.get(id)(); }
  };
}

function setup(onPage) {
  const clock = fakeClock(), pages = [], hints = [];
  const pager = createEdgePager({
    setTimer: clock.setTimer, clearTimer: clock.clearTimer,
    onPage: direction => { pages.push({ direction, at: clock.now }); return onPage?.(direction); },
    onHint: (direction, duration) => hints.push({ direction, duration })
  });
  return { clock, pager, pages, hints };
}

test('edge hover is inactive until a drag starts and leaving early never changes the page', () => {
  const { clock, pager, pages, hints } = setup();
  pager.update(1); clock.advance(2000);
  assert.equal(pager.active, false); assert.deepEqual(pages, []); assert.deepEqual(hints, []);
  pager.start(); pager.update(1); clock.advance(849); pager.update(0); clock.advance(2000);
  assert.deepEqual(pages, []); assert.equal(pager.active, true);
  assert.deepEqual(hints.at(-1), { direction: 0, duration: 0 });
  assert.deepEqual(clock.pendingIds, []);
});

test('frequent same-edge dragover events do not postpone the first page turn', () => {
  const { clock, pager, pages, hints } = setup();
  pager.start(); pager.update(1);
  for (let elapsed = 0; elapsed < 800; elapsed += 50) { clock.advance(50); pager.update(1); }
  clock.advance(49); assert.deepEqual(pages, []);
  clock.advance(1); assert.deepEqual(pages, [{ direction: 1, at: 850 }]);
  assert.deepEqual(hints.filter(hint => hint.direction), [{ direction: 1, duration: 850 }, { direction: 1, duration: 1200 }]);
});

test('switching edges starts a fresh delay and invalidates the old timer callback', () => {
  const { clock, pager, pages } = setup();
  pager.start(); pager.update(1); const oldTimer = clock.pendingIds[0];
  clock.advance(700); pager.update(-1); clock.deliverStale(oldTimer);
  clock.advance(849); assert.deepEqual(pages, []);
  clock.advance(1); assert.deepEqual(pages, [{ direction: -1, at: 1550 }]);
});

test('holding an edge repeats at a safe interval without accelerating on dragover', () => {
  const { clock, pager, pages } = setup();
  pager.start(); pager.update(-1); clock.advance(850);
  for (let i = 0; i < 11; i++) { clock.advance(100); pager.update(-1); }
  assert.equal(pages.length, 1);
  clock.advance(100); clock.advance(1200);
  assert.deepEqual(pages, [{ direction: -1, at: 850 }, { direction: -1, at: 2050 }, { direction: -1, at: 3250 }]);
});

test('pause and stop reject late timer delivery; a later drag starts with the initial delay', () => {
  const { clock, pager, pages } = setup();
  pager.start(); pager.update(1); const pausedTimer = clock.pendingIds[0];
  pager.pause(); assert.equal(pager.active, true); clock.deliverStale(pausedTimer); clock.advance(2000);
  assert.deepEqual(pages, []);
  pager.update(1); clock.advance(850); const stoppedTimer = clock.pendingIds[0];
  pager.stop(); assert.equal(pager.active, false); clock.deliverStale(stoppedTimer); clock.advance(2000);
  assert.equal(pages.length, 1); assert.deepEqual(clock.pendingIds, []);
  pager.start(); pager.update(-1); clock.advance(849); assert.equal(pages.length, 1);
  clock.advance(1); assert.deepEqual(pages.at(-1), { direction: -1, at: 5700 });
});

test('a false page result pauses the edge and clears the hint without ending the drag', () => {
  const { clock, pager, pages, hints } = setup(() => false);
  pager.start(); pager.update(1); clock.advance(10000);
  assert.deepEqual(pages, [{ direction: 1, at: 850 }]);
  assert.equal(pager.active, true); assert.deepEqual(clock.pendingIds, []);
  assert.deepEqual(hints.at(-1), { direction: 0, duration: 0 });
});

test('onPage can stop, pause or change the edge without the old callback scheduling a repeat', () => {
  for (const action of ['stop', 'pause']) {
    let pager;
    const app = setup(() => pager[action]()); pager = app.pager;
    pager.start(); pager.update(1); app.clock.advance(10000);
    assert.equal(app.pages.length, 1); assert.deepEqual(app.clock.pendingIds, []);
    assert.equal(pager.active, action === 'pause');
  }
  let pager;
  const app = setup(direction => { if (direction === 1) pager.update(-1); else pager.stop(); }); pager = app.pager;
  pager.start(); pager.update(1); app.clock.advance(5000);
  assert.deepEqual(app.pages, [{ direction: 1, at: 850 }, { direction: -1, at: 1700 }]);
  assert.deepEqual(app.clock.pendingIds, []);
});
