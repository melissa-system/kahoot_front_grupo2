import { describe, expect, it } from 'vitest';
import { isParticipantFatal, participantErrorMessage, reduceAnswer } from './useParticipantSession';

describe('reduceAnswer', () => {
  it('marca envío en curso y luego el ack exitoso', () => {
    const sending = reduceAnswer(undefined, { type: 'sending', choice: true });
    expect(sending).toEqual({ choice: true, status: 'sending' });
    const sent = reduceAnswer(sending, {
      type: 'ok',
      receipt: { id: 'a1', sessionQuestionId: 'q1', choice: true, answeredAt: '2026-01-01T00:00:00.000Z' },
    });
    expect(sent.status).toBe('sent');
    expect(sent.choice).toBe(true);
    expect(sent.receipt?.id).toBe('a1');
  });

  it('ANSWER_ALREADY_SUBMITTED se trata como enviada', () => {
    const next = reduceAnswer({ choice: true, status: 'sending' }, { type: 'error', code: 'ANSWER_ALREADY_SUBMITTED', message: 'ya', choice: false });
    expect(next.status).toBe('sent');
    expect(next.choice).toBe(true);
    expect(next.error?.code).toBe('ANSWER_ALREADY_SUBMITTED');
  });

  it('ANSWER_TOO_LATE queda como error', () => {
    const next = reduceAnswer({ choice: false, status: 'sending' }, { type: 'error', code: 'ANSWER_TOO_LATE', message: 'tarde', choice: false });
    expect(next.status).toBe('error');
    expect(next.choice).toBe(false);
  });
});

describe('códigos fatales del participante', () => {
  it('reconoce los códigos que cierran la sala', () => {
    expect(isParticipantFatal('SESSION_NOT_FOUND')).toBe(true);
    expect(isParticipantFatal('HOST_CANNOT_PARTICIPATE')).toBe(true);
    expect(isParticipantFatal('SESSION_NOT_JOINABLE')).toBe(true);
    expect(isParticipantFatal('ALREADY_IN_ACTIVE_SESSION')).toBe(true);
    expect(isParticipantFatal('ANSWER_TOO_LATE')).toBe(false);
    expect(isParticipantFatal('DISCONNECTED')).toBe(false);
  });

  it('traduce códigos a mensajes amistosos', () => {
    expect(participantErrorMessage('SESSION_NOT_FOUND')).toMatch(/no encontramos/i);
    expect(participantErrorMessage('HOST_CANNOT_PARTICIPATE')).toMatch(/anfitrión/i);
    expect(participantErrorMessage('DESCONOCIDO', 'fallback')).toBe('fallback');
  });
});
