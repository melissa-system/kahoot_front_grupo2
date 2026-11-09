import { describe, expect, it } from 'vitest';
import { isDraftQuestion, toDraftPayload, validateDraftQuestion } from './draftQuestion';

describe('Borradores de pregunta', () => {
  it('el verdadero/falso no envía kind ni opciones', () => {
    expect(toDraftPayload({ statement: '  El Sol es una estrella. ', correctBoolean: true })).toEqual({
      statement: 'El Sol es una estrella.',
      correctBoolean: true,
    });
  });

  it('acepta una pregunta de 4 opciones con varias correctas', () => {
    const question = {
      statement: '¿Cuáles son planetas?',
      kind: 'multiple' as const,
      options: ['Tierra', 'Marte', 'Sol', 'Luna'],
      correctIndexes: [1, 0],
    };
    expect(isDraftQuestion(question)).toBe(true);
    expect(validateDraftQuestion(question)).toBeNull();
    expect(toDraftPayload(question)).toEqual({
      statement: '¿Cuáles son planetas?',
      kind: 'multiple',
      options: ['Tierra', 'Marte', 'Sol', 'Luna'],
      correctIndexes: [0, 1],
    });
  });

  it('rechaza 4 opciones sin respuesta marcada', () => {
    expect(
      validateDraftQuestion({
        statement: '¿Dónde ocurre la fotosíntesis?',
        kind: 'multiple',
        options: ['Hojas', 'Raíz', 'Tronco', 'Flor'],
        correctIndexes: [],
      }),
    ).toBe('Marca al menos una opción correcta.');
  });
});
