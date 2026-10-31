import { useCallback, useEffect, useRef, useState } from 'react';
import { SESSION_EVENTS, type RoomEnvelope, type SessionState } from '../api/types';
import { useAuth } from '../auth/useAuth';
import { ApiError, errorMessage } from '../lib/http';
import { createSessionSocket, sendCommand, SocketCommandError, type SessionSocket } from './sessionSocket';

export type ConnectionStatus = 'connecting' | 'online' | 'reconnecting' | 'offline';

export interface HostSessionError {
  code: string;
  message: string;
}

const FATAL_CODES = new Set(['SESSION_NOT_FOUND', 'HOST_REQUIRED', 'NOT_FOUND', 'FORBIDDEN']);
const TOKEN_REFRESH_MS = 5 * 60 * 1000;
const MAX_AUTH_RETRIES = 3;

/** Convierte el estado REST en un sobre equivalente al del socket. */
export function envelopeFromState(state: SessionState): RoomEnvelope {
  const q = state.currentQuestion;
  const target = q ? (q.status === 'OPEN' ? q.closesAt : q.reviewEndsAt) : null;
  const remainingMs = target ? Math.max(0, Date.parse(target) - Date.parse(state.serverTime)) : 0;
  return {
    streamId: 'rest',
    sequence: 0,
    sessionId: state.id,
    serverTime: state.serverTime,
    remainingMs,
    reviewDurationSeconds: 0,
    scoreboard: state.results ?? [],
    state,
  };
}

/** ¿Debe reemplazar `next` al sobre actual? Evita aplicar eventos viejos o de otra sala. */
export function isNewer(current: RoomEnvelope | null, next: RoomEnvelope, sessionId: string): boolean {
  if (next.sessionId !== sessionId) return false;
  if (!current) return true;
  if (current.streamId !== next.streamId) return next.streamId !== 'rest';
  return next.sequence >= current.sequence;
}

/**
 * Estado en vivo de una sala para el ANFITRIÓN. El servidor es la autoridad:
 * aquí solo se muestran sus sobres y se envían comandos (iniciar, avanzar,
 * finalizar). Cada (re)conexión pide un snapshot con room:subscribe.
 */
export function useHostSession(sessionId: string) {
  const { api, getToken } = useAuth();
  const [room, setRoom] = useState<RoomEnvelope | null>(null);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [connection, setConnection] = useState<ConnectionStatus>('connecting');
  const [fatal, setFatal] = useState<HostSessionError | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [commandError, setCommandError] = useState<HostSessionError | null>(null);
  const socketRef = useRef<SessionSocket | null>(null);
  const roomRef = useRef<RoomEnvelope | null>(null);

  const apply = useCallback(
    (next: RoomEnvelope) => {
      if (!isNewer(roomRef.current, next, sessionId)) return;
      roomRef.current = next;
      setRoom(next);
      setDeadline(next.remainingMs > 0 ? Date.now() + next.remainingMs : null);
    },
    [sessionId],
  );

  // Snapshot REST inicial (se ve algo aunque el socket tarde en conectar).
  useEffect(() => {
    let alive = true;
    api.sessions
      .get(sessionId)
      .then((state) => alive && apply(envelopeFromState(state)))
      .catch((err) => {
        if (!alive) return;
        if (err instanceof ApiError && (err.status === 404 || err.status === 403))
          setFatal({ code: err.code, message: err.status === 404 ? 'Esta sala no existe.' : 'Solo el anfitrión puede ver esta sala.' });
      });
    return () => {
      alive = false;
    };
  }, [api, sessionId, apply]);

  // Conexión Socket.IO
  useEffect(() => {
    let disposed = false;
    let authRetries = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const socket = createSessionSocket(getToken);
    socketRef.current = socket;

    const subscribe = async () => {
      try {
        apply(await sendCommand<RoomEnvelope>(socket, 'room:subscribe', { sessionId }));
        if (!disposed) setConnection('online');
        authRetries = 0;
      } catch (err) {
        const e = err as SocketCommandError;
        if (FATAL_CODES.has(e.code)) setFatal({ code: e.code, message: e.message });
        else setCommandError({ code: e.code, message: e.message });
      }
    };

    const onConnect = () => void subscribe();
    const onDisconnect = (reason: string) => {
      if (disposed || reason === 'io client disconnect') return;
      setConnection(navigator.onLine === false ? 'offline' : 'reconnecting');
    };
    const onConnectError = (error: Error & { data?: { code?: string } }) => {
      if (disposed) return;
      setConnection('reconnecting');
      // El middleware rechazó el token: socket.io no reintenta solo. Reintentar con token nuevo.
      if (error.data?.code === 'UNAUTHORIZED') {
        authRetries += 1;
        if (authRetries > MAX_AUTH_RETRIES) {
          setFatal({ code: 'UNAUTHORIZED', message: 'Tu sesión expiró. Vuelve a iniciar sesión para dirigir la sala.' });
          return;
        }
        retryTimer = setTimeout(() => socket.connect(), 1500 * authRetries);
      }
    };
    const onEnvelope = (envelope: RoomEnvelope) => apply(envelope);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect as never);
    socket.on('connect_error', onConnectError as never);
    SESSION_EVENTS.forEach((event) => socket.on(event, onEnvelope as never));
    socket.connect();

    const goOffline = () => setConnection('offline');
    const goOnline = () => {
      setConnection(socket.connected ? 'online' : 'reconnecting');
      if (!socket.connected) socket.connect();
    };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);

    const refresh = setInterval(async () => {
      const token = await getToken();
      if (token && socket.connected) sendCommand(socket, 'auth:refresh', { token }).catch(() => undefined);
    }, TOKEN_REFRESH_MS);

    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      clearInterval(refresh);
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      SESSION_EVENTS.forEach((event) => socket.off(event));
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionId, apply, getToken]);

  const run = useCallback(
    async (event: 'game:start' | 'game:advance' | 'game:finish', extra: Record<string, unknown> = {}) => {
      const socket = socketRef.current;
      if (!socket) return false;
      setBusy(event);
      setCommandError(null);
      try {
        apply(await sendCommand<RoomEnvelope>(socket, event, { sessionId, ...extra }));
        return true;
      } catch (err) {
        const e = err instanceof SocketCommandError ? err : new SocketCommandError('INTERNAL_ERROR', errorMessage(err));
        setCommandError({ code: e.code, message: e.message });
        // Tras un error incierto, el estado real lo dicta el servidor.
        if (e.code === 'TIMEOUT' || e.code === 'INTERNAL_ERROR')
          sendCommand<RoomEnvelope>(socket, 'room:subscribe', { sessionId }).then(apply, () => undefined);
        return false;
      } finally {
        setBusy(null);
      }
    },
    [apply, sessionId],
  );

  return {
    room,
    state: room?.state ?? null,
    deadline,
    connection,
    fatal,
    busy,
    commandError,
    clearCommandError: () => setCommandError(null),
    start: () => run('game:start'),
    advance: () => (room?.state.currentQuestion ? run('game:advance', { expectedQuestionId: room.state.currentQuestion.id }) : Promise.resolve(false)),
    finish: () => run('game:finish'),
    /** Solo modo mock: simula una caída de red para probar la reconexión. */
    simulateDrop: () => {
      const s = socketRef.current as unknown as { simulateDrop?: () => void } | null;
      s?.simulateDrop?.();
    },
  };
}

/** Segundos restantes hasta `deadline`, actualizados varias veces por segundo. */
export function useCountdown(deadline: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadline) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [deadline]);
  return deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0;
}
