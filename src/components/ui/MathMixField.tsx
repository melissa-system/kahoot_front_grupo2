import {
  forwardRef,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { insertTextAtSelection } from '../../lib/insertAtCursor';
import { cn } from '../../lib/cn';
import { joinMath, padMathChunks, splitMath, type MathChunk } from '../../lib/mathEquation';
import { FieldShell } from './Field';
import { MathEquationChip } from './MathText';

export type MathMixHandle = {
  insert(text: string, maxLength?: number): void;
  focus(): void;
};

type MixControl = HTMLInputElement | HTMLTextAreaElement;

interface Props {
  value: string;
  onChange(value: string): void;
  onFocus?: () => void;
  label?: string;
  error?: string | null;
  hint?: ReactNode;
  placeholder?: string;
  maxLength?: number;
  variant?: 'area' | 'line';
  className?: string;
  testId?: string;
  id?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

function chunkLength(chunk: MathChunk) {
  return chunk.type === 'math' ? chunk.value.length + 2 : chunk.value.length;
}

function offsetOfChunk(chunks: MathChunk[], index: number) {
  let offset = 0;
  for (let i = 0; i < index; i++) offset += chunkLength(chunks[i]);
  return offset;
}

function lastTextIndex(chunks: MathChunk[]) {
  for (let i = chunks.length - 1; i >= 0; i--) if (chunks[i].type === 'text') return i;
  return 0;
}

export const MathMixField = forwardRef<MathMixHandle, Props>(function MathMixField(
  {
    value,
    onChange,
    onFocus,
    label,
    error,
    hint,
    placeholder,
    maxLength,
    variant = 'area',
    className,
    testId,
    id,
    disabled,
    'aria-label': ariaLabel,
  },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const chunks = padMathChunks(splitMath(value));
  const controls = useRef<Array<MixControl | null>>([]);
  const activeIndex = useRef(0);
  const pendingCaret = useRef<number | null>(null);
  const isArea = variant === 'area';
  const lastText = lastTextIndex(chunks);
  const emptyField = !value.trim();

  function commit(next: MathChunk[]) {
    const joined = joinMath(next);
    if (maxLength != null && joined.length > maxLength) return;
    onChange(joined);
  }

  function focusText(index: number, pos: number | 'start' | 'end' = 'end') {
    const el = controls.current[index];
    if (!el || chunks[index]?.type !== 'text') return;
    const at = pos === 'start' ? 0 : pos === 'end' ? el.value.length : pos;
    el.focus();
    el.setSelectionRange(at, at);
    activeIndex.current = index;
  }

  function placeCaret(fullCaret: number) {
    let offset = 0;
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const len = chunkLength(chunk);
      if (fullCaret <= offset + len) {
        if (chunk.type === 'text') {
          focusText(i, Math.max(0, Math.min(chunk.value.length, fullCaret - offset)));
          return;
        }
        for (let j = i + 1; j < chunks.length; j++) {
          if (chunks[j].type === 'text') {
            focusText(j, 'start');
            return;
          }
        }
      }
      offset += len;
    }
    focusText(lastTextIndex(chunks), 'end');
  }

  useLayoutEffect(() => {
    if (pendingCaret.current == null) return;
    const caret = pendingCaret.current;
    pendingCaret.current = null;
    placeCaret(caret);
    // chunks/value already committed; placeCaret reads current chunks from this render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useImperativeHandle(ref, () => ({
    insert(text: string, limit?: number) {
      const idx = chunks[activeIndex.current]?.type === 'text' ? activeIndex.current : lastTextIndex(chunks);
      const el = controls.current[idx];
      const localStart = el?.selectionStart ?? chunks[idx]?.value.length ?? value.length;
      const localEnd = el?.selectionEnd ?? localStart;
      const start = offsetOfChunk(chunks, idx) + localStart;
      const end = offsetOfChunk(chunks, idx) + localEnd;
      const next = insertTextAtSelection(value, text, start, end, limit ?? maxLength);
      pendingCaret.current = next.caret;
      onChange(next.value);
    },
    focus() {
      const idx = chunks[activeIndex.current]?.type === 'text' ? activeIndex.current : lastTextIndex(chunks);
      focusText(idx, 'end');
    },
  }));

  function onTextKeyDown(index: number, event: KeyboardEvent<MixControl>) {
    const el = event.currentTarget;
    const atStart = (el.selectionStart ?? 0) === 0 && (el.selectionEnd ?? 0) === 0;
    if (event.key !== 'Backspace' || !atStart) return;
    for (let i = index - 1; i >= 0; i--) {
      if (chunks[i].type === 'math') {
        event.preventDefault();
        const caret = offsetOfChunk(chunks, i);
        pendingCaret.current = caret;
        commit(chunks.filter((_, idx) => idx !== i));
        return;
      }
      if (chunks[i].type === 'text' && chunks[i].value) return;
    }
  }

  const box = (
    <div
      className={cn(
        'flex rounded-xl border bg-surface-2 outline-none transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30',
        isArea ? 'min-h-20 flex-wrap items-center justify-start gap-x-1.5 gap-y-2 px-3.5 py-2.5' : 'h-11 flex-nowrap items-center gap-1 overflow-x-auto px-3',
        error ? 'border-danger' : 'border-line',
        disabled && 'pointer-events-none opacity-70',
        className,
      )}
      onPointerDown={(event) => {
        if (disabled || event.target !== event.currentTarget) return;
        focusText(lastTextIndex(chunks), 'end');
      }}
    >
      {chunks.map((chunk, index) =>
        chunk.type === 'math' ? (
          <MathEquationChip
            key={`m-${index}`}
            latex={chunk.value}
            onPointerDown={(event) => {
              event.preventDefault();
              for (let j = index + 1; j < chunks.length; j++) {
                if (chunks[j].type === 'text') {
                  focusText(j, 'start');
                  return;
                }
              }
            }}
          />
        ) : (
          <span
            key={`t-${index}`}
            className={cn(
              'relative inline-grid min-w-0',
              emptyField ? 'w-full min-w-[1ch] flex-1' : index === lastText ? 'min-w-[6ch] flex-1' : 'min-w-[0.6ch]',
            )}
          >
            <span className="invisible col-start-1 row-start-1 whitespace-pre-wrap break-words py-0.5">
              {chunk.value || (emptyField ? placeholder || ' ' : index === lastText ? ' ' : '\u00a0')}
            </span>
            <textarea
              id={index === 0 ? fieldId : undefined}
              ref={(node) => {
                controls.current[index] = node;
              }}
              rows={1}
              cols={1}
              spellCheck={false}
              disabled={disabled}
              aria-label={index === 0 ? ariaLabel : undefined}
              aria-invalid={error ? true : undefined}
              value={chunk.value}
              placeholder={emptyField ? placeholder : undefined}
              onFocus={() => {
                activeIndex.current = index;
                onFocus?.();
              }}
              onChange={(event) => {
                const next = [...chunks];
                next[index] = { type: 'text', value: event.target.value };
                commit(next);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !isArea) event.preventDefault();
                onTextKeyDown(index, event);
              }}
              className={cn(
                'col-start-1 row-start-1 min-w-0 w-full resize-none overflow-hidden bg-transparent py-0.5 text-fg outline-none placeholder:text-muted/70',
                isArea ? 'min-h-[1.6em] text-base leading-relaxed' : 'h-8 text-sm',
              )}
            />
          </span>
        ),
      )}
      {testId ? <input type="hidden" data-testid={testId} value={value} readOnly /> : null}
    </div>
  );

  if (!label) return box;

  return (
    <FieldShell label={label} error={error} hint={hint} id={fieldId}>
      {box}
    </FieldShell>
  );
});
