import type { HttpClient } from '../lib/http';
import type { QuestionBatchReceipt, QuestionBatchRequest, QuizChatRequest, QuizChatResponse } from './chatbot.types';
import type {
  CreateQuestionInput,
  CreateQuizInput,
  CreateSessionInput,
  JoinSessionResult,
  PlayedSessionItem,
  Profile,
  Question,
  QuestionImageResult,
  Quiz,
  QuizDetail,
  QuizSummary,
  RoomEnvelope,
  SessionHistoryItem,
  SessionState,
  UpdateQuestionInput,
  UpdateQuizInput,
} from './types';

/**
 * Funciones REST tipadas contra Back-Proyecto2. Las pantallas nunca llaman a
 * fetch directamente: siempre pasan por aquí (P4 reutiliza el mismo objeto).
 */
export function createApi(http: HttpClient) {
  return {
    chatbot: {
      respond: (quizId: string, input: QuizChatRequest) => http.post<QuizChatResponse>(`/quizzes/${quizId}/chat`, input),
    },
    profiles: {
      me: () => http.get<Profile>('/profiles/me'),
      update: (displayName: string) => http.patch<Profile>('/profiles/me', { displayName }),
    },
    quizzes: {
      list: () => http.get<QuizSummary[]>('/quizzes'),
      get: (id: string) => http.get<QuizDetail>(`/quizzes/${id}`),
      create: (input: CreateQuizInput) => http.post<Quiz>('/quizzes', input),
      update: (id: string, input: UpdateQuizInput) => http.patch<Quiz>(`/quizzes/${id}`, input),
      remove: (id: string) => http.delete(`/quizzes/${id}`),
      uploadImage: (id: string, file: File) => {
        const form = new FormData();
        form.append('file', file);
        return http.put<QuestionImageResult>(`/quizzes/${id}/image`, form);
      },
      removeImage: (id: string) => http.delete(`/quizzes/${id}/image`),
    },
    questions: {
      createBatch: (quizId: string, input: QuestionBatchRequest) => http.post<QuestionBatchReceipt>(`/quizzes/${quizId}/questions/batch`, input),
      create: (quizId: string, input: CreateQuestionInput) =>
        http.post<Question>(`/quizzes/${quizId}/questions`, input),
      update: (id: string, input: UpdateQuestionInput) => http.patch<Question>(`/questions/${id}`, input),
      remove: (id: string) => http.delete(`/questions/${id}`),
      uploadImage: (id: string, file: File) => {
        const form = new FormData();
        form.append('file', file);
        return http.put<QuestionImageResult>(`/questions/${id}/image`, form);
      },
      removeImage: (id: string) => http.delete(`/questions/${id}/image`),
    },
    sessions: {
      create: (input: CreateSessionInput) => http.post<SessionState>('/sessions', input),
      /** Partidas finalizadas del anfitrión: ganador, puntos, aciertos y errores. */
      history: () => http.get<SessionHistoryItem[]>('/sessions/history'),
      /** Partidas finalizadas en las que el usuario participó. */
      played: () => http.get<PlayedSessionItem[]>('/sessions/played'),
      get: (id: string) => http.get<SessionState>(`/sessions/${id}`),
      /** Snapshot con sobre completo (scoreboard, remainingMs). Requiere ser host o participante. */
      stateByCode: (code: string) => http.get<RoomEnvelope>(`/sessions/${encodeURIComponent(code)}/state`),
      /** Participante: unirse a una sala en espera (idempotente para el mismo usuario). */
      join: (code: string) => http.post<JoinSessionResult>('/sessions/join', { code }),
      /** Participante: abandonar una sala que aún no inició. */
      leave: (id: string) => http.delete(`/sessions/${id}/participants/me`),
    },
  };
}

export type Api = ReturnType<typeof createApi>;
