import { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronLeft, ChevronRight, CircleDashed, FileQuestion, Trophy, Users, X } from 'lucide-react';
import type { SessionHistoryItem, SessionHistoryQuestionStat } from '../../api/types';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { HistorySkeleton } from '../../components/ui/Skeleton';
import { Ranking } from '../../components/live/Ranking';
import { useApi } from '../../auth/useAuth';
import { cn } from '../../lib/cn';
import { errorMessage } from '../../lib/http';
import { useResource } from '../../lib/useResource';
import { CourseBanner } from '../CourseOverviewPage';

const dateFmt = new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeStyle: 'short' });
export const HISTORY_PAGE_SIZE = 5;

function rankingParticipants(item: SessionHistoryItem) {
  return item.ranking.map((row) => ({
    id: row.participantId,
    sessionId: item.id,
    userId: row.participantId,
    displayName: row.displayName,
    joinedAt: item.finishedAt,
  }));
}

function NameList({ names, empty }: { names: string[]; empty: string }) {
  if (!names.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {names.map((name, index) => (
        <li key={`${name}-${index}`} className="rounded-lg bg-surface px-2 py-0.5 text-sm font-semibold">
          {name}
        </li>
      ))}
    </ul>
  );
}

function QuestionBreakdown({ question, index, total }: { question: SessionHistoryQuestionStat; index: number; total: number }) {
  const [open, setOpen] = useState(false);
  const answered = question.correctCount + question.wrongCount + question.unansweredCount;
  const pct = (n: number) => (answered > 0 ? `${(n / answered) * 100}%` : '0%');
  return (
    <li className="rounded-xl border border-line bg-surface-2/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Pregunta {index + 1} de {total}
          </p>
          <p className="font-semibold leading-snug">{question.statement}</p>
          <div className="flex flex-wrap gap-2">
            <Badge tone={question.correctBoolean ? 'success' : 'danger'}>
              Correcta: {question.correctBoolean ? 'Verdadero' : 'Falso'}
            </Badge>
            <Badge tone="success" icon={<Check className="h-4 w-4" />}>
              {question.correctCount} {question.correctCount === 1 ? 'acierto' : 'aciertos'}
            </Badge>
            <Badge tone="danger" icon={<X className="h-4 w-4" />}>
              {question.wrongCount} {question.wrongCount === 1 ? 'error' : 'errores'}
            </Badge>
          </div>
        </div>
      </div>
      <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-line" aria-hidden>
        <span className="bg-success" style={{ width: pct(question.correctCount) }} />
        <span className="bg-danger" style={{ width: pct(question.wrongCount) }} />
        <span className="bg-muted" style={{ width: pct(question.unansweredCount) }} />
      </div>
      <button
        type="button"
        className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} aria-hidden />
        {open ? 'Ocultar quién respondió' : 'Quién acertó y quién falló'}
      </button>
      {open && (
        <div className="pl-stage-in mt-3 grid gap-3 border-t border-line pt-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <p className="inline-flex items-center gap-1.5 text-sm font-bold text-success">
              <Check className="h-4 w-4" aria-hidden /> Aciertos
            </p>
            <NameList names={question.correctNames} empty="Nadie acertó" />
          </div>
          <div className="space-y-1.5">
            <p className="inline-flex items-center gap-1.5 text-sm font-bold text-danger">
              <X className="h-4 w-4" aria-hidden /> Errores
            </p>
            <NameList names={question.wrongNames} empty="Nadie se equivocó" />
          </div>
          <div className="space-y-1.5">
            <p className="inline-flex items-center gap-1.5 text-sm font-bold text-muted">
              <CircleDashed className="h-4 w-4" aria-hidden /> Sin responder
            </p>
            <NameList names={question.unansweredNames} empty="Todos respondieron" />
          </div>
        </div>
      )}
    </li>
  );
}

function HistoryCard({
  item,
  open,
  onToggle,
}: {
  item: SessionHistoryItem;
  open: boolean;
  onToggle: () => void;
}) {
  const rows = item.ranking.map(({ participantId, totalScore, rank }) => ({ participantId, totalScore, rank }));
  return (
    <Card className="relative overflow-hidden p-5 sm:p-6">
      <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-warning" />
      <div className="space-y-4 pl-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold sm:text-xl">{item.quizTitle}</h2>
            <p className="text-sm text-muted">
              {dateFmt.format(new Date(item.finishedAt))} · código {item.code}
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            aria-expanded={open}
            aria-controls={`historial-${item.id}`}
            icon={<ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />}
            onClick={onToggle}
          >
            {open ? 'Ocultar detalle' : 'Ver detalle'}
          </Button>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-warning/15 px-4 py-3">
          <Trophy className="h-6 w-6 shrink-0 text-warning" aria-hidden />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Primer lugar</p>
            {item.winnerDisplayName ? (
              <p className="truncate text-lg font-extrabold">
                {item.winnerDisplayName}{' '}
                <span className="font-bold text-muted">
                  · {item.winnerScore ?? 0} {item.winnerScore === 1 ? 'pto' : 'pts'}
                </span>
              </p>
            ) : (
              <p className="font-semibold text-muted">Nadie participó en esta partida</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2" aria-label="Resumen de la partida">
          <Badge tone="accent" icon={<Users className="h-4 w-4" />}>
            {item.participantCount} {item.participantCount === 1 ? 'participante' : 'participantes'}
          </Badge>
          <Badge tone="primary" icon={<FileQuestion className="h-4 w-4" />}>
            {item.questionsCount} {item.questionsCount === 1 ? 'pregunta' : 'preguntas'}
          </Badge>
          <Badge tone="success" icon={<Check className="h-4 w-4" />}>
            {item.correctCount} {item.correctCount === 1 ? 'acierto' : 'aciertos'}
          </Badge>
          <Badge tone="danger" icon={<X className="h-4 w-4" />}>
            {item.wrongCount} {item.wrongCount === 1 ? 'error' : 'errores'}
          </Badge>
        </div>

        {open && (
          <div id={`historial-${item.id}`} className="pl-stage-in space-y-5 border-t border-line pt-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Totales de la partida">
              <div className="rounded-2xl bg-primary-soft px-4 py-4 text-center">
                <p className="text-3xl font-extrabold tabular-nums text-primary">{item.questionsCount}</p>
                <p className="text-sm font-semibold text-primary">Total de preguntas</p>
              </div>
              <div className="rounded-2xl bg-success-soft px-4 py-4 text-center">
                <p className="text-3xl font-extrabold tabular-nums text-success">{item.correctCount}</p>
                <p className="text-sm font-semibold text-success">Total de aciertos</p>
              </div>
              <div className="rounded-2xl bg-danger-soft px-4 py-4 text-center">
                <p className="text-3xl font-extrabold tabular-nums text-danger">{item.wrongCount}</p>
                <p className="text-sm font-semibold text-danger">Total de errores</p>
              </div>
              <div className="rounded-2xl bg-surface-2 px-4 py-4 text-center">
                <p className="text-3xl font-extrabold tabular-nums text-muted">{item.unansweredCount}</p>
                <p className="text-sm font-semibold text-muted">Sin responder</p>
              </div>
            </div>

            {item.questions.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-base font-bold">Aciertos y errores por pregunta</h3>
                <ol className="space-y-3" aria-label={`Preguntas de ${item.quizTitle}`}>
                  {item.questions.map((question, index) => (
                    <QuestionBreakdown key={`${item.id}-${question.position}`} question={question} index={index} total={item.questions.length} />
                  ))}
                </ol>
              </div>
            )}

            {item.ranking.length > 0 && (
              <div>
                <h3 className="mb-3 text-base font-bold">Clasificación</h3>
                <Ranking rows={rows} participants={rankingParticipants(item)} />
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

export function HistoryPage() {
  const api = useApi();
  const { data, error, loading, reload } = useResource(() => api.sessions.history(), [api]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil((data?.length ?? 0) / HISTORY_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    if (!data) return [];
    const start = (currentPage - 1) * HISTORY_PAGE_SIZE;
    return data.slice(start, start + HISTORY_PAGE_SIZE);
  }, [data, currentPage]);

  function goTo(next: number) {
    setOpenId(null);
    setPage(next);
  }

  return (
    <div className="space-y-8">
      <CourseBanner subtitle="Historial de partidas" />
      <PageHeader
        title="Historial de Kahoots"
        description="Revisa el ganador y los totales de cada partida. Abre el detalle cuando quieras ver las preguntas y quién respondió."
      />

      {loading && !data && <HistorySkeleton />}
      {error != null && (
        <Alert tone="danger" action={<Button size="sm" variant="secondary" onClick={() => void reload()}>Reintentar</Button>}>
          {errorMessage(error)}
        </Alert>
      )}

      {data && data.length === 0 && (
        <EmptyState
          title="Aún no hay partidas finalizadas"
          description="Cuando dirijas un Kahoot y termine, aquí verás al ganador, los totales y el desglose por pregunta."
        />
      )}

      {data && data.length > 0 && (
        <div className="space-y-4">
          <ul key={currentPage} className="space-y-4" aria-label="Partidas finalizadas">
            {pageItems.map((item, index) => (
              <li key={item.id} className="pl-reveal" style={{ ['--pl-delay' as string]: `${index * 70}ms` }}>
                <HistoryCard
                  item={item}
                  open={openId === item.id}
                  onToggle={() => setOpenId((current) => (current === item.id ? null : item.id))}
                />
              </li>
            ))}
          </ul>
          {totalPages > 1 && (
            <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Paginación del historial">
              <p className="text-sm text-muted">
                Página {currentPage} de {totalPages} · {data.length} partidas
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="secondary" icon={<ChevronLeft className="h-4 w-4" />} disabled={currentPage === 1} onClick={() => goTo(currentPage - 1)}>
                  Anterior
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <Button key={n} size="sm" variant={n === currentPage ? 'primary' : 'secondary'} aria-current={n === currentPage ? 'page' : undefined} onClick={() => goTo(n)}>
                    {n}
                  </Button>
                ))}
                <Button size="sm" variant="secondary" disabled={currentPage === totalPages} onClick={() => goTo(currentPage + 1)}>
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </nav>
          )}
        </div>
      )}
    </div>
  );
}
