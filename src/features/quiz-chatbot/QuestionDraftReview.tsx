import { useId } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { validateDraftQuestion } from '../../lib/draftQuestion';
import { DraftQuestionCard } from './DraftQuestionCard';
import type { useQuizChat } from './useQuizChat';
import type { useQuestionBatch } from './useQuestionBatch';

// La aprobación es el foco; contador tabular y estado guardado separados del texto de la IA.
export function QuestionDraftReview({ chat, batch, expanded, onToggle }: {
  chat: ReturnType<typeof useQuizChat>; batch: ReturnType<typeof useQuestionBatch>; expanded: boolean; onToggle(): void;
}) {
  const bodyId = useId();
  const selected = chat.questions.filter((q) => q.selected);
  const saved = batch.state === 'saved';
  const disabled = chat.pending || chat.canRetry || batch.locked || saved;
  const invalid = !selected.length || selected.some((q) => validateDraftQuestion(q));
  if (!chat.questions.length) return null;
  return (
    <section aria-label="Propuesta de preguntas" className={`flex min-h-0 min-w-0 flex-col border-t border-line bg-surface-2 ${expanded ? 'overflow-hidden lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:border-l lg:border-t-0' : 'shrink-0'}`}>
      <h3 className="shrink-0"><Button variant="ghost" aria-label={expanded ? 'Minimizar propuesta' : 'Ver propuesta'}
        aria-expanded={expanded} aria-controls={bodyId} onClick={onToggle} className="h-auto min-h-11 w-full justify-between rounded-none p-4 text-left">
        <span className="font-bold">Revisa tu propuesta</span>
        <span className="ml-auto text-sm tabular-nums text-primary">{selected.length}/{chat.questions.length} elegidas</span>
        {expanded ? <ChevronUp aria-hidden className="h-5 w-5 shrink-0" /> : <ChevronDown aria-hidden className="h-5 w-5 shrink-0" />}
      </Button></h3>
      <div id={bodyId} hidden={!expanded} role="region" aria-label="Edición de la propuesta" className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-6">
        <p className="text-sm text-muted">Puedes corregir enunciados, tipo de pregunta y respuestas antes de agregarlos.</p>
        <ol className="space-y-3">{chat.questions.map((q, index) => <DraftQuestionCard key={q.key} question={q} index={index} disabled={disabled} onChange={(change) => chat.patch(q.key, change)} />)}</ol>
        {saved ? <Alert tone="success">Las preguntas están guardadas en tu cuestionario.</Alert> : <Button className="w-full" loading={batch.state === 'saving'}
          disabled={disabled || invalid} onClick={() => batch.save(selected)}>Agregar al cuestionario</Button>}
        {!saved && <Button variant="ghost" className="w-full" disabled={disabled} onClick={() => { chat.setQuestions([]); batch.reset(); }}>Descartar propuesta</Button>}
        <p className="text-xs text-muted">Revisa la exactitud de las respuestas. La IA puede equivocarse.</p>
      </div>
      {(batch.error || batch.refreshError) && <div className="shrink-0 space-y-2 px-4 pb-4">
        {batch.error && <Alert tone="danger">{batch.error}</Alert>}
        {batch.state === 'uncertain' && <Button className="w-full" onClick={batch.retry}>Reintentar guardado</Button>}
        {batch.refreshError && <Alert tone="info">Se guardaron, pero no se pudo actualizar el listado. <Button variant="ghost" onClick={() => void batch.refresh()}>Actualizar listado</Button></Alert>}
      </div>}
    </section>
  );
}
