import { Check, Copy, Flag, Play, SkipForward, Trophy, Users, WifiOff, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import coin from '../../assets/brand/taku-coin.png';
import greeting from '../../assets/brand/pl-greeting.png';
import type { ParticipantView, RoomEnvelope, SessionResultView } from '../../api/types';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { FullPageLoader, Spinner } from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../auth/useAuth';
import { cn } from '../../lib/cn';
import { useCountdown, useHostSession, type ConnectionStatus } from '../../realtime/useHostSession';

const FRIENDLY_COMMAND_ERRORS: Record<string, string> = {
  SESSION_HAS_NO_PARTICIPANTS: 'Espera a que al menos un estudiante se una para iniciar.',
  SESSION_HAS_NO_QUESTIONS: 'El cuestionario no tiene preguntas.',
  QUESTION_NOT_CLOSED: 'La pregunta sigue abierta; espera a que termine el tiempo.',
  REVIEW_IN_PROGRESS: 'La revisión aún no termina; el servidor avanzará automáticamente.',
  SESSION_ALREADY_STARTED: 'La partida ya había iniciado.',
  SESSION_FINISHED: 'La partida ya finalizó.',
  DISCONNECTED: 'Sin conexión con la sala. Espera a que se restablezca.',
};

function ConnectionBanner({ status, isMock, onSimulate }: { status: ConnectionStatus; isMock: boolean; onSimulate(): void }) {
  if (status === 'online')
    return isMock ? (
      <div className="flex justify-end">
        <button type="button" onClick={onSimulate} className="text-sm text-muted underline-offset-2 hover:text-fg hover:underline">
          Simular caída de red (demo)
        </button>
      </div>
    ) : null;
  return (
    <div role="status" className="flex items-center gap-3 rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 font-medium">
      {status === 'offline' ? <WifiOff className="h-5 w-5 text-warning" /> : <Spinner className="h-5 w-5 text-warning" />}
      <span>
        {status === 'offline'
          ? 'Sin conexión a internet. La partida sigue en el servidor; al volver recuperamos el estado.'
          : status === 'connecting'
            ? 'Conectando con la sala…'
            : 'Reconectando con la sala… La partida continúa en el servidor.'}
      </span>
    </div>
  );
}

function CountdownRing({ seconds, total, label }: { seconds: number; total: number; label: string }) {
  const pct = total > 0 ? Math.min(1, seconds / total) : 0;
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid h-28 w-28 place-items-center" role="timer" aria-label={`${label}: ${seconds} segundos`}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--pl-line)" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={seconds <= 5 ? 'var(--pl-danger)' : 'var(--pl-primary)'}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 250ms linear' }}
        />
      </svg>
      <span className="text-4xl font-extrabold tabular-nums">{seconds}</span>
    </div>
  );
}

function nameOf(participants: ParticipantView[], id: string) {
  return participants.find((p) => p.id === id)?.displayName ?? 'Participante';
}

function Ranking({ rows, participants, limit }: { rows: SessionResultView[]; participants: ParticipantView[]; limit?: number }) {
  const list = limit ? rows.slice(0, limit) : rows;
  if (!list.length) return <p className="text-muted">Aún no hay puntajes.</p>;
  return (
    <ol className="space-y-2" aria-label="Clasificación">
      {list.map((r) => (
        <li key={r.participantId} className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3">
          <span
            className={cn(
              'grid h-9 w-9 shrink-0 place-items-center rounded-full font-bold',
              r.rank === 1 ? 'bg-warning text-black' : r.rank === 2 ? 'bg-slate-300 text-black' : r.rank === 3 ? 'bg-amber-700 text-white' : 'bg-line',
            )}
          >
            {r.rank}
          </span>
          <span className="min-w-0 flex-1 truncate font-semibold">{nameOf(participants, r.participantId)}</span>
          <span className="inline-flex items-center gap-1.5 font-bold tabular-nums">
            <img src={coin} alt="" className="h-5 w-5" /> {r.totalScore}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Lobby({ room, onStart, onCancel, busy }: { room: RoomEnvelope; onStart(): void; onCancel(): void; busy: string | null }) {
  const { state } = room;
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const joinUrl = `${window.location.origin}/app/jugar?code=${state.code}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar. Comparte el código manualmente.');
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <Card className="flex flex-col items-center gap-5 p-6 text-center sm:p-8">
        <img src={greeting} alt="" className="h-24 w-24 rounded-2xl" />
        <div>
          <p className="text-muted">Entra a ProfeLink → “Unirse a una sala” y escribe el código</p>
          <p className="mt-3 font-mono text-5xl font-extrabold tracking-[0.25em] text-primary sm:text-7xl" aria-label={`Código de la sala ${state.code.split('').join(' ')}`}>
            {state.code}
          </p>
        </div>
        <div className="flex w-full max-w-md items-center gap-2 rounded-xl border border-line bg-surface-2 p-2">
          <span className="min-w-0 flex-1 truncate px-2 text-left text-sm text-muted">{joinUrl}</span>
          <Button size="sm" variant="secondary" icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} onClick={() => void copy()}>
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
        <p className="text-sm text-muted">
          {state.questionsCount} preguntas · {state.questionDurationSeconds} s por pregunta
        </p>
      </Card>

      <Card className="flex flex-col p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Users className="h-5 w-5 text-primary" /> Participantes
          </h2>
          <span className="rounded-lg bg-primary-soft px-3 py-1 font-bold text-primary" aria-live="polite">
            {state.participants.length}
          </span>
        </div>
        {state.participants.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center text-muted">
            <Spinner />
            <p>Esperando a que se unan los estudiantes…</p>
          </div>
        ) : (
          <ul className="flex flex-wrap gap-2" aria-label="Lista de participantes">
            {state.participants.map((p) => (
              <li key={p.id} className="pl-pop rounded-xl border border-line bg-surface-2 px-3 py-2 font-semibold">
                {p.displayName}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button
            size="lg"
            className="flex-1"
            icon={<Play className="h-5 w-5" />}
            loading={busy === 'game:start'}
            disabled={state.participants.length === 0 || !!busy}
            onClick={onStart}
          >
            Iniciar partida
          </Button>
          <Button size="lg" variant="secondary" disabled={!!busy} onClick={onCancel}>
            Cerrar sala
          </Button>
        </div>
        {state.participants.length === 0 && <p className="mt-2 text-sm text-muted">Necesitas al menos un participante para iniciar.</p>}
      </Card>
    </div>
  );
}

function LiveQuestion({ room, deadline, onAdvance, busy }: { room: RoomEnvelope; deadline: number | null; onAdvance(): void; busy: string | null }) {
  const { state } = room;
  const q = state.currentQuestion!;
  const seconds = useCountdown(deadline);
  const reviewing = q.status === 'CLOSED';
  const isLast = state.currentIndex + 1 >= state.questionsCount;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-muted">
            Pregunta {state.currentIndex + 1} de {state.questionsCount}
          </p>
          <p className="text-muted">{state.quizTitle}</p>
        </div>
        <CountdownRing
          seconds={seconds}
          total={reviewing ? Math.max(room.reviewDurationSeconds, seconds) : state.questionDurationSeconds}
          label={reviewing ? 'Tiempo de revisión' : 'Tiempo para responder'}
        />
      </div>

      <Card className="p-6 sm:p-10">
        <h2 className="text-center text-2xl font-extrabold leading-tight sm:text-4xl">{q.statement}</h2>
        {q.imageUrl && <img src={q.imageUrl} alt="Imagen de la pregunta" className="mx-auto mt-6 max-h-[40vh] rounded-2xl border border-line object-contain" />}
        <div className="mt-8 grid grid-cols-2 gap-4">
          {[true, false].map((value) => {
            const correct = reviewing && q.status === 'CLOSED' && q.correctBoolean === value;
            const wrong = reviewing && !correct;
            return (
              <div
                key={String(value)}
                className={cn(
                  'flex h-20 items-center justify-center gap-3 rounded-2xl text-xl font-extrabold transition sm:h-28 sm:text-3xl',
                  value ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger',
                  correct && 'pl-pop ring-4 ring-current',
                  wrong && 'opacity-30',
                )}
              >
                {value ? <Check className="h-8 w-8" /> : <X className="h-8 w-8" />}
                {value ? 'Verdadero' : 'Falso'}
              </div>
            );
          })}
        </div>
        {!reviewing && (
          <p className="mt-6 text-center text-muted" aria-live="polite">
            {state.participants.length} participantes respondiendo · la respuesta se revela al cerrar
          </p>
        )}
      </Card>

      {reviewing && (
        <Card className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-xl font-bold">
              <Trophy className="h-5 w-5 text-warning" /> Clasificación
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-muted" aria-live="polite">
                {seconds > 0 ? `${isLast ? 'Resultados' : 'Siguiente pregunta'} en ${seconds} s` : 'Avanzando…'}
              </span>
              <Button size="sm" icon={<SkipForward className="h-4 w-4" />} disabled={seconds > 0 || !!busy} loading={busy === 'game:advance'} onClick={onAdvance}>
                {isLast ? 'Ver resultados' : 'Siguiente'}
              </Button>
            </div>
          </div>
          <Ranking rows={room.scoreboard} participants={state.participants} limit={5} />
        </Card>
      )}
    </div>
  );
}

function Finished({ room }: { room: RoomEnvelope }) {
  const { state } = room;
  const rows = state.results ?? room.scoreboard;
  const podium = rows.filter((r) => r.rank <= 3).slice(0, 3);
  return (
    <div className="space-y-6">
      <Card className="flex flex-col items-center gap-4 p-8 text-center">
        <img src={coin} alt="" className="h-20 w-20" />
        <h2 className="text-3xl font-extrabold sm:text-4xl">¡Partida terminada!</h2>
        <p className="text-muted">{state.quizTitle}</p>
        {podium.length > 0 && (
          <ol className="mt-4 flex flex-wrap items-end justify-center gap-4" aria-label="Podio">
            {podium.map((r) => (
              <li key={r.participantId} className="flex flex-col items-center gap-2">
                <span className="max-w-32 truncate font-bold">{nameOf(state.participants, r.participantId)}</span>
                <span
                  className={cn(
                    'grid w-24 place-items-center rounded-t-2xl text-3xl font-extrabold text-black',
                    r.rank === 1 ? 'h-32 bg-warning' : r.rank === 2 ? 'h-24 bg-slate-300' : 'h-16 bg-amber-700 text-white',
                  )}
                >
                  {r.rank}
                </span>
                <span className="text-sm font-semibold text-muted">{r.totalScore} pts</span>
              </li>
            ))}
          </ol>
        )}
      </Card>
      <Card className="p-6">
        <h3 className="mb-4 text-xl font-bold">Clasificación final</h3>
        <Ranking rows={rows} participants={state.participants} />
      </Card>
      <div className="flex justify-center">
        <Link to="/app/evaluaciones" className="inline-flex h-12 items-center rounded-xl bg-primary px-6 font-semibold text-white hover:bg-primary-strong">
          Volver a mis cuestionarios
        </Link>
      </div>
    </div>
  );
}

/** Mesa de control del anfitrión: lobby → pregunta → revisión → resultados. */
export function HostSessionPage() {
  const { sessionId = '' } = useParams();
  const { isMock } = useAuth();
  const toast = useToast();
  const host = useHostSession(sessionId);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const prevConnection = useRef(host.connection);

  useEffect(() => {
    if (prevConnection.current === 'reconnecting' || prevConnection.current === 'offline') {
      if (host.connection === 'online') toast.success('Conexión restablecida. Estado sincronizado con el servidor.');
    }
    prevConnection.current = host.connection;
  }, [host.connection, toast]);

  if (host.fatal)
    return (
      <EmptyState
        title="No puedes dirigir esta sala"
        description={host.fatal.message}
        action={
          <Link to="/app/evaluaciones" className="font-semibold text-primary hover:underline">
            Volver a mis cuestionarios
          </Link>
        }
      />
    );

  if (!host.room) return <FullPageLoader label="Abriendo la sala…" />;

  const { state } = host.room;
  const commandMessage = host.commandError ? (FRIENDLY_COMMAND_ERRORS[host.commandError.code] ?? host.commandError.message) : null;
  const inProgress = state.status === 'IN_PROGRESS';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Sala en vivo · {state.code}</p>
          <h1 className="text-2xl font-extrabold sm:text-3xl">{state.quizTitle}</h1>
        </div>
        {inProgress && (
          <Button variant="secondary" icon={<Flag className="h-4 w-4" />} disabled={!!host.busy} onClick={() => setConfirmFinish(true)}>
            Finalizar partida
          </Button>
        )}
      </div>

      <ConnectionBanner status={host.connection} isMock={isMock} onSimulate={host.simulateDrop} />
      {commandMessage && (
        <Alert tone="danger" action={<button type="button" aria-label="Cerrar aviso" onClick={host.clearCommandError} className="text-muted hover:text-fg"><X className="h-4 w-4" /></button>}>
          {commandMessage}
        </Alert>
      )}

      {state.status === 'WAITING' && (
        <Lobby room={host.room} busy={host.busy} onStart={() => void host.start()} onCancel={() => setConfirmFinish(true)} />
      )}
      {inProgress && state.currentQuestion && <LiveQuestion room={host.room} deadline={host.deadline} busy={host.busy} onAdvance={() => void host.advance()} />}
      {state.status === 'FINISHED' && <Finished room={host.room} />}

      <ConfirmDialog
        open={confirmFinish}
        title={state.status === 'WAITING' ? '¿Cerrar la sala?' : '¿Finalizar la partida ahora?'}
        description={
          state.status === 'WAITING'
            ? 'Los participantes ya no podrán unirse con este código.'
            : 'Se cerrará la pregunta actual y se calcularán los resultados finales con lo respondido hasta ahora.'
        }
        confirmLabel={state.status === 'WAITING' ? 'Cerrar sala' : 'Finalizar'}
        loading={host.busy === 'game:finish'}
        onCancel={() => setConfirmFinish(false)}
        onConfirm={async () => {
          await host.finish();
          setConfirmFinish(false);
        }}
      />
    </div>
  );
}
