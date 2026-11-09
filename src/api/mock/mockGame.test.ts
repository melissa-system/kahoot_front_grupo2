import { describe, expect, it } from 'vitest';
import type { Question } from '../types';
import { db, resetMockDb, uuid } from './mockDb';
import { mockGame } from './mockGame';

function seededRoom() {
  resetMockDb();
  mockGame.reset();
  const teacher = db().users.find((user) => user.role === 'teacher')!;
  const student = db().users.find((user) => user.role === 'student')!;
  const quiz = db().quizzes[0];
  const questions = db().questions.filter((question) => question.quizId === quiz.id);
  const room = mockGame.create(teacher.id, quiz.title, questions, 20, 5);
  mockGame.join(room.code, { id: student.id, displayName: student.displayName });
  return { teacher, student, room, questions };
}

describe('motor de la partida', () => {
  it('cierra al responder todos, mantiene tiempo de revisión y abre la siguiente', () => {
    const { teacher, student, room, questions } = seededRoom();
    mockGame.start(room.id, teacher.id);
    const first = mockGame.peek(room.id).state.currentQuestion!;
    expect(first.status).toBe('OPEN');
    expect(first.statement).toBe(questions[0].statement);
    expect(mockGame.peek(room.id).remainingMs).toBeGreaterThan(0);

    mockGame.answer(student.id, first.id, questions[0].correctBoolean);
    const review = mockGame.peek(room.id);
    expect(review.state.phase).toBe('REVIEW');
    expect(review.state.currentQuestion?.status).toBe('CLOSED');
    expect(review.remainingMs).toBeGreaterThan(1_000);
    expect(review.scoreboard[0].totalScore).toBeGreaterThan(0);

    expect(() => mockGame.advance(room.id, teacher.id, first.id)).toThrow(/revisión aún no termina/i);

    mockGame.forceAdvance(room.id);
    expect(() => mockGame.advance(room.id, teacher.id, first.id)).toThrow(/pregunta actual ya cambió/i);
    const second = mockGame.peek(room.id);
    expect(second.state.currentIndex).toBe(1);
    expect(second.state.phase).toBe('ANSWERING');
    expect(second.state.currentQuestion?.statement).toBe(questions[1].statement);
    expect(second.remainingMs).toBeGreaterThan(0);
  });

  it('no deja cambiar la respuesta ni jugar al anfitrión', () => {
    const { teacher, student, room } = seededRoom();
    mockGame.start(room.id, teacher.id);
    const questionId = mockGame.peek(room.id).state.currentQuestion!.id;
    mockGame.answer(student.id, questionId, true);
    expect(() => mockGame.answer(student.id, questionId, false)).toThrow(/elección distinta/i);
    expect(() => mockGame.answer(teacher.id, questionId, true)).toThrow(/host dirige la sala/i);
  });

  it('puntúa una pregunta de 4 opciones y termina la partida', () => {
    resetMockDb();
    mockGame.reset();
    const teacher = db().users.find((user) => user.role === 'teacher')!;
    const student = db().users.find((user) => user.role === 'student')!;
    const question: Question = {
      id: uuid(),
      quizId: 'quiz-m',
      statement: '¿Cuál es funcional?',
      kind: 'multiple',
      correctBoolean: false,
      options: ['Java', 'Haskell', 'COBOL', 'Fortran'],
      correctIndexes: [1],
      imageKey: null,
      imageUrl: null,
      durationSeconds: 15,
      position: 0,
    };
    const room = mockGame.create(teacher.id, 'Múltiple', [question], 15, 3);
    mockGame.join(room.code, { id: student.id, displayName: student.displayName });
    mockGame.start(room.id, teacher.id);
    const open = mockGame.peek(room.id).state.currentQuestion!;
    mockGame.answer(student.id, open.id, 1);
    expect(mockGame.peek(room.id).scoreboard[0].totalScore).toBeGreaterThan(0);
    mockGame.forceAdvance(room.id);
    expect(mockGame.peek(room.id).state.status).toBe('FINISHED');
    expect(mockGame.peek(room.id).state.results?.[0].totalScore).toBeGreaterThan(0);
  });
});
