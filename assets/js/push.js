// Push notifications for the owner: new chat messages and calendar reminders.
// The sending happens in Netlify Functions (netlify/functions/push-*.mjs).
// On iPad / iPhone this only works in the Home Screen app (iOS 16.4+).

const API = '/api/push';

export const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export const isAppleMobile = () => /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

export function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Service worker', e));
  // A tapped notification asks an already-open window to show its page.
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data && typeof e.data.open === 'string' && e.data.open.startsWith('#/')) location.hash = e.data.open;
  });
}

// 'install' (iPad/iPhone outside the Home Screen app), 'unsupported', 'denied', 'off' or 'on'
export async function pushStatus() {
  if (!supported()) return isAppleMobile() && !isStandalone() ? 'install' : 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = reg && await reg.pushManager.getSubscription();
  return sub && Notification.permission === 'granted' ? 'on' : 'off';
}

async function call(path, body) {
  let r;
  try {
    r = await fetch(`${API}/${path}`, body
      ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
      : { cache: 'no-store' });
  } catch {
    throw new Error('Could not reach the notification server. Check your connection.');
  }
  let data = null;
  try { data = await r.json(); } catch { /* not JSON */ }
  if (!r.ok || !data) throw new Error((data && data.error) || 'The notification server is not available on this copy of the site.');
  return data;
}

function deviceLabel() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows';
  return 'Device';
}

function keyBytes(b64url) {
  const b64 = (b64url + '='.repeat((4 - (b64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

// Must be called straight from a tap: iOS only shows the permission prompt then.
export async function enablePush(getToken) {
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    throw new Error(perm === 'denied'
      ? 'Notifications are blocked. Allow them in Settings → Notifications → Husni O.'
      : 'Notifications were not allowed.');
  }
  const reg = await navigator.serviceWorker.register('sw.js');
  await navigator.serviceWorker.ready;
  const { publicKey } = await call('key');
  const old = await reg.pushManager.getSubscription();
  if (old) await old.unsubscribe().catch(() => {});
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
  await call('devices', { token: await getToken(), action: 'add', subscription: sub.toJSON(), label: deviceLabel() });
}

export async function disablePush(getToken) {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = reg && await reg.pushManager.getSubscription();
  if (!sub) return;
  await call('devices', { token: await getToken(), action: 'remove', endpoint: sub.endpoint }).catch((e) => console.warn(e));
  await sub.unsubscribe();
}

export async function testPush(getToken) {
  return call('devices', { token: await getToken(), action: 'test' });
}

// Visitor side: tell the server a chat message was just sent (it checks the chat itself).
export function pingChat(threadId) {
  fetch(`${API}/chat`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ threadId }), keepalive: true,
  }).catch(() => {});
}
