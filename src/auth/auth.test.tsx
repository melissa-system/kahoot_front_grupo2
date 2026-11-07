import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render } from '@testing-library/react';
import { AuthProvider } from './AuthProvider';
import { GuestOnlyRoute, ProtectedRoute } from './ProtectedRoute';
import { ToastProvider } from '../components/ui/Toast';
import { ThemeProvider } from '../theme/ThemeProvider';
import { LoginPage } from '../pages/auth/LoginPage';
import { resetMockDb } from '../api/mock/mockDb';

function renderApp(route: string) {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={[route]}>
            <Routes>
              <Route element={<GuestOnlyRoute />}>
                <Route path="/login" element={<LoginPage />} />
              </Route>
              <Route element={<ProtectedRoute />}>
                <Route path="/app/evaluaciones" element={<p>Zona privada</p>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>,
  );
}

describe('autenticación', () => {
  it('bloquea rutas privadas sin sesión', async () => {
    resetMockDb();
    renderApp('/app/evaluaciones');
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(screen.queryByText('Zona privada')).not.toBeInTheDocument();
  });

  it('valida campos vacíos sin llamar al servidor', async () => {
    resetMockDb();
    renderApp('/login');
    await userEvent.click(await screen.findByRole('button', { name: 'Entrar' }));
    expect(screen.getByText('Escribe tu correo.')).toBeInTheDocument();
    expect(screen.getByText('Escribe tu contraseña.')).toBeInTheDocument();
  });

  it('muestra error con credenciales incorrectas y entra con las correctas', async () => {
    resetMockDb();
    renderApp('/login');
    await userEvent.type(await screen.findByLabelText('Correo'), 'profe@profelink.test');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'mala');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Correo o contraseña incorrectos.')).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Contraseña'));
    await userEvent.type(screen.getByLabelText('Contraseña'), 'profelink123');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(screen.getByText('Zona privada')).toBeInTheDocument());
  });
});
