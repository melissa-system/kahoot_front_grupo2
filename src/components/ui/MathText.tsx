import katex from 'katex';
import { previewMathLatex, splitMath } from '../../lib/mathEquation';
import { cn } from '../../lib/cn';

function renderMath(latex: string) {
  try {
    return katex.renderToString(previewMathLatex(latex), { throwOnError: false, displayMode: false, output: 'html' });
  } catch {
    return latex;
  }
}

/** Texto mixto con fórmulas `$...$`. Lo usan tarjetas, partida, historial y el editor. */
export function MathText({ text, className }: { text: string; className?: string }) {
  if (!text.includes('$')) return <span className={className}>{text}</span>;
  return (
    <span className={cn('math-text', className)}>
      {splitMath(text).map((chunk, index) =>
        chunk.type === 'math' ? (
          <span key={index} className="katex-inline" dangerouslySetInnerHTML={{ __html: renderMath(chunk.value) }} />
        ) : (
          <span key={index}>{chunk.value}</span>
        ),
      )}
    </span>
  );
}

/** Vista previa con el mismo render que verá el alumno. */
export function FormulaPreview({ text, className }: { text: string; className?: string }) {
  if (!text.includes('$')) return null;
  return (
    <div className={cn('rounded-xl border border-line bg-bg px-3 py-2.5', className)}>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">Así se verá</p>
      <p className="text-lg font-semibold leading-relaxed">
        <MathText text={text} />
      </p>
    </div>
  );
}
