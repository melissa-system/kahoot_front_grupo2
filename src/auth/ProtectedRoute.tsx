import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { FullPageLoader } from '../components/ui/Spinner';
import { useAuth } from './useAuth';

/** Bloquea rutas privadas: sin sesión redirige a /login y recuerda el destino. */
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <FullPageLoader label="Verificando tu sesión…" />;
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

/** Para /login y /registro: si ya hay sesión, entra directo a la app. */
export function GuestOnlyRoute() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <FullPageLoader label="Cargando…" />;
  if (status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from && from.startsWith('/app') ? from : '/app/evaluaciones'} replace />;
  }
  return <Outlet />;
}
