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
export interface AuthAdapter {
  getSession(): Promise<AuthSession | null>;
  signIn(email: string, password: string): Promise<AuthSession>;
  signUp(email: string, password: string, displayName: string): Promise<AuthSession | null>;
  signOut(): Promise<void>;
  onChange(listener: (session: AuthSession | null) => void): () => void;
}
