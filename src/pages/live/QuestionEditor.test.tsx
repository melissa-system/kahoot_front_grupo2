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
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ statement: 'Prolog es declarativo', kind: 'boolean', correctBoolean: true, image: expect.any(File) }));
  });

  it('envía una pregunta de 4 opciones con varias correctas', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<QuestionEditor submitLabel="Agregar" onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: '4 opciones' }));
    await userEvent.type(screen.getByLabelText('Pregunta'), '¿Cuál es funcional?');
    await userEvent.type(screen.getByLabelText('Opción A'), 'Java');
    await userEvent.type(screen.getByLabelText('Opción B'), 'Haskell');
    await userEvent.type(screen.getByLabelText('Opción C'), 'COBOL');
    await userEvent.type(screen.getByLabelText('Opción D'), 'Fortran');
    await userEvent.click(screen.getByRole('checkbox', { name: 'B es la correcta' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'D es la correcta' }));
    await userEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        statement: '¿Cuál es funcional?',
        kind: 'multiple',
        options: ['Java', 'Haskell', 'COBOL', 'Fortran'],
        correctIndexes: [1, 3],
        durationSeconds: null,
      }),
    );
  });

  it('inserta una fórmula en la pregunta y en una opción', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<QuestionEditor submitLabel="Agregar" onSubmit={onSubmit} />);
    const statement = screen.getByLabelText('Afirmación');
    await userEvent.click(statement);
    await userEvent.click(screen.getByRole('button', { name: 'Fórmula' }));
    await userEvent.click(screen.getByRole('button', { name: 'Insertar pi' }));
    await userEvent.click(screen.getByRole('button', { name: /^Añadir$/ }));
    expect(statement).toHaveValue('$\\pi$');
    await userEvent.click(screen.getByRole('button', { name: '4 opciones' }));
    const optionA = screen.getByLabelText('Opción A');
    await userEvent.click(optionA);
    await userEvent.click(screen.getByRole('button', { name: 'Fórmula' }));
    await userEvent.click(screen.getByRole('button', { name: 'Insertar al cuadrado' }));
    await userEvent.click(screen.getByRole('button', { name: /^Añadir$/ }));
    expect(optionA).toHaveValue('${}^{2}$');
  });

  it('separa el teclado de fórmulas en matemáticas y griego', async () => {
    render(<QuestionEditor submitLabel="Agregar" onSubmit={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Fórmula' }));
    expect(screen.getByRole('tab', { name: 'Símbolos' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Armar')).toBeInTheDocument();
    expect(screen.getByLabelText('Comparar')).toBeInTheDocument();
    expect(screen.getByLabelText('Conjuntos')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Griego' }));
    expect(screen.getByRole('tab', { name: 'Griego' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'Insertar griega α' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Armar')).not.toBeInTheDocument();
  });

  it('el visor de fórmulas no dispara Cancelar al borrar', async () => {
    const onCancel = vi.fn();
    render(<QuestionEditor submitLabel="Agregar" onSubmit={vi.fn()} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: 'Fórmula' }));
    const viewer = screen.getByLabelText('Fórmula');
    await userEvent.click(viewer);
    await userEvent.keyboard('{Backspace}');
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Añadir fórmula' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar', hidden: true }).closest('[inert]')).toBeTruthy();
  });

  it('permite un tiempo propio o dejar el de la sala', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<QuestionEditor submitLabel="Agregar" onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText('Afirmación'), 'Haskell es funcional');
    await userEvent.click(screen.getByRole('radio', { name: /Verdadero/ }));
    await userEvent.click(screen.getByRole('button', { name: '20 s' }));
    await userEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ durationSeconds: 20 }));
  });
});
