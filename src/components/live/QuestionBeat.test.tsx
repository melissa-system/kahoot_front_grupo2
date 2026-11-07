import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QuestionBeat } from './QuestionBeat';

describe('QuestionBeat', () => {
  it('muestra el resultado y después la clasificación', () => {
    vi.useFakeTimers();
    const view = (stage: string) => <p>{stage}</p>;
    const { rerender } = render(
      <QuestionBeat index={0} reviewing={false} resultHoldMs={2000}>
        {view}
      </QuestionBeat>,
    );
    expect(screen.getByText('live')).toBeInTheDocument();

    rerender(
      <QuestionBeat index={0} reviewing resultHoldMs={2000}>
        {view}
      </QuestionBeat>,
    );
    expect(screen.getByText('result')).toBeInTheDocument();
    expect(screen.queryByText('ranking')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText('ranking')).toBeInTheDocument();
    vi.useRealTimers();
  });
});
