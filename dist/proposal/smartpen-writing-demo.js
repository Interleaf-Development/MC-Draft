// An illustrated timing example only. No pen, camera or device connection is used.
const strokes = [
  { path: 'M223 111 L235 100 L235 157', start: 250, end: 1150 },
  { path: 'M220 158 L251 158', start: 1150, end: 1400 },
  { path: 'M270 112 C275 90 307 94 308 113 C309 130 280 141 270 158 L311 158', start: 4400, end: 6150 }
];
const duration = 6500;
const instances = new WeakMap();

function words(language) {
  return language === 'zh-HK' ? {
    title: '同一筆，紙上與畫面同步出現',
    paper: '紙本工作紙', digital: '系統中的學習紀錄',
    prompt: '計算並寫下答案', example: '示例：7 + 5 = 12',
    play: '播放書寫示意', pause: '暫停', resume: '繼續播放', replay: '重新播放',
    ready: '按播放，看看筆跡如何同步出現。',
    writingOne: '正在寫「1」：兩邊同時出現筆跡。',
    penPause: '停筆 3 秒：這段沒有新筆跡。',
    writingTwo: '繼續寫「2」：筆跡同步更新。',
    complete: '示意完成：可保留答案，也可重看書寫過程。',
    paused: '播放已暫停。', reduced: '完整書寫示意（已減少動態效果）。',
    timer: '示例時間', stepOne: '寫「1」', stepPause: '停筆 3 秒', stepTwo: '寫「2」',
    caution: '停筆時間是可觀察的紀錄；單憑停頓，不能判斷學生是否困惑。',
    caption: '書寫與同步示意，非實體智能筆連線。時間及筆跡均為示例。'
  } : {
    title: 'The same stroke appears on paper and on screen',
    paper: 'Paper worksheet', digital: 'Learning record in the system',
    prompt: 'Calculate and write the answer', example: 'Example: 7 + 5 = 12',
    play: 'Replay writing', pause: 'Pause', resume: 'Continue', replay: 'Start again',
    ready: 'Play the example to see handwriting appear in both views.',
    writingOne: 'Writing “1”: ink appears in both views together.',
    penPause: 'A 3-second pen pause: no new handwriting.',
    writingTwo: 'Writing “2”: the digital handwriting updates together.',
    complete: 'Example complete: keep the answer and revisit the writing process.',
    paused: 'Playback paused.', reduced: 'Complete writing example (reduced motion).',
    timer: 'Example time', stepOne: 'Write “1”', stepPause: 'Pause for 3 sec', stepTwo: 'Write “2”',
    caution: 'A pause is an observable event; it does not by itself show that a pupil is confused.',
    caption: 'Illustration of writing and synchronisation, not a connected smartpen. All handwriting and timings are examples.'
  };
}

function worksheet(copy, paper) {
  return `<svg class="smartpen-writing-sheet" viewBox="0 0 400 235" role="img" aria-label="${copy.example}">
    <rect x="1" y="1" width="398" height="233" rx="3" fill="${paper ? '#fffdf7' : '#fff'}" stroke="#d9d9d5"/>
    <text x="28" y="39" class="smartpen-writing-sheet-title">MathConcept</text>
    <text x="28" y="67" class="smartpen-writing-sheet-prompt">${copy.prompt}</text>
    <path d="M28 81 H371" stroke="#e6e5df"/>
    <text x="45" y="148" class="smartpen-writing-question">7 + 5 =</text>
    <path d="M211 173 H326" stroke="#c6c8c8"/>
    <g class="smartpen-writing-ink" fill="none" stroke="#244b6c" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round">
      ${strokes.map((stroke, index) => `<path data-writing-stroke="${index}" d="${stroke.path}"/>`).join('')}
    </g>
    ${paper ? '<g class="smartpen-writing-pen" visibility="hidden" aria-hidden="true"><g transform="rotate(32)"><path d="M0 0 -5-14 V-75 Q0-82 5-75 V-14 Z" fill="#36424f" stroke="#25303b" stroke-width="1.3"/><path d="M-5-14 0 0 5-14Z" fill="#c8b191"/><path d="M-1.4-4 0 0 1.4-4Z" fill="#263747"/><path d="M-2-71V-22" stroke="#728292" stroke-width="1.2"/></g></g>' : ''}
  </svg>`;
}

export function smartpenWritingDemo(language) {
  const copy = words(language);
  return `<figure class="smartpen-writing-demo" data-writing-language="${language === 'zh-HK' ? 'zh-HK' : 'eng'}">
    <figcaption class="smartpen-writing-heading">${copy.title}</figcaption>
    <div class="smartpen-writing-panels">
      <div class="smartpen-writing-panel"><h4>${copy.paper}</h4>${worksheet(copy, true)}</div>
      <div class="smartpen-writing-panel"><h4>${copy.digital}</h4>${worksheet(copy, false)}</div>
    </div>
    <div class="smartpen-writing-controls">
      <button type="button" data-writing-action="toggle">${copy.play}</button>
      <button type="button" data-writing-action="replay" hidden>${copy.replay}</button>
      <span class="smartpen-writing-clock">${copy.timer} <span data-writing-time role="timer" aria-live="off">6.5 s</span></span>
    </div>
    <p class="smartpen-writing-status" data-writing-status role="status" aria-live="polite">${copy.ready}</p>
    <ol class="smartpen-writing-timeline" aria-label="${copy.timer}">
      <li data-writing-phase="one"><span>0–1.4 s</span>${copy.stepOne}</li>
      <li data-writing-phase="pause"><span>1.4–4.4 s</span>${copy.stepPause}</li>
      <li data-writing-phase="two"><span>4.4–6.5 s</span>${copy.stepTwo}</li>
    </ol>
    <p class="smartpen-writing-caution">${copy.caution}</p>
    <p class="smartpen-writing-caption">${copy.caption}</p>
  </figure>`;
}

export function initSmartpenWritingDemo(root = document) {
  const cleanups = [];
  for (const figure of root.querySelectorAll('.smartpen-writing-demo')) {
    if (instances.has(figure)) continue;
    const doc = figure.ownerDocument;
    const view = doc.defaultView;
    if (!view?.requestAnimationFrame) continue;
    const copy = words(figure.dataset.writingLanguage);
    const toggle = figure.querySelector('[data-writing-action="toggle"]');
    const replay = figure.querySelector('[data-writing-action="replay"]');
    const time = figure.querySelector('[data-writing-time]');
    const status = figure.querySelector('[data-writing-status]');
    const pen = figure.querySelector('.smartpen-writing-pen');
    const paths = [...figure.querySelectorAll('[data-writing-stroke]')].map(path => ({
      path, stroke: strokes[Number(path.dataset.writingStroke)], length: path.getTotalLength()
    }));
    const paperPaths = paths.slice(0, strokes.length);
    const markers = [...figure.querySelectorAll('[data-writing-phase]')];
    const reducedMotion = view.matchMedia?.('(prefers-reduced-motion: reduce)');
    let elapsed = duration;
    let startedAt = 0;
    let running = false;
    let frame = 0;
    let phase = '';

    function isHidden() {
      return doc.hidden || Boolean(figure.closest('[hidden]')) || figure.getClientRects().length === 0;
    }

    function setStatus(text) {
      if (status.textContent !== text) status.textContent = text;
    }

    function draw() {
      for (const item of paths) {
        const progress = Math.max(0, Math.min(1, (elapsed - item.stroke.start) / (item.stroke.end - item.stroke.start)));
        item.path.style.strokeDasharray = `${item.length}`;
        item.path.style.strokeDashoffset = `${item.length * (1 - progress)}`;
        item.path.style.visibility = progress === 0 ? 'hidden' : 'visible';
      }
      const nextPhase = elapsed < 1400 ? 'one' : elapsed < 4400 ? 'pause' : elapsed < duration ? 'two' : 'complete';
      if (nextPhase !== phase) {
        phase = nextPhase;
        for (const marker of markers) {
          marker.classList.toggle('smartpen-writing-current', marker.dataset.writingPhase === phase);
        }
      }
      time.textContent = `${(elapsed / 1000).toFixed(1)} s`;
      const active = paperPaths.find(item => elapsed >= item.stroke.start && elapsed <= item.stroke.end);
      if (active && !reducedMotion?.matches) {
        const ratio = Math.max(0, Math.min(1, (elapsed - active.stroke.start) / (active.stroke.end - active.stroke.start)));
        const point = active.path.getPointAtLength(active.length * ratio);
        pen.setAttribute('transform', `translate(${point.x} ${point.y})`);
        pen.setAttribute('visibility', 'visible');
      } else {
        pen.setAttribute('visibility', 'hidden');
      }
      if (running) setStatus(phase === 'one' ? copy.writingOne : phase === 'pause' ? copy.penPause : phase === 'two' ? copy.writingTwo : copy.complete);
    }

    function pause() {
      if (!running) return;
      elapsed = Math.min(duration, view.performance.now() - startedAt);
      running = false;
      view.cancelAnimationFrame(frame);
      draw();
      pen.setAttribute('visibility', 'hidden');
      toggle.textContent = copy.resume;
      setStatus(copy.paused);
    }

    function tick(now) {
      if (!running) return;
      if (isHidden()) { pause(); return; }
      elapsed = Math.min(duration, now - startedAt);
      draw();
      if (elapsed >= duration) {
        running = false;
        toggle.textContent = copy.play;
        replay.hidden = true;
        return;
      }
      frame = view.requestAnimationFrame(tick);
    }

    function play(fromStart = false) {
      if (reducedMotion?.matches) { showReducedMotion(); return; }
      view.cancelAnimationFrame(frame);
      if (fromStart || elapsed >= duration) elapsed = 0;
      startedAt = view.performance.now() - elapsed;
      running = true;
      toggle.textContent = copy.pause;
      replay.hidden = false;
      draw();
      frame = view.requestAnimationFrame(tick);
    }

    function showReducedMotion() {
      running = false;
      view.cancelAnimationFrame(frame);
      elapsed = duration;
      draw();
      toggle.hidden = Boolean(reducedMotion?.matches);
      replay.hidden = true;
      toggle.textContent = copy.play;
      setStatus(reducedMotion?.matches ? copy.reduced : copy.ready);
    }

    const onToggle = () => running ? pause() : play();
    const onReplay = () => play(true);
    const onVisibility = () => { if (isHidden()) pause(); };
    const onPrint = () => {
      pause();
      elapsed = duration;
      draw();
      toggle.textContent = copy.play;
      replay.hidden = true;
      setStatus(copy.complete);
    };
    toggle.addEventListener('click', onToggle);
    replay.addEventListener('click', onReplay);
    doc.addEventListener('visibilitychange', onVisibility);
    view.addEventListener('pagehide', pause);
    view.addEventListener('beforeprint', onPrint);
    reducedMotion?.addEventListener?.('change', showReducedMotion);
    const observer = view.MutationObserver ? new view.MutationObserver(onVisibility) : null;
    for (let ancestor = figure.parentElement; ancestor; ancestor = ancestor.parentElement) {
      observer?.observe(ancestor, { attributes: true, attributeFilter: ['hidden', 'class', 'style'] });
    }
    const viewport = view.IntersectionObserver ? new view.IntersectionObserver(entries => {
      if (entries.some(entry => !entry.isIntersecting)) pause();
    }) : null;
    viewport?.observe(figure);
    if (reducedMotion?.matches) showReducedMotion();
    const cleanup = () => {
      running = false;
      view.cancelAnimationFrame(frame);
      observer?.disconnect();
      viewport?.disconnect();
      toggle.removeEventListener('click', onToggle);
      replay.removeEventListener('click', onReplay);
      doc.removeEventListener('visibilitychange', onVisibility);
      view.removeEventListener('pagehide', pause);
      view.removeEventListener('beforeprint', onPrint);
      reducedMotion?.removeEventListener?.('change', showReducedMotion);
      instances.delete(figure);
    };
    instances.set(figure, cleanup);
    cleanups.push(cleanup);
  }
  return () => cleanups.forEach(cleanup => cleanup());
}
