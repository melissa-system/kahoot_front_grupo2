import { ArrowRight, Radio, ShieldCheck, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import greeting from '../assets/brand/pl-greeting.png';
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
      <main className="pl-hero-bg">
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pt-16">
          <div className="mx-auto mb-10 grid h-44 w-44 place-items-center rounded-full border-2 border-dashed border-line bg-surface/40 sm:h-52 sm:w-52">
            <div className="relative grid h-36 w-36 place-items-center overflow-hidden rounded-full bg-[#11162a] sm:h-44 sm:w-44">
              <img src={greeting} alt="Búho de ProfeLink saludando" className="h-full w-full object-cover" />
            </div>
          </div>
          <h1 className="max-w-4xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Convierte tu clase en una <span className="text-primary">evaluación en vivo</span> que todos quieren jugar
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-muted sm:text-xl">
            Crea cuestionarios con imágenes, abre una sala y dirige la partida desde el proyector. Todo dentro de{' '}
            <strong className="text-fg">tu curso en ProfeLink</strong>.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link to="/registro" className="inline-flex h-14 items-center justify-center gap-3 rounded-xl bg-primary px-6 text-lg font-semibold text-white hover:bg-primary-strong">
              Crear mi cuenta de profesor <ArrowRight className="h-5 w-5" />
            </Link>
            <Link to="/login" className="inline-flex h-14 items-center justify-center rounded-xl border border-line bg-surface px-6 text-lg font-semibold hover:bg-surface-2">
              Ya tengo cuenta
            </Link>
          </div>
          <ul className="mt-16 grid gap-4 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <li key={f.title} className="rounded-2xl border border-line bg-surface/70 p-5">
                <f.icon className="h-6 w-6 text-primary" aria-hidden />
                <h2 className="mt-3 text-lg font-bold">{f.title}</h2>
                <p className="mt-1 text-muted">{f.text}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
