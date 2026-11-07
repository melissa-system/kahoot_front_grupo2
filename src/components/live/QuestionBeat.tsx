import { useEffect, useState, type ReactNode } from 'react';
import { Spinner } from '../ui/Spinner';

export type ReviewStage = 'live' | 'result' | 'ranking';

export const NEXT_QUESTION_HOLD_MS = import.meta.env.MODE === 'test' ? 0 : 1100;
/** Tiempo de la pantalla “acertó / falló” antes de pasar a la clasificación. */
export const REVIEW_RESULT_HOLD_MS = import.meta.env.MODE === 'test' ? 0 : 2200;

function holdMs(ms: number) {
  if (ms <= 0) return 0;
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 0;
  return ms;
}

function Curtain({ label }: { label: string }) {
  return (
    <div className="pl-curtain" role="status" aria-live="polite">
      <Spinner label={label} className="h-8 w-8 text-primary" />
    </div>
  );
}

export function QuestionBeat({
  index,
  reviewing,
  skipIntro = false,
  resultHoldMs = REVIEW_RESULT_HOLD_MS,
  children,
}: {
  index: number;
  reviewing: boolean;
  skipIntro?: boolean;
  resultHoldMs?: number;
  children: (stage: ReviewStage) => ReactNode;
}) {
  const [intro, setIntro] = useState(() => !skipIntro && index > 0 && !reviewing && holdMs(NEXT_QUESTION_HOLD_MS) > 0);
  const [stage, setStage] = useState<ReviewStage>(() => (reviewing ? (resultHoldMs > 0 ? 'result' : 'ranking') : 'live'));

  useEffect(() => {
    if (!intro) return;
    const id = window.setTimeout(() => setIntro(false), holdMs(NEXT_QUESTION_HOLD_MS));
    return () => window.clearTimeout(id);
  }, [intro]);

  useEffect(() => {
    if (!reviewing) {
      setStage('live');
      return;
    }
    if (resultHoldMs <= 0) {
      setStage('ranking');
      return;
    }
    setStage('result');
    const id = window.setTimeout(() => setStage('ranking'), resultHoldMs);
    return () => window.clearTimeout(id);
  }, [reviewing, index, resultHoldMs]);

  if (intro) return <Curtain label="Preparando la siguiente pregunta…" />;
  return <>{children(stage)}</>;
}
