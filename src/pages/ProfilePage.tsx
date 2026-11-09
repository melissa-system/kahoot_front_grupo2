import { useEffect, useState, type FormEvent } from 'react';
import { OwlAvatarPicker } from '../components/ui/OwlAvatar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { TextField } from '../components/ui/Field';
import { PageHeader } from '../components/ui/PageHeader';
import { ProfileSkeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../auth/useAuth';
import { errorMessage } from '../lib/http';
import { DEFAULT_OWL_AVATAR_ID, parseOwlAvatarId, type OwlAvatarId } from '../lib/owlAvatar';
import { validateDisplayName } from '../lib/validation';

export function ProfilePage() {
  const { displayName, session, profile, updateProfile } = useAuth();
  const toast = useToast();
  const currentAvatar = parseOwlAvatarId(profile?.avatarId);
  const [name, setName] = useState(displayName);
  const [avatarId, setAvatarId] = useState<OwlAvatarId>(currentAvatar);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => setName(displayName), [displayName]);
  useEffect(() => setAvatarId(currentAvatar), [currentAvatar]);

  if (!session) return <ProfileSkeleton />;

  const unchanged = name.trim() === displayName && avatarId === (profile?.avatarId ?? DEFAULT_OWL_AVATAR_ID);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = validateDisplayName(name);
    setError(problem);
    if (problem) return;
    setSaving(true);
    try {
      await updateProfile({ displayName: name.trim(), avatarId });
      toast.success('Perfil actualizado');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Mi perfil"
        description={
          session && profile?.role === 'student'
            ? 'Este nombre y búho se muestran en las salas a las que te unes.'
            : 'Este nombre y búho se muestran a tus estudiantes en las salas que diriges.'
        }
      />
      <Card className="max-w-5xl p-6">
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <TextField label="Correo" value={session?.user.email ?? ''} readOnly disabled />
          <TextField label="Nombre visible" value={name} onChange={(e) => setName(e.target.value)} error={error} hint="Entre 2 y 40 caracteres." />
          <OwlAvatarPicker value={avatarId} onChange={setAvatarId} />
          <Button type="submit" loading={saving} disabled={unchanged}>
            Guardar cambios
          </Button>
        </form>
      </Card>
    </>
  );
}
