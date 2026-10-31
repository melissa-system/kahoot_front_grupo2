import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from './Button';

interface Props {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm(): void;
  onCancel(): void;
}

/** Diálogo modal accesible (no usa window.confirm). */
export function ConfirmDialog({ open, title, description, confirmLabel = 'Confirmar', tone = 'danger', loading, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [open]);

  if (!open) return null;
  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      className="m-auto w-[min(92vw,440px)] rounded-2xl border border-line bg-surface p-0 text-fg backdrop:bg-black/60"
    >
      <div className="space-y-4 p-6">
        <h2 id="confirm-title" className="text-xl font-bold">
          {title}
        </h2>
        {description && <div className="text-muted">{description}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button variant={tone} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
