/**
 * Genera e inyecta el @keyframes "flashTransition" dinámicamente.
 *
 * En cada punto de cambio de imagen (cada 7.69% del ciclo de 5s),
 * la opacidad del slideshow baja brevemente a 0.08 (negro casi total)
 * y sube de nuevo → simula un corte de película cinematográfico.
 *
 * Se añade como tercera animación al .slideshow en el mismo instante
 * para que los tres timings (slideshow, kenburns, flash) arranquen juntos.
 */
(function () {
  const TOTAL_IMAGES = 13;
  const HALF_FLASH   = 1.3;   // rango del destello en puntos porcentuales

  const stops = [];

  // Asegurar opacidad 1 al inicio
  stops.push('0% { opacity: 1 }');

  for (let i = 1; i < TOTAL_IMAGES; i++) {
    const center = (i / TOTAL_IMAGES) * 100;
    const before = (center - HALF_FLASH).toFixed(2);
    const after  = (center + HALF_FLASH).toFixed(2);

    stops.push(`${before}% { opacity: 1    }`);
    stops.push(`${center.toFixed(2)}% { opacity: 0.08 }`);
    stops.push(`${after}%  { opacity: 1    }`);
  }

  stops.push('100% { opacity: 1 }');

  // Construir y añadir el bloque CSS
  const css = `@keyframes flashTransition {\n  ${stops.join('\n  ')}\n}`;
  const styleTag = document.createElement('style');
  styleTag.textContent = css;
  document.head.appendChild(styleTag);

  // Añadir la animación al .slideshow (ya existe en el DOM en este momento)
  const slideshow = document.querySelector('.slideshow');
  if (slideshow) {
    slideshow.style.animation += ', flashTransition 5s linear infinite';
  }
})();
