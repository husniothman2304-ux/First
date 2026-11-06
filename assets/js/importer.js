// Ready-made projects kept in the repo: content/projects/<id>/project.json plus
// its photos, listed in content/projects/index.json. The owner imports one with
// a click; its photos are uploaded and it becomes a normal, editable project.
import { esc, icon, resizeImage } from './ui.js';

const BASE = 'content/projects/';

async function getJson(url) {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`Couldn't load ${url}`);
  return r.json();
}

// Packages that haven't been imported yet (an imported project keeps its importId).
export async function pendingImports(items) {
  let ids;
  try { ids = await getJson(`${BASE}index.json`); } catch { return []; }
  const done = new Set(items.map((i) => i.importId).filter(Boolean));
  const out = [];
  for (const id of ids) {
    if (done.has(id)) continue;
    try { out.push({ ...(await getJson(`${BASE}${id}/project.json`)), id }); } catch { /* skip a broken package */ }
  }
  return out;
}

export function importCardsHTML(list) {
  return list.map((p) => `
    <div class="empty glass import-card">
      ${icon('projects', 'xl')}
      <p><strong>${esc(p.title)}</strong> is ready to import.<br>
        <span class="muted small">Its photos are uploaded and it becomes a normal project you can edit.</span></p>
      <button class="btn primary" data-act="import-project" data-id="${esc(p.id)}">${icon('plus')} Import project</button>
    </div>`).join('');
}

async function upload(api, id, file) {
  const r = await fetch(`${BASE}${id}/${file}`);
  if (!r.ok) throw new Error(`Couldn't load ${file}`);
  return api.uploadImage(await resizeImage(await r.blob(), 2400, 0.95), { medium: true });
}

// Uploads the cover and photos (reporting progress), saves the project and returns its id.
// The cover is uploaded on its own even when it is also a gallery photo, so
// removing that photo in the editor later can't break the cover.
export async function importProject(api, id, onProgress) {
  const p = await getJson(`${BASE}${id}/project.json`);
  const photos = Array.isArray(p.photos) ? p.photos : [];
  const total = photos.length + (p.cover ? 1 : 0);
  let n = 0;
  const step = async (file) => { if (onProgress) onProgress(++n, total); return upload(api, id, file); };

  const cover = p.cover ? await step(p.cover.file) : null;
  const gallery = [];
  for (const ph of photos) {
    const up = await step(ph.file);
    gallery.push({ url: up.url, thumbUrl: '', mediumUrl: up.mediumUrl || '', path: up.path, mediumPath: up.mediumPath || '', caption: ph.caption || '' });
  }
  return api.saveItem(null, {
    type: 'project',
    title: p.title || '',
    summary: p.summary || '',
    link: p.link || '',
    tags: (p.tags || []).slice(0, 12),
    body: p.body || '',
    published: p.published !== false,
    imageUrl: cover ? cover.url : '',
    imagePath: cover ? cover.path : '',
    thumbUrl: cover ? cover.thumbUrl || '' : '',
    mediumUrl: cover ? cover.mediumUrl || '' : '',
    mediumPath: cover ? cover.mediumPath || '' : '',
    status: p.status || '',
    progress: p.progress ?? '',
    specs: p.specs || [],
    milestones: p.milestones || [],
    log: p.log || [],
    photos: gallery,
    importId: id,
  });
}
