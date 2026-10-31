import { IMAGE_RULES } from '../api/types';

/**
 * Validación previa en el navegador (solo para avisar rápido). El backend
 * vuelve a validar formato real y tamaño: React nunca es la autoridad.
 */
export function validateImageFile(file: File): string | null {
  if (!(IMAGE_RULES.types as readonly string[]).includes(file.type)) return 'Formato no permitido. Usa JPG, PNG o WebP.';
  if (file.size === 0) return 'El archivo está vacío.';
  if (file.size > IMAGE_RULES.maxBytes) return `La imagen pesa ${(file.size / 1024 / 1024).toFixed(1)} MB; el máximo es 2 MB.`;
  return null;
}
