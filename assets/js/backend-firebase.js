// Live backend: Firebase Auth (Google sign-in) and Firestore.
// Images are compressed and stored as Firestore documents, which keeps the
// project on the free Spark plan (no Cloud Storage needed).
// Access control is enforced by firestore.rules, not here.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut, onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, setDoc, deleteDoc,
  query, where, limit, serverTimestamp, onSnapshot,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { FIREBASE_CONFIG } from './config.js';
import { fitDataUrl } from './ui.js';

const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);

export const mode = 'live';

// ── Auth ────────────────────────────────────────────────────
// The owner is whoever the security rules let read the private inbox, so
// the owner's ID only has to be set in the rules files.
async function probeOwner() {
  try {
    await getDocs(query(collection(db, 'messages'), limit(1)));
    return true;
  } catch {
    return false;
  }
}

export function onAuthChange(cb) {
  return onAuthStateChanged(auth, async (u) => {
    if (!u) return cb(null);
    cb({
      uid: u.uid,
      name: u.displayName || '',
      email: u.email || '',
      photo: u.photoURL || '',
      isOwner: await probeOwner(),
    });
  });
}

export async function signIn() {
  await signInWithPopup(auth, new GoogleAuthProvider());
}

export async function signOut() {
  await fbSignOut(auth);
}

// ── Helpers ─────────────────────────────────────────────────
const ms = (t) => (t && typeof t.toMillis === 'function' ? t.toMillis() : typeof t === 'number' ? t : Date.now());
const conv = (d) => {
  const x = d.data({ serverTimestamps: 'estimate' });
  return { ...x, id: d.id, createdAt: ms(x.createdAt), updatedAt: ms(x.updatedAt), lastAt: ms(x.lastAt) };
};

// ── Profile ─────────────────────────────────────────────────
export async function getProfile() {
  const s = await getDoc(doc(db, 'site', 'profile'));
  return s.exists() ? s.data() : null;
}

export async function saveProfile(data) {
  await setDoc(doc(db, 'site', 'profile'), data, { merge: true });
}

// ── Items (projects, notes, blog posts, photos) ─────────────
export async function listItems(type, { includeDrafts = false } = {}) {
  const filters = [];
  if (type) filters.push(where('type', '==', type));
  // Guests must ask only for published items, or the rules reject the query.
  if (!includeDrafts) filters.push(where('published', '==', true));
  const snap = await getDocs(query(collection(db, 'items'), ...filters));
  return snap.docs.map(conv).sort((a, b) => b.createdAt - a.createdAt);
}

export async function getItem(id) {
  try {
    const s = await getDoc(doc(db, 'items', id));
    return s.exists() ? conv(s) : null;
  } catch (e) {
    if (e.code === 'permission-denied') return null; // a draft, or it doesn't exist
    throw e;
  }
}

export async function saveItem(id, data) {
  const clean = { ...data };
  delete clean.id;
  delete clean.createdAt;
  delete clean.updatedAt;
  if (id) {
    await updateDoc(doc(db, 'items', id), { ...clean, updatedAt: serverTimestamp() });
    return id;
  }
  const r = await addDoc(collection(db, 'items'), {
    ...clean, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  return r.id;
}

export async function deleteItem(id) {
  const item = await getItem(id);
  const comments = await getDocs(collection(db, 'items', id, 'comments'));
  await Promise.all(comments.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(db, 'items', id));
  if (!item) return;
  // Also remove the cover image and any images placed inside the text.
  const paths = new Set(item.imagePath ? [item.imagePath] : []);
  for (const m of String(item.body || '').matchAll(/#fsimg-([A-Za-z0-9]{1,40})/g)) paths.add(`images/${m[1]}`);
  await Promise.all([...paths].map((p) => deleteUpload(p).catch(() => {})));
}

// ── Comments (public) ───────────────────────────────────────
export async function listComments(itemId) {
  const snap = await getDocs(collection(db, 'items', itemId, 'comments'));
  return snap.docs.map(conv).sort((a, b) => a.createdAt - b.createdAt);
}

export async function addComment(itemId, { name, text, owner = false }) {
  await addDoc(collection(db, 'items', itemId, 'comments'), {
    name, text, owner: !!owner, createdAt: serverTimestamp(),
  });
}

export async function deleteComment(itemId, commentId) {
  await deleteDoc(doc(db, 'items', itemId, 'comments', commentId));
}

// ── Private messages (only the owner can read) ──────────────
export async function sendMessage({ name, email = '', text }) {
  await addDoc(collection(db, 'messages'), {
    name, email, text, read: false, createdAt: serverTimestamp(),
  });
}

export async function listMessages() {
  const snap = await getDocs(collection(db, 'messages'));
  return snap.docs.map(conv).sort((a, b) => b.createdAt - a.createdAt);
}

export async function setMessageRead(id, read) {
  await updateDoc(doc(db, 'messages', id), { read: !!read });
}

export async function deleteMessage(id) {
  await deleteDoc(doc(db, 'messages', id));
}

// ── Images (stored in Firestore) ────────────────────────────
// A Firestore document can hold at most 1 MiB, so the full image is squeezed
// under ~900 KB. A small thumbnail is returned too, which the page keeps
// inside the item itself so galleries and cards load without extra reads.
const FULL_STEPS = [[1600, 0.82], [1400, 0.76], [1200, 0.72], [1000, 0.68], [800, 0.62]];
const THUMB_STEPS = [[560, 0.72], [440, 0.66], [340, 0.6]];

export async function uploadImage(blob) {
  const full = await fitDataUrl(blob, FULL_STEPS, 900_000);
  const thumbUrl = await fitDataUrl(blob, THUMB_STEPS, 70_000);
  const r = await addDoc(collection(db, 'images'), { data: full, createdAt: serverTimestamp() });
  return { url: `#fsimg-${r.id}`, path: `images/${r.id}`, thumbUrl };
}

export async function getImage(id) {
  const s = await getDoc(doc(db, 'images', id));
  return s.exists() ? s.data().data : '';
}

export async function deleteUpload(path) {
  const m = /^images\/([A-Za-z0-9]{1,40})$/.exec(path || '');
  if (m) await deleteDoc(doc(db, 'images', m[1]));
}

// ── Chats (two-way conversations with visitors) ─────────────
// A chat lives at threads/{id}. The id is long and random, and works like a
// private link: only the visitor's browser (and the owner) know it.
const preview = ({ text, image, sticker }) => (text ? text.slice(0, 120) : image ? '📷 Photo' : sticker ? 'Sticker' : '');

export async function createThread(id, { name, email = '' }) {
  await setDoc(doc(db, 'threads', id), {
    name, email, createdAt: serverTimestamp(), lastAt: serverTimestamp(),
    lastText: '', lastFrom: 'guest', unreadOwner: false, unreadGuest: false,
  });
}

export async function getThread(id) {
  try {
    const s = await getDoc(doc(db, 'threads', id));
    return s.exists() ? conv(s) : null;
  } catch (e) {
    if (e.code === 'permission-denied') return null;
    throw e;
  }
}

export function watchThread(id, cb) {
  return onSnapshot(doc(db, 'threads', id),
    (s) => cb(s.exists() ? conv(s) : null),
    (e) => { console.warn(e); cb(null); });
}

export function watchMessages(id, cb) {
  return onSnapshot(collection(db, 'threads', id, 'msgs'),
    (snap) => cb(snap.docs.map(conv).sort((a, b) => a.createdAt - b.createdAt)),
    (e) => console.warn(e));
}

export async function sendChat(id, { from, text = '', image = '', sticker = '' }) {
  await addDoc(collection(db, 'threads', id, 'msgs'), { from, text, image, sticker, createdAt: serverTimestamp() });
  await updateDoc(doc(db, 'threads', id), from === 'owner'
    ? { lastAt: serverTimestamp(), lastText: preview({ text, image, sticker }), lastFrom: 'owner', unreadGuest: true }
    : { lastAt: serverTimestamp(), lastText: preview({ text, image, sticker }), lastFrom: 'guest', unreadOwner: true });
}

export async function markThreadRead(id, who) {
  await updateDoc(doc(db, 'threads', id), who === 'owner' ? { unreadOwner: false } : { unreadGuest: false });
}

export function watchThreads(cb) {
  return onSnapshot(collection(db, 'threads'),
    (snap) => cb(snap.docs.map(conv).sort((a, b) => b.lastAt - a.lastAt)),
    (e) => console.warn(e));
}

export async function deleteThread(id) {
  const msgs = await getDocs(collection(db, 'threads', id, 'msgs'));
  await Promise.all(msgs.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(db, 'threads', id));
}
