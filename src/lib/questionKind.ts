import type { QuestionKind } from '../api/types';

export const MULTIPLE_OPTION_COUNT = 4;
export const OPTION_MAX_LENGTH = 80;

export const MULTIPLE_OPTION_TONES = [
  {
    key: 'A',
    className: 'bg-red-500 text-white shadow-lg shadow-red-500/30',
    editor: 'border-red-500/80 bg-red-500/20',
    editorSelected: 'border-red-400 bg-red-500/40 ring-2 ring-red-400 shadow-lg shadow-red-500/25',
    badge: 'bg-red-500 text-white',
  },
  {
    key: 'B',
    className: 'bg-blue-500 text-white shadow-lg shadow-blue-500/30',
    editor: 'border-blue-500/80 bg-blue-500/20',
    editorSelected: 'border-blue-400 bg-blue-500/40 ring-2 ring-blue-400 shadow-lg shadow-blue-500/25',
    badge: 'bg-blue-500 text-white',
  },
  {
    key: 'C',
    className: 'bg-amber-400 text-slate-900 shadow-lg shadow-amber-400/30',
    editor: 'border-amber-400/90 bg-amber-400/20',
    editorSelected: 'border-amber-300 bg-amber-400/40 ring-2 ring-amber-300 shadow-lg shadow-amber-400/25',
    badge: 'bg-amber-400 text-slate-900',
  },
  {
    key: 'D',
    className: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30',
    editor: 'border-emerald-500/80 bg-emerald-500/20',
    editorSelected: 'border-emerald-400 bg-emerald-500/40 ring-2 ring-emerald-400 shadow-lg shadow-emerald-500/25',
    badge: 'bg-emerald-500 text-white',
  },
] as const;

export function questionKindOf(value: { kind?: QuestionKind | null } | null | undefined): QuestionKind {
  return value?.kind === 'multiple' ? 'multiple' : 'boolean';
}

export function correctIndexesOf(question: {
  correctIndexes?: number[] | null;
}): number[] {
  return Array.isArray(question.correctIndexes) ? question.correctIndexes : [];
}

export function isCorrectChoice(
  question: {
    kind?: QuestionKind | null;
    correctBoolean?: boolean;
    correctIndexes?: number[] | null;
  },
  choice: boolean | number | null | undefined,
): boolean {
  if (choice == null) return false;
  if (questionKindOf(question) === 'multiple') {
    return typeof choice === 'number' && correctIndexesOf(question).includes(choice);
  }
  return choice === question.correctBoolean;
}

export function choiceLabel(
  question: { kind?: QuestionKind | null; options?: string[] | null; correctBoolean?: boolean },
  choice: boolean | number | null | undefined,
): string {
  if (choice == null) return 'Sin respuesta';
  if (questionKindOf(question) === 'multiple' && typeof choice === 'number') {
    return question.options?.[choice] ?? `Opción ${choice + 1}`;
  }
  return choice ? 'Verdadero' : 'Falso';
}

export function correctLabel(question: {
  kind?: QuestionKind | null;
  options?: string[] | null;
  correctBoolean?: boolean;
  correctIndexes?: number[] | null;
}): string {
  if (questionKindOf(question) === 'multiple') {
    const labels = correctIndexesOf(question).map(
      (index) => question.options?.[index] ?? `Opción ${index + 1}`,
    );
    return labels.join(' · ') || 'Opción correcta';
  }
  return question.correctBoolean ? 'Verdadero' : 'Falso';
}
