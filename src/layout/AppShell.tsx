import { BookOpen, ChevronLeft, Home, LogIn, LogOut, Menu, Radio, Trophy, User, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import githubDark from '../assets/brand/GitHub_dark.svg';
import githubLight from '../assets/brand/GitHub_light.svg';
import { isTeacher } from '../auth/roles';
import { useAuth } from '../auth/useAuth';
import { cn } from '../lib/cn';
import { useTheme } from '../theme/ThemeProvider';
import { OwlAvatar } from '../components/ui/OwlAvatar';
import { Brand } from './Brand';
import { COURSE } from './course';
import { isLiveSessionPath } from './liveSession';
import { SoundToggle } from './SoundToggle';
import { ThemeToggle } from './ThemeToggle';

interface NavItem {
  to: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  end?: boolean;
}

function navSections(teacher: boolean): Array<{ title: string; items: NavItem[] }> {
  return [
    { title: 'Curso', items: [{ to: '/app/curso', label: 'Vista General', hint: 'Contenido del curso', icon: BookOpen }] },
    {
      title: 'Evaluaciones en vivo',
      items: teacher
        ? [
            { to: '/app/evaluaciones', label: 'Mis cuestionarios', hint: 'Crear y dirigir partidas', icon: Radio, end: true },
            { to: '/app/evaluaciones/historial', label: 'Historial', hint: 'Ganadores y aciertos', icon: Trophy },
            { to: '/app/jugar', label: 'Unirse a una sala', hint: 'Responder con un código', icon: LogIn },
          ]
        : [
            { to: '/app/jugar', label: 'Unirse a una sala', hint: 'Responder con un código', icon: LogIn },
            { to: '/app/resultados', label: 'Mis resultados', hint: 'Puesto y puntaje', icon: Trophy },
          ],
    },
    { title: 'Mi cuenta', items: [{ to: '/app/perfil', label: 'Mi perfil', hint: 'Nombre y avatar', icon: User }] },
  ];
}

function SidebarContent({ onNavigate, onCollapse }: { onNavigate?: () => void; onCollapse?: () => void }) {
  const { profile } = useAuth();
  const sections = navSections(isTeacher(profile));
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-line px-4 py-4">
        <Link to="/" aria-label="Inicio" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface-2 hover:bg-line">
          <Home className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1 border-l border-line pl-3">
          <p className="truncate font-bold" title={COURSE.name}>
            {COURSE.name}
          </p>
          <p className="text-sm text-muted">{COURSE.subtitle}</p>
        </div>
        {onCollapse && (
          <button type="button" onClick={onCollapse} aria-label="Cerrar menú" className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-surface-2">
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
      </div>
      <nav aria-label="Navegación del curso" className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
        {sections.map((section, i) => (
          <div key={section.title} className={cn(i > 0 && 'border-t border-line pt-4')}>
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">{section.title}</p>
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-xl px-3 py-3 transition-colors',
                        isActive ? 'bg-primary text-white' : 'text-fg hover:bg-surface-2',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon aria-hidden className={cn('h-5 w-5 shrink-0', !isActive && 'text-muted')} />
                        <span className="min-w-0">
                          <span className="block font-semibold">{item.label}</span>
                          <span className={cn('block truncate text-sm', isActive ? 'text-white/85' : 'text-muted')}>{item.hint}</span>
                        </span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}

function UserMenu() {
  const { displayName, session, profile, signOut, isMock } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Menú de usuario"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="overflow-hidden rounded-full ring-2 ring-transparent hover:ring-primary"
      >
        <OwlAvatar id={profile?.avatarId} name={displayName} size="md" />
      </button>
      {open && (
        <div role="menu" className="pl-pop absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
          <div className="flex items-center gap-3 border-b border-line px-4 py-3">
            <OwlAvatar id={profile?.avatarId} name={displayName} size="sm" />
            <div className="min-w-0">
              <p className="truncate font-semibold">{displayName}</p>
              <p className="truncate text-sm text-muted">{session?.user.email}</p>
              {isMock && <p className="mt-1 text-xs font-semibold text-warning">Modo demo (datos simulados)</p>}
            </div>
          </div>
          <button
            role="menuitem"
            type="button"
            className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-surface-2"
            onClick={() => {
              setOpen(false);
              navigate('/app/perfil');
            }}
          >
            <User className="h-4 w-4" /> Mi perfil
          </button>
          <button
            role="menuitem"
            type="button"
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-danger hover:bg-surface-2"
            onClick={async () => {
              setOpen(false);
              await signOut();
              navigate('/login', { replace: true });
            }}
          >
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

/** Layout privado: sidebar del curso + header ProfeLink, igual que la plataforma. */
export function AppShell() {
  const [drawer, setDrawer] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { profile } = useAuth();
  const { theme } = useTheme();
  const location = useLocation();
  const live = isLiveSessionPath(location.pathname);

  useEffect(() => setDrawer(false), [location.pathname]);

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Sidebar escritorio */}
      <aside
        className={cn(
          'pl-sidebar sticky top-0 hidden h-screen shrink-0 overflow-hidden bg-sidebar lg:block',
          collapsed ? 'w-0 border-transparent' : 'w-[280px] border-r border-line',
        )}
        aria-hidden={collapsed}
      >
        <div className="h-full w-[280px]">
          <SidebarContent onCollapse={() => setCollapsed(true)} />
        </div>
      </aside>

      {/* Drawer móvil */}
      {!live && (
        <div
          className={cn('fixed inset-0 z-40 lg:hidden', !drawer && 'pointer-events-none')}
          role="dialog"
          aria-modal={drawer}
          aria-label="Menú"
          aria-hidden={!drawer}
          inert={!drawer}
        >
          <button
            type="button"
            aria-label="Cerrar menú"
            className={cn('pl-drawer-backdrop absolute inset-0 bg-black/60', drawer ? 'opacity-100' : 'opacity-0')}
            onClick={() => setDrawer(false)}
            tabIndex={drawer ? 0 : -1}
          />
          <aside
            className={cn(
              'pl-drawer-panel absolute inset-y-0 left-0 w-[86vw] max-w-[300px] border-r border-line bg-sidebar',
              drawer ? 'translate-x-0' : '-translate-x-full',
            )}
          >
            <SidebarContent onNavigate={() => setDrawer(false)} onCollapse={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {live && (
          <SoundToggle className="fixed top-[max(0.75rem,env(safe-area-inset-top))] right-[max(0.75rem,env(safe-area-inset-right))] z-50 grid h-11 w-11 place-items-center rounded-full border border-line bg-surface/95 text-fg shadow-lg backdrop-blur lg:hidden" />
        )}
        <header className={cn('sticky top-0 z-30 bg-header/95 backdrop-blur', live && 'hidden lg:block')}>
          <div className="flex h-20 items-center gap-2 px-4 sm:px-6">
            <button
              type="button"
              aria-label="Abrir menú"
              onClick={() => (window.matchMedia('(min-width: 1024px)').matches ? setCollapsed(false) : setDrawer(true))}
              className={cn('grid h-11 w-11 place-items-center rounded-xl hover:bg-surface-2', !collapsed && 'lg:hidden')}
            >
              <Menu className="h-6 w-6" />
            </button>
            <Brand to={isTeacher(profile) ? '/app/evaluaciones' : '/app/jugar'} />
            <div className="ml-auto flex items-center gap-1 sm:gap-3">
              <a
                href={COURSE.repoUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Repositorio en GitHub"
                title="Repositorio en GitHub"
                className="hidden h-11 w-11 place-items-center rounded-xl hover:bg-surface-2 sm:grid"
              >
                <img src={theme === 'dark' ? githubDark : githubLight} alt="" className="h-6 w-6" />
              </a>
              <SoundToggle />
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
          <div className="pl-header-line h-[3px]" />
        </header>
        <main
          className={cn(
            'mx-auto w-full max-w-6xl flex-1',
            live
              ? 'px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:px-6 lg:py-8'
              : 'px-4 py-6 sm:px-6 sm:py-8',
          )}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
