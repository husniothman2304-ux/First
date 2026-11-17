// GET /api/push/key: the public Web Push key the browser needs to subscribe.
// The library is loaded inside the handler so that, if it fails to load on
// Netlify, the reason is reported instead of a bare 502.
export default async (req, ctx) => {
  let lib;
  try {
    lib = await import('../lib/push.mjs');
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'The notification server failed to start.', detail: String((e && e.stack) || e).slice(0, 600), node: process.version }), {
      status: 500, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  }
  return lib.handle(async () => lib.json(200, { publicKey: (await lib.vapid()).publicKey }))(req, ctx);
};

export const config = { path: '/api/push/key' };
