import { Check, Copy, Flag, Play, SkipForward, Trophy, Users, X } from 'lucide-react';
import { ChoiceBoard } from '../../components/live/ChoiceBoard';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import coin from '../../assets/brand/taku-coin.png';
import greeting from '../../assets/brand/pl-greeting.png';
import type { RoomEnvelope } from '../../api/types';
import { ConnectionBanner } from '../../components/live/ConnectionBanner';
import { LifeAndDeathSplash } from '../../components/live/LifeAndDeathSplash';
import { Podium } from '../../components/live/Podium';
import { QuestionBeat, type ReviewStage } from '../../components/live/QuestionBeat';
import { CountdownRing } from '../../components/live/CountdownRing';
import { Ranking } from '../../components/live/Ranking';
import { answeringWindowSeconds } from '../../lib/sessionTiming';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { HostSessionSkeleton } from '../../components/ui/Skeleton';
import { OwlAvatar } from '../../components/ui/OwlAvatar';
import { Spinner } from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../auth/useAuth';
import { MathText } from '../../components/ui/MathText';
import { cn } from '../../lib/cn';
import { correctLabel } from '../../lib/questionKind';
import { activeQuestionBgm, questionBgmKind, useQuestionBgm } from '../../lib/sfx';
import { useGameSfx } from '../../lib/useGameSfx';
import { useCountdown, useHostSession } from '../../realtime/useHostSession';

const FRIENDLY_COMMAND_ERRORS: Record<string, string> = {
  SESSION_HAS_NO_PARTICIPANTS: 'Espera a que al menos un estudiante se una para iniciar.',
  SESSION_HAS_NO_QUESTIONS: 'El cuestionario no tiene preguntas.',
  QUESTION_NOT_CLOSED: 'La pregunta sigue abierta; espera a que termine el tiempo.',
  REVIEW_IN_PROGRESS: 'La revisión aún no termina; el servidor avanzará automáticamente.',
  SESSION_ALREADY_STARTED: 'La partida ya había iniciado.',
  SESSION_FINISHED: 'La partida ya finalizó.',
  DISCONNECTED: 'Sin conexión con la sala. Espera a que se restablezca.',
};

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
      <Card className="flex flex-col items-center gap-5 p-4 text-center sm:p-8">
        <img src={greeting} alt="" className="h-24 w-24 rounded-2xl" />
        <div>
          <p className="text-muted">Entra a ProfeLink → “Unirse a una sala” y escribe el código</p>
          <p className="mt-3 font-mono text-[clamp(1.75rem,8vw,4.5rem)] font-extrabold tracking-[0.16em] text-primary sm:tracking-[0.25em]" aria-label={`Código de la sala ${state.code.split('').join(' ')}`}>
            {state.code}
          </p>
        </div>
        <div className="flex w-full max-w-md flex-col items-stretch gap-2 rounded-xl border border-line bg-surface-2 p-2 sm:flex-row sm:items-center">
          <span className="min-w-0 flex-1 truncate px-2 text-left text-sm text-muted">{joinUrl}</span>
          <Button size="sm" className="w-full sm:w-auto" variant="secondary" icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} onClick={() => void copy()}>
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
        <p className="text-sm text-muted">
          {state.questionsCount} preguntas · {state.questionDurationSeconds} s por defecto
        </p>
      </Card>

      <Card className="flex flex-col p-4 sm:p-6">
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
              <li key={p.id} className="pl-pop flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2 font-semibold">
                <OwlAvatar id={p.avatarId} name={p.displayName} size="xs" />
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

function LiveQuestion({
  room,
  deadline,
  onAdvance,
  busy,
  stage,
}: {
  room: RoomEnvelope;
  deadline: number | null;
  onAdvance(): void;
  busy: string | null;
  stage: ReviewStage;
}) {
  const { state } = room;
  const q = state.currentQuestion!;
  const seconds = useCountdown(deadline);
  const reviewing = q.status === 'CLOSED';
  const isLast = state.currentIndex + 1 >= state.questionsCount;
  const showRanking = stage === 'ranking';

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-center sm:text-left">
          <p className="text-sm font-semibold tabular-nums text-muted sm:text-base" aria-label={`Pregunta ${state.currentIndex + 1} de ${state.questionsCount}`}>
            {state.currentIndex + 1}/{state.questionsCount}
          </p>
          <p className="truncate text-muted">{state.quizTitle}</p>
        </div>
        <CountdownRing
          seconds={seconds}
          total={reviewing ? Math.max(room.reviewDurationSeconds, seconds) : answeringWindowSeconds(q, state.questionDurationSeconds)}
          label={reviewing ? 'Tiempo de revisión' : 'Tiempo para responder'}
          tickWhenUrgent={!reviewing}
        />
      </div>

      {showRanking ? (
        <Card className="p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <h3 className="flex items-center gap-2 text-lg font-bold sm:text-xl">
              <Trophy className="h-5 w-5 text-warning" /> Clasificación
            </h3>
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
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
      ) : (
        <Card className="p-4 sm:p-10">
          <h2 className="text-center text-xl font-extrabold leading-tight sm:text-4xl">
            <MathText text={q.statement} />
          </h2>
          {q.imageUrl && <img src={q.imageUrl} alt="Imagen de la pregunta" className="mx-auto mt-4 max-h-[28vh] rounded-2xl border border-line object-contain sm:mt-6 sm:max-h-[40vh]" />}
          <ChoiceBoard question={q} reviewing={reviewing} />
          <p className={cn('mt-4 text-center sm:mt-6', reviewing ? 'pl-pop text-xl font-extrabold sm:text-2xl' : 'text-sm text-muted sm:text-base')} aria-live="polite">
            {reviewing ? (
              <>
                La correcta es <MathText text={correctLabel(q)} />
              </>
            ) : (
              `${state.participants.length} participantes respondiendo · la respuesta se revela al cerrar`
            )}
          </p>
        </Card>
      )}
    </div>
  );
}

function Finished({ room }: { room: RoomEnvelope }) {
  const { state } = room;
  const rows = state.results ?? room.scoreboard;
  return (
    <div className="space-y-6">
      <Card className="flex flex-col items-center gap-4 p-5 text-center sm:p-8">
        <img src={coin} alt="" className="h-20 w-20" />
        <h2 className="text-3xl font-extrabold sm:text-4xl">¡Partida terminada!</h2>
        <p className="text-muted">{state.quizTitle}</p>
        <Podium rows={rows} participants={state.participants} />
      </Card>
      <Card className="p-4 sm:p-6">
        <h3 className="mb-4 text-xl font-bold">Clasificación final</h3>
        <Ranking rows={rows} participants={state.participants} />
      </Card>
      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link to="/app/evaluaciones" className="inline-flex h-12 items-center rounded-xl bg-primary px-6 font-semibold text-white hover:bg-primary-strong">
          Volver a mis cuestionarios
        </Link>
        <Link to="/app/evaluaciones/historial" className="inline-flex h-12 items-center rounded-xl border border-line bg-surface-2 px-6 font-semibold hover:bg-line">
          Ver historial
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
  useGameSfx({
    ready: !!host.room && !host.fatal,
    status: host.state?.status,
    phase: host.state?.phase,
    question: host.state?.currentQuestion,
    participantCount: host.state?.participants.length ?? 0,
    connection: host.connection,
  });
  useQuestionBgm(
    activeQuestionBgm({
      inProgress: !!host.room && !host.fatal && host.state?.status === 'IN_PROGRESS',
      questionOpen: host.state?.currentQuestion?.status === 'OPEN',
      currentIndex: host.state?.currentIndex ?? -1,
      questionsCount: host.state?.questionsCount ?? 0,
    }),
  );

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

  if (!host.room) return <HostSessionSkeleton />;

  const room = host.room;
  const { state } = room;
  const commandMessage = host.commandError ? (FRIENDLY_COMMAND_ERRORS[host.commandError.code] ?? host.commandError.message) : null;
  const inProgress = state.status === 'IN_PROGRESS';

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 pr-14 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between lg:pr-0">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary sm:text-sm">Sala en vivo · {state.code}</p>
          <h1 className="truncate text-lg font-extrabold sm:text-3xl">{state.quizTitle}</h1>
        </div>
        {inProgress && (
          <Button variant="secondary" className="w-full sm:w-auto" icon={<Flag className="h-4 w-4" />} disabled={!!host.busy} onClick={() => setConfirmFinish(true)}>
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
        <Lobby room={room} busy={host.busy} onStart={() => void host.start()} onCancel={() => setConfirmFinish(true)} />
      )}
      {inProgress && state.currentQuestion && (
        <LifeAndDeathSplash enabled={questionBgmKind(state.currentIndex, state.questionsCount) === 'final'}>
          <div key={state.currentQuestion.id} className="pl-stage-in">
            <QuestionBeat
              index={state.currentIndex}
              reviewing={state.currentQuestion.status === 'CLOSED'}
              skipIntro
            >
              {(stage) => (
                <LiveQuestion room={room} deadline={host.deadline} busy={host.busy} stage={stage} onAdvance={() => void host.advance()} />
              )}
            </QuestionBeat>
          </div>
        </LifeAndDeathSplash>
      )}
      {state.status === 'FINISHED' && <Finished room={room} />}

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
