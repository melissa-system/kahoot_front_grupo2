import { ApiError, toApiError, type HttpTransport } from '../../lib/http';
import { IMAGE_RULES, QUESTION_DURATION, REVIEW_DURATION, type Question } from '../types';
import { db, delay, save, userFromToken, uuid } from './mockDb';
import { MockSessionError, mockGame, statusForSessionError } from './mockGame';
import { mockChat, mockQuestionBatch } from './mockChatbot';
import type { QuizChatRequest } from '../chatbot.types';

const fail = (status: number, message: string, code?: string): never => {
  throw toApiError(status, { statusCode: status, message, ...(code ? { code } : {}) });
};

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function detectType(file: File): Promise<string | null> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  const ascii = String.fromCharCode(...bytes);
  if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP') return 'image/webp';
  return null;
}

function validateQuiz(body: Record<string, unknown>, partial: boolean) {
  const title = typeof body.title === 'string' ? body.title.trim() : undefined;
  if (!partial || body.title !== undefined) {
    if (!title || title.length < 3 || title.length > 120) fail(400, 'El título debe tener entre 3 y 120 caracteres');
  }
  const description = typeof body.description === 'string' ? body.description.trim() : undefined;
  if (description && description.length > 500) fail(400, 'La descripción admite máximo 500 caracteres');
  return { title, description };
}

function validateQuestion(body: Record<string, unknown>, partial: boolean) {
  const statement = typeof body.statement === 'string' ? body.statement.trim() : undefined;
  if (!partial || body.statement !== undefined) {
    if (!statement || statement.length > 500) fail(400, 'El enunciado debe tener entre 1 y 500 caracteres');
  }
  if ((!partial || body.correctBoolean !== undefined) && typeof body.correctBoolean !== 'boolean')
    fail(400, 'correctBoolean must be a boolean value');
  return { statement, correctBoolean: body.correctBoolean as boolean | undefined, position: body.position as number | undefined };
}

function reorder(quizId: string) {
  db()
    .questions.filter((q) => q.quizId === quizId)
    .sort((a, b) => a.position - b.position)
    .forEach((q, i) => (q.position = i));
}

/** Imita las rutas REST de Back-Proyecto2 con las mismas reglas y errores. */
export const mockTransport: HttpTransport = async ({ method, path, body, token }) => {
  await delay();
  const user = userFromToken(token);
  if (!user) fail(401, 'Unauthorized');
  const me = user!;
  const data = db();
  const b = (body ?? {}) as Record<string, unknown>;
  const now = new Date().toISOString();
  const seg = path.split('?')[0].split('/').filter(Boolean);

  const ownQuiz = (id: string) => {
    const quiz = data.quizzes.find((q) => q.id === id);
    if (!quiz || quiz.ownerId !== me.id) fail(404, 'Cuestionario no encontrado');
    return quiz!;
  };
  const ownQuestion = (id: string): Question => {
    const question = data.questions.find((q) => q.id === id);
    if (!question) fail(404, 'Pregunta no encontrada');
    const quiz = data.quizzes.find((q) => q.id === question!.quizId);
    if (quiz?.ownerId !== me.id) fail(403, 'La pregunta pertenece a otro usuario');
    return question!;
  };

  // /profiles/me
  if (seg[0] === 'profiles' && seg[1] === 'me') {
    let profile = data.profiles.find((p) => p.userId === me.id);
    if (!profile) {
      profile = { userId: me.id, displayName: me.displayName, role: me.role ?? 'student', createdAt: now, updatedAt: now };
      data.profiles.push(profile);
    }
    if (method === 'PATCH') {
      const name = typeof b.displayName === 'string' ? b.displayName.trim() : '';
      if (name.length < 2 || name.length > 40) fail(400, 'El nombre debe tener entre 2 y 40 caracteres');
      profile.displayName = name;
      profile.updatedAt = now;
      me.displayName = name;
      save();
    }
    return { ...profile };
  }

  // /quizzes
  if (seg[0] === 'quizzes' && seg.length === 1) {
    if (method === 'GET')
      return data.quizzes
        .filter((q) => q.ownerId === me.id)
        .sort((a, b2) => b2.updatedAt.localeCompare(a.updatedAt))
        .map((q) => ({ ...q, questionsCount: data.questions.filter((x) => x.quizId === q.id).length }));
    if (method === 'POST') {
      const profile = data.profiles.find((p) => p.userId === me.id);
      if ((profile?.role ?? me.role) !== 'teacher') fail(403, 'Solo el profesor puede crear y dirigir cuestionarios');
      const { title, description } = validateQuiz(b, false);
      const quiz = { id: uuid(), ownerId: me.id, title: title!, description: description || null, createdAt: now, updatedAt: now };
      data.quizzes.push(quiz);
      save();
      return quiz;
    }
  }

  // /quizzes/:id y /quizzes/:id/questions
  if (seg[0] === 'quizzes' && seg.length >= 2) {
    const isChat = seg.length === 3 && seg[2] === 'chat';
    const isBatch = seg.length === 4 && seg[2] === 'questions' && seg[3] === 'batch';
    if (isChat || isBatch) {
      if (method !== 'POST') fail(404, 'Ruta no encontrada');
      const profile = data.profiles.find((p) => p.userId === me.id);
      if ((profile?.role ?? me.role) !== 'teacher') fail(403, 'Solo el profesor puede preparar cuestionarios');
      const owned = ownQuiz(seg[1]);
      return isChat ? mockChat(b as unknown as QuizChatRequest) : mockQuestionBatch(me.id, owned.id, b);
    }
    const quiz = ownQuiz(seg[1]);
    if (seg.length === 3 && seg[2] === 'questions' && method === 'POST') {
      const { statement, correctBoolean, position } = validateQuestion(b, false);
      const siblings = data.questions.filter((q) => q.quizId === quiz.id);
      const question: Question = {
        id: uuid(),
        quizId: quiz.id,
        statement: statement!,
        correctBoolean: correctBoolean!,
        imageKey: null,
        imageUrl: null,
        position: position ?? siblings.length,
      };
      siblings.filter((q) => q.position >= question.position).forEach((q) => (q.position += 1));
      data.questions.push(question);
      reorder(quiz.id);
      quiz.updatedAt = now;
      save();
      return question;
    }
    if (method === 'GET')
      return {
        ...quiz,
        questions: data.questions.filter((q) => q.quizId === quiz.id).sort((a, b2) => a.position - b2.position),
      };
    if (method === 'PATCH') {
      const { title, description } = validateQuiz(b, true);
      if (title !== undefined) quiz.title = title;
      if (b.description !== undefined) quiz.description = description || null;
      quiz.updatedAt = now;
      save();
      return { ...quiz };
    }
    if (method === 'DELETE') {
      data.quizzes = data.quizzes.filter((q) => q.id !== quiz.id);
      data.questions = data.questions.filter((q) => q.quizId !== quiz.id);
      save();
      return undefined;
    }
  }

  // /questions/:id(/image)
  if (seg[0] === 'questions' && seg[1]) {
    const question = ownQuestion(seg[1]);
    if (seg[2] === 'image') {
      if (method === 'PUT') {
        const file = body instanceof FormData ? body.get('file') : null;
        if (!(file instanceof File)) fail(400, 'Debes adjuntar un archivo');
        const f = file as File;
        if (f.size === 0) fail(400, 'El archivo está vacío');
        if (f.size > IMAGE_RULES.maxBytes) fail(413, 'La imagen supera el máximo de 2 MB');
        if (!(IMAGE_RULES.types as readonly string[]).includes(f.type)) fail(400, 'Formato no permitido. Usa JPG, PNG o WebP');
        const detected = await detectType(f);
        if (!detected) fail(400, 'El archivo no es una imagen válida');
        if (detected !== f.type) fail(400, 'El contenido del archivo no coincide con el formato declarado');
        question.imageKey = `mock/${question.id}`;
        question.imageUrl = await readDataUrl(f);
        save();
        return { id: question.id, imageKey: question.imageKey, imageUrl: question.imageUrl };
      }
      if (method === 'DELETE') {
        question.imageKey = null;
        question.imageUrl = null;
        save();
        return undefined;
      }
    }
    if (method === 'PATCH') {
      const { statement, correctBoolean, position } = validateQuestion(b, true);
      if (statement !== undefined) question.statement = statement;
      if (correctBoolean !== undefined) question.correctBoolean = correctBoolean;
      if (position !== undefined) {
        const siblings = data.questions.filter((q) => q.quizId === question.quizId && q.id !== question.id);
        siblings.sort((a, b2) => a.position - b2.position);
        siblings.splice(Math.min(position, siblings.length), 0, question);
        siblings.forEach((q, i) => (q.position = i));
      }
      save();
      return { ...question };
    }
    if (method === 'DELETE') {
      data.questions = data.questions.filter((q) => q.id !== question.id);
      reorder(question.quizId);
      save();
      return undefined;
    }
  }

  // /sessions
  if (seg[0] === 'sessions') {
    if (method === 'POST' && seg.length === 1) {
      const quizId = String(b.quizId ?? '');
      const quiz = data.quizzes.find((q) => q.id === quizId && q.ownerId === me.id);
      if (!quiz) fail(404, 'Cuestionario no encontrado', 'QUIZ_NOT_FOUND');
      const q = Number(b.questionDurationSeconds ?? QUESTION_DURATION.default);
      const r = Number(b.reviewDurationSeconds ?? REVIEW_DURATION.default);
      if (q < QUESTION_DURATION.min || q > QUESTION_DURATION.max || r < REVIEW_DURATION.min || r > REVIEW_DURATION.max)
        fail(400, 'Los datos de la solicitud no son válidos', 'VALIDATION_ERROR');
      const questions = data.questions.filter((x) => x.quizId === quiz!.id).sort((a, b2) => a.position - b2.position);
      return mockGame.create(me.id, quiz!.title, questions, q, r);
    }
    if (method === 'POST' && seg[1] === 'join') {
      try {
        return mockGame.join(String(b.code ?? ''), { id: me.id, displayName: me.displayName });
      } catch (error) {
        if (error instanceof MockSessionError) fail(statusForSessionError(error.code), error.message, error.code);
        throw error;
      }
    }
    if (method === 'DELETE' && seg[2] === 'participants' && seg[3] === 'me') {
      try {
        mockGame.leave(seg[1], me.id);
        return undefined;
      } catch (error) {
        if (error instanceof MockSessionError) fail(statusForSessionError(error.code), error.message, error.code);
        throw error;
      }
    }
    if (method === 'GET' && seg[1] === 'history' && seg.length === 2) return mockGame.history(me.id);
    if (method === 'GET' && seg[1] === 'played' && seg.length === 2) return mockGame.played(me.id);
    if (method === 'GET' && seg[2] === 'state') return mockGame.stateByCode(seg[1], me.id);
    if (method === 'GET' && seg.length === 2) return mockGame.state(seg[1], me.id);
  }

  throw new ApiError(404, 'NOT_FOUND', `Ruta simulada no implementada: ${method} ${path}`);
};
