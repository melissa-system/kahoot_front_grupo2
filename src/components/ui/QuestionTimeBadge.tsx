import { Clock } from 'lucide-react';
import { cn } from '../../lib/cn';

export function QuestionTimeBadge({
  seconds,
  custom = false,
  className,
}: {
  seconds: number;
  custom?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-bold tabular-nums',
        custom ? 'border-warning/40 bg-warning/15 text-warning' : 'border-line bg-surface-2 text-fg',
        className,
      )}
      title={custom ? 'Tiempo de esta pregunta' : 'Tiempo por defecto del cuestionario'}
      aria-label={`${seconds} segundos para contestar`}
    >
      <Clock className="h-4 w-4" aria-hidden />
      {seconds} s
    </span>
  );
}
