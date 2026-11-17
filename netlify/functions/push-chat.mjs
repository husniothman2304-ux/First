// POST /api/push/chat  { threadId }
// Called by a visitor's browser right after they send a chat message.
// The function reads the chat itself, so a caller can't choose what the
// notification says, and each message is notified at most once.
import { handle, json, readJson, admin, sendToOwner, HttpError } from '../lib/push.mjs';

export default handle(async (req) => {
  const { threadId } = await readJson(req);
  if (typeof threadId !== 'string' || !/^[A-Za-z0-9_-]{20,100}$/.test(threadId)) throw new HttpError(400, 'Bad chat id.');

  const { db } = admin();
  const snap = await db.doc(`threads/${threadId}`).get();
  if (!snap.exists) return json(200, { skipped: 'no chat' });
  const t = snap.data();
  const lastAt = t.lastAt && t.lastAt.toMillis ? t.lastAt.toMillis() : 0;
  if (t.lastFrom !== 'guest' || !t.unreadOwner || Date.now() - lastAt > 5 * 60e3) return json(200, { skipped: 'nothing new' });

  // Only once per message.
  const sentRef = db.doc(`push/owner/sent/${threadId}`);
  const fresh = await db.runTransaction(async (tx) => {
    const s = await tx.get(sentRef);
    if (s.exists && s.data().lastAt >= lastAt) return false;
    tx.set(sentRef, { lastAt });
    return true;
  });
  if (!fresh) return json(200, { skipped: 'already sent' });

  const r = await sendToOwner({
    title: `💬 ${String(t.name || 'Someone').slice(0, 60)}`,
    body: t.lastText || 'New message',
    url: `#/inbox/${threadId}`,
    tag: `chat-${threadId}`,
  });
  return json(200, r);
});

export const config = { path: '/api/push/chat' };
