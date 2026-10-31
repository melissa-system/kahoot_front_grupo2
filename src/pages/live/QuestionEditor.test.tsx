import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { QuestionEditor } from './QuestionEditor';

describe('Editor de preguntas', () => {
  it('exige enunciado y respuesta V/F', async () => {
    const onSubmit = vi.fn();
    render(<QuestionEditor submitLabel="Agregar" onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(screen.getByText('Escribe el enunciado de la pregunta.')).toBeInTheDocument();
    expect(screen.getByText(/verdadera o falsa/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rechaza una imagen de formato no permitido y envía el borrador válido', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<QuestionEditor submitLabel="Agregar" onSubmit={onSubmit} />);
    await userEvent.upload(screen.getByTestId('question-image-input'), new File(['gif'], 'x.gif', { type: 'image/gif' }), { applyAccept: false });
    expect(screen.getByText(/Formato no permitido/)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Afirmación'), 'Prolog es declarativo');
    await userEvent.click(screen.getByRole('radio', { name: /Verdadero/ }));
    // Quitar el error de imagen eligiendo un archivo válido
    await userEvent.upload(screen.getByTestId('question-image-input'), new File(['png'], 'x.png', { type: 'image/png' }));
    await userEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ statement: 'Prolog es declarativo', correctBoolean: true, image: expect.any(File) }));
  });
});
