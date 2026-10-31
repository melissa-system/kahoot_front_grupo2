import { describe, expect, it, vi } from 'vitest';
import { ApiError, HttpClient, toApiError } from './http';

describe('toApiError', () => {
  it('usa el mensaje de validación de NestJS (arreglo) en errores 400', () => {
    const e = toApiError(400, { statusCode: 400, message: ['title must be longer', 'otro'], error: 'Bad Request' });
    expect(e.code).toBe('VALIDATION_ERROR');
    expect(e.message).toBe('title must be longer. otro');
  });

  it('respeta el código de error del módulo de sesiones', () => {
    const e = toApiError(409, { statusCode: 409, code: 'SESSION_FINISHED', message: 'La partida ya finalizó' });
    expect(e.code).toBe('SESSION_FINISHED');
    expect(e.message).toBe('La partida ya finalizó');
  });

  it('no expone detalles internos en errores 500', () => {
    const e = toApiError(500, { message: 'stack trace secreto' });
    expect(e.message).not.toContain('secreto');
  });
});

describe('HttpClient', () => {
  it('inyecta el JWT y notifica al recibir 401', async () => {
    const transport = vi.fn().mockRejectedValue(new ApiError(401, 'UNAUTHORIZED', 'x'));
    const onUnauthorized = vi.fn();
    const client = new HttpClient({ transport, getToken: async () => 'jwt-123', onUnauthorized });
    await expect(client.get('/quizzes')).rejects.toBeInstanceOf(ApiError);
    expect(transport).toHaveBeenCalledWith(expect.objectContaining({ path: '/quizzes', token: 'jwt-123', method: 'GET' }));
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it('convierte fallas de red en un error legible', async () => {
    const client = new HttpClient({ transport: () => Promise.reject(new TypeError('Failed to fetch')), getToken: async () => null });
    await expect(client.get('/x')).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });
});
