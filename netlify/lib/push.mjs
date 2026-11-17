// Shared code for the push-notification functions.
//
// Secrets: only one, the Firebase service account, kept in the Netlify
// environment variable FIREBASE_SERVICE_ACCOUNT (the whole JSON file).
// Never commit it. Everything else is stored in Firestore under push/…,
// which has no rule in firestore.rules, so browsers can't read or write it;
// only these functions (using the service account) can.
//
//   push/vapid                 the Web Push key pair, made on first use
//   push/owner/subs/{hash}     the owner's devices that turned notifications on
//   push/owner/sent/{thread}   last chat message already notified (no repeats)
import { createHash } from 'node:crypto';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import webpush from 'web-push';

export const OWNER_UID = process.env.OWNER_UID || 'xfSAbQUoHbSutKnGVrLOVHvJONx1';
const CONTACT = 'mailto:noreply@husniothmaninmaya.netlify.app';

function serviceAccount() {
  let raw = (process.env.FIREBASE_SERVICE_ACCOUNT || '').trim();
  if (!raw) throw new HttpError(503, 'Notifications are not set up yet: FIREBASE_SERVICE_ACCOUNT is missing in Netlify.');
  // Pasting on a phone can turn quotes into “smart quotes”.
  raw = raw.replace(/[“”]/g, '"');
  let sa;
  try {
    sa = JSON.parse(raw);
  } catch {
    throw new HttpError(503, 'FIREBASE_SERVICE_ACCOUNT is not valid JSON. Paste the whole key file, from { to }.');
  }
  if (sa.private_key) sa.private_key = sa.private_key.replace(/\n/g, '\n');
  return sa;
}

export function admin() {
  if (!getApps().length) {
    const sa = serviceAccount();
    initializeApp({ credential: cert(sa), projectId: sa.project_id });
  }
  return { db: getFirestore(), auth: getAuth() };
}

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export const json = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
});

// Wraps a handler so errors become tidy JSON responses.
export const handle = (fn) => async (req, ctx) => {
  try {
    return await fn(req, ctx);
  } catch (e) {
    if (e instanceof HttpError) return json(e.status, { error: e.message });
    console.error(e);
    return json(500, { error: 'Something went wrong on the server.' });
  }
};

export async function readJson(req) {
  if (req.method !== 'POST') throw new HttpError(405, 'Use POST.');
  const text = await req.text();
  if (text.length > 8000) throw new HttpError(413, 'Too big.');
  try { return JSON.parse(text || '{}'); } catch { throw new HttpError(400, 'Bad JSON.'); }
}

// Only the owner (checked with their Firebase sign-in token) may manage devices.
export async function requireOwner(token) {
  if (!token || typeof token !== 'string') throw new HttpError(401, 'Sign in first.');
  const { auth } = admin();
  let decoded;
  try { decoded = await auth.verifyIdToken(token); } catch { throw new HttpError(401, 'Your sign-in has expired. Sign in again.'); }
  if (decoded.uid !== OWNER_UID) throw new HttpError(403, 'Only the owner can do this.');
  return decoded;
}

// The Web Push (VAPID) key pair. Made once, then kept in Firestore.
let vapidCache = null;
export async function vapid() {
  if (vapidCache) return vapidCache;
  const { db } = admin();
  const ref = db.doc('push/vapid');
  let snap = await ref.get();
  if (!snap.exists) {
    const keys = webpush.generateVAPIDKeys();
    try {
      await ref.create({ publicKey: keys.publicKey, privateKey: keys.privateKey, createdAt: new Date() });
    } catch { /* another function made it first; use theirs */ }
    snap = await ref.get();
  }
  const { publicKey, privateKey } = snap.data();
  vapidCache = { publicKey, privateKey };
  return vapidCache;
}

export const subId = (endpoint) => createHash('sha256').update(endpoint).digest('hex').slice(0, 40);
export const subsCol = () => admin().db.collection('push/owner/subs');

export function cleanSubscription(s) {
  if (!s || typeof s !== 'object') return null;
  const { endpoint, keys } = s;
  if (typeof endpoint !== 'string' || !/^https:\/\//.test(endpoint) || endpoint.length > 1000) return null;
  if (!keys || typeof keys.p256dh !== 'string' || typeof keys.auth !== 'string') return null;
  if (keys.p256dh.length > 200 || keys.auth.length > 100) return null;
  return { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } };
}

// Sends one notification to every device the owner turned on.
// payload: { title, body, url, tag }. Dead devices are removed.
export async function sendToOwner(payload) {
  const { publicKey, privateKey } = await vapid();
  const snap = await subsCol().get();
  const data = JSON.stringify(payload);
  let sent = 0;
  await Promise.all(snap.docs.map(async (d) => {
    try {
      await webpush.sendNotification(d.data().subscription, data, {
        vapidDetails: { subject: CONTACT, publicKey, privateKey },
        TTL: 60 * 60 * 12,
        urgency: 'high',
      });
      sent += 1;
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) await d.ref.delete().catch(() => {});
      else console.warn('push failed', e.statusCode, e.body || e.message);
    }
  }));
  return { devices: snap.size, sent };
}
