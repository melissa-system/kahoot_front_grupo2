import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { MathfieldElement } from 'mathlive';
import 'mathlive/fonts.css';
import { mathLiveToLatex } from '../../lib/mathEquation';
import { cn } from '../../lib/cn';

/** MathLive pinta la selección en `.ML__selection`, fuera del contenedor que define `--_selection-*`. */
const MATHLIVE_THEME_CSS = `
:host(:focus) .ML__selection,
:host(:focus-within) .ML__selection,
.ML__focused .ML__selection {
  background: var(--selection-background-color, #38bdf8) !important;
  border-radius: 4px;
  box-shadow: 0 0 0 3px var(--selection-background-color, #38bdf8);
}
.ML__focused .ML__selected {
  color: var(--selection-color, #041018) !important;
}
.ML__container,
.ML__content {
  min-height: 100%;
  width: 100%;
}
`;

try {
  MathfieldElement.fontsDirectory = null as unknown as string;
  MathfieldElement.soundsDirectory = null as unknown as string;
} catch {
  /* jsdom */
}

export type MathFieldHandle = {
  insert(latex: string): boolean;
  getLatex(): string;
  focus(): void;
};

function readLatex(mf: MathfieldElement): string {
  try {
    return mathLiveToLatex(mf.getValue('latex') || '');
  } catch {
    try {
      return mf.getValue('latex-without-placeholders') || mf.value || '';
    } catch {
      return '';
    }
  }
}

function injectTheme(mf: MathfieldElement) {
  const root = mf.shadowRoot;
  if (!root) return;
  let style = root.getElementById('pl-mathlive-theme');
  if (!style) {
    style = document.createElement('style');
    style.id = 'pl-mathlive-theme';
    root.appendChild(style);
  }
  style.textContent = MATHLIVE_THEME_CSS;
}

function formulaBox(mf: MathfieldElement) {
  const root = mf.shadowRoot;
  if (!root) return null;
  const el =
    root.querySelector<HTMLElement>('.ML__base') ??
    root.querySelector<HTMLElement>('.ML__latex') ??
    root.querySelector<HTMLElement>('.ML__content');
  return el?.getBoundingClientRect() ?? null;
}

function placeCaretFromClick(mf: MathfieldElement, clientX: number) {
  const box = formulaBox(mf);
  try {
    mf.focus();
    if (box && clientX >= box.right - 4) {
      mf.executeCommand('moveToMathfieldEnd');
      return;
    }
    if (box && clientX <= box.left + 4) {
      mf.executeCommand('moveToMathfieldStart');
      return;
    }
  } catch {
    try {
      if (box && clientX >= box.right - 4) mf.position = mf.lastOffset;
      else if (box && clientX <= box.left + 4) mf.position = 0;
    } catch {
      /* ignore */
    }
  }
}

function onGutterPointerDown(e: PointerEvent, mf: MathfieldElement) {
  if (e.button !== 0) return;
  const box = formulaBox(mf);
  if (!box) return;
  if (e.clientX < box.right - 4 && e.clientX > box.left + 4) return;
  requestAnimationFrame(() => placeCaretFromClick(mf, e.clientX));
}

function createField(): MathfieldElement | null {
  try {
    return document.createElement('math-field') as MathfieldElement;
  } catch {
    try {
      return new MathfieldElement();
    } catch {
      return null;
    }
  }
}

export const MathField = forwardRef<MathFieldHandle, { className?: string; onChange(latex: string): void }>(
  function MathField({ className, onChange }, ref) {
    const hostRef = useRef<HTMLDivElement>(null);
    const mfRef = useRef<MathfieldElement | null>(null);
    const fallbackRef = useRef<HTMLInputElement>(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const [fallback, setFallback] = useState(false);

    useEffect(() => {
      if (fallback) return;
      const host = hostRef.current;
      if (!host) return;
      const mf = createField();
      if (!mf) {
        setFallback(true);
        return;
      }
      const onInput = () => onChangeRef.current(readLatex(mf));
      const onPointer = (e: Event) => onGutterPointerDown(e as PointerEvent, mf);
      try {
        mf.mathVirtualKeyboardPolicy = 'manual';
        mf.defaultMode = 'inline-math';
        mf.smartSuperscript = false;
        mf.placeholderSymbol = '□';
        mf.setAttribute('aria-label', 'Fórmula');
        mf.className = cn('pl-math-field', className);
        mf.addEventListener('input', onInput);
        mf.addEventListener('pointerdown', onPointer);
        host.replaceChildren(mf);
        injectTheme(mf);
        mfRef.current = mf;
        requestAnimationFrame(() => {
          try {
            mf.focus();
          } catch {
            /* ignore */
          }
        });
      } catch {
        mf.removeEventListener('input', onInput);
        mf.removeEventListener('pointerdown', onPointer);
        mf.remove();
        mfRef.current = null;
        setFallback(true);
        return;
      }
      return () => {
        mf.removeEventListener('input', onInput);
        mf.removeEventListener('pointerdown', onPointer);
        mf.remove();
        mfRef.current = null;
      };
    }, [className, fallback]);

    useImperativeHandle(ref, () => ({
      insert(latex: string) {
        const mf = mfRef.current;
        if (mf && typeof mf.insert === 'function') {
          try {
            return Boolean(mf.insert(latex, { focus: true, feedback: false, selectionMode: 'placeholder' }));
          } catch {
            return false;
          }
        }
        const input = fallbackRef.current;
        if (!input) return false;
        const start = input.selectionStart ?? input.value.length;
        const end = input.selectionEnd ?? start;
        const next = `${input.value.slice(0, start)}${latex}${input.value.slice(end)}`;
        input.value = next;
        const caret = start + latex.length;
        input.setSelectionRange(caret, caret);
        onChangeRef.current(next);
        return true;
      },
      getLatex() {
        if (mfRef.current) return readLatex(mfRef.current);
        return fallbackRef.current?.value ?? '';
      },
      focus() {
        try {
          mfRef.current?.focus();
        } catch {
          /* ignore */
        }
        fallbackRef.current?.focus();
      },
    }));

    if (fallback) {
      return (
        <input
          ref={fallbackRef}
          aria-label="Fórmula"
          className={cn('pl-math-field min-w-0 flex-1 bg-transparent text-lg outline-none', className)}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    }

    return (
      <div
        ref={hostRef}
        className="flex min-h-[6.25rem] min-w-0 flex-1 cursor-text items-stretch"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          const mf = mfRef.current;
          if (!mf) return;
          if (e.target instanceof Node && mf.contains(e.target)) return;
          placeCaretFromClick(mf, e.clientX);
        }}
      />
    );
  },
);
