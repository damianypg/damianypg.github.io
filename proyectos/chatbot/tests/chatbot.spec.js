const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const URL = '/index.html?ahora=2026-10-10T14:30';

async function ask(page, q) {
  const before = await page.locator('.msg--bot:not(.typing)').count();
  await page.fill('#msg', q);
  await page.keyboard.press('Enter');
  await expect(page.locator('.msg--bot:not(.typing)')).toHaveCount(before + 1, { timeout: 8000 });
  await expect(page.locator('#form')).not.toHaveAttribute('aria-busy', 'true');
}
const lastBot = (page) => page.locator('.msg--bot:not(.typing)').last();

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.errors = errors;
  await page.goto(URL);
});
test.afterEach(async ({ page }) => { expect(page.errors).toEqual([]); });

test('abre con el saludo de Rosita y sugerencias', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pregúntale a Rosita');
  await expect(lastBot(page)).toContainText('Soy Rosita');
  await expect(page.locator('#chips .chip')).toHaveCount(4);
  await expect(page.locator('#think-body')).toContainText('Escribe algo');
});

test('responde una pregunta y muestra cómo pensó', async ({ page }) => {
  await ask(page, 'a que hora abren');
  await expect(lastBot(page)).toContainText('Martes a sábado');
  await expect(page.locator('.tok.hit').first()).toBeVisible();
  await expect(page.locator('.bars li.win .name')).toContainText('Horarios');
  const w = await page.locator('.bars li.win .fill').evaluate((el) => el.style.width);
  expect(w).toBe('100%');
});

test('entiende errores de ortografía y recuerda el plato', async ({ page }) => {
  await ask(page, 'ke tal el ornado');
  await expect(lastBot(page)).toContainText('Hornado con mote');
  await expect(page.locator('.tok.ent')).toContainText('ornado');
  await ask(page, 'y cuanto cuesta');
  await expect(lastBot(page)).toContainText('$7.50 + IVA');
  await expect(page.locator('.note')).toContainText('Hornado con mote');
  await ask(page, 'pica?');
  await expect(lastBot(page)).toContainText('ají casero');
});

test('calcula una cuenta con IVA', async ({ page }) => {
  await ask(page, '2 hornados y 3 jugos');
  const bot = lastBot(page);
  await expect(bot).toContainText('Subtotal: $19.50');
  await expect(bot).toContainText('IVA (15 %): $2.93');
  await expect(bot).toContainText('Total: $22.43');
  await expect(page.locator('.ents')).toContainText('2 × Hornado con mote');
});

test('las respuestas sugeridas y las preguntas de ejemplo envían el mensaje', async ({ page }) => {
  await page.getByRole('button', { name: 'Ver la carta' }).click();
  await expect(page.locator('.msg--me .bubble').last()).toHaveText('Ver la carta');
  await expect(lastBot(page)).toContainText('Esta es nuestra carta');
  await expect(page.locator('#chips .chip').first()).toContainText('Sopas y caldos');
  await page.getByRole('tab', { name: 'Pedidos y pagos' }).click();
  await page.locator('.q', { hasText: '¿Dan factura?' }).click();
  await expect(lastBot(page)).toContainText('factura electrónica');
});

test('dos preguntas en un mensaje reciben dos respuestas', async ({ page }) => {
  await ask(page, 'hola, a que hora abren y donde estan?').catch(() => {});
  await expect(page.locator('.msg--bot:not(.typing)')).toHaveCount(3, { timeout: 8000 });
  await expect(page.locator('.msg--bot').nth(1)).toContainText('Martes a sábado');
  await expect(page.locator('.msg--bot').nth(2)).toContainText('Av. Demostración');
});

test('hora simulada: cerrado en la noche', async ({ page }) => {
  await page.goto('/index.html?ahora=2026-10-10T22:00');
  await ask(page, 'estan abiertos ahora');
  await expect(lastBot(page)).toContainText('cerrados');
  await expect(lastBot(page)).toContainText('mañana domingo');
});

test('sin coincidencia ofrece temas', async ({ page }) => {
  await ask(page, 'blablabla xyz');
  await expect(lastBot(page)).toContainText('No estoy segura');
  await expect(page.locator('#chips .chip')).not.toHaveCount(0);
  await expect(page.locator('#think-body')).toContainText('Ninguno sumó puntos');
});

test('reserva completa por el chat, con panel de datos, y al recargar empieza de cero', async ({ page }) => {
  await ask(page, 'quiero reserbar una mesa');
  await expect(lastBot(page)).toContainText('cuántas personas');
  await ask(page, '4');
  await expect(page.locator('.slots')).toContainText('4');
  await ask(page, 'el martes');
  await ask(page, '7 pm');
  await expect(page.locator('.slots li').nth(2)).toContainText('19:00');
  await ask(page, 'Ana Pérez');
  await ask(page, '0991234567');
  await expect(lastBot(page)).toContainText('Mesa para 4');
  await expect(lastBot(page)).toContainText('Martes 13 de octubre, 19:00');
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(lastBot(page)).toContainText(/PCH-[A-Z2-9]{4}/);
  const code = (await lastBot(page).textContent()).match(/PCH-[A-Z2-9]{4}/)[0];

  await ask(page, 'mis reservas');
  await expect(lastBot(page)).toContainText(code);
  await ask(page, 'cancelar mi reserva');
  await page.getByRole('button', { name: 'Sí, cancelar' }).click();
  await expect(lastBot(page)).toContainText('cancelé la reserva');

  await page.reload();
  await expect(page.locator('.msg--me')).toHaveCount(0);
  await ask(page, 'mis reservas');
  await expect(lastBot(page)).not.toContainText(code);
});

test('nueva conversación limpia el chat pero conserva las reservas', async ({ page }) => {
  await ask(page, 'reservar para 2 el martes a las 12');
  await ask(page, 'Rosa Vera');
  await ask(page, 'omitir');
  await ask(page, 'si');
  await page.getByRole('button', { name: 'Nueva conversación' }).click();
  await expect(page.locator('.msg')).toHaveCount(1);
  await ask(page, 'ver mis reservas');
  await expect(lastBot(page)).toContainText('Rosa Vera');
});

test('reserva: errores se explican y se ofrecen alternativas', async ({ page }) => {
  await ask(page, 'reservar para 2 el lunes');
  await expect(lastBot(page)).toContainText('lunes descansamos');
  await expect(page.locator('#chips .chip').first()).toContainText('martes 13 de octubre');
  await ask(page, 'cancelar');
  await ask(page, 'reservar para 2 el sabado a las 1 pm');
  await expect(lastBot(page)).toContainText('ya no tengo mesa libre');
});

test('el texto escrito se muestra como texto, sin ejecutar HTML', async ({ page }) => {
  await ask(page, '<img src=x onerror="window.__xss=1"> <b>hola</b>');
  await expect(page.locator('.msg--me').last()).toContainText('<img src=x');
  await expect(page.locator('.msg--me img')).toHaveCount(0);
  await expect(page.locator('.msg--me b')).toHaveCount(0);
  expect(await page.evaluate(() => window.__xss)).toBeUndefined();
  await expect(page.locator('#think-body img')).toHaveCount(0);
});

test('lista de temas y conteo', async ({ page }) => {
  await page.locator('.topics summary').click();
  const n = await page.locator('#topics-list li').count();
  expect(n).toBeGreaterThan(40);
  await expect(page.locator('#topics-count')).toContainText(`(${n})`);
});

test('accesibilidad: registro en vivo, etiquetas y teclado', async ({ page }) => {
  await expect(page.locator('#log')).toHaveAttribute('role', 'log');
  await expect(page.locator('#log')).toHaveAttribute('aria-live', 'polite');
  await expect(page.getByLabel('Escribe tu mensaje')).toBeVisible();
  await ask(page, 'hola');
  await expect(page.locator('.msg--me .sr-only').last()).toHaveText('Tú:');
  await expect(page.locator('.msg--bot .sr-only').last()).toHaveText('Rosita:');
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toBeVisible();
});

test('respeta reducir movimiento', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await ask(page, 'hola');
  const anim = await page.locator('.msg--bot').last().evaluate((el) => getComputedStyle(el).animationName);
  expect(['none', '']).toContain(anim);
});

test('accesibilidad (axe): inicio y con conversación', async ({ page }) => {
  let res = await new AxeBuilder({ page }).analyze();
  expect(res.violations.map((v) => v.id + ': ' + v.help)).toEqual([]);
  await ask(page, '2 hornados y 3 jugos');
  await ask(page, 'quiero reservar');
  res = await new AxeBuilder({ page }).analyze();
  expect(res.violations.map((v) => v.id + ': ' + v.help)).toEqual([]);
});

test('sin desbordamiento horizontal y con el chat usable', async ({ page }) => {
  await ask(page, 'que me recomiendas');
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(over).toBeLessThanOrEqual(0);
  await expect(page.locator('#msg')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enviar' })).toBeVisible();
});

test('en móvil aparece el atajo para ver cómo piensa', async ({ page }, info) => {
  const link = page.getByRole('link', { name: 'Ver cómo piensa' });
  if (info.project.name === 'movil') await expect(link).toBeVisible();
  else await expect(link).toBeHidden();
});
