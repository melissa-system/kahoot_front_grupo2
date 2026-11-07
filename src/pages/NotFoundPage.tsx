import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl p-8">
      <EmptyState
        title="Esta página no existe"
        description="Revisa la dirección o vuelve a tus cuestionarios."
        action={
          <Link to="/app/evaluaciones" className="font-semibold text-primary hover:underline">
            Ir a mis cuestionarios
          </Link>
        }
      />
    </div>
  );
}
