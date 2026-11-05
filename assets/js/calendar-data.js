// Calendar for session 2026/2027 (UTM Johor Bahru).
// Sources: UTM Academic Calendar 2026/2027 (Johor holidays only, KL-only
// holidays left out) and the FKM Test Timetable, Semester I 2026/2027
// (second-year SEMM 2xxx subjects + SSCE2193 only).
//
// To change something, edit this list. Dates are YYYY-MM-DD; `end` is the
// last day (inclusive). Types: test, holiday, break, exam, revision, milestone.
// Test times are 24-hour ("21:00-23:00"); `time` is how it's shown.

export const CAL_RANGE = { from: '2026-10', to: '2027-10' };

export const CAL_EVENTS = [
  // ── Semester milestones ──
  { type: 'milestone', title: 'Semester I lectures begin', start: '2026-10-12' },
  { type: 'milestone', title: 'Semester II lectures begin', start: '2027-03-22' },

  // ── Breaks, revision, final exams ──
  { type: 'break', title: 'Mid-semester break (Sem I)', start: '2026-11-30', end: '2026-12-06' },
  { type: 'revision', title: 'Revision week (Sem I)', start: '2027-01-25', end: '2027-01-30' },
  { type: 'exam', title: 'Final exams (Sem I)', start: '2027-01-31', end: '2027-02-19', note: 'No exams between 4 and 9 February.' },
  { type: 'break', title: 'Semester break', start: '2027-02-20', end: '2027-03-21', note: '5 weeks' },
  { type: 'break', title: 'Mid-semester break (Sem II)', start: '2027-05-17', end: '2027-05-23' },
  { type: 'revision', title: 'Revision week (Sem II)', start: '2027-07-05', end: '2027-07-11' },
  { type: 'exam', title: 'Final exams (Sem II)', start: '2027-07-12', end: '2027-07-25' },
  { type: 'break', title: 'Long semester break', start: '2027-07-26', end: '2027-10-03', note: '10 weeks' },

  // ── Public holidays (Johor) ──
  { type: 'holiday', title: 'Deepavali', start: '2026-11-08', end: '2026-11-09' },
  { type: 'holiday', title: 'Christmas Day', start: '2026-12-25' },
  { type: 'holiday', title: 'Thaipusam', start: '2027-01-22' },
  { type: 'holiday', title: 'Chinese New Year', start: '2027-02-06', end: '2027-02-08' },
  { type: 'holiday', title: 'Awal Ramadhan', start: '2027-02-08' },
  { type: 'holiday', title: 'Hari Raya Aidilfitri', start: '2027-03-10', end: '2027-03-11' },
  { type: 'holiday', title: "Sultan Johor's Birthday", start: '2027-03-23' },
  { type: 'holiday', title: 'Labour Day', start: '2027-05-01' },
  { type: 'holiday', title: 'Hari Raya Aidiladha', start: '2027-05-17' },
  { type: 'holiday', title: 'Wesak Day', start: '2027-05-20' },
  { type: 'holiday', title: 'Awal Muharram', start: '2027-06-06', end: '2027-06-07' },
  { type: 'holiday', title: "YDP Agong's Birthday", start: '2027-06-07' },
  { type: 'holiday', title: 'Hol Almarhum Sultan Iskandar', start: '2027-07-10' },
  { type: 'holiday', title: 'Maulidur Rasul', start: '2027-08-15', end: '2027-08-16' },
  { type: 'holiday', title: 'Merdeka Day', start: '2027-08-31' },
  { type: 'holiday', title: 'Malaysia Day', start: '2027-09-16' },

  // ── Tests, Semester I (second year) ──
  // Test 1
  { type: 'test', test: 'Test 1', code: 'SEMM2413', title: 'Thermodynamics', start: '2026-11-11', time: '9.00 – 11.00 PM', t: '21:00-23:00', venue: 'DK3 (L50), DK4–DK6 (P19), DK8–DK9 (N24), 417/419/420 (C25)' },
  { type: 'test', test: 'Test 1', code: 'SEMM2223', title: 'Mechanics of Machines & Vibration', start: '2026-11-13', time: '9.00 – 11.00 PM', t: '21:00-23:00', venue: 'DK4, DK5, DK6 (P19)' },
  { type: 'test', test: 'Test 1', code: 'SSCE2193', title: 'Engineering Statistics', start: '2026-11-18', time: '8.00 – 10.00 PM', t: '20:00-22:00', venue: '' },
  { type: 'test', test: 'Test 1', code: 'SEMM2313', title: 'Mechanics of Fluids I', start: '2026-11-21', time: '9.00 – 11.00 PM', t: '21:00-23:00', venue: 'DK8, DK9 (N24), DK4–DK6 (P19)' },
  { type: 'test', test: 'Test 1', code: 'SEMM2123', title: 'Mechanics of Solids II', start: '2026-11-27', time: '9.00 – 11.00 PM', t: '21:00-23:00', venue: 'DK8 (N24), DK4–DK6 (P19)' },
  { type: 'test', test: 'Test 1', code: 'SEMM2613', title: 'Materials Science', start: '2026-11-28', time: '3.00 – 5.00 PM', t: '15:00-17:00', venue: 'DK8 (N24), DK4–DK6 (P19)' },
  // Test 1.5
  { type: 'test', test: 'Test 1.5', code: 'SEMM2413', title: 'Thermodynamics', start: '2026-12-07', time: '9.00 – 11.00 PM', t: '21:00-23:00', venue: 'DK1–DK3 (L50), DK4–DK6 (P19), DK8–DK9 (N24)' },
  // Test 2
  { type: 'test', test: 'Test 2', code: 'SSCE2193', title: 'Engineering Statistics', start: '2026-12-28', time: '8.00 – 10.00 PM', t: '20:00-22:00', venue: '' },
  { type: 'test', test: 'Test 2', code: 'SEMM2313', title: 'Mechanics of Fluids I', start: '2027-01-07', time: '9.00 – 11.00 PM', t: '21:00-23:00', venue: 'DK8, DK9 (N24), DK4–DK6 (P19)' },
  { type: 'test', test: 'Test 2', code: 'SEMM2123', title: 'Mechanics of Solids II', start: '2027-01-09', time: '9.00 – 11.00 PM', t: '21:00-23:00', venue: 'DK8 (L50), DK4–DK6 (P19)' },
  { type: 'test', test: 'Test 2', code: 'SEMM2223', title: 'Mechanics of Machines & Vibration', start: '2027-01-13', time: '9.00 – 11.00 PM', t: '21:00-23:00', venue: 'DK1 (L50), DK8, DK9 (N24)' },
  { type: 'test', test: 'Test 2', code: 'SEMM2413', title: 'Thermodynamics', start: '2027-01-14', time: '9.00 – 11.00 PM', t: '21:00-23:00', venue: 'DK1–DK3 (L50), DK4–DK6 (P19), DK8–DK9 (N24)' },
  { type: 'test', test: 'Test 2', code: 'SEMM2613', title: 'Materials Science', start: '2027-01-16', time: '3.00 – 5.00 PM', t: '15:00-17:00', venue: 'DK1, DK2 (L50), DK4–DK6 (P19)' },
];
