import { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronLeft, ChevronRight, CircleDashed, FileQuestion, Trophy, X } from 'lucide-react';
import type { PlayedSessionItem } from '../../api/types';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { MathText } from '../../components/ui/MathText';
import { PageHeader } from '../../components/ui/PageHeader';
import { HistorySkeleton } from '../../components/ui/Skeleton';
import { useApi } from '../../auth/useAuth';
import { cn } from '../../lib/cn';
import { choiceLabel, correctLabel, isCorrectChoice } from '../../lib/questionKind';
import { errorMessage } from '../../lib/http';
import { useResource } from '../../lib/useResource';
import { CourseBanner } from '../CourseOverviewPage';
import { HISTORY_PAGE_SIZE } from '../live/HistoryPage';

const dateFmt = new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeStyle: 'short' });

function PlayedCard({ item, open, onToggle }: { item: PlayedSessionItem; open: boolean; onToggle: () => void }) {
  return (
    <Card className="relative overflow-hidden p-5 sm:p-6">
      <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-primary" />
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
            icon={<ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />}
            onClick={onToggle}
          >
            {open ? 'Ocultar detalle' : 'Ver detalle'}
          </Button>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-primary-soft px-4 py-3">
          <Trophy className="h-6 w-6 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Tu resultado</p>
            <p className="truncate text-lg font-extrabold">
              {item.rank != null ? `#${item.rank}` : 'Sin puesto'}{' '}
              <span className="font-bold text-muted">
                · {item.totalScore} {item.totalScore === 1 ? 'pto' : 'pts'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge tone="primary" icon={<FileQuestion className="h-4 w-4" />}>
            {item.questionsCount} {item.questionsCount === 1 ? 'pregunta' : 'preguntas'}
          </Badge>
          <Badge tone="success" icon={<Check className="h-4 w-4" />}>
            {item.correctCount} {item.correctCount === 1 ? 'acierto' : 'aciertos'}
          </Badge>
          <Badge tone="danger" icon={<X className="h-4 w-4" />}>
            {item.wrongCount} {item.wrongCount === 1 ? 'error' : 'errores'}
          </Badge>
          {item.winnerDisplayName && (
            <Badge tone="accent" icon={<Trophy className="h-4 w-4" />}>
              Ganó {item.winnerDisplayName}
            </Badge>
          )}
        </div>

        {open && (
          <ol className="space-y-3 border-t border-line pt-5" aria-label={`Tus respuestas en ${item.quizTitle}`}>
            {item.questions.map((question) => {
              const ok = isCorrectChoice(question, question.myChoice);
              const missed = question.myChoice === null;
              return (
                <li key={question.position} className="rounded-xl border border-line bg-surface-2/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Pregunta {question.position + 1} de {item.questionsCount}
                  </p>
                  <p className="mt-1 font-semibold">
                    <MathText text={question.statement} />
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge tone="success">
                      Correcta: <MathText text={correctLabel(question)} />
                    </Badge>
                    {missed ? (
                      <Badge tone="neutral" icon={<CircleDashed className="h-4 w-4" />}>
                        No respondiste
                      </Badge>
                    ) : (
                      <Badge tone={ok ? 'success' : 'danger'} icon={ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}>
                        Tu respuesta: <MathText text={choiceLabel(question, question.myChoice)} />
                      </Badge>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </Card>
  );
}

export function PlayedResultsPage() {
  const api = useApi();
  const { data, error, loading, reload } = useResource(() => api.sessions.played(), [api]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil((data?.length ?? 0) / HISTORY_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    if (!data) return [];
    const start = (currentPage - 1) * HISTORY_PAGE_SIZE;
    return data.slice(start, start + HISTORY_PAGE_SIZE);
  }, [data, currentPage]);

  return (
    <div className="space-y-8">
      <CourseBanner subtitle="Tus resultados" />
      <PageHeader
        title="Lo que jugaste"
        description="Aquí ves el puesto y los puntos de cada Kahoot que contestaste. El profesor crea las partidas; tú solo te unes."
      />

      {loading && !data && <HistorySkeleton />}
      {error != null && (
        <Alert tone="danger" action={<Button size="sm" variant="secondary" onClick={() => void reload()}>Reintentar</Button>}>
          {errorMessage(error)}
        </Alert>
      )}

      {data && data.length === 0 && (
        <EmptyState
          title="Aún no has contestado ningún Kahoot"
          description="Pide el código a tu profesor, únete a la sala y cuando termine la partida verás aquí tu puntaje."
        />
      )}

      {data && data.length > 0 && (
        <div className="space-y-4">
          <ul key={currentPage} className="space-y-4" aria-label="Partidas que contestaste">
            {pageItems.map((item, index) => (
              <li key={item.id} className="pl-reveal" style={{ ['--pl-delay' as string]: `${index * 70}ms` }}>
                <PlayedCard
                  item={item}
                  open={openId === item.id}
                  onToggle={() => setOpenId((current) => (current === item.id ? null : item.id))}
                />
              </li>
            ))}
          </ul>
          {totalPages > 1 && (
            <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Paginación de resultados">
              <p className="text-sm text-muted">
                Página {currentPage} de {totalPages} · {data.length} partidas
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="secondary" icon={<ChevronLeft className="h-4 w-4" />} disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                  Anterior
                </Button>
                <Button size="sm" variant="secondary" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>
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
