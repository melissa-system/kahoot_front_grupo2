import { describe, expect, it } from 'vitest';
import { reorderQuestions } from './reorderQuestions';

describe('reorderQuestions', () => {
  const items = [
    { id: 'a', position: 0 },
    { id: 'b', position: 1 },
    { id: 'c', position: 2 },
  ];

  it('mueve una pregunta y renumera', () => {
    expect(reorderQuestions(items, 'c', 'a').map((item) => item.id)).toEqual(['c', 'a', 'b']);
    expect(reorderQuestions(items, 'a', 'c').map((item) => item.position)).toEqual([0, 1, 2]);
  });

  it('no cambia si el origen y el destino son iguales', () => {
    expect(reorderQuestions(items, 'b', 'b')).toEqual(items);
  });
});
