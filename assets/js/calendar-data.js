// Calendar for session 2026/2027 (UTM Johor Bahru).
// Sources: UTM Academic Calendar 2026/2027 (Johor holidays only, KL-only
// holidays left out) and the FKM Test Timetable, Semester I 2026/2027
// (updated Nov 2026; only the 5 subjects I take).
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

  // ── Tests, Semester I: my 5 subjects only ──
  // Fluid Mechanics I, Solid Mechanics II, Thermodynamics,
  // Machine Dynamics & Vibration, Materials Science.
  // Test 1
  { type: 'test', test: 'Test 1', code: 'SEMM2413', title: 'Thermodynamics', start: '2026-11-11', time: '9.00 – 11.00 PM', t: '21:00-23:00', venue: 'DK4, DK5, DK6 (P19), DK8, DK9 (N24)' },
  { type: 'test', test: 'Test 1', code: 'SEMM2223', title: 'Machine Dynamics & Vibration', start: '2026-11-13', time: '9.00 – 11.00 PM', t: '21:00-23:00', venue: 'DK4, DK5, DK6 (P19)' },
  { type: 'test', test: 'Test 1', code: 'SEMM2313', title: 'Fluid Mechanics I', start: '2026-11-21', time: '9.00 – 11.00 PM', t: '21:00-23:00', venue: 'DK8, DK9 (N24), DK4, DK5, DK6 (P19)' },
  { type: 'test', test: 'Test 1', code: 'SEMM2123', title: 'Solid Mechanics II', start: '2026-11-27', time: '9.00 – 11.00 PM', t: '21:00-23:00', venue: 'DK8 (N24), DK4, DK5, DK6 (P19)' },
  { type: 'test', test: 'Test 1', code: 'SEMM2613', title: 'Materials Science', start: '2026-11-28', time: '3.00 – 5.00 PM', t: '15:00-17:00', venue: 'DK8 (N24), DK4, DK5, DK6 (P19)' },
  // Test 1.5
  { type: 'test', test: 'Test 1.5', code: 'SEMM2413', title: 'Thermodynamics', start: '2026-12-07', time: '9.00 – 11.00 PM', t: '21:00-23:00', venue: 'DK4, DK5, DK6 (P19), DK8, DK9 (N24)' },
  // Test 2
  { type: 'test', test: 'Test 2', code: 'SEMM2313', title: 'Fluid Mechanics I', start: '2027-01-07', time: '9.00 – 11.00 PM', t: '21:00-23:00', venue: 'DK8, DK9 (N24), DK4, DK5, DK6 (P19)' },
  { type: 'test', test: 'Test 2', code: 'SEMM2123', title: 'Solid Mechanics II', start: '2027-01-09', time: '9.00 – 11.00 PM', t: '21:00-23:00', venue: 'DK8 (L50), DK4, DK5, DK6 (P19)' },
  { type: 'test', test: 'Test 2', code: 'SEMM2223', title: 'Machine Dynamics & Vibration', start: '2027-01-13', time: '9.00 – 11.00 PM', t: '21:00-23:00', venue: 'DK1 (L50), DK8, DK9 (N24)' },
  { type: 'test', test: 'Test 2', code: 'SEMM2413', title: 'Thermodynamics', start: '2027-01-14', time: '9.00 – 11.00 PM', t: '21:00-23:00', venue: 'DK4, DK5, DK6 (P19), DK8, DK9 (N24)' },
  { type: 'test', test: 'Test 2', code: 'SEMM2613', title: 'Materials Science', start: '2027-01-16', time: '3.00 – 5.00 PM', t: '15:00-17:00', venue: 'DK1, DK2 (L50), DK4, DK5, DK6 (P19)' },
];

// ── First RC airplane: day-by-day plan (Version 2, all parts in PLA+) ──
// One entry per day. `tasks` are shown as a checklist, `done` is the
// "done when" target, `gate` marks a go / no-go checkpoint.
// Simulator practice (30–60 min) is a daily rule until the maiden flight.
const A = { phase: 'A · Foundations, electronics and ordering', hours: '4 h' };
const B = { phase: 'B · Aerodynamic design + trainer build', hours: '4 h' };
const C = { phase: 'C · Midterm break: CAD, simulation, printing', hours: '6–8 h' };
const D = { phase: 'D · Assembly, checks and first flights', hours: '4 h' };
const E = { phase: 'E · Range extension to 20 km', hours: '', note: 'Only with CAAM approval. Step up only after the last flight landed with ≥ 30% battery and a solid link.' };
const SIM_UNTIL = '2026-12-11';

export const RC_PLAN = [
  // Phase A
  { ...A, start: '2026-11-18', title: 'Foundations', done: 'Requirements Sheet saved; 1 h of sim done', tasks: [
    '(1.5 h) Learn the basics: wing, fuselage, tail; ailerons, elevator, rudder; the four forces; CG; wing loading; airfoil; angle of attack; stall. Read the r/RCPlanes wiki FAQ.',
    '(1 h) Put the RadioMaster in USB joystick mode, install PicaSim and fly a trainer model.',
    '(1.5 h) Write a 1-page Requirements Sheet: mission, design targets, hand launch, belly landing, PLA+ airframe, P2S bed limit 256 mm.'] },
  { ...A, start: '2026-11-19', title: 'Electronics selection', done: 'BOM complete with total cost', tasks: [
    '(1 h) Read the INAV Fixed-Wing Guide (setup, modes, RTH, failsafe).',
    '(2 h) Estimate cruise power, then pick the battery (3S2P vs 4S2P Li-ion). Choose motor (~2814, 800–1000 kV), 50–60 A ESC and prop with eCalc; static thrust ≥ 0.6 × AUW.',
    '(1 h) BOM spreadsheet: part, spec, shop, price, delivery date. Confirm the RadioMaster ELRS band (2.4 GHz) and a matching receiver.'] },
  { ...A, start: '2026-11-20', title: 'Order + permit + contacts', done: 'Orders placed; CAAM email sent; post asking for local pilots',
    gate: 'G1 · All parts ordered; CAAM emailed; asked online for local pilots / a flying field', tasks: [
    '(1 h) Place the orders. Buy critical parts from local sellers (a few days) rather than AliExpress (2+ weeks).',
    '(1 h) Email CAAM (drone.atf@caam.gov.my): ATF requirements for a recreational fixed-wing under 2 kg, processing time, EVLOS/BVLOS. Download the Standard ATF form.',
    '(1 h) Join Johor RC / aeromodelling Facebook groups and r/RCPlanes. Ask for a flying field near Skudai and an experienced pilot for the maiden. Ask the UTM aeronautics lab about clubs.',
    '(1 h) Simulator.'] },
  // Phase B
  { ...B, start: '2026-11-21', title: 'Weight & wing sizing', done: 'Sizing sheet: span, chord, area, AR, Re, Vstall', tasks: [
    '(1.5 h) Weight budget: mass of every component plus an airframe estimate (PLA+ 1.24 g/cm³). AUW target 1.5–1.8 kg.',
    '(1.5 h) Wing sizing: wing loading → area; aspect ratio → span and chord. Vstall = √(2W / ρ·S·CLmax), ρ ≈ 1.15 kg/m³.',
    '(1 h) Reynolds number at cruise (Re = V·c/ν, about 200,000).'] },
  { ...B, start: '2026-11-22', title: 'Airfoil selection', done: 'Chosen airfoil + comparison table + reason', tasks: [
    'Install XFLR5. Download 4–5 airfoils from airfoiltools.com (Clark Y, MH32, SD7062, E205, NACA 2412).',
    'Run batch 2D polars at Re 100k–300k.',
    'Compare Cl/Cd and Cl^1.5/Cd at cruise CL (0.3–0.4), max CL, how gently it stalls, thickness ≥ 10%. Pick one.'] },
  { ...B, start: '2026-11-23', title: 'Tail & control surfaces', done: 'Dimensioned 3-view sketch', tasks: [
    'Confirm the layout (pod-and-boom pusher recommended).',
    'Tail sizing: Vh 0.4–0.5, Vv 0.03–0.04; tail arm ≈ 2.5–3 × MAC.',
    'Control surfaces: ailerons ~25% chord over 50–60% of the semi-span; elevator ~35% of stab chord; rudder ~35% of fin chord. Dihedral 2–3°.',
    'Hand-draw a dimensioned 3-view.'] },
  { ...B, start: '2026-11-24', title: 'XFLR5 stability', done: 'XFLR5 file + CG position (mm from wing LE)', tasks: [
    'Build the full plane in XFLR5 (wing + elevator + fin).',
    'Run a fixed-lift analysis; read the neutral point (XNP).',
    'CG = XNP − (static margin × MAC), margin 10–15%. Check the Cm–α slope is negative and it trims at cruise CL.',
    'Adjust incidence (wing ~2–3° above stab) until it trims.',
    'Trainer: cut the foamboard parts.'] },
  { ...B, start: '2026-11-25', title: 'SolidWorks method + test part', done: 'Test section 3MF ready', tasks: [
    'Learn: airfoil .dat → XYZ text → Curve Through XYZ Points; loft the wing.',
    'Study printable plane structure (thin skin + internal ribs, Eclipson / Flightory). Skin as a 0.8 mm shell: 2 walls, no infill.',
    'Model a 200 mm test wing section with a carbon spar hole.',
    'Trainer: glue the airframe.'] },
  { ...B, start: '2026-11-26', title: 'Test print', done: 'Wall count chosen; real wing mass measured; resize if AUW > 1.8 kg', tasks: [
    'Print the test section in PLA+ (2 walls, 0% infill); also try 1 wall and compare.',
    'Weigh it (g per 200 mm) and press-test it; scale up to the full wing and update the weight budget.',
    'Trainer: hinges, servos, linkages.'] },
  { ...B, start: '2026-11-27', title: 'Design Freeze v1', done: 'Gate G2 passed; trainer bench-ready',
    gate: 'G2 · Static margin 10–15%, trims at cruise, AUW estimate ≤ 1.8 kg', tasks: [
    'Update every calculation with measured numbers. Write the Design Freeze v1 page: dimensions, airfoil, CG target, component positions.',
    'Trainer electronics: motor, ESC, servos, receiver. Bind ELRS, check control directions and throws, balance the CG (prop off).',
    'Plan the CAD tasks for the break.'] },
  // Phase C
  { ...C, start: '2026-11-28', title: 'CAD: layout + wing', done: 'Wing outer shape done', tasks: [
    'Master skeleton sketch (top-down design): datum, wing LE position, CG, tail arm.',
    'Wing loft, carbon spar channel, aileron cut-outs, servo bays.',
    'Split the wing into printable segments ≤ 230 mm long with joints.'] },
  { ...C, start: '2026-11-29', title: 'CAD: wing details', done: 'Wing complete, mass known', tasks: [
    'Internal ribs, wiring channel, wing-to-fuselage mount, wing tips.',
    'Mass check using the test-print result (g per 200 mm).'] },
  { ...C, start: '2026-11-30', title: 'CAD: fuselage pod', done: 'Pod complete', tasks: [
    'Battery bay (pack slides to fine-tune the CG), FC mount, GPS on top (away from ESC / VTX).',
    'Pusher motor mount (~2° down / side thrust, thick PLA+ with air gaps: motor heat softens PLA), hatch, boom socket, launch grip.'] },
  { ...C, start: '2026-12-01', title: 'CAD: tail + assembly', done: 'Full assembly; CG matches target', tasks: [
    'Boom, stabiliser, elevator, fin, rudder, horns, pushrod paths.',
    'Full assembly with every real component mass; check the CG in Mass Properties against the XFLR5 target.',
    'Overnight: print the tail parts.'] },
  { ...C, start: '2026-12-02', title: 'FEA (stress)', done: 'FEA report: safety factor ≥ 1.5', tasks: [
    'SolidWorks Simulation: wing spar + root joint at 4 g × 1.5 (lift spread along the span); motor mount under thrust.',
    'Check stress against material limits and tip deflection. Fix weak spots.',
    'Overnight: print the fuselage.'] },
  { ...C, start: '2026-12-03', title: 'CFD (airflow)', done: 'CFD vs XFLR5 table; endurance updated', tasks: [
    'SolidWorks Flow Simulation (or the XFLR5 results if the licence lacks it): external flow at 16 m/s, AoA 0 / 2 / 4 / 6°.',
    'Get lift and drag, compare with XFLR5, update the power / endurance estimate.'] },
  { ...C, start: '2026-12-04', title: 'Iterate + print wings', done: 'Gate G3; INAV bench config',
    gate: 'G3 · FEA safety factor ≥ 1.5; CAD CG matches the XFLR5 target; CFD drag gives ≥ 35 min', tasks: [
    'Apply the FEA / CFD fixes, export the final 3MFs and queue the wing prints (multi-day).',
    'Bench: flash INAV, receiver (CRSF), aeroplane mixer, servo directions, GPS, OSD.'] },
  { ...C, start: '2026-12-05', title: 'Print + trainer maiden', done: 'Trainer flown and landed', tasks: [
    'Keep printing.',
    'Trainer maiden: only with an ATF, calm morning, big field, ideally with an experienced pilot. 3 short flights, practise landings.',
    'INAV: failsafe → RTH; switches for Manual / Angle / RTH.'] },
  { ...C, start: '2026-12-06', title: 'Print + review', done: 'All parts printed', tasks: [
    'Finish printing, inspect, trial-fit everything.',
    'Update the weight budget with real part masses. Weekly review.'] },
  // Phase D
  { ...D, start: '2026-12-07', title: 'Wing assembly', done: 'Wing straight, no twist', tasks: [
    'Glue the segments (CA + activator) on a flat surface, insert the carbon spar, hinge the ailerons, fit servos and linkages.'] },
  { ...D, start: '2026-12-08', title: 'Fuselage + tail', done: 'Airframe complete', tasks: [
    'Boom, tail, alignment (check incidence and symmetry), motor mount; fit FC, GPS and receiver.'] },
  { ...D, start: '2026-12-09', title: 'Wiring + setup', done: 'All controls correct', tasks: [
    'Solder power and ESC leads; full INAV setup; control throws with ~30% expo; balance the CG to target; ELRS range check.'] },
  { ...D, start: '2026-12-10', title: 'Bench checks', done: 'Gate G4 passed',
    gate: 'G4 · CG correct, thrust ≥ 0.6 × AUW, failsafe → RTH works, controls move the right way, ATF in hand', tasks: [
    'Weight & balance report (actual vs design).',
    'Static thrust on a kitchen scale (≥ 0.6 × AUW).',
    'Failsafe test (prop off): radio off → RTH engages.',
    'Write a preflight checklist. Trainer practice.'] },
  { ...D, start: '2026-12-11', title: 'Glide test', done: 'Smooth, straight glide', tasks: [
    'Unpowered hand tosses over long grass to check the CG and trim; adjust.',
    'More trainer practice.'] },
  { ...D, start: '2026-12-12', title: 'MAIDEN FLIGHT', big: true, done: 'Landed in one piece', tasks: [
    'Calm morning, Angle mode. Hand-launch at full throttle with wings level, climb, 2–3 min of circuits, land.',
    'Record video + INAV blackbox.'] },
  { ...D, start: '2026-12-13', title: 'Analyse + trim', done: 'Flies hands-off level', tasks: [
    'Review the log and video; adjust trims and CG; INAV auto-trim; repair.',
    'Flight 2: longer circuits.'] },
  { ...D, start: '2026-12-14', title: 'Navigation tests', done: 'RTH works', tasks: [
    'In order: ALTHOLD → POSHOLD / loiter → RTH from 200–300 m.',
    'Climb-first on; RTH altitude ~60 m (below 400 ft).'] },
  { ...D, start: '2026-12-15', title: 'Failsafe in the air', done: 'Failsafe proven', tasks: [
    'At a safe height and distance, switch the radio off: the plane must RTH. Switch on again to take back control.'] },
  { ...D, start: '2026-12-16', title: 'Endurance test', done: 'Gate G5: ≥ 35 min',
    gate: 'G5 · Measured endurance ≥ 35 min; RTH and failsafe proven in the air', tasks: [
    'Fly circuits overhead for 25–30 min on the Li-ion pack; log mAh/min and Wh/km; calculate the real range.'] },
  { ...D, start: '2026-12-17', title: 'Buffer', done: 'Ready for Phase E', tasks: [
    'Repairs and catch-up.',
    'Decide on FPV gear (needed only beyond line of sight).'] },
  // Phase E
  { ...E, start: '2026-12-18', end: '2026-12-19', title: 'FPV install', done: 'Clear video at range',
    gate: 'G6 · CAAM approval for flights beyond line of sight (or EVLOS with observers)', tasks: [
    'FPV camera, VTX, goggles; OSD showing home arrow, distance, altitude, battery.',
    'Ground range test.'] },
  { ...E, start: '2026-12-20', title: '1 km out & back', done: 'Land with ≥ 30% battery', tasks: [
    'Planned route away from Senai Airport and housing; RTH failsafe armed.'] },
  { ...E, start: '2026-12-22', title: '2–3 km out & back', done: 'Link solid', tasks: [
    'Same rules. Check link quality (LQ / RSSI) and video at the turnaround.'] },
  { ...E, start: '2026-12-26', title: '5 km out & back', done: 'Wh/km as expected', tasks: [
    'Check the wind: fly out upwind so the return is downwind.'] },
  { ...E, start: '2026-12-29', title: '7–8 km out & back', done: 'Land with ≥ 30% battery', tasks: [
    'Pre-plan the RTH altitude above all terrain on the route.'] },
  { ...E, start: '2027-01-02', title: 'MISSION: 20 km (10 km out & back)', big: true, done: 'OBJECTIVE MET', when: 'Early January: pick a calm day', tasks: [
    'Mission flight. Record the full flight log and video.'] },
].map((e) => ({ type: 'build', sim: e.start <= SIM_UNTIL, ...e }));

CAL_EVENTS.push(...RC_PLAN);
