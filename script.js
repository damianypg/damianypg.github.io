/**
 * Portfolio SPA - Single Page Application
 * Carga dinámica de contenido desde data.json
 * Navegación sin recargas de página
 */

document.addEventListener('DOMContentLoaded', init);

let dataStore = null;

/**
 * Inicialización del portafolio
 */
async function init() {
  try {
    const res = await fetch('data.json');
    if (!res.ok) throw new Error('Error al cargar data.json');
    dataStore = await res.json();
    
    // Actualizar nombre en logo
    document.querySelector('.logo').textContent = dataStore.nombre;
    document.title = `Portafolio | ${dataStore.nombre}`;
    
    // Configurar enlaces de redes sociales
    setupSocialLinks();
    
    // Renderizar sección inicial (hero)
    renderSection('hero');
    
    // Configurar navegación
    setupNavigation();
  } catch (err) {
    console.error('Error inicializando portafolio:', err);
    document.getElementById('main-content').innerHTML = 
      '<p style="text-align: center; color: red;">Error al cargar datos. Verifica data.json</p>';
  }
}

/**
 * Configura los enlaces de redes sociales desde data.json
 */
function setupSocialLinks() {
  const whatsappEl = document.getElementById('whatsapp');
  const instagramEl = document.getElementById('instagram');
  const linkedinEl = document.getElementById('linkedin');

  if (dataStore.redes) {
    whatsappEl.href = dataStore.redes.whatsapp || '#';
    whatsappEl.target = '_blank';
    
    instagramEl.href = dataStore.redes.instagram || '#';
    instagramEl.target = '_blank';
    
    linkedinEl.href = dataStore.redes.linkedin || '#';
    linkedinEl.target = '_blank';
  }
}

/**
 * Configura click listeners en elementos de navegación
 */
function setupNavigation() {
  const items = document.querySelectorAll('.nav-item');
  items.forEach(item => {
    item.addEventListener('click', (e) => {
      const section = item.dataset.section;
      if (!item.classList.contains('active')) {
        // Remover clase active de todos
        document.querySelectorAll('.nav-item').forEach(nav => {
          nav.classList.remove('active');
        });
        // Agregar clase active al clickeado
        item.classList.add('active');
        // Renderizar sección
        renderSection(section);
      }
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
    default:
      html = '<p style="text-align: center;">Sección no encontrada.</p>';
  }
  
  main.insertAdjacentHTML('beforeend', html);
  
  // Agregar listeners a botones si existen
  if (section === 'hero') {
    setupHeroButtonListener();
  }
}

/**
 * Render de sección Hero
 */
function renderHero() {
  return `
    <section class="section hero">
      <h2>${dataStore.nombre}</h2>
      <p><em>${dataStore.carrera}</em></p>
      <p>${dataStore.descripcionBreve}</p>
      <button class="btn" data-section="historia">Ver mi historia</button>
    </section>
  `;
}

/**
 * Render de sección Historia
 */
function renderHistoria() {
  return `
    <section class="section">
      <h2 class="section-title">Mi Historia</h2>
      <div class="historia-content">
        ${dataStore.historia}
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
      <section class="section">
        <h2 class="section-title">Logros</h2>
        <p style="text-align: center; color: #b0b0b0;">No hay logros registrados aún.</p>
      </section>
    `;
  }

  const items = dataStore.logros
    .map(logro => `<li>${logro}</li>`)
    .join('');

  return `
    <section class="section">
      <h2 class="section-title">Logros</h2>
      <ul class="list">
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
      <section class="section">
        <h2 class="section-title">Certificados</h2>
        <p style="text-align: center; color: #b0b0b0;">No hay certificados registrados aún.</p>
      </section>
    `;
  }

  const cards = dataStore.certificados
    .map(cert => `
      <div class="cert-card">
        <div class="cert-info">
          <div class="cert-name">${cert.nombre}</div>
          <div class="cert-institution">${cert.institucion}</div>
        </div>
        <a href="${cert.link || '#'}" target="_blank">Ver Certificado</a>
      </div>
    `)
    .join('');

  return `
    <section class="section">
      <h2 class="section-title">Certificados</h2>
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
      <section class="section">
        <h2 class="section-title">Herramientas y Tecnologías</h2>
        <p style="text-align: center; color: #b0b0b0;">No hay herramientas registradas aún.</p>
      </section>
    `;
  }

  const tools = dataStore.herramientas
    .map(tool => `<div class="tool-card">${tool}</div>`)
    .join('');

  return `
    <section class="section">
      <h2 class="section-title">Herramientas y Tecnologías</h2>
      <div class="tools-grid">
        ${tools}
      </div>
    </section>
  `;
}

/**
 * Configura listener del botón en sección hero
 */
function setupHeroButtonListener() {
  const btn = document.querySelector('.btn[data-section="historia"]');
  if (btn) {
    btn.addEventListener('click', () => {
      const navItem = document.querySelector('.nav-item[data-section="historia"]');
      navItem.click();
    });
  }
}

/**
 * Efecto scroll suave cuando se hace click en nav items
 */
document.addEventListener('click', (e) => {
  if (e.target.matches('.nav-item')) {
    // Scroll suave a top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});