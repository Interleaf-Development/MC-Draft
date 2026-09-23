import { GAME_CONFIG, createRace, startRace, setLane, updateRace, pauseRace, resumeRace } from './engine.js';
import { KartRenderer } from './renderer.js';

const $ = id => document.getElementById(id);
const ui = Object.fromEntries(['game', 'track', 'welcome', 'paused', 'finished', 'pause', 'sound', 'start', 'resume', 'restart', 'play-again', 'race-hud', 'round-label', 'progress-dots', 'question-card', 'question-prompt', 'equation', 'thinking-clock', 'clock-ring', 'think-count', 'start-countdown', 'feedback', 'feedback-icon', 'feedback-title', 'feedback-detail', 'driving-ui', 'speed', 'speed-effect', 'steering-prompt', 'score', 'streak', 'announcement', 'finish-score', 'finish-time', 'finish-streak', 'finish-message', 'finish-stars', 'review', 'review-answers'].map(id => [id, $(id)]));
const laneButtons = [...document.querySelectorAll('[data-lane]')];
const laneNames = ['左線', '中線', '右線'];
const symbols = ['←', '↑', '→'];
const renderer = new KartRenderer(ui.track);
let race = createRace();
let lastPhase = 'ready';
let lastTick = '';
let lastFrame = 0;
let questionHistory = [];
let returnFocus = null;
let pointer = null;
let soundEnabled = true;

// Quiet synthesised arcade sounds, created only after a player gesture.
class GameAudio {
  constructor() { this.ctx = null; this.motor = null; this.motorGain = null; }
  async unlock() {
    if (!soundEnabled) return;
    try {
      if (!this.ctx) {
        const Context = window.AudioContext || window.webkitAudioContext;
        if (!Context) return;
        this.ctx = new Context();
        this.motor = this.ctx.createOscillator();
        this.motor.type = 'triangle';
        this.motorGain = this.ctx.createGain();
        this.motorGain.gain.value = 0;
        this.motor.connect(this.motorGain).connect(this.ctx.destination);
        this.motor.start();
      }
      if (this.ctx.state === 'suspended') await this.ctx.resume();
    } catch { /* Play remains available if this browser blocks audio. */ }
  }
  note(frequency, duration = .12, delay = 0, type = 'sine', gain = .065, endFrequency = frequency) {
    if (!soundEnabled || !this.ctx || this.ctx.state !== 'running') return;
    const ctx = this.ctx, start = ctx.currentTime + delay;
    const oscillator = ctx.createOscillator(), envelope = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(gain, start + .012);
    envelope.gain.exponentialRampToValueAtTime(.001, start + duration);
    oscillator.connect(envelope).connect(ctx.destination);
    oscillator.start(start); oscillator.stop(start + duration + .025);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
  }
  correct() { [523, 659, 784, 1047].forEach((note, i) => this.note(note, .17, i * .085)); }
  wrong() { this.note(220, .43, 0, 'triangle', .08, 65); this.note(145, .16, .08, 'square', .015, 70); }
  win() { [523, 659, 784, 1047, 784, 1047].forEach((note, i) => this.note(note, .22, i * .12)); }
  drive(state) {
    if (!this.ctx || !this.motorGain) return;
    const active = soundEnabled && !state.paused && state.speed > 0;
    this.motorGain.gain.setTargetAtTime(active ? .013 : 0, this.ctx.currentTime, .07);
    this.motor.frequency.setTargetAtTime(36 + state.speed * .58, this.ctx.currentTime, .1);
  }
}
const audio = new GameAudio();

function put(element, text) {
  if (element.textContent !== String(text)) element.textContent = String(text);
}
function show(element, visible) { if (element.hidden === visible) element.hidden = !visible; }
function attr(element, name, value) { if (element.getAttribute(name) !== value) element.setAttribute(name, value); }
function className(element, value) { if (element.className !== value) element.className = value; }
function announce(text) { put(ui.announcement, text); }

for (let i = 0; i < GAME_CONFIG.rounds; i++) {
  const dot = document.createElement('span');
  dot.className = 'progress-dot';
  ui['progress-dots'].append(dot);
}
const dots = [...ui['progress-dots'].children];

function begin() {
  audio.unlock();
  race = createRace();
  questionHistory = [];
  renderer.lane = 1;
  lastTick = '';
  lastPhase = 'ready';
  startRace(race);
  syncUI();
  ui.pause.focus({ preventScroll: true });
}

function steer(lane) {
  const before = race.lane;
  setLane(race, lane);
  if (before !== race.lane) audio.note(170 + race.lane * 28, .055, 0, 'sine', .025);
  syncUI();
}

function pause() {
  pauseRace(race);
  if (race.paused) {
    audio.drive(race);
    returnFocus = document.activeElement;
    syncUI();
    ui.resume.focus({ preventScroll: true });
    announce('比賽已暫停。');
  }
}

function resume() {
  audio.unlock();
  resumeRace(race);
  lastFrame = performance.now();
  syncUI();
  (returnFocus?.isConnected && !returnFocus.closest('[hidden]') ? returnFocus : ui.pause).focus({ preventScroll: true });
}

function finish() {
  const seconds = Math.round(race.elapsed);
  const stars = race.correct >= 7 ? 3 : race.correct >= 4 ? 2 : 1;
  ui['finish-stars'].replaceChildren(...Array.from({ length: 3 }, (_, i) => {
    const span = document.createElement('span'); span.textContent = '★';
    if (i >= stars) span.className = 'dim';
    return span;
  }));
  ui['finish-score'].innerHTML = `${race.correct}<span> / ${race.total}</span>`;
  put(ui['finish-time'], `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`);
  put(ui['finish-streak'], `${race.bestStreak} 題`);
  put(ui['finish-message'], race.correct === race.total ? '全部答啱，太好喇！' : race.correct >= 5 ? '做得好！再跑一圈？' : '完成喇！再練習，一定會進步。');
  const mistakes = race.results.filter(result => !result.correct);
  show(ui.review, mistakes.length > 0);
  ui['review-answers'].replaceChildren(...mistakes.map(result => {
    const q = questionHistory[result.round - 1];
    const element = document.createElement('b');
    element.textContent = q ? `${q.a} + ${q.b} = ${result.answer}` : `答案：${result.answer}`;
    return element;
  }));
  announce(`完成比賽！${race.total} 題答啱 ${race.correct} 題。`);
  audio.win();
  requestAnimationFrame(() => ui['play-again'].focus({ preventScroll: true }));
}

function onPhaseChange() {
  if (race.phase === lastPhase) return;
  lastPhase = race.phase;
  if (race.phase === 'question') {
    questionHistory[race.questionIndex] = { ...race.question };
    announce(`第 ${race.questionIndex + 1} 題。${race.question.a} 加 ${race.question.b}。想一想，三秒後選擇車道。`);
    audio.note(440, .12); audio.note(660, .15, .13);
  } else if (race.phase === 'answer') {
    audio.note(880, .15);
    announce(`選擇答案：左線 ${race.question.options[0]}，中線 ${race.question.options[1]}，右線 ${race.question.options[2]}。`);
  } else if (race.phase === 'feedback') {
    if (race.lastResult.correct) { audio.correct(); announce('答啱！加速！'); }
    else { audio.wrong(); announce(`再試吓。${race.question.a} 加 ${race.question.b} 等於 ${race.question.answer}。`); }
  } else if (race.phase === 'finished') finish();
}

function syncUI() {
  onPhaseChange();
  const { phase, paused, question } = race;
  const running = phase !== 'ready' && phase !== 'finished';
  const thinking = phase === 'question';
  const answering = phase === 'answer';
  const displayQuestion = thinking || answering;
  const steeringAllowed = !paused && ['driving', 'answer', 'feedback'].includes(phase) && race.spinRemaining <= 0;
  className(ui.game, `game is-${phase}${paused ? ' is-paused' : ''}`);
  // DOM state also makes the current round understandable without the canvas.
  attr(ui.game, 'data-phase', paused ? 'paused' : phase);
  attr(ui.game, 'data-lane', String(race.lane));
  show(ui.welcome, phase === 'ready');
  show(ui.paused, paused);
  show(ui.finished, phase === 'finished');
  show(ui.pause, running);
  show(ui['race-hud'], running);
  show(ui['driving-ui'], running && !paused);
  show(ui['question-card'], displayQuestion && !paused);
  show(ui['thinking-clock'], thinking);
  show(ui.feedback, phase === 'feedback' && !paused);
  put(ui['round-label'], `${race.questionIndex + 1} / ${race.total}`);
  for (const [i, dot] of dots.entries()) {
    const result = race.results[i];
    className(dot, `progress-dot${result ? result.correct ? ' correct' : ' wrong' : i === race.questionIndex ? ' current' : ''}`);
    attr(dot, 'aria-label', `第 ${i + 1} 題：${result ? result.correct ? '答啱' : '再練習' : '未作答'}`);
  }
  if (displayQuestion) {
    put(ui.equation, `${question.a} + ${question.b} = ?`);
    put(ui['question-prompt'], thinking ? '停一停，想一想' : '駛進正確答案！');
    const remaining = Math.max(0, GAME_CONFIG.thinkSeconds - race.phaseTime);
    put(ui['think-count'], Math.ceil(remaining));
    ui['clock-ring'].style.strokeDashoffset = String(151 * (1 - remaining / GAME_CONFIG.thinkSeconds));
  }
  if (phase === 'feedback') {
    const good = race.lastResult.correct;
    className(ui.feedback, `feedback${good ? '' : ' wrong'}`);
    put(ui['feedback-icon'], good ? 'ϟ' : '✦');
    put(ui['feedback-title'], good ? '答啱！加速！' : '再試吓！');
    put(ui['feedback-detail'], `${question.a} + ${question.b} = ${question.answer}`);
  }
  const countdown = phase === 'countdown' ? Math.ceil(3 - race.phaseTime) : phase === 'driving' && race.questionIndex === 0 && race.phaseTime < .7 ? '出發！' : '';
  show(ui['start-countdown'], Boolean(countdown) && !paused);
  if (countdown) {
    put(ui['start-countdown'], countdown);
    if (`${phase}-${countdown}` !== lastTick && !paused) {
      lastTick = `${phase}-${countdown}`;
      audio.note(typeof countdown === 'number' ? 440 : 880, .14);
    }
  }
  put(ui.speed, Math.round(race.speed));
  put(ui['speed-effect'], race.boostRemaining > 0 ? '加速中' : race.spinRemaining > 0 ? '打轉中' : race.recoveryRemaining > 0 ? '恢復中' : '');
  put(ui['steering-prompt'], thinking ? '想好答案，準備轉線' : answering ? '駛進正確答案的車道' : race.spinRemaining > 0 ? '穩住！馬上再出發' : '左右轉線');
  const score = `${race.correct}<span> / ${race.total}</span>`;
  if (ui.score.innerHTML !== score) ui.score.innerHTML = score;
  put(ui.streak, race.streak >= 2 ? `連續 ${race.streak} 題！` : '');
  for (const [i, button] of laneButtons.entries()) {
    if (button.disabled === steeringAllowed) button.disabled = !steeringAllowed;
    attr(button, 'aria-pressed', String(race.lane === i));
    attr(button, 'aria-label', `${laneNames[i]}${displayQuestion ? `，答案 ${question.options[i]}` : ''}`);
    put(button.querySelector('.lane-symbol'), displayQuestion ? question.options[i] : symbols[i]);
  }
}

ui.start.addEventListener('click', begin);
ui.restart.addEventListener('click', begin);
ui['play-again'].addEventListener('click', begin);
ui.pause.addEventListener('click', pause);
ui.resume.addEventListener('click', resume);
ui.sound.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  ui.sound.setAttribute('aria-pressed', String(!soundEnabled));
  ui.sound.setAttribute('aria-label', soundEnabled ? '關閉音效' : '開啟音效');
  ui.sound.title = soundEnabled ? '關閉音效' : '開啟音效';
  if (soundEnabled) audio.unlock();
  audio.drive(race);
});
for (const [lane, button] of laneButtons.entries()) button.addEventListener('click', () => steer(lane));

document.addEventListener('keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === 'Tab' && (race.paused || race.phase === 'finished')) {
    const dialog = race.paused ? ui.paused : ui.finished;
    const buttons = [...dialog.querySelectorAll('button')];
    if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1).focus(); }
    else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0].focus(); }
    return;
  }
  const key = event.key.toLowerCase();
  if (['arrowleft', 'a', 'arrowright', 'd'].includes(key)) {
    event.preventDefault();
    steer(race.lane + (key === 'arrowleft' || key === 'a' ? -1 : 1));
  } else if (key === 'escape' || key === 'p') {
    if (event.repeat) return;
    event.preventDefault();
    race.paused ? resume() : pause();
  } else if (event.code === 'Space' && document.activeElement?.tagName !== 'BUTTON') {
    event.preventDefault();
    if (event.repeat) return;
    if (race.phase === 'ready' || race.phase === 'finished') begin();
    else race.paused ? resume() : pause();
  }
});

ui.track.addEventListener('pointerdown', event => {
  if (!event.isPrimary) return;
  pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
  ui.track.setPointerCapture(event.pointerId);
});
ui.track.addEventListener('pointerup', event => {
  if (!pointer || pointer.id !== event.pointerId) return;
  const dx = event.clientX - pointer.x;
  if (Math.abs(dx) > 24) steer(race.lane + Math.sign(dx));
  else {
    const bounds = ui.track.getBoundingClientRect();
    steer(Math.max(0, Math.min(2, Math.floor((event.clientX - bounds.left) / bounds.width * 3))));
  }
  pointer = null;
});
ui.track.addEventListener('pointercancel', () => { pointer = null; });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
window.addEventListener('blur', () => { if (!race.paused) pause(); });
new ResizeObserver(() => renderer.resize()).observe(ui.track);

function frame(now) {
  const dt = lastFrame ? Math.min((now - lastFrame) / 1000, .06) : 0;
  lastFrame = now;
  updateRace(race, dt);
  renderer.draw(race, dt);
  syncUI();
  audio.drive(race);
  requestAnimationFrame(frame);
}
syncUI();
requestAnimationFrame(frame);
