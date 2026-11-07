import { BarChart3, BookOpen, CalendarDays, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';
import coin from '../assets/brand/taku-coin.png';
import { COURSE } from '../layout/course';

export function CourseBanner({ subtitle = 'Actividades y Materiales del curso' }: { subtitle?: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-[linear-gradient(120deg,#1b1f4a_0%,#2a1b55_45%,#0f2a4a_100%)] px-5 py-6 sm:px-8 sm:py-8">
      <div aria-hidden className="absolute inset-0 opacity-30 [background-image:radial-gradient(#60a5fa_1px,transparent_1px)] [background-size:18px_18px]" />
      <div className="relative flex items-center gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-white/20 bg-white/10 text-white">
          <BookOpen className="h-7 w-7" />
        </span>
        <div className="min-w-0 text-white">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-4xl">{COURSE.name}</h1>
          <p className="text-white/80 sm:text-lg">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

const TABS = [
  { label: 'Actividades', icon: BarChart3 },
  { label: 'Asistencia', icon: CalendarDays },
  { label: 'Materiales', icon: BookOpen },
];

/** Vista general del curso (placeholder de integración con la plataforma ProfeLink). */
export function CourseOverviewPage() {
  return (
    <div className="space-y-8">
      <CourseBanner />
      <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-line" role="presentation">
        {TABS.map((t, i) => (
          <div key={t.label} className={`flex items-center justify-center gap-2 py-3 font-semibold ${i === 0 ? 'bg-primary text-white' : 'bg-surface text-fg'}`}>
            <t.icon className="h-5 w-5" aria-hidden /> <span className="hidden sm:inline">{t.label}</span>
          </div>
        ))}
      </div>
      <Link
        to="/app/evaluaciones"
        className="flex flex-col items-start gap-4 rounded-2xl border border-line bg-surface p-6 transition hover:border-primary sm:flex-row sm:items-center"
      >
        <img src={coin} alt="" className="h-16 w-16" />
        <div className="flex-1">
          <p className="flex items-center gap-2 text-xl font-bold">
            <Radio className="h-5 w-5 text-primary" /> Evaluaciones en vivo
          </p>
          <p className="text-muted">Crea un cuestionario de verdadero o falso y juega con tu grupo en tiempo real.</p>
        </div>
        <span className="font-semibold text-primary">Abrir →</span>
      </Link>
    </div>
  );
}
