import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createApi, type Api } from '../api/client';
import { createMockAuth } from '../api/mock/mockAuth';
import { mockTransport } from '../api/mock/mockTransport';
import type { Profile } from '../api/types';
import { env } from '../config/env';
import { HttpClient, fetchTransport } from '../lib/http';
import { createSupabaseAuth } from './supabaseAuth';
import type { AuthAdapter, AuthSession } from './types';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface AuthContextValue {
  status: AuthStatus;
  session: AuthSession | null;
  profile: Profile | null;
  /** Nombre visible: perfil del backend o, si aún no carga, el del registro. */
  displayName: string;
  isMock: boolean;
  signIn(email: string, password: string): Promise<void>;
  /** Devuelve false si el proyecto exige confirmar el correo antes de entrar. */
  signUp(email: string, password: string, displayName: string, role?: 'teacher' | 'student'): Promise<boolean>;
  signOut(): Promise<void>;
  updateDisplayName(name: string): Promise<void>;
  getToken(): Promise<string | null>;
  api: Api;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children, adapter }: { children: ReactNode; adapter?: AuthAdapter }) {
  const auth = useMemo<AuthAdapter>(() => adapter ?? (env.useMocks ? createMockAuth() : createSupabaseAuth()), [adapter]);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const sessionRef = useRef<AuthSession | null>(null);

  const getToken = useCallback(async () => {
    // supabase-js renueva el token solo; pedirlo cada vez evita usar uno vencido.
    const current = await auth.getSession();
    return current?.accessToken ?? sessionRef.current?.accessToken ?? null;
  }, [auth]);

  const api = useMemo(
    () =>
      createApi(
        new HttpClient({
          transport: env.useMocks ? mockTransport : fetchTransport,
          getToken,
          onUnauthorized: () => {
            void auth.signOut();
          },
        }),
      ),
    [auth, getToken],
  );

  const applySession = useCallback((next: AuthSession | null) => {
    sessionRef.current = next;
    setSession(next);
    setStatus(next ? 'authenticated' : 'anonymous');
    if (!next) setProfile(null);
  }, []);

  useEffect(() => {
    let alive = true;
    auth
      .getSession()
      .then((s) => alive && applySession(s))
      .catch(() => alive && applySession(null));
    const unsubscribe = auth.onChange((s) => applySession(s));
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [auth, applySession]);

  // Carga (o crea) el perfil en la API cuando hay sesión.
  useEffect(() => {
    if (!session) return;
    let alive = true;
    api.profiles
      .me()
      .then((p) => alive && setProfile(p))
      .catch(() => {
        /* la UI usa el nombre del token mientras tanto */
      });
    return () => {
      alive = false;
    };
  }, [session, api]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      profile,
      displayName: profile?.displayName ?? session?.user.displayName ?? session?.user.email.split('@')[0] ?? '',
      isMock: env.useMocks,
      api,
      getToken,
      async signIn(email, password) {
        applySession(await auth.signIn(email, password));
      },
      async signUp(email, password, displayName, role = 'student') {
        const created = await auth.signUp(email, password, displayName, role);
        if (!created) return false;
        applySession(created);
        try {
          setProfile(await api.profiles.update(displayName));
        } catch {
          /* el perfil se puede corregir luego desde "Mi perfil" */
        }
        return true;
      },
      async signOut() {
        await auth.signOut();
        applySession(null);
      },
      async updateDisplayName(name) {
        setProfile(await api.profiles.update(name));
      },
    }),
    [status, session, profile, api, getToken, auth, applySession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
