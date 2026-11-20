// GET /api/strava/feed: the public Strava activities shown on the Activities
// page. Netlify's CDN keeps a copy for 5 minutes so page views stay cheap.
import { handle } from '../lib/push.mjs';
import { feed } from '../lib/strava.mjs';

export default handle(async () => new Response(JSON.stringify(await feed()), {
  status: 200,
  headers: {
    'content-type': 'application/json',
    'cache-control': 'public, max-age=0, must-revalidate',
    'netlify-cdn-cache-control': 'public, durable, s-maxage=300, stale-while-revalidate=3600',
  },
}));

export const config = { path: '/api/strava/feed' };
