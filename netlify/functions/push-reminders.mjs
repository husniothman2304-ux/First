// Runs every hour. At 8 AM Malaysia time it sends today's calendar reminders
// (RC plane day, tests today/tomorrow, my own events); 2 hours before a timed
// test it sends a heads-up. Calendar data comes from the site's own
// calendar-data.js plus the events I add on the site (Firestore).
import { CAL_EVENTS } from '../../assets/js/calendar-data.js';
import { admin, sendToOwner, json, handle } from '../lib/push.mjs';
import { remindersFor, mytNow } from '../lib/reminders.mjs';

async function ownEvents() {
  const snap = await admin().db.collection('items').where('type', '==', 'event').get();
  return snap.docs.map((d) => d.data())
    .filter((i) => /^\d{4}-\d\d-\d\d$/.test(i.start || ''))
    .map((i) => ({
      type: i.eventType || 'personal', title: i.title, start: i.start, end: i.end || '',
      time: i.time || '', note: String(i.body || '').slice(0, 120),
    }));
}

export default handle(async () => {
  const now = Date.now();
  const list = remindersFor(now, CAL_EVENTS);
  if (mytNow(now).hour === 8) list.push(...remindersFor(now, await ownEvents()));
  for (const p of list) await sendToOwner(p);
  console.log(`reminders: ${list.length}`, list.map((p) => p.title));
  return json(200, { sent: list.length });
});

export const config = { schedule: '0 * * * *' };
