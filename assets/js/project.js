// Project build pages: status, progress, specs, milestones, a dated build log
// and a gallery of build photos. Used by the project editor and project page.
import { $, $$, esc, md, icon, imgSrc, toast, resizeImage, isImageFile } from './ui.js';

export const STATUSES = ['Planning', 'Designing', 'Building', 'Testing', 'Flying', 'Complete', 'On hold'];
export const MAX_PHOTOS = 24;
// A new project starts with the same layout as the F-16 build page: these spec
// rows, starter milestones and write-up headings. Empty spec rows aren't shown.
const SPEC_HINTS = ['Airframe', 'Printer', 'Materials', 'Power (EDF / motor)', 'ESC', 'Battery', 'Servos', 'Radio / receiver'];
const MILESTONE_HINTS = ['Plan the build and buy the parts', 'Design or prepare the parts', 'Build it', 'Test it', 'Finish and share it'];
export const BODY_TEMPLATE = `## The plan

_What is it, and why are you building it?_

## How I built it

_Materials, tools and the settings that worked._

| Setting | Value |
| --- | --- |
| | |

## Problems and fixes

_What went wrong, and how you solved it._

## What's next

_The next steps._`;

const clamp = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
const todayIso = () => new Date().toISOString().slice(0, 10);
const fmtDate = (s) => {
  try { const [y, m, d] = s.split('-').map(Number); return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(y, m - 1, d)); } catch { return s; }
};

// ── Card extras (status + progress) ─────────────────────────
export function projectCardExtras(i) {
  if (!i.status && !i.progress) return '';
  const p = clamp(i.progress);
  return `
    <div class="pj-mini">
      ${i.status ? `<span class="pj-status s-${esc(i.status.toLowerCase().replace(/\s+/g, '-'))}">${esc(i.status)}</span>` : ''}
      ${i.progress !== undefined && i.progress !== '' ? `<span class="pj-bar" aria-label="${p}% complete"><i style="width:${p}%"></i></span><span class="pj-pct">${p}%</span>` : ''}
    </div>`;
}

// ── Project page sections ───────────────────────────────────
// Returns { top, bottom }: progress + specs go above the write-up; milestones,
// photos and the build log go below it. The owner also gets an "Add photos" button.
export function projectDetailsHTML(i, owner = false) {
  const specs = (i.specs || []).filter((s) => s.k && s.v);
  const ms = (i.milestones || []).filter((m) => m.text);
  const log = (i.log || []).filter((l) => l.text).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const photos = Array.isArray(i.photos) ? i.photos : [];
  const done = ms.filter((m) => m.done).length;
  const p = clamp(i.progress !== undefined && i.progress !== '' ? i.progress : (ms.length ? (done / ms.length) * 100 : 0));
  const hasProgress = i.status || ms.length || (i.progress !== undefined && i.progress !== '');
  const nextUp = ms.find((m) => !m.done);

  const top = `
    ${hasProgress ? `
      <section class="pj-progress">
        <div class="pj-ring" style="--p:${p}" role="img" aria-label="${p}% complete"><span>${p}<small>%</small></span></div>
        <div class="pj-progress-text">
          ${i.status ? `<span class="pj-status s-${esc(i.status.toLowerCase().replace(/\s+/g, '-'))}">${esc(i.status)}</span>` : ''}
          ${ms.length ? `<p><strong>${done} of ${ms.length}</strong> milestones done</p>` : ''}
          ${nextUp ? `<p class="muted">Next up: ${esc(nextUp.text)}</p>` : ms.length ? '<p class="muted">All milestones done 🎉</p>' : ''}
        </div>
      </section>` : ''}
    ${specs.length ? `
      <section class="pj-sec">
        <h2 class="pj-h">${icon('projects')} Specs</h2>
        <dl class="pj-specs">${specs.map((s) => `<div><dt>${esc(s.k)}</dt><dd>${esc(s.v)}</dd></div>`).join('')}</dl>
      </section>` : ''}`;
  const bottom = `
    ${ms.length ? `
      <section class="pj-sec">
        <h2 class="pj-h">${icon('notes')} Milestones</h2>
        <ol class="pj-ms">${ms.map((m) => `<li class="${m.done ? 'done' : ''}"><span class="pj-check" aria-hidden="true">${m.done ? '✓' : ''}</span><span>${esc(m.text)}</span>${m.done ? '<span class="sr-only">(done)</span>' : ''}</li>`).join('')}</ol>
      </section>` : ''}
    ${photos.length || owner ? `
      <section class="pj-sec">
        <h2 class="pj-h">${icon('photos')} Build photos <span class="count">${photos.length}</span>
          ${owner && photos.length < MAX_PHOTOS ? `<label class="btn sm pj-add-ph">${icon('plus')} Add photos
            <input type="file" accept="image/*" multiple hidden data-add-photos="${esc(i.id)}"></label>` : ''}</h2>
        <div class="pj-photos">${photos.map((ph, n) => `
          <button type="button" class="pj-ph" data-act="view-photo" data-full="${esc(ph.url)}" aria-label="View build photo ${n + 1}">
            <img ${imgSrc(ph.mediumUrl || ph.url)} alt="${esc(ph.caption || `Build photo ${n + 1}`)}" loading="lazy">
            ${ph.caption ? `<span class="caption">${esc(ph.caption)}</span>` : ''}
          </button>`).join('')}</div>
      </section>` : ''}
    ${log.length ? `
      <section class="pj-sec">
        <h2 class="pj-h">${icon('blog')} Build log</h2>
        <ol class="pj-log">${log.map((l) => `<li><time>${esc(fmtDate(l.date))}</time><div class="prose">${md(l.text)}</div></li>`).join('')}</ol>
      </section>` : ''}`;
  return { top, bottom };
}

// ── Editor fields ───────────────────────────────────────────
const specRow = (s = {}) => `
  <div class="pj-row">
    <input class="pj-k" maxlength="40" placeholder="e.g. Battery" value="${esc(s.k || '')}" aria-label="Spec name">
    <input class="pj-v" maxlength="120" placeholder="e.g. 6S 3300 mAh" value="${esc(s.v || '')}" aria-label="Spec value">
    <button type="button" class="icon-btn sm" data-pj="del" aria-label="Remove">${icon('x')}</button>
  </div>`;
const msRow = (m = {}) => `
  <div class="pj-row">
    <label class="pj-done" title="Done"><input type="checkbox" ${m.done ? 'checked' : ''} aria-label="Done"><span></span></label>
    <input class="pj-text" maxlength="140" placeholder="e.g. Install EDF and ESC" value="${esc(m.text || '')}" aria-label="Milestone">
    <button type="button" class="icon-btn sm" data-pj="del" aria-label="Remove">${icon('x')}</button>
  </div>`;
const logRow = (l = {}) => `
  <div class="pj-row pj-logrow">
    <input type="date" class="pj-date" value="${esc(l.date || todayIso())}" aria-label="Date">
    <textarea class="pj-text" rows="2" maxlength="2000" placeholder="What did you do? What did you learn?" aria-label="Update">${esc(l.text || '')}</textarea>
    <button type="button" class="icon-btn sm" data-pj="del" aria-label="Remove">${icon('x')}</button>
  </div>`;

export function projectFieldsHTML(it) {
  const specs = it.specs && it.specs.length ? it.specs : (it.id ? [] : SPEC_HINTS.map((k) => ({ k, v: '' })));
  const milestones = it.milestones || (it.id ? [] : MILESTONE_HINTS.map((text) => ({ text, done: false })));
  return `
    <fieldset class="pj-edit">
      <legend>Build details</legend>
      <div class="row two">
        <label>Status<select name="status">
          <option value="">—</option>
          ${STATUSES.map((s) => `<option ${it.status === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select></label>
        <label>Progress <span class="muted pj-pct-out">${it.progress !== undefined && it.progress !== '' ? `${clamp(it.progress)}%` : 'auto'}</span>
          <input name="progress" type="range" min="0" max="100" step="5" value="${clamp(it.progress)}" data-set="${it.progress !== undefined && it.progress !== '' ? 1 : ''}">
        </label>
      </div>
      <p class="muted small pj-help">Leave progress on "auto" to calculate it from milestones you tick off.</p>

      <div class="pj-block" data-list="specs">
        <div class="pj-block-head"><strong>Specs</strong><button type="button" class="btn sm ghost" data-pj="add-spec">${icon('plus')} Add spec</button></div>
        <div class="pj-rows">${specs.map(specRow).join('')}</div>
      </div>
      <div class="pj-block" data-list="milestones">
        <div class="pj-block-head"><strong>Milestones</strong><button type="button" class="btn sm ghost" data-pj="add-ms">${icon('plus')} Add milestone</button></div>
        <div class="pj-rows">${milestones.map(msRow).join('')}</div>
      </div>
      <div class="pj-block" data-list="log">
        <div class="pj-block-head"><strong>Build log</strong><button type="button" class="btn sm ghost" data-pj="add-log">${icon('plus')} Add update</button></div>
        <div class="pj-rows">${(it.log || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(logRow).join('')}</div>
      </div>
      <div class="pj-block">
        <div class="pj-block-head"><strong>Build photos</strong><span class="muted small">up to ${MAX_PHOTOS}</span></div>
        <div class="dump-previews pj-gallery"></div>
      </div>
    </fieldset>`;
}

// Wires up the fields. Returns collect() for the data and uploadPhotos() for the gallery.
export function mountProjectFields(el, it, api) {
  const entries = (Array.isArray(it.photos) ? it.photos : []).map((photo) => ({ kind: 'old', photo }));
  const grid = $('.pj-gallery', el);
  const range = $('[name=progress]', el);
  const pctOut = $('.pj-pct-out', el);

  range.addEventListener('input', () => { range.dataset.set = '1'; pctOut.textContent = `${range.value}%`; });
  pctOut.addEventListener('dblclick', () => { range.dataset.set = ''; pctOut.textContent = 'auto'; });

  const add = (list, html) => {
    const rows = $(`[data-list=${list}] .pj-rows`, el);
    rows.insertAdjacentHTML(list === 'log' ? 'afterbegin' : 'beforeend', html);
    const first = list === 'log' ? rows.firstElementChild : rows.lastElementChild;
    const f = first && first.querySelector('.pj-text, .pj-k');
    if (f) f.focus();
  };
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pj]');
    if (!b) return;
    const a = b.dataset.pj;
    if (a === 'del') b.closest('.pj-row').remove();
    if (a === 'add-spec') add('specs', specRow());
    if (a === 'add-ms') add('milestones', msRow());
    if (a === 'add-log') add('log', logRow());
  });

  const drawPhotos = () => {
    grid.innerHTML = entries.map((e, i) => `
      <div class="dp">
        ${e.kind === 'new' ? `<img src="${esc(e.preview)}" alt="">` : `<img ${imgSrc(e.photo.thumbUrl || e.photo.mediumUrl || e.photo.url)} alt="">`}
        <button type="button" class="dp-x" data-i="${i}" title="Remove" aria-label="Remove photo">${icon('x')}</button>
      </div>`).join('')
      + (entries.length < MAX_PHOTOS ? `<label class="dp dp-add">${icon('plus')}<span>Add photos</span><input type="file" accept="image/*" multiple hidden></label>` : '');
    const input = $('.dp-add input', grid);
    if (input) input.addEventListener('change', () => {
      for (const f of input.files) {
        if (entries.length >= MAX_PHOTOS) { toast(`Up to ${MAX_PHOTOS} build photos.`, 'error'); break; }
        if (isImageFile(f)) entries.push({ kind: 'new', file: f, preview: URL.createObjectURL(f) });
      }
      drawPhotos();
    });
  };
  grid.addEventListener('click', (e) => {
    const x = e.target.closest('.dp-x');
    if (!x) return;
    const [gone] = entries.splice(Number(x.dataset.i), 1);
    if (gone && gone.preview) URL.revokeObjectURL(gone.preview);
    drawPhotos();
  });
  drawPhotos();

  return {
    collect() {
      const rows = (list) => $$(`[data-list=${list}] .pj-row`, el);
      return {
        status: $('[name=status]', el).value,
        progress: range.dataset.set ? clamp(range.value) : '',
        specs: rows('specs').map((r) => ({ k: $('.pj-k', r).value.trim(), v: $('.pj-v', r).value.trim() })).filter((s) => s.k && s.v).slice(0, 30),
        milestones: rows('milestones').map((r) => ({ text: $('.pj-text', r).value.trim(), done: $('input[type=checkbox]', r).checked })).filter((m) => m.text).slice(0, 60),
        log: rows('log').map((r) => ({ date: $('.pj-date', r).value || todayIso(), text: $('.pj-text', r).value.trim() })).filter((l) => l.text).slice(0, 200),
      };
    },
    hasNewPhotos: () => entries.some((e) => e.kind === 'new'),
    // Uploads new photos (reporting progress) and returns the final list.
    async uploadPhotos(onProgress) {
      const total = entries.filter((e) => e.kind === 'new').length;
      const out = [];
      let n = 0;
      let failed = 0;
      for (const e of entries) {
        if (e.kind === 'old') { out.push(e.photo); continue; }
        n++;
        if (onProgress) onProgress(n, total);
        try {
          const up = await api.uploadImage(await resizeImage(e.file, 2400, 0.95), { medium: true });
          out.push({ url: up.url, thumbUrl: '', mediumUrl: up.mediumUrl || '', path: up.path, mediumPath: up.mediumPath || '' });
        } catch (err) {
          console.error(err);
          failed++;
        }
      }
      if (failed) toast(`${failed} photo${failed > 1 ? 's' : ''} couldn't be uploaded.`, 'error');
      return out;
    },
    removedPaths(finalPhotos) {
      const keep = new Set(finalPhotos.flatMap((p) => [p.path, p.mediumPath]));
      return (Array.isArray(it.photos) ? it.photos : []).flatMap((p) => [p.path, p.mediumPath]).filter((p) => p && !keep.has(p));
    },
  };
}

