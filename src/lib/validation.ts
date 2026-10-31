/** Validaciones de formulario alineadas con los DTO del backend. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(value: string): string | null {
  if (!value.trim()) return 'Escribe tu correo.';
  if (!EMAIL_RE.test(value.trim())) return 'El correo no tiene un formato válido.';
  return null;
}

export function validatePassword(value: string, isNew = false): string | null {
  if (!value) return 'Escribe tu contraseña.';
  if (isNew && value.length < 8) return 'Usa al menos 8 caracteres.';
  return null;
}

export function validateDisplayName(value: string): string | null {
  const v = value.trim();
  if (v.length < 2 || v.length > 40) return 'El nombre debe tener entre 2 y 40 caracteres.';
  return null;
}

export function validateQuizTitle(value: string): string | null {
  const v = value.trim();
  if (v.length < 3 || v.length > 120) return 'El título debe tener entre 3 y 120 caracteres.';
  return null;
}

export function validateQuizDescription(value: string): string | null {
  return value.trim().length > 500 ? 'La descripción admite máximo 500 caracteres.' : null;
}

export function validateStatement(value: string): string | null {
  const v = value.trim();
  if (!v) return 'Escribe el enunciado de la pregunta.';
  if (v.length > 500) return 'El enunciado admite máximo 500 caracteres.';
  return null;
}
