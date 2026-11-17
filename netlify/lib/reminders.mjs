// Works out which calendar reminders to send at a given hour (Malaysia time).
//   08:00  today's RC plane day, tests today and tomorrow, my own events today
//   2 h before each timed test   "Test in 2 hours"
// Pure function, so it can be tested without Firebase.

const MYT = 8 * 3600e3; // UTC+8, no daylight saving

export function mytNow(nowMs) {
  // Round to the nearest hour: scheduled runs can start a few seconds late.
  const t = Math.round((nowMs + MYT) / 3600e3) * 3600e3;
  const d = new Date(t);
  return { date: d.toISOString().slice(0, 10), hour: d.getUTCHours() };
}

const addDays = (date, n) => new Date(Date.parse(`${date}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const covers = (e, date) => e.start <= date && date <= (e.end || e.start);
const join = (...parts) => parts.filter(Boolean).join(' · ');
const testName = (e) => (e.test ? `${e.test}: ${e.title}` : e.title);

export function remindersFor(nowMs, events) {
  const { date, hour } = mytNow(nowMs);
  const out = [];
  const tests = events.filter((e) => e.type === 'test');

  if (hour === 8) {
    for (const e of events.filter((x) => x.type === 'build' && covers(x, date))) {
      const n = (e.tasks || []).length;
      out.push({
        title: `✈️ RC plane: ${e.title}`,
        body: join(n ? `${n} task${n > 1 ? 's' : ''} today` : '', e.done ? `Done when: ${e.done}` : '', e.gate || ''),
        url: `#/calendar`, tag: `rc-${date}`,
      });
    }
    for (const e of tests.filter((x) => x.start === date)) {
      out.push({ title: `📝 Test today: ${testName(e)}`, body: join(e.time, e.venue), url: '#/calendar', tag: `test-${date}-${e.title}` });
    }
    const tomorrow = addDays(date, 1);
    for (const e of tests.filter((x) => x.start === tomorrow)) {
      out.push({ title: `📚 Test tomorrow: ${testName(e)}`, body: join(e.time, e.venue, 'Time to revise'), url: '#/calendar', tag: `test-${tomorrow}-${e.title}` });
    }
    for (const e of events.filter((x) => !['test', 'build'].includes(x.type) && x.start === date)) {
      out.push({ title: `📅 Today: ${e.title}`, body: join(e.time, e.note), url: '#/calendar', tag: `ev-${date}-${e.title}` });
    }
  }

  for (const e of tests.filter((x) => x.start === date && /^\d\d:\d\d/.test(x.t || ''))) {
    if (Number(e.t.slice(0, 2)) - 2 === hour) {
      out.push({ title: `⏰ Test in 2 hours: ${testName(e)}`, body: join(e.time, e.venue), url: '#/calendar', tag: `test-soon-${date}-${e.title}` });
    }
  }
  return out.map((p) => ({ ...p, body: p.body.slice(0, 240) }));
}
