import { expect, test } from '@playwright/test';

test('recorrido del participante: unirse con PLAY23, responder y ver resultados', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Correo').fill('profe@profelink.test');
  await page.getByLabel('Contraseña').fill('profelink123');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Mis cuestionarios' })).toBeVisible();

  await page.goto('/app/jugar');
  await expect(page.getByRole('heading', { name: 'Unirse a una sala' })).toBeVisible();
  await page.getByLabel('Código de la sala').fill('PLAY23');
  await page.getByRole('button', { name: 'Unirse' }).click();

  await expect(page.getByText(/Esperando a que el anfitrión inicie/)).toBeVisible();
  await expect(page.getByText('PLAY23')).toBeVisible();

  await page.getByRole('button', { name: 'Entre la vida y la muerte' }).click({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: /Verdadero/ })).toBeVisible();
  await page.getByRole('button', { name: /Verdadero/ }).click();
  await expect(page.getByText(/Respuesta registrada|¡Correcto!|¡Partida terminada!/)).toBeVisible();

  await expect(page.getByText('¡Partida terminada!')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('heading', { name: 'Clasificación final' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Jugar otra sala' })).toBeVisible();
});
