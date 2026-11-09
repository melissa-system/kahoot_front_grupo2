import { describe, expect, it } from 'vitest';
import type { RoomEnvelope } from '../api/types';
import { liveDeadlineAt, liveRemainingMs } from './sessionTiming';

const envelope = (overrides: Partial<RoomEnvelope['state']> = {}, remainingMs = 0): RoomEnvelope => ({
  streamId: 's',
  sequence: 1,
  sessionId: 's1',
  serverTime: '2026-11-09T02:00:00.000Z',
  remainingMs,
  reviewDurationSeconds: 5,
  scoreboard: [],
  state: {
    id: 's1',
    code: 'ABC234',
    hostId: 'h',
    quizTitle: 'Q',
    status: 'IN_PROGRESS',
    phase: 'REVIEW',
    questionDurationSeconds: 30,
    currentIndex: 0,
    questionsCount: 2,
    startedAt: '2026-11-09T01:59:00.000Z',
    finishedAt: null,
    serverTime: '2026-11-09T02:00:00.000Z',
    participants: [],
    currentQuestion: {
      id: 'q1',
      position: 0,
      statement: 'x',
      imageUrl: null,
      openedAt: '2026-11-09T01:59:50.000Z',
      closesAt: '2026-11-09T02:00:00.000Z',
      closedAt: '2026-11-09T02:00:00.000Z',
      reviewEndsAt: '2026-11-09T02:00:05.000Z',
      status: 'CLOSED',
      correctBoolean: true,
    },
    results: null,
    ...overrides,
  },
});

describe('tiempo en vivo de la sala', () => {
  it('en revisión usa reviewEndsAt si el API manda remainingMs=0', () => {
    expect(liveRemainingMs(envelope())).toBe(5_000);
    expect(liveDeadlineAt(envelope(), Date.parse('2026-11-09T02:00:00.000Z'))).toBe(
      Date.parse('2026-11-09T02:00:05.000Z'),
    );
  });

  it('no inventa tiempo cuando la pregunta sigue abierta y remainingMs ya venció', () => {
    const open = envelope(
      {
        phase: 'ANSWERING',
        currentQuestion: {
          id: 'q1',
          position: 0,
          statement: 'x',
          imageUrl: null,
          openedAt: '2026-11-09T01:59:30.000Z',
          closesAt: '2026-11-09T02:00:00.000Z',
          closedAt: null,
          reviewEndsAt: null,
          status: 'OPEN',
        },
      },
      0,
    );
    expect(liveRemainingMs(open)).toBe(0);
    expect(liveDeadlineAt(open)).toBeNull();
  });
});
