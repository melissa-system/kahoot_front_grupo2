import { useEffect, useRef, useState } from 'react';
import type { Api } from '../../api/client';
import type { ChatMessage, DraftQuestion, QuizChatRequest } from '../../api/chatbot.types';
import { chatErrorMessage } from './chat-errors';

export interface ReviewQuestion extends DraftQuestion { key: string; selected: boolean }
const review = (questions: DraftQuestion[]): ReviewQuestion[] => questions.map((q) => ({ ...q, key: crypto.randomUUID(), selected: true }));

export function useQuizChat(api: Api, quizId: string, onProposal: () => void = () => {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const busy = useRef(false);
  const alive = useRef(true);
  const failed = useRef<QuizChatRequest | null>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  async function request(input: QuizChatRequest) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    setCanRetry(false);
    failed.current = input;
    try {
      const response = await api.chatbot.respond(quizId, input);
      if (!alive.current) return;
      if (!response || typeof response.reply !== 'string' || !response.reply.trim()) throw new Error('La respuesta no es válida. Puedes reintentar.');
      if (response.draft !== null) {
        const draft = response.draft?.questions;
        if (!Array.isArray(draft) || draft.length < 1 || draft.length > 30 || draft.some((q) => typeof q.statement !== 'string' || !q.statement.trim() || q.statement.trim().length > 500 || typeof q.correctBoolean !== 'boolean')) throw new Error('La propuesta no es válida. Puedes reintentar.');
        setQuestions(review(draft));
        onProposal();
      }
      setMessages([...input.messages, { role: 'assistant', content: response.reply }]);
      failed.current = null;
    } catch (err) {
      if (alive.current) { setError(chatErrorMessage(err)); setCanRetry(true); }
    } finally {
      busy.current = false;
      if (alive.current) setPending(false);
    }
  }

  function send(text: string) {
    if (busy.current || !text.trim()) return false;
    if (failed.current) { setError('Reintenta el turno pendiente o inicia una conversación nueva.'); return false; }
    const next: ChatMessage[] = [...messages, { role: 'user', content: text.trim() }];
    const retained = questions.filter((q) => q.selected).map(({ statement, correctBoolean }) => ({ statement: statement.trim(), correctBoolean }));
    const input: QuizChatRequest = { messages: next, ...(retained.length ? { currentDraft: { questions: retained } } : {}) };
    if (next.length > 39 || text.trim().length > 2000 || new TextEncoder().encode(JSON.stringify(input)).length > 96 * 1024) {
      setError('Llegaste al límite de conversación. Inicia una nueva; conservarás tu propuesta.');
      return false;
    }
    setMessages(next);
    void request(input);
    return true;
  }

  function resetConversation() {
    if (busy.current) return;
    setMessages([]);
    setError(null);
    setCanRetry(false);
    failed.current = null;
  }

  return { messages, questions, setQuestions, pending, error, canRetry, send, resetConversation,
    retry: () => { if (failed.current) void request(failed.current); },
    patch: (key: string, change: Partial<DraftQuestion & { selected: boolean }>) => setQuestions((qs) => qs.map((q) => q.key === key ? { ...q, ...change } : q)),
  };
}
