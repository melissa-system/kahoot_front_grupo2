import { useEffect } from 'react';
import { cn } from '../../lib/cn';
import { playSfx } from '../../lib/sfx';

export function CountdownRing({
  seconds,
  total,
  label,
  tickWhenUrgent = false,
}: {
  seconds: number;
  total: number;
  label: string;
  tickWhenUrgent?: boolean;
}) {
  const pct = total > 0 ? Math.min(1, seconds / total) : 0;
  const r = 42;
  const c = 2 * Math.PI * r;
  const urgent = seconds <= 5 && seconds > 0;
  useEffect(() => {
    if (tickWhenUrgent && seconds >= 1 && seconds <= 5) playSfx('tick');
  }, [seconds, tickWhenUrgent]);
  return (
    <div className="relative grid h-[4.75rem] w-[4.75rem] place-items-center sm:h-28 sm:w-28" role="timer" aria-label={`${label}: ${seconds} segundos`}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--pl-line)" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={urgent ? 'var(--pl-danger)' : 'var(--pl-primary)'}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 250ms linear, stroke 180ms ease' }}
        />
      </svg>
      <span className={cn('text-2xl font-extrabold tabular-nums sm:text-4xl', urgent && 'pl-timer-urgent')}>{seconds}</span>
    </div>
  );
}
