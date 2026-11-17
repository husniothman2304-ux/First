// GET /api/push/key: the public Web Push key the browser needs to subscribe.
import { handle, json, vapid } from '../lib/push.mjs';

export default handle(async () => json(200, { publicKey: (await vapid()).publicKey }));

export const config = { path: '/api/push/key' };
