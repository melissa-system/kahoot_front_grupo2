import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthProvider';
import type { AuthAdapter, AuthSession } from '../auth/types';
import { ToastProvider } from '../components/ui/Toast';
import { HostSessionPage } from '../pages/live/HostSessionPage';
import { PlaySessionPage } from '../pages/play/PlaySessionPage';
import { ThemeProvider } from '../theme/ThemeProvider';
import { db, tokenFor, type MockUser } from '../api/mock/mockDb';
import { mockGame } from '../api/mock/mockGame';
import { loginAsDemo } from './render';

function adapterFor(user: MockUser): AuthAdapter {
  const session: AuthSession = {
    accessToken: tokenFor(user.id),
    user: { id: user.id, email: user.email, displayName: user.displayName },
  };
  return {
    async getSession() {
      return session;
    },
    async signIn() {
      return session;
    },
    async signUp() {
      return session;
    },
    async signOut() {},
    async requestPasswordReset() {},
    async updatePassword() {},
    onChange() {
      return () => undefined;
    },
  };
}

export function setupLiveQuiz() {
  const teacher = loginAsDemo();
  const student = db().users.find((user) => user.role === 'student');
  if (!student) throw new Error('Falta el usuario estudiante de demo');
  const quiz = db().quizzes[0];
  const questions = db().questions.filter((question) => question.quizId === quiz.id);
  const room = mockGame.create(teacher.id, quiz.title, questions, 30, 5);
  mockGame.join(room.code, { id: student.id, displayName: student.displayName });
  return { teacher, student, room, questions };
}

export function renderLiveQuiz(sessionId: string, code: string, teacher: MockUser, student: MockUser) {
  return render(
    <ThemeProvider>
      <ToastProvider>
        <div>
          <div data-testid="host-panel">
            <AuthProvider adapter={adapterFor(teacher)}>
              <MemoryRouter initialEntries={[`/app/evaluaciones/sala/${sessionId}`]}>
                <Routes>
                  <Route path="/app/evaluaciones/sala/:sessionId" element={<HostSessionPage />} />
                </Routes>
              </MemoryRouter>
            </AuthProvider>
          </div>
          <div data-testid="play-panel">
            <AuthProvider adapter={adapterFor(student)}>
              <MemoryRouter initialEntries={[`/app/jugar/${code}`]}>
                <Routes>
                  <Route path="/app/jugar/:code" element={<PlaySessionPage />} />
                </Routes>
              </MemoryRouter>
            </AuthProvider>
          </div>
        </div>
      </ToastProvider>
    </ThemeProvider>,
  );
}
