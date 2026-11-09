/**
 * Base de datos simulada para desarrollar sin Supabase ni API. Se guarda en
 * localStorage para sobrevivir recargas. SOLO se usa cuando env.useMocks = true.
 */
import { DEFAULT_OWL_AVATAR_ID, parseOwlAvatarId } from '../../lib/owlAvatar';
import type { Profile, Question, Quiz, UserRole } from '../types';

export interface MockUser {
  id: string;
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
}

export interface MockData {
  users: MockUser[];
  profiles: Profile[];
  quizzes: Quiz[];
  questions: Question[];
}

const KEY = 'profelink-mock-db';

export const uuid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));

function seed(): MockData {
  const now = new Date().toISOString();
  const demo: MockUser = {
    id: uuid(),
    email: 'profe@profelink.test',
    password: 'profelink123',
    displayName: 'Profe Demo',
    role: 'teacher',
  };
  const student: MockUser = {
    id: uuid(),
    email: 'alumno@profelink.test',
    password: 'profelink123',
    displayName: 'Alex Estudiante',
    role: 'student',
  };
  const quizId = uuid();
  return {
    users: [demo, student],
    profiles: [
      { userId: demo.id, displayName: demo.displayName, avatarId: 'book', role: 'teacher', createdAt: now, updatedAt: now },
      { userId: student.id, displayName: student.displayName, avatarId: 'gamer', role: 'student', createdAt: now, updatedAt: now },
    ],
    quizzes: [
      {
        id: quizId,
        ownerId: demo.id,
        title: 'Paradigmas: repaso rápido',
        description: 'Conceptos básicos de programación funcional y lógica',
        imageKey: null,
        imageUrl: null,
        createdAt: now,
        updatedAt: now,
      },
    ],
    questions: [
      ['Haskell es un lenguaje puramente funcional', true],
      ['Prolog es un lenguaje orientado a objetos', false],
      ['Una función pura puede modificar variables globales', false],
    ].map(([statement, correct], position) => ({
      id: uuid(),
      quizId,
      statement: statement as string,
      kind: 'boolean' as const,
      correctBoolean: correct as boolean,
      options: null,
      correctIndexes: null,
      imageKey: null,
      imageUrl: null,
      durationSeconds: null,
      position,
    })),
  };
}

let cache: MockData | null = null;

export function db(): MockData {
  if (cache) return cache;
  try {
    const stored = localStorage.getItem(KEY);
    if (stored) {
      cache = JSON.parse(stored) as MockData;
      cache.profiles = cache.profiles.map((profile) => ({
        ...profile,
        avatarId: parseOwlAvatarId(profile.avatarId),
        role:
          profile.role === 'student' || profile.role === 'teacher'
            ? profile.role
            : cache!.quizzes.some((quiz) => quiz.ownerId === profile.userId)
              ? 'teacher'
              : 'student',
      }));
      cache.quizzes = cache.quizzes.map((quiz) => ({
        ...quiz,
        imageKey: quiz.imageKey ?? null,
        imageUrl: quiz.imageUrl ?? null,
      }));
      cache.questions = cache.questions.map((question) => ({
        ...question,
        kind: question.kind === 'multiple' ? 'multiple' : 'boolean',
        options: question.options ?? null,
        durationSeconds: Number.isInteger(question.durationSeconds) ? question.durationSeconds : null,
        correctIndexes: Array.isArray(question.correctIndexes)
          ? question.correctIndexes
          : Number.isInteger((question as Question & { correctIndex?: number }).correctIndex)
            ? [(question as Question & { correctIndex: number }).correctIndex]
            : null,
      }));
      cache.users = cache.users.map((user) => ({
        ...user,
        role: user.role === 'student' || user.role === 'teacher' ? user.role : 'teacher',
      }));
      if (!cache.users.some((user) => user.role === 'student')) {
        const student: MockUser = {
          id: uuid(),
          email: 'alumno@profelink.test',
          password: 'profelink123',
          displayName: 'Alex Estudiante',
          role: 'student',
        };
        cache.users.push(student);
        cache.profiles.push({
          userId: student.id,
          displayName: student.displayName,
          avatarId: DEFAULT_OWL_AVATAR_ID,
          role: 'student',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        save();
      }
    }
  } catch {
    /* almacenamiento no disponible */
  }
  cache ??= seed();
  return cache;
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db()));
  } catch {
    /* sin persistencia: seguimos en memoria */
  }
}

export function resetMockDb() {
  cache = seed();
  save();
}

export const tokenFor = (userId: string) => `mock-token.${userId}`;
export function userFromToken(token: string | null): MockUser | null {
  if (!token?.startsWith('mock-token.')) return null;
  const id = token.slice('mock-token.'.length);
  return db().users.find((u) => u.id === id) ?? null;
}

/** Latencia artificial pequeña para que se vean los estados de carga. */
export const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, import.meta.env.MODE === 'test' ? 0 : ms));
