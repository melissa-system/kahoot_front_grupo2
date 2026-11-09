import { useEffect, useMemo, useState } from 'react';
import type { ParticipantView, SessionResultView } from '../../api/types';
import { OwlAvatar } from '../ui/OwlAvatar';
import { cn } from '../../lib/cn';
import { playSfx } from '../../lib/sfx';
import { Confetti } from './Confetti';
import { nameOf, participantOf } from './Ranking';

export const PODIUM_STEP_MS = import.meta.env.MODE === 'test' ? 0 : 1500;
export const PODIUM_FIRST_PAUSE_MS = import.meta.env.MODE === 'test' ? 0 : 500;
export const PODIUM_START_MS = import.meta.env.MODE === 'test' ? 0 : 400;

const VISUAL_ORDER = [2, 1, 3] as const;
const REVEAL_ORDER = [3, 2, 1] as const;
const PLACE_LABEL: Record<number, string> = { 1: '1º lugar', 2: '2º lugar', 3: '3º lugar' };

function reducedMotion() {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

function barClass(rank: number) {
  return cn(
    'grid w-20 place-items-center rounded-t-2xl text-3xl font-extrabold sm:w-24',
    rank === 1 ? 'h-32 bg-warning text-black' : rank === 2 ? 'h-24 bg-slate-300 text-black' : 'h-16 bg-amber-700 text-white',
  );
}

function ghostClass(rank: number) {
  return cn('w-20 rounded-t-2xl bg-surface-2 sm:w-24', rank === 1 ? 'h-32' : rank === 2 ? 'h-24' : 'h-16');
}

export function Podium({
  rows,
  participants,
  highlightId,
  stepMs = PODIUM_STEP_MS,
  firstPauseMs = PODIUM_FIRST_PAUSE_MS,
  startMs = PODIUM_START_MS,
}: {
  rows: SessionResultView[];
  participants: ParticipantView[];
  highlightId?: string;
  stepMs?: number;
  firstPauseMs?: number;
  startMs?: number;
}) {
  const spots = useMemo(
    () => VISUAL_ORDER.map((rank) => rows.find((r) => r.rank === rank)).filter((r): r is SessionResultView => !!r),
    [rows],
  );
  const reveal = useMemo(() => REVEAL_ORDER.filter((rank) => spots.some((r) => r.rank === rank)), [spots]);
  const key = spots.map((s) => `${s.rank}:${s.participantId}`).join('|');
  const instant = stepMs <= 0 || reducedMotion();
  const [shown, setShown] = useState<Set<number>>(() => (instant ? new Set(reveal) : new Set()));
  const [line, setLine] = useState('');

  useEffect(() => {
    if (instant) {
      setShown(new Set(reveal));
      return;
    }
    setShown(new Set());
    const timers = reveal.map((rank, i) => {
      const wait = startMs + i * stepMs + (rank === 1 ? firstPauseMs : 0);
      return window.setTimeout(() => {
        playSfx(rank === 1 ? 'finish' : rank === 2 ? 'reveal' : 'pop');
        setShown((prev) => new Set(prev).add(rank));
        const row = spots.find((r) => r.rank === rank);
        if (row) setLine(`${PLACE_LABEL[rank]}: ${nameOf(participants, row.participantId)}`);
      }, wait);
    });
    return () => timers.forEach((id) => window.clearTimeout(id));
    // key cubre el elenco del podio; no reiniciar si solo cambia la referencia del array.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intencional
  }, [instant, stepMs, firstPauseMs, startMs, key]);

  if (spots.length === 0) return null;

  return (
    <div className="relative mt-4 w-full">
      {shown.has(1) && <Confetti />}
      <p className="sr-only" aria-live="polite">
        {line}
      </p>
      <ol className="flex items-end justify-center gap-4" aria-label="Podio">
        {spots.map((r) => {
          const visible = shown.has(r.rank);
          const name = `${nameOf(participants, r.participantId)}${r.participantId === highlightId ? ' (tú)' : ''}`;
          return (
            <li key={r.participantId} className="flex w-20 flex-col items-center gap-2 sm:w-24">
              {visible ? (
                <>
                  <span className="pl-podium-name text-[0.7rem] font-bold uppercase tracking-[0.14em] text-muted">{PLACE_LABEL[r.rank]}</span>
                  <OwlAvatar id={participantOf(participants, r.participantId)?.avatarId} name={name} size="lg" />
                  <span className="pl-podium-name max-w-24 truncate font-bold">{name}</span>
                  <span className={cn('pl-podium', r.rank === 1 && 'pl-podium-first', barClass(r.rank))}>{r.rank}</span>
                  <span className="pl-podium-name text-sm font-semibold text-muted">{r.totalScore} pts</span>
                </>
              ) : (
                <>
                  <span className="h-4" />
                  <span className="h-16 w-16" />
                  <span className="h-6" />
                  <span className={ghostClass(r.rank)} />
                  <span className="h-5" />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
