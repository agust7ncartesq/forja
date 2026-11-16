// Coach: nutrición, preparación diaria, análisis del progreso, técnica y guía basada en evidencia.
// Reglas y cifras tomadas de la literatura citada en ARTICLES (abajo).
const COACH = (() => {
  const E = typeof WT !== 'undefined' ? WT : require('./engine.js');

  const GROUP = { 'Cuádriceps': 'legs', 'Glúteo': 'legs', 'Isquios': 'legs', 'Gemelos': 'legs', 'Cadena posterior': 'legs', 'Pecho': 'push', 'Hombro': 'push', 'Tríceps': 'push', 'Espalda': 'pull', 'Dorsal': 'pull', 'Bíceps': 'pull', 'Core': 'core' };
  const es = (x) => String(x).replace('.', ',');
  const muscleGroup = (m) => GROUP[m.split('/')[0].split(' (')[0]] || 'core';

  /* ---------- Nutrición ---------- */
  // Gasto basal: Mifflin-St Jeor (1990). Factor de actividad según días y duración de las sesiones.
  function nutrition(p) {
    if (!(p.age > 0 && p.height > 0 && p.bw > 0)) return null;
    const bmr = 10 * p.bw + 6.25 * p.height - 5 * p.age + (p.sex === 'f' ? -161 : 5);
    const act = (p.days <= 2 ? 1.375 : p.days <= 4 ? 1.465 : p.days === 5 ? 1.55 : 1.65) + (p.minutes - 60) / 600;
    const tdee = bmr * act;
    const kcal = {
      definicion: Math.max(tdee * 0.8, tdee - 500), // ~0,5-1 % del peso por semana (Helms 2014)
      hipertrofia: tdee + 250,
      fuerza: tdee + 150,
      resistencia: tdee,
      general: tdee,
    }[p.goal];
    const protKg = { definicion: 2.2, hipertrofia: 1.8, fuerza: 1.8, resistencia: 1.6, general: 1.4 }[p.goal]; // Morton 2018
    const protein = Math.round(protKg * p.bw);
    const fat = Math.round(Math.max(0.8 * p.bw, (kcal * 0.25) / 9));
    const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
    const water = Math.round((35 * p.bw + (500 * p.minutes) / 60) / 100) / 10;
    const rate = { definicion: [-1, -0.5], hipertrofia: [0.1, 0.5], fuerza: [0, 0.25], resistencia: [-0.25, 0.25], general: [-0.25, 0.25] }[p.goal];
    return { bmr: Math.round(bmr), tdee: Math.round(tdee), kcal: Math.round(kcal / 10) * 10, protein, protKg, fat, carbs, water, rate };
  }

  /* ---------- Preparación diaria (autorregulación) ---------- */
  // c: { sleep: horas, energy 1-5 (5 = mucha), soreness 1-5 (5 = muy cargado), stress 1-5 (5 = alto) }
  function readiness(c) {
    const sl = Math.min(1, Math.max(0, (c.sleep - 4) / 4)); // 4 h = 0, 8 h o más = 1
    const score = Math.round(100 * (0.35 * sl + 0.25 * ((c.energy - 1) / 4) + 0.2 * ((5 - c.soreness) / 4) + 0.2 * ((5 - c.stress) / 4)));
    if (score >= 70) return { score, level: 'alta', setDelta: 0, loadMult: 1, msg: 'Buena recuperación. Entrena según el plan.' };
    if (score >= 45) return { score, level: 'media', setDelta: -1, loadMult: 1, msg: 'Recuperación a medias. Mantén los pesos, haz una serie menos por ejercicio y deja 1 rep más en reserva.' };
    return { score, level: 'baja', setDelta: -1, loadMult: 0.9, msg: 'Recuperación baja. Hoy toca sesión ligera: −10 % de peso y una serie menos. Si estás enfermo o algo duele, descansa.' };
  }

  // Ajusta la sesión del día según la preparación. Nunca baja de 1 serie.
  function adjustSession(ses, r) {
    if (!r || r.level === 'alta' || ses.deload) return ses;
    return {
      ...ses, light: r.loadMult < 1,
      exercises: ses.exercises.map((e) => ({ ...e, w0: e.w0 ?? e.w, sets: Math.max(1, e.sets + r.setDelta), w: r.loadMult < 1 && e.w ? E.roundW(e.id, e.w * r.loadMult) : e.w })),
    };
  }

  /* ---------- Peso corporal ---------- */
  // Tendencia: media de los últimos 7 días frente a la de los 7 anteriores, en % por semana.
  function bwTrend(log, today) {
    const t = E.dnum(today), avg = (a) => a.reduce((s, x) => s + x.kg, 0) / a.length;
    const cur = log.filter((x) => t - E.dnum(x.d) < 7), prev = log.filter((x) => { const d = t - E.dnum(x.d); return d >= 7 && d < 14; });
    if (!cur.length || !prev.length) return null;
    const a = avg(cur), b = avg(prev);
    return { avg: Math.round(a * 10) / 10, pct: Math.round(((a - b) / b) * 1000) / 10 };
  }

  /* ---------- Análisis del progreso ---------- */
  function insights(S, today) {
    const p = S.profile, out = [], t = E.dnum(today);
    if (!p) return out;
    // Constancia (últimas 4 semanas)
    const done = S.sessions.filter((s) => t - E.dnum(s.date) < 28).length;
    const weeks = Math.min(4, Math.ceil((t - E.dnum(p.start) + 1) / 7));
    if (S.sessions.length && weeks >= 2) {
      const goal = p.days * weeks, pct = done / goal;
      if (pct >= 0.9) out.push({ kind: 'ok', title: 'Constancia excelente', text: `Has hecho ${done} de ${goal} sesiones previstas. La constancia es lo que más resultados da.` });
      else if (pct < 0.6) out.push({ kind: 'warn', title: 'Te está costando la constancia', text: `Has hecho ${done} de ${goal} sesiones previstas.${p.days > 2 ? ` Un plan de ${p.days - 1} días que cumplas rinde más que uno de ${p.days} que no.` : ''} Puedes cambiarlo en Perfil.` });
    }
    // Estancamiento por ejercicio: sin superar el mejor 1RM estimado en las últimas 3 sesiones.
    Object.entries(S.lifts || {}).forEach(([id, l]) => {
      if (!E.EX[id] || !l.log || l.log.length < 5) return;
      const est = l.log.map((x) => x.w * (1 + Math.max(...x.r) / 30));
      const before = Math.max(...est.slice(0, -3)), recent = Math.max(...est.slice(-3));
      if (recent <= before) out.push({ kind: 'warn', title: `Estancado en ${E.EX[id][0]}`, text: 'Llevas 3 sesiones sin superar tu mejor marca. Opciones: cambia a una variante (en Alternativas), o baja un 10 % y vuelve a subir. Revisa también sueño y comida.' });
    });
    // Equilibrio empuje / tirón
    const g = { push: 0, pull: 0 };
    (S.plan || []).forEach((d) => d.exercises.forEach((e) => { const k = muscleGroup(E.EX[e.id][1]); if (k in g) g[k] += e.sets; }));
    if (g.pull && g.push / g.pull > 1.25) out.push({ kind: 'info', title: 'Más empuje que tirón', text: `Tu semana tiene ${g.push} series de empuje y ${g.pull} de tirón. Para la salud del hombro conviene igualarlas: cambia un ejercicio de empuje por uno de espalda.` });
    // Volumen bajo (no aplica a novatos: con poco volumen ya progresan)
    if (p.goal === 'hipertrofia' && p.level !== 'principiante') {
      const low = Object.entries(E.weeklySets(S.plan || [])).filter(([, n]) => n < 10).map(([m]) => m);
      if (low.length) out.push({ kind: 'info', title: 'Volumen mejorable', text: `${low.length === 1 ? low[0] + ' tiene' : low.length + ' músculos tienen'} menos de 10 series por semana. Más series dan más crecimiento, con rendimientos decrecientes. Si tienes tiempo, sube 15 minutos la sesión en Perfil.` });
    }
    // Sueño
    const ck = Object.entries(S.checkins || {}).filter(([d]) => t - E.dnum(d) < 7).map(([, c]) => c);
    if (ck.length >= 3) {
      const avg = ck.reduce((s, c) => s + c.sleep, 0) / ck.length;
      if (avg < 7) out.push({ kind: 'warn', title: 'Duermes poco', text: `Media de ${es(avg.toFixed(1))} h esta semana. Dormir menos de 7 h empeora la recuperación y el rendimiento. Es la mejora más barata que tienes.` });
    }
    // Peso corporal frente al objetivo
    const tr = bwTrend(S.bwlog || [], today), n = nutrition(p);
    if (tr && n) {
      const [lo, hi] = n.rate;
      if (tr.pct < lo) out.push({ kind: 'warn', title: 'Bajas de peso demasiado rápido', text: `${es(tr.pct)} % en la última semana. ${p.goal === 'definicion' ? 'Más de un 1 % semanal arriesga músculo: ' : 'Para tu objetivo, '}sube unas 150-200 kcal al día.` });
      else if (tr.pct > hi) out.push({ kind: 'warn', title: p.goal === 'definicion' ? 'No estás bajando de peso' : 'Subes de peso demasiado rápido', text: `+${es(tr.pct)} % en la última semana. Baja unas 150-200 kcal al día y revisa en una semana.` });
      else out.push({ kind: 'ok', title: 'Peso en buen ritmo', text: `${tr.pct > 0 ? '+' : ''}${es(tr.pct)} % en la última semana, dentro de lo recomendado para tu objetivo.` });
    }
    // Descarga la semana que viene
    const nextWeek = new Date((t + 7) * 864e5).toISOString().slice(0, 10);
    if (E.isDeload(p, nextWeek) && !E.isDeload(p, today))
      out.push({ kind: 'info', title: 'La semana que viene toca descarga', text: 'Menos series y −10 % de carga para disipar fatiga. Es parte del plan, no un retroceso.' });
    return out;
  }

  /* ---------- Técnica ---------- */
  // Tres claves y el error más común por ejercicio.
  const CUES = {
    squat: [['Pies a la anchura de hombros, puntas algo abiertas', 'Rodillas en la línea de los pies al bajar', 'Baja hasta donde mantengas la espalda neutra'], 'Levantar antes la cadera que el pecho al subir'],
    front: [['Codos altos durante todo el recorrido', 'Torso lo más vertical posible', 'Baja entre los talones, rodillas adelante'], 'Dejar caer los codos y que la barra ruede'],
    legpress: [['Zona lumbar pegada al respaldo', 'Pies en el centro de la plataforma', 'Baja hasta antes de que la pelvis se despegue'], 'Bloquear de golpe las rodillas arriba'],
    bulgarian: [['Pie delantero a un paso largo del banco', 'Baja vertical, la rodilla de atrás hacia el suelo', 'Empuja con todo el pie delantero'], 'Apoyarse y empujar con la pierna de atrás'],
    deadlift: [['Barra pegada a la tibia, sobre el medio del pie', 'Tensa la espalda antes de despegar ("saca el pecho")', 'Empuja el suelo, la barra sube rozando las piernas'], 'Redondear la zona lumbar al arrancar'],
    rdl: [['Rodillas algo flexionadas y fijas', 'Lleva la cadera atrás, no el torso abajo', 'Baja hasta notar tensión en isquios, sin redondear'], 'Convertirlo en una sentadilla doblando las rodillas'],
    hipthrust: [['Borde del banco bajo los omóplatos', 'Barbilla recogida, mirada al frente', 'Arriba aprieta glúteos sin arquear la lumbar'], 'Hiperextender la zona lumbar al final'],
    bench: [['Omóplatos juntos y hacia abajo', 'Barra baja al pecho medio, codos a ~45°', 'Pies firmes, empuja hacia atrás y arriba'], 'Abrir los codos a 90° y rebotar la barra'],
    dbbench: [['Omóplatos atrás, pecho alto', 'Baja hasta notar estiramiento en el pecho', 'Sube juntando ligeramente las mancuernas'], 'Recorrido corto por miedo a bajar'],
    incline: [['Banco a 30°, no más', 'Codos algo por debajo de los hombros', 'Estira el pecho abajo, controla 2 segundos'], 'Banco demasiado inclinado: pasa a ser hombro'],
    dips: [['Hombros abajo, lejos de las orejas', 'Inclina el torso adelante para más pecho', 'Baja hasta que el brazo quede paralelo'], 'Hundir los hombros hacia las orejas'],
    ohp: [['Glúteos y abdomen apretados', 'La barra sube rozando la cara, cabeza adelante al pasar', 'Termina con la barra sobre el medio del pie'], 'Arquear la espalda para empujar'],
    dbohp: [['Sentado con la espalda apoyada', 'Codos algo por delante del cuerpo', 'Baja hasta la altura de las orejas'], 'Chocar las mancuernas arriba perdiendo control'],
    row: [['Torso a ~45°, espalda neutra', 'Lleva la barra al ombligo', 'Junta los omóplatos al final'], 'Usar impulso con la cadera'],
    cablerow: [['Pecho alto, sin balancear el torso', 'Tira con los codos pegados', 'Deja que los omóplatos se separen al volver'], 'Inclinarse atrás para mover más peso'],
    dbrow: [['Mano y rodilla en el banco, espalda plana', 'Lleva el codo hacia la cadera', 'Estira del todo abajo'], 'Girar el torso para subir más'],
    pulldown: [['Agarre algo más ancho que los hombros', 'Lleva la barra a la parte alta del pecho', 'Sube controlando hasta estirar el dorsal'], 'Tirar detrás de la nuca o con impulso'],
    pullup: [['Empieza colgado con los brazos estirados', 'Pecho hacia la barra, codos hacia los bolsillos', 'Baja controlado hasta estirar del todo'], 'Medias repeticiones y balanceo'],
    legext: [['Rodilla alineada con el eje de la máquina', 'Sube sin despegar la cadera', 'Pausa arriba, baja en 2 segundos'], 'Patear el peso y dejarlo caer'],
    legcurl: [['Cadera pegada al banco', 'Flexiona hasta el máximo recorrido', 'Baja controlado hasta casi estirar'], 'Levantar la cadera para ayudarse'],
    calf: [['Baja el talón hasta el máximo estiramiento', 'Pausa de 1-2 s abajo', 'Sube hasta la punta sin rebotar'], 'Rebotar con recorridos cortos'],
    lateral: [['Codos ligeramente flexionados', 'Sube hacia los lados hasta la altura del hombro', 'Baja lento, sin balanceo'], 'Encoger los trapecios y usar impulso'],
    facepull: [['Polea a la altura de la cara', 'Tira hacia la frente separando las manos', 'Codos altos, junta los omóplatos'], 'Tirar con la espalda baja inclinándose'],
    curl: [['Codos quietos junto al torso', 'Gira la palma hacia arriba al subir', 'Baja hasta estirar el brazo'], 'Balancear el cuerpo para subir'],
    hammer: [['Palmas mirándose durante todo el recorrido', 'Codos fijos', 'Controla la bajada'], 'Adelantar los codos al subir'],
    pushdown: [['Codos pegados y fijos', 'Extiende del todo abajo', 'Sube hasta 90° sin mover los hombros'], 'Inclinarse sobre la barra y usar el peso del cuerpo'],
    ohext: [['Codos apuntando al frente, cerca de la cabeza', 'Baja hasta notar estiramiento en el tríceps', 'Extiende sin arquear la espalda'], 'Abrir los codos hacia los lados'],
    fly: [['Codos ligeramente flexionados y fijos', 'Abre hasta notar estiramiento en el pecho', 'Junta las manos frente al pecho'], 'Convertirlo en un press doblando los codos'],
    crunch: [['De rodillas, cuerda junto a la cabeza', 'Enrolla la columna llevando costillas a la pelvis', 'La cadera no se mueve'], 'Tirar con los brazos o sentarse sobre los talones'],
    legraise: [['Cuelga con los hombros activos', 'Sube las piernas inclinando la pelvis', 'Baja lento sin balancearte'], 'Balancearse y subir solo las piernas sin rotar la pelvis'],
  };

  /* ---------- Biblioteca basada en evidencia ---------- */
  const ARTICLES = [
    { t: 'Qué tan cerca del fallo', b: 'Para ganar músculo conviene terminar las series cerca del fallo: el crecimiento mejora a medida que quedan menos reps en reserva. La fuerza, en cambio, mejora parecido con un rango amplio de reps en reserva. Por eso Forja pide dejar 0-2 reps en hipertrofia y 1-2 en fuerza.', ref: 'Robinson et al., 2024, Sports Medicine' },
    { t: 'Cuántas series a la semana', b: 'Más series semanales dan más crecimiento, con rendimientos decrecientes. Unas 4 series por músculo ya producen un efecto medible; 10-20 rinden más en personas con experiencia. Las series de ejercicios que trabajan el músculo de forma indirecta cuentan como media serie. Con el mismo volumen, la frecuencia apenas cambia el crecimiento, aunque sí ayuda a la fuerza.', ref: 'Pelland et al., meta-regresión (67 estudios)' },
    { t: 'Descanso entre series', b: 'Descansar más de 60-90 segundos da una ligera ventaja para ganar músculo, porque mantienes más peso y reps en las series siguientes. Más allá de 90 segundos no se ven diferencias claras; en ejercicios pesados de varias articulaciones, 2-3 minutos ayudan a rendir.', ref: 'Singer et al., 2024, Frontiers in Sports and Active Living' },
    { t: 'Rango de movimiento', b: 'Trabajar el músculo en posición estirada parece favorecer el crecimiento: las repeticiones parciales en la parte estirada superan a las parciales en la parte acortada y se igualan o superan al recorrido completo. Prioriza bajar del todo y controlar la parte estirada.', ref: 'Revisiones sistemáticas 2024-2026' },
    { t: 'Proteína', b: 'El beneficio de la proteína para ganar masa muscular se estabiliza alrededor de 1,6 g por kg de peso al día; hasta 2,2 g/kg es una cifra prudente para asegurar el máximo, sobre todo en déficit. Repártela en 3-5 comidas.', ref: 'Morton et al., 2018, British Journal of Sports Medicine' },
    { t: 'Perder grasa sin perder músculo', b: 'Baja entre un 0,5 % y un 1 % de tu peso por semana. Cuanto mayor es el déficit, mayor parte del peso perdido es músculo. Mantén el entrenamiento pesado y la proteína alta.', ref: 'Helms et al., 2014, JISSN; Garthe et al., 2011' },
    { t: 'Creatina', b: 'El monohidrato de creatina es el suplemento con más evidencia: mejora la fuerza y la ganancia muscular con el entrenamiento. Dosis: 3-5 g al día, todos los días, sin necesidad de fase de carga ni de descansos. Es segura en personas sanas a esas dosis.', ref: 'Kreider et al., 2017, posición de la ISSN' },
    { t: 'Descargas', b: 'Una descarga es un periodo corto de menos estrés (menos series, menos carga o menos esfuerzo) para disipar fatiga física y mental y volver a progresar. Los entrenadores de fuerza y físico la programan cada 4-8 semanas o cuando el rendimiento cae.', ref: 'Bell et al., 2023, consenso Delphi, Sports Medicine - Open' },
    { t: 'Sueño y recuperación', b: 'Dormir 7-9 horas es la base de la recuperación. Dormir poco reduce el rendimiento y la capacidad de entrenar duro. Si una noche duermes mal, el check-in de Forja aligera la sesión.', ref: 'Recomendación general de sociedades de medicina del sueño' },
  ];

  return { nutrition, readiness, adjustSession, bwTrend, insights, CUES, ARTICLES, muscleGroup };
})();
if (typeof module !== 'undefined') module.exports = COACH;
