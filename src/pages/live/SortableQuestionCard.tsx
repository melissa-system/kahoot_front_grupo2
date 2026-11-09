import { Check, GripVertical, ImageIcon, Pencil, Trash2, X } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Question } from '../../api/types';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { MathText } from '../../components/ui/MathText';
import { QuestionTimeBadge } from '../../components/ui/QuestionTimeBadge';
import { cn } from '../../lib/cn';
import { MULTIPLE_OPTION_TONES, correctIndexesOf } from '../../lib/questionKind';
import { answerSecondsOf } from '../../lib/quizTiming';

export function SortableQuestionCard({
  question,
  index,
  defaultSeconds,
  disabled,
  onEdit,
  onDelete,
}: {
  question: Question;
  index: number;
  defaultSeconds: number;
  disabled: boolean;
  onEdit(): void;
  onDelete(): void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
    disabled,
  });

  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn(isDragging && 'z-10')}>
      <Card className={cn('relative overflow-hidden', isDragging && 'shadow-xl ring-2 ring-primary')}>
        <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-primary" />
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <button
            type="button"
            className="grid h-10 w-10 shrink-0 cursor-grab place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg active:cursor-grabbing disabled:cursor-not-allowed"
            aria-label={`Arrastrar pregunta ${index + 1}`}
            disabled={disabled}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5" />
          </button>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-warning font-bold text-warning">{index + 1}</span>
          {question.imageUrl ? (
            <img src={question.imageUrl} alt="" className="h-20 w-28 shrink-0 rounded-lg border border-line object-cover" />
          ) : (
            <span className="hidden h-20 w-28 shrink-0 place-items-center rounded-lg border border-dashed border-line text-muted sm:grid" aria-hidden>
              <ImageIcon className="h-6 w-6" />
            </span>
          )}
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-lg font-semibold">
              <MathText text={question.statement} />
            </p>
            {question.kind === 'multiple' && question.options ? (
              <div className="flex flex-wrap gap-1.5">
                {question.options.map((option, optionIndex) => {
                  const tone = MULTIPLE_OPTION_TONES[optionIndex];
                  return (
                    <span
                      key={`${tone.key}-${option}`}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-lg border px-1.5 py-1 text-xs font-semibold',
                        correctIndexesOf(question).includes(optionIndex) ? tone.editorSelected : tone.editor,
                      )}
                    >
                      <span className={cn('grid h-5 w-5 place-items-center rounded text-[10px] font-black', tone.badge)}>
                        {tone.key}
                      </span>
                      <MathText text={option} />
                    </span>
                  );
                })}
              </div>
            ) : (
              <Badge tone={question.correctBoolean ? 'success' : 'danger'} icon={question.correctBoolean ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}>
                {question.correctBoolean ? 'Verdadero' : 'Falso'}
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" aria-label={`Editar pregunta ${index + 1}`} onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" aria-label={`Eliminar pregunta ${index + 1}`} onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-danger" />
            </Button>
          </div>
          <QuestionTimeBadge
            className="self-end sm:self-center"
            seconds={answerSecondsOf(question.durationSeconds, defaultSeconds)}
            custom={question.durationSeconds != null}
          />
        </div>
      </Card>
    </li>
  );
}
