/**
 * Interacciones del portafolio.
 * El contenido vive en el HTML; aquí solo hay comportamiento.
 */

document.addEventListener('DOMContentLoaded', () => {
  setupPreviews();
  setupActiveNav();
});

/**
 * Las vistas previas son los proyectos reales dentro de un iframe.
 * Se cargan al acercarse a la pantalla y se escalan para que el
 * proyecto se vea como en un escritorio de 1280px de ancho.
 */
function setupPreviews() {
  const DESKTOP_WIDTH = 1280;
  const views = document.querySelectorAll('.browser-view');

  const resize = new ResizeObserver((entries) => {
    entries.forEach(({ target, contentRect }) => {
      target.style.setProperty('--scale', contentRect.width / DESKTOP_WIDTH);
    });
  });

  const loader = new IntersectionObserver((entries) => {
    entries.forEach(({ isIntersecting, target }) => {
      if (!isIntersecting) return;
      const frame = target.querySelector('iframe');
      frame.src = frame.dataset.src;
      loader.unobserve(target);
    });
  }, { rootMargin: '400px 0px' });

  views.forEach((view) => {
    resize.observe(view);
    loader.observe(view);
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
