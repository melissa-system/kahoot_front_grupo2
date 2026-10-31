import { describe, expect, it } from 'vitest';
import type { RoomEnvelope, SessionState } from '../api/types';
import { envelopeFromState, isNewer } from './useHostSession';

const state = (overrides: Partial<SessionState> = {}): SessionState => ({
  id: 's1',
  code: 'ABC234',
  hostId: 'h',
  quizTitle: 'Q',
  status: 'IN_PROGRESS',
  phase: 'ANSWERING',
  questionDurationSeconds: 30,
  currentIndex: 0,
  questionsCount: 2,
  startedAt: null,
  finishedAt: null,
  serverTime: '2026-10-31T10:00:00.000Z',
  participants: [],
  currentQuestion: {
    id: 'q1',
    position: 0,
    statement: 'x',
    imageUrl: null,
    openedAt: '2026-10-31T09:59:50.000Z',
    closesAt: '2026-10-31T10:00:20.000Z',
    closedAt: null,
    reviewEndsAt: null,
    status: 'OPEN',
  },
  results: null,
  ...overrides,
});

const env = (sequence: number, sessionId = 's1', streamId = 'stream'): RoomEnvelope => ({
  ...envelopeFromState(state({ id: sessionId })),
  streamId,
  sequence,
  sessionId,
});

describe('sobres de la sala', () => {
  it('calcula el tiempo restante con el reloj del servidor, no el del navegador', () => {
    expect(envelopeFromState(state()).remainingMs).toBe(20_000);
  });

  it('ignora eventos viejos (secuencia menor) y de otra sala', () => {
    expect(isNewer(env(5), env(4), 's1')).toBe(false);
    expect(isNewer(env(5), env(6), 's1')).toBe(true);
    expect(isNewer(env(5), env(9, 'otra'), 's1')).toBe(false);
  });

  it('el snapshot del socket reemplaza al REST, pero no al revés', () => {
    const rest = { ...env(0), streamId: 'rest' };
    expect(isNewer(rest, env(1), 's1')).toBe(true);
    expect(isNewer(env(3), rest, 's1')).toBe(false);
  });
});
