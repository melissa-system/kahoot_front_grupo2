import { useState, type CSSProperties } from 'react';
import greeting from '../../assets/brand/pl-greeting.png';
import { cn } from '../../lib/cn';

/*
 * Búho de ProfeLink en la pose del Hombre de Vitruvio.
 *
 * Reproduce el spritesheet public/images/vitruvian-owl-spritesheet.jpg
 * (4 columnas x 2 filas, fotogramas de 450x672). La animación vive en
 * src/index.css (clases pl-owl-*): dos capas con la misma hoja; cada capa
 * salta de fotograma mientras la otra la cubre, y un fundido cruzado entre
 * ambas evita el corte seco entre cuadros. Secuencia (ping-pong):
 * f8 -> f5 -> f6 -> f7 -> f6 -> f5 -> f8 (alas horizontales -> elevadas -> vuelta).
 * Solo se usan f5-f8 porque comparten la misma geometría y posición del cuerpo;
 * f1-f4 tienen el círculo desplazado y f1 no tiene patas.
 */

const SHEET = '/images/vitruvian-owl-spritesheet.jpg';

/**
 * Proporción visible. El fotograma original es 600x896 pero tiene fondo vacío
 * arriba y abajo; se recorta 9 % superior y 14 % inferior (ver .pl-owl-stage),
 * dejando 77 % del alto: 896 * 0.77 = 690.
 */
export const OWL_FRAME_ASPECT = '600 / 690';

export function VitruvianOwl({ className, style }: { className?: string; style?: CSSProperties }) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      role="img"
      aria-label="Búho de ProfeLink en la pose del Hombre de Vitruvio"
      // Mismo color que el navbar (--pl-header oscuro). En tema claro el header es
      // blanco y el trazo del búho también, así que se mantiene el tono oscuro.
      className={cn('pl-owl relative overflow-hidden bg-[#131a2b] dark:bg-header', className)}
      style={{ aspectRatio: OWL_FRAME_ASPECT, ...style }}
    >
      {failed ? (
        <img src={greeting} alt="" className="h-full w-full object-contain" draggable={false} />
      ) : (
        <div className="pl-owl-stage">
          <img
            src={SHEET}
            alt=""
            className="pl-owl-layer pl-owl-layer-a"
            draggable={false}
            decoding="async"
            onError={() => setFailed(true)}
          />
          <img src={SHEET} alt="" aria-hidden className="pl-owl-layer pl-owl-layer-b" draggable={false} decoding="async" />
        </div>
      )}
    </div>
  );
}
