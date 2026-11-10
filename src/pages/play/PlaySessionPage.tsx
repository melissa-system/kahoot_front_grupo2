import { LogOut, Trophy, Users, X } from 'lucide-react';
import { ChoiceBoard } from '../../components/live/ChoiceBoard';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { isValidSessionCode, normalizeSessionCode, type CurrentQuestionView, type RoomEnvelope } from '../../api/types';
import coin from '../../assets/brand/taku-coin.png';
import greeting from '../../assets/brand/pl-greeting.png';
import { ConnectionBanner } from '../../components/live/ConnectionBanner';
import { LifeAndDeathSplash } from '../../components/live/LifeAndDeathSplash';
import { Podium } from '../../components/live/Podium';
import { QuestionBeat, type ReviewStage } from '../../components/live/QuestionBeat';
import { CountdownRing } from '../../components/live/CountdownRing';
import { Ranking } from '../../components/live/Ranking';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { AvatarGroup } from '../../components/ui/avatar-group';
import { OwlAvatar } from '../../components/ui/OwlAvatar';
import { owlAvatarSrc } from '../../lib/owlAvatar';
import { FullPageLoader } from '../../components/ui/Spinner';
import { answeringWindowSeconds } from '../../lib/sessionTiming';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../auth/useAuth';
import { MathText } from '../../components/ui/MathText';
import { cn } from '../../lib/cn';
import { correctLabel, isCorrectChoice, questionKindOf } from '../../lib/questionKind';
import { activeQuestionBgm, playSfx, questionBgmKind, useQuestionBgm } from '../../lib/sfx';
import { useGameSfx } from '../../lib/useGameSfx';
import { useCountdown } from '../../realtime/useHostSession';
import { useParticipantSession } from '../../realtime/useParticipantSession';

function PlayerLobby({ room, meId, onLeave, busy }: { room: RoomEnvelope; meId?: string; onLeave(): void; busy: boolean }) {
  const { state } = room;
  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <Card className="flex flex-col items-center gap-4 p-4 text-center sm:p-8">
        <img src={greeting} alt="" className="pl-bob h-24 w-24 rounded-2xl" />
        <p className="pl-wait text-muted">Esperando a que el anfitrión inicie…</p>
        <p className="pl-code-live font-mono text-[clamp(1.75rem,8vw,3.75rem)] font-extrabold tracking-[0.16em] text-primary sm:tracking-[0.25em]" aria-label={`Código ${state.code.split('').join(' ')}`}>
          {state.code}
        </p>
        <p className="text-sm text-muted">
          {state.questionsCount} preguntas · {state.questionDurationSeconds} s por defecto
        </p>
        <Button variant="secondary" icon={<LogOut className="h-4 w-4" />} loading={busy} onClick={onLeave}>
          Salir de la sala
        </Button>
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
        <AvatarGroup
          avatars={state.participants.map((p) => ({
            src: owlAvatarSrc(p.avatarId ?? 'book'),
            alt: p.displayName,
            label: p.id === meId ? `${p.displayName} (tú)` : p.displayName,
          }))}
          maxVisible={8}
          size={52}
          overlap={16}
        />
      </Card>
    </div>
  );
}

function useAnswerStreak(question: CurrentQuestionView | null | undefined, choice: boolean | number | undefined) {
  const [streak, setStreak] = useState(0);
  const counted = useRef<string | null>(null);
  useEffect(() => {
    if (!question || question.status !== 'CLOSED' || counted.current === question.id) return;
    counted.current = question.id;
    setStreak((current) => (isCorrectChoice(question, choice) ? current + 1 : 0));
  }, [question, choice]);
  return streak;
}

function PlayerQuestion({
  room,
  deadline,
  currentAnswer,
  streak,
  onChoose,
  submitting,
}: {
  room: RoomEnvelope;
  deadline: number | null;
  currentAnswer?: { choice?: boolean | number; status: string };
  streak: number;
  onChoose(choice: boolean | number): void;
  submitting: boolean;
}) {
  const { state } = room;
  const q = state.currentQuestion!;
  const seconds = useCountdown(deadline);
  const reviewing = q.status === 'CLOSED';
  const sent = currentAnswer?.status === 'sent' || currentAnswer?.status === 'sending';
  const myChoice = currentAnswer?.choice;
  const ok = isCorrectChoice(q, myChoice);

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

      <Card className="p-4 sm:p-10">
        <h2 className="text-center text-xl font-extrabold leading-tight sm:text-4xl">
          <MathText text={q.statement} />
        </h2>
        {q.imageUrl && <img src={q.imageUrl} alt="Imagen de la pregunta" className="mx-auto mt-4 max-h-[28vh] rounded-2xl border border-line object-contain sm:mt-6 sm:max-h-[40vh]" />}
        <ChoiceBoard
          question={q}
          myChoice={myChoice}
          reviewing={reviewing}
          disabled={reviewing || sent || submitting}
          onChoose={(value) => {
            playSfx('click');
            onChoose(value);
          }}
        />
        <p
          className={cn(
            'mt-4 text-center sm:mt-6',
            reviewing ? 'pl-pop text-2xl font-extrabold sm:text-3xl' : 'text-sm text-muted sm:text-base',
            reviewing && myChoice !== undefined && ok && 'text-success',
            reviewing && myChoice !== undefined && !ok && 'text-danger',
          )}
          aria-live="polite"
        >
          {reviewing
            ? myChoice === undefined
              ? 'Se acabó el tiempo'
              : ok
                ? '¡Correcto!'
                : '¡Incorrecto!'
            : currentAnswer?.status === 'sending'
              ? 'Enviando…'
              : currentAnswer?.status === 'sent'
                ? 'Respuesta registrada ✓'
                : questionKindOf(q) === 'multiple'
                  ? 'Elige una de las 4 opciones'
                  : 'Elige verdadero o falso'}
        </p>
        {reviewing && (
          <p className="mt-1 text-center text-sm text-muted">
            {myChoice === undefined || !ok ? (
              <>
                La correcta era <MathText text={correctLabel(q)} />
              </>
            ) : streak > 1 ? (
              `Racha de ${streak}: +${streak - 1} pts extra`
            ) : (
              'Sigue así'
            )}
          </p>
        )}
      </Card>
    </div>
  );
}

function PlayerReviewRanking({
  room,
  meId,
  myChoice,
  deadline,
}: {
  room: RoomEnvelope;
  meId?: string;
  myChoice?: boolean | number;
  deadline: number | null;
}) {
  const { state } = room;
  const q = state.currentQuestion!;
  const seconds = useCountdown(deadline);
  const answered = myChoice !== undefined;
  const ok = answered && isCorrectChoice(q, myChoice);
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-center sm:text-left">
          <p className="text-sm font-semibold tabular-nums text-muted sm:text-base" aria-label={`Pregunta ${state.currentIndex + 1} de ${state.questionsCount}`}>
            {state.currentIndex + 1}/{state.questionsCount}
          </p>
          <p className={cn('font-extrabold', ok ? 'text-success' : 'text-danger')}>{!answered ? 'Se acabó el tiempo' : ok ? '¡Correcto!' : '¡Incorrecto!'}</p>
        </div>
        {seconds > 0 ? (
          <CountdownRing seconds={seconds} total={Math.max(room.reviewDurationSeconds, seconds)} label="Tiempo de revisión" />
        ) : (
          <p className="text-sm font-semibold text-muted" role="status">
            Esperando la siguiente pregunta…
          </p>
        )}
      </div>
      <Card className="p-4 sm:p-6">
        <h3 className="mb-4 flex items-center gap-2 text-xl font-bold">
          <Trophy className="h-5 w-5 text-warning" /> Clasificación
        </h3>
        <Ranking rows={room.scoreboard} participants={state.participants} limit={5} highlightId={meId} />
      </Card>
    </div>
  );
}

function PlayerFinished({ room, meId }: { room: RoomEnvelope; meId?: string }) {
  const { state } = room;
  const rows = state.results ?? room.scoreboard;
  const mine = meId ? rows.find((r) => r.participantId === meId) : undefined;
  return (
    <div className="space-y-6">
      <Card className="flex flex-col items-center gap-4 p-5 text-center sm:p-8">
        <img src={coin} alt="" className="pl-coin-in h-20 w-20" />
        <h2 className="text-3xl font-extrabold sm:text-4xl">¡Partida terminada!</h2>
        <p className="text-muted">{state.quizTitle}</p>
        {mine && (
          <p className="text-lg font-semibold">
            Quedaste en el puesto {mine.rank} con {mine.totalScore} pts
          </p>
        )}
        <Podium rows={rows} participants={state.participants} highlightId={meId} />
      </Card>
      <Card className="p-4 sm:p-6">
        <h3 className="mb-4 flex items-center gap-2 text-xl font-bold">
          <Trophy className="h-5 w-5 text-warning" /> Clasificación final
        </h3>
        <Ranking rows={rows} participants={state.participants} highlightId={meId} />
      </Card>
      <div className="flex justify-center">
        <Link to="/app/jugar" className="pl-cta pl-cta-primary inline-flex h-12 items-center rounded-xl bg-primary px-6 font-semibold text-white hover:bg-primary-strong">
          Jugar otra sala
        </Link>
      </div>
    </div>
  );
}

export function PlaySessionPage() {
  const raw = useParams().code ?? '';
  const code = normalizeSessionCode(raw);
  const navigate = useNavigate();
  const { isMock, displayName, profile } = useAuth();
  const toast = useToast();
  const play = useParticipantSession(code);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const prevConnection = useRef(play.connection);
  const question = play.state?.currentQuestion;
  const streak = useAnswerStreak(question, play.currentAnswer?.choice);
  useGameSfx({
    ready: !!play.room && !play.fatal,
    status: play.state?.status,
    phase: play.state?.phase,
    question,
    participantCount: play.state?.participants.length ?? 0,
    myChoice: play.currentAnswer?.choice,
    connection: play.connection,
  });
  useQuestionBgm(
    activeQuestionBgm({
      inProgress: play.state?.status === 'IN_PROGRESS' && !!play.room && !play.fatal,
      questionOpen: question?.status === 'OPEN',
      currentIndex: play.state?.currentIndex ?? -1,
      questionsCount: play.state?.questionsCount ?? 0,
    }),
  );

  useEffect(() => {
    if (prevConnection.current === 'reconnecting' || prevConnection.current === 'offline') {
      if (play.connection === 'online') toast.success('Conexión restablecida. Estado sincronizado con el servidor.');
    }
    prevConnection.current = play.connection;
  }, [play.connection, toast]);

  if (!isValidSessionCode(code)) {
    return (
      <EmptyState
        title="Código inválido"
        description="El código de sala tiene 6 caracteres y no usa 0, O, 1 ni I."
        action={
          <Link to="/app/jugar" className="font-semibold text-primary hover:underline">
            Escribir otro código
          </Link>
        }
      />
    );
  }

  if (play.fatal) {
    return (
      <EmptyState
        title="No puedes entrar a esta sala"
        description={play.fatal.message}
        action={
          <Link to="/app/jugar" className="font-semibold text-primary hover:underline">
            Probar con otro código
          </Link>
        }
      />
    );
  }

  if (!play.room) return <FullPageLoader label="Entrando a la sala…" />;

  const room = play.room;
  const { state } = room;
  const inProgress = state.status === 'IN_PROGRESS';
  const reviewing = state.phase === 'REVIEW';
  const lastQuestion = questionBgmKind(state.currentIndex, state.questionsCount) === 'final';

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="pl-reveal flex flex-col gap-2 pr-14 sm:flex-row sm:items-start sm:justify-between lg:pr-0">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary sm:text-sm">Jugando · {state.code}</p>
          <h1 className="truncate text-lg font-extrabold sm:text-3xl">{state.quizTitle}</h1>
          <p className="hidden items-center gap-2 truncate text-muted sm:flex">
            <OwlAvatar id={play.me?.avatarId ?? profile?.avatarId} name={play.me?.displayName ?? displayName} size="xs" />
            Jugando como {play.me?.displayName ?? displayName}
          </p>
        </div>
        {play.myRow && state.status !== 'WAITING' && (
          <p className="w-fit shrink-0 rounded-xl bg-surface-2 px-3 py-2 text-sm font-bold tabular-nums sm:px-4 sm:text-base">
            #{play.myRow.rank} · {play.myRow.totalScore} pts
          </p>
        )}
      </div>

      <ConnectionBanner status={play.connection} isMock={isMock} onSimulate={play.simulateDrop} />
      {play.commandError && (
        <Alert tone="danger" className="pl-shake" action={<button type="button" aria-label="Cerrar aviso" onClick={play.clearCommandError} className="text-muted hover:text-fg"><X className="h-4 w-4" /></button>}>
          {play.commandError.message}
        </Alert>
      )}

      {state.status === 'WAITING' && (
        <div key="waiting" className="pl-stage-in">
          <PlayerLobby room={room} meId={play.me?.id} busy={play.busy === 'room:leave'} onLeave={() => setConfirmLeave(true)} />
        </div>
      )}
      {inProgress && state.currentQuestion && (
        <LifeAndDeathSplash enabled={lastQuestion}>
          <div key={state.currentQuestion.id} className="pl-stage-in">
            <QuestionBeat index={state.currentIndex} reviewing={reviewing} skipIntro={lastQuestion}>
              {(stage: ReviewStage) =>
                stage === 'ranking' ? (
                  <PlayerReviewRanking room={room} meId={play.me?.id} myChoice={play.currentAnswer?.choice} deadline={play.deadline} />
                ) : (
                  <PlayerQuestion
                    room={room}
                    deadline={play.deadline}
                    currentAnswer={play.currentAnswer}
                    streak={streak}
                    submitting={play.busy === 'answer:submit'}
                    onChoose={(choice) => void play.submitAnswer(choice)}
                  />
                )
              }
            </QuestionBeat>
          </div>
        </LifeAndDeathSplash>
      )}
      {state.status === 'FINISHED' && (
        <div key="finished" className="pl-stage-in">
          <PlayerFinished room={room} meId={play.me?.id} />
        </div>
      )}

      <ConfirmDialog
        open={confirmLeave}
        title="¿Salir de la sala?"
        description="Podrás volver a unirte con el mismo código mientras el anfitrión no inicie."
        confirmLabel="Salir"
        loading={play.busy === 'room:leave'}
        onCancel={() => setConfirmLeave(false)}
        onConfirm={async () => {
          const ok = await play.leave();
          setConfirmLeave(false);
          if (ok) navigate('/app/jugar');
        }}
      />
    </div>
  );
}
