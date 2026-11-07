import { ArrowRight, Radio, ShieldCheck, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CornerAccents, Crosshair, DotRow, NotationLine, SystemStrip } from '../components/ui/TechFrame';
import { VitruvianOwl } from '../components/ui/VitruvianOwl';
import { PublicHeader } from '../layout/PublicHeader';

const FEATURES = [
  { icon: Radio, title: 'Partidas en vivo', text: 'Preguntas de verdadero o falso con tiempo controlado por el servidor.' },
  { icon: Smartphone, title: 'Desde cualquier celular', text: 'Tus estudiantes se unen con un código de 6 caracteres.' },
  { icon: ShieldCheck, title: 'Resultados confiables', text: 'Una respuesta por pregunta, sin duplicados y con reconexión segura.' },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-bg">
      <PublicHeader />
      <main className="pl-hero-bg relative flex min-h-[calc(100vh-5rem)] flex-col">
        <CornerAccents />
        <section className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-12 sm:px-6 sm:pt-16">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-16">
            <div className="order-2 lg:order-1">
              <div className="pl-reveal mb-4 max-w-4xl" style={{ ['--pl-delay' as string]: '80ms' }}>
                <NotationLine label="001" />
              </div>
              <div className="pl-reveal relative" style={{ ['--pl-delay' as string]: '160ms' }}>
                <span aria-hidden className="pl-dither absolute -left-3 bottom-0 top-0 hidden w-1 opacity-40 lg:block" />
                <h1 className="max-w-4xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
                  Convierte tu clase en una <span className="text-primary">evaluación en vivo</span> que todos quieren jugar
                </h1>
              </div>
              <div className="pl-reveal mt-4" style={{ ['--pl-delay' as string]: '260ms' }}>
                <DotRow />
              </div>
              <div className="pl-reveal relative max-w-3xl" style={{ ['--pl-delay' as string]: '340ms' }}>
                <p className="mt-6 text-lg text-muted sm:text-xl">
                  Crea cuestionarios con imágenes, abre una sala y dirige la partida desde el proyector. Todo dentro de{' '}
                  <strong className="text-fg">tu curso en ProfeLink</strong>.
                </p>
                <Crosshair className="absolute -right-4 top-1/2 -translate-y-1/2" />
              </div>
              <div className="pl-reveal mt-10 flex flex-col gap-3 sm:flex-row" style={{ ['--pl-delay' as string]: '440ms' }}>
                <Link
                  to="/registro"
                  className="pl-cta pl-cta-primary inline-flex h-14 items-center justify-center gap-3 rounded-xl bg-primary px-6 text-lg font-semibold text-white hover:bg-primary-strong"
                >
                  Crear mi cuenta de profesor <ArrowRight className="pl-cta-arrow h-5 w-5" />
                </Link>
                <Link
                  to="/login"
                  className="pl-cta inline-flex h-14 items-center justify-center rounded-xl border border-line bg-surface px-6 text-lg font-semibold hover:bg-surface-2"
                >
                  Ya tengo cuenta
                </Link>
              </div>
              <div className="pl-reveal mt-8 hidden max-w-3xl lg:block" style={{ ['--pl-delay' as string]: '540ms' }}>
                <NotationLine label="VITRUVIAN" trailing />
              </div>
            </div>
            <div className="pl-reveal-fade order-1 mx-auto lg:order-2 lg:mx-0" style={{ ['--pl-delay' as string]: '200ms' }}>
              <VitruvianOwl className="pl-float w-60 rounded-[28px] ring-1 ring-primary/40 sm:w-72 lg:w-80 xl:w-[22rem]" />
            </div>
          </div>
          <ul className="mt-16 grid gap-4 sm:grid-cols-3">
            {FEATURES.map((f, i) => (
              <li
                key={f.title}
                className="pl-reveal pl-feature-card rounded-2xl border border-line bg-surface/70 p-5 backdrop-blur-sm dark:border-primary/20 dark:bg-black/50"
                style={{ ['--pl-delay' as string]: `${620 + i * 120}ms` }}
              >
                <f.icon className="pl-feature-icon h-6 w-6 text-primary" aria-hidden />
                <h2 className="mt-3 text-lg font-bold">{f.title}</h2>
                <p className="mt-1 text-muted">{f.text}</p>
              </li>
            ))}
          </ul>
        </section>
        <SystemStrip />
      </main>
    </div>
  );
}
