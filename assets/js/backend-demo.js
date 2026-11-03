// Demo backend: keeps everything in this browser's localStorage so the site
// can be tried before Firebase is set up. Nothing here is shared or private.
import { resizeImage } from './ui.js';

export const mode = 'demo';

const KEY = 'site-demo-v1';
const AUTH_KEY = 'site-demo-owner';
const DAY = 864e5;
const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const clone = (x) => JSON.parse(JSON.stringify(x));

function seed() {
  const now = Date.now();
  const items = [
    {
      id: 'welcome', type: 'blog', published: true, createdAt: now - DAY,
      title: 'Hello, world',
      summary: 'Why I made this little corner of the internet.',
      tags: ['personal'],
      body: "This is the first post on my new website.\n\nI'll use this place to share **projects** I'm working on, **notes** on things I'm learning, longer **blog posts**, and **photos**.\n\n> Leave a comment below, or send me a private message from the Contact page.",
    },
    {
      id: 'this-site', type: 'project', published: true, createdAt: now - 2 * DAY,
      title: 'This website',
      summary: 'A glassy personal site in plain HTML, CSS and JavaScript, powered by Firebase.',
      link: 'https://github.com/husniothman2304-ux/First',
      tags: ['html', 'css', 'javascript', 'firebase'],
      body: "## Features\n\n- Projects, notes, blog and photo gallery\n- Only the owner can add, edit and upload\n- Visitors can leave comments and send private messages\n- Frosted-glass design with light and dark mode",
    },
    {
      id: 'markdown', type: 'note', published: true, createdAt: now - 3 * DAY,
      title: 'Markdown cheat sheet',
      tags: ['reference'],
      body: "Posts and notes are written in Markdown.\n\n```\n# Heading\n**bold**  *italic*  `code`\n- list item\n[link](https://example.com)\n![image](https://…)\n```",
    },
  ];
  return {
    profile: null,
    items: Object.fromEntries(items.map((i) => [i.id, { summary: '', link: '', imageUrl: '', imagePath: '', updatedAt: i.createdAt, ...i }])),
    comments: {
      welcome: [{ id: newId(), name: 'A friendly visitor', text: 'Congrats on the new site!', owner: false, createdAt: now - DAY / 2 }],
    },
    messages: [],
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const db = load() || seed();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    throw new Error('Browser storage is full. Demo mode keeps everything in this browser. Connect Firebase to store more.');
  }
}

// ── Auth ────────────────────────────────────────────────────
const DEMO_USER = { uid: 'demo-owner', name: 'Demo owner', email: '', photo: '', isOwner: true };
const listeners = new Set();
let current = null;
try { current = localStorage.getItem(AUTH_KEY) === '1' ? DEMO_USER : null; } catch { /* storage blocked */ }

const emit = () => listeners.forEach((cb) => cb(current));

export function onAuthChange(cb) {
  listeners.add(cb);
  cb(current);
  return () => listeners.delete(cb);
}

export async function signIn() {
  current = DEMO_USER;
  try { localStorage.setItem(AUTH_KEY, '1'); } catch { /* ignore */ }
  emit();
}

export async function signOut() {
  current = null;
  try { localStorage.removeItem(AUTH_KEY); } catch { /* ignore */ }
  emit();
}

// ── Profile ─────────────────────────────────────────────────
export async function getProfile() { return db.profile ? clone(db.profile) : null; }
export async function saveProfile(data) { db.profile = { ...(db.profile || {}), ...data }; persist(); }

// ── Items ───────────────────────────────────────────────────
export async function listItems(type, { includeDrafts = false } = {}) {
  return clone(Object.values(db.items)
    .filter((i) => (!type || i.type === type) && (includeDrafts || i.published))
    .sort((a, b) => b.createdAt - a.createdAt));
}

export async function getItem(id) {
  const i = db.items[id];
  if (!i || (!i.published && !current)) return null;
  return clone(i);
}

export async function saveItem(id, data) {
  const now = Date.now();
  if (id && db.items[id]) {
    db.items[id] = { ...db.items[id], ...data, id, updatedAt: now };
  } else {
    id = newId();
    db.items[id] = { ...data, id, createdAt: now, updatedAt: now };
  }
  persist();
  return id;
}

export async function deleteItem(id) {
  delete db.items[id];
  delete db.comments[id];
  persist();
}

// ── Comments ────────────────────────────────────────────────
export async function listComments(itemId) { return clone(db.comments[itemId] || []); }

export async function addComment(itemId, { name, text, owner = false }) {
  (db.comments[itemId] ||= []).push({ id: newId(), name, text, owner: !!owner, createdAt: Date.now() });
  persist();
}

export async function deleteComment(itemId, commentId) {
  db.comments[itemId] = (db.comments[itemId] || []).filter((c) => c.id !== commentId);
  persist();
}

// ── Messages ────────────────────────────────────────────────
export async function sendMessage({ name, email = '', text }) {
  db.messages.push({ id: newId(), name, email, text, read: false, createdAt: Date.now() });
  persist();
}

export async function listMessages() {
  return clone([...db.messages].sort((a, b) => b.createdAt - a.createdAt));
}

export async function setMessageRead(id, read) {
  const m = db.messages.find((x) => x.id === id);
  if (m) { m.read = !!read; persist(); }
}

export async function deleteMessage(id) {
  db.messages = db.messages.filter((m) => m.id !== id);
  persist();
}

// ── Uploads (stored as small data URLs) ─────────────────────
export async function uploadImage(blob) {
  const small = await resizeImage(blob, 1100, 0.8, 150e3);
  const url = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('Could not read the image.'));
    r.readAsDataURL(small);
  });
  return { url, path: 'demo/' + newId() };
}

export async function deleteUpload() { /* data URLs live inside the items */ }
