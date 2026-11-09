import { ImagePlus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { IMAGE_RULES, type Quiz } from '../../api/types';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { TextAreaField, TextField } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { errorMessage } from '../../lib/http';
import { validateImageFile } from '../../lib/image';
import { validateQuizDescription, validateQuizTitle } from '../../lib/validation';

export interface QuizFormValues {
  title: string;
  description: string;
  /** File nuevo; null = quitar imagen existente; undefined = sin cambios. */
  image?: File | null;
}

interface Props {
  open: boolean;
  quiz?: Pick<Quiz, 'title' | 'description' | 'imageUrl'> | null;
  onClose(): void;
  onSubmit(values: QuizFormValues): Promise<void>;
}

export function QuizFormDialog({ open, quiz, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<File | null | undefined>(undefined);
  const [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ title?: string | null; description?: string | null; image?: string | null }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(quiz?.title ?? '');
    setDescription(quiz?.description ?? '');
    setImage(undefined);
    setPreview(quiz?.imageUrl ?? null);
    setErrors({});
    setFormError(null);
    if (inputRef.current) inputRef.current.value = '';
  }, [open, quiz]);

  useEffect(() => {
    if (!(image instanceof File)) return;
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  function pickFile(file: File | undefined) {
    if (!file) return;
    const problem = validateImageFile(file);
    setErrors((current) => ({ ...current, image: problem }));
    if (problem) {
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    setImage(file);
  }

  function removeImage() {
    setImage(quiz?.imageUrl ? null : undefined);
    setPreview(null);
    setErrors((current) => ({ ...current, image: null }));
    if (inputRef.current) inputRef.current.value = '';
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next = {
      title: validateQuizTitle(title),
      description: validateQuizDescription(description),
      image: errors.image ?? null,
    };
    setErrors(next);
    if (next.title || next.description || next.image) return;
    setSaving(true);
    setFormError(null);
    try {
      await onSubmit({ title: title.trim(), description: description.trim(), image });
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} title={quiz ? 'Editar cuestionario' : 'Nuevo cuestionario'} size="lg" onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {formError && <Alert tone="danger">{formError}</Alert>}
        <TextField label="Título" value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} hint={`${title.trim().length}/120`} autoFocus />
        <TextAreaField
          label="Descripción (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={errors.description}
          hint={`${description.trim().length}/500`}
        />
        <div className="space-y-2">
          <p className="text-sm font-medium">Imagen (opcional)</p>
          {preview ? (
            <div className="relative overflow-hidden rounded-xl border border-line bg-surface-2">
              <img src={preview} alt="Vista previa de la imagen del cuestionario" className="mx-auto max-h-48 object-contain" />
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
            aria-label="Archivo de imagen del cuestionario"
            data-testid="quiz-image-input"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
          {errors.image && (
            <p role="alert" className="text-sm text-danger">
              {errors.image}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 pt-2">
          <Button type="submit" loading={saving}>
            {quiz ? 'Guardar' : 'Crear cuestionario'}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
