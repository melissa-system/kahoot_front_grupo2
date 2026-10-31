/**
 * Configuración leída de variables VITE_*. Solo valores públicos: nunca colocar
 * aquí claves de servicio ni contraseñas.
 */
const raw = import.meta.env;

const supabaseUrl = (raw.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
const supabaseAnonKey = (raw.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';
const forcedMocks = String(raw.VITE_USE_MOCKS ?? '').toLowerCase() === 'true';

export const env = {
  apiUrl: ((raw.VITE_API_URL as string | undefined) ?? 'http://localhost:3000').replace(/\/+$/, ''),
  supabaseUrl,
  supabaseAnonKey,
  /** Sin credenciales de Supabase no hay login real: se usa el backend simulado. */
  useMocks: forcedMocks || !supabaseUrl || !supabaseAnonKey,
} as const;
