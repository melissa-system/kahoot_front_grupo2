import { describe, expect, it } from 'vitest';
import { insertTextAtSelection } from './insertAtCursor';

describe('insertTextAtSelection', () => {
  it('inserta en el cursor y respeta el máximo', () => {
    expect(insertTextAtSelection('x^', '²', 2, 2)).toEqual({ value: 'x^²', caret: 3 });
    expect(insertTextAtSelection('ab', 'π', 1, 1)).toEqual({ value: 'aπb', caret: 2 });
    expect(insertTextAtSelection('π', 'α', 1, 1, 1)).toEqual({ value: 'π', caret: 1 });
  });
});
