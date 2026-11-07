import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { db } from '../../api/mock/mockDb';
import { mockGame } from '../../api/mock/mockGame';
import { loginAsDemo, renderRoute } from '../../test/render';
import { JoinPage } from './JoinPage';

function hostedRoom() {
  const user = loginAsDemo();
  const quiz = db().quizzes[0];
  const questions = db().questions.filter((q) => q.quizId === quiz.id);
  return { user, session: mockGame.create('host-other', quiz.title, questions, 30, 5) };
}

describe('Unirse a una sala', () => {
  it('precarga el código de la URL y lo normaliza a mayúsculas', async () => {
    loginAsDemo();
    renderRoute(<JoinPage />, { path: '/app/jugar', route: '/app/jugar?code=ab2c3d' });
    const input = await screen.findByLabelText('Código de la sala');
    expect(input).toHaveValue('AB2C3D');
  });

  it('muestra error si la sala no existe', async () => {
    loginAsDemo();
    renderRoute(<JoinPage />, { path: '/app/jugar', route: '/app/jugar' });
    await userEvent.type(screen.getByLabelText('Código de la sala'), 'ZZZZZZ');
    await userEvent.click(screen.getByRole('button', { name: 'Unirse' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/no encontramos/i);
  });

  it('navega a la sala tras unirse', async () => {
    const { session } = hostedRoom();
    renderRoute(<JoinPage />, { path: '/app/jugar', route: '/app/jugar' });
    await userEvent.type(screen.getByLabelText('Código de la sala'), session.code.toLowerCase());
    await userEvent.click(screen.getByRole('button', { name: 'Unirse' }));
    await waitFor(() => expect(screen.getByText('Sala de juego')).toBeInTheDocument());
  });
});
