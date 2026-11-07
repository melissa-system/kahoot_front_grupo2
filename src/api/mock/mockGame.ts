/**
 * Motor de juego SIMULADO (solo modo mock). Imita las reglas de P2: estados
 * WAITING → ANSWERING → REVIEW → … → FINISHED, cierre por tiempo o cuando todos
 * responden, revisión con avance automático y puntaje 0/1/3. Agrega jugadores
 * "bot" para poder probar el panel del anfitrión sin teléfonos reales.
 */
import { toApiError } from '../../lib/http';
import type {
  ParticipantView,
  Question,
  RoomEnvelope,
  SessionEvent,
  SessionResultView,
  SessionState,
} from '../types';
import { uuid } from './mockDb';

export class MockSessionError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

type Listener = (event: SessionEvent, envelope: RoomEnvelope) => void;

interface MockAnswer {
  participantId: string;
  choice: boolean;
  answeredAt: number;
  score: number;
}

interface Room {
  state: SessionState;
  questions: Question[];
  reviewSeconds: number;
  answers: Map<string, MockAnswer[]>; // por id de pregunta
  totals: Map<string, number>;
  listeners: Map<Listener, string>;
  timers: ReturnType<typeof setTimeout>[];
  sequence: number;
  botsStarted: boolean;
}

const BOT_NAMES = ['Valeria', 'Diego', 'Camila', 'Andrés', 'Sofía'];
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const isTest = import.meta.env.MODE === 'test';

const rooms = new Map<string, Room>();

const err = (code: string, message: string) => new MockSessionError(code, message);

function code(): string {
  let value = '';
  do {
    value = Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');
  } while ([...rooms.values()].some((r) => r.state.code === value));
  return value;
}

function scoreboard(room: Room): SessionResultView[] {
  const rows = room.state.participants.map((p) => ({ participantId: p.id, totalScore: room.totals.get(p.id) ?? 0 }));
  rows.sort((a, b) => b.totalScore - a.totalScore || a.participantId.localeCompare(b.participantId));
  const scores = [...new Set(rows.map((r) => r.totalScore))];
  return rows.map((r) => ({ ...r, rank: scores.indexOf(r.totalScore) + 1 }));
}

function remainingMs(room: Room): number {
  const q = room.state.currentQuestion;
  if (!q) return 0;
  const target = q.status === 'OPEN' ? q.closesAt : q.reviewEndsAt;
  return target ? Math.max(0, Date.parse(target) - Date.now()) : 0;
}

function envelope(room: Room): RoomEnvelope {
  room.state.serverTime = new Date().toISOString();
  return {
    streamId: room.state.id,
    sequence: room.sequence,
    sessionId: room.state.id,
    serverTime: room.state.serverTime,
    remainingMs: remainingMs(room),
    reviewDurationSeconds: room.reviewSeconds,
    scoreboard: scoreboard(room),
    state: structuredClone(room.state),
  };
}

function broadcast(room: Room, event: SessionEvent) {
  room.sequence += 1;
  const env = envelope(room);
  room.listeners.forEach((_user, listener) => {
    listener('room:state', env);
    if (event !== 'room:state') listener(event, env);
    if (event === 'question:closed' || event === 'game:finished') listener('scoreboard:updated', env);
  });
}

function later(room: Room, ms: number, fn: () => void) {
  room.timers.push(setTimeout(fn, ms));
}

function openQuestion(room: Room, index: number) {
  const q = room.questions[index];
  const opened = Date.now();
  room.state.phase = 'ANSWERING';
  room.state.currentIndex = index;
  room.state.currentQuestion = {
    id: q.id,
    position: index,
    statement: q.statement,
    imageUrl: q.imageUrl,
    openedAt: new Date(opened).toISOString(),
    closesAt: new Date(opened + room.state.questionDurationSeconds * 1000).toISOString(),
    closedAt: null,
    reviewEndsAt: null,
    status: 'OPEN',
  };
  room.answers.set(q.id, []);
  broadcast(room, 'question:opened');

  // Los bots responden en momentos aleatorios dentro del plazo.
  const players = room.state.participants.filter((p) => p.userId.startsWith('bot-'));
  for (const p of players) {
    const wait = Math.min(room.state.questionDurationSeconds * 1000 - 500, 1200 + Math.random() * 5000);
    later(room, wait, () => {
      if (room.state.currentQuestion?.id !== q.id || room.state.currentQuestion.status !== 'OPEN') return;
      const choice = Math.random() < 0.7 ? q.correctBoolean : !q.correctBoolean;
      const list = room.answers.get(q.id)!;
      const elapsed = Date.now() - opened;
      list.push({ participantId: p.id, choice, answeredAt: Date.now(), score: choice === q.correctBoolean ? (elapsed <= 3000 ? 3 : 1) : 0 });
      if (list.length >= room.state.participants.length) closeQuestion(room, q.id);
    });
  }
  later(room, room.state.questionDurationSeconds * 1000, () => closeQuestion(room, q.id));
}

function closeQuestion(room: Room, questionId: string, finishing = false) {
  const current = room.state.currentQuestion;
  if (!current || current.id !== questionId || current.status !== 'OPEN') return;
  const q = room.questions.find((x) => x.id === questionId)!;
  for (const a of room.answers.get(questionId) ?? []) room.totals.set(a.participantId, (room.totals.get(a.participantId) ?? 0) + a.score);
  const closed = Date.now();
  room.state.currentQuestion = {
    ...current,
    status: 'CLOSED',
    correctBoolean: q.correctBoolean,
    closedAt: new Date(closed).toISOString(),
    reviewEndsAt: finishing ? null : new Date(closed + room.reviewSeconds * 1000).toISOString(),
  };
  if (finishing) return;
  room.state.phase = 'REVIEW';
  broadcast(room, 'question:closed');
  later(room, room.reviewSeconds * 1000, () => autoAdvance(room, questionId));
}

function autoAdvance(room: Room, questionId: string) {
  if (room.state.phase !== 'REVIEW' || room.state.currentQuestion?.id !== questionId) return;
  const next = room.state.currentIndex + 1;
  if (next >= room.questions.length) finishRoom(room);
  else openQuestion(room, next);
}

function finishRoom(room: Room) {
  room.timers.forEach(clearTimeout);
  room.timers = [];
  if (room.state.currentQuestion?.status === 'OPEN') closeQuestion(room, room.state.currentQuestion.id, true);
  room.state.status = 'FINISHED';
  room.state.phase = 'FINISHED';
  room.state.finishedAt = new Date().toISOString();
  room.state.results = scoreboard(room);
  broadcast(room, 'game:finished');
}

function startBots(room: Room) {
  if (room.botsStarted || isTest) return;
  room.botsStarted = true;
  BOT_NAMES.slice(0, 4).forEach((name, i) => {
    later(room, 1200 * (i + 1), () => {
      if (room.state.status !== 'WAITING') return;
      const participant: ParticipantView = {
        id: uuid(),
        sessionId: room.state.id,
        userId: `bot-${i}`,
        displayName: name,
        joinedAt: new Date().toISOString(),
      };
      room.state.participants.push(participant);
      broadcast(room, 'room:state');
    });
  });
}

function getRoom(sessionId: string): Room {
  const room = rooms.get(sessionId);
  if (!room) throw err('SESSION_NOT_FOUND', 'Sala no encontrada');
  return room;
}

function requireHost(room: Room, userId: string) {
  if (room.state.hostId !== userId) throw err('HOST_REQUIRED', 'Solo el host puede realizar esta acción');
  if (room.state.status === 'FINISHED') throw err('SESSION_FINISHED', 'La partida ya finalizó');
}

export const mockGame = {
  create(hostId: string, quizTitle: string, questions: Question[], questionSeconds: number, reviewSeconds: number): SessionState {
    const id = uuid();
    const state: SessionState = {
      id,
      code: code(),
      hostId,
      quizTitle,
      status: 'WAITING',
      phase: 'WAITING',
      questionDurationSeconds: questionSeconds,
      currentIndex: -1,
      questionsCount: questions.length,
      startedAt: null,
      finishedAt: null,
      serverTime: new Date().toISOString(),
      participants: [],
      currentQuestion: null,
      results: null,
    };
    rooms.set(id, {
      state,
      questions: structuredClone(questions), // snapshot: editar el quiz no afecta la partida
      reviewSeconds,
      answers: new Map(),
      totals: new Map(),
      listeners: new Map(),
      timers: [],
      sequence: 1,
      botsStarted: false,
    });
    return structuredClone(state);
  },

  state(sessionId: string, userId: string): SessionState {
    const room = rooms.get(sessionId);
    if (!room) throw toApiError(404, { code: 'SESSION_NOT_FOUND', message: 'Sala no encontrada' });
    if (room.state.hostId !== userId && !room.state.participants.some((p) => p.userId === userId))
      throw toApiError(403, { code: 'HOST_REQUIRED', message: 'No perteneces a esta sala' });
    return envelope(room).state;
  },

  stateByCode(roomCode: string): SessionState {
    const room = [...rooms.values()].find((r) => r.state.code === roomCode.toUpperCase());
    if (!room) throw toApiError(404, { code: 'SESSION_NOT_FOUND', message: 'Sala no encontrada' });
    return envelope(room).state;
  },

  subscribe(sessionId: string, userId: string, listener: Listener): RoomEnvelope {
    const room = getRoom(sessionId);
    if (room.state.hostId !== userId && !room.state.participants.some((p) => p.userId === userId))
      throw err('SESSION_NOT_FOUND', 'Sala no encontrada');
    room.listeners.set(listener, userId);
    if (room.state.hostId === userId) startBots(room);
    return envelope(room);
  },

  unsubscribe(listener: Listener) {
    rooms.forEach((room) => room.listeners.delete(listener));
  },

  start(sessionId: string, userId: string): RoomEnvelope {
    const room = getRoom(sessionId);
    requireHost(room, userId);
    if (room.state.status !== 'WAITING') throw err('SESSION_ALREADY_STARTED', 'La partida ya fue iniciada');
    if (!room.questions.length) throw err('SESSION_HAS_NO_QUESTIONS', 'Se necesita al menos una pregunta para iniciar');
    if (!room.state.participants.length)
      throw err('SESSION_HAS_NO_PARTICIPANTS', 'Se necesita al menos un participante para iniciar');
    room.state.status = 'IN_PROGRESS';
    room.state.startedAt = new Date().toISOString();
    openQuestion(room, 0);
    return envelope(room);
  },

  advance(sessionId: string, userId: string, expectedQuestionId: string): RoomEnvelope {
    const room = getRoom(sessionId);
    requireHost(room, userId);
    if (room.state.status !== 'IN_PROGRESS') throw err('INVALID_SESSION_STATE', 'La acción no está permitida en el estado actual');
    const q = room.state.currentQuestion;
    if (!q || q.id !== expectedQuestionId) throw err('INVALID_SESSION_STATE', 'La pregunta ya cambió');
    if (q.status === 'OPEN') throw err('QUESTION_NOT_CLOSED', 'La pregunta aún está abierta');
    if (remainingMs(room) > 0) throw err('REVIEW_IN_PROGRESS', 'La revisión aún no termina');
    autoAdvance(room, q.id);
    return envelope(room);
  },

  finish(sessionId: string, userId: string): RoomEnvelope {
    const room = getRoom(sessionId);
    requireHost(room, userId);
    finishRoom(room);
    return envelope(room);
  },

  /** Solo pruebas: agrega un participante manualmente. */
  addParticipant(sessionId: string, displayName: string): ParticipantView {
    const room = getRoom(sessionId);
    const participant = { id: uuid(), sessionId, userId: `bot-${uuid()}`, displayName, joinedAt: new Date().toISOString() };
    room.state.participants.push(participant);
    broadcast(room, 'room:state');
    return participant;
  },
};
