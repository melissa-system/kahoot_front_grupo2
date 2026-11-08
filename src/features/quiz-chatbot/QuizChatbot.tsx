import { useState } from 'react';
import type { Api } from '../../api/client';
import icon from '../../assets/brand/profelink-icon.png';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { ChatComposer } from './ChatComposer';
import { ChatMessageList } from './ChatMessageList';
import { QuestionDraftReview } from './QuestionDraftReview';
import { QuizChatDialog } from './QuizChatDialog';
import { useQuestionBatch } from './useQuestionBatch';
import { useQuizChat } from './useQuizChat';

// Composición acotada: identidad del búho, jerarquía de revisión, mismos tokens y ritmo del editor.
export function QuizChatbot({ api, quizId, quizTitle, isMock, onSaved }: {
  api: Api; quizId: string; quizTitle: string; isMock: boolean; onSaved(): Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [proposalExpanded, setProposalExpanded] = useState(false);
  const batch = useQuestionBatch(api, quizId, async () => {
    setOpen(false);
    await onSaved();
  });
  const chat = useQuizChat(api, quizId, () => { batch.reset(); setProposalExpanded(false); });
  const disabled = chat.pending || batch.locked;
  const reviewing = proposalExpanded && chat.questions.length > 0;
  function send(text: string) {
    const accepted = chat.send(text);
    if (accepted) setProposalExpanded(false);
    return accepted;
  }
  return <>
    <Button variant="secondary" onClick={() => setOpen(true)} icon={<img src={icon} alt="" className="h-6 w-6 object-contain" />}>Chat bot</Button>
    {!open && batch.state === 'saved' && <div className="w-full space-y-2">
      <Alert tone="success">Las preguntas están guardadas en tu cuestionario.</Alert>
      {batch.refreshError && <Alert tone="info">Se guardaron, pero no se pudo actualizar el listado. <Button variant="ghost" onClick={() => void batch.refresh()}>Actualizar listado</Button></Alert>}
    </div>}
    <QuizChatDialog open={open} onClose={() => setOpen(false)} quizTitle={quizTitle} isMock={isMock} reviewExpanded={reviewing}>
      <div className={`mx-auto min-h-0 w-full max-w-7xl flex-1 ${reviewing
        ? 'grid grid-cols-1 grid-rows-[minmax(9rem,0.7fr)_minmax(0,2fr)_auto] lg:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.4fr)] lg:grid-rows-[minmax(0,1fr)_auto]'
        : 'flex flex-col'}`}>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <ChatMessageList messages={chat.messages} pending={chat.pending} />
          {chat.error && <div className="space-y-2 px-4 pb-4"><Alert tone="danger">{chat.error}</Alert>
            {chat.canRetry && <Button variant="secondary" disabled={disabled} onClick={chat.retry}>Reintentar respuesta</Button>}</div>}
          <div className="shrink-0 px-4 py-2"><Button variant="ghost" size="sm" disabled={disabled} onClick={() => {
            if (window.confirm('¿Iniciar una conversación nueva? Conservarás la propuesta actual.')) chat.resetConversation();
           }}>Nueva conversación</Button></div>
        </div>
        {open && <QuestionDraftReview chat={chat} batch={batch} expanded={proposalExpanded} onToggle={() => setProposalExpanded((value) => !value)} />}
        <div className="min-w-0 shrink-0"><ChatComposer disabled={disabled || chat.canRetry} onSend={send} compact={reviewing} /></div>
      </div>
    </QuizChatDialog>
  </>;
}
