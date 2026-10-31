import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import greeting from '../assets/brand/pl-greeting.png';

/**
 * Punto de integración para Persona 4 (frontend participante): pantalla de
 * unirse por código, responder, reconexión y resultados. Reutilizar useAuth(),
 * useApi(), createSessionSocket() y los componentes de components/ui.
 */
export function JoinPlaceholderPage() {
  return (
    <>
      <PageHeader title="Unirse a una sala" description="Aquí los estudiantes escribirán el código de la sala para jugar." />
      <EmptyState image={greeting} title="Pantalla del participante en construcción" description="Esta vista la implementa el equipo del frontend participante (P4)." />
    </>
  );
}
