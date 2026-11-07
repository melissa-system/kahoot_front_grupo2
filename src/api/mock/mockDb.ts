/**
 * Base de datos simulada para desarrollar sin Supabase ni API. Se guarda en
 * localStorage para sobrevivir recargas. SOLO se usa cuando env.useMocks = true.
 */
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
      { userId: demo.id, displayName: demo.displayName, role: 'teacher', createdAt: now, updatedAt: now },
      { userId: student.id, displayName: student.displayName, role: 'student', createdAt: now, updatedAt: now },
    ],
    quizzes: [
      {
        id: quizId,
        ownerId: demo.id,
        title: 'Paradigmas: repaso rápido',
        description: 'Conceptos básicos de programación funcional y lógica',
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
      correctBoolean: correct as boolean,
      imageKey: null,
      imageUrl: null,
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
        role:
          profile.role === 'student' || profile.role === 'teacher'
            ? profile.role
            : cache!.quizzes.some((quiz) => quiz.ownerId === profile.userId)
              ? 'teacher'
              : 'student',
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
