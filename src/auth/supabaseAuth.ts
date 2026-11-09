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
  'For security purposes, you can only request this once every 60 seconds':
    'Espera un minuto antes de pedir otro enlace.',
  'Unable to validate email address: invalid format': 'El correo no tiene un formato válido.',
  'New password should be different from the old password.': 'La nueva contraseña debe ser distinta a la anterior.',
  'Password should be at least 6 characters.': 'Usa al menos 8 caracteres.',
  'Auth session missing!': 'El enlace ya no es válido. Solicita uno nuevo.',
  'Same password': 'La nueva contraseña debe ser distinta a la anterior.',
};

function recoveryRedirectTo() {
  return `${window.location.origin}/restablecer`;
}

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
    async requestPasswordReset(email) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: recoveryRedirectTo() });
      if (error) {
        const message = error.message;
        if (message.startsWith('For security purposes, you can only request this')) {
          throw new Error('Espera un momento antes de pedir otro enlace.');
        }
        throw translate(message);
      }
    },
    async updatePassword(password) {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw translate(error.message);
    },
    onChange(listener) {
      const { data } = supabase.auth.onAuthStateChange((event, session) => listener(toSession(session), event));
      return () => data.subscription.unsubscribe();
    },
  };
}
