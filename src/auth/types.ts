export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
}

/**
 * Proveedor de identidad. La implementación real usa supabase-js; en modo mock
 * se usa una versión en memoria con la misma forma.
 */
export type AuthChangeEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'PASSWORD_RECOVERY' | 'TOKEN_REFRESHED' | 'USER_UPDATED' | string;

export interface AuthAdapter {
  getSession(): Promise<AuthSession | null>;
  signIn(email: string, password: string): Promise<AuthSession>;
  signUp(email: string, password: string, displayName: string, role?: 'teacher' | 'student'): Promise<AuthSession | null>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  /** En modo demo: hay un restablecimiento pendiente sin correo real. */
  hasPendingPasswordReset?(): boolean;
  onChange(listener: (session: AuthSession | null, event?: AuthChangeEvent) => void): () => void;
}
