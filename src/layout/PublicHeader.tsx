import { Link } from 'react-router-dom';
import { Brand } from './Brand';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '../auth/useAuth';
import { Skeleton } from '../components/ui/Skeleton';

export function PublicHeader() {
  const { status } = useAuth();
  return (
    <header className="sticky top-0 z-30 bg-header/95 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Brand subtitle="Plataforma para Academias Educativas" />
        <div className="flex items-center gap-2 sm:gap-4">
          <ThemeToggle />
          {status === 'loading' ? (
            <Skeleton className="h-11 w-36 rounded-xl" />
          ) : (
            <Link
              to={status === 'authenticated' ? '/app/evaluaciones' : '/login'}
              className="inline-flex h-11 items-center rounded-xl border-2 border-primary px-4 font-semibold text-primary hover:bg-primary-soft sm:px-5"
            >
              {status === 'authenticated' ? 'Ir a mi curso' : 'Iniciar Sesión'}
            </Link>
          )}
        </div>
      </div>
      <div className="pl-header-line h-[3px]" />
    </header>
  );
}
