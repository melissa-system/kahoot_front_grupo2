import { MathMixField } from '../../components/ui/MathMixField';
import { cn } from '../../lib/cn';
import { isMultipleDraft } from '../../lib/draftQuestion';
import { validateStatement } from '../../lib/validation';
import { MULTIPLE_OPTION_COUNT, MULTIPLE_OPTION_TONES } from '../../lib/questionKind';
import type { DraftQuestion } from '../../api/chatbot.types';
import type { ReviewQuestion } from './useQuizChat';

export function DraftQuestionCard({ question, index, disabled, onChange }: {
  question: ReviewQuestion; index: number; disabled: boolean;
  onChange(change: Partial<DraftQuestion & { selected: boolean }>): void;
}) {
  const multiple = isMultipleDraft(question);
  const options = question.options ?? Array.from({ length: MULTIPLE_OPTION_COUNT }, () => '');
  const correctIndexes = question.correctIndexes ?? [];
  const locked = disabled || !question.selected;
  return (
    <li className={`space-y-3 rounded-xl border border-line bg-surface p-4 ${question.selected ? '' : 'opacity-60'}`}>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base font-semibold">
        <input type="checkbox" checked={question.selected} disabled={disabled} onChange={(e) => onChange({ selected: e.target.checked })}
          className="h-5 w-5 accent-primary" />Incluir pregunta {index + 1}
      </label>
      <div className="grid grid-cols-2 gap-2">
        {([
          ['boolean', 'Verdadero o falso'],
          ['multiple', '4 opciones'],
        ] as const).map(([kind, label]) => (
          <button
            key={kind}
            type="button"
            disabled={locked}
            onClick={() =>
              onChange(
                kind === 'multiple'
                  ? { kind: 'multiple', options: options.map((item) => item || ''), correctIndexes, correctBoolean: undefined }
                  : { kind: 'boolean', correctBoolean: question.correctBoolean ?? true, options: undefined, correctIndexes: undefined },
              )
            }
            className={cn(
              'h-10 rounded-xl border text-sm font-semibold transition',
              (kind === 'multiple') === multiple
                ? 'border-primary bg-primary-soft text-primary'
                : 'border-line bg-surface-2 text-muted hover:text-fg',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <MathMixField
        label={multiple ? `Pregunta propuesta ${index + 1}` : `Afirmación propuesta ${index + 1}`}
        value={question.statement}
        maxLength={500}
        className="text-base leading-relaxed sm:text-lg"
        disabled={locked}
        onChange={(statement) => onChange({ statement })}
        error={question.selected ? validateStatement(question.statement) : undefined}
      />
      {multiple ? (
        <fieldset disabled={locked}>
          <legend className="mb-2 text-sm font-medium">Opciones · marca las correctas · pregunta {index + 1}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {MULTIPLE_OPTION_TONES.map((tone, optionIndex) => {
              const selected = correctIndexes.includes(optionIndex);
              return (
                <div key={tone.key} className={cn('rounded-2xl border-2 p-2.5', selected ? tone.editorSelected : tone.editor)}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-black', tone.badge)}>{tone.key}</span>
                    <label className="flex cursor-pointer items-center gap-2 text-xs font-bold">
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={locked}
                        onChange={() =>
                          onChange({
                            kind: 'multiple',
                            options,
                            correctIndexes: selected
                              ? correctIndexes.filter((item) => item !== optionIndex)
                              : [...correctIndexes, optionIndex].sort((a, b) => a - b),
                          })
                        }
                        aria-label={`${tone.key} es la correcta`}
                        className="h-5 w-5 cursor-pointer accent-emerald-400"
                      />
                      Correcta
                    </label>
                  </div>
                  <MathMixField
                    aria-label={`Opción ${tone.key} de la pregunta ${index + 1}`}
                    value={options[optionIndex] ?? ''}
                    maxLength={80}
                    disabled={locked}
                    variant="line"
                    className="rounded-lg border-0 bg-bg/80"
                    onChange={(next) =>
                      onChange({
                        kind: 'multiple',
                        options: options.map((item, i) => (i === optionIndex ? next : item)),
                        correctIndexes,
                      })
                    }
                    placeholder={`Respuesta ${tone.key}`}
                  />
                </div>
              );
            })}
          </div>
        </fieldset>
      ) : (
        <fieldset disabled={locked}>
          <legend className="mb-2 text-sm font-medium">Respuesta correcta · pregunta {index + 1}</legend>
          <div className="grid grid-cols-2 gap-2">
            {[true, false].map((answer) => (
              <label
                key={String(answer)}
                className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border-2 text-base font-semibold ${
                  question.correctBoolean === answer
                    ? answer
                      ? 'border-emerald-400 bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                      : 'border-red-400 bg-red-500 text-white shadow-lg shadow-red-500/30'
                    : answer
                      ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-400'
                      : 'border-red-500/60 bg-red-500/15 text-red-400'
                }`}
              >
                <input
                  type="radio"
                  name={`answer-${question.key}`}
                  value={String(answer)}
                  checked={question.correctBoolean === answer}
                  onChange={() => onChange({ kind: 'boolean', correctBoolean: answer })}
                  className="accent-current"
                />
                {answer ? 'Verdadero' : 'Falso'}
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </li>
  );
}
