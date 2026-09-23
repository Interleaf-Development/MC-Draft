export const GAME_CONFIG = Object.freeze({
  rounds: 8,
  thinkSeconds: 3,
  approachDistance: 150,
  baseSpeed: 72,
  boostSpeed: 116,
  slowSpeed: 31,
  boostSeconds: 2.2,
  spinSeconds: 1.2,
  recoverySeconds: 1.6,
  driveDistance: 330
});

const MAX_DELTA = 0.25;
const EPSILON = 1e-9;
const COUNTDOWN_SECONDS = 3;
const races = new WeakMap();

function integer(random, size) {
  const value = Number(random());
  const unit = Number.isFinite(value) ? Math.max(0, Math.min(1 - Number.EPSILON, value)) : 0;
  return Math.floor(unit * size);
}

function shuffle(items, random) {
  for (let index = items.length - 1; index > 0; index--) {
    const other = integer(random, index + 1);
    [items[index], items[other]] = [items[other], items[index]];
  }
  return items;
}

function questionFor(a, b, random) {
  const answer = a + b;
  // Nearby distractors reward doing the addition; zero and eighteen still
  // receive two valid, distinct alternatives.
  const nearby = Array.from({ length: 19 }, (_, number) => number)
    .filter(number => number !== answer && Math.abs(number - answer) <= 4);
  const distractors = shuffle(nearby, random).slice(0, 2);
  return { a, b, answer, options: shuffle([answer, ...distractors], random) };
}

export function createQuestion(random = Math.random) {
  return questionFor(integer(random, 10), integer(random, 10), random);
}

function nextQuestion(state) {
  const race = races.get(state);
  let [a, b] = race.questions.shift();
  if (integer(race.random, 2)) [a, b] = [b, a];
  return questionFor(a, b, race.random);
}

export function createRace(random = Math.random) {
  // Each unordered pair appears once, so 2 + 4 and 4 + 2 cannot both occur.
  const questions = [];
  for (let a = 0; a <= 9; a++) for (let b = a; b <= 9; b++) questions.push([a, b]);
  const state = {
    phase: 'ready',
    phaseTime: 0,
    question: null,
    questionIndex: 0,
    total: GAME_CONFIG.rounds,
    correct: 0,
    streak: 0,
    bestStreak: 0,
    lane: 1,
    distance: 0,
    elapsed: 0,
    speed: 0,
    boostRemaining: 0,
    spinRemaining: 0,
    recoveryRemaining: 0,
    gateDistance: Infinity,
    driveRemaining: GAME_CONFIG.driveDistance,
    lastResult: null,
    results: [],
    paused: false
  };
  races.set(state, { random, questions: shuffle(questions, random) });
  state.question = nextQuestion(state);
  return state;
}

function enterPhase(state, phase) {
  state.phase = phase;
  state.phaseTime = 0;
}

function syncSpeed(state) {
  if (state.phase === 'driving' || state.phase === 'answer') state.speed = GAME_CONFIG.baseSpeed;
  else if (state.phase === 'feedback') {
    state.speed = state.boostRemaining > EPSILON ? GAME_CONFIG.boostSpeed
      : state.spinRemaining > EPSILON ? 0
        : state.recoveryRemaining > EPSILON ? GAME_CONFIG.slowSpeed : GAME_CONFIG.baseSpeed;
  } else state.speed = 0;
}

export function startRace(state) {
  if (state.phase === 'ready') {
    state.paused = false;
    enterPhase(state, 'countdown');
    syncSpeed(state);
  }
  return state;
}

export function setLane(state, lane) {
  if (Number.isInteger(lane) && lane >= 0 && lane <= 2 && !state.paused
    && state.spinRemaining <= EPSILON && ['driving', 'answer', 'feedback'].includes(state.phase)) {
    state.lane = lane;
  }
  return state;
}

export function pauseRace(state) {
  if (state.phase !== 'ready' && state.phase !== 'finished') state.paused = true;
  return state;
}

export function resumeRace(state) {
  state.paused = false;
  return state;
}

function elapse(state, seconds, speed = 0) {
  state.phaseTime += seconds;
  state.elapsed += seconds;
  state.distance += seconds * speed;
}

function resolveAnswer(state) {
  const chosen = state.question.options[state.lane];
  const correct = chosen === state.question.answer;
  const result = { correct, chosen, answer: state.question.answer, round: state.questionIndex + 1 };
  state.lastResult = result;
  state.results.push(result);
  if (correct) {
    state.correct++;
    state.streak++;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    state.boostRemaining = GAME_CONFIG.boostSeconds;
  } else {
    state.streak = 0;
    state.spinRemaining = GAME_CONFIG.spinSeconds;
    state.recoveryRemaining = GAME_CONFIG.recoverySeconds;
  }
  state.gateDistance = Infinity;
  enterPhase(state, 'feedback');
}

function finishFeedback(state) {
  state.boostRemaining = 0;
  state.spinRemaining = 0;
  state.recoveryRemaining = 0;
  if (state.questionIndex + 1 === state.total) {
    enterPhase(state, 'finished');
    return;
  }
  state.questionIndex++;
  state.question = nextQuestion(state);
  state.driveRemaining = GAME_CONFIG.driveDistance;
  enterPhase(state, 'driving');
}

export function updateRace(state, dtSeconds) {
  if (state.paused || state.phase === 'ready' || state.phase === 'finished'
    || !Number.isFinite(dtSeconds) || dtSeconds <= 0) return state;

  // A resumed browser tab must never jump over a question or answer gate.
  let remaining = Math.min(dtSeconds, MAX_DELTA);
  while (remaining > EPSILON) {
    let step;
    if (state.phase === 'countdown') {
      step = Math.min(remaining, Math.max(0, COUNTDOWN_SECONDS - state.phaseTime));
      elapse(state, step);
      if (state.phaseTime >= COUNTDOWN_SECONDS - EPSILON) enterPhase(state, 'driving');
    } else if (state.phase === 'driving') {
      step = Math.min(remaining, state.driveRemaining / GAME_CONFIG.baseSpeed);
      elapse(state, step, GAME_CONFIG.baseSpeed);
      state.driveRemaining = Math.max(0, state.driveRemaining - step * GAME_CONFIG.baseSpeed);
      if (state.driveRemaining <= EPSILON) {
        state.driveRemaining = 0;
        state.gateDistance = GAME_CONFIG.approachDistance;
        enterPhase(state, 'question');
      }
    } else if (state.phase === 'question') {
      step = Math.min(remaining, Math.max(0, GAME_CONFIG.thinkSeconds - state.phaseTime));
      elapse(state, step);
      if (state.phaseTime >= GAME_CONFIG.thinkSeconds - EPSILON) enterPhase(state, 'answer');
    } else if (state.phase === 'answer') {
      step = Math.min(remaining, state.gateDistance / GAME_CONFIG.baseSpeed);
      elapse(state, step, GAME_CONFIG.baseSpeed);
      state.gateDistance = Math.max(0, state.gateDistance - step * GAME_CONFIG.baseSpeed);
      if (state.gateDistance <= EPSILON) resolveAnswer(state);
    } else if (state.phase === 'feedback') {
      const effect = state.boostRemaining > EPSILON ? 'boostRemaining'
        : state.spinRemaining > EPSILON ? 'spinRemaining' : 'recoveryRemaining';
      const speed = effect === 'boostRemaining' ? GAME_CONFIG.boostSpeed
        : effect === 'spinRemaining' ? 0 : GAME_CONFIG.slowSpeed;
      step = Math.min(remaining, state[effect]);
      elapse(state, step, speed);
      state[effect] = Math.max(0, state[effect] - step);
      if (state.boostRemaining <= EPSILON && state.spinRemaining <= EPSILON
        && state.recoveryRemaining <= EPSILON) finishFeedback(state);
    } else break;
    remaining -= step;
    syncSpeed(state);
    if (state.phase === 'finished') break;
  }
  return state;
}
