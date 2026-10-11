/* Interfaz de inscripciones. Los datos se guardan en localStorage y se sincronizan
   entre pestañas con el evento "storage": inscríbete en una pestaña y registra la
   entrada en otra. No hay servidor. */
(function () {
  'use strict';

  var J = window.JSC;
  var D = window.JSC_DATA;
  var KEY = 'jsc-demo-v1';
  var CURRENT_KEY = 'jsc-demo-current-v1';
  var ROUTES = ['inscripcion', 'asistente', 'puerta', 'organizador'];
  var TITLES = { inscripcion: 'Inscripción', asistente: 'Mi acceso', puerta: 'Puerta', organizador: 'Organizador' };

  var app = document.getElementById('app');
  var dlg = document.getElementById('dlg');
  var live = document.getElementById('live');
  var countBadge = document.getElementById('badge-count');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');


  /* Demo: al abrir o refrescar con una sola pestaña, todo empieza de cero. Si hay otra pestaña
     abierta se conserva, para poder probar las vistas juntas (por ejemplo mesero y cocina). */
  (function freshStart() {
    var ALIVE = 'jsc-demo-alive-v1';
    var ID = Math.random().toString(36).slice(2);
    var TTL = 3000;
    function read() { try { return JSON.parse(localStorage.getItem(ALIVE)) || {}; } catch (e) { return {}; } }
    function write(m) { try { localStorage.setItem(ALIVE, JSON.stringify(m)); } catch (e) { /* ok */ } }
    var t = Date.now();
    var m = read();
    var others = Object.keys(m).filter(function (k) { return t - m[k] < TTL; });
    try {
      if (!others.length) localStorage.removeItem(KEY);
      sessionStorage.removeItem(CURRENT_KEY);
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
  var route = 'inscripcion';
  var currentCode = readCurrent();
  var doorSession = D.SESSIONS[0].id;
  var lastResult = null;
  var filterQ = '';
  var filterS = '';
  var rosterQ = '';
  var camera = { stream: null, raf: 0, last: '', lastAt: 0 };

  /* ---------- Almacenamiento ---------- */

  function load() {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && Array.isArray(raw.regs) && typeof raw.seq === 'number') return raw;
    } catch (e) { /* almacenamiento bloqueado o JSON dañado */ }
    return J.emptyState();
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* se queda en memoria */ }
  }

  function readCurrent() {
    try { return sessionStorage.getItem(CURRENT_KEY) || null; } catch (e) { return null; }
  }

  function writeCurrent(code) {
    currentCode = code;
    try {
      if (code) sessionStorage.setItem(CURRENT_KEY, code); else sessionStorage.removeItem(CURRENT_KEY);
    } catch (e) { /* ok */ }
  }

  /* Siempre se parte del estado más reciente: otra pestaña pudo agotar un cupo. */
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

  function randomUnit() {
    if (window.crypto && window.crypto.getRandomValues) {
      var a = new Uint32Array(1);
      window.crypto.getRandomValues(a);
      return a[0] / 4294967296;
    }
    return Math.random();
  }

  function seatsText(n) {
    return n === 0 ? 'Agotado' : n === 1 ? 'Queda 1 cupo' : 'Quedan ' + n + ' cupos';
  }

  /* ---------- QR ---------- */

  function qrModel(text) {
    var qr = window.qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    return qr;
  }

  function qrSVG(text) {
    var qr = qrModel(text);
    var n = qr.getModuleCount();
    var m = 2;
    var size = n + m * 2;
    var d = '';
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) if (qr.isDark(r, c)) d += 'M' + (c + m) + ' ' + (r + m) + 'h1v1h-1z';
    }
    return '<svg viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="Código QR de la credencial ' + esc(text) + '" shape-rendering="crispEdges">' +
      '<rect width="' + size + '" height="' + size + '" fill="#fff"></rect><path d="' + d + '" fill="#0e1330"></path></svg>';
  }

  function downloadQR(text) {
    var qr = qrModel(text);
    var n = qr.getModuleCount();
    var scale = 12;
    var m = 3;
    var canvas = document.createElement('canvas');
    canvas.width = canvas.height = (n + m * 2) * scale;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0e1330';
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect((c + m) * scale, (r + m) * scale, scale, scale);
    }
    canvas.toBlob(function (blob) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'qr-' + text + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    }, 'image/png');
  }

  /* ---------- Enrutado ---------- */

  function currentRoute() {
    var r = location.hash.replace(/^#\/?/, '');
    return ROUTES.indexOf(r) === -1 ? 'inscripcion' : r;
  }

  function render() {
    stopCamera();
    route = currentRoute();
    document.body.setAttribute('data-view', route);
    document.title = TITLES[route] + ' | Inscripciones | Yosef Puetate';
    $$('.roles a').forEach(function (a) {
      if (a.dataset.route === route) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    if (route === 'inscripcion') app.innerHTML = viewInscripcion();
    else if (route === 'asistente') app.innerHTML = viewAsistente();
    else if (route === 'puerta') app.innerHTML = viewPuerta();
    else app.innerHTML = viewOrganizador();

    if (route === 'inscripcion') updatePreview();
    if (route === 'puerta') updateDoor();
    if (route === 'organizador') updateList();
    updateNav();
  }

  function updateNav() {
    var n = state.regs.length;
    countBadge.hidden = n === 0;
    countBadge.textContent = n;
    countBadge.setAttribute('aria-label', n + (n === 1 ? ' inscrito' : ' inscritos'));
  }

  /* ---------- Inscripción ---------- */

  function sessionRow(s, checked) {
    var left = J.seatsLeft(state, s.id);
    var full = left === 0;
    return '<label class="sess' + (full ? ' is-full' : '') + '" data-sess="' + s.id + '">' +
      '<input type="checkbox" name="sessions" value="' + s.id + '"' + (full ? ' disabled' : '') + (checked ? ' checked' : '') + ' />' +
      '<span class="sess-text"><span class="sess-when">' + esc(s.day) + ', ' + s.time + '</span><span class="sess-title">' + esc(s.title) + '</span></span>' +
      '<span class="sess-left' + (left > 0 && left <= 10 ? ' low' : '') + '" data-left>' + seatsText(left) + '</span>' +
    '</label>';
  }

  function formHTML() {
    return '<form id="reg-form" class="form" novalidate aria-labelledby="f-title">' +
      '<h2 id="f-title">Reserva tu lugar</h2>' +
      '<div class="field"><label for="f-name">Nombre y apellido</label>' +
        '<input id="f-name" name="name" type="text" autocomplete="name" maxlength="80" aria-describedby="err-name" />' +
        '<p class="err" id="err-name" role="alert"></p></div>' +
      '<div class="field"><label for="f-email">Correo</label>' +
        '<input id="f-email" name="email" type="email" autocomplete="email" aria-describedby="err-email" />' +
        '<p class="err" id="err-email" role="alert"></p></div>' +
      '<div class="field"><label for="f-org">Organización <span class="opt">(opcional)</span></label>' +
        '<input id="f-org" name="org" type="text" autocomplete="organization" maxlength="60" aria-describedby="err-org" />' +
        '<p class="err" id="err-org" role="alert"></p></div>' +
      '<fieldset class="sessions" aria-describedby="err-sessions"><legend>Sesiones a las que asistirás</legend>' +
        '<div id="sess-list">' + D.SESSIONS.map(function (s) { return sessionRow(s, false); }).join('') + '</div>' +
        '<p class="err" id="err-sessions" role="alert"></p></fieldset>' +
      '<button type="submit" class="btn btn--big">Inscribirme</button>' +
    '</form>';
  }

  /* Va fuera de la columna del formulario: en móvil queda después de la credencial. */
  function lookupHTML() {
    return '<form id="lookup" class="lookup" novalidate aria-labelledby="l-title">' +
      '<h2 id="l-title">¿Ya te inscribiste?</h2>' +
      '<div class="field"><label for="l-code">Tu código</label>' +
        '<div class="row"><input id="l-code" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="JSC-AB3K7" aria-describedby="err-lookup" />' +
        '<button type="submit" class="btn btn--ghost">Ver mi credencial</button></div>' +
        '<p class="err" id="err-lookup" role="alert"></p></div>' +
    '</form>';
  }

  function countText(n) { return n + (n === 1 ? ' sesión' : ' sesiones'); }

  function doneHTML(reg) {
    var first = reg.name.split(' ')[0];
    return '<section class="done" aria-labelledby="d-title">' +
      '<h2 id="d-title" tabindex="-1">Listo, ' + esc(first) + '. Tu inscripción está confirmada.</h2>' +
      '<p>Tu código es <strong class="mono">' + esc(reg.code) + '</strong>. Tienes acceso a ' + countText(reg.sessions.length) + '. En cada puerta muestras el código o el QR. En un sitio real, también llegaría a tu correo.</p>' +
      '<div class="actions">' +
        '<a class="btn" href="#/asistente">Ver mi agenda</a>' +
        '<button type="button" class="btn btn--ghost" data-act="print">Imprimir credencial</button>' +
        '<button type="button" class="btn btn--ghost" data-act="qr">Descargar QR</button>' +
        '<button type="button" class="btn btn--ghost" data-act="new">Inscribir a otra persona</button>' +
      '</div>' +
    '</section>';
  }

  function badgeHTML(reg) {
    return '<aside class="reg-badge" aria-label="Tu credencial">' +
      '<article class="badge-card' + (reg ? ' is-ready' : '') + '" id="badge">' +
        '<span class="hole" aria-hidden="true"></span>' +
        '<div class="b-band"><p class="b-event">' + esc(D.EVENT.name) + '</p><p class="b-ed">' + D.EVENT.edition + '</p></div>' +
        '<div class="b-body">' +
          '<p class="b-role">Asistente</p>' +
          '<p class="b-name" id="b-name">' + (reg ? esc(reg.name) : 'Tu nombre') + '</p>' +
          '<p class="b-org" id="b-org">' + (reg ? esc(reg.org) : '') + '</p>' +
          '<p class="b-sessions" id="b-sessions">' + sessionSummary(reg ? reg.sessions.length : 0) + '</p>' +
          '<div class="b-qr' + (reg ? '' : ' is-empty') + '" id="b-qr">' + (reg ? qrSVG(reg.code) : '<p>El QR aparece cuando te inscribas</p>') + '</div>' +
          '<p class="b-code" id="b-code">' + (reg ? esc(reg.code) : D.EVENT.codePrefix + '?????') + '</p>' +
        '</div>' +
      '</article>' +
    '</aside>';
  }

  function sessionSummary(n) {
    return n ? 'Acceso a ' + countText(n) : 'Elige tus sesiones';
  }

  function viewInscripcion() {
    var reg = currentCode ? J.findByCode(state, currentCode) : null;
    if (!reg && currentCode) writeCurrent(null);
    return '<div class="reg">' +
      '<section class="reg-main" aria-labelledby="h1">' +
        '<h1 id="h1" class="poster">' + esc(D.EVENT.name) + '</h1>' +
        '<p class="when">' + esc(D.EVENT.dates) + ' de ' + D.EVENT.edition + '. ' + esc(D.EVENT.place) + '.</p>' +
        (reg ? doneHTML(reg) : formHTML()) +
      '</section>' +
      badgeHTML(reg) +
      (reg ? '' : lookupHTML()) +
    '</div>';
  }

  /* La credencial se llena mientras se escribe: no vuelve a dibujar el formulario. */
  function updatePreview() {
    var form = $('#reg-form');
    if (!form) return;
    $('#b-name').textContent = form.elements.name.value.trim() || 'Tu nombre';
    $('#b-org').textContent = form.elements.org.value.trim();
    var ids = $$('input[name="sessions"]:checked', form).map(function (i) { return i.value; });
    $('#b-sessions').textContent = sessionSummary(ids.length);
  }

  function updateSeats() {
    $$('[data-sess]').forEach(function (row) {
      var id = row.dataset.sess;
      var left = J.seatsLeft(state, id);
      var input = $('input', row);
      var tag = $('[data-left]', row);
      tag.textContent = seatsText(left);
      tag.classList.toggle('low', left > 0 && left <= 10);
      row.classList.toggle('is-full', left === 0);
      if (left === 0 && !input.checked) input.disabled = true;
      else input.disabled = false;
    });
  }

  function clearErrors() {
    $$('.err', $('#reg-form')).forEach(function (p) { p.textContent = ''; });
    $$('[aria-invalid]', $('#reg-form')).forEach(function (el) { el.removeAttribute('aria-invalid'); });
  }

  function showErrors(errors) {
    var first = null;
    ['name', 'email', 'org', 'sessions'].forEach(function (key) {
      if (!errors[key]) return;
      $('#err-' + key).textContent = errors[key];
      var field = key === 'sessions' ? $('#sess-list input:not(:disabled)') : $('#f-' + key);
      if (key !== 'sessions' && field) field.setAttribute('aria-invalid', 'true');
      if (!first) first = field;
    });
    if (first) first.focus();
    announce('El formulario tiene errores. ' + Object.keys(errors).map(function (k) { return errors[k]; }).join(' '));
  }

  function submitRegistration(form) {
    clearErrors();
    var input = {
      name: form.elements.name.value,
      email: form.elements.email.value,
      org: form.elements.org.value,
      sessions: $$('input[name="sessions"]:checked', form).map(function (i) { return i.value; })
    };
    var reg;
    try {
      reg = mutate(function (s) { return J.register(s, input, Date.now(), randomUnit); });
    } catch (err) {
      if (err.errors) { updateSeats(); showErrors(err.errors); return; }
      throw err;
    }
    writeCurrent(reg.code);
    render();
    var card = $('#badge');
    if (card && !reduceMotion.matches) {
      card.classList.add('is-new');
      card.addEventListener('animationend', function () { card.classList.remove('is-new'); }, { once: true });
    }
    var title = $('#d-title');
    if (title) title.focus();
    announce('Inscripción lista. Tu código es ' + reg.code);
  }

  function lookupBadge(form) {
    var err = $('#err-lookup');
    var input = $('#l-code');
    err.textContent = '';
    input.removeAttribute('aria-invalid');
    state = load();
    var reg = J.findByCode(state, input.value);
    if (!reg) {
      err.textContent = 'No encontramos ese código. Debe tener la forma ' + D.EVENT.codePrefix + 'AB3K7.';
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      return;
    }
    writeCurrent(reg.code);
    render();
    var title = $('#d-title');
    if (title) title.focus();
  }

  /* ---------- Agenda de una persona (la ven la puerta y el asistente) ---------- */

  /* opts.here: sesión de la puerta actual; opts.me: redacta en segunda persona. */
  function agendaHTML(reg, opts) {
    var att = J.attendance(reg);
    var me = !!opts.me;
    var pct = att.total ? Math.round((att.attended / att.total) * 100) : 0;
    var verdict = att.complete
      ? '<p class="cert is-ok">' + (me ? 'Asistencia completa. Ya cumples para el certificado.' : 'Asistencia completa. Cumple para el certificado.') + '</p>'
      : '<p class="cert">' + (att.missing === 1 ? 'Falta 1 sesión' : 'Faltan ' + att.missing + ' sesiones') + ' para el certificado de asistencia.</p>';
    return '<section class="agenda" aria-label="' + (me ? 'Tu agenda' : 'Sesiones de ' + esc(reg.name)) + '">' +
      '<p class="ag-count"><strong>' + att.attended + ' de ' + att.total + '</strong> ' + (me ? 'sesiones a las que ya asististe' : 'sesiones con entrada registrada') + '</p>' +
      '<div class="meter" style="--w:' + pct + '%"><span></span></div>' +
      verdict +
      '<ol class="ag-list">' + att.items.map(function (x) {
        var s = x.session;
        var here = opts.here === s.id;
        var state = x.attended
          ? '<span class="ag-state"><svg class="ag-check" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><circle cx="10" cy="10" r="10"/><path d="M5.5 10.5l3 3 6-6.5"/></svg>' + (me ? 'Asististe' : 'Entró') + ' a las ' + hhmm(x.at) + '</span>'
          : '<span class="ag-state">' + (me ? 'Aún no asistes' : 'Pendiente') + '</span>';
        return '<li class="ag' + (x.attended ? ' is-done' : '') + (here ? ' is-here' : '') + '">' +
          '<span class="ag-when"><span class="ag-day">' + esc(s.day) + '</span><span class="ag-time">' + s.time + '</span></span>' +
          '<span class="ag-main"><span class="ag-title">' + esc(s.title) + '</span>' +
          '<span class="ag-place">' + esc(s.place) + (here ? '. Esta puerta' : '') + '</span></span>' +
          state + '</li>';
      }).join('') + '</ol></section>';
  }

  /* ---------- Mi acceso (vista del asistente) ---------- */

  function viewAsistente() {
    var reg = currentCode ? J.findByCode(state, currentCode) : null;
    if (!reg && currentCode) writeCurrent(null);
    var head = '<div class="page-head"><h1>Mi acceso</h1>' +
      '<p class="lede">Así ve el asistente su evento: dónde y cuándo es cada sesión, a cuáles ya entró y cuáles le faltan.</p></div>';
    if (!reg) {
      return '<div class="mine">' + head +
        '<form id="a-form" class="lookup lookup--solo" novalidate aria-labelledby="a-title">' +
          '<h2 id="a-title">Escribe tu código</h2>' +
          '<div class="field"><label for="a-code">Tu código</label>' +
            '<div class="row"><input id="a-code" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="' + D.EVENT.codePrefix + 'AB3K7" aria-describedby="err-a" />' +
            '<button type="submit" class="btn">Ver mi agenda</button></div>' +
            '<p class="err" id="err-a" role="alert"></p></div>' +
          '<p class="muted">¿Aún no tienes código? <a href="#/inscripcion">Inscríbete</a>' + (state.regs.length ? '' : ' o carga inscritos de ejemplo en la vista Organizador') + '.</p>' +
        '</form></div>';
    }
    return '<div class="mine">' + head +
      '<div class="mine-grid">' +
        '<section class="mine-id" aria-label="Tu credencial">' +
          '<p class="b-role">Asistente</p>' +
          '<h2 id="m-name">' + esc(reg.name) + '</h2>' +
          (reg.org ? '<p class="muted">' + esc(reg.org) + '</p>' : '') +
          '<div class="mine-qr" id="m-qr">' + qrSVG(reg.code) + '</div>' +
          '<p class="b-code" id="m-code">' + esc(reg.code) + '</p>' +
          '<p class="muted">' + esc(D.EVENT.place) + '. ' + esc(D.EVENT.dates) + '.</p>' +
          '<button type="button" class="btn btn--ghost" data-act="other">Ver otro código</button>' +
        '</section>' +
        '<div id="m-agenda">' + agendaHTML(reg, { me: true }) + '</div>' +
      '</div></div>';
  }

  function lookupAgenda() {
    var input = $('#a-code');
    var err = $('#err-a');
    err.textContent = '';
    input.removeAttribute('aria-invalid');
    state = load();
    var reg = J.findByCode(state, input.value);
    if (!reg) {
      err.textContent = 'No encontramos ese código. Debe tener la forma ' + D.EVENT.codePrefix + 'AB3K7.';
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      return;
    }
    writeCurrent(reg.code);
    render();
    var h = $('#m-name');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus(); }
  }

  /* ---------- Puerta ---------- */

  function viewPuerta() {
    return '<div class="puerta">' +
      '<div class="page-head"><h1>Puerta</h1>' +
        '<p class="lede">Registra la entrada con el código de la credencial o con la cámara. Cada puerta es una sesión: elige la tuya y verás todo lo que tiene la persona.</p></div>' +
      '<div class="door-grid">' +
        '<section class="door-tools" aria-label="Registrar entrada">' +
          '<div class="field"><label for="door-session">Sesión</label>' +
            '<select id="door-session">' + D.SESSIONS.map(function (s) {
              return '<option value="' + s.id + '"' + (s.id === doorSession ? ' selected' : '') + '>' + esc(s.day) + ', ' + s.time + '. ' + esc(s.title) + ' (' + esc(s.place) + ')</option>';
            }).join('') + '</select></div>' +
          '<form id="door-form" class="door-form" novalidate>' +
            '<div class="field"><label for="door-code">Código</label>' +
              '<div class="row"><input id="door-code" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="' + D.EVENT.codePrefix + 'AB3K7" />' +
              '<button type="submit" class="btn">Registrar entrada</button></div></div>' +
          '</form>' +
          '<button type="button" class="btn btn--ghost" id="cam-toggle" data-act="cam">Usar cámara</button>' +
          '<div class="cam" id="cam" hidden><video id="cam-video" playsinline muted></video><p id="cam-status" class="muted" role="status"></p></div>' +
          '<h2>Inscritos en esta sesión</h2>' +
          '<div class="field"><label for="roster-q">Buscar por nombre, organización o código</label><input id="roster-q" type="search" autocomplete="off" value="' + esc(rosterQ) + '" /></div>' +
          '<p class="muted" id="roster-count" role="status"></p>' +
          '<ul class="roster" id="roster"></ul>' +
        '</section>' +
        '<section class="door-side" aria-label="Resultado">' +
          '<div id="door-result" aria-live="polite"></div>' +
          '<div id="door-access"></div>' +
          '<div class="door-count"><p id="door-count-text"><strong id="door-count"></strong> inscritos han ingresado a esta sesión.</p><div class="meter" id="door-meter"><span></span></div></div>' +
          '<h2>Últimas entradas</h2><ol class="recent" id="recent"></ol>' +
        '</section>' +
      '</div>' +
    '</div>';
  }

  function resultHTML(r) {
    if (!r) return '<p class="result-idle">Esperando un código. Escríbelo o abre la cámara.</p>';
    if (r.status === 'ok') {
      return '<div class="result result--ok"><p class="r-title">Entrada registrada</p><p class="r-name">' + esc(r.reg.name) + '</p>' +
        '<p>' + (r.reg.org ? esc(r.reg.org) + '. ' : '') + 'Hora de ingreso: ' + hhmm(r.at) + '</p></div>';
    }
    if (r.status === 'duplicate') {
      return '<div class="result result--warn"><p class="r-title">Ya había ingresado</p><p class="r-name">' + esc(r.reg.name) + '</p>' +
        '<p>Hora de su primer ingreso: ' + hhmm(r.at) + '</p></div>';
    }
    if (r.status === 'not-registered') {
      return '<div class="result result--bad"><p class="r-title">No está inscrito en esta sesión</p><p class="r-name">' + esc(r.reg.name) + '</p>' +
        '<p>Abajo ves las sesiones a las que sí tiene acceso.</p></div>';
    }
    return '<div class="result result--bad"><p class="r-title">Código no encontrado</p>' +
      '<p>Revisa «' + esc(r.code) + '». Debe tener la forma ' + D.EVENT.codePrefix + 'AB3K7.</p></div>';
  }

  function updateDoor() {
    var box = $('#door-result');
    if (!box) return;
    box.innerHTML = resultHTML(lastResult);
    var person = lastResult && lastResult.code ? J.findByCode(state, lastResult.code) : null;
    $('#door-access').innerHTML = person ? agendaHTML(person, { here: doorSession }) : '';
    var taken = J.taken(state, doorSession);
    var arrived = J.arrived(state, doorSession);
    if (taken) {
      $('#door-count-text').innerHTML = '<strong id="door-count">' + arrived + ' de ' + taken + '</strong> inscritos han ingresado a esta sesión.';
    } else {
      $('#door-count-text').textContent = 'Nadie se ha inscrito en esta sesión todavía.';
    }
    $('#door-meter').hidden = !taken;
    $('#door-meter').style.setProperty('--w', (taken ? Math.round((arrived / taken) * 100) : 0) + '%');

    var rows = [];
    state.regs.forEach(function (r) {
      if (r.checkins[doorSession]) rows.push({ name: r.name, at: r.checkins[doorSession], code: r.code });
    });
    rows.sort(function (a, b) { return b.at - a.at; });
    $('#recent').innerHTML = rows.length
      ? rows.slice(0, 8).map(function (x) {
          return '<li><span>' + esc(x.name) + '</span><span class="mono">' + esc(x.code) + '</span><span>' + hhmm(x.at) + '</span></li>';
        }).join('')
      : '<li class="muted">Todavía no hay entradas en esta sesión.</li>';
    updateRoster();
  }

  function updateRoster() {
    var box = $('#roster');
    if (!box) return;
    var list = J.filterRegs(state, rosterQ, doorSession).sort(function (a, b) {
      var ea = a.checkins[doorSession] ? 1 : 0;
      var eb = b.checkins[doorSession] ? 1 : 0;
      return ea - eb || a.name.localeCompare(b.name, 'es');
    });
    var total = J.taken(state, doorSession);
    $('#roster-count').textContent = total
      ? (list.length === total ? total + ' inscritos' : list.length + ' de ' + total + ' inscritos coinciden') + (list.length > 60 ? '. Se muestran 60.' : '')
      : 'Nadie se ha inscrito en esta sesión todavía.';
    box.innerHTML = list.slice(0, 60).map(function (r) {
      var at = r.checkins[doorSession];
      return '<li class="' + (at ? 'is-in' : '') + '">' +
        '<span class="ro-who"><span class="ro-name">' + esc(r.name) + '</span><span class="mono ro-code">' + esc(r.code) + '</span></span>' +
        '<span class="ro-state">' + (at ? 'Entró ' + hhmm(at) : 'Pendiente') + '</span>' +
        '<button type="button" class="btn btn--ghost btn--sm" data-act="roster-open" data-code="' + esc(r.code) + '" aria-label="' + (at ? 'Ver ' : 'Registrar entrada de ') + esc(r.name) + '">' + (at ? 'Ver' : 'Registrar') + '</button>' +
      '</li>';
    }).join('');
  }

  function processCode(raw) {
    var r = mutate(function (s) { return J.checkIn(s, raw, doorSession, Date.now()); });
    r.code = J.normalizeCode(raw);
    lastResult = r;
    updateDoor();
    updateNav();
    var msg = {
      ok: 'Entrada registrada: ' + (r.reg && r.reg.name),
      duplicate: 'Ya había ingresado: ' + (r.reg && r.reg.name),
      'not-registered': 'No está inscrito en esta sesión: ' + (r.reg && r.reg.name),
      unknown: 'Código no encontrado'
    }[r.status];
    announce(msg);
  }

  function camStatus(text) {
    var el = $('#cam-status');
    if (el) el.textContent = text;
  }

  function startCamera() {
    var wrap = $('#cam');
    wrap.hidden = false;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      camStatus('Este navegador no permite usar la cámara. Escribe el código a mano.');
      return;
    }
    camStatus('Abriendo la cámara…');
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }).then(function (stream) {
      if (route !== 'puerta') { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
      camera.stream = stream;
      var video = $('#cam-video');
      video.srcObject = stream;
      var played = video.play();
      if (played && played.catch) played.catch(function () {});
      $('#cam-toggle').textContent = 'Cerrar cámara';
      camStatus('Busca un código QR. Acerca la credencial a la cámara.');
      scanLoop(video);
    }).catch(function () {
      camStatus('No se pudo abrir la cámara. Revisa el permiso del navegador o escribe el código a mano.');
    });
  }

  function stopCamera() {
    if (camera.raf) cancelAnimationFrame(camera.raf);
    camera.raf = 0;
    if (camera.stream) camera.stream.getTracks().forEach(function (t) { t.stop(); });
    camera.stream = null;
    var wrap = $('#cam');
    if (wrap) wrap.hidden = true;
    var btn = $('#cam-toggle');
    if (btn) btn.textContent = 'Usar cámara';
  }

  function scanLoop(video) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    var lastScan = 0;
    function step(now) {
      if (!camera.stream) return;
      if (video.readyState >= 2 && video.videoWidth && now - lastScan > 160) {
        lastScan = now;
        var scale = Math.min(1, 480 / video.videoWidth);
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        var img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        var hit = window.jsQR(img.data, canvas.width, canvas.height, { inversionAttempts: 'dontInvert' });
        if (hit && hit.data) {
          var code = J.normalizeCode(hit.data);
          if (code !== camera.last || Date.now() - camera.lastAt > 3000) {
            camera.last = code;
            camera.lastAt = Date.now();
            processCode(code);
          }
        }
      }
      camera.raf = requestAnimationFrame(step);
    }
    camera.raf = requestAnimationFrame(step);
  }

  /* ---------- Organizador ---------- */

  function viewOrganizador() {
    var s = J.stats(state);
    var sessionRows = s.perSession.map(function (x) {
      var pct = Math.round((x.taken / x.cap) * 100);
      var full = x.taken >= x.cap;
      return '<tr><th scope="row">' + esc(x.title) + '</th>' +
        '<td><div class="meter' + (full ? ' is-full' : '') + '" style="--w:' + pct + '%"><span></span></div></td>' +
        '<td class="num">' + x.taken + ' de ' + x.cap + (full ? '<span class="full-tag">Llena</span>' : '') + '</td>' +
        '<td class="num">' + x.arrived + '</td></tr>';
    }).join('');

    var options = '<option value="">Todas las sesiones</option>' + D.SESSIONS.map(function (x) {
      return '<option value="' + x.id + '"' + (x.id === filterS ? ' selected' : '') + '>' + esc(x.title) + '</option>';
    }).join('');

    return '<div class="org">' +
      '<div class="page-head"><h1>Panel del organizador</h1>' +
        '<div class="head-actions">' +
          '<button type="button" class="btn btn--ghost" data-act="seed">Cargar inscritos de ejemplo</button>' +
          '<button type="button" class="btn btn--ghost" data-act="export"' + (s.total ? '' : ' disabled') + '>Exportar CSV</button>' +
        '</div></div>' +
      '<dl class="kpis">' +
        '<div><dt>Personas inscritas</dt><dd id="k-total">' + s.total + '</dd></div>' +
        '<div><dt>Cupos ocupados</dt><dd id="k-fill">' + Math.round(s.fill * 100) + ' %</dd></div>' +
        '<div><dt>Ya han ingresado a alguna sesión</dt><dd id="k-arrived">' + s.withArrival + '</dd></div>' +
        '<div><dt>Sesiones llenas</dt><dd id="k-full">' + s.perSession.filter(function (x) { return x.taken >= x.cap; }).length + '</dd></div>' +
      '</dl>' +
      '<section class="panel" aria-labelledby="t-sessions"><h2 id="t-sessions">Sesiones</h2>' +
        '<div class="table-wrap" tabindex="0" role="region" aria-label="Tabla de sesiones, se desplaza horizontalmente"><table>' +
          '<thead><tr><th scope="col">Sesión</th><th scope="col">Ocupación</th><th scope="col" class="num">Inscritos</th><th scope="col" class="num">Ingresaron</th></tr></thead>' +
          '<tbody>' + sessionRows + '</tbody></table></div></section>' +
      '<section class="panel" aria-labelledby="t-regs"><h2 id="t-regs">Inscritos</h2>' +
        '<div class="filters">' +
          '<div class="field"><label for="q">Buscar por nombre, correo, organización o código</label>' +
            '<input id="q" type="search" autocomplete="off" value="' + esc(filterQ) + '" /></div>' +
          '<div class="field"><label for="fs">Sesión</label><select id="fs">' + options + '</select></div>' +
        '</div>' +
        '<p class="muted" id="reg-count" role="status"></p>' +
        '<div class="table-wrap" tabindex="0" role="region" aria-label="Tabla de inscritos, se desplaza horizontalmente"><table>' +
          '<thead><tr><th scope="col">Código</th><th scope="col">Nombre</th><th scope="col">Organización</th><th scope="col">Inscrito</th><th scope="col" class="num">Ingresos</th></tr></thead>' +
          '<tbody id="reg-rows"></tbody></table></div></section>' +
    '</div>';
  }

  function updateList() {
    var body = $('#reg-rows');
    if (!body) return;
    var list = J.filterRegs(state, filterQ, filterS);
    var shown = list.slice(-100).reverse();
    body.innerHTML = shown.length
      ? shown.map(function (r) {
          return '<tr><th scope="row" class="mono">' + esc(r.code) + '</th><td>' + esc(r.name) + '</td><td>' + esc(r.org || 'Sin organización') + '</td>' +
            '<td>' + hhmm(r.createdAt) + '</td><td class="num">' + Object.keys(r.checkins).length + ' de ' + r.sessions.length + '</td></tr>';
        }).join('')
      : '<tr><td colspan="5" class="muted">' + (state.regs.length ? 'Nadie coincide con la búsqueda.' : 'Todavía no hay inscritos. Inscribe a alguien o carga los de ejemplo.') + '</td></tr>';
    $('#reg-count').textContent = list.length === state.regs.length
      ? list.length + (list.length === 1 ? ' inscrito' : ' inscritos') + (list.length > 100 ? '. Se muestran los últimos 100.' : '')
      : list.length + ' de ' + state.regs.length + ' inscritos coinciden.';
  }

  /* ---------- Diálogos ---------- */

  function exportCSV() {
    var list = J.filterRegs(state, filterQ, filterS);
    var blob = new Blob(['﻿' + J.toCSV(list)], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'inscritos-jornadas-chimborazo.csv';
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
    if (act === 'print') window.print();
    else if (act === 'qr' && currentCode) downloadQR(currentCode);
    else if (act === 'new') { writeCurrent(null); render(); var n = $('#f-name'); if (n) n.focus(); }
    else if (act === 'other') { writeCurrent(null); render(); var ac = $('#a-code'); if (ac) ac.focus(); }
    else if (act === 'roster-open') processCode(btn.dataset.code);
    else if (act === 'cam') { if (camera.stream) stopCamera(); else startCamera(); }
    else if (act === 'seed') {
      mutate(function (s) { J.seed(s, Date.now()); });
      announce('Inscritos de ejemplo cargados');
      render();
    }
    else if (act === 'export') exportCSV();
  });

  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (form.id === 'reg-form') { e.preventDefault(); submitRegistration(form); }
    else if (form.id === 'lookup') { e.preventDefault(); lookupBadge(form); }
    else if (form.id === 'a-form') { e.preventDefault(); lookupAgenda(); }
    else if (form.id === 'door-form') {
      e.preventDefault();
      var input = $('#door-code');
      if (!input.value.trim()) { input.focus(); return; }
      processCode(input.value);
      input.value = '';
      input.focus();
    }
  });

  document.addEventListener('input', function (e) {
    var form = e.target.form;
    if (form && form.id === 'reg-form') updatePreview();
    if (e.target.id === 'roster-q') { rosterQ = e.target.value; updateRoster(); }
    if (e.target.id === 'q') { filterQ = e.target.value; updateList(); }
  });

  document.addEventListener('change', function (e) {
    var form = e.target.form;
    if (form && form.id === 'reg-form') updatePreview();
    if (e.target.id === 'door-session') { doorSession = e.target.value; lastResult = null; updateDoor(); }
    if (e.target.id === 'fs') { filterS = e.target.value; updateList(); }
  });

  window.addEventListener('hashchange', render);

  window.addEventListener('storage', function (e) {
    if (e.key !== KEY && e.key !== null) return;
    state = load();
    updateNav();
    if (route === 'inscripcion') {
      if ($('#sess-list')) updateSeats();
    } else if (route === 'asistente') {
      var reg = currentCode ? J.findByCode(state, currentCode) : null;
      var box = $('#m-agenda');
      if (reg && box) box.innerHTML = agendaHTML(reg, { me: true });
    } else if (route === 'puerta') updateDoor();
    else {
      var active = document.activeElement && document.activeElement.id;
      render();
      if (active === 'q') { var q = $('#q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
    }
  });

  if (!location.hash) history.replaceState(null, '', '#/inscripcion');
  render();
})();
