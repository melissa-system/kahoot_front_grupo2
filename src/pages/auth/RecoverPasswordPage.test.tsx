import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render } from '@testing-library/react';
import { AuthProvider } from '../../auth/AuthProvider';
import { GuestOnlyRoute, ProtectedRoute } from '../../auth/ProtectedRoute';
import { ToastProvider } from '../../components/ui/Toast';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { LoginPage } from './LoginPage';
import { RecoverPasswordPage } from './RecoverPasswordPage';
import { ResetPasswordPage } from './ResetPasswordPage';
import { resetMockDb } from '../../api/mock/mockDb';

function renderAuth(route: string) {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={[route]}>
            <Routes>
              <Route path="/restablecer" element={<ResetPasswordPage />} />
              <Route element={<GuestOnlyRoute />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/recuperar" element={<RecoverPasswordPage />} />
              </Route>
              <Route element={<ProtectedRoute />}>
                <Route path="/app/evaluaciones" element={<p>Zona privada</p>} />
                <Route path="/app/curso" element={<p>Zona privada</p>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>,
  );
}

describe('restablecer contraseña', () => {
  it('desde el login abre el formulario de recuperación', async () => {
    resetMockDb();
    renderAuth('/login');
    await userEvent.click(await screen.findByRole('link', { name: '¿Olvidaste tu contraseña?' }));
    expect(await screen.findByRole('heading', { name: 'Restablecer Contraseña' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar Enlace de Recuperación' })).toBeInTheDocument();
  });

  it('pide el correo antes de enviar el enlace', async () => {
    resetMockDb();
    renderAuth('/recuperar');
    await userEvent.click(await screen.findByRole('button', { name: 'Enviar Enlace de Recuperación' }));
    expect(screen.getByText('Escribe tu correo.')).toBeInTheDocument();
  });

  it('envía el enlace y permite cambiar la contraseña en modo demo', async () => {
    resetMockDb();
    renderAuth('/recuperar');
    await userEvent.type(await screen.findByLabelText('Correo electrónico'), 'profe@profelink.test');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar Enlace de Recuperación' }));
    expect(await screen.findByRole('heading', { name: 'Revisa tu correo' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('link', { name: 'Elegir nueva contraseña' }));
    expect(await screen.findByRole('heading', { name: 'Nueva contraseña' })).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Nueva contraseña'), 'clave-nueva-1');
    await userEvent.type(screen.getByLabelText('Confirmar contraseña'), 'clave-nueva-1');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));

    expect(await screen.findByText('Tu contraseña se actualizó. Ya puedes iniciar sesión.')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Correo'), 'profe@profelink.test');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'clave-nueva-1');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(screen.getByText('Zona privada')).toBeInTheDocument());
  });

  it('rechaza un restablecimiento sin enlace válido', async () => {
    resetMockDb();
    renderAuth('/restablecer');
    expect(await screen.findByRole('heading', { name: 'Enlace no válido' })).toBeInTheDocument();
  });
});
