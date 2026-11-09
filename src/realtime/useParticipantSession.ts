import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SESSION_EVENTS,
  normalizeSessionCode,
  type AnswerReceipt,
  type ParticipantView,
  type RealtimeJoinResult,
  type RoomEnvelope,
  type SessionResultView,
} from '../api/types';
import { useAuth } from '../auth/useAuth';
import { ApiError, errorMessage } from '../lib/http';
import { createSessionSocket, sendCommand, SocketCommandError, type SessionSocket } from './sessionSocket';
import { liveDeadlineAt } from '../lib/sessionTiming';
import { isNewer, type ConnectionStatus, type HostSessionError } from './useHostSession';

export const LAST_ROOM_KEY = 'profelink-last-room';

export const PARTICIPANT_FATAL_CODES = new Set([
  'SESSION_NOT_FOUND',
  'HOST_CANNOT_PARTICIPATE',
  'SESSION_NOT_JOINABLE',
  'SESSION_FINISHED',
  'ALREADY_IN_ACTIVE_SESSION',
]);

export const PARTICIPANT_ERROR_MESSAGES: Record<string, string> = {
  SESSION_NOT_FOUND: 'No encontramos esa sala. Revisa el código.',
  HOST_CANNOT_PARTICIPATE: 'Eres el anfitrión de esta sala; ábrela desde Mis cuestionarios.',
  SESSION_NOT_JOINABLE: 'La partida ya empezó y no acepta nuevos jugadores.',
  SESSION_FINISHED: 'Esta partida ya terminó.',
  ALREADY_IN_ACTIVE_SESSION: 'Ya estás en otra sala. Sal de ella antes de unirte a esta.',
  ANSWER_ALREADY_SUBMITTED: 'Ya enviaste una respuesta distinta para esta pregunta.',
  ANSWER_TOO_LATE: 'Se acabó el tiempo para responder.',
  QUESTION_NOT_OPEN: 'Esta pregunta ya no está abierta.',
  SESSION_NOT_LEAVABLE: 'Solo puedes salir mientras la sala está en espera.',
  DISCONNECTED: 'Sin conexión con la sala. Espera a que se restablezca.',
  UNAUTHORIZED: 'Tu sesión expiró. Vuelve a iniciar sesión para jugar.',
};

const TOKEN_REFRESH_MS = 5 * 60 * 1000;
const MAX_AUTH_RETRIES = 3;

export type AnswerStatus = 'sending' | 'sent' | 'error';

export interface AnswerEntry {
  choice?: boolean | number;
  status: AnswerStatus;
  receipt?: AnswerReceipt;
  error?: { code: string; message: string };
}

export type AnswerAction =
  | { type: 'sending'; choice: boolean | number }
  | { type: 'ok'; receipt: AnswerReceipt }
  | { type: 'error'; code: string; message: string; choice?: boolean | number };

/** Reduce el estado local de una respuesta según el ack del servidor. */
export function reduceAnswer(current: AnswerEntry | undefined, action: AnswerAction): AnswerEntry {
  if (action.type === 'sending') return { choice: action.choice, status: 'sending' };
  if (action.type === 'ok')
    return {
      choice: action.receipt.choiceIndex ?? action.receipt.choice,
      status: 'sent',
      receipt: action.receipt,
    };
  if (action.code === 'ANSWER_ALREADY_SUBMITTED') {
    return { choice: current?.choice, status: 'sent', error: { code: action.code, message: action.message } };
  }
  return { choice: action.choice ?? current?.choice, status: 'error', error: { code: action.code, message: action.message } };
}

export function isParticipantFatal(code: string): boolean {
  return PARTICIPANT_FATAL_CODES.has(code);
}

export function participantErrorMessage(code: string, fallback?: string): string {
  return PARTICIPANT_ERROR_MESSAGES[code] ?? fallback ?? 'Ocurrió un error inesperado.';
}

/**
 * Estado en vivo de una sala para el PARTICIPANTE. En cada conexión pide
 * `room:join` (idempotente: une y suscribe, sin duplicar). El servidor es
 * la autoridad; aquí solo se muestran sus sobres y se envía answer:submit.
 */
export function useParticipantSession(code: string) {
  const { api, getToken } = useAuth();
  const normalized = normalizeSessionCode(code);
  const [room, setRoom] = useState<RoomEnvelope | null>(null);
  const [me, setMe] = useState<ParticipantView | null>(null);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [connection, setConnection] = useState<ConnectionStatus>('connecting');
  const [fatal, setFatal] = useState<HostSessionError | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [commandError, setCommandError] = useState<HostSessionError | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerEntry>>({});
  const socketRef = useRef<SessionSocket | null>(null);
  const roomRef = useRef<RoomEnvelope | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const apply = useCallback((next: RoomEnvelope) => {
    const sid = sessionIdRef.current ?? next.sessionId;
    if (!isNewer(roomRef.current, next, sid)) return;
    sessionIdRef.current = next.sessionId;
    roomRef.current = next;
    setRoom(next);
    setDeadline(liveDeadlineAt(next));
  }, []);

  useEffect(() => {
    let alive = true;
    api.sessions
      .stateByCode(normalized)
      .then((envelope) => {
        if (!alive) return;
        apply(envelope);
      })
      .catch((err) => {
        if (!alive) return;
        if (!(err instanceof ApiError)) return;
        if (err.status === 404) return;
        if (isParticipantFatal(err.code)) setFatal({ code: err.code, message: participantErrorMessage(err.code, err.message) });
      });
    return () => {
      alive = false;
    };
  }, [api, normalized, apply]);

  useEffect(() => {
    let disposed = false;
    let authRetries = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const socket = createSessionSocket(getToken);
    socketRef.current = socket;

    const join = async () => {
      try {
        const result = await sendCommand<RealtimeJoinResult>(socket, 'room:join', { code: normalized });
        if (disposed) return;
        setMe(result.participant);
        apply(result.room);
        setConnection('online');
        authRetries = 0;
        try {
          sessionStorage.setItem(LAST_ROOM_KEY, normalized);
        } catch {
          /* sessionStorage no disponible */
        }
      } catch (err) {
        const e = err as SocketCommandError;
        if (isParticipantFatal(e.code) || e.code === 'UNAUTHORIZED') {
          setFatal({ code: e.code, message: participantErrorMessage(e.code, e.message) });
        } else {
          setCommandError({ code: e.code, message: participantErrorMessage(e.code, e.message) });
        }
      }
    };

    const onConnect = () => void join();
    const onDisconnect = (reason: string) => {
      if (disposed || reason === 'io client disconnect') return;
      setConnection(navigator.onLine === false ? 'offline' : 'reconnecting');
    };
    const onConnectError = (error: Error & { data?: { code?: string } }) => {
      if (disposed) return;
      setConnection('reconnecting');
      if (error.data?.code === 'UNAUTHORIZED') {
        authRetries += 1;
        if (authRetries > MAX_AUTH_RETRIES) {
          setFatal({ code: 'UNAUTHORIZED', message: participantErrorMessage('UNAUTHORIZED') });
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
  }, [normalized, apply, getToken]);

  // Si se pierde el evento de la siguiente pregunta, recupera el estado al vencer la revisión.
  useEffect(() => {
    const question = room?.state.currentQuestion;
    if (!question || question.status !== 'CLOSED' || room.state.status !== 'IN_PROGRESS') return;
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const wait = Math.max(0, (deadline ?? Date.now()) - Date.now()) + 400;
    const pull = async () => {
      if (cancelled) return;
      const current = roomRef.current?.state.currentQuestion;
      if (!current || current.id !== question.id || current.status !== 'CLOSED') return;
      try {
        const socket = socketRef.current;
        if (socket?.connected) {
          const result = await sendCommand<RealtimeJoinResult>(socket, 'room:join', { code: normalized });
          if (!cancelled) {
            setMe(result.participant);
            apply(result.room);
          }
        } else {
          apply(await api.sessions.stateByCode(normalized));
        }
      } catch {
        /* se reintenta */
      }
      if (!cancelled && roomRef.current?.state.currentQuestion?.id === question.id && roomRef.current.state.currentQuestion.status === 'CLOSED') {
        retry = setTimeout(() => void pull(), 1000);
      }
    };
    const timer = setTimeout(() => void pull(), wait);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearTimeout(retry);
    };
  }, [api, apply, deadline, normalized, room?.state.currentQuestion?.id, room?.state.currentQuestion?.status, room?.state.status]);

  const submitAnswer = useCallback(async (choice: boolean | number) => {
    const socket = socketRef.current;
    const q = roomRef.current?.state.currentQuestion;
    if (!socket || !q || q.status !== 'OPEN') return false;
    let skipped = false;
    setAnswers((prev) => {
      const existing = prev[q.id];
      if (existing?.status === 'sent' || existing?.status === 'sending') {
        skipped = true;
        return prev;
      }
      return { ...prev, [q.id]: reduceAnswer(prev[q.id], { type: 'sending', choice }) };
    });
    if (skipped) return false;
    setBusy('answer:submit');
    setCommandError(null);
    const payload =
      typeof choice === 'number'
        ? { sessionQuestionId: q.id, choiceIndex: choice }
        : { sessionQuestionId: q.id, choice };
    try {
      const data = await sendCommand<{ answer: AnswerReceipt }>(socket, 'answer:submit', payload);
      setAnswers((prev) => ({ ...prev, [q.id]: reduceAnswer(prev[q.id], { type: 'ok', receipt: data.answer }) }));
      return true;
    } catch (err) {
      const e = err instanceof SocketCommandError ? err : new SocketCommandError('INTERNAL_ERROR', errorMessage(err));
      setAnswers((prev) => ({
        ...prev,
        [q.id]: reduceAnswer(prev[q.id], { type: 'error', code: e.code, message: e.message, choice }),
      }));
      setCommandError({ code: e.code, message: participantErrorMessage(e.code, e.message) });
      return false;
    } finally {
      setBusy(null);
    }
  }, []);

  const leave = useCallback(async () => {
    const socket = socketRef.current;
    const sid = sessionIdRef.current;
    if (!sid) return false;
    setBusy('room:leave');
    setCommandError(null);
    try {
      if (socket?.connected) await sendCommand(socket, 'room:leave', { sessionId: sid });
      else await api.sessions.leave(sid);
      return true;
    } catch (err) {
      const e = err instanceof SocketCommandError ? err : new SocketCommandError('INTERNAL_ERROR', errorMessage(err));
      setCommandError({ code: e.code, message: participantErrorMessage(e.code, e.message) });
      return false;
    } finally {
      setBusy(null);
    }
  }, [api]);

  const myRow: SessionResultView | null = me ? (room?.scoreboard.find((r) => r.participantId === me.id) ?? null) : null;
  const currentAnswer = room?.state.currentQuestion ? answers[room.state.currentQuestion.id] : undefined;

  return {
    room,
    state: room?.state ?? null,
    me,
    myRow,
    answers,
    currentAnswer,
    deadline,
    connection,
    fatal,
    busy,
    commandError,
    clearCommandError: () => setCommandError(null),
    submitAnswer,
    leave,
    simulateDrop: () => {
      const s = socketRef.current as unknown as { simulateDrop?: () => void } | null;
      s?.simulateDrop?.();
    },
  };
}
