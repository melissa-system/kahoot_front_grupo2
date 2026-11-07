import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { db } from '../../api/mock/mockDb';
import { mockGame } from '../../api/mock/mockGame';
import { loginAsDemo, renderRoute } from '../../test/render';
import { HistoryPage } from './HistoryPage';

function card(title: string) {
  const heading = screen.getByRole('heading', { name: title });
  const item = heading.closest('li');
  if (!item) throw new Error(`No se encontró la tarjeta de ${title}`);
  return within(item);
}

describe('Historial de partidas', () => {
  it('muestra un vacío cuando el anfitrión aún no ha terminado kahoots', async () => {
    loginAsDemo();
    renderRoute(<HistoryPage />, { path: '/app/evaluaciones/historial', route: '/app/evaluaciones/historial' });
    expect(await screen.findByText('Aún no hay partidas finalizadas')).toBeInTheDocument();
  });

  it('deja el detalle oculto hasta que se abre una partida', async () => {
    const user = loginAsDemo();
    const questions = db().questions.filter((q) => q.quizId === db().quizzes[0].id);
    mockGame.seedFinished(user.id, {
      quizTitle: 'Paradigmas: repaso rápido',
      code: 'PAST23',
      questions,
      players: [
        { displayName: 'María', choices: questions.map((q) => q.correctBoolean) },
        { displayName: 'Luis', choices: questions.map((q) => !q.correctBoolean) },
      ],
    });
    mockGame.seedFinished(user.id, {
      quizTitle: 'Lógica de predicados',
      code: 'BEST42',
      questions: questions.slice(0, 2),
      players: [{ displayName: 'Carlos', choices: questions.slice(0, 2).map((q) => q.correctBoolean) }],
    });
    renderRoute(<HistoryPage />, { path: '/app/evaluaciones/historial', route: '/app/evaluaciones/historial' });

    const list = await screen.findByRole('list', { name: 'Partidas finalizadas' });
    expect(within(list).getByText('Paradigmas: repaso rápido')).toBeInTheDocument();
    expect(within(list).getByText(/9 pts/)).toBeInTheDocument();
    expect(within(list).getByText('3 preguntas')).toBeInTheDocument();
    expect(within(list).getByText('3 aciertos')).toBeInTheDocument();
    expect(within(list).queryByText('Total de preguntas')).not.toBeInTheDocument();
    expect(within(list).queryByText('Pregunta 1 de 3')).not.toBeInTheDocument();

    const past = card('Paradigmas: repaso rápido');
    await userEvent.click(past.getByRole('button', { name: 'Ver detalle' }));
    expect(past.getByText('Total de aciertos')).toBeInTheDocument();
    expect(past.getByText('Pregunta 1 de 3')).toBeInTheDocument();
    expect(past.getByText(questions[0].statement)).toBeInTheDocument();
    expect(past.queryByText('Aciertos')).not.toBeInTheDocument();

    await userEvent.click(past.getAllByRole('button', { name: 'Quién acertó y quién falló' })[0]);
    expect(past.getByText('Aciertos')).toBeInTheDocument();
    expect(past.getByText('Errores')).toBeInTheDocument();
    expect(past.getAllByText('María').length).toBeGreaterThan(0);
    expect(past.getAllByText('Luis').length).toBeGreaterThan(0);

    const ranking = past.getByRole('list', { name: 'Clasificación' });
    expect(within(ranking).getByText('María')).toBeInTheDocument();
    expect(within(ranking).getByText('Luis')).toBeInTheDocument();

    const logic = card('Lógica de predicados');
    await userEvent.click(logic.getByRole('button', { name: 'Ver detalle' }));
    expect(past.queryByText('Pregunta 1 de 3')).not.toBeInTheDocument();
    expect(past.getByRole('button', { name: 'Ver detalle' })).toBeInTheDocument();
    expect(logic.getByRole('button', { name: 'Ocultar detalle' })).toBeInTheDocument();
    expect(logic.getByText('Pregunta 1 de 2')).toBeInTheDocument();
  });

  it('pagina el historial de a cinco partidas', async () => {
    const user = loginAsDemo();
    const questions = db().questions.filter((q) => q.quizId === db().quizzes[0].id).slice(0, 1);
    for (let i = 0; i < 6; i += 1) {
      mockGame.seedFinished(user.id, {
        quizTitle: `Kahoot ${i + 1}`,
        finishedAt: new Date(Date.now() - (6 - i) * 60_000).toISOString(),
        questions,
        players: [{ displayName: 'Valeria', choices: questions.map((q) => q.correctBoolean) }],
      });
    }
    renderRoute(<HistoryPage />, { path: '/app/evaluaciones/historial', route: '/app/evaluaciones/historial' });

    const list = await screen.findByRole('list', { name: 'Partidas finalizadas' });
    expect(within(list).getByText('Kahoot 6')).toBeInTheDocument();
    expect(within(list).queryByText('Kahoot 1')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Paginación del historial')).toHaveTextContent('Página 1 de 2');

    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    const nextList = screen.getByRole('list', { name: 'Partidas finalizadas' });
    expect(within(nextList).getByText('Kahoot 1')).toBeInTheDocument();
    expect(within(nextList).queryByText('Kahoot 6')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Paginación del historial')).toHaveTextContent('Página 2 de 2');
  });
});
