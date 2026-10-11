const test = require('node:test');
const assert = require('node:assert/strict');
const BOT = require('../logic.js');
const D = require('../data.js');
const corpus = require('./corpus.js');

/* Sábado 10 de octubre de 2026, 14:30 en Ecuador (UTC-5). */
const SAT = Date.UTC(2026, 9, 10, 19, 30);
const at = (iso) => Date.parse(iso + '-05:00');
const rng = () => 0.3;

function ask(S, q, now = SAT) { return BOT.respond(S, q, { now, rng }); }
function first(q, now = SAT) { return ask(BOT.create(), q, now); }
function talk(lines, now = SAT) {
  const S = BOT.create();
  let t = now;
  const out = lines.map((q) => { const r = ask(S, q, t); t += 60000; return r; });
  return { S, out, last: out[out.length - 1] };
}
const text = (r) => r.messages.map((m) => m.text).join('\n');

test('el corpus de preguntas cae en el tema correcto', () => {
  const bad = [];
  for (const [q, id] of corpus) {
    const got = first(q).trace.chosen[0].id;
    if (got !== id) bad.push(`${q} → ${got} (esperado ${id})`);
  }
  assert.deepEqual(bad, []);
  assert.ok(corpus.length >= 240, 'el corpus debe tener al menos 240 preguntas');
});

test('hay al menos 55 temas, cada uno con respuesta y etiqueta', () => {
  assert.ok(BOT.INTENTS.length >= 55);
  for (const it of BOT.INTENTS) {
    assert.ok(it.id && it.label, it.id);
    assert.equal(typeof it.a, 'function', it.id);
  }
  const ids = BOT.INTENTS.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length, 'ids duplicados');
});

test('todos los temas del catálogo se alcanzan desde alguna pregunta del corpus', () => {
  const reached = new Set(corpus.map(([, id]) => id));
  const skip = new Set(['afirmacion', 'negacion', 'risa', 'cuenta']);
  const missing = BOT.INTENTS.map((i) => i.id).filter((id) => !reached.has(id) && !skip.has(id));
  assert.deepEqual(missing, []);
});

test('ninguna respuesta contiene undefined, NaN ni llaves de plantilla', () => {
  for (const [q] of corpus) {
    const t = text(first(q));
    assert.ok(!/undefined|NaN|\[object|\{\{/.test(t), q + ' → ' + t);
    assert.ok(t.length > 10, q);
  }
});

test('tolera errores de ortografía y abreviaturas', () => {
  const cases = [['a q hora abren', 'horario'], ['ke tal el ornado', 'plato'], ['kiero reserbar una mesa', 'reservar'], ['dnd quedan', 'ubicacion'], ['ubikacion', 'ubicacion'], ['cuanto cuesta el ornado', 'precio'], ['hay parkeadero', 'parqueadero'], ['tienen delibery', 'domicilio'], ['holaaaaa', 'saludo'], ['PRECIO DEL CEVICHE!!!', 'precio'], ['  ¿¿ HORARIO ??  ', 'horario']];
  for (const [q, id] of cases) assert.equal(first(q).trace.chosen[0].id, id, q);
});

test('mensajes vacíos o sin texto no rompen nada', () => {
  for (const q of ['', '   ', '???', '😀😀', '...']) {
    const r = first(q);
    assert.equal(r.messages.length, 1, JSON.stringify(q));
    assert.ok(r.messages[0].chips.length >= 2);
  }
});

test('mensajes muy largos se recortan y siguen respondiendo', () => {
  const r = first('hola '.repeat(500) + 'a que hora abren');
  assert.ok(r.messages.length >= 1);
});

test('sin coincidencia: sugiere temas y a la segunda ofrece una persona', () => {
  const S = BOT.create();
  const a = ask(S, 'blablabla xyz');
  assert.equal(a.trace.chosen[0].id, 'fallback');
  assert.match(text(a), /No estoy segura/);
  const b = ask(S, 'qwerty zzz');
  assert.match(text(b), /persona/);
  assert.ok(b.messages[0].chips.includes('Hablar con una persona'));
  const c = ask(S, 'hola');
  assert.equal(S.fallbacks, 0);
  assert.equal(c.trace.chosen[0].id, 'saludo');
});

test('mensajes con dos preguntas responden las dos', () => {
  const r = first('hola, a que hora abren y donde estan?');
  assert.deepEqual(r.trace.chosen.map((c) => c.id), ['horario', 'ubicacion']);
  assert.equal(r.messages.length, 2);
  assert.equal(r.messages[0].chips, undefined);
  assert.ok(r.messages[1].chips.length);
  const r2 = first('quisiera saber el horario y si tienen parqueadero');
  assert.deepEqual(r2.trace.chosen.map((c) => c.id), ['horario', 'parqueadero']);
  const r3 = first('carta y precios');
  assert.deepEqual(r3.trace.chosen.map((c) => c.id).sort(), ['carta', 'precio']);
});

test('un plato con su pregunta se responde una sola vez', () => {
  const r = first('ke tal el ornado, cuanto cuesta?');
  assert.deepEqual(r.trace.chosen.map((c) => c.id), ['precio']);
  assert.equal(r.messages.length, 1);
  assert.deepEqual(r.trace.ranked.map((x) => x.score), r.trace.ranked.map((x) => x.score).slice().sort((a, b) => b - a));
});

test('recuerda el plato del que se hablaba', () => {
  const { out } = talk(['que lleva el hornado', 'y cuanto cuesta', 'tiene aji?', 'cuanto demora']);
  assert.match(text(out[0]), /Cerdo horneado/);
  assert.match(text(out[1]), /\$7\.50 \+ IVA.*\$8\.63/);
  assert.match(text(out[2]), /hornado.*ají.*aparte/i);
  assert.match(text(out[3]), /10 minutos/);
});

test('el contexto del plato caduca después de varios mensajes', () => {
  const { last } = talk(['hornado', 'donde quedan', 'hay wifi', 'hay parqueadero', 'cuanto cuesta']);
  assert.match(text(last), /desde \*\*\$1\.00\*\*/);
});

test('un plato nuevo reemplaza al anterior', () => {
  const { out } = talk(['hornado', 'y el locro', 'cuanto cuesta']);
  assert.match(text(out[2]), /Locro de papa/);
});

test('calcula cuentas con IVA y redondeo en centavos', () => {
  const r = first('2 hornados y 3 jugos');
  assert.equal(r.trace.chosen[0].id, 'cuenta');
  const t = text(r);
  assert.match(t, /2 × Hornado con mote: \$15\.00/);
  assert.match(t, /3 × Jugo de naranjilla: \$4\.50/);
  assert.match(t, /\*\*Subtotal:\*\* \$19\.50/);
  assert.match(t, /\*\*IVA \(15 %\):\*\* \$2\.93/);
  assert.match(t, /\*\*Total:\*\* \$22\.43/);
});

test('cuentas con cantidades en letras, plurales y errores', () => {
  const r = first('dos fritadas y un encebollado');
  assert.match(text(r), /2 × Fritada: \$13\.00/);
  assert.match(text(r), /1 × Encebollado de albacora: \$4\.50/);
  assert.match(text(first('cuanto sale un hornado y un ceviche')), /Total:\*\* \$15\.53/);
  assert.match(text(first('quiero 3 ceviches')), /3 × Ceviche de camarón: \$18\.00/);
  assert.match(text(first('1 locro y 2 colada morada')), /2 × Colada morada: \$3\.50/);
});

test('precio de varios platos sin cantidades los lista', () => {
  const r = first('precio del hornado y del ceviche');
  assert.match(text(r), /Hornado con mote/);
  assert.match(text(r), /Ceviche de camarón/);
});

test('ancla las horas en Ecuador y responde si está abierto', () => {
  const cases = [
    ['2026-10-10T14:30', /abiertos.*21:00/],
    ['2026-10-10T10:00', /Todavía no abrimos.*11:00/],
    ['2026-10-10T20:30', /abiertos.*cerramos en 30 minutos/],
    ['2026-10-10T22:00', /cerrados.*mañana domingo.*11:00/],
    ['2026-10-11T17:30', /cerrados.*el martes.*11:00/],
    ['2026-10-12T13:00', /cerrados.*mañana martes/]
  ];
  for (const [iso, rx] of cases) assert.match(text(first('estan abiertos ahora', at(iso))), rx, iso);
});

test('la hora de Ecuador no depende de la zona del servidor', () => {
  const e = BOT.ecuNow(Date.UTC(2026, 9, 11, 3, 30));
  assert.equal(e.date, '2026-10-10');
  assert.equal(e.h, 22);
  assert.equal(e.dow, 6);
});

test('horarios por día de la semana', () => {
  assert.match(text(first('abren los lunes')), /lunes.*descansamos/);
  assert.match(text(first('a que hora cierran los domingos')), /domingos.*11:00 a 17:00/);
  assert.match(text(first('abren mañana')), /Mañana.*11:00 a 17:00/);
  assert.match(text(first('abren hoy', at('2026-10-10T15:00'))), /Hoy.*11:00 a 21:00.*abiertos/);
});

test('saludo según la hora y respuesta distinta si repite', () => {
  assert.match(text(first('hola', at('2026-10-10T08:00'))), /Buenos días/);
  assert.match(text(first('hola', at('2026-10-10T15:00'))), /Buenas tardes/);
  assert.match(text(first('hola', at('2026-10-10T20:00'))), /Buenas noches/);
  const S = BOT.create();
  const a = text(ask(S, 'hola')), b = text(ask(S, 'hola'));
  assert.notEqual(a, b);
});

test('chistes y datos rotan sin repetir seguido', () => {
  const S = BOT.create();
  const seen = [];
  for (let i = 0; i < 4; i++) seen.push(text(ask(S, 'cuentame un chiste')));
  assert.equal(new Set(seen).size, 4);
});

test('alergenos y vegetarianos por plato', () => {
  assert.match(text(first('el ceviche tiene alergenos')), /mariscos/);
  assert.match(text(first('el locro tiene lacteos')), /lácteos/);
  assert.match(text(first('el aguacate tiene gluten')), /Dime a qué eres alérgico|alérgenos|ningún/);
  assert.match(text(first('es vegetariano el locro')), /Sí, hay opciones/);
  assert.match(text(first('la fritada tiene alergenos')), /ninguno de los alérgenos/);
});

/* ---------- Reserva ---------- */
const rsv = (lines, now) => talk(lines, now);

test('reserva completa paso a paso y queda guardada', () => {
  const { S, out } = rsv(['quiero reservar', '4', 'el martes', '19:00', 'Ana Pérez', 'omitir', 'confirmar']);
  assert.match(text(out[0]), /cuántas personas/);
  assert.match(text(out[1]), /qué día/);
  assert.match(text(out[2]), /qué hora/);
  assert.match(text(out[3]), /nombre de quién/);
  assert.match(text(out[4]), /celular/);
  assert.match(text(out[5]), /Mesa para 4.*Martes 13 de octubre, 19:00.*Ana Pérez/s);
  assert.match(text(out[6]), /PCH-[A-Z2-9]{4}/);
  assert.equal(S.reservations.length, 1);
  assert.deepEqual({ people: S.reservations[0].people, date: S.reservations[0].date, time: S.reservations[0].time, name: S.reservations[0].name }, { people: 4, date: '2026-10-13', time: 19 * 60, name: 'Ana Pérez' });
  assert.equal(S.flow, null);
});

test('reserva en un solo mensaje salta los pasos que ya tiene', () => {
  const { out } = rsv(['quiero reservar para 4 el martes a las 7 pm']);
  assert.match(text(out[0]), /nombre de quién/);
  const r2 = rsv(['mesa para 2 el martes a las 12']).out[0];
  assert.match(text(r2), /nombre de quién/);
});

test('entiende fechas y horas de distintas maneras', () => {
  const now = SAT;
  const ec = BOT.ecuNow(now);
  assert.equal(BOT.parseDate('manana', ec).date, '2026-10-11');
  assert.equal(BOT.parseDate('pasado manana', ec).date, '2026-10-12');
  assert.equal(BOT.parseDate('hoy', ec).date, '2026-10-10');
  assert.equal(BOT.parseDate('el viernes', ec).date, '2026-10-16');
  assert.equal(BOT.parseDate('el 15 de octubre', ec).date, '2026-10-15');
  assert.equal(BOT.parseDate('15/10', ec).date, '2026-10-15');
  assert.equal(BOT.parseDate('el 20', ec).date, '2026-10-20');
  assert.equal(BOT.parseDate('a las 10 de la manana', ec), null, '«de la mañana» no es el día de mañana');
  assert.equal(BOT.parseTime('a las 7 pm'), 19 * 60);
  assert.equal(BOT.parseTime('7:30 pm'), 19 * 60 + 30);
  assert.equal(BOT.parseTime('19h30'), 19 * 60 + 30);
  assert.equal(BOT.parseTime('a las 12'), 12 * 60);
  assert.equal(BOT.parseTime('a las 11 de la manana'), 11 * 60);
  assert.equal(BOT.parseTime('a las 8 y media'), 20 * 60 + 30);
  assert.equal(BOT.parseTime('a las siete'), 19 * 60);
  assert.equal(BOT.parseTime('mediodia'), 12 * 60);
  assert.equal(BOT.parseTime('para 4 personas'), null);
  assert.equal(BOT.parsePeople('para 4 personas', false), 4);
  assert.equal(BOT.parsePeople('somos seis', false), 6);
  assert.equal(BOT.parsePeople('para 4 a las 7', false), 4);
  assert.equal(BOT.parsePeople('para 7 pm', false), null);
  assert.equal(BOT.parsePeople('para 20 de octubre', false), null);
  assert.equal(BOT.parsePeople('solo yo', false), 1);
});

test('reserva: los lunes no se puede y sugiere el martes', () => {
  const r = rsv(['reservar para 2 el lunes']).out[0];
  assert.match(text(r), /lunes.*descansamos.*martes 13 de octubre/s);
});

test('reserva: horas fuera de horario y domingo cierra a las 17:00', () => {
  assert.match(text(rsv(['reservar para 2 el martes a las 11 pm']).out[0]), /11:00 a 21:00.*20:00/s);
  assert.match(text(rsv(['reservar para 2 el domingo a las 6 pm']).out[0]), /11:00 a 17:00.*16:00/s);
  assert.match(text(rsv(['reservar para 2 el martes a las 8 am']).out[0]), /11:00 a 21:00/);
});

test('reserva: pasado, demasiado lejos y hora ya pasada de hoy', () => {
  assert.match(text(rsv(['reservar para 2 hoy a las 2 pm']).out[0]), /ya pasó o es demasiado pronto/);
  assert.match(text(rsv(['reservar para 2 el 20 de noviembre a las 7 pm']).out[0]), /hasta con 30 días/);
  const now = at('2026-10-10T08:00');
  assert.match(text(rsv(['reservar para 2 hoy a las 9 am'], now).out[0]), /11:00 a 21:00/);
  assert.match(text(rsv(['reservar para 2 hoy a las 12'], now).out[0]), /nombre de quién/);
});

test('reserva: horas sin mesa libre ofrecen una antes y una después', () => {
  const r = rsv(['reservar para 2 el sabado a las 1 pm', 'mañana'], at('2026-10-09T09:00')).out[0];
  assert.match(text(r), /13:00.*ya no tengo mesa libre.*12:00.*14:30/s);
  assert.deepEqual(r.messages[0].chips.slice(0, 2), ['12:00', '14:30']);
});

test('reserva: más de 12 personas se derivan a una persona', () => {
  const r = rsv(['reservar para 20 personas']).out[0];
  assert.match(text(r), /20 personas.*asesor.*099 000 0000/s);
  const { out, S } = rsv(['reservar', '15', '6']);
  assert.match(text(out[1]), /asesor/);
  assert.equal(S.flow.slots.people, 6);
});

test('reserva: una pregunta en medio se responde y luego se retoma', () => {
  const { out, S } = rsv(['quiero reservar', 'cuanto cuesta el hornado', '4']);
  assert.equal(out[1].messages.length, 2);
  assert.match(out[1].messages[0].text, /\$7\.50/);
  assert.match(out[1].messages[1].text, /Seguimos con tu reserva.*cuántas personas/);
  assert.equal(S.flow.slots.people, 4);
});

test('reserva: un nombre no se confunde con una pregunta ni al revés', () => {
  const { out, S } = rsv(['reservar para 2 el martes a las 12', 'a que hora cierran', 'Rosa Vera']);
  assert.match(out[1].messages[0].text, /horario|Nuestro/i);
  assert.match(out[1].messages[1].text, /Seguimos con tu reserva.*nombre/s);
  assert.equal(S.flow.slots.name, 'Rosa Vera');
  const t2 = rsv(['reservar para 2 el martes a las 12', 'me llamo juan carlos pérez']);
  assert.equal(t2.S.flow.slots.name, 'Juan Carlos Pérez');
});

test('reserva: valida el celular y permite omitirlo', () => {
  const { out, S } = rsv(['reservar para 2 el martes a las 12', 'Luis Mora', '12345', '+593991234567']);
  assert.match(text(out[2]), /celular de 10 dígitos/);
  assert.equal(S.flow.slots.phone, '099 123 4567');
  assert.equal(BOT.parsePhone('0991234567'), '099 123 4567');
  assert.equal(BOT.parsePhone('099-123-4567'), '099 123 4567');
  assert.equal(BOT.parsePhone('0801234567'), null);
});

test('reserva: cambiar un dato desde el resumen', () => {
  const { out, S } = rsv(['reservar para 4 el martes a las 12', 'Pedro Lara', 'omitir', 'mejor a las 8 pm', 'cambiar personas', '5', 'si']);
  assert.match(text(out[3]), /Hecho, lo actualicé.*20:00/s);
  assert.match(text(out[4]), /cuántas personas/);
  assert.match(text(out[5]), /Mesa para 5/);
  assert.equal(S.reservations[0].people, 5);
  assert.equal(S.reservations[0].time, 20 * 60);
});

test('reserva: cancelar en cualquier paso no guarda nada', () => {
  for (const word of ['cancelar', 'mejor no', 'olvidalo']) {
    const { S, last } = rsv(['reservar para 4', word]);
    assert.equal(S.flow, null, word);
    assert.equal(S.reservations.length, 0);
    assert.match(text(last), /no guardé ninguna reserva/);
  }
});

test('mis reservas y cancelar con confirmación', () => {
  const { S } = rsv(['reservar para 2 el martes a las 12', 'Rosa Vera', 'omitir', 'si']);
  const code = S.reservations[0].code;
  const list = ask(S, 'mis reservas');
  assert.match(text(list), new RegExp(code));
  const c1 = ask(S, 'cancelar mi reserva');
  assert.match(text(c1), /¿Cancelo la reserva/);
  const keep = ask(S, 'no, mantenerla');
  assert.equal(S.reservations.length, 1);
  assert.match(text(keep), /sigue en pie/);
  ask(S, 'quiero cancelar mi reserva ' + code);
  const done = ask(S, 'sí, cancelar');
  assert.match(text(done), /cancelé la reserva/);
  assert.equal(S.reservations.length, 0);
  assert.match(text(ask(S, 'mis reservas')), /No tienes reservas/);
  assert.match(text(ask(S, 'cancelar mi reserva')), /no hay nada que cancelar/);
});

test('con varias reservas pide el código para cancelar', () => {
  const S = BOT.create();
  for (const [d, n] of [['martes', 'Ana Ruiz'], ['miercoles', 'Beto Soto']]) {
    let t = SAT;
    for (const q of ['reservar para 2 el ' + d + ' a las 12', n, 'omitir', 'si']) BOT.respond(S, q, { now: (t += 60000), rng: Math.random });
  }
  assert.equal(S.reservations.length, 2);
  assert.notEqual(S.reservations[0].code, S.reservations[1].code);
  const r = ask(S, 'cancelar mi reserva');
  assert.match(text(r), /Tienes 2 reservas/);
  ask(S, S.reservations[1].code);
  ask(S, 'si');
  assert.equal(S.reservations.length, 1);
});

test('el estado de la conversación se puede guardar y restaurar', () => {
  const { S } = rsv(['reservar para 2 el martes a las 12', 'Rosa Vera']);
  const copy = JSON.parse(JSON.stringify(S));
  const r = ask(copy, 'omitir');
  assert.match(text(r), /Mesa para 2/);
});

test('seguridad: el HTML escrito por la persona nunca llega sin escapar al motor de respuestas', () => {
  const r = first('<img src=x onerror=alert(1)> hornado');
  const t = text(r);
  assert.ok(!/<img/.test(t));
  const { S } = rsv(['reservar para 2 el martes a las 12', '<b>Hack</b>']);
  assert.equal(S.flow.slots.name, undefined);
});

test('todas las respuestas sugeridas (chips) llevan a una respuesta real', () => {
  const chips = new Set();
  corpus.forEach(([q]) => { (first(q).messages.slice(-1)[0].chips || []).forEach((c) => chips.add(c)); });
  D.SAMPLE_QUESTIONS.forEach((g) => g.items.forEach((q) => chips.add(q)));
  const skip = /^(\d{1,2}:\d{2}|Omitir|Confirmar|Cambiar .+|\d personas|Hoy|Mañana|Cancelar|Sí, cancelar|No, mantenerla|No cancelar|Viernes|Sábado|Domingo|Martes.*|PCH-.*)$/;
  const bad = [];
  chips.forEach((c) => {
    if (skip.test(c)) return;
    const S = BOT.create();
    const id = ask(S, c).trace.chosen[0].id;
    if (id === 'fallback') bad.push(c);
  });
  assert.deepEqual(bad, []);
  assert.ok(chips.size > 40);
});

test('las preguntas de ejemplo del panel responden lo que prometen', () => {
  const expected = { '¿Qué lleva el hornado?': 'ingredientes', '¿Cuánto cuestan 2 hornados y 3 jugos?': 'cuenta', '¿Qué me recomiendas?': 'recomendacion', '¿Están abiertos ahora?': 'abierto_ahora', '¿Abren los lunes?': 'horario', '¿Dónde quedan y hay parqueadero?': 'ubicacion', 'Quiero reservar para 4 mañana a las 7 pm': 'reservar', '¿Tienen opciones vegetarianas?': 'vegetariano', '¿Hacen eventos y cumpleaños?': 'eventos', '¿Hacen entregas a domicilio?': 'domicilio', '¿Aceptan tarjeta?': 'pagos', '¿Dan factura?': 'factura' };
  for (const [q, id] of Object.entries(expected)) {
    const got = first(q).trace.chosen.map((c) => c.id);
    assert.ok(got.includes(id), q + ' → ' + got);
  }
});

test('el rastro (trace) explica la decisión', () => {
  const r = first('ke tal el ornado cuanto cuesta');
  const t = r.trace;
  assert.ok(t.tokens.some((k) => k.ent && k.raw === 'ornado'));
  assert.ok(t.tokens.some((k) => k.hit && k.raw === 'cuesta'));
  assert.equal(t.ranked[0].id, 'precio');
  assert.ok(t.entities.some((e) => e.kind === 'Plato' && /Hornado/.test(e.value)));
  assert.equal(t.chosen[0].id, 'precio');
});

test('datos: precios coherentes y claves únicas', () => {
  const ids = D.MENU.map((m) => m.id);
  assert.equal(new Set(ids).size, ids.length);
  D.MENU.forEach((m) => { assert.ok(Number.isInteger(m.price) && m.price > 0); assert.ok(m.keys.length); });
  assert.equal(BOT.money(750), '$7.50');
  assert.equal(D.HOURS[1], null);
});
