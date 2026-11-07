/*
 * Detalles decorativos "de plano técnico" para el hero, tomados de la estética
 * del componente hero-ascii: esquinas de encuadre, líneas de notación, patrón
 * dither, fila de puntos y una franja de estado de sistema. Todo es decorativo
 * (aria-hidden) y se adapta al tema con los tokens fg/line.
 */

const BAR_HEIGHTS = [10, 6, 14, 8, 12, 5, 9, 15];

/** Cuatro esquinas de encuadre; el contenedor padre debe ser `relative`. */
export function CornerAccents() {
  const base = 'pl-corner pointer-events-none absolute z-20 h-8 w-8 border-fg/30 lg:h-12 lg:w-12';
  return (
    <div aria-hidden>
      <span className={`${base} left-0 top-0 border-l-2 border-t-2`} style={{ ['--pl-delay' as string]: '0ms' }} />
      <span className={`${base} right-0 top-0 border-r-2 border-t-2`} style={{ ['--pl-delay' as string]: '80ms' }} />
      <span className={`${base} bottom-0 left-0 border-b-2 border-l-2`} style={{ ['--pl-delay' as string]: '160ms' }} />
      <span className={`${base} bottom-0 right-0 border-b-2 border-r-2`} style={{ ['--pl-delay' as string]: '240ms' }} />
    </div>
  );
}

/** Línea de notación con un índice, por ejemplo "001". */
export function NotationLine({ label, trailing = false }: { label: string; trailing?: boolean }) {
  return (
    <div aria-hidden className="flex items-center gap-2 font-mono text-[10px] tracking-wider text-fg opacity-50">
      {trailing ? (
        <>
          <span>∞</span>
          <span className="pl-notation-line h-px flex-1 bg-fg" />
          <span>{label}</span>
        </>
      ) : (
        <>
          <span className="pl-notation-line h-px w-8 bg-fg" />
          <span>{label}</span>
          <span className="pl-notation-line h-px flex-1 bg-fg" />
        </>
      )}
    </div>
  );
}

/** Fila de 40 puntos (solo escritorio). */
export function DotRow() {
  return (
    <div aria-hidden className="hidden gap-1 opacity-40 lg:flex">
      {Array.from({ length: 40 }).map((_, i) => (
        <span key={i} className="h-0.5 w-0.5 rounded-full bg-fg" />
      ))}
    </div>
  );
}

/** Mira técnica: cuadrado con punto central (solo escritorio). */
export function Crosshair({ className = '' }: { className?: string }) {
  return (
    <span aria-hidden className={`hidden h-3 w-3 border border-fg opacity-30 lg:block ${className}`}>
      <span className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 bg-fg" />
    </span>
  );
}

/** Franja inferior de estado del sistema. */
export function SystemStrip() {
  return (
    <div aria-hidden className="border-t border-line/70 bg-bg/40 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2 font-mono text-[8px] text-fg/50 sm:px-6 lg:py-3 lg:text-[9px]">
        <div className="flex items-center gap-3 lg:gap-6">
          <span className="hidden lg:inline">SYSTEM.ACTIVE</span>
          <span className="lg:hidden">SYS.ACT</span>
          <div className="hidden h-4 items-end gap-1 lg:flex">
            {BAR_HEIGHTS.map((h, i) => (
              <span
                key={i}
                className="pl-eq-bar w-1 bg-fg/30"
                style={{ height: `${h}px`, ['--pl-delay' as string]: `${i * 90}ms` }}
              />
            ))}
          </div>
          <span>V1.0.0</span>
        </div>
        <div className="flex items-center gap-2 lg:gap-4">
          <span className="hidden lg:inline">◐ RENDERING</span>
          <div className="flex gap-1">
            <span className="h-1 w-1 animate-pulse rounded-full bg-fg/60" />
            <span className="h-1 w-1 animate-pulse rounded-full bg-fg/40 [animation-delay:0.2s]" />
            <span className="h-1 w-1 animate-pulse rounded-full bg-fg/20 [animation-delay:0.4s]" />
          </div>
          <span className="hidden lg:inline">FRAME: ∞</span>
        </div>
      </div>
    </div>
  );
}
