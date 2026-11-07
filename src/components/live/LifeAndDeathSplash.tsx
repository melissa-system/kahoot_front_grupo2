import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';
import { playSfx } from '../../lib/sfx';

export const LIFE_DEATH_HOLD_MS = 2800;
export const LIFE_DEATH_FADE_MS = 450;

function prefersReducedMotion() {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

export function LifeAndDeathSplash({
  children,
  holdMs = LIFE_DEATH_HOLD_MS,
  enabled = true,
}: {
  children: ReactNode;
  holdMs?: number;
  enabled?: boolean;
}) {
  const [phase, setPhase] = useState<'splash' | 'out' | 'done'>(() => (!enabled || prefersReducedMotion() ? 'done' : 'splash'));

  useEffect(() => {
    if (!enabled || prefersReducedMotion()) {
      setPhase('done');
      return;
    }
    setPhase('splash');
    playSfx('dread');
    const fadeAt = window.setTimeout(() => {
      setPhase((current) => (current === 'done' ? current : 'out'));
    }, holdMs);
    const doneAt = window.setTimeout(() => setPhase('done'), holdMs + LIFE_DEATH_FADE_MS);
    return () => {
      window.clearTimeout(fadeAt);
      window.clearTimeout(doneAt);
    };
  }, [enabled, holdMs]);

  if (phase === 'done') return <>{children}</>;

  const overlay = (
    <button
      type="button"
      className={cn('pl-dread', phase === 'out' && 'pl-dread-out')}
      aria-label="Entre la vida y la muerte"
      onClick={() => setPhase('done')}
    >
      <span className="pl-dread-copy">
        <span className="pl-dread-kicker">El veredicto</span>
        <span className="pl-dread-title">Entre la vida y la muerte</span>
        <span className="pl-dread-hint">Toca para ver la última pregunta</span>
      </span>
    </button>
  );

  return (
    <>
      {phase === 'out' ? children : null}
      {createPortal(overlay, document.body)}
    </>
  );
}
