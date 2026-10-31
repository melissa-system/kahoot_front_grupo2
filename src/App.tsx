import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { GuestOnlyRoute, ProtectedRoute } from './auth/ProtectedRoute';
import { ToastProvider } from './components/ui/Toast';
import { AppShell } from './layout/AppShell';
import { CourseOverviewPage } from './pages/CourseOverviewPage';
import { JoinPlaceholderPage } from './pages/JoinPlaceholderPage';
import { LandingPage } from './pages/LandingPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProfilePage } from './pages/ProfilePage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { HostSessionPage } from './pages/live/HostSessionPage';
import { QuizEditorPage } from './pages/live/QuizEditorPage';
import { QuizListPage } from './pages/live/QuizListPage';
import { ThemeProvider } from './theme/ThemeProvider';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<GuestOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<AppShell />}>
          <Route index element={<Navigate to="evaluaciones" replace />} />
          <Route path="curso" element={<CourseOverviewPage />} />
          <Route path="evaluaciones" element={<QuizListPage />} />
          <Route path="evaluaciones/sala/:sessionId" element={<HostSessionPage />} />
          <Route path="evaluaciones/:quizId" element={<QuizEditorPage />} />
          {/* P4: pantallas del participante */}
          <Route path="jugar" element={<JoinPlaceholderPage />} />
          <Route path="perfil" element={<ProfilePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
