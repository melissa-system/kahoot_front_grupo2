import { useState, type FormEvent } from 'react';
import { Send } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { TextAreaField } from '../../components/ui/Field';

// Una sola entrada: tema, cantidad y ajustes se expresan conversando.
export function ChatComposer({ disabled, onSend, compact = false }: { disabled: boolean; onSend(text: string): boolean; compact?: boolean }) {
  const [text, setText] = useState('');
  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (disabled || !text.trim() || text.trim().length > 2000) return;
    if (onSend(text)) setText('');
  }
  return (
    <form onSubmit={submit} className="shrink-0 space-y-3 border-t border-line bg-surface p-4">
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1"><TextAreaField label="¿Qué preguntas necesitas?" value={text} disabled={disabled} maxLength={2000} rows={2}
          placeholder="Ej.: 4 preguntas de 4 opciones sobre la fotosíntesis…" className="resize-none" style={compact ? { minHeight: '4rem', height: '4rem' } : undefined}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }} /></div>
        <Button type="submit" className="w-11 shrink-0 px-0" aria-label="Enviar" title="Enviar" disabled={disabled || !text.trim()} icon={<Send aria-hidden className="h-5 w-5" />} />
      </div>
      <p className="text-xs text-muted">Enter envía · Shift+Enter agrega una línea. Nada se guarda sin tu aprobación.</p>
    </form>
  );
}
