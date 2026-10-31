import type { AuthAdapter, AuthSession } from '../../auth/types';
import { db, delay, save, tokenFor, userFromToken, uuid, type MockUser } from './mockDb';

const SESSION_KEY = 'profelink-mock-session';

function toSession(user: MockUser): AuthSession {
  return { accessToken: tokenFor(user.id), user: { id: user.id, email: user.email, displayName: user.displayName } };
}

export function createMockAuth(): AuthAdapter {
  const listeners = new Set<(s: AuthSession | null) => void>();
  const emit = (s: AuthSession | null) => listeners.forEach((l) => l(s));

  const persist = (token: string | null) => {
    try {
      if (token) localStorage.setItem(SESSION_KEY, token);
      else localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignorar */
    }
  };

  return {
    async getSession() {
      let token: string | null = null;
      try {
        token = localStorage.getItem(SESSION_KEY);
      } catch {
        token = null;
      }
      const user = userFromToken(token);
      return user ? toSession(user) : null;
    },
    async signIn(email, password) {
      await delay();
      const user = db().users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (!user || user.password !== password) throw new Error('Correo o contraseña incorrectos.');
      const session = toSession(user);
      persist(session.accessToken);
      emit(session);
      return session;
    },
    async signUp(email, password, displayName) {
      await delay();
      const data = db();
      if (data.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase()))
        throw new Error('Ya existe una cuenta con ese correo.');
      const user: MockUser = { id: uuid(), email: email.trim(), password, displayName };
      data.users.push(user);
      const now = new Date().toISOString();
      data.profiles.push({ userId: user.id, displayName, createdAt: now, updatedAt: now });
      save();
      const session = toSession(user);
      persist(session.accessToken);
      emit(session);
      return session;
    },
    async signOut() {
      persist(null);
      emit(null);
    },
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
