const test = require('node:test');
const assert = require('node:assert/strict');
const J = require('../logic.js');
const qrcode = require('../vendor/qrcode.js');

const NOW = Date.UTC(2026, 10, 23, 14, 0, 0);
const rngFrom = (seq) => { let i = 0; return () => seq[i++ % seq.length]; };
const ok = (over = {}) => ({ name: 'Ana Pérez', email: 'ana@correo.com', org: 'ESPOCH', sessions: ['s1'], ...over });

test('el código tiene prefijo, 5 caracteres y nunca usa letras confusas', () => {
  for (let i = 0; i < 300; i++) {
    const c = J.makeCode(Math.random);
    assert.match(c, /^JSC-[A-HJKMNP-Z2-9]{5}$/);
  }
});

test('normalizeCode acepta minúsculas, espacios y el código sin prefijo', () => {
  assert.equal(J.normalizeCode(' jsc-ab3k7 '), 'JSC-AB3K7');
  assert.equal(J.normalizeCode('ab3k7'), 'JSC-AB3K7');
  assert.equal(J.normalizeCode('ab 3k7'), 'JSC-AB3K7');
  assert.equal(J.normalizeCode(null), '');
});

test('validate pide nombre y apellido, correo válido y una sesión', () => {
  const e = J.validate({ name: 'Ana', email: 'no-es-correo', sessions: [] }, J.emptyState());
  assert.ok(e.name && e.email && e.sessions);
  assert.deepEqual(J.validate(ok(), J.emptyState()), {});
});

test('validate rechaza sesiones inexistentes y nombres muy largos', () => {
  const st = J.emptyState();
  assert.ok(J.validate(ok({ sessions: ['zz'] }), st).sessions);
  assert.ok(J.validate(ok({ name: 'Ana ' + 'x'.repeat(90) }), st).name);
  assert.ok(J.validate(ok({ org: 'x'.repeat(61) }), st).org);
});

test('register guarda en minúsculas, ordena sesiones y genera código', () => {
  const st = J.emptyState();
  const r = J.register(st, ok({ email: ' ANA@Correo.COM ', sessions: ['s3', 's1'] }), NOW, rngFrom([0.1, 0.2, 0.3, 0.4, 0.5]));
  assert.equal(r.email, 'ana@correo.com');
  assert.deepEqual(r.sessions, ['s1', 's3']);
  assert.match(r.code, /^JSC-/);
  assert.equal(st.regs.length, 1);
});

test('no permite dos inscripciones con el mismo correo', () => {
  const st = J.emptyState();
  J.register(st, ok(), NOW);
  assert.throws(() => J.register(st, ok({ email: 'ANA@correo.com' }), NOW), (err) => /ya tiene una inscripción/.test(err.errors.email));
  assert.equal(st.regs.length, 1);
});

test('si el código sale repetido se genera otro', () => {
  const st = J.emptyState();
  const a = J.register(st, ok(), NOW, rngFrom([0, 0, 0, 0, 0]));
  const b = J.register(st, ok({ email: 'b@correo.com', name: 'Beto Ruiz' }), NOW, rngFrom([0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5]));
  assert.notEqual(a.code, b.code);
});

test('una sesión llena bloquea nuevas inscripciones', () => {
  const st = J.emptyState();
  const cap = J.sessionById('s4').cap;
  for (let i = 0; i < cap; i++) J.register(st, ok({ email: `p${i}@correo.com`, sessions: ['s4'] }), NOW);
  assert.equal(J.seatsLeft(st, 's4'), 0);
  const e = J.validate(ok({ email: 'ultimo@correo.com', sessions: ['s4'] }), st);
  assert.match(e.sessions, /ya no tiene cupos/);
});

test('checkIn: ok, duplicado, sin inscripción y código desconocido', () => {
  const st = J.emptyState();
  const r = J.register(st, ok({ sessions: ['s1'] }), NOW);
  assert.equal(J.checkIn(st, r.code, 's1', NOW + 1).status, 'ok');
  const dup = J.checkIn(st, r.code.toLowerCase(), 's1', NOW + 2);
  assert.equal(dup.status, 'duplicate');
  assert.equal(dup.at, NOW + 1);
  assert.equal(J.checkIn(st, r.code, 's2', NOW).status, 'not-registered');
  assert.equal(J.checkIn(st, 'JSC-ZZZZZ', 's1', NOW).status, 'unknown');
  assert.equal(J.arrived(st, 's1'), 1);
});

test('stats cuenta inscritos, plazas, llegadas y ocupación', () => {
  const st = J.seed(J.emptyState(), NOW);
  const s = J.stats(st);
  assert.equal(s.total, 48);
  assert.ok(s.fill > 0 && s.fill < 1);
  assert.equal(s.withArrival, 14);
  assert.equal(s.perSession.find((x) => x.id === 's2').taken, 40);
  assert.equal(s.perSession.find((x) => x.id === 's4').taken, 28);
});

test('seed es determinista y no repite correos ni códigos', () => {
  const a = J.seed(J.emptyState(), NOW);
  const b = J.seed(J.emptyState(), NOW + 5000);
  assert.deepEqual(a.regs.map((r) => r.code), b.regs.map((r) => r.code));
  assert.equal(new Set(a.regs.map((r) => r.code)).size, a.regs.length);
  assert.equal(new Set(a.regs.map((r) => r.email)).size, a.regs.length);
});

test('filterRegs busca sin importar tildes ni mayúsculas, y filtra por sesión', () => {
  const st = J.emptyState();
  J.register(st, ok({ name: 'Sebastián Núñez', email: 'seb@correo.com', sessions: ['s1'] }), NOW);
  J.register(st, ok({ name: 'Paula Rivas', email: 'paula@correo.com', sessions: ['s2'] }), NOW);
  assert.equal(J.filterRegs(st, 'SEBASTIAN nunez').length, 1);
  assert.equal(J.filterRegs(st, '', 's2').length, 1);
  assert.equal(J.filterRegs(st, 'paula', 's1').length, 0);
});

test('toCSV neutraliza fórmulas y escapa comillas y comas', () => {
  const st = J.emptyState();
  J.register(st, ok({ name: '=HYPERLINK("x") Pérez', org: 'Acme, S.A.' }), NOW);
  const csv = J.toCSV(st.regs);
  const [head, row] = csv.split('\n');
  assert.equal(head, 'codigo,nombre,correo,organizacion,sesiones,inscrito,ingresos');
  assert.ok(row.includes('"\'=HYPERLINK(""x"") Pérez"'));
  assert.ok(row.includes('"Acme, S.A."'));
});

test('el QR de la credencial se lee de vuelta con jsQR', () => {
  const jsQR = require('../vendor/jsQR.js');
  const code = 'JSC-AB3K7';
  const qr = qrcode(0, 'M');
  qr.addData(code);
  qr.make();
  const n = qr.getModuleCount();
  const scale = 6;
  const margin = 4;
  const size = (n + margin * 2) * scale;
  const data = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!qr.isDark(r, c)) continue;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const i = ((((r + margin) * scale + dy) * size) + (c + margin) * scale + dx) * 4;
          data[i] = data[i + 1] = data[i + 2] = 0;
        }
      }
    }
  }
  const res = jsQR(data, size, size);
  assert.equal(res && res.data, code);
});

test('attendance: sesiones de la persona, asistidas y certificado', () => {
  const st = J.emptyState();
  const reg = J.register(st, { name: 'Ana Pérez', email: 'a@b.co', sessions: ['s3', 's1'] }, NOW, () => 0.3);
  let a = J.attendance(reg);
  assert.deepEqual(a.items.map((x) => x.session.id), ['s1', 's3']);
  assert.equal(a.total, 2); assert.equal(a.attended, 0); assert.equal(a.missing, 2); assert.equal(a.complete, false);
  J.checkIn(st, reg.code, 's1', NOW + 1000);
  a = J.attendance(reg);
  assert.equal(a.items[0].attended, true); assert.equal(a.items[0].at, NOW + 1000);
  assert.equal(a.items[1].attended, false); assert.equal(a.complete, false);
  J.checkIn(st, reg.code, 's3', NOW + 2000);
  a = J.attendance(reg);
  assert.equal(a.complete, true); assert.equal(a.missing, 0);
});

test('todas las sesiones tienen lugar', () => {
  const D = require('../data.js');
  for (const s of D.SESSIONS) assert.ok(s.place && s.place.length > 3, s.id);
});
