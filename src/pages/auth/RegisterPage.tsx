import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { useAuth } from '../../auth/useAuth';
import { errorMessage } from '../../lib/http';
import type { UserRole } from '../../api/types';
import { validateDisplayName, validateEmail, validatePassword } from '../../lib/validation';
import { AuthLayout } from './AuthLayout';

type Errors = Partial<Record<'name' | 'email' | 'password' | 'confirm', string | null>>;

export function RegisterPage() {
  const { signUp } = useAuth();
  const [params] = useSearchParams();
  const [role, setRole] = useState<UserRole>(params.get('rol') === 'profesor' ? 'teacher' : 'student');
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Errors = {
      name: validateDisplayName(form.name),
      email: validateEmail(form.email),
      password: validatePassword(form.password, true),
      confirm: form.confirm !== form.password ? 'Las contraseñas no coinciden.' : null,
    };
    setErrors(next);
    setFormError(null);
    if (Object.values(next).some(Boolean)) return;
    setLoading(true);
    try {
      const signedIn = await signUp(form.email.trim(), form.password, form.name.trim(), role);
      if (!signedIn) setPendingConfirmation(true);
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  if (pendingConfirmation)
    return (
      <AuthLayout title="Revisa tu correo" subtitle="Te enviamos un enlace para confirmar tu cuenta.">
        <Alert tone="success">Cuando confirmes tu correo podrás iniciar sesión.</Alert>
        <Link to="/login" className="mt-6 inline-block font-semibold text-primary hover:underline">
          Ir a iniciar sesión
        </Link>
      </AuthLayout>
    );

  return (
    <AuthLayout
      title="Crear cuenta"
      subtitle={role === 'teacher' ? 'Como profesor podrás crear cuestionarios y dirigir partidas.' : 'Como estudiante te unes con un código y ves tu puntaje al terminar.'}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && <Alert tone="danger">{formError}</Alert>}
        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="mb-2 text-sm font-medium">¿Quién eres?</legend>
          {(
            [
              ['student', 'Estudiante'],
              ['teacher', 'Profesor'],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className={`flex h-11 cursor-pointer items-center justify-center rounded-xl border text-sm font-semibold ${
                role === value ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-surface-2'
              }`}
            >
              <input type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)} className="sr-only" />
              {label}
            </label>
          ))}
        </fieldset>
        <TextField label="Nombre visible" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} hint="Entre 2 y 40 caracteres." />
        <TextField label="Correo" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
        <TextField label="Contraseña" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} hint="Mínimo 8 caracteres." />
        <TextField label="Confirmar contraseña" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Crear cuenta
        </Button>
        <p className="text-center text-muted">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Inicia sesión
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
