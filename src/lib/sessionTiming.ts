import type { RoomEnvelope } from '../api/types';

/** Ventana real de respuesta (cierra − abre). Si falta, usa el tiempo de la sala. */
export function answeringWindowSeconds(
  question: { openedAt: string; closesAt: string } | null | undefined,
  fallback: number,
): number {
  if (!question) return fallback;
  const seconds = Math.round((Date.parse(question.closesAt) - Date.parse(question.openedAt)) / 1000);
  return seconds > 0 ? seconds : fallback;
}

/**
 * Tiempo restante de la pregunta o de la revisión. El API a veces manda
 * remainingMs=0 en REVIEW; en ese caso se usa reviewEndsAt del sobre.
 */
export function liveRemainingMs(envelope: Pick<RoomEnvelope, 'remainingMs' | 'serverTime' | 'state'>): number {
  const question = envelope.state.currentQuestion;
  if (!question) return 0;
  if (question.status === 'OPEN') return Math.max(0, envelope.remainingMs);
  if (envelope.remainingMs > 0) return envelope.remainingMs;
  if (!question.reviewEndsAt) return 0;
  const end = Date.parse(question.reviewEndsAt);
  const serverNow = Date.parse(envelope.serverTime);
  if (!Number.isFinite(end) || !Number.isFinite(serverNow)) return 0;
  return Math.max(0, end - serverNow);
}

/** Instante local en el que cierra la ventana actual, o null si ya venció. */
export function liveDeadlineAt(envelope: Pick<RoomEnvelope, 'remainingMs' | 'serverTime' | 'state'>, now = Date.now()): number | null {
  const remaining = liveRemainingMs(envelope);
  return remaining > 0 ? now + remaining : null;
}
