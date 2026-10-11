/* Pruebas de extremo a extremo del POS, en escritorio y en móvil. */
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const add = async (page, id, times = 1) => {
  for (let i = 0; i < times; i++) await page.click(`[data-act="inc"][data-id="${id}"]`);
};

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload();
});

test.describe('Mesero', () => {
  test('la comanda suma platos, IVA y total', async ({ page }) => {
    await expect(page.locator('#send')).toBeDisabled();
    await add(page, 'encebollado', 2);
    await expect(page.locator('#ticket-lines .tline .q')).toHaveText('2×');
    await expect(page.locator('#ticket-lines .tline .n')).toHaveText('Encebollado de albacora');
    await expect(page.locator('#ticket-lines .tline .p')).toHaveText('$9.00');
    await expect(page.locator('#ticket-totals')).toContainText('$9.00');
    await expect(page.locator('#ticket-totals')).toContainText('$1.35');
    await expect(page.locator('#ticket-totals .grand')).toContainText('$10.35');
    await expect(page.locator('#send')).toBeEnabled();
  });

  test('quitar platos baja la cantidad y no pasa de cero', async ({ page }) => {
    await add(page, 'agua', 2);
    await page.click('[data-act="dec"][data-id="agua"]');
    await expect(page.locator('[data-qty="agua"]')).toHaveText('1');
    await page.click('[data-act="dec"][data-id="agua"]');
    await expect(page.locator('[data-qty="agua"]')).toHaveText('0');
    await expect(page.locator('[data-act="dec"][data-id="agua"]')).toBeDisabled();
    await expect(page.locator('#send')).toBeDisabled();
  });

  test('enviar a cocina limpia la comanda y deja el pedido en curso', async ({ page }) => {
    await page.selectOption('#table', 'Mesa 4');
    await add(page, 'hornado');
    await page.fill('[data-note="hornado"]', 'Sin ají');
    await expect(page.locator('.tline-note')).toHaveText('Nota: Sin ají');
    await page.click('#send');
    await expect(page.locator('.paper-empty')).toBeVisible();
    await expect(page.locator('[data-note-wrap="hornado"]')).toBeHidden();
    await expect(page.locator('#active')).toContainText('Pedido n.º 1');
    await expect(page.locator('#active')).toContainText('Mesa 4');
    await expect(page.locator('#live')).toContainText('enviado a cocina');
    await expect(page.locator('#ticket-meta')).toHaveText('Mesa 4, pedido n.º 2');
  });

  test('con movimiento reducido el pedido se envía sin animación', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await add(page, 'agua');
    await page.click('#send');
    await expect(page.locator('#active')).toContainText('Pedido n.º 1');
  });

  test('al recargar con una sola pestaña todo empieza de cero', async ({ page }) => {
    await page.selectOption('#table', 'Mesa 6');
    await add(page, 'fritada', 2);
    await add(page, 'agua');
    await page.click('#send');
    await expect(page.locator('#active')).toContainText('Pedido n.º 1');
    await page.reload();
    await expect(page.locator('#table')).toHaveValue('Mesa 1');
    await expect(page.locator('[data-qty="fritada"]')).toHaveText('0');
    await expect(page.locator('#active')).toContainText('No hay pedidos en curso');
    await expect(page.locator('[data-stock-text="fritada"]')).toHaveText('Quedan 10');
  });

  test('la nota se muestra como texto y no ejecuta HTML', async ({ page }) => {
    await add(page, 'agua');
    await page.fill('[data-note="agua"]', '<img src=x onerror="window.__xss=1">');
    await page.click('#send');
    await page.goto('/index.html#/cocina');
    await expect(page.locator('.kt-note')).toContainText('<img src=x');
    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
  });

  test('en móvil el botón de comanda lleva al ticket', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Solo aplica en móvil');
    await add(page, 'agua');
    await expect(page.locator('#dock')).toBeVisible();
    await expect(page.locator('#dock-total')).toHaveText('$1.15');
    await page.click('#dock');
    await expect(page.locator('#comanda')).toBeInViewport();
  });
});

test.describe('Flujo completo', () => {
  test('el pedido llega a cocina en vivo, se prepara, se cobra y aparece en Admin', async ({ page, context }) => {
    const kitchen = await context.newPage();
    await kitchen.goto('/index.html#/cocina');
    await expect(kitchen.locator('.col-empty').first()).toBeVisible();

    await page.selectOption('#table', 'Mesa 3');
    await add(page, 'encebollado', 2);
    await page.click('#send');

    const ticket = kitchen.locator('[data-ticket="p1"]');
    await expect(ticket).toBeVisible();
    await expect(ticket).toContainText('2× Encebollado de albacora');
    await expect(kitchen.locator('#badge')).toHaveText('1');
    await expect(kitchen.locator('#live')).toContainText('Nuevo pedido n.º 1');

    await kitchen.getByRole('button', { name: 'Empezar a preparar' }).click();
    await expect(kitchen.locator('#col-preparando')).toContainText('1');
    await kitchen.getByRole('button', { name: 'Marcar listo' }).click();
    await expect(kitchen.locator('#col-listo')).toContainText('1');

    const payBtn = page.getByRole('button', { name: 'Entregar y cobrar' });
    await expect(payBtn).toBeVisible();
    await payBtn.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Cobrar pedido n.º 1');
    await expect(dialog).toContainText('$10.35');
    await dialog.getByLabel('Tarjeta').check();
    await dialog.getByRole('button', { name: 'Cobrar $10.35' }).click();
    await expect(page.locator('#active')).toContainText('No hay pedidos en curso');

    await page.goto('/index.html#/admin');
    await expect(page.locator('#pending')).toHaveCount(0);
    await expect(page.locator('#k-sales')).toHaveText('$10.35');
    await expect(page.locator('#k-count')).toHaveText('1');
    await expect(page.locator('#k-avg')).toHaveText('$10.35');
    await expect(page.locator('table tbody tr')).toHaveCount(1);
    await expect(page.locator('table')).toContainText('Cobrado');
  });

  test('cancelar el cobro no cambia el pedido', async ({ page }) => {
    await page.goto('/index.html#/admin');
    await page.getByRole('button', { name: 'Cargar pedidos de ejemplo' }).click();
    await page.goto('/index.html#/mesero');
    await page.getByRole('button', { name: 'Entregar y cobrar' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Entregar y cobrar' })).toBeVisible();
  });

  test('si hay otra pestaña abierta, recargar conserva los pedidos', async ({ page, context }) => {
    await add(page, 'agua');
    await page.click('#send');
    const otra = await context.newPage();
    await otra.goto('/index.html#/cocina');
    await expect(otra.locator('[data-ticket="p1"]')).toBeVisible();
    await page.waitForTimeout(1200);
    await page.reload();
    await expect(page.locator('#active')).toContainText('Pedido n.º 1');
  });
});

test.describe('Cocina', () => {
  test('el cronómetro marca los pedidos que se demoran', async ({ page }) => {
    await page.goto('/index.html#/cocina');
    await page.getByRole('button', { name: 'Cargar pedidos de ejemplo' }).click();
    const late = page.locator('[data-ticket="p6"]');
    await expect(late).toHaveClass(/kt--late/);
    await expect(late).toContainText('Tarde');
    await expect(late.locator('[data-clock]')).toHaveText(/^1[4-5]:\d\d$/);
    await expect(page.locator('[data-ticket="p8"]')).not.toHaveClass(/kt--(warn|late)/);
    await expect(page.locator('#col-nuevo')).toContainText('2');
  });

  test('un ticket nuevo con nota la muestra resaltada', async ({ page }) => {
    await page.goto('/index.html#/cocina');
    await page.getByRole('button', { name: 'Cargar pedidos de ejemplo' }).click();
    await expect(page.locator('[data-ticket="p8"] .kt-note').first()).toContainText('Sin ají');
    await expect(page.locator('[data-ticket="p8"] li', { hasText: 'Hornado' })).toContainText('Nota: Sin ají');
    await expect(page.locator('[data-ticket="p8"] li', { hasText: 'Fritada' }).locator('.kt-note')).toHaveCount(0);
  });
});

test.describe('Notas por plato', () => {
  test('cada plato lleva su propia nota y la nota aparece solo al elegirlo', async ({ page }) => {
    await expect(page.locator('[data-note-wrap="hornado"]')).toBeHidden();
    await add(page, 'hornado');
    await add(page, 'fritada');
    await page.fill('[data-note="hornado"]', 'Sin ají');
    await page.fill('[data-note="fritada"]', 'Bien cocida');
    await expect(page.locator('.tline-note')).toHaveText(['Nota: Sin ají', 'Nota: Bien cocida']);
    await page.click('[data-act="dec"][data-id="fritada"]');
    await expect(page.locator('.tline-note')).toHaveText(['Nota: Sin ají']);
    await page.click('#send');
    await page.goto('/index.html#/cocina');
    await expect(page.locator('[data-ticket="p1"] .kt-note')).toHaveCount(1);
    await expect(page.locator('[data-ticket="p1"]')).toContainText('Nota: Sin ají');
  });
});

test.describe('Stock y menú', () => {
  test('cocina agota un plato y el mesero y el menú lo ven al instante', async ({ page, context }) => {
    await page.goto('/index.html#/mesero');
    await expect(page.locator('[data-stock-text="espumilla"]')).toHaveText('Quedan 3');
    const cocina = await context.newPage();
    await cocina.goto('/index.html#/cocina');
    await cocina.click('[data-act="stock-zero"][data-id="espumilla"]');
    await expect(cocina.locator('[data-stk="espumilla"] [data-stk-state]')).toHaveText('Agotado');
    await expect(page.locator('[data-stock-text="espumilla"]')).toHaveText('Agotado');
    await expect(page.locator('[data-act="inc"][data-id="espumilla"]')).toBeDisabled();
    const menu = await context.newPage();
    await menu.goto('/index.html#/menu');
    await expect(menu.locator('[data-menu="espumilla"]')).toContainText('Agotado hoy');
    await cocina.click('[data-act="restock"]');
    await expect(menu.locator('[data-menu="espumilla"]')).not.toContainText('Agotado');
  });

  test('no se puede pedir más de lo que queda y enviar baja el stock', async ({ page }) => {
    const cocina = await page.context().newPage();
    await cocina.goto('/index.html#/cocina');
    await cocina.click('[data-act="stock-dec"][data-id="espumilla"]');
    await expect(page.locator('[data-stock-text="espumilla"]')).toHaveText('Quedan 2');
    await add(page, 'espumilla', 2);
    await expect(page.locator('[data-act="inc"][data-id="espumilla"]')).toBeDisabled();
    await page.click('#send');
    await expect(page.locator('[data-stock-text="espumilla"]')).toHaveText('Agotado');
    await expect(page.locator('[data-qty="espumilla"]')).toHaveText('0');
  });

  test('si cocina agota algo mientras el mesero lo tiene en la comanda, se avisa y se ajusta', async ({ page, context }) => {
    await add(page, 'espumilla', 3);
    await add(page, 'agua', 1);
    const cocina = await context.newPage();
    await cocina.goto('/index.html#/cocina');
    await cocina.click('[data-act="stock-zero"][data-id="espumilla"]');
    await expect(page.locator('[data-qty="espumilla"]')).toHaveText('0');
    await expect(page.locator('[data-qty="agua"]')).toHaveText('1');
    await expect(page.locator('#stock-msg')).toContainText('Espumilla');
  });

  test('cocina suma y resta porciones', async ({ page }) => {
    await page.goto('/index.html#/cocina');
    await page.click('[data-act="stock-inc"][data-id="espumilla"]');
    await expect(page.locator('[data-stk="espumilla"] [data-stk-n]')).toHaveText('4');
    await page.click('[data-act="stock-dec"][data-id="espumilla"]');
    await page.click('[data-act="stock-dec"][data-id="espumilla"]');
    await expect(page.locator('[data-stk="espumilla"] [data-stk-n]')).toHaveText('2');
    await expect(page.locator('[data-stk="espumilla"] [data-stk-state]')).toHaveText('Quedan pocas');
  });

  test('el menú del cliente muestra una imagen de ejemplo por plato, precio y disponibilidad', async ({ page }) => {
    await page.goto('/index.html#/menu');
    await expect(page.locator('.mcard')).toHaveCount(16);
    await expect(page.locator('.mcard .photo').first()).toHaveAttribute('aria-label', 'Ilustración de Encebollado de albacora');
    await expect(page.locator('[data-menu="hornado"]')).toContainText('$7.50');
    await expect(page.locator('.mcard')).not.toContainText(['Disponible', 'Quedan', 'Últimas']);
    await expect(page.locator('.mcard [data-menu-stock]')).toHaveCount(0);
  });

  test('un pedido enviado descuenta el stock en el menú', async ({ page }) => {
    await add(page, 'hornado', 2);
    await page.click('#send');
    await page.goto('/index.html#/cocina');
    await expect(page.locator('[data-stk="hornado"] [data-stk-n]')).toHaveText('13');
  });
});

test.describe('Admin', () => {
  test('los números de los pedidos de ejemplo cuadran', async ({ page }) => {
    await page.goto('/index.html#/admin');
    await page.getByRole('button', { name: 'Cargar pedidos de ejemplo' }).click();
    await expect(page.locator('#k-count')).toHaveText('5');
    await expect(page.locator('#pending')).toContainText('4 pedidos sin cobrar');
    await expect(page.locator('table tbody tr')).toHaveCount(9);
    await expect(page.locator('.ranking li').first()).toContainText('3');
    await expect(page.locator('.chart')).toHaveAttribute('aria-label', /La hora con más ventas/);
  });

  test('exporta los pedidos a CSV', async ({ page }) => {
    await page.goto('/index.html#/admin');
    await expect(page.getByRole('button', { name: 'Exportar CSV' })).toBeDisabled();
    await page.getByRole('button', { name: 'Cargar pedidos de ejemplo' }).click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Exportar CSV' }).click()
    ]);
    expect(download.suggestedFilename()).toBe('pedidos-picanteria-chimborazo.csv');
    const fs = require('node:fs');
    const text = fs.readFileSync(await download.path(), 'utf8').replace(/^﻿/, '');
    const rows = text.split('\n');
    expect(rows[0]).toBe('pedido,mesa,estado,creado,subtotal,iva,total,pago,platos');
    expect(rows).toHaveLength(10);
  });

  test('no hay botón de reiniciar: refrescar ya reinicia', async ({ page }) => {
    await page.goto('/index.html#/admin');
    await page.getByRole('button', { name: 'Cargar pedidos de ejemplo' }).click();
    await expect(page.getByRole('button', { name: /Reiniciar/ })).toHaveCount(0);
    await page.reload();
    await expect(page.locator('#k-count')).toHaveText('0');
    await expect(page.getByText('No hay pedidos todavía')).toBeVisible();
  });
});

test.describe('Calidad', () => {
  for (const route of ['menu', 'mesero', 'cocina', 'admin']) {
    test(`${route}: sin barras de scroll horizontal`, async ({ page }) => {
      await page.goto('/index.html#/admin');
      await page.getByRole('button', { name: 'Cargar pedidos de ejemplo' }).click();
      await page.goto(`/index.html#/${route}`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });

    test(`${route}: sin fallos graves de accesibilidad (axe)`, async ({ page }) => {
      await page.goto('/index.html#/admin');
      await page.getByRole('button', { name: 'Cargar pedidos de ejemplo' }).click();
      await page.goto(`/index.html#/${route}`);
      if (route === 'mesero') await add(page, 'hornado');
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      const serious = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
    });
  }

  test('todos los botones tienen nombre accesible', async ({ page }) => {
    const unnamed = await page.evaluate(() =>
      [...document.querySelectorAll('button')].filter((b) => !(b.getAttribute('aria-label') || b.textContent).trim()).length
    );
    expect(unnamed).toBe(0);
  });

  test('la página no genera errores en consola', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('/index.html#/cocina');
    await page.goto('/index.html#/admin');
    await page.goto('/index.html#/mesero');
    expect(errors).toEqual([]);
  });
});
