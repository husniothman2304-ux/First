// Two-way chat between the owner and a visitor: live messages, photos and
// stickers. Used by the Contact page (visitor side) and the Inbox (owner side).
import { $, $$, esc, safeUrl, icon, toast, openModal, fitDataUrl, friendlyError } from './ui.js';

// ── Stickers ────────────────────────────────────────────────
// Emoji stickers are shown big; text stickers look like little poster labels.
export const STICKERS = {
  thumbs: { emoji: '👍' }, heart: { emoji: '❤️' }, lol: { emoji: '😂' }, fire: { emoji: '🔥' },
  wow: { emoji: '😮' }, thanks: { emoji: '🙏' }, party: { emoji: '🎉' }, cool: { emoji: '😎' },
  plane: { emoji: '✈️' }, rocket: { emoji: '🚀' }, hundred: { emoji: '💯' }, eyes: { emoji: '👀' },
  thrust: { text: 'In thrust we trust' }, mach: { text: 'Mach 3!' }, roger: { text: 'Roger that' },
  sendit: { text: 'Send it' }, whoosh: { text: 'Whoosh' }, nicebuild: { text: 'Nice build' },
};

export function stickerHTML(id) {
  const s = STICKERS[id];
  if (!s) return '';
  return s.emoji
    ? `<span class="sticker emoji" role="img" aria-label="Sticker">${s.emoji}</span>`
    : `<span class="sticker label">${esc(s.text)}</span>`;
}

// ── Helpers ─────────────────────────────────────────────────
const dayKey = (ms) => new Date(ms).toDateString();
function dayLabel(ms) {
  const d = new Date(ms);
  const today = new Date();
  const yesterday = new Date(Date.now() - 864e5);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).format(d);
}
const timeLabel = (ms) => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(ms));

function bubbleHTML(m, me, isNew) {
  const mine = m.from === me;
  const img = m.image && safeUrl(m.image)
    ? `<img class="chat-img" src="${esc(m.image)}" alt="Photo" loading="lazy">` : '';
  const sticker = m.sticker ? stickerHTML(m.sticker) : '';
  const text = m.text ? `<p class="chat-text">${esc(m.text)}</p>` : '';
  const onlySticker = sticker && !img && !text;
  return `
    <div class="chat-row ${mine ? 'mine' : 'theirs'} ${isNew ? 'new' : ''}">
      <div class="bubble ${onlySticker ? 'bare' : ''} ${img && !text ? 'photo-only' : ''}">${img}${text}${sticker}</div>
      <time>${timeLabel(m.createdAt)}</time>
    </div>`;
}

function logHTML(list, me, emptyText, seen) {
  if (!list.length) return `<div class="chat-empty">${esc(emptyText)}</div>`;
  let html = '';
  let lastDay = '';
  for (const m of list) {
    const k = dayKey(m.createdAt);
    if (k !== lastDay) { html += `<div class="chat-day"><span>${dayLabel(m.createdAt)}</span></div>`; lastDay = k; }
    html += bubbleHTML(m, me, seen && !seen.has(m.id));
  }
  return html;
}

// ── Mount ───────────────────────────────────────────────────
// me: 'guest' or 'owner'. Returns a function that stops listening.
export function mountChat(el, { api, threadId, me, emptyText = 'Say hello 👋' }) {
  el.innerHTML = `
    <div class="chat-log" aria-live="polite"><div class="loading"><div class="spinner"></div></div></div>
    <div class="sticker-panel" hidden>
      ${Object.keys(STICKERS).map((id) => `<button type="button" class="sticker-pick" data-sticker="${id}" aria-label="Send sticker">${stickerHTML(id)}</button>`).join('')}
    </div>
    <form class="chat-compose">
      <button type="button" class="icon-btn" data-c="photo" title="Send a photo" aria-label="Send a photo">${icon('photos')}</button>
      <button type="button" class="icon-btn" data-c="sticker" title="Stickers" aria-label="Stickers">${icon('smile')}</button>
      <textarea rows="1" maxlength="4000" placeholder="Message…" aria-label="Message"></textarea>
      <button type="submit" class="send" title="Send" aria-label="Send">${icon('send')}</button>
      <input type="file" accept="image/*" hidden>
    </form>`;

  const log = $('.chat-log', el);
  const form = $('.chat-compose', el);
  const ta = $('textarea', form);
  const file = $('input[type=file]', form);
  const panel = $('.sticker-panel', el);
  let first = true;
  let lastCount = 0;
  let sending = false;

  const nearBottom = () => log.scrollHeight - log.scrollTop - log.clientHeight < 120;
  const toBottom = () => { log.scrollTop = log.scrollHeight; };

  const seen = new Set();
  const stopMsgs = api.watchMessages(threadId, (list) => {
    const stick = first || nearBottom() || (list.length > lastCount && list[list.length - 1].from === me);
    // Only messages that arrive while the chat is open get the pop-in animation.
    log.innerHTML = logHTML(list, me, emptyText, first ? null : seen);
    list.forEach((m) => seen.add(m.id));
    $$('.chat-img', log).forEach((img) => img.addEventListener('load', () => { if (stick) toBottom(); }, { once: true }));
    if (stick) toBottom();
    // On phones, bring the whole chat (with the message box) into view above the tab bar.
    if (first && window.matchMedia('(max-width: 760px)').matches) {
      const card = el.closest('.chat');
      if (card) card.scrollIntoView({ block: 'end' });
    }
    first = false;
    lastCount = list.length;
  });

  // Mark the other side's messages as read while this chat is open.
  const stopMeta = api.watchThread(threadId, (t) => {
    if (!t) return;
    const unread = me === 'owner' ? t.unreadOwner : t.unreadGuest;
    if (unread && document.visibilityState === 'visible') api.markThreadRead(threadId, me).catch(() => {});
  });

  async function send(msg) {
    if (sending) return;
    sending = true;
    try {
      await api.sendChat(threadId, { from: me, text: '', image: '', sticker: '', ...msg });
    } catch (e) {
      console.error(e);
      toast(friendlyError(e), 'error');
      throw e;
    } finally {
      sending = false;
    }
  }

  // Text
  const grow = () => { ta.style.height = 'auto'; ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`; };
  ta.addEventListener('input', grow);
  ta.addEventListener('keydown', (e) => {
    // Enter sends on keyboards; Shift+Enter makes a new line. On touch screens Enter is a new line.
    if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(pointer: fine)').matches) {
      e.preventDefault();
      form.requestSubmit();
    }
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = ta.value.trim();
    if (!text) return;
    ta.value = '';
    grow();
    try { await send({ text: text.slice(0, 4000) }); } catch { ta.value = text; grow(); }
    ta.focus();
  });

  // Photos
  $('[data-c=photo]', form).addEventListener('click', () => file.click());
  file.addEventListener('change', async () => {
    const f = file.files[0];
    file.value = '';
    if (!f) return;
    const t = toast('Sending photo…', 'info', 0);
    try {
      const image = await fitDataUrl(f, [[1280, 0.8], [1080, 0.75], [900, 0.7], [720, 0.65], [560, 0.6]], 340_000);
      const text = ta.value.trim().slice(0, 4000);
      await send({ image, text });
      if (text) { ta.value = ''; grow(); }
    } catch (e) {
      if (!e.code) toast(friendlyError(e), 'error');
    } finally {
      t.close();
    }
  });

  // Stickers
  $('[data-c=sticker]', form).addEventListener('click', () => { panel.hidden = !panel.hidden; });
  panel.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-sticker]');
    if (!b) return;
    panel.hidden = true;
    try { await send({ sticker: b.dataset.sticker }); } catch { /* toast shown */ }
  });

  // Tap a photo to see it full size
  log.addEventListener('click', (e) => {
    const img = e.target.closest('.chat-img');
    if (img) openModal({ title: 'Photo', wide: true, body: `<img class="photo-view" src="${esc(img.src)}" alt="Photo">` });
  });

  return () => { stopMsgs(); stopMeta(); };
}
