import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthProvider';
import { ToastProvider } from '../components/ui/Toast';
import { ThemeProvider } from '../theme/ThemeProvider';
import { resetMockDb, db, tokenFor } from '../api/mock/mockDb';

/** Inicia sesión simulada con el usuario demo (modo mock). */
export function loginAsDemo() {
  resetMockDb();
  const user = db().users[0];
  localStorage.setItem('profelink-mock-session', tokenFor(user.id));
  return user;
}

export function renderRoute(element: ReactElement, { path = '/', route = '/' }: { path?: string; route?: string } = {}) {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={[route]}>
            <Routes>
              <Route path={path} element={element} />
              <Route path="/login" element={<p>Pantalla de login</p>} />
              <Route path="/app/evaluaciones/:quizId" element={<p>Editor abierto</p>} />
              <Route path="/app/evaluaciones/sala/:sessionId" element={<p>Sala abierta</p>} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>,
  );
}
