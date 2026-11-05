// Background: a live "wind tunnel". Fine ink streamlines of real potential
// flow around a Joukowski wing section (or a round body / spinning cylinder),
// with tracers that travel faster where the air is faster. Each menu page
// shows a different flow study and the field morphs between them.
//
// Two canvases: #flow holds the streamlines, the body outline and the plotter
// frame (redrawn only when the flow changes); #flowfx holds the moving tracers
// and the pointer probe (redrawn at up to 30 fps, paused when hidden).

const flow = document.getElementById('flow');
const fxc = document.getElementById('flowfx');
const bgEl = flow ? flow.parentElement : null;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(pointer: fine)').matches;

// Each scene is a Joukowski section: t = thickness, m = camber, a = angle of
// attack (degrees), x/y = position on screen, c = chord as a share of width,
// kutta = 1 for a sharp trailing edge (wing), spin = extra circulation.
const SCENES = {
  about: { t: 0.1, m: 0.1, a: 6, x: 0.66, y: 0.44, c: 0.5, kutta: 1, spin: 0, fig: 'FIG. 01 — LIFTING SECTION' },
  projects: { t: 0.12, m: 0.14, a: 13, x: 0.63, y: 0.47, c: 0.52, kutta: 1, spin: 0, fig: 'FIG. 02 — HIGH ANGLE OF ATTACK' },
  course: { t: 0.85, m: 0, a: 0, x: 0.7, y: 0.5, c: 0.3, kutta: 0, spin: 0, fig: 'FIG. 03 — FLOW PAST A BLUFF BODY' },
  dump: { t: 0.85, m: 0, a: 0, x: 0.68, y: 0.52, c: 0.3, kutta: 0, spin: 0.85, fig: 'FIG. 04 — MAGNUS EFFECT' },
  lifestyle: { t: 0.06, m: 0.05, a: 2, x: 0.64, y: 0.5, c: 0.56, kutta: 1, spin: 0, fig: 'FIG. 05 — CRUISE' },
  contact: { t: 0.14, m: 0.06, a: 4, x: 0.6, y: 0.5, c: 0.46, kutta: 1, spin: 0, fig: 'FIG. 06 — LAMINAR APPROACH' },
};
const KEYS = ['t', 'm', 'a', 'x', 'y', 'c', 'kutta', 'spin'];

// ── State ───────────────────────────────────────────────────
let W = 0;
let H = 0;
let dpr = 1;
let portrait = false;
let sceneKey = 'about';
const P = { ...SCENES.about };    // current (possibly mid-morph) parameters
let morph = null;                 // { from, to, start, dur }
let lines = [];                   // [{ xs, ys, sp, n, tracer }]
let field = null;
const probe = { x: -1e4, y: -1e4, on: 0, target: 0 };
let colors = { ink: [20, 18, 16], accent: [214, 59, 31], paper: [235, 229, 216], dark: false };
let started = false;              // the tunnel has "switched on"
let dirty = true;

// ── Theme colours from CSS ──────────────────────────────────
function rgb(str, fallback) {
  const s = (str || '').trim();
  const hex = s.match(/^#([0-9a-f]{6})$/i);
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16));
  const m = s.match(/rgba?\(([^)]+)\)/i);
  if (m) return m[1].split(',').slice(0, 3).map((v) => parseFloat(v));
  return fallback;
}
function readColors() {
  const cs = getComputedStyle(document.documentElement);
  colors = {
    ink: rgb(cs.getPropertyValue('--ink'), colors.ink),
    accent: rgb(cs.getPropertyValue('--accent'), colors.accent),
    paper: rgb(cs.getPropertyValue('--paper'), colors.paper),
    dark: window.matchMedia('(prefers-color-scheme: dark)').matches,
  };
}
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

// ── The flow field ──────────────────────────────────────────
// Screen pixels → math plane "s" (freestream along +x) → wing plane z = s·e^{iα}
// → circle plane ζ (inverse Joukowski z = ζ + 1/ζ). Velocity comes from the
// complex potential of a cylinder with circulation, mapped back to the screen.
function placement(p) {
  if (!portrait) return { ox: p.x * W, oy: p.y * H, scale: (p.c * W) / 4 };
  // Phones and tall screens: body near the top, wider
  return { ox: W * 0.56, oy: H * 0.27, scale: (Math.min(0.92, p.c * 1.75) * W) / 4 };
}

function makeField(p) {
  const ar = (p.a * Math.PI) / 180;
  const ca = Math.cos(ar);
  const sa = Math.sin(ar);
  const mux = -p.t;
  const muy = p.m;
  const R = Math.hypot(1 - mux, muy); // the circle passes through ζ = 1 (sharp trailing edge)
  // Kutta circulation: chosen so that W(ζ = 1) = 0
  const dx1 = 1 - mux;
  const dy1 = -muy;
  const d2 = dx1 * dx1 + dy1 * dy1;
  const inv2x = (dx1 * dx1 - dy1 * dy1) / (d2 * d2);
  const inv2y = (-2 * dx1 * dy1) / (d2 * d2);
  const Ax = ca - R * R * (ca * inv2x - sa * inv2y);
  const Ay = -sa - R * R * (ca * inv2y + sa * inv2x);
  const gammaKutta = -2 * Math.PI * (dx1 * Ay + dy1 * Ax); // Re(2πi·d·A)
  const gamma = p.kutta * gammaKutta + p.spin * 4 * Math.PI * R;
  const k = gamma / (2 * Math.PI);
  const { ox, oy, scale } = placement(p);
  const pr = 46 / scale; // pointer "obstacle" radius in math units
  const out = { u: 0, v: 0, inside: false };

  function at(px, py) {
    const sx = (px - ox) / scale;
    const sy = -(py - oy) / scale;
    const zx = sx * ca - sy * sa;
    const zy = sx * sa + sy * ca;
    // ζ = (z ± √(z² − 4)) / 2, taking the root outside the circle
    const qx = zx * zx - zy * zy - 4;
    const qy = 2 * zx * zy;
    const r = Math.hypot(qx, qy);
    const rx = Math.sqrt(Math.max(0, (r + qx) / 2));
    const ry = (qy >= 0 ? 1 : -1) * Math.sqrt(Math.max(0, (r - qx) / 2));
    let ax = (zx + rx) / 2;
    let ay = (zy + ry) / 2;
    if ((ax - mux) ** 2 + (ay - muy) ** 2 < R * R) { ax = (zx - rx) / 2; ay = (zy - ry) / 2; }
    const dx = ax - mux;
    const dy = ay - muy;
    const dd = dx * dx + dy * dy;
    if (dd < R * R * 1.0005) { out.inside = true; return out; }
    const i2x = (dx * dx - dy * dy) / (dd * dd);
    const i2y = (-2 * dx * dy) / (dd * dd);
    const Wx = ca - R * R * (ca * i2x - sa * i2y) + (k * dy) / dd;
    const Wy = -sa - R * R * (ca * i2y + sa * i2x) + (k * dx) / dd;
    // divide by dz/dζ = 1 − 1/ζ²
    const a2x = ax * ax - ay * ay;
    const a2y = 2 * ax * ay;
    const am = a2x * a2x + a2y * a2y;
    const Dx = 1 - a2x / am;
    const Dy = a2y / am;
    const Dm = Dx * Dx + Dy * Dy;
    const wx = (Wx * Dx + Wy * Dy) / Dm;
    const wy = (Wy * Dx - Wx * Dy) / Dm;
    // back to the screen-aligned plane
    let wsx = wx * ca - wy * sa;
    let wsy = wx * sa + wy * ca;
    // the pointer acts like a small round obstacle (a doublet)
    if (probe.on > 0.01) {
      const qx2 = sx - (probe.x - ox) / scale;
      const qy2 = sy + (probe.y - oy) / scale;
      const q2 = qx2 * qx2 + qy2 * qy2;
      if (q2 < pr * pr * 0.8 * probe.on) { out.inside = true; return out; }
      const s = (probe.on * pr * pr) / (q2 * q2);
      wsx -= s * (qx2 * qx2 - qy2 * qy2);
      wsy -= s * (-2 * qx2 * qy2);
    }
    out.inside = false;
    out.u = wsx;
    out.v = -wsy; // complex velocity is u − iv
    return out;
  }
  at.gamma = gamma;
  at.R = R;
  at.mu = [mux, muy];
  at.ca = ca;
  at.sa = sa;
  at.place = { ox, oy, scale };
  return at;
}

// Streamlines: seeded along the left edge, traced with fixed-length RK2 steps.
// Each point stores the local speed, so tracers can move at the true speed.
function traceLines() {
  field = makeField(P);
  const ds = portrait ? 6.5 : 6;
  const count = Math.round(Math.min(130, Math.max(60, H / (portrait ? 11 : 8.5))));
  const y0 = -0.12 * H;
  const y1 = 1.12 * H;
  const maxSteps = Math.ceil(((W + 80) / ds) * 1.7);
  const out = [];
  for (let j = 0; j < count; j++) {
    let x = -30;
    let y = y0 + ((y1 - y0) * (j + 0.5)) / count;
    const xs = new Float32Array(maxSteps);
    const ys = new Float32Array(maxSteps);
    const sp = new Float32Array(maxSteps);
    let n = 0;
    for (; n < maxSteps; n++) {
      let f = field(x, y);
      if (f.inside) break;
      let u = f.u;
      let v = -f.v; // screen y points down
      let s = Math.hypot(u, v);
      if (!(s > 0.015)) break;
      const mx = x + (u / s) * ds * 0.5;
      const my = y + (v / s) * ds * 0.5;
      f = field(mx, my);
      if (f.inside) break;
      u = f.u;
      v = -f.v;
      s = Math.hypot(u, v);
      if (!(s > 0.015) || !Number.isFinite(s)) break;
      xs[n] = x;
      ys[n] = y;
      sp[n] = Math.min(s, 3);
      x += (u / s) * ds;
      y += (v / s) * ds;
      if (x > W + 40 || y < -0.3 * H || y > 1.3 * H) { n++; break; }
    }
    if (n > 8) out.push({ xs, ys, sp, n });
  }
  // keep tracer progress (as a fraction) when the lines are recomputed
  for (let i = 0; i < out.length; i++) {
    const old = lines[i];
    out[i].tracer = old && old.tracer !== undefined ? (old.tracer / Math.max(1, old.n)) * out[i].n : Math.random() * out[i].n;
  }
  lines = out;
}

// ── Static layer: streamlines, body, plotter frame, caption ─
const SPEED_BINS = [0.7, 1.0, 1.35, Infinity];
function drawStatic() {
  const g = flow.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, W, H);
  const alphas = colors.dark ? [0.1, 0.16, 0.24, 0.34] : [0.1, 0.16, 0.25, 0.36];
  g.lineWidth = 1;
  g.lineCap = 'round';
  for (let b = 0; b < SPEED_BINS.length; b++) {
    const lo = b ? SPEED_BINS[b - 1] : -1;
    const hi = SPEED_BINS[b];
    g.beginPath();
    for (const L of lines) {
      for (let i = 1; i < L.n; i++) {
        const s = L.sp[i];
        if (s > lo && s <= hi) { g.moveTo(L.xs[i - 1], L.ys[i - 1]); g.lineTo(L.xs[i], L.ys[i]); }
      }
    }
    g.strokeStyle = rgba(colors.ink, alphas[b]);
    g.stroke();
  }
  drawBody(g);
  drawFrame(g);
}

function bodyPoint(theta) {
  const [mux, muy] = field.mu;
  const R = field.R;
  const zx0 = mux + R * Math.cos(theta);
  const zy0 = muy + R * Math.sin(theta);
  const m2 = zx0 * zx0 + zy0 * zy0;
  const zx = zx0 + zx0 / m2;
  const zy = zy0 - zy0 / m2;
  // z → s = z·e^{−iα} → screen
  const sx = zx * field.ca + zy * field.sa;
  const sy = -zx * field.sa + zy * field.ca;
  const { ox, oy, scale } = field.place;
  return [ox + sx * scale, oy - sy * scale, zx];
}

function drawBody(g) {
  const pts = [];
  let minZ = Infinity;
  let maxZ = -Infinity;
  let le = null;
  for (let i = 0; i <= 220; i++) {
    const p = bodyPoint((i / 220) * Math.PI * 2);
    pts.push(p);
    if (p[2] < minZ) { minZ = p[2]; le = p; }
    maxZ = Math.max(maxZ, p[2]);
  }
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  g.fillStyle = rgba(colors.paper, colors.dark ? 0.55 : 0.6);
  g.fill();
  g.lineWidth = 1.2;
  g.strokeStyle = rgba(colors.ink, 0.5);
  g.stroke();
  // chord line and angle-of-attack reference
  const te = pts[0];
  g.setLineDash([6, 4, 1.5, 4]);
  g.lineWidth = 0.8;
  g.strokeStyle = rgba(colors.ink, 0.35);
  g.beginPath();
  g.moveTo(le[0], le[1]);
  g.lineTo(te[0], te[1]);
  if (P.kutta > 0.5 && Math.abs(P.a) > 0.5) {
    const len = Math.hypot(te[0] - le[0], te[1] - le[1]);
    g.moveTo(le[0], le[1]);
    g.lineTo(le[0] + len * 0.45, le[1]);
  }
  g.stroke();
  g.setLineDash([]);
  field.chord = maxZ - minZ;
}

function drawFrame(g) {
  const inset = 14;
  const ink = colors.ink;
  g.save();
  g.strokeStyle = rgba(ink, 0.16);
  g.lineWidth = 1;
  g.strokeRect(inset + 0.5, inset + 0.5, W - inset * 2 - 1, H - inset * 2 - 1);
  // ruler ticks along the left and bottom edges
  g.beginPath();
  const step = 25;
  for (let x = inset; x < W - inset; x += step) {
    const major = Math.round((x - inset) / step) % 4 === 0;
    g.moveTo(x + 0.5, H - inset);
    g.lineTo(x + 0.5, H - inset - (major ? 9 : 4));
  }
  for (let y = inset; y < H - inset; y += step) {
    const major = Math.round((y - inset) / step) % 4 === 0;
    g.moveTo(inset, y + 0.5);
    g.lineTo(inset + (major ? 9 : 4), y + 0.5);
  }
  g.strokeStyle = rgba(ink, 0.2);
  g.stroke();
  // registration marks in the corners
  const reg = (x, y) => {
    g.beginPath();
    g.arc(x, y, 6, 0, Math.PI * 2);
    g.moveTo(x - 11, y); g.lineTo(x + 11, y);
    g.moveTo(x, y - 11); g.lineTo(x, y + 11);
    g.strokeStyle = rgba(ink, 0.28);
    g.stroke();
  };
  reg(inset + 22, inset + 22);
  reg(W - inset - 22, inset + 22);
  reg(inset + 22, H - inset - 22);
  reg(W - inset - 22, H - inset - 22);
  // figure caption (bottom left), with the real values
  if (!portrait) {
    const cl = field.chord ? (2 * field.gamma) / field.chord : 0;
    const scene = SCENES[sceneKey] || SCENES.about;
    g.fillStyle = rgba(ink, 0.45);
    g.font = '500 10px "IBM Plex Mono", ui-monospace, monospace';
    g.fillText(scene.fig, inset + 44, H - inset - 34);
    g.fillStyle = rgba(ink, 0.34);
    g.fillText(`α ${P.a.toFixed(1)}°   t/c ${P.t.toFixed(2)}   Γ ${field.gamma.toFixed(2)}   C_L ${cl.toFixed(2)}   POTENTIAL FLOW`, inset + 44, H - inset - 20);
  }
  g.restore();
}

// ── Moving layer: tracers and the pointer probe ─────────────
let lastFx = 0;
function drawFx(now) {
  const g = fxc.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, W, H);
  if (!started) return;
  const dt = Math.min(0.06, (now - lastFx) / 1000 || 0);
  lastFx = now;
  const rate = 20; // points per second at freestream speed
  const tail = 18;
  const head = 6;
  for (let j = 0; j < lines.length; j += 2) {
    const L = lines[j];
    if (!reduceMotion) {
      const i = Math.min(L.n - 1, Math.max(0, Math.floor(L.tracer)));
      L.tracer += L.sp[i] * rate * dt;
      if (L.tracer >= L.n - 1) L.tracer = 0;
    }
    const end = Math.floor(L.tracer);
    const start = Math.max(0, end - tail);
    if (end - start < 2) continue;
    const accent = j % 11 === 0;
    g.beginPath();
    g.moveTo(L.xs[start], L.ys[start]);
    for (let i = start + 1; i <= end - head; i++) g.lineTo(L.xs[i], L.ys[i]);
    g.strokeStyle = accent ? rgba(colors.accent, 0.35) : rgba(colors.ink, colors.dark ? 0.22 : 0.2);
    g.lineWidth = accent ? 1.6 : 1.3;
    g.stroke();
    g.beginPath();
    g.moveTo(L.xs[Math.max(start, end - head)], L.ys[Math.max(start, end - head)]);
    for (let i = Math.max(start, end - head) + 1; i <= end; i++) g.lineTo(L.xs[i], L.ys[i]);
    g.strokeStyle = accent ? rgba(colors.accent, 0.9) : rgba(colors.ink, colors.dark ? 0.6 : 0.55);
    g.lineWidth = accent ? 2 : 1.5;
    g.stroke();
  }
  // probe: a crosshair with the local airspeed and pressure coefficient
  if (finePointer && probe.on > 0.05 && field) {
    const f = field(probe.x + 60, probe.y);
    const x = probe.x;
    const y = probe.y;
    g.globalAlpha = Math.min(1, probe.on);
    g.strokeStyle = rgba(colors.ink, 0.45);
    g.lineWidth = 1;
    g.beginPath();
    g.arc(x, y, 46, 0, Math.PI * 2);
    g.moveTo(x - 58, y); g.lineTo(x - 50, y);
    g.moveTo(x + 50, y); g.lineTo(x + 58, y);
    g.moveTo(x, y - 58); g.lineTo(x, y - 50);
    g.moveTo(x, y + 50); g.lineTo(x, y + 58);
    g.stroke();
    if (!f.inside) {
      const v = Math.hypot(f.u, f.v);
      g.fillStyle = rgba(colors.ink, 0.55);
      g.font = '500 10px "IBM Plex Mono", ui-monospace, monospace';
      g.fillText(`|V|/U∞ ${v.toFixed(2)}`, x + 62, y - 6);
      g.fillText(`Cp ${(1 - v * v).toFixed(2)}`, x + 62, y + 8);
    }
    g.globalAlpha = 1;
  }
}

// ── Scenes, sizing, the loop ────────────────────────────────
function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth;
  H = window.innerHeight;
  portrait = W / H < 0.85;
  for (const c of [flow, fxc]) {
    c.width = Math.round(W * dpr);
    c.height = Math.round(H * dpr);
  }
  dirty = true;
}

const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const pick = (o) => Object.fromEntries(KEYS.map((k) => [k, o[k]]));

function setScene(key) {
  if (!SCENES[key] || key === sceneKey) return;
  sceneKey = key;
  if (bgEl) bgEl.dataset.scene = key;
  const to = pick(SCENES[key]);
  if (reduceMotion || !started) {
    Object.assign(P, to);
    morph = null;
    dirty = true;
    if (reduceMotion) tick(performance.now());
    return;
  }
  morph = { from: pick(P), to, start: performance.now(), dur: 1300 };
}

let lastMove = 0;
function tick(now) {
  // the pointer obstacle eases in and out
  const target = finePointer && now - lastMove < 1500 ? probe.target : 0;
  if (Math.abs(probe.on - target) > 0.01) { probe.on += (target - probe.on) * 0.12; dirty = true; }
  if (morph) {
    const t = Math.min(1, (now - morph.start) / morph.dur);
    const e = ease(t);
    for (const k of KEYS) P[k] = morph.from[k] + (morph.to[k] - morph.from[k]) * e;
    dirty = true;
    if (t >= 1) morph = null;
  }
  if (dirty) {
    dirty = false;
    traceLines();
    drawStatic();
  }
  if (now - lastFx >= 33 || reduceMotion) drawFx(now);
  if (!reduceMotion && document.visibilityState === 'visible') requestAnimationFrame(tick);
}

function startTunnel() {
  if (started) return;
  started = true;
  flow.classList.add('on');
  lastFx = performance.now();
  if (reduceMotion) { dirty = true; tick(performance.now()); }
}

function afterIntro(fn) {
  if (document.documentElement.classList.contains('intro-playing')) {
    document.addEventListener('introdone', fn, { once: true });
  } else {
    fn();
  }
}

// ── Parallax on scroll ──────────────────────────────────────
let scrollQueued = false;
function onScroll() {
  if (scrollQueued) return;
  scrollQueued = true;
  requestAnimationFrame(() => {
    scrollQueued = false;
    const tr = `translate3d(0, ${(Math.min(window.scrollY, 4000) * -0.04).toFixed(1)}px, 0)`;
    flow.style.transform = tr;
    fxc.style.transform = tr;
  });
}

if (flow && fxc) {
  readColors();
  resize();
  if (bgEl) bgEl.dataset.scene = sceneKey;
  document.addEventListener('scene', (e) => setScene(e.detail));
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resize(); if (reduceMotion) tick(performance.now()); }, 150);
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    readColors();
    dirty = true;
    if (reduceMotion) tick(performance.now());
  });
  if (document.fonts) document.fonts.ready.then(() => { dirty = true; if (reduceMotion) tick(performance.now()); });
  if (!reduceMotion) {
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') { lastFx = performance.now(); requestAnimationFrame(tick); }
    });
    if (finePointer) {
      window.addEventListener('pointermove', (e) => {
        probe.x = e.clientX;
        probe.y = e.clientY - Math.min(window.scrollY, 4000) * -0.04;
        probe.target = 1;
        lastMove = performance.now();
        dirty = true;
      }, { passive: true });
      document.addEventListener('pointerleave', () => { probe.target = 0; });
    }
    requestAnimationFrame(tick);
  } else {
    tick(performance.now());
  }
  afterIntro(() => setTimeout(startTunnel, 60));
}
