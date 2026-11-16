// Motor de entrenamiento: generación de rutinas, asignación/progresión de cargas y rachas.
const WT = (() => {
  // id: [nombre, músculo, tipo (c=compuesto, i=aislamiento), equipo, ratio 1RM/peso corporal de un principiante hombre]
  const EX = {
    squat: ['Sentadilla trasera', 'Cuádriceps/glúteo', 'c', 'bb', 0.9],
    front: ['Sentadilla frontal', 'Cuádriceps', 'c', 'bb', 0.7],
    legpress: ['Prensa de piernas', 'Cuádriceps/glúteo', 'c', 'm', 1.6],
    bulgarian: ['Sentadilla búlgara (mancuernas)', 'Cuádriceps/glúteo', 'c', 'db', 0.15],
    deadlift: ['Peso muerto', 'Cadena posterior', 'c', 'bb', 1.1],
    rdl: ['Peso muerto rumano', 'Isquios/glúteo', 'c', 'bb', 0.8],
    hipthrust: ['Hip thrust', 'Glúteo', 'c', 'bb', 1.0],
    bench: ['Press banca', 'Pecho', 'c', 'bb', 0.7],
    dbbench: ['Press banca con mancuernas', 'Pecho', 'c', 'db', 0.25],
    incline: ['Press inclinado con mancuernas', 'Pecho (superior)', 'c', 'db', 0.2],
    dips: ['Fondos en paralelas', 'Pecho/tríceps', 'c', 'bw', 0],
    ohp: ['Press militar', 'Hombro', 'c', 'bb', 0.45],
    dbohp: ['Press de hombro con mancuernas', 'Hombro', 'c', 'db', 0.16],
    row: ['Remo con barra', 'Espalda', 'c', 'bb', 0.6],
    cablerow: ['Remo sentado en polea', 'Espalda', 'c', 'cable', 0.6],
    dbrow: ['Remo con mancuerna', 'Espalda', 'c', 'db', 0.28],
    pulldown: ['Jalón al pecho', 'Dorsal', 'c', 'cable', 0.6],
    pullup: ['Dominadas', 'Dorsal', 'c', 'bw', 0],
    legext: ['Extensión de cuádriceps', 'Cuádriceps', 'i', 'm', 0.45],
    legcurl: ['Curl femoral', 'Isquios', 'i', 'm', 0.4],
    calf: ['Elevación de talones', 'Gemelos', 'i', 'm', 0.7],
    lateral: ['Elevaciones laterales', 'Hombro (lateral)', 'i', 'db', 0.07],
    facepull: ['Face pull', 'Hombro (posterior)', 'i', 'cable', 0.25],
    curl: ['Curl con mancuernas', 'Bíceps', 'i', 'db', 0.12],
    hammer: ['Curl martillo', 'Bíceps', 'i', 'db', 0.13],
    pushdown: ['Extensión de tríceps en polea', 'Tríceps', 'i', 'cable', 0.35],
    ohext: ['Extensión de tríceps sobre la cabeza', 'Tríceps', 'i', 'cable', 0.3],
    fly: ['Aperturas en polea', 'Pecho', 'i', 'cable', 0.2],
    crunch: ['Crunch en polea', 'Core', 'i', 'cable', 0.45],
    legraise: ['Elevación de piernas colgado', 'Core', 'i', 'bw', 0],
  };
  const LOWER = new Set(['squat', 'front', 'legpress', 'deadlift', 'rdl', 'hipthrust']);

  // Cada hueco rota de variante entre días A/B/C del mismo tipo.
  const SLOT = {
    squat: ['squat', 'front', 'legpress'], hinge: ['deadlift', 'rdl', 'hipthrust'], rdl: ['rdl', 'hipthrust', 'rdl'],
    legs2: ['legpress', 'bulgarian', 'legpress'], hpush: ['bench', 'dbbench', 'bench'], vpush: ['ohp', 'dbohp', 'ohp'],
    incline: ['incline', 'dips', 'incline'], hpull: ['row', 'cablerow', 'dbrow'], vpull: ['pulldown', 'pullup', 'pulldown'],
    hpull2: ['cablerow', 'dbrow', 'cablerow'], quad: ['legext'], ham: ['legcurl'], calf: ['calf'], side: ['lateral'],
    rear: ['facepull'], bi: ['curl', 'hammer'], bi2: ['hammer', 'curl'], tri: ['pushdown', 'ohext'], tri2: ['ohext', 'pushdown'],
    chest: ['fly'], core: ['crunch', 'legraise'],
  };
  // Huecos en orden de prioridad: compuestos primero; si falta tiempo se cortan los del final.
  const DAYS = {
    full: { name: 'Cuerpo completo', slots: ['squat', 'hpush', 'vpull', 'hinge', 'vpush', 'hpull', 'side', 'bi', 'tri', 'ham', 'calf', 'core'] },
    upper: { name: 'Torso', slots: ['hpush', 'vpull', 'vpush', 'hpull', 'incline', 'side', 'tri', 'bi', 'rear', 'chest'] },
    lower: { name: 'Pierna', slots: ['squat', 'hinge', 'legs2', 'ham', 'quad', 'calf', 'core'] },
    push: { name: 'Empuje', slots: ['hpush', 'vpush', 'incline', 'side', 'tri', 'chest', 'tri2'] },
    pull: { name: 'Tirón', slots: ['vpull', 'hpull', 'hpull2', 'rear', 'bi', 'bi2'] },
    legs: { name: 'Pierna', slots: ['squat', 'rdl', 'legs2', 'ham', 'quad', 'calf', 'core'] },
  };
  // Frecuencia 2x/semana por músculo cuando los días lo permiten (mejor evidencia para hipertrofia y fuerza).
  const SPLITS = {
    1: ['full'], 2: ['full', 'full'], 3: ['full', 'full', 'full'], 4: ['upper', 'lower', 'upper', 'lower'],
    5: ['upper', 'lower', 'push', 'pull', 'legs'], 6: ['push', 'pull', 'legs', 'push', 'pull', 'legs'],
  };

  // c/i = rango de reps compuesto/aislamiento, sc/si = series, rc/ri = descanso (s)
  const GOALS = {
    fuerza: { name: 'Fuerza', c: [3, 5], i: [8, 12], sc: 4, si: 2, rc: 180, ri: 90, rir: '1–2' },
    hipertrofia: { name: 'Hipertrofia', c: [6, 10], i: [10, 15], sc: 3, si: 3, rc: 120, ri: 75, rir: '0–2' },
    resistencia: { name: 'Resistencia muscular', c: [12, 20], i: [15, 25], sc: 3, si: 2, rc: 60, ri: 45, rir: '2–3' },
    definicion: { name: 'Definición', c: [6, 10], i: [12, 15], sc: 3, si: 3, rc: 90, ri: 60, rir: '1–2' },
    general: { name: 'Salud / general', c: [8, 12], i: [12, 15], sc: 3, si: 2, rc: 90, ri: 60, rir: '2–3' },
  };

  const GUIDE = {
    fuerza: ['Cargas de 80–90% 1RM en 3–5 reps; descansa 3–5 min para recuperar el sistema de fosfágenos.', 'La técnica en los básicos (sentadilla, banca, peso muerto, press militar) es la prioridad.', 'Deja 1–2 reps en reserva en los básicos: ir al fallo con cargas altas acumula fatiga sin más ganancia.', 'Proteína 1,6–2,2 g/kg y un ligero superávit calórico favorecen la fuerza.'],
    hipertrofia: ['10–20 series efectivas por músculo y semana, repartidas en 2+ sesiones.', 'Entre 6 y 30 reps todo funciona si llegas cerca del fallo (RIR 0–2); el esfuerzo pesa más que el rango.', 'Superávit de 200–300 kcal, proteína 1,6–2,2 g/kg, sueño de 7–9 h.', 'Progresión doble: primero llevas todas las series al tope del rango, luego subes peso.'],
    resistencia: ['12–25 reps con descansos cortos (30–60 s) para tolerar la fatiga metabólica.', 'Añade 2–3 sesiones semanales de cardio en zona 2 (30–45 min).', 'Carbohidratos suficientes para rendir (3–5 g/kg).'],
    definicion: ['Mantén las cargas pesadas: el estímulo que construyó el músculo es el que lo conserva en déficit.', 'Déficit de 300–500 kcal (perder 0,5–1% del peso por semana), proteína 2,0–2,4 g/kg.', '8–10k pasos al día; cardio moderado sin robar recuperación a las pesas.', 'Si tu rendimiento cae 2 semanas seguidas, sube calorías o haz una descarga.'],
    general: ['OMS: 150–300 min/semana de actividad aeróbica + fuerza 2 días o más.', 'Prioriza constancia y técnica por encima de la carga.', 'Proteína de 1,2–1,6 g/kg y sueño regular.'],
  };
  const PRINCIPLES = [
    'Calienta 5–8 min y haz 2–3 series de aproximación en el primer ejercicio compuesto.',
    'Sobrecarga progresiva: la app sube el peso cuando completas todas las series en el tope del rango (principiantes: en la mitad del rango).',
    'Si quedas bajo el mínimo del rango 2 sesiones seguidas, la app baja la carga un 10% (descarga reactiva).',
    'Descarga programada cada 6 semanas (intermedio) o cada 5 (avanzado): mitad de series y −10% de carga.',
    'El primer día los pesos son una estimación conservadora; desde la primera sesión registrada se ajustan a ti.',
    'En mancuernas, el peso indicado es por mano.',
  ];

  const DAY_MS = 864e5;
  const dnum = (s) => Math.round(Date.parse(s + 'T00:00:00Z') / DAY_MS);
  const step = (id) => (EX[id][3] === 'db' ? 2 : 2.5);
  const roundW = (id, w) => {
    const r = Math.max(0, Math.round(w / step(id)) * step(id));
    return EX[id][3] === 'bb' ? Math.max(20, r) : r;
  };
  const inc = (id, p) => (EX[id][3] === 'bb' && LOWER.has(id) && p.level === 'principiante' ? 5 : step(id));
  const e1rmOf = (w, r) => w * (1 + r / 30); // Epley

  function startWeight(id, ex, p) {
    const ratio = EX[id][4];
    if (!ratio) return 0;
    const mult = { principiante: 1, intermedio: 1.35, avanzado: 1.7 }[p.level] * (p.sex === 'f' ? 0.7 : 1);
    return roundW(id, (p.bw * ratio * mult) / (1 + ex.hi / 30) * 0.9);
  }

  function buildDay(tpl, v, p) {
    const g = GOALS[p.goal], budget = p.minutes - 8, out = [];
    let used = 0;
    for (const slot of DAYS[tpl].slots) {
      const opts = SLOT[slot], id = opts[v % opts.length];
      if (out.some((e) => e.id === id)) continue;
      const c = EX[id][2] === 'c';
      const sets = Math.max(2, (c ? g.sc : g.si) + (p.level === 'principiante' ? -1 : p.level === 'avanzado' && c ? 1 : 0));
      const rest = c ? g.rc : g.ri;
      const cost = (sets * (40 + rest)) / 60 + 1 + (out.length ? 0 : 3); // 40 s por serie, 1 min de cambio, aproximación
      if (used + cost > budget && out.length >= 3) break;
      const [lo, hi] = c ? g.c : g.i;
      out.push({ id, sets, lo, hi, rest });
      used += cost;
    }
    for (let i = out.length - 1; used > budget && i >= 0; i--)
      while (out[i].sets > 2 && used > budget) { out[i].sets--; used -= (40 + out[i].rest) / 60; }
    return { exercises: out, minutes: Math.round(used + 8) };
  }

  function buildPlan(p) {
    const seen = {};
    return SPLITS[p.days].map((t) => {
      const v = (seen[t] = (seen[t] ?? -1) + 1);
      return { name: `${DAYS[t].name} ${'ABC'[v]}`, ...buildDay(t, v, p) };
    });
  }

  const weekOf = (p, today) => Math.floor((dnum(today) - dnum(p.start)) / 7) + 1;
  function isDeload(p, today) {
    const c = { principiante: 0, intermedio: 6, avanzado: 5 }[p.level];
    return !!c && weekOf(p, today) % c === 0;
  }

  function weightFor(ex, lift, p) {
    if (!lift) return startWeight(ex.id, ex, p);
    if (lift.hi !== ex.hi && lift.e1rm) return roundW(ex.id, lift.e1rm / (1 + ex.hi / 30)); // cambió el objetivo
    return lift.w;
  }

  function nextSession(S, today) {
    const p = S.profile, day = S.plan[S.next % S.plan.length], deload = isDeload(p, today);
    const exercises = day.exercises.map((ex) => {
      const [name, muscle, , eq] = EX[ex.id], w = weightFor(ex, S.lifts[ex.id], p);
      return { ...ex, name, muscle, eq, sets: deload ? Math.ceil(ex.sets / 2) : ex.sets, w: deload && w ? roundW(ex.id, w * 0.9) : w };
    });
    return { ...day, exercises, deload, week: weekOf(p, today) };
  }

  // Progresión doble con descarga reactiva.
  function progress(ex, w, lift, reps, p, deload) {
    const e1rm = Math.max(lift.e1rm || 0, w ? Math.max(...reps.map((r) => e1rmOf(w, r))) : 0);
    if (deload) return { e1rm, fails: lift.fails || 0, w: lift.w ?? w, kind: 'hold', msg: 'Semana de descarga: recupera, sin subir peso.' };
    const thr = p.level === 'principiante' ? Math.ceil((ex.lo + ex.hi) / 2) : ex.hi;
    if (reps.length >= ex.sets && reps.every((r) => r >= thr)) {
      const nw = roundW(ex.id, w + inc(ex.id, p));
      return { e1rm, fails: 0, w: nw, kind: 'up', msg: `¡Sube peso! Próxima sesión: ${nw} kg (+${+(nw - w).toFixed(1)}).` };
    }
    if (reps.some((r) => r < ex.lo)) {
      const fails = (lift.fails || 0) + 1;
      if (fails >= 2) {
        const nw = Math.max(EX[ex.id][3] === 'bb' ? 20 : 0, Math.min(roundW(ex.id, w * 0.9), w - step(ex.id)));
        return { e1rm, fails: 0, w: nw, kind: 'down', msg: `2 sesiones bajo ${ex.lo} reps: baja a ${nw} kg y vuelve a construir.` };
      }
      return { e1rm, fails, w, kind: 'hold', msg: `Bajo el rango: repite ${w} kg. Si vuelve a pasar, bajamos un 10%.` };
    }
    return { e1rm, fails: 0, w, kind: 'hold', msg: `Mantén ${w} kg y suma reps hasta ${thr} en todas las series.` };
  }

  function applySession(S, ses, repsByEx, today) {
    const out = [];
    ses.exercises.forEach((ex, i) => {
      const reps = (repsByEx[i] || []).slice(0, ex.sets).filter((v) => v !== '' && v != null).map(Number);
      if (!reps.length) return;
      const prev = S.lifts[ex.id] || {};
      const r = progress(ex, ex.w, prev, reps, S.profile, ses.deload);
      const log = [...(prev.log || []), { d: today, w: ex.w, r: reps }].slice(-30);
      const pr = !!(prev.log && prev.log.length && r.e1rm > (prev.e1rm || 0));
      S.lifts[ex.id] = { w: r.w, hi: ex.hi, fails: r.fails, e1rm: Math.round(r.e1rm * 10) / 10, log };
      out.push({ name: ex.name, kind: r.kind, msg: r.msg, pr, e1rm: Math.round(r.e1rm) });
    });
    S.sessions.push({ date: today, day: ses.name });
    S.next = (S.next + 1) % S.plan.length;
    return out;
  }

  // Racha = sesiones encadenadas sin superar el hueco tolerado según días/semana.
  function streaks(dates, perWeek, today) {
    const d = [...new Set(dates)].map(dnum).sort((a, b) => a - b);
    const gap = Math.ceil(7 / perWeek) + 1, t = dnum(today);
    let run = 0, best = 0;
    d.forEach((n, i) => { run = i && n - d[i - 1] <= gap ? run + 1 : 1; best = Math.max(best, run); });
    const cur = d.length && t - d[d.length - 1] <= gap ? run : 0;
    const wk = (n) => Math.floor((n + 3) / 7); // semanas de lunes a domingo
    const counts = {};
    d.forEach((n) => (counts[wk(n)] = (counts[wk(n)] || 0) + 1));
    let w = wk(t), weeks = 0;
    if ((counts[w] || 0) < perWeek) w--; // la semana en curso no rompe la racha
    while ((counts[w] || 0) >= perWeek) { weeks++; w--; }
    return { cur, best, weeks, total: d.length, gap };
  }

  function weeklySets(plan) {
    const m = {};
    plan.forEach((d) => d.exercises.forEach((e) => {
      const k = EX[e.id][1].split('/')[0].split(' (')[0];
      m[k] = (m[k] || 0) + e.sets;
    }));
    return m;
  }

  // Discos por lado para barra olímpica de 20 kg.
  function plates(w) {
    let side = (w - 20) / 2;
    const out = [];
    for (const p of [25, 20, 15, 10, 5, 2.5, 1.25]) while (side >= p - 1e-9) { out.push(p); side -= p; }
    return out;
  }

  // Series de aproximación para compuestos con barra: barra×10, 50%×5, 70%×3, 85%×1.
  function warmup(id, w) {
    if (EX[id][3] !== 'bb' || EX[id][2] !== 'c' || w <= 20) return [];
    const out = [[20, 10]];
    for (const [pct, r] of [[0.5, 5], [0.7, 3], [0.85, 1]]) {
      const kg = roundW(id, w * pct);
      if (kg > out[out.length - 1][0] && kg < w) out.push([kg, r]);
    }
    return out;
  }

  // Ejercicios intercambiables: mismo grupo muscular principal y mismo tipo.
  const group = (id) => EX[id][1].split('/')[0].split(' (')[0];
  const alternatives = (id) => Object.keys(EX).filter((k) => k !== id && group(k) === group(id) && EX[k][2] === EX[id][2]);

  return { EX, GOALS, GUIDE, PRINCIPLES, buildPlan, nextSession, progress, applySession, streaks, weeklySets, startWeight, plates, warmup, alternatives, dnum };
})();
if (typeof module !== 'undefined') module.exports = WT;
