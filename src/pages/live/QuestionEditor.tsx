import { Check, ImagePlus, Trash2, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { IMAGE_RULES, QUESTION_DURATION, QUESTION_DURATION_PRESETS, type Question, type QuestionKind } from '../../api/types';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { TextAreaField } from '../../components/ui/Field';
import { MathEquationDialog } from '../../components/ui/MathEquationDialog';
import { FormulaPreview } from '../../components/ui/MathText';
import { insertTextAtSelection } from '../../lib/insertAtCursor';
import { wrapInlineMath } from '../../lib/mathEquation';
import { validateImageFile } from '../../lib/image';
import { cn } from '../../lib/cn';
import { errorMessage } from '../../lib/http';
import {
  MULTIPLE_OPTION_COUNT,
  MULTIPLE_OPTION_TONES,
  OPTION_MAX_LENGTH,
  questionKindOf,
} from '../../lib/questionKind';
import { validateStatement } from '../../lib/validation';

export interface QuestionDraft {
  statement: string;
  kind: QuestionKind;
  correctBoolean?: boolean;
  options?: string[];
  correctIndexes?: number[];
  /** File nuevo a subir; null = quitar imagen existente; undefined = sin cambios. */
  image?: File | null;
  /** null = usar el tiempo de la sala. */
  durationSeconds: number | null;
}

interface Props {
  initial?: Question;
  submitLabel: string;
  onSubmit(draft: QuestionDraft): Promise<void>;
  onCancel?: () => void;
}

const emptyOptions = () => Array.from({ length: MULTIPLE_OPTION_COUNT }, () => '');

export function QuestionEditor({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const [statement, setStatement] = useState(initial?.statement ?? '');
  const [kind, setKind] = useState<QuestionKind>(questionKindOf(initial));
  const [answer, setAnswer] = useState<boolean | null>(
    initial && questionKindOf(initial) === 'boolean' ? initial.correctBoolean : null,
  );
  const [options, setOptions] = useState<string[]>(
    initial?.kind === 'multiple' && initial.options?.length === MULTIPLE_OPTION_COUNT
      ? [...initial.options]
      : emptyOptions(),
  );
  const [correctIndexes, setCorrectIndexes] = useState<number[]>(
    initial?.kind === 'multiple' ? [...(initial.correctIndexes ?? [])] : [],
  );
  const [image, setImage] = useState<File | null | undefined>(undefined);
  const [preview, setPreview] = useState<string | null>(initial?.imageUrl ?? null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(initial?.durationSeconds ?? null);
  const [errors, setErrors] = useState<{
    statement?: string | null;
    answer?: string | null;
    options?: string | null;
    image?: string | null;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const statementRef = useRef<HTMLTextAreaElement>(null);
  const optionRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [activeField, setActiveField] = useState<'statement' | number>('statement');
  const [equationOpen, setEquationOpen] = useState(false);
  const groupId = useId();

  function insertSymbol(symbol: string) {
    if (kind === 'multiple' && typeof activeField === 'number') {
      const el = optionRefs.current[activeField];
      const current = options[activeField] ?? '';
      const start = el?.selectionStart ?? current.length;
      const end = el?.selectionEnd ?? start;
      const next = insertTextAtSelection(current, symbol, start, end, OPTION_MAX_LENGTH);
      setOptions((list) => list.map((item, i) => (i === activeField ? next.value : item)));
      requestAnimationFrame(() => {
        el?.focus();
        el?.setSelectionRange(next.caret, next.caret);
      });
      return;
    }
    const el = statementRef.current;
    const start = el?.selectionStart ?? statement.length;
    const end = el?.selectionEnd ?? start;
    const next = insertTextAtSelection(statement, symbol, start, end, 500);
    setStatement(next.value);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(next.caret, next.caret);
    });
  }

  useEffect(() => {
    if (!(image instanceof File)) return;
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  function pickFile(file: File | undefined) {
    if (!file) return;
    const problem = validateImageFile(file);
    setErrors((e) => ({ ...e, image: problem }));
    if (problem) {
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    setImage(file);
  }

  function removeImage() {
    setImage(initial?.imageUrl ? null : undefined);
    setPreview(null);
    setErrors((e) => ({ ...e, image: null }));
    if (inputRef.current) inputRef.current.value = '';
  }

  function resetAfterCreate() {
    setStatement('');
    setKind('boolean');
    setAnswer(null);
    setOptions(emptyOptions());
    setCorrectIndexes([]);
    setDurationSeconds(null);
    setImage(undefined);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const trimmedOptions = options.map((item) => item.trim());
    const optionProblem =
      kind === 'multiple'
        ? trimmedOptions.some((item) => !item || item.length > OPTION_MAX_LENGTH)
          ? `Cada opción debe tener entre 1 y ${OPTION_MAX_LENGTH} caracteres.`
          : correctIndexes.length === 0
            ? 'Marca al menos una opción correcta.'
            : null
        : null;
    const next = {
      statement: validateStatement(statement),
      answer: kind === 'boolean' && answer === null ? 'Elige si la afirmación es verdadera o falsa.' : null,
      options: optionProblem,
      image: errors.image ?? null,
    };
    setErrors(next);
    if (next.statement || next.answer || next.options || next.image) return;
    setSaving(true);
    setFormError(null);
    try {
      await onSubmit({
        statement: statement.trim(),
        kind,
        ...(kind === 'boolean'
          ? { correctBoolean: answer! }
          : { options: trimmedOptions, correctIndexes }),
        durationSeconds,
        image,
      });
      if (!initial) resetAfterCreate();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 lg:grid-cols-2 lg:items-start">
      {formError && <Alert tone="danger" className="lg:col-span-2">{formError}</Alert>}
      <div className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Tipo de pregunta</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['boolean', 'Verdadero o falso'],
              ['multiple', '4 opciones'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setKind(value);
                if (value === 'boolean') setActiveField('statement');
              }}
              className={cn(
                'h-11 rounded-xl border text-sm font-semibold transition',
                kind === value ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-surface-2 text-muted hover:text-fg',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">Puedes mezclar texto y fórmulas (π, fracciones, raíces…).</p>
        <Button type="button" variant="secondary" size="sm" onClick={() => setEquationOpen(true)}>
          Fórmula
        </Button>
      </div>

      <MathEquationDialog
        open={equationOpen}
        onClose={() => setEquationOpen(false)}
        onInsert={(latex) => insertSymbol(wrapInlineMath(latex))}
      />

      <TextAreaField
        ref={statementRef}
        label={kind === 'multiple' ? 'Pregunta' : 'Afirmación'}
        placeholder={
          kind === 'multiple' ? 'Ej.: ¿Cuál es un paradigma declarativo?' : 'Ej.: Haskell usa evaluación perezosa por defecto'
        }
        value={statement}
        maxLength={500}
        onFocus={() => setActiveField('statement')}
        onChange={(e) => setStatement(e.target.value)}
        error={errors.statement}
        hint={`${statement.trim().length}/500`}
        className="min-h-20"
      />
      <FormulaPreview text={statement} />

      {kind === 'boolean' ? (
        <fieldset aria-describedby={errors.answer ? `${groupId}-err` : undefined}>
          <legend className="mb-2 text-sm font-medium">Respuesta correcta</legend>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                value: true,
                label: 'Verdadero',
                icon: Check,
                idle: 'border-emerald-500/60 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25',
                on: 'border-emerald-400 bg-emerald-500 text-white shadow-lg shadow-emerald-500/30',
              },
              {
                value: false,
                label: 'Falso',
                icon: X,
                idle: 'border-red-500/60 bg-red-500/15 text-red-400 hover:bg-red-500/25',
                on: 'border-red-400 bg-red-500 text-white shadow-lg shadow-red-500/30',
              },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                role="radio"
                aria-checked={answer === opt.value}
                onClick={() => setAnswer(opt.value)}
                className={cn(
                  'flex h-14 items-center justify-center gap-2 rounded-xl border-2 text-lg font-bold transition',
                  answer === opt.value ? opt.on : opt.idle,
                )}
              >
                <opt.icon className="h-5 w-5" /> {opt.label}
              </button>
            ))}
          </div>
          {errors.answer && (
            <p id={`${groupId}-err`} role="alert" className="mt-1.5 text-sm text-danger">
              {errors.answer}
            </p>
          )}
        </fieldset>
      ) : (
        <fieldset aria-describedby={errors.options ? `${groupId}-opts` : undefined}>
          <legend className="mb-2 text-sm font-medium">Opciones · marca las correctas</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {options.map((option, index) => {
              const tone = MULTIPLE_OPTION_TONES[index];
              const selected = correctIndexes.includes(index);
              return (
                <div key={tone.key} className={cn('rounded-2xl border-2 p-2.5 transition', selected ? tone.editorSelected : tone.editor)}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-black shadow-sm', tone.badge)}>
                      {tone.key}
                    </span>
                    <label className="flex cursor-pointer items-center gap-2 text-xs font-bold">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() =>
                          setCorrectIndexes((current) =>
                            current.includes(index)
                              ? current.filter((item) => item !== index)
                              : [...current, index].sort((a, b) => a - b),
                          )
                        }
                        aria-label={`${tone.key} es la correcta`}
                        className="h-5 w-5 cursor-pointer accent-emerald-400"
                      />
                      Correcta
                    </label>
                  </div>
                  <input
                    ref={(node) => {
                      optionRefs.current[index] = node;
                    }}
                    aria-label={`Opción ${tone.key}`}
                    value={option}
                    maxLength={OPTION_MAX_LENGTH}
                    onFocus={() => setActiveField(index)}
                    onChange={(e) => setOptions((current) => current.map((item, i) => (i === index ? e.target.value : item)))}
                    placeholder={`Respuesta ${tone.key}`}
                    className="h-11 w-full rounded-lg border-0 bg-bg/80 px-3 text-sm text-fg outline-none placeholder:text-muted focus:ring-2 focus:ring-white/40"
                  />
                  <FormulaPreview text={option} className="mt-2" />
                </div>
              );
            })}
          </div>
          {errors.options && (
            <p id={`${groupId}-opts`} role="alert" className="mt-1.5 text-sm text-danger">
              {errors.options}
            </p>
          )}
        </fieldset>
      )}
      </div>

      <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Tiempo para responder (opcional)</legend>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={durationSeconds === null}
            onClick={() => setDurationSeconds(null)}
            className={cn(
              'h-10 rounded-lg border px-4 text-sm font-semibold',
              durationSeconds === null ? 'border-primary bg-primary text-white' : 'border-line bg-surface-2',
            )}
          >
            El de la sala
          </button>
          {QUESTION_DURATION_PRESETS.map((seconds) => (
            <button
              key={seconds}
              type="button"
              aria-pressed={durationSeconds === seconds}
              onClick={() => setDurationSeconds(seconds)}
              className={cn(
                'h-10 rounded-lg border px-4 text-sm font-semibold',
                durationSeconds === seconds ? 'border-primary bg-primary text-white' : 'border-line bg-surface-2',
              )}
            >
              {seconds} s
            </button>
          ))}
        </div>
        {durationSeconds !== null && (
          <label className="flex items-center gap-3 text-sm text-muted">
            Personalizado
            <input
              type="range"
              min={QUESTION_DURATION.min}
              max={QUESTION_DURATION.max}
              value={durationSeconds}
              onChange={(e) => setDurationSeconds(Number(e.target.value))}
              className="flex-1 accent-[var(--pl-primary)]"
              aria-label="Segundos para esta pregunta"
            />
            <span className="w-12 text-right font-semibold text-fg">{durationSeconds} s</span>
          </label>
        )}
        <p className="text-sm text-muted">Si no eliges, se usa el tiempo por defecto al abrir la sala.</p>
      </fieldset>

      <div className="space-y-2">
        <p className="text-sm font-medium">Imagen (opcional)</p>
        {preview ? (
          <div className="relative overflow-hidden rounded-xl border border-line bg-surface-2">
            <img src={preview} alt="Vista previa de la imagen de la pregunta" className="mx-auto max-h-36 object-contain" />
            <div className="absolute right-2 top-2 flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()}>
                Cambiar
              </Button>
              <Button size="sm" variant="danger" aria-label="Quitar imagen" onClick={removeImage}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-line px-4 py-4 text-muted hover:border-primary hover:text-fg"
          >
            <ImagePlus className="h-7 w-7" />
            <span className="font-semibold">Subir imagen</span>
            <span className="text-sm">{IMAGE_RULES.label}</span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={IMAGE_RULES.types.join(',')}
          className="sr-only"
          aria-label="Archivo de imagen"
          data-testid="question-image-input"
          onChange={(e) => pickFile(e.target.files?.[0])}
        />
        {errors.image && (
          <p role="alert" className="text-sm text-danger">
            {errors.image}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button type="submit" loading={saving}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
        )}
      </div>
      </div>
    </form>
  );
}
