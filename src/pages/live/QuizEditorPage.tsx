import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ArrowLeft, Pencil, Play, Plus, Timer } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Question, QuizDetail } from '../../api/types';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { QuizEditorSkeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { useApi, useAuth } from '../../auth/useAuth';
import { QuizChatbot } from '../../features/quiz-chatbot/QuizChatbot';
import { ApiError, errorMessage } from '../../lib/http';
import { loadQuizTiming } from '../../lib/quizTiming';
import { reorderQuestions } from '../../lib/reorderQuestions';
import { useResource } from '../../lib/useResource';
import { QuestionEditor, type QuestionDraft } from './QuestionEditor';
import { QuizFormDialog } from './QuizFormDialog';
import { SortableQuestionCard } from './SortableQuestionCard';
import { TimeLimitDialog } from './TimeLimitDialog';

export function QuizEditorPage() {
  const { quizId = '' } = useParams();
  const api = useApi();
  const { profile, session, isMock } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { data: quiz, setData, error, loading, reload } = useResource(() => api.quizzes.get(quizId), [api, quizId]);
  const [editingMeta, setEditingMeta] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [toDelete, setToDelete] = useState<Question | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [moving, setMoving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [timingOpen, setTimingOpen] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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
    const created = await api.questions.create(quizId, {
      statement: draft.statement,
      kind: draft.kind,
      correctBoolean: draft.correctBoolean,
      options: draft.options,
      correctIndexes: draft.correctIndexes,
      durationSeconds: draft.durationSeconds,
    });
    const withImage = await syncImage(created, draft);
    replaceQuestions((qs) => [...qs, withImage]);
    toast.success('Pregunta agregada');
  }

  async function updateQuestion(original: Question, draft: QuestionDraft) {
    let updated = original;
    if (
      draft.statement !== original.statement ||
      draft.kind !== original.kind ||
      draft.correctBoolean !== original.correctBoolean ||
      JSON.stringify(draft.correctIndexes ?? null) !== JSON.stringify(original.correctIndexes) ||
      JSON.stringify(draft.options ?? null) !== JSON.stringify(original.options) ||
      draft.durationSeconds !== original.durationSeconds
    )
      updated = {
        ...original,
        ...(await api.questions.update(original.id, {
          statement: draft.statement,
          kind: draft.kind,
          correctBoolean: draft.correctBoolean,
          options: draft.options,
          correctIndexes: draft.correctIndexes,
          durationSeconds: draft.durationSeconds,
        })),
      };
    updated = await syncImage(updated, draft);
    replaceQuestions((qs) => qs.map((q) => (q.id === updated.id ? { ...q, ...updated, imageUrl: updated.imageUrl } : q)));
    setEditingId(null);
    toast.success('Pregunta actualizada');
  }

  async function onDragEnd(event: DragEndEvent) {
    const overId = event.over?.id;
    if (!quiz || !overId || event.active.id === overId) return;
    const previous = quiz.questions;
    const next = reorderQuestions(previous, String(event.active.id), String(overId));
    const moved = next.find((question) => question.id === event.active.id);
    if (!moved) return;
    setData((current) => (current ? { ...current, questions: next } : current));
    setMoving(true);
    try {
      await api.questions.update(moved.id, { position: moved.position });
    } catch (err) {
      setData((current) => (current ? { ...current, questions: previous } : current));
      toast.error(errorMessage(err));
    } finally {
      setMoving(false);
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

  async function playQuiz() {
    if (!quiz || quiz.questions.length === 0) return;
    setStarting(true);
    try {
      const session = await api.sessions.create({ quizId: quiz.id, ...loadQuizTiming(quiz.id) });
      navigate(`/app/evaluaciones/sala/${session.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
      setStarting(false);
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
  const defaultSeconds = loadQuizTiming(quiz.id).questionDurationSeconds;
  const editingQuestion = questions.find((q) => q.id === editingId) ?? null;
  const editingIndex = editingQuestion ? questions.findIndex((q) => q.id === editingQuestion.id) : -1;

  return (
    <div>
      <Link to="/app/evaluaciones" className="mb-4 inline-flex items-center gap-2 text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Mis cuestionarios
      </Link>
      {quiz.imageUrl && (
        <img
          src={quiz.imageUrl}
          alt=""
          className="mb-4 h-36 w-full max-w-xl rounded-2xl border border-line object-cover"
        />
      )}
      <PageHeader
        title={quiz.title}
        description={quiz.description || 'Sin descripción'}
        actions={
          <>
            <Button variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditingMeta(true)}>
              Editar datos
            </Button>
            <Button variant="secondary" icon={<Timer className="h-4 w-4" />} onClick={() => setTimingOpen(true)}>
              Tiempo límite
            </Button>
            <Button
              variant="success"
              icon={<Play className="h-4 w-4" />}
              disabled={questions.length === 0 || starting}
              loading={starting}
              title={questions.length === 0 ? 'Agrega al menos una pregunta' : undefined}
              onClick={() => void playQuiz()}
            >
              Jugar
            </Button>
          </>
        }
      />

      <section aria-labelledby="questions-title" className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="questions-title" className="text-2xl font-bold">
            Preguntas
          </h2>
          <span className="rounded-lg bg-surface-2 px-2.5 py-0.5 text-sm font-semibold">{questions.length}</span>
          {profile?.role === 'teacher' && <QuizChatbot key={`${session?.user.id}:${quizId}`} api={api} quizId={quizId} quizTitle={quiz.title} isMock={isMock}
            onSaved={async () => { const updated = await api.quizzes.get(quizId); setData((current) => current?.id === updated.id ? updated : current); }} />}
        </div>

        {questions.length === 0 && !adding && (
          <EmptyState
            title="Este cuestionario no tiene preguntas"
            description="Agrega verdadero/falso o preguntas de 4 opciones, como en Kahoot. Puedes incluir una imagen en cada una."
            action={
              <Button icon={<Plus className="h-5 w-5" />} onClick={() => setAdding(true)}>
                Agregar pregunta
              </Button>
            }
          />
        )}

        {questions.length > 0 && (
          <p className="text-sm text-muted">Arrastra el asa de cada pregunta para cambiar el orden. También puedes usar el teclado: enfoca el asa, espacio y flechas.</p>
        )}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => void onDragEnd(event)}>
          <SortableContext items={questions.map((question) => question.id)} strategy={verticalListSortingStrategy}>
            <ol className="space-y-3">
              {questions.map((q, i) => (
                <SortableQuestionCard
                  key={q.id}
                  question={q}
                  index={i}
                  defaultSeconds={defaultSeconds}
                  disabled={moving}
                  onEdit={() => setEditingId(q.id)}
                  onDelete={() => setToDelete(q)}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>

        {questions.length > 0 && (
          <Button variant="secondary" size="lg" className="w-full border-dashed" icon={<Plus className="h-5 w-5" />} onClick={() => setAdding(true)}>
            Agregar pregunta
          </Button>
        )}

        <Alert tone="info">
          <span className="text-sm">
            Si editas este cuestionario mientras hay una partida en curso, la partida conserva la versión con la que empezó.
          </span>
        </Alert>
      </section>

      <Modal open={adding} title="Nueva pregunta" size="2xl" onClose={() => setAdding(false)}>
        {adding && (
          <QuestionEditor
            submitLabel="Agregar pregunta"
            onSubmit={async (draft) => {
              await addQuestion(draft);
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
          />
        )}
      </Modal>

      <Modal
        open={!!editingQuestion}
        title={editingIndex >= 0 ? `Editar pregunta ${editingIndex + 1}` : 'Editar pregunta'}
        size="2xl"
        onClose={() => setEditingId(null)}
      >
        {editingQuestion && (
          <QuestionEditor
            initial={editingQuestion}
            submitLabel="Guardar cambios"
            onSubmit={(draft) => updateQuestion(editingQuestion, draft)}
            onCancel={() => setEditingId(null)}
          />
        )}
      </Modal>

      <QuizFormDialog
        open={editingMeta}
        quiz={quiz}
        onClose={() => setEditingMeta(false)}
        onSubmit={async (values) => {
          let updated: QuizDetail = {
            ...quiz,
            ...(await api.quizzes.update(quiz.id, { title: values.title, description: values.description })),
          };
          if (values.image instanceof File) {
            try {
              const result = await api.quizzes.uploadImage(quiz.id, values.image);
              updated = { ...updated, imageKey: result.imageKey, imageUrl: result.imageUrl };
            } catch (err) {
              toast.error(`Los datos se guardaron, pero la imagen no: ${errorMessage(err)}`);
            }
          } else if (values.image === null && quiz.imageKey) {
            await api.quizzes.removeImage(quiz.id);
            updated = { ...updated, imageKey: null, imageUrl: null };
          }
          setData((q) => (q ? { ...q, ...updated, questions: q.questions } : q));
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

      {timingOpen && (
        <TimeLimitDialog
          open
          quizId={quiz.id}
          quizTitle={quiz.title}
          questionsCount={questions.length}
          onClose={() => setTimingOpen(false)}
          onSaved={() => toast.success('Tiempo límite guardado')}
        />
      )}
    </div>
  );
}
