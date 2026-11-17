// Calendar page: "Up next" countdowns, a month view, the selected day's
// events, and an .ics export for phone calendars.
import { esc, icon } from './ui.js';
import { CAL_RANGE } from './calendar-data.js';

export const TYPES = {
  test: { label: 'Test', cls: 't-test' },
  exam: { label: 'Final exams', cls: 't-exam' },
  holiday: { label: 'Holiday', cls: 't-holiday' },
  break: { label: 'Break', cls: 't-break' },
  revision: { label: 'Revision', cls: 't-revision' },
  milestone: { label: 'Semester', cls: 't-milestone' },
  personal: { label: 'Personal', cls: 't-personal' },
  build: { label: 'RC plane', cls: 't-build' },
};
const RANGE_TYPES = ['break', 'exam', 'revision'];
const DAY = 864e5;

// ── Dates (all handled as local calendar days) ──────────────
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayKey = () => key(new Date());
const monthKey = (d) => key(d).slice(0, 7);
const fmt = (s, opts) => new Intl.DateTimeFormat('en-GB', opts).format(parse(s));
const fmtDay = (s) => fmt(s, { weekday: 'short', day: 'numeric', month: 'short' });
const fmtRange = (e) => (e.end && e.end !== e.start ? `${fmt(e.start, { day: 'numeric', month: 'short' })} – ${fmt(e.end, { day: 'numeric', month: 'short', year: 'numeric' })}` : fmt(e.start, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / DAY);
const covers = (e, k) => k >= e.start && k <= (e.end || e.start);

function inWords(days) {
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 7) return `In ${days} days`;
  const w = Math.round(days / 7);
  return days < 60 ? `In ${days} days` : `In ${w} weeks`;
}

// ── Pieces ──────────────────────────────────────────────────
// One day of the RC airplane plan. `full` adds the task checklist.
function buildRow(e, full) {
  const T = TYPES.build;
  const meta = [`Phase ${e.phase}`, e.hours ? `${e.hours} today` : ''].filter(Boolean).join(' · ');
  return `
    <li class="cal-ev ${T.cls}${e.big ? ' is-big' : ''}">
      <span class="cal-bar" aria-hidden="true"></span>
      <div class="cal-ev-main">
        <div class="cal-ev-top"><span class="cal-type">${T.label}</span>${e.gate ? `<span class="cal-gate">${esc(e.gate.split(' · ')[0])}</span>` : ''}</div>
        <strong>${esc(e.title)}</strong>
        <span class="cal-when">${esc(e.when || fmtRange(e))}</span>
        ${full ? `
          <span class="cal-sub">${esc(meta)}</span>
          <ol class="cal-tasks">${e.tasks.map((x) => `<li>${esc(x)}</li>`).join('')}${e.sim ? '<li class="cal-sim">Daily rule: 30–60 min of simulator practice.</li>' : ''}</ol>
          <span class="cal-done"><b>Done when:</b> ${esc(e.done)}</span>
          ${e.gate ? `<span class="cal-done"><b>Gate ${esc(e.gate.split(' · ')[0])}:</b> ${esc(e.gate.split(' · ').slice(1).join(' · '))}</span>` : ''}
          ${e.note ? `<span class="cal-sub">${esc(e.note)}</span>` : ''}` : `<span class="cal-sub">Done when: ${esc(e.done)}</span>`}
      </div>
    </li>`;
}

function eventRow(e, owner, full = true) {
  if (e.type === 'build') return buildRow(e, full);
  const T = TYPES[e.type] || TYPES.personal;
  const sub = [e.test && e.code ? `${e.test} · ${e.code}` : e.test || e.code, e.time, e.venue, e.note].filter(Boolean);
  return `
    <li class="cal-ev ${T.cls}">
      <span class="cal-bar" aria-hidden="true"></span>
      <div class="cal-ev-main">
        <div class="cal-ev-top"><span class="cal-type">${T.label}</span>${e.private ? '<span class="pill draft">Private</span>' : ''}</div>
        <strong>${esc(e.title)}</strong>
        <span class="cal-when">${esc(fmtRange(e))}</span>
        ${sub.map((x) => `<span class="cal-sub">${esc(x)}</span>`).join('')}
      </div>
      ${owner && e.id ? `<button class="icon-btn sm" data-act="edit-event" data-id="${esc(e.id)}" title="Edit event" aria-label="Edit event">${icon('edit')}</button>` : ''}
    </li>`;
}

function upNext(events) {
  const t = todayKey();
  const nextTest = events.filter((e) => e.type === 'test' && e.start >= t).sort((a, b) => a.start.localeCompare(b.start))[0];
  const nextOff = events.filter((e) => (e.type === 'holiday' || e.type === 'break') && (e.end || e.start) >= t)
    .sort((a, b) => a.start.localeCompare(b.start))[0];
  const card = (label, e, cls) => {
    if (!e) return `<div class="cal-next glass ${cls}"><span class="cal-next-label">${label}</span><strong>Nothing coming up</strong></div>`;
    const days = Math.max(0, daysBetween(t, e.start));
    const now = e.start <= t;
    return `
      <button class="cal-next glass ${cls}" data-cal-jump="${e.start}">
        <span class="cal-next-label">${label}</span>
        <span class="cal-count">${now ? 'Now' : inWords(days)}</span>
        <strong>${esc(e.title)}</strong>
        <span class="cal-sub">${esc([e.test, fmtDay(e.start) + (e.end && e.end !== e.start ? ` – ${fmtDay(e.end)}` : ''), e.time].filter(Boolean).join(' · '))}</span>
      </button>`;
  };
  // RC plane: today's task, or the next one if there is nothing today.
  const builds = events.filter((e) => e.type === 'build');
  const rcToday = builds.find((e) => covers(e, t));
  const rcNext = rcToday || builds.find((e) => e.start > t);
  let rc = '';
  if (rcNext) {
    const days = Math.max(0, daysBetween(t, rcNext.start));
    rc = `
      <button class="cal-next glass t-build" data-cal-jump="${rcToday ? t : rcNext.start}">
        <span class="cal-next-label">RC plane · ${rcToday ? 'today' : 'next'}</span>
        <span class="cal-count">${rcToday ? 'Today' : inWords(days)}</span>
        <strong>${esc(rcNext.title)}</strong>
        <span class="cal-sub">${esc(`${rcNext.tasks.length} task${rcNext.tasks.length > 1 ? 's' : ''}${rcNext.hours ? ` · ${rcNext.hours}` : ''} · Done when: ${rcNext.done}`)}</span>
      </button>`;
  }
  return `<div class="cal-up${rc ? ' three' : ''}">${rc}${card('Next test', nextTest, 't-test')}${card('Next holiday / break', nextOff, 't-holiday')}</div>`;
}

function monthGrid(month, events, selected) {
  const first = parse(`${month}-01`);
  const startDow = (first.getDay() + 6) % 7; // Monday first
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const t = todayKey();
  let cells = '';
  for (let i = 0; i < startDow; i++) cells += '<span class="cal-cell blank"></span>';
  for (let d = 1; d <= days; d++) {
    const k = `${month}-${String(d).padStart(2, '0')}`;
    const todays = events.filter((e) => covers(e, k));
    const range = RANGE_TYPES.find((ty) => todays.some((e) => e.type === ty));
    const hol = todays.some((e) => e.type === 'holiday');
    const tests = todays.filter((e) => e.type === 'test');
    const others = todays.filter((e) => e.type === 'personal' || e.type === 'milestone');
    const build = todays.find((e) => e.type === 'build');
    const cls = ['cal-cell', range ? `in-${range}` : '', hol ? 'is-holiday' : '', k === t ? 'is-today' : '', k === selected ? 'is-sel' : '', todays.length ? 'has' : ''].join(' ');
    cells += `
      <button class="${cls}" data-cal-day="${k}" aria-label="${esc(fmt(k, { weekday: 'long', day: 'numeric', month: 'long' }))}${todays.length ? `, ${todays.length} event${todays.length > 1 ? 's' : ''}` : ''}">
        <span class="cal-num">${d}</span>
        <span class="cal-chips">
          ${tests.map((e) => `<span class="cal-chip t-test">${esc(e.code ? e.code.replace(/^[A-Z]+/, '') : '')} ${esc(e.title)}</span>`).join('')}
          ${hol ? `<span class="cal-chip t-holiday">${esc(todays.find((e) => e.type === 'holiday').title)}</span>` : ''}
          ${others.map((e) => `<span class="cal-chip ${TYPES[e.type].cls}">${esc(e.title)}</span>`).join('')}
          ${build ? `<span class="cal-chip t-build">${esc(build.title)}</span>` : ''}
        </span>
        <span class="cal-dots" aria-hidden="true">${tests.length ? '<i class="t-test"></i>' : ''}${hol ? '<i class="t-holiday"></i>' : ''}${others.length ? '<i class="t-personal"></i>' : ''}${build ? '<i class="t-build"></i>' : ''}</span>
      </button>`;
  }
  return cells;
}

// ── Export (.ics) ───────────────────────────────────────────
function toIcs(events, name = 'UTM 2026/2027') {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const escIcs = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  const ymd = (s) => s.replace(/-/g, '');
  const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  // Long lines are folded at 74 octets, as RFC 5545 asks (phones are strict).
  const fold = (l) => {
    const out = [];
    let cur = '';
    let bytes = 0;
    for (const ch of l) {
      const b = new TextEncoder().encode(ch).length;
      if (bytes + b > (out.length ? 73 : 74)) { out.push(cur); cur = ''; bytes = 0; }
      cur += ch;
      bytes += b;
    }
    out.push(cur);
    return out.join('\r\n ');
  };
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//husni-site//calendar//EN', 'CALSCALE:GREGORIAN', `X-WR-CALNAME:${escIcs(name)}`,
    'BEGIN:VTIMEZONE', 'TZID:Asia/Kuala_Lumpur', 'BEGIN:STANDARD', 'DTSTART:19700101T000000', 'TZOFFSETFROM:+0800', 'TZOFFSETTO:+0800', 'TZNAME:MYT', 'END:STANDARD', 'END:VTIMEZONE',
  ];
  events.forEach((e) => {
    const desc = e.type === 'build'
      ? [`Phase ${e.phase}${e.hours ? ` · ${e.hours}` : ''}`, ...e.tasks.map((x, n) => `${n + 1}) ${x}`), e.sim ? 'Daily: 30–60 min simulator.' : '', `Done when: ${e.done}`, e.gate ? `Gate ${e.gate}` : '', e.note || ''].filter(Boolean).join('\n')
      : [e.test && e.code ? `${e.test} · ${e.code}` : '', e.venue ? `Venue: ${e.venue}` : '', e.note || ''].filter(Boolean).join('\n');
    // Stable IDs, so importing the file again updates events instead of duplicating them.
    lines.push('BEGIN:VEVENT', `UID:${ymd(e.start)}-${e.type}-${slug(e.code || e.title)}@husni-site`, `DTSTAMP:${stamp}`);
    const m = /^(\d\d):(\d\d)-(\d\d):(\d\d)$/.exec(e.t || '');
    if (m) {
      lines.push(`DTSTART;TZID=Asia/Kuala_Lumpur:${ymd(e.start)}T${m[1]}${m[2]}00`, `DTEND;TZID=Asia/Kuala_Lumpur:${ymd(e.start)}T${m[3]}${m[4]}00`);
    } else {
      const end = new Date(parse(e.end || e.start).getTime() + DAY);
      lines.push(`DTSTART;VALUE=DATE:${ymd(e.start)}`, `DTEND;VALUE=DATE:${ymd(key(end))}`);
    }
    const summary = e.type === 'test' ? `${e.test || 'Test'}: ${e.title}` : e.type === 'build' ? `RC plane: ${e.title}` : e.title;
    lines.push(`SUMMARY:${escIcs(summary)}`);
    if (desc) lines.push(`DESCRIPTION:${escIcs(desc)}`);
    if (e.venue) lines.push(`LOCATION:${escIcs(e.venue)}`);
    if (e.type === 'test') lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Test tomorrow', 'TRIGGER:-P1D', 'END:VALARM');
    // RC plan days are all-day events: remind at 8 AM on the day.
    if (e.type === 'build') lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escIcs(`RC plane today: ${e.title}`)}`, 'TRIGGER:PT8H', 'END:VALARM');
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n');
}

// ── Mount ───────────────────────────────────────────────────
export function mountCalendar(el, { events, owner, focus = '' }) {
  const all = [...events].sort((a, b) => a.start.localeCompare(b.start) || (a.type === 'test') - (b.type === 'test'));
  const clampMonth = (m) => (m < CAL_RANGE.from ? CAL_RANGE.from : m > CAL_RANGE.to ? CAL_RANGE.to : m);
  let month = clampMonth(focus ? focus.slice(0, 7) : monthKey(new Date()));
  let selected = focus && focus.startsWith(month) ? focus : todayKey().startsWith(month) ? todayKey() : `${month}-01`;
  const shift = (m, n) => { const d = parse(`${m}-01`); d.setMonth(d.getMonth() + n); return monthKey(d); };

  function draw() {
    const title = fmt(`${month}-01`, { month: 'long', year: 'numeric' });
    const dayEvents = all.filter((e) => covers(e, selected));
    const inMonth = all.filter((e) => e.start.slice(0, 7) <= month && (e.end || e.start).slice(0, 7) >= month && e.type !== 'milestone');
    const monthEvents = inMonth.filter((e) => e.type !== 'build');
    const monthBuilds = inMonth.filter((e) => e.type === 'build');
    el.innerHTML = `
      ${upNext(all)}
      <section class="cal-month glass">
        <header class="cal-head">
          <button class="icon-btn" data-cal-nav="-1" aria-label="Previous month" ${month <= CAL_RANGE.from ? 'disabled' : ''}>${icon('back')}</button>
          <h2>${esc(title)}</h2>
          <button class="icon-btn flip" data-cal-nav="1" aria-label="Next month" ${month >= CAL_RANGE.to ? 'disabled' : ''}>${icon('back')}</button>
        </header>
        <div class="cal-dow" aria-hidden="true">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => `<span>${d}</span>`).join('')}</div>
        <div class="cal-grid">${monthGrid(month, all, selected)}</div>
        <div class="cal-legend">
          ${['test', 'build', 'holiday', 'break', 'revision', 'exam', 'personal'].map((t) => `<span class="${TYPES[t].cls}"><i></i>${TYPES[t].label}</span>`).join('')}
        </div>
      </section>
      <section class="cal-day glass">
        <h3>${esc(fmt(selected, { weekday: 'long', day: 'numeric', month: 'long' }))}</h3>
        ${dayEvents.length ? `<ul class="cal-list">${dayEvents.map((e) => eventRow(e, owner)).join('')}</ul>` : '<p class="muted">Nothing on this day.</p>'}
      </section>
      <section class="cal-agenda glass">
        <h3>${esc(fmt(`${month}-01`, { month: 'long' }))} at a glance</h3>
        ${monthEvents.length ? `<ul class="cal-list">${monthEvents.map((e) => eventRow(e, owner)).join('')}</ul>` : '<p class="muted">No tests or holidays this month.</p>'}
      </section>
      ${monthBuilds.length ? `
      <section class="cal-agenda glass">
        <h3>RC plane plan · ${esc(fmt(`${month}-01`, { month: 'long' }))}</h3>
        <p class="muted cal-hint">Tap a day for its full task list. "Add RC plan to my calendar" puts these in your phone's calendar with an 8 AM reminder each day.</p>
        <ul class="cal-list">${monthBuilds.map((e) => eventRow(e, owner, false)).join('')}</ul>
      </section>` : ''}`;
  }

  el.addEventListener('click', (ev) => {
    const nav = ev.target.closest('[data-cal-nav]');
    const day = ev.target.closest('[data-cal-day]');
    const jump = ev.target.closest('[data-cal-jump]');
    if (nav && !nav.disabled) {
      month = clampMonth(shift(month, Number(nav.dataset.calNav)));
      selected = todayKey().startsWith(month) ? todayKey() : `${month}-01`;
      draw();
    } else if (day) {
      selected = day.dataset.calDay;
      draw();
      if (window.matchMedia('(max-width: 760px)').matches) el.querySelector('.cal-day').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else if (jump) {
      selected = jump.dataset.calJump;
      month = clampMonth(selected.slice(0, 7));
      draw();
      el.querySelector('.cal-month').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
  draw();
}

export function downloadIcs(events, { name, file = 'utm-2026-2027.ics' } = {}) {
  const blob = new Blob([toIcs(events, name)], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = file;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
