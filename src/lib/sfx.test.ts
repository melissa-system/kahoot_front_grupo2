import { describe, expect, it } from 'vitest';
import { activeQuestionBgm, isSfxMuted, playSfx, questionBgmKind, setQuestionBgm, setSfxMuted, SFX_STORAGE_KEY, toggleSfx } from './sfx';

describe('efectos de sonido', () => {
  it('empieza con sonido activo y se puede silenciar', () => {
    expect(isSfxMuted()).toBe(false);
    toggleSfx();
    expect(isSfxMuted()).toBe(true);
    expect(localStorage.getItem(SFX_STORAGE_KEY)).toBe('off');
    setSfxMuted(false);
    expect(isSfxMuted()).toBe(false);
  });

  it('playSfx no lanza aunque no haya AudioContext', () => {
    expect(() => playSfx('click')).not.toThrow();
    setSfxMuted(true);
    expect(() => playSfx('finish')).not.toThrow();
  });

  it('el loop de preguntas no lanza al activar o silenciar', () => {
    expect(() => setQuestionBgm('first')).not.toThrow();
    setSfxMuted(true);
    expect(() => setQuestionBgm('last')).not.toThrow();
    expect(() => setQuestionBgm('final')).not.toThrow();
    setQuestionBgm(null);
  });

  it('usa pistas distintas para el inicio, las últimas 3 y la pregunta final', () => {
    expect(questionBgmKind(0, 10)).toBe('first');
    expect(questionBgmKind(6, 10)).toBe('first');
    expect(questionBgmKind(7, 10)).toBe('last');
    expect(questionBgmKind(8, 10)).toBe('last');
    expect(questionBgmKind(9, 10)).toBe('final');
    expect(questionBgmKind(0, 3)).toBe('last');
    expect(questionBgmKind(2, 3)).toBe('final');
    expect(questionBgmKind(0, 1)).toBe('final');
    expect(questionBgmKind(-1, 8)).toBe(null);
  });

  it('calla la música al revelar y la reanuda en la siguiente pregunta abierta', () => {
    expect(
      activeQuestionBgm({ inProgress: true, questionOpen: true, currentIndex: 0, questionsCount: 10 }),
    ).toBe('first');
    expect(
      activeQuestionBgm({ inProgress: true, questionOpen: false, currentIndex: 0, questionsCount: 10 }),
    ).toBe(null);
    expect(
      activeQuestionBgm({ inProgress: true, questionOpen: true, currentIndex: 1, questionsCount: 10 }),
    ).toBe('first');
  });
});
