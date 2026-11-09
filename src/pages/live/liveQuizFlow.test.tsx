import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mockGame } from '../../api/mock/mockGame';
import { renderLiveQuiz, setupLiveQuiz } from '../../test/liveQuiz';

async function readyPanels() {
  const host = screen.getByTestId('host-panel');
  const play = screen.getByTestId('play-panel');
  await within(host).findByRole('button', { name: /Iniciar partida/ });
  await within(play).findByText(/Esperando a que el anfitrión inicie/);
  return { host, play };
}

describe('Flujo en vivo anfitrión + jugador', () => {
  it('avanza las tres preguntas juntos y no se queda en la clasificación', async () => {
    const { teacher, student, room, questions } = setupLiveQuiz();
    renderLiveQuiz(room.id, room.code, teacher, student);
    const { host, play } = await readyPanels();

    expect(within(host).getByText(room.code)).toBeInTheDocument();
    expect(within(play).getByText(`${student.displayName} (tú)`)).toBeInTheDocument();

    await userEvent.click(within(host).getByRole('button', { name: /Iniciar partida/ }));
    expect(await within(host).findByText('1/3')).toBeInTheDocument();
    expect(await within(play).findByText('1/3')).toBeInTheDocument();
    expect(within(host).getByText(questions[0].statement)).toBeInTheDocument();
    expect(within(play).getByRole('button', { name: /Verdadero/ })).toBeEnabled();

    await userEvent.click(within(play).getByRole('button', { name: /Falso/ }));
    expect(await within(host).findByText('Clasificación')).toBeInTheDocument();
    expect(await within(play).findByText('Clasificación')).toBeInTheDocument();
    expect(within(host).getByText(/Siguiente pregunta en \d+ s/)).toBeInTheDocument();
    expect(within(host).queryByText('Avanzando…')).not.toBeInTheDocument();
    expect(within(host).getByRole('button', { name: 'Siguiente' })).toBeDisabled();

    act(() => {
      mockGame.forceAdvance(room.id);
    });
    expect(await within(host).findByText('2/3')).toBeInTheDocument();
    expect(await within(play).findByText('2/3')).toBeInTheDocument();
    expect(within(host).getByText(questions[1].statement)).toBeInTheDocument();
    expect(within(host).queryByText('Clasificación')).not.toBeInTheDocument();
    expect(within(host).queryByText(/Preparando la siguiente pregunta/)).not.toBeInTheDocument();
    expect(within(play).getByText(questions[1].statement)).toBeInTheDocument();
    expect(within(play).getByRole('button', { name: /Verdadero/ })).toBeEnabled();

    await userEvent.click(within(play).getByRole('button', { name: /Falso/ }));
    expect(await within(host).findByText('Clasificación')).toBeInTheDocument();
    act(() => {
      mockGame.forceAdvance(room.id);
    });
    const splashes = await screen.findAllByRole('button', { name: 'Entre la vida y la muerte' });
    for (const splash of splashes) await userEvent.click(splash);
    expect(await within(host).findByText('3/3')).toBeInTheDocument();
    expect(await within(play).findByText('3/3')).toBeInTheDocument();
    expect(await within(play).findByRole('button', { name: /Falso/ })).toBeEnabled();

    await userEvent.click(within(play).getByRole('button', { name: /Falso/ }));
    expect(await within(host).findByText('Clasificación')).toBeInTheDocument();
    act(() => {
      mockGame.forceAdvance(room.id);
    });
    expect(await within(host).findByText('¡Partida terminada!')).toBeInTheDocument();
    expect(await within(play).findByText('¡Partida terminada!')).toBeInTheDocument();
    expect(within(host).getByText('Clasificación final')).toBeInTheDocument();
    expect(within(play).getByText('Clasificación final')).toBeInTheDocument();
  });

  it('si el jugador se atrasa en la revisión, al sincronizar ve la siguiente pregunta', async () => {
    const { teacher, student, room, questions } = setupLiveQuiz();
    renderLiveQuiz(room.id, room.code, teacher, student);
    const { host, play } = await readyPanels();
    await userEvent.click(within(host).getByRole('button', { name: /Iniciar partida/ }));
    await within(play).findByText('1/3');
    await userEvent.click(within(play).getByRole('button', { name: /Verdadero/ }));
    await within(play).findByText('Clasificación');

    act(() => {
      mockGame.forceAdvance(room.id);
    });
    expect(await within(play).findByText('2/3')).toBeInTheDocument();
    expect(within(play).getByText(questions[1].statement)).toBeInTheDocument();
    expect(within(play).queryByText('Clasificación')).not.toBeInTheDocument();
  });
});
