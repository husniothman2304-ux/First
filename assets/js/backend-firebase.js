// Live backend: Firebase Auth (Google sign-in), Firestore and Cloud Storage.
// Access control is enforced by firestore.rules and storage.rules, not here.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut, onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, setDoc, deleteDoc,
  query, where, limit, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';
import { FIREBASE_CONFIG } from './config.js';

const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

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
  const x = d.data();
  return { ...x, id: d.id, createdAt: ms(x.createdAt), updatedAt: ms(x.updatedAt) };
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
  if (item && item.imagePath) await deleteUpload(item.imagePath).catch(() => {});
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

// ── Uploads ─────────────────────────────────────────────────
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp' };

export async function uploadImage(blob) {
  const type = blob.type || 'image/jpeg';
  const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${EXT[type] || 'img'}`;
  const r = ref(storage, path);
  await uploadBytes(r, blob, { contentType: type, cacheControl: 'public,max-age=31536000' });
  return { url: await getDownloadURL(r), path };
}

export async function deleteUpload(path) {
  if (path && path.startsWith('uploads/')) await deleteObject(ref(storage, path));
}
