// Timing only: the schedule owns navigation, DOM updates and drag state.
export function createEdgePager({ onPage, onHint = () => {}, delay = 850, repeatDelay = 1200, setTimer = setTimeout, clearTimer = clearTimeout }) {
  let active = false;
  let direction = 0;
  let timer = null;
  let generation = 0;

  function pause() {
    generation++;
    if (timer !== null) clearTimer(timer);
    timer = null;
    direction = 0;
    onHint(0, 0);
  }

  function arm(duration) {
    const edge = direction;
    const token = ++generation;
    timer = setTimer(() => {
      if (!active || token !== generation || direction !== edge) return;
      timer = null;
      const continuePaging = onPage(edge);
      // Navigation may synchronously stop the drag, leave the edge or switch it.
      if (!active || token !== generation || direction !== edge) return;
      if (continuePaging === false) pause();
      else arm(repeatDelay);
    }, duration);
    onHint(edge, duration);
  }

  return {
    start() {
      pause();
      active = true;
    },
    update(nextDirection) {
      if (!active) return;
      const next = nextDirection === -1 || nextDirection === 1 ? nextDirection : 0;
      if (next === direction) return;
      pause();
      direction = next;
      if (direction) arm(delay);
    },
    pause,
    stop() {
      active = false;
      pause();
    },
    get active() { return active; }
  };
}
