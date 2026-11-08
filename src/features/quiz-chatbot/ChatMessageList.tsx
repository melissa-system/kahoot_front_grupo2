import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../../api/chatbot.types';

// Lectura tranquila: roles por peso/alineación; azul para autor, superficie neutra para asistente.
export function ChatMessageList({ messages, pending }: { messages: ChatMessage[]; pending: boolean }) {
  const list = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  useEffect(() => {
    if (pinned.current && list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [messages, pending]);
  useEffect(() => {
    const element = list.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      if (pinned.current) element.scrollTop = element.scrollHeight;
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={list} role="log" aria-label="Conversación con ProfeLink" aria-live="polite"
      onScroll={() => { const el = list.current; if (el) pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48; }}
      className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
      {!messages.length && <div className="space-y-2 text-sm text-muted">
        <p className="font-semibold text-fg">¿Qué van a aprender hoy?</p>
        <p>Indica un tema y cuántas preguntas necesitas, o pega tus afirmaciones. Después podrás revisar y corregir todo.</p>
        <p className="text-xs">Por ejemplo: «10 preguntas de fotosíntesis para sexto grado».</p>
      </div>}
      {messages.map((message, i) => <div key={i} className={message.role === 'user' ? 'ml-6 rounded-2xl bg-primary-soft p-3' : 'mr-3 rounded-2xl bg-surface-2 p-3'}>
        <p className="mb-1 text-xs font-semibold text-muted">{message.role === 'user' ? 'Tú' : 'ProfeLink'}</p>
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.content}</p>
      </div>)}
      {pending && <p role="status" className="text-sm font-medium text-muted">ProfeLink está preparando una respuesta…</p>}
    </div>
  );
}
