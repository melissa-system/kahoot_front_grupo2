import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { db } from '../../api/mock/mockDb';
import { mockGame } from '../../api/mock/mockGame';
import { loginAsDemo, renderRoute } from '../../test/render';
import { HostSessionPage } from './HostSessionPage';

function createRoom() {
  const user = loginAsDemo();
  const quiz = db().quizzes[0];
  const questions = db().questions.filter((q) => q.quizId === quiz.id);
  return mockGame.create(user.id, quiz.title, questions, 30, 5);
}

describe('Panel del anfitrión', () => {
  it('muestra el código, actualiza participantes en vivo y solo permite iniciar con jugadores', async () => {
    const session = createRoom();
    renderRoute(<HostSessionPage />, { path: '/app/evaluaciones/sala/:sessionId', route: `/app/evaluaciones/sala/${session.id}` });

    expect(await screen.findByText(session.code)).toBeInTheDocument();
    const start = screen.getByRole('button', { name: /Iniciar partida/ });
    expect(start).toBeDisabled();

    await waitFor(() => expect(screen.queryByText('Conectando con la sala…')).not.toBeInTheDocument());
    act(() => {
      mockGame.addParticipant(session.id, 'Valeria');
    });
    expect(await screen.findByText('Valeria')).toBeInTheDocument();
    expect(start).toBeEnabled();

    await userEvent.click(start);
    expect(await screen.findByText('1/3')).toBeInTheDocument();
    // Mientras la pregunta está abierta no se revela la respuesta correcta.
    expect(screen.getByText(/la respuesta se revela al cerrar/)).toBeInTheDocument();
    expect(screen.queryByText('Clasificación')).not.toBeInTheDocument();
  });

  it('no deja dirigir una sala inexistente', async () => {
    loginAsDemo();
    renderRoute(<HostSessionPage />, { path: '/app/evaluaciones/sala/:sessionId', route: '/app/evaluaciones/sala/no-existe' });
    expect(await screen.findByText('No puedes dirigir esta sala')).toBeInTheDocument();
  });

  it('finaliza la partida y muestra resultados', async () => {
    const session = createRoom();
    mockGame.addParticipant(session.id, 'Diego');
    renderRoute(<HostSessionPage />, { path: '/app/evaluaciones/sala/:sessionId', route: `/app/evaluaciones/sala/${session.id}` });
    await waitFor(() => expect(screen.queryByText('Conectando con la sala…')).not.toBeInTheDocument());
    await userEvent.click(await screen.findByRole('button', { name: /Iniciar partida/ }));
    await userEvent.click(await screen.findByRole('button', { name: /Finalizar partida/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Finalizar' }));
    expect(await screen.findByText('¡Partida terminada!')).toBeInTheDocument();
    expect(screen.getByText('Clasificación final')).toBeInTheDocument();
    expect(screen.getByTestId('podium-confetti')).toBeInTheDocument();
  });
});
