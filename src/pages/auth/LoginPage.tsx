import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { useAuth } from '../../auth/useAuth';
import { errorMessage } from '../../lib/http';
import { validateEmail, validatePassword } from '../../lib/validation';
import { AuthLayout } from './AuthLayout';

export function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next = { email: validateEmail(email), password: validatePassword(password) };
    setErrors(next);
    setFormError(null);
    if (next.email || next.password) return;
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      // GuestOnlyRoute redirige automáticamente al destino.
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Iniciar sesión" subtitle="Entra para unirte a una sala o dirigir tus evaluaciones.">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && <Alert tone="danger">{formError}</Alert>}
        <TextField label="Correo" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <TextField
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Entrar
        </Button>
        <p className="text-center text-muted">
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className="font-semibold text-primary hover:underline">
            Regístrate
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
