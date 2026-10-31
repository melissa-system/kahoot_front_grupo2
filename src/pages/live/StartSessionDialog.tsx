import { useState, type FormEvent } from 'react';
import { QUESTION_DURATION, REVIEW_DURATION } from '../../api/types';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { errorMessage } from '../../lib/http';

interface Props {
  open: boolean;
  quizTitle: string;
  questionsCount: number;
  onClose(): void;
  onStart(values: { questionDurationSeconds: number; reviewDurationSeconds: number }): Promise<void>;
}

const QUESTION_PRESETS = [10, 20, 30, 60];

export function StartSessionDialog({ open, quizTitle, questionsCount, onClose, onStart }: Props) {
  const [questionSeconds, setQuestionSeconds] = useState<number>(QUESTION_DURATION.default);
  const [reviewSeconds, setReviewSeconds] = useState<number>(REVIEW_DURATION.default);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onStart({ questionDurationSeconds: questionSeconds, reviewDurationSeconds: reviewSeconds });
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <Modal open={open} title="Abrir sala en vivo" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <p className="text-muted">
          <strong className="text-fg">{quizTitle}</strong> · {questionsCount} {questionsCount === 1 ? 'pregunta' : 'preguntas'}
        </p>
        {error && <Alert tone="danger">{error}</Alert>}
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Tiempo por pregunta</legend>
          <div className="flex flex-wrap gap-2">
            {QUESTION_PRESETS.map((s) => (
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
        <p className="text-sm text-muted">El servidor controla el tiempo: al terminar la revisión avanza solo a la siguiente pregunta.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            Crear sala
          </Button>
        </div>
      </form>
    </Modal>
  );
}
