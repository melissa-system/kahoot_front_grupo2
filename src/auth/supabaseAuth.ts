import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import type { AuthAdapter, AuthSession } from './types';

let client: SupabaseClient | null = null;

/** Cliente único de Supabase (no crear otro en P4: importar este). */
export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'profelink-auth' },
    });
  }
  return client;
}

function toSession(session: Session | null): AuthSession | null {
  if (!session) return null;
  const meta = (session.user.user_metadata ?? {}) as Record<string, unknown>;
  return {
    accessToken: session.access_token,
    user: {
      id: session.user.id,
      email: session.user.email ?? '',
      displayName: typeof meta.display_name === 'string' ? meta.display_name : typeof meta.displayName === 'string' ? meta.displayName : undefined,
    },
  };
}

const AUTH_MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'Correo o contraseña incorrectos.',
  'Email not confirmed': 'Debes confirmar tu correo antes de iniciar sesión.',
  'User already registered': 'Ya existe una cuenta con ese correo.',
};

function translate(message: string): Error {
  return new Error(AUTH_MESSAGES[message] ?? message);
}

export function createSupabaseAuth(): AuthAdapter {
  const supabase = getSupabase();
  return {
    async getSession() {
      const { data } = await supabase.auth.getSession();
      return toSession(data.session);
    },
    async signIn(email, password) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw translate(error.message);
      return toSession(data.session)!;
    },
    async signUp(email, password, displayName, role = 'student') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        // El backend toma el nombre inicial del perfil de user_metadata.display_name
        // y el rol de app_role (profesor o estudiante).
        options: { data: { display_name: displayName, app_role: role } },
      });
      if (error) throw translate(error.message);
      // Si el proyecto exige confirmar correo, no hay sesión todavía.
      return toSession(data.session);
    },
    async signOut() {
      await supabase.auth.signOut();
    },
    onChange(listener) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => listener(toSession(session)));
      return () => data.subscription.unsubscribe();
    },
  };
}
