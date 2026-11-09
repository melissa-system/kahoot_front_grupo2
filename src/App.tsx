import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { AppHome, GuestOnlyRoute, ProtectedRoute, TeacherRoute } from './auth/ProtectedRoute';
import { ToastProvider } from './components/ui/Toast';
import { AppShell } from './layout/AppShell';
import { CourseOverviewPage } from './pages/CourseOverviewPage';
import { JoinPage } from './pages/play/JoinPage';
import { PlayedResultsPage } from './pages/play/PlayedResultsPage';
import { PlaySessionPage } from './pages/play/PlaySessionPage';
import { LandingPage } from './pages/LandingPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProfilePage } from './pages/ProfilePage';
import { LoginPage } from './pages/auth/LoginPage';
import { RecoverPasswordPage } from './pages/auth/RecoverPasswordPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { HistoryPage } from './pages/live/HistoryPage';
import { HostSessionPage } from './pages/live/HostSessionPage';
import { QuizEditorPage } from './pages/live/QuizEditorPage';
import { QuizListPage } from './pages/live/QuizListPage';
import { ThemeProvider } from './theme/ThemeProvider';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/restablecer" element={<ResetPasswordPage />} />
      <Route element={<GuestOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
        <Route path="/recuperar" element={<RecoverPasswordPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<AppShell />}>
          <Route index element={<AppHome />} />
          <Route path="curso" element={<CourseOverviewPage />} />
          <Route element={<TeacherRoute />}>
            <Route path="evaluaciones" element={<QuizListPage />} />
            <Route path="evaluaciones/historial" element={<HistoryPage />} />
            <Route path="evaluaciones/sala/:sessionId" element={<HostSessionPage />} />
            <Route path="evaluaciones/:quizId" element={<QuizEditorPage />} />
          </Route>
          <Route path="jugar" element={<JoinPage />} />
          <Route path="jugar/:code" element={<PlaySessionPage />} />
          <Route path="resultados" element={<PlayedResultsPage />} />
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
