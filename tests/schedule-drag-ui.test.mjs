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
    if (selector.includes(',')) return selector.split(',').some(part => this.matches(part.trim()));
    if (selector === '[data-slot]') return 'slot' in this.dataset;
    if (selector === '[data-leave-dropzone]') return 'leaveDropzone' in this.dataset;
    if (selector === '.makeup-strip[draggable=true]') return this.classes.has('makeup-strip') && this.draggable;
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

function setup({ role = 'admin', booking = {}, scheduleTutor = 'chan' } = {}) {
  const state = model.seed();
  state.bookings = [{ id: 'drag-lesson', studentId: 'chloe', tutor: 'chan', date: model.TODAY, start: 960, duration: 60, status: 'scheduled', ...booking }];
  const ui = { role, page: 'schedule', scheduleView: 'week', scheduleTutor, date: model.TODAY, weekOffset: 0 };
  const body = new Element(), scroll = new Element('calendar-scroll'), title = new Element(); body.root = true; body.append(scroll);
  const bin = new Element('schedule-leave-dropzone', { leaveDropzone: '' }); body.append(bin);
  Object.assign(scroll, { clientWidth: 800, clientHeight: 500, scrollTop: 320, scrollLeft: 42, rect: { left: 100, top: 80 } });
  const documentListeners = new Map(), windowListeners = new Map(), clock = fakeClock(), moves = [], parked = [], changes = [], hints = [];
  const queue = { query: 'other student', page: 3 }, toasts = [], renders = [];
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
    moveTo: (id, destination) => moves.push({ id, destination: { ...destination } }),
    parkBookingForMakeup: (...args) => { parked.push(args); return { id: 'new-makeup', studentId: 'chloe' }; },
    change: (apply, message, undoable) => { changes.push({ message, undoable }); try { apply(); return true; } catch (error) { toasts.push([error.message]); return false; } },
    identity: () => ({ name: 'Koko Ko' }), collection: name => { assert.equal(name, 'makeups'); return queue; },
    toast: (...args) => toasts.push(args), render: () => renders.push(true)
  });
  vm.runInContext('let scheduleDrag=null;\n' + ['shiftedWeek', 'slotBookings', 'calendarCell', 'timetable', 'scheduleDragBounds', 'scheduleDragEdge', 'pageDraggedWeek', 'finishScheduleDrag', 'canParkScheduleBooking', 'parkScheduleBooking', 'canArrangeScheduleMakeup', 'arrangeMakeupOnCalendar'].map(functionSource).join('\n') + '\nconst scheduleEdgePager=createEdgePager({onPage:pageDraggedWeek,onHint:showScheduleDragHint});\n' + source.slice(listenerStart, listenerEnd), context);
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
    state, ui, context, body, scroll, bin, original, chip, title, clock, moves, parked, changes, queue, toasts, renders, hints, document, emit, hover, windowListeners,
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

test('dropping a paged lesson into the Leave bin pauses edge paging and delegates once without a timetable move', () => {
  const app = setup(), before = model.clone(app.state);
  app.start(); app.hover(850);
  assert.equal(app.ui.weekOffset, 1); assert.equal(app.clock.pending, 1);
  const label = new Element(); app.bin.append(label);
  const over = app.emit('dragover', { target: label, clientX: 1050 });
  assert.equal(over.prevented, true); assert.equal(app.bin.classList.contains('drag-over'), true);
  assert.equal(app.clock.pending, 0, 'Holding over the bin must cancel the next-week dwell');
  app.clock.advance(3000); assert.equal(app.ui.weekOffset, 1);
  app.emit('drop', { target: label, clientX: 1050 }); app.emit('dragend');
  app.emit('drop', { target: label, clientX: 1050 });
  assert.equal(app.parked.length, 1); assert.equal(app.changes.length, 1);
  assert.equal(app.changes[0].undoable, true);
  assert.deepEqual(app.queue, { query: '', page: 1 }); assert.equal(app.renders.length, 1);
  assert.deepEqual(app.moves, []); assert.deepEqual(app.state, before, 'Mutation is delegated to the leave model');
  assert.equal(app.bin.classList.contains('drag-over'), false); assert.equal(app.drag(), null);
  assert.equal(app.original.isConnected, false); assert.equal(app.clock.pending, 0);
});

test('a teacher can park their own unattended lesson, but cannot move it into a timetable slot or page weeks', () => {
  const app = setup({ role: 'teacher', scheduleTutor: 'other-tutor' });
  app.start(); assert.ok(app.drag());
  app.hover(2400);
  assert.equal(app.ui.weekOffset, 0); assert.equal(app.clock.pending, 0);
  const slot = app.visible().children.find(node => node.dataset.start === '1020');
  const over = app.emit('dragover', { target: slot, clientX: 500 });
  assert.equal(over.prevented, false); assert.equal(slot.classList.contains('drag-over'), false);
  app.emit('drop', { target: slot, clientX: 500 }); app.emit('dragend');
  assert.deepEqual(app.moves, []); assert.deepEqual(app.parked, []); assert.equal(app.drag(), null);

  // The first cleanup replaces the grid, so start from the current live DOM.
  const freshChip = new Element('booking-chip', { id: 'drag-lesson' }); freshChip.draggable = true;
  app.visible().children.find(node => node.dataset.start === '960').append(freshChip);
  app.emit('dragstart', { target: freshChip });
  assert.ok(app.drag()); assert.equal(app.drag().tutor, model.centre.managerId);
  app.emit('dragover', { target: app.bin, clientX: 1050 });
  assert.equal(app.bin.classList.contains('drag-over'), true);
  app.emit('drop', { target: app.bin, clientX: 1050 }); app.emit('dragend');
  assert.equal(app.parked.length, 1); assert.equal(app.changes[0].undoable, true);
  assert.deepEqual(app.moves, []); assert.equal(app.bin.classList.contains('drag-over'), false);
});

test('Leave bin rejects external drags, other teachers’ lessons, and lessons that are already attended', () => {
  const external = setup();
  const over = external.emit('dragover', { target: external.bin });
  external.emit('drop', { target: external.bin });
  assert.equal(over.prevented, false); assert.deepEqual(external.parked, []); assert.equal(external.drag(), null);

  for (const booking of [{ tutor: 'lam' }, { attendance: 'present' }, { status: 'absent' }, { status: 'cancelled' }]) {
    const app = setup({ role: 'teacher', booking });
    app.start(); app.emit('dragover', { target: app.bin }); app.emit('drop', { target: app.bin });
    assert.equal(app.drag(), null); assert.deepEqual(app.parked, []); assert.deepEqual(app.moves, []);
    assert.equal(app.bin.classList.contains('drag-over'), false);
  }
  const attended = setup({ booking: { attendance: 'present' } });
  attended.start(); attended.emit('dragover', { target: attended.bin }); attended.emit('drop', { target: attended.bin });
  assert.deepEqual(attended.parked, [], 'Admin must not turn an attended lesson into leave');
});

test('Leave bin rechecks booking state and staff role at drop instead of using stale drag-start eligibility', () => {
  for (const invalidate of [
    app => { app.state.bookings[0].attendance = 'present'; },
    app => { app.state.bookings[0].status = 'absent'; },
    app => { app.state.bookings = []; },
    app => { app.ui.role = 'parent'; },
    app => { app.ui.page = 'classroom'; }
  ]) {
    const app = setup(); app.start(); app.emit('dragover', { target: app.bin });
    assert.equal(app.bin.classList.contains('drag-over'), true);
    invalidate(app);
    app.emit('drop', { target: app.bin });
    assert.deepEqual(app.parked, []); assert.deepEqual(app.moves, []);
    assert.equal(app.drag(), null); assert.equal(app.bin.classList.contains('drag-over'), false);
  }
  const teacher = setup({ role: 'teacher' }); teacher.start(); teacher.state.bookings[0].tutor = 'lam';
  teacher.emit('drop', { target: teacher.bin }); assert.deepEqual(teacher.parked, []);
});

test('leaving the bin and aborting a drag clear its highlight without recording leave', () => {
  for (const abort of [
    app => app.emit('dragend'),
    app => app.windowListeners.get('blur')(),
    app => app.windowListeners.get('pagehide')(),
    app => { app.document.hidden = true; app.emit('visibilitychange'); }
  ]) {
    const app = setup(); app.start(); app.emit('dragover', { target: app.bin });
    assert.equal(app.bin.classList.contains('drag-over'), true);
    const label = new Element(); app.bin.append(label);
    app.emit('dragleave', { target: label, relatedTarget: app.bin, clientX: 1050 });
    assert.equal(app.bin.classList.contains('drag-over'), true, 'Moving between children inside the bin keeps its hint');
    app.emit('dragleave', { target: app.bin, relatedTarget: app.scroll, clientX: 500 });
    assert.equal(app.bin.classList.contains('drag-over'), false);
    app.emit('dragover', { target: app.bin }); abort(app);
    assert.equal(app.bin.classList.contains('drag-over'), false); assert.equal(app.drag(), null);
    assert.equal(app.clock.pending, 0); assert.equal(app.scroll.classList.contains('lesson-dragging'), false);
    assert.deepEqual(app.parked, []); assert.deepEqual(app.moves, []);
  }
});

test('staff leave-bin actions record the acting role and keep the calendar position while revealing the follow-up queue', () => {
  for (const role of ['admin', 'teacher']) {
    const booking = role === 'admin' ? { tutor: 'lam' } : {};
    const app = setup({ role, booking, scheduleTutor: booking.tutor || 'chan' });
    app.ui.moveId = 'another-lesson';
    app.start(); app.emit('drop', { target: app.bin });
    assert.equal(app.parked.length, 1);
    assert.equal(app.parked[0][0], app.state); assert.equal(app.parked[0][1], 'drag-lesson');
    assert.equal(app.parked[0][2].actor, 'Koko Ko · ' + (role === 'admin' ? 'Centre director' : 'Teacher'));
    assert.equal(app.ui.moveId, null); assert.deepEqual(app.queue, { query: '', page: 1 });
    assert.equal(app.scroll.scrollTop, 320); assert.equal(app.scroll.scrollLeft, 42);
  }
});

test('a fast dragenter then drop into the Leave bin works without an intervening dragover after edge paging', () => {
  const app = setup(); app.start(); app.hover(850);
  assert.equal(app.ui.weekOffset, 1); assert.equal(app.clock.pending, 1);
  const label = new Element(); app.bin.append(label);
  // Native browsers can deliver enter followed immediately by drop when the
  // pointer crosses a short distance; do not require a dragover over the bin.
  const entered = app.emit('dragenter', { target: label, clientX: 1050 });
  assert.equal(entered.prevented, true); assert.equal(entered.dataTransfer.dropEffect, 'move');
  assert.equal(app.bin.classList.contains('drag-over'), true); assert.equal(app.clock.pending, 0);
  app.clock.advance(2000); assert.equal(app.ui.weekOffset, 1);
  app.emit('drop', { target: label, clientX: 1050 }); app.emit('dragend');
  assert.equal(app.parked.length, 1); assert.equal(app.changes[0].undoable, true);
  assert.deepEqual(app.moves, []); assert.equal(app.drag(), null);
  assert.equal(app.bin.classList.contains('drag-over'), false);
  assert.equal(app.original.isConnected, false); assert.equal(app.clock.pending, 0);
});

test('dragenter does not accept the Leave bin for external, attended, inactive or unauthorised lessons', () => {
  for (const invalidate of [
    app => { app.state.bookings[0].attendance = 'present'; },
    app => { app.state.bookings[0].status = 'absent'; },
    app => { app.state.bookings = []; },
    app => { app.ui.role = 'parent'; },
    app => { app.ui.role = 'teacher'; app.state.bookings[0].tutor = 'lam'; },
    app => { app.ui.page = 'classroom'; }
  ]) {
    const app = setup(); app.start(); invalidate(app);
    const entered = app.emit('dragenter', { target: app.bin });
    assert.equal(entered.prevented, false); assert.equal(app.bin.classList.contains('drag-over'), false);
    app.emit('drop', { target: app.bin }); app.emit('dragend');
    assert.deepEqual(app.parked, []); assert.deepEqual(app.moves, []); assert.equal(app.drag(), null);
  }
  const external = setup();
  const entered = external.emit('dragenter', { target: external.bin });
  assert.equal(entered.prevented, false); assert.equal(external.bin.classList.contains('drag-over'), false);
  external.emit('drop', { target: external.bin }); assert.deepEqual(external.parked, []);
});

function pendingStrip(app, overrides = {}) {
  const source = app.state.bookings[0]; source.status = 'absent';
  const makeup = { id: 'pending-drag', studentId: source.studentId, sourceId: source.id, minutes: 60, used: 0, expiry: '2026-11-30', ...overrides };
  app.state.makeups = [makeup];
  const strip = new Element('makeup-strip', { id: makeup.id, makeupId: makeup.id }); strip.draggable = true; app.body.append(strip);
  return { makeup, strip };
}

test('admin and teacher can drag a pending make-up onto the calendar, consuming its time once', () => {
  for (const role of ['admin', 'teacher']) {
    const app = setup({ role }), { makeup, strip } = pendingStrip(app);
    const slot = app.visible().children.find(node => node.dataset.date === model.TODAY && node.dataset.start === '1020');
    app.emit('dragstart', { target: strip });
    assert.equal(app.drag().kind, 'makeup');
    assert.equal(app.emit('dragover', { target: slot }).prevented, true);
    app.emit('drop', { target: slot }); app.emit('drop', { target: slot });
    assert.equal(makeup.used, 60);
    assert.equal(app.state.bookings.length, 2);
    assert.equal(app.state.bookings[0].status, 'moved');
    assert.equal(app.state.bookings[1].sourceId, 'drag-lesson');
    assert.equal(app.state.bookings[1].start, 1020);
    assert.equal(app.ui.scheduleBookingId, app.state.bookings[1].id);
    assert.equal(app.drag(), null);
  }
});

test('make-up strip stays connected across week paging and drops into the new week', () => {
  const app = setup({ role: 'teacher' }), { makeup, strip } = pendingStrip(app);
  app.emit('dragstart', { target: strip }); app.hover(850);
  assert.equal(app.ui.weekOffset, 1); assert.equal(strip.isConnected, true);
  const slot = app.visible().children.find(node => node.dataset.date === '2026-10-07' && node.dataset.start === '1020');
  app.emit('drop', { target: slot });
  assert.equal(makeup.used, 60); assert.equal(app.state.bookings[1].date, '2026-10-07');
});

test('expired, conflicting, unavailable and past targets leave make-up unconsumed', () => {
  for (const scenario of ['expiry', 'conflict', 'off', 'past']) {
    const app = setup(), { makeup, strip } = pendingStrip(app, scenario === 'expiry' ? { expiry: '2026-09-29' } : {});
    if (scenario === 'conflict') app.state.bookings.push({ ...app.state.bookings[0], id: 'occupied', status: 'scheduled', start: 1020 });
    const date = scenario === 'past' ? '2026-09-28' : scenario === 'off' ? '2026-09-29' : model.TODAY;
    const slot = app.visible().children.find(node => node.dataset.date === date && node.dataset.start === '1020');
    app.emit('dragstart', { target: strip }); app.emit('drop', { target: slot });
    assert.equal(makeup.used, 0, scenario); assert.equal(app.state.bookings[0].status, 'absent');
    assert.equal(app.toasts.length, 1);
  }
});

test('make-up drag rejects bin drops, spent credits, unrelated teachers and stale permissions', () => {
  const bin = setup(); const pending = pendingStrip(bin); bin.emit('dragstart', { target: pending.strip }); bin.emit('drop', { target: bin.bin });
  assert.equal(pending.makeup.used, 0); assert.equal(bin.parked.length, 0);
  for (const scenario of ['spent', 'teacher', 'revoked']) {
    const app = setup({ role: scenario === 'teacher' ? 'teacher' : 'admin' });
    const { makeup, strip } = pendingStrip(app, scenario === 'spent' ? { used: 60 } : {});
    if (scenario === 'teacher') app.state.bookings[0].tutor = 'lam';
    app.emit('dragstart', { target: strip });
    if (scenario === 'revoked') app.ui.role = 'parent';
    else assert.equal(app.drag(), null);
    const slot = app.visible().children.find(node => node.dataset.date === model.TODAY && node.dataset.start === '1020');
    app.emit('drop', { target: slot });
    assert.equal(makeup.used, scenario === 'spent' ? 60 : 0); assert.equal(app.state.bookings.length, 1);
  }
});
