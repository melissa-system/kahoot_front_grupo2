import { useEffect, useRef, useState } from 'react';
import type { Api } from '../../api/client';
import type { DraftQuestion, QuestionBatchRequest } from '../../api/chatbot.types';
import { ApiError } from '../../lib/http';
import { chatErrorMessage } from './chat-errors';

type State = 'reviewing' | 'saving' | 'saved' | 'error' | 'uncertain' | 'conflict';

export function useQuestionBatch(api: Api, quizId: string, onSaved: () => Promise<void>) {
  const [state, setState] = useState<State>('reviewing');
  const [error, setError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState(false);
  const snapshot = useRef<QuestionBatchRequest | null>(null);
  const busy = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  async function refresh() {
    try { await onSaved(); if (alive.current) setRefreshError(false); }
    catch { if (alive.current) setRefreshError(true); }
  }

  async function execute(input: QuestionBatchRequest) {
    if (busy.current) return;
    busy.current = true;
    setState('saving');
    setError(null);
    try {
      const receipt = await api.questions.createBatch(quizId, input);
      if (!receipt || receipt.operationId !== input.operationId || !Array.isArray(receipt.questions) || receipt.questions.length !== input.questions.length) throw new Error('No se pudo verificar el recibo.');
      if (!alive.current) return;
      setState('saved');
      await refresh();
    } catch (err) {
      if (!alive.current) return;
      const definite = err instanceof ApiError && [400, 401, 403, 404, 413].includes(err.status);
      setState(err instanceof ApiError && err.status === 409 ? 'conflict' : definite ? 'error' : 'uncertain');
      setError(definite || (err instanceof ApiError && err.status === 409) ? chatErrorMessage(err) : 'No pudimos confirmar el resultado. Reintenta el mismo lote; no se duplicará.');
    } finally { busy.current = false; }
  }

  const uncertain = state === 'uncertain' || state === 'conflict';
  useEffect(() => {
    if (state !== 'saving' && !uncertain) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const warnLink = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (!anchor || anchor.target === '_blank' || event.ctrlKey || event.metaKey) return;
      if (!window.confirm('El resultado del guardado está pendiente. Salir puede impedir reintentar este mismo lote. ¿Salir de todos modos?')) {
        event.preventDefault(); event.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', warn);
    document.addEventListener('click', warnLink, true);
    return () => { window.removeEventListener('beforeunload', warn); document.removeEventListener('click', warnLink, true); };
  }, [state, uncertain]);

  function save(questions: DraftQuestion[]) {
    if (busy.current || state === 'saved' || uncertain || !questions.length || questions.length > 30) return;
    const input = { operationId: crypto.randomUUID(), questions: questions.map(({ statement, correctBoolean }) => ({ statement: statement.trim(), correctBoolean })) };
    if (input.questions.some((q) => !q.statement || q.statement.length > 500 || typeof q.correctBoolean !== 'boolean')) return;
    snapshot.current = input;
    void execute(input);
  }

  return { state, error, refreshError, locked: state === 'saving' || uncertain,
    save, retry: () => { if (state === 'uncertain' && snapshot.current) void execute(snapshot.current); },
    refresh, reset: () => { if (!busy.current && !uncertain) { snapshot.current = null; setState('reviewing'); setError(null); setRefreshError(false); } },
  };
}
