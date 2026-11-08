import type { QuestionBatchReceipt, QuizChatRequest, QuizChatResponse } from '../chatbot.types';
import type { Question } from '../types';
import { ApiError } from '../../lib/http';
import { db, save, uuid } from './mockDb';

const fail = (status: number, message: string): never => { throw new ApiError(status, status === 409 ? 'OPERATION_CONFLICT' : 'VALIDATION_ERROR', message); };
const EXAMPLES = [
  ['El Sol es una estrella.', true], ['La Tierra es plana.', false],
  ['Las plantas necesitan agua para vivir.', true], ['Todos los animales son mamíferos.', false],
  ['Un triángulo tiene tres lados.', true], ['Dos más dos es igual a cinco.', false],
] as const;

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
    const added = Array.from({ length: extra }, (_, index) => {
      const [statement, correctBoolean] = EXAMPLES[(retained.length + index) % EXAMPLES.length];
      return { statement: `Ejemplo simulado ${retained.length + index + 1}: ${statement}`, correctBoolean };
    });
    return { reply: `Modo simulado: añadí ${extra} ejemplos al borrador; conserva tus correcciones. Sin IA ni guardado.`, draft: { questions: [...retained, ...added] } };
  }
  if (count > 30) return { reply: 'Puedes preparar hasta 30 preguntas por propuesta. ¿Cuántas necesitas?', draft: null };
  if (input.currentDraft && !count && list.length < 2) return { reply: 'Modo simulado: conservé tu propuesta editada para revisar. En modo real, DeepSeek aplicará los ajustes solicitados.', draft: input.currentDraft };
  if (!count && list.length < 2) return { reply: '¿Cuántas preguntas necesitas y sobre qué tema? También puedes pegar una lista de afirmaciones.', draft: null };
  const questions = Array.from({ length: count || Math.min(list.length, 30) }, (_, i) => {
    const [statement, correctBoolean] = EXAMPLES[i % EXAMPLES.length];
    return { statement: list.length > 1 ? list[i % list.length].slice(0, 500) : `Ejemplo simulado ${i + 1}: ${statement}`, correctBoolean };
  });
  return { reply: 'Propuesta de demostración, sin IA: revisa y corrige todas las respuestas antes de agregarla.', draft: { questions } };
}

interface StoredBatch { payload: string; receipt: QuestionBatchReceipt }
const KEY = 'profelink-mock-question-batches';

export function mockQuestionBatch(userId: string, quizId: string, body: unknown): QuestionBatchReceipt {
  const input = body as { operationId?: unknown; questions?: unknown };
  if (!input || typeof input.operationId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.operationId) || !Array.isArray(input.questions) || input.questions.length < 1 || input.questions.length > 30) return fail(400, 'Lote inválido.');
  const questions = input.questions.map((item: unknown) => {
    const q = item as { statement?: unknown; correctBoolean?: unknown };
    if (!q || Object.keys(q).some((key) => !['statement', 'correctBoolean'].includes(key)) || typeof q.statement !== 'string' || !q.statement.trim() || q.statement.trim().length > 500 || typeof q.correctBoolean !== 'boolean') return fail(400, 'Pregunta inválida.');
    return { statement: q.statement.trim(), correctBoolean: q.correctBoolean };
  });
  let operations: Record<string, StoredBatch> = {};
  try { operations = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, StoredBatch>; } catch { /* almacenamiento vacío */ }
  const key = `${userId}:${quizId}:${input.operationId}`;
  const payload = JSON.stringify(questions);
  const prior = operations[key];
  if (prior) { if (prior.payload !== payload) return fail(409, 'Este identificador corresponde a otro lote.'); return prior.receipt; }
  const data = db();
  const offset = data.questions.filter((q) => q.quizId === quizId).length;
  const created: Question[] = questions.map((q, index) => ({ ...q, id: uuid(), quizId, position: offset + index, imageKey: null, imageUrl: null }));
  const receipt = { operationId: input.operationId, questions: created };
  data.questions.push(...created);
  const quiz = data.quizzes.find((q) => q.id === quizId)!;
  quiz.updatedAt = new Date().toISOString();
  operations[key] = { payload, receipt };
  save();
  try { localStorage.setItem(KEY, JSON.stringify(operations)); } catch { /* mock sin almacenamiento disponible */ }
  return receipt;
}
