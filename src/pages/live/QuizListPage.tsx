import { ChevronLeft, ChevronRight, Clock, Copy, FileQuestion, ImageIcon, Pencil, Play, Plus, Timer, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { QuizSummary } from '../../api/types';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { ListFilters } from '../../components/ui/ListFilters';
import { PageHeader } from '../../components/ui/PageHeader';
import { QuizListSkeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { useApi } from '../../auth/useAuth';
import { errorMessage } from '../../lib/http';
import { inDateRange, matchesText } from '../../lib/listFilters';
import { loadQuizTiming } from '../../lib/quizTiming';
import { useResource } from '../../lib/useResource';
import { CourseBanner } from '../CourseOverviewPage';
import { QuizFormDialog } from './QuizFormDialog';
import { TimeLimitDialog } from './TimeLimitDialog';

const dateFmt = new Intl.DateTimeFormat('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric' });
export const QUIZ_PAGE_SIZE = 6;

function matchesQuiz(quiz: QuizSummary, query: string, from: string, to: string) {
  const text = `${quiz.title} ${quiz.description ?? ''}`;
  return matchesText(text, query) && inDateRange(quiz.updatedAt, from, to);
}

export function QuizListPage() {
  const api = useApi();
  const toast = useToast();
  const navigate = useNavigate();
  const { data: quizzes, setData, error, loading, reload } = useResource(() => api.quizzes.list(), [api]);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<QuizSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toTime, setToTime] = useState<QuizSummary | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () => (quizzes ?? []).filter((quiz) => matchesQuiz(quiz, query, from, to)),
    [quizzes, query, from, to],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / QUIZ_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * QUIZ_PAGE_SIZE;
    return filtered.slice(start, start + QUIZ_PAGE_SIZE);
  }, [filtered, currentPage]);

  function applyFilters(values: { query: string; from: string; to: string }) {
    setQuery(values.query);
    setFrom(values.from);
    setTo(values.to);
    setPage(1);
  }

  function clearFilters() {
    applyFilters({ query: '', from: '', to: '' });
  }

  async function playQuiz(quiz: QuizSummary) {
    if (quiz.questionsCount === 0) return;
    setPlayingId(quiz.id);
    try {
      const session = await api.sessions.create({ quizId: quiz.id, ...loadQuizTiming(quiz.id) });
      navigate(`/app/evaluaciones/sala/${session.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
      setPlayingId(null);
    }
  }

  async function duplicateQuiz(quiz: QuizSummary) {
    setCopyingId(quiz.id);
    try {
      const copy = await api.quizzes.duplicate(quiz.id);
      toast.success(`Listo: ${copy.title}`);
      await reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setCopyingId(null);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.quizzes.remove(toDelete.id);
      setData((list) => list?.filter((q) => q.id !== toDelete.id) ?? null);
      toast.success('Cuestionario eliminado');
      setToDelete(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-8">
      <CourseBanner subtitle="Evaluaciones en vivo" />
      <PageHeader
        title="Mis cuestionarios"
        description="Prepara preguntas de verdadero o falso y abre una sala para jugar con tu grupo."
        actions={
          <Button icon={<Plus className="h-5 w-5" />} onClick={() => setCreating(true)}>
            Nuevo cuestionario
          </Button>
        }
      />

      {loading && !quizzes && <QuizListSkeleton />}
      {error != null && (
        <Alert tone="danger" action={<Button size="sm" variant="secondary" onClick={() => void reload()}>Reintentar</Button>}>
          {errorMessage(error)}
        </Alert>
      )}

      {quizzes && quizzes.length === 0 && (
        <EmptyState
          title="Aún no tienes cuestionarios"
          description="Crea el primero y agrégale preguntas. Luego podrás abrir una sala en vivo."
          action={<Button icon={<Plus className="h-5 w-5" />} onClick={() => setCreating(true)}>Crear cuestionario</Button>}
        />
      )}

      {quizzes && quizzes.length > 0 && (
        <div className="space-y-4">
          <ListFilters
            query={query}
            from={from}
            to={to}
            searchLabel="Buscar cuestionarios"
            searchPlaceholder="Buscar por título o descripción"
            onApply={applyFilters}
            onClear={clearFilters}
          />

          {filtered.length === 0 ? (
            <EmptyState
              title="No hay coincidencias"
              description="Ningún cuestionario coincide con la búsqueda o el rango de fechas."
              action={
                <Button variant="secondary" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              }
            />
          ) : (
            <>
              <ul key={`${currentPage}-${query}-${from}-${to}`} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Cuestionarios">
                {pageItems.map((quiz, index) => (
                  <li key={quiz.id} className="pl-reveal" style={{ ['--pl-delay' as string]: `${index * 50}ms` }}>
                    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface transition hover:border-primary hover:shadow-[0_16px_40px_-24px_rgb(59_130_246/0.7)]">
                      {quiz.imageUrl ? (
                        <img src={quiz.imageUrl} alt="" className="h-40 w-full object-cover" />
                      ) : (
                        <span className="grid h-40 w-full place-items-center bg-surface-2 text-muted" aria-hidden>
                          <ImageIcon className="h-10 w-10" />
                        </span>
                      )}
                      <div className="flex flex-1 flex-col gap-3 p-5">
                        <div className="min-w-0 flex-1 space-y-2">
                          <Link to={`/app/evaluaciones/${quiz.id}`} className="line-clamp-2 text-lg font-semibold hover:text-primary">
                            {quiz.title}
                          </Link>
                          {quiz.description && <p className="line-clamp-2 text-sm text-muted">{quiz.description}</p>}
                          <div className="flex flex-wrap items-center gap-2 text-muted">
                            <Badge tone="accent" icon={<FileQuestion className="h-4 w-4" />}>
                              {quiz.questionsCount} {quiz.questionsCount === 1 ? 'pregunta' : 'preguntas'}
                            </Badge>
                            <span className="inline-flex items-center gap-1.5 text-sm">
                              <Clock className="h-4 w-4 shrink-0" /> {dateFmt.format(new Date(quiz.updatedAt))}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="success"
                            icon={<Play className="h-4 w-4" />}
                            disabled={quiz.questionsCount === 0 || playingId === quiz.id}
                            loading={playingId === quiz.id}
                            title={quiz.questionsCount === 0 ? 'Agrega al menos una pregunta' : undefined}
                            onClick={() => void playQuiz(quiz)}
                          >
                            Jugar
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={<Timer className="h-4 w-4" />}
                            onClick={() => setToTime(quiz)}
                          >
                            Tiempo límite
                          </Button>
                          <Button size="sm" variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => navigate(`/app/evaluaciones/${quiz.id}`)}>
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={<Copy className="h-4 w-4" />}
                            loading={copyingId === quiz.id}
                            disabled={copyingId === quiz.id}
                            onClick={() => void duplicateQuiz(quiz)}
                          >
                            Duplicar
                          </Button>
                          <Button size="sm" variant="ghost" aria-label={`Eliminar ${quiz.title}`} onClick={() => setToDelete(quiz)}>
                            <Trash2 className="h-4 w-4 text-danger" />
                          </Button>
                        </div>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
              {totalPages > 1 && (
                <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Paginación de cuestionarios">
                  <p className="text-sm text-muted">
                    Página {currentPage} de {totalPages} · {filtered.length} {filtered.length === 1 ? 'cuestionario' : 'cuestionarios'}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="secondary" icon={<ChevronLeft className="h-4 w-4" />} disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                      Anterior
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                      <Button key={n} size="sm" variant={n === currentPage ? 'primary' : 'secondary'} aria-current={n === currentPage ? 'page' : undefined} onClick={() => setPage(n)}>
                        {n}
                      </Button>
                    ))}
                    <Button size="sm" variant="secondary" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>
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

      <QuizFormDialog
        open={creating}
        onClose={() => setCreating(false)}
        onSubmit={async (values) => {
          const quiz = await api.quizzes.create({ title: values.title, description: values.description || undefined });
          if (values.image instanceof File) {
            try {
              await api.quizzes.uploadImage(quiz.id, values.image);
            } catch (err) {
              toast.error(`El cuestionario se creó, pero la imagen no: ${errorMessage(err)}`);
            }
          }
          setCreating(false);
          toast.success('Cuestionario creado. ¡Agrega tus preguntas!');
          navigate(`/app/evaluaciones/${quiz.id}`);
        }}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="¿Eliminar cuestionario?"
        description={
          <>
            Se eliminará <strong className="text-fg">{toDelete?.title}</strong> con todas sus preguntas. Las partidas ya jugadas conservan su copia.
          </>
        }
        confirmLabel="Eliminar"
        loading={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setToDelete(null)}
      />

      {toTime && (
        <TimeLimitDialog
          open
          quizId={toTime.id}
          quizTitle={toTime.title}
          questionsCount={toTime.questionsCount}
          onClose={() => setToTime(null)}
          onSaved={() => toast.success('Tiempo límite guardado')}
        />
      )}
    </div>
  );
}
