/* Lógica del POS sin DOM: se prueba con Node y se reutiliza en el navegador. */
(function (root) {
  var IVA = 0.15;
  var WARN_MS = 8 * 60 * 1000;
  var LATE_MS = 12 * 60 * 1000;
  var STATUSES = ['nuevo', 'preparando', 'listo', 'cobrado'];
  var PAYMENTS = ['Efectivo', 'Tarjeta', 'Transferencia'];

  var LOW_STOCK = 3;
  var NOTE_MAX = 80;

  var DATA = typeof module !== 'undefined' && module.exports ? require('./data.js') : root.POS_DATA;

  function money(cents) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
  }

  function totals(items) {
    var subtotal = 0;
    for (var i = 0; i < items.length; i++) subtotal += items[i].price * items[i].qty;
    var iva = Math.round(subtotal * IVA);
    return { subtotal: subtotal, iva: iva, total: subtotal + iva };
  }

  function cleanNote(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, NOTE_MAX); }

  /* draft.items es { idPlato: cantidad } y notes { idPlato: texto }; devuelve las líneas con precio, nombre y nota. */
  function linesFromDraft(draftItems, notes) {
    var lines = [];
    DATA.MENU.forEach(function (dish) {
      var qty = draftItems[dish.id] || 0;
      if (qty > 0) lines.push({ id: dish.id, name: dish.name, price: dish.price, qty: qty, note: cleanNote(notes && notes[dish.id]) });
    });
    return lines;
  }

  /* ---------- Stock: porciones que quedan de cada plato ---------- */

  function defaultStock() {
    var st = {};
    DATA.MENU.forEach(function (d) { st[d.id] = d.stock; });
    return st;
  }

  /* Completa lo que falte (datos guardados antes de existir el stock). */
  function ensureStock(state) {
    if (!state.stock || typeof state.stock !== 'object') state.stock = {};
    DATA.MENU.forEach(function (d) {
      if (!Number.isInteger(state.stock[d.id]) || state.stock[d.id] < 0) state.stock[d.id] = d.stock;
    });
    return state;
  }

  function stockOf(state, id) {
    var v = state.stock && state.stock[id];
    if (Number.isInteger(v) && v >= 0) return v;
    var d = DATA.MENU.filter(function (x) { return x.id === id; })[0];
    return d ? d.stock : 0;
  }

  function setStock(state, id, n) {
    ensureStock(state);
    if (!(id in state.stock)) throw new Error('Plato desconocido');
    var v = Math.round(Number(n));
    state.stock[id] = isNaN(v) ? 0 : Math.max(0, Math.min(99, v));
    return state.stock[id];
  }

  function adjustStock(state, id, delta) { return setStock(state, id, stockOf(state, id) + delta); }

  function resetStock(state) { state.stock = defaultStock(); return state; }

  /* 'out' agotado, 'low' quedan pocas, 'ok' hay. */
  function availability(n) { return n <= 0 ? 'out' : n <= LOW_STOCK ? 'low' : 'ok'; }

  function emptyState() {
    return { orders: [], seq: 0, stock: defaultStock() };
  }

  /* Toma las porciones del stock. Si algún plato no alcanza, no se envía nada y el error trae cuáles faltan. */
  function createOrder(state, input, now, opts) {
    var items = (input.items || []).filter(function (l) { return l.qty > 0; });
    if (!items.length) throw new Error('El pedido no tiene platos');
    ensureStock(state);
    var skipStock = !!(opts && opts.ignoreStock);
    if (!skipStock) {
      var short = items.filter(function (l) { return l.qty > stockOf(state, l.id); })
        .map(function (l) { return { id: l.id, name: l.name, left: stockOf(state, l.id) }; });
      if (short.length) {
        var err = new Error('No alcanza el stock');
        err.short = short;
        throw err;
      }
      items.forEach(function (l) { state.stock[l.id] -= l.qty; });
    }
    items = items.map(function (l) {
      return { id: l.id, name: l.name, price: l.price, qty: l.qty, note: cleanNote(l.note) };
    });
    state.seq += 1;
    var order = {
      id: 'p' + state.seq,
      num: state.seq,
      table: input.table,
      items: items,
      status: 'nuevo',
      createdAt: now,
      startedAt: null,
      readyAt: null,
      paidAt: null,
      payment: null
    };
    state.orders.push(order);
    return order;
  }

  function findOrder(state, id) {
    for (var i = 0; i < state.orders.length; i++) if (state.orders[i].id === id) return state.orders[i];
    return null;
  }

  /* nuevo -> preparando -> listo. El cobro va aparte porque necesita el medio de pago. */
  function advance(order, now) {
    if (order.status === 'nuevo') { order.status = 'preparando'; order.startedAt = now; }
    else if (order.status === 'preparando') { order.status = 'listo'; order.readyAt = now; }
    else throw new Error('No se puede avanzar un pedido en estado ' + order.status);
    return order;
  }

  function pay(order, method, now) {
    if (order.status !== 'listo') throw new Error('Solo se cobra un pedido listo');
    if (PAYMENTS.indexOf(method) === -1) throw new Error('Medio de pago inválido');
    order.status = 'cobrado';
    order.paidAt = now;
    order.payment = method;
    return order;
  }

  function urgency(elapsedMs) {
    if (elapsedMs >= LATE_MS) return 'late';
    if (elapsedMs >= WARN_MS) return 'warn';
    return 'ok';
  }

  function clock(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    var m = Math.floor(s / 60);
    var r = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
  }

  function orderTotal(order) { return totals(order.items).total; }

  function stats(orders) {
    var paid = orders.filter(function (o) { return o.status === 'cobrado'; });
    var sales = 0;
    var byItem = {};
    var byHour = [];
    for (var h = 0; h < 24; h++) byHour.push(0);
    paid.forEach(function (o) {
      var t = orderTotal(o);
      sales += t;
      byHour[new Date(o.createdAt).getHours()] += t;
      o.items.forEach(function (l) { byItem[l.name] = (byItem[l.name] || 0) + l.qty; });
    });
    var prep = orders.filter(function (o) { return o.readyAt; });
    var prepMs = prep.length
      ? prep.reduce(function (acc, o) { return acc + (o.readyAt - o.createdAt); }, 0) / prep.length
      : 0;
    var top = Object.keys(byItem)
      .map(function (name) { return { name: name, qty: byItem[name] }; })
      .sort(function (a, b) { return b.qty - a.qty || a.name.localeCompare(b.name); });
    return {
      sales: sales,
      count: paid.length,
      avgTicket: paid.length ? Math.round(sales / paid.length) : 0,
      avgPrepMs: prepMs,
      top: top,
      byHour: byHour
    };
  }

  function csvCell(v) {
    var s = String(v == null ? '' : v);
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function toCSV(orders) {
    var head = ['pedido', 'mesa', 'estado', 'creado', 'subtotal', 'iva', 'total', 'pago', 'platos'];
    var rows = orders.map(function (o) {
      var t = totals(o.items);
      return [
        o.num, o.table, o.status, new Date(o.createdAt).toISOString(),
        (t.subtotal / 100).toFixed(2), (t.iva / 100).toFixed(2), (t.total / 100).toFixed(2),
        o.payment || '',
        o.items.map(function (l) { return l.qty + ' ' + l.name + (l.note ? ' [' + l.note + ']' : ''); }).join(' + ')
      ].map(csvCell).join(',');
    });
    return [head.join(',')].concat(rows).join('\n');
  }

  function line(id, qty, note) {
    var dish = DATA.MENU.filter(function (d) { return d.id === id; })[0];
    return { id: dish.id, name: dish.name, price: dish.price, qty: qty, note: note || '' };
  }

  /* Pedidos de ejemplo repartidos en las últimas horas, uno en cada estado. */
  function seed(state, now) {
    var min = 60 * 1000;
    var specs = [
      { ago: 150, table: 'Mesa 2', items: [['hornado', 2], ['colada-morada', 2]], status: 'cobrado', prep: 11, pay: 'Efectivo' },
      { ago: 130, table: 'Mesa 5', items: [['encebollado', 3], ['agua', 3]], status: 'cobrado', prep: 7, pay: 'Tarjeta' },
      { ago: 95, table: 'Para llevar', items: [['fritada', 1], ['jugo-naranjilla', 1]], status: 'cobrado', prep: 9, pay: 'Transferencia' },
      { ago: 70, table: 'Mesa 1', items: [['ceviche-camaron', 2], ['pilsener', 2], ['helado-paila', 2]], status: 'cobrado', prep: 13, pay: 'Tarjeta' },
      { ago: 40, table: 'Mesa 7', items: [['seco-chivo', 1], ['llapingachos', 1]], status: 'cobrado', prep: 10, pay: 'Efectivo' },
      { ago: 14, table: 'Mesa 3', items: [['arroz-marinero', 2], ['jugo-naranjilla', 2]], status: 'preparando', prep: 0 },
      { ago: 6, table: 'Mesa 6', items: [['locro', 2], ['caldo-gallina', 1]], status: 'listo', prep: 5 },
      { ago: 2, table: 'Mesa 4', items: [['hornado', 1, 'Sin ají'], ['fritada', 1], ['pilsener', 2, 'Bien fría']], status: 'nuevo', prep: 0 },
      { ago: 1, table: 'Mesa 8', items: [['encebollado', 2], ['espumilla', 2]], status: 'nuevo', prep: 0 }
    ];
    specs.forEach(function (s) {
      var order = createOrder(state, {
        table: s.table,
        items: s.items.map(function (p) { return line(p[0], p[1], p[2]); })
      }, now - s.ago * min, { ignoreStock: true });
      if (s.status !== 'nuevo') {
        order.startedAt = order.createdAt + min;
        order.status = 'preparando';
      }
      if (s.status === 'listo' || s.status === 'cobrado') {
        order.readyAt = order.createdAt + s.prep * min;
        order.status = 'listo';
      }
      if (s.status === 'cobrado') {
        order.paidAt = order.readyAt + 4 * min;
        order.status = 'cobrado';
        order.payment = s.pay;
      }
    });
    return state;
  }

  var api = {
    IVA: IVA, WARN_MS: WARN_MS, LATE_MS: LATE_MS, STATUSES: STATUSES, PAYMENTS: PAYMENTS,
    LOW_STOCK: LOW_STOCK, NOTE_MAX: NOTE_MAX, cleanNote: cleanNote,
    defaultStock: defaultStock, ensureStock: ensureStock, stockOf: stockOf, setStock: setStock, adjustStock: adjustStock,
    resetStock: resetStock, availability: availability,
    money: money, totals: totals, linesFromDraft: linesFromDraft, emptyState: emptyState,
    createOrder: createOrder, findOrder: findOrder, advance: advance, pay: pay,
    urgency: urgency, clock: clock, orderTotal: orderTotal, stats: stats, toCSV: toCSV, seed: seed
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.POS = api;
})(typeof window !== 'undefined' ? window : globalThis);
