import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '../auth/AuthProvider';
import { ToastProvider } from '../components/ui/Toast';
import { loginAsDemo, loginAsStudent } from '../test/render';
import { ThemeProvider } from '../theme/ThemeProvider';
import { AppShell } from './AppShell';

function renderShell(route: string) {
  loginAsDemo();
  return render(
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={[route]}>
            <Routes>
              <Route path="/app" element={<AppShell />}>
                <Route path="jugar" element={<p>Unirse</p>} />
                <Route path="jugar/:code" element={<p>Jugando</p>} />
                <Route path="evaluaciones/sala/:sessionId" element={<p>Anfitrión</p>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>,
  );
}

describe('AppShell en partida en vivo', () => {
  it('oculta el navbar en la sala del jugador y deja un control de sonido flotante', () => {
    renderShell('/app/jugar/PLAY23');
    expect(screen.getByRole('banner')).toHaveClass('hidden', 'lg:block');
    expect(screen.getAllByRole('button', { name: /sonidos/i }).length).toBeGreaterThan(1);
  });

  it('oculta el navbar en la mesa del anfitrión', () => {
    renderShell('/app/evaluaciones/sala/abc-123');
    expect(screen.getByRole('banner')).toHaveClass('hidden', 'lg:block');
  });

  it('mantiene el navbar al unirse a una sala', () => {
    renderShell('/app/jugar');
    expect(screen.getByRole('banner')).not.toHaveClass('hidden');
    expect(screen.getByRole('button', { name: 'Abrir menú' })).toBeInTheDocument();
  });
});

describe('AppShell según el rol', () => {
  it('el estudiante ve Unirse y Mis resultados, no crear cuestionarios', async () => {
    loginAsStudent();
    render(
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={['/app/jugar']}>
              <Routes>
                <Route path="/app" element={<AppShell />}>
                  <Route path="jugar" element={<p>Unirse</p>} />
                </Route>
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>,
    );

    expect(await screen.findByRole('link', { name: /Mis resultados/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Unirse a una sala/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Mis cuestionarios/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Historial/ })).not.toBeInTheDocument();
  });
});
