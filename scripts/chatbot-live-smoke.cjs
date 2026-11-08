/* Opt-in: usa la cuenta TEST_USER_* existente; nunca crea cuestionarios ni confirma lotes. */
const fs = require('node:fs');
const path = require('node:path');
const { chromium, expect } = require('@playwright/test');
let phase = 'configuración';
const statuses = [];

async function main() {
  if (!process.argv.includes('--live')) throw new Error('opt-in');
  const root = path.resolve(__dirname, '..');
  for (const file of ['.env', '.env.local']) {
    const target = path.join(root, file);
    if (fs.existsSync(target)) process.loadEnvFile(target);
  }
  process.loadEnvFile(path.resolve(root, '../Back-Proyecto2/.env'));
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;
  if (!email || !password || !process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_USE_MOCKS === 'true') throw new Error('configuration');
  const api = (process.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const browser = await chromium.launch();
  let batchRequests = 0;
  let directProviderRequests = 0;
  try {
    const page = await browser.newPage();
    page.on('response', (response) => {
      const route = new URL(response.url()).pathname;
      const category = route.includes('/auth/v1/token') ? 'login' : route === '/profiles/me' ? 'perfil' : route === '/quizzes' ? 'cuestionarios' : null;
      if (category) statuses.push({ operation: category, status: response.status() });
    });
    page.on('request', (req) => {
      if (req.method() === 'POST' && /\/questions\/batch$/.test(req.url())) batchRequests++;
      if (new URL(req.url()).hostname === 'api.deepseek.com') directProviderRequests++;
    });
    phase = 'abrir login';
    await page.goto(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`);
    await page.getByLabel('Correo').fill(email);
    await page.getByLabel('Contraseña', { exact: true }).fill(password);
    phase = 'autenticación de profesor';
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByRole('heading', { name: 'Mis cuestionarios' })).toBeVisible({ timeout: 30_000 });
    phase = 'abrir cuestionario existente';
    await page.getByRole('list', { name: 'Cuestionarios' }).getByRole('link').first().click();
    await page.getByRole('button', { name: 'Chat bot', exact: true }).click();
    const quizId = new URL(page.url()).pathname.split('/').at(-1);
    const chat = page.getByRole('dialog', { name: 'Chat bot · ProfeLink' });
    await expect(chat.getByText(/Modo simulado/)).toHaveCount(0);
    const before = await page.locator('section[aria-labelledby="questions-title"] > ol > li').count();
    await chat.getByLabel('¿Qué preguntas necesitas?').fill('Dos afirmaciones de verdadero o falso sobre el sistema solar para sexto grado.');
    const pendingRequest = page.waitForRequest((req) => req.method() === 'POST' && req.url().endsWith(`/quizzes/${quizId}/chat`));
    phase = 'generación de propuesta';
    await chat.getByRole('button', { name: 'Enviar' }).click();
    const sent = await pendingRequest;
    // JWT solo en memoria, nunca se imprime ni se guarda en capturas/trazas.
    const authorization = await sent.headerValue('authorization');
    await chat.getByRole('button', { name: 'Ver propuesta' }).click({ timeout: 100_000 });
    await expect(chat.getByLabel('Afirmación propuesta 1')).toBeVisible({ timeout: 100_000 });
    await expect(chat.getByLabel('Afirmación propuesta 2')).toBeVisible();
    await chat.getByLabel('Afirmación propuesta 1').fill('Revisión local del profesor; no guardar esta prueba.');
    phase = 'comprobar ausencia de escrituras';
    const detail = await page.request.get(`${api}/quizzes/${quizId}`, { headers: { Authorization: authorization || '' } });
    expect(detail.ok()).toBe(true);
    const body = await detail.json();
    expect(body.questions.length).toBe(before);
    expect(batchRequests).toBe(0);
    expect(directProviderRequests).toBe(0);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Chat bot', exact: true })).toBeFocused();
    console.log(JSON.stringify({ realBrowser: true, simulated: false, proposalQuestions: 2,
      locallyEditable: true, existingQuestionsUnchanged: true, batchRequests, directProviderRequests }));
  } finally {
    await browser.close();
  }
}

void main().catch(() => {
  // No imprimir errores de Playwright: pueden incluir valores de campos de acceso.
  console.error('No se completó la prueba real de navegador. Verifica servidores, configuración pública y una cuenta TEST_USER_* de profesor con cuestionario existente. No se confirmó ningún lote.');
  console.error(JSON.stringify({ phase, http: statuses }));
  process.exitCode = 1;
});
