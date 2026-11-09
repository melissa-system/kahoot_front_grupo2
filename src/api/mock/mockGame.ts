/**
 * Motor de juego SIMULADO (solo modo mock). Imita las reglas de P2: estados
 * WAITING → ANSWERING → REVIEW → … → FINISHED, cierre por tiempo o cuando todos
 * responden, revisión con avance automático y puntaje 0/1/3. Agrega jugadores
 * "bot" para poder probar el panel del anfitrión sin teléfonos reales.
 */
import { toApiError } from '../../lib/http';
import type {
  AnswerReceipt,
  JoinSessionResult,
  PlayedSessionItem,
  ParticipantView,
  Question,
  RealtimeJoinResult,
  RoomEnvelope,
  SessionEvent,
  SessionHistoryItem,
  SessionResultView,
  SessionState,
} from '../types';
import { SESSION_CODE_PATTERN } from '../types';
import { isCorrectChoice, questionKindOf } from '../../lib/questionKind';
import { db, uuid } from './mockDb';

export class MockSessionError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'MockSessionError';
    this.code = code;
  }
}

/** Código fijo de la sala demo del participante (alfabeto sin 0/O/1/I). */
export const DEMO_ROOM_CODE = 'PLAY23';

type Listener = (event: SessionEvent, envelope: RoomEnvelope) => void;

interface MockAnswer {
  id: string;
  participantId: string;
  sessionQuestionId: string;
  choice: boolean | number;
  answeredAt: number;
  score: number;
}

interface Room {
  state: SessionState;
  questions: Question[];
  reviewSeconds: number;
  answers: Map<string, MockAnswer[]>;
  totals: Map<string, number>;
  listeners: Map<Listener, string>;
  timers: ReturnType<typeof setTimeout>[];
  sequence: number;
  botsStarted: boolean;
  demoAutoStart: boolean;
}

const BOT_NAMES = ['Valeria', 'Diego', 'Camila', 'Andrés', 'Sofía'];
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const isTest = import.meta.env.MODE === 'test';
const DEMO_HOST_ID = 'bot-host-demo';

const rooms = new Map<string, Room>();

const err = (code: string, message: string) => new MockSessionError(code, message);

export function statusForSessionError(code: string): number {
  if (code === 'UNAUTHORIZED') return 401;
  if (code === 'VALIDATION_ERROR') return 400;
  if (code === 'SESSION_NOT_FOUND' || code === 'QUIZ_NOT_FOUND') return 404;
  if (code === 'HOST_REQUIRED' || code === 'HOST_CANNOT_PARTICIPATE') return 403;
  if (code === 'ROOM_CODE_UNAVAILABLE') return 503;
  if (code === 'INTERNAL_ERROR') return 500;
  return 409;
}

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

function pointsFor(correct: boolean, elapsedMs: number) {
  if (!correct) return 0;
  return elapsedMs <= 3000 ? 3 : 1;
}

function receiptOf(answer: MockAnswer): AnswerReceipt {
  return {
    id: answer.id,
    sessionQuestionId: answer.sessionQuestionId,
    ...(typeof answer.choice === 'number' ? { choiceIndex: answer.choice } : { choice: answer.choice }),
    answeredAt: new Date(answer.answeredAt).toISOString(),
  };
}

function questionSeconds(question: Question, fallback: number) {
  return question.durationSeconds ?? fallback;
}

function openQuestion(room: Room, index: number) {
  const q = room.questions[index];
  const opened = Date.now();
  const seconds = questionSeconds(q, room.state.questionDurationSeconds);
  room.state.phase = 'ANSWERING';
  room.state.currentIndex = index;
  room.state.currentQuestion = {
    id: q.id,
    position: index,
    statement: q.statement,
    kind: questionKindOf(q),
    options: q.kind === 'multiple' ? q.options : null,
    imageUrl: q.imageUrl,
    openedAt: new Date(opened).toISOString(),
    closesAt: new Date(opened + seconds * 1000).toISOString(),
    closedAt: null,
    reviewEndsAt: null,
    status: 'OPEN',
  };
  room.answers.set(q.id, []);
  broadcast(room, 'question:opened');

  const players = room.state.participants.filter((p) => p.userId.startsWith('bot-'));
  for (const p of players) {
    const wait = Math.min(seconds * 1000 - 500, 1200 + Math.random() * 5000);
    later(room, wait, () => {
      if (room.state.currentQuestion?.id !== q.id || room.state.currentQuestion.status !== 'OPEN') return;
      const choice =
        questionKindOf(q) === 'multiple'
          ? Math.floor(Math.random() * (q.options?.length ?? 4))
          : Math.random() < 0.7
            ? q.correctBoolean
            : !q.correctBoolean;
      const list = room.answers.get(q.id)!;
      if (list.some((a) => a.participantId === p.id)) return;
      const elapsed = Date.now() - opened;
      list.push({
        id: uuid(),
        participantId: p.id,
        sessionQuestionId: q.id,
        choice,
        answeredAt: Date.now(),
        score: pointsFor(isCorrectChoice(q, choice), elapsed),
      });
      if (list.length >= room.state.participants.length) closeQuestion(room, q.id);
    });
  }
  later(room, seconds * 1000, () => closeQuestion(room, q.id));
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
    kind: questionKindOf(q),
    options: q.kind === 'multiple' ? q.options : null,
    correctBoolean: q.correctBoolean,
    correctIndexes: q.correctIndexes ?? null,
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
  if (room.botsStarted || isTest || room.state.hostId === DEMO_HOST_ID) return;
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

function roomByCode(roomCode: string): Room | undefined {
  const normalized = roomCode.trim().toUpperCase();
  return [...rooms.values()].find((r) => r.state.code === normalized);
}

function isMember(room: Room, userId: string): boolean {
  return room.state.hostId === userId || room.state.participants.some((p) => p.userId === userId);
}

function requireHost(room: Room, userId: string) {
  if (room.state.hostId !== userId) throw err('HOST_REQUIRED', 'Solo el host puede realizar esta acción');
  if (room.state.status === 'FINISHED') throw err('SESSION_FINISHED', 'La partida ya finalizó');
}

function studentPlayer(choices: boolean[]) {
  const student = db().users.find((user) => user.role === 'student');
  if (!student) return [];
  return [{ userId: student.id, displayName: student.displayName, choices }];
}

function displayNameOf(userId: string): string {
  return db().profiles.find((p) => p.userId === userId)?.displayName ?? db().users.find((u) => u.id === userId)?.displayName ?? 'Participante';
}

function otherActiveRoom(userId: string, exceptSessionId?: string): Room | undefined {
  return [...rooms.values()].find(
    (r) =>
      r.state.id !== exceptSessionId &&
      (r.state.status === 'WAITING' || r.state.status === 'IN_PROGRESS') &&
      r.state.participants.some((p) => p.userId === userId),
  );
}

function historyItem(room: Room): SessionHistoryItem {
  const ranking = (room.state.results ?? scoreboard(room)).map((row) => ({
    ...row,
    displayName: room.state.participants.find((p) => p.id === row.participantId)?.displayName ?? 'Participante',
  }));
  const winner = ranking.find((row) => row.rank === 1) ?? null;
  const names = new Map(room.state.participants.map((p) => [p.id, p.displayName]));
  const questions = [...room.questions].sort((a, b) => a.position - b.position);
  const questionStats = questions.map((question) => {
    const answers = room.answers.get(question.id) ?? [];
    const answered = new Set(answers.map((a) => a.participantId));
    const correctNames = answers
      .filter((a) => isCorrectChoice(question, a.choice))
      .map((a) => names.get(a.participantId) ?? 'Participante')
      .sort((a, b) => a.localeCompare(b, 'es'));
    const wrongNames = answers
      .filter((a) => !isCorrectChoice(question, a.choice))
      .map((a) => names.get(a.participantId) ?? 'Participante')
      .sort((a, b) => a.localeCompare(b, 'es'));
    const unansweredNames = room.state.participants
      .filter((p) => !answered.has(p.id))
      .map((p) => p.displayName)
      .sort((a, b) => a.localeCompare(b, 'es'));
    return {
      position: question.position,
      statement: question.statement,
      kind: questionKindOf(question),
      options: question.options ?? null,
      correctBoolean: question.correctBoolean,
      correctIndexes: question.correctIndexes ?? null,
      correctCount: correctNames.length,
      wrongCount: wrongNames.length,
      unansweredCount: unansweredNames.length,
      correctNames,
      wrongNames,
      unansweredNames,
    };
  });
  return {
    id: room.state.id,
    code: room.state.code,
    quizTitle: room.state.quizTitle,
    finishedAt: room.state.finishedAt ?? room.state.serverTime,
    participantCount: room.state.participants.length,
    questionsCount: room.questions.length,
    winnerDisplayName: winner?.displayName ?? null,
    winnerScore: winner?.totalScore ?? null,
    correctCount: questionStats.reduce((sum, q) => sum + q.correctCount, 0),
    wrongCount: questionStats.reduce((sum, q) => sum + q.wrongCount, 0),
    unansweredCount: questionStats.reduce((sum, q) => sum + q.unansweredCount, 0),
    ranking,
    questions: questionStats,
  };
}

function playedItem(room: Room, userId: string): PlayedSessionItem {
  const me = room.state.participants.find((participant) => participant.userId === userId);
  const ranking = room.state.results ?? scoreboard(room);
  const mine = ranking.find((row) => row.participantId === me?.id);
  const winner = ranking.find((row) => row.rank === 1);
  const questions = room.questions.map((question) => {
    const answer = (room.answers.get(question.id) ?? []).find((item) => item.participantId === me?.id);
    return {
      position: question.position,
      statement: question.statement,
      kind: questionKindOf(question),
      options: question.options ?? null,
      correctBoolean: question.correctBoolean,
      correctIndexes: question.correctIndexes ?? null,
      myChoice: answer ? answer.choice : null,
    };
  });
  const correctCount = questions.filter((question) => isCorrectChoice(question, question.myChoice)).length;
  const wrongCount = questions.filter((question) => question.myChoice !== null && !isCorrectChoice(question, question.myChoice)).length;
  return {
    id: room.state.id,
    code: room.state.code,
    quizTitle: room.state.quizTitle,
    finishedAt: room.state.finishedAt ?? room.state.serverTime,
    questionsCount: room.questions.length,
    participantCount: room.state.participants.length,
    rank: mine?.rank ?? null,
    totalScore: mine?.totalScore ?? 0,
    correctCount,
    wrongCount,
    unansweredCount: questions.length - correctCount - wrongCount,
    winnerDisplayName: winner ? (room.state.participants.find((p) => p.id === winner.participantId)?.displayName ?? null) : null,
    questions,
  };
}

function putRoom(hostId: string, quizTitle: string, questions: Question[], questionSeconds: number, reviewSeconds: number, roomCode?: string): SessionState {
  const id = uuid();
  const state: SessionState = {
    id,
    code: roomCode?.toUpperCase() ?? code(),
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
    questions: structuredClone(questions),
    reviewSeconds,
    answers: new Map(),
    totals: new Map(),
    listeners: new Map(),
    timers: [],
    sequence: 1,
    botsStarted: false,
    demoAutoStart: false,
  });
  return structuredClone(state);
}

export const mockGame = {
  create(hostId: string, quizTitle: string, questions: Question[], questionSeconds: number, reviewSeconds: number, roomCode?: string): SessionState {
    return putRoom(hostId, quizTitle, questions, questionSeconds, reviewSeconds, roomCode);
  },

  reset() {
    rooms.forEach((room) => room.timers.forEach(clearTimeout));
    rooms.clear();
  },

  history(hostId: string): SessionHistoryItem[] {
    if (!isTest) this.ensureDemoHistory(hostId);
    return [...rooms.values()]
      .filter((room) => room.state.hostId === hostId && room.state.status === 'FINISHED')
      .sort((a, b) => Date.parse(b.state.finishedAt ?? '') - Date.parse(a.state.finishedAt ?? ''))
      .map(historyItem);
  },

  played(userId: string): PlayedSessionItem[] {
    if (!isTest) this.ensureDemoHistory(db().quizzes[0]?.ownerId ?? userId);
    return [...rooms.values()]
      .filter(
        (room) =>
          room.state.status === 'FINISHED' && room.state.participants.some((participant) => participant.userId === userId),
      )
      .sort((a, b) => Date.parse(b.state.finishedAt ?? '') - Date.parse(a.state.finishedAt ?? ''))
      .map((room) => playedItem(room, userId));
  },

  /** Inserta una partida ya terminada (historial y modo demo). */
  seedFinished(
    hostId: string,
    options: {
      quizTitle: string;
      code?: string;
      finishedAt?: string;
      questions: Question[];
      players: Array<{ userId?: string; displayName: string; choices: Array<boolean | number> }>;
    },
  ): SessionHistoryItem {
    const state = putRoom(hostId, options.quizTitle, structuredClone(options.questions), 15, 5, options.code);
    const room = rooms.get(state.id)!;
    for (const player of options.players) {
      const participant: ParticipantView = {
        id: uuid(),
        sessionId: state.id,
        userId: player.userId ?? `hist-${uuid()}`,
        displayName: player.displayName,
        joinedAt: options.finishedAt ?? new Date().toISOString(),
      };
      room.state.participants.push(participant);
      let total = 0;
      player.choices.forEach((choice, index) => {
        const question = room.questions[index];
        if (!question) return;
        const list = room.answers.get(question.id) ?? [];
        const score = pointsFor(isCorrectChoice(question, choice), 0);
        list.push({
          id: uuid(),
          participantId: participant.id,
          sessionQuestionId: question.id,
          choice,
          answeredAt: Date.now(),
          score,
        });
        room.answers.set(question.id, list);
        total += score;
      });
      room.totals.set(participant.id, total);
    }
    finishRoom(room);
    if (options.finishedAt) room.state.finishedAt = options.finishedAt;
    return historyItem(room);
  },

  ensureDemoHistory(hostId: string) {
    for (const demoCode of ['PAST23', 'BEST42', 'GAME42', 'CUPA23', 'FAST23', 'WEEK23'] as const) {
      const existing = roomByCode(demoCode);
      if (existing) {
        existing.timers.forEach(clearTimeout);
        rooms.delete(existing.state.id);
      }
    }
    if ([...rooms.values()].some((room) => room.state.hostId === hostId && room.state.status === 'FINISHED')) return;
    const quiz = db().quizzes[0];
    const questions = quiz ? db().questions.filter((q) => q.quizId === quiz.id) : [];
    const fallback: Question[] = questions.length
      ? questions
      : [
          {
            id: uuid(),
            quizId: 'demo',
            statement: 'Haskell es un lenguaje puramente funcional',
            kind: 'boolean',
            correctBoolean: true,
            options: null,
            correctIndexes: null,
            imageKey: null,
            imageUrl: null,
            durationSeconds: null,
            position: 0,
          },
        ];
    this.seedFinished(hostId, {
      quizTitle: quiz?.title ?? 'Paradigmas: repaso rápido',
      code: 'PAST23',
      finishedAt: new Date(Date.now() - 86_400_000).toISOString(),
      questions: fallback,
      players: [
        ...studentPlayer(fallback.map((q, i) => (i === 0 ? q.correctBoolean : !q.correctBoolean))),
        { displayName: 'Valeria', choices: fallback.map((q) => q.correctBoolean) },
        { displayName: 'Diego', choices: fallback.map((q, i) => (i % 2 === 0 ? q.correctBoolean : !q.correctBoolean)) },
        { displayName: 'Camila', choices: fallback.map((q) => !q.correctBoolean) },
      ],
    });
    this.seedFinished(hostId, {
      quizTitle: quiz?.title ?? 'Paradigmas: repaso rápido',
      code: 'BEST42',
      finishedAt: new Date(Date.now() - 3_600_000).toISOString(),
      questions: fallback.slice(0, Math.min(2, fallback.length)),
      players: [
        ...studentPlayer(fallback.slice(0, 2).map((q) => q.correctBoolean)),
        { displayName: 'Andrés', choices: fallback.slice(0, 2).map((q) => q.correctBoolean) },
        { displayName: 'Valeria', choices: fallback.slice(0, 2).map((q, i) => (i === 0 ? q.correctBoolean : !q.correctBoolean)) },
      ],
    });
    const extras = [
      { code: 'GAME42', title: 'Repaso de funciones' },
      { code: 'CUPA23', title: 'Tipos y paradigmas' },
      { code: 'FAST23', title: 'Programación lógica' },
      { code: 'WEEK23', title: 'Evaluación semanal' },
    ] as const;
    extras.forEach((extra, index) => {
      const slice = fallback.slice(0, Math.min(2, fallback.length));
      this.seedFinished(hostId, {
        quizTitle: extra.title,
        code: extra.code,
        finishedAt: new Date(Date.now() - (index + 2) * 3_600_000).toISOString(),
        questions: slice,
        players: [
          { displayName: 'Valeria', choices: slice.map((q) => q.correctBoolean) },
          { displayName: 'Diego', choices: slice.map((q, i) => (i === 0 ? q.correctBoolean : !q.correctBoolean)) },
        ],
      });
    });
  },

  /** Sala fija para probar el flujo del participante en modo mock (no en tests). */
  ensureDemoRoom(): SessionState {
    const existing = roomByCode(DEMO_ROOM_CODE);
    if (existing && existing.state.status !== 'FINISHED') return structuredClone(existing.state);
    if (existing) {
      existing.timers.forEach(clearTimeout);
      rooms.delete(existing.state.id);
    }
    const quiz = db().quizzes[0];
    const questions = quiz ? db().questions.filter((q) => q.quizId === quiz.id).slice(0, 1) : [];
    const fallback: Question[] = questions.length
      ? questions
      : [
          {
            id: uuid(),
            quizId: 'demo',
            statement: 'Haskell es un lenguaje puramente funcional',
            kind: 'boolean',
            correctBoolean: true,
            options: null,
            correctIndexes: null,
            imageKey: null,
            imageUrl: null,
            durationSeconds: null,
            position: 0,
          },
        ];
    return putRoom(DEMO_HOST_ID, quiz?.title ?? 'Sala demo', fallback, 5, 3, DEMO_ROOM_CODE);
  },

  state(sessionId: string, userId: string): SessionState {
    const room = rooms.get(sessionId);
    if (!room) throw toApiError(404, { code: 'SESSION_NOT_FOUND', message: 'Sala no encontrada' });
    if (!isMember(room, userId)) throw toApiError(403, { code: 'HOST_REQUIRED', message: 'No perteneces a esta sala' });
    return envelope(room).state;
  },

  stateByCode(roomCode: string, userId: string): RoomEnvelope {
    if (roomCode.trim().toUpperCase() === DEMO_ROOM_CODE) this.ensureDemoRoom();
    const room = roomByCode(roomCode);
    if (!room || !isMember(room, userId)) throw toApiError(404, { code: 'SESSION_NOT_FOUND', message: 'Sala no encontrada' });
    return envelope(room);
  },

  join(code: string, user: { id: string; displayName: string }): JoinSessionResult {
    const normalized = code.trim().toUpperCase();
    if (!SESSION_CODE_PATTERN.test(normalized)) throw err('VALIDATION_ERROR', 'Los datos de la solicitud no son válidos');
    if (normalized === DEMO_ROOM_CODE) this.ensureDemoRoom();
    const room = roomByCode(normalized);
    if (!room) throw err('SESSION_NOT_FOUND', 'Sala no encontrada');
    if (room.state.hostId === user.id) throw err('HOST_CANNOT_PARTICIPATE', 'El host dirige la sala y no juega en ella');

    const existing = room.state.participants.find((p) => p.userId === user.id);
    if (existing) {
      return { participant: structuredClone(existing), session: structuredClone(room.state) };
    }

    if (room.state.status === 'FINISHED') throw err('SESSION_FINISHED', 'La partida ya finalizó');
    if (room.state.status !== 'WAITING') throw err('SESSION_NOT_JOINABLE', 'La sala ya no acepta nuevos participantes');
    if (otherActiveRoom(user.id, room.state.id)) throw err('ALREADY_IN_ACTIVE_SESSION', 'Ya participas en otra sala activa');

    const participant: ParticipantView = {
      id: uuid(),
      sessionId: room.state.id,
      userId: user.id,
      displayName: user.displayName,
      joinedAt: new Date().toISOString(),
    };
    room.state.participants.push(participant);
    broadcast(room, 'room:state');

    if (room.state.hostId === DEMO_HOST_ID && !room.demoAutoStart && !isTest) {
      room.demoAutoStart = true;
      later(room, 4000, () => {
        if (room.state.status !== 'WAITING' || !room.state.participants.length) return;
        room.state.status = 'IN_PROGRESS';
        room.state.startedAt = new Date().toISOString();
        openQuestion(room, 0);
      });
    }

    return { participant: structuredClone(participant), session: structuredClone(room.state) };
  },

  joinRealtime(code: string, userId: string, listener: Listener): RealtimeJoinResult {
    const { participant, session } = this.join(code, { id: userId, displayName: displayNameOf(userId) });
    const room = this.subscribe(session.id, userId, listener);
    return { participant, room };
  },

  leave(sessionId: string, userId: string): { sessionId: string } {
    const room = getRoom(sessionId);
    const index = room.state.participants.findIndex((p) => p.userId === userId);
    if (index < 0) throw err('SESSION_NOT_FOUND', 'Sala no encontrada');
    if (room.state.status !== 'WAITING') throw err('SESSION_NOT_LEAVABLE', 'Solo puedes abandonar una sala en espera');
    room.state.participants.splice(index, 1);
    broadcast(room, 'room:state');
    return { sessionId };
  },

  answer(userId: string, sessionQuestionId: string, choice: boolean | number): { answer: AnswerReceipt } {
    const validBoolean = typeof choice === 'boolean';
    const validIndex = typeof choice === 'number' && Number.isInteger(choice) && choice >= 0 && choice <= 3;
    if ((!validBoolean && !validIndex) || !sessionQuestionId) throw err('VALIDATION_ERROR', 'Los datos de la solicitud no son válidos');
    const room = [...rooms.values()].find((r) => r.state.participants.some((p) => p.userId === userId) || r.questions.some((q) => q.id === sessionQuestionId));
    if (!room) throw err('SESSION_NOT_FOUND', 'Sala no encontrada');
    if (room.state.hostId === userId) throw err('HOST_CANNOT_PARTICIPATE', 'El host dirige la sala y no juega en ella');
    const participant = room.state.participants.find((p) => p.userId === userId);
    if (!participant) throw err('SESSION_NOT_FOUND', 'Sala no encontrada');

    const list = room.answers.get(sessionQuestionId) ?? [];
    const previous = list.find((a) => a.participantId === participant.id);
    if (previous) {
      if (previous.choice === choice) return { answer: receiptOf(previous) };
      throw err('ANSWER_ALREADY_SUBMITTED', 'Ya enviaste una elección distinta para esta pregunta');
    }

    if (room.state.status === 'FINISHED') throw err('SESSION_FINISHED', 'La partida ya finalizó');
    const current = room.state.currentQuestion;
    if (!current || current.id !== sessionQuestionId || current.status !== 'OPEN') throw err('QUESTION_NOT_OPEN', 'La pregunta no está abierta para responder');
    if (Date.now() >= Date.parse(current.closesAt)) throw err('ANSWER_TOO_LATE', 'El plazo para responder ya terminó');

    const q = room.questions.find((x) => x.id === sessionQuestionId)!;
    const answeredAt = Date.now();
    const elapsed = answeredAt - Date.parse(current.openedAt);
    const saved: MockAnswer = {
      id: uuid(),
      participantId: participant.id,
      sessionQuestionId,
      choice,
      answeredAt,
      score: pointsFor(isCorrectChoice(q, choice), elapsed),
    };
    list.push(saved);
    room.answers.set(sessionQuestionId, list);
    if (list.length >= room.state.participants.length) closeQuestion(room, sessionQuestionId);
    return { answer: receiptOf(saved) };
  },

  subscribe(sessionId: string, userId: string, listener: Listener): RoomEnvelope {
    const room = getRoom(sessionId);
    if (!isMember(room, userId)) throw err('SESSION_NOT_FOUND', 'Sala no encontrada');
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
    if (!room.state.participants.length) throw err('SESSION_HAS_NO_PARTICIPANTS', 'Se necesita al menos un participante para iniciar');
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
    if (!q || q.id !== expectedQuestionId) throw err('STALE_QUESTION', 'La pregunta actual ya cambió');
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

  /** Solo pruebas: cierra la pregunta abierta para pasar a revisión. */
  forceClose(sessionId: string) {
    const room = getRoom(sessionId);
    if (room.state.currentQuestion?.status === 'OPEN') closeQuestion(room, room.state.currentQuestion.id);
  },

  /** Solo pruebas: salta la espera de revisión y abre la siguiente pregunta. */
  forceAdvance(sessionId: string) {
    const room = getRoom(sessionId);
    const question = room.state.currentQuestion;
    if (!question || question.status !== 'CLOSED') return;
    autoAdvance(room, question.id);
  },

  /** Solo pruebas: sobre actual de la sala. */
  peek(sessionId: string) {
    return envelope(getRoom(sessionId));
  },
};
