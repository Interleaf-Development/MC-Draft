import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as model from '../dist/model.js';
import { createEdgePager } from '../dist/schedule-drag.js';

const source = await readFile(new URL('../dist/app.js', import.meta.url), 'utf8');
function functionSource(name) {
  const start = source.indexOf('function ' + name + '(');
  assert.notEqual(start, -1, 'Production function exists: ' + name);
  const next = source.slice(start + 1).search(/\n(?:function |const |let |document\.)/);
  return source.slice(start, next === -1 ? undefined : start + 1 + next);
}
const listenerStart = source.indexOf("document.addEventListener('dragstart'");
const listenerEnd = source.indexOf("document.addEventListener('keydown'", listenerStart);
assert.ok(listenerStart !== -1 && listenerEnd > listenerStart, 'Native drag listener block exists');

// Only the timetable tree and operations used by the production drag handlers.
class Element {
  constructor(classes = '', dataset = {}) {
    this.classes = new Set(classes.split(' ').filter(Boolean));
    this.dataset = dataset; this.children = []; this.parent = null; this.attributes = {};
    this.removeCount = 0; this.height = 40;
    this.classList = {
      add: (...names) => names.forEach(name => this.classes.add(name)),
      remove: (...names) => names.forEach(name => this.classes.delete(name)),
      contains: name => this.classes.has(name)
    };
  }
  get isConnected() { return this.root || Boolean(this.parent?.isConnected); }
  append(child) { child.parent = this; this.children.push(child); }
  remove() {
    this.removeCount++;
    if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1);
    this.parent = null;
  }
  contains(node) { return node === this || this.children.some(child => child.contains(node)); }
  setAttribute(name, value) { this.attributes[name] = value; }
  getBoundingClientRect() { return this.rect || { height: this.height }; }
  matches(selector) {
    if (selector === '[data-slot]') return 'slot' in this.dataset;
    if (selector === '.booking-chip[draggable=true]') return this.classes.has('booking-chip') && this.draggable;
    if (selector === '.timetable:not(.drag-source-table)') return this.classes.has('timetable') && !this.classes.has('drag-source-table');
    if (selector === '.timetable:not(.drag-source-table) [data-slot]') return 'slot' in this.dataset && Boolean(this.parent?.closest('.timetable:not(.drag-source-table)'));
    return selector.startsWith('.') && selector.slice(1).split('.').every(name => this.classes.has(name));
  }
  closest(selector) { return this.matches(selector) ? this : this.parent?.closest(selector) || null; }
}
const descendants = root => root.children.flatMap(child => [child, ...descendants(child)]);

function fakeClock() {
  let now = 0, id = 0;
  const timers = new Map();
  return {
    get now() { return now; }, get pending() { return timers.size; },
    setTimer(fn, ms) { timers.set(++id, { fn, at: now + ms }); return id; },
    clearTimer(key) { timers.delete(key); },
    advance(ms) {
      const end = now + ms;
      while (true) {
        const next = [...timers.entries()].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        timers.delete(next[0]); now = next[1].at; next[1].fn();
      }
      now = end;
    }
  };
}

function setup() {
  const state = model.seed();
  state.bookings = [{ id: 'drag-lesson', studentId: 'chloe', tutor: 'chan', date: model.TODAY, start: 960, duration: 60, status: 'scheduled' }];
  const ui = { role: 'admin', page: 'schedule', scheduleView: 'week', scheduleTutor: 'chan', date: model.TODAY, weekOffset: 0 };
  const body = new Element(), scroll = new Element('calendar-scroll'), title = new Element(); body.root = true; body.append(scroll);
  Object.assign(scroll, { clientWidth: 800, clientHeight: 500, scrollTop: 320, scrollLeft: 42, rect: { left: 100, top: 80 } });
  const documentListeners = new Map(), windowListeners = new Map(), clock = fakeClock(), moves = [], hints = [];
  const document = { body, documentElement: body, hidden: false, addEventListener: (type, handler) => documentListeners.set(type, handler) };
  const all = (selector, root = body) => descendants(root).filter(node => node.matches(selector));

  // Parse only the production renderer's row sizes and destination attributes.
  // Browser layout/drag delivery itself is covered by the separate browser QA.
  function gridFromHTML(html) {
    const grid = new Element('timetable'); grid.html = html;
    for (const match of html.matchAll(/class="timetable-time" style="--row-height:(\d+)px" data-hour="(\d+)"/g)) {
      const row = new Element('timetable-time', { hour: match[2] }); row.height = Number(match[1]); grid.append(row);
    }
    for (const match of html.matchAll(/data-slot data-date="([^"]+)" data-start="(\d+)" data-tutor="([^"]+)"/g)) {
      grid.append(new Element('calendar-cell', { slot: '', date: match[1], start: match[2], tutor: match[3] }));
    }
    Object.defineProperty(grid, 'outerHTML', { set(value) {
      const parent = grid.parent, index = parent.children.indexOf(grid), next = gridFromHTML(value);
      grid.remove(); next.parent = parent; parent.children.splice(index, 0, next);
      scroll.scrollTop = 0; scroll.scrollLeft = 0;
    } });
    return grid;
  }
  scroll.insertAdjacentHTML = (position, html) => {
    assert.equal(position, 'beforeend'); scroll.append(gridFromHTML(html));
    scroll.scrollTop = 0; scroll.scrollLeft = 0;
  };
  const context = vm.createContext({
    ...model, state, ui, document, window: { addEventListener: (type, handler) => windowListeners.set(type, handler) },
    innerWidth: 1200, innerHeight: 800, performance: { now: () => clock.now },
    SCHEDULE_HOURS: Array.from({ length: 10 }, (_, i) => 540 + i * 60),
    $: (selector, root) => selector === '#teacher-schedule .calendar-title' ? title : all(selector, root)[0] || null,
    $$: all, esc: value => value, tutorName: () => 'Koko', action: () => '', bookingChip: () => '',
    closeScheduleColourMenu() {}, showScheduleDragHint: (direction, duration) => hints.push({ direction, duration }),
    createEdgePager: options => createEdgePager({ ...options, setTimer: clock.setTimer, clearTimer: clock.clearTimer }),
    moveTo: (id, destination) => moves.push({ id, destination: { ...destination } })
  });
  vm.runInContext('let scheduleDrag=null;\n' + ['shiftedWeek', 'slotBookings', 'calendarCell', 'timetable', 'scheduleDragBounds', 'scheduleDragEdge', 'pageDraggedWeek', 'finishScheduleDrag'].map(functionSource).join('\n') + '\nconst scheduleEdgePager=createEdgePager({onPage:pageDraggedWeek,onHint:showScheduleDragHint});\n' + source.slice(listenerStart, listenerEnd), context);
  const original = gridFromHTML(context.timetable(model.WEEK, 'chan', { 960: 176 })); scroll.append(original);
  const originalSlot = original.children.find(node => node.dataset.date === model.TODAY && node.dataset.start === '960');
  const chip = new Element('booking-chip', { id: 'drag-lesson' }); chip.draggable = true; originalSlot.append(chip);
  const transfer = { setData(type, value) { this[type] = value; } };
  function emit(type, extra = {}) {
    const event = { target: scroll, clientX: 890, clientY: 250, relatedTarget: null, dataTransfer: transfer, prevented: false, preventDefault() { this.prevented = true; }, ...extra };
    assert.ok(documentListeners.has(type), 'Native listener exists: ' + type); documentListeners.get(type)(event); return event;
  }
  function hover(ms) {
    while (ms > 0) { emit('dragover'); const step = Math.min(100, ms); clock.advance(step); ms -= step; }
  }
  return {
    state, ui, context, body, scroll, original, chip, title, clock, moves, hints, document, emit, hover,
    start: () => emit('dragstart', { target: chip }),
    visible: () => all('.timetable:not(.drag-source-table)', scroll)[0],
    rows: grid => Object.fromEntries(all('.timetable-time', grid).map(row => [row.dataset.hour, row.height])),
    drag: () => vm.runInContext('scheduleDrag', context)
  };
}

test('edge paging keeps the original drag source connected, replaces only live grids, and retains row sizes and scroll', () => {
  const app = setup(), before = model.clone(app.state), heights = app.rows(app.original);
  app.start(); app.hover(850);
  assert.equal(app.ui.weekOffset, 1); assert.equal(app.ui.date, '2026-10-07');
  assert.equal(app.original.classList.contains('drag-source-table'), true);
  assert.equal(app.original.attributes['aria-hidden'], 'true');
  assert.equal(app.original.isConnected, true); assert.equal(app.chip.isConnected, true); assert.equal(app.original.removeCount, 0);
  const firstLive = app.visible();
  assert.notEqual(firstLive, app.original); assert.deepEqual(app.rows(firstLive), heights);
  assert.equal(app.title.textContent, model.dateLabel('2026-10-05') + ' – ' + model.dateLabel('2026-10-11', { year: 'numeric' }));
  assert.equal(app.scroll.scrollTop, 320); assert.equal(app.scroll.scrollLeft, 42);
  app.hover(1200);
  assert.equal(app.ui.weekOffset, 2); assert.equal(app.ui.date, '2026-10-14');
  assert.equal(firstLive.isConnected, false); assert.equal(firstLive.removeCount, 1);
  assert.equal(app.chip.isConnected, true); assert.equal(app.original.removeCount, 0);
  assert.equal(app.scroll.children.length, 2); assert.deepEqual(app.rows(app.visible()), heights);
  assert.equal(app.scroll.scrollTop, 320); assert.equal(app.scroll.scrollLeft, 42);
  assert.deepEqual(app.state, before); assert.deepEqual(app.moves, []);
});

test('finishing a paged drag cancels repeat timers, removes the parked grid, and restores ordinary row sizing', () => {
  const app = setup(), before = model.clone(app.state);
  app.start(); app.hover(850); const live = app.visible();
  assert.equal(app.clock.pending, 1);
  app.emit('dragend');
  assert.equal(app.drag(), null); assert.equal(app.clock.pending, 0);
  assert.equal(app.original.isConnected, false); assert.equal(app.original.removeCount, 1);
  assert.equal(live.isConnected, false); assert.equal(app.scroll.children.length, 1);
  assert.equal(app.rows(app.visible())[960], 40);
  assert.equal(app.scroll.classList.contains('lesson-dragging'), false);
  assert.equal(app.scroll.scrollTop, 320); assert.equal(app.scroll.scrollLeft, 42);
  app.clock.advance(5000); assert.equal(app.ui.weekOffset, 1);
  assert.deepEqual(app.hints.at(-1), { direction: 0, duration: 0 }); assert.deepEqual(app.state, before);
});

test('edges are limited to the visible calendar bounds and disabled in day view', () => {
  const app = setup(); app.start();
  assert.deepEqual({ ...app.context.scheduleDragBounds() }, { left: 100, right: 900, top: 80, bottom: 580 });
  assert.equal(app.context.scheduleDragEdge(110, 250), -1); assert.equal(app.context.scheduleDragEdge(890, 250), 1);
  for (const [x, y] of [[99, 250], [901, 250], [890, 79], [890, 581], [500, 250]]) assert.equal(app.context.scheduleDragEdge(x, y), 0);
  app.context.innerWidth = 700; app.context.innerHeight = 400;
  assert.deepEqual({ ...app.context.scheduleDragBounds() }, { left: 100, right: 700, top: 80, bottom: 400 });
  assert.equal(app.context.scheduleDragEdge(690, 250), 1); assert.equal(app.context.scheduleDragEdge(890, 250), 0);
  app.ui.scheduleView = 'day'; assert.equal(app.context.scheduleDragEdge(690, 250), 0);
  app.hover(2000); assert.equal(app.ui.weekOffset, 0);
  app.scroll.remove(); assert.equal(app.context.scheduleDragBounds(), null);
});

test('drop reads the newly visible slot before cleanup and passes that date to the move action only once', () => {
  const app = setup(), before = model.clone(app.state); app.start(); app.hover(850);
  assert.deepEqual(app.moves, []); assert.deepEqual(app.state, before);
  const slot = app.visible().children.find(node => node.dataset.date === '2026-10-07' && node.dataset.start === '1020');
  const inner = new Element(); slot.append(inner);
  const over = app.emit('dragover', { target: inner, clientX: 500 });
  assert.equal(over.prevented, true); assert.equal(slot.classList.contains('drag-over'), true);
  app.emit('drop', { target: inner, clientX: 500 }); app.emit('dragend');
  assert.deepEqual(app.moves, [{ id: 'drag-lesson', destination: { date: '2026-10-07', start: 1020, tutor: 'chan' } }]);
  assert.equal(app.drag(), null); assert.equal(app.original.isConnected, false); assert.equal(app.clock.pending, 0);
  assert.deepEqual(app.state, before, 'The drag handlers delegate mutation to moveTo');
});

test('a nested dragleave outside calendar bounds cancels edge dwell without ending the drag', () => {
  const app = setup(), before = model.clone(app.state); app.start(); app.hover(400);
  assert.equal(app.clock.pending, 1);
  const nested = new Element(); app.chip.append(nested);
  // relatedTarget can still be within the grid during a nested dragleave;
  // pointer coordinates outside the viewport must independently cancel dwell.
  app.emit('dragleave', { target: nested, relatedTarget: app.chip, clientX: 901 });
  assert.equal(app.clock.pending, 0); assert.ok(app.drag());
  app.clock.advance(2000); assert.equal(app.ui.weekOffset, 0);
  app.hover(850); assert.equal(app.ui.weekOffset, 1, 'Re-entering starts a fresh dwell');
  assert.deepEqual(app.state, before); assert.deepEqual(app.moves, []);
});
