import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { isValidSessionCode, normalizeSessionCode, SESSION_CODE_LENGTH } from '../../api/types';
import greeting from '../../assets/brand/pl-greeting.png';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAuth } from '../../auth/useAuth';
import { ApiError, errorMessage } from '../../lib/http';
import { playSfx } from '../../lib/sfx';
import { LAST_ROOM_KEY, participantErrorMessage } from '../../realtime/useParticipantSession';

export function JoinPage() {
  const { api, isMock } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [code, setCode] = useState(() => normalizeSessionCode(params.get('code') ?? ''));
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRoom] = useState<string | null>(() => {
    try {
      const stored = sessionStorage.getItem(LAST_ROOM_KEY);
      return stored && isValidSessionCode(stored) ? stored : null;
    } catch {
      return null;
    }
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const normalized = normalizeSessionCode(code);
    setCode(normalized);
    setFormError(null);
    if (!isValidSessionCode(normalized)) {
      setFieldError('El código tiene 6 caracteres (sin 0, O, 1 ni I).');
      playSfx('error');
      return;
    }
    setFieldError(null);
    setLoading(true);
    try {
      const result = await api.sessions.join(normalized);
      try {
        sessionStorage.setItem(LAST_ROOM_KEY, result.session.code);
      } catch {
        /* ignore */
      }
      playSfx('join');
      navigate(`/app/jugar/${result.session.code}`);
    } catch (error) {
      const codeName = error instanceof ApiError ? error.code : '';
      setFormError(participantErrorMessage(codeName, errorMessage(error)));
      playSfx('error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="pl-reveal">
        <PageHeader title="Unirse a una sala" description="Escribe el código de 6 caracteres que comparte el anfitrión." />
      </div>
      <Card className="pl-reveal mx-auto max-w-lg p-6 sm:p-8" style={{ ['--pl-delay' as string]: '90ms' }}>
        <form onSubmit={onSubmit} noValidate className="flex flex-col items-center gap-5">
          <img src={greeting} alt="" className="pl-bob h-20 w-20 rounded-2xl" />
          {formError && (
            <Alert tone="danger" className="pl-shake w-full">
              {formError}
            </Alert>
          )}
          <label className="w-full space-y-2 text-center">
            <span className="block text-sm font-medium text-muted">Código de la sala</span>
            <input
              value={code}
              onChange={(e) => {
                setCode(normalizeSessionCode(e.target.value));
                setFieldError(null);
              }}
              maxLength={SESSION_CODE_LENGTH}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={fieldError ? 'code-error' : undefined}
              className="pl-join-input w-full rounded-2xl border border-line bg-surface-2 px-4 py-4 text-center font-mono text-4xl font-extrabold tracking-[0.35em] text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 sm:text-5xl"
              placeholder="ABC234"
            />
          </label>
          {fieldError && (
            <p id="code-error" role="alert" className="text-sm text-danger">
              {fieldError}
            </p>
          )}
          <p className="text-center text-sm text-muted">
            {isMock
              ? 'Modo demo: entra con el código PLAY23. La partida arranca sola.'
              : 'El código lo genera el anfitrión al abrir la sala. No puedes unirte a una sala que tú mismo dirigiste.'}
          </p>
          <Button type="submit" size="lg" className="pl-cta pl-cta-primary w-full" loading={loading} disabled={code.length !== SESSION_CODE_LENGTH}>
            Unirse
          </Button>
        </form>
        {lastRoom && lastRoom !== code && (
          <p className="mt-4 text-center text-sm text-muted">
            ¿Volver a la sala{' '}
            <Link to={`/app/jugar/${lastRoom}`} className="font-semibold text-primary hover:underline">
              {lastRoom}
            </Link>
            ?
          </p>
        )}
      </Card>
    </>
  );
}
