import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-muted">
      <Loader2 aria-hidden className={cn('h-5 w-5 animate-spin', className)} />
      {label ? <span>{label}</span> : <span className="sr-only">Cargando</span>}
    </span>
  );
}

export function FullPageLoader({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-8">
      <Spinner label={label} className="h-6 w-6 text-primary" />
    </div>
  );
}
