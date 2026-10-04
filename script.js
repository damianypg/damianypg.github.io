/**
 * Interacciones del portafolio.
 * El contenido vive en el HTML; aquí solo hay comportamiento.
 */

document.addEventListener('DOMContentLoaded', () => {
  setupDemos();
  setupActiveNav();
  setupStrip();
});

/**
 * Las tarjetas muestran capturas estáticas. La demo real (un iframe)
 * se carga solo cuando alguien la pide, dentro de un <dialog>.
 */
function setupDemos() {
  const dialog = document.querySelector('.demo-dialog');
  if (!dialog) return;
  const frame = dialog.querySelector('.demo-frame');
  const title = dialog.querySelector('.demo-title');
  const openLink = dialog.querySelector('.demo-open');

  document.querySelectorAll('[data-demo]').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const url = trigger.dataset.demo;
      title.textContent = trigger.dataset.title || 'Demo';
      const isEnglish = document.documentElement.lang === 'en';
      frame.title = isEnglish
        ? `${trigger.dataset.title || 'Project'} demo`
        : `Demo de ${trigger.dataset.title || 'proyecto'}`;
      openLink.href = url;
      frame.src = url;
      dialog.showModal();
    });
  });

  dialog.querySelector('.demo-close').addEventListener('click', () => dialog.close());
  // Clic fuera del contenido (en el fondo) también cierra
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  // Al cerrar se descarga la demo para que no siga consumiendo recursos
  dialog.addEventListener('close', () => {
    frame.removeAttribute('src');
  });
}

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
