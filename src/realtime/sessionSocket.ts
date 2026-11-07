import { io } from 'socket.io-client';
import { env } from '../config/env';
import { MockSessionError, mockGame } from '../api/mock/mockGame';
import { userFromToken } from '../api/mock/mockDb';
import type { RoomEnvelope, SessionAck, SessionEvent } from '../api/types';

type Handler = (...args: never[]) => void;

/** Subconjunto de socket.io-client que usa la app (la versión mock lo imita). */
export interface SessionSocket {
  readonly connected: boolean;
  on(event: string, handler: Handler): unknown;
  off(event: string, handler?: Handler): unknown;
  emit(event: string, payload: unknown, ack: (response: SessionAck) => void): unknown;
  connect(): unknown;
  disconnect(): unknown;
}

export class SocketCommandError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'SocketCommandError';
    this.code = code;
  }
}

const ACK_TIMEOUT_MS = 8000;

/** Envía un comando y espera el ack {ok,data}|{ok:false,error} del gateway. */
export function sendCommand<T>(socket: SessionSocket, event: string, payload: unknown): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (!socket.connected) {
      reject(new SocketCommandError('DISCONNECTED', 'Sin conexión con la sala. Reintentando…'));
      return;
    }
    let settled = false;
    const timer = setTimeout(() => {
      settled = true;
      reject(new SocketCommandError('TIMEOUT', 'El servidor no respondió a tiempo. Consulta el estado antes de reintentar.'));
    }, ACK_TIMEOUT_MS);
    socket.emit(event, payload, (response) => {
      if (settled) return;
      clearTimeout(timer);
      if (response?.ok) resolve(response.data as T);
      else reject(new SocketCommandError(response?.error?.code ?? 'INTERNAL_ERROR', response?.error?.message ?? 'Error desconocido'));
    });
  });
}

/* ------------------------------------------------------------------ */
/* Socket simulado para modo mock                                       */
/* ------------------------------------------------------------------ */

export class MockSessionSocket implements SessionSocket {
  connected = false;
  private handlers = new Map<string, Set<Handler>>();
  private userId: string | null = null;
  private readonly getToken: () => Promise<string | null>;
  private readonly listener = (event: SessionEvent, envelope: RoomEnvelope) => {
    if (this.connected) this.fire(event, envelope);
  };

  constructor(getToken: () => Promise<string | null>) {
    this.getToken = getToken;
  }

  on(event: string, handler: Handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return this;
  }

  off(event: string, handler?: Handler) {
    if (!handler) this.handlers.delete(event);
    else this.handlers.get(event)?.delete(handler);
    return this;
  }

  private fire(event: string, ...args: unknown[]) {
    this.handlers.get(event)?.forEach((h) => (h as (...a: unknown[]) => void)(...args));
  }

  connect() {
    // Igual que el gateway real: el token se valida en cada conexión.
    void this.getToken().then((token) => {
      this.userId = userFromToken(token)?.id ?? null;
      if (!this.userId) {
        this.fire('connect_error', Object.assign(new Error('No autorizado'), { data: { code: 'UNAUTHORIZED' } }));
        return;
      }
      this.connected = true;
      this.fire('connect');
    });
    return this;
  }

  disconnect() {
    mockGame.unsubscribe(this.listener);
    if (this.connected) {
      this.connected = false;
      this.fire('disconnect', 'io client disconnect');
    }
    return this;
  }

  /** Simula una caída de red y la reconexión automática (para probar UX). */
  simulateDrop(ms = 2500) {
    mockGame.unsubscribe(this.listener);
    this.connected = false;
    this.fire('disconnect', 'transport close');
    setTimeout(() => this.connect(), ms);
  }

  emit(event: string, payload: unknown, ack: (response: SessionAck) => void) {
    setTimeout(() => {
      try {
        const p = (payload ?? {}) as {
          sessionId?: string;
          expectedQuestionId?: string;
          code?: string;
          sessionQuestionId?: string;
          choice?: boolean;
        };
        const user = this.userId!;
        let data: unknown;
        switch (event) {
          case 'room:subscribe':
            data = mockGame.subscribe(p.sessionId!, user, this.listener);
            break;
          case 'room:join':
            data = mockGame.joinRealtime(p.code ?? '', user, this.listener);
            break;
          case 'room:leave':
            data = mockGame.leave(p.sessionId!, user);
            mockGame.unsubscribe(this.listener);
            break;
          case 'answer:submit':
            data = mockGame.answer(user, p.sessionQuestionId ?? '', p.choice as boolean);
            break;
          case 'game:start':
            data = mockGame.start(p.sessionId!, user);
            break;
          case 'game:advance':
            data = mockGame.advance(p.sessionId!, user, p.expectedQuestionId!);
            break;
          case 'game:finish':
            data = mockGame.finish(p.sessionId!, user);
            break;
          case 'auth:refresh':
            data = { ok: true };
            break;
          default:
            throw new MockSessionError('EVENT_NOT_SUPPORTED', 'Evento no disponible');
        }
        ack({ ok: true, data });
      } catch (error) {
        const e = error as MockSessionError;
        ack({ ok: false, error: { code: e.code ?? 'INTERNAL_ERROR', message: e.message } });
      }
    }, 40);
    return this;
  }
}

/* ------------------------------------------------------------------ */

/**
 * Crea el socket del namespace /sessions. El token se pide en cada
 * (re)conexión para que un JWT renovado se use automáticamente.
 */
export function createSessionSocket(getToken: () => Promise<string | null>): SessionSocket {
  if (env.useMocks) return new MockSessionSocket(getToken);
  return io(`${env.apiUrl}/sessions`, {
    path: '/socket.io',
    autoConnect: false,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 800,
    reconnectionDelayMax: 5000,
    auth: (cb) => {
      void getToken().then((token) => cb({ token }));
    },
  }) as unknown as SessionSocket;
}
