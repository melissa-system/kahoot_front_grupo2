import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { db } from '../../api/mock/mockDb';
import { mockGame } from '../../api/mock/mockGame';
import { loginAsDemo, renderRoute } from '../../test/render';
import { PlaySessionPage } from './PlaySessionPage';

const HOST = 'host-other';

function joinAsDemo() {
  const user = loginAsDemo();
  const quiz = db().quizzes[0];
  const questions = db().questions.filter((q) => q.quizId === quiz.id);
  const session = mockGame.create(HOST, quiz.title, questions, 30, 5);
  mockGame.join(session.code, { id: user.id, displayName: user.displayName });
  return { user, session };
}

describe('Sala del participante', () => {
  it('muestra el lobby con el jugador unido', async () => {
    const { user, session } = joinAsDemo();
    renderRoute(<PlaySessionPage />, { path: '/app/jugar/:code', route: `/app/jugar/${session.code}` });
    expect(await screen.findByText(session.code)).toBeInTheDocument();
    expect(await screen.findByText(`${user.displayName} (tú)`)).toBeInTheDocument();
    expect(screen.getByText(/Esperando a que el anfitrión inicie/)).toBeInTheDocument();
  });

  it('permite responder V/F y registra la respuesta', async () => {
    const { session } = joinAsDemo();
    renderRoute(<PlaySessionPage />, { path: '/app/jugar/:code', route: `/app/jugar/${session.code}` });
    await waitFor(() => expect(screen.queryByText('Conectando con la sala…')).not.toBeInTheDocument());

    act(() => {
      mockGame.start(session.id, HOST);
    });
    expect(await screen.findByText('1/3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Verdadero/ })).toBeEnabled();

    await userEvent.click(screen.getByRole('button', { name: /Verdadero/ }));
    await waitFor(() => {
      expect(screen.getByText(/Respuesta registrada|Correcto|Incorrecto/i)).toBeInTheDocument();
    });
  });

  it('muestra la correcta al cerrar y el ranking al finalizar', async () => {
    const { session } = joinAsDemo();
    renderRoute(<PlaySessionPage />, { path: '/app/jugar/:code', route: `/app/jugar/${session.code}` });
    await waitFor(() => expect(screen.queryByText('Conectando con la sala…')).not.toBeInTheDocument());
    act(() => {
      mockGame.start(session.id, HOST);
    });
    await userEvent.click(await screen.findByRole('button', { name: /Verdadero/ }));
    await waitFor(() => expect(screen.getByText(/Correcto|Incorrecto/i)).toBeInTheDocument());

    act(() => {
      mockGame.finish(session.id, HOST);
    });
    expect(await screen.findByText('¡Partida terminada!')).toBeInTheDocument();
    expect(screen.getByText('Clasificación final')).toBeInTheDocument();
    expect(screen.getByTestId('podium-confetti')).toBeInTheDocument();
  });

  it('asusta antes de la última pregunta', async () => {
    const user = loginAsDemo();
    const quiz = db().quizzes[0];
    const questions = db().questions.filter((q) => q.quizId === quiz.id).slice(0, 1);
    const session = mockGame.create(HOST, quiz.title, questions, 30, 5);
    mockGame.join(session.code, { id: user.id, displayName: user.displayName });
    renderRoute(<PlaySessionPage />, { path: '/app/jugar/:code', route: `/app/jugar/${session.code}` });
    await waitFor(() => expect(screen.queryByText('Conectando con la sala…')).not.toBeInTheDocument());
    act(() => {
      mockGame.start(session.id, HOST);
    });
    expect(await screen.findByRole('button', { name: 'Entre la vida y la muerte' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Verdadero/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Entre la vida y la muerte' }));
    expect(await screen.findByRole('button', { name: /Verdadero/ })).toBeInTheDocument();
  });

  it('rechaza un código inválido', async () => {
    loginAsDemo();
    renderRoute(<PlaySessionPage />, { path: '/app/jugar/:code', route: '/app/jugar/DEMO01' });
    expect(await screen.findByText('Código inválido')).toBeInTheDocument();
  });
});
