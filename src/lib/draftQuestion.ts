import { MULTIPLE_OPTION_COUNT, OPTION_MAX_LENGTH } from './questionKind';
import { validateStatement } from './validation';
import type { DraftQuestion } from '../api/chatbot.types';

export function isMultipleDraft(question: DraftQuestion) {
  return question.kind === 'multiple' || (question.kind !== 'boolean' && Array.isArray(question.options));
}

export function isDraftQuestion(value: unknown): value is DraftQuestion {
  if (!value || typeof value !== 'object') return false;
  const item = value as DraftQuestion;
  if (typeof item.statement !== 'string' || !item.statement.trim() || item.statement.trim().length > 500) return false;
  if (isMultipleDraft(item)) {
    return (
      Array.isArray(item.options) &&
      item.options.length === MULTIPLE_OPTION_COUNT &&
      item.options.every((option) => typeof option === 'string' && option.trim().length >= 1 && option.trim().length <= OPTION_MAX_LENGTH) &&
      Array.isArray(item.correctIndexes) &&
      item.correctIndexes.length >= 1 &&
      item.correctIndexes.every((index) => Number.isInteger(index) && index >= 0 && index <= 3)
    );
  }
  return typeof item.correctBoolean === 'boolean';
}

export function toDraftPayload(question: DraftQuestion): DraftQuestion {
  const statement = question.statement.trim();
  if (isMultipleDraft(question)) {
    return {
      statement,
      kind: 'multiple',
      options: (question.options ?? []).map((option) => option.trim()),
      correctIndexes: [...new Set(question.correctIndexes ?? [])].sort((a, b) => a - b),
    };
  }
  return { statement, correctBoolean: question.correctBoolean === true };
}

export function validateDraftQuestion(question: DraftQuestion): string | null {
  const statementError = validateStatement(question.statement);
  if (statementError) return statementError;
  if (isMultipleDraft(question)) {
    const options = question.options ?? [];
    if (
      options.length !== MULTIPLE_OPTION_COUNT ||
      options.some((option) => !option.trim() || option.trim().length > OPTION_MAX_LENGTH)
    ) {
      return `Cada opción debe tener entre 1 y ${OPTION_MAX_LENGTH} caracteres.`;
    }
    if (!question.correctIndexes?.length) return 'Marca al menos una opción correcta.';
    return null;
  }
  if (typeof question.correctBoolean !== 'boolean') return 'Elige si la afirmación es verdadera o falsa.';
  return null;
}
