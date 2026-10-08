/**
 * Interacciones del portafolio.
 * El contenido vive en el HTML; aquí solo hay comportamiento.
 */

document.addEventListener('DOMContentLoaded', () => {
  setupActiveNav();
  setupStrip();
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
