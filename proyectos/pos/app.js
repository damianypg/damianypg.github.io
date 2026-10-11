/* Interfaz del POS. Los pedidos se guardan en localStorage y se sincronizan
   entre pestañas con el evento "storage": abre Cocina en otra pestaña y los
   pedidos del mesero aparecen al instante. No hay servidor. */
(function () {
  'use strict';

  var P = window.POS;
  var D = window.POS_DATA;
  var KEY = 'pos-demo-v1';
  var DRAFT_KEY = 'pos-demo-draft-v1';
  var ROUTES = ['menu', 'mesero', 'cocina', 'admin'];
  var TITLES = { menu: 'Menú', mesero: 'Mesero', cocina: 'Cocina', admin: 'Admin' };
  var STATUS_LABEL = { nuevo: 'Nuevo', preparando: 'En preparación', listo: 'Listo', cobrado: 'Cobrado' };
  var ACTIVE_LABEL = { nuevo: 'Enviado a cocina', preparando: 'En preparación', listo: 'Listo para entregar' };

  var app = document.getElementById('app');
  var dlg = document.getElementById('dlg');
  var live = document.getElementById('live');
  var badge = document.getElementById('badge');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');


  /* Demo: al abrir o refrescar con una sola pestaña, todo empieza de cero. Si hay otra pestaña
     abierta se conserva, para poder probar las vistas juntas (por ejemplo mesero y cocina). */
  (function freshStart() {
    var ALIVE = 'pos-demo-alive-v1';
    var ID = Math.random().toString(36).slice(2);
    var TTL = 3000;
    function read() { try { return JSON.parse(localStorage.getItem(ALIVE)) || {}; } catch (e) { return {}; } }
    function write(m) { try { localStorage.setItem(ALIVE, JSON.stringify(m)); } catch (e) { /* ok */ } }
    var t = Date.now();
    var m = read();
    var others = Object.keys(m).filter(function (k) { return t - m[k] < TTL; });
    try {
      if (!others.length) localStorage.removeItem(KEY);
      sessionStorage.removeItem(DRAFT_KEY);
    } catch (e) { /* ok */ }
    function beat() {
      var mm = read();
      var now = Date.now();
      Object.keys(mm).forEach(function (k) { if (now - mm[k] >= TTL) delete mm[k]; });
      mm[ID] = now;
      write(mm);
    }
    beat();
    setInterval(beat, 1000);
    window.addEventListener('pagehide', function () { var mm = read(); delete mm[ID]; write(mm); });
  })();

  var state = load();
  var draft = loadDraft();
  var route = 'mesero';
  var focusAfterRender = null;

  /* ---------- Almacenamiento ---------- */

  function load() {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && Array.isArray(raw.orders) && typeof raw.seq === 'number') return P.ensureStock(raw);
    } catch (e) { /* almacenamiento bloqueado o JSON dañado */ }
    return P.emptyState();
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* se queda en memoria */ }
  }

  function loadDraft() {
    try {
      var raw = JSON.parse(sessionStorage.getItem(DRAFT_KEY));
      if (raw && raw.items && D.TABLES.indexOf(raw.table) !== -1) return { table: raw.table, items: raw.items, notes: raw.notes || {} };
    } catch (e) { /* sin borrador */ }
    return { table: D.TABLES[0], items: {}, notes: {} };
  }

  function saveDraft() {
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch (e) { /* ok */ }
  }

  /* Siempre se parte del estado más reciente para no pisar lo que hizo otra pestaña. */
  function mutate(fn) {
    state = load();
    var result = fn(state);
    save();
    return result;
  }

  /* ---------- Utilidades ---------- */

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function announce(msg) {
    live.textContent = '';
    setTimeout(function () { live.textContent = msg; }, 30);
  }

  function hhmm(ts) {
    return new Date(ts).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
  }

  function minSec(ms) {
    var total = Math.round(ms / 1000);
    var m = Math.floor(total / 60), sec = total % 60;
    return m + ' min' + (sec ? ' ' + sec + ' s' : '');
  }

  function count(status) {
    return state.orders.filter(function (o) { return o.status === status; }).length;
  }

  /* ---------- Enrutado ---------- */

  function currentRoute() {
    var r = location.hash.replace(/^#\/?/, '');
    return ROUTES.indexOf(r) === -1 ? 'mesero' : r;
  }

  function render() {
    route = currentRoute();
    document.body.setAttribute('data-view', route);
    document.title = TITLES[route] + ' | Panel POS | Yosef Puetate';
    $$('.roles a').forEach(function (a) {
      if (a.dataset.route === route) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    if (route === 'menu') app.innerHTML = viewMenu();
    else if (route === 'mesero') app.innerHTML = viewMesero();
    else if (route === 'cocina') app.innerHTML = viewCocina();
    else app.innerHTML = viewAdmin();

    if (route === 'mesero') { clampDraft(); syncSteppers(); updateTicket(); renderActive(); watchCategories(); }
    updateNav();
    if (route === 'cocina') updateStockUI();
    tick();

    if (focusAfterRender) {
      var el = $(focusAfterRender);
      if (el) el.focus();
      focusAfterRender = null;
    }
  }

  /* Refresco ligero cuando llegan cambios de otra pestaña: no toca lo que el mesero está escribiendo. */
  function refresh() {
    if (route === 'mesero') {
      var cut = clampDraft();
      syncSteppers(); updateTicket(); renderActive(); updateNav();
      if (cut.length) stockMessage('Se ajustó la comanda porque se acabaron porciones: ' + cut.join(', ') + '.');
    }
    else render();
  }

  function updateNav() {
    var n = count('nuevo');
    badge.hidden = n === 0;
    badge.textContent = n;
    badge.setAttribute('aria-label', n + (n === 1 ? ' pedido nuevo' : ' pedidos nuevos'));
  }

  /* ---------- Mesero ---------- */

  function viewMesero() {
    var cats = D.CATEGORIES.map(function (c) {
      return '<button type="button" class="chip" data-act="cat" data-id="' + c.id + '">' + esc(c.name) + '</button>';
    }).join('');

    var sections = D.CATEGORIES.map(function (c) {
      var dishes = D.MENU.filter(function (d) { return d.cat === c.id; }).map(function (d) {
        return '<li class="dish" data-dish="' + d.id + '">' +
          '<div class="dish-text">' +
            '<p class="dish-line"><span class="dish-name">' + esc(d.name) + '</span><span class="dots" aria-hidden="true"></span><span class="dish-price">' + P.money(d.price) + '</span></p>' +
            '<p class="dish-desc">' + esc(d.desc) + '</p>' +
            '<p class="dish-stock" data-stock-text="' + d.id + '"></p>' +
            '<div class="dish-note" data-note-wrap="' + d.id + '" hidden>' +
              '<label for="n-' + d.id + '">Nota para cocina<span class="visually-hidden">: ' + esc(d.name) + '</span></label>' +
              '<input id="n-' + d.id + '" data-note="' + d.id + '" type="text" maxlength="' + P.NOTE_MAX + '" autocomplete="off" placeholder="Ej.: sin ají" />' +
            '</div>' +
          '</div>' +
          '<div class="stepper" role="group" aria-label="Cantidad de ' + esc(d.name) + '">' +
            '<button type="button" data-act="dec" data-id="' + d.id + '" aria-label="Quitar uno: ' + esc(d.name) + '">−</button>' +
            '<output class="qty" data-qty="' + d.id + '">0</output>' +
            '<button type="button" data-act="inc" data-id="' + d.id + '" aria-label="Agregar uno: ' + esc(d.name) + '">+</button>' +
          '</div>' +
        '</li>';
      }).join('');
      return '<section class="cat" id="cat-' + c.id + '" aria-labelledby="h-' + c.id + '"><h2 id="h-' + c.id + '">' + esc(c.name) + '</h2><ul class="dishes">' + dishes + '</ul></section>';
    }).join('');

    var tables = D.TABLES.map(function (t) {
      return '<option' + (t === draft.table ? ' selected' : '') + '>' + esc(t) + '</option>';
    }).join('');

    return '<div class="mesero">' +
      '<section class="carta" aria-labelledby="carta-t">' +
        '<h1 id="carta-t">Carta</h1>' +
        '<div class="chips" role="group" aria-label="Ir a una categoría">' + cats + '</div>' +
        sections +
      '</section>' +
      '<aside class="comanda" id="comanda" aria-labelledby="comanda-t">' +
        '<h2 id="comanda-t">Comanda</h2>' +
        '<label class="field"><span>Mesa</span><select id="table">' + tables + '</select></label>' +
        '<div class="printer">' +
          '<div class="slot" aria-hidden="true"></div>' +
          '<div class="paper" id="paper">' +
            '<p class="paper-brand">Picantería Chimborazo</p>' +
            '<p class="paper-meta" id="ticket-meta"></p>' +
            '<div id="ticket-lines" class="tlines"></div>' +
            '<dl class="paper-totals" id="ticket-totals"></dl>' +
          '</div>' +
        '</div>' +
        '<p class="stock-msg" id="stock-msg" role="status"></p>' +
        '<button type="button" class="btn btn--big" id="send" data-act="send">Enviar a cocina</button>' +
        '<section class="active" aria-labelledby="active-t"><h3 id="active-t">Pedidos en curso</h3><div id="active"></div></section>' +
      '</aside>' +
      '<button type="button" class="dock" id="dock" data-act="dock" hidden><span>Ver comanda <span class="dock-count" id="dock-count"></span></span><strong id="dock-total"></strong></button>' +
    '</div>';
  }

  function stockText(n) {
    return n <= 0 ? 'Agotado' : n === 1 ? 'Queda 1' : 'Quedan ' + n;
  }

  function stockMessage(text) {
    var el = $('#stock-msg');
    if (el) el.textContent = text;
    announce(text);
  }

  /* Si cocina agotó algo, la comanda no puede pedir más de lo que queda. Devuelve los platos ajustados. */
  function clampDraft() {
    var cut = [];
    D.MENU.forEach(function (d) {
      var q = draft.items[d.id] || 0;
      var left = P.stockOf(state, d.id);
      if (q > left) {
        cut.push(d.name);
        if (left === 0) { delete draft.items[d.id]; delete draft.notes[d.id]; } else draft.items[d.id] = left;
      }
    });
    if (cut.length) saveDraft();
    return cut;
  }

  /* Marca en los chips la categoría que se está viendo. */
  var catObserver = null;
  function watchCategories() {
    if (catObserver) catObserver.disconnect();
    if (!('IntersectionObserver' in window)) return;
    catObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = en.target.id.replace('cat-', '');
        $$('.chip').forEach(function (c) {
          if (c.dataset.id === id) c.setAttribute('aria-current', 'true'); else c.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-35% 0px -60% 0px' });
    $$('.cat').forEach(function (sec) { catObserver.observe(sec); });
  }

  function syncSteppers() {
    D.MENU.forEach(function (d) {
      var q = draft.items[d.id] || 0;
      var left = P.stockOf(state, d.id);
      var out = $('[data-qty="' + d.id + '"]');
      if (!out) return;
      out.textContent = q;
      $('[data-act="dec"][data-id="' + d.id + '"]').disabled = q === 0;
      $('[data-act="inc"][data-id="' + d.id + '"]').disabled = q >= left;
      var row = $('[data-dish="' + d.id + '"]');
      row.classList.toggle('is-picked', q > 0);
      row.classList.toggle('is-out', left === 0);
      var av = P.availability(left);
      var tag = $('[data-stock-text="' + d.id + '"]');
      tag.textContent = stockText(left);
      tag.className = 'dish-stock dish-stock--' + av;
      var wrap = $('[data-note-wrap="' + d.id + '"]');
      wrap.hidden = q === 0;
      var inp = $('input', wrap);
      var want = draft.notes[d.id] || '';
      if (inp.value !== want && document.activeElement !== inp) inp.value = want;
    });
  }

  function updateTicket() {
    var meta = $('#ticket-meta');
    if (!meta) return;
    var lines = P.linesFromDraft(draft.items, draft.notes);
    var t = P.totals(lines);
    meta.textContent = draft.table + ', pedido n.º ' + (state.seq + 1);

    $('#ticket-lines').innerHTML = lines.length
      ? lines.map(function (l) {
          return '<div class="tline"><span class="q">' + l.qty + '×</span><span class="n">' + esc(l.name) + '</span><span class="p">' + P.money(l.price * l.qty) + '</span></div>' +
            (l.note ? '<p class="tline-note">Nota: ' + esc(l.note) + '</p>' : '');
        }).join('')
      : '<p class="paper-empty">Aún no hay platos. Agrégalos desde la carta.</p>';

    $('#ticket-totals').innerHTML = lines.length
      ? '<div><dt>Subtotal</dt><dd>' + P.money(t.subtotal) + '</dd></div>' +
        '<div><dt>IVA 15 %</dt><dd>' + P.money(t.iva) + '</dd></div>' +
        '<div class="grand"><dt>Total</dt><dd>' + P.money(t.total) + '</dd></div>'
      : '';

    $('#send').disabled = lines.length === 0;
    $('#dock-total').textContent = P.money(t.total);
    var units = lines.reduce(function (acc, l) { return acc + l.qty; }, 0);
    $('#dock-count').textContent = '(' + units + (units === 1 ? ' plato)' : ' platos)');
    $('#dock').hidden = lines.length === 0;
  }

  function renderActive() {
    var box = $('#active');
    if (!box) return;
    var open = state.orders.filter(function (o) { return o.status !== 'cobrado'; }).slice().reverse();
    if (!open.length) {
      box.innerHTML = '<p class="muted">No hay pedidos en curso.</p>';
      return;
    }
    box.innerHTML = '<ul class="active-list">' + open.map(function (o) {
      var ready = o.status === 'listo';
      return '<li class="' + (ready ? 'is-ready' : '') + '">' +
        '<div><strong>Pedido n.º ' + o.num + '</strong><span class="muted"> ' + esc(o.table) + '</span></div>' +
        '<span class="status status--' + o.status + '">' + ACTIVE_LABEL[o.status] + '</span>' +
        (ready ? '<button type="button" class="btn btn--ok btn--sm" data-act="pay" data-id="' + o.id + '">Entregar y cobrar</button>' : '') +
      '</li>';
    }).join('') + '</ul>';
  }

  function changeQty(id, delta) {
    var q = Math.max(0, Math.min(20, P.stockOf(state, id), (draft.items[id] || 0) + delta));
    if (q === 0) { delete draft.items[id]; delete draft.notes[id]; } else draft.items[id] = q;
    saveDraft();
    syncSteppers();
    updateTicket();
  }

  function sendOrder() {
    var lines = P.linesFromDraft(draft.items, draft.notes);
    if (!lines.length) return;
    var order;
    try {
      order = mutate(function (s) {
        return P.createOrder(s, { table: draft.table, items: lines }, Date.now());
      });
    } catch (err) {
      if (!err.short) throw err;
      clampDraft();
      syncSteppers();
      updateTicket();
      stockMessage('No se envió: ' + err.short.map(function (x) { return x.name + ' (' + (x.left === 0 ? 'agotado' : 'quedan ' + x.left) + ')'; }).join(', ') + '. Revisa la comanda.');
      return;
    }
    draft.items = {};
    draft.notes = {};
    saveDraft();
    var msgEl = $('#stock-msg');
    if (msgEl) msgEl.textContent = '';
    announce('Pedido n.º ' + order.num + ' enviado a cocina, ' + order.table);

    var paper = $('#paper');
    function reset() {
      syncSteppers();
      updateTicket();
      renderActive();
      updateNav();
      if (!reduceMotion.matches && paper) {
        paper.animate([{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 560, easing: 'steps(16, end)' });
      }
    }
    if (reduceMotion.matches || !paper) { reset(); return; }
    var out = paper.animate(
      [{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(-18px)', opacity: 0 }],
      { duration: 260, easing: 'ease-in', fill: 'forwards' }
    );
    out.onfinish = function () { out.cancel(); reset(); };
  }

  /* ---------- Cocina ---------- */

  function ticketHTML(o) {
    var running = o.status === 'nuevo' || o.status === 'preparando';
    var since = o.status === 'listo' ? o.readyAt : o.createdAt;
    var action = o.status === 'nuevo'
      ? '<button type="button" class="btn" data-act="advance" data-id="' + o.id + '">Empezar a preparar</button>'
      : o.status === 'preparando'
        ? '<button type="button" class="btn btn--ok" data-act="advance" data-id="' + o.id + '">Marcar listo</button>'
        : '<p class="muted">Esperando al mesero</p>';
    return '<li class="kt" data-ticket="' + o.id + '" data-since="' + since + '" data-running="' + (running ? 1 : 0) + '" tabindex="-1" aria-label="Pedido n.º ' + o.num + ', ' + esc(o.table) + '">' +
      '<div class="kt-top"><span class="kt-num">Pedido n.º ' + o.num + '</span><span class="kt-table">' + esc(o.table) + '</span></div>' +
      '<p class="kt-timer"><span class="timer" data-clock>00:00</span><span class="kt-flag" data-flag></span></p>' +
      '<ul class="kt-items">' + o.items.map(function (l) {
        return '<li><b>' + l.qty + '×</b> ' + esc(l.name) + (l.note ? '<span class="kt-note"><strong>Nota:</strong> ' + esc(l.note) + '</span>' : '') + '</li>';
      }).join('') + '</ul>' +
      (o.note ? '<p class="kt-note"><strong>Nota:</strong> ' + esc(o.note) + '</p>' : '') +
      action +
    '</li>';
  }

  function column(status, title, hint) {
    var list = state.orders.filter(function (o) { return o.status === status; });
    return '<section class="col" aria-labelledby="col-' + status + '">' +
      '<h2 id="col-' + status + '">' + title + ' <span class="count">' + list.length + '</span></h2>' +
      (list.length
        ? '<ol class="tickets">' + list.map(ticketHTML).join('') + '</ol>'
        : '<p class="col-empty">' + hint + '</p>') +
    '</section>';
  }

  function viewCocina() {
    var empty = state.orders.length === 0;
    return '<div class="cocina">' +
      '<div class="page-head"><h1>Cocina</h1>' +
        '<p class="lede">Los pedidos del mesero llegan aquí en vivo. Prueba abriendo la vista Mesero en otra pestaña.</p>' +
        (empty ? '<button type="button" class="btn btn--light" data-act="seed">Cargar pedidos de ejemplo</button>' : '') +
      '</div>' +
      '<div class="rail">' +
        column('nuevo', 'Nuevos', 'Sin pedidos nuevos.') +
        column('preparando', 'En preparación', 'Nada en la plancha.') +
        column('listo', 'Listos', 'Ningún plato esperando.') +
      '</div>' + stockPanel() + '</div>';
  }

  function stockPanel() {
    var groups = D.CATEGORIES.map(function (c) {
      return '<h3>' + esc(c.name) + '</h3><ul class="stk-list">' + D.MENU.filter(function (d) { return d.cat === c.id; }).map(function (d) {
        return '<li class="stk" data-stk="' + d.id + '">' +
          '<span class="stk-name">' + esc(d.name) + '</span>' +
          '<span class="stk-state" data-stk-state></span>' +
          '<span class="stk-ctrl" role="group" aria-label="Porciones de ' + esc(d.name) + '">' +
            '<button type="button" data-act="stock-dec" data-id="' + d.id + '" aria-label="Quitar una porción: ' + esc(d.name) + '">−</button>' +
            '<output class="stk-n" data-stk-n></output>' +
            '<button type="button" data-act="stock-inc" data-id="' + d.id + '" aria-label="Agregar una porción: ' + esc(d.name) + '">+</button>' +
          '</span>' +
          '<button type="button" class="btn btn--sm btn--ghost-k" data-act="stock-zero" data-id="' + d.id + '" aria-label="Marcar agotado: ' + esc(d.name) + '">Agotar</button>' +
        '</li>';
      }).join('') + '</ul>';
    }).join('');
    return '<section class="stock" aria-labelledby="stock-t">' +
      '<div class="stock-head"><h2 id="stock-t">Platos disponibles</h2>' +
        '<button type="button" class="btn btn--light btn--sm" data-act="restock">Reponer todo</button></div>' +
      '<p class="lede">Indica cuántas porciones quedan. El mesero y el cliente lo ven al instante en su carta; cuando llega a cero el plato aparece agotado.</p>' +
      groups + '</section>';
  }

  function updateStockUI() {
    $$('[data-stk]').forEach(function (row) {
      var id = row.dataset.stk;
      var n = P.stockOf(state, id);
      var av = P.availability(n);
      $('[data-stk-n]', row).textContent = n;
      var st = $('[data-stk-state]', row);
      st.textContent = av === 'out' ? 'Agotado' : av === 'low' ? 'Quedan pocas' : 'Disponible';
      st.className = 'stk-state stk-state--' + av;
      $('[data-act="stock-dec"]', row).disabled = n === 0;
      $('[data-act="stock-inc"]', row).disabled = n >= 99;
      $('[data-act="stock-zero"]', row).disabled = n === 0;
    });
  }

  /* ---------- Menú (vista del cliente) ---------- */

  /* Una ilustración de línea por categoría, en lugar de fotos de relleno. Mismo trazo para todas. */
  var ICON_OPEN = '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">';
  var ICONS = {
    sopas: ICON_OPEN + '<path d="M9 30h46c0 12-10 20-23 20S9 42 9 30z"/><path d="M24 54h16"/><path d="M23 22c-2.5-3 2.5-5 0-9M32 22c-2.5-3 2.5-5 0-9M41 22c-2.5-3 2.5-5 0-9"/></svg>',
    fuertes: ICON_OPEN + '<circle cx="32" cy="34" r="17"/><circle cx="32" cy="34" r="10" stroke-dasharray="3 4"/><path d="M8 14v12M12 14v12M8 26h4M10 26v26M56 14c-4 3-5 9-5 14h5v24"/></svg>',
    mar: ICON_OPEN + '<path d="M7 32c8-10 22-14 34-8l13-8v32l-13-8c-12 6-26 2-34-8z"/><circle cx="20" cy="30" r="1.8" fill="currentColor"/><path d="M30 26c2 4 2 8 0 12"/></svg>',
    bebidas: ICON_OPEN + '<path d="M17 12h30l-5 45H22z"/><path d="M19 27h26"/><path d="M41 4l-5 27"/></svg>',
    postres: ICON_OPEN + '<path d="M16 30l16 29 16-29"/><path d="M14 30a18 18 0 0 1 36 0z"/><path d="M24 20c3-3 8-3 11 0"/></svg>'
  };

  function viewMenu() {
    var sections = D.CATEGORIES.map(function (c) {
      var cards = D.MENU.filter(function (d) { return d.cat === c.id; }).map(function (d) {
        var n = P.stockOf(state, d.id);
        var av = P.availability(n);
        return '<li class="mcard' + (av === 'out' ? ' is-out' : '') + '" data-cat="' + c.id + '" data-menu="' + d.id + '">' +
          '<div class="photo" role="img" aria-label="Ilustración de ' + esc(d.name) + '">' + ICONS[c.id] + '</div>' +
          '<div class="mcard-body">' +
            '<h3>' + esc(d.name) + '</h3>' +
            '<p class="mcard-desc">' + esc(d.desc) + '</p>' +
            '<p class="mcard-foot"><strong class="mcard-price">' + P.money(d.price) + '</strong>' +
            (av === 'out' ? '<span class="dish-stock dish-stock--out" data-menu-stock>Agotado hoy</span>' : '') + '</p>' +
          '</div></li>';
      }).join('');
      return '<section class="mcat" aria-labelledby="m-' + c.id + '"><h2 id="m-' + c.id + '">' + esc(c.name) + '</h2><ul class="mgrid">' + cards + '</ul></section>';
    }).join('');
    return '<div class="menu-cli"><div class="page-head"><h1>Menú</h1>' +
      '<p class="lede">Así ve el cliente la carta. Cada plato lleva una ilustración de su categoría donde iría la foto. Si Cocina agota un plato, aquí aparece como agotado.</p></div>' + sections + '</div>';
  }

  /* El cronómetro solo toca texto y clases: no vuelve a dibujar los tickets. */
  function tick() {
    $$('[data-since]').forEach(function (el) {
      var ms = Date.now() - Number(el.dataset.since);
      var clock = $('[data-clock]', el);
      if (clock) clock.textContent = P.clock(ms);
      if (el.dataset.running === '1') {
        var u = P.urgency(ms);
        el.classList.toggle('kt--warn', u === 'warn');
        el.classList.toggle('kt--late', u === 'late');
        var flag = $('[data-flag]', el);
        if (flag) flag.textContent = u === 'late' ? 'Tarde' : u === 'warn' ? 'Se demora' : '';
      }
    });
  }

  /* ---------- Admin ---------- */

  function chartSVG(byHour) {
    /* El eje empieza después del tramo sin ventas más largo, así un turno que
       cruza la medianoche se ve seguido y no partido en los dos extremos. */
    var from = 8, to = 22;
    var nz = [];
    for (var k = 0; k < 24; k++) if (byHour[k] > 0) nz.push(k);
    if (nz.length) {
      var gapAt = nz.length - 1, gap = -1;
      nz.forEach(function (hr, i) {
        var g = (nz[(i + 1) % nz.length] - hr + 24) % 24 || 24;
        if (g > gap) { gap = g; gapAt = i; }
      });
      var start = nz[(gapAt + 1) % nz.length], end = nz[gapAt];
      if (start <= end) { from = Math.min(from, start); to = Math.max(to, end); }
      else { from = start; to = end + 24; }
      if (to - from < 11) from = to - 11;
    }
    function hourOf(n) { return ((n % 24) + 24) % 24; }
    var vals = [];
    for (var h = from; h <= to; h++) vals.push(byHour[hourOf(h)]);
    var max = Math.max.apply(null, vals.concat([1]));
    var peak = vals.indexOf(Math.max.apply(null, vals));
    var W = 640, H = 200, padB = 26, padT = 22;
    var bw = W / vals.length;
    var bars = vals.map(function (v, i) {
      var bh = Math.round((v / max) * (H - padB - padT));
      var x = i * bw + bw * 0.16;
      var hour = hourOf(from + i);
      return '<g><title>' + hour + ':00, ' + P.money(v) + '</title>' +
        '<rect class="bar' + (i === peak && v > 0 ? ' bar--peak' : '') + '" x="' + x.toFixed(1) + '" y="' + (H - padB - bh) + '" width="' + (bw * 0.68).toFixed(1) + '" height="' + bh + '" rx="3"></rect>' +
        (i === peak && v > 0 ? '<text class="peak-label" x="' + (x + bw * 0.34).toFixed(1) + '" y="' + Math.max(12, H - padB - bh - 6) + '" text-anchor="middle">' + P.money(v) + '</text>' : '') +
        (i % 2 === 0 ? '<text x="' + (x + bw * 0.34).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + hour + '</text>' : '') +
        '</g>';
    }).join('');
    var any = Math.max.apply(null, vals) > 0;
    var label = any
      ? 'Ventas por hora, de ' + hourOf(from) + ' a ' + hourOf(to) + ' horas. La hora con más ventas es las ' + hourOf(from + peak) + ':00 con ' + P.money(vals[peak])
      : 'Ventas por hora: todavía no hay ventas cobradas';
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(label) + '">' +
      '<line class="axis" x1="0" y1="' + (H - padB) + '" x2="' + W + '" y2="' + (H - padB) + '"></line>' + bars + '</svg>';
  }

  function viewAdmin() {
    var s = P.stats(state.orders);
    var topMax = s.top.length ? s.top[0].qty : 1;
    var open = state.orders.filter(function (o) { return o.status !== 'cobrado'; });
    var openTotal = open.reduce(function (acc, o) { return acc + P.orderTotal(o); }, 0);
    var pending = open.length
      ? '<p class="pending" id="pending">' + open.length + (open.length === 1 ? ' pedido sin cobrar por ' : ' pedidos sin cobrar por ') + P.money(openTotal) +
        '. Se suman a las ventas cuando el mesero los entrega y los cobra, en la vista Mesero.</p>'
      : '';
    var top = s.top.slice(0, 6).map(function (t) {
      return '<li><span class="top-name">' + esc(t.name) + '</span><span class="top-bar" style="--w:' + Math.round((t.qty / topMax) * 100) + '%"></span><span class="top-qty">' + t.qty + '</span></li>';
    }).join('');

    var rows = state.orders.slice().reverse().map(function (o) {
      return '<tr><th scope="row">n.º ' + o.num + '</th><td>' + esc(o.table) + '</td><td><span class="status status--' + o.status + '">' + STATUS_LABEL[o.status] + '</span></td><td>' + hhmm(o.createdAt) + '</td><td class="num">' + P.money(P.orderTotal(o)) + '</td></tr>';
    }).join('');

    return '<div class="admin">' +
      '<div class="page-head"><h1>Resumen del día</h1>' +
        '<div class="head-actions">' +
          '<button type="button" class="btn btn--ghost" data-act="seed">Cargar pedidos de ejemplo</button>' +
          '<button type="button" class="btn btn--ghost" data-act="export"' + (state.orders.length ? '' : ' disabled') + '>Exportar CSV</button>' +
        '</div>' +
      '</div>' +
      '<dl class="kpis">' +
        '<div><dt>Ventas cobradas</dt><dd id="k-sales">' + P.money(s.sales) + '</dd></div>' +
        '<div><dt>Pedidos cobrados</dt><dd id="k-count">' + s.count + '</dd></div>' +
        '<div><dt>Ticket promedio</dt><dd id="k-avg">' + P.money(s.avgTicket) + '</dd></div>' +
        '<div><dt>Tiempo medio hasta estar listo</dt><dd id="k-prep">' + (s.avgPrepMs ? minSec(s.avgPrepMs) : 'Sin datos') + '</dd></div>' +
      '</dl>' + pending +
      '<div class="admin-grid">' +
        '<section class="panel" aria-labelledby="t-hours"><h2 id="t-hours">Ventas por hora</h2>' + chartSVG(s.byHour) + '</section>' +
        '<section class="panel" aria-labelledby="t-top"><h2 id="t-top">Platos más vendidos</h2>' +
          (top ? '<ol class="ranking">' + top + '</ol>' : '<p class="muted">Aún no hay pedidos cobrados.</p>') + '</section>' +
      '</div>' +
      '<section class="panel" aria-labelledby="t-orders"><h2 id="t-orders">Pedidos</h2>' +
        (rows
          ? '<div class="table-wrap" tabindex="0" role="region" aria-label="Tabla de pedidos, se desplaza horizontalmente"><table><thead><tr><th scope="col">Pedido</th><th scope="col">Mesa</th><th scope="col">Estado</th><th scope="col">Hora</th><th scope="col" class="num">Total con IVA</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
          : '<p class="muted">No hay pedidos todavía. Toma uno en la vista Mesero o carga los de ejemplo.</p>') +
      '</section>' +
    '</div>';
  }

  /* ---------- Diálogos ---------- */

  function openPay(id) {
    var o = P.findOrder(state, id);
    if (!o || o.status !== 'listo') return;
    var total = P.money(P.orderTotal(o));
    dlg.innerHTML = '<form method="dialog" class="pay">' +
      '<h2 id="dlg-title">Cobrar pedido n.º ' + o.num + '</h2>' +
      '<p class="muted">' + esc(o.table) + '</p>' +
      '<ul class="pay-lines">' + o.items.map(function (l) {
        return '<li><span>' + l.qty + '× ' + esc(l.name) + '</span><span>' + P.money(l.price * l.qty) + '</span></li>';
      }).join('') + '</ul>' +
      '<p class="pay-total"><span>Total con IVA</span><strong>' + total + '</strong></p>' +
      '<fieldset><legend>Medio de pago</legend>' + P.PAYMENTS.map(function (m, i) {
        return '<label class="radio"><input type="radio" name="method" value="' + m + '"' + (i === 0 ? ' checked' : '') + ' /> ' + m + '</label>';
      }).join('') + '</fieldset>' +
      '<div class="actions"><button type="submit" value="cancel" class="btn btn--ghost" formnovalidate>Cancelar</button>' +
      '<button type="submit" value="ok" class="btn btn--ok">Cobrar ' + total + '</button></div>' +
    '</form>';
    $('form', dlg).addEventListener('submit', function (e) {
      if (!e.submitter || e.submitter.value !== 'ok') return;
      var method = this.elements.method.value;
      mutate(function (s) { P.pay(P.findOrder(s, id), method, Date.now()); });
      announce('Pedido n.º ' + o.num + ' cobrado con ' + method.toLowerCase());
      refresh();
    });
    dlg.showModal();
  }

  function exportCSV() {
    var blob = new Blob(['﻿' + P.toCSV(state.orders)], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'pedidos-picanteria-chimborazo.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  /* ---------- Eventos ---------- */

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-act]');
    if (!btn || btn.disabled) return;
    var act = btn.dataset.act;
    var id = btn.dataset.id;

    if (act === 'inc') changeQty(id, 1);
    else if (act === 'dec') changeQty(id, -1);
    else if (act === 'cat') {
      var sec = document.getElementById('cat-' + id);
      if (sec) sec.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
    }
    else if (act === 'dock') $('#comanda').scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
    else if (act === 'send') sendOrder();
    else if (act === 'stock-inc' || act === 'stock-dec') {
      mutate(function (s) { P.adjustStock(s, id, act === 'stock-inc' ? 1 : -1); });
      updateStockUI();
    }
    else if (act === 'stock-zero') {
      mutate(function (s) { P.setStock(s, id, 0); });
      updateStockUI();
      announce('Marcado como agotado');
    }
    else if (act === 'restock') {
      mutate(function (s) { P.resetStock(s); });
      updateStockUI();
      announce('Todos los platos repuestos');
    }
    else if (act === 'pay') openPay(id);
    else if (act === 'advance') {
      mutate(function (s) { P.advance(P.findOrder(s, id), Date.now()); });
      focusAfterRender = '[data-ticket="' + id + '"]';
      render();
    }
    else if (act === 'seed') {
      mutate(function (s) { P.seed(s, Date.now()); });
      announce('Pedidos de ejemplo cargados');
      render();
    }
    else if (act === 'export') exportCSV();
  });

  document.addEventListener('change', function (e) {
    if (e.target.id === 'table') { draft.table = e.target.value; saveDraft(); updateTicket(); }
  });

  document.addEventListener('input', function (e) {
    var nid = e.target.dataset && e.target.dataset.note;
    if (nid) { draft.notes[nid] = e.target.value; saveDraft(); updateTicket(); }
  });

  window.addEventListener('hashchange', render);

  window.addEventListener('storage', function (e) {
    if (e.key !== KEY && e.key !== null) return;
    var seen = state.orders.map(function (o) { return o.id; });
    state = load();
    if (route === 'cocina') {
      state.orders.forEach(function (o) {
        if (seen.indexOf(o.id) === -1 && o.status === 'nuevo') announce('Nuevo pedido n.º ' + o.num + ', ' + o.table);
      });
    }
    refresh();
  });

  setInterval(tick, 1000);
  if (!location.hash) history.replaceState(null, '', '#/mesero');
  render();
})();
