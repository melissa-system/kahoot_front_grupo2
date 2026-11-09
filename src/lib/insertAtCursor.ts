/** Inserta texto en la selección de un input o textarea, respetando el máximo. */
export function insertTextAtSelection(
  value: string,
  insert: string,
  start: number,
  end: number,
  maxLength?: number,
): { value: string; caret: number } {
  const from = Math.max(0, Math.min(start, value.length));
  const to = Math.max(from, Math.min(end, value.length));
  const next = value.slice(0, from) + insert + value.slice(to);
  if (maxLength != null && next.length > maxLength) return { value, caret: from };
  return { value: next, caret: from + insert.length };
}
