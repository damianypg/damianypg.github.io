/**
 * Interacciones del portafolio.
 * El contenido vive en el HTML; aquí solo hay comportamiento.
 */

document.addEventListener('DOMContentLoaded', () => {
  setupActiveNav();
  setupStrip();
  setupChess();
});

function setupActiveNav() {
  const links = [...document.querySelectorAll('.topnav a[href^="#"]')];
  const sections = links
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(({ isIntersecting, target }) => {
      if (!isIntersecting) return;
      links.forEach((link) => {
        const active = link.getAttribute('href') === `#${target.id}`;
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });

  sections.forEach((s) => observer.observe(s));

  const topbar = document.querySelector('.topbar');
  const hero = document.querySelector('.hero');
  new IntersectionObserver(([entry]) => {
    topbar.classList.toggle('is-solid', !entry.isIntersecting);
  }, { rootMargin: '-80px 0px 0px 0px' }).observe(hero);
}

/**
 * Franja horizontal con botones anterior/siguiente.
 * Los botones se desactivan en los extremos y desaparecen si todo cabe.
 */
function setupStrip() {
  const strip = document.querySelector('.anime-strip');
  if (!strip) return;
  const section = strip.closest('.offcode');
  const [prev, next] = section.querySelectorAll('.strip-btn');

  const update = () => {
    const max = strip.scrollWidth - strip.clientWidth;
    section.classList.toggle('is-static', max <= 1);
    prev.disabled = strip.scrollLeft <= 1;
    next.disabled = strip.scrollLeft >= max - 1;
  };

  section.querySelectorAll('[data-strip]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const card = strip.querySelector('.anime');
      const step = card ? card.getBoundingClientRect().width + 16 : strip.clientWidth * 0.8;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      strip.scrollBy({ left: step * Number(btn.dataset.strip), behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  strip.addEventListener('scroll', update, { passive: true });
  new ResizeObserver(update).observe(strip);
  update();
}

/**
 * Tablero de "Fuera del código": reproduce el mate del pastor jugada a jugada.
 * Las casillas son fijas; las piezas viven en una capa aparte y solo se mueven
 * con transform/opacity, así nunca alteran el tamaño del tablero.
 * Mayúsculas = blancas, minúsculas = negras; la fila 0 es la octava.
 */
function setupChess() {
  const board = document.querySelector('.chess-board');
  if (!board) return;
  const section = board.closest('.chess');
  const button = section.querySelector('.chess-play');
  const caption = section.querySelector('.chess-moves');

  const START = ['rnbqkbnr', 'pppppppp', '........', '........', '........', '........', 'PPPPPPPP', 'RNBQKBNR'];
  const GLYPHS = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  const es = document.documentElement.lang === 'es';
  const MOVES = [
    ['e2', 'e4', 'e4'], ['e7', 'e5', 'e5'],
    ['f1', 'c4', es ? 'Ac4' : 'Bc4'], ['b8', 'c6', es ? 'Cc6' : 'Nc6'],
    ['d1', 'h5', es ? 'Dh5' : 'Qh5'], ['g8', 'f6', es ? 'Cf6' : 'Nf6'],
    ['h5', 'f7', es ? 'Dxf7#' : 'Qxf7#'],
  ];
  const at = (sq) => [8 - Number(sq[1]), sq.charCodeAt(0) - 97];

  const squares = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = document.createElement('span');
      cell.className = `chess-sq ${(r + c) % 2 ? 'is-dark' : 'is-light'}`;
      board.append(cell);
      squares.push(cell);
    }
  }
  const layer = document.createElement('div');
  layer.className = 'chess-pieces';
  board.append(layer);

  const place = (el, r, c) => {
    el.style.transform = `translate(${c * 100}%, ${r * 100}%)`;
    el.dataset.square = String.fromCharCode(97 + c) + (8 - r);
  };

  let pieces;
  const reset = () => {
    layer.replaceChildren();
    pieces = START.map((row, r) => row.split('').map((p, c) => {
      if (p === '.') return null;
      const el = document.createElement('span');
      el.className = `chess-piece${p === p.toUpperCase() ? ' is-white' : ''}`;
      el.dataset.piece = p;
      el.textContent = GLYPHS[p.toLowerCase()] + '︎';
      place(el, r, c);
      layer.append(el);
      return el;
    }));
    squares.forEach((cell) => cell.classList.remove('is-from', 'is-to', 'is-mate'));
  };

  const highlight = (move) => {
    squares.forEach((cell) => cell.classList.remove('is-from', 'is-to', 'is-mate'));
    const [fr, fc] = at(move[0]);
    const [tr, tc] = at(move[1]);
    squares[fr * 8 + fc].classList.add('is-from');
    squares[tr * 8 + tc].classList.add(move[2].endsWith('#') ? 'is-mate' : 'is-to');
  };

  const notation = (n) => MOVES.slice(0, n)
    .map((m, i) => (i % 2 ? m[2] : `${i / 2 + 1}.${m[2]}`))
    .join(' ');

  let timer;
  const play = () => {
    clearTimeout(timer);
    reset();
    button.disabled = true;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let n = 0;
    const step = () => {
      const move = MOVES[n];
      const [fr, fc] = at(move[0]);
      const [tr, tc] = at(move[1]);
      const captured = pieces[tr][tc];
      if (captured) {
        captured.style.opacity = '0';
        captured.removeAttribute('data-square');
        if (reduce) captured.remove();
        else captured.addEventListener('transitionend', () => captured.remove(), { once: true });
      }
      const moving = pieces[fr][fc];
      pieces[tr][tc] = moving;
      pieces[fr][fc] = null;
      place(moving, tr, tc);
      n++;
      highlight(move);
      if (n < MOVES.length && !reduce) {
        caption.textContent = notation(n);
        timer = setTimeout(step, 750);
        return;
      }
      if (n < MOVES.length) return step();
      caption.textContent = `${notation(n)} · ${caption.dataset.done}`;
      button.textContent = button.dataset.replay;
      button.disabled = false;
    };
    timer = setTimeout(step, reduce ? 0 : 400);
  };

  button.addEventListener('click', play);
  reset();
}
