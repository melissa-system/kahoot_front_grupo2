import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { db } from '../../api/mock/mockDb';
import { mockGame } from '../../api/mock/mockGame';
import { loginAsDemo, renderRoute } from '../../test/render';
import { HistoryPage, NAME_LIST_PREVIEW } from './HistoryPage';

function card(title: string) {
  const heading = screen.getAllByRole('heading', { name: title }).find((node) => !node.closest('[role="dialog"]'));
  const item = heading?.closest('li');
  if (!item) throw new Error(`No se encontró la tarjeta de ${title}`);
  return within(item);
}

function detail(title: string) {
  return within(screen.getByRole('dialog', { name: title }));
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
    const pastDetail = detail('Paradigmas: repaso rápido');
    expect(pastDetail.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('aria-selected', 'true');
    expect(pastDetail.getByText('Total de aciertos')).toBeInTheDocument();
    expect(pastDetail.queryByText('Pregunta 1 de 3')).not.toBeInTheDocument();
    expect(pastDetail.queryByRole('list', { name: 'Clasificación' })).not.toBeInTheDocument();

    await userEvent.click(pastDetail.getByRole('tab', { name: 'Aciertos y errores por pregunta' }));
    expect(pastDetail.getByText('Pregunta 1 de 3')).toBeInTheDocument();
    expect(pastDetail.getByText(questions[0].statement)).toBeInTheDocument();
    expect(pastDetail.queryByText('Total de aciertos')).not.toBeInTheDocument();
    expect(pastDetail.queryByText('Aciertos')).not.toBeInTheDocument();

    await userEvent.click(pastDetail.getAllByRole('button', { name: 'Quién acertó y quién falló' })[0]);
    expect(pastDetail.getByText('Aciertos')).toBeInTheDocument();
    expect(pastDetail.getByText('Errores')).toBeInTheDocument();
    expect(pastDetail.getAllByText('María').length).toBeGreaterThan(0);
    expect(pastDetail.getAllByText('Luis').length).toBeGreaterThan(0);

    await userEvent.click(pastDetail.getByRole('tab', { name: 'Clasificación' }));
    expect(pastDetail.queryByText('Pregunta 1 de 3')).not.toBeInTheDocument();
    const ranking = pastDetail.getByRole('list', { name: 'Clasificación' });
    expect(within(ranking).getByText('María')).toBeInTheDocument();
    expect(within(ranking).getByText('Luis')).toBeInTheDocument();

    const logic = card('Lógica de predicados');
    await userEvent.click(logic.getByRole('button', { name: 'Ver detalle' }));
    expect(screen.queryByRole('dialog', { name: 'Paradigmas: repaso rápido' })).not.toBeInTheDocument();
    const logicDetail = detail('Lógica de predicados');
    expect(past.getByRole('button', { name: 'Ver detalle' })).toBeInTheDocument();
    expect(logicDetail.getByText('Total de aciertos')).toBeInTheDocument();
    await userEvent.click(logicDetail.getByRole('tab', { name: 'Aciertos y errores por pregunta' }));
    expect(logicDetail.getByText('Pregunta 1 de 2')).toBeInTheDocument();
  });

  it('resume una lista larga de nombres y deja ver el resto', async () => {
    const user = loginAsDemo();
    const questions = db().questions.filter((q) => q.quizId === db().quizzes[0].id).slice(0, 1);
    const extra = 12;
    mockGame.seedFinished(user.id, {
      quizTitle: 'Sala grande',
      questions,
      players: Array.from({ length: NAME_LIST_PREVIEW + extra }, (_, i) => ({
        displayName: `Alumno ${String(i + 1).padStart(2, '0')}`,
        choices: questions.map((q) => !q.correctBoolean),
      })),
    });
    renderRoute(<HistoryPage />, { path: '/app/evaluaciones/historial', route: '/app/evaluaciones/historial' });
    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Sala grande' }));
    await userEvent.click(dialog.getByRole('tab', { name: 'Aciertos y errores por pregunta' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Quién acertó y quién falló' }));
    expect(dialog.getByText('Alumno 01')).toBeInTheDocument();
    expect(dialog.getByText('Alumno 08')).toBeInTheDocument();
    expect(dialog.queryByText('Alumno 20')).not.toBeInTheDocument();
    await userEvent.click(dialog.getByRole('button', { name: `+${extra} más` }));
    expect(dialog.getByText('Alumno 20')).toBeInTheDocument();
    await userEvent.click(dialog.getByRole('button', { name: 'Ver menos' }));
    expect(dialog.queryByText('Alumno 20')).not.toBeInTheDocument();
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

  it('filtra por coincidencia en título, código o ganador', async () => {
    const user = loginAsDemo();
    const questions = db().questions.filter((q) => q.quizId === db().quizzes[0].id);
    mockGame.seedFinished(user.id, {
      quizTitle: 'Paradigmas: repaso rápido',
      code: 'PAST23',
      questions,
      players: [{ displayName: 'Valeria', choices: questions.map((q) => q.correctBoolean) }],
    });
    mockGame.seedFinished(user.id, {
      quizTitle: 'Lógica de predicados',
      code: 'BEST42',
      questions: questions.slice(0, 2),
      players: [{ displayName: 'Carlos', choices: questions.slice(0, 2).map((q) => q.correctBoolean) }],
    });
    renderRoute(<HistoryPage />, { path: '/app/evaluaciones/historial', route: '/app/evaluaciones/historial' });

    const search = await screen.findByLabelText('Buscar partidas');
    const buscar = () => userEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    await userEvent.type(search, 'paradigmas');
    const beforeSearch = screen.getByRole('list', { name: 'Partidas finalizadas' });
    expect(within(beforeSearch).getByText('Lógica de predicados')).toBeInTheDocument();

    await buscar();
    const byTitle = screen.getByRole('list', { name: 'Partidas finalizadas' });
    expect(within(byTitle).getByText('Paradigmas: repaso rápido')).toBeInTheDocument();
    expect(within(byTitle).queryByText('Lógica de predicados')).not.toBeInTheDocument();

    await userEvent.clear(search);
    await userEvent.type(search, 'BEST42');
    await buscar();
    const byCode = screen.getByRole('list', { name: 'Partidas finalizadas' });
    expect(within(byCode).getByText('Lógica de predicados')).toBeInTheDocument();
    expect(within(byCode).queryByText('Paradigmas: repaso rápido')).not.toBeInTheDocument();

    await userEvent.clear(search);
    await userEvent.type(search, 'valeria');
    await buscar();
    const byWinner = screen.getByRole('list', { name: 'Partidas finalizadas' });
    expect(within(byWinner).getByText('Paradigmas: repaso rápido')).toBeInTheDocument();
    expect(within(byWinner).queryByText('Lógica de predicados')).not.toBeInTheDocument();

    await userEvent.clear(search);
    await userEvent.type(search, 'xyz no existe');
    await buscar();
    expect(await screen.findByText('No hay coincidencias')).toBeInTheDocument();
  });

  it('filtra el historial por rango de fechas', async () => {
    const user = loginAsDemo();
    const questions = db().questions.filter((q) => q.quizId === db().quizzes[0].id).slice(0, 1);
    mockGame.seedFinished(user.id, {
      quizTitle: 'Kahoot de octubre',
      finishedAt: '2026-10-15T18:00:00.000Z',
      questions,
      players: [{ displayName: 'Valeria', choices: questions.map((q) => q.correctBoolean) }],
    });
    mockGame.seedFinished(user.id, {
      quizTitle: 'Kahoot de noviembre',
      finishedAt: '2026-11-08T18:00:00.000Z',
      questions,
      players: [{ displayName: 'Carlos', choices: questions.map((q) => q.correctBoolean) }],
    });
    renderRoute(<HistoryPage />, { path: '/app/evaluaciones/historial', route: '/app/evaluaciones/historial' });

    await screen.findByRole('list', { name: 'Partidas finalizadas' });
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-10-15' } });
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-10-15' } });
    expect(screen.getByRole('list', { name: 'Partidas finalizadas' }).textContent).toContain('Kahoot de noviembre');
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    const october = screen.getByRole('list', { name: 'Partidas finalizadas' });
    expect(within(october).getByText('Kahoot de octubre')).toBeInTheDocument();
    expect(within(october).queryByText('Kahoot de noviembre')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-11-01' } });
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    const november = screen.getByRole('list', { name: 'Partidas finalizadas' });
    expect(within(november).getByText('Kahoot de noviembre')).toBeInTheDocument();
    expect(within(november).queryByText('Kahoot de octubre')).not.toBeInTheDocument();
  });
});
