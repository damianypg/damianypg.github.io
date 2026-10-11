(function () {
  'use strict';
  var BOT = window.BOT, D = window.BOT_DATA, B = D.BUSINESS;
  var KEY = 'pch-bot-v1';
  var MAX_MSGS = 80;

  var log = document.getElementById('log');
  var chipsBox = document.getElementById('chips');
  var form = document.getElementById('form');
  var input = document.getElementById('msg');
  var thinkBody = document.getElementById('think-body');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

  var model = { S: BOT.create(), msgs: [], chips: [] };
  var busy = false;

  /* Con ?ahora=2026-10-10T14:30 se simula otra hora (en horario de Ecuador). */
  function now() {
    var p = new URLSearchParams(location.search).get('ahora');
    if (p) { var t = Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(p) ? p : p + '-05:00'); if (!isNaN(t)) return t; }
    return Date.now();
  }

  /* Demo: al abrir o refrescar la página la conversación empieza de cero. */
  function load() {
    try { localStorage.removeItem(KEY); } catch (e) { /* ok */ }
  }
  function save() {
    try {
      model.msgs = model.msgs.slice(-MAX_MSGS);
      localStorage.setItem(KEY, JSON.stringify(model));
    } catch (e) { /* ignorar */ }
  }

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  /* Texto → HTML seguro: escapa todo y solo permite **negrita** y listas con "- ". */
  function fmt(text) {
    var out = [], list = [];
    function flush() { if (list.length) { out.push('<ul>' + list.join('') + '</ul>'); list = []; } }
    String(text).split('\n').forEach(function (line) {
      var safe = esc(line).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      if (/^- /.test(line)) list.push('<li>' + safe.slice(2) + '</li>');
      else { flush(); if (line.trim()) out.push('<p>' + safe + '</p>'); }
    });
    flush();
    return out.join('');
  }

  function msgEl(m) {
    var el = document.createElement('div');
    el.className = 'msg ' + (m.who === 'me' ? 'msg--me' : 'msg--bot');
    el.innerHTML = '<span class="sr-only">' + (m.who === 'me' ? 'Tú:' : 'Rosita:') + '</span><div class="bubble">' + (m.who === 'me' ? '<p>' + esc(m.text) + '</p>' : fmt(m.text)) + '</div>';
    return el;
  }
  function scrollTo(el) {
    var tall = el.offsetHeight > log.clientHeight - 24;
    log.scrollTo ? log.scrollTo({ top: tall ? Math.max(0, el.offsetTop - 12) : log.scrollHeight, behavior: reduce ? 'auto' : 'smooth' }) : (log.scrollTop = log.scrollHeight);
  }
  function addMsg(m, animate) {
    var el = msgEl(m);
    if (!animate) el.style.animation = 'none';
    log.appendChild(el);
    scrollTo(el);
    return el;
  }
  function renderChips(list) {
    chipsBox.innerHTML = '';
    (list || []).forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = c;
      b.addEventListener('click', function () { send(c, true); });
      chipsBox.appendChild(b);
    });
  }

  function welcome() {
    var text = BOT.H.greeting(now()) + ' Soy **Rosita**, la asistente de ' + B.name + '. Puedo contarte de la carta, los horarios y ayudarte a reservar una mesa. Escribe como hablas: entiendo errores de ortografía. ¿Qué necesitas?';
    model.S.seen.saludo = 1;
    return { who: 'bot', text: text, chips: ['Ver la carta', '¿Están abiertos ahora?', 'Quiero reservar', '¿Qué me recomiendas?'] };
  }

  function typingEl() {
    var el = document.createElement('div');
    el.className = 'msg msg--bot typing';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<div class="bubble"><i></i><i></i><i></i></div>';
    return el;
  }

  function send(text, fromChip) {
    text = String(text || '').trim();
    if (!text || busy) return;
    busy = true;
    form.setAttribute('aria-busy', 'true');
    renderChips([]);
    model.msgs.push({ who: 'me', text: text });
    addMsg({ who: 'me', text: text }, true);
    input.value = '';
    var res = BOT.respond(model.S, text, { now: now() });
    renderThink(res.trace);
    var tp = typingEl();
    log.appendChild(tp);
    log.scrollTop = log.scrollHeight;

    var queue = res.messages.slice();
    (function next() {
      var m = queue.shift();
      var delay = reduce ? 80 : Math.min(900, 380 + m.text.length * 3);
      setTimeout(function () {
        tp.remove();
        model.msgs.push({ who: 'bot', text: m.text });
        var shown = addMsg({ who: 'bot', text: m.text }, true);
        if (queue.length) { log.appendChild(tp); next(); return; }
        model.chips = m.chips || [];
        renderChips(model.chips);
        scrollTo(shown);
        busy = false;
        form.removeAttribute('aria-busy');
        save();
        if (!coarse || !fromChip) input.focus({ preventScroll: true });
      }, delay);
    })();
    save();
  }

  /* ---------- Panel «Cómo piensa Rosita» ---------- */
  function renderThink(t) {
    if (!t) {
      thinkBody.innerHTML = '<p class="think-intro">Rosita no usa IA. Compara tu mensaje con las palabras clave de cada tema y responde el que suma más puntos.</p><p class="think-empty" style="margin-top:10px">Escribe algo y aquí verás qué palabras reconoció y qué temas compitieron.</p>';
      return;
    }
    var html = '<p class="think-intro">Rosita compara tu mensaje con las palabras clave de cada tema y responde el que suma más puntos.</p>';
    html += '<p class="think-label">Así lee tu mensaje</p><div class="tokens">' + t.tokens.map(function (k) {
      return '<span class="tok' + (k.hit ? ' hit' : '') + (k.ent ? ' ent' : '') + '">' + esc(k.raw) + '</span>';
    }).join('') + '</div><div class="legend"><span class="k-hit">Palabra clave</span><span class="k-ent">Plato reconocido</span></div>';

    if (t.flow) {
      var names = { people: 'Personas', date: 'Día', time: 'Hora', name: 'Nombre', phone: 'Celular' };
      var s = t.flow.slots;
      var vals = { people: s.people != null ? s.people : null, date: s.date ? BOT.dateLong(s.date) : null, time: s.time != null ? BOT.hhmm(s.time) : null, name: s.name || null, phone: s.phone || null };
      if (t.flow.type === 'reserva') {
        /* Si Rosita entendió un dato pero no lo pudo usar (un lunes, una hora fuera de horario), se muestra tachado. */
        var heard = {}, kinds = { people: 'Personas', date: 'Fecha', time: 'Hora' };
        t.entities.forEach(function (e) { heard[e.kind] = e.value; });
        html += '<p class="think-label">Reserva en curso</p><p class="note" style="margin:0 0 8px">Rosita usa tu mensaje para completar los datos que faltan.</p><ul class="slots">' + Object.keys(names).map(function (k) {
          var got = vals[k] != null, refused = !got && kinds[k] && heard[kinds[k]];
          return '<li><span>' + names[k] + '</span>' + (got ? '<span class="got">' + esc(vals[k]) + '</span>'
            : refused ? '<span class="miss"><s>' + esc(heard[kinds[k]]) + '</s> no disponible</span>'
            : '<span class="miss">falta</span>') + '</li>';
        }).join('') + '</ul>';
      }
    }

    if (t.ranked.length) {
      var max = Math.max.apply(null, t.ranked.map(function (r) { return r.score; })) || 1;
      var won = {}; t.chosen.forEach(function (c) { won[c.id] = true; });
      html += '<p class="think-label">Temas que compitieron</p><ol class="bars">' + t.ranked.map(function (r) {
        return '<li class="' + (won[r.id] ? 'win' : '') + '"><span class="name">' + esc(r.label) + (won[r.id] ? '<span class="sr-only"> (elegido)</span>' : '') + '</span><span class="score">' + r.score + ' pts</span><span class="track" aria-hidden="true"><span class="fill" data-w="' + Math.max(4, Math.round(r.score / max * 100)) + '"></span></span></li>';
      }).join('') + '</ol>';
    } else if (!t.flow) {
      html += '<p class="think-label">Temas que compitieron</p><p class="think-empty">Ninguno sumó puntos, así que Rosita te pide reformular.</p>';
    }

    if (t.entities.length) {
      html += '<p class="think-label">Datos que entendió</p><dl class="ents">' + t.entities.map(function (e) { return '<dt>' + esc(e.kind) + '</dt><dd>' + esc(e.value) + '</dd>'; }).join('') + '</dl>';
    }
    if (t.context) html += '<p class="note">Recuerda que venían hablando de: ' + esc(t.context) + '.</p>';
    thinkBody.innerHTML = html;
    var fills = thinkBody.querySelectorAll('.fill');
    requestAnimationFrame(function () { requestAnimationFrame(function () { Array.prototype.forEach.call(fills, function (f) { f.style.width = f.getAttribute('data-w') + '%'; }); }); });
  }

  /* ---------- Panel «Prueba preguntando» (una pestaña por tema) ---------- */
  function renderTry() {
    var tabs = document.getElementById('try-tabs');
    var box = document.getElementById('try-body');
    var cur = 0;
    function show(i, focus) {
      cur = i;
      Array.prototype.forEach.call(tabs.children, function (t, k) {
        t.setAttribute('aria-selected', k === i ? 'true' : 'false');
        t.tabIndex = k === i ? 0 : -1;
      });
      var g = D.SAMPLE_QUESTIONS[i];
      box.setAttribute('aria-labelledby', 'tab-' + i);
      box.innerHTML = '<ul>' + g.items.map(function (q) { return '<li><button type="button" class="q">' + esc(q) + '</button></li>'; }).join('') + '</ul>';
      if (focus) tabs.children[i].focus();
    }
    tabs.innerHTML = D.SAMPLE_QUESTIONS.map(function (g, i) {
      return '<button type="button" role="tab" class="tab" id="tab-' + i + '">' + esc(g.group) + '</button>';
    }).join('');
    tabs.addEventListener('click', function (e) {
      var t = e.target.closest('.tab'); if (t) show(Array.prototype.indexOf.call(tabs.children, t), false);
    });
    tabs.addEventListener('keydown', function (e) {
      var n = D.SAMPLE_QUESTIONS.length;
      if (e.key === 'ArrowRight') { e.preventDefault(); show((cur + 1) % n, true); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); show((cur + n - 1) % n, true); }
    });
    box.addEventListener('click', function (e) {
      var b = e.target.closest('.q'); if (b) send(b.textContent, true);
    });
    show(0, false);

    var labels = [], seen = {};
    BOT.INTENTS.forEach(function (it) {
      if (['afirmacion', 'negacion', 'plato', 'saludo', 'despedida', 'gracias', 'elogio', 'insulto', 'risa', 'fuera_de_tema', 'como_estas', 'hora_actual'].indexOf(it.id) !== -1) return;
      if (!seen[it.label]) { seen[it.label] = 1; labels.push(it.label); }
    });
    document.getElementById('topics-count').textContent = 'Temas que conoce (' + labels.length + ')';
    document.getElementById('topics-list').innerHTML = labels.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('');
  }

  /* ---------- La carta de hoy: cada plato le pregunta a Rosita ---------- */
  function money(c) { return '$' + (c / 100).toFixed(2); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function renderBoard() {
    var d = new Date(now() - 5 * 3600 * 1000); /* hora de Ecuador */
    var h = D.HOURS[d.getUTCDay()];
    var mins = d.getUTCHours() * 60 + d.getUTCMinutes();
    var st = document.getElementById('board-status');
    var open = h && mins >= h.open && mins < h.close;
    st.className = 'board-status ' + (open ? 'is-open' : 'is-closed');
    st.textContent = open ? 'Abierto ahora, hasta las ' + pad(Math.floor(h.close / 60)) + ':' + pad(h.close % 60) : 'Cerrado en este momento';
    document.getElementById('board-body').innerHTML = D.CATEGORIES.map(function (c) {
      return '<h3>' + esc(c.name) + '</h3><ul>' + D.MENU.filter(function (m) { return m.cat === c.id; }).map(function (m) {
        return '<li><button type="button" class="dish" data-name="' + esc(m.name) + '"><span class="dn">' + esc(m.name) + (m.star ? ' <span class="star"><span class="sr-only">Plato estrella</span><span aria-hidden="true">★</span></span>' : '') + '</span><span class="dp">' + money(m.price) + '</span></button></li>';
      }).join('') + '</ul>';
    }).join('');
    document.getElementById('board-body').addEventListener('click', function (e) {
      var b = e.target.closest('.dish');
      if (!b) return;
      send(b.getAttribute('data-name'), true);
      /* Si la pizarra está debajo del chat (móvil y tableta), vuelve al chat para ver la respuesta. */
      var chat = document.querySelector('.chat');
      if (chat.getBoundingClientRect().top < 0 || chat.getBoundingClientRect().bottom > window.innerHeight) {
        chat.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      }
    });
  }

  function start(fresh) {
    log.innerHTML = '';
    if (fresh || !model.msgs.length) {
      var keep = model.S.reservations || [];
      model = { S: BOT.create(), msgs: [], chips: [] };
      model.S.reservations = keep;
      var w = welcome();
      model.msgs.push({ who: 'bot', text: w.text });
      model.chips = w.chips;
    }
    model.msgs.forEach(function (m) { addMsg(m, false); });
    renderChips(model.chips);
    renderThink(null);
    log.scrollTop = log.scrollHeight;
    save();
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); send(input.value, false); });
  document.getElementById('reset').addEventListener('click', function () {
    busy = false; form.removeAttribute('aria-busy');
    start(true);
    input.focus({ preventScroll: true });
  });

  load();
  renderTry();
  renderBoard();
  start(false);
})();
