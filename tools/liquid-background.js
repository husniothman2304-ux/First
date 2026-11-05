// Generates the site background artwork (assets/img/liquid-wide.jpg and liquid-tall.jpg).
// Run with Node + Playwright from this folder, then convert the PNGs to JPEG:
//   node liquid-background.js && ffmpeg -i liquid-wide.png -q:v 4 liquid-wide.jpg (same for liquid-tall)
// Generates an original "liquid chrome glass" artwork as SVG, renders it to JPEG.
const { chromium } = require('playwright');
const fs = require('fs');

function rng(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

// Smooth closed blob through n points (Catmull-Rom → Bézier)
function blob(cx, cy, rx, ry, rot, n, wob, r) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + (r() - 0.5) * wob + (i % 2 ? -wob * 0.35 : wob * 0.2);
    const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k;
    pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const t = 0.18 * 6 / 6;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + 'Z';
}

function art(W, H, seed, layout) {
  const r = rng(seed);
  const s = Math.min(W, H);
  let defs = `
    <filter id="b18" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${s * 0.012}"/></filter>
    <filter id="b6" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${s * 0.0045}"/></filter>
    <filter id="b2" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${s * 0.0016}"/></filter>
    <filter id="b05" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="0.6"/></filter>
    <radialGradient id="vig" cx="50%" cy="45%" r="75%"><stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".85"/></radialGradient>
    <radialGradient id="amb" cx="30%" cy="20%" r="80%"><stop offset="0" stop-color="#1b1f27"/><stop offset=".55" stop-color="#07080a"/><stop offset="1" stop-color="#030304"/></radialGradient>`;
  let body = '';
  layout.forEach((b, i) => {
    const d = blob(b.x * W, b.y * H, b.rx * s, b.ry * s, b.rot, b.n || 8, b.wob || 0.5, r);
    const ang = Math.round(r() * 360);
    defs += `
      <linearGradient id="hl${i}" gradientUnits="objectBoundingBox" gradientTransform="rotate(${ang} .5 .5)">
        <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".18" stop-color="#fff" stop-opacity=".95"/>
        <stop offset=".3" stop-color="#cfe0ff" stop-opacity=".15"/><stop offset=".52" stop-color="#fff" stop-opacity=".0"/>
        <stop offset=".7" stop-color="#fff" stop-opacity=".85"/><stop offset=".8" stop-color="#ffe9d6" stop-opacity=".2"/>
        <stop offset="1" stop-color="#fff" stop-opacity=".6"/></linearGradient>
      <linearGradient id="bd${i}" gradientUnits="objectBoundingBox" gradientTransform="rotate(${ang + 40} .5 .5)">
        <stop offset="0" stop-color="#8a93a6"/><stop offset=".35" stop-color="#1c2027"/><stop offset=".6" stop-color="#5d6575"/><stop offset="1" stop-color="#0d0f13"/></linearGradient>
      <radialGradient id="in${i}" cx="${30 + r() * 40}%" cy="${25 + r() * 30}%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity=".07"/><stop offset=".6" stop-color="#9fb3d9" stop-opacity=".02"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`;
    const w = s * (b.w || 0.026);
    // highlight streaks: dash patterns along the rim (pathLength = 100)
    const dash = () => { let out = []; let t = 0; while (t < 100) { const g = 3 + r() * 14, l = 2 + r() * 13; out.push(g.toFixed(1), l.toFixed(1)); t += g + l; } return out.join(' '); };
    const d1 = dash(), d2 = dash(), off = (r() * 100).toFixed(1);
    defs += `<clipPath id="cp${i}"><path d="${d}"/></clipPath>`;
    body += `
      <g>
        <path d="${d}" fill="#000" fill-opacity=".6" stroke="#000" stroke-width="${w * 3.4}" stroke-opacity=".95" filter="url(#b18)"/>
        <g clip-path="url(#cp${i})">
          <path d="${d}" fill="url(#in${i})"/>
          <path d="${d}" fill="none" stroke="#2c323d" stroke-width="${w * 3.2}" filter="url(#b18)" opacity=".9"/>
          <path d="${d}" fill="none" stroke="url(#hl${i})" stroke-width="${w * 1.6}" filter="url(#b18)" opacity=".28"/>
          <path d="${d}" pathLength="100" fill="none" stroke="#fff" stroke-width="${w * 0.9}" stroke-dasharray="${d2}" stroke-dashoffset="${off}" filter="url(#b6)" opacity=".18"/>
        </g>
        <path d="${d}" fill="none" stroke="url(#bd${i})" stroke-width="${w * 0.75}" filter="url(#b2)" opacity=".95"/>
        <path d="${d}" fill="none" stroke="#07080a" stroke-width="${w * 0.32}" filter="url(#b2)"/>
        <path d="${d}" fill="none" stroke="url(#hl${i})" stroke-width="${w * 0.36}" filter="url(#b2)" opacity=".55"/>
        <path d="${d}" pathLength="100" fill="none" stroke="#fff" stroke-width="${w * 0.42}" stroke-linecap="round" stroke-dasharray="${d1}" stroke-dashoffset="${off}" filter="url(#b6)" opacity=".55"/>
        <path d="${d}" pathLength="100" fill="none" stroke="#fff" stroke-width="${w * 0.16}" stroke-linecap="round" stroke-dasharray="${d1}" stroke-dashoffset="${off}" filter="url(#b2)" opacity=".9"/>
        <path d="${d}" fill="none" stroke="url(#hl${i})" stroke-width="${Math.max(1, w * 0.06)}" filter="url(#b05)" opacity=".8"/>
        <path d="${d}" pathLength="100" fill="none" stroke="#dfe8ff" stroke-width="${Math.max(0.8, w * 0.05)}" stroke-dasharray="${d2}" stroke-opacity=".45" transform="translate(${w * 0.38} ${w * 0.38})" filter="url(#b05)"/>
      </g>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defs}</defs>
    <rect width="100%" height="100%" fill="url(#amb)"/>${body}<rect width="100%" height="100%" fill="url(#vig)"/></svg>`;
}

const LAND = [
  { x: .2, y: .22, rx: .34, ry: .2, rot: .5, n: 9, wob: .55 },
  { x: .56, y: .1, rx: .3, ry: .16, rot: -.35, n: 8, wob: .6 },
  { x: .88, y: .3, rx: .28, ry: .17, rot: 1.1, n: 8, wob: .55 },
  { x: .12, y: .72, rx: .3, ry: .17, rot: -.7, n: 8, wob: .6 },
  { x: .48, y: .58, rx: .34, ry: .18, rot: .25, n: 9, wob: .55 },
  { x: .85, y: .8, rx: .3, ry: .18, rot: -.45, n: 8, wob: .6 },
  { x: .4, y: 1.02, rx: .3, ry: .15, rot: .1, n: 8, wob: .5 },
];
const PORT = [
  { x: .3, y: .1, rx: .45, ry: .22, rot: .55, n: 8, wob: .55 },
  { x: .85, y: .3, rx: .42, ry: .2, rot: -.9, n: 8, wob: .6 },
  { x: .2, y: .5, rx: .4, ry: .22, rot: 1.15, n: 9, wob: .55 },
  { x: .78, y: .66, rx: .44, ry: .2, rot: -.6, n: 8, wob: .6 },
  { x: .3, y: .9, rx: .44, ry: .2, rot: .35, n: 8, wob: .55 },
];

(async () => {
  const b = await chromium.launch();
  for (const [name, W, H, L, seed] of [['liquid-wide', 2560, 1600, LAND, 11], ['liquid-tall', 1290, 2400, PORT, 23]]) {
    const svg = art(W, H, seed, L);
    fs.writeFileSync(name + '.svg', svg);
    const p = await (await b.newContext({ viewport: { width: W, height: H } })).newPage();
    await p.setContent(`<html><body style="margin:0;background:#000">${svg}</body></html>`);
    await p.waitForTimeout(300);
    await p.screenshot({ path: name + '.png' });
  }
  await b.close();
})();
