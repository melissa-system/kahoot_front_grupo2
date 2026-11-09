import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Maximize2, Minimize2, X } from 'lucide-react';
import icon from '../../assets/brand/profelink-icon.png';
import { Button } from '../../components/ui/Button';

// Profesor/revisión: propuesta primero; tokens existentes, superficie elevada, Inter 14/20, ritmo 4 px.
export function QuizChatDialog({ open, onClose, quizTitle, isMock, reviewExpanded = false, children }: {
  open: boolean; onClose(): void; quizTitle: string; isMock: boolean; reviewExpanded?: boolean; children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const title = useId();
  const [fullscreen, setFullscreen] = useState(false);
  const sizeLabel = fullscreen ? 'Restaurar tamaño' : 'Pantalla completa';
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, [open]);

  return (
    <dialog ref={ref} aria-labelledby={title} closedby="closerequest" onCancel={(event) => { event.preventDefault(); onClose(); }}
      className={`m-0 ml-auto h-dvh max-h-none w-full max-w-none flex-col border-l border-line bg-surface p-0 text-fg backdrop:bg-black/70 backdrop:backdrop-blur-sm open:flex ${fullscreen ? '' : reviewExpanded ? 'sm:w-[min(94vw,72rem)]' : 'sm:w-[28rem]'}`}>
      <header className="flex shrink-0 items-center gap-3 border-b border-line p-4">
        <img src={icon} alt="" className="h-12 w-12 shrink-0 object-contain" />
        <div className="min-w-0 flex-1">
          <h2 id={title} className="text-xl font-bold">Chat bot · ProfeLink</h2>
          <p className="truncate text-sm text-muted" title={quizTitle}>{quizTitle}</p>
          {isMock && <p className="text-xs font-semibold text-warning">Modo simulado · sin DeepSeek</p>}
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" className="w-11 px-0" aria-label={sizeLabel} title={sizeLabel} aria-pressed={fullscreen} onClick={() => setFullscreen((value) => !value)}>
            {fullscreen ? <Minimize2 aria-hidden className="h-5 w-5" /> : <Maximize2 aria-hidden className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" className="w-11 px-0" aria-label="Cerrar chat" title="Cerrar chat" onClick={onClose}><X aria-hidden className="h-5 w-5" /></Button>
        </div>
      </header>
      {children}
    </dialog>
  );
}
