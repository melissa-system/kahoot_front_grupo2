import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { loginAsDemo, renderRoute } from '../../test/render';
import { QuizListPage } from './QuizListPage';

describe('Panel de cuestionarios', () => {
  it('lista los cuestionarios propios', async () => {
    loginAsDemo();
    renderRoute(<QuizListPage />, { path: '/app/evaluaciones', route: '/app/evaluaciones' });
    const list = await screen.findByRole('list', { name: 'Cuestionarios' });
    expect(within(list).getByText('Paradigmas: repaso rápido')).toBeInTheDocument();
    expect(within(list).getByText('3 preguntas')).toBeInTheDocument();
  });

  it('valida el título y crea un cuestionario nuevo', async () => {
    loginAsDemo();
    renderRoute(<QuizListPage />, { path: '/app/evaluaciones', route: '/app/evaluaciones' });
    await userEvent.click(await screen.findByRole('button', { name: /Nuevo cuestionario/ }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Título'), 'ab');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Crear cuestionario' }));
    expect(within(dialog).getByText(/entre 3 y 120/)).toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText('Título'), 'c Funcional');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Crear cuestionario' }));
    expect(await screen.findByText('Editor abierto')).toBeInTheDocument();
  });

  it('pide confirmación antes de eliminar', async () => {
    loginAsDemo();
    renderRoute(<QuizListPage />, { path: '/app/evaluaciones', route: '/app/evaluaciones' });
    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar Paradigmas: repaso rápido' }));
    expect(screen.getByText('¿Eliminar cuestionario?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(await screen.findByText('Aún no tienes cuestionarios')).toBeInTheDocument();
  });
});
