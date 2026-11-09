import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

describe('Modal', () => {
  it('no se cierra al hacer clic en el fondo; sí con la X', async () => {
    const onClose = vi.fn();
    render(
      <Modal open title="Tiempo límite" onClose={onClose}>
        <p>Contenido</p>
      </Modal>,
    );
    expect(screen.getByRole('dialog', { name: 'Tiempo límite' })).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
