import type { DraftQuestion, QuestionBatchReceipt, QuizChatRequest, QuizChatResponse } from '../chatbot.types';
import type { Question } from '../types';
import { ApiError } from '../../lib/http';
import { isDraftQuestion, toDraftPayload } from '../../lib/draftQuestion';
import { db, save, uuid } from './mockDb';

const fail = (status: number, message: string): never => { throw new ApiError(status, status === 409 ? 'OPERATION_CONFLICT' : 'VALIDATION_ERROR', message); };
const EXAMPLES = [
  ['El Sol es una estrella.', true], ['La Tierra es plana.', false],
  ['Las plantas necesitan agua para vivir.', true], ['Todos los animales son mamíferos.', false],
  ['Un triángulo tiene tres lados.', true], ['Dos más dos es igual a cinco.', false],
] as const;

const MULTIPLE_EXAMPLES: DraftQuestion[] = [
  {
    statement: '¿Cuál es un planeta del sistema solar?',
    kind: 'multiple',
    options: ['Tierra', 'Plutón como estrella', 'La Luna', 'Un cometa de nieve eterna'],
    correctIndexes: [0],
  },
  {
    statement: '¿Qué gas necesitan las plantas para la fotosíntesis?',
    kind: 'multiple',
    options: ['Dióxido de carbono', 'Helio', 'Ozono', 'Nitrógeno puro'],
    correctIndexes: [0],
  },
  {
    statement: '¿Cuántos lados tiene un triángulo?',
    kind: 'multiple',
    options: ['Tres', 'Cuatro', 'Cinco', 'Seis'],
    correctIndexes: [0],
  },
  {
    statement: '¿Cuál es un paradigma declarativo?',
    kind: 'multiple',
    options: ['Imperativo', 'Funcional', 'Ensamblador', 'Máquina'],
    correctIndexes: [1],
  },
];

function wantsMultiple(text: string) {
  return /4 opciones|cuatro opciones|opci[oó]n m[uú]ltiple|selecci[oó]n m[uú]ltiple|multiple choice|tipo test|preguntas de opciones/i.test(
    text,
  );
}

function exampleQuestion(index: number, multiple: boolean, statement?: string): DraftQuestion {
  if (multiple) {
    const item = MULTIPLE_EXAMPLES[index % MULTIPLE_EXAMPLES.length];
    return {
      ...item,
      statement: statement?.slice(0, 500) || `Ejemplo simulado ${index + 1}: ${item.statement}`,
    };
  }
  const [fallback, correctBoolean] = EXAMPLES[index % EXAMPLES.length];
  return { statement: statement?.slice(0, 500) || `Ejemplo simulado ${index + 1}: ${fallback}`, correctBoolean };
}

/** Mock explícito: nunca se llama como fallback de un error real. */
export function mockChat(input: QuizChatRequest): QuizChatResponse {
  if (!Array.isArray(input.messages) || !input.messages.length || input.messages.length > 40 || input.messages.some((m) => !['user', 'assistant'].includes(m.role) || typeof m.content !== 'string' || !m.content.trim() || m.content.length > 2000) || input.messages.at(-1)?.role !== 'user') return fail(400, 'Mensajes inválidos.');
  if (input.requestedCount !== undefined && (!Number.isInteger(input.requestedCount) || input.requestedCount < 1 || input.requestedCount > 30)) return fail(400, 'Cantidad inválida.');
  const text = input.messages.at(-1)!.content;
  const list = text.split('\n').map((line) => line.replace(/^\s*(?:\d+[.)]|[-*])\s*/, '').trim()).filter(Boolean);
  const count = input.requestedCount ?? Number(text.match(/\b(\d+)\s+preguntas?\b/i)?.[1] ?? 0);
  const extra = Number(text.match(/(?:agrega(?:r)?|añade|añadir|incluye|incluir|suma)\s+(\d+)\s+(?:preguntas?|pa[ií]ses|afirmaciones?)/i)?.[1] ?? 0);
  if (input.currentDraft && extra && input.requestedCount === undefined) {
    const retained = input.currentDraft.questions;
    if (retained.length + extra > 30) return { reply: 'La propuesta completa superaría 30 preguntas. Indica cuáles quieres conservar antes de ampliarla.', draft: null };
    const multiple = wantsMultiple(text);
    const added = Array.from({ length: extra }, (_, index) =>
      exampleQuestion(retained.length + index, multiple),
    );
    return { reply: `Modo simulado: añadí ${extra} ejemplos al borrador; conserva tus correcciones. Sin IA ni guardado.`, draft: { questions: [...retained, ...added] } };
  }
  if (count > 30) return { reply: 'Puedes preparar hasta 30 preguntas por propuesta. ¿Cuántas necesitas?', draft: null };
  if (input.currentDraft && !count && list.length < 2) return { reply: 'Modo simulado: conservé tu propuesta editada para revisar. En modo real, DeepSeek aplicará los ajustes solicitados.', draft: input.currentDraft };
  if (!count && list.length < 2) return { reply: '¿Cuántas preguntas necesitas y sobre qué tema? Puedes pedir verdadero/falso o 4 opciones.', draft: null };
  const multiple = wantsMultiple(text);
  const questions = Array.from({ length: count || Math.min(list.length, 30) }, (_, i) =>
    exampleQuestion(i, multiple, list.length > 1 ? list[i % list.length] : undefined),
  );
  return { reply: 'Propuesta de demostración, sin IA: revisa y corrige todas las respuestas antes de agregarla.', draft: { questions } };
}

interface StoredBatch { payload: string; receipt: QuestionBatchReceipt }
const KEY = 'profelink-mock-question-batches';

export function mockQuestionBatch(userId: string, quizId: string, body: unknown): QuestionBatchReceipt {
  const input = body as { operationId?: unknown; questions?: unknown };
  if (!input || typeof input.operationId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.operationId) || !Array.isArray(input.questions) || input.questions.length < 1 || input.questions.length > 30) return fail(400, 'Lote inválido.');
  const questions = input.questions.map((item: unknown) => {
    if (!isDraftQuestion(item) || Object.keys(item as object).some((key) => !['statement', 'correctBoolean', 'kind', 'options', 'correctIndexes'].includes(key))) return fail(400, 'Pregunta inválida.');
    return toDraftPayload(item);
  });
  let operations: Record<string, StoredBatch> = {};
  try { operations = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, StoredBatch>; } catch { /* almacenamiento vacío */ }
  const key = `${userId}:${quizId}:${input.operationId}`;
  const payload = JSON.stringify(questions);
  const prior = operations[key];
  if (prior) { if (prior.payload !== payload) return fail(409, 'Este identificador corresponde a otro lote.'); return prior.receipt; }
  const data = db();
  const offset = data.questions.filter((q) => q.quizId === quizId).length;
  const created: Question[] = questions.map((q, index) => ({
    statement: q.statement,
    kind: q.kind === 'multiple' ? 'multiple' : 'boolean',
    correctBoolean: q.kind === 'multiple' ? false : Boolean(q.correctBoolean),
    options: q.kind === 'multiple' ? (q.options ?? null) : null,
    correctIndexes: q.kind === 'multiple' ? (q.correctIndexes ?? null) : null,
    id: uuid(),
    quizId,
    position: offset + index,
    imageKey: null,
    imageUrl: null,
    durationSeconds: null,
  }));
  const receipt = { operationId: input.operationId, questions: created };
  data.questions.push(...created);
  const quiz = data.quizzes.find((q) => q.id === quizId)!;
  quiz.updatedAt = new Date().toISOString();
  operations[key] = { payload, receipt };
  save();
  try { localStorage.setItem(KEY, JSON.stringify(operations)); } catch { /* mock sin almacenamiento disponible */ }
  return receipt;
}
