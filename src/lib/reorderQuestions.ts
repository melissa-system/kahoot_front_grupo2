/** Reordena preguntas por id y renumera position 0..n. */
export function reorderQuestions<T extends { id: string; position: number }>(
  items: T[],
  activeId: string,
  overId: string,
): T[] {
  const from = items.findIndex((item) => item.id === activeId);
  const to = items.findIndex((item) => item.id === overId);
  if (from < 0 || to < 0 || from === to) return items;
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next.map((item, position) => ({ ...item, position }));
}
