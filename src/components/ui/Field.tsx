import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

const base =
  'w-full rounded-xl border bg-surface-2 px-3.5 text-fg placeholder:text-muted/70 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30';

interface FieldShellProps {
  label: string;
  error?: string | null;
  hint?: ReactNode;
  id: string;
  children: ReactNode;
}

export function FieldShell({ label, error, hint, id, children }: FieldShellProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-fg">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string | null; hint?: ReactNode; leading?: ReactNode };

export const TextField = forwardRef<HTMLInputElement, InputProps>(function TextField(
  { label, error, hint, leading, className, id, ...rest },
  ref,
) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <FieldShell label={label} error={error} hint={hint} id={fieldId}>
      <div className="relative">
        {leading ? (
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted">
            {leading}
          </span>
        ) : null}
        <input
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
          className={cn(base, 'h-11', leading ? 'pl-11' : undefined, error ? 'border-danger' : 'border-line', className)}
          {...rest}
        />
      </div>
    </FieldShell>
  );
});

type AreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string | null; hint?: ReactNode };

export const TextAreaField = forwardRef<HTMLTextAreaElement, AreaProps>(function TextAreaField(
  { label, error, hint, className, id, ...rest },
  ref,
) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <FieldShell label={label} error={error} hint={hint} id={fieldId}>
      <textarea
        ref={ref}
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        className={cn(base, 'min-h-24 py-2.5', error ? 'border-danger' : 'border-line', className)}
        {...rest}
      />
    </FieldShell>
  );
});
