import { describe, expect, it } from 'vitest';
import { validateImageFile } from './image';
import { validateDisplayName, validateEmail, validateQuizTitle, validateStatement } from './validation';

describe('validaciones de formularios', () => {
  it('aplica los mismos límites que los DTO del backend', () => {
    expect(validateQuizTitle('ab')).toBeTruthy();
    expect(validateQuizTitle('Quiz válido')).toBeNull();
    expect(validateDisplayName('A')).toBeTruthy();
    expect(validateStatement('   ')).toBeTruthy();
    expect(validateStatement('x'.repeat(501))).toBeTruthy();
    expect(validateEmail('correo-malo')).toBeTruthy();
    expect(validateEmail('ana@test.com')).toBeNull();
  });

  it('rechaza imágenes con formato o tamaño no permitido antes de subir', () => {
    expect(validateImageFile(new File(['x'], 'a.gif', { type: 'image/gif' }))).toMatch(/Formato/);
    const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'a.png', { type: 'image/png' });
    expect(validateImageFile(big)).toMatch(/máximo es 2 MB/);
    expect(validateImageFile(new File(['x'], 'a.png', { type: 'image/png' }))).toBeNull();
  });
});
