import { Check, ImagePlus, Trash2, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { IMAGE_RULES, type Question } from '../../api/types';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { TextAreaField } from '../../components/ui/Field';
import { validateImageFile } from '../../lib/image';
import { cn } from '../../lib/cn';
import { errorMessage } from '../../lib/http';
import { validateStatement } from '../../lib/validation';

export interface QuestionDraft {
  statement: string;
  correctBoolean: boolean;
  /** File nuevo a subir; null = quitar imagen existente; undefined = sin cambios. */
  image?: File | null;
}

interface Props {
  initial?: Question;
  submitLabel: string;
  onSubmit(draft: QuestionDraft): Promise<void>;
  onCancel?: () => void;
}

export function QuestionEditor({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const [statement, setStatement] = useState(initial?.statement ?? '');
  const [answer, setAnswer] = useState<boolean | null>(initial ? initial.correctBoolean : null);
  const [image, setImage] = useState<File | null | undefined>(undefined);
  const [preview, setPreview] = useState<string | null>(initial?.imageUrl ?? null);
  const [errors, setErrors] = useState<{ statement?: string | null; answer?: string | null; image?: string | null }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const groupId = useId();

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

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next = {
      statement: validateStatement(statement),
      answer: answer === null ? 'Elige si la afirmación es verdadera o falsa.' : null,
      image: errors.image ?? null,
    };
    setErrors(next);
    if (next.statement || next.answer || next.image) return;
    setSaving(true);
    setFormError(null);
    try {
      await onSubmit({ statement: statement.trim(), correctBoolean: answer!, image });
      if (!initial) {
        setStatement('');
        setAnswer(null);
        setImage(undefined);
        setPreview(null);
        if (inputRef.current) inputRef.current.value = '';
      }
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {formError && <Alert tone="danger">{formError}</Alert>}
      <TextAreaField
        label="Afirmación"
        placeholder="Ej.: Haskell usa evaluación perezosa por defecto"
        value={statement}
        onChange={(e) => setStatement(e.target.value)}
        error={errors.statement}
        hint={`${statement.trim().length}/500`}
      />

      <fieldset aria-describedby={errors.answer ? `${groupId}-err` : undefined}>
        <legend className="mb-2 text-sm font-medium">Respuesta correcta</legend>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: true, label: 'Verdadero', icon: Check, on: 'border-success bg-success-soft text-success' },
            { value: false, label: 'Falso', icon: X, on: 'border-danger bg-danger-soft text-danger' },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              role="radio"
              aria-checked={answer === opt.value}
              onClick={() => setAnswer(opt.value)}
              className={cn(
                'flex h-14 items-center justify-center gap-2 rounded-xl border-2 text-lg font-bold transition',
                answer === opt.value ? opt.on : 'border-line bg-surface-2 text-muted hover:text-fg',
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

      <div className="space-y-2">
        <p className="text-sm font-medium">Imagen (opcional)</p>
        {preview ? (
          <div className="relative overflow-hidden rounded-xl border border-line bg-surface-2">
            <img src={preview} alt="Vista previa de la imagen de la pregunta" className="mx-auto max-h-56 object-contain" />
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
            className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-line px-4 py-6 text-muted hover:border-primary hover:text-fg"
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

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
        )}
        <Button type="submit" loading={saving}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
