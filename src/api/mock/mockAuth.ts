import type { AuthAdapter, AuthChangeEvent, AuthSession } from '../../auth/types';
import { db, delay, save, tokenFor, userFromToken, uuid, type MockUser } from './mockDb';

const SESSION_KEY = 'profelink-mock-session';
const PENDING_RESET_KEY = 'profelink-pending-reset';

function toSession(user: MockUser): AuthSession {
  return { accessToken: tokenFor(user.id), user: { id: user.id, email: user.email, displayName: user.displayName } };
}

export function createMockAuth(): AuthAdapter {
  const listeners = new Set<(s: AuthSession | null, event?: AuthChangeEvent) => void>();
  const emit = (s: AuthSession | null, event?: AuthChangeEvent) => listeners.forEach((l) => l(s, event));

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
    async signUp(email, password, displayName, role = 'student') {
      await delay();
      const data = db();
      if (data.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase()))
        throw new Error('Ya existe una cuenta con ese correo.');
      const user: MockUser = { id: uuid(), email: email.trim(), password, displayName, role };
      data.users.push(user);
      const now = new Date().toISOString();
      data.profiles.push({ userId: user.id, displayName, avatarId: 'book', role, createdAt: now, updatedAt: now });
      save();
      const session = toSession(user);
      persist(session.accessToken);
      emit(session);
      return session;
    },
    async signOut() {
      persist(null);
      emit(null, 'SIGNED_OUT');
    },
    async requestPasswordReset(email) {
      await delay();
      try {
        sessionStorage.setItem(PENDING_RESET_KEY, email.trim().toLowerCase());
      } catch {
        /* ignorar */
      }
    },
    async updatePassword(password) {
      await delay();
      let email: string | null = null;
      try {
        email = sessionStorage.getItem(PENDING_RESET_KEY);
      } catch {
        email = null;
      }
      if (!email) throw new Error('El enlace ya no es válido. Solicita uno nuevo.');
      const user = db().users.find((u) => u.email.toLowerCase() === email);
      if (!user) throw new Error('El enlace ya no es válido. Solicita uno nuevo.');
      user.password = password;
      save();
      try {
        sessionStorage.removeItem(PENDING_RESET_KEY);
      } catch {
        /* ignorar */
      }
      persist(null);
      emit(null, 'SIGNED_OUT');
    },
    hasPendingPasswordReset() {
      try {
        return Boolean(sessionStorage.getItem(PENDING_RESET_KEY));
      } catch {
        return false;
      }
    },
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
