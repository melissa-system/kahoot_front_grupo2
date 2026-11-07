import type { ParticipantView, SessionResultView } from '../../api/types';
import coin from '../../assets/brand/taku-coin.png';
import { cn } from '../../lib/cn';

export function nameOf(participants: ParticipantView[], id: string) {
  return participants.find((p) => p.id === id)?.displayName ?? 'Participante';
}

export function Ranking({
  rows,
  participants,
  limit,
  highlightId,
}: {
  rows: SessionResultView[];
  participants: ParticipantView[];
  limit?: number;
  highlightId?: string;
}) {
  const list = limit ? rows.slice(0, limit) : rows;
  if (!list.length) return <p className="text-muted">Aún no hay puntajes.</p>;
  return (
    <ol className="space-y-2" aria-label="Clasificación">
      {list.map((r, i) => (
        <li
          key={r.participantId}
          className={cn(
            'pl-rank-row flex items-center gap-2 rounded-xl border bg-surface-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3',
            highlightId === r.participantId ? 'border-primary ring-2 ring-primary/40' : 'border-line',
          )}
          style={{ ['--pl-delay' as string]: `${i * 60}ms` }}
        >
          <span
            className={cn(
              'grid h-9 w-9 shrink-0 place-items-center rounded-full font-bold',
              r.rank === 1 ? 'bg-warning text-black' : r.rank === 2 ? 'bg-slate-300 text-black' : r.rank === 3 ? 'bg-amber-700 text-white' : 'bg-line',
            )}
          >
            {r.rank}
          </span>
          <span className="min-w-0 flex-1 truncate font-semibold">
            {nameOf(participants, r.participantId)}
            {highlightId === r.participantId ? ' (tú)' : ''}
          </span>
          <span className="inline-flex items-center gap-1.5 font-bold tabular-nums">
            <img src={coin} alt="" className="h-5 w-5" /> {r.totalScore}
          </span>
        </li>
      ))}
    </ol>
  );
}
