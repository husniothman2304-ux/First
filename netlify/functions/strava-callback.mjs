// GET /api/strava/callback: Strava sends the owner back here after
// "Connect Strava". Saves the tokens, syncs once, then returns to the site.
import { finishConnect, sync } from '../lib/strava.mjs';

const back = (origin, result) => new Response(null, {
  status: 302,
  headers: { location: `${origin}/?strava=${result}#/activities`, 'cache-control': 'no-store' },
});

export default async (req) => {
  const url = new URL(req.url);
  const p = url.searchParams;
  if (p.get('error')) return back(url.origin, 'denied');
  try {
    await finishConnect({ code: p.get('code'), state: p.get('state'), scope: p.get('scope') });
    await sync().catch((e) => console.error('first sync', e));
    return back(url.origin, 'connected');
  } catch (e) {
    console.error(e);
    return back(url.origin, 'failed');
  }
};

export const config = { path: '/api/strava/callback' };
