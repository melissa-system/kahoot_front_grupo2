import { useEffect, useState, type FormEvent } from 'react';
import type { Quiz } from '../../api/types';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { TextAreaField, TextField } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { errorMessage } from '../../lib/http';
import { validateQuizDescription, validateQuizTitle } from '../../lib/validation';

interface Props {
  open: boolean;
  quiz?: Pick<Quiz, 'title' | 'description'> | null;
  onClose(): void;
  onSubmit(values: { title: string; description: string }): Promise<void>;
}

export function QuizFormDialog({ open, quiz, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ title?: string | null; description?: string | null }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(quiz?.title ?? '');
    setDescription(quiz?.description ?? '');
    setErrors({});
    setFormError(null);
  }, [open, quiz]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next = { title: validateQuizTitle(title), description: validateQuizDescription(description) };
    setErrors(next);
    if (next.title || next.description) return;
    setSaving(true);
    setFormError(null);
    try {
      await onSubmit({ title: title.trim(), description: description.trim() });
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} title={quiz ? 'Editar cuestionario' : 'Nuevo cuestionario'} onClose={onClose}>
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
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {quiz ? 'Guardar' : 'Crear cuestionario'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
