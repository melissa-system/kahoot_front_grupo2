import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from './AuthProvider';

/** Hook compartido de usuario (P3/P4): sesión, perfil, token y cliente API. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}

export function useApi() {
  return useAuth().api;
}
