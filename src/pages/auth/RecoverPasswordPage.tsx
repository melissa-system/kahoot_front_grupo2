import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { useAuth } from '../../auth/useAuth';
import { errorMessage } from '../../lib/http';
import { validateEmail } from '../../lib/validation';
import { AuthFocusLayout } from './AuthLayout';

export function RecoverPasswordPage() {
  const { requestPasswordReset, isMock } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next = validateEmail(email);
    setError(next);
    setFormError(null);
    if (next) return;
    setLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <AuthFocusLayout
        title="Revisa tu correo"
        subtitle="Si hay una cuenta con ese correo, te enviamos un enlace para restablecer tu contraseña."
      >
        <Alert tone="success">El enlace caduca. Si no llega, revisa spam o solicita uno nuevo en unos minutos.</Alert>
        {isMock && (
          <Alert tone="info" className="mt-4">
            Modo demo: no se envía correo.{' '}
            <Link to="/restablecer" className="font-semibold text-primary hover:underline">
              Elegir nueva contraseña
            </Link>
          </Alert>
        )}
        <BackToLogin />
      </AuthFocusLayout>
    );
  }

  return (
    <AuthFocusLayout
      title="Restablecer Contraseña"
      subtitle="Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña"
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {formError && <Alert tone="danger">{formError}</Alert>}
        <TextField
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
          leading={<Mail className="h-4 w-4" />}
          placeholder="tu@correo.com"
        />
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Enviar Enlace de Recuperación
        </Button>
        <BackToLogin />
      </form>
    </AuthFocusLayout>
  );
}

function BackToLogin() {
  return (
    <p className="mt-6 text-center">
      <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Volver al inicio de sesión
      </Link>
    </p>
  );
}
