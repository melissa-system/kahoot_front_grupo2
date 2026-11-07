import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Podium } from './Podium';

const participants = [
  { id: 'a', sessionId: 's', userId: 'ua', displayName: 'Ana', joinedAt: '' },
  { id: 'b', sessionId: 's', userId: 'ub', displayName: 'Beto', joinedAt: '' },
  { id: 'c', sessionId: 's', userId: 'uc', displayName: 'Cami', joinedAt: '' },
];
const rows = [
  { participantId: 'a', totalScore: 9, rank: 1 },
  { participantId: 'b', totalScore: 6, rank: 2 },
  { participantId: 'c', totalScore: 3, rank: 3 },
];

describe('Podium', () => {
  it('revela tercero, segundo y luego primero', () => {
    vi.useFakeTimers();
    render(<Podium rows={rows} participants={participants} startMs={200} stepMs={1000} firstPauseMs={400} />);

    expect(screen.queryByText('Cami')).not.toBeInTheDocument();
    expect(screen.queryByTestId('podium-confetti')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByText('Cami')).toBeInTheDocument();
    expect(screen.queryByText('Beto')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText('Beto')).toBeInTheDocument();
    expect(screen.queryByText('Ana')).not.toBeInTheDocument();
    expect(screen.queryByTestId('podium-confetti')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1400);
    });
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByTestId('podium-confetti')).toBeInTheDocument();
    vi.useRealTimers();
  });
});
