/**
 * Portfolio SPA - Single Page Application
 * Carga dinámica de contenido desde data.json
 * Navegación sin recargas de página
 */

document.addEventListener('DOMContentLoaded', init);

let dataStore = null;

async function loadPortfolioData() {
  const scriptUrl = new URL(document.currentScript?.src || 'script.js', window.location.href);
  const scriptDir = new URL('.', scriptUrl).href;
  const pageDir = new URL('.', window.location.href).href;
  const candidates = [
    new URL('data.json', scriptDir).href,
    new URL('data.json', pageDir).href,
    new URL('./data.json', window.location.href).href,
    new URL('../data.json', window.location.href).href,
    new URL('../../data.json', window.location.href).href,
    `${window.location.origin}/data.json`,
  ];
  let lastError = null;

  for (const path of [...new Set(candidates)]) {
    try {
      const res = await fetch(path, { cache: 'no-store' });
      if (!res.ok) {
        lastError = new Error(`No se pudo cargar ${path} (HTTP ${res.status})`);
        continue;
      }

      // Algunos servidores devuelven JSON con content-type incorrecto.
      // Por compatibilidad, parseamos manualmente el texto.
      const raw = await res.text();
      const json = JSON.parse(raw);
      return json;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('No se pudo cargar data.json');
}

/**
 * Inicialización del portafolio
 */
async function init() {
  const main = document.getElementById('main-content');

  try {
    dataStore = await loadPortfolioData();

    if (!dataStore || typeof dataStore !== 'object') {
      throw new Error('data.json se cargó, pero su contenido no es un objeto válido.');
    }
  } catch (err) {
    console.error('Error cargando data.json:', err);
    const isFileProtocol = window.location.protocol === 'file:';
    const helpText = isFileProtocol
      ? 'Abre el proyecto con un servidor local (Live Server) para que fetch pueda leer data.json.'
      : 'Verifica que data.json exista y sea accesible desde esta ruta. Si usas Live Server, ejecútalo desde la carpeta raíz PORTAFOLIO.';

    const detail = err?.message ? `Detalle: ${err.message}` : 'Detalle: error desconocido';
    if (main) {
      main.innerHTML =
        `<p style="text-align: center; color: red;">Error al cargar datos.</p>
         <p style="text-align: center; color: #b0b0b0; margin-top: 8px;">${helpText}</p>
         <p style="text-align: center; color: #8f8f8f; margin-top: 6px; font-size: 0.9rem;">${detail}</p>`;
    }
    return;
  }

  try {

    const footerName = document.querySelector('.footer-name');
    const footerRole = document.querySelector('.footer-role');
    if (footerName) footerName.textContent = dataStore.nombre;
    if (footerRole) footerRole.textContent = dataStore.carrera;

    document.title = `Portafolio | ${dataStore.nombre}`;

    // Configurar enlaces de redes sociales
    setupSocialLinks();

    // Renderizar sección inicial (hero)
    showSection('hero');

    // Configurar navegación
    setupNavigation();
  } catch (err) {
    console.error('Error renderizando interfaz:', err);
    const detail = err?.message ? `Detalle: ${err.message}` : 'Detalle: error desconocido';
    if (main) {
      main.innerHTML =
        `<p style="text-align: center; color: red;">Error al renderizar la interfaz.</p>
         <p style="text-align: center; color: #8f8f8f; margin-top: 6px; font-size: 0.9rem;">${detail}</p>`;
    }
  }
}

/**
 * Configura los enlaces de redes sociales desde data.json
 */
function setupSocialLinks() {
  if (!dataStore.redes) return;

  document.querySelectorAll('.social-link[data-social]').forEach((link) => {
    const socialName = link.dataset.social;
    link.href = dataStore.redes[socialName] || '#';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  });
}

/**
 * Navegación del portafolio
 */
function showSection(sectionId) {
  // Oculta todas las secciones
  document.querySelectorAll('main > section').forEach(section => {
    section.style.display = 'none';
  });

  // Renderiza la sección seleccionada
  renderSection(sectionId);

  if (sectionId === 'proyectos') {
    setTimeout(() => {
      console.log('Mostrando Proyectos');
    }, 100);
  }

  // Actualiza menú activo
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });
  document.querySelectorAll(`[data-section="${sectionId}"]`).forEach(link => {
    link.classList.add('active');
  });
}

function setupNavigation() {
  document.querySelectorAll('.nav-link[data-section]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.dataset.section;
      showSection(section);
    });
  });
}


/**
 * Renderiza la sección solicitada
 * @param {string} section - Nombre de la sección a renderizar
 */
function renderSection(section) {
  const main = document.getElementById('main-content');
  main.innerHTML = '';
  
  let html = '';
  
  switch (section) {
    case 'hero':
      html = renderHero();
      break;
    case 'historia':
      html = renderHistoria();
      break;
    case 'logros':
      html = renderLogros();
      break;
    case 'certificados':
      html = renderCertificados();
      break;
    case 'herramientas':
      html = renderHerramientas();
      break;
    case 'proyectos':
      html = renderProyectos(dataStore.proyectos);
      break;
    default:
      html = '<p style="text-align: center;">Sección no encontrada.</p>';
  }
  
  main.insertAdjacentHTML('beforeend', html);
  
  // Agregar listeners a botones si existen
  if (section === 'hero') {
    setupHeroButtonListener();
    setTimeout(() => initGaleriaCarousel(), 100);
  }
}

function resolveProjectUrl(path) {
  if (!path) return './proyectos/tuenti/index.html';
  if (/^(https?:|file:|\/)/i.test(path)) return path;

  const cleanPath = path.replace(/^\.\//, '');
  const currentUrl = new URL(window.location.href);
  const baseHref = /\.[a-z0-9]+$/i.test(currentUrl.pathname)
    ? new URL('.', currentUrl.href).href
    : `${currentUrl.href.replace(/\/$/, '')}/`;

  return new URL(cleanPath, baseHref).href;
}

/**
 * Render de sección Hero
 */
function renderHero() {
  return `
    <section id="hero" class="section hero">
      <div class="hero-shell">
        <div class="hero-copy-card glass-card">
          <div class="hero-avatar-wrap">
            <img src="./img/img-yo.png" alt="Foto de perfil de ${dataStore.nombre}" class="hero-avatar" />
          </div>
          <p class="hero-eyebrow">Software Engineer Portfolio</p>
          <h1 class="hero-name">${dataStore.nombre}</h1>
          <p class="hero-role">${dataStore.carrera}</p>
          <p class="hero-description">${dataStore.descripcionBreve}</p>
          <div class="hero-actions">
            <button class="btn btn-primary" data-section="proyectos">Portafolio</button>
            <a class="btn btn-secondary" href="./img/cv-yo.pdf" download="cv-yo.pdf">Descargar CV</a>
          </div>
        </div>
        <aside class="hero-status-panel glass-card">
          <div class="status-chip">
            <span class="status-dot"></span>
            Disponible para proyectos frontend
          </div>
          <div class="hero-metrics">
            <article>
              <strong>${(dataStore.proyectos || []).length}</strong>
              <span>Proyecto destacado</span>
            </article>
            <article>
              <strong>${(dataStore.certificados || []).length}</strong>
              <span>Certificados</span>
            </article>
            <article>
              <strong>${(dataStore.herramientas || []).length}</strong>
              <span>Herramientas</span>
            </article>
          </div>
          <p class="hero-side-copy">Interfaz limpia, enfoque en detalle visual y una base adaptable para seguir creciendo el portafolio.</p>
        </aside>
      </div>
      <div class="hero-anime-carousel">
        <div class="anime-feature-card">
          <div class="anime-feature-header">
            <h3 class="section-title hero-carousel-title">Animes favoritos</h3>
            <p class="anime-feature-copy">Una selección personal con sagas memorables, estilos visuales potentes y mundos que siempre vale la pena revisitar.</p>
          </div>
          <div class="mzaCarousel" id="mzaCarousel" aria-roledescription="carousel" aria-label="Animes favoritos">
            <div class="mzaCarousel-viewport" tabindex="0">
              <div class="mzaCarousel-track">
                <article class="mzaCarousel-slide" role="group" aria-roledescription="slide" aria-label="1 of 5">
                  <div class="mzaCard" style="--mzaCard-bg:url('./img/img-1.jpg');">
                    <header class="mzaCard-head mzaPar-1">
                      <h2 class="mzaCard-title">One Piece</h2>
                      <p class="mzaCard-kicker">Aventura en alta mar</p>
                    </header>
                    <p class="mzaCard-text mzaPar-2">Una travesia epica por el Grand Line junto a los Sombrero de Paja en busca del tesoro legendario.</p>
                    <footer class="mzaCard-actions mzaPar-3"><button class="mzaBtn" type="button">Ver tripulacion</button></footer>
                  </div>
                </article>

                <article class="mzaCarousel-slide" role="group" aria-roledescription="slide" aria-label="2 of 5">
                  <div class="mzaCard" style="--mzaCard-bg:url('./img/img-2.webp');">
                    <header class="mzaCard-head mzaPar-1">
                      <h2 class="mzaCard-title">Naruto</h2>
                      <p class="mzaCard-kicker">El camino del ninja</p>
                    </header>
                    <p class="mzaCard-text mzaPar-2">Determinacion, amistad y superacion en cada batalla para convertirse en Hokage.</p>
                    <footer class="mzaCard-actions mzaPar-3"><button class="mzaBtn" type="button">Ver aldea</button></footer>
                  </div>
                </article>

                <article class="mzaCarousel-slide" role="group" aria-roledescription="slide" aria-label="3 of 5">
                  <div class="mzaCard" style="--mzaCard-bg:url('./img/img-3.jpg');">
                    <header class="mzaCard-head mzaPar-1">
                      <h2 class="mzaCard-title">Bleach</h2>
                      <p class="mzaCard-kicker">Poder de shinigami</p>
                    </header>
                    <p class="mzaCard-text mzaPar-2">Combates intensos entre mundos espirituales con zanpakuto, bankai y energia desbordante.</p>
                    <footer class="mzaCard-actions mzaPar-3"><button class="mzaBtn" type="button">Ver batalla</button></footer>
                  </div>
                </article>

                <article class="mzaCarousel-slide" role="group" aria-roledescription="slide" aria-label="4 of 5">
                  <div class="mzaCard" style="--mzaCard-bg:url('./img/img-4.jpg');">
                    <header class="mzaCard-head mzaPar-1">
                      <h2 class="mzaCard-title">Black Clover</h2>
                      <p class="mzaCard-kicker">Magia y voluntad</p>
                    </header>
                    <p class="mzaCard-text mzaPar-2">Asta desafia todos los limites con su antimagia para alcanzar su sueno de Rey Mago.</p>
                    <footer class="mzaCard-actions mzaPar-3"><button class="mzaBtn" type="button">Ver escuadron</button></footer>
                  </div>
                </article>

                <article class="mzaCarousel-slide" role="group" aria-roledescription="slide" aria-label="5 of 5">
                  <div class="mzaCard" style="--mzaCard-bg:url('./img/img-5.webp');">
                    <header class="mzaCard-head mzaPar-1">
                      <h2 class="mzaCard-title">Hunter x Hunter</h2>
                      <p class="mzaCard-kicker">Cazadores y Nen</p>
                    </header>
                    <p class="mzaCard-text mzaPar-2">Una aventura estrategica llena de examenes, misterios y poderes Nen en cada arco.</p>
                    <footer class="mzaCard-actions mzaPar-3"><button class="mzaBtn" type="button">Ver mision</button></footer>
                  </div>
                </article>
              </div>
            </div>

            <div class="mzaCarousel-controls" aria-label="Controls">
              <button class="mzaCarousel-prev" aria-label="Previous slide" type="button">‹</button>
              <button class="mzaCarousel-next" aria-label="Next slide" type="button">›</button>
            </div>

            <div class="mzaCarousel-pagination" role="tablist" aria-label="Slide navigation"></div>
            <div class="mzaCarousel-progress" aria-hidden="true"><span class="mzaCarousel-progressBar"></span></div>
          </div>
        </div>
      </div>
    </section>
  `;
}

/**
 * Render de sección Historia
 */
function renderHistoria() {
  const paragraphs = dataStore.historia
    .split('\n\n')
    .map((paragraph, index) => `
      <article class="story-card glass-card">
        <span class="story-index">0${index + 1}</span>
        <p>${paragraph}</p>
      </article>
    `)
    .join('');

  return `
    <section id="historia" class="section content-section">
      <div class="section-heading">
        <p class="section-kicker">Trayectoria</p>
        <h2 class="section-title">Mi Historia</h2>
      </div>
      <div class="story-grid">
        ${paragraphs}
      </div>
    </section>
  `;
}

/**
 * Render de sección Logros
 */
function renderLogros() {
  if (!dataStore.logros || dataStore.logros.length === 0) {
    return `
      <section id="logros" class="section">
        <h2 class="section-title">Logros</h2>
        <p style="text-align: center; color: #b0b0b0;">No hay logros registrados aún.</p>
      </section>
    `;
  }

  const items = dataStore.logros
    .map(logro => `<li>${logro}</li>`)
    .join('');

  return `
    <section id="logros" class="section content-section">
      <div class="section-heading">
        <p class="section-kicker">Impacto</p>
        <h2 class="section-title">Logros</h2>
      </div>
      <ul class="list achievement-grid">
        ${items}
      </ul>
    </section>
  `;
}

/**
 * Render de sección Certificados
 */
function renderCertificados() {
  if (!dataStore.certificados || dataStore.certificados.length === 0) {
    return `
      <section id="certificados" class="section">
        <h2 class="section-title">Certificados</h2>
        <p style="text-align: center; color: #b0b0b0;">No hay certificados registrados aún.</p>
      </section>
    `;
  }

  const cards = dataStore.certificados
    .map(cert => `
      <a class="cert-card cert-download" href="./img/webMasterCertificate.pdf" download="webMasterCertificate.pdf" title="Descargar certificado ${cert.nombre}" aria-label="Descargar certificado ${cert.nombre}">
        <div class="cert-icon"><i class="fa-solid fa-award"></i></div>
        <div class="cert-info">
          <div class="cert-name">${cert.nombre}</div>
          <div class="cert-institution">${cert.institucion}</div>
        </div>
      </a>
    `)
    .join('');

  return `
    <section id="certificados" class="section content-section">
      <div class="section-heading">
        <p class="section-kicker">Validación</p>
        <h2 class="section-title">Certificados</h2>
      </div>
      <div class="certificates">
        ${cards}
      </div>
    </section>
  `;
}

/**
 * Render de sección Herramientas
 */
function renderHerramientas() {
  if (!dataStore.herramientas || dataStore.herramientas.length === 0) {
    return `
      <section id="herramientas" class="section">
        <h2 class="section-title">Herramientas y Tecnologías</h2>
        <p style="text-align: center; color: #b0b0b0;">No hay herramientas registradas aún.</p>
      </section>
    `;
  }

  const tools = dataStore.herramientas
    .map(tool => `
      <div class="tool-card glass-card">
        <div class="tool-icon"><i class="fa-solid fa-code"></i></div>
        <span>${tool}</span>
      </div>
    `)
    .join('');

  return `
    <section id="herramientas" class="section content-section">
      <div class="section-heading">
        <p class="section-kicker">Stack</p>
        <h2 class="section-title">Herramientas y Tecnologías</h2>
      </div>
      <div class="tools-grid">
        ${tools}
      </div>
    </section>
  `;
}

/**
 * Render de sección Proyectos
 */
function renderProyectos(proyectos) {
  const cards = proyectos
    .map(proyecto => {
      const tags = (proyecto.tags || proyecto.technologies || []).slice(0, 3);
      const projectUrl = resolveProjectUrl(proyecto.url || 'proyectos/tuenti/index.html');
      return `
      <div class="project-card glass-card">
        <div class="project-card-top">
          <span class="project-badge">Proyecto</span>
          <h3>${proyecto.name}</h3>
          <p>${proyecto.description}</p>
        </div>
        <ul class="project-tags">
          ${tags.map(tag => `<li>${tag}</li>`).join('')}
        </ul>
        <a href="${projectUrl}" target="_blank" rel="noopener noreferrer" class="view-project-btn">Ver proyecto &rarr;</a>
      </div>
    `;
    })
    .join('');

  return `
    <section id="proyectos" class="section content-section">
      <div class="section-heading">
        <p class="section-kicker">Builds</p>
        <h2 class="section-title">Proyectos</h2>
      </div>
      <div class="projects-grid">
        ${cards}
      </div>
    </section>
  `;
}

/**
 * Render de sección Galería
 */
function renderGaleria() {
  return `
    <section id="galeria" class="section">
      <h2 class="section-title">Galería Interactiva</h2>
      <div class="mzaCarousel" id="mzaCarousel" aria-roledescription="carousel" aria-label="Galería de imágenes">
        <div class="mzaCarousel-viewport" tabindex="0">
          <div class="mzaCarousel-track">
            <article class="mzaCarousel-slide" role="group" aria-roledescription="slide" aria-label="1 of 5">
              <div class="mzaCard" style="--mzaCard-bg:url('./img/img-1.png');">
                <header class="mzaCard-head mzaPar-1">
                  <h2 class="mzaCard-title">Imagen 1</h2>
                  <p class="mzaCard-kicker">Portafolio</p>
                </header>
                <p class="mzaCard-text mzaPar-2">Primera imagen de la galería interactiva.</p>
                <footer class="mzaCard-actions mzaPar-3"><button class="mzaBtn">Ver más</button></footer>
              </div>
            </article>

            <article class="mzaCarousel-slide" role="group" aria-roledescription="slide" aria-label="2 of 5">
              <div class="mzaCard" style="--mzaCard-bg:url('./img/img-2.png');">
                <header class="mzaCard-head mzaPar-1">
                  <h2 class="mzaCard-title">Imagen 2</h2>
                  <p class="mzaCard-kicker">Portafolio</p>
                </header>
                <p class="mzaCard-text mzaPar-2">Segunda imagen de la galería interactiva.</p>
                <footer class="mzaCard-actions mzaPar-3"><button class="mzaBtn">Ver más</button></footer>
              </div>
            </article>

            <article class="mzaCarousel-slide" role="group" aria-roledescription="slide" aria-label="3 of 5">
              <div class="mzaCard" style="--mzaCard-bg:url('./img/img-3.png');">
                <header class="mzaCard-head mzaPar-1">
                  <h2 class="mzaCard-title">Imagen 3</h2>
                  <p class="mzaCard-kicker">Portafolio</p>
                </header>
                <p class="mzaCard-text mzaPar-2">Tercera imagen de la galería interactiva.</p>
                <footer class="mzaCard-actions mzaPar-3"><button class="mzaBtn">Ver más</button></footer>
              </div>
            </article>

            <article class="mzaCarousel-slide" role="group" aria-roledescription="slide" aria-label="4 of 5">
              <div class="mzaCard" style="--mzaCard-bg:url('./img/img-4.png');">
                <header class="mzaCard-head mzaPar-1">
                  <h2 class="mzaCard-title">Imagen 4</h2>
                  <p class="mzaCard-kicker">Portafolio</p>
                </header>
                <p class="mzaCard-text mzaPar-2">Cuarta imagen de la galería interactiva.</p>
                <footer class="mzaCard-actions mzaPar-3"><button class="mzaBtn">Ver más</button></footer>
              </div>
            </article>

            <article class="mzaCarousel-slide" role="group" aria-roledescription="slide" aria-label="5 of 5">
              <div class="mzaCard" style="--mzaCard-bg:url('./img/img-5.png');">
                <header class="mzaCard-head mzaPar-1">
                  <h2 class="mzaCard-title">Imagen 5</h2>
                  <p class="mzaCard-kicker">Portafolio</p>
                </header>
                <p class="mzaCard-text mzaPar-2">Quinta imagen de la galería interactiva.</p>
                <footer class="mzaCard-actions mzaPar-3"><button class="mzaBtn">Ver más</button></footer>
              </div>
            </article>
          </div>
        </div>

        <div class="mzaCarousel-controls" aria-label="Controles">
          <button class="mzaCarousel-prev" aria-label="Slide anterior" type="button">‹</button>
          <button class="mzaCarousel-next" aria-label="Siguiente slide" type="button">›</button>
        </div>

        <div class="mzaCarousel-pagination" role="tablist" aria-label="Navegación de slides"></div>
        <div class="mzaCarousel-progress" aria-hidden="true"><span class="mzaCarousel-progressBar"></span></div>
      </div>
    </section>
  `;
}

/**
 * Configura listener del botón en sección hero
 */
function setupHeroButtonListener() {
  document.querySelectorAll('.btn[data-section]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const navLink = document.querySelector(`.nav-link[data-section="${btn.dataset.section}"]`);
      navLink?.click();
    });
  });
}

/**
 * Efecto scroll suave cuando se hace click en nav links
 */
document.addEventListener('click', (e) => {
  const navLink = e.target.closest('.nav-link');
  if (navLink) {
    // Scroll suave a top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

/**
 * Clase del Carrusel Interactivo
 */
class MzaCarousel {
  constructor(root, opts = {}) {
    this.root = root;
    this.viewport = root.querySelector(".mzaCarousel-viewport");
    this.track = root.querySelector(".mzaCarousel-track");
    this.slides = Array.from(root.querySelectorAll(".mzaCarousel-slide"));
    this.prevBtn = root.querySelector(".mzaCarousel-prev");
    this.nextBtn = root.querySelector(".mzaCarousel-next");
    this.pagination = root.querySelector(".mzaCarousel-pagination");
    this.progressBar = root.querySelector(".mzaCarousel-progressBar");
    this.isFF = typeof InstallTrigger !== "undefined";
    this.n = this.slides.length;
    this.state = {
      index: 0,
      pos: 0,
      width: 0,
      height: 0,
      gap: 28,
      dragging: false,
      pointerId: null,
      x0: 0,
      v: 0,
      t0: 0,
      animating: false,
      hovering: false,
      startTime: 0,
      pausedAt: 0,
      rafId: 0
    };
    this.opts = Object.assign(
      {
        gap: 28,
        peek: 0.15,
        rotateY: 34,
        zDepth: 150,
        scaleDrop: 0.09,
        blurMax: 2.0,
        activeLeftBias: 0.12,
        interval: 4500,
        transitionMs: 900,
        keyboard: true,
        breakpoints: [
          {
            mq: "(max-width: 1200px)",
            gap: 24,
            peek: 0.12,
            rotateY: 28,
            zDepth: 120,
            scaleDrop: 0.08,
            activeLeftBias: 0.1
          },
          {
            mq: "(max-width: 1000px)",
            gap: 18,
            peek: 0.09,
            rotateY: 22,
            zDepth: 90,
            scaleDrop: 0.07,
            activeLeftBias: 0.09
          },
          {
            mq: "(max-width: 768px)",
            gap: 14,
            peek: 0.06,
            rotateY: 16,
            zDepth: 70,
            scaleDrop: 0.06,
            activeLeftBias: 0.08
          },
          {
            mq: "(max-width: 560px)",
            gap: 12,
            peek: 0.05,
            rotateY: 12,
            zDepth: 60,
            scaleDrop: 0.05,
            activeLeftBias: 0.07
          }
        ]
      },
      opts
    );
    if (this.isFF) {
      this.opts.rotateY = 10;
      this.opts.zDepth = 0;
      this.opts.blurMax = 0;
    }
    this._init();
  }
  _init() {
    this._setupDots();
    this._bind();
    this._preloadImages();
    this._measure();
    this.goTo(0, false);
    this._startCycle();
    this._loop();
  }
  _preloadImages() {
    this.slides.forEach((sl) => {
      const card = sl.querySelector(".mzaCard");
      const bg = getComputedStyle(card).getPropertyValue("--mzaCard-bg");
      const m = /url\((?:'|")?([^'")]+)(?:'|")?\)/.exec(bg);
      if (m && m[1]) {
        const img = new Image();
        img.src = m[1];
      }
    });
  }
  _setupDots() {
    this.pagination.innerHTML = "";
    this.dots = this.slides.map((_, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "mzaCarousel-dot";
      b.setAttribute("role", "tab");
      b.setAttribute("aria-label", `Ir al slide ${i + 1}`);
      b.addEventListener("click", () => {
        this.goTo(i);
      });
      this.pagination.appendChild(b);
      return b;
    });
  }
  _bind() {
    this.prevBtn.addEventListener("click", () => {
      this.prev();
    });
    this.nextBtn.addEventListener("click", () => {
      this.next();
    });
    if (this.opts.keyboard) {
      this.root.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft") this.prev();
        if (e.key === "ArrowRight") this.next();
      });
    }
    const pe = this.viewport;
    pe.addEventListener("pointerdown", (e) => this._onDragStart(e));
    pe.addEventListener("pointermove", (e) => this._onDragMove(e));
    pe.addEventListener("pointerup", (e) => this._onDragEnd(e));
    pe.addEventListener("pointercancel", (e) => this._onDragEnd(e));
    this.root.addEventListener("mouseenter", () => {
      this.state.hovering = true;
      this.state.pausedAt = performance.now();
    });
    this.root.addEventListener("mouseleave", () => {
      if (this.state.pausedAt) {
        this.state.startTime += performance.now() - this.state.pausedAt;
        this.state.pausedAt = 0;
      }
      this.state.hovering = false;
    });
    this.ro = new ResizeObserver(() => this._measure());
    this.ro.observe(this.viewport);
    this.opts.breakpoints.forEach((bp) => {
      const m = window.matchMedia(bp.mq);
      const apply = () => {
        Object.keys(bp).forEach((k) => {
          if (k !== "mq") this.opts[k] = bp[k];
        });
        this._measure();
        this._render();
      };
      if (m.addEventListener) m.addEventListener("change", apply);
      else m.addListener(apply);
      if (m.matches) apply();
    });
    this.viewport.addEventListener("pointermove", (e) => this._onTilt(e));
    window.addEventListener("orientationchange", () =>
      setTimeout(() => this._measure(), 250)
    );
  }
  _measure() {
    const viewRect = this.viewport.getBoundingClientRect();
    const rootRect = this.root.getBoundingClientRect();
    const pagRect = this.pagination.getBoundingClientRect();
    const bottomGap = Math.max(
      12,
      Math.round(rootRect.bottom - pagRect.bottom)
    );
    const pagSpace = pagRect.height + bottomGap;
    const availH = viewRect.height - pagSpace;
    const cardH = Math.max(320, Math.min(640, Math.round(availH)));
    this.state.width = viewRect.width;
    this.state.height = viewRect.height;
    this.state.gap = this.opts.gap;
    this.slideW = Math.min(880, this.state.width * (1 - this.opts.peek * 2));
    this.root.style.setProperty("--mzaPagH", `${pagSpace}px`);
    this.root.style.setProperty("--mzaCardH", `${cardH}px`);
  }
  _onTilt(e) {
    const r = this.viewport.getBoundingClientRect();
    const mx = (e.clientX - r.left) / r.width - 0.5;
    const my = (e.clientY - r.top) / r.height - 0.5;
    this.root.style.setProperty("--mzaTiltX", (my * -6).toFixed(3));
    this.root.style.setProperty("--mzaTiltY", (mx * 6).toFixed(3));
  }
  _onDragStart(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    this.state.dragging = true;
    this.state.pointerId = e.pointerId;
    this.viewport.setPointerCapture(e.pointerId);
    this.state.x0 = e.clientX;
    this.state.t0 = performance.now();
    this.state.v = 0;
    this.state.pausedAt = performance.now();
  }
  _onDragMove(e) {
    if (!this.state.dragging || e.pointerId !== this.state.pointerId) return;
    const dx = e.clientX - this.state.x0;
    const dt = Math.max(16, performance.now() - this.state.t0);
    this.state.v = dx / dt;
    const slideSpan = this.slideW + this.state.gap;
    this.state.pos = this._mod(this.state.index - dx / slideSpan, this.n);
    this._render();
  }
  _onDragEnd(e) {
    if (!this.state.dragging || (e && e.pointerId !== this.state.pointerId))
      return;
    this.state.dragging = false;
    try {
      if (this.state.pointerId != null)
        this.viewport.releasePointerCapture(this.state.pointerId);
    } catch {}
    this.state.pointerId = null;
    if (this.state.pausedAt) {
      this.state.startTime += performance.now() - this.state.pausedAt;
      this.state.pausedAt = 0;
    }
    const v = this.state.v;
    const threshold = 0.18;
    let target = Math.round(
      this.state.pos - Math.sign(v) * (Math.abs(v) > threshold ? 0.5 : 0)
    );
    this.goTo(this._mod(target, this.n));
  }
  _startCycle() {
    this.state.startTime = performance.now();
    this._renderProgress(0);
  }
  _loop() {
    const step = (t) => {
      if (
        !this.state.dragging &&
        !this.state.hovering &&
        !this.state.animating
      ) {
        const elapsed = t - this.state.startTime;
        const p = Math.min(1, elapsed / this.opts.interval);
        this._renderProgress(p);
        if (elapsed >= this.opts.interval) this.next();
      }
      this.state.rafId = requestAnimationFrame(step);
    };
    this.state.rafId = requestAnimationFrame(step);
  }
  _renderProgress(p) {
    this.progressBar.style.transform = `scaleX(${p})`;
  }
  prev() {
    this.goTo(this._mod(this.state.index - 1, this.n));
  }
  next() {
    this.goTo(this._mod(this.state.index + 1, this.n));
  }
  goTo(i, animate = true) {
    const start = this.state.pos || this.state.index;
    const end = this._nearest(start, i);
    const dur = animate ? this.opts.transitionMs : 0;
    const t0 = performance.now();
    const ease = (x) => 1 - Math.pow(1 - x, 4);
    this.state.animating = true;
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      const p = dur ? ease(t) : 1;
      this.state.pos = start + (end - start) * p;
      this._render();
      if (t < 1) requestAnimationFrame(step);
      else this._afterSnap(i);
    };
    requestAnimationFrame(step);
  }
  _afterSnap(i) {
    this.state.index = this._mod(Math.round(this.state.pos), this.n);
    this.state.pos = this.state.index;
    this.state.animating = false;
    this._render(true);
    this._startCycle();
  }
  _nearest(from, target) {
    let d = target - Math.round(from);
    if (d > this.n / 2) d -= this.n;
    if (d < -this.n / 2) d += this.n;
    return Math.round(from) + d;
  }
  _mod(i, n) {
    return ((i % n) + n) % n;
  }
  _render(markActive = false) {
    const span = this.slideW + this.state.gap;
    const tiltX = parseFloat(
      this.root.style.getPropertyValue("--mzaTiltX") || 0
    );
    const tiltY = parseFloat(
      this.root.style.getPropertyValue("--mzaTiltY") || 0
    );
    for (let i = 0; i < this.n; i++) {
      let d = i - this.state.pos;
      if (d > this.n / 2) d -= this.n;
      if (d < -this.n / 2) d += this.n;
      const weight = Math.max(0, 1 - Math.abs(d) * 2);
      const biasActive = -this.slideW * this.opts.activeLeftBias * weight;
      const tx = d * span + biasActive;
      const depth = -Math.abs(d) * this.opts.zDepth;
      const rot = -d * this.opts.rotateY;
      const scale = 1 - Math.min(Math.abs(d) * this.opts.scaleDrop, 0.42);
      const blur = Math.min(Math.abs(d) * this.opts.blurMax, this.opts.blurMax);
      const z = Math.round(1000 - Math.abs(d) * 10);
      const s = this.slides[i];
      if (this.isFF) {
        s.style.transform = `translate(${tx}px,-50%) scale(${scale})`;
        s.style.filter = "none";
      } else {
        s.style.transform = `translate3d(${tx}px,-50%,${depth}px) rotateY(${rot}deg) scale(${scale})`;
        s.style.filter = `blur(${blur}px)`;
      }
      s.style.zIndex = z;
      if (markActive)
        s.dataset.state =
          Math.round(this.state.index) === i ? "active" : "rest";
      const card = s.querySelector(".mzaCard");
      const parBase = Math.max(-1, Math.min(1, -d));
      const parX = parBase * 48 + tiltY * 2.0;
      const parY = tiltX * -1.5;
      const bgX = parBase * -64 + tiltY * -2.4;
      card.style.setProperty("--mzaParX", `${parX.toFixed(2)}px`);
      card.style.setProperty("--mzaParY", `${parY.toFixed(2)}px`);
      card.style.setProperty("--mzaParBgX", `${bgX.toFixed(2)}px`);
      card.style.setProperty("--mzaParBgY", `${(parY * 0.35).toFixed(2)}px`);
    }
    const active = this._mod(Math.round(this.state.pos), this.n);
    this.dots.forEach((d, i) =>
      d.setAttribute("aria-selected", i === active ? "true" : "false")
    );
  }
}

/**
 * Inicializar el carrusel cuando se carga la sección galeria
 */
function initGaleriaCarousel() {
  const carousel = document.getElementById("mzaCarousel");
  if (carousel) {
    new MzaCarousel(carousel, {
      transitionMs: 900
    });
  }
}
