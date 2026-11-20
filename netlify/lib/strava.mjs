// Strava → website sync.
//
// Secrets: STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET (Netlify environment
// variables, from strava.com/settings/api). The owner connects once with the
// "Connect Strava" button; the tokens are then kept in Firestore under
// strava/auth, which has no rule in firestore.rules, so browsers can't read it.
//
// Only activities whose Strava visibility is "Everyone" are published, and
// only stats: no map, no start/end coordinates.
import { randomBytes } from 'node:crypto';
import { admin, HttpError } from './push.mjs';

const AUTH = 'strava/auth';
const FEED = 'strava/feed';
const OAUTH = 'strava/oauth';
const API = 'https://www.strava.com/api/v3';

function creds() {
  const id = (process.env.STRAVA_CLIENT_ID || '').trim();
  const secret = (process.env.STRAVA_CLIENT_SECRET || '').trim();
  if (!id || !secret) {
    const missing = [!id && 'STRAVA_CLIENT_ID', !secret && 'STRAVA_CLIENT_SECRET'].filter(Boolean).join(' and ');
    const typo = Object.keys(process.env).filter((k) => /STRAVA/i.test(k) && !['STRAVA_CLIENT_ID', 'STRAVA_CLIENT_SECRET'].includes(k));
    throw new HttpError(503, `Strava is not set up yet: Netlify has no ${missing}.${typo.length ? ` (Found ${typo.join(', ')}: check the spelling.)` : ''}`);
  }
  return { id, secret };
}

async function tokenRequest(params) {
  const r = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new HttpError(502, `Strava said no: ${d.message || r.status}`);
  return d;
}

const db = () => admin().db;

// ── Connecting ──────────────────────────────────────────────
export async function startConnect(origin) {
  const { id } = creds();
  const state = randomBytes(16).toString('hex');
  await db().doc(OAUTH).set({ state, createdAt: Date.now() });
  const q = new URLSearchParams({
    client_id: id,
    redirect_uri: `${origin}/api/strava/callback`,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read',
    state, // Strava sends this back; the callback checks it matches
  });
  return `https://www.strava.com/oauth/authorize?${q}`;
}

export async function finishConnect({ code, state, scope }) {
  const { id, secret } = creds();
  const ref = db().doc(OAUTH);
  const s = await ref.get();
  const saved = s.exists ? s.data() : null;
  await ref.delete().catch(() => {});
  if (!saved || !state || saved.state !== state || Date.now() - saved.createdAt > 15 * 60e3) {
    throw new HttpError(400, 'This Strava link expired. Press Connect Strava again.');
  }
  if (!/activity:read/.test(scope || '')) throw new HttpError(400, 'Strava access to activities was not allowed.');
  const t = await tokenRequest({ client_id: id, client_secret: secret, code, grant_type: 'authorization_code' });
  await db().doc(AUTH).set({
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    expires_at: t.expires_at,
    athleteId: t.athlete ? String(t.athlete.id) : '',
    connectedAt: Date.now(),
  });
}

export async function disconnect() {
  const snap = await db().doc(AUTH).get();
  if (snap.exists) {
    await fetch('https://www.strava.com/oauth/deauthorize', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ access_token: snap.data().access_token }),
    }).catch(() => {});
  }
  await Promise.all([db().doc(AUTH).delete(), db().doc(FEED).delete()]);
}

// ── Syncing ─────────────────────────────────────────────────
async function accessToken() {
  const ref = db().doc(AUTH);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const a = snap.data();
  if (a.expires_at * 1000 > Date.now() + 120e3) return a.access_token;
  const { id, secret } = creds();
  const t = await tokenRequest({ client_id: id, client_secret: secret, grant_type: 'refresh_token', refresh_token: a.refresh_token });
  await ref.set({ access_token: t.access_token, refresh_token: t.refresh_token, expires_at: t.expires_at }, { merge: true });
  return t.access_token;
}

// Only what the page shows. No map, no coordinates.
const slim = (a) => ({
  id: String(a.id),
  name: String(a.name || '').slice(0, 120),
  sport: String(a.sport_type || a.type || 'Workout'),
  start: String(a.start_date_local || a.start_date || ''),
  distance: Math.round(a.distance || 0),
  moving: Math.round(a.moving_time || 0),
  elev: Math.round(a.total_elevation_gain || 0),
  speed: Number(a.average_speed || 0),
  kudos: Number(a.kudos_count || 0),
});

export async function sync() {
  const token = await accessToken();
  if (!token) return { connected: false };
  const r = await fetch(`${API}/athlete/activities?per_page=40`, { headers: { authorization: `Bearer ${token}` } });
  if (!r.ok) throw new HttpError(502, `Strava activities could not be loaded (${r.status}).`);
  const list = await r.json();
  const activities = list.filter((a) => a.visibility === 'everyone' && !a.private).slice(0, 20).map(slim);
  await db().doc(FEED).set({ activities, syncedAt: Date.now() });
  return { connected: true, count: activities.length, checked: list.length };
}

export async function feed() {
  const [auth, f] = await Promise.all([db().doc(AUTH).get(), db().doc(FEED).get()]);
  if (!auth.exists) return { connected: false, activities: [] };
  const d = f.exists ? f.data() : {};
  return {
    connected: true,
    athleteId: auth.data().athleteId || '',
    activities: d.activities || [],
    syncedAt: d.syncedAt || 0,
  };
}
