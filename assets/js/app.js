import { loadBackend } from './backend.js';
import { mountChat } from './chat.js';
import { DEFAULT_PROFILE } from './config.js';
import {
  $, $$, esc, md, plain, safeUrl, imgSrc, hasImg, fsImageId, fmtDate, debounce, store, friendlyError,
  icon, toast, openModal, confirmDialog, resizeImage,
} from './ui.js';

// ── Setup ───────────────────────────────────────────────────
let api;
try {
  api = await loadBackend();
} catch (e) {
  console.error(e);
  document.getElementById('view').innerHTML =
    `<div class="empty glass">${icon('x', 'xl')}<h2>Couldn't load the site</h2><p class="muted">${esc(friendlyError(e))}</p></div>`;
  throw e;
}

const SECTIONS = [
  { key: 'projects', type: 'project', label: 'Projects', one: 'project', many: 'projects', icon: 'projects', blurb: 'Things I have built and am building.' },
  { key: 'notes', type: 'note', label: 'Notes', one: 'note', many: 'notes', icon: 'notes', blurb: 'Short notes on what I am learning.' },
  { key: 'blog', type: 'blog', label: 'Blog', one: 'post', many: 'blog posts', icon: 'blog', blurb: 'Longer thoughts and stories.' },
  { key: 'photos', type: 'photo', label: 'Photos', one: 'photo', many: 'photos', icon: 'photos', blurb: 'Moments worth keeping.' },
];
const byKey = Object.fromEntries(SECTIONS.map((s) => [s.key, s]));
const byType = Object.fromEntries(SECTIONS.map((s) => [s.type, s]));
const HOME_LIMIT = { project: 3, note: 4, blog: 3, photo: 6 };

const state = {
  user: null, owner: false, profile: { ...DEFAULT_PROFILE }, nav: '',
  unread: 0, unreadLegacy: 0, unreadThreads: 0, guestUnread: false,
};
let viewCleanups = [];
let routeToken = 0;

// ── Small render helpers ────────────────────────────────────
const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => (w[0] || '').toUpperCase()).join('') || '•';

function hue(s = '') {
  let h = 0;
  for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

function excerpt(text, n = 160) {
  const t = plain(text).replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n).replace(/\s\S*$/, '') + '…' : t;
}

const itemHref = (i) => `#/p/${encodeURIComponent(i.id)}`;

function avatarHTML(p, size) {
  return hasImg(p.avatarUrl)
    ? `<img class="avatar ${size}" ${imgSrc(p.avatarUrl)} alt="">`
    : `<span class="avatar ${size} initials" aria-hidden="true">${esc(initials(p.name))}</span>`;
}

const draftBadge = (i) => (i.published ? '' : '<span class="pill draft">Draft</span>');

const tagsHTML = (tags) =>
  tags && tags.length ? `<div class="tags">${tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join('')}</div>` : '';

function coverHTML(i) {
  const thumb = i.thumbUrl || i.imageUrl;
  if (hasImg(thumb)) return `<div class="cover"><img ${imgSrc(thumb)} alt="" loading="lazy"></div>`;
  const letter = (i.title || '?').trim().charAt(0).toUpperCase();
  return `<div class="cover placeholder" style="--h:${hue(i.id)}"><span>${esc(letter)}</span></div>`;
}

function render(ctx, html) {
  if (ctx.stale()) return false;
  ctx.view.innerHTML = html;
  $$('.prose a[href^="http"]', ctx.view).forEach((a) => { a.target = '_blank'; a.rel = 'noopener noreferrer'; });
  revealOnScroll(ctx.view);
  return true;
}

// ── Scroll-in animation ─────────────────────────────────────
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const revealer = !reduceMotion && 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      revealer.unobserve(el);
      el.classList.add('in');
      // Hand the element back to its normal hover effects once it has landed.
      setTimeout(() => el.classList.remove('reveal', 'in'), 1100 + (parseInt(el.style.getPropertyValue('--rd'), 10) || 0));
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' })
  : null;

// Runs fn now, or once the logo intro has finished playing.
function afterIntro(fn) {
  if (document.documentElement.classList.contains('intro-playing')) {
    document.addEventListener('introdone', fn, { once: true });
  } else {
    fn();
  }
}

function revealOnScroll(root) {
  if (!revealer) return;
  if (document.documentElement.classList.contains('intro-playing')) {
    afterIntro(() => { if (root.isConnected) revealOnScroll(root); });
    return;
  }
  $$('.block, #list .card, #list .note, #list .photo, .page-head, .article, .comments, .contact, .msg', root)
    .forEach((el, i) => {
      el.classList.add('reveal');
      el.style.setProperty('--rd', `${(i % 6) * 70}ms`);
      revealer.observe(el);
    });
}

// ── Cards ───────────────────────────────────────────────────
const projectCard = (i) => `
  <a class="card glass" href="${itemHref(i)}">
    ${coverHTML(i)}
    <div class="card-body">
      <h3>${esc(i.title)} ${draftBadge(i)}</h3>
      <p>${esc(i.summary || excerpt(i.body, 120))}</p>
      ${tagsHTML(i.tags)}
    </div>
  </a>`;

const blogCard = (i) => `
  <a class="card glass" href="${itemHref(i)}">
    ${hasImg(i.imageUrl) ? coverHTML(i) : ''}
    <div class="card-body">
      <time class="meta">${fmtDate(i.createdAt)}</time>
      <h3>${esc(i.title)} ${draftBadge(i)}</h3>
      <p>${esc(i.summary || excerpt(i.body, 160))}</p>
      ${tagsHTML(i.tags)}
    </div>
  </a>`;

const noteRow = (i) => `
  <a class="note glass" href="${itemHref(i)}">
    <div>
      <h3>${esc(i.title)} ${draftBadge(i)}</h3>
      <p>${esc(excerpt(i.body, 140))}</p>
    </div>
    <time class="meta">${fmtDate(i.createdAt)}</time>
  </a>`;

const photoTile = (i) => `
  <a class="photo" href="${itemHref(i)}">
    <img ${imgSrc(i.thumbUrl || i.imageUrl)} alt="${esc(i.title || 'Photo')}" loading="lazy">
    ${i.title ? `<span class="caption">${esc(i.title)}</span>` : ''}
    ${i.published ? '' : '<span class="pill draft corner">Draft</span>'}
  </a>`;

function sectionBody(s, items) {
  if (s.type === 'project') return `<div class="grid">${items.map(projectCard).join('')}</div>`;
  if (s.type === 'blog') return `<div class="grid">${items.map(blogCard).join('')}</div>`;
  if (s.type === 'note') return `<div class="notes">${items.map(noteRow).join('')}</div>`;
  return `<div class="gallery">${items.map(photoTile).join('')}</div>`;
}

function newButton(s) {
  return s.type === 'photo'
    ? `<button class="btn primary" data-act="upload-photos">${icon('plus')} Upload photos</button>`
    : `<button class="btn primary" data-act="new-type" data-type="${s.type}">${icon('plus')} New ${s.one}</button>`;
}

const emptyHTML = (s) => `
  <div class="empty glass">
    ${icon(s.icon, 'xl')}
    <p>${state.owner ? `You haven't added any ${s.many} yet.` : 'Nothing here yet. Check back soon.'}</p>
    ${state.owner ? newButton(s) : ''}
  </div>`;

// ── Chrome (header, tab bar, footer, banner) ────────────────
function renderChrome() {
  const p = state.profile;
  document.title = p.name || 'My website';
  $('#brand').innerHTML = `${avatarHTML(p, 'sm')}<span>${esc(p.name)}</span>`;

  const links = [
    { key: '', label: 'Home', icon: 'home' },
    ...SECTIONS.map((s) => ({ key: s.key, label: s.label, icon: s.icon })),
    { key: 'contact', label: 'Contact', icon: 'mail' },
  ];
  const dot = (l) => (l.key === 'contact' && state.guestUnread ? '<span class="dot-new" aria-label="New reply"></span>' : '');
  $('#nav-links').innerHTML = links.map((l) => `<a href="#/${l.key}" data-nav="${l.key}">${esc(l.label)}${dot(l)}</a>`).join('');
  $('#tabbar').innerHTML = links.map((l) => `<a href="#/${l.key}" data-nav="${l.key}">${icon(l.icon)}<span>${esc(l.label)}</span>${dot(l)}</a>`).join('');

  $('#nav-actions').innerHTML = state.owner ? `
    <button class="icon-btn" data-act="new" title="Add something" aria-label="Add something">${icon('plus')}</button>
    <a class="icon-btn" href="#/inbox" title="Inbox" aria-label="Inbox${state.unread ? `, ${state.unread} unread` : ''}">
      ${icon('inbox')}${state.unread ? `<span class="badge">${state.unread}</span>` : ''}</a>
    <button class="icon-btn" data-act="signout" title="Sign out" aria-label="Sign out">${icon('out')}</button>` : '';

  $('#footer').innerHTML = `
    <span>© ${new Date().getFullYear()} ${esc(p.name)}</span>
    ${state.user
      ? `<button class="link-btn" data-act="signout">Sign out</button>`
      : `<button class="link-btn" data-act="signin">${icon('lock')} Owner sign in</button>`}`;
  setNav(state.nav);
}

function setNav(key) {
  state.nav = key;
  $$('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === key));
}

function renderBanner() {
  let html = '';
  if (api.mode === 'demo') {
    html = `<div class="banner glass"><strong>Demo mode.</strong> Everything is saved only in this browser.
      ${state.user ? '' : 'Use <em>Owner sign in</em> at the bottom of the page to try editing.'}
      Connect Firebase (see the README) to go live.</div>`;
  } else if (state.user && !state.owner) {
    html = `<div class="banner glass warn">Signed in as <strong>${esc(state.user.email || state.user.name)}</strong>, which isn't the owner account.
      If this is you, put your user ID <code>${esc(state.user.uid)}</code>
      <button class="btn sm" data-act="copy" data-text="${esc(state.user.uid)}">Copy</button>
      into <code>firestore.rules</code>, then publish the rules.</div>`;
  }
  $('#banner').innerHTML = html;
}

async function refreshUnread() {
  state.unreadLegacy = 0;
  if (state.owner) {
    try {
      state.unreadLegacy = (await api.listMessages()).filter((m) => !m.read).length;
    } catch (e) {
      console.warn(e);
    }
  }
  state.unread = state.unreadLegacy + (state.unreadThreads || 0);
}

// ── Router ──────────────────────────────────────────────────
async function route({ keepScroll = false } = {}) {
  const token = ++routeToken;
  const [seg = '', arg = ''] = location.hash.replace(/^#\/?/, '').split('/');
  const view = $('#view');
  // Stop live listeners from the previous page (open chats etc.)
  viewCleanups.forEach((fn) => { try { fn(); } catch { /* ignore */ } });
  viewCleanups = [];
  const ctx = {
    view,
    stale: () => token !== routeToken,
    cleanup: (fn) => { if (token !== routeToken) fn(); else viewCleanups.push(fn); },
  };

  setNav(seg === 'p' ? state.nav : seg);
  if (!keepScroll) {
    window.scrollTo(0, 0);
    view.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  }
  try {
    if (!seg) await viewHome(ctx);
    else if (byKey[seg]) await viewSection(ctx, byKey[seg]);
    else if (seg === 'p' && arg) await viewItem(ctx, decodeURIComponent(arg));
    else if (seg === 'contact') await viewContact(ctx, arg);
    else if (seg === 'inbox') await viewInbox(ctx, decodeURIComponent(arg));
    else viewNotFound(ctx);
  } catch (e) {
    console.error(e);
    render(ctx, `<div class="empty glass">${icon('x', 'xl')}<h2>Something went wrong</h2><p class="muted">${esc(friendlyError(e))}</p></div>`);
  }
}

// ── Views ───────────────────────────────────────────────────
async function viewHome(ctx) {
  const items = await api.listItems(null, { includeDrafts: state.owner });
  const p = state.profile;
  const motto = String(p.motto ?? '').trim();
  const nameTag = motto ? 'h2' : 'h1';
  const hero = `
    <section class="hero glass">
      <div class="readout" aria-hidden="true">
        <span class="live"></span><span>Airborne</span><span class="sep">/</span>
        <span>Alt <b data-count="85000">0</b> ft</span><span class="sep">/</span>
        <span>Mach <b data-count="3.3" data-dec="1">0.0</b></span><span class="sep">/</span>
        <span>Log <b data-count="${items.length}">0</b> entries</span>
      </div>
      ${motto ? `
        <h1 class="motto" aria-label="${esc(motto)}">${splitMotto(motto)
          .map((line, i) => `<span class="ml" aria-hidden="true"><span style="--d:${i}">${esc(line)}</span></span>`).join('')}</h1>
        <div class="burn" aria-hidden="true"></div>` : '<div style="height:18px"></div>'}
      <div class="hero-body hero-fade">
        ${avatarHTML(p, 'lg')}
        <div class="hero-text">
          <${nameTag} class="hero-name">${esc(p.name)}</${nameTag}>
          ${p.tagline ? `<p class="tagline">${esc(p.tagline)}</p>` : ''}
          ${p.bio ? `<div class="prose">${md(p.bio)}</div>` : ''}
          <div class="row">
            <a class="btn primary" href="#/contact">${icon('mail')} Message me</a>
            <a class="btn" href="#/projects">See my projects</a>
            ${state.owner ? `<button class="btn" data-act="profile">${icon('edit')} Edit profile</button>` : ''}
          </div>
        </div>
      </div>
    </section>`;

  const blocks = SECTIONS.map((s) => {
    const list = items.filter((i) => i.type === s.type);
    if (!list.length && !state.owner) return '';
    return `
      <section class="block">
        <div class="block-head">
          <h2>${icon(s.icon)} ${s.label}</h2>
          ${list.length ? `<a class="more" href="#/${s.key}">See all →</a>` : ''}
        </div>
        ${list.length ? sectionBody(s, list.slice(0, HOME_LIMIT[s.type])) : emptyHTML(s)}
      </section>`;
  }).join('');

  if (render(ctx, hero + blocks)) countUp(ctx.view);
}

// Splits the motto into two lines of similar length for the poster headline.
function splitMotto(text) {
  const words = text.split(/\s+/);
  if (words.length < 2) return [text];
  let best = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const diff = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length);
    if (diff < bestDiff) { bestDiff = diff; best = i; }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
}

// Animates the flight readout numbers from 0 up to their value.
function countUp(root) {
  const els = $$('[data-count]', root);
  const fmt = (el, v) => {
    const dec = Number(el.dataset.dec || 0);
    el.textContent = dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-US');
  };
  if (reduceMotion) { els.forEach((el) => fmt(el, Number(el.dataset.count))); return; }
  if (document.documentElement.classList.contains('intro-playing')) {
    afterIntro(() => countUp(root));
    return;
  }
  const start = performance.now() + 250;
  const dur = 1800;
  const step = (now) => {
    const t = Math.min(1, Math.max(0, (now - start) / dur));
    const e = 1 - Math.pow(1 - t, 3);
    els.forEach((el) => fmt(el, Number(el.dataset.count) * e));
    if (t < 1 && els[0] && els[0].isConnected) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

async function viewSection(ctx, s) {
  const items = await api.listItems(s.type, { includeDrafts: state.owner });
  const showSearch = s.type !== 'photo' && items.length > 3;
  const ok = render(ctx, `
    <header class="page-head glass">
      <div>
        <h1>${icon(s.icon)} ${s.label}</h1>
        <p class="muted">${s.blurb}</p>
      </div>
      <div class="row">
        ${showSearch ? `<input class="search" type="search" placeholder="Search ${s.label.toLowerCase()}…" aria-label="Search ${s.label.toLowerCase()}">` : ''}
        ${state.owner ? newButton(s) : ''}
      </div>
    </header>
    <div id="list">${items.length ? sectionBody(s, items) : emptyHTML(s)}</div>`);
  if (!ok || !showSearch) return;

  $('.search', ctx.view).addEventListener('input', debounce((e) => {
    const q = e.target.value.trim().toLowerCase();
    const found = items.filter((i) =>
      [i.title, i.summary, i.body, (i.tags || []).join(' ')].join(' ').toLowerCase().includes(q));
    $('#list').innerHTML = found.length
      ? sectionBody(s, found)
      : `<div class="empty glass"><p>Nothing matches “${esc(q)}”.</p></div>`;
  }));
}

async function viewItem(ctx, id) {
  const item = await api.getItem(id);
  if (!item || (!item.published && !state.owner)) return viewNotFound(ctx);
  const s = byType[item.type] || SECTIONS[0];
  if (!ctx.stale()) setNav(s.key);
  const comments = await api.listComments(id).catch(() => []);
  const link = safeUrl(item.link);
  const img = hasImg(item.imageUrl) ? imgSrc(item.imageUrl) : '';
  const isPhoto = item.type === 'photo';

  render(ctx, `
    <article class="article glass ${isPhoto ? 'is-photo' : ''}">
      <div class="article-top">
        <a class="back" href="#/${s.key}">${icon('back')} ${s.label}</a>
        ${state.owner ? `<div class="row">
          <button class="btn sm" data-act="edit" data-id="${esc(item.id)}">${icon('edit')} Edit</button>
          <button class="btn sm danger" data-act="delete" data-id="${esc(item.id)}">${icon('trash')} Delete</button>
        </div>` : ''}
      </div>
      ${img ? (isPhoto
        ? `<figure class="photo-full"><img ${img} alt="${esc(item.title || 'Photo')}"></figure>`
        : `<div class="article-cover"><img ${img} alt=""></div>`) : ''}
      <div class="meta"><time>${fmtDate(item.createdAt)}</time> ${draftBadge(item)}</div>
      ${item.title ? `<h1>${esc(item.title)}</h1>` : ''}
      ${item.summary ? `<p class="lead">${esc(item.summary)}</p>` : ''}
      ${tagsHTML(item.tags)}
      ${link ? `<p><a class="btn primary" href="${esc(link)}" target="_blank" rel="noopener noreferrer">${icon('link')} Open project</a></p>` : ''}
      ${item.body ? `<div class="prose">${md(item.body)}</div>` : ''}
    </article>
    <section class="comments glass" id="comments">${commentsHTML(item.id, comments)}</section>`);
}

function commentsHTML(itemId, list) {
  const items = list.length ? list.map((c) => `
    <li class="comment ${c.owner ? 'by-owner' : ''}">
      <div class="c-head">
        <span class="avatar xs initials hued" style="--h:${hue(c.name)}" aria-hidden="true">${esc(initials(c.name))}</span>
        <strong>${esc(c.name)}</strong>
        ${c.owner ? '<span class="pill">Author</span>' : ''}
        <time class="meta">${fmtDate(c.createdAt, true)}</time>
        ${state.owner ? `<button class="icon-btn sm" data-act="del-comment" data-item="${esc(itemId)}" data-id="${esc(c.id)}" title="Delete comment" aria-label="Delete comment">${icon('trash')}</button>` : ''}
      </div>
      <p class="c-text">${esc(c.text)}</p>
    </li>`).join('') : '<li class="muted no-comments">No comments yet. Be the first!</li>';

  return `
    <h2>${icon('chat')} Comments <span class="count">${list.length}</span></h2>
    <ul class="comment-list">${items}</ul>
    <form class="comment-form stack" data-item="${esc(itemId)}">
      ${state.owner ? '' : `<input name="name" placeholder="Your name" maxlength="60" required autocomplete="name" value="${esc(store.get('commenter-name') || '')}" aria-label="Your name">`}
      <textarea name="text" placeholder="${state.owner ? 'Reply as the author…' : 'Write a comment…'}" maxlength="2000" rows="3" required aria-label="Comment"></textarea>
      <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <div class="row between">
        <span class="muted small">Comments are public.</span>
        <button class="btn primary" type="submit">Post comment</button>
      </div>
    </form>`;
}

async function reloadComments(itemId) {
  const box = $('#comments');
  if (box) box.innerHTML = commentsHTML(itemId, await api.listComments(itemId));
}

// ── Contact: two-way chat (visitor side) ────────────────────
const CHAT_KEY = 'chat-thread';
const newThreadId = () => {
  const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(28));
  return Array.from(bytes, (b) => abc[b % abc.length]).join('');
};
const validThreadId = (id) => /^[A-Za-z0-9]{20,40}$/.test(id || '');

async function viewContact(ctx, linkId) {
  // Opened from a "continue on another device" link: remember that chat.
  if (validThreadId(linkId)) {
    store.set(CHAT_KEY, linkId);
    startGuestWatch();
    location.replace('#/contact');
    return;
  }
  const p = state.profile;
  if (state.owner) {
    return render(ctx, `
      <section class="contact glass">
        <div class="contact-head">
          <span class="icon-bubble">${icon('chat')}</span>
          <h1>Your chats live in the Inbox</h1>
          <p class="muted">You're signed in as the owner. Visitors start chats with you on this page.
          To see exactly what they see, open your site in a private tab.</p>
        </div>
        <div class="row" style="justify-content:center"><a class="btn primary" href="#/inbox">${icon('inbox')} Open Inbox</a></div>
      </section>`);
  }

  const id = store.get(CHAT_KEY);
  const thread = validThreadId(id) ? await api.getThread(id).catch(() => null) : null;
  if (ctx.stale()) return;

  if (!thread) {
    if (id) store.set(CHAT_KEY, '');
    return render(ctx, `
      <section class="contact glass">
        <div class="contact-head">
          <span class="icon-bubble">${icon('lock')}</span>
          <h1>Chat with ${esc(p.name)}</h1>
          <p class="muted">A private conversation: only you and ${esc(p.name)} can see it.
          Come back to this page any time to read replies and keep chatting.</p>
        </div>
        <form class="chat-start stack">
          <label>Your name<input name="name" required maxlength="80" autocomplete="name" value="${esc(store.get('commenter-name') || '')}"></label>
          <label>Email <span class="muted">(optional, only ${esc(p.name)} sees it)</span><input name="email" type="email" maxlength="120" autocomplete="email"></label>
          <label>Message<textarea name="text" required maxlength="4000" rows="4" placeholder="Say hello 👋"></textarea></label>
          <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
          <button class="btn primary big" type="submit">${icon('chat')} Start chat</button>
        </form>
      </section>`);
  }

  const ok = render(ctx, `
    <section class="chat glass">
      <header class="chat-head">
        ${avatarHTML(p, 'sm')}
        <div class="chat-who">
          <strong>${esc(p.name)}</strong>
          <span class="muted small">Private chat · you're ${esc(thread.name)}</span>
        </div>
        <button class="btn sm" data-act="chat-link" title="Open this chat on another device">${icon('link')} Other device</button>
      </header>
      <div class="chat-mount"></div>
      <p class="chat-foot muted small">Only you and ${esc(p.name)} can see this chat.
        <button class="link-btn small" data-act="chat-new">Start a new chat</button></p>
    </section>`);
  if (!ok) return;
  ctx.cleanup(mountChat($('.chat-mount', ctx.view), {
    api, threadId: thread.id, me: 'guest', emptyText: `Say hello to ${p.name} 👋`,
  }));
}

async function startChat(form) {
  const fd = new FormData(form);
  if (fd.get('website')) return; // bots fill in the hidden field
  const name = String(fd.get('name') || '').trim();
  const email = String(fd.get('email') || '').trim();
  const text = String(fd.get('text') || '').trim();
  if (!name || !text) return toast('Please add your name and a message.', 'error');
  if (email && !form.email.checkValidity()) return toast('That email address doesn’t look right.', 'error');

  await withBusy(form.querySelector('[type=submit]'), 'Starting…', async () => {
    const id = newThreadId();
    await api.createThread(id, { name: name.slice(0, 80), email: email.slice(0, 120) });
    await api.sendChat(id, { from: 'guest', text: text.slice(0, 4000), image: '', sticker: '' });
    store.set(CHAT_KEY, id);
    store.set('commenter-name', name);
  });
  startGuestWatch();
  route({ keepScroll: true });
}

// ── Inbox (owner side) ──────────────────────────────────────
async function viewInbox(ctx, threadId) {
  if (!state.owner) {
    return render(ctx, `<div class="empty glass">${icon('lock', 'xl')}<h2>This page is private</h2>
      <p class="muted">Only the owner can see the inbox.</p></div>`);
  }
  if (threadId) return viewInboxChat(ctx, threadId);

  const legacy = await api.listMessages().catch(() => []);
  if (ctx.stale()) return;
  const ok = render(ctx, `
    <header class="page-head glass">
      <div><h1>${icon('inbox')} Inbox</h1>
      <p class="muted">Chats with visitors. Open one to reply.</p></div>
    </header>
    <div class="threads"><div class="loading"><div class="spinner"></div></div></div>
    ${legacy.length ? `
      <section class="block">
        <div class="block-head"><h2>${icon('mail')} Older messages</h2></div>
        <p class="muted small" style="margin:0 4px">Sent before chat existed. Reply by email, or ask them to start a chat on your Contact page.</p>
        <div class="messages">${legacy.map(legacyMsgHTML).join('')}</div>
      </section>` : ''}`);
  if (!ok) return;

  $$('.msg', ctx.view).forEach((d) => d.addEventListener('toggle', async () => {
    if (!d.open || !d.classList.contains('unread')) return;
    try {
      await api.setMessageRead(d.dataset.id, true);
      d.classList.remove('unread');
      $('[data-act=toggle-read]', d).textContent = 'Mark as unread';
      updateUnreadFromDom();
    } catch (e) { console.warn(e); }
  }));

  ctx.cleanup(api.watchThreads((list) => {
    const box = $('.threads', ctx.view);
    if (!box) return;
    box.innerHTML = list.length ? list.map((t) => `
      <a class="thread glass ${t.unreadOwner ? 'unread' : ''}" href="#/inbox/${esc(t.id)}">
        <span class="avatar sm initials hued" style="--h:${hue(t.name)}" aria-hidden="true">${esc(initials(t.name))}</span>
        <span class="thread-main">
          <strong>${esc(t.name)}</strong>
          <span class="muted">${t.lastFrom === 'owner' ? 'You: ' : ''}${esc(t.lastText || 'New chat')}</span>
        </span>
        <span class="thread-side"><time class="meta">${fmtDate(t.lastAt, true)}</time>${t.unreadOwner ? '<span class="dot-new" aria-label="Unread"></span>' : ''}</span>
      </a>`).join('')
      : `<div class="empty glass">${icon('chat', 'xl')}<p>No chats yet. When someone messages you from the Contact page, it shows up here.</p></div>`;
  }));
}

function legacyMsgHTML(m) {
  return `
    <details class="msg glass ${m.read ? '' : 'unread'}" data-id="${esc(m.id)}">
      <summary>
        <span class="dot" aria-hidden="true"></span>
        <strong>${esc(m.name)}</strong>
        <span class="preview muted">${esc(m.text.slice(0, 90))}</span>
        <time class="meta">${fmtDate(m.createdAt, true)}</time>
      </summary>
      <div class="msg-body">
        <p class="muted small">${m.email ? `<a href="mailto:${esc(m.email)}">${esc(m.email)}</a>` : 'No email given'}</p>
        <p class="msg-text">${esc(m.text)}</p>
        <div class="row">
          ${m.email ? `<a class="btn sm primary" href="mailto:${esc(m.email)}?subject=${encodeURIComponent('Re: your message')}">${icon('mail')} Reply by email</a>` : ''}
          <button class="btn sm" data-act="toggle-read" data-id="${esc(m.id)}">${m.read ? 'Mark as unread' : 'Mark as read'}</button>
          <button class="btn sm danger" data-act="del-msg" data-id="${esc(m.id)}">${icon('trash')} Delete</button>
        </div>
      </div>
    </details>`;
}

async function viewInboxChat(ctx, threadId) {
  const t = validThreadId(threadId) ? await api.getThread(threadId) : null;
  if (!t) return viewNotFound(ctx);
  const ok = render(ctx, `
    <section class="chat glass">
      <header class="chat-head">
        <a class="icon-btn" href="#/inbox" title="Back to Inbox" aria-label="Back to Inbox">${icon('back')}</a>
        <span class="avatar sm initials hued" style="--h:${hue(t.name)}" aria-hidden="true">${esc(initials(t.name))}</span>
        <div class="chat-who">
          <strong>${esc(t.name)}</strong>
          <span class="muted small">${t.email ? `<a href="mailto:${esc(t.email)}">${esc(t.email)}</a>` : 'No email given'} · started ${fmtDate(t.createdAt)}</span>
        </div>
        <button class="icon-btn" data-act="del-thread" data-id="${esc(t.id)}" title="Delete chat" aria-label="Delete chat">${icon('trash')}</button>
      </header>
      <div class="chat-mount"></div>
    </section>`);
  if (!ok) return;
  ctx.cleanup(mountChat($('.chat-mount', ctx.view), { api, threadId: t.id, me: 'owner', emptyText: 'No messages yet.' }));
}

function updateUnreadFromDom() {
  state.unreadLegacy = $$('.msg.unread').length;
  updateUnreadTotal();
}

function updateUnreadTotal() {
  state.unread = (state.unreadLegacy || 0) + (state.unreadThreads || 0);
  renderChrome();
}

// Live badges: owner sees unread chats; a visitor sees a dot on Contact when you reply.
let ownerWatch = null;
let guestWatch = null;
function startOwnerWatch() {
  if (ownerWatch) return;
  ownerWatch = api.watchThreads((list) => {
    state.unreadThreads = list.filter((t) => t.unreadOwner).length;
    updateUnreadTotal();
  });
}
function startGuestWatch() {
  if (guestWatch) { guestWatch(); guestWatch = null; }
  const id = store.get(CHAT_KEY);
  if (state.owner || !validThreadId(id)) return;
  guestWatch = api.watchThread(id, (t) => {
    const unread = !!(t && t.unreadGuest);
    if (unread !== state.guestUnread) { state.guestUnread = unread; renderChrome(); }
  });
}
function stopWatches() {
  if (ownerWatch) { ownerWatch(); ownerWatch = null; }
  if (guestWatch) { guestWatch(); guestWatch = null; }
  state.unreadThreads = 0;
  state.guestUnread = false;
}

function viewNotFound(ctx) {
  render(ctx, `<div class="empty glass">${icon('x', 'xl')}<h2>Not found</h2>
    <p class="muted">That page doesn't exist, or it's private.</p>
    <a class="btn" href="#/">Go home</a></div>`);
}

// ── Forms: comments & private messages ──────────────────────
async function withBusy(btn, label, fn) {
  const old = btn.innerHTML;
  btn.disabled = true;
  btn.textContent = label;
  try { return await fn(); } finally { btn.disabled = false; btn.innerHTML = old; }
}

async function submitComment(form) {
  const fd = new FormData(form);
  if (fd.get('website')) return; // bots fill in the hidden field
  const itemId = form.dataset.item;
  const text = String(fd.get('text') || '').trim();
  const name = state.owner ? state.profile.name : String(fd.get('name') || '').trim();
  if (!name || !text) return toast('Please add your name and a comment.', 'error');
  const last = Number(store.get('last-comment-at')) || 0;
  if (!state.owner && Date.now() - last < 15000) return toast('Please wait a few seconds before commenting again.', 'error');

  await withBusy(form.querySelector('[type=submit]'), 'Posting…', async () => {
    await api.addComment(itemId, { name: name.slice(0, 60), text: text.slice(0, 2000), owner: state.owner });
    if (!state.owner) store.set('commenter-name', name);
    store.set('last-comment-at', Date.now());
  });
  await reloadComments(itemId);
  toast('Comment posted');
}

// ── Owner: editor ───────────────────────────────────────────
function openTypePicker() {
  openModal({
    title: 'Add something',
    body: `<div class="picker">${SECTIONS.map((s) => `
      <button type="button" class="pick glass" data-type="${s.type}">${icon(s.icon, 'xl')}<span>${s.type === 'photo' ? 'Photos' : `New ${s.one}`}</span></button>`).join('')}
    </div>`,
    onMount(el, close) {
      $$('.pick', el).forEach((b) => b.addEventListener('click', () => {
        close();
        if (b.dataset.type === 'photo') uploadPhotos();
        else openEditor(b.dataset.type);
      }));
    },
  });
}

function openEditor(type, item = null) {
  const s = byType[type];
  const has = {
    summary: type === 'project' || type === 'blog',
    link: type === 'project',
    cover: type !== 'note',
    tags: type !== 'photo',
  };
  const it = { title: '', summary: '', link: '', tags: [], body: '', published: true, imageUrl: '', imagePath: '', thumbUrl: '', ...(item || {}) };
  const coverPreview = (url) => (hasImg(url)
    ? `<img ${imgSrc(url)} alt="">`
    : `${icon('photos', 'xl')}<span>${type === 'photo' ? 'Choose a photo' : 'Add a cover image (optional)'}</span>`);

  openModal({
    title: item ? `Edit ${s.one}` : `New ${s.one}`,
    wide: true,
    locked: true,
    body: `
      <form class="editor stack" novalidate>
        ${has.cover ? `
          <div class="cover-field">
            <label class="cover-preview ${it.imageUrl ? '' : 'empty'}">
              ${coverPreview(it.thumbUrl || it.imageUrl)}
              <input type="file" name="cover" accept="image/*" hidden>
            </label>
            <button type="button" class="btn sm" data-x="remove-cover" ${it.imageUrl ? '' : 'hidden'}>Remove image</button>
          </div>` : ''}
        <label>${type === 'photo' ? 'Caption' : 'Title'}
          <input name="title" maxlength="140" value="${esc(it.title)}" ${type === 'photo' ? '' : 'required'}></label>
        ${has.summary ? `<label>${type === 'blog' ? 'Excerpt' : 'Short description'}
          <input name="summary" maxlength="280" value="${esc(it.summary)}"></label>` : ''}
        ${has.link ? `<label>Link <span class="muted">(GitHub, live demo…)</span>
          <input name="link" type="url" placeholder="https://" value="${esc(it.link)}"></label>` : ''}
        ${has.tags ? `<label>Tags <span class="muted">(comma separated)</span>
          <input name="tags" value="${esc((it.tags || []).join(', '))}"></label>` : ''}
        <div class="md-field">
          <div class="md-tabs">
            <button type="button" class="seg active" data-x="write">Write</button>
            <button type="button" class="seg" data-x="preview">Preview</button>
            <span class="spacer"></span>
            <label class="btn sm ghost" title="Upload an image into the text">${icon('photos')} Insert image
              <input type="file" accept="image/*" data-x="inline-img" hidden></label>
          </div>
          <textarea name="body" rows="12" aria-label="Text" placeholder="${type === 'photo'
            ? 'Say something about this photo (optional)'
            : 'Write in Markdown: **bold**, # headings, - lists, [links](https://…)'}">${esc(it.body)}</textarea>
          <div class="prose md-preview" hidden></div>
        </div>
        <label class="switch">
          <input type="checkbox" name="published" ${it.published ? 'checked' : ''}>
          <span class="track"></span>
          <span>Published <span class="muted">· turn off to keep it as a private draft</span></span>
        </label>
        <div class="row end">
          <button type="button" class="btn" data-x="cancel">Cancel</button>
          <button type="submit" class="btn primary">${item ? 'Save changes' : 'Save'}</button>
        </div>
      </form>`,
    onMount(el, close) {
      const form = $('form', el);
      let coverFile = null;
      let removeCover = false;
      const preview = $('.cover-preview', el);
      const removeBtn = $('[data-x=remove-cover]', el);

      if (preview) {
        form.cover.addEventListener('change', () => {
          const f = form.cover.files[0];
          if (!f) return;
          coverFile = f;
          removeCover = false;
          preview.classList.remove('empty');
          preview.querySelectorAll(':scope > :not(input)').forEach((n) => n.remove());
          preview.insertAdjacentHTML('afterbegin', `<img src="${URL.createObjectURL(f)}" alt="">`);
          removeBtn.hidden = false;
        });
        removeBtn.addEventListener('click', () => {
          coverFile = null;
          removeCover = true;
          form.cover.value = '';
          preview.classList.add('empty');
          preview.querySelectorAll(':scope > :not(input)').forEach((n) => n.remove());
          preview.insertAdjacentHTML('afterbegin', coverPreview(''));
          removeBtn.hidden = true;
        });
      }

      // Write / preview tabs
      const ta = form.body;
      const pv = $('.md-preview', el);
      $$('.seg', el).forEach((b) => b.addEventListener('click', () => {
        const showPreview = b.dataset.x === 'preview';
        $$('.seg', el).forEach((x) => x.classList.toggle('active', x === b));
        ta.hidden = showPreview;
        pv.hidden = !showPreview;
        if (showPreview) pv.innerHTML = md(ta.value) || '<p class="muted">Nothing to preview.</p>';
      }));

      // Upload an image straight into the text
      $('[data-x=inline-img]', el).addEventListener('change', async (e) => {
        const f = e.target.files[0];
        e.target.value = '';
        if (!f) return;
        const t = toast('Uploading image…', 'info', 0);
        try {
          const up = await api.uploadImage(await resizeImage(f, 1800));
          const alt = f.name.replace(/\.[^.]+$/, '').replace(/[[\]]/g, '');
          ta.setRangeText(`\n![${alt}](${up.url})\n`, ta.selectionStart, ta.selectionEnd, 'end');
          ta.focus();
          t.close();
          toast('Image added');
        } catch (err) {
          t.close();
          toast(friendlyError(err), 'error');
        }
      });

      $('[data-x=cancel]', el).addEventListener('click', close);

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = form.title.value.trim();
        let link = has.link ? form.link.value.trim() : '';
        if (link && !/^https?:\/\//i.test(link)) link = 'https://' + link;
        if (type !== 'photo' && !title) { form.title.focus(); return toast('Please add a title.', 'error'); }
        if (link && !safeUrl(link)) return toast('That link doesn’t look right.', 'error');
        if (type === 'photo' && !coverFile && (removeCover || !it.imageUrl)) return toast('Please choose a photo.', 'error');

        const submit = $('[type=submit]', form);
        await withBusy(submit, 'Saving…', async () => {
          try {
            let imageUrl = removeCover ? '' : it.imageUrl;
            let imagePath = removeCover ? '' : it.imagePath;
            let thumbUrl = removeCover ? '' : (it.thumbUrl || '');
            if (coverFile) {
              const up = await api.uploadImage(await resizeImage(coverFile, type === 'photo' ? 2400 : 1800));
              imageUrl = up.url;
              imagePath = up.path;
              thumbUrl = up.thumbUrl || '';
            }
            const data = {
              type,
              title,
              summary: has.summary ? form.summary.value.trim() : '',
              link,
              tags: has.tags ? form.tags.value.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean).slice(0, 12) : [],
              body: ta.value,
              published: form.published.checked,
              imageUrl,
              imagePath,
              thumbUrl,
            };
            const id = await api.saveItem(item ? item.id : null, data);
            if (it.imagePath && it.imagePath !== imagePath) api.deleteUpload(it.imagePath).catch(() => {});
            close();
            toast(item ? 'Saved' : `${s.one[0].toUpperCase() + s.one.slice(1)} added`);
            const target = `#/p/${encodeURIComponent(id)}`;
            if (location.hash === target) route({ keepScroll: true });
            else location.hash = target;
          } catch (err) {
            console.error(err);
            toast(friendlyError(err), 'error');
          }
        });
      });
    },
  });
}

function uploadPhotos() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  input.addEventListener('change', async () => {
    const files = [...input.files];
    if (!files.length) return;
    const t = toast(`Uploading 0 of ${files.length}…`, 'info', 0);
    let done = 0;
    let failed = 0;
    for (const f of files) {
      try {
        const up = await api.uploadImage(await resizeImage(f, 2400));
        await api.saveItem(null, {
          type: 'photo', title: '', summary: '', link: '', tags: [], body: '',
          published: true, imageUrl: up.url, imagePath: up.path, thumbUrl: up.thumbUrl || '',
        });
        done++;
      } catch (e) {
        console.error(e);
        failed++;
      }
      t.update(`Uploading ${done + failed} of ${files.length}…`);
    }
    t.close();
    if (failed) toast(`${done} uploaded, ${failed} failed`, 'error');
    else toast(`${done} photo${done > 1 ? 's' : ''} uploaded`);
    if (location.hash === '#/photos') route({ keepScroll: true });
    else location.hash = '#/photos';
  });
  input.click();
}

function openProfileEditor() {
  const p = state.profile;
  openModal({
    title: 'Edit profile',
    locked: true,
    body: `
      <form class="stack">
        <div class="avatar-field">
          <label class="avatar-pick" title="Change photo">
            ${avatarHTML(p, 'lg')}
            <input type="file" name="avatar" accept="image/*" hidden>
            <span class="avatar-hint">Change photo</span>
          </label>
        </div>
        <label>Big headline <span class="muted">(top of the home page, leave empty to hide)</span>
          <input name="motto" maxlength="60" value="${esc(p.motto || '')}"></label>
        <label>Name<input name="name" maxlength="80" required value="${esc(p.name)}"></label>
        <label>Tagline<input name="tagline" maxlength="160" value="${esc(p.tagline)}"></label>
        <label>About you <span class="muted">(Markdown)</span><textarea name="bio" rows="6">${esc(p.bio)}</textarea></label>
        <div class="row end">
          <button type="button" class="btn" data-x="cancel">Cancel</button>
          <button type="submit" class="btn primary">Save profile</button>
        </div>
      </form>`,
    onMount(el, close) {
      const form = $('form', el);
      let file = null;
      form.avatar.addEventListener('change', () => {
        file = form.avatar.files[0] || null;
        if (!file) return;
        const pick = $('.avatar-pick', el);
        pick.querySelector('.avatar').outerHTML = `<img class="avatar lg" src="${URL.createObjectURL(file)}" alt="">`;
      });
      $('[data-x=cancel]', el).addEventListener('click', close);
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = form.name.value.trim();
        if (!name) return toast('Please add your name.', 'error');
        await withBusy($('[type=submit]', form), 'Saving…', async () => {
          try {
            const data = { motto: form.motto.value.trim(), name, tagline: form.tagline.value.trim(), bio: form.bio.value };
            if (file) {
              const up = await api.uploadImage(await resizeImage(file, 600));
              data.avatarUrl = up.thumbUrl || up.url; // the small version is plenty for an avatar
              data.avatarPath = up.path;
            }
            await api.saveProfile(data);
            if (file && p.avatarPath) api.deleteUpload(p.avatarPath).catch(() => {});
            state.profile = { ...state.profile, ...data };
            close();
            renderChrome();
            route({ keepScroll: true });
            toast('Profile saved');
          } catch (err) {
            console.error(err);
            toast(friendlyError(err), 'error');
          }
        });
      });
    },
  });
}

async function deleteItemFlow(id) {
  const item = await api.getItem(id);
  if (!item) return;
  const s = byType[item.type];
  if (!(await confirmDialog(`Delete this ${s.one} and its comments? This can't be undone.`))) return;
  await api.deleteItem(id);
  toast(`${s.one[0].toUpperCase() + s.one.slice(1)} deleted`);
  location.hash = `#/${s.key}`;
}

// ── Global events ───────────────────────────────────────────
document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const { act, id } = el.dataset;
  try {
    switch (act) {
      case 'signin': {
        const t = toast('Opening Google sign-in…', 'info', 0);
        try {
          await api.signIn();
          t.close();
        } catch (err) {
          t.close();
          if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
            toast('Sign-in was closed before it finished.', 'info');
          } else throw err;
        }
        break;
      }
      case 'signout':
        await api.signOut();
        toast('Signed out');
        break;
      case 'new': openTypePicker(); break;
      case 'new-type': openEditor(el.dataset.type); break;
      case 'upload-photos': uploadPhotos(); break;
      case 'profile': openProfileEditor(); break;
      case 'edit': {
        const it = await api.getItem(id);
        if (it) openEditor(it.type, it);
        break;
      }
      case 'delete': await deleteItemFlow(id); break;
      case 'del-comment':
        if (await confirmDialog('Delete this comment?')) {
          await api.deleteComment(el.dataset.item, id);
          await reloadComments(el.dataset.item);
          toast('Comment deleted');
        }
        break;
      case 'toggle-read': {
        const d = el.closest('.msg');
        const markRead = d.classList.contains('unread');
        await api.setMessageRead(id, markRead);
        d.classList.toggle('unread', !markRead);
        el.textContent = markRead ? 'Mark as unread' : 'Mark as read';
        updateUnreadFromDom();
        break;
      }
      case 'del-msg':
        if (await confirmDialog('Delete this message?')) {
          await api.deleteMessage(id);
          el.closest('.msg').remove();
          updateUnreadFromDom();
          toast('Message deleted');
          if (!$('.msg')) route({ keepScroll: true });
        }
        break;
      case 'chat-link': {
        const link = `${location.origin}${location.pathname}#/contact/${store.get(CHAT_KEY)}`;
        openModal({
          title: 'Continue on another device',
          body: `<p class="muted" style="margin-top:0">Open this link on your other phone, tablet or computer to keep chatting there.
            Keep it private: anyone with the link can read this chat.</p>
            <input readonly value="${esc(link)}" aria-label="Chat link" onfocus="this.select()">
            <div class="row end" style="margin-top:14px"><button class="btn primary" data-act="copy" data-text="${esc(link)}">Copy link</button></div>`,
        });
        break;
      }
      case 'chat-new':
        if (await confirmDialog('Start a new chat? This browser will stop showing your current conversation (it isn’t deleted).', { ok: 'Start new chat', danger: false })) {
          store.set(CHAT_KEY, '');
          startGuestWatch();
          state.guestUnread = false;
          renderChrome();
          route({ keepScroll: true });
        }
        break;
      case 'del-thread':
        if (await confirmDialog('Delete this whole chat, including all its messages and photos?')) {
          await api.deleteThread(id);
          toast('Chat deleted');
          location.hash = '#/inbox';
        }
        break;
      case 'copy':
        await navigator.clipboard.writeText(el.dataset.text);
        toast('Copied');
        break;
      default: break;
    }
  } catch (err) {
    console.error(err);
    toast(friendlyError(err), 'error');
  }
});

document.addEventListener('submit', (e) => {
  const form = e.target;
  const handler = form.matches('.comment-form') ? submitComment : form.matches('.chat-start') ? startChat : null;
  if (!handler) return;
  e.preventDefault();
  handler(form).catch((err) => { console.error(err); toast(friendlyError(err), 'error'); });
});

// ── Images stored in the database ───────────────────────────
// Anything rendered with data-fsimg="<id>" gets its picture fetched once.
const imageCache = new Map();
function resolveImages() {
  $$('img[data-fsimg]').forEach((img) => {
    const id = fsImageId(`#fsimg-${img.dataset.fsimg}`);
    img.removeAttribute('data-fsimg');
    if (!id) return;
    if (!imageCache.has(id)) imageCache.set(id, api.getImage(id));
    imageCache.get(id)
      .then((src) => { if (safeUrl(src)) img.src = src; })
      .catch((e) => { console.warn('Image failed to load', id, e); imageCache.delete(id); });
  });
}
new MutationObserver(resolveImages).observe(document.body, { childList: true, subtree: true });

// ── Boot ────────────────────────────────────────────────────
try {
  const p = await api.getProfile();
  if (p) state.profile = { ...DEFAULT_PROFILE, ...p };
} catch (e) {
  console.warn('Could not load profile', e);
}
renderChrome();

let firstAuth = true;
api.onAuthChange(async (user) => {
  state.user = user;
  state.owner = !!(user && user.isOwner);
  stopWatches();
  if (state.owner) startOwnerWatch(); else startGuestWatch();
  await refreshUnread();
  renderChrome();
  renderBanner();
  route({ keepScroll: !firstAuth });
  firstAuth = false;
});
window.addEventListener('hashchange', () => route());
