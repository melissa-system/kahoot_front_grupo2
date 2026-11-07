import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LIFE_DEATH_FADE_MS, LifeAndDeathSplash } from './LifeAndDeathSplash';

describe('LifeAndDeathSplash', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('asusta primero y luego revela la última pregunta', () => {
    vi.useFakeTimers();
    render(
      <LifeAndDeathSplash holdMs={1000}>
        <p>Última pregunta</p>
      </LifeAndDeathSplash>,
    );
    expect(screen.getByRole('button', { name: 'Entre la vida y la muerte' })).toBeInTheDocument();
    expect(screen.queryByText('Última pregunta')).not.toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1000 + LIFE_DEATH_FADE_MS);
    });
    expect(screen.getByText('Última pregunta')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Entre la vida y la muerte' })).not.toBeInTheDocument();
  });

  it('no interrumpe las preguntas anteriores', () => {
    render(
      <LifeAndDeathSplash enabled={false}>
        <p>Pregunta 1</p>
      </LifeAndDeathSplash>,
    );
    expect(screen.getByText('Pregunta 1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Entre la vida y la muerte' })).not.toBeInTheDocument();
  });

  it('permite saltar el susto con un clic', async () => {
    render(
      <LifeAndDeathSplash>
        <p>Última pregunta</p>
      </LifeAndDeathSplash>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Entre la vida y la muerte' }));
    expect(screen.getByText('Última pregunta')).toBeInTheDocument();
  });
});
