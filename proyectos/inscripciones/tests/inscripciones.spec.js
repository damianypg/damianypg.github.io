const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const fs = require('node:fs');

const fill = async (page, name, email, org = '') => {
  await page.fill('#f-name', name);
  await page.fill('#f-email', email);
  if (org) await page.fill('#f-org', org);
};
const pick = (page, id) => page.locator(`label[data-sess="${id}"]`).click();

async function register(page, name = 'Ana Pérez', email = 'ana@correo.com', sessions = ['s1']) {
  await fill(page, name, email, 'ESPOCH');
  for (const s of sessions) await pick(page, s);
  await page.getByRole('button', { name: 'Inscribirme' }).click();
  await expect(page.locator('#d-title')).toContainText('Tu inscripción está confirmada');
  return (await page.locator('#b-code').textContent()).trim();
}

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.errors = errors;
  await page.goto('/index.html');
});
test.afterEach(async ({ page }) => {
  expect(page.errors).toEqual([]);
});

test('la credencial se actualiza mientras escribes', async ({ page }) => {
  await page.fill('#f-name', 'Luis Mora');
  await expect(page.locator('#b-name')).toHaveText('Luis Mora');
  await pick(page, 's3');
  await expect(page.locator('#b-sessions')).toHaveText('Acceso a 1 sesión');
  await pick(page, 's1');
  await expect(page.locator('#b-sessions')).toHaveText('Acceso a 2 sesiones');
});

test('muestra errores claros y no inscribe con datos incompletos', async ({ page }) => {
  await page.getByRole('button', { name: 'Inscribirme' }).click();
  await expect(page.locator('#err-name')).not.toBeEmpty();
  await expect(page.locator('#err-email')).not.toBeEmpty();
  await expect(page.locator('#err-sessions')).toHaveText('Elige al menos una sesión.');
  await expect(page.locator('#badge-count')).toBeHidden();
});

test('inscripción completa: credencial con QR y código', async ({ page }) => {
  const code = await register(page);
  expect(code).toMatch(/^JSC-[A-Z0-9]{5}$/);
  await expect(page.locator('#b-qr svg')).toBeVisible();
  await expect(page.locator('#badge-count')).toHaveText('1');
});

test('el mismo correo no puede inscribirse dos veces', async ({ page }) => {
  await register(page);
  await page.getByRole('button', { name: 'Inscribir a otra persona' }).click();
  await fill(page, 'Ana Pérez', 'ANA@correo.com');
  await pick(page, 's1');
  await page.getByRole('button', { name: 'Inscribirme' }).click();
  await expect(page.locator('#err-email')).toContainText('ya tiene una inscripción');
});

test('con el código se recupera la credencial', async ({ page }) => {
  const code = await register(page, 'Rosa Vera', 'rosa@correo.com');
  await page.getByRole('button', { name: 'Inscribir a otra persona' }).click();
  await page.fill('#l-code', code.toLowerCase());
  await page.getByRole('button', { name: 'Ver mi credencial' }).click();
  await expect(page.locator('#b-name')).toHaveText('Rosa Vera');
  await page.getByRole('button', { name: 'Inscribir a otra persona' }).click();
  await page.fill('#l-code', 'JSC-ZZZZZ');
  await page.getByRole('button', { name: 'Ver mi credencial' }).click();
  await expect(page.locator('#err-lookup')).toContainText('No encontramos ese código');
});

test('nombres con HTML se muestran como texto', async ({ page }) => {
  await fill(page, '<img src=x onerror=window.__xss=1> Mora', 'xss@correo.com', '<b>Org</b>');
  await pick(page, 's1');
  await page.getByRole('button', { name: 'Inscribirme' }).click();
  await expect(page.locator('#b-name')).toContainText('<img src=x');
  expect(await page.evaluate(() => window.__xss)).toBeUndefined();
  await page.goto('/index.html#/organizador');
  await expect(page.locator('#reg-rows')).toContainText('<b>Org</b>');
  await expect(page.locator('#reg-rows b')).toHaveCount(0);
});

test('puerta: entrada, duplicado, sin inscripción y código desconocido', async ({ page }) => {
  const code = await register(page, 'Ana Pérez', 'ana@correo.com', ['s1']);
  await page.goto('/index.html#/puerta');
  await page.selectOption('#door-session', 's1');
  const enter = async (c) => { await page.fill('#door-code', c); await page.keyboard.press('Enter'); };

  await enter(code);
  await expect(page.locator('.result--ok')).toContainText('Entrada registrada');
  await expect(page.locator('#door-count')).toHaveText('1 de 1');
  await expect(page.locator('#recent')).toContainText('Ana Pérez');

  await enter(code);
  await expect(page.locator('.result--warn')).toContainText('Ya había ingresado');
  await expect(page.locator('#door-count')).toHaveText('1 de 1');

  await page.selectOption('#door-session', 's2');
  await enter(code);
  await expect(page.locator('.result--bad')).toContainText('No está inscrito en esta sesión');
  await expect(page.locator('#door-access .ag')).toHaveCount(1);

  await enter('JSC-ZZZZZ');
  await expect(page.locator('.result--bad')).toContainText('Código no encontrado');
});

test('puerta: la cámara lee el QR y registra la entrada', async ({ page, browserName }, info) => {
  test.skip(info.project.name === 'movil', 'La cámara simulada se prueba en escritorio');
  await page.goto('/index.html#/organizador');
  await page.getByRole('button', { name: 'Cargar inscritos de ejemplo' }).click();
  await page.goto('/index.html#/puerta');
  await page.selectOption('#door-session', 's1');
  await page.locator('#cam-toggle').click();
  await expect(page.locator('.result--ok')).toContainText('Entrada registrada', { timeout: 15000 });
  await page.locator('#cam-toggle').click();
  await expect(page.locator('#cam-toggle')).toHaveText('Usar cámara');
});

test('organizador: datos de ejemplo, filtros, CSV y reinicio', async ({ page }) => {
  await page.goto('/index.html#/organizador');
  await page.getByRole('button', { name: 'Cargar inscritos de ejemplo' }).click();
  await expect(page.locator('#k-total')).toHaveText('48');
  await expect(page.locator('#k-arrived')).toHaveText('14');
  await expect(page.locator('#k-full')).toHaveText('1');

  await page.fill('#q', 'camila');
  await expect(page.locator('#reg-count')).toContainText('coinciden');
  await page.fill('#q', '');
  await page.selectOption('#fs', 's2');
  await expect(page.locator('#reg-rows tr')).toHaveCount(40);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar CSV' }).click()
  ]);
  expect(download.suggestedFilename()).toBe('inscritos-jornadas-chimborazo.csv');
  const csv = fs.readFileSync(await download.path(), 'utf8');
  expect(csv).toContain('codigo,nombre,correo');
  expect(csv.trim().split('\n')).toHaveLength(41);

  await expect(page.getByRole('button', { name: /Reiniciar/ })).toHaveCount(0);
  await page.reload();
  await expect(page.locator('#k-total')).toHaveText('0');
});

test('al recargar con una sola pestaña todo empieza de cero', async ({ page }) => {
  await register(page);
  await page.reload();
  await expect(page.locator('#reg-form')).toBeVisible();
  await expect(page.locator('#badge-count')).toBeHidden();
});

test('con otra pestaña abierta, recargar conserva los datos', async ({ page, context }) => {
  await register(page);
  const otra = await context.newPage();
  await otra.goto('/index.html#/organizador');
  await expect(otra.locator('#k-total')).toHaveText('1');
  await page.waitForTimeout(1200);
  await page.reload();
  await expect(page.locator('#badge-count')).toHaveText('1');
});

test('sincroniza entre pestañas: cupos y conteo', async ({ page, context }) => {
  const other = await context.newPage();
  await other.goto('/index.html#/organizador');
  await expect(other.locator('#k-total')).toHaveText('0');
  await register(page);
  await expect(other.locator('#k-total')).toHaveText('1');
});

test('una sesión llena no se puede elegir', async ({ page }) => {
  await page.goto('/index.html#/organizador');
  await page.getByRole('button', { name: 'Cargar inscritos de ejemplo' }).click();
  await page.goto('/index.html#/inscripcion');
  await expect(page.locator('label[data-sess="s2"] input')).toBeDisabled();
  await expect(page.locator('label[data-sess="s2"]')).toContainText('Agotado');
});

test('al imprimir solo se ve la credencial', async ({ page }) => {
  await register(page);
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.reg-badge, #badge').first()).toBeVisible();
  await expect(page.locator('header')).toBeHidden();
  await expect(page.locator('#reg-form')).toBeHidden();
});

test('respeta reducir movimiento', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await register(page, 'Eva Luna', 'eva@correo.com');
  const anim = await page.locator('#badge').evaluate((el) => getComputedStyle(el).animationName);
  expect(['none', '']).toContain(anim);
});

for (const route of ['inscripcion', 'asistente', 'puerta', 'organizador']) {
  test(`accesibilidad (axe): ${route}`, async ({ page }) => {
    await page.goto('/index.html#/organizador');
    await page.getByRole('button', { name: 'Cargar inscritos de ejemplo' }).click();
    await page.goto('/index.html#/' + route);
    await page.waitForLoadState('networkidle');
    const res = await new AxeBuilder({ page }).analyze();
    expect(res.violations.map((v) => v.id + ': ' + v.help)).toEqual([]);
  });
}

test('sin desbordamiento horizontal', async ({ page }) => {
  for (const route of ['inscripcion', 'asistente', 'puerta', 'organizador']) {
    await page.goto('/index.html#/' + route);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(over).toBeLessThanOrEqual(0);
  }
});

test('la credencial y la confirmación son cortas: no listan las sesiones', async ({ page }) => {
  await register(page, 'Ana Pérez', 'ana@correo.com', ['s1', 's2', 's3']);
  await expect(page.locator('#b-sessions')).toHaveText('Acceso a 3 sesiones');
  await expect(page.locator('.done')).not.toContainText('Panel');
  await expect(page.locator('#badge')).not.toContainText('Panel');
});

test('puerta: muestra todas las sesiones de la persona con las ya usadas tachadas', async ({ page }) => {
  const code = await register(page, 'Ana Pérez', 'ana@correo.com', ['s1', 's3', 's5']);
  await page.goto('/index.html#/puerta');
  const enter = async (c) => { await page.fill('#door-code', c); await page.keyboard.press('Enter'); };
  await page.selectOption('#door-session', 's1');
  await enter(code);
  const rows = page.locator('#door-access .ag');
  await expect(rows).toHaveCount(3);
  await expect(page.locator('#door-access .ag-count')).toContainText('1 de 3');
  await expect(page.locator('#door-access .ag.is-done')).toHaveCount(1);
  await expect(page.locator('#door-access .ag.is-done .ag-check')).toBeVisible();
  await expect(page.locator('#door-access .ag.is-done .ag-title')).toHaveCSS('text-decoration-line', 'none');
  await expect(page.locator('#door-access .ag.is-here')).toContainText('Auditorio Mayor');
  await expect(page.locator('#door-access')).toContainText('Faltan 2 sesiones');

  await page.selectOption('#door-session', 's3');
  await enter(code);
  await page.selectOption('#door-session', 's5');
  await enter(code);
  await expect(page.locator('#door-access .ag.is-done')).toHaveCount(3);
  await expect(page.locator('#door-access .cert')).toContainText('Asistencia completa');
});

test('mi acceso: horarios, lugares y asistencia, y se actualiza desde otra pestaña', async ({ page, context }) => {
  const code = await register(page, 'Ana Pérez', 'ana@correo.com', ['s1', 's2']);
  await page.getByRole('link', { name: 'Ver mi agenda' }).click();
  await expect(page).toHaveURL(/#\/asistente/);
  await expect(page.locator('#m-name')).toHaveText('Ana Pérez');
  await expect(page.locator('#m-agenda .ag')).toHaveCount(2);
  await expect(page.locator('#m-agenda')).toContainText('Laboratorio 2, piso 3');
  await expect(page.locator('#m-agenda')).toContainText('14:00');
  await expect(page.locator('#m-agenda .ag.is-done')).toHaveCount(0);

  const door = await context.newPage();
  await door.goto('/index.html#/puerta');
  await door.selectOption('#door-session', 's1');
  await door.fill('#door-code', code);
  await door.keyboard.press('Enter');
  await expect(door.locator('.result--ok')).toBeVisible();

  await expect(page.locator('#m-agenda .ag.is-done')).toHaveCount(1);
  await expect(page.locator('#m-agenda')).toContainText('Asististe a las');
});

test('mi acceso: se entra con el código y avisa si no existe', async ({ page }) => {
  const code = await register(page, 'Rosa Vera', 'rosa@correo.com', ['s4']);
  await page.goto('/index.html#/asistente');
  await expect(page.locator('#m-name')).toHaveText('Rosa Vera');
  await page.getByRole('button', { name: 'Ver otro código' }).click();
  await page.fill('#a-code', 'JSC-ZZZZZ');
  await page.keyboard.press('Enter');
  await expect(page.locator('#err-a')).toContainText('No encontramos ese código');
  await page.fill('#a-code', code.toLowerCase());
  await page.keyboard.press('Enter');
  await expect(page.locator('#m-name')).toHaveText('Rosa Vera');
});

test('puerta: lista a los inscritos de cualquier sesión y permite registrar desde la lista', async ({ page }) => {
  await page.goto('/index.html#/organizador');
  await page.getByRole('button', { name: 'Cargar inscritos de ejemplo' }).click();
  await page.goto('/index.html#/puerta');
  for (const [id, n] of [['s1', 48], ['s2', 40], ['s3', 32], ['s5', 24]]) {
    await page.selectOption('#door-session', id);
    await expect(page.locator('#roster-count')).toHaveText(`${n} inscritos`);
  }
  await page.selectOption('#door-session', 's3');
  await page.fill('#roster-q', 'valentina');
  await expect(page.locator('#roster-count')).toContainText('coinciden');
  const first = page.locator('#roster li').first();
  const name = await first.locator('.ro-name').textContent();
  await first.getByRole('button', { name: /Registrar entrada/ }).click();
  await expect(page.locator('.result--ok')).toContainText(name);
  await expect(page.locator('#roster li.is-in')).toHaveCount(2); // 1 de los datos de ejemplo + el que acabamos de registrar
  await expect(page.locator('#door-access .ag.is-here')).toBeVisible();
});
