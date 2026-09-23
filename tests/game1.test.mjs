import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GAME_CONFIG, createQuestion, createRace, startRace, setLane,
  updateRace, pauseRace, resumeRace
} from '../dist/game1/engine.js';

function randomSeed(seed = 12345) {
  return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
}

function advance(state, seconds, step = 0.1) {
  let remaining = seconds;
  while (remaining > 1e-9) {
    const delta = Math.min(step, remaining);
    updateRace(state, delta);
    remaining -= delta;
  }
  return state;
}

function atQuestion(state = createRace(randomSeed())) {
  if (state.phase === 'ready') { startRace(state); advance(state, 3); }
  advance(state, GAME_CONFIG.driveDistance / GAME_CONFIG.baseSpeed);
  assert.equal(state.phase, 'question');
  return state;
}

function answer(state, correct = true) {
  advance(state, GAME_CONFIG.thinkSeconds);
  const lane = state.question.options.findIndex(option => (option === state.question.answer) === correct);
  setLane(state, lane);
  advance(state, GAME_CONFIG.approachDistance / GAME_CONFIG.baseSpeed);
  assert.equal(state.phase, 'feedback');
  return state;
}

const closeTo = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} ≈ ${expected}`);

test('single-digit addition always has three distinct valid choices including the correct answer once', () => {
  for (const random of [randomSeed(), () => 0, () => 0.5, () => 1]) {
    for (let index = 0; index < 100; index++) {
      const question = createQuestion(random);
      assert.ok(Number.isInteger(question.a) && question.a >= 0 && question.a <= 9);
      assert.ok(Number.isInteger(question.b) && question.b >= 0 && question.b <= 9);
      assert.equal(question.answer, question.a + question.b);
      assert.equal(question.options.length, 3);
      assert.equal(new Set(question.options).size, 3);
      assert.equal(question.options.filter(option => option === question.answer).length, 1);
      assert.ok(question.options.every(option => Number.isInteger(option) && option >= 0 && option <= 18));
    }
  }
});

test('the car stops for exactly three seconds before the answer approach, without changing its question', () => {
  const state = createRace(randomSeed());
  const question = state.question;
  assert.equal(state.phase, 'ready');
  updateRace(state, 0.1);
  assert.equal(state.elapsed, 0);
  startRace(state);
  advance(state, 2.9);
  assert.equal(state.phase, 'countdown');
  assert.equal(state.distance, 0);
  advance(state, 0.1);
  assert.equal(state.phase, 'driving');
  advance(state, GAME_CONFIG.driveDistance / GAME_CONFIG.baseSpeed);
  assert.equal(state.phase, 'question');
  const stoppedAt = state.distance;
  closeTo(stoppedAt, GAME_CONFIG.driveDistance);
  const lane = state.lane;
  setLane(state, lane === 0 ? 2 : 0);
  assert.equal(state.lane, lane, 'Steering waits until the answer approach');
  advance(state, 2.99);
  assert.equal(state.phase, 'question');
  assert.equal(state.speed, 0);
  assert.equal(state.distance, stoppedAt);
  assert.equal(state.gateDistance, GAME_CONFIG.approachDistance);
  advance(state, 0.01);
  assert.equal(state.phase, 'answer');
  assert.equal(state.distance, stoppedAt);
  assert.equal(state.question, question);
  assert.equal(state.speed, GAME_CONFIG.baseSpeed);
  updateRace(state, 0.1);
  closeTo(state.gateDistance, GAME_CONFIG.approachDistance - GAME_CONFIG.baseSpeed * 0.1);
});

test('a correct crossing records one answer and gives a timed boost before the next round', () => {
  const state = answer(atQuestion());
  const question = state.question;
  assert.equal(state.correct, 1);
  assert.equal(state.streak, 1);
  assert.equal(state.bestStreak, 1);
  assert.deepEqual(state.lastResult, { correct: true, chosen: question.answer, answer: question.answer, round: 1 });
  assert.equal(state.results.length, 1);
  assert.equal(state.gateDistance, Infinity);
  assert.equal(state.speed, GAME_CONFIG.boostSpeed);
  const before = state.distance;
  advance(state, GAME_CONFIG.boostSeconds - 0.01);
  assert.equal(state.phase, 'feedback');
  assert.equal(state.results.length, 1);
  closeTo(state.distance - before, (GAME_CONFIG.boostSeconds - 0.01) * GAME_CONFIG.boostSpeed);
  advance(state, 0.01);
  assert.equal(state.phase, 'feedback');
  assert.equal(state.questionIndex, 0);
  assert.equal(state.speed, GAME_CONFIG.baseSpeed);
  closeTo(state.boostRemaining, 0);
  advance(state, GAME_CONFIG.feedbackSeconds - GAME_CONFIG.boostSeconds);
  assert.equal(state.phase, 'driving');
  assert.equal(state.questionIndex, 1);
  assert.notEqual(state.question, question);
  assert.equal(state.results.length, 1);
});

test('a wrong crossing spins without movement or steering, then recovers slowly and resets the streak', () => {
  const state = answer(atQuestion());
  advance(state, GAME_CONFIG.feedbackSeconds);
  atQuestion(state);
  answer(state, false);
  assert.equal(state.correct, 1);
  assert.equal(state.streak, 0);
  assert.equal(state.bestStreak, 1);
  assert.equal(state.lastResult.correct, false);
  assert.notEqual(state.lastResult.chosen, state.lastResult.answer);
  assert.equal(state.lastResult.round, 2);
  const position = state.distance;
  const lane = state.lane;
  setLane(state, (lane + 1) % 3);
  assert.equal(state.lane, lane);
  assert.equal(state.speed, 0);
  advance(state, GAME_CONFIG.spinSeconds);
  assert.equal(state.distance, position);
  assert.equal(state.phase, 'feedback');
  assert.equal(state.speed, GAME_CONFIG.slowSpeed);
  setLane(state, (lane + 1) % 3);
  assert.equal(state.lane, (lane + 1) % 3, 'Steering returns during slow recovery');
  advance(state, GAME_CONFIG.recoverySeconds);
  closeTo(state.distance - position, GAME_CONFIG.slowSpeed * GAME_CONFIG.recoverySeconds);
  assert.equal(state.phase, 'driving');
  assert.equal(state.results.length, 2);
  assert.equal(state.questionIndex, 2);
});

test('pausing freezes the question timer, driving and answer effects until resumed', () => {
  const states = [atQuestion(), answer(atQuestion()), answer(atQuestion(), false)];
  const driving = createRace(randomSeed()); startRace(driving); advance(driving, 3); states.push(driving);
  for (const state of states) {
    pauseRace(state);
    const snapshot = structuredClone(state);
    advance(state, 10);
    setLane(state, (state.lane + 1) % 3);
    assert.deepEqual(state, snapshot);
    resumeRace(state);
    assert.equal(state.paused, false);
    updateRace(state, 0.1);
    assert.ok(state.elapsed > snapshot.elapsed);
  }
});

test('a race finishes eight unique questions once, even with a constant random source; restarting is independent', () => {
  const state = createRace(() => 0);
  const seen = new Set();
  for (let round = 0; round < GAME_CONFIG.rounds; round++) {
    atQuestion(state);
    const key = [state.question.a, state.question.b].sort((a, b) => a - b).join('+');
    assert.equal(seen.has(key), false, 'Commutative duplicates must not appear in one race');
    seen.add(key);
    answer(state);
    assert.equal(state.questionIndex, round);
    advance(state, GAME_CONFIG.feedbackSeconds);
  }
  assert.equal(state.phase, 'finished');
  assert.equal(state.speed, 0);
  assert.equal(state.correct, 8);
  assert.equal(state.bestStreak, 8);
  assert.equal(state.results.length, 8);
  assert.deepEqual(state.results.map(result => result.round), [1, 2, 3, 4, 5, 6, 7, 8]);
  const final = structuredClone(state);
  updateRace(state, 0.25); setLane(state, 0); startRace(state);
  assert.deepEqual(state, final);
  const restarted = createRace(() => 0);
  startRace(restarted);
  assert.equal(restarted.phase, 'countdown');
  assert.equal(restarted.correct, 0);
  assert.equal(restarted.distance, 0);
  assert.equal(restarted.elapsed, 0);
  assert.equal(restarted.lastResult, null);
  assert.deepEqual(restarted.results, []);
  assert.equal(state.results.length, 8);
});

test('updates ignore invalid input, cap tab-resume jumps and give the same outcome at different frame rates', () => {
  const state = createRace(randomSeed()); startRace(state);
  const initial = structuredClone(state);
  for (const delta of [NaN, Infinity, -1, 0, '1']) updateRace(state, delta);
  assert.deepEqual(state, initial);
  updateRace(state, 10000);
  assert.equal(state.phase, 'countdown');
  closeTo(state.elapsed, 0.25);
  for (const lane of [-1, 3, NaN, 0.5, '2']) setLane(state, lane);
  assert.equal(state.lane, 1);
  const fast = createRace(randomSeed()), slow = createRace(randomSeed());
  startRace(fast); startRace(slow);
  advance(fast, 15, 1 / 120);
  advance(slow, 15, 0.2);
  assert.equal(fast.phase, slow.phase);
  assert.equal(fast.questionIndex, slow.questionIndex);
  assert.deepEqual(fast.results, slow.results);
  closeTo(fast.distance, slow.distance);
  closeTo(fast.phaseTime, slow.phaseTime);
  closeTo(fast.elapsed, slow.elapsed);
  for (let index = 0; index < fast.rivals.length; index++) {
    assert.deepEqual(fast.rivals[index].results, slow.rivals[index].results);
    assert.equal(fast.rivals[index].lane, slow.rivals[index].lane);
    closeTo(fast.rivals[index].distance, slow.rivals[index].distance);
    closeTo(fast.rivals[index].boostRemaining, slow.rivals[index].boostRemaining);
    closeTo(fast.rivals[index].spinRemaining, slow.rivals[index].spinRemaining);
    closeTo(fast.rivals[index].recoveryRemaining, slow.rivals[index].recoveryRemaining);
  }
  assert.equal(fast.position, slow.position);
});

test('opponent plans have exact seven/four quotas, vary between races and remain unchanged while driving', () => {
  const random = randomSeed(7);
  const bluePlans = new Set(), greenPlans = new Set();
  for (let race = 0; race < 20; race++) {
    const state = createRace(random);
    for (const [index, target] of [7, 4].entries()) {
      const rival = state.rivals[index];
      assert.equal(rival.targetCorrect, target);
      assert.equal(rival.answerPlan.length, 8);
      assert.equal(rival.answerPlan.filter(Boolean).length, target);
      assert.ok(rival.answerPlan.every(answer => typeof answer === 'boolean'));
      const original = [...rival.answerPlan];
      if (index === 0) bluePlans.add(original.join(',')); else greenPlans.add(original.join(','));
      if (state.phase === 'ready') startRace(state);
      advance(state, 1);
      assert.deepEqual(rival.answerPlan, original);
      assert.equal(rival.chosenLane, null);
      assert.equal(rival.correct, 0);
      assert.deepEqual(rival.results, []);
    }
  }
  assert.ok(bluePlans.size > 1, 'Restarting shuffles where the blue opponent makes its one mistake');
  assert.ok(greenPlans.size > 1, 'Restarting shuffles the green opponent’s four mistakes');
});

test('opponents stop for the question, choose actual answer lanes after the pause, and resolve the same questions', () => {
  const state = createRace(randomSeed());
  const plans = state.rivals.map(rival => [...rival.answerPlan]);
  for (let round = 0; round < GAME_CONFIG.rounds; round++) {
    atQuestion(state);
    const frozen = structuredClone(state.rivals);
    assert.ok(state.rivals.every(rival => rival.chosenLane === null && rival.speed === 0));
    advance(state, GAME_CONFIG.thinkSeconds - 0.01);
    assert.deepEqual(state.rivals, frozen, 'No opponent moves or reveals its answer while the question is stopped');
    advance(state, 0.01);
    assert.equal(state.phase, 'answer');
    assert.ok(state.rivals.every(rival => rival.chosenLane === null));
    advance(state, 0.79);
    assert.ok(state.rivals.every(rival => rival.chosenLane === null));
    advance(state, 0.01);
    const selected = state.rivals.map((rival, index) => {
      assert.ok(Number.isInteger(rival.chosenLane) && rival.chosenLane >= 0 && rival.chosenLane <= 2);
      assert.equal(rival.lane, rival.chosenLane);
      const value = state.question.options[rival.chosenLane];
      assert.equal(value === state.question.answer, plans[index][round]);
      return value;
    });
    advance(state, GAME_CONFIG.approachDistance / GAME_CONFIG.baseSpeed - 0.8);
    assert.equal(state.phase, 'feedback');
    state.rivals.forEach((rival, index) => {
      assert.deepEqual(rival.lastResult, {
        correct: plans[index][round], chosen: selected[index], answer: state.question.answer, round: round + 1
      });
      assert.equal(rival.results.length, round + 1);
      assert.deepEqual(rival.answerPlan, plans[index]);
    });
    advance(state, GAME_CONFIG.feedbackSeconds);
  }
  assert.equal(state.rivals[0].correct, 7);
  assert.equal(state.rivals[1].correct, 4);
  assert.ok(state.rivals.every(rival => rival.results.length === 8));
});

test('every racer gets the full fixed response window with independent boosts, spins and recovery', () => {
  const state = createRace(randomSeed(2));
  // A quota of four errors guarantees a wrong opponent within the race.
  for (let round = 0; round < 8; round++) {
    answer(atQuestion(state));
    if (state.rivals.some(rival => !rival.lastResult.correct)) break;
    advance(state, GAME_CONFIG.feedbackSeconds);
  }
  const wrong = state.rivals.find(rival => !rival.lastResult.correct);
  assert.ok(wrong);
  const start = [state, ...state.rivals].map(racer => racer.distance);
  pauseRace(state);
  const paused = structuredClone(state);
  advance(state, 5);
  assert.deepEqual(state, paused, 'Pausing preserves every opponent’s effect timers and positions');
  resumeRace(state);
  advance(state, GAME_CONFIG.spinSeconds);
  assert.equal(wrong.speed, GAME_CONFIG.slowSpeed);
  closeTo(wrong.distance, start[state.rivals.indexOf(wrong) + 1]);
  assert.equal(state.speed, GAME_CONFIG.boostSpeed);
  advance(state, GAME_CONFIG.boostSeconds - GAME_CONFIG.spinSeconds);
  assert.equal(state.phase, 'feedback');
  assert.equal(state.speed, GAME_CONFIG.baseSpeed);
  assert.equal(wrong.speed, GAME_CONFIG.slowSpeed);
  advance(state, GAME_CONFIG.feedbackSeconds - GAME_CONFIG.boostSeconds);
  [state, ...state.rivals].forEach((racer, index) => {
    const travelled = racer.distance - start[index];
    const expected = racer.lastResult.correct
      ? GAME_CONFIG.boostSpeed * GAME_CONFIG.boostSeconds
        + GAME_CONFIG.baseSpeed * (GAME_CONFIG.feedbackSeconds - GAME_CONFIG.boostSeconds)
      : GAME_CONFIG.slowSpeed * GAME_CONFIG.recoverySeconds;
    closeTo(travelled, expected);
    assert.equal(racer.boostRemaining, 0);
    assert.equal(racer.spinRemaining, 0);
    assert.equal(racer.recoveryRemaining, 0);
  });
  assert.equal(state.phase, 'driving');
});

test('all 256 player answer orders finish in the required rank using actual travelled distances', () => {
  for (let mask = 0; mask < 256; mask++) {
    const state = createRace(randomSeed(1234 + mask));
    let correct = 0;
    for (let round = 0; round < GAME_CONFIG.rounds; round++) {
      const right = Boolean(mask & (1 << round));
      if (right) correct++;
      answer(atQuestion(state), right);
      advance(state, GAME_CONFIG.feedbackSeconds);
    }
    const expectedPosition = correct === 8 ? 1 : correct >= 5 ? 2 : 3;
    assert.equal(state.phase, 'finished');
    assert.equal(state.correct, correct);
    assert.equal(state.position, expectedPosition, `Answer pattern ${mask} gets ${correct}/8`);
    assert.equal(state.rivals[0].correct, 7);
    assert.equal(state.rivals[1].correct, 4);
    const expectedDistance = right => GAME_CONFIG.rounds * (GAME_CONFIG.driveDistance + GAME_CONFIG.approachDistance)
      + right * (GAME_CONFIG.boostSpeed * GAME_CONFIG.boostSeconds
        + GAME_CONFIG.baseSpeed * (GAME_CONFIG.feedbackSeconds - GAME_CONFIG.boostSeconds))
      + (GAME_CONFIG.rounds - right) * GAME_CONFIG.slowSpeed * GAME_CONFIG.recoverySeconds;
    closeTo(state.distance, expectedDistance(correct));
    closeTo(state.rivals[0].distance, 45 + expectedDistance(7));
    closeTo(state.rivals[1].distance, 25 + expectedDistance(4));
    for (let index = 0; index < state.standings.length; index++) {
      assert.equal(state.standings[index].position, index + 1);
      if (index) assert.ok(state.standings[index - 1].distance > state.standings[index].distance);
    }
    assert.equal(state.standings[expectedPosition - 1].id, 'player');
    assert.ok([state, ...state.rivals].every(racer => racer.speed === 0));
  }
});

test('an all-correct player really passes both opponents and equal positions favour an opponent', () => {
  const state = createRace(randomSeed(40));
  assert.equal(state.position, 3);
  assert.ok(state.rivals.every(rival => rival.distance > state.distance));
  const seenPositions = new Set([state.position]);
  for (let round = 0; round < 8; round++) {
    answer(atQuestion(state));
    for (let step = 0; step < 28; step++) {
      updateRace(state, 0.1);
      seenPositions.add(state.position);
      for (const rival of state.rivals) {
        const rank = state.standings.find(entry => entry.id === rival.id).position;
        assert.equal(state.position < rank, state.distance > rival.distance);
      }
    }
  }
  assert.ok(seenPositions.has(1));
  assert.ok(state.rivals.every(rival => state.distance > rival.distance), 'Opponent coordinates remain behind after being passed');
  const tie = createRace(randomSeed()); startRace(tie); advance(tie, 3);
  tie.distance = tie.rivals[0].distance;
  updateRace(tie, 0.1);
  closeTo(tie.distance, tie.rivals[0].distance);
  assert.equal(tie.standings[0].id, 'blue');
  assert.equal(tie.position, 2);
});
