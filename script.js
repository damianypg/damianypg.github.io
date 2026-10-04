/**
 * Portafolio de una sola página.
 * Todo el contenido se toma de data.json.
 */

document.addEventListener('DOMContentLoaded', init);

async function init() {
  document.querySelector('[data-year]').textContent = new Date().getFullYear();

  let data;
  try {
    const res = await fetch('data.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (err) {
    console.error('Error cargando data.json:', err);
    showLoadError(err);
    return;
  }

  bindText(data);
  renderProjects(data.proyectos || []);
  renderStory(data.historia || '');
  renderList('[data-tools]', data.herramientas, (tool) => `<li>${escapeHtml(tool)}</li>`);
  renderList('[data-achievements]', data.logros, (item) => `<li>${escapeHtml(item)}</li>`);
  renderList('[data-certs]', data.certificados, renderCert);
  renderList('[data-anime]', data.animes, renderAnime);
  setupSocialLinks(data.redes || {});
  setupPreviews();
  setupActiveNav();
}

function showLoadError(err) {
  const grid = document.querySelector('[data-projects]');
  const help = window.location.protocol === 'file:'
    ? 'Abre el sitio con un servidor local (por ejemplo: python3 -m http.server) para que se pueda leer data.json.'
    : 'Revisa que data.json exista junto a index.html y que su formato sea válido.';
  grid.innerHTML = `<p class="load-error">No se pudo cargar el contenido. ${help} <small>${escapeHtml(err.message)}</small></p>`;
}

function bindText(data) {
  document.querySelectorAll('[data-bind]').forEach((el) => {
    const value = data[el.dataset.bind];
    if (value) el.textContent = value;
  });

  const [first, ...rest] = (data.nombre || '').split(' ');
  if (first) document.querySelector('[data-name-first]').textContent = first;
  if (rest.length) document.querySelector('[data-name-last]').textContent = rest.join(' ');
  document.querySelector('.hero-name').setAttribute('aria-label', data.nombre);
}

function renderList(selector, items, template) {
  const el = document.querySelector(selector);
  if (!el || !Array.isArray(items)) return;
  el.innerHTML = items.map(template).join('');
}

function renderProjects(projects) {
  const grid = document.querySelector('[data-projects]');
  // El primero va destacado; si el último quedaría solo en su fila, también va a lo ancho.
  const lastAlone = projects.length > 1 && (projects.length - 1) % 2 === 1;
  grid.innerHTML = projects.map((p, i) => {
    const tech = (p.technologies || []).map((t) => `<li>${escapeHtml(t)}</li>`).join('');
    const wide = i === 0 || (lastAlone && i === projects.length - 1);
    return `
      <article class="project${wide ? ' project--feature' : ''}">
        <a class="project-link" href="${escapeHtml(p.url)}" target="_blank" rel="noopener">
          <div class="browser" aria-hidden="true">
            <div class="browser-bar"><span></span><span></span><span></span></div>
            <div class="browser-view">
              <iframe data-src="${escapeHtml(p.url)}" title="" tabindex="-1" loading="lazy"></iframe>
            </div>
          </div>
          <div class="project-info">
            <h3 class="project-name">${escapeHtml(p.name)}</h3>
            <p class="project-desc">${escapeHtml(p.description)}</p>
            <ul class="project-tech" aria-label="Tecnologías">${tech}</ul>
            <span class="project-open">Abrir proyecto<span class="visually-hidden"> ${escapeHtml(p.name)} en una pestaña nueva</span></span>
          </div>
        </a>
      </article>`;
  }).join('');
}

function renderStory(text) {
  const el = document.querySelector('[data-story]');
  el.innerHTML = text
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((para) => `<p>${escapeHtml(para.trim())}</p>`)
    .join('');
}

function renderCert(cert) {
  const hasLink = cert.link && cert.link !== '#';
  const name = escapeHtml(cert.nombre);
  return `
    <li class="cert">
      <span class="cert-name">${hasLink ? `<a href="${escapeHtml(cert.link)}" target="_blank" rel="noopener">${name}</a>` : name}</span>
      <span class="cert-org">${escapeHtml(cert.institucion)}</span>
    </li>`;
}

function renderAnime(a) {
  return `
    <li class="anime">
      <img src="${escapeHtml(a.imagen)}" alt="${escapeHtml(a.titulo)}" loading="lazy" />
      <span class="anime-title">${escapeHtml(a.titulo)}</span>
      <span class="anime-note">${escapeHtml(a.nota)}</span>
    </li>`;
}

function setupSocialLinks(redes) {
  document.querySelectorAll('[data-social]').forEach((link) => {
    const url = redes[link.dataset.social];
    if (url) link.href = url;
    else link.hidden = true;
  });
}

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
        link.toggleAttribute('aria-current', active);
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

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}
