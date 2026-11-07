import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Tone = 'neutral' | 'primary' | 'success' | 'danger' | 'accent' | 'warning';
const tones: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-muted border border-line',
  primary: 'bg-primary-soft text-primary',
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
  accent: 'bg-accent-soft text-accent',
  warning: 'bg-warning/15 text-warning',
};

export function Badge({ tone = 'neutral', icon, children, className }: { tone?: Tone; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-semibold', tones[tone], className)}>
      {icon}
      {children}
    </span>
  );
}
