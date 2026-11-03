// Small UI helpers shared across the app.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

// Images saved in the database are referenced as "#fsimg-<id>". The page
// renders them with data-fsimg="<id>" and app.js swaps in the real image.
const FS_IMG = /^#fsimg-([A-Za-z0-9]{1,40})$/;
export const fsImageId = (u) => { const m = FS_IMG.exec(String(u || '').trim()); return m ? m[1] : ''; };
export const hasImg = (u) => !!(fsImageId(u) || safeUrl(u));
export function imgSrc(u) {
  const id = fsImageId(u);
  if (id) return `data-fsimg="${id}"`;
  const s = safeUrl(u);
  return s ? `src="${esc(s)}"` : '';
}

// Markdown → sanitised HTML. Without the sanitiser it falls back to plain text.
export function md(text) {
  const src = String(text || '');
  if (!window.marked || !window.DOMPurify) return `<p>${esc(src).replace(/\n/g, '<br>')}</p>`;
  const html = window.DOMPurify.sanitize(window.marked.parse(src, { gfm: true, breaks: true }));
  if (!html.includes('#fsimg-')) return html;
  const t = document.createElement('template'); // inert: nothing loads while we rewrite
  t.innerHTML = html;
  t.content.querySelectorAll('img[src^="#fsimg-"]').forEach((img) => {
    const id = fsImageId(img.getAttribute('src'));
    img.removeAttribute('src');
    if (id) img.dataset.fsimg = id;
  });
  return t.innerHTML;
}

// Markdown → plain text (for excerpts). <template> keeps images from loading.
export function plain(text) {
  const t = document.createElement('template');
  t.innerHTML = md(text);
  return t.content.textContent || '';
}

// Allows only http(s) links, and data: URLs for images (used by demo mode).
export function safeUrl(u) {
  if (!u) return '';
  const s = String(u).trim();
  if (/^data:image\/(png|jpe?g|gif|webp);/i.test(s)) return s;
  try {
    const url = new URL(s, location.href);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

export function fmtDate(ms, withTime = false) {
  const opts = { year: 'numeric', month: 'short', day: 'numeric' };
  if (withTime) Object.assign(opts, { hour: 'numeric', minute: '2-digit' });
  try { return new Intl.DateTimeFormat(undefined, opts).format(new Date(ms)); } catch { return ''; }
}

export function debounce(fn, wait = 150) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), wait); };
}

// localStorage that never throws (private windows, blocked storage).
export const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, String(v)); } catch { /* ignore */ } },
};

export function friendlyError(e) {
  const code = (e && e.code) || '';
  if (code === 'permission-denied' || code === 'storage/unauthorized') return "You don't have permission to do that.";
  if (code === 'auth/popup-blocked') return 'Your browser blocked the sign-in popup. Allow popups for this site and try again.';
  if (code === 'auth/unauthorized-domain') return `Sign-in isn't allowed on ${location.hostname} yet. Add it in Firebase → Authentication → Settings → Authorized domains.`;
  if (code === 'auth/operation-not-allowed') return 'Google sign-in is turned off. Turn it on in Firebase → Authentication → Sign-in method.';
  if (code === 'auth/network-request-failed') return "Couldn't reach Google. Check your connection, or turn off Brave Shields for this site, and try again.";
  if (code === 'unavailable') return "Can't reach the server. Check your connection and try again.";
  return (e && e.message) || 'Something went wrong.';
}

// ── Icons ───────────────────────────────────────────────────
const PATHS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
  projects: '<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>',
  notes: '<path d="M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/><path d="M8.5 13h7M8.5 17h5"/>',
  blog: '<path d="M4 20h4L19 9a2.83 2.83 0 0 0-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
  photos: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8.5" cy="9.5" r="1.8"/><path d="M21 16l-5-5-9 9"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3.5 7.5l8.5 6 8.5-6"/>',
  inbox: '<path d="M3 13l3-8h12l3 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z"/><path d="M3 13h5l1.5 3h5L16 13h5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  out: '<path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3"/><path d="M14 8l4 4-4 4M18 12H9"/>',
  edit: '<path d="M4 20h4L19 9a2.83 2.83 0 0 0-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
};
export const icon = (name, cls = '') =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name] || ''}</svg>`;

// ── Toasts ──────────────────────────────────────────────────
export function toast(msg, kind = 'ok', ms = kind === 'error' ? 9000 : 3200) {
  const host = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast glass-strong ${kind}`;
  el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  el.textContent = msg;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  const close = () => { el.classList.remove('show'); setTimeout(() => el.remove(), 250); };
  if (ms) setTimeout(close, ms);
  return { close, update: (m) => { el.textContent = m; } };
}

// ── Modals ──────────────────────────────────────────────────
// locked: clicking outside or pressing Escape does not close it (editors).
export function openModal({ title, body, wide = false, locked = false, onMount, onClose }) {
  const root = document.createElement('div');
  root.className = 'modal-backdrop';
  root.innerHTML = `
    <div class="modal glass-strong ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="modal-head"><h2>${esc(title)}</h2>
        <button type="button" class="icon-btn" data-close aria-label="Close">${icon('x')}</button></div>
      <div class="modal-body">${body}</div>
    </div>`;
  document.body.appendChild(root);
  document.body.classList.add('modal-open');
  const prevFocus = document.activeElement;
  let closed = false;

  const onKey = (e) => { if (e.key === 'Escape' && !locked && root === lastModal()) close(); };
  function close() {
    if (closed) return;
    closed = true;
    root.classList.add('closing');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => root.remove(), 200);
    if (!document.querySelector('.modal-backdrop:not(.closing)')) document.body.classList.remove('modal-open');
    if (prevFocus && prevFocus.focus) prevFocus.focus();
    if (onClose) onClose();
  }

  document.addEventListener('keydown', onKey);
  root.addEventListener('mousedown', (e) => { if (e.target === root && !locked) close(); });
  root.querySelector('[data-close]').addEventListener('click', close);
  if (onMount) onMount(root.querySelector('.modal-body'), close);
  requestAnimationFrame(() => {
    root.classList.add('open');
    const first = root.querySelector('.modal-body input:not([type=file]):not([type=checkbox]):not(.hp), .modal-body textarea, .modal-body button');
    if (first) first.focus();
  });
  return close;
}
const lastModal = () => { const all = $$('.modal-backdrop:not(.closing)'); return all[all.length - 1]; };

export function confirmDialog(message, { ok = 'Delete', danger = true } = {}) {
  return new Promise((resolve) => {
    let answer = false;
    openModal({
      title: 'Are you sure?',
      body: `<p class="confirm-text">${esc(message)}</p>
        <div class="row end">
          <button type="button" class="btn" data-x="no">Cancel</button>
          <button type="button" class="btn ${danger ? 'danger-solid' : 'primary'}" data-x="yes">${esc(ok)}</button>
        </div>`,
      onMount(el, close) {
        el.querySelector('[data-x=no]').onclick = close;
        el.querySelector('[data-x=yes]').onclick = () => { answer = true; close(); };
      },
      onClose: () => resolve(answer),
    });
  });
}

// ── Images ──────────────────────────────────────────────────
// Shrinks photos before upload so pages stay fast. GIFs are kept as they are
// unless forceJpeg is set.
export async function resizeImage(file, max = 2000, quality = 0.86, keepUnder = 1.5e6, forceJpeg = false) {
  const type = file.type || '';
  if (!/^image\/(jpeg|png|webp|gif|heic|heif|avif)$/i.test(type)) {
    throw new Error('Please choose a JPG, PNG, WebP or GIF image.');
  }
  if (type === 'image/gif' && !forceJpeg) return file;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Couldn't read that image. Try a JPG or PNG."));
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const outType = type === 'image/png' && !forceJpeg ? 'image/png' : 'image/jpeg';
    if (scale === 1 && file.size <= keepUnder && outType === type) return file;
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    if (outType === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); }
    g.drawImage(img, 0, 0, w, h);
    const blob = await new Promise((r) => c.toBlob(r, outType, quality));
    return blob || file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(new Error('Could not read the image.'));
  r.readAsDataURL(blob);
});

// Re-encodes as JPEG, trying smaller sizes until the data URL fits in maxBytes.
export async function fitDataUrl(file, steps, maxBytes) {
  for (const [max, quality] of steps) {
    const url = await blobToDataUrl(await resizeImage(file, max, quality, 0, true));
    if (url.length <= maxBytes) return url;
  }
  throw new Error('That image is too large to save. Try a smaller one.');
}
