import { env } from '../config/env';

/** Error uniforme para toda la app: código, mensaje legible y estado HTTP. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  get isAuth() {
    return this.status === 401;
  }
  get isForbidden() {
    return this.status === 403;
  }
  get isNetwork() {
    return this.status === 0;
  }
}

export interface HttpRequest {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  body?: unknown;
  token: string | null;
}

/** Permite cambiar fetch real por el backend simulado sin tocar las pantallas. */
export type HttpTransport = (request: HttpRequest) => Promise<unknown>;

const STATUS_CODES: Record<number, string> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
};

export function friendlyMessage(status: number, fallback?: string): string {
  if (status === 0) return 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.';
  if (status === 401) return 'Tu sesión expiró. Inicia sesión nuevamente.';
  if (status === 403) return 'No tienes permiso para realizar esta acción.';
  if (status === 404) return fallback ?? 'No encontramos lo que buscabas.';
  if (status >= 500) return 'El servidor tuvo un problema. Inténtalo en unos segundos.';
  return fallback ?? 'Ocurrió un error inesperado.';
}

/** Convierte las respuestas de error de NestJS ({statusCode,message,error} o {code,message}). */
export function toApiError(status: number, payload: unknown): ApiError {
  let message: string | undefined;
  let code = STATUS_CODES[status] ?? (status >= 500 ? 'INTERNAL_ERROR' : 'HTTP_ERROR');
  if (payload && typeof payload === 'object') {
    const p = payload as Record<string, unknown>;
    if (typeof p.code === 'string') code = p.code;
    if (Array.isArray(p.message)) message = p.message.join('. ');
    else if (typeof p.message === 'string') message = p.message;
  }
  const readable = status === 401 || status === 0 || status >= 500 ? friendlyMessage(status) : friendlyMessage(status, message);
  return new ApiError(status, code, readable, payload);
}

export const fetchTransport: HttpTransport = async ({ method, path, body, token }) => {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload: BodyInit | undefined;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(`${env.apiUrl}${path}`, { method, headers, body: payload });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', friendlyMessage(0));
  }

  if (response.status === 204) return undefined;
  const text = await response.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!response.ok) throw toApiError(response.status, data);
  return data;
};

export type TokenProvider = () => Promise<string | null>;

/**
 * Cliente HTTP compartido (P3 y P4). Inyecta el JWT de Supabase en cada
 * petición y normaliza errores. Ante un 401 notifica para cerrar sesión.
 */
export class HttpClient {
  private transport: HttpTransport;
  private readonly getToken: TokenProvider;
  private readonly onUnauthorized?: () => void;

  constructor(options: { transport: HttpTransport; getToken: TokenProvider; onUnauthorized?: () => void }) {
    this.transport = options.transport;
    this.getToken = options.getToken;
    this.onUnauthorized = options.onUnauthorized;
  }

  async request<T>(method: HttpRequest['method'], path: string, body?: unknown): Promise<T> {
    const token = await this.getToken();
    try {
      return (await this.transport({ method, path, body, token })) as T;
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(0, 'NETWORK_ERROR', friendlyMessage(0));
      if (apiError.isAuth) this.onUnauthorized?.();
      throw apiError;
    }
  }

  get<T>(path: string) {
    return this.request<T>('GET', path);
  }
  post<T>(path: string, body?: unknown) {
    return this.request<T>('POST', path, body);
  }
  patch<T>(path: string, body?: unknown) {
    return this.request<T>('PATCH', path, body);
  }
  put<T>(path: string, body?: unknown) {
    return this.request<T>('PUT', path, body);
  }
  delete<T = void>(path: string) {
    return this.request<T>('DELETE', path);
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return 'Ocurrió un error inesperado.';
}
