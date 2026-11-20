// "Latest from Strava" on the Activities page. The activities come from the
// Netlify function /api/strava/feed, which syncs from Strava every 30 minutes.
// Only activities that are public on Strava, stats only (no maps).
import { esc, toast, friendlyError } from './ui.js';

const SPORTS = {
  Run: ['🏃', 'Run'], TrailRun: ['🏃', 'Trail run'], VirtualRun: ['🏃', 'Virtual run'],
  Walk: ['🚶', 'Walk'], Hike: ['🥾', 'Hike'],
  Ride: ['🚴', 'Ride'], MountainBikeRide: ['🚵', 'MTB ride'], GravelRide: ['🚴', 'Gravel ride'],
  EBikeRide: ['🚴', 'E-bike ride'], VirtualRide: ['🚴', 'Virtual ride'],
  Swim: ['🏊', 'Swim'], WeightTraining: ['🏋️', 'Weights'], Workout: ['💪', 'Workout'],
  Yoga: ['🧘', 'Yoga'], Soccer: ['⚽', 'Football'], Badminton: ['🏸', 'Badminton'],
  Tennis: ['🎾', 'Tennis'], Basketball: ['🏀', 'Basketball'], Rowing: ['🚣', 'Rowing'],
  Kayaking: ['🛶', 'Kayaking'], RockClimbing: ['🧗', 'Climbing'],
};
const sport = (t) => SPORTS[t] || ['⚡', String(t).replace(/([a-z])([A-Z])/g, '$1 $2')];
const ON_FOOT = /Run|Walk|Hike/;
const ON_WHEELS = /Ride|Skate|Ski|Wheelchair/;

function dur(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

// Strava's start_date_local is local time written as if it were UTC.
const when = (iso) => new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(iso));

function stats(a) {
  const out = [];
  const km = a.distance / 1000;
  if (a.distance > 0) out.push([km >= 10 ? km.toFixed(1) : km.toFixed(2), 'km']);
  out.push([dur(a.moving), 'time']);
  if (a.distance > 0 && a.moving > 0) {
    if (a.sport === 'Swim') out.push([mmss(a.moving / (a.distance / 100)), '/100 m']);
    else if (ON_FOOT.test(a.sport)) out.push([mmss(a.moving / km), '/km']);
    else if (ON_WHEELS.test(a.sport)) out.push([(a.speed * 3.6).toFixed(1), 'km/h']);
  }
  return out;
}

function cardHTML(a) {
  const [emoji, label] = sport(a.sport);
  return `
    <a class="sv-card glass" href="https://www.strava.com/activities/${esc(a.id)}" target="_blank" rel="noopener">
      <span class="sv-top"><span class="sv-sport">${emoji} ${esc(label)}</span><time>${esc(when(a.start))}</time></span>
      <strong class="sv-name">${esc(a.name)}</strong>
      <span class="sv-stats">${stats(a).map(([v, u]) => `<span><b>${esc(v)}</b>${esc(u)}</span>`).join('')}</span>
      <span class="sv-foot">${a.elev > 0 ? `<span>↗ ${a.elev} m</span>` : '<span></span>'}<span class="sv-view">View on Strava</span></span>
    </a>`;
}

async function ownerCall(getToken, action) {
  const r = await fetch('/api/strava/owner', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: await getToken(), action }),
  }).catch(() => null);
  const d = r ? await r.json().catch(() => null) : null;
  if (!r || !r.ok || !d) throw new Error((d && d.error) || 'The Strava server is not available on this copy of the site.');
  return d;
}

const head = (right = '') => `
  <div class="block-head">
    <h2><span class="sv-logo" aria-hidden="true">▲</span> Latest from Strava</h2>
    <div class="row">${right}</div>
  </div>`;

export async function mountStrava(el, { owner = false, getToken }) {
  let feed = null;
  try {
    // The owner skips the 5-minute cached copy, so a sync shows up straight away.
    const r = await fetch(`/api/strava/feed${owner ? `?fresh=${Date.now()}` : ''}`);
    if (r.ok) feed = await r.json();
  } catch { /* offline, or no server (local preview) */ }
  if (!el.isConnected) return;

  if (!feed || !feed.connected) {
    if (!owner) { el.remove(); return; }
    el.innerHTML = `${head()}
      <div class="sv-empty glass">
        <p>${feed ? 'Connect your Strava account to show your latest public activities here. New ones appear automatically.'
          : 'Strava sync runs on the live site only.'}</p>
        ${feed ? '<button class="btn primary sv-connect" data-sv="connect">Connect Strava</button>' : ''}
      </div>`;
  } else if (!feed.activities.length && !owner) {
    el.remove();
    return;
  } else {
    const ownerBtns = owner ? `
      <button class="btn sm" data-sv="sync">Sync now</button>
      <button class="btn sm" data-sv="disconnect">Disconnect</button>` : '';
    const profile = feed.athleteId
      ? `<a class="btn sm sv-follow" href="https://www.strava.com/athletes/${esc(feed.athleteId)}" target="_blank" rel="noopener">View on Strava</a>` : '';
    el.innerHTML = `${head(profile + ownerBtns)}
      ${feed.activities.length
        ? `<div class="sv-row">${feed.activities.map(cardHTML).join('')}</div>`
        : '<div class="sv-empty glass"><p>No public activities yet. Only activities set to “Everyone” on Strava appear here.</p></div>'}
      <p class="sv-powered muted small">Powered by Strava${owner && feed.syncedAt ? ` · synced ${new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' }).format(new Date(feed.syncedAt))}` : ''}</p>`;
  }

  el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-sv]');
    if (!b) return;
    b.disabled = true;
    try {
      if (b.dataset.sv === 'connect') {
        const { url } = await ownerCall(getToken, 'connect');
        location.href = url;
        return;
      }
      if (b.dataset.sv === 'sync') {
        const r = await ownerCall(getToken, 'sync');
        toast(`Synced: ${r.count} public activit${r.count === 1 ? 'y' : 'ies'} from Strava.`);
      }
      if (b.dataset.sv === 'disconnect') {
        if (!confirm('Disconnect Strava? Your Strava activities will be removed from the website.')) return;
        await ownerCall(getToken, 'disconnect');
        toast('Strava disconnected.');
      }
      const fresh = el.cloneNode(false);
      el.replaceWith(fresh);
      mountStrava(fresh, { owner, getToken });
    } catch (err) {
      console.error(err);
      toast(friendlyError(err), 'error');
    } finally {
      b.disabled = false;
    }
  });
}

// After Strava sends the owner back: show how it went, then tidy the address.
export function stravaReturnToast() {
  const r = new URLSearchParams(location.search).get('strava');
  if (!r) return;
  const msg = {
    connected: ['Strava connected. Your public activities now show on Activities.', 'ok'],
    denied: ['Strava connection was cancelled.', 'info'],
    failed: ['Strava could not be connected. Try again.', 'error'],
  }[r];
  if (msg) toast(msg[0], msg[1]);
  history.replaceState(null, '', location.pathname + location.hash);
}
