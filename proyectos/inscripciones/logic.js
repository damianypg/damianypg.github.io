/* Lógica de inscripciones sin DOM: se prueba con Node y se reutiliza en el navegador. */
(function (root) {
  var DATA = typeof module !== 'undefined' && module.exports ? require('./data.js') : root.JSC_DATA;
  var SESSIONS = DATA.SESSIONS;
  var PREFIX = DATA.EVENT.codePrefix;

  /* Sin 0, O, 1, I ni L para que nadie confunda un código al dictarlo. */
  var ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function emptyState() { return { regs: [], seq: 0 }; }

  function sessionById(id) {
    for (var i = 0; i < SESSIONS.length; i++) if (SESSIONS[i].id === id) return SESSIONS[i];
    return null;
  }

  function makeCode(rng) {
    var s = '';
    for (var i = 0; i < 5; i++) s += ALPHABET.charAt(Math.floor(rng() * ALPHABET.length));
    return PREFIX + s;
  }

  /* Acepta "ab3k7", "JSC-AB3K7" o con espacios; devuelve el formato canónico. */
  function normalizeCode(raw) {
    var c = String(raw == null ? '' : raw).toUpperCase().replace(/\s+/g, '');
    if (/^[A-Z0-9]{5}$/.test(c)) c = PREFIX + c;
    return c;
  }

  function clean(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }

  function taken(state, sessionId) {
    return state.regs.filter(function (r) { return r.sessions.indexOf(sessionId) !== -1; }).length;
  }

  function seatsLeft(state, sessionId) {
    return Math.max(0, sessionById(sessionId).cap - taken(state, sessionId));
  }

  function validate(input, state) {
    var errors = {};
    var name = clean(input.name);
    var email = clean(input.email).toLowerCase();
    var ids = Array.isArray(input.sessions) ? input.sessions : [];

    if (name.length < 3 || name.split(' ').length < 2) errors.name = 'Escribe tu nombre y apellido.';
    else if (name.length > 80) errors.name = 'El nombre es demasiado largo (máximo 80 letras).';

    if (!EMAIL.test(email)) errors.email = 'Escribe un correo válido, por ejemplo nombre@correo.com.';
    else if (state.regs.some(function (r) { return r.email === email; })) {
      errors.email = 'Este correo ya tiene una inscripción. Usa tu código para ver tu credencial.';
    }

    if (clean(input.org).length > 60) errors.org = 'Escribe como máximo 60 letras.';

    if (!ids.length) errors.sessions = 'Elige al menos una sesión.';
    else {
      for (var i = 0; i < ids.length; i++) {
        var s = sessionById(ids[i]);
        if (!s) { errors.sessions = 'Hay una sesión que no existe.'; break; }
        if (seatsLeft(state, s.id) === 0) { errors.sessions = 'La sesión «' + s.title + '» ya no tiene cupos. Quítala para continuar.'; break; }
      }
    }
    return errors;
  }

  function register(state, input, now, rng) {
    var errors = validate(input, state);
    if (Object.keys(errors).length) {
      var err = new Error('Datos inválidos');
      err.errors = errors;
      throw err;
    }
    var code;
    do { code = makeCode(rng || Math.random); } while (findByCode(state, code));
    state.seq += 1;
    var reg = {
      id: 'r' + state.seq,
      code: code,
      name: clean(input.name),
      email: clean(input.email).toLowerCase(),
      org: clean(input.org),
      sessions: SESSIONS.map(function (s) { return s.id; }).filter(function (id) { return input.sessions.indexOf(id) !== -1; }),
      createdAt: now,
      checkins: {}
    };
    state.regs.push(reg);
    return reg;
  }

  function findByCode(state, raw) {
    var code = normalizeCode(raw);
    for (var i = 0; i < state.regs.length; i++) if (state.regs[i].code === code) return state.regs[i];
    return null;
  }

  function checkIn(state, raw, sessionId, now) {
    var reg = findByCode(state, raw);
    if (!reg) return { status: 'unknown' };
    if (reg.sessions.indexOf(sessionId) === -1) return { status: 'not-registered', reg: reg };
    if (reg.checkins[sessionId]) return { status: 'duplicate', reg: reg, at: reg.checkins[sessionId] };
    reg.checkins[sessionId] = now;
    return { status: 'ok', reg: reg, at: now };
  }

  function arrived(state, sessionId) {
    return state.regs.filter(function (r) { return r.checkins[sessionId]; }).length;
  }

  /* Qué sesiones tiene una persona y a cuáles ya entró. Con esto se decide el certificado. */
  function attendance(reg) {
    var items = SESSIONS.filter(function (s) { return reg.sessions.indexOf(s.id) !== -1; }).map(function (s) {
      return { session: s, attended: !!reg.checkins[s.id], at: reg.checkins[s.id] || null };
    });
    var attended = items.filter(function (x) { return x.attended; }).length;
    return {
      items: items,
      total: items.length,
      attended: attended,
      missing: items.length - attended,
      complete: items.length > 0 && attended === items.length
    };
  }

  function stats(state) {
    var perSession = SESSIONS.map(function (s) {
      return { id: s.id, title: s.title, cap: s.cap, taken: taken(state, s.id), arrived: arrived(state, s.id) };
    });
    var seats = perSession.reduce(function (a, s) { return a + s.taken; }, 0);
    var capacity = perSession.reduce(function (a, s) { return a + s.cap; }, 0);
    return {
      total: state.regs.length,
      seats: seats,
      capacity: capacity,
      fill: capacity ? seats / capacity : 0,
      withArrival: state.regs.filter(function (r) { return Object.keys(r.checkins).length > 0; }).length,
      perSession: perSession
    };
  }

  function fold(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function filterRegs(state, query, sessionId) {
    var q = fold(clean(query));
    return state.regs.filter(function (r) {
      if (sessionId && r.sessions.indexOf(sessionId) === -1) return false;
      if (!q) return true;
      return fold(r.name + ' ' + r.email + ' ' + r.code + ' ' + r.org).indexOf(q) !== -1;
    });
  }

  /* Una celda que empieza con = + - @ se ejecutaría como fórmula en Excel: se neutraliza. */
  function csvCell(v) {
    var s = String(v == null ? '' : v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function toCSV(regs) {
    var head = ['codigo', 'nombre', 'correo', 'organizacion', 'sesiones', 'inscrito', 'ingresos'];
    var rows = regs.map(function (r) {
      return [
        r.code, r.name, r.email, r.org,
        r.sessions.map(function (id) { return sessionById(id).title; }).join(' + '),
        new Date(r.createdAt).toISOString(),
        Object.keys(r.checkins).length
      ].map(csvCell).join(',');
    });
    return [head.join(',')].concat(rows).join('\n');
  }

  /* Inscritos de ejemplo: deterministas, con una sesión llena y otra casi llena. */
  var FIRST = ['Camila', 'Mateo', 'Valentina', 'Santiago', 'Daniela', 'Sebastián', 'Paula', 'Andrés', 'Lucía', 'Diego', 'Mariana', 'Joel'];
  var LAST = ['Aguirre', 'Barrera', 'Cevallos', 'Dután', 'Espinoza', 'Freire'];
  var ORGS = ['Politécnica local', 'Universidad regional', 'Colegio técnico', 'Independiente', 'Empresa de software'];

  function seed(state, now) {
    var min = 60 * 1000;
    var s = 7;
    var rng = function () { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
    var rules = {
      s1: function () { return true; },
      s2: function (i) { return i < 40; },
      s3: function (i) { return i % 3 !== 0; },
      s4: function (i) { return i < 28; },
      s5: function (i) { return i % 2 === 0; },
      s6: function (i) { return i % 5 !== 0; }
    };
    for (var i = 0; i < 48; i++) {
      /* Los apellidos rotan junto con los nombres para que la lista no salga agrupada por apellido. */
      var last = LAST[(i + Math.floor(i / FIRST.length)) % LAST.length];
      var name = FIRST[i % FIRST.length] + ' ' + last;
      var email = (FIRST[i % FIRST.length] + '.' + last + (i + 1) + '@example.com')
        .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      if (state.regs.some(function (r) { return r.email === email; })) continue;
      var ids = SESSIONS.map(function (x) { return x.id; }).filter(function (id) {
        return rules[id](i) && seatsLeft(state, id) > 0;
      });
      if (!ids.length) continue;
      var reg = register(state, { name: name, email: email, org: ORGS[i % ORGS.length], sessions: ids }, now - (90 - i) * min, rng);
      if (reg.sessions.indexOf('s1') !== -1 && i < 14) reg.checkins.s1 = now - (30 - i) * min;
      /* Algunos ya pasaron por más puertas, para que la agenda tenga tachadas y pendientes. */
      if (i < 6 && reg.sessions.indexOf('s2') !== -1) reg.checkins.s2 = now - (20 - i) * min;
      if (i < 3 && reg.sessions.indexOf('s3') !== -1) reg.checkins.s3 = now - (10 - i) * min;
    }
    return state;
  }

  var api = {
    ALPHABET: ALPHABET, PREFIX: PREFIX,
    emptyState: emptyState, sessionById: sessionById, makeCode: makeCode, normalizeCode: normalizeCode,
    taken: taken, seatsLeft: seatsLeft, validate: validate, register: register, findByCode: findByCode,
    checkIn: checkIn, arrived: arrived, attendance: attendance, stats: stats, filterRegs: filterRegs, toCSV: toCSV, seed: seed
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.JSC = api;
})(typeof window !== 'undefined' ? window : globalThis);
