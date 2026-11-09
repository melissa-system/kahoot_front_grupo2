import { describe, expect, it } from 'vitest';
import { answerSecondsOf, DEFAULT_QUIZ_TIMING, loadQuizTiming, saveQuizTiming } from './quizTiming';

describe('tiempos de sala por cuestionario', () => {
  it('usa 30 s y 5 s si no hay nada guardado', () => {
    expect(loadQuizTiming('quiz-nuevo')).toEqual(DEFAULT_QUIZ_TIMING);
  });

  it('guarda y recupera los tiempos del cuestionario', () => {
    saveQuizTiming('quiz-a', { questionDurationSeconds: 10, reviewDurationSeconds: 8 });
    expect(loadQuizTiming('quiz-a')).toEqual({ questionDurationSeconds: 10, reviewDurationSeconds: 8 });
    expect(loadQuizTiming('quiz-b')).toEqual(DEFAULT_QUIZ_TIMING);
  });

  it('ignora valores fuera de rango', () => {
    localStorage.setItem('profelink.quizTiming:quiz-malo', JSON.stringify({ questionDurationSeconds: 2, reviewDurationSeconds: 99 }));
    expect(loadQuizTiming('quiz-malo')).toEqual(DEFAULT_QUIZ_TIMING);
  });

  it('usa el tiempo propio de la pregunta o el del cuestionario', () => {
    expect(answerSecondsOf(20, 30)).toBe(20);
    expect(answerSecondsOf(null, 30)).toBe(30);
    expect(answerSecondsOf(undefined, 10)).toBe(10);
  });
});
