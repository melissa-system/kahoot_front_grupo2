/**
 * Contratos consumidos de Back-Proyecto2 (NestJS). Mantener sincronizados con
 * src/quizzes, src/profiles y src/sessions/session.contracts.ts del backend.
 */

export type UserRole = 'teacher' | 'student';
export type QuestionKind = 'boolean' | 'multiple';

export interface Profile {
  userId: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface Quiz {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  imageKey: string | null;
  imageUrl: string | null;
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
  kind: QuestionKind;
  correctBoolean: boolean;
  options: string[] | null;
  correctIndexes: number[] | null;
  imageKey: string | null;
  imageUrl: string | null;
  durationSeconds: number | null;
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
  kind?: QuestionKind;
  correctBoolean?: boolean;
  options?: string[];
  correctIndexes?: number[];
  durationSeconds?: number | null;
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
export const QUESTION_DURATION_PRESETS = [10, 20, 30, 60] as const;
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
  kind?: QuestionKind;
  options?: string[] | null;
  imageUrl: string | null;
  openedAt: string;
  closesAt: string;
  closedAt: string | null;
  reviewEndsAt: string | null;
}

export type CurrentQuestionView = CurrentQuestionFields &
  (
    | { status: 'OPEN' }
    | { status: 'CLOSED'; correctBoolean: boolean; correctIndexes?: number[] | null }
  );

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
export type ParticipantCommand = 'room:join' | 'room:subscribe' | 'room:leave' | 'answer:submit' | 'auth:refresh';

/* ---------------- Participante (P4) ---------------- */

/** Alfabeto de los códigos de sala del backend (sin 0/O/1/I para evitar confusiones). */
export const SESSION_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const SESSION_CODE_LENGTH = 6;
export const SESSION_CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

/** Mayúsculas, sin espacios ni símbolos, máximo 6 caracteres. */
export function normalizeSessionCode(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, SESSION_CODE_LENGTH);
}

export function isValidSessionCode(code: string): boolean {
  return SESSION_CODE_PATTERN.test(code);
}

export interface SubmitAnswerInput {
  sessionQuestionId: string;
  choice?: boolean;
  choiceIndex?: number;
}

/** Ack de `answer:submit`: el servidor confirma la respuesta registrada. */
export interface AnswerReceipt extends SubmitAnswerInput {
  id: string;
  answeredAt: string;
}

/** Respuesta de `POST /sessions/join`. */
export interface JoinSessionResult {
  participant: ParticipantView;
  session: SessionState;
}

export interface SessionHistoryRankingRow {
  participantId: string;
  displayName: string;
  totalScore: number;
  rank: number;
}

export interface SessionHistoryQuestionStat {
  position: number;
  statement: string;
  kind?: QuestionKind;
  options?: string[] | null;
  correctBoolean: boolean;
  correctIndexes?: number[] | null;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  correctNames: string[];
  wrongNames: string[];
  unansweredNames: string[];
}

export interface PlayedQuestion {
  position: number;
  statement: string;
  kind?: QuestionKind;
  options?: string[] | null;
  correctBoolean: boolean;
  correctIndexes?: number[] | null;
  myChoice: boolean | number | null;
}

/** Partida finalizada de `GET /sessions/played` (el estudiante como participante). */
export interface PlayedSessionItem {
  id: string;
  code: string;
  quizTitle: string;
  finishedAt: string;
  questionsCount: number;
  participantCount: number;
  rank: number | null;
  totalScore: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  winnerDisplayName: string | null;
  questions: PlayedQuestion[];
}

/** Resumen de `GET /sessions/history` (partidas finalizadas del anfitrión). */
export interface SessionHistoryItem {
  id: string;
  code: string;
  quizTitle: string;
  finishedAt: string;
  participantCount: number;
  questionsCount: number;
  winnerDisplayName: string | null;
  winnerScore: number | null;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  ranking: SessionHistoryRankingRow[];
  questions: SessionHistoryQuestionStat[];
}

/** Ack de `room:join` (une al usuario y suscribe el socket a la sala). */
export interface RealtimeJoinResult {
  participant: ParticipantView;
  room: RoomEnvelope;
}

export const IMAGE_RULES = {
  maxBytes: 2 * 1024 * 1024,
  types: ['image/jpeg', 'image/png', 'image/webp'] as const,
  label: 'JPG, PNG o WebP · máximo 2 MB',
} as const;
