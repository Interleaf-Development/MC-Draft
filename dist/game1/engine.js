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
  feedbackSeconds: Math.max(2.2, 1.2 + 1.6),
  driveDistance: 330
});

const MAX_DELTA = 0.25;
const EPSILON = 1e-9;
const COUNTDOWN_SECONDS = 3;
const RIVAL_CHOOSE_SECONDS = 0.8;
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

function createRival(id, name, color, targetCorrect, distance, lane, random) {
  return {
    id, name, color, targetCorrect,
    answerPlan: shuffle(Array.from({ length: GAME_CONFIG.rounds }, (_, index) => index < targetCorrect), random),
    results: [], correct: 0, distance, lane, chosenLane: null, speed: 0,
    boostRemaining: 0, spinRemaining: 0, recoveryRemaining: 0, lastResult: null
  };
}

function racers(state) { return [state, ...state.rivals]; }

function updateStandings(state) {
  state.standings = [
    { id: 'player', name: '你', color: '#ed7657', correct: state.correct, distance: state.distance },
    ...state.rivals.map(({ id, name, color, correct, distance }) => ({ id, name, color, correct, distance }))
  ].sort((a, b) => {
    if (Math.abs(a.distance - b.distance) > EPSILON) return b.distance - a.distance;
    if (a.id === 'player') return 1;
    if (b.id === 'player') return -1;
    return a.id.localeCompare(b.id);
  }).map((racer, index) => ({ ...racer, position: index + 1 }));
  state.position = state.standings.find(racer => racer.id === 'player').position;
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
    paused: false,
    rivals: [
      createRival('blue', '藍車', '#83bdcf', 7, 45, 2, random),
      createRival('green', '綠車', '#b8ca70', 4, 25, 0, random)
    ],
    position: 3,
    standings: []
  };
  races.set(state, { random, questions: shuffle(questions, random) });
  state.question = nextQuestion(state);
  updateStandings(state);
  return state;
}

function enterPhase(state, phase) {
  state.phase = phase;
  state.phaseTime = 0;
}

function syncSpeed(state) {
  for (const racer of racers(state)) {
    if (state.phase === 'driving' || state.phase === 'answer') racer.speed = GAME_CONFIG.baseSpeed;
    else if (state.phase === 'feedback') {
      racer.speed = racer.boostRemaining > EPSILON ? GAME_CONFIG.boostSpeed
        : racer.spinRemaining > EPSILON ? 0
          : racer.recoveryRemaining > EPSILON ? GAME_CONFIG.slowSpeed : GAME_CONFIG.baseSpeed;
    } else racer.speed = 0;
  }
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

function elapse(state, seconds) {
  state.phaseTime += seconds;
  state.elapsed += seconds;
  for (const racer of racers(state)) racer.distance += seconds * racer.speed;
}

function chooseRivalLanes(state) {
  const random = races.get(state).random;
  for (const rival of state.rivals) {
    if (rival.chosenLane !== null) continue;
    const candidates = state.question.options.map((option, lane) => ({ option, lane }))
      .filter(({ option }) => (option === state.question.answer) === rival.answerPlan[state.questionIndex]);
    rival.chosenLane = candidates[integer(random, candidates.length)].lane;
    rival.lane = rival.chosenLane;
  }
}

function resolveRacer(racer, question, round) {
  const chosen = question.options[racer.lane];
  const correct = chosen === question.answer;
  const result = { correct, chosen, answer: question.answer, round };
  racer.lastResult = result;
  racer.results.push(result);
  racer.boostRemaining = 0;
  racer.spinRemaining = 0;
  racer.recoveryRemaining = 0;
  if (correct) {
    racer.correct++;
    racer.boostRemaining = GAME_CONFIG.boostSeconds;
  } else {
    racer.spinRemaining = GAME_CONFIG.spinSeconds;
    racer.recoveryRemaining = GAME_CONFIG.recoverySeconds;
  }
}

function resolveAnswer(state) {
  chooseRivalLanes(state);
  for (const racer of racers(state)) resolveRacer(racer, state.question, state.questionIndex + 1);
  state.streak = state.lastResult.correct ? state.streak + 1 : 0;
  state.bestStreak = Math.max(state.bestStreak, state.streak);
  state.gateDistance = Infinity;
  enterPhase(state, 'feedback');
}

function finishFeedback(state) {
  for (const racer of racers(state)) {
    racer.boostRemaining = 0;
    racer.spinRemaining = 0;
    racer.recoveryRemaining = 0;
  }
  if (state.questionIndex + 1 === state.total) {
    enterPhase(state, 'finished');
    return;
  }
  state.questionIndex++;
  state.question = nextQuestion(state);
  for (const rival of state.rivals) rival.chosenLane = null;
  state.driveRemaining = GAME_CONFIG.driveDistance;
  enterPhase(state, 'driving');
}

function activeEffect(racer) {
  return ['boostRemaining', 'spinRemaining', 'recoveryRemaining'].find(effect => racer[effect] > EPSILON);
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
      elapse(state, step);
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
      if (state.phaseTime < RIVAL_CHOOSE_SECONDS - EPSILON) {
        step = Math.min(step, RIVAL_CHOOSE_SECONDS - state.phaseTime);
      }
      elapse(state, step);
      state.gateDistance = Math.max(0, state.gateDistance - step * GAME_CONFIG.baseSpeed);
      if (state.phaseTime >= RIVAL_CHOOSE_SECONDS - EPSILON) chooseRivalLanes(state);
      if (state.gateDistance <= EPSILON) resolveAnswer(state);
    } else if (state.phase === 'feedback') {
      // Everyone receives the same response window. A correct racer drives at
      // normal speed after its boost while another racer finishes recovering.
      const current = racers(state);
      step = Math.min(remaining, Math.max(0, GAME_CONFIG.feedbackSeconds - state.phaseTime),
        ...current.map(racer => { const effect = activeEffect(racer); return effect ? racer[effect] : Infinity; }));
      elapse(state, step);
      for (const racer of current) {
        const effect = activeEffect(racer);
        if (effect) racer[effect] = Math.max(0, racer[effect] - step);
      }
      if (state.phaseTime >= GAME_CONFIG.feedbackSeconds - EPSILON) finishFeedback(state);
    } else break;
    remaining -= step;
    syncSpeed(state);
    updateStandings(state);
    if (state.phase === 'finished') break;
  }
  return state;
}
