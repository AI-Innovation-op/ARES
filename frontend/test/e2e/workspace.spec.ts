import { test, expect, type Page } from '@playwright/test';
const runtimeErrors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  return page.route('**/api/**', (route) => route.abort('blockedbyclient'));
});
test.afterEach(({ page }) => {
  expect(runtimeErrors.get(page)).toEqual([]);
});
async function fixture(page: Page, authenticated = true) {
  if (authenticated)
    await page.addInitScript(() => sessionStorage.setItem('ares.api_key', 'fixture-access-only'));
  await page.route('**/health', (route) =>
    route.fulfill({ json: { status: 'ONLINE', agent: 'ARES / test fixture' } }),
  );
  await page.route('**/api/models', (route) =>
    route.fulfill(
      authenticated
        ? {
            json: {
              models: [{ id: 'fixture-model', nombre: 'Modelo de prueba', proveedor: 'gemini' }],
            },
          }
        : { status: 401, json: { error: 'Unauthorized' } },
    ),
  );
  await page.route('**/api/conversations**', (route) =>
    route.fulfill({ json: { conversaciones: [] } }),
  );
}
test('desktop renders real geometry and every pose; reduced motion stops the animation loop', async ({
  page,
}) => {
  await fixture(page);
  await page.goto('/');
  const canvas = page.locator('canvas[data-renderer="three"]');
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute('data-loop', 'paused');
  for (let id = 1; id <= 16; id++) {
    await page.getByLabel('Explorar las 16 poses').selectOption(String(id));
    await expect(page.locator('.companion-stage')).toHaveAttribute('data-pose', String(id));
    await expect(page.locator('.pose-code')).toContainText(String(id).padStart(2, '0'));
  }
  await page.getByRole('button', { name: 'Girar avatar a la izquierda' }).click();
  await page.getByRole('button', { name: 'Restablecer vista del avatar' }).click();
  await page.getByRole('button', { name: 'Vista 3D', exact: true }).click();
  await expect(page.locator('.companion-poster')).toBeVisible();
  await expect(page.locator('canvas[data-renderer="three"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Vista ligera', exact: true }).click();
  await expect(page.locator('canvas[data-renderer="three"]')).toBeVisible();
});
test('connection is honest and the native settings dialog traps focus and closes with Escape', async ({
  page,
}) => {
  await fixture(page, false);
  await page.goto('/');
  await page.getByRole('button', { name: 'Configurar acceso' }).click();
  const dialog = page.getByRole('dialog', { name: 'Conecta tu espacio.' });
  await expect(dialog).toBeVisible();
  await expect(page.getByLabel('Clave de acceso ARES')).toHaveAttribute('type', 'password');
  await expect(page.getByLabel('Recordar en este navegador')).not.toBeChecked();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement?.closest('dialog')?.open)).toBeTruthy();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('ares.api_key'))).toBeNull();
});
test('starter actions prepare a message without sending a request', async ({ page }) => {
  await fixture(page);
  let calls = 0;
  await page.route('**/api/chat**', (route) => {
    calls++;
    return route.abort();
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Revisar mi código' }).click();
  await expect(page.getByLabel('Tu mensaje para ARES')).toHaveValue(/Quiero revisar mi código/);
  expect(calls).toBe(0);
});
test('truncated SSE is flagged without a second model request', async ({ page }) => {
  await fixture(page);
  let calls = 0;
  await page.route('**/api/chat/stream', (route) => {
    calls++;
    return route.fulfill({
      contentType: 'text/event-stream',
      body: 'data: {"type":"init","conversationId":"fixture-session","stance":"IDLE","poseNumber":1}\n\ndata: {"type":"chunk","text":"Respuesta parcial"}\n\n',
    });
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'API conectada' })).toBeVisible();
  await page.getByLabel('Tu mensaje para ARES').fill('Prueba de protocolo');
  await page.getByRole('button', { name: 'Enviar', exact: true }).click();
  await expect(page.getByRole('log')).toContainText('Respuesta incompleta:');
  expect(calls).toBe(1);
  await expect(page.locator('.companion-stage')).toHaveAttribute('data-pose', '2');
});

test('completed SSE selects an available model, renders the reply and exposes its saved session', async ({
  page,
}) => {
  await fixture(page);
  await page.addInitScript(() => {
    localStorage.setItem('ares.selected_model', 'fixture-model');
    localStorage.setItem('ares.selected_provider', 'openrouter');
  });
  const session = {
    id: 'fixture-session',
    title: 'Revisión de arquitectura',
    created_at: '2026-10-31T00:00:00Z',
  };
  const diagramRequests: string[] = [];
  page.on('request', (request) => {
    if (/MermaidViewer|deps\/mermaid/.test(request.url())) diagramRequests.push(request.url());
  });
  await page.route('**/api/conversations**', (route) =>
    route.fulfill({ json: { conversaciones: [session] } }),
  );
  let payload: { model?: string; provider?: string } = {};
  await page.route('**/api/chat/stream', (route) => {
    payload = route.request().postDataJSON();
    const metadata = { conversationId: session.id, stance: 'IDLE', poseNumber: 1 };
    return route.fulfill({
      contentType: 'text/event-stream',
      body: [
        { type: 'init', ...metadata },
        { type: 'chunk', text: 'Límites claros.' },
        { type: 'done', ...metadata, reply: 'Límites claros. Pruebas verificables.' },
      ]
        .map((event) => 'data: ' + JSON.stringify(event) + '\n\n')
        .join(''),
    });
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'API conectada' })).toBeVisible();
  await page.getByLabel('Tu mensaje para ARES').fill('Ayúdame a definir los contextos');
  await page.getByRole('button', { name: 'Enviar', exact: true }).click();
  await expect(page.getByRole('log')).toContainText('Límites claros. Pruebas verificables.');
  await expect(page.getByRole('log')).not.toContainText('Respuesta incompleta');
  expect(payload.model).toBe('fixture-model');
  expect(payload.provider).toBe('gemini');
  expect(diagramRequests).toEqual([]);
  await page.getByRole('button', { name: 'Abrir historial de misiones' }).click();
  await expect(page.getByRole('dialog')).toContainText(session.title);
});

test('a Mermaid reply loads and renders its diagram on demand', async ({ page }) => {
  await fixture(page);
  await page.route('**/api/chat/stream', (route) =>
    route.fulfill({
      contentType: 'text/event-stream',
      body:
        'data: ' +
        JSON.stringify({
          type: 'done',
          conversationId: 'fixture',
          stance: 'IDLE',
          poseNumber: 1,
          reply: '```mermaid\nflowchart LR\n A[Usuario] --> B[ARES]\n```',
        }) +
        '\n\n',
    }),
  );
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'API conectada' })).toBeVisible();
  await page.getByLabel('Tu mensaje para ARES').fill('Genera un esquema');
  await page.getByRole('button', { name: 'Enviar', exact: true }).click();
  await expect(page.locator('.message-list svg[id^="ares-mermaid"]')).toBeVisible({
    timeout: 15000,
  });
});

test('a disconnected draft survives connecting and the key stays in session storage by default', async ({
  page,
}) => {
  await fixture(page, false);
  await page.route('**/api/models', (route) =>
    route.fulfill(
      route.request().headers()['x-api-key'] === 'fixture-access-only'
        ? {
            json: {
              models: [{ id: 'fixture-model', nombre: 'Modelo de prueba', proveedor: 'gemini' }],
            },
          }
        : { status: 401, json: { error: 'Unauthorized' } },
    ),
  );
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Configurar acceso' })).toBeVisible();
  await page.getByLabel('Tu mensaje para ARES').fill('Conservar este borrador');
  await page.getByRole('button', { name: 'Enviar', exact: true }).click();
  await expect(page.getByLabel('Tu mensaje para ARES')).toHaveValue('Conservar este borrador');
  await page.getByLabel('Clave de acceso ARES').fill('fixture-access-only');
  await page.getByRole('button', { name: 'Guardar y conectar' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'API conectada' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('ares.api_key'))).toBeNull();
  expect(await page.evaluate(() => sessionStorage.getItem('ares.api_key'))).toBe(
    'fixture-access-only',
  );
});

test('the user can cancel a pending generation without sending a second request', async ({
  page,
}) => {
  await fixture(page);
  let calls = 0;
  await page.route('**/api/chat/stream', () => {
    calls++;
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'API conectada' })).toBeVisible();
  await page.getByLabel('Tu mensaje para ARES').fill('Solicitud pendiente');
  await page.getByRole('button', { name: 'Enviar', exact: true }).click();
  await expect.poll(() => calls).toBe(1);
  await page.getByRole('button', { name: 'Detener', exact: true }).click();
  await expect(page.getByRole('log')).toContainText('Generación detenida por el usuario.');
  await expect(page.getByRole('button', { name: 'Detener', exact: true })).toHaveCount(0);
  expect(calls).toBe(1);
});

test('losing WebGL switches to the matching lightweight pose', async ({ page }) => {
  await fixture(page);
  await page.goto('/');
  const canvas = page.locator('canvas[data-renderer="three"]');
  await expect(canvas).toBeVisible();
  await page.getByLabel('Explorar las 16 poses').selectOption('16');
  await canvas.evaluate((element) =>
    (element as HTMLCanvasElement)
      .getContext('webgl2')!
      .getExtension('WEBGL_lose_context')!
      .loseContext(),
  );
  await expect(page.locator('canvas[data-renderer="three"]')).toHaveCount(0);
  await expect(page.locator('.companion-poster')).toHaveAttribute('src', /pose-16/);
  await expect(page.getByRole('status')).toContainText('WebGL no está disponible');
});

test('animation can be paused on systems that allow motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await fixture(page);
  await page.goto('/');
  const canvas = page.locator('canvas[data-renderer="three"]');
  await expect(canvas).toHaveAttribute('data-loop', 'running');
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-loop', 'paused');
  await page.getByRole('button', { name: 'Animar', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-loop', 'running');
});
for (const width of [375, 768, 1024, 1440])
  test(`responsive layout ${width}px keeps the composer visible without horizontal overflow`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await fixture(page);
    await page.goto('/');
    await expect(page.getByLabel('Tu mensaje para ARES')).toBeInViewport();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    if (width <= 820) {
      await expect(page.locator('canvas[data-renderer="three"]')).toHaveCount(0);
      await page.getByRole('button', { name: 'Ver a ARES', exact: true }).click();
      await expect(page.locator('#main-content')).toHaveAttribute('inert', '');
      await page
        .getByLabel('Tu mensaje para ARES')
        .evaluate((element) => (element as HTMLTextAreaElement).focus());
      expect(
        await page
          .getByLabel('Tu mensaje para ARES')
          .evaluate((element) => document.activeElement === element),
      ).toBe(false);
      await expect(page.getByLabel('Explorar las 16 poses')).toBeVisible();
      await page.getByRole('button', { name: 'Volver a la conversación' }).click();
      await expect(page.locator('#main-content')).not.toHaveAttribute('inert');
      await expect(page.getByLabel('Tu mensaje para ARES')).toBeInViewport();
    }
  });
