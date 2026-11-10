import { BarChart3, BookOpen, FileQuestion, Play, Radio, Trophy, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import coin from '../assets/brand/taku-coin.png';
import type { PlayedSessionItem, QuizSummary, SessionHistoryItem } from '../api/types';
import { isTeacher } from '../auth/roles';
import { useApi, useAuth } from '../auth/useAuth';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { QuizListSkeleton } from '../components/ui/Skeleton';
import { COURSE } from '../layout/course';
import { errorMessage } from '../lib/http';
import { useResource } from '../lib/useResource';

export function CourseBanner({ subtitle = 'Actividades y Materiales del curso' }: { subtitle?: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-[linear-gradient(120deg,#1b1f4a_0%,#2a1b55_45%,#0f2a4a_100%)] px-5 py-6 sm:px-8 sm:py-8">
      <div aria-hidden className="absolute inset-0 opacity-30 [background-image:radial-gradient(#60a5fa_1px,transparent_1px)] [background-size:18px_18px]" />
      <div className="relative flex items-center gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-white/20 bg-white/10 text-white">
          <BookOpen className="h-7 w-7" />
        </span>
        <div className="min-w-0 text-white">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-4xl">{COURSE.name}</h1>
          <p className="text-white/80 sm:text-lg">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

const dateFmt = new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeStyle: 'short' });

export function CourseOverviewPage() {
  const { profile } = useAuth();
  if (!profile) return <QuizListSkeleton />;
  return isTeacher(profile) ? <TeacherDashboard /> : <StudentHome />;
}

function TeacherDashboard() {
  const api = useApi();
  const quizzes = useResource(() => api.quizzes.list(), [api]);
  const history = useResource(() => api.sessions.history(), [api]);
  const loading = (quizzes.loading && !quizzes.data) || (history.loading && !history.data);
  const error = quizzes.error ?? history.error;

  const quizList = quizzes.data ?? [];
  const games = history.data ?? [];
  const questions = quizList.reduce((sum, quiz) => sum + quiz.questionsCount, 0);
  const players = games.reduce((sum, game) => sum + game.participantCount, 0);
  const answers = games.reduce((sum, game) => sum + game.correctCount + game.wrongCount + game.unansweredCount, 0);
  const hits = games.reduce((sum, game) => sum + game.correctCount, 0);
  const accuracy = answers > 0 ? Math.round((hits / answers) * 100) : null;

  return (
    <div className="space-y-8">
      <CourseBanner subtitle="Tablero del profesor" />
      {loading ? (
        <QuizListSkeleton />
      ) : error ? (
        <Card className="p-6 text-danger">{errorMessage(error)}</Card>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen">
            <Stat icon={<FileQuestion className="h-5 w-5" />} label="Cuestionarios" value={String(quizList.length)} hint={`${questions} ${questions === 1 ? 'pregunta' : 'preguntas'}`} />
            <Stat icon={<Radio className="h-5 w-5" />} label="Partidas" value={String(games.length)} hint="Finalizadas" />
            <Stat icon={<Users className="h-5 w-5" />} label="Participaciones" value={String(players)} hint="Entre todas las salas" />
            <Stat icon={<BarChart3 className="h-5 w-5" />} label="Aciertos" value={accuracy === null ? '—' : `${accuracy}%`} hint={answers > 0 ? `${hits} de ${answers} respuestas` : 'Aún no hay respuestas'} />
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            <Action to="/app/evaluaciones" title="Mis cuestionarios" text="Crear, duplicar y abrir una sala." />
            <Action to="/app/evaluaciones/historial" title="Historial" text="Ganadores, aciertos y errores." />
            <Action to="/app/jugar" title="Unirse a una sala" text="Entrar con un código, también como profesor." />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <h2 className="mb-4 text-lg font-bold">Últimas partidas</h2>
              {games.length === 0 ? (
                <p className="text-muted">Cuando cierres una sala, el ganador aparece aquí.</p>
              ) : (
                <ul className="space-y-3">
                  {games.slice(0, 4).map((game) => (
                    <HistoryRow key={game.id} game={game} />
                  ))}
                </ul>
              )}
            </Card>
            <Card className="p-5">
              <h2 className="mb-4 text-lg font-bold">Cuestionarios recientes</h2>
              {quizList.length === 0 ? (
                <p className="text-muted">Todavía no tienes cuestionarios.</p>
              ) : (
                <ul className="space-y-3">
                  {quizList.slice(0, 4).map((quiz) => (
                    <QuizRow key={quiz.id} quiz={quiz} />
                  ))}
                </ul>
              )}
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function StudentHome() {
  const api = useApi();
  const played = useResource(() => api.sessions.played(), [api]);
  const games = played.data ?? [];
  const best = games.reduce<PlayedSessionItem | null>((top, game) => {
    if (game.rank == null) return top;
    if (!top || top.rank == null || game.rank < top.rank) return game;
    return top;
  }, null);

  return (
    <div className="space-y-8">
      <CourseBanner subtitle="Tu curso" />
      {played.loading && !played.data ? (
        <QuizListSkeleton />
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2">
            <Action to="/app/jugar" title="Unirse a una sala" text="Escribe el código o escanea el QR de tu profesor." />
            <Action to="/app/resultados" title="Mis resultados" text={best ? `Mejor puesto reciente: #${best.rank} en ${best.quizTitle}` : 'Aquí verás tu puesto cuando termines una partida.'} />
          </section>
          <Link to="/app/jugar" className="flex flex-col items-start gap-4 rounded-2xl border border-line bg-surface p-6 transition hover:border-primary sm:flex-row sm:items-center">
            <img src={coin} alt="" className="h-16 w-16" />
            <div className="flex-1">
              <p className="flex items-center gap-2 text-xl font-bold">
                <Radio className="h-5 w-5 text-primary" /> Evaluaciones en vivo
              </p>
              <p className="text-muted">Únete con el código de tu profesor y revisa tu puntaje cuando termine la partida.</p>
            </div>
            <span className="font-semibold text-primary">Abrir →</span>
          </Link>
        </>
      )}
    </div>
  );
}

function Stat({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint: string }) {
  return (
    <Card className="p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-muted">
        <span className="text-primary">{icon}</span> {label}
      </p>
      <p className="mt-2 text-3xl font-extrabold tabular-nums">{value}</p>
      <p className="mt-1 text-sm text-muted">{hint}</p>
    </Card>
  );
}

function Action({ to, title, text }: { to: string; title: string; text: string }) {
  return (
    <Link to={to} className="rounded-2xl border border-line bg-surface p-4 transition hover:border-primary">
      <p className="font-bold">{title}</p>
      <p className="mt-1 text-sm text-muted">{text}</p>
    </Link>
  );
}

function HistoryRow({ game }: { game: SessionHistoryItem }) {
  return (
    <li className="flex items-start justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
      <div className="min-w-0">
        <p className="truncate font-semibold">{game.quizTitle}</p>
        <p className="text-sm text-muted">{dateFmt.format(new Date(game.finishedAt))} · {game.code}</p>
      </div>
      <Badge tone="accent" icon={<Trophy className="h-4 w-4" />}>
        {game.winnerDisplayName ?? 'Sin ganador'}
      </Badge>
    </li>
  );
}

function QuizRow({ quiz }: { quiz: QuizSummary }) {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
      <div className="min-w-0">
        <Link to={`/app/evaluaciones/${quiz.id}`} className="truncate font-semibold hover:text-primary">
          {quiz.title}
        </Link>
        <p className="text-sm text-muted">
          {quiz.questionsCount} {quiz.questionsCount === 1 ? 'pregunta' : 'preguntas'}
        </p>
      </div>
      <Link to="/app/evaluaciones" className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
        <Play className="h-4 w-4" /> Jugar
      </Link>
    </li>
  );
}
