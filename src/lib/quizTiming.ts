import { QUESTION_DURATION, REVIEW_DURATION } from '../api/types';

export interface QuizTiming {
  questionDurationSeconds: number;
  reviewDurationSeconds: number;
}

const KEY = (quizId: string) => `profelink.quizTiming:${quizId}`;

export const DEFAULT_QUIZ_TIMING: QuizTiming = {
  questionDurationSeconds: QUESTION_DURATION.default,
  reviewDurationSeconds: REVIEW_DURATION.default,
};

function clamp(value: unknown, min: number, max: number, fallback: number) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) return fallback;
  return n;
}

export function loadQuizTiming(quizId: string): QuizTiming {
  try {
    const raw = localStorage.getItem(KEY(quizId));
    if (!raw) return { ...DEFAULT_QUIZ_TIMING };
    const parsed = JSON.parse(raw) as Partial<QuizTiming>;
    return {
      questionDurationSeconds: clamp(
        parsed.questionDurationSeconds,
        QUESTION_DURATION.min,
        QUESTION_DURATION.max,
        QUESTION_DURATION.default,
      ),
      reviewDurationSeconds: clamp(
        parsed.reviewDurationSeconds,
        REVIEW_DURATION.min,
        REVIEW_DURATION.max,
        REVIEW_DURATION.default,
      ),
    };
  } catch {
    return { ...DEFAULT_QUIZ_TIMING };
  }
}

/** Segundos para contestar: el de la pregunta, o el del cuestionario. */
export function answerSecondsOf(durationSeconds: number | null | undefined, fallback: number): number {
  return durationSeconds ?? fallback;
}

export function saveQuizTiming(quizId: string, timing: QuizTiming): QuizTiming {
  const next: QuizTiming = {
    questionDurationSeconds: clamp(
      timing.questionDurationSeconds,
      QUESTION_DURATION.min,
      QUESTION_DURATION.max,
      QUESTION_DURATION.default,
    ),
    reviewDurationSeconds: clamp(
      timing.reviewDurationSeconds,
      REVIEW_DURATION.min,
      REVIEW_DURATION.max,
      REVIEW_DURATION.default,
    ),
  };
  localStorage.setItem(KEY(quizId), JSON.stringify(next));
  return next;
}
