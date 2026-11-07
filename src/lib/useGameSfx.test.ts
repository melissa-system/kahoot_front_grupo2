import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CurrentQuestionView } from '../api/types';
import { playSfx } from './sfx';
import { useGameSfx } from './useGameSfx';

vi.mock('./sfx', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./sfx')>();
  return { ...actual, playSfx: vi.fn() };
});

type GameSfxProps = Parameters<typeof useGameSfx>[0];

const openQ: CurrentQuestionView = {
  id: 'q1',
  position: 0,
  statement: '¿2+2=4?',
  imageUrl: null,
  openedAt: '',
  closesAt: '',
  closedAt: null,
  reviewEndsAt: null,
  status: 'OPEN',
};

function closedQ(id: string, correct: boolean): CurrentQuestionView {
  return { ...openQ, id, status: 'CLOSED', correctBoolean: correct, closedAt: '', reviewEndsAt: '' };
}

function renderSfx(initialProps: GameSfxProps) {
  return renderHook<void, GameSfxProps>((props) => useGameSfx(props), { initialProps });
}

describe('useGameSfx', () => {
  beforeEach(() => {
    vi.mocked(playSfx).mockClear();
  });

  it('no suena en el primer snapshot', () => {
    renderSfx({
      ready: true,
      status: 'WAITING',
      phase: 'WAITING',
      participantCount: 1,
    });
    expect(playSfx).not.toHaveBeenCalled();
  });

  it('pop al unirse alguien, question al iniciar, correct al acertar y finish al terminar', () => {
    const { rerender } = renderSfx({
      ready: true,
      status: 'WAITING',
      phase: 'WAITING',
      participantCount: 1,
    });

    rerender({ ready: true, status: 'WAITING', phase: 'WAITING', participantCount: 2 });
    expect(playSfx).toHaveBeenCalledWith('pop');

    rerender({
      ready: true,
      status: 'IN_PROGRESS',
      phase: 'ANSWERING',
      participantCount: 2,
      question: openQ,
    });
    expect(playSfx).toHaveBeenCalledWith('question');

    rerender({
      ready: true,
      status: 'IN_PROGRESS',
      phase: 'REVIEW',
      participantCount: 2,
      question: closedQ('q1', true),
      myChoice: true,
    });
    expect(playSfx).toHaveBeenCalledWith('correct');

    rerender({
      ready: true,
      status: 'FINISHED',
      phase: 'FINISHED',
      participantCount: 2,
      question: closedQ('q1', true),
      myChoice: true,
    });
    expect(playSfx).toHaveBeenCalledWith('finish');
  });

  it('wrong si eligió mal y reveal si no respondió', () => {
    const { rerender } = renderSfx({
      ready: true,
      status: 'IN_PROGRESS',
      phase: 'ANSWERING',
      participantCount: 1,
      question: openQ,
    });

    rerender({
      ready: true,
      status: 'IN_PROGRESS',
      phase: 'REVIEW',
      participantCount: 1,
      question: closedQ('q1', true),
      myChoice: false,
    });
    expect(playSfx).toHaveBeenCalledWith('wrong');

    vi.mocked(playSfx).mockClear();
    rerender({
      ready: true,
      status: 'IN_PROGRESS',
      phase: 'ANSWERING',
      participantCount: 1,
      question: { ...openQ, id: 'q2' },
    });
    expect(playSfx).toHaveBeenCalledWith('question');

    rerender({
      ready: true,
      status: 'IN_PROGRESS',
      phase: 'REVIEW',
      participantCount: 1,
      question: closedQ('q2', true),
    });
    expect(playSfx).toHaveBeenCalledWith('reveal');
  });

  it('reconnect al volver online', () => {
    const { rerender } = renderSfx({
      ready: true,
      status: 'WAITING',
      phase: 'WAITING',
      participantCount: 1,
      connection: 'reconnecting',
    });
    rerender({
      ready: true,
      status: 'WAITING',
      phase: 'WAITING',
      participantCount: 1,
      connection: 'online',
    });
    expect(playSfx).toHaveBeenCalledWith('reconnect');
  });
});
