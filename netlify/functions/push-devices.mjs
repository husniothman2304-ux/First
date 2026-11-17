// POST /api/push/devices  { token, action: 'add' | 'remove' | 'test', subscription?, endpoint?, label? }
// Owner only (checked with the Firebase sign-in token).
import { FieldValue } from 'firebase-admin/firestore';
import { handle, json, readJson, requireOwner, cleanSubscription, subId, subsCol, sendToOwner, HttpError } from '../lib/push.mjs';

export default handle(async (req) => {
  const body = await readJson(req);
  await requireOwner(body.token);

  if (body.action === 'add') {
    const subscription = cleanSubscription(body.subscription);
    if (!subscription) throw new HttpError(400, 'That device subscription looks wrong.');
    const label = String(body.label || 'Device').slice(0, 40);
    await subsCol().doc(subId(subscription.endpoint)).set({ subscription, label, createdAt: FieldValue.serverTimestamp() });
    return json(200, { ok: true });
  }

  if (body.action === 'remove') {
    if (typeof body.endpoint !== 'string') throw new HttpError(400, 'Missing endpoint.');
    await subsCol().doc(subId(body.endpoint)).delete();
    return json(200, { ok: true });
  }

  if (body.action === 'test') {
    const r = await sendToOwner({
      title: '🔔 Notifications are on',
      body: 'You will get new chat messages, the 8 AM RC plane task, and test reminders.',
      url: '#/calendar', tag: 'test',
    });
    return json(200, r);
  }

  throw new HttpError(400, 'Unknown action.');
});

export const config = { path: '/api/push/devices' };
