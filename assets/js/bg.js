// Poster background: twisting "speed ribbons" made of fine parallel lines,
// plus one thin red contrail. They draw themselves in on load and drift a
// little with scrolling and pointer movement. No images: everything is SVG.

const svg = document.getElementById('ribbons');
const NS = 'http://www.w3.org/2000/svg';
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Each ribbon is a list of anchor points [x, y, width]. A width that changes
// sign between two anchors makes the band twist, like paper streamers.
const LANDSCAPE = {
  view: '0 0 1440 900',
  ribbons: [
    { lines: 22, stroke: 1.05, delay: 0.0, pts: [[-160, -70, 70], [140, 70, 96], [430, 250, 8], [720, 330, -88], [1010, 290, -36], [1260, 170, 34], [1620, 110, 76]] },
    { lines: 18, stroke: 1, delay: 0.35, pts: [[-160, 360, 40], [130, 400, 78], [390, 540, -6], [650, 630, -70], [930, 650, -18], [1210, 560, 52], [1620, 430, 60]] },
    { lines: 14, stroke: 0.95, delay: 0.7, pts: [[230, -140, 26], [360, -10, 52], [500, 120, -24], [590, 270, -46], [560, 430, 8], [380, 570, 40], [120, 650, 30], [-180, 700, 22]] },
  ],
  trail: [[1580, 230], [1320, 320], [1070, 450], [1080, 620], [1280, 780], [1560, 860]],
};
const PORTRAIT = {
  view: '0 0 900 1600',
  ribbons: [
    { lines: 20, stroke: 1.05, delay: 0.0, pts: [[-140, -90, 56], [110, 150, 84], [350, 350, 4], [560, 520, -72], [760, 640, -30], [1040, 700, 56]] },
    { lines: 16, stroke: 1, delay: 0.35, pts: [[-140, 860, 36], [150, 930, 70], [380, 1100, -8], [560, 1270, -62], [760, 1360, -12], [1040, 1300, 50]] },
    { lines: 12, stroke: 0.95, delay: 0.7, pts: [[640, -140, 24], [660, 40, 46], [580, 230, -26], [430, 380, -40], [300, 520, 10], [120, 640, 30], [-160, 720, 20]] },
  ],
  trail: [[-80, 1500], [200, 1450], [380, 1480], [560, 1410], [760, 1440], [1000, 1370]],
};

// Smooth curve through points (Catmull-Rom converted to cubic Béziers).
function curve(P) {
  const f = (n) => n.toFixed(1);
  let d = `M${f(P[0][0])} ${f(P[0][1])}`;
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[i - 1] || P[i];
    const p1 = P[i];
    const p2 = P[i + 1];
    const p3 = P[i + 2] || p2;
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)}`
      + ` ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)}`
      + ` ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

function ribbonPaths(pts, n) {
  const anchors = pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    return { x: p[0], y: p[1], nx: -dy / len, ny: dx / len, w: p[2] };
  });
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1) - 0.5;
    out.push(curve(anchors.map((a) => [a.x + a.nx * a.w * t, a.y + a.ny * a.w * t])));
  }
  return out;
}

function el(name, attrs) {
  const e = document.createElementNS(NS, name);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}

let currentLayout = '';

function build() {
  if (!svg) return;
  const portrait = window.innerWidth / window.innerHeight < 0.85;
  const layout = portrait ? PORTRAIT : LANDSCAPE;
  const key = portrait ? 'p' : 'l';
  if (key === currentLayout) return;
  currentLayout = key;

  svg.classList.remove('drawn');
  svg.setAttribute('viewBox', layout.view);
  svg.replaceChildren();

  const all = [];
  layout.ribbons.forEach((r) => {
    const g = el('g', { class: 'rib' });
    ribbonPaths(r.pts, r.lines).forEach((d, i) => {
      const p = el('path', { d, 'stroke-width': r.stroke });
      p.style.setProperty('--delay', `${(r.delay + i * 0.018).toFixed(3)}s`);
      g.appendChild(p);
      all.push(p);
    });
    svg.appendChild(g);
  });

  const trail = el('g', { class: 'rib trail' });
  const tp = el('path', { d: curve(layout.trail), 'stroke-width': 1.6 });
  tp.style.setProperty('--delay', '1.1s');
  trail.appendChild(tp);
  svg.appendChild(trail);
  all.push(tp);

  for (const p of all) p.style.setProperty('--len', Math.ceil(p.getTotalLength() + 2));
  // Two frames later, start the draw-in transition.
  requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.add('drawn')));
}

// ── Parallax ────────────────────────────────────────────────
let px = 0;
let py = 0;
let ticking = false;

function apply() {
  ticking = false;
  const sy = Math.min(window.scrollY, 4000) * -0.06;
  svg.style.transform = `translate3d(${px.toFixed(1)}px, ${(sy + py).toFixed(1)}px, 0)`;
}
function queue() {
  if (!ticking) { ticking = true; requestAnimationFrame(apply); }
}

if (svg) {
  build();
  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(build, 200); });

  if (!reduceMotion) {
    window.addEventListener('scroll', queue, { passive: true });
    if (window.matchMedia('(pointer: fine)').matches) {
      window.addEventListener('pointermove', (e) => {
        px = (e.clientX / window.innerWidth - 0.5) * -18;
        py = (e.clientY / window.innerHeight - 0.5) * -12;
        queue();
      }, { passive: true });
    }
  }
}
