import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { AuthSkeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../../auth/useAuth';
import { errorMessage } from '../../lib/http';
import { validatePassword } from '../../lib/validation';
import { AuthFocusLayout } from './AuthLayout';

export function ResetPasswordPage() {
  const { status, canResetPassword, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState<{ password?: string | null; confirm?: string | null }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const allowed = canResetPassword || status === 'authenticated';

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next = {
      password: validatePassword(form.password, true),
      confirm: form.confirm !== form.password ? 'Las contraseñas no coinciden.' : null,
    };
    setErrors(next);
    setFormError(null);
    if (next.password || next.confirm) return;
    setLoading(true);
    try {
      await updatePassword(form.password);
      navigate('/login', { replace: true, state: { notice: 'Tu contraseña se actualizó. Ya puedes iniciar sesión.' } });
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (status === 'loading') return <AuthSkeleton />;

  if (!allowed) {
    return (
      <AuthFocusLayout title="Enlace no válido" subtitle="El enlace de recuperación expiró o ya se usó. Solicita uno nuevo.">
        <Alert tone="danger">No pudimos validar este restablecimiento.</Alert>
        <p className="mt-6 text-center">
          <Link to="/recuperar" className="font-semibold text-primary hover:underline">
            Solicitar un enlace nuevo
          </Link>
        </p>
      </AuthFocusLayout>
    );
  }

  return (
    <AuthFocusLayout title="Nueva contraseña" subtitle="Elige una contraseña nueva para tu cuenta.">
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {formError && <Alert tone="danger">{formError}</Alert>}
        <TextField
          label="Nueva contraseña"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          error={errors.password}
          hint="Mínimo 8 caracteres."
        />
        <TextField
          label="Confirmar contraseña"
          type="password"
          autoComplete="new-password"
          value={form.confirm}
          onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
          error={errors.confirm}
        />
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Guardar contraseña
        </Button>
        <p className="text-center">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Volver al inicio de sesión
          </Link>
        </p>
      </form>
    </AuthFocusLayout>
  );
}
