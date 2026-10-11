/* Motor de Rosita: entiende frases con errores de ortografía, recuerda de qué se hablaba,
   calcula cuentas y guía una reserva paso a paso. Sin DOM ni IA: se prueba con Node. */
(function (root) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var D = isNode ? require('./data.js') : root.BOT_DATA;
  var KB = isNode ? require('./kb.js') : root.BOT_KB;
  var B = D.BUSINESS;
  var MIN = 3;
  var MAX_DAYS_AHEAD = 30;

  /* ---------- Texto ---------- */
  function fold(s) { return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  var ABBR = { q: 'que', k: 'que', xq: 'porque', pq: 'porque', porq: 'porque', x: 'por', tb: 'tambien', tmb: 'tambien', tambn: 'tambien', info: 'informacion', dnd: 'donde', cmo: 'como', cm: 'como', hrs: 'horas', hr: 'hora', bn: 'bien', pls: 'por favor', plis: 'por favor', xfa: 'por favor', xfavor: 'por favor', ps: 'pues', pa: 'para', pk: 'porque', cuantos: 'cuantos', ke: 'que' };
  function words(norm) { return (norm.replace(/(.)\1{2,}/g, '$1').match(/[a-z0-9]+/g) || []).map(function (w) { return ABBR[w] || w; }); }
  function stem(w) {
    if (w.length <= 3) return w;
    if (/(ones|ores|ales|ares|eres)$/.test(w)) return w.slice(0, -2);
    if (w.charAt(w.length - 1) === 's' && w.charAt(w.length - 2) !== 's') return w.slice(0, -1);
    return w;
  }
  function near(a, b) {
    var la = a.length, lb = b.length;
    if (la < 6 || lb < 6 || Math.abs(la - lb) > 1) return false;
    var max = Math.max(la, lb) >= 9 ? 2 : 1;
    return osa(a, b, max) <= max;
  }
  function osa(a, b, max) {
    var la = a.length, lb = b.length, i, j, d = [];
    for (i = 0; i <= la; i++) { d[i] = [i]; }
    for (j = 1; j <= lb; j++) d[0][j] = j;
    for (i = 1; i <= la; i++) {
      var rowMin = Infinity;
      for (j = 1; j <= lb; j++) {
        var cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
        if (i > 1 && j > 1 && a.charAt(i - 1) === b.charAt(j - 2) && a.charAt(i - 2) === b.charAt(j - 1)) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        if (d[i][j] < rowMin) rowMin = d[i][j];
      }
      if (rowMin > max) return max + 1;
    }
    return d[la][lb];
  }

  /* ---------- Fechas, horas y dinero (zona horaria de Ecuador, UTC-5) ---------- */
  var DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var WD = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 };
  var MON = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
  var NUMW = { un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, veinte: 20 };
  var NUMRX = '(?:\\d{1,2}|un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|veinte)';

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(y, m, d) { return y + '-' + pad(m) + '-' + pad(d); }
  function toUTC(s) { var p = s.split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  function addDays(s, n) { var t = new Date(toUTC(s) + n * 86400000); return iso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()); }
  function dowOf(s) { return new Date(toUTC(s)).getUTCDay(); }
  function diffDays(a, b) { return Math.round((toUTC(a) - toUTC(b)) / 86400000); }
  function validDate(y, m, d) { var t = new Date(Date.UTC(y, m - 1, d)); return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d; }
  function ecuNow(ms) {
    var t = new Date(ms - 5 * 3600000);
    return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), dow: t.getUTCDay(), h: t.getUTCHours(), min: t.getUTCMinutes(), minutes: t.getUTCHours() * 60 + t.getUTCMinutes(), date: iso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()) };
  }
  function dateLong(s) { var p = s.split('-'); return DAYS[dowOf(s)] + ' ' + (+p[2]) + ' de ' + MONTHS[+p[1] - 1]; }
  function hhmm(min) { return pad(Math.floor(min / 60)) + ':' + pad(min % 60); }
  function money(c) { return '$' + (c / 100).toFixed(2); }
  function withIva(c) { return c + Math.round(c * B.iva); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function greeting(ms) { var h = ecuNow(ms).h; return h < 12 ? '¡Buenos días!' : h < 19 ? '¡Buenas tardes!' : '¡Buenas noches!'; }
  function hoursText(dow) { var h = D.HOURS[dow]; return h ? 'de ' + hhmm(h.open) + ' a ' + hhmm(h.close) : null; }

  function nextOpenDate(from, includeFrom) {
    for (var i = includeFrom ? 0 : 1; i < 9; i++) { var s = addDays(from, i); if (D.HOURS[dowOf(s)]) return s; }
    return null;
  }
  function openStatus(ms) {
    var e = ecuNow(ms), h = D.HOURS[e.dow];
    if (h && e.minutes >= h.open && e.minutes < h.close) {
      var left = h.close - e.minutes;
      return 'Sí, estamos **abiertos**. Hoy atendemos hasta las **' + hhmm(h.close) + '**.' + (left <= 45 ? ' Ojo: cerramos en ' + left + ' minutos.' : '');
    }
    if (h && e.minutes < h.open) return 'Todavía no abrimos. Hoy abrimos a las **' + hhmm(h.open) + '**.';
    var n = nextOpenDate(e.date, false), nd = dowOf(n), when = diffDays(n, e.date) === 1 ? 'mañana ' + DAYS[nd] : 'el ' + DAYS[nd];
    return 'Ahora estamos **cerrados**. Abrimos ' + when + ' a las **' + hhmm(D.HOURS[nd].open) + '**.';
  }
  function dayAnswer(ent, ms) {
    var e = ecuNow(ms), h = D.HOURS[ent.dow], label = ent.label;
    if (!h) {
      var n = nextOpenDate(ent.date || e.date, false);
      return 'Los **' + DAYS[ent.dow] + '** descansamos. El siguiente día que abrimos es el ' + DAYS[dowOf(n)] + ', ' + hoursText(dowOf(n)) + '.';
    }
    var base = cap(label) + ' atendemos **' + hoursText(ent.dow) + '**.';
    if (ent.date === e.date) return base + ' ' + openStatus(ms);
    return base;
  }

  function parseDate(norm, ec) {
    var m, d, date;
    if (/\bpasado manana\b/.test(norm)) { date = addDays(ec.date, 2); return { date: date, dow: dowOf(date), label: 'pasado mañana' }; }
    if (/\bmanana\b/.test(norm) && !/\b(?:de|en|por|a|la)\s+(?:la\s+)?manana\b/.test(norm)) { date = addDays(ec.date, 1); return { date: date, dow: dowOf(date), label: 'mañana' }; }
    if (/\b(hoy|esta noche|esta tarde|ahorita|mas tarde)\b/.test(norm)) return { date: ec.date, dow: ec.dow, label: 'hoy' };
    m = norm.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
    if (m) {
      var dd = +m[1], mm = +m[2], yy = m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : ec.y;
      if (validDate(yy, mm, dd)) { date = iso(yy, mm, dd); if (!m[3] && date < ec.date) { yy++; if (validDate(yy, mm, dd)) date = iso(yy, mm, dd); } return { date: date, dow: dowOf(date), label: dateLong(date) }; }
    }
    m = norm.match(/\b(\d{1,2}) de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?: de (\d{4}))?\b/);
    if (m) {
      var y2 = m[3] ? +m[3] : ec.y;
      if (validDate(y2, MON[m[2]], +m[1])) { date = iso(y2, MON[m[2]], +m[1]); if (!m[3] && date < ec.date && diffDays(ec.date, date) > 2) { if (validDate(y2 + 1, MON[m[2]], +m[1])) date = iso(y2 + 1, MON[m[2]], +m[1]); } return { date: date, dow: dowOf(date), label: dateLong(date) }; }
    }
    m = norm.match(/\b(?:(el|este|proximo|del|los|para el|para este|este proximo|el proximo)\s+)?(domingo|lunes|martes|miercoles|jueves|viernes|sabado)s?\b/);
    if (m) {
      var target = WD[m[2]], delta = (target - ec.dow + 7) % 7;
      if (delta === 0) delta = /\beste\b/.test(m[1] || '') ? 0 : 7;
      date = addDays(ec.date, delta);
      var plural = /\blos\s+(?:domingo|lunes|martes|miercoles|jueves|viernes|sabado)s\b/.test(norm) || /\b(domingo|lunes|martes|miercoles|jueves|viernes|sabado)s\b/.test(norm);
      return { date: date, dow: target, label: plural ? 'los ' + DAYS[target] + (/s$/.test(DAYS[target]) ? '' : 's') : (delta === 0 ? 'hoy' : 'el ' + DAYS[target]), weekday: true };
    }
    m = norm.match(/\bel (\d{1,2})\b(?!\s*(?:personas?|pm|am|:|h\b|de la|horas?|y media|y cuarto))/);
    if (m) {
      var day = +m[1], mo = ec.m, yr = ec.y;
      if (day >= 1 && day <= 31) {
        if (day < ec.d) { mo++; if (mo > 12) { mo = 1; yr++; } }
        if (validDate(yr, mo, day)) { date = iso(yr, mo, day); return { date: date, dow: dowOf(date), label: dateLong(date) }; }
      }
    }
    return null;
  }

  function finalizeTime(hh, mm, mer) {
    if (mer === 'pm' && hh < 12) hh += 12;
    else if (mer === 'am' && hh === 12) hh = 0;
    else if (!mer && hh >= 1 && hh <= 10) hh += 12;
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
    return hh * 60 + mm;
  }
  function merOf(s) { if (!s) return null; if (/^(pm|p m|de la tarde|de la noche)$/.test(s)) return 'pm'; if (/^(am|a m|de la manana|de la madrugada)$/.test(s)) return 'am'; return null; }
  function numOf(s) { return /^\d+$/.test(s) ? +s : NUMW[s]; }
  function parseTime(norm, standalone) {
    var m;
    if (/\b(mediodia|medio dia)\b/.test(norm)) return 12 * 60;
    m = norm.match(/\b(\d{1,2})\s*[:h]\s*(\d{2})\s*(am|pm|a m|p m)?(?!\d)/);
    if (m && +m[1] < 24) return finalizeTime(+m[1], +m[2], merOf(m[3]));
    m = norm.match(new RegExp('\\b(?:a )?(?:las? )?(' + NUMRX + ') (y media|y cuarto|menos cuarto|en punto)\\b'));
    if (m && numOf(m[1]) <= 12 && /(^|\s)(a las|las|a la)\s/.test(' ' + norm.slice(0, m.index + 12))) {
      var h1 = numOf(m[1]);
      if (m[2] === 'y media') return finalizeTime(h1, 30, merOf((norm.match(/\b(de la tarde|de la noche|de la manana|pm|am)\b/) || [])[1]));
      if (m[2] === 'y cuarto') return finalizeTime(h1, 15, null);
      if (m[2] === 'menos cuarto') return finalizeTime(h1 - 1, 45, null);
      return finalizeTime(h1, 0, null);
    }
    m = norm.match(/\b(\d{1,2})\s*(am|pm|a m|p m|de la manana|de la tarde|de la noche|de la madrugada)\b/);
    if (m) return finalizeTime(+m[1], 0, merOf(m[2]));
    m = norm.match(new RegExp('\\ba las (' + NUMRX + ')\\b'));
    if (m && numOf(m[1]) <= 24) return finalizeTime(numOf(m[1]), 0, null);
    m = norm.match(new RegExp('\\blas (' + NUMRX + ')\\b'));
    if (m && numOf(m[1]) <= 24) return finalizeTime(numOf(m[1]), 0, null);
    if (/\ba la una\b/.test(norm)) return 13 * 60;
    if (standalone) {
      m = norm.match(/^\s*(?:a las\s+)?(\d{1,2})\s*(?:h|hrs|horas)?\s*$/);
      if (m) return finalizeTime(+m[1], 0, null);
    }
    return null;
  }
  function parsePeople(norm, standalone) {
    var m = norm.match(new RegExp('\\b(' + NUMRX + ')\\s*(personas?|pax|invitados|comensales|adultos|amigos|ninos|pers)\\b'));
    if (m && numOf(m[1]) != null) return numOf(m[1]);
    var re = new RegExp('\\b(?:para|somos|seremos|vamos|mesa de|iremos)\\s+(' + NUMRX + ')\\b(.{0,12})', 'g'), mm;
    while ((mm = re.exec(norm))) {
      var rest = mm[2] || '';
      if (/^\s*(pm|am|:|h\b|hrs|de la|de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)|y media|y cuarto|\/)/.test(rest)) continue;
      return numOf(mm[1]);
    }
    if (/\b(solo yo|solo para mi|para mi solo|para mi sola|yo solo|yo sola|para mi)\b/.test(norm)) return 1;
    if (/\b(en pareja|mi pareja y yo|para dos)\b/.test(norm)) return 2;
    if (standalone) {
      m = norm.match(new RegExp('^\\s*(?:ok|okey|somos|seremos|seran|vamos|mesa para|para|mesa de)?\\s*(' + NUMRX + ')\\s*(personas?)?\\s*$'));
      if (m) return numOf(m[1]);
    }
    return null;
  }
  function cleanName(text) {
    var t = String(text).replace(/[?!¿¡.,;:]+/g, ' ').replace(/\s+/g, ' ').trim();
    t = t.replace(/^(?:hola\s+)?(?:(?:me llamo|mi nombre es|soy|a nombre de|se llama|nombre|para|es|a nombre)\s+)+/i, '').trim();
    if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]{2,40}$/.test(t)) return null;
    var ws = t.split(' ');
    if (ws.length > 4) return null;
    if (/^(si|no|ok|nada|cancelar|omitir|ninguno|no se|hola|gracias|confirmar|confirmo|cambiar)$/i.test(t)) return null;
    return ws.map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); }).join(' ');
  }
  function parsePhone(text) {
    var digits = String(text).replace(/\D/g, '');
    if (digits.indexOf('593') === 0 && digits.length === 12) digits = '0' + digits.slice(3);
    if (digits.length === 9 && digits.charAt(0) === '9') digits = '0' + digits;
    return /^09\d{8}$/.test(digits) ? digits.slice(0, 3) + ' ' + digits.slice(3, 6) + ' ' + digits.slice(6) : null;
  }

  /* ---------- Platos y cuentas ---------- */
  var DISHES = D.MENU.map(function (d) {
    return { dish: d, keys: d.keys.map(function (k) { return fold(k).split(' ').map(stem); }) };
  });
  function findDishes(raw, st) {
    var found = [];
    DISHES.forEach(function (x) {
      var best = null;
      x.keys.forEach(function (key) {
        for (var i = 0; i + key.length <= st.length; i++) {
          var ok = true;
          for (var j = 0; j < key.length; j++) {
            if (!(st[i + j] === key[j] || (key.length === 1 && near(st[i + j], key[j])))) { ok = false; break; }
          }
          if (ok && (!best || i < best.i || (i === best.i && key.length > best.len))) best = { dish: x.dish, i: i, len: key.length };
          if (ok) break;
        }
      });
      if (best) found.push(best);
    });
    found.sort(function (a, b) { return a.i - b.i; });
    return found;
  }
  function parseOrder(raw, hits) {
    var items = [], explicit = false;
    hits.forEach(function (h, k) {
      var qty = 1, floor = k ? hits[k - 1].i + hits[k - 1].len : 0;
      for (var j = h.i - 1; j >= Math.max(floor, h.i - 3); j--) {
        var n = numOf(raw[j]);
        if (n != null && n >= 1 && n <= 50) { qty = n; explicit = true; break; }
      }
      items.push({ dish: h.dish, qty: qty });
    });
    return { items: items, explicit: explicit };
  }
  function orderText(order) {
    var sub = 0, rows = order.items.map(function (it) {
      var line = it.qty * it.dish.price; sub += line;
      return '- ' + it.qty + ' × ' + it.dish.name + ': ' + money(line);
    });
    var iva = Math.round(sub * B.iva);
    return 'Tu cuenta:\n' + rows.join('\n') + '\n**Subtotal:** ' + money(sub) + '\n**IVA (15 %):** ' + money(iva) + '\n**Total:** ' + money(sub + iva) + '\nLa propina es voluntaria y no está incluida.';
  }

  var H = { B: B, D: D, money: money, hhmm: hhmm, withIva: withIva, greeting: greeting, ecuNow: ecuNow, dateLong: dateLong, openStatus: openStatus, dayAnswer: dayAnswer, orderText: orderText };

  /* ---------- Temas ---------- */
  var INTENTS = KB(H);
  var BYID = {};
  INTENTS.forEach(function (it) {
    BYID[it.id] = it;
    it._kw = [];
    Object.keys(it.kw || {}).forEach(function (k) {
      var w = it.kw[k]; if (!(w > 0)) return;
      var prefix = k.charAt(k.length - 1) === '*', base = fold(prefix ? k.slice(0, -1) : k);
      it._kw.push({ raw: k, stem: prefix ? base : stem(base), prefix: prefix, w: w });
    });
    it._kw.sort(function (a, b) { return b.w - a.w; });
    it._ph = (it.ph || []).map(function (p) { return { raw: p[0], stems: fold(p[0]).split(' ').map(stem), w: p[1] }; });
    it._not = (it.not || []).map(function (n) { return fold(n); });
  });

  function scoreIntent(it, raw, st) {
    var score = 0, hits = [], used = {}, i;
    var pending = [];
    it._kw.forEach(function (k) {
      var idx = -1;
      for (i = 0; i < raw.length; i++) {
        if (used[i]) continue;
        if (k.prefix ? raw[i].indexOf(k.stem) === 0 : st[i] === k.stem) { idx = i; break; }
      }
      if (idx >= 0) { used[idx] = true; score += k.w; hits.push({ i: idx, len: 1, kw: k.raw, fuzzy: false }); }
      else if (!k.prefix && k.stem.length >= 6) pending.push(k);
    });
    pending.forEach(function (k) {
      for (i = 0; i < raw.length; i++) {
        if (!used[i] && near(st[i], k.stem)) { used[i] = true; score += k.w * 0.8; hits.push({ i: i, len: 1, kw: k.raw, fuzzy: true }); break; }
      }
    });
    it._ph.forEach(function (p) {
      for (i = 0; i + p.stems.length <= st.length; i++) {
        var ok = true;
        for (var j = 0; j < p.stems.length; j++) if (st[i + j] !== p.stems[j] && !(p.stems[j].length >= 5 && near(st[i + j], p.stems[j]))) { ok = false; break; }
        if (ok) { score += p.w; hits.push({ i: i, len: p.stems.length, kw: p.raw, phrase: true }); break; }
      }
    });
    it._not.forEach(function (n) { for (i = 0; i < raw.length; i++) if (raw[i].indexOf(n) === 0) { score -= 4; break; } });
    return { score: score, hits: hits };
  }

  function analyze(text, nowMs) {
    var norm = fold(text), raw = words(norm), st = raw.map(stem), ec = ecuNow(nowMs);
    var tokens = raw.map(function (w, i) { return { raw: w, stem: st[i], hit: false, ent: false }; });
    var ranked = [];
    INTENTS.forEach(function (it, order) {
      if (it.maxTokens && raw.length > it.maxTokens) return;
      var r = scoreIntent(it, raw, st);
      if (r.score > 0) ranked.push({ id: it.id, label: it.label, score: Math.round(r.score * 10) / 10, hits: r.hits, order: order });
    });
    ranked.sort(function (a, b) { return b.score - a.score || a.order - b.order; });
    var dishHits = findDishes(raw, st);
    dishHits.forEach(function (h) { for (var k = 0; k < h.len; k++) if (tokens[h.i + k]) tokens[h.i + k].ent = true; });
    var date = parseDate(norm, ec);
    if (ranked[0]) ranked[0].hits.forEach(function (h) { for (var k = 0; k < h.len; k++) if (tokens[h.i + k]) tokens[h.i + k].hit = true; });
    return { text: text, norm: norm, raw: raw, tokens: tokens, ranked: ranked, dishHits: dishHits, dishes: dishHits.map(function (h) { return h.dish; }), order: parseOrder(raw, dishHits), date: date };
  }

  var ATTR = { precio: 1, ingredientes: 1, picante: 1, alergenos: 1, tiempo_espera: 1, porciones: 1 };
  var PRICE_WORDS = /\b(cuanto|cuesta|cuestan|total|sale|saldria|costaria|valen|cuenta|pagar|precio|precios)\b/;

  /* Decide qué tema responde a un trozo de mensaje. */
  function decide(an, S) {
    var top = an.ranked[0], second = an.ranked[1];
    if (an.order.items.length && (an.order.explicit || (an.order.items.length >= 2 && PRICE_WORDS.test(an.norm)))) {
      var o = { id: 'cuenta', label: 'Calcular cuenta', score: 10, forced: true };
      return { pick: o, alts: an.ranked.slice(0, 3) };
    }
    if (top && top.score >= MIN) {
      if (an.dishes.length && (top.id === 'cuenta')) { /* sigue */ }
      if (second && second.score >= MIN && second.score >= 0.9 * top.score && top.score < 6 && !(an.dishes.length && ATTR[top.id]) && !pairOK(top.id, second.id)) {
        return { clarify: [top, second], alts: an.ranked.slice(0, 3) };
      }
      return { pick: top, alts: an.ranked.slice(0, 3) };
    }
    if (an.dishes.length) return { pick: { id: 'plato', label: 'Un plato', score: 3.5, forced: true }, alts: an.ranked.slice(0, 3) };
    return { fallback: true, alts: an.ranked.slice(0, 3) };
  }
  var PAIRS = [['horario', 'abierto_ahora'], ['reservar', 'mis_reservas'], ['cancelar_reserva', 'cambiar_reserva'], ['reservar', 'cancelar_reserva'], ['saludo', 'como_estas'], ['gracias', 'elogio'], ['carta', 'recomendacion']];
  function pairOK(a, b) { return PAIRS.some(function (p) { return (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a); }); }

  /* ---------- Estado ---------- */
  function create() { return { turns: 0, seen: {}, ctx: { dish: null, turn: 0 }, flow: null, reservations: [], fallbacks: 0 }; }

  function makeCtx(S, an, nowMs, intentId) {
    var dish = an.dishes[0] || null;
    if (!dish && S.ctx.dish && S.turns - S.ctx.turn <= 3) dish = byDishId(S.ctx.dish);
    return {
      S: S, an: an, nowMs: nowMs, dish: dish, dishes: an.dishes, order: an.order, date: an.date,
      pick: function (arr) { var n = S.seen[intentId] || 0; return arr[n % arr.length]; }
    };
  }
  function byDishId(id) { for (var i = 0; i < D.MENU.length; i++) if (D.MENU[i].id === id) return D.MENU[i]; return null; }

  function answerIntent(S, an, pick, nowMs) {
    var it = BYID[pick.id];
    var c = makeCtx(S, an, nowMs, pick.id);
    var res;
    if (pick.id === 'plato' && an.dishes.length > 1) {
      res = { text: an.dishes.map(function (d) { return '**' + d.name + '**, ' + money(d.price) + ' + IVA. ' + d.desc + '.'; }).join('\n'), chips: ['Calcular una cuenta', 'Quiero reservar'] };
    } else if (pick.id === 'precio' && an.dishes.length > 1) {
      res = { text: an.dishes.map(function (d) { return '- **' + d.name + '**: ' + money(d.price) + ' + IVA (' + money(withIva(d.price)) + ' con IVA).'; }).join('\n'), chips: ['Calcular una cuenta', 'Quiero reservar'] };
    } else res = it.a(c);
    S.seen[pick.id] = (S.seen[pick.id] || 0) + 1;
    if (c.dish && (ATTR[pick.id] || pick.id === 'plato' || an.dishes.length)) S.ctx = { dish: c.dish.id, turn: S.turns };
    return res;
  }

  /* ---------- Reserva ---------- */
  var STEP_ORDER = ['people', 'date', 'time', 'name', 'phone'];
  var YES = /^(?:si|sii|sip|ok|okey|dale|claro|confirmo|confirmar|confirma|listo|correcto|perfecto|de acuerdo|esta bien|todo bien|asi esta bien|adelante|por favor|confirmala)(?:\s+(?:por favor|gracias|confirmo|confirma|confirmar|gracias))?$/;
  var CANCEL_RX = /\b(cancel\w*|olvidalo|olvida\w*|mejor no|ya no quiero|no quiero reservar|dejalo|salir|empezar de nuevo)\b/;

  function busyAt(dow, t) { return D.BUSY.some(function (b) { return b.dow === dow && t >= b.from && t < b.to; }); }
  function freeSlots(date) {
    var dow = dowOf(date), h = D.HOURS[dow], out = [];
    if (!h) return out;
    for (var t = h.open; t <= h.close - 60; t += 30) if (!busyAt(dow, t)) out.push(t);
    return out;
  }
  function nearest(date, t, n, minT) {
    var f = freeSlots(date).filter(function (x) { return minT == null || x >= minT; });
    var before = f.filter(function (x) { return x < t; }).pop(), after = f.filter(function (x) { return x > t; })[0];
    var out = [before, after].filter(function (x) { return x != null; });
    if (out.length < n) f.sort(function (a, b) { return Math.abs(a - t) - Math.abs(b - t); }).forEach(function (x) { if (out.length < n && out.indexOf(x) === -1 && x !== t) out.push(x); });
    return out.sort(function (a, b) { return a - b; });
  }
  function timeChips(date) {
    var f = freeSlots(date), pref = [12 * 60, 13 * 60, 19 * 60, 20 * 60], out = pref.filter(function (t) { return f.indexOf(t) !== -1; });
    if (out.length < 3) f.forEach(function (t) { if (out.length < 4 && out.indexOf(t) === -1) out.push(t); });
    return out.slice(0, 4).map(hhmm);
  }
  function dateChips(nowMs) {
    var e = ecuNow(nowMs), out = [], today = D.HOURS[e.dow] && e.minutes < D.HOURS[e.dow].close - 90;
    if (today) out.push('Hoy');
    var tom = addDays(e.date, 1);
    if (D.HOURS[dowOf(tom)]) out.push('Mañana');
    for (var i = 2; i < 12 && out.length < 4; i++) { var s = addDays(e.date, i); if (D.HOURS[dowOf(s)] && (dowOf(s) === 5 || dowOf(s) === 6 || dowOf(s) === 0)) out.push(cap(DAYS[dowOf(s)])); }
    return out.filter(function (x, k) { return out.indexOf(x) === k; }).slice(0, 4);
  }

  function validateReserva(S, nowMs) {
    var s = S.flow.slots, e = ecuNow(nowMs), dow, h, last;
    if (s.people != null) {
      if (s.people < 1) { delete s.people; return { step: 'people', msg: 'La mesa debe ser al menos para 1 persona.' }; }
      if (s.people > B.maxPartyOnline) {
        var n = s.people; delete s.people;
        return { step: 'people', msg: 'Para **' + n + ' personas** armamos la mesa con un asesor, porque necesitamos juntar mesas y confirmar el menú. Llama o escribe al **' + B.phone + '**. Si son hasta ' + B.maxPartyOnline + ', sigo yo.' };
      }
    }
    if (s.date) {
      dow = dowOf(s.date);
      if (s.date < e.date) { delete s.date; return { step: 'date', msg: 'Esa fecha ya pasó.' }; }
      if (diffDays(s.date, e.date) > MAX_DAYS_AHEAD) { delete s.date; return { step: 'date', msg: 'Tomamos reservas hasta con ' + MAX_DAYS_AHEAD + ' días de anticipación.' }; }
      if (!D.HOURS[dow]) {
        var nx = nextOpenDate(s.date, false); delete s.date;
        return { step: 'date', msg: 'Los **lunes** descansamos. ¿Te sirve el **' + dateLong(nx) + '**?', chips: [dateLong(nx)] };
      }
    }
    if (s.time != null && s.date) {
      dow = dowOf(s.date); h = D.HOURS[dow]; last = h.close - 60;
      if (s.time < h.open || s.time > last) {
        delete s.time;
        return { step: 'time', msg: 'Ese día atendemos ' + hoursText(dow) + ', y la última mesa se reserva a las **' + hhmm(last) + '**.' };
      }
      if (s.date === e.date && s.time < e.minutes + 30) {
        delete s.time;
        return { step: 'time', msg: 'Esa hora ya pasó o es demasiado pronto: hoy reservamos con al menos 30 minutos de anticipación.' };
      }
      if (busyAt(dow, s.time)) {
        var asked = s.time; delete s.time;
        var alt = nearest(s.date, asked, 2, s.date === e.date ? e.minutes + 30 : null);
        return { step: 'time', msg: 'A las **' + hhmm(asked) + '** ya no tengo mesa libre ese día.' + (alt.length ? ' Tengo a las ' + alt.map(function (t) { return '**' + hhmm(t) + '**'; }).join(' o a las ') + '. ¿Cuál prefieres?' : ''), chips: alt.map(hhmm) };
      }
    }
    return null;
  }
  function missingStep(f) {
    for (var i = 0; i < STEP_ORDER.length; i++) {
      var k = STEP_ORDER[i];
      if (k === 'phone') { if (f.slots.phone == null && !f.phoneSkipped) return 'phone'; }
      else if (f.slots[k] == null) return k;
    }
    return null;
  }
  function promptFor(step, S, nowMs) {
    var f = S.flow, s = f.slots;
    if (step === 'people') return { text: '¿Para cuántas personas es la mesa? (hasta ' + B.maxPartyOnline + ')', chips: ['2 personas', '4 personas', '6 personas', 'Cancelar'] };
    if (step === 'date') return { text: '¿Para qué día? Abrimos de martes a domingo.', chips: dateChips(nowMs).concat(['Cancelar']) };
    if (step === 'time') {
      var dow = s.date ? dowOf(s.date) : null, hrs = dow != null ? hoursText(dow) : 'de 11:00 a 21:00';
      return { text: '¿A qué hora? ' + (s.date ? 'Ese día atendemos ' + hrs + '.' : 'Atendemos ' + hrs + '.'), chips: (s.date ? timeChips(s.date) : ['12:00', '13:00', '19:00']).concat(['Cancelar']) };
    }
    if (step === 'name') return { text: '¿A nombre de quién dejo la reserva?', chips: ['Cancelar'] };
    if (step === 'phone') return { text: '¿Un número de celular para avisarte si hay algún cambio? Ejemplo: 0991234567. Si prefieres no darlo, elige «Omitir».', chips: ['Omitir', 'Cancelar'] };
    return summaryPrompt(S);
  }
  function summaryPrompt(S) {
    var s = S.flow.slots;
    return { text: 'Revisa tu reserva:\n' + ['**Mesa para ' + s.people + '**', '**' + cap(dateLong(s.date)) + ', ' + hhmm(s.time) + '**', 'A nombre de **' + s.name + '**', 'Celular: ' + (s.phone || 'sin celular')].map(function (x) { return '- ' + x; }).join('\n') + '\n¿La confirmo?', chips: ['Confirmar', 'Cambiar hora', 'Cambiar fecha', 'Cambiar personas', 'Cancelar'] };
  }
  function newCode(S, rng) {
    var AL = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', code, tries = 0;
    do { code = B.codePrefix; for (var i = 0; i < 4; i++) code += AL.charAt(Math.floor(rng() * AL.length)); tries++; }
    while (S.reservations.some(function (r) { return r.code === code; }) && tries < 50);
    return code;
  }

  function extractSlots(S, an, step, nowMs) {
    var s = S.flow.slots, norm = an.norm, filled = [], v, e = ecuNow(nowMs);
    v = parsePeople(norm, step === 'people'); if (v != null) { s.people = v; filled.push('people'); }
    var d = an.date;
    if (!d && step === 'date') { var dm = norm.match(/^\s*(\d{1,2})\s*$/); if (dm && +dm[1] >= 1 && +dm[1] <= 31) { var mo = e.m, yr = e.y; if (+dm[1] < e.d) { mo++; if (mo > 12) { mo = 1; yr++; } } if (validDate(yr, mo, +dm[1])) d = { date: iso(yr, mo, +dm[1]) }; } }
    if (d) { s.date = d.date; filled.push('date'); }
    v = parseTime(norm, step === 'time'); if (v != null) { s.time = v; filled.push('time'); }
    var ph = parsePhone(an.text);
    if (ph && (step === 'phone' || /\b09\d{8}\b/.test(an.text.replace(/\s/g, '')))) { s.phone = ph; filled.push('phone'); }
    if (step === 'name' || /\b(me llamo|mi nombre es|a nombre de|soy)\b/.test(norm)) {
      var top = an.ranked[0], looksLikeQuestion = an.dishes.length || (top && top.score >= MIN && ['reservar', 'afirmacion', 'negacion'].indexOf(top.id) === -1);
      var nm = ((step === 'name' && !filled.length && !looksLikeQuestion) || /\b(me llamo|mi nombre es|a nombre de)\b/.test(norm)) ? cleanName(an.text) : null;
      if (nm) { s.name = nm; filled.push('name'); }
    }
    return filled;
  }

  function startReserva(S, an, nowMs, rng) {
    S.flow = { type: 'reserva', slots: {}, step: 'people', phoneSkipped: false };
    var filled = extractSlots(S, an, null, nowMs);
    var out = reservaAdvance(S, nowMs, filled.length ? '' : 'Claro, te ayudo a reservar.');
    return out;
  }
  function reservaAdvance(S, nowMs, lead) {
    var f = S.flow, err = validateReserva(S, nowMs);
    if (err) { f.step = err.step; var p = promptFor(err.step, S, nowMs); var ask = err.chips ? '' : err.step === 'time' ? ' ¿A qué hora prefieres?' : err.step === 'people' ? '' : ' ' + p.text;
      return [{ text: (lead ? lead + ' ' : '') + err.msg + ask, chips: err.chips ? err.chips.concat(['Cancelar']) : p.chips }]; }
    var step = missingStep(f);
    if (!step) { f.step = 'confirm'; var sm = summaryPrompt(S); return [{ text: (lead ? lead + '\n' : '') + sm.text, chips: sm.chips }]; }
    f.step = step;
    var pr = promptFor(step, S, nowMs);
    return [{ text: (lead ? lead + ' ' : '') + pr.text, chips: pr.chips }];
  }

  function reservaTurn(S, an, nowMs, rng) {
    var f = S.flow, norm = an.norm, trimmed = norm.trim();
    if (CANCEL_RX.test(norm) && !(f.step === 'confirm' && /\b(cambiar|modificar)\b/.test(norm))) {
      S.flow = null;
      return [{ text: 'Listo, no guardé ninguna reserva. Cuando quieras, empezamos de nuevo.', chips: ['Quiero reservar', 'Ver la carta'] }];
    }
    if (f.step === 'confirm') {
      if (YES.test(trimmed)) {
        var s = f.slots, code = newCode(S, rng);
        S.reservations.push({ code: code, people: s.people, date: s.date, time: s.time, name: s.name, phone: s.phone || null, createdAt: nowMs });
        S.flow = null;
        return [{ text: '¡Listo, **' + s.name.split(' ')[0] + '**! Tu mesa para **' + s.people + '** queda reservada el **' + dateLong(s.date) + ' a las ' + hhmm(s.time) + '**.\nTu código es **' + code + '**. Llega 10 minutos antes: guardamos la mesa por 15 minutos.\nEs una demostración, así que nada sale de tu navegador.', chips: ['Ver mis reservas', '¿Dónde quedan?', 'Ver la carta'] }];
      }
      var chg = norm.match(/\b(?:cambiar|modificar|corregir|cambio)\b.*\b(hora|fecha|dia|personas|cantidad|nombre|celular|telefono|numero)\b/);
      if (chg) {
        var map = { hora: 'time', fecha: 'date', dia: 'date', personas: 'people', cantidad: 'people', nombre: 'name', celular: 'phone', telefono: 'phone', numero: 'phone' }, key = map[chg[1]];
        delete f.slots[key]; if (key === 'phone') f.phoneSkipped = false;
        f.step = key;
        var pr = promptFor(key, S, nowMs); return [{ text: 'Claro. ' + pr.text, chips: pr.chips }];
      }
      if (/^(no|nop|nel|aun no|todavia no)$/.test(trimmed)) return [{ text: '¿Qué quieres cambiar?', chips: ['Cambiar hora', 'Cambiar fecha', 'Cambiar personas', 'Cancelar'] }];
      var before = JSON.stringify(f.slots), filled = extractSlots(S, an, 'confirm', nowMs);
      if (filled.length && JSON.stringify(f.slots) !== before) return reservaAdvance(S, nowMs, 'Hecho, lo actualicé.');
      return questionDuringFlow(S, an, nowMs, rng);
    }
    /* Pasos de datos */
    if (f.step === 'phone' && /^(omitir|omito|no|no tengo|paso|sin celular|sin telefono|prefiero no|no quiero)$/.test(trimmed)) {
      f.phoneSkipped = true; return reservaAdvance(S, nowMs, '');
    }
    var filled2 = extractSlots(S, an, f.step, nowMs);
    var asksOther = !filled2.length ? decide(an, S) : null;
    if (!filled2.length && f.step === 'name' && asksOther && asksOther.pick && asksOther.pick.score >= MIN && asksOther.pick.id !== 'reservar') return questionDuringFlow(S, an, nowMs, rng);
    if (!filled2.length) {
      var qd = questionDuringFlow(S, an, nowMs, rng, true);
      if (qd) return qd;
      var p2 = promptFor(f.step, S, nowMs);
      var hint = { people: 'Escribe un número de personas, por ejemplo «4».', date: 'Dime un día, por ejemplo «mañana» o «el sábado».', time: 'Dime una hora, por ejemplo «7 pm» o «19:30».', name: 'Escribe solo un nombre, por ejemplo «Ana Pérez».', phone: 'Escribe un celular de 10 dígitos que empiece con 09, o elige «Omitir».' }[f.step];
      return [{ text: 'No pude leer ese dato. ' + hint, chips: p2.chips }];
    }
    return reservaAdvance(S, nowMs, '');
  }
  function questionDuringFlow(S, an, nowMs, rng, soft) {
    var dc = decide(an, S);
    if (dc.pick && dc.pick.score >= MIN && ['reservar', 'afirmacion', 'negacion', 'mis_reservas'].indexOf(dc.pick.id) === -1) {
      var res = answerIntent(S, an, dc.pick, nowMs);
      if (res.startFlow) return null;
      var f = S.flow, next = f.step === 'confirm' ? summaryPrompt(S) : promptFor(f.step, S, nowMs);
      return [{ text: res.text }, { text: 'Seguimos con tu reserva. ' + next.text, chips: next.chips }];
    }
    if (soft) return null;
    var p = S.flow.step === 'confirm' ? summaryPrompt(S) : promptFor(S.flow.step, S, nowMs);
    return [{ text: 'No estoy segura de haber entendido. ' + p.text, chips: p.chips }];
  }

  /* ---------- Cancelar reserva ---------- */
  function startCancel(S, an) {
    var rs = S.reservations;
    if (!rs.length) return [{ text: 'No tienes reservas guardadas en este navegador, así que no hay nada que cancelar.', chips: ['Quiero reservar', 'Ver la carta'] }];
    var m = an.text.match(/pch[- ]?([a-z0-9]{4})/i), target = null;
    if (m) target = rs.filter(function (r) { return r.code === B.codePrefix + m[1].toUpperCase(); })[0];
    if (!target && rs.length === 1) target = rs[0];
    if (!target) {
      S.flow = { type: 'cancelar', step: 'which' };
      return [{ text: 'Tienes ' + rs.length + ' reservas. ¿Cuál cancelo? Dime el código.\n' + rs.map(function (r) { return '- **' + r.code + '**: ' + dateLong(r.date) + ', ' + hhmm(r.time); }).join('\n'), chips: rs.map(function (r) { return r.code; }).concat(['No cancelar']) }];
    }
    S.flow = { type: 'cancelar', step: 'confirm', code: target.code };
    return [{ text: '¿Cancelo la reserva **' + target.code + '** (' + dateLong(target.date) + ', ' + hhmm(target.time) + ', mesa para ' + target.people + ')?', chips: ['Sí, cancelar', 'No, mantenerla'] }];
  }
  function cancelTurn(S, an) {
    var f = S.flow, norm = an.norm.trim();
    if (/^(no|no cancelar|no mantenerla|no, mantenerla|mantenerla|mantener|dejala|mejor no)$/.test(norm) || /\bno\b.*\b(cancelar|mantener)\b/.test(norm) || /\bmantener/.test(norm)) { S.flow = null; return [{ text: 'Perfecto, tu reserva sigue en pie.', chips: ['Ver mis reservas', '¿Dónde quedan?'] }]; }
    if (f.step === 'which') {
      var m = an.text.match(/pch[- ]?([a-z0-9]{4})/i), t = m && S.reservations.filter(function (r) { return r.code === B.codePrefix + m[1].toUpperCase(); })[0];
      if (!t) return [{ text: 'No encontré ese código. Escríbelo como aparece en tu reserva, por ejemplo PCH-AB3K.', chips: S.reservations.map(function (r) { return r.code; }).concat(['No cancelar']) }];
      f.step = 'confirm'; f.code = t.code;
      return [{ text: '¿Cancelo la reserva **' + t.code + '**?', chips: ['Sí, cancelar', 'No, mantenerla'] }];
    }
    if (YES.test(norm) || /^(si|sí)\b/.test(norm) || /\bsi,? cancel/.test(norm) || /^cancelar$/.test(norm)) {
      S.reservations = S.reservations.filter(function (r) { return r.code !== f.code; });
      S.flow = null;
      return [{ text: 'Listo, cancelé la reserva **' + f.code + '**. Esperamos verte pronto.', chips: ['Quiero reservar', 'Ver la carta'] }];
    }
    return [{ text: 'Responde «Sí, cancelar» para confirmar o «No, mantenerla» para dejarla.', chips: ['Sí, cancelar', 'No, mantenerla'] }];
  }

  /* ---------- Respuesta principal ---------- */
  var FALLBACK_DEFAULT = ['Ver la carta', '¿Están abiertos ahora?', 'Quiero reservar'];

  function respond(S, text, opts) {
    opts = opts || {};
    var nowMs = opts.now == null ? Date.now() : opts.now, rng = opts.rng || Math.random;
    S.turns += 1;
    var clean = String(text == null ? '' : text).slice(0, 400);
    var an = analyze(clean, nowMs), messages, chosen = [];

    if (!an.raw.length) {
      messages = [{ text: 'No alcancé a leer texto en tu mensaje. Escríbeme tu pregunta con palabras, por ejemplo «¿Qué hay de postre?».', chips: FALLBACK_DEFAULT }];
    } else if (S.flow && S.flow.type === 'reserva') {
      messages = reservaTurn(S, an, nowMs, rng); chosen = [{ id: 'reserva', label: 'Reserva en curso', score: 0 }];
    } else if (S.flow && S.flow.type === 'cancelar') {
      messages = cancelTurn(S, an); chosen = [{ id: 'cancelar_reserva', label: 'Cancelar reserva', score: 0 }];
    } else {
      var res = freeTurn(S, an, nowMs, rng); messages = res.messages; chosen = res.chosen;
    }
    messages = messages.filter(Boolean);
    messages.forEach(function (m, i) { if (i < messages.length - 1) delete m.chips; });
    if (chosen.length && chosen[0].id !== 'fallback') S.fallbacks = 0;
    return { messages: messages, trace: makeTrace(S, an, chosen) };
  }

  function freeTurn(S, an, nowMs, rng) {
    var parts = splitClauses(an, nowMs), decisions = [], messages = [], chosen = [];
    parts.forEach(function (p) { decisions.push({ an: p, d: decide(p, S) }); });
    var picks = decisions.filter(function (x) { return x.d.pick; });
    if (picks.length > 1) {
      var seen = {}; picks = picks.filter(function (x) { if (seen[x.d.pick.id]) return false; seen[x.d.pick.id] = true; return true; });
      var nonSmall = picks.filter(function (x) { return ['saludo', 'gracias', 'afirmacion', 'negacion', 'como_estas'].indexOf(x.d.pick.id) === -1; });
      if (nonSmall.length) picks = nonSmall;
      if (picks.some(function (x) { return ATTR[x.d.pick.id]; })) { var rest = picks.filter(function (x) { return x.d.pick.id !== 'plato'; }); if (rest.length) picks = rest; }
      picks = picks.slice(0, 3);
    }
    if (!picks.length) {
      var d0 = decisions[0].d;
      if (d0.clarify) {
        chosen = d0.clarify.map(function (r) { return { id: r.id, label: r.label, score: r.score }; });
        S.fallbacks = 0;
        return { messages: [{ text: 'No estoy segura de qué necesitas: ¿**' + d0.clarify[0].label.toLowerCase() + '** o **' + d0.clarify[1].label.toLowerCase() + '**?', chips: [chipFor(d0.clarify[0]), chipFor(d0.clarify[1])] }], chosen: chosen };
      }
      S.fallbacks += 1;
      var sug = (d0.alts || []).filter(function (r) { return r.score > 0 && ['saludo'].indexOf(r.id) === -1; }).slice(0, 3).map(chipFor);
      var chips = sug.length >= 2 ? sug : FALLBACK_DEFAULT;
      var txt = S.fallbacks >= 2
        ? 'Sigo sin entenderte, perdona. Prueba con palabras como «carta», «horario» o «reservar», o habla con una persona al **' + B.phone + '**.'
        : 'No estoy segura de haber entendido. Prueba con otras palabras o elige un tema:';
      return { messages: [{ text: txt, chips: S.fallbacks >= 2 ? chips.concat(['Hablar con una persona']).slice(0, 4) : chips }], chosen: [{ id: 'fallback', label: 'Sin coincidencia', score: 0 }] };
    }
    picks.forEach(function (x) {
      var pick = x.d.pick, res = answerIntent(S, x.an, pick, nowMs);
      chosen.push({ id: pick.id, label: pick.label, score: pick.score });
      if (res.startFlow === 'reserva') messages = messages.concat(startReserva(S, x.an, nowMs, rng));
      else if (res.startFlow === 'cancelar') messages = messages.concat(startCancel(S, x.an));
      else messages.push({ text: res.text, chips: res.chips });
    });
    return { messages: messages, chosen: chosen };
  }
  function chipFor(r) { var it = BYID[r.id]; return (it && it.q) || r.label; }

  /* Un mensaje con varias preguntas se reparte por frases; el reparto interno por «y» solo se acepta si cada trozo tiene tema propio. */
  function splitClauses(an, nowMs) {
    var pieces = an.text.split(/[?!.;\n,¿¡]+/).map(function (s) { return s.trim(); }).filter(function (s) { return words(fold(s)).length; });
    if (!pieces.length) return [an];
    var out = [];
    pieces.forEach(function (piece) {
      var pa = pieces.length === 1 ? an : analyze(piece, nowMs);
      if (pieces.length > 1 && !pa.dishes.length && an.dishes.length) pa.dishes = an.dishes;
      var sub = piece.split(/\s+(?:y|e|ademas|tambien|y tambien)\s+/i).filter(function (x) { return words(fold(x)).length; });
      if (sub.length > 1 && pa.dishes.length < 2 && words(fold(piece)).length >= 3) {
        var ans = sub.map(function (x) { return analyze(x, nowMs); });
        var ids = ans.map(function (a) { var t = a.ranked[0]; return t && t.score >= MIN ? t.id : null; });
        if (ids.every(Boolean) && new Set(ids).size === ids.length) { out = out.concat(ans); return; }
      }
      out.push(pa);
    });
    return out;
  }

  function makeTrace(S, an, chosen) {
    var top = an.ranked.slice(0, 4).map(function (r) { return { id: r.id, label: r.label, score: r.score }; });
    chosen.forEach(function (c) { if (c.score > 0 && !top.some(function (r) { return r.id === c.id; })) top.unshift({ id: c.id, label: c.label, score: c.score }); });
    top.sort(function (x, y) { return y.score - x.score; });
    top = top.slice(0, 4);
    var ents = [];
    an.dishes.forEach(function (d) { ents.push({ kind: 'Plato', value: d.name }); });
    if (an.order.explicit && an.order.items.length) ents.push({ kind: 'Cantidad', value: an.order.items.map(function (i) { return i.qty + ' × ' + i.dish.name; }).join(', ') });
    if (an.date) ents.push({ kind: 'Fecha', value: an.date.date ? dateLong(an.date.date) : an.date.label });
    var tm = parseTime(an.norm, false); if (tm != null) ents.push({ kind: 'Hora', value: hhmm(tm) });
    var pp = parsePeople(an.norm, false); if (pp != null) ents.push({ kind: 'Personas', value: String(pp) });
    var flow = S.flow ? { type: S.flow.type, step: S.flow.step, slots: JSON.parse(JSON.stringify(S.flow.slots || {})) } : null;
    return { norm: an.norm, tokens: an.tokens, ranked: top, chosen: chosen, entities: ents, flow: flow, context: S.ctx.dish && S.turns - S.ctx.turn <= 3 ? byDishId(S.ctx.dish).name : null };
  }

  var api = {
    create: create, respond: respond, analyze: analyze, decide: decide, INTENTS: INTENTS, MIN: MIN, H: H,
    fold: fold, stem: stem, near: near, parseDate: parseDate, parseTime: parseTime, parsePeople: parsePeople, parsePhone: parsePhone, cleanName: cleanName,
    ecuNow: ecuNow, openStatus: openStatus, freeSlots: freeSlots, dateLong: dateLong, hhmm: hhmm, money: money, orderText: orderText, parseOrder: parseOrder, findDishes: findDishes, words: words
  };
  if (isNode) module.exports = api; else root.BOT = api;
})(typeof window !== 'undefined' ? window : globalThis);
