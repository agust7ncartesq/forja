// Ejecutar: node test.js
const assert = require('assert');
const WT = require('./engine.js');

const p = { goal: 'hipertrofia', days: 3, minutes: 60, level: 'intermedio', sex: 'm', bw: 80, start: '2026-01-05' };

// Rutina: un día por día/semana, cabe en el tiempo, mínimo 3 ejercicios
for (let d = 1; d <= 6; d++) {
  const plan = WT.buildPlan({ ...p, days: d });
  assert.strictEqual(plan.length, d);
  plan.forEach((day) => { assert(day.exercises.length >= 3); assert(day.minutes <= 60, `${day.name} ${day.minutes} min`); });
}
assert.deepStrictEqual(WT.buildPlan({ ...p, days: 4 }).map((d) => d.name), ['Torso A', 'Pierna A', 'Torso B', 'Pierna B']);
assert(WT.buildPlan({ ...p, minutes: 90 })[0].exercises.length > WT.buildPlan({ ...p, minutes: 45 })[0].exercises.length);
assert.deepStrictEqual([WT.buildPlan({ ...p, goal: 'fuerza' })[0].exercises[0].lo, WT.buildPlan({ ...p, goal: 'fuerza' })[0].exercises[0].hi], [3, 5]);

// Progresión
const ex = { id: 'bench', sets: 3, lo: 6, hi: 10 };
let r = WT.progress(ex, 60, {}, [10, 10, 10], p, false);
assert.strictEqual(r.kind, 'up'); assert.strictEqual(r.w, 62.5);
r = WT.progress(ex, 60, {}, [10, 9, 8], p, false);
assert.strictEqual(r.kind, 'hold'); assert.strictEqual(r.w, 60); assert.strictEqual(r.fails, 0);
r = WT.progress(ex, 60, {}, [7, 5, 4], p, false);
assert.strictEqual(r.fails, 1); assert.strictEqual(r.w, 60);
r = WT.progress(ex, 60, { fails: 1 }, [7, 5, 4], p, false);
assert.strictEqual(r.kind, 'down'); assert.strictEqual(r.w, 55);
r = WT.progress(ex, 60, {}, [10, 10], p, false); // series incompletas no suben
assert.notStrictEqual(r.kind, 'up');
// principiante: sube con la mitad del rango y +5 kg en pierna con barra
r = WT.progress({ id: 'squat', sets: 2, lo: 6, hi: 10 }, 60, {}, [8, 8], { ...p, level: 'principiante' }, false);
assert.strictEqual(r.w, 65);
// descarga programada: sin cambios
r = WT.progress(ex, 55, { w: 60 }, [10, 10, 10], p, true);
assert.strictEqual(r.w, 60);

// Peso inicial razonable y redondeado a 2.5
const w0 = WT.startWeight('bench', ex, p);
assert(w0 >= 40 && w0 <= 70 && w0 % 2.5 === 0, String(w0));

// Sesión completa: guarda, rota día, ajusta peso
const S = { profile: p, plan: WT.buildPlan(p), next: 0, lifts: {}, sessions: [] };
const ses = WT.nextSession(S, '2026-01-05');
const out = WT.applySession(S, ses, { 0: [99, 99] }, '2026-01-05');
assert.strictEqual(S.next, 1); assert.strictEqual(out.length, 1); assert(S.lifts[ses.exercises[0].id].log.length === 1);
// semana 6 de un intermedio = descarga
assert(WT.nextSession(S, '2026-02-09').deload);

// Rachas (3 días/semana → hueco máximo 4 días)
const st = WT.streaks(['2026-01-05', '2026-01-07', '2026-01-09', '2026-01-12', '2026-01-14', '2026-01-16'], 3, '2026-01-17');
assert.deepStrictEqual([st.cur, st.best, st.weeks], [6, 6, 2]);
assert.strictEqual(WT.streaks(['2026-01-05'], 3, '2026-01-12').cur, 0); // 7 días sin ir: racha rota
assert.strictEqual(WT.streaks(['2026-01-01', '2026-01-10', '2026-01-12'], 3, '2026-01-12').best, 2);

// Discos, calentamiento, alternativas, récords
assert.deepStrictEqual(WT.plates(100), [25, 15]);
assert.deepStrictEqual(WT.plates(62.5), [20, 1.25]);
assert.deepStrictEqual(WT.warmup('squat', 100), [[20, 10], [50, 5], [70, 3], [85, 1]]);
assert.deepStrictEqual(WT.warmup('curl', 12), []);
assert(WT.alternatives('bench').includes('dbbench') && !WT.alternatives('bench').includes('fly'));
const S2 = { profile: p, plan: WT.buildPlan(p), next: 0, lifts: {}, sessions: [] };
const s1 = WT.nextSession(S2, '2026-01-05');
assert.strictEqual(WT.applySession(S2, s1, { 0: [8, 8, 8] }, '2026-01-05')[0].pr, false); // primera vez no es PR
S2.next = 0;
const s2 = WT.nextSession(S2, '2026-01-07');
assert.strictEqual(WT.applySession(S2, s2, { 0: [12, 12, 12] }, '2026-01-07')[0].pr, true);

console.log('OK: todos los tests pasan');
