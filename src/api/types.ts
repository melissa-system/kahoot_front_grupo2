/**
 * Contratos consumidos de Back-Proyecto2 (NestJS). Mantener sincronizados con
 * src/quizzes, src/profiles y src/sessions/session.contracts.ts del backend.
 */

export interface Profile {
  userId: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Quiz {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuizSummary extends Quiz {
  questionsCount: number;
}

export interface Question {
  id: string;
  quizId: string;
  statement: string;
  correctBoolean: boolean;
  imageKey: string | null;
  imageUrl: string | null;
  position: number;
}

export interface QuizDetail extends Quiz {
  questions: Question[];
}

export interface CreateQuizInput {
  title: string;
  description?: string;
}
export type UpdateQuizInput = Partial<CreateQuizInput>;

export interface CreateQuestionInput {
  statement: string;
  correctBoolean: boolean;
  position?: number;
}
export type UpdateQuestionInput = Partial<CreateQuestionInput>;

export interface QuestionImageResult {
  id: string;
  imageKey: string;
  imageUrl: string;
}

/* ---------------- Sesiones ---------------- */

export type SessionStatus = 'WAITING' | 'IN_PROGRESS' | 'FINISHED';
export type SessionPhase = 'WAITING' | 'ANSWERING' | 'REVIEW' | 'FINISHED';

export const QUESTION_DURATION = { min: 5, max: 120, default: 30 } as const;
export const REVIEW_DURATION = { min: 3, max: 15, default: 5 } as const;

export interface CreateSessionInput {
  quizId: string;
  questionDurationSeconds?: number;
  reviewDurationSeconds?: number;
}

export interface ParticipantView {
  id: string;
  sessionId: string;
  userId: string;
  displayName: string;
  joinedAt: string;
}

interface CurrentQuestionFields {
  id: string;
  position: number;
  statement: string;
  imageUrl: string | null;
  openedAt: string;
  closesAt: string;
  closedAt: string | null;
  reviewEndsAt: string | null;
}

export type CurrentQuestionView = CurrentQuestionFields &
  ({ status: 'OPEN' } | { status: 'CLOSED'; correctBoolean: boolean });

export interface SessionResultView {
  participantId: string;
  totalScore: number;
  rank: number;
}

export interface SessionState {
  id: string;
  code: string;
  hostId: string;
  quizTitle: string;
  status: SessionStatus;
  phase: SessionPhase;
  questionDurationSeconds: number;
  currentIndex: number;
  questionsCount: number;
  startedAt: string | null;
  finishedAt: string | null;
  serverTime: string;
  participants: ParticipantView[];
  currentQuestion: CurrentQuestionView | null;
  results: SessionResultView[] | null;
}

/** Sobre que envía el gateway en cada evento (room:state, question:*, game:finished...). */
export interface RoomEnvelope {
  streamId: string;
  sequence: number;
  sessionId: string;
  serverTime: string;
  remainingMs: number;
  reviewDurationSeconds: number;
  scoreboard: SessionResultView[];
  state: SessionState;
}

export type SessionAck<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

export const SESSION_EVENTS = [
  'room:state',
  'question:opened',
  'question:closed',
  'game:finished',
  'scoreboard:updated',
] as const;
export type SessionEvent = (typeof SESSION_EVENTS)[number];

export type HostCommand = 'room:subscribe' | 'game:start' | 'game:advance' | 'game:finish' | 'auth:refresh';

export const IMAGE_RULES = {
  maxBytes: 2 * 1024 * 1024,
  types: ['image/jpeg', 'image/png', 'image/webp'] as const,
  label: 'JPG, PNG o WebP · máximo 2 MB',
} as const;
