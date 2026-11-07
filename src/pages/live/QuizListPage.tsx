import { Clock, FileQuestion, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { QuizSummary } from '../../api/types';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';
import { useApi } from '../../auth/useAuth';
import { errorMessage } from '../../lib/http';
import { useResource } from '../../lib/useResource';
import { CourseBanner } from '../CourseOverviewPage';
import { QuizFormDialog } from './QuizFormDialog';
import { StartSessionDialog } from './StartSessionDialog';

const dateFmt = new Intl.DateTimeFormat('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export function QuizListPage() {
  const api = useApi();
  const toast = useToast();
  const navigate = useNavigate();
  const { data: quizzes, setData, error, loading, reload } = useResource(() => api.quizzes.list(), [api]);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<QuizSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toStart, setToStart] = useState<QuizSummary | null>(null);

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

      {loading && !quizzes && <Spinner label="Cargando cuestionarios…" />}
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
        <ul className="overflow-hidden rounded-2xl border border-line bg-surface" aria-label="Cuestionarios">
          {quizzes.map((quiz) => (
            <li key={quiz.id} className="relative flex flex-col gap-4 border-b border-line px-5 py-5 last:border-b-0 sm:flex-row sm:items-center">
              <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-primary" />
              <div className="min-w-0 flex-1 space-y-2 pl-2">
                <Link to={`/app/evaluaciones/${quiz.id}`} className="block truncate text-lg font-semibold hover:text-primary">
                  {quiz.title}
                </Link>
                {quiz.description && <p className="line-clamp-2 text-muted">{quiz.description}</p>}
                <div className="flex flex-wrap items-center gap-3 text-muted">
                  <Badge tone="accent" icon={<FileQuestion className="h-4 w-4" />}>
                    {quiz.questionsCount} {quiz.questionsCount === 1 ? 'pregunta' : 'preguntas'}
                  </Badge>
                  <span className="inline-flex items-center gap-1.5 text-sm">
                    <Clock className="h-4 w-4" /> Actualizado {dateFmt.format(new Date(quiz.updatedAt))}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pl-2 sm:pl-0">
                <Button
                  size="sm"
                  variant="success"
                  icon={<Play className="h-4 w-4" />}
                  disabled={quiz.questionsCount === 0}
                  title={quiz.questionsCount === 0 ? 'Agrega al menos una pregunta' : undefined}
                  onClick={() => setToStart(quiz)}
                >
                  Jugar
                </Button>
                <Button size="sm" variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => navigate(`/app/evaluaciones/${quiz.id}`)}>
                  Editar
                </Button>
                <Button size="sm" variant="ghost" aria-label={`Eliminar ${quiz.title}`} onClick={() => setToDelete(quiz)}>
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <QuizFormDialog
        open={creating}
        onClose={() => setCreating(false)}
        onSubmit={async (values) => {
          const quiz = await api.quizzes.create({ title: values.title, description: values.description || undefined });
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

      {toStart && (
        <StartSessionDialog
          open
          quizTitle={toStart.title}
          questionsCount={toStart.questionsCount}
          onClose={() => setToStart(null)}
          onStart={async (values) => {
            const session = await api.sessions.create({ quizId: toStart.id, ...values });
            navigate(`/app/evaluaciones/sala/${session.id}`);
          }}
        />
      )}
    </div>
  );
}
