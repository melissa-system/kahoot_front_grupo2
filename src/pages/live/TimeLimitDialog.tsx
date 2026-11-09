import { useState, type FormEvent } from 'react';
import { QUESTION_DURATION, QUESTION_DURATION_PRESETS, REVIEW_DURATION } from '../../api/types';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { loadQuizTiming, saveQuizTiming, type QuizTiming } from '../../lib/quizTiming';

interface Props {
  open: boolean;
  quizId: string;
  quizTitle: string;
  questionsCount: number;
  onClose(): void;
  onSaved?(timing: QuizTiming): void;
}

export function TimeLimitDialog({ open, quizId, quizTitle, questionsCount, onClose, onSaved }: Props) {
  const [questionSeconds, setQuestionSeconds] = useState(() => loadQuizTiming(quizId).questionDurationSeconds);
  const [reviewSeconds, setReviewSeconds] = useState(() => loadQuizTiming(quizId).reviewDurationSeconds);

  function submit(e: FormEvent) {
    e.preventDefault();
    const timing = saveQuizTiming(quizId, {
      questionDurationSeconds: questionSeconds,
      reviewDurationSeconds: reviewSeconds,
    });
    onSaved?.(timing);
    onClose();
  }

  return (
    <Modal open={open} title="Tiempo límite" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <p className="text-muted">
          <strong className="text-fg">{quizTitle}</strong> · {questionsCount} {questionsCount === 1 ? 'pregunta' : 'preguntas'}
        </p>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Tiempo por defecto</legend>
          <div className="flex flex-wrap gap-2">
            {QUESTION_DURATION_PRESETS.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={questionSeconds === s}
                onClick={() => setQuestionSeconds(s)}
                className={`h-10 rounded-lg border px-4 font-semibold ${questionSeconds === s ? 'border-primary bg-primary text-white' : 'border-line bg-surface-2'}`}
              >
                {s} s
              </button>
            ))}
          </div>
          <label className="flex items-center gap-3 text-sm text-muted">
            Personalizado
            <input
              type="range"
              min={QUESTION_DURATION.min}
              max={QUESTION_DURATION.max}
              value={questionSeconds}
              onChange={(e) => setQuestionSeconds(Number(e.target.value))}
              className="flex-1 accent-[var(--pl-primary)]"
              aria-label="Segundos por pregunta"
            />
            <span className="w-12 text-right font-semibold text-fg">{questionSeconds} s</span>
          </label>
        </fieldset>
        <label className="block space-y-2">
          <span className="text-sm font-medium">Tiempo de revisión (muestra la respuesta)</span>
          <span className="flex items-center gap-3">
            <input
              type="range"
              min={REVIEW_DURATION.min}
              max={REVIEW_DURATION.max}
              value={reviewSeconds}
              onChange={(e) => setReviewSeconds(Number(e.target.value))}
              className="flex-1 accent-[var(--pl-primary)]"
              aria-label="Segundos de revisión"
            />
            <span className="w-12 text-right font-semibold">{reviewSeconds} s</span>
          </span>
        </label>
        <p className="text-sm text-muted">Las preguntas sin tiempo propio usan este valor. Al terminar la revisión, avanza solo a la siguiente.</p>
        <div className="flex items-center justify-between gap-2">
          <Button type="submit">Guardar</Button>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
