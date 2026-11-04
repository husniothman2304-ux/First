// Blueprint panel: an original technical drawing of a turbofan engine (side
// cut-away) that drafts itself when scrolled into view, then keeps running:
// the fan spins and airflow streams through the engine.
import { esc } from './ui.js';

const C = 260; // centre line (y)
const W = 1200;
const H = 560;

// Linear interpolation through [x, radius] points
function along(points, x) {
  if (x <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [x0, r0] = points[i - 1];
    const [x1, r1] = points[i];
    if (x <= x1) return r0 + ((r1 - r0) * (x - x0)) / (x1 - x0);
  }
  return points[points.length - 1][1];
}
const CASE = [[300, 66], [420, 58], [560, 46], [690, 46], [800, 62], [870, 66]];
const DRUM = [[285, 44], [560, 30], [700, 28], [870, 36]];

const f = (n) => Number(n.toFixed(1));
// d: draw delay in seconds
const draw = (d, path, extra = '') => `<path pathLength="1" data-draw style="--d:${d}s" d="${path}" ${extra}/>`;

function half(s) {
  const Y = (r) => f(C + s * r);
  const parts = [];
  // Nacelle (outer casing) and its inner wall
  parts.push(draw(0.1, `M118 ${Y(120)} C150 ${Y(152)} 260 ${Y(164)} 400 ${Y(160)} L760 ${Y(130)} C840 ${Y(122)} 900 ${Y(110)} 952 ${Y(96)}`));
  parts.push(draw(0.25, `M118 ${Y(120)} Q120 ${Y(112)} 134 ${Y(112)} C175 ${Y(138)} 262 ${Y(148)} 400 ${Y(145)} L760 ${Y(118)} C840 ${Y(110)} 900 ${Y(100)} 950 ${Y(90)} L952 ${Y(96)}`));
  // Spinner (nose cone)
  parts.push(draw(0.35, `M178 ${C} C184 ${Y(28)} 210 ${Y(44)} 244 ${Y(48)}`));
  // Fan case lines
  parts.push(draw(0.45, `M240 ${Y(48)} L240 ${Y(141)} M290 ${Y(46)} L290 ${Y(140)}`));
  // Core casing (splitter to core nozzle)
  parts.push(draw(0.55, `M300 ${Y(66)} L318 ${Y(80)} M300 ${Y(66)} C360 ${Y(66)} 420 ${Y(58)} 560 ${Y(46)} L690 ${Y(46)} C740 ${Y(50)} 800 ${Y(62)} 870 ${Y(66)} L950 ${Y(58)}`));
  // Rotor drum
  parts.push(draw(0.65, `M285 ${Y(44)} L560 ${Y(30)} L700 ${Y(28)} L870 ${Y(36)}`));
  // Combustion chamber with fuel injector and a flame
  parts.push(draw(1.3, `M572 ${Y(38)} C592 ${Y(50)} 650 ${Y(50)} 682 ${Y(38)} C650 ${Y(30)} 592 ${Y(30)} 572 ${Y(38)} Z`));
  parts.push(draw(1.45, `M586 ${Y(38)} q8 -4 16 0 t16 0 t16 0 t16 0 t16 0`, 'class="bp-flame"'));
  // Exhaust cone
  parts.push(draw(1.6, `M870 ${Y(36)} C918 ${Y(30)} 962 ${Y(14)} 1004 ${C}`));
  // Shafts: LP (long) and HP (short)
  parts.push(draw(1.0, `M250 ${Y(8)} L905 ${Y(8)}`, 'class="thin"'));
  parts.push(draw(1.1, `M405 ${Y(16)} L735 ${Y(16)}`, 'class="thin"'));
  return parts.join('');
}

// Blade rows: LP compressor, HP compressor, HP turbine, LP turbine
function stages() {
  const xs = [
    ...[322, 344, 366].map((x) => [x, 0.8]),
    ...[410, 432, 454, 476, 498, 520, 542].map((x, i) => [x, 0.95 + i * 0.05]),
    ...[702, 722].map((x, i) => [x, 1.5 + i * 0.06]),
    ...[752, 776, 800, 824, 848].map((x, i) => [x, 1.62 + i * 0.06]),
  ];
  let out = '';
  for (const [x, d] of xs) {
    for (const s of [-1, 1]) {
      const r1 = along(DRUM, x) + 2;
      const r2 = along(CASE, x) - 3;
      const y1 = f(C + s * r1);
      const y2 = f(C + s * r2);
      const top = Math.min(y1, y2);
      const h = f(Math.abs(y2 - y1));
      out += `<g class="bp-stage" style="--d:${d}s"><rect x="${x}" y="${top}" width="12" height="${h}"/>
        <path d="M${x} ${top} L${x + 12} ${f(top + h / 2)} M${x} ${f(top + h / 2)} L${x + 12} ${f(top + h)}"/></g>`;
    }
  }
  return out;
}

// Fan blades seen from the side: slanted strokes that slide to look like they spin
function fanBlades() {
  let lines = '';
  for (let y = C - 168; y <= C + 168; y += 14) {
    lines += `<path d="M246 ${y} C258 ${y + 2} 270 ${y + 6} 284 ${y + 10}"/>`;
  }
  return `
    <clipPath id="bpFanTop"><rect x="241" y="${C - 141}" width="48" height="${141 - 48}"/></clipPath>
    <clipPath id="bpFanBot"><rect x="241" y="${C + 48}" width="48" height="${141 - 48}"/></clipPath>
    <g class="bp-fan" style="--d:0.75s">
      <g clip-path="url(#bpFanTop)"><g class="bp-fan-blades">${lines}</g></g>
      <g clip-path="url(#bpFanBot)"><g class="bp-fan-blades">${lines}</g></g>
    </g>`;
}

const LABELS = [
  // [text, label x, label y, anchor x, anchor y, delay]
  ['AIR INLET', 40, 500, 70, C + 100, 2.0],
  ['FAN', 150, 46, 262, C - 120, 2.1],
  ['LP COMPRESSOR', 250, 500, 344, C + 55, 2.2],
  ['HP COMPRESSOR', 420, 46, 476, C - 46, 2.3],
  ['COMBUSTOR', 560, 500, 627, C + 42, 2.4],
  ['HP TURBINE', 640, 46, 712, C - 40, 2.5],
  ['LP TURBINE', 790, 46, 800, C - 52, 2.6],
  ['EXHAUST', 1010, 46, 1060, C - 74, 2.7],
];

function labels() {
  return LABELS.map(([t, lx, ly, ax, ay, d]) => {
    const w = t.length * 8.6 + 18;
    const midX = f(lx + w / 2);
    const fromY = ly < C ? ly + 12 : ly - 18;
    return `
      ${draw(d, `M${midX} ${fromY} L${ax} ${ay}`, 'class="thin"')}
      <circle class="bp-dot" style="--d:${d + 0.3}s" cx="${ax}" cy="${ay}" r="2.6"/>
      <g class="bp-label" style="--d:${d + 0.2}s">
        <rect x="${lx}" y="${ly - 18}" width="${f(w)}" height="28" rx="2"/>
        <text x="${f(lx + 9)}" y="${ly + 1}">${t}</text>
      </g>`;
  }).join('');
}

function arrows() {
  const head = (x, y) => `M${x - 8} ${y - 5} L${x} ${y} L${x - 8} ${y + 5}`;
  const flow = (d, path) => `<path class="bp-flow" style="--d:${d}s" d="${path}"/>`;
  return [
    // incoming air
    flow(2.9, `M30 ${C - 100} L104 ${C - 100}`), `<path class="bp-head" style="--d:2.9s" d="${head(108, C - 100)}"/>`,
    flow(2.9, `M30 ${C + 100} L104 ${C + 100}`), `<path class="bp-head" style="--d:2.9s" d="${head(108, C + 100)}"/>`,
    // bypass air
    flow(3.0, `M300 ${C - 100} C500 ${C - 104} 760 ${C - 90} 940 ${C - 76}`),
    flow(3.0, `M300 ${C + 100} C500 ${C + 104} 760 ${C + 90} 940 ${C + 76}`),
    // core air and exhaust
    flow(3.1, `M330 ${C - 52} C500 ${C - 46} 800 ${C - 50} 1004 ${C - 30}`),
    flow(3.1, `M330 ${C + 52} C500 ${C + 46} 800 ${C + 50} 1004 ${C + 30}`),
    flow(3.2, `M968 ${C - 70} L1140 ${C - 70}`), `<path class="bp-head" style="--d:3.2s" d="${head(1146, C - 70)}"/>`,
    flow(3.2, `M1012 ${C} L1150 ${C}`), `<path class="bp-head" style="--d:3.2s" d="${head(1156, C)}"/>`,
    flow(3.2, `M968 ${C + 70} L1140 ${C + 70}`), `<path class="bp-head" style="--d:3.2s" d="${head(1146, C + 70)}"/>`,
  ].join('');
}

function dimensions() {
  const tick = (x1, y1, x2, y2) => `M${x1} ${y1} L${x2} ${y2}`;
  return `
    ${draw(2.8, `M118 452 L952 452 ${tick(118, 444, 118, 460)} ${tick(952, 444, 952, 460)}`, 'class="thin"')}
    <text class="bp-dim" style="--d:3.0s" x="535" y="446" text-anchor="middle">2.84 m</text>
    ${draw(2.85, `M96 ${C - 141} L96 ${C + 141} ${tick(88, C - 141, 104, C - 141)} ${tick(88, C + 141, 104, C + 141)}`, 'class="thin"')}
    <text class="bp-dim" style="--d:3.0s" x="88" y="${C}" text-anchor="middle" transform="rotate(-90 88 ${C})">Ø 1.20 m</text>`;
}

function titleBlock(name) {
  const date = new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(new Date()).toUpperCase();
  const x = 820;
  const y = 474;
  return `
    <g class="bp-title" style="--d:3.1s">
      <rect x="${x}" y="${y}" width="340" height="72"/>
      <path d="M${x} ${y + 34} L${x + 340} ${y + 34} M${x + 132} ${y + 34} L${x + 132} ${y + 72}"/>
      <text class="big" x="${x + 12}" y="${y + 24}">TURBOFAN STUDY</text>
      <text x="${x + 12}" y="${y + 50}">DWG HO-001</text>
      <text x="${x + 12}" y="${y + 65}">SCALE 1:20</text>
      <text x="${x + 144}" y="${y + 50}">DRAWN ${esc(String(name || '').toUpperCase().slice(0, 16))}</text>
      <text x="${x + 144}" y="${y + 65}">${date}</text>
    </g>`;
}

export function blueprintHTML(name) {
  return `
    <section class="block blueprint-block">
      <div class="block-head">
        <div>
          <span class="eyebrow">Blueprint / How thrust is made</span>
          <h2>Turbofan study</h2>
        </div>
      </div>
      <div class="blueprint" aria-label="Animated technical drawing of a turbofan jet engine">
        <div class="bp-scroll">
          <svg class="bp" viewBox="0 0 ${W} ${H}" role="img" aria-label="Turbofan engine cut-away: air enters the fan, passes the compressors, combustor and turbines, and leaves through the exhaust.">
            <path class="bp-center" d="M60 ${C} L1170 ${C}"/>
            ${half(-1)}${half(1)}
            ${fanBlades()}
            ${stages()}
            ${arrows()}
            ${labels()}
            ${dimensions()}
            ${titleBlock(name)}
          </svg>
        </div>
        <p class="bp-hint">Swipe to explore the drawing</p>
      </div>
    </section>`;
}

// Starts the drafting animation when a blueprint scrolls into view.
const watcher = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    watcher.unobserve(en.target);
    en.target.classList.add('play');
  }), { threshold: 0.25 })
  : null;

export function playBlueprints(root) {
  root.querySelectorAll('.blueprint:not(.play)').forEach((el) => {
    const start = () => (watcher ? watcher.observe(el) : el.classList.add('play'));
    if (document.documentElement.classList.contains('intro-playing')) {
      document.addEventListener('introdone', start, { once: true });
    } else {
      start();
    }
  });
}
