import { expect, test } from '@playwright/test';
import path from 'node:path';

const image = path.resolve(import.meta.dirname, '../src/assets/brand/taku-coin.png');

test('recorrido del anfitrión: registro → quiz → imagen → sala → partida → clasificación', async ({ page }) => {
  const email = `profe${Date.now()}@test.com`;

  await page.goto('/registro');
  await page.getByLabel('Nombre visible').fill('Profe E2E');
  await page.getByLabel('Correo').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill('clave-segura-1');
  await page.getByLabel('Confirmar contraseña').fill('clave-segura-1');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();

  await expect(page.getByRole('heading', { name: 'Mis cuestionarios' })).toBeVisible();
  await expect(page.getByText('Aún no tienes cuestionarios')).toBeVisible();

  // Crear cuestionario
  await page.getByRole('button', { name: /Crear cuestionario/ }).click();
  await page.getByLabel('Título').fill('Quiz E2E de Paradigmas');
  await page.getByRole('dialog').getByRole('button', { name: 'Crear cuestionario' }).click();
  await expect(page.getByRole('heading', { name: 'Quiz E2E de Paradigmas' })).toBeVisible();

  // Pregunta con imagen
  await page.getByRole('button', { name: 'Agregar pregunta' }).first().click();
  await page.getByLabel('Afirmación').fill('Erlang usa el modelo de actores');
  await page.getByRole('radio', { name: /Verdadero/ }).click();
  await page.getByTestId('question-image-input').setInputFiles(image);
  await expect(page.getByAltText('Vista previa de la imagen de la pregunta')).toBeVisible();
  await page.locator('form').getByRole('button', { name: 'Agregar pregunta' }).click();
  await expect(page.getByText('Pregunta agregada')).toBeVisible();
  const saved = page.getByRole('listitem').filter({ hasText: 'Erlang usa el modelo de actores' });
  await expect(saved).toBeVisible();
  await expect(saved.locator('img')).toBeVisible();

  // La pregunta persiste al recargar
  await page.reload();
  await expect(page.getByRole('listitem').filter({ hasText: 'Erlang usa el modelo de actores' })).toBeVisible();

  // Abrir sala
  await page.getByRole('button', { name: 'Jugar' }).click();
  await page.getByRole('button', { name: '10 s' }).click();
  await page.getByRole('button', { name: 'Crear sala' }).click();
  await expect(page.getByText(/Sala en vivo · [A-Z0-9]{6}/)).toBeVisible();

  // Llegan participantes simulados por eventos
  await expect(page.getByRole('list', { name: 'Lista de participantes' }).getByRole('listitem')).toHaveCount(4, { timeout: 15_000 });
  await page.getByRole('button', { name: /Iniciar partida/ }).click();
  await expect(page.getByText('Pregunta 1 de 1')).toBeVisible();
  await expect(page.getByText(/la respuesta se revela al cerrar/)).toBeVisible();

  // Cierre y revisión (bots responden todos o vence el tiempo)
  await expect(page.getByRole('heading', { name: 'Clasificación' })).toBeVisible({ timeout: 15_000 });

  // Fin automático tras la revisión
  await expect(page.getByText('¡Partida terminada!')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('list', { name: 'Clasificación' }).getByRole('listitem')).toHaveCount(4);
});

test('errores comprensibles: login inválido y ruta privada', async ({ page }) => {
  await page.goto('/app/evaluaciones');
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  await page.getByLabel('Correo').fill('profe@profelink.test');
  await page.getByLabel('Contraseña').fill('incorrecta');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByText('Correo o contraseña incorrectos.')).toBeVisible();
});
