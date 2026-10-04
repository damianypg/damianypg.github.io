/**
 * Interacciones del portafolio.
 * El contenido vive en el HTML; aquí solo hay comportamiento.
 */

document.addEventListener('DOMContentLoaded', () => {
  setupDemos();
  setupActiveNav();
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
      frame.title = `Demo de ${trigger.dataset.title || 'proyecto'}`;
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
