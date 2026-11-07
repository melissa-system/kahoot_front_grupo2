import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AdminShellSkeleton, AuthSkeleton, QuizListSkeleton } from '../components/ui/Skeleton';
import { isStudent, isTeacher } from './roles';
import { useAuth } from './useAuth';

/** Bloquea rutas privadas: sin sesión redirige a /login y recuerda el destino. */
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <AdminShellSkeleton />;
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  return <Outlet />;
}

/** Para /login y /registro: si ya hay sesión, entra directo a la app. */
export function GuestOnlyRoute() {
  const { status, profile } = useAuth();
  const location = useLocation();
  if (status === 'loading' || (status === 'authenticated' && !profile)) return <AuthSkeleton />;
  if (status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from;
    const home = isStudent(profile) ? '/app/jugar' : '/app/evaluaciones';
    return <Navigate to={from && from.startsWith('/app') ? from : home} replace />;
  }
  return <Outlet />;
}

/** Cuestionarios, editor y sala del anfitrión: solo el profesor. */
export function TeacherRoute() {
  const { profile } = useAuth();
  if (!profile) return <QuizListSkeleton />;
  if (!isTeacher(profile)) return <Navigate to="/app/jugar" replace />;
  return <Outlet />;
}

export function AppHome() {
  const { profile } = useAuth();
  if (!profile) return <QuizListSkeleton />;
  return <Navigate to={isTeacher(profile) ? 'evaluaciones' : 'jugar'} replace />;
}
