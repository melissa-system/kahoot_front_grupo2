import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { TextField } from '../components/ui/Field';
import { PageHeader } from '../components/ui/PageHeader';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../auth/useAuth';
import { errorMessage } from '../lib/http';
import { validateDisplayName } from '../lib/validation';

export function ProfilePage() {
  const { displayName, session, updateDisplayName } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(displayName);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => setName(displayName), [displayName]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = validateDisplayName(name);
    setError(problem);
    if (problem) return;
    setSaving(true);
    try {
      await updateDisplayName(name.trim());
      toast.success('Perfil actualizado');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Mi perfil" description="Este nombre se muestra a tus estudiantes en las salas que diriges." />
      <Card className="max-w-xl p-6">
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <TextField label="Correo" value={session?.user.email ?? ''} readOnly disabled />
          <TextField label="Nombre visible" value={name} onChange={(e) => setName(e.target.value)} error={error} hint="Entre 2 y 40 caracteres." />
          <Button type="submit" loading={saving} disabled={name.trim() === displayName}>
            Guardar cambios
          </Button>
        </form>
      </Card>
    </>
  );
}
