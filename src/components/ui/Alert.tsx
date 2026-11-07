import { AlertCircle, CheckCircle2, Info, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Tone = 'info' | 'success' | 'danger' | 'safe';
const styles: Record<Tone, string> = {
  info: 'border-primary/40 bg-primary-soft text-fg',
  success: 'border-success/40 bg-success-soft text-fg',
  danger: 'border-danger/40 bg-danger-soft text-fg',
  safe: 'border-success/40 bg-success-soft/60 text-success',
};
const icons = { info: Info, success: CheckCircle2, danger: AlertCircle, safe: ShieldCheck };

export function Alert({ tone = 'info', children, action, className }: { tone?: Tone; children: ReactNode; action?: ReactNode; className?: string }) {
  const Icon = icons[tone];
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('flex items-start gap-3 rounded-2xl border px-4 py-3', styles[tone], className)}>
      <Icon aria-hidden className={cn('mt-0.5 h-5 w-5 shrink-0', tone === 'danger' ? 'text-danger' : tone === 'info' ? 'text-primary' : 'text-success')} />
      <div className="flex-1 text-[15px] font-medium">{children}</div>
      {action}
    </div>
  );
}
