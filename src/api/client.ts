import type { HttpClient } from '../lib/http';
import type {
  CreateQuestionInput,
  CreateQuizInput,
  CreateSessionInput,
  Profile,
  Question,
  QuestionImageResult,
  Quiz,
  QuizDetail,
  QuizSummary,
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
    },
    questions: {
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
      get: (id: string) => http.get<SessionState>(`/sessions/${id}`),
      stateByCode: (code: string) => http.get<SessionState>(`/sessions/${encodeURIComponent(code)}/state`),
    },
  };
}

export type Api = ReturnType<typeof createApi>;
