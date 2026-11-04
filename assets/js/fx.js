// Small interaction effects (desktop pointer effects are skipped on touch screens):
//  - a thin scroll-progress line at the top of the screen
//  - a spotlight + glowing edge that follows the pointer over cards
//  - main buttons that lean slightly toward the pointer
//  - the hero turbine tilting in 3D with the pointer
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(pointer: fine)').matches;

// Scroll progress
const bar = document.getElementById('progress');
let queued = false;
function updateProgress() {
  queued = false;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
  if (bar) bar.style.transform = `scaleX(${p.toFixed(4)})`;
}
window.addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(updateProgress); } }, { passive: true });
window.addEventListener('hashchange', () => requestAnimationFrame(updateProgress));
updateProgress();

if (finePointer && !reduceMotion) {
  let magnet = null;

  document.addEventListener('pointermove', (e) => {
    // Card spotlight: tell the card where the pointer is
    const card = e.target.closest('.card, .note, .thread, .pick, .photo');
    if (card) {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    }

    // Magnetic main buttons
    const btn = e.target.closest('.btn.primary');
    if (btn !== magnet && magnet) { magnet.style.transform = ''; }
    magnet = btn;
    if (btn) {
      const r = btn.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) * 0.18;
      const dy = (e.clientY - (r.top + r.height / 2)) * 0.28;
      btn.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
    }

    // Turbine tilt (only while the pointer is over the hero)
    const hero = e.target.closest('.hero-pro');
    const turbine = hero && hero.querySelector('.turbine');
    if (turbine) {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      turbine.style.setProperty('--ry', `${(-16 + x * 26).toFixed(1)}deg`);
      turbine.style.setProperty('--rx', `${(6 - y * 18).toFixed(1)}deg`);
    }
  }, { passive: true });

  document.addEventListener('pointerleave', () => { if (magnet) magnet.style.transform = ''; magnet = null; });
}
