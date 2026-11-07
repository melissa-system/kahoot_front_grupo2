import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdminShellSkeleton, AuthSkeleton, HistorySkeleton, HostSessionSkeleton, LandingSkeleton, QuizEditorSkeleton, QuizListSkeleton } from './Skeleton';

describe('Esqueletos del área admin', () => {
  it('anuncia la carga de cada pantalla', () => {
    const { rerender } = render(<QuizListSkeleton />);
    expect(screen.getByRole('status', { name: 'Cargando cuestionarios…' })).toBeInTheDocument();
    rerender(<HistorySkeleton />);
    expect(screen.getByRole('status', { name: 'Cargando historial…' })).toBeInTheDocument();
    rerender(<QuizEditorSkeleton />);
    expect(screen.getByRole('status', { name: 'Cargando cuestionario…' })).toBeInTheDocument();
    rerender(<HostSessionSkeleton />);
    expect(screen.getByRole('status', { name: 'Abriendo la sala…' })).toBeInTheDocument();
    rerender(<AdminShellSkeleton />);
    expect(screen.getByRole('status', { name: 'Verificando tu sesión…' })).toBeInTheDocument();
    rerender(<LandingSkeleton />);
    expect(screen.getByRole('status', { name: 'Cargando inicio…' })).toBeInTheDocument();
    rerender(<AuthSkeleton />);
    expect(screen.getByRole('status', { name: 'Cargando…' })).toBeInTheDocument();
  });
});
