// Original vector artwork: a small perspective road renderer with no external assets.
const INK = '#203e49';
const BOXES = ['#f39475', '#ffd05d', '#85c9e1'];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, t) => a + (b - a) * t;

export class KartRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = 0;
    this.height = 0;
    this.lane = 1;
    this.clock = 0;
    this.distance = 0;
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.resize();
  }

  resize() {
    const { width, height } = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = width;
    this.height = height;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.horizon = height * .355;
    this.roadWidth = Math.min(width * .57, height * .89);
  }

  project(z, side = 0) {
    const scale = 1 / (1 + z / 240);
    const bend = (Math.sin((this.distance + z) / 790) - Math.sin(this.distance / 790)) * this.width * .22;
    const center = this.width / 2 + bend * (1 - scale) - (this.lane - 1) * this.roadWidth * .085;
    return { x: center + side * this.roadWidth * scale, y: this.horizon + (this.height + 60 - this.horizon) * scale, w: this.roadWidth * scale, scale };
  }

  poly(points, fill, stroke, lineWidth = 1) {
    const ctx = this.ctx;
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
  }

  rect(x, y, w, h, radius, fill, stroke, lineWidth = 1) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
  }

  ellipse(x, y, rx, ry, fill) {
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), 0, 0, Math.PI * 2);
    this.ctx.fillStyle = fill;
    this.ctx.fill();
  }

  text(label, x, y, size, color = INK, weight = 800) {
    const ctx = this.ctx;
    ctx.font = `${weight} ${size}px ui-rounded, "PingFang HK", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(label, x, y);
  }

  cloud(x, y, s) {
    this.ellipse(x, y, 48 * s, 12 * s, '#f8f9e9');
    this.ellipse(x - 15 * s, y - 8 * s, 23 * s, 20 * s, '#f8f9e9');
    this.ellipse(x + 16 * s, y - 5 * s, 24 * s, 15 * s, '#f8f9e9');
  }

  backdrop() {
    const ctx = this.ctx, w = this.width, h = this.height, horizon = this.horizon;
    const sky = ctx.createLinearGradient(0, 0, 0, horizon + 70);
    sky.addColorStop(0, '#b8e2df'); sky.addColorStop(1, '#ebf3db');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    this.ellipse(w * .79, horizon * .43, Math.min(w * .055, 45), Math.min(w * .055, 45), '#fff2b2');
    this.ellipse(w * .79, horizon * .43, Math.min(w * .069, 57), Math.min(w * .069, 57), '#fff3bf28');
    this.cloud(w * .19 + Math.sin(this.clock / 30) * 12, horizon * .51, clamp(w / 1100, .6, 1.05));
    this.cloud(w * .59, horizon * .28, .56);
    this.cloud(w * .94, horizon * .76, .7);
    this.poly([[0, horizon + 30], [0, horizon - 8], [w * .08, horizon - 30], [w * .17, horizon - 55], [w * .24, horizon - 42], [w * .33, horizon + 15]], '#95c8b0');
    this.poly([[w * .56, horizon + 25], [w * .68, horizon - 10], [w * .76, horizon - 38], [w * .85, horizon - 43], [w * .96, horizon - 9], [w, horizon - 23], [w, horizon + 35]], '#95c8b0');
    this.poly([[w * .73, horizon + 30], [w * .86, horizon - 19], [w * .94, horizon - 11], [w, horizon + 8], [w, horizon + 45]], '#71b69b');
    ctx.fillStyle = '#75c5c0'; ctx.fillRect(0, horizon + 15, w, h - horizon);
    ctx.fillStyle = '#c8e2c0'; ctx.fillRect(0, horizon + 37, w, h - horizon);
    // A distant sea and small sail on the left edge of the island.
    this.poly([[0, horizon + 18], [w * .38, horizon + 18], [w * .23, horizon + 53], [0, horizon + 99]], '#86cfc7');
    this.poly([[0, horizon + 98], [w * .23, horizon + 52], [w * .23, horizon + 66], [0, horizon + 126]], '#eee6bb');
    this.poly([[w * .09, horizon + 15], [w * .09, horizon - 8], [w * .11, horizon + 13]], '#fff9e5');
    this.poly([[w * .082, horizon + 17], [w * .114, horizon + 17], [w * .108, horizon + 22], [w * .088, horizon + 22]], '#4e9392');
  }

  road() {
    const ctx = this.ctx;
    for (let z = 2700; z >= 0; z -= 30) {
      const a = this.project(z + 30), b = this.project(z);
      const stripe = Math.floor((this.distance + z) / 70) % 2;
      this.poly([[0, a.y], [this.width, a.y], [this.width, b.y], [0, b.y]], stripe ? '#bfdbac' : '#c4deaf');
      this.poly([[a.x - a.w * 1.13, a.y], [a.x + a.w * 1.13, a.y], [b.x + b.w * 1.13, b.y], [b.x - b.w * 1.13, b.y]], '#e9dfb9');
      this.poly([[a.x - a.w * 1.044, a.y], [a.x + a.w * 1.044, a.y], [b.x + b.w * 1.044, b.y], [b.x - b.w * 1.044, b.y]], stripe ? '#ed9276' : '#fff5de');
      this.poly([[a.x - a.w, a.y], [a.x + a.w, a.y], [b.x + b.w, b.y], [b.x - b.w, b.y]], stripe ? '#5e7c84' : '#5c7a82');
      if (stripe) {
        for (const offset of [-1 / 3, 1 / 3]) {
          this.poly([[a.x + a.w * (offset - .006), a.y], [a.x + a.w * (offset + .006), a.y], [b.x + b.w * (offset + .006), b.y], [b.x + b.w * (offset - .006), b.y]], '#bacccb');
        }
      }
      if (z < 450 && Math.floor((z + this.distance) / 19) % 4 === 0) {
        ctx.fillStyle = '#6d8c9270';
        ctx.fillRect(a.x - a.w * .72, a.y, 8 * a.scale, 2 * a.scale);
        ctx.fillRect(a.x + a.w * .53, a.y + 2, 12 * a.scale, 2 * a.scale);
      }
    }
  }

  palm(x, y, s, flip = 1) {
    const ctx = this.ctx;
    ctx.save(); ctx.translate(x, y); ctx.scale(s * flip, s);
    this.ellipse(6, 0, 26, 5, '#709b7038');
    this.poly([[-4, 0], [5, 0], [0, -42], [-9, -77], [-14, -76], [-7, -39]], '#a59868');
    const leaf = '#468c6d', light = '#62a576';
    this.poly([[-12, -77], [-38, -89], [-62, -71], [-34, -78]], leaf);
    this.poly([[-12, -77], [-29, -104], [-56, -102], [-35, -94]], light);
    this.poly([[-12, -77], [-3, -105], [18, -111], [4, -93]], leaf);
    this.poly([[-12, -77], [18, -99], [48, -83], [19, -86]], light);
    this.poly([[-12, -77], [16, -75], [31, -48], [9, -64]], leaf);
    this.ellipse(-12, -74, 5, 6, '#827955');
    ctx.restore();
  }

  billboard(x, y, s, n) {
    const ctx = this.ctx;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    this.rect(-25, -56, 4, 56, 1, '#9a9c7c'); this.rect(21, -56, 4, 56, 1, '#9a9c7c');
    this.rect(-48, -85, 96, 53, 9, n % 2 ? '#f5c966' : '#f0a188', '#fff4d8', 4);
    this.text(n % 2 ? '＋' : '✦', 0, -58, 34, '#335861');
    ctx.restore();
  }

  scenery() {
    const items = [];
    for (let i = 0; i < 25; i++) {
      const z = ((i * 187 - this.distance * 1.6) % 4400 + 4400) % 4400;
      if (z < 25) continue;
      const side = i % 2 ? 1 : -1;
      const p = this.project(z, side * (1.45 + (i % 3) * .26));
      items.push({ z, p, i, side });
    }
    items.sort((a, b) => b.z - a.z);
    for (const { p, i, side } of items) {
      const s = p.scale * 2.4;
      if (i % 5 === 2) this.billboard(p.x, p.y, s, i);
      else this.palm(p.x, p.y, s, side);
    }
    // Low course flags follow the road and make speed easy to read.
    for (let i = 16; i >= 0; i--) {
      const z = ((i * 260 - this.distance * 1.6) % 4300 + 4300) % 4300;
      if (z < 10) continue;
      for (const side of [-1.12, 1.12]) {
        const p = this.project(z, side), s = p.scale;
        this.rect(p.x, p.y - s * 45, Math.max(1, s * 3), s * 45, 1, '#faf5d9');
        this.poly([[p.x, p.y - s * 46], [p.x + s * 25, p.y - s * 40], [p.x, p.y - s * 29]], i % 2 ? '#ed9674' : '#edd168');
      }
    }
  }

  answerBox(x, y, size, number, color, active) {
    const ctx = this.ctx, lift = size * .22;
    this.ellipse(x, y + size * .05, size * .62, size * .13, '#253e4540');
    ctx.save(); ctx.translate(x, y - lift);
    if (!this.reducedMotion) ctx.translate(0, Math.sin(this.clock * 3 + (Number(number) || 0)) * size * .035);
    this.poly([[-size * .49, -size], [size * .39, -size], [size * .51, -size * .88], [-size * .37, -size * .88]], '#fff8cf', INK, Math.max(1, size * .025));
    this.poly([[size * .39, -size], [size * .51, -size * .88], [size * .51, 0], [size * .39, -size * .1]], '#b38d57', INK, Math.max(1, size * .025));
    this.rect(-size * .49, -size, size * .88, size * .9, size * .09, color, INK, Math.max(1.5, size * .027));
    this.rect(-size * .41, -size * .92, size * .72, size * .73, size * .05, color, '#ffffff70', Math.max(1, size * .02));
    this.text(String(number), -size * .05, -size * .52, size * .47, '#28454c', 900);
    if (active) {
      this.poly([[-size * .16, size * .22], [size * .06, size * .22], [-size * .05, size * .08]], '#fffbe7');
    }
    ctx.restore();
  }

  kart(x, y, size, color = '#ed7653', lean = 0, spin = 0, boost = false, player = false) {
    const ctx = this.ctx;
    this.ellipse(x, y + size * .11, size * .73, size * .19, '#263d4550');
    ctx.save(); ctx.translate(x, y); ctx.rotate(lean * .07 + spin);
    const s = size;
    if (boost) {
      for (const side of [-.26, .26]) {
        this.poly([[side * s - s * .1, s * .2], [side * s + s * .1, s * .2], [side * s, s * (.68 + Math.sin(this.clock * 28) * .11)]], '#ffca58');
        this.poly([[side * s - s * .06, s * .2], [side * s + s * .06, s * .2], [side * s, s * .49]], '#fff3ae');
      }
    }
    // Wheels, chassis, driver and the rear wing are separate shapes.
    this.rect(-s * .62, -s * .21, s * .26, s * .48, s * .06, '#243e47', '#142c35', 1.5);
    this.rect(s * .36, -s * .21, s * .26, s * .48, s * .06, '#243e47', '#142c35', 1.5);
    this.rect(-s * .58, -s * .14, s * .06, s * .29, s * .02, '#658087');
    this.rect(s * .47, -s * .14, s * .06, s * .29, s * .02, '#658087');
    this.poly([[-s * .33, -s * .72], [s * .33, -s * .72], [s * .49, s * .13], [-s * .49, s * .13]], color, INK, 2);
    this.poly([[-s * .3, -s * .63], [s * .3, -s * .63], [s * .38, -s * .32], [-s * .38, -s * .32]], '#fff5d2');
    this.rect(-s * .24, -s * .7, s * .48, s * .42, s * .13, '#315665', INK, 1.5);
    this.ellipse(0, -s * .91, s * .29, s * .29, '#ffcd60');
    ctx.beginPath(); ctx.arc(0, -s * .91, s * .29, 0, Math.PI * 2); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    this.rect(-s * .035, -s * 1.17, s * .07, s * .47, s * .03, '#fff7df');
    this.poly([[-s * .255, -s * .82], [s * .255, -s * .82], [s * .23, -s * .71], [-s * .23, -s * .71]], '#ba8b51');
    this.rect(-s * .42, -s * .1, s * .84, s * .33, s * .07, color, INK, 2);
    this.rect(-s * .62, -s * .27, s * 1.24, s * .15, s * .04, color, INK, 2);
    this.rect(-s * .51, -s * .25, s * 1.02, s * .035, s * .01, '#ffd0a6');
    this.rect(-s * .14, -s * .045, s * .28, s * .22, s * .04, '#fff3d2');
    this.text(player ? 'M' : '✦', 0, s * .065, s * .17, INK, 900);
    for (const side of [-.29, .29]) {
      this.ellipse(side * s, s * .17, s * .08, s * .065, '#18343d');
      this.ellipse(side * s, s * .17, s * .041, s * .035, '#8da3a0');
    }
    ctx.restore();
  }

  draw(state, dt) {
    if (!state.paused) this.clock += dt;
    const oldLane = this.lane;
    if (!state.paused) this.lane = lerp(this.lane, state.lane, 1 - Math.exp(-dt * (this.reducedMotion ? 25 : 12)));
    this.distance = state.distance + (state.phase === 'ready' ? this.clock * 9 : 0);
    this.backdrop(); this.road(); this.scenery();
    // Two pace karts give the road a racing feel. Boosts gain on them;
    // mistakes let them pull ahead. They never obstruct answer boxes.
    if (!['ready', 'finished'].includes(state.phase)) {
      const advantage = state.results.reduce((sum, result) => sum + (result.correct ? 55 : -65), 0);
      for (const [i, side] of [[0, -.63], [1, .63]]) {
        const z = clamp(660 + i * 290 - advantage + Math.sin(this.distance / 310 + i) * 55, 190, 1800);
        const p = this.project(z, side);
        this.kart(p.x, p.y, clamp(p.w * .18, 12, 52), i ? '#83bdcf' : '#b8ca70');
      }
    }
    if (Number.isFinite(state.gateDistance) && ['question', 'answer'].includes(state.phase)) {
      const z = 115 + state.gateDistance * 3.4;
      for (let i = 0; i < 3; i++) {
        const p = this.project(z, (i - 1) * .667);
        const size = clamp(p.w * .41, 22, 122);
        this.answerBox(p.x, p.y, size, state.question.options[i], BOXES[i], state.lane === i && state.phase === 'answer');
      }
    } else if (state.phase === 'driving') {
      const z = 650 + state.driveRemaining * 3.4;
      for (let i = 0; i < 3; i++) {
        const p = this.project(z, (i - 1) * .667);
        this.answerBox(p.x, p.y, clamp(p.w * .36, 15, 60), '?', BOXES[i], false);
      }
    }
    const playerRoad = this.project(115);
    const playerX = playerRoad.x + (this.lane - 1) * playerRoad.w * .667;
    const playerY = Math.min(playerRoad.y, this.height * .81);
    const size = clamp(this.roadWidth * .15, 47, 92);
    const boost = state.boostRemaining > 0;
    const spinning = state.spinRemaining > 0;
    const lean = clamp((this.lane - oldLane) * 130, -1, 1);
    if (boost && !this.reducedMotion) this.speedLines();
    const spin = spinning && !this.reducedMotion ? Math.sin(state.spinRemaining * 13) * 2.8 : 0;
    this.kart(playerX, playerY + (state.speed > 0 && !this.reducedMotion ? Math.sin(this.clock * 20) * .7 : 0), size, '#ed7653', lean, spin, boost, true);
    if (spinning) {
      for (let i = 0; i < 5; i++) {
        const a = (this.reducedMotion ? 0 : this.clock * 5) + i * Math.PI * .4;
        this.text('✦', playerX + Math.cos(a) * size * .88, playerY - size * .8 + Math.sin(a) * size * .29, 20, '#ffe495');
      }
    }
    if (state.phase === 'finished' && !this.reducedMotion) this.confetti();
    // Bottom shading keeps the small steering controls readable.
    const shade = this.ctx.createLinearGradient(0, this.height * .83, 0, this.height);
    shade.addColorStop(0, '#173b4300'); shade.addColorStop(1, '#173b435a');
    this.ctx.fillStyle = shade; this.ctx.fillRect(0, this.height * .83, this.width, this.height * .17);
  }

  speedLines() {
    const ctx = this.ctx;
    ctx.save(); ctx.strokeStyle = '#fff3cb85'; ctx.lineWidth = 2;
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const r = .65 + ((this.clock * 2 + i * .37) % 1) * .45;
      const x = Math.cos(angle) * this.width * .7, y = Math.sin(angle) * this.height * .65;
      ctx.beginPath(); ctx.moveTo(this.width / 2 + x * r, this.height * .45 + y * r);
      ctx.lineTo(this.width / 2 + x * (r + .16), this.height * .45 + y * (r + .16)); ctx.stroke();
    }
    ctx.restore();
  }

  confetti() {
    for (let i = 0; i < 42; i++) {
      const x = ((i * 137 + Math.sin(this.clock + i) * 30) % this.width + this.width) % this.width;
      const y = (this.clock * (24 + i % 23) + i * 73) % this.height;
      this.rect(x, y, i % 2 ? 5 : 9, i % 2 ? 10 : 5, 1, ['#f2aa72', '#f5d576', '#77b8be', '#c1d57d'][i % 4]);
    }
  }
}
