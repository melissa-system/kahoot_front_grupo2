import { Volume2, VolumeX } from 'lucide-react';
import { toggleSfx, useSfxMuted } from '../lib/sfx';

export function SoundToggle({ className }: { className?: string }) {
  const muted = useSfxMuted();
  const label = muted ? 'Activar sonidos' : 'Silenciar sonidos';
  return (
    <button type="button" onClick={() => toggleSfx()} aria-label={label} title={label} className={className ?? 'grid h-11 w-11 place-items-center rounded-xl text-fg hover:bg-surface-2'}>
      {muted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
    </button>
  );
}
