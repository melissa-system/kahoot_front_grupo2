import type { ReactNode } from 'react';
import logo from '../../assets/brand/profelink-logo.png';
import { Alert } from '../../components/ui/Alert';
import { useAuth } from '../../auth/useAuth';
import { PublicHeader } from '../../layout/PublicHeader';

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const { isMock } = useAuth();
  return (
    <div className="min-h-screen bg-bg">
      <PublicHeader />
      <main className="pl-hero-bg flex min-h-[calc(100vh-83px)] items-start justify-center px-4 py-10 sm:items-center">
        <div className="grid w-full max-w-5xl items-center gap-10 lg:grid-cols-2">
          <div className="hidden flex-col items-center text-center lg:flex">
            <img src={logo} alt="ProfeLink" className="w-72 rounded-3xl shadow-2xl" />
            <p className="mt-6 max-w-sm text-lg text-muted">Evaluaciones en vivo para tu curso, con resultados confiables y en tiempo real.</p>
          </div>
          <div className="w-full rounded-3xl border border-line bg-surface p-6 shadow-xl sm:p-8">
            <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
            <p className="mt-2 text-muted">{subtitle}</p>
            {isMock && (
              <Alert tone="info" className="mt-5">
                <span className="text-sm">
                  Modo demo: profesor <strong>profe@profelink.test</strong>, estudiante <strong>alumno@profelink.test</strong>. Contraseña <strong>profelink123</strong>.
                </span>
              </Alert>
            )}
            <div className="mt-6">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
