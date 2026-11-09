import { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronLeft, ChevronRight, CircleDashed, FileQuestion, Trophy, Users, X } from 'lucide-react';
import type { SessionHistoryItem, SessionHistoryQuestionStat } from '../../api/types';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { MathText } from '../../components/ui/MathText';
import { ListFilters } from '../../components/ui/ListFilters';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { HistorySkeleton } from '../../components/ui/Skeleton';
import { Ranking } from '../../components/live/Ranking';
import { useApi } from '../../auth/useAuth';
import { cn } from '../../lib/cn';
import { correctLabel } from '../../lib/questionKind';
import { errorMessage } from '../../lib/http';
import { inDateRange, matchesText } from '../../lib/listFilters';
import { useResource } from '../../lib/useResource';
import { CourseBanner } from '../CourseOverviewPage';

const dateFmt = new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeStyle: 'short' });
export const HISTORY_PAGE_SIZE = 5;

function matchesHistory(item: SessionHistoryItem, query: string, from: string, to: string) {
  const text = `${item.quizTitle} ${item.code} ${item.winnerDisplayName ?? ''}`;
  return matchesText(text, query) && inDateRange(item.finishedAt, from, to);
}

function rankingParticipants(item: SessionHistoryItem) {
  return item.ranking.map((row) => ({
    id: row.participantId,
    sessionId: item.id,
    userId: row.participantId,
    displayName: row.displayName,
    avatarId: row.avatarId,
    joinedAt: item.finishedAt,
  }));
}

export const NAME_LIST_PREVIEW = 8;

function NameList({ names, empty }: { names: string[]; empty: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!names.length) return <p className="text-sm text-muted">{empty}</p>;
  const extra = names.length - NAME_LIST_PREVIEW;
  const visible = expanded || extra <= 0 ? names : names.slice(0, NAME_LIST_PREVIEW);
  return (
    <div className="min-h-0">
      <ul className={cn('flex flex-wrap gap-1.5', expanded && extra > 0 && 'max-h-40 overflow-y-auto pr-1')}>
        {visible.map((name, index) => (
          <li key={`${name}-${index}`} className="rounded-lg bg-surface px-2 py-0.5 text-sm font-semibold">
            {name}
          </li>
        ))}
      </ul>
      {extra > 0 && (
        <button type="button" className="mt-1.5 text-xs font-semibold text-primary hover:underline" onClick={() => setExpanded((value) => !value)}>
          {expanded ? 'Ver menos' : `+${extra} más`}
        </button>
      )}
    </div>
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
          <p className="font-semibold leading-snug">
            <MathText text={question.statement} />
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge tone="success">
              Correcta: <MathText text={correctLabel(question)} />
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

type HistorySection = 'resumen' | 'preguntas' | 'clasificacion';

const HISTORY_SECTIONS: Array<{ id: HistorySection; label: string }> = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'preguntas', label: 'Aciertos y errores por pregunta' },
  { id: 'clasificacion', label: 'Clasificación' },
];

function HistoryCard({
  item,
  open,
  onToggle,
}: {
  item: SessionHistoryItem;
  open: boolean;
  onToggle: () => void;
}) {
  const [section, setSection] = useState<HistorySection>('resumen');
  const rows = item.ranking.map(({ participantId, totalScore, rank }) => ({ participantId, totalScore, rank }));
  const panelId = `historial-${item.id}-panel`;

  function toggle() {
    if (!open) setSection('resumen');
    onToggle();
  }

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
            onClick={toggle}
          >
            Ver detalle
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

        <Modal open={open} title={item.quizTitle} size="xl" onClose={onToggle}>
          <div id={`historial-${item.id}`} className="space-y-4">
            <p className="-mt-2 text-sm text-muted">
              {dateFmt.format(new Date(item.finishedAt))} · código {item.code}
            </p>
            <div
              role="tablist"
              aria-label={`Secciones de ${item.quizTitle}`}
              className="flex gap-2 overflow-x-auto pb-1"
            >
              {HISTORY_SECTIONS.map((tab) => (
                <Button
                  key={tab.id}
                  size="sm"
                  variant={section === tab.id ? 'primary' : 'secondary'}
                  role="tab"
                  aria-selected={section === tab.id}
                  aria-controls={panelId}
                  id={`${item.id}-tab-${tab.id}`}
                  className="shrink-0"
                  onClick={() => setSection(tab.id)}
                >
                  {tab.label}
                </Button>
              ))}
            </div>

            <div
              role="tabpanel"
              id={panelId}
              aria-labelledby={`${item.id}-tab-${section}`}
              className="pl-stage-in"
            >
              {section === 'resumen' && (
                <div className="space-y-3">
                  <h3 className="text-base font-bold">Resumen</h3>
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
                </div>
              )}

              {section === 'preguntas' && (
                <div className="space-y-3">
                  <h3 className="text-base font-bold">Aciertos y errores por pregunta</h3>
                  {item.questions.length > 0 ? (
                    <ol className="space-y-3" aria-label={`Preguntas de ${item.quizTitle}`}>
                      {item.questions.map((question, index) => (
                        <QuestionBreakdown key={`${item.id}-${question.position}`} question={question} index={index} total={item.questions.length} />
                      ))}
                    </ol>
                  ) : (
                    <p className="text-sm text-muted">Esta partida no tiene desglose por pregunta.</p>
                  )}
                </div>
              )}

              {section === 'clasificacion' && (
                <div>
                  <h3 className="mb-3 text-base font-bold">Clasificación</h3>
                  {item.ranking.length > 0 ? (
                    <Ranking rows={rows} participants={rankingParticipants(item)} />
                  ) : (
                    <p className="text-sm text-muted">Nadie participó en esta partida.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </Modal>
      </div>
    </Card>
  );
}

export function HistoryPage() {
  const api = useApi();
  const { data, error, loading, reload } = useResource(() => api.sessions.history(), [api]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const filtered = useMemo(
    () => (data ?? []).filter((item) => matchesHistory(item, query, from, to)),
    [data, query, from, to],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / HISTORY_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * HISTORY_PAGE_SIZE;
    return filtered.slice(start, start + HISTORY_PAGE_SIZE);
  }, [filtered, currentPage]);

  function applyFilters(values: { query: string; from: string; to: string }) {
    setQuery(values.query);
    setFrom(values.from);
    setTo(values.to);
    setOpenId(null);
    setPage(1);
  }

  function clearFilters() {
    applyFilters({ query: '', from: '', to: '' });
  }

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
          <ListFilters
            query={query}
            from={from}
            to={to}
            searchLabel="Buscar partidas"
            searchPlaceholder="Buscar por título, código o ganador"
            onApply={applyFilters}
            onClear={clearFilters}
          />
          {filtered.length === 0 ? (
            <EmptyState
              title="No hay coincidencias"
              description="Ninguna partida coincide con la búsqueda o el rango de fechas."
              action={
                <Button variant="secondary" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              }
            />
          ) : (
            <>
              <ul key={`${currentPage}-${query}-${from}-${to}`} className="space-y-4" aria-label="Partidas finalizadas">
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
                    Página {currentPage} de {totalPages} · {filtered.length} {filtered.length === 1 ? 'partida' : 'partidas'}
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
