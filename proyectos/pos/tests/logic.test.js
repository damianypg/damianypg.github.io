/* Pruebas unitarias de la lógica del POS: node --test tests/logic.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../logic.js');
const D = require('../data.js');

const MIN = 60 * 1000;
const line = (id, qty) => {
  const d = D.MENU.find((x) => x.id === id);
  return { id, name: d.name, price: d.price, qty };
};

test('la carta tiene ids únicos, categorías válidas y precios en centavos enteros', () => {
  const ids = D.MENU.map((d) => d.id);
  assert.equal(new Set(ids).size, ids.length);
  const cats = D.CATEGORIES.map((c) => c.id);
  for (const d of D.MENU) {
    assert.ok(cats.includes(d.cat), `${d.id} usa una categoría que no existe`);
    assert.ok(Number.isInteger(d.price) && d.price > 0, `${d.id} tiene un precio inválido`);
  }
});

test('money formatea dólares con punto decimal', () => {
  assert.equal(P.money(450), '$4.50');
  assert.equal(P.money(0), '$0.00');
  assert.equal(P.money(123456), '$1,234.56');
});

test('totals calcula subtotal, IVA 15 % y total', () => {
  const t = P.totals([{ price: 450, qty: 2 }]);
  assert.deepEqual(t, { subtotal: 900, iva: 135, total: 1035 });
});

test('totals redondea el IVA al centavo y no pierde centavos', () => {
  const t = P.totals([{ price: 125, qty: 1 }]);
  assert.equal(t.iva, 19);
  assert.equal(t.total, t.subtotal + t.iva);
  assert.deepEqual(P.totals([]), { subtotal: 0, iva: 0, total: 0 });
});

test('linesFromDraft ignora cantidades en cero y conserva el orden de la carta', () => {
  const lines = P.linesFromDraft({ hornado: 1, encebollado: 2, agua: 0 });
  assert.deepEqual(lines.map((l) => l.id), ['encebollado', 'hornado']);
  assert.equal(lines[0].qty, 2);
});

test('createOrder numera, recorta la nota de cada plato y rechaza pedidos vacíos', () => {
  const s = P.emptyState();
  assert.throws(() => P.createOrder(s, { table: 'Mesa 1', items: [] }, 0), /no tiene platos/);
  assert.throws(() => P.createOrder(s, { table: 'Mesa 1', items: [line('agua', 0)] }, 0));
  const a = P.createOrder(s, { table: 'Mesa 1', items: [{ ...line('agua', 1), note: '  ' + 'x'.repeat(300) }] }, 1000);
  const b = P.createOrder(s, { table: 'Mesa 2', items: [line('agua', 1)] }, 2000);
  assert.equal(a.num, 1);
  assert.equal(b.num, 2);
  assert.equal(a.items[0].note.length, P.NOTE_MAX);
  assert.equal(a.status, 'nuevo');
  assert.equal(s.orders.length, 2);
});

test('el pedido avanza nuevo, preparando, listo y se cobra con un medio válido', () => {
  const s = P.emptyState();
  const o = P.createOrder(s, { table: 'Mesa 1', items: [line('encebollado', 1)] }, 0);
  assert.throws(() => P.pay(o, 'Efectivo', 1), /listo/);
  P.advance(o, 1 * MIN);
  assert.equal(o.status, 'preparando');
  assert.equal(o.startedAt, 1 * MIN);
  P.advance(o, 5 * MIN);
  assert.equal(o.status, 'listo');
  assert.equal(o.readyAt, 5 * MIN);
  assert.throws(() => P.advance(o, 6 * MIN), /No se puede avanzar/);
  assert.throws(() => P.pay(o, 'Cripto', 7 * MIN), /inválido/);
  P.pay(o, 'Tarjeta', 8 * MIN);
  assert.equal(o.status, 'cobrado');
  assert.equal(o.payment, 'Tarjeta');
  assert.equal(o.paidAt, 8 * MIN);
});

test('urgency cambia a los 8 y a los 12 minutos', () => {
  assert.equal(P.urgency(8 * MIN - 1000), 'ok');
  assert.equal(P.urgency(8 * MIN), 'warn');
  assert.equal(P.urgency(12 * MIN - 1000), 'warn');
  assert.equal(P.urgency(12 * MIN), 'late');
});

test('clock formatea mm:ss y no baja de cero', () => {
  assert.equal(P.clock(65000), '01:05');
  assert.equal(P.clock(0), '00:00');
  assert.equal(P.clock(-5000), '00:00');
  assert.equal(P.clock(61 * MIN), '61:00');
});

test('stats suma solo pedidos cobrados y ordena los platos más vendidos', () => {
  const s = P.emptyState();
  const at = (h, m) => new Date(2026, 9, 9, h, m).getTime();
  const a = P.createOrder(s, { table: 'Mesa 1', items: [line('encebollado', 2), line('agua', 2)] }, at(13, 0));
  const b = P.createOrder(s, { table: 'Mesa 2', items: [line('encebollado', 1)] }, at(13, 30));
  const c = P.createOrder(s, { table: 'Mesa 3', items: [line('hornado', 1)] }, at(19, 0));
  [a, b].forEach((o) => { P.advance(o, o.createdAt + MIN); P.advance(o, o.createdAt + 10 * MIN); P.pay(o, 'Efectivo', o.createdAt + 12 * MIN); });
  const r = P.stats(s.orders);
  assert.equal(r.count, 2);
  assert.equal(r.sales, P.orderTotal(a) + P.orderTotal(b));
  assert.equal(r.avgTicket, Math.round(r.sales / 2));
  assert.equal(r.avgPrepMs, 10 * MIN);
  assert.deepEqual(r.top.map((t) => [t.name, t.qty]), [['Encebollado de albacora', 3], ['Agua', 2]]);
  assert.equal(r.byHour[13], r.sales);
  assert.equal(r.byHour[19], 0, 'el pedido de las 19:00 no está cobrado');
  assert.equal(c.status, 'nuevo');
});

test('stats con cero pedidos no divide entre cero', () => {
  const r = P.stats([]);
  assert.equal(r.sales, 0);
  assert.equal(r.avgTicket, 0);
  assert.equal(r.avgPrepMs, 0);
  assert.deepEqual(r.top, []);
});

test('toCSV escapa comillas y comas', () => {
  const s = P.emptyState();
  P.createOrder(s, { table: 'Mesa "5", norte', items: [line('agua', 2)] }, Date.UTC(2026, 9, 9, 12, 0));
  const csv = P.toCSV(s.orders).split('\n');
  assert.equal(csv[0], 'pedido,mesa,estado,creado,subtotal,iva,total,pago,platos');
  assert.ok(csv[1].includes('"Mesa ""5"", norte"'));
  assert.ok(csv[1].endsWith('2 Agua'));
  assert.ok(csv[1].includes('2.00,0.30,2.30'));
});

test('seed crea 9 pedidos de ejemplo con tiempos coherentes', () => {
  const s = P.emptyState();
  const now = Date.now();
  P.seed(s, now);
  const by = (st) => s.orders.filter((o) => o.status === st).length;
  assert.equal(s.orders.length, 9);
  assert.deepEqual([by('cobrado'), by('preparando'), by('listo'), by('nuevo')], [5, 1, 1, 2]);
  assert.equal(new Set(s.orders.map((o) => o.id)).size, 9);
  for (const o of s.orders) {
    assert.ok(o.createdAt <= now);
    if (o.readyAt) assert.ok(o.readyAt >= o.createdAt);
    if (o.paidAt) assert.ok(o.paidAt >= o.readyAt && o.payment);
  }
});

test('linesFromDraft lleva la nota de cada plato', () => {
  const lines = P.linesFromDraft({ hornado: 1, agua: 2 }, { hornado: '  sin   ají ', agua: '', fritada: 'no va' });
  assert.deepEqual(lines.map((l) => [l.id, l.note]), [['hornado', 'sin ají'], ['agua', '']]);
});

test('el stock empieza con las porciones de la carta y baja al enviar un pedido', () => {
  const s = P.emptyState();
  for (const d of D.MENU) assert.equal(P.stockOf(s, d.id), d.stock);
  const before = P.stockOf(s, 'hornado');
  P.createOrder(s, { table: 'Mesa 1', items: [line('hornado', 2)] }, 0);
  assert.equal(P.stockOf(s, 'hornado'), before - 2);
});

test('un pedido que no alcanza el stock se rechaza completo y dice qué falta', () => {
  const s = P.emptyState();
  P.setStock(s, 'espumilla', 1);
  const stockAntes = JSON.stringify(s.stock);
  let err;
  try { P.createOrder(s, { table: 'Mesa 1', items: [line('agua', 1), line('espumilla', 2)] }, 0); } catch (e) { err = e; }
  assert.ok(err && err.short);
  assert.deepEqual(err.short.map((x) => [x.id, x.left]), [['espumilla', 1]]);
  assert.equal(s.orders.length, 0);
  assert.equal(s.seq, 0);
  assert.equal(JSON.stringify(s.stock), stockAntes, 'no se descuenta nada');
});

test('setStock, adjustStock y resetStock respetan los límites', () => {
  const s = P.emptyState();
  assert.equal(P.setStock(s, 'agua', 5), 5);
  assert.equal(P.adjustStock(s, 'agua', -9), 0);
  assert.equal(P.setStock(s, 'agua', 500), 99);
  assert.equal(P.setStock(s, 'agua', 'abc'), 0);
  assert.throws(() => P.setStock(s, 'no-existe', 1), /desconocido/);
  P.resetStock(s);
  assert.equal(P.stockOf(s, 'agua'), 30);
});

test('availability distingue agotado, pocas y disponible', () => {
  assert.equal(P.availability(0), 'out');
  assert.equal(P.availability(1), 'low');
  assert.equal(P.availability(P.LOW_STOCK), 'low');
  assert.equal(P.availability(P.LOW_STOCK + 1), 'ok');
});

test('ensureStock completa datos guardados antes de existir el stock', () => {
  const old = { orders: [], seq: 0 };
  P.ensureStock(old);
  assert.equal(P.stockOf(old, 'locro'), 8);
});

test('seed no gasta stock y trae notas por plato', () => {
  const s = P.emptyState();
  P.seed(s, Date.now());
  assert.deepEqual(s.stock, P.defaultStock());
  const withNote = s.orders.flatMap((o) => o.items).filter((l) => l.note);
  assert.equal(withNote.length, 2);
});

test('toCSV incluye la nota del plato', () => {
  const s = P.emptyState();
  P.createOrder(s, { table: 'Mesa 1', items: [{ ...line('hornado', 1), note: 'sin ají' }] }, 0);
  assert.ok(P.toCSV(s.orders).endsWith('1 Hornado con mote [sin ají]'));
});
