import { Check, X } from 'lucide-react';
import type { CurrentQuestionView } from '../../api/types';
import { MathText } from '../ui/MathText';
import { cn } from '../../lib/cn';
import { MULTIPLE_OPTION_TONES, isCorrectChoice, questionKindOf } from '../../lib/questionKind';

export function ChoiceBoard({
  question,
  myChoice,
  reviewing,
  disabled,
  onChoose,
}: {
  question: CurrentQuestionView;
  myChoice?: boolean | number;
  reviewing: boolean;
  disabled?: boolean;
  onChoose?(choice: boolean | number): void;
}) {
  const multiple = questionKindOf(question) === 'multiple' && (question.options?.length ?? 0) > 0;
  const items = multiple
    ? (question.options ?? []).map((label, index) => ({ value: index as boolean | number, label, tone: MULTIPLE_OPTION_TONES[index]?.className ?? 'bg-surface-2' }))
    : [
        { value: true as boolean | number, label: 'Verdadero', tone: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' },
        { value: false as boolean | number, label: 'Falso', tone: 'bg-red-500 text-white shadow-lg shadow-red-500/30' },
      ];

  return (
    <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-8 sm:gap-4">
      {items.map((item) => {
        const correct = reviewing && question.status === 'CLOSED' && isCorrectChoice(question, item.value);
        const mine = myChoice === item.value;
        const wrongMine = reviewing && mine && !correct;
        return (
          <button
            key={String(item.value)}
            type="button"
            disabled={!onChoose || disabled}
            onClick={onChoose ? () => onChoose(item.value) : undefined}
            className={cn(
              'flex min-h-[4.75rem] flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-2 text-center text-sm font-extrabold leading-tight sm:min-h-28 sm:px-3 sm:text-xl sm:leading-tight',
              item.tone,
              onChoose && 'pl-choice',
              !reviewing && mine && 'pl-pop ring-4 ring-current',
              correct && 'pl-choice-correct ring-4 ring-current',
              reviewing && !correct && 'opacity-30',
              wrongMine && 'opacity-100 ring-4 ring-danger',
            )}
          >
            {!multiple && (item.value ? <Check className="h-5 w-5 sm:h-8 sm:w-8" /> : <X className="h-5 w-5 sm:h-8 sm:w-8" />)}
            {multiple && <span className="text-xs font-bold opacity-80">{MULTIPLE_OPTION_TONES[item.value as number]?.key}</span>}
            <span className={cn(multiple && 'text-sm font-bold sm:text-lg')}>
              <MathText text={item.label} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
