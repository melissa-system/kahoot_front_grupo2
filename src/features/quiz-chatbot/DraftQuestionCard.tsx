import { TextAreaField } from '../../components/ui/Field';
import { validateStatement } from '../../lib/validation';
import type { DraftQuestion } from '../../api/chatbot.types';
import type { ReviewQuestion } from './useQuizChat';

// Revisión tipo hoja: número+afirmación primero; verde/rojo comunican V/F, no decoración.
export function DraftQuestionCard({ question, index, disabled, onChange }: {
  question: ReviewQuestion; index: number; disabled: boolean;
  onChange(change: Partial<DraftQuestion & { selected: boolean }>): void;
}) {
  return (
    <li className={`space-y-3 rounded-xl border border-line bg-surface p-4 ${question.selected ? '' : 'opacity-60'}`}>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base font-semibold">
        <input type="checkbox" checked={question.selected} disabled={disabled} onChange={(e) => onChange({ selected: e.target.checked })}
          className="h-5 w-5 accent-primary" />Incluir pregunta {index + 1}
      </label>
      <TextAreaField label={`Afirmación propuesta ${index + 1}`} value={question.statement} maxLength={500} rows={3} className="text-base leading-relaxed sm:text-lg"
        disabled={disabled || !question.selected} onChange={(e) => onChange({ statement: e.target.value })}
        error={question.selected ? validateStatement(question.statement) : undefined} />
      <fieldset disabled={disabled || !question.selected}>
        <legend className="mb-2 text-sm font-medium">Respuesta correcta · pregunta {index + 1}</legend>
        <div className="grid grid-cols-2 gap-2">
          {[true, false].map((answer) => <label key={String(answer)} className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border text-base font-semibold ${question.correctBoolean === answer ? answer ? 'border-success bg-success-soft text-success' : 'border-danger bg-danger-soft text-danger' : 'border-line bg-surface-2 text-muted'}`}>
            <input type="radio" name={`answer-${question.key}`} value={String(answer)} checked={question.correctBoolean === answer}
              onChange={() => onChange({ correctBoolean: answer })} className="accent-current" />{answer ? 'Verdadero' : 'Falso'}
          </label>)}
        </div>
      </fieldset>
    </li>
  );
}
