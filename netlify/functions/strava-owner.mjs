// POST /api/strava/owner  { token, action: 'connect' | 'sync' | 'disconnect' }
// Owner only (checked with the Firebase sign-in token).
import { handle, json, readJson, requireOwner, HttpError } from '../lib/push.mjs';
import { startConnect, sync, disconnect } from '../lib/strava.mjs';

export default handle(async (req) => {
  const body = await readJson(req);
  await requireOwner(body.token);
  if (body.action === 'connect') return json(200, { url: await startConnect(new URL(req.url).origin) });
  if (body.action === 'sync') return json(200, await sync());
  if (body.action === 'disconnect') { await disconnect(); return json(200, { ok: true }); }
  throw new HttpError(400, 'Unknown action.');
});

export const config = { path: '/api/strava/owner' };
