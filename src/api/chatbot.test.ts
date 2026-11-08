import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApi } from './client';
import { HttpClient } from '../lib/http';
import { db, resetMockDb, tokenFor } from './mock/mockDb';
import { mockTransport } from './mock/mockTransport';
import { mockChat } from './mock/mockChatbot';

describe('Contrato de chatbot y lote', () => {
  beforeEach(() => { localStorage.clear(); resetMockDb(); });

  it('usa las rutas de backend y el token sin llamada directa a DeepSeek', async () => {
    const transport = vi.fn().mockResolvedValue({ reply: 'Hola', draft: null });
    const api = createApi(new HttpClient({ transport, getToken: async () => 'jwt-test' }));
    await api.chatbot.respond('quiz', { messages: [{ role: 'user', content: 'Hola' }] });
    expect(transport).toHaveBeenCalledWith({ method: 'POST', path: '/quizzes/quiz/chat', body: { messages: [{ role: 'user', content: 'Hola' }] }, token: 'jwt-test' });
    await api.questions.createBatch('quiz', { operationId: 'id', questions: [] });
    expect(transport.mock.calls[1][0].path).toBe('/quizzes/quiz/questions/batch');
  });

  it('simula una ampliación sin reemplazar las correcciones ni superar 30 preguntas', () => {
    const original = [{ statement: 'Corrección humana', correctBoolean: false }];
    const response = mockChat({ messages: [{ role: 'user', content: 'Agrega 2 países más' }], currentDraft: { questions: original } });
    expect(response.draft?.questions).toHaveLength(3);
    expect(response.draft?.questions[0]).toEqual(original[0]);
    expect(response.reply).toContain('Modo simulado');
    const tooMany = mockChat({ messages: [{ role: 'user', content: 'Agrega 2 países más' }], currentDraft: { questions: Array.from({ length: 29 }, () => original[0]) } });
    expect(tooMany.draft).toBeNull();
    expect(tooMany.reply).toContain('30');
  });

  it('el mock prepara sin persistir y confirma idempotentemente sin romper creación individual', async () => {
    const teacher = db().users.find((u) => u.role === 'teacher')!;
    const quiz = db().quizzes[0];
    const api = createApi(new HttpClient({ transport: mockTransport, getToken: async () => tokenFor(teacher.id) }));
    const before = db().questions.length;
    const answer = await api.chatbot.respond(quiz.id, { messages: [{ role: 'user', content: 'Dos preguntas de ciencias' }], requestedCount: 2 });
    expect(db().questions).toHaveLength(before);
    const input = { operationId: crypto.randomUUID(), questions: answer.draft!.questions };
    const receipt = await api.questions.createBatch(quiz.id, input);
    expect(await api.questions.createBatch(quiz.id, input)).toEqual(receipt);
    expect(db().questions).toHaveLength(before + 2);
    await expect(api.questions.createBatch(quiz.id, { ...input, questions: [input.questions[0]] })).rejects.toMatchObject({ status: 409 });
    await api.questions.create(quiz.id, { statement: 'Pregunta manual posterior', correctBoolean: false });
    expect(db().questions).toHaveLength(before + 3);
    const student = db().users.find((u) => u.role === 'student')!;
    const other = createApi(new HttpClient({ transport: mockTransport, getToken: async () => tokenFor(student.id) }));
    await expect(other.chatbot.respond(quiz.id, { messages: [{ role: 'user', content: 'Hola' }] })).rejects.toMatchObject({ status: 403 });
  });
});
