import { WifiOff } from 'lucide-react';
import { Spinner } from '../ui/Spinner';
import type { ConnectionStatus } from '../../realtime/useHostSession';

export function ConnectionBanner({ status, isMock, onSimulate }: { status: ConnectionStatus; isMock: boolean; onSimulate(): void }) {
  if (status === 'online')
    return isMock ? (
      <div className="hidden justify-end sm:flex">
        <button type="button" onClick={onSimulate} className="text-sm text-muted underline-offset-2 hover:text-fg hover:underline">
          Simular caída de red (demo)
        </button>
      </div>
    ) : null;
  return (
    <div role="status" className="pl-reveal-fade flex items-center gap-3 rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 font-medium">
      {status === 'offline' ? <WifiOff className="h-5 w-5 text-warning" /> : <Spinner className="h-5 w-5 text-warning" />}
      <span>
        {status === 'offline'
          ? 'Sin conexión a internet. La partida sigue en el servidor; al volver recuperamos el estado.'
          : status === 'connecting'
            ? 'Conectando con la sala…'
            : 'Reconectando con la sala… La partida continúa en el servidor.'}
      </span>
    </div>
  );
}
