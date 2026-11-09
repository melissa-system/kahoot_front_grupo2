import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import katex from 'katex';
import { Sigma } from 'lucide-react';
import {
  MATH_BOARD_COLUMNS,
  MATH_GREEK_KEYS,
  MATH_TOOLBAR_GROUPS,
  insertLatexSnippet,
  interpretMathInput,
  interpretMathTyping,
  toMathLiveSnippet,
  type MathKey,
} from '../../lib/mathEquation';
import { cn } from '../../lib/cn';
import { Button } from './Button';
import { MathField, type MathFieldHandle } from './MathField';

function MathGlyph({ latex }: { latex: string }) {
  const html = useMemo(
    () => katex.renderToString(latex, { throwOnError: false, displayMode: false, output: 'html' }),
    [latex],
  );
  return <span className="pl-math-key" aria-hidden dangerouslySetInnerHTML={{ __html: html }} />;
}

function KeyButton({ mathKey, onPick, tone = 'primary' }: { mathKey: MathKey; onPick(key: MathKey): void; tone?: 'primary' | 'accent' }) {
  const templated = Boolean(mathKey.glyph);
  return (
    <button
      type="button"
      title={mathKey.name}
      aria-label={`Insertar ${mathKey.name}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onPick(mathKey)}
      className={cn(
        'grid place-items-center rounded-2xl font-bold transition-colors',
        templated
          ? 'h-[3.4rem] min-h-[3.4rem] min-w-[3.4rem] bg-surface px-1 text-primary shadow-sm ring-1 ring-primary/20 hover:bg-primary hover:text-white hover:ring-primary'
          : 'h-11 min-w-11 px-2 text-[16px]',
        !templated && tone === 'accent'
          ? 'bg-accent-soft text-accent hover:bg-accent hover:text-white'
          : !templated
            ? 'bg-primary-soft text-primary hover:bg-primary hover:text-white'
            : null,
      )}
    >
      {mathKey.glyph ? <MathGlyph latex={mathKey.glyph} /> : mathKey.label}
    </button>
  );
}

function Family({
  title,
  hint,
  accent,
  children,
}: {
  title: string;
  hint?: string;
  accent: string;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className="relative overflow-hidden rounded-2xl border border-line bg-bg p-4">
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1.5', accent)} />
      <div className="pl-3">
        <div className="mb-3 flex items-baseline gap-2">
          <h3 className="text-sm font-bold">{title}</h3>
          {hint && <span className="text-xs text-muted">{hint}</span>}
        </div>
        {children}
      </div>
    </section>
  );
}

export function MathEquationDialog({
  open,
  onClose,
  onInsert,
}: {
  open: boolean;
  onClose(): void;
  onInsert(latex: string): void;
}) {
  const [latex, setLatex] = useState('');
  const [tab, setTab] = useState<'math' | 'greek'>('math');
  const fieldRef = useRef<MathFieldHandle>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setLatex('');
    setTab('math');
    const overlay = overlayRef.current;
    const blocked = overlay ? [...document.body.children].filter((el) => el !== overlay) : [];
    blocked.forEach((el) => el.setAttribute('inert', ''));
    const focus = window.setTimeout(() => fieldRef.current?.focus(), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onClose();
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      blocked.forEach((el) => el.removeAttribute('inert'));
      window.clearTimeout(focus);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  function pick(mathKey: MathKey) {
    const fromField = fieldRef.current?.insert(toMathLiveSnippet(mathKey.latex))
      ? fieldRef.current.getLatex().trim()
      : '';
    if (fromField) {
      setLatex(fromField);
      return;
    }
    const inserted = insertLatexSnippet(latex, latex.length, latex.length, mathKey.latex);
    const next = interpretMathTyping(inserted.value, inserted.caret);
    setLatex(next.value);
  }

  function insert() {
    const value = interpretMathInput(fieldRef.current?.getLatex() || latex).trim();
    if (!value) return;
    onInsert(value);
    onClose();
  }
  const greekUpper = MATH_GREEK_KEYS.slice(0, 24);
  const greekLower = MATH_GREEK_KEYS.slice(24, 48);
  const greekExtra = MATH_GREEK_KEYS.slice(48);
  const families = [
    { title: 'Armar', hint: 'bloques con huecos para rellenar', accent: 'bg-primary', keys: MATH_BOARD_COLUMNS[0] },
    { title: 'Comparar', hint: 'igualdades y flechas', accent: 'bg-warning', keys: MATH_BOARD_COLUMNS[1] },
    { title: 'Conjuntos', hint: 'lógica y números', accent: 'bg-accent', keys: MATH_BOARD_COLUMNS[2] },
  ];

  return createPortal(
    <div ref={overlayRef} className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="math-equation-title"
        className="relative flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-3xl border border-line bg-surface p-4 sm:max-h-[calc(100dvh-2rem)] sm:w-[min(96vw,90rem)] sm:p-5"
      >
        <div className="mb-3 flex shrink-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Sigma className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="math-equation-title" className="text-xl font-bold">
              Añadir fórmula
            </h2>
            <p className="hidden text-sm text-muted sm:block">Elige un bloque, escribe en el hueco, flecha para salir y borrar para deshacer.</p>
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </div>

        <div
          className="mb-3 shrink-0 cursor-text rounded-2xl border-2 border-primary/30 bg-primary-soft/60 px-6 py-4 focus-within:border-primary"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <MathField ref={fieldRef} onChange={setLatex} />
            <Button type="button" className="h-12 shrink-0 sm:w-32" onClick={insert} disabled={!interpretMathInput(latex).trim()}>
              Añadir
            </Button>
          </div>
        </div>

        <div role="tablist" aria-label="Tipo de símbolos" className="mb-3 grid max-w-md shrink-0 grid-cols-2 gap-2 rounded-2xl bg-surface-2 p-1">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'math'}
            className={cn(
              'rounded-xl px-3 py-2 text-sm font-semibold',
              tab === 'math' ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-fg',
            )}
            onClick={() => setTab('math')}
          >
            Símbolos
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'greek'}
            className={cn(
              'rounded-xl px-3 py-2 text-sm font-semibold',
              tab === 'greek' ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-fg',
            )}
            onClick={() => setTab('greek')}
          >
            Griego
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {tab === 'math' ? (
          <div className="space-y-4 pb-1">
            <Family title="Básicos" hint="operar y agrupar" accent="bg-primary">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                {MATH_TOOLBAR_GROUPS.map((group) => (
                  <div key={group.map((item) => item.name).join('-')} className="flex flex-wrap gap-2">
                    {group.map((mathKey) => (
                      <KeyButton key={`${mathKey.name}-${mathKey.latex}`} mathKey={mathKey} onPick={pick} />
                    ))}
                  </div>
                ))}
              </div>
            </Family>
            <div className="grid gap-4 lg:grid-cols-3">
              {families.map((family) => (
                <Family key={family.title} title={family.title} hint={family.hint} accent={family.accent}>
                  <div className="grid grid-cols-5 content-start gap-2">
                    {family.keys.map((mathKey) => (
                      <KeyButton key={`${mathKey.name}-${mathKey.latex}`} mathKey={mathKey} onPick={pick} />
                    ))}
                  </div>
                </Family>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 pb-1">
            <Family title="Mayúsculas" accent="bg-accent">
              <div className="grid grid-cols-8 gap-2 sm:grid-cols-12">
                {greekUpper.map((mathKey) => (
                  <KeyButton key={mathKey.name} mathKey={mathKey} onPick={pick} tone="accent" />
                ))}
              </div>
            </Family>
            <Family title="Minúsculas" accent="bg-accent">
              <div className="grid grid-cols-8 gap-2 sm:grid-cols-12">
                {greekLower.map((mathKey) => (
                  <KeyButton key={mathKey.name} mathKey={mathKey} onPick={pick} tone="accent" />
                ))}
              </div>
            </Family>
            {greekExtra.length > 0 && (
              <Family title="Variantes" accent="bg-accent">
                <div className="flex flex-wrap gap-2">
                  {greekExtra.map((mathKey) => (
                    <KeyButton key={mathKey.name} mathKey={mathKey} onPick={pick} tone="accent" />
                  ))}
                </div>
              </Family>
            )}
          </div>
        )}
        </div>

      </div>
    </div>,
    document.body,
  );
}
