import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { db } from '../../api/mock/mockDb';
import { mockGame } from '../../api/mock/mockGame';
import { loginAsStudent, renderRoute } from '../../test/render';
import { PlayedResultsPage } from './PlayedResultsPage';

describe('Resultados del estudiante', () => {
  it('muestra el puesto y los puntos de las partidas que contestó', async () => {
    loginAsStudent();
    const teacher = db().users.find((user) => user.role === 'teacher');
    if (teacher) mockGame.ensureDemoHistory(teacher.id);
    renderRoute(<PlayedResultsPage />, { path: '/app/resultados', route: '/app/resultados' });

    const list = await screen.findByRole('list', { name: 'Partidas que contestaste' });
    expect(within(list).getAllByText(/Tu resultado/).length).toBeGreaterThan(0);
    expect(within(list).getAllByText(/pts/).length).toBeGreaterThan(0);

    await userEvent.click(within(list).getAllByRole('button', { name: 'Ver detalle' })[0]);
    expect(within(list).getAllByText(/Tu respuesta/).length).toBeGreaterThan(0);
  });
});
