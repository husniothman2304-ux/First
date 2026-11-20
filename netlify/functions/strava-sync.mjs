// Every 30 minutes: fetch the latest Strava activities into the website.
// Does nothing until Strava is connected.
import { handle, json } from '../lib/push.mjs';
import { sync } from '../lib/strava.mjs';

export default handle(async () => {
  const r = await sync();
  console.log('strava sync', r);
  return json(200, r);
});

export const config = { schedule: '*/30 * * * *' };
