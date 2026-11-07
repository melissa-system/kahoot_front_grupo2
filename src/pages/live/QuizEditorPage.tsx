import { ArrowDown, ArrowLeft, ArrowUp, Check, ImageIcon, Pencil, Play, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Question, QuizDetail } from '../../api/types';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { QuizEditorSkeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { useApi } from '../../auth/useAuth';
import { ApiError, errorMessage } from '../../lib/http';
import { useResource } from '../../lib/useResource';
import { QuestionEditor, type QuestionDraft } from './QuestionEditor';
import { QuizFormDialog } from './QuizFormDialog';
import { StartSessionDialog } from './StartSessionDialog';

export function QuizEditorPage() {
  const { quizId = '' } = useParams();
  const api = useApi();
  const toast = useToast();
  const navigate = useNavigate();
  const { data: quiz, setData, error, loading, reload } = useResource(() => api.quizzes.get(quizId), [api, quizId]);
  const [editingMeta, setEditingMeta] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [toDelete, setToDelete] = useState<Question | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [moving, setMoving] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const replaceQuestions = (fn: (qs: Question[]) => Question[]) =>
    setData((q) => (q ? { ...q, questions: fn(q.questions).sort((a, b) => a.position - b.position) } : q));

  /** Aplica la imagen del borrador. Si falla, la pregunta queda guardada y se avisa. */
  async function syncImage(question: Question, draft: QuestionDraft): Promise<Question> {
    if (draft.image instanceof File) {
      try {
        const result = await api.questions.uploadImage(question.id, draft.image);
        return { ...question, imageKey: result.imageKey, imageUrl: result.imageUrl };
      } catch (err) {
        toast.error(`La pregunta se guardó, pero la imagen no: ${errorMessage(err)}`);
        return question;
      }
    }
    if (draft.image === null && question.imageKey) {
      await api.questions.removeImage(question.id);
      return { ...question, imageKey: null, imageUrl: null };
    }
    return question;
  }

  async function addQuestion(draft: QuestionDraft) {
    const created = await api.questions.create(quizId, { statement: draft.statement, correctBoolean: draft.correctBoolean });
    const withImage = await syncImage(created, draft);
    replaceQuestions((qs) => [...qs, withImage]);
    toast.success('Pregunta agregada');
  }

  async function updateQuestion(original: Question, draft: QuestionDraft) {
    let updated = original;
    if (draft.statement !== original.statement || draft.correctBoolean !== original.correctBoolean)
      updated = { ...original, ...(await api.questions.update(original.id, { statement: draft.statement, correctBoolean: draft.correctBoolean })) };
    updated = await syncImage(updated, draft);
    replaceQuestions((qs) => qs.map((q) => (q.id === updated.id ? { ...q, ...updated, imageUrl: updated.imageUrl } : q)));
    setEditingId(null);
    toast.success('Pregunta actualizada');
  }

  async function move(question: Question, delta: -1 | 1) {
    setMoving(question.id);
    try {
      await api.questions.update(question.id, { position: question.position + delta });
      // El backend reordena las demás; recargamos para reflejar el orden real.
      setData(await api.quizzes.get(quizId));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setMoving(null);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.questions.remove(toDelete.id);
      setData(await api.quizzes.get(quizId));
      toast.success('Pregunta eliminada');
      setToDelete(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  if (loading && !quiz) return <QuizEditorSkeleton />;
  if (error || !quiz) {
    const notFound = error instanceof ApiError && (error.status === 404 || error.status === 403);
    return (
      <EmptyState
        title={notFound ? 'No encontramos este cuestionario' : 'No se pudo cargar el cuestionario'}
        description={notFound ? 'Puede que se haya eliminado o que pertenezca a otra cuenta.' : errorMessage(error)}
        action={
          notFound ? (
            <Link to="/app/evaluaciones" className="font-semibold text-primary hover:underline">
              Volver a mis cuestionarios
            </Link>
          ) : (
            <Button onClick={() => void reload()}>Reintentar</Button>
          )
        }
      />
    );
  }

  const questions = quiz.questions;

  return (
    <div>
      <Link to="/app/evaluaciones" className="mb-4 inline-flex items-center gap-2 text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Mis cuestionarios
      </Link>
      <PageHeader
        title={quiz.title}
        description={quiz.description || 'Sin descripción'}
        actions={
          <>
            <Button variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditingMeta(true)}>
              Editar datos
            </Button>
            <Button
              variant="success"
              icon={<Play className="h-4 w-4" />}
              disabled={questions.length === 0}
              title={questions.length === 0 ? 'Agrega al menos una pregunta' : undefined}
              onClick={() => setStarting(true)}
            >
              Jugar
            </Button>
          </>
        }
      />

      <section aria-labelledby="questions-title" className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 id="questions-title" className="text-2xl font-bold">
            Preguntas
          </h2>
          <span className="rounded-lg bg-surface-2 px-2.5 py-0.5 text-sm font-semibold">{questions.length}</span>
        </div>

        {questions.length === 0 && !adding && (
          <EmptyState
            title="Este cuestionario no tiene preguntas"
            description="Agrega afirmaciones de verdadero o falso. Puedes incluir una imagen en cada una."
            action={
              <Button icon={<Plus className="h-5 w-5" />} onClick={() => setAdding(true)}>
                Agregar pregunta
              </Button>
            }
          />
        )}

        <ol className="space-y-3">
          {questions.map((q, i) => (
            <li key={q.id}>
              <Card className="relative overflow-hidden">
                <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-primary" />
                {editingId === q.id ? (
                  <div className="p-5">
                    <p className="mb-3 text-sm font-semibold text-muted">Editando pregunta {i + 1}</p>
                    <QuestionEditor initial={q} submitLabel="Guardar cambios" onSubmit={(d) => updateQuestion(q, d)} onCancel={() => setEditingId(null)} />
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-warning font-bold text-warning">{i + 1}</span>
                    {q.imageUrl ? (
                      <img src={q.imageUrl} alt="" className="h-20 w-28 shrink-0 rounded-lg border border-line object-cover" />
                    ) : (
                      <span className="hidden h-20 w-28 shrink-0 place-items-center rounded-lg border border-dashed border-line text-muted sm:grid" aria-hidden>
                        <ImageIcon className="h-6 w-6" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="text-lg font-semibold">{q.statement}</p>
                      <Badge tone={q.correctBoolean ? 'success' : 'danger'} icon={q.correctBoolean ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}>
                        {q.correctBoolean ? 'Verdadero' : 'Falso'}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" aria-label={`Subir pregunta ${i + 1}`} disabled={i === 0 || moving !== null} onClick={() => void move(q, -1)}>
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Bajar pregunta ${i + 1}`}
                        disabled={i === questions.length - 1 || moving !== null}
                        onClick={() => void move(q, 1)}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" aria-label={`Editar pregunta ${i + 1}`} onClick={() => setEditingId(q.id)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" aria-label={`Eliminar pregunta ${i + 1}`} onClick={() => setToDelete(q)}>
                        <Trash2 className="h-4 w-4 text-danger" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ol>

        {adding ? (
          <Card className="p-5">
            <h3 className="mb-4 text-lg font-bold">Nueva pregunta</h3>
            <QuestionEditor submitLabel="Agregar pregunta" onSubmit={addQuestion} onCancel={() => setAdding(false)} />
          </Card>
        ) : (
          questions.length > 0 && (
            <Button variant="secondary" size="lg" className="w-full border-dashed" icon={<Plus className="h-5 w-5" />} onClick={() => setAdding(true)}>
              Agregar pregunta
            </Button>
          )
        )}

        <Alert tone="info">
          <span className="text-sm">
            Si editas este cuestionario mientras hay una partida en curso, la partida conserva la versión con la que empezó.
          </span>
        </Alert>
      </section>

      <QuizFormDialog
        open={editingMeta}
        quiz={quiz}
        onClose={() => setEditingMeta(false)}
        onSubmit={async (values) => {
          const updated = await api.quizzes.update(quiz.id, { title: values.title, description: values.description });
          setData((q) => (q ? ({ ...q, ...updated } as QuizDetail) : q));
          setEditingMeta(false);
          toast.success('Datos actualizados');
        }}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="¿Eliminar pregunta?"
        description={<>“{toDelete?.statement}” se eliminará de este cuestionario.</>}
        confirmLabel="Eliminar"
        loading={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setToDelete(null)}
      />

      {starting && (
        <StartSessionDialog
          open
          quizTitle={quiz.title}
          questionsCount={questions.length}
          onClose={() => setStarting(false)}
          onStart={async (values) => {
            const session = await api.sessions.create({ quizId: quiz.id, ...values });
            navigate(`/app/evaluaciones/sala/${session.id}`);
          }}
        />
      )}
    </div>
  );
}
